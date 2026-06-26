#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createAiCardGenerationService, loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { resolveLocalComfyWorkerEnv } from "./local-comfy-worker.mjs";

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
  routes,
  now = () => new Date()
} = {}) {
  const resolvedEnv = resolveProviderHttpWorkerEnv(env);
  const baseUrl = trimTrailingSlash(resolvedEnv.CUSTOMCARD_PROVIDER_API_BASE_URL);
  const workerId = resolvedEnv.CUSTOMCARD_WORKER_ID;
  const token = String(resolvedEnv.CUSTOMCARD_PROVIDER_WORKER_TOKEN ?? "").trim();
  const routeScope = providerRouteScope(routes, resolvedEnv);
  const aiService = createAiCardGenerationService({ env: resolvedEnv, fetchImpl });

  return {
    describe() {
      return {
        service: "customcard-provider-http-worker",
        executionMode: "provider-token-http",
        workerId,
        apiBaseUrl: baseUrl || null,
        routeScope,
        imageAdapter: resolvedEnv.CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID,
        comfyUrl: resolvedEnv.CUSTOMCARD_COMFYUI_URL || resolvedEnv.COMFYUI_URL || null,
        hasProviderToken: token.length >= 32,
        pollIntervalMs: workerPollIntervalMs(resolvedEnv)
      };
    },
    validate() {
      const blockers = [];
      if (!baseUrl) blockers.push("CUSTOMCARD_PROVIDER_API_BASE_URL is required.");
      if (token.length < 32) blockers.push("CUSTOMCARD_PROVIDER_WORKER_TOKEN must be at least 32 characters.");
      return blockers;
    },
    async runOnce({ limit = workerBatchSize(resolvedEnv) } = {}) {
      const blockers = this.validate();
      if (blockers.length > 0) {
        return { ...this.describe(), status: "blocked", blockers, leased: 0, processed: 0, succeeded: 0, failed: 0 };
      }
      const lease = await postJson({
        fetchImpl,
        token,
        url: `${baseUrl}/api/provider/jobs/lease`,
        body: { worker_id: workerId, routes: routeScope, limit }
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
        const result = await processProviderJob({ aiService, baseUrl, fetchImpl, job, now, token, workerId });
        report.processed += 1;
        if (result.status === "succeeded") report.succeeded += 1;
        else report.failed += 1;
        report.results.push(result);
      }
      return report;
    },
    async runLoop({
      limit = workerBatchSize(resolvedEnv),
      pollIntervalMs = workerPollIntervalMs(resolvedEnv),
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
        const iteration = await this.runOnce({ limit });
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
        if ((iteration.leased ?? 0) === 0 && pollIntervalMs > 0) await sleep(pollIntervalMs);
      }
      return report;
    }
  };
}

async function processProviderJob({ aiService, baseUrl, fetchImpl, job, now, token, workerId }) {
  try {
    const result = await executeLeasedJob({ aiService, job });
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
    return { job_id: job.job_id, route_id: job.route_id, status: "succeeded", completed_at: now().toISOString() };
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
    return { job_id: job.job_id, route_id: job.route_id, status: "failed", reason: message };
  }
}

async function executeLeasedJob({ aiService, job }) {
  if (job.route_id !== "ai-card-generate") throw new Error(`Unsupported provider route: ${job.route_id}`);
  const payload = job.payload && typeof job.payload === "object" ? job.payload : {};
  const body = payload.body && typeof payload.body === "object" ? payload.body : undefined;
  if (!body) throw new Error("Leased AI card job is missing a body.");
  const requestContext = payload.requestContext && typeof payload.requestContext === "object" ? payload.requestContext : {};
  const generated = await aiService.generateCard(body, requestContext);
  if (generated.statusCode === 429) throw new Error("Provider rate limited.");
  if (generated.statusCode >= 500) throw new Error(`Provider failed with HTTP ${generated.statusCode}.`);
  const liveNetworkCalls = hasLiveProviderNetworkCall(generated.payload);
  return {
    status: "ai-result-ready",
    routeId: job.route_id,
    httpStatusCode: generated.statusCode,
    providerCallMode: liveNetworkCalls ? "live-provider" : "provider-disabled",
    payload: generated.payload,
    liveNetworkCalls,
    evidence: "Provider HTTP worker completed queued AI flow with scoped provider-token auth."
  };
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

function loadProviderWorkerEnvFiles({ cwd = process.cwd(), target = process.env } = {}) {
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
  return /^(CUSTOMCARD_PROVIDER_.+|CUSTOMCARD_HOSTED_API_BASE_URL|PUBLIC_APP_ORIGIN)$/.test(key);
}

function providerRouteScope(routes, env) {
  const configured = Array.isArray(routes) && routes.length > 0
    ? routes
    : String(env.CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS ?? "ai-card-generate").split(/[,\s]+/);
  const normalized = configured.map((routeId) => String(routeId ?? "").trim()).filter(Boolean);
  return Array.from(new Set(normalized.length > 0 ? normalized : ["ai-card-generate"]));
}

function hasLiveProviderNetworkCall(payload = {}) {
  return Array.isArray(payload.provider_call_events)
    ? payload.provider_call_events.some((event) => event?.live_network_call === true && event?.status !== "blocked")
    : false;
}

function workerBatchSize(env) {
  return safeIntegerEnv(env.CUSTOMCARD_PROVIDER_WORKER_BATCH_SIZE ?? env.CUSTOMCARD_WORKER_BATCH_SIZE, 1, 1, 5);
}

function workerPollIntervalMs(env) {
  return safeIntegerEnv(env.CUSTOMCARD_PROVIDER_WORKER_POLL_INTERVAL_MS ?? env.CUSTOMCARD_WORKER_POLL_INTERVAL_MS, 5000, 250, 60000);
}

function safeIntegerEnv(value, fallback, min, max) {
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
