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
    const queueResponse = await fetch(`${comfyUrl}/queue`, { signal: AbortSignal.timeout(2500) });
    const queue = await queueResponse.json().catch(() => ({}));
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
      queuePending: Array.isArray(queue.queue_pending) ? queue.queue_pending.length : 0
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
  if (!existsSync(logDir)) return { status: "missing", lines: [] };
  const files = readdirSync(logDir)
    .filter((name) => /^provider-queue-worker-.+\.log$/i.test(name))
    .map((name) => {
      const path = join(logDir, name);
      return { name, path, stats: statSync(path) };
    })
    .sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
  const latest = files[0];
  if (!latest) return { status: "missing", lines: [] };
  const lines = normalizeLogText(readFileSync(latest.path, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-80)
    .map(redactLogLine);
  return {
    status: "ready",
    path: relative(cwd, latest.path),
    updatedAtIso: latest.stats.mtime.toISOString(),
    lines
  };
}

function dashboardHtml({ baseUrl, comfyUrl, routes }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CustomCard Queue Client</title>
  <style>
    :root { color-scheme: light; --ink:#1f2b2e; --muted:#5d6b70; --line:#d8e1e3; --surface:#fff; --soft:#f5f8f8; --good:#258477; --bad:#b94635; --warn:#b77916; }
    * { box-sizing:border-box; }
    body { margin:0; font:14px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:var(--ink); background:#eef4f4; }
    main { width:min(1180px, calc(100vw - 28px)); margin:0 auto; padding:22px 0 32px; display:grid; gap:14px; }
    header { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; padding:4px 0 8px; }
    h1, h2 { margin:0; letter-spacing:0; }
    h1 { font-size:28px; }
    h2 { font-size:15px; }
    p { margin:4px 0 0; color:var(--muted); }
    button, a.button { min-height:38px; border:1px solid var(--line); border-radius:8px; padding:0 12px; color:var(--ink); background:#fff; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:8px; }
    button:hover, a.button:hover { background:#f7fbfb; }
    .actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
    .grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
    .card { min-width:0; padding:14px; border:1px solid var(--line); border-radius:10px; background:var(--surface); box-shadow:0 10px 24px rgba(25, 44, 48, .06); }
    .wide { grid-column:1/-1; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:10px; }
    .pill { display:inline-flex; align-items:center; min-height:26px; padding:3px 8px; border-radius:999px; color:#275348; background:#e7f4ef; font-size:12px; font-weight:850; }
    .pill.bad { color:#7c261c; background:#ffebe7; }
    .pill.warn { color:#7a4f0d; background:#fff4d8; }
    .metrics { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; }
    .metric { min-width:0; padding:10px; border:1px solid var(--line); border-radius:8px; background:var(--soft); }
    .metric span { display:block; color:var(--muted); font-size:12px; font-weight:750; }
    .metric strong { display:block; margin-top:3px; font-size:20px; overflow-wrap:anywhere; }
    .meta { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; }
    .meta span { padding:5px 8px; border:1px solid var(--line); border-radius:8px; color:var(--muted); background:#fff; font-size:12px; font-weight:760; }
    pre { max-height:360px; overflow:auto; margin:0; padding:12px; border-radius:8px; background:#172124; color:#d6eded; white-space:pre-wrap; overflow-wrap:anywhere; }
    .error { color:var(--bad); font-weight:800; }
    @media (max-width: 820px) { .grid, .metrics { grid-template-columns:1fr; } header { display:grid; } .actions { justify-content:flex-start; } }
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
        <a class="button" href="${escapeHtml(baseUrl)}/?view=admin" target="_blank" rel="noreferrer">Open admin</a>
        <a class="button" href="${escapeHtml(comfyUrl)}" target="_blank" rel="noreferrer">Open ComfyUI</a>
      </div>
    </header>
    <section class="grid">
      <article class="card wide" id="provider-card"></article>
      <article class="card" id="comfy-card"></article>
      <article class="card" id="runtime-card"></article>
      <article class="card wide">
        <div class="head"><div><h2>Worker log</h2><p id="log-path"></p></div><span class="pill" id="log-status">Loading</span></div>
        <pre id="log-lines">Loading...</pre>
      </article>
    </section>
  </main>
  <script>
    const routes = ${JSON.stringify(routes)};
    const providerCard = document.querySelector("#provider-card");
    const comfyCard = document.querySelector("#comfy-card");
    const runtimeCard = document.querySelector("#runtime-card");
    const logPath = document.querySelector("#log-path");
    const logStatus = document.querySelector("#log-status");
    const logLines = document.querySelector("#log-lines");
    document.querySelector("#refresh").addEventListener("click", load);
    function pill(status, ok) { return '<span class="pill ' + (ok ? '' : status === 'loading' ? 'warn' : 'bad') + '">' + esc(status) + '</span>'; }
    function metric(label, value) { return '<div class="metric"><span>' + esc(label) + '</span><strong>' + esc(value ?? 0) + '</strong></div>'; }
    function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
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
    async function load() {
      providerCard.innerHTML = '<div class="head"><div><h2>Provider queue</h2><p>Routes: ' + esc(routes.join(', ')) + '</p></div>' + pill('loading', true) + '</div>';
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        const data = await res.json();
        const p = data.provider || {};
        const c = data.comfy || {};
        providerCard.innerHTML =
          '<div class="head"><div><h2>Provider queue</h2><p>' + esc(p.endpoint || '') + '</p></div>' + pill(p.status || 'unknown', p.ok) + '</div>' +
          metricsHtml(p.metrics || {}) +
          '<div class="meta"><span>HTTP ' + esc(p.httpStatus || 'n/a') + '</span><span>' + esc(p.elapsedMs || 0) + 'ms</span><span>' + esc((p.routeScope || routes).join(', ')) + '</span><span>TTL ' + esc(p.leaseTtlSeconds || 0) + 's</span></div>' +
          (p.detail ? '<p class="error">' + esc(p.detail) + '</p>' : '');
        comfyCard.innerHTML =
          '<div class="head"><div><h2>ComfyUI</h2><p>' + esc(c.endpoint || '') + '</p></div>' + pill(c.status || 'unknown', c.ok) + '</div>' +
          '<div class="metrics">' + metric('Running', c.queueRunning) + metric('Pending', c.queuePending) + metric('Latency', (c.elapsedMs || 0) + 'ms') + '</div>' +
          '<div class="meta">' + (c.gpu || []).map(g => '<span>' + esc(g.name) + ' VRAM ' + esc(formatBytes(g.vramFree)) + ' free</span>').join('') + '</div>' +
          (c.detail ? '<p class="error">' + esc(c.detail) + '</p>' : '');
        runtimeCard.innerHTML =
          '<div class="head"><div><h2>Runtime</h2><p>Last refresh</p></div>' + pill(data.status || 'unknown', data.status === 'ready') + '</div>' +
          '<div class="metrics">' + metric('Updated', new Date(data.updatedAtIso).toLocaleTimeString()) + metric('Route count', routes.length) + '</div>';
        const log = data.workerLog || {};
        logStatus.textContent = log.status || 'missing';
        logStatus.className = 'pill ' + (log.status === 'ready' ? '' : 'warn');
        logPath.textContent = log.path || 'No provider queue worker log found.';
        logLines.textContent = (log.lines || []).join('\\n') || 'No log lines yet.';
      } catch (error) {
        providerCard.innerHTML = '<div class="head"><div><h2>Provider queue</h2></div>' + pill('failed', false) + '</div><p class="error">' + esc(error.message || error) + '</p>';
      }
    }
    function formatBytes(value) {
      const bytes = Number(value || 0);
      if (!Number.isFinite(bytes) || bytes <= 0) return 'n/a';
      const gb = bytes / 1024 / 1024 / 1024;
      return gb >= 1 ? gb.toFixed(1) + ' GB' : Math.round(bytes / 1024 / 1024) + ' MB';
    }
    load();
    setInterval(load, 5000);
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
  return String(line)
    .replace(/^\uFEFF/, "")
    .replace(/\u0000/g, "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer <redacted>")
    .replace(/(TOKEN|SECRET|KEY|PASSWORD)=([^;\s]+)/gi, "$1=<redacted>");
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
