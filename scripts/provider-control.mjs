import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { createProviderHttpWorkerRuntime } from "./provider-http-worker.mjs";

const serviceName = "customcard-provider-control";
const providerEnvFile = ".env.provider.local";
const defaultRoutes = ["ai-card-generate"];

async function main() {
  const { command, flags } = parseCli(process.argv.slice(2));
  const env = loadProviderEnv(process.cwd());

  if (command === "setup") {
    const report = await setupProvider({ env, flags });
    emitReport(report, flags);
    process.exitCode = report.status === "ready" || report.status === "configured" ? 0 : 1;
    return;
  }

  if (command === "start") {
    await startProvider({ env, flags });
    return;
  }

  if (command === "once") {
    const report = await runProviderOnce({ env, flags });
    emitReport(report, flags);
    process.exitCode = report.status === "ready" ? 0 : 1;
    return;
  }

  if (command === "status" || command === "doctor" || !command) {
    const report = await providerStatus({ env, flags, doctor: command === "doctor" });
    emitReport(report, flags);
    process.exitCode = report.status === "ready" || (!flags.strict && report.status === "configured") ? 0 : 1;
    return;
  }

  emitReport(
    {
      service: serviceName,
      status: "blocked",
      blockers: [`Unknown provider command: ${command}`],
      commands: ["setup", "status", "doctor", "start", "once"]
    },
    flags
  );
  process.exitCode = 1;
}

async function setupProvider({ env, flags }) {
  const blockers = [];
  const warnings = [];
  const vercel = findVercelCli();
  const routeScope = routeScopeFromFlags(flags, env);
  const existingToken = String(env.CUSTOMCARD_PROVIDER_WORKER_TOKEN ?? "").trim();
  const rawToken = flags["rotate-token"] || existingToken.length < 32 ? randomProviderToken() : existingToken;
  const tokenHash = sha256Hex(rawToken);
  const workerId = String(flags["worker-id"] ?? env.CUSTOMCARD_WORKER_ID ?? defaultWorkerId()).trim();
  const baseUrl = trimTrailingSlash(
    String(
      flags.url ??
        env.CUSTOMCARD_PROVIDER_API_BASE_URL ??
        env.CUSTOMCARD_HOSTED_API_BASE_URL ??
        env.PUBLIC_APP_ORIGIN ??
        (vercel ? latestReadyProductionDeploymentUrl(vercel) : "")
    )
  );

  if (!baseUrl) blockers.push("No production URL found. Pass --url=https://<your-production-vercel-domain>.");

  const localUpdates = {
    CUSTOMCARD_PROVIDER_API_BASE_URL: baseUrl,
    CUSTOMCARD_PROVIDER_WORKER_TOKEN: rawToken,
    CUSTOMCARD_WORKER_ID: workerId
  };
  if (!env.CUSTOMCARD_COMFYUI_URL && !env.COMFYUI_URL) localUpdates.CUSTOMCARD_COMFYUI_URL = "http://127.0.0.1:8188";

  if (blockers.length === 0 && !flags["dry-run"]) {
    upsertEnvFile(resolve(process.cwd(), providerEnvFile), localUpdates);
  }

  const vercelReport = flags["no-vercel"]
    ? { status: "skipped", detail: "Skipped by --no-vercel." }
    : await configureVercelProviderEnv({
        vercel,
        tokenHash,
        dryRun: Boolean(flags["dry-run"])
      });
  if (vercelReport.status === "blocked") blockers.push(...vercelReport.blockers);
  if (vercelReport.warnings) warnings.push(...vercelReport.warnings);

  const probe = baseUrl
    ? await probeProviderStatus({
        baseUrl,
        token: rawToken,
        routes: routeScope
      })
    : { status: "not-run", ok: false, detail: "No base URL." };

  if (probe.status === "endpoint-not-deployed") {
    warnings.push("Provider endpoints are not deployed at the selected production URL yet.");
  }
  if (probe.status === "provider-token-unconfigured") {
    warnings.push("Production endpoint exists, but the provider token hash is not active in Vercel yet.");
  }

  return {
    service: serviceName,
    command: "setup",
    status: blockers.length === 0 ? "configured" : "blocked",
    blockers,
    warnings,
    local: {
      envFile: providerEnvFile,
      wroteLocalEnv: blockers.length === 0 && !flags["dry-run"],
      apiBaseUrl: baseUrl || null,
      workerId,
      routeScope,
      hasProviderToken: rawToken.length >= 32
    },
    vercel: vercelReport,
    endpoint: probe,
    next: blockers.length === 0 ? ["npm run provider:doctor", "npm run provider:start"] : ["Fix blockers, then rerun npm run provider:setup"]
  };
}

async function providerStatus({ env, flags, doctor = false }) {
  const runtime = createProviderHttpWorkerRuntime({ env });
  const localDescription = runtime.describe();
  const localBlockers = runtime.validate();
  const routeScope = routeScopeFromFlags(flags, env);
  const baseUrl = trimTrailingSlash(String(flags.url ?? localDescription.apiBaseUrl ?? ""));
  const token = String(env.CUSTOMCARD_PROVIDER_WORKER_TOKEN ?? "").trim();
  const endpoint = await probeProviderStatus({ baseUrl, token, routes: routeScope });
  const vercel = findVercelCli();
  const vercelEnv = vercel ? vercelProviderEnvSummary(vercel) : { status: "blocked", blockers: ["Vercel CLI not found."] };
  const blockers = [...localBlockers];

  if (endpoint.status === "endpoint-not-deployed") blockers.push("Provider endpoints are not deployed at the configured production URL.");
  if (endpoint.status === "provider-token-unconfigured") blockers.push("Production provider token hash is missing.");
  if (endpoint.status === "invalid-provider-token") blockers.push("Local provider token does not match the production token hash.");
  if (
    endpoint.status === "not-configured" &&
    !blockers.some((blocker) => blocker.includes("CUSTOMCARD_PROVIDER_API_BASE_URL"))
  ) {
    blockers.push(endpoint.detail);
  }
  if (doctor && vercelEnv.status === "blocked") blockers.push(...vercelEnv.blockers);

  const configured = localBlockers.length === 0 && endpoint.endpointDeployed;
  return {
    service: serviceName,
    command: doctor ? "doctor" : "status",
    status: blockers.length === 0 ? "ready" : configured ? "configured" : "blocked",
    blockers: uniqueStrings(blockers),
    local: localDescription,
    endpoint,
    vercel: vercelEnv,
    metrics: endpoint.metrics ?? null,
    availableMetrics: availableProviderMetrics()
  };
}

async function runProviderOnce({ env, flags }) {
  const runtime = createProviderHttpWorkerRuntime({ env });
  return runtime.runOnce({ limit: positiveInteger(flags.limit, 1, 1, 5) });
}

async function startProvider({ env, flags }) {
  const status = await providerStatus({ env, flags, doctor: true });
  if (status.blockers.length > 0) {
    emitReport({ ...status, command: "start", status: "blocked" }, flags);
    process.exitCode = 1;
    return;
  }

  const runtime = createProviderHttpWorkerRuntime({ env });
  const maxIterations = flags.iterations ? positiveInteger(flags.iterations, 1, 1, 1_000_000) : Number.POSITIVE_INFINITY;
  let stopping = false;
  process.once("SIGINT", () => {
    stopping = true;
  });
  process.once("SIGTERM", () => {
    stopping = true;
  });

  console.log("Provider worker started. Press Ctrl+C to stop.");
  console.log(formatStatusLine(status));
  const report = await runtime.runLoop({
    maxIterations,
    shouldContinue: () => !stopping,
    onReport(iteration) {
      console.log(formatIterationLine(iteration));
      for (const result of iteration.results ?? []) {
        console.log(formatJobResultLine(result));
      }
    }
  });
  emitReport({ service: serviceName, command: "start", ...report }, flags);
}

async function probeProviderStatus({ baseUrl, token, routes }) {
  if (!baseUrl) {
    return {
      ok: false,
      status: "not-configured",
      endpointDeployed: false,
      detail: "CUSTOMCARD_PROVIDER_API_BASE_URL is missing."
    };
  }
  const probeToken = token && token.length >= 32 ? token : "customcard-provider-status-probe-token";
  const routeQuery = routes?.length ? `?routes=${encodeURIComponent(routes.join(","))}` : "";
  const startedAt = Date.now();
  try {
    const response = await fetch(`${trimTrailingSlash(baseUrl)}/api/provider/jobs/status${routeQuery}`, {
      method: "GET",
      headers: { authorization: `Bearer ${probeToken}` }
    });
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    const payload = contentType.includes("application/json") ? parseJson(text) : {};
    const payloadStatus = payload.status ?? "";
    const htmlInsteadOfApi = contentType.includes("text/html") || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text);
    if (htmlInsteadOfApi) {
      return {
        ok: false,
        status: "endpoint-not-deployed",
        endpointDeployed: false,
        httpStatus: response.status,
        elapsedMs: Date.now() - startedAt,
        detail: "Production returned app HTML for the provider status endpoint."
      };
    }
    return {
      ok: response.ok,
      status: payloadStatus || (response.ok ? "ready" : `http-${response.status}`),
      endpointDeployed: Boolean(payload.service === "customcard-api" || payloadStatus),
      httpStatus: response.status,
      elapsedMs: Date.now() - startedAt,
      routeScope: payload.route_scope ?? null,
      leaseTtlSeconds: payload.lease_ttl_seconds ?? null,
      metrics: payload.metrics ?? null,
      artifactUpload: payload.artifact_upload ?? null,
      detail: payload.detail ?? null
    };
  } catch (error) {
    return {
      ok: false,
      status: "network-error",
      endpointDeployed: false,
      elapsedMs: Date.now() - startedAt,
      detail: errorMessage(error)
    };
  }
}

async function configureVercelProviderEnv({ vercel, tokenHash, dryRun }) {
  if (!vercel) return { status: "blocked", blockers: ["Vercel CLI not found. Set VERCEL_CLI_PATH or install Vercel CLI."] };
  const inventory = vercelProviderEnvSummary(vercel);
  if (inventory.status === "blocked") return inventory;
  const required = {
    CUSTOMCARD_PROVIDER_WORKER_TOKEN_SHA256: tokenHash
  };
  const added = [];
  const skipped = [];
  const blockers = [];
  for (const [key, value] of Object.entries(required)) {
    if (inventory.names.includes(key)) {
      skipped.push(key);
      continue;
    }
    if (dryRun) {
      added.push(`${key} (dry-run)`);
      continue;
    }
    const add = spawnSync(vercel, ["env", "add", key, "production"], {
      input: `${value}\n`,
      encoding: "utf8",
      cwd: process.cwd()
    });
    if (add.status === 0) added.push(key);
    else blockers.push(`Failed to add Vercel env ${key}: ${firstUsefulLine(add.stderr || add.stdout)}`);
  }
  return {
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    names: inventory.names,
    added,
    skipped,
    warnings: skipped.includes("CUSTOMCARD_PROVIDER_WORKER_TOKEN_SHA256")
      ? ["Existing Vercel provider token hash was left unchanged. Use Vercel env rotation intentionally when needed."]
      : []
  };
}

function vercelProviderEnvSummary(vercel) {
  const result = spawnSync(vercel, ["env", "ls", "production"], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  if (result.status !== 0) {
    return {
      status: "blocked",
      blockers: [`Unable to read Vercel production env inventory: ${firstUsefulLine(result.stderr || result.stdout)}`]
    };
  }
  const names = Array.from(
    new Set(
      result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim().match(/^([A-Z0-9_]+)\s+/)?.[1])
        .filter(Boolean)
    )
  );
  return {
    status: "ready",
    hasProviderTokenHash: names.includes("CUSTOMCARD_PROVIDER_WORKER_TOKEN_SHA256"),
    names
  };
}

function latestReadyProductionDeploymentUrl(vercel) {
  const result = spawnSync(vercel, ["ls"], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  if (result.status !== 0) return "";
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.includes("Ready") || !line.includes("Production")) continue;
    const match = line.match(/https:\/\/\S+\.vercel\.app/);
    if (match) return match[0];
  }
  return "";
}

function findVercelCli() {
  const candidates = [
    process.env.VERCEL_CLI_PATH,
    "vercel",
    process.env.USERPROFILE ? resolve(process.env.USERPROFILE, ".local/bin/vercel.exe") : "",
    process.env.HOME ? resolve(process.env.HOME, ".local/bin/vercel") : ""
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8", cwd: process.cwd() });
    if (result.status === 0) return candidate;
  }
  return "";
}

function loadProviderEnv(cwd) {
  const env = { ...process.env };
  for (const file of [".env.local", "infra/env/.env", providerEnvFile]) {
    const absolutePath = resolve(cwd, file);
    if (!existsSync(absolutePath)) continue;
    const parsed = parseDotenv(readFileSync(absolutePath, "utf8"));
    Object.assign(env, parsed);
  }
  return env;
}

function parseDotenv(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key) parsed[key] = value;
  }
  return parsed;
}

function upsertEnvFile(filePath, updates) {
  const existing = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : ["# Local provider worker env. Do not commit this file."];
  const seen = new Set();
  const next = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match || !(match[1] in updates)) return line;
    seen.add(match[1]);
    return `${match[1]}=${escapeDotenvValue(updates[match[1]])}`;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (seen.has(key)) continue;
    next.push(`${key}=${escapeDotenvValue(value)}`);
  }
  writeFileSync(filePath, `${next.join("\n").replace(/\n+$/g, "")}\n`);
}

function escapeDotenvValue(value) {
  const text = String(value ?? "");
  return /^[A-Za-z0-9_./:,@-]+$/.test(text) ? text : JSON.stringify(text);
}

function emitReport(report, flags) {
  if (flags.json) {
    console.log(JSON.stringify(redactReport(report), null, 2));
    return;
  }
  console.log(formatHumanReport(redactReport(report)));
}

function formatHumanReport(report) {
  const lines = [`${report.service}: ${report.status}`];
  if (report.command) lines.push(`command: ${report.command}`);
  if (report.local) {
    lines.push(`worker: ${report.local.workerId ?? report.local.worker_id ?? "n/a"}`);
    if (report.local.apiBaseUrl) lines.push(`api: ${report.local.apiBaseUrl}`);
    if (report.local.routeScope) lines.push(`routes: ${report.local.routeScope.join(", ")}`);
    if ("hasProviderToken" in report.local) lines.push(`provider token: ${report.local.hasProviderToken ? "present" : "missing"}`);
  }
  if (report.endpoint) {
    lines.push(`endpoint: ${report.endpoint.status}${report.endpoint.httpStatus ? ` (${report.endpoint.httpStatus})` : ""}`);
    if (report.endpoint.detail) lines.push(`endpoint detail: ${report.endpoint.detail}`);
  }
  if (report.metrics) {
    lines.push(
      `queue: queued=${report.metrics.queued_total} running=${report.metrics.running_total} stale=${report.metrics.stale_running_total} dead=${report.metrics.dead_lettered_total} oldest=${report.metrics.oldest_queued_age_seconds}s`
    );
  }
  if (report.vercel) {
    if ("hasProviderTokenHash" in report.vercel) lines.push(`vercel token hash: ${report.vercel.hasProviderTokenHash ? "present" : "missing"}`);
    if ("hasProviderRouteScope" in report.vercel) lines.push(`vercel route scope: ${report.vercel.hasProviderRouteScope ? "present" : "missing"}`);
    if (report.vercel.added?.length) lines.push(`vercel added: ${report.vercel.added.join(", ")}`);
    if (report.vercel.skipped?.length) lines.push(`vercel kept: ${report.vercel.skipped.join(", ")}`);
  }
  for (const warning of report.warnings ?? report.vercel?.warnings ?? []) lines.push(`warning: ${warning}`);
  for (const blocker of report.blockers ?? []) lines.push(`blocker: ${blocker}`);
  if (report.next?.length) lines.push(`next: ${report.next.join(" && ")}`);
  if (report.availableMetrics?.length) lines.push(`metrics: ${report.availableMetrics.join(", ")}`);
  return lines.join("\n");
}

function formatStatusLine(status) {
  const metrics = status.metrics;
  if (!metrics) return `provider status: ${status.status}`;
  return `provider status: queued=${metrics.queued_total} running=${metrics.running_total} stale=${metrics.stale_running_total} dead=${metrics.dead_lettered_total}`;
}

function formatIterationLine(iteration) {
  return [
    new Date().toISOString(),
    `leased=${iteration.leased ?? 0}`,
    `processed=${iteration.processed ?? 0}`,
    `succeeded=${iteration.succeeded ?? 0}`,
    `failed=${iteration.failed ?? 0}`,
    `status=${iteration.status}`
  ].join(" ");
}

function formatJobResultLine(result) {
  return [
    new Date().toISOString(),
    `job=${result.job_id ?? result.id ?? "unknown"}`,
    `route=${result.route_id ?? result.routeId ?? "unknown"}`,
    `result=${result.status ?? "unknown"}`,
    `duration_ms=${safeLogNumber(result.duration_ms ?? result.durationMs)}`,
    result.reason ? `reason=${quoteLogValue(result.reason)}` : ""
  ].filter(Boolean).join(" ");
}

function safeLogNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function quoteLogValue(value) {
  return JSON.stringify(String(value ?? "").replace(/\s+/g, " ").trim()).slice(0, 600);
}

function redactReport(value) {
  if (Array.isArray(value)) return value.map(redactReport);
  if (!value || typeof value !== "object") return value;
  const redacted = {};
  for (const [key, child] of Object.entries(value)) {
    if (/token|secret|password|database_url/i.test(key)) {
      redacted[key] = typeof child === "boolean" ? child : child ? "[redacted]" : child;
    } else if (key === "names" && Array.isArray(child)) {
      redacted[key] = child.filter((name) => /^CUSTOMCARD_PROVIDER_/.test(name));
    } else {
      redacted[key] = redactReport(child);
    }
  }
  return redacted;
}

function parseCli(argv) {
  const [command = "status", ...rest] = argv;
  const flags = {};
  for (const arg of rest) {
    if (!arg.startsWith("--")) continue;
    const body = arg.slice(2);
    const index = body.indexOf("=");
    if (index === -1) flags[body] = true;
    else flags[body.slice(0, index)] = body.slice(index + 1);
  }
  return { command, flags };
}

function routeScopeFromFlags(flags, env) {
  const source = String(flags.routes ?? defaultRoutes.join(","));
  const routes = source.split(/[,\s]+/).map((route) => route.trim()).filter(Boolean);
  return Array.from(new Set(routes.length > 0 ? routes : defaultRoutes));
}

function availableProviderMetrics() {
  return [
    "queued_total",
    "running_total",
    "stale_running_total",
    "succeeded_total",
    "dead_lettered_total",
    "oldest_queued_age_seconds",
    "max_active_attempt_count",
    "max_attempts",
    "last_succeeded_at",
    "last_dead_lettered_at"
  ];
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function randomProviderToken() {
  return `cc_provider_${randomBytes(32).toString("base64url")}`;
}

function sha256Hex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function defaultWorkerId() {
  return `provider-http:${process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? "machine"}`;
}

function positiveInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function trimTrailingSlash(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function firstUsefulLine(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => !line.startsWith("(")) ?? "unknown error";
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
