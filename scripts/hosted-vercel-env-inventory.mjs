import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const guardEnvName = "CUSTOMCARD_HOSTED_ENV_INVENTORY";
const guardRequirement = "CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled";
const defaultProductionBaseUrl = "https://customcard-three.vercel.app";

const requiredHostedEnvVars = Object.freeze([
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "AUTH_SESSION_SECRET",
  "CLERK_JWT_KEY",
  "CLERK_AUTHORIZED_PARTIES",
  "CLERK_ISSUER",
  "CLERK_AUDIENCE",
  "IDEMPOTENCY_KEY_TTL_HOURS"
]);

export async function runHostedVercelEnvInventory({
  env = process.env,
  commandRunner = runVercelEnvLs,
  now = new Date()
} = {}) {
  const target = resolveVercelEnvTarget(env);
  const blockers = [...target.blockers];
  if (env[guardEnvName] !== "enabled") {
    blockers.unshift(`${guardRequirement} is required before hosted Vercel env inventory runs.`);
  }
  if (typeof commandRunner !== "function") {
    blockers.push("A vercel env ls command runner is required.");
  }

  if (blockers.length > 0) {
    return buildReport({ target, entries: [], blockers, now, command: null });
  }

  let command;
  try {
    command = await commandRunner({ env, vercelTarget: target.vercelTarget });
  } catch (error) {
    const message = error instanceof Error ? error.message : "vercel env ls failed.";
    return buildReport({
      target,
      entries: [],
      blockers: [`vercel env ls --format=json failed before producing an inventory: ${message}`],
      now,
      command: null
    });
  }

  if (!command || command.exitCode !== 0) {
    return buildReport({
      target,
      entries: [],
      blockers: [`vercel env ls --format=json exited with code ${command?.exitCode ?? "unknown"}.`],
      now,
      command
    });
  }

  let entries;
  try {
    entries = parseVercelEnvJson(command.stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse vercel env ls JSON.";
    return buildReport({ target, entries: [], blockers: [message], now, command });
  }

  const inventory = buildInventory(entries, target.vercelTarget);
  const missing = inventory.requiredKeys.filter((key) => !key.present).map((key) => key.name);
  const inventoryBlockers = missing.map((name) => `${name} is missing from the Vercel ${target.vercelTarget} env inventory.`);

  return buildReport({ target, entries, blockers: inventoryBlockers, now, command });
}

export function resolveVercelEnvTarget(env = process.env) {
  const targetEnvironment = normalizeTargetEnvironment(env.CUSTOMCARD_HOSTED_API_ENV ?? env.CUSTOMCARD_APP_ENV);
  const explicitVercelTarget = normalizeVercelTarget(env.CUSTOMCARD_VERCEL_ENV_TARGET);
  const vercelTarget = explicitVercelTarget || (targetEnvironment === "qa" ? "preview" : "production");
  const baseUrl = normalizeBaseUrl(env.CUSTOMCARD_HOSTED_API_BASE_URL || env.CUSTOMCARD_API_BASE_URL) ||
    normalizeBaseUrl(targetEnvironment === "qa" ? env.CUSTOMCARD_QA_API_BASE_URL : env.CUSTOMCARD_PRODUCTION_API_BASE_URL) ||
    (targetEnvironment === "production" ? defaultProductionBaseUrl : "");
  const blockers = [];

  if (targetEnvironment !== "qa" && targetEnvironment !== "production") {
    blockers.push("CUSTOMCARD_HOSTED_API_ENV must be qa or production.");
  }
  if (targetEnvironment === "production" && vercelTarget !== "production") {
    blockers.push("Production hosted API env inventory must use CUSTOMCARD_VERCEL_ENV_TARGET=production.");
  }
  if (targetEnvironment === "qa" && vercelTarget === "production") {
    blockers.push("QA hosted API env inventory must not read production Vercel env keys.");
  }
  if (!vercelTarget) {
    blockers.push("CUSTOMCARD_VERCEL_ENV_TARGET must be production, preview, or development.");
  }
  blockers.push(...validateBaseUrl(baseUrl, targetEnvironment));

  return { targetEnvironment, vercelTarget, baseUrl, blockers };
}

export function parseVercelEnvJson(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) throw new Error("vercel env ls --format=json returned empty output.");
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("vercel env ls --format=json returned invalid JSON.");
  }

  return collectEnvRecords(payload).map(normalizeEnvRecord).filter(Boolean);
}

function buildReport({ target, entries, blockers, now, command }) {
  const inventory = buildInventory(entries, target.vercelTarget);
  const checks = blockers.length > 0 && entries.length === 0
    ? []
    : [
        {
          id: "required-hosted-env-keys",
          passed: inventory.missingRequiredKeys.length === 0,
          detail:
            inventory.missingRequiredKeys.length === 0
              ? `All ${requiredHostedEnvVars.length} hosted env keys are present in ${target.vercelTarget}.`
              : `Missing hosted env keys: ${inventory.missingRequiredKeys.join(", ")}.`
        },
        {
          id: "clerk-token-verifier-env",
          passed: inventory.clerkJwtVerifierConfigured,
          detail: inventory.clerkJwtVerifierConfigured
            ? "Clerk JWT verifier key, issuer, audience, and authorized parties are present."
            : "Clerk JWT verifier env keys are incomplete."
        },
        {
          id: "postgres-runtime-env",
          passed: inventory.customcardApiRuntimeConfigured && inventory.databaseUrlConfigured,
          detail: inventory.customcardApiRuntimeConfigured && inventory.databaseUrlConfigured
            ? "Hosted runtime mode and DATABASE_URL env keys are present."
            : "Hosted runtime mode or DATABASE_URL env keys are missing."
        }
      ];
  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;
  const ready = blockers.length === 0 && failed === 0;

  return {
    service: "customcard-hosted-vercel-env-inventory",
    status: ready ? "ready" : "blocked",
    scope: "live-hosted-env-sync",
    targetEnvironment: target.targetEnvironment,
    vercelTarget: target.vercelTarget,
    baseUrl: target.baseUrl,
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    command: {
      name: "vercel env ls --format=json",
      exitCode: command?.exitCode ?? null,
      stdoutParsed: Boolean(command && command.exitCode === 0)
    },
    mutationsEnabled: false,
    valuesRedacted: true,
    requiredKeys: inventory.requiredKeys,
    keyCount: inventory.keyCount,
    scopedKeyCount: inventory.scopedKeyCount,
    envSync: {
      requiredKeysPresent: inventory.missingRequiredKeys.length === 0,
      customcardApiRuntimeConfigured: inventory.customcardApiRuntimeConfigured,
      databaseUrlConfigured: inventory.databaseUrlConfigured,
      clerkJwtVerifierConfigured: inventory.clerkJwtVerifierConfigured,
      idempotencyConfigured: inventory.idempotencyConfigured,
      environmentSynced: ready
    },
    checks,
    passed,
    failed,
    blockers
  };
}

function buildInventory(entries, vercelTarget) {
  const scopedEntries = entries.filter((entry) => entryMatchesTarget(entry, vercelTarget));
  const allNames = Array.from(new Set(entries.map((entry) => entry.name))).sort();
  const scopedNames = new Set(scopedEntries.map((entry) => entry.name));
  const requiredKeys = requiredHostedEnvVars.map((name) => ({
    name,
    present: scopedNames.has(name),
    targets: Array.from(new Set(scopedEntries.filter((entry) => entry.name === name).flatMap((entry) => entry.targets))).sort()
  }));
  const missingRequiredKeys = requiredKeys.filter((key) => !key.present).map((key) => key.name);

  return {
    requiredKeys,
    missingRequiredKeys,
    keyCount: allNames.length,
    scopedKeyCount: scopedNames.size,
    customcardApiRuntimeConfigured: scopedNames.has("CUSTOMCARD_API_RUNTIME"),
    databaseUrlConfigured: scopedNames.has("DATABASE_URL"),
    clerkJwtVerifierConfigured: ["CLERK_JWT_KEY", "CLERK_AUTHORIZED_PARTIES", "CLERK_ISSUER", "CLERK_AUDIENCE"].every((name) => scopedNames.has(name)),
    idempotencyConfigured: scopedNames.has("IDEMPOTENCY_KEY_TTL_HOURS")
  };
}

function collectEnvRecords(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["envs", "env", "items", "data", "records", "variables"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  return Object.entries(payload).map(([name, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return { name, ...value };
    return { name };
  });
}

function normalizeEnvRecord(record) {
  if (typeof record === "string") {
    const name = normalizeEnvName(record);
    return name ? { name, targets: ["unknown"] } : null;
  }
  if (!record || typeof record !== "object") return null;

  const name = normalizeEnvName(record.key ?? record.name ?? record.variable ?? record.envName);
  if (!name) return null;
  const targets = normalizeTargets(record.target ?? record.targets ?? record.environment ?? record.environments ?? record.type);

  return { name, targets: targets.length > 0 ? targets : ["unknown"] };
}

function normalizeEnvName(value) {
  const text = String(value ?? "").trim();
  if (!/^[A-Z][A-Z0-9_]*$/.test(text)) return "";
  return text;
}

function normalizeTargets(value) {
  if (Array.isArray(value)) return value.flatMap(normalizeTargets);
  if (value && typeof value === "object") return normalizeTargets(value.name ?? value.target ?? value.environment ?? value.type);
  const target = normalizeVercelTarget(value);
  return target ? [target] : [];
}

function entryMatchesTarget(entry, vercelTarget) {
  return entry.targets.includes("unknown") || entry.targets.includes(vercelTarget);
}

function normalizeTargetEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (text === "qa" || text === "staging" || text === "preview") return "qa";
  if (text === "prod" || text === "production" || !text) return "production";
  return text;
}

function normalizeVercelTarget(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  if (text === "prod" || text === "production") return "production";
  if (text === "qa" || text === "staging" || text === "preview") return "preview";
  if (text === "dev" || text === "development") return "development";
  return "";
}

function normalizeBaseUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.replace(/\/+$/, "");
}

function validateBaseUrl(baseUrl, targetEnvironment) {
  const blockers = [];
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

function runVercelEnvLs() {
  return new Promise((resolveReport) => {
    const child = spawn("vercel", ["env", "ls", "--format=json"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      resolveReport({ exitCode: 127, stdout: "", stderr: error.message });
    });
    child.on("close", (exitCode) => {
      resolveReport({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}

function writeEvidenceIfRequested(report, env = process.env) {
  const outputPath = String(env.CUSTOMCARD_HOSTED_ENV_INVENTORY_EVIDENCE_OUT ?? "").trim();
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
  const report = writeEvidenceIfRequested(await runHostedVercelEnvInventory());
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready") process.exit(1);
}
