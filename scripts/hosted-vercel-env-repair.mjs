import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runHostedVercelEnvInventory } from "./hosted-vercel-env-inventory.mjs";

const guardRequirement = "--confirm-hosted-env-repair";
const applyRequirement = "--apply";
const productionAckRequirement = "--acknowledge-production";
const partialApplyRequirement = "--allow-partial";

const repairKeys = Object.freeze([
  "CLERK_ISSUER",
  "CLERK_AUDIENCE",
  "IDEMPOTENCY_KEY_TTL_HOURS"
]);

export async function runHostedVercelEnvRepair({
  env = process.env,
  inventoryRunner = runHostedVercelEnvInventory,
  commandRunner = runVercelEnvAdd,
  now = new Date(),
  enabled = false,
  apply = false,
  allowPartialApply = false,
  acknowledgeProduction = false
} = {}) {
  const blockers = [];
  if (!enabled) {
    blockers.push(`${guardRequirement} is required before hosted Vercel env repair can inspect or apply missing keys.`);
  }
  if (typeof inventoryRunner !== "function") blockers.push("A hosted Vercel env inventory runner is required.");
  if (typeof commandRunner !== "function") blockers.push("A vercel env add command runner is required.");

  if (blockers.length > 0) {
    return buildReport({ inventory: null, values: {}, repairPlan: [], applyResults: [], blockers, now, apply: false });
  }

  const inventory = await inventoryRunner({ env, enabled: true });
  const inventoryParsed = inventory?.command?.stdoutParsed === true;
  if (!inventoryParsed) {
    return buildReport({
      inventory,
      values: readRepairValues(env),
      repairPlan: [],
      applyResults: [],
      blockers: ["Hosted Vercel env repair requires a parsed redacted env inventory before applying changes."],
      now,
      apply: false
    });
  }

  const target = inventory.vercelTarget;
  const missingKeys = repairKeys.filter((name) => {
    const key = inventory.requiredKeys?.find((entry) => entry.name === name);
    return !key?.present;
  });
  const values = readRepairValues(env);
  const valueIssues = missingKeys.flatMap((key) => validateRepairValue(key, values[key]));
  const applyingProduction = target === "production" && apply;
  const applyBlockers = [];

  if (applyingProduction && !acknowledgeProduction) {
    applyBlockers.push(`${productionAckRequirement} is required before production env keys are added.`);
  }

  const repairPlan = missingKeys.map((key) => ({
    key,
    target,
    valueSupplied: Boolean(values[key]),
    action: resolveRepairAction({ key, value: values[key], apply, allowPartialApply })
  }));

  if (!apply) {
    return buildReport({
      inventory,
      values,
      repairPlan,
      applyResults: [],
      blockers: valueIssues,
      now,
      apply
    });
  }

  const blockersBeforeApply = [...(allowPartialApply ? [] : valueIssues), ...applyBlockers];
  if (blockersBeforeApply.length > 0) {
    return buildReport({
      inventory,
      values,
      repairPlan,
      applyResults: [],
      blockers: allowPartialApply ? [...valueIssues, ...applyBlockers] : blockersBeforeApply,
      now,
      apply,
      allowPartialApply
    });
  }

  const applyResults = [];
  const applyKeys = allowPartialApply
    ? missingKeys.filter((key) => values[key] && validateRepairValue(key, values[key]).length === 0)
    : missingKeys;
  for (const key of applyKeys) {
    applyResults.push(await commandRunner({ key, value: values[key], target, env }));
  }

  const failed = applyResults.filter((result) => result.exitCode !== 0);
  const appliedRepairKeys = applyResults
    .filter((result) => result.exitCode === 0)
    .map((result) => result.key);
  const unresolvedValueIssues = allowPartialApply
    ? valueIssues.filter((issue) => !appliedRepairKeys.some((key) => issue.includes(key)))
    : [];
  return buildReport({
    inventory,
    values,
    repairPlan,
    applyResults,
    blockers: [
      ...unresolvedValueIssues,
      ...failed.map((result) => `${result.key} vercel env add failed with exit code ${result.exitCode}.`)
    ],
    now,
    apply,
    allowPartialApply
  });
}

function readRepairValues(env) {
  return Object.fromEntries(repairKeys.map((key) => [key, String(env[key] ?? "").trim()]));
}

function validateRepairValue(key, value) {
  const issues = [];
  if (!value) {
    issues.push(`${key} must be supplied in the process env before repair can apply it.`);
    return issues;
  }
  if (/replace-me|placeholder|changeme|example|dummy/i.test(value)) {
    issues.push(`${key} must not be a placeholder value.`);
  }
  if (key === "CLERK_ISSUER") {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") issues.push("CLERK_ISSUER must be an https URL.");
    } catch {
      issues.push("CLERK_ISSUER must be a valid https URL.");
    }
  }
  if (key === "CLERK_AUDIENCE" && value.length < 3) {
    issues.push("CLERK_AUDIENCE must be at least 3 characters.");
  }
  if (key === "IDEMPOTENCY_KEY_TTL_HOURS") {
    const ttl = Number(value);
    if (!Number.isInteger(ttl) || ttl < 1 || ttl > 720) {
      issues.push("IDEMPOTENCY_KEY_TTL_HOURS must be an integer from 1 to 720.");
    }
  }
  return issues;
}

function resolveRepairAction({ key, value, apply, allowPartialApply }) {
  if (!apply) return "plan-only";
  if (!value) return allowPartialApply ? "blocked-missing-value" : "vercel-env-add";
  if (validateRepairValue(key, value).length > 0) return "blocked-invalid-value";
  return "vercel-env-add";
}

function buildReport({ inventory, values, repairPlan, applyResults, blockers, now, apply, allowPartialApply = false }) {
  const missingKeys = inventory?.requiredKeys
    ?.filter((entry) => repairKeys.includes(entry.name) && !entry.present)
    ?.map((entry) => entry.name) ?? repairKeys;
  const valueInputs = Object.fromEntries(repairKeys.map((key) => [key, { supplied: Boolean(values[key]) }]));
  const applySucceeded = apply && blockers.length === 0 && applyResults.every((result) => result.exitCode === 0);
  const appliedRepairKeys = applyResults
    .filter((result) => result.exitCode === 0)
    .map((result) => result.key);
  const remainingUnappliedRepairKeys = missingKeys.filter((key) => !appliedRepairKeys.includes(key));

  return {
    service: "customcard-hosted-vercel-env-repair",
    status: blockers.length === 0 && (missingKeys.length === 0 || applySucceeded || !apply) ? "ready" : "blocked",
    scope: "live-hosted-env-repair",
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    targetEnvironment: inventory?.targetEnvironment ?? null,
    vercelTarget: inventory?.vercelTarget ?? null,
    baseUrl: inventory?.baseUrl ?? null,
    applyEnabled: apply,
    partialApplyEnabled: allowPartialApply,
    valuesRedacted: true,
    missingRepairKeys: missingKeys,
    aiCardCopySetup: inventory?.aiCardCopySetup ?? null,
    valueInputs,
    repairPlan,
    applyResults: applyResults.map((result) => ({
      key: result.key,
      target: result.target,
      exitCode: result.exitCode
    })),
    appliedRepairKeys,
    remainingUnappliedRepairKeys,
    envSync: {
      beforeRepairEnvironmentSynced: inventory?.envSync?.environmentSynced === true,
      repairKeysMissing: missingKeys.length,
      repairApplied: applySucceeded,
      partialRepairApplied: appliedRepairKeys.length > 0 && !applySucceeded,
      aiCardCopySetupConfigured: inventory?.envSync?.aiCardCopySetupConfigured === true,
      aiCardCopyProductionModelPinned: inventory?.envSync?.aiCardCopyProductionModelPinned === true,
      environmentSynced: false
    },
    blockers
  };
}

function runVercelEnvAdd({ key, value, target, env }) {
  return new Promise((resolveReport) => {
    const child = spawn("vercel", ["env", "add", key, target], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    child.stdin.end(`${value}\n`);
    child.on("error", () => {
      resolveReport({ key, target, exitCode: 127 });
    });
    child.on("close", (exitCode) => {
      resolveReport({ key, target, exitCode: exitCode ?? 1 });
    });
  });
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
  const report = writeEvidenceIfRequested(await runHostedVercelEnvRepair({
    enabled: args["confirm-hosted-env-repair"] === true,
    apply: args.apply === true,
    allowPartialApply: args["allow-partial"] === true,
    acknowledgeProduction: args["acknowledge-production"] === true
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
