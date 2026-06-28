import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawn } from "node:child_process";

const serviceName = "customcard-provider-dashboard";
const defaultPort = 8794;
const defaultHost = "127.0.0.1";
const defaultRoutes = ["ai-card-generate"];

async function main() {
  const flags = parseFlags(process.argv.slice(2));
  const cwd = process.cwd();
  const env = loadProviderEnv(cwd);
  const host = String(flags.host ?? defaultHost);
  const port = positiveInteger(flags.port, defaultPort, 1, 65_535);
  const baseUrl = trimTrailingSlash(
    String(flags.url ?? env.CUSTOMCARD_PROVIDER_API_BASE_URL ?? env.CUSTOMCARD_HOSTED_API_BASE_URL ?? "https://customcard-three.vercel.app")
  );
  const routes = routeScopeFromFlags(flags, env);
  const comfyUrl = trimTrailingSlash(String(flags["comfy-url"] ?? env.CUSTOMCARD_COMFYUI_URL ?? env.COMFYUI_URL ?? "http://127.0.0.1:8188"));

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", `http://${host}:${port}`);
      if (request.method === "GET" && requestUrl.pathname === "/") {
        sendHtml(response, dashboardHtml({ baseUrl, comfyUrl, routes }));
        return;
      }
      if (request.method === "GET" && requestUrl.pathname === "/api/status") {
        sendJson(response, 200, await buildDashboardStatus({ cwd, env, baseUrl, routes, comfyUrl }));
        return;
      }
      sendJson(response, 404, { service: serviceName, status: "not-found" });
    } catch (error) {
      sendJson(response, 500, {
        service: serviceName,
        status: "internal-error",
        detail: error instanceof Error ? error.message : "Unknown dashboard error."
      });
    }
  });

  server.listen(port, host, () => {
    const dashboardUrl = `http://${host}:${port}/`;
    console.log(`${serviceName}: ${dashboardUrl}`);
    if (!flags["no-open"]) openBrowser(dashboardUrl);
  });
}

async function buildDashboardStatus({ cwd, env, baseUrl, routes, comfyUrl }) {
  const [provider, comfy] = await Promise.all([
    readProviderStatus({ env, baseUrl, routes }),
    readComfyStatus({ comfyUrl })
  ]);
  return {
    service: serviceName,
    status: provider.ok && comfy.ok ? "ready" : "attention",
    updatedAtIso: new Date().toISOString(),
    provider,
    comfy,
    workerLog: readLatestWorkerLog(cwd)
  };
}

async function readProviderStatus({ env, baseUrl, routes }) {
  const token = String(env.CUSTOMCARD_PROVIDER_WORKER_TOKEN ?? "").trim();
  if (!baseUrl) {
    return { ok: false, status: "missing-url", detail: "CUSTOMCARD_PROVIDER_API_BASE_URL is missing." };
  }
  if (token.length < 32) {
    return { ok: false, status: "missing-token", endpoint: baseUrl, routeScope: routes, detail: "CUSTOMCARD_PROVIDER_WORKER_TOKEN is missing locally." };
  }

  const routeQuery = routes.length ? `?routes=${encodeURIComponent(routes.join(","))}` : "";
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/provider/jobs/status${routeQuery}`, {
      headers: { authorization: `Bearer ${token}` }
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: safeText(payload.status, response.ok ? "ready" : `http-${response.status}`),
      httpStatus: response.status,
      elapsedMs: Date.now() - startedAt,
      endpoint: baseUrl,
      routeScope: Array.isArray(payload.route_scope) ? payload.route_scope.map(String) : routes,
      leaseTtlSeconds: safeNumber(payload.lease_ttl_seconds),
      metrics: normalizeMetrics(payload.metrics),
      detail: safeText(payload.detail, "")
    };
  } catch (error) {
    return {
      ok: false,
      status: "network-error",
      elapsedMs: Date.now() - startedAt,
      endpoint: baseUrl,
      routeScope: routes,
      detail: error instanceof Error ? error.message : "Provider status request failed."
    };
  }
}

async function readComfyStatus({ comfyUrl }) {
  const startedAt = Date.now();
  try {
    const statsResponse = await fetch(`${comfyUrl}/system_stats`, { signal: AbortSignal.timeout(2500) });
    const stats = await statsResponse.json().catch(() => ({}));
    const [queueResult, historyResult] = await Promise.allSettled([
      fetchJsonWithTimeout(`${comfyUrl}/queue`),
      fetchJsonWithTimeout(`${comfyUrl}/history`)
    ]);
    const queue = queueResult.status === "fulfilled" ? queueResult.value : {};
    const history = historyResult.status === "fulfilled" ? historyResult.value : {};
    const recentHistory = normalizeComfyHistory(history);
    const failedPrompt = recentHistory.find((item) => item.failedNodeId || /error|failed/i.test(item.status));
    return {
      ok: statsResponse.ok,
      status: statsResponse.ok ? "ready" : `http-${statsResponse.status}`,
      endpoint: comfyUrl,
      elapsedMs: Date.now() - startedAt,
      gpu: Array.isArray(stats.devices)
        ? stats.devices.map((device) => ({
            name: safeText(device.name, "GPU"),
            type: safeText(device.type, ""),
            vramFree: safeNumber(device.vram_free),
            vramTotal: safeNumber(device.vram_total)
          }))
        : [],
      queueRunning: Array.isArray(queue.queue_running) ? queue.queue_running.length : 0,
      queuePending: Array.isArray(queue.queue_pending) ? queue.queue_pending.length : 0,
      runningPrompts: normalizeComfyQueueEntries(queue.queue_running),
      pendingPrompts: normalizeComfyQueueEntries(queue.queue_pending),
      recentHistory,
      failedPrompt
    };
  } catch (error) {
    return {
      ok: false,
      status: "offline",
      endpoint: comfyUrl,
      elapsedMs: Date.now() - startedAt,
      gpu: [],
      queueRunning: 0,
      queuePending: 0,
      detail: error instanceof Error ? error.message : "ComfyUI is not reachable."
    };
  }
}

function readLatestWorkerLog(cwd) {
  const logDir = resolve(cwd, ".codex", "logs");
  if (!existsSync(logDir)) return { status: "missing", lines: [], recentJobs: [], recentHeartbeats: [] };
  const files = readdirSync(logDir)
    .filter((name) => /^provider-queue-worker-.+\.log$/i.test(name))
    .map((name) => {
      const path = join(logDir, name);
      return { name, path, stats: statSync(path) };
    })
    .sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
  const latest = files[0];
  if (!latest) return { status: "missing", lines: [], recentJobs: [], recentHeartbeats: [] };
  const rawLines = normalizeLogText(readFileSync(latest.path, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed = parseWorkerLogLines(rawLines);
  return {
    status: "ready",
    path: relative(cwd, latest.path),
    updatedAtIso: latest.stats.mtime.toISOString(),
    lines: rawLines.slice(-120).map(redactLogLine),
    ...parsed
  };
}

async function fetchJsonWithTimeout(url, timeoutMs = 2500) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return payload;
}

function normalizeComfyQueueEntries(entries) {
  return Array.isArray(entries)
    ? entries.map((entry, index) => normalizeComfyQueueEntry(entry, index)).filter(Boolean)
    : [];
}

function normalizeComfyQueueEntry(entry, index) {
  let position = index + 1;
  let promptId = "";
  let prompt = {};
  let extraData = {};
  let outputsToExecute = [];
  if (Array.isArray(entry)) {
    position = safeNumber(entry[0]) || index + 1;
    promptId = safeText(entry[1], "");
    prompt = entry[2] && typeof entry[2] === "object" ? entry[2] : {};
    extraData = entry[3] && typeof entry[3] === "object" ? entry[3] : {};
    outputsToExecute = Array.isArray(entry[4]) ? entry[4] : [];
  } else if (entry && typeof entry === "object") {
    position = safeNumber(entry.position ?? entry.number) || index + 1;
    promptId = safeText(entry.prompt_id ?? entry.promptId ?? entry.id, "");
    prompt = entry.prompt && typeof entry.prompt === "object" ? entry.prompt : {};
    extraData = entry.extra_data && typeof entry.extra_data === "object" ? entry.extra_data : {};
    outputsToExecute = Array.isArray(entry.outputs_to_execute) ? entry.outputs_to_execute : [];
  }

  const customcard = extraData.customcard && typeof extraData.customcard === "object" ? extraData.customcard : {};
  const nodes = normalizeComfyNodes(prompt);
  return {
    position,
    promptId,
    workflowId: safeText(customcard.workflow_id, ""),
    panelId: safeText(customcard.panel_id, ""),
    seed: customcard.seed ?? "",
    nodeCount: nodes.length,
    outputNodes: nodes.filter((node) => /save|preview|output/i.test(node.type)).slice(0, 8),
    nodes: nodes.slice(0, 36),
    outputsToExecute: outputsToExecute.map(String).slice(0, 12),
    inputs: summarizeDiagnosticObject(customcard.inputs ?? {})
  };
}

function normalizeComfyNodes(prompt) {
  if (!prompt || typeof prompt !== "object" || Array.isArray(prompt)) return [];
  return Object.entries(prompt)
    .map(([id, node]) => ({
      id,
      type: safeText(node?.class_type, "Node"),
      inputs: summarizeDiagnosticObject(node?.inputs ?? {})
    }))
    .sort((left, right) => (Number(left.id) - Number(right.id)) || left.id.localeCompare(right.id));
}

function normalizeComfyHistory(history) {
  if (!history || typeof history !== "object" || Array.isArray(history)) return [];
  return Object.entries(history)
    .map(([promptId, item]) => normalizeComfyHistoryItem(promptId, item))
    .filter(Boolean)
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
    .slice(0, 10);
}

function normalizeComfyHistoryItem(promptId, item) {
  if (!item || typeof item !== "object") return null;
  const status = item.status && typeof item.status === "object" ? item.status : {};
  const messages = Array.isArray(status.messages) ? status.messages : [];
  const failure = comfyFailureFromMessages(messages);
  const nodes = normalizeComfyNodes(item.prompt);
  const failedNode = failure.nodeId ? nodes.find((node) => node.id === String(failure.nodeId)) : undefined;
  const outputs = summarizeComfyOutputs(item.outputs);
  const timestamps = messages
    .map((message) => normalizeComfyTimestamp(Array.isArray(message) ? message[1]?.timestamp : undefined))
    .filter((value) => value > 0);
  const firstAtMs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
  const updatedAtMs = timestamps.length > 0 ? Math.max(...timestamps) : 0;
  const statusText = safeText(status.status_str, status.completed === true ? "succeeded" : "unknown");
  return {
    promptId,
    status: statusText,
    completed: Boolean(status.completed),
    durationMs: firstAtMs > 0 && updatedAtMs > firstAtMs ? updatedAtMs - firstAtMs : 0,
    updatedAtIso: updatedAtMs > 0 ? new Date(updatedAtMs).toISOString() : "",
    updatedAtMs,
    failedNodeId: failure.nodeId,
    failedNodeType: failure.nodeType || failedNode?.type || "",
    error: sanitizeDiagnosticText(failure.error),
    nodeCount: nodes.length,
    outputs,
    outputCount: outputs.reduce((sum, output) => sum + output.files.length, 0)
  };
}

function comfyFailureFromMessages(messages) {
  for (const message of messages.slice().reverse()) {
    if (!Array.isArray(message)) continue;
    const [eventName, payload] = message;
    if (eventName !== "execution_error" || !payload || typeof payload !== "object") continue;
    return {
      nodeId: safeText(payload.node_id ?? payload.node, ""),
      nodeType: safeText(payload.node_type, ""),
      error: safeText(payload.exception_message ?? payload.exception_type ?? payload.message, "ComfyUI execution failed.")
    };
  }
  return { nodeId: "", nodeType: "", error: "" };
}

function summarizeComfyOutputs(outputs) {
  if (!outputs || typeof outputs !== "object" || Array.isArray(outputs)) return [];
  return Object.entries(outputs).flatMap(([nodeId, output]) => {
    const files = [...(Array.isArray(output?.images) ? output.images : []), ...(Array.isArray(output?.gifs) ? output.gifs : [])]
      .map((file) => safeText(file?.filename ?? file?.name, ""))
      .filter(Boolean)
      .slice(0, 8);
    return files.length > 0 ? [{ nodeId, files }] : [];
  }).slice(0, 10);
}

function normalizeComfyTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  if (number > 1_000_000_000_000) return number;
  if (number > 1_000_000_000) return number * 1000;
  return 0;
}

function summarizeDiagnosticObject(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return sanitizeDiagnosticText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => summarizeDiagnosticObject(item, depth + 1));
  if (typeof value !== "object") return sanitizeDiagnosticText(value);
  if (depth >= 2) return sanitizeDiagnosticText(JSON.stringify(value));
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 24)
      .map(([key, child]) => [key, summarizeDiagnosticObject(child, depth + 1)])
  );
}

function parseWorkerLogLines(lines) {
  const records = lines.map(parseWorkerLogLine).filter(Boolean);
  const recentJobs = records.filter((record) => record.job).slice(-12).reverse();
  const recentHeartbeats = records.filter((record) => "leased" in record).slice(-12).reverse();
  return {
    recentJobs,
    recentHeartbeats,
    lastActivity: records.at(-1) ?? null
  };
}

function parseWorkerLogLine(line) {
  const timestamp = String(line).match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)?.[0] ?? "";
  const values = parseLogKeyValues(line);
  if (!timestamp && Object.keys(values).length === 0) return null;
  const record = { atIso: timestamp, raw: redactLogLine(line) };
  for (const [key, value] of Object.entries(values)) {
    record[key] = /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : sanitizeDiagnosticText(value);
  }
  return record;
}

function parseLogKeyValues(line) {
  const values = {};
  const regex = /([A-Za-z_][A-Za-z0-9_]*)=("(?:\\.|[^"])*"|\S+)/g;
  let match;
  while ((match = regex.exec(String(line)))) {
    let value = match[2];
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1);
      }
    }
    values[match[1]] = String(value);
  }
  return values;
}

function dashboardHtml({ baseUrl, comfyUrl, routes }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CustomCard Queue Client</title>
  <style>
    :root { color-scheme: dark; --ink:#f8fafc; --muted:#94a3b8; --line:#263244; --surface:#0f172a; --surface-2:#111c31; --soft:#17233a; --good:#22c55e; --bad:#f87171; --warn:#fbbf24; --info:#38bdf8; --console:#020617; }
    * { box-sizing:border-box; }
    body { margin:0; font:14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:linear-gradient(180deg, #020617 0%, #08111f 42%, #0b1220 100%); }
    main { width:min(1440px, calc(100vw - 32px)); margin:0 auto; padding:22px 0 34px; display:grid; gap:14px; }
    header { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; padding:4px 0 10px; border-bottom:1px solid var(--line); }
    h1, h2, h3 { margin:0; letter-spacing:0; }
    h1 { font-size:28px; line-height:1.05; }
    h2 { font-size:14px; }
    h3 { font-size:13px; color:#cbd5e1; }
    p { margin:4px 0 0; color:var(--muted); }
    button, a.button { min-height:40px; border:1px solid var(--line); border-radius:8px; padding:0 12px; color:var(--ink); background:#101b31; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:8px; cursor:pointer; }
    button:hover, a.button:hover { background:#17233a; }
    button:focus-visible, a.button:focus-visible, summary:focus-visible { outline:3px solid rgba(56, 189, 248, .55); outline-offset:2px; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
    button.secondary { color:#cbd5e1; background:#0b1220; }
    .grid { display:grid; grid-template-columns:1.45fr .95fr .85fr; gap:12px; }
    .ops-grid { display:grid; grid-template-columns:1.3fr .9fr; gap:12px; }
    .card { min-width:0; padding:14px; border:1px solid var(--line); border-radius:8px; background:rgba(15, 23, 42, .92); box-shadow:0 18px 48px rgba(0, 0, 0, .22); }
    .wide { grid-column:1/-1; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; }
    .pill { display:inline-flex; align-items:center; min-height:24px; padding:3px 8px; border-radius:999px; color:#052e16; background:var(--good); font-size:12px; font-weight:850; white-space:nowrap; }
    .pill.bad { color:#450a0a; background:var(--bad); }
    .pill.warn { color:#422006; background:var(--warn); }
    .pill.info { color:#082f49; background:var(--info); }
    .metrics { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; }
    .metric { min-width:0; padding:10px; border:1px solid var(--line); border-radius:8px; background:var(--soft); }
    .metric span { display:block; color:var(--muted); font-size:12px; font-weight:750; }
    .metric strong { display:block; margin-top:3px; font-size:20px; overflow-wrap:anywhere; font-variant-numeric:tabular-nums; }
    .meta { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
    .meta span { padding:5px 8px; border:1px solid var(--line); border-radius:8px; color:#cbd5e1; background:#0b1220; font-size:12px; font-weight:760; }
    .rail { display:grid; gap:8px; }
    .row { min-width:0; padding:10px; border:1px solid var(--line); border-radius:8px; background:var(--surface-2); }
    .row.failed { border-color:rgba(248, 113, 113, .65); }
    .row.running { border-color:rgba(56, 189, 248, .75); }
    .row-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .row-title { display:flex; gap:8px; align-items:center; flex-wrap:wrap; min-width:0; }
    .mono { font-family:"JetBrains Mono", "SFMono-Regular", Consolas, monospace; font-variant-numeric:tabular-nums; }
    .subtle { color:var(--muted); font-size:12px; }
    .node-grid { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
    .node { border:1px solid #334155; border-radius:7px; padding:5px 7px; color:#cbd5e1; background:#0b1220; font-size:12px; }
    .node.active { border-color:var(--info); color:#e0f2fe; background:#082f49; }
    .split { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; }
    details { margin-top:8px; }
    summary { min-height:34px; display:flex; align-items:center; color:#cbd5e1; cursor:pointer; font-weight:800; }
    pre { max-height:360px; overflow:auto; margin:0; padding:12px; border-radius:8px; background:var(--console); color:#d6eded; white-space:pre-wrap; overflow-wrap:anywhere; border:1px solid #1e293b; }
    .mini-json { max-height:230px; font-size:12px; }
    .empty { min-height:92px; display:grid; place-items:center; color:var(--muted); border:1px dashed #334155; border-radius:8px; background:rgba(15, 23, 42, .55); text-align:center; padding:12px; }
    .error { color:var(--bad); font-weight:800; }
    @media (max-width: 980px) { .grid, .ops-grid, .metrics, .split { grid-template-columns:1fr; } header { display:grid; } .actions { justify-content:flex-start; } }
    @media (prefers-reduced-motion: no-preference) { .node.active { animation:pulse 1.4s ease-in-out infinite; } @keyframes pulse { 0%, 100% { box-shadow:0 0 0 rgba(56, 189, 248, 0); } 50% { box-shadow:0 0 0 4px rgba(56, 189, 248, .18); } } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>CustomCard Queue Client</h1>
        <p>Production provider queue plus local ComfyUI status.</p>
      </div>
      <div class="actions">
        <button id="refresh" type="button">Refresh</button>
        <button class="secondary" id="auto-refresh" type="button" aria-pressed="false">Auto refresh off</button>
        <a class="button" href="${escapeHtml(baseUrl)}/?view=admin" target="_blank" rel="noreferrer">Open admin</a>
        <a class="button" href="${escapeHtml(comfyUrl)}" target="_blank" rel="noreferrer">Open ComfyUI</a>
      </div>
    </header>
    <section class="grid">
      <article class="card" id="provider-card"></article>
      <article class="card" id="comfy-card"></article>
      <article class="card" id="runtime-card"></article>
      <article class="card wide" id="live-node-card"></article>
    </section>
    <section class="ops-grid">
      <article class="card" id="execution-card"></article>
      <article class="card" id="jobs-card"></article>
      <article class="card wide" id="activity-card">
        <div class="head"><div><h2>Activity log</h2><p id="log-path"></p></div><span class="pill" id="log-status">Loading</span></div>
        <div class="rail" id="activity-log"><div class="empty">Loading activity...</div></div>
        <details>
          <summary>Raw worker heartbeat log</summary>
          <pre id="log-lines">Loading...</pre>
        </details>
      </article>
    </section>
  </main>
  <script>
    const routes = ${JSON.stringify(routes)};
    const providerCard = document.querySelector("#provider-card");
    const comfyCard = document.querySelector("#comfy-card");
    const runtimeCard = document.querySelector("#runtime-card");
    const liveNodeCard = document.querySelector("#live-node-card");
    const executionCard = document.querySelector("#execution-card");
    const jobsCard = document.querySelector("#jobs-card");
    const activityLog = document.querySelector("#activity-log");
    const logPath = document.querySelector("#log-path");
    const logStatus = document.querySelector("#log-status");
    const logLines = document.querySelector("#log-lines");
    const comfyEndpoint = ${JSON.stringify(comfyUrl)};
    const liveNode = { connected: false, status: "waiting", promptId: "", nodeId: "", nodeType: "", detail: "", progress: "" };
    const refreshButton = document.querySelector("#refresh");
    const autoRefreshButton = document.querySelector("#auto-refresh");
    let latestComfy = {};
    let autoRefresh = false;
    let diagnosticsSignature = "";
    refreshButton.addEventListener("click", () => load({ quiet: false, forceDiagnostics: true }));
    autoRefreshButton.addEventListener("click", () => {
      autoRefresh = !autoRefresh;
      autoRefreshButton.textContent = autoRefresh ? "Auto refresh on" : "Auto refresh off";
      autoRefreshButton.setAttribute("aria-pressed", String(autoRefresh));
      if (autoRefresh) load({ quiet: true, forceDiagnostics: false });
    });
    function pill(status, ok, tone) { return '<span class="pill ' + (tone || (ok ? '' : status === 'loading' ? 'warn' : 'bad')) + '">' + esc(status) + '</span>'; }
    function metric(label, value) { return '<div class="metric"><span>' + esc(label) + '</span><strong>' + esc(value ?? 0) + '</strong></div>'; }
    function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function jsonBlock(value) { return '<pre class="mini-json mono">' + esc(JSON.stringify(value ?? {}, null, 2)) + '</pre>'; }
    function metricsHtml(metrics) {
      return '<div class="metrics">' +
        metric('Queued', metrics?.queued_total) +
        metric('Running', metrics?.running_total) +
        metric('Stale', metrics?.stale_running_total) +
        metric('Dead', metrics?.dead_lettered_total) +
        metric('Succeeded', metrics?.succeeded_total) +
        metric('Oldest queued', (metrics?.oldest_queued_age_seconds ?? 0) + 's') +
        metric('Active attempts', metrics?.max_active_attempt_count) +
        metric('Max attempts', metrics?.max_attempts) +
      '</div>';
    }
    async function load({ quiet = false, forceDiagnostics = false } = {}) {
      if (!quiet) {
        providerCard.innerHTML = '<div class="head"><div><h2>Provider queue</h2><p>Routes: ' + esc(routes.join(', ')) + '</p></div>' + pill('loading', true) + '</div>';
        liveNodeCard.innerHTML = renderLiveNodeCard();
      }
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        const data = await res.json();
        const p = data.provider || {};
        const c = data.comfy || {};
        latestComfy = c;
        providerCard.innerHTML =
          '<div class="head"><div><h2>Provider queue</h2><p>' + esc(p.endpoint || '') + '</p></div>' + pill(p.status || 'unknown', p.ok) + '</div>' +
          metricsHtml(p.metrics || {}) +
          '<div class="meta"><span>HTTP ' + esc(p.httpStatus || 'n/a') + '</span><span>' + esc(p.elapsedMs || 0) + 'ms</span><span>' + esc((p.routeScope || routes).join(', ')) + '</span><span>TTL ' + esc(p.leaseTtlSeconds || 0) + 's</span></div>' +
          (p.detail ? '<p class="error">' + esc(p.detail) + '</p>' : '');
        comfyCard.innerHTML =
          '<div class="head"><div><h2>ComfyUI</h2><p>' + esc(c.endpoint || '') + '</p></div>' + pill(c.status || 'unknown', c.ok) + '</div>' +
          '<div class="metrics">' + metric('Running', c.queueRunning) + metric('Pending', c.queuePending) + metric('Latency', formatDurationMs(c.elapsedMs)) + metric('Failed node', c.failedPrompt?.failedNodeId || 'none') + '</div>' +
          '<div class="meta">' + (c.gpu || []).map(g => '<span>' + esc(g.name) + ' VRAM ' + esc(formatBytes(g.vramFree)) + ' free</span>').join('') + '</div>' +
          (c.failedPrompt?.error ? '<p class="error">Last Comfy failure: node ' + esc(c.failedPrompt.failedNodeId) + ' ' + esc(c.failedPrompt.failedNodeType) + ' - ' + esc(c.failedPrompt.error) + '</p>' : '') +
          (c.detail ? '<p class="error">' + esc(c.detail) + '</p>' : '');
        runtimeCard.innerHTML =
          '<div class="head"><div><h2>Runtime</h2><p>Last refresh</p></div>' + pill(data.status || 'unknown', data.status === 'ready') + '</div>' +
          '<div class="metrics">' + metric('Updated', new Date(data.updatedAtIso).toLocaleTimeString()) + metric('Route count', routes.length) + metric('Log jobs', data.workerLog?.recentJobs?.length || 0) + metric('History', c.recentHistory?.length || 0) + '</div>';
        liveNodeCard.innerHTML = renderLiveNodeCard();
        const nextSignature = diagnosticSignature(p, c, data.workerLog || {});
        const canRepaintDiagnostics = forceDiagnostics || !quiet || (!isUserInspectingDiagnostics() && nextSignature !== diagnosticsSignature);
        if (canRepaintDiagnostics) {
          diagnosticsSignature = nextSignature;
          executionCard.innerHTML = renderExecutionCard(c);
          jobsCard.innerHTML = renderJobsCard(data.workerLog || {});
          activityLog.innerHTML = renderActivityLog({ provider: p, comfy: c, workerLog: data.workerLog || {} });
        }
        const log = data.workerLog || {};
        logStatus.textContent = log.status || 'missing';
        logStatus.className = 'pill ' + (log.status === 'ready' ? '' : 'warn');
        logPath.textContent = log.path || 'No provider queue worker log found.';
        if (forceDiagnostics || !quiet || !isUserInspectingDiagnostics()) {
          logLines.textContent = (log.lines || []).join('\\n') || 'No log lines yet.';
        }
      } catch (error) {
        providerCard.innerHTML = '<div class="head"><div><h2>Provider queue</h2></div>' + pill('failed', false) + '</div><p class="error">' + esc(error.message || error) + '</p>';
      }
    }
    function diagnosticSignature(p, c, log) {
      return JSON.stringify({
        provider: [p.status, p.metrics?.queued_total, p.metrics?.running_total, p.metrics?.dead_lettered_total, p.metrics?.stale_running_total, p.metrics?.oldest_queued_age_seconds],
        comfy: [c.status, c.queueRunning, c.queuePending, c.failedPrompt?.promptId, c.failedPrompt?.failedNodeId],
        running: c.runningPrompts?.map(p => [p.promptId, p.nodeCount]) || [],
        pending: c.pendingPrompts?.map(p => p.promptId) || [],
        history: c.recentHistory?.map(h => [h.promptId, h.status, h.failedNodeId, h.outputCount]) || [],
        jobs: log.recentJobs?.map(j => [j.job, j.result, j.duration_ms, j.reason]) || [],
        heartbeats: log.recentHeartbeats?.slice(0, 2).map(h => [h.atIso, h.leased, h.processed, h.succeeded, h.failed]) || []
      });
    }
    function isUserInspectingDiagnostics() {
      return document.querySelector("#execution-card details[open], #jobs-card details[open], #activity-card details[open]") || document.activeElement?.closest?.("#execution-card, #jobs-card, #activity-card, #log-lines");
    }
    function renderLiveNodeCard() {
      const node = liveNode.nodeId ? ('Node ' + liveNode.nodeId + (liveNode.nodeType ? ' / ' + liveNode.nodeType : '')) : 'No live node event yet';
      const status = liveNode.connected ? liveNode.status : 'socket offline';
      return '<div class="head"><div><h2>Live Comfy node</h2><p>Uses ComfyUI websocket while this dashboard is open.</p></div>' + pill(status, liveNode.connected, liveNode.connected ? 'info' : 'warn') + '</div>' +
        '<div class="metrics">' + metric('Prompt', shortId(liveNode.promptId || 'waiting')) + metric('In progress', node) + metric('Progress', liveNode.progress || 'n/a') + metric('Detail', liveNode.detail || 'n/a') + '</div>';
    }
    function renderExecutionCard(c) {
      const running = c.runningPrompts || [];
      const pending = c.pendingPrompts || [];
      const history = c.recentHistory || [];
      return '<div class="head"><div><h2>Execution rail</h2><p>Running and pending Comfy prompts, graph nodes, inputs, and outputs.</p></div>' + pill((running.length || pending.length) ? 'active' : 'idle', true, (running.length || pending.length) ? 'info' : '') + '</div>' +
        '<div class="rail">' +
          sectionRows('Running prompts', running, 'running') +
          sectionRows('Pending prompts', pending, 'pending') +
          historyRows(history) +
        '</div>';
    }
    function sectionRows(title, rows, state) {
      if (!rows.length) return '<h3>' + esc(title) + '</h3><div class="empty">No ' + esc(title.toLowerCase()) + '.</div>';
      return '<h3>' + esc(title) + '</h3>' + rows.map(row => promptRow(row, state)).join('');
    }
    function promptRow(row, state) {
      const isLive = liveNode.promptId && row.promptId === liveNode.promptId;
      return '<div class="row ' + (isLive ? 'running' : '') + '">' +
        '<div class="row-head"><div class="row-title"><strong class="mono">' + esc(shortId(row.promptId || ('#' + row.position))) + '</strong>' + pill(state, true, state === 'running' ? 'info' : 'warn') + (row.panelId ? pill(row.panelId, true, 'info') : '') + '</div><span class="subtle mono">' + esc(row.nodeCount) + ' nodes</span></div>' +
        '<div class="meta"><span>workflow ' + esc(row.workflowId || 'default') + '</span><span>seed ' + esc(row.seed || 'n/a') + '</span><span>outputs ' + esc((row.outputNodes || []).map(n => n.id + ':' + n.type).join(', ') || 'n/a') + '</span></div>' +
        nodeList(row.nodes || [], row.promptId) +
        '<div class="split"><details><summary>Inputs</summary>' + jsonBlock(row.inputs || {}) + '</details><details><summary>Output nodes</summary>' + jsonBlock(row.outputNodes || []) + '</details></div>' +
      '</div>';
    }
    function nodeList(nodes, promptId) {
      if (!nodes.length) return '';
      return '<div class="node-grid">' + nodes.map(node => '<span class="node ' + (liveNode.promptId === promptId && liveNode.nodeId === node.id ? 'active' : '') + ' mono">' + esc(node.id + ' ' + node.type) + '</span>').join('') + '</div>';
    }
    function historyRows(history) {
      if (!history.length) return '<h3>Recent Comfy history</h3><div class="empty">No Comfy history returned yet.</div>';
      return '<h3>Recent Comfy history</h3>' + history.map(item => {
        const failed = item.failedNodeId || /error|failed/i.test(item.status);
        return '<div class="row ' + (failed ? 'failed' : '') + '">' +
          '<div class="row-head"><div class="row-title"><strong class="mono">' + esc(shortId(item.promptId)) + '</strong>' + pill(item.status, !failed, failed ? 'bad' : '') + '</div><span class="subtle mono">' + esc(formatDurationMs(item.durationMs)) + '</span></div>' +
          '<div class="meta"><span>failed node ' + esc(item.failedNodeId || 'none') + '</span><span>type ' + esc(item.failedNodeType || 'n/a') + '</span><span>outputs ' + esc(item.outputCount || 0) + '</span></div>' +
          (item.error ? '<p class="error">' + esc(item.error) + '</p>' : '') +
          '<details><summary>Outputs</summary>' + jsonBlock(item.outputs || []) + '</details>' +
        '</div>';
      }).join('');
    }
    function renderJobsCard(log) {
      const jobs = log.recentJobs || [];
      const heartbeats = log.recentHeartbeats || [];
      const jobRows = jobs.length
        ? jobs.map(job => '<div class="row ' + (job.result === 'failed' ? 'failed' : '') + '"><div class="row-head"><div class="row-title"><strong class="mono">' + esc(shortId(job.job)) + '</strong>' + pill(job.result || 'unknown', job.result !== 'failed', job.result === 'failed' ? 'bad' : '') + '</div><span class="subtle mono">' + esc(formatDurationMs(job.duration_ms)) + '</span></div><div class="meta"><span>route ' + esc(job.route || 'n/a') + '</span><span>at ' + esc(formatTime(job.atIso)) + '</span></div>' + (job.reason ? '<p class="error">' + esc(job.reason) + '</p>' : '') + '</div>').join('')
        : '<div class="empty">No job detail lines yet. The next worker with this patch will write per-job timings here.</div>';
      const heartbeatRows = heartbeats.slice(0, 5).map(row => '<div class="row"><div class="row-head"><strong class="mono">' + esc(formatTime(row.atIso)) + '</strong><span class="subtle mono">status ' + esc(row.status || 'unknown') + '</span></div><div class="meta"><span>leased ' + esc(row.leased ?? 0) + '</span><span>processed ' + esc(row.processed ?? 0) + '</span><span>succeeded ' + esc(row.succeeded ?? 0) + '</span><span>failed ' + esc(row.failed ?? 0) + '</span></div></div>').join('');
      return '<div class="head"><div><h2>Worker jobs</h2><p>Durations and outcomes from per-job worker result lines.</p></div>' + pill(log.status || 'missing', log.status === 'ready') + '</div><div class="rail">' + jobRows + '<details><summary>Heartbeat summaries</summary>' + (heartbeatRows || '<div class="empty">No heartbeat lines yet.</div>') + '</details></div>';
    }
    function renderActivityLog({ provider, comfy, workerLog }) {
      const rows = [];
      const metrics = provider?.metrics || {};
      const queued = Number(metrics.queued_total || 0);
      const running = Number(metrics.running_total || 0);
      const stale = Number(metrics.stale_running_total || 0);
      const dead = Number(metrics.dead_lettered_total || 0);
      const queueTone = provider?.ok === false ? 'bad' : dead || stale ? 'warn' : running ? 'info' : '';
      const queueStatus = provider?.ok === false ? 'provider error' : dead ? 'dead letters' : stale ? 'stale running' : running ? 'running' : queued ? 'queued' : 'idle';
      rows.push(activityRow({
        title: 'Provider queue snapshot',
        status: queueStatus,
        tone: queueTone,
        time: provider?.elapsedMs ? formatDurationMs(provider.elapsedMs) : '',
        meta: ['queued ' + queued, 'running ' + running, 'stale ' + stale, 'dead ' + dead, 'oldest queued ' + (metrics.oldest_queued_age_seconds ?? 0) + 's'],
        detail: provider?.detail || ''
      }));
      const failedNode = comfy?.failedPrompt?.failedNodeId || '';
      const comfyRunning = Number(comfy?.queueRunning || 0);
      const comfyPending = Number(comfy?.queuePending || 0);
      const comfyTone = comfy?.ok === false || failedNode ? 'bad' : comfyRunning ? 'info' : comfyPending ? 'warn' : '';
      const comfyStatus = comfy?.ok === false ? 'comfy error' : failedNode ? 'failed node ' + failedNode : comfyRunning ? 'executing' : comfyPending ? 'pending' : 'idle';
      rows.push(activityRow({
        title: 'Comfy queue snapshot',
        status: comfyStatus,
        tone: comfyTone,
        time: formatDurationMs(comfy?.elapsedMs),
        meta: ['running ' + comfyRunning, 'pending ' + comfyPending, 'failed node ' + (failedNode || 'none')],
        detail: comfy?.failedPrompt?.error || comfy?.detail || ''
      }));
      (workerLog.recentJobs || []).slice(0, 6).forEach(job => {
        rows.push(activityRow({
          title: 'Worker job ' + shortId(job.job),
          status: job.result || 'unknown',
          tone: job.result === 'failed' ? 'bad' : '',
          time: formatDurationMs(job.duration_ms),
          meta: ['route ' + (job.route || 'n/a'), 'at ' + formatTime(job.atIso)],
          detail: job.reason || ''
        }));
      });
      (comfy.recentHistory || []).slice(0, 6).forEach(item => {
        const failed = item.failedNodeId || /error|failed/i.test(item.status);
        rows.push(activityRow({
          title: 'Comfy prompt ' + shortId(item.promptId),
          status: item.status || 'history',
          tone: failed ? 'bad' : '',
          time: formatDurationMs(item.durationMs),
          meta: ['failed node ' + (item.failedNodeId || 'none'), 'type ' + (item.failedNodeType || 'n/a'), 'outputs ' + (item.outputCount || 0)],
          detail: item.error || ''
        }));
      });
      if (!(workerLog.recentJobs || []).length && !(comfy.recentHistory || []).length) {
        const heartbeat = (workerLog.recentHeartbeats || [])[0];
        rows.push(heartbeat ? activityRow({
          title: 'Worker heartbeat',
          status: heartbeat.status || 'alive',
          tone: '',
          time: formatTime(heartbeat.atIso),
          meta: ['leased ' + (heartbeat.leased ?? 0), 'processed ' + (heartbeat.processed ?? 0), 'succeeded ' + (heartbeat.succeeded ?? 0), 'failed ' + (heartbeat.failed ?? 0)],
          detail: 'No job result or Comfy history events have been logged yet.'
        }) : '<div class="empty">No worker, queue, or Comfy activity yet.</div>');
      }
      return rows.join('');
    }
    function activityRow({ title, status, tone, time, meta, detail }) {
      const rowClass = tone === 'bad' ? ' failed' : tone === 'info' ? ' running' : '';
      const metaHtml = (meta || []).filter(Boolean).map(item => '<span>' + esc(item) + '</span>').join('');
      const detailHtml = detail ? '<p class="' + (tone === 'bad' ? 'error' : 'subtle') + '">' + esc(detail) + '</p>' : '';
      return '<div class="row' + rowClass + '"><div class="row-head"><div class="row-title"><strong>' + esc(title) + '</strong>' + pill(status || 'event', tone !== 'bad', tone || '') + '</div><span class="subtle mono">' + esc(time || '') + '</span></div>' + (metaHtml ? '<div class="meta">' + metaHtml + '</div>' : '') + detailHtml + '</div>';
    }
    function connectComfySocket() {
      try {
        const url = new URL(comfyEndpoint);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        url.pathname = '/ws';
        url.search = '?clientId=customcard-provider-dashboard';
        const socket = new WebSocket(url.toString());
        socket.addEventListener('open', () => { liveNode.connected = true; liveNode.status = 'connected'; liveNode.detail = 'listening'; liveNodeCard.innerHTML = renderLiveNodeCard(); });
        socket.addEventListener('close', () => { liveNode.connected = false; liveNode.status = 'reconnecting'; liveNode.detail = 'socket closed'; liveNodeCard.innerHTML = renderLiveNodeCard(); setTimeout(connectComfySocket, 3000); });
        socket.addEventListener('error', () => { liveNode.connected = false; liveNode.status = 'socket error'; liveNode.detail = 'check ComfyUI'; liveNodeCard.innerHTML = renderLiveNodeCard(); });
        socket.addEventListener('message', event => {
          if (typeof event.data !== 'string') return;
          const message = safeJson(event.data);
          const data = message?.data || {};
          if (message?.type === 'executing') {
            liveNode.status = data.node ? 'executing' : 'idle';
            liveNode.promptId = data.prompt_id || liveNode.promptId;
            liveNode.nodeId = data.node || '';
            liveNode.nodeType = lookupNodeType(liveNode.promptId, liveNode.nodeId);
            liveNode.detail = data.node ? 'node event' : 'prompt complete';
          } else if (message?.type === 'progress') {
            liveNode.progress = data.max ? Math.round((Number(data.value || 0) / Number(data.max)) * 100) + '%' : String(data.value || '');
          } else if (message?.type === 'execution_error') {
            liveNode.status = 'error';
            liveNode.promptId = data.prompt_id || liveNode.promptId;
            liveNode.nodeId = data.node_id || data.node || '';
            liveNode.nodeType = data.node_type || lookupNodeType(liveNode.promptId, liveNode.nodeId);
            liveNode.detail = data.exception_message || data.exception_type || 'execution error';
          }
          liveNodeCard.innerHTML = renderLiveNodeCard();
          if (!isUserInspectingDiagnostics()) executionCard.innerHTML = renderExecutionCard(latestComfy || {});
        });
      } catch {
        liveNode.status = 'socket unavailable';
        liveNode.detail = 'invalid Comfy URL';
      }
    }
    function lookupNodeType(promptId, nodeId) {
      const prompts = [...(latestComfy.runningPrompts || []), ...(latestComfy.pendingPrompts || [])];
      const prompt = prompts.find(item => item.promptId === promptId);
      const node = prompt?.nodes?.find(item => item.id === String(nodeId));
      return node?.type || '';
    }
    function safeJson(value) { try { return JSON.parse(value); } catch { return null; } }
    function shortId(value) { const text = String(value || ''); return text.length > 18 ? text.slice(0, 8) + '...' + text.slice(-6) : text; }
    function formatTime(value) { return value ? new Date(value).toLocaleTimeString() : 'n/a'; }
    function formatDurationMs(value) {
      const ms = Number(value || 0);
      if (!Number.isFinite(ms) || ms <= 0) return '0ms';
      if (ms < 1000) return Math.round(ms) + 'ms';
      const seconds = ms / 1000;
      if (seconds < 60) return seconds.toFixed(seconds < 10 ? 1 : 0) + 's';
      const minutes = Math.floor(seconds / 60);
      return minutes + 'm ' + Math.round(seconds % 60) + 's';
    }
    function formatBytes(value) {
      const bytes = Number(value || 0);
      if (!Number.isFinite(bytes) || bytes <= 0) return 'n/a';
      const gb = bytes / 1024 / 1024 / 1024;
      return gb >= 1 ? gb.toFixed(1) + ' GB' : Math.round(bytes / 1024 / 1024) + ' MB';
    }
    load({ quiet: false, forceDiagnostics: true });
    connectComfySocket();
    setInterval(() => {
      if (autoRefresh && !document.hidden) load({ quiet: true, forceDiagnostics: false });
    }, 15000);
  </script>
</body>
</html>`;
}

function parseFlags(argv) {
  const flags = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, ...valueParts] = arg.slice(2).split("=");
    flags[key] = valueParts.length > 0 ? valueParts.join("=") : true;
  }
  return flags;
}

function loadProviderEnv(cwd) {
  return {
    ...process.env,
    ...parseEnvFile(resolve(cwd, ".env.provider.local"))
  };
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const parsed = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

function routeScopeFromFlags(flags, env) {
  return String(flags.routes ?? env.CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS ?? defaultRoutes.join(","))
    .split(/[,\s]+/)
    .map((routeId) => routeId.trim())
    .filter(Boolean);
}

function normalizeMetrics(value) {
  const metrics = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    queued_total: safeNumber(metrics.queued_total),
    running_total: safeNumber(metrics.running_total),
    stale_running_total: safeNumber(metrics.stale_running_total),
    succeeded_total: safeNumber(metrics.succeeded_total),
    dead_lettered_total: safeNumber(metrics.dead_lettered_total),
    oldest_queued_age_seconds: safeNumber(metrics.oldest_queued_age_seconds),
    max_active_attempt_count: safeNumber(metrics.max_active_attempt_count),
    max_attempts: safeNumber(metrics.max_attempts)
  };
}

function sendHtml(response, html) {
  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(html);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function positiveInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function trimTrailingSlash(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function redactLogLine(line) {
  return sanitizeDiagnosticText(line)
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "");
}

function sanitizeDiagnosticText(value) {
  const text = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer <redacted>")
    .replace(/(TOKEN|SECRET|KEY|PASSWORD)=([^;\s]+)/gi, "$1=<redacted>")
    .replace(/("?(?:token|secret|password|api[_-]?key|database_url)"?\s*[:=]\s*)("[^"]+"|[^,\s}]+)/gi, "$1<redacted>")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 600 ? `${text.slice(0, 600)}...` : text;
}

function normalizeLogText(text) {
  return String(text ?? "").replace(/\u0000/g, "").replace(/^\uFEFF/, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function openBrowser(url) {
  if (process.env.CI === "true") return;
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }
  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

main().catch((error) => {
  console.error(JSON.stringify({ service: serviceName, status: "fatal", detail: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
