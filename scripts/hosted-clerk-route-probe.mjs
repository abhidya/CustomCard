import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultProductionBaseUrl = "https://customcard-three.vercel.app";
const guardEnvName = "CUSTOMCARD_HOSTED_AUTH_PROBE";
const customerJwtEnvName = "CUSTOMCARD_HOSTED_CUSTOMER_JWT";
const adminJwtEnvName = "CUSTOMCARD_HOSTED_ADMIN_JWT";

const probeChecks = Object.freeze([
  {
    id: "public-health-postgres",
    method: "GET",
    path: "/api/health",
    expectedStatus: 200,
    tokenEnvName: null,
    assertPayload(payload) {
      return payload?.service === "customcard-api" &&
        payload?.status === "ready" &&
        payload?.runtime?.mode === "postgres" &&
        payload?.runtime?.authEnforced === true;
    }
  },
  {
    id: "admin-missing-auth-blocked",
    method: "GET",
    path: "/api/admin/readiness",
    expectedStatus: 401,
    tokenEnvName: null,
    assertPayload(payload) {
      return payload?.status === "auth-required" && payload?.requiredAuth === "admin-session";
    }
  },
  {
    id: "admin-wrong-role-blocked",
    method: "GET",
    path: "/api/admin/readiness",
    expectedStatus: 403,
    tokenEnvName: customerJwtEnvName,
    assertPayload(payload) {
      return payload?.status === "wrong-role" && payload?.requiredAuth === "admin-session";
    }
  },
  {
    id: "admin-readiness-clerk-jwt",
    method: "GET",
    path: "/api/admin/readiness",
    expectedStatus: 200,
    tokenEnvName: adminJwtEnvName,
    assertPayload(payload) {
      return payload?.runtime?.mode === "postgres" && payload?.runtime?.authEnforced === true;
    }
  },
  {
    id: "customer-bootstrap-clerk-jwt",
    method: "GET",
    path: "/api/customer/bootstrap",
    expectedStatus: 200,
    tokenEnvName: customerJwtEnvName,
    assertPayload(payload) {
      return payload?.runtime?.mode === "postgres" &&
        payload?.runtime?.authEnforced === true &&
        payload?.syncState?.authMode === "customer-session";
    }
  }
]);

export async function runHostedClerkRouteProbe({
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = new Date()
} = {}) {
  const target = resolveHostedTarget(env);
  const blockers = [...target.blockers, ...validateProbeAuthEnv(env)];
  if (env[guardEnvName] !== "enabled") {
    blockers.unshift(`${guardEnvName}=enabled is required before live hosted Clerk route probes run.`);
  }
  if (typeof fetchImpl !== "function") {
    blockers.push("A fetch implementation is required for hosted Clerk route probes.");
  }

  if (blockers.length > 0) {
    return buildReport({ target, checks: [], blockers, now });
  }

  const tokens = {
    [customerJwtEnvName]: String(env[customerJwtEnvName] ?? "").trim(),
    [adminJwtEnvName]: String(env[adminJwtEnvName] ?? "").trim()
  };
  const checks = [];
  for (const check of probeChecks) {
    checks.push(await runProbeCheck({ baseUrl: target.baseUrl, check, fetchImpl, token: tokens[check.tokenEnvName] }));
  }

  return buildReport({
    target,
    checks,
    blockers: checks.filter((check) => !check.passed).map((check) => `${check.id}: ${check.detail}`),
    now
  });
}

export function resolveHostedTarget(env = process.env) {
  const targetEnvironment = normalizeTargetEnvironment(env.CUSTOMCARD_HOSTED_API_ENV ?? env.CUSTOMCARD_APP_ENV);
  const explicitBaseUrl = normalizeBaseUrl(env.CUSTOMCARD_HOSTED_API_BASE_URL || env.CUSTOMCARD_API_BASE_URL);
  const envSpecificBaseUrl = normalizeBaseUrl(
    targetEnvironment === "qa" ? env.CUSTOMCARD_QA_API_BASE_URL : env.CUSTOMCARD_PRODUCTION_API_BASE_URL
  );
  const baseUrl = explicitBaseUrl || envSpecificBaseUrl || (targetEnvironment === "production" ? defaultProductionBaseUrl : "");
  const blockers = [];

  if (explicitBaseUrl && envSpecificBaseUrl && explicitBaseUrl !== envSpecificBaseUrl) {
    blockers.push(
      "CUSTOMCARD_HOSTED_API_BASE_URL/CUSTOMCARD_API_BASE_URL must not conflict with the selected QA or production API base URL."
    );
  }
  blockers.push(...validateBaseUrl(baseUrl, targetEnvironment));

  return { targetEnvironment, baseUrl, blockers };
}

function normalizeTargetEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "qa" || text === "staging" || text === "preview") return "qa";
  if (text === "prod" || text === "production" || !text) return "production";
  return text;
}

function normalizeBaseUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.replace(/\/+$/, "");
}

function validateBaseUrl(baseUrl, targetEnvironment) {
  const blockers = [];
  if (targetEnvironment !== "qa" && targetEnvironment !== "production") {
    blockers.push("CUSTOMCARD_HOSTED_API_ENV must be qa or production.");
  }
  if (!baseUrl) {
    blockers.push(`A hosted ${targetEnvironment} API base URL is required.`);
    return blockers;
  }
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    blockers.push("Hosted API base URL must be a valid URL.");
    return blockers;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol !== "https:") blockers.push("Hosted API base URL must use https.");
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) blockers.push("Hosted API base URL must not point at localhost.");
  if (hostname.endsWith(".test") || /(?:example|replace|placeholder|dummy)/i.test(baseUrl)) {
    blockers.push("Hosted API base URL must not be a placeholder URL.");
  }
  return blockers;
}

function validateProbeAuthEnv(env) {
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

async function runProbeCheck({ baseUrl, check, fetchImpl, token }) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetchImpl(new URL(check.path, baseUrl), { method: check.method, headers });
    const payload = await readJsonPayload(response);
    const statusMatches = response.status === check.expectedStatus;
    const payloadMatches = check.assertPayload(payload);
    const passed = statusMatches && payloadMatches;

    return {
      id: check.id,
      method: check.method,
      path: check.path,
      expectedStatus: check.expectedStatus,
      actualStatus: response.status,
      passed,
      detail: passed
        ? "Expected status and hosted auth payload contract matched."
        : `Expected HTTP ${check.expectedStatus} and payload contract match, got HTTP ${response.status}.`,
      payloadSummary: summarizePayload(payload)
    };
  } catch (error) {
    return {
      id: check.id,
      method: check.method,
      path: check.path,
      expectedStatus: check.expectedStatus,
      actualStatus: null,
      passed: false,
      detail: error instanceof Error ? error.message : "Hosted route probe failed.",
      payloadSummary: null
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

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const runtime = payload.runtime && typeof payload.runtime === "object"
    ? {
        mode: payload.runtime.mode,
        authEnforced: payload.runtime.authEnforced,
        postgresConfigured: payload.runtime.postgresConfigured
      }
    : undefined;
  const syncState = payload.syncState && typeof payload.syncState === "object"
    ? {
        authMode: payload.syncState.authMode,
        idempotencyRequired: payload.syncState.idempotencyRequired
      }
    : undefined;

  return {
    service: payload.service,
    status: payload.status,
    route: payload.route,
    requiredAuth: payload.requiredAuth,
    runtime,
    syncState,
    blockerCount: Array.isArray(payload.blockers) ? payload.blockers.length : undefined
  };
}

function buildReport({ target, checks, blockers, now }) {
  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;
  const authVerification = {
    publicHealthPostgres: checkPassed(checks, "public-health-postgres"),
    missingAuthBlocked: checkPassed(checks, "admin-missing-auth-blocked"),
    wrongRoleBlocked: checkPassed(checks, "admin-wrong-role-blocked"),
    adminRoute: checkPassed(checks, "admin-readiness-clerk-jwt"),
    customerRoute: checkPassed(checks, "customer-bootstrap-clerk-jwt"),
    hostedTokenVerificationAttached: checks.length > 0 && failed === 0
  };

  return {
    service: "customcard-hosted-clerk-route-probe",
    status: blockers.length === 0 && failed === 0 ? "ready" : "blocked",
    scope: "live-hosted-auth",
    targetEnvironment: target.targetEnvironment,
    baseUrl: target.baseUrl,
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    mutationsEnabled: false,
    expectedTokenInputs: [customerJwtEnvName, adminJwtEnvName],
    checks,
    passed,
    failed,
    authVerification,
    blockers
  };
}

function checkPassed(checks, id) {
  return checks.some((check) => check.id === id && check.passed);
}

function writeEvidenceIfRequested(report, env = process.env) {
  const outputPath = String(env.CUSTOMCARD_HOSTED_AUTH_PROBE_EVIDENCE_OUT ?? "").trim();
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
  const report = writeEvidenceIfRequested(await runHostedClerkRouteProbe());
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready") process.exit(1);
}
