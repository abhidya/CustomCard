import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createAiRouteActivationContext,
  resolveAiRouteActivation
} from "../src/aiRouteActivation.mjs";
import { normalizeAdminWorkerConfigInput } from "../src/adminRuntimeConfigData.mjs";
import { createAiCardGenerationService, loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { buildLocalComfyWorkerAiFlowConfig, resolveLocalComfyWorkerEnv } from "./local-comfy-worker.mjs";
import {
  buildProviderWorkerResult,
  hasLiveProviderNetworkCall
} from "./provider-worker-payload-contract.mjs";

const providerCompletionWebpQuality = 82;
const providerCompletionWebpEffort = 4;
const providerCompletionMaxEdgePixels = 2100;
const providerCompletionRasterMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
let sharpCodecPromise;

export function resolveProviderHttpWorkerEnv(env = process.env) {
  const resolved = resolveLocalComfyWorkerEnv(env);
  resolved.CUSTOMCARD_PROVIDER_API_BASE_URL =
    resolved.CUSTOMCARD_PROVIDER_API_BASE_URL ||
    resolved.CUSTOMCARD_HOSTED_API_BASE_URL ||
    resolved.PUBLIC_APP_ORIGIN ||
    "";
  if (!resolved.CUSTOMCARD_WORKER_ID) {
    resolved.CUSTOMCARD_WORKER_ID = `provider-http:${resolved.COMPUTERNAME ?? resolved.HOSTNAME ?? "machine"}:${process.pid}`;
  }
  return resolved;
}

export function createProviderHttpWorkerRuntime({
  env = process.env,
  fetchImpl = (...args) => globalThis.fetch(...args),
  aiFlowAdminConfig,
  workerConfig,
  routes,
  now = () => new Date()
} = {}) {
  const resolvedEnv = resolveProviderHttpWorkerEnv(env);
  const resolvedWorkerConfig = normalizeAdminWorkerConfigInput(workerConfig);
  const workerAiFlowAdminConfig = aiFlowAdminConfig ?? buildLocalComfyWorkerAiFlowConfig(resolvedEnv);
  const baseUrl = trimTrailingSlash(resolvedEnv.CUSTOMCARD_PROVIDER_API_BASE_URL);
  const workerId = resolvedEnv.CUSTOMCARD_WORKER_ID;
  const token = String(resolvedEnv.CUSTOMCARD_PROVIDER_WORKER_TOKEN ?? "").trim();
  const routeScope = providerRouteScope(routes, resolvedWorkerConfig);
  const aiFlowReadiness = providerAiFlowReadiness(resolvedEnv, workerAiFlowAdminConfig);
  const aiService = createAiCardGenerationService({ env: resolvedEnv, fetchImpl, aiFlowAdminConfig: workerAiFlowAdminConfig });

  return {
    describe() {
      return {
        service: "customcard-provider-http-worker",
        executionMode: "provider-token-http",
        workerId,
        apiBaseUrl: baseUrl || null,
        routeScope,
        copyAdapter: aiFlowReadiness.cardCopy.adapterId,
        copyModel: aiFlowReadiness.cardCopy.model,
        imageAdapter: aiFlowReadiness.cardImage.adapterId,
        imageModel: aiFlowReadiness.cardImage.model,
        comfyUrl: resolvedEnv.CUSTOMCARD_COMFYUI_URL || resolvedEnv.COMFYUI_URL || null,
        aiFlowReadiness,
        hasProviderToken: token.length >= 32,
        pollIntervalMs: resolvedWorkerConfig.providerWorker.pollIntervalMs
      };
    },
    validate() {
      const blockers = [];
      if (!baseUrl) blockers.push("CUSTOMCARD_PROVIDER_API_BASE_URL is required.");
      if (token.length < 32) blockers.push("CUSTOMCARD_PROVIDER_WORKER_TOKEN must be at least 32 characters.");
      blockers.push(...providerAiFlowBlockers(aiFlowReadiness));
      return blockers;
    },
    async runOnce({ limit } = {}) {
      const blockers = this.validate();
      if (blockers.length > 0) {
        return { ...this.describe(), status: "blocked", blockers, leased: 0, processed: 0, succeeded: 0, failed: 0 };
      }
      const lease = await postJson({
        fetchImpl,
        token,
        url: `${baseUrl}/api/provider/jobs/lease`,
        body: { worker_id: workerId, routes: routeScope, limit: safeInteger(limit, resolvedWorkerConfig.providerWorker.batchSize, 1, 5) }
      });
      if (!lease.ok) {
        return {
          ...this.describe(),
          status: "blocked",
          blockers: [`Lease request failed with HTTP ${lease.status}: ${lease.text}`],
          leased: 0,
          processed: 0,
          succeeded: 0,
          failed: 0
        };
      }

      const jobs = Array.isArray(lease.payload.jobs) ? lease.payload.jobs : [];
      const report = {
        ...this.describe(),
        status: "ready",
        leased: jobs.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: []
      };
      for (const job of jobs) {
        const result = await processProviderJob({ aiService, baseUrl, env: resolvedEnv, fetchImpl, job, now, token, workerId });
        report.processed += 1;
        if (result.status === "succeeded") report.succeeded += 1;
        else report.failed += 1;
        report.results.push(result);
      }
      return report;
    },
    async runLoop({
      limit,
      pollIntervalMs,
      maxIterations = Number.POSITIVE_INFINITY,
      shouldContinue = () => true,
      onReport
    } = {}) {
      const report = {
        ...this.describe(),
        status: "ready",
        iterations: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        results: []
      };
      while (report.iterations < maxIterations && shouldContinue()) {
        const selectedLimit = safeInteger(limit, resolvedWorkerConfig.providerWorker.batchSize, 1, 5);
        const selectedPollIntervalMs = safeInteger(pollIntervalMs, resolvedWorkerConfig.providerWorker.pollIntervalMs, 0, 60000);
        const iteration = await this.runOnce({ limit: selectedLimit });
        report.iterations += 1;
        report.processed += iteration.processed ?? 0;
        report.succeeded += iteration.succeeded ?? 0;
        report.failed += iteration.failed ?? 0;
        report.results.push(...(iteration.results ?? []));
        report.lastReport = iteration;
        await onReport?.(iteration);
        if (iteration.status !== "ready") {
          report.status = iteration.status;
          report.blockers = iteration.blockers ?? [];
          break;
        }
        if ((iteration.leased ?? 0) === 0 && selectedPollIntervalMs > 0) await sleep(selectedPollIntervalMs);
      }
      return report;
    }
  };
}

async function processProviderJob({ aiService, baseUrl, env, fetchImpl, job, now, token, workerId }) {
  const startedAt = Date.now();
  try {
    const result = await executeLeasedJob({ aiService, env, fetchImpl, job });
    const completion = await postJson({
      fetchImpl,
      token,
      url: `${baseUrl}/api/provider/jobs/${encodeURIComponent(job.job_id)}/complete`,
      body: {
        worker_id: workerId,
        lease_token: job.lease_token,
        status: "succeeded",
        result
      }
    });
    if (!completion.ok) throw new Error(`Complete request failed with HTTP ${completion.status}: ${completion.text}`);
    return {
      job_id: job.job_id,
      route_id: job.route_id,
      status: "succeeded",
      duration_ms: Date.now() - startedAt,
      completed_at: now().toISOString()
    };
  } catch (error) {
    const message = errorMessage(error);
    await postJson({
      fetchImpl,
      token,
      url: `${baseUrl}/api/provider/jobs/${encodeURIComponent(job.job_id)}/complete`,
      body: {
        worker_id: workerId,
        lease_token: job.lease_token,
        status: "failed",
        error: message
      }
    }).catch(() => undefined);
    return {
      job_id: job.job_id,
      route_id: job.route_id,
      status: "failed",
      duration_ms: Date.now() - startedAt,
      reason: message
    };
  }
}

async function executeLeasedJob({ aiService, env, fetchImpl, job }) {
  if (job.route_id !== "ai-card-generate") throw new Error(`Unsupported provider route: ${job.route_id}`);
  const payload = job.payload && typeof job.payload === "object" ? job.payload : {};
  const body = payload.body && typeof payload.body === "object" ? payload.body : undefined;
  if (!body) throw new Error("Leased AI card job is missing a body.");
  const requestContext = payload.requestContext && typeof payload.requestContext === "object" ? payload.requestContext : {};
  const jobAiFlowAdminConfig = leasedJobAiFlowAdminConfig(payload);
  const selectedAiService = jobAiFlowAdminConfig
    ? createAiCardGenerationService({ env, fetchImpl, aiFlowAdminConfig: jobAiFlowAdminConfig })
    : aiService;
  const generated = await selectedAiService.generateCard(body, requestContext);
  if (generated.statusCode === 429) throw new Error("Provider rate limited.");
  if (generated.statusCode >= 500) {
    const failure = providerFailureFromPayload(generated.payload);
    throw new Error(`Provider failed with HTTP ${generated.statusCode}${failure ? `: ${failure}` : ""}.`);
  }
  const liveNetworkCalls = hasLiveProviderNetworkCall(generated.payload);
  const completionPayload = await compactProviderCompletionPayloadForPost(generated.payload);
  return buildProviderWorkerResult({
    status: "ai-result-ready",
    routeId: job.route_id,
    httpStatusCode: generated.statusCode,
    providerCallMode: liveNetworkCalls ? "live-provider" : "provider-disabled",
    payload: completionPayload,
    liveNetworkCalls,
    evidence: "Provider HTTP worker completed queued AI flow with scoped provider-token auth."
  });
}

export async function compactProviderCompletionPayloadForPost(payload = {}) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.images)) return payload;
  const images = await Promise.all(payload.images.map((image) => compactProviderCompletionImageForPost(image)));
  return {
    ...payload,
    images
  };
}

async function compactProviderCompletionImageForPost(image) {
  if (!image || typeof image !== "object") return image;
  const dataUrl = String(image.image_url ?? image.imageUrl ?? "");
  const parsed = parseProviderCompletionImageDataUrl(dataUrl);
  if (!parsed || !providerCompletionRasterMimeTypes.has(parsed.mimeType)) return image;
  try {
    const sharp = await loadSharpCodec();
    const result = await sharp(parsed.buffer, {
      failOn: "none",
      limitInputPixels: providerCompletionMaxEdgePixels * providerCompletionMaxEdgePixels * 2
    })
      .rotate()
      .resize({
        width: providerCompletionMaxEdgePixels,
        height: providerCompletionMaxEdgePixels,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: providerCompletionWebpQuality,
        effort: providerCompletionWebpEffort,
        smartSubsample: true
      })
      .toBuffer({ resolveWithObject: true });

    if (!result?.data || result.data.length <= 0 || result.data.length >= parsed.buffer.length) return image;
    return {
      ...image,
      image_url: `data:image/webp;base64,${result.data.toString("base64")}`,
      provider_completion_compression: {
        status: "compressed",
        algorithm: "sharp-webp-v1",
        originalMimeType: parsed.mimeType,
        storedMimeType: "image/webp",
        originalByteLength: parsed.buffer.length,
        storedByteLength: result.data.length,
        savedBytes: parsed.buffer.length - result.data.length,
        width: result.info?.width,
        height: result.info?.height,
        quality: providerCompletionWebpQuality
      }
    };
  } catch (error) {
    return {
      ...image,
      provider_completion_compression: {
        status: "skipped",
        algorithm: "sharp-webp-v1",
        reason: "raster-compression-failed",
        detail: errorMessage(error).slice(0, 160)
      }
    };
  }
}

function parseProviderCompletionImageDataUrl(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/i.exec(String(value));
  if (!match) return undefined;
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length <= 0) return undefined;
  return { mimeType, buffer };
}

async function loadSharpCodec() {
  if (!sharpCodecPromise) sharpCodecPromise = import("sharp").then((module) => module.default ?? module);
  return sharpCodecPromise;
}

function providerFailureFromPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  const direct = firstUsefulFailure(payload.detail, payload.error, payload.provider_failure);
  if (direct) return direct;
  const aiFlow = payload.ai_flow && typeof payload.ai_flow === "object" ? payload.ai_flow : {};
  for (const flow of Object.values(aiFlow)) {
    if (!flow || typeof flow !== "object") continue;
    const failure = firstUsefulFailure(flow.provider_failure);
    if (failure) return failure;
  }
  return "";
}

function firstUsefulFailure(...values) {
  for (const value of values) {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (text) return text.length > 500 ? `${text.slice(0, 500)}...` : text;
  }
  return "";
}

async function postJson({ fetchImpl, token, url, body }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }
  return { ok: response.ok, status: response.status, payload, text };
}

export function loadProviderWorkerEnvFiles({ cwd = process.cwd(), target = process.env } = {}) {
  for (const { filePath, override } of [
    { filePath: ".env.local", override: false },
    { filePath: "infra/env/.env", override: false },
    { filePath: ".env.provider.local", override: true }
  ]) {
    const absolutePath = resolve(cwd, filePath);
    if (!existsSync(absolutePath)) continue;
    const parsed = parseDotenv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!isProviderWorkerEnvKey(key)) continue;
      if (override || !target[key]) target[key] = value;
    }
  }
  return target;
}

function parseDotenv(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) parsed[key] = value;
  }
  return parsed;
}

function isProviderWorkerEnvKey(key) {
  return /^(CUSTOMCARD_PROVIDER_.+|CUSTOMCARD_HOSTED_API_BASE_URL|PUBLIC_APP_ORIGIN|CUSTOMCARD_RUNCOMFY_|CUSTOMCARD_COMFYUI_|COMFYUI_|CLOUDFLARE_|RUNCOMFY_)/
    .test(key);
}

function leasedJobAiFlowAdminConfig(payload) {
  const config = payload?.aiFlowAdminConfig ?? payload?.ai_flow_admin_config;
  if (!Array.isArray(config) || config.length === 0) return undefined;
  return config.filter((item) => item && typeof item === "object" && !Array.isArray(item));
}

function providerAiFlowReadiness(env, aiFlowAdminConfig = []) {
  const activationContext = createAiRouteActivationContext({ env, serviceAiFlowAdminConfig: aiFlowAdminConfig });
  const cardCopy = resolveAiRouteActivation("card-copy", activationContext).flow;
  const cardImage = resolveAiRouteActivation("card-image", activationContext).flow;
  return {
    cardCopy: flowReadinessSummary(cardCopy),
    cardImage: flowReadinessSummary(cardImage)
  };
}

function flowReadinessSummary(flow) {
  return {
    flowId: flow.flowId,
    adapterId: flow.primaryAdapterId,
    fallbackAdapterId: flow.fallbackAdapterId,
    model: flow.model,
    readyForLiveCalls: flow.readyForLiveCalls,
    blockedReasons: flow.blockedReasons
  };
}

function providerAiFlowBlockers(readiness) {
  return [readiness.cardCopy, readiness.cardImage].flatMap((flow) =>
    flow.readyForLiveCalls ? [] : flow.blockedReasons.map((reason) => `${flow.flowId}: ${reason}`)
  );
}

function providerRouteScope(routes, workerConfig) {
  const configured = Array.isArray(routes) && routes.length > 0
    ? routes
    : workerConfig.providerWorker.routeIds;
  const normalized = configured.map((routeId) => String(routeId ?? "").trim()).filter(Boolean);
  return Array.from(new Set(normalized.length > 0 ? normalized : ["ai-card-generate"]));
}

function safeInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function trimTrailingSlash(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

if (isCliEntrypoint()) {
  loadLocalAiEnvFiles();
  loadProviderWorkerEnvFiles();
  const runtime = createProviderHttpWorkerRuntime();
  const args = new Set(process.argv.slice(2));
  if (args.has("--describe")) {
    const blockers = runtime.validate();
    console.log(JSON.stringify({ ...runtime.describe(), status: blockers.length === 0 ? "ready" : "blocked", blockers }));
    if (blockers.length > 0) process.exitCode = 1;
  } else if (args.has("--once")) {
    const report = await runtime.runOnce();
    console.log(JSON.stringify(report));
    if (report.status !== "ready") process.exitCode = 1;
  } else {
    let stopping = false;
    const stop = () => {
      stopping = true;
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const report = await runtime.runLoop({
      shouldContinue: () => !stopping,
      onReport(iteration) {
        console.log(JSON.stringify(iteration));
      }
    });
    if (report.status !== "ready") process.exitCode = 1;
  }
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}
