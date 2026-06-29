import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveHostedTarget } from "./hosted-clerk-route-probe.mjs";

const guardRequirement = "--confirm-hosted-mutation-probe";
const acknowledgementRequirement = "--acknowledge-live-writes";
const customerJwtEnvName = "CUSTOMCARD_HOSTED_CUSTOMER_JWT";
const adminJwtEnvName = "CUSTOMCARD_HOSTED_ADMIN_JWT";

export async function runHostedMutationAuditProbe({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  enabled = false,
  acknowledgeLiveWrites = false,
  probeId: explicitProbeId
} = {}) {
  const target = resolveHostedTarget(env);
  const probeId = normalizeProbeId(explicitProbeId, now);
  const blockers = [...target.blockers, ...validateProbeEnv(env)];
  if (!enabled) {
    blockers.unshift(`${guardRequirement} is required before hosted mutation probes run.`);
  }
  if (!acknowledgeLiveWrites) {
    blockers.unshift(`${acknowledgementRequirement} is required because this probe writes a harmless render-packet row.`);
  }
  if (typeof fetchImpl !== "function") blockers.push("A fetch implementation is required for hosted mutation probes.");

  if (blockers.length > 0) {
    return buildReport({ target, probeId, checks: [], beforeRuntime: null, afterRuntime: null, blockers, now });
  }

  const adminJwt = String(env[adminJwtEnvName] ?? "").trim();
  const customerJwt = String(env[customerJwtEnvName] ?? "").trim();
  const idempotencyKey = `hosted-render-packet-${probeId}`;
  const mutationBody = buildRenderPacketProbeBody(probeId);
  const conflictBody = { ...mutationBody, projectId: `${mutationBody.projectId}-changed` };
  const checks = [];

  const before = await getJson({
    baseUrl: target.baseUrl,
    path: "/api/admin/readiness",
    expectedStatus: 200,
    token: adminJwt,
    fetchImpl
  });
  checks.push(buildCheck("admin-readiness-before", "GET", "/api/admin/readiness", before, (payload) => isPostgresRuntime(payload?.runtime)));
  const beforeRuntime = summarizeRuntime(before.payload?.runtime);

  const missingIdempotency = await postJson({
    baseUrl: target.baseUrl,
    path: "/api/render-packets",
    expectedStatus: 400,
    token: customerJwt,
    body: mutationBody,
    fetchImpl
  });
  checks.push(
    buildCheck("missing-idempotency-blocked", "POST", "/api/render-packets", missingIdempotency, (payload) =>
      payload?.status === "idempotency-key-required" && payload?.route === "render-packets"
    )
  );

  const firstMutation = await postJson({
    baseUrl: target.baseUrl,
    path: "/api/render-packets",
    expectedStatus: 202,
    token: customerJwt,
    idempotencyKey,
    body: mutationBody,
    fetchImpl
  });
  checks.push(
    buildCheck("render-packet-mutation-persisted", "POST", "/api/render-packets", firstMutation, (payload) =>
      payload?.runtimeMode === "postgres" &&
      payload?.idempotencyPersisted === true &&
      payload?.idempotencyReplayed === false &&
      payload?.repositoryPersisted === true &&
      payload?.realOrdersEnabled === false &&
      payload?.externalNetworkCalls === false &&
      payload?.renderPacketId === mutationBody.renderPacketId
    )
  );

  const replay = await postJson({
    baseUrl: target.baseUrl,
    path: "/api/render-packets",
    expectedStatus: 202,
    token: customerJwt,
    idempotencyKey,
    body: mutationBody,
    fetchImpl
  });
  checks.push(
    buildCheck("idempotency-replay-confirmed", "POST", "/api/render-packets", replay, (payload) =>
      payload?.runtimeMode === "postgres" &&
      payload?.idempotencyPersisted === true &&
      payload?.idempotencyReplayed === true
    )
  );

  const conflict = await postJson({
    baseUrl: target.baseUrl,
    path: "/api/render-packets",
    expectedStatus: 409,
    token: customerJwt,
    idempotencyKey,
    body: conflictBody,
    fetchImpl
  });
  checks.push(
    buildCheck("idempotency-conflict-blocked", "POST", "/api/render-packets", conflict, (payload) =>
      payload?.status === "idempotency-conflict" && payload?.route === "render-packets"
    )
  );

  const after = await getJson({
    baseUrl: target.baseUrl,
    path: "/api/admin/readiness",
    expectedStatus: 200,
    token: adminJwt,
    fetchImpl
  });
  checks.push(buildCheck("admin-readiness-after", "GET", "/api/admin/readiness", after, (payload) => isPostgresRuntime(payload?.runtime)));
  const afterRuntime = summarizeRuntime(after.payload?.runtime);
  checks.push(buildPersistenceDeltaCheck(beforeRuntime, afterRuntime));

  return buildReport({
    target,
    probeId,
    checks,
    beforeRuntime,
    afterRuntime,
    blockers: checks.filter((check) => !check.passed).map((check) => `${check.id}: ${check.detail}`),
    now
  });
}

function validateProbeEnv(env) {
  const blockers = [];
  for (const envName of [customerJwtEnvName, adminJwtEnvName]) {
    const token = String(env[envName] ?? "").trim();
    if (!token) {
      blockers.push(`${envName} is required.`);
    } else if (!looksLikeJwt(token)) {
      blockers.push(`${envName} must be a Clerk session JWT.`);
    }
  }
  return blockers;
}

function looksLikeJwt(token) {
  const text = String(token ?? "");
  return text.split(".").length === 3 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text);
}

function normalizeProbeId(value, now) {
  const text = String(value ?? "").trim();
  const fallback = `probe-${(now instanceof Date ? now : new Date(now)).toISOString()}`;
  return (text || fallback).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 56);
}

function buildRenderPacketProbeBody(probeId) {
  return {
    projectId: `hosted-mutation-probe-${probeId}`,
    renderPacketId: `render-packet-${probeId}`,
    vendorId: "manual-upload",
    locale: "en-US",
    direction: "ltr",
    externalShareApproval: false
  };
}

async function getJson({ baseUrl, path, expectedStatus, token, fetchImpl }) {
  return fetchJson({ baseUrl, path, method: "GET", expectedStatus, token, fetchImpl });
}

async function postJson({ baseUrl, path, expectedStatus, token, idempotencyKey, body, fetchImpl }) {
  return fetchJson({ baseUrl, path, method: "POST", expectedStatus, token, idempotencyKey, body, fetchImpl });
}

async function fetchJson({ baseUrl, path, method, expectedStatus, token, idempotencyKey, body, fetchImpl }) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  try {
    const response = await fetchImpl(new URL(path, baseUrl), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const payload = await readJsonPayload(response);
    return {
      ok: response.status === expectedStatus,
      expectedStatus,
      actualStatus: response.status,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      expectedStatus,
      actualStatus: null,
      payload: null,
      error: error instanceof Error ? error.message : "Hosted mutation probe request failed."
    };
  }
}

async function readJsonPayload(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { status: "non-json-response" };
  }
}

function buildCheck(id, method, path, result, assertPayload) {
  const payloadMatches = result.payload ? assertPayload(result.payload) : false;
  const passed = result.ok && payloadMatches;
  return {
    id,
    method,
    path,
    expectedStatus: result.expectedStatus,
    actualStatus: result.actualStatus,
    passed,
    detail: passed
      ? "Expected status and hosted mutation payload contract matched."
      : result.error ?? `Expected HTTP ${result.expectedStatus} and payload contract match, got HTTP ${result.actualStatus}.`,
    payloadSummary: summarizePayload(result.payload)
  };
}

function buildPersistenceDeltaCheck(beforeRuntime, afterRuntime) {
  const deltas = persistenceDeltas(beforeRuntime, afterRuntime);
  const passed =
    deltas.idempotencyRecords >= 1 &&
    deltas.auditRecords >= 1 &&
    deltas.queuedJobs >= 1 &&
    deltas.renderPacketRecords >= 1 &&
    deltas.providerCallEventRecords >= 1;
  return {
    id: "hosted-persistence-deltas-recorded",
    method: "GET",
    path: "/api/admin/readiness",
    expectedStatus: 200,
    actualStatus: passed ? 200 : null,
    passed,
    detail: passed
      ? "Hosted readiness counters increased for idempotency, audit, queue, render packet, and provider-call event records."
      : `Hosted readiness counters did not show expected mutation deltas: ${JSON.stringify(deltas)}.`,
    payloadSummary: { persistenceDeltas: deltas }
  };
}

function isPostgresRuntime(runtime) {
  return runtime?.mode === "postgres" && runtime?.authEnforced === true && runtime?.idempotencyEnforced === true;
}

function summarizeRuntime(runtime) {
  if (!runtime || typeof runtime !== "object") return null;
  return {
    mode: runtime.mode,
    authEnforced: runtime.authEnforced,
    idempotencyEnforced: runtime.idempotencyEnforced,
    postgresConfigured: runtime.postgresConfigured,
    idempotencyRecords: numberOrNull(runtime.idempotencyRecords),
    auditRecords: numberOrNull(runtime.auditRecords),
    queuedJobs: numberOrNull(runtime.queuedJobs),
    renderPacketRecords: numberOrNull(runtime.renderPacketRecords),
    providerCallEventRecords: numberOrNull(runtime.providerCallEventRecords)
  };
}

function persistenceDeltas(beforeRuntime, afterRuntime) {
  return {
    idempotencyRecords: delta(beforeRuntime, afterRuntime, "idempotencyRecords"),
    auditRecords: delta(beforeRuntime, afterRuntime, "auditRecords"),
    queuedJobs: delta(beforeRuntime, afterRuntime, "queuedJobs"),
    renderPacketRecords: delta(beforeRuntime, afterRuntime, "renderPacketRecords"),
    providerCallEventRecords: delta(beforeRuntime, afterRuntime, "providerCallEventRecords")
  };
}

function delta(beforeRuntime, afterRuntime, key) {
  const before = numberOrNull(beforeRuntime?.[key]);
  const after = numberOrNull(afterRuntime?.[key]);
  if (before === null || after === null) return 0;
  return after - before;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  return {
    service: payload.service,
    status: payload.status,
    route: payload.route,
    requiredAuth: payload.requiredAuth,
    runtime: summarizeRuntime(payload.runtime),
    runtimeMode: payload.runtimeMode,
    idempotencyPersisted: payload.idempotencyPersisted,
    idempotencyReplayed: payload.idempotencyReplayed,
    repositoryPersisted: payload.repositoryPersisted,
    realOrdersEnabled: payload.realOrdersEnabled,
    externalNetworkCalls: payload.externalNetworkCalls,
    renderPacketId: payload.renderPacketId
  };
}

function buildReport({ target, probeId, checks, beforeRuntime, afterRuntime, blockers, now }) {
  const failed = checks.filter((check) => !check.passed).length;
  const deltas = persistenceDeltas(beforeRuntime, afterRuntime);
  const mutationProof = {
    missingIdempotencyBlocked: checkPassed(checks, "missing-idempotency-blocked"),
    mutationPersisted: checkPassed(checks, "render-packet-mutation-persisted"),
    idempotencyReplayConfirmed: checkPassed(checks, "idempotency-replay-confirmed"),
    idempotencyConflictBlocked: checkPassed(checks, "idempotency-conflict-blocked"),
    auditRowsIncreased: deltas.auditRecords >= 1,
    renderPacketRowsIncreased: deltas.renderPacketRecords >= 1,
    queueRowsIncreased: deltas.queuedJobs >= 1,
    providerCallRowsIncreased: deltas.providerCallEventRecords >= 1,
    authenticatedHostedMutationAttached: checks.length > 0 && failed === 0
  };

  return {
    service: "customcard-hosted-mutation-audit-probe",
    status: blockers.length === 0 && failed === 0 ? "ready" : "blocked",
    scope: "live-hosted-mutation",
    targetEnvironment: target.targetEnvironment,
    baseUrl: target.baseUrl,
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    probeId,
    liveWritesEnabled: checks.length > 0,
    destructiveLiveMutations: false,
    realOrdersEnabled: false,
    externalVendorCalls: false,
    beforeRuntime,
    afterRuntime,
    persistenceDeltas: deltas,
    checks,
    passed: checks.filter((check) => check.passed).length,
    failed,
    mutationProof,
    blockers
  };
}

function checkPassed(checks, id) {
  return checks.some((check) => check.id === id && check.passed);
}

function writeEvidenceIfRequested(report, outputPath = "") {
  outputPath = String(outputPath ?? "").trim();
  if (!outputPath) return report;
  const absolutePath = resolve(outputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, evidencePath: absolutePath };
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}

if (isCliEntrypoint()) {
  const args = parseArgs(process.argv.slice(2));
  const report = writeEvidenceIfRequested(await runHostedMutationAuditProbe({
    enabled: args["confirm-hosted-mutation-probe"] === true,
    acknowledgeLiveWrites: args["acknowledge-live-writes"] === true,
    probeId: args["probe-id"]
  }), args["evidence-out"]);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready") process.exit(1);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [rawKey, inlineValue] = value.slice(2).split("=");
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }
    if (values[index + 1] && !values[index + 1].startsWith("--")) {
      parsed[rawKey] = values[index + 1];
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }
  return parsed;
}
