import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runHostedClerkPublicConfigProbe, deriveClerkIssuerCandidate } from "./hosted-clerk-public-config-probe.mjs";
import { runHostedVercelEnvInventory } from "./hosted-vercel-env-inventory.mjs";

const guardRequirement = "--confirm-hosted-clerk-config-repair";
const applyRequirement = "--apply";
const productionAckRequirement = "--acknowledge-production";
const publicKeyReplaceRequirement = "--acknowledge-public-key-replace";
const publicKeyName = "VITE_CLERK_PUBLISHABLE_KEY";
const serverVerifierKeys = Object.freeze(["CLERK_ISSUER", "CLERK_AUDIENCE"]);

export async function runHostedClerkConfigRepair({
  env = process.env,
  inventoryRunner = runHostedVercelEnvInventory,
  publicConfigRunner = runHostedClerkPublicConfigProbe,
  commandRunner = runVercelEnvMutation,
  now = new Date(),
  enabled = false,
  apply = false,
  acknowledgeProduction = false,
  acknowledgePublicKeyReplace = false
} = {}) {
  const guardBlockers = [];
  if (!enabled) {
    guardBlockers.push(`${guardRequirement} is required before hosted Clerk config repair can inspect or apply changes.`);
  }
  if (typeof inventoryRunner !== "function") guardBlockers.push("A hosted Vercel env inventory runner is required.");
  if (typeof publicConfigRunner !== "function") guardBlockers.push("A hosted Clerk public config runner is required.");
  if (typeof commandRunner !== "function") guardBlockers.push("A Vercel env mutation runner is required.");

  if (guardBlockers.length > 0) {
    return buildReport({
      inventory: null,
      publicConfig: null,
      desired: readDesiredConfig(env),
      repairPlan: [],
      applyResults: [],
      blockers: guardBlockers,
      now,
      apply: false,
      replacePublicKeyAcknowledged: false
    });
  }

  const inventory = await inventoryRunner({
    env,
    enabled: true
  });
  const publicConfig = await publicConfigRunner({
    env,
    enabled: true
  });
  const desired = readDesiredConfig(env);
  const targetEnvironment = inventory?.targetEnvironment ?? publicConfig?.targetEnvironment ?? "production";
  const vercelTarget = inventory?.vercelTarget ?? (targetEnvironment === "qa" ? "preview" : "production");
  const replacePublicKeyAcknowledged = Boolean(acknowledgePublicKeyReplace);

  const blockers = [
    ...validatePrerequisites(inventory, publicConfig),
    ...validateDesiredConfig(desired, targetEnvironment)
  ];
  if (apply && targetEnvironment === "production" && !acknowledgeProduction) {
    blockers.push(`${productionAckRequirement} is required before production Clerk config is repaired.`);
  }

  const repairPlan = buildRepairPlan({ inventory, publicConfig, desired, targetEnvironment, vercelTarget, apply });
  const publicKeyAction = repairPlan.find((item) => item.key === publicKeyName && item.action !== "skip");
  if (apply && publicKeyAction && !replacePublicKeyAcknowledged) {
    blockers.push(`${publicKeyReplaceRequirement} is required before replacing the public Clerk publishable key.`);
  }

  if (!apply || blockers.length > 0) {
    return buildReport({
      inventory,
      publicConfig,
      desired,
      repairPlan,
      applyResults: [],
      blockers,
      now,
      apply,
      replacePublicKeyAcknowledged
    });
  }

  const applyResults = [];
  for (const item of repairPlan.filter((planItem) => planItem.action !== "skip")) {
    applyResults.push(await commandRunner({ key: item.key, value: desired.values[item.key], target: item.target, action: item.action, env }));
  }
  const failed = applyResults.filter((result) => result.exitCode !== 0);

  return buildReport({
    inventory,
    publicConfig,
    desired,
    repairPlan,
    applyResults,
    blockers: failed.map((result) => `${result.key} ${result.action} failed with exit code ${result.exitCode}.`),
    now,
    apply,
    replacePublicKeyAcknowledged
  });
}

function readDesiredConfig(env) {
  const publishableKey = String(
    env.VITE_CLERK_PUBLISHABLE_KEY ??
      env.CUSTOMCARD_CLERK_PUBLISHABLE_KEY ??
      env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
      ""
  ).trim();
  const explicitIssuer = String(env.CLERK_ISSUER ?? "").trim();
  const derivedIssuer = publishableKey ? deriveClerkIssuerCandidate(publishableKey) : null;
  const issuer = explicitIssuer || derivedIssuer || "";
  const audience = String(env.CLERK_AUDIENCE ?? "").trim();

  return {
    values: {
      [publicKeyName]: publishableKey,
      CLERK_ISSUER: issuer,
      CLERK_AUDIENCE: audience
    },
    publishableKeySupplied: Boolean(publishableKey),
    publishableKeyKind: publishableKey.startsWith("pk_live_") ? "live" : publishableKey.startsWith("pk_test_") ? "test" : "unknown",
    publishableKeyFingerprint: publishableKey ? fingerprint(publishableKey) : null,
    issuerSupplied: Boolean(issuer),
    explicitIssuerSupplied: Boolean(explicitIssuer),
    derivedIssuer,
    audienceSupplied: Boolean(audience)
  };
}

function validatePrerequisites(inventory, publicConfig) {
  const issues = [];
  if (inventory?.command?.stdoutParsed !== true) {
    issues.push("Hosted Clerk config repair requires a parsed redacted Vercel env inventory.");
  }
  if (!publicConfig || !Array.isArray(publicConfig.blockers)) {
    issues.push("Hosted Clerk config repair requires a redacted public Clerk config probe.");
  }
  return issues;
}

function validateDesiredConfig(desired, targetEnvironment) {
  const issues = [];
  const publishableKey = desired.values[publicKeyName];
  const issuer = desired.values.CLERK_ISSUER;
  const audience = desired.values.CLERK_AUDIENCE;

  if (!publishableKey) {
    issues.push(`${publicKeyName} must be supplied in the process env before Clerk config repair can apply it.`);
  } else if (!/^pk_(?:test|live)_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    issues.push(`${publicKeyName} must be a Clerk pk_test or pk_live publishable key.`);
  }
  if (targetEnvironment === "production" && desired.publishableKeyKind !== "live") {
    issues.push("Production Clerk config repair requires a pk_live publishable key.");
  }
  if (targetEnvironment === "qa" && desired.publishableKeyKind !== "test") {
    issues.push("QA Clerk config repair requires a pk_test publishable key.");
  }
  if (publishableKey && !desired.derivedIssuer) {
    issues.push(`${publicKeyName} must decode to a Clerk issuer host.`);
  }
  if (desired.explicitIssuerSupplied && desired.derivedIssuer && issuer !== desired.derivedIssuer) {
    issues.push("CLERK_ISSUER must match the issuer derived from the supplied Clerk publishable key.");
  }
  if (!issuer) {
    issues.push("CLERK_ISSUER must be supplied or derivable from the Clerk publishable key.");
  } else {
    try {
      const parsed = new URL(issuer);
      if (parsed.protocol !== "https:") issues.push("CLERK_ISSUER must be an https URL.");
    } catch {
      issues.push("CLERK_ISSUER must be a valid https URL.");
    }
  }
  if (!audience) {
    issues.push("CLERK_AUDIENCE must be supplied in the process env before Clerk config repair can apply it.");
  } else if (audience.length < 3 || /replace-me|placeholder|changeme|example|dummy/i.test(audience)) {
    issues.push("CLERK_AUDIENCE must be a non-placeholder value at least 3 characters long.");
  }

  return issues;
}

function buildRepairPlan({ inventory, publicConfig, desired, targetEnvironment, vercelTarget, apply }) {
  const publicConfigReady = targetEnvironment === "production"
    ? publicConfig?.publicConfig?.productionPublicClerkReady === true
    : publicConfig?.publicConfig?.liveKeyDetected !== true;
  const serverKeyPresent = new Map((inventory?.requiredKeys ?? []).map((entry) => [entry.name, entry.present === true]));
  const plan = [];

  plan.push({
    key: publicKeyName,
    target: vercelTarget,
    valueSupplied: desired.publishableKeySupplied,
    action: publicConfigReady ? "skip" : apply ? "vercel-env-replace" : "plan-replace-after-redeploy",
    reason: publicConfigReady
      ? "Hosted public bundle already matches the expected Clerk publishable-key kind."
      : "Hosted public bundle must be rebuilt with the supplied Clerk publishable key."
  });

  for (const key of serverVerifierKeys) {
    const present = serverKeyPresent.get(key) === true;
    plan.push({
      key,
      target: vercelTarget,
      valueSupplied: Boolean(desired.values[key]),
      action: present ? "skip" : apply ? "vercel-env-add" : "plan-add",
      reason: present
        ? `${key} is present in the redacted Vercel env inventory.`
        : `${key} is missing from the redacted Vercel env inventory.`
    });
  }

  return plan;
}

function buildReport({ inventory, publicConfig, desired, repairPlan, applyResults, blockers, now, apply, replacePublicKeyAcknowledged }) {
  const appliedKeys = applyResults.filter((result) => result.exitCode === 0).map((result) => result.key);
  const pendingKeys = repairPlan.filter((item) => item.action !== "skip" && !appliedKeys.includes(item.key)).map((item) => item.key);
  const applySucceeded = apply && blockers.length === 0 && pendingKeys.length === 0;
  const repairReady = blockers.length === 0;

  return {
    service: "customcard-hosted-clerk-config-repair",
    status: repairReady ? "ready" : "blocked",
    scope: "live-hosted-clerk-config-repair",
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    targetEnvironment: inventory?.targetEnvironment ?? publicConfig?.targetEnvironment ?? null,
    vercelTarget: inventory?.vercelTarget ?? null,
    baseUrl: inventory?.baseUrl ?? publicConfig?.baseUrl ?? null,
    applyEnabled: apply,
    publicKeyReplaceAcknowledged: replacePublicKeyAcknowledged,
    mutationsEnabled: apply,
    valuesRedacted: true,
    desiredConfig: {
      publishableKeySupplied: desired.publishableKeySupplied,
      publishableKeyKind: desired.publishableKeyKind,
      publishableKeyFingerprint: desired.publishableKeyFingerprint,
      issuerSupplied: desired.issuerSupplied,
      explicitIssuerSupplied: desired.explicitIssuerSupplied,
      derivedIssuerCandidate: desired.derivedIssuer,
      audienceSupplied: desired.audienceSupplied
    },
    publicConfigBefore: publicConfig
      ? {
          status: publicConfig.status,
          keyKinds: publicConfig.keyKinds ?? [],
          issuerCandidates: publicConfig.issuerCandidates ?? [],
          productionPublicClerkReady: publicConfig.publicConfig?.productionPublicClerkReady === true,
          testKeyDetected: publicConfig.publicConfig?.testKeyDetected === true,
          liveKeyDetected: publicConfig.publicConfig?.liveKeyDetected === true
        }
      : null,
    serverVerifierBefore: inventory
      ? {
          clerkJwtVerifierConfigured: inventory.envSync?.clerkJwtVerifierConfigured === true,
          missingServerVerifierKeys: (inventory.requiredKeys ?? [])
            .filter((entry) => serverVerifierKeys.includes(entry.name) && !entry.present)
            .map((entry) => entry.name)
        }
      : null,
    repairPlan,
    applyResults: applyResults.map((result) => ({
      key: result.key,
      target: result.target,
      action: result.action,
      exitCode: result.exitCode
    })),
    appliedKeys,
    pendingKeys,
    clerkConfig: {
      repairReady,
      repairApplied: applySucceeded,
      redeployRequired: repairPlan.some((item) => item.key === publicKeyName && item.action !== "skip"),
      publicConfigReprobeRequired: repairPlan.some((item) => item.key === publicKeyName && item.action !== "skip") || applySucceeded,
      productionReadyClaimed: false
    },
    blockers
  };
}

function runVercelEnvMutation({ key, value, target, action, env }) {
  if (action === "vercel-env-replace") {
    return runVercelEnvReplace({ key, value, target, env });
  }
  return runVercelEnvAdd({ key, value, target, action, env });
}

async function runVercelEnvReplace({ key, value, target, env }) {
  const remove = await runVercelEnvRm({ key, target, env });
  if (remove.exitCode !== 0) return { key, target, action: "vercel-env-replace", exitCode: remove.exitCode };
  const add = await runVercelEnvAdd({ key, value, target, action: "vercel-env-replace", env });
  return { key, target, action: "vercel-env-replace", exitCode: add.exitCode };
}

function runVercelEnvRm({ key, target, env }) {
  return new Promise((resolveReport) => {
    const child = spawn("vercel", ["env", "rm", key, target, "--yes"], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "ignore", "ignore"]
    });
    child.on("error", () => {
      resolveReport({ key, target, exitCode: 127 });
    });
    child.on("close", (exitCode) => {
      resolveReport({ key, target, exitCode: exitCode ?? 1 });
    });
  });
}

function runVercelEnvAdd({ key, value, target, action, env }) {
  return new Promise((resolveReport) => {
    const child = spawn("vercel", ["env", "add", key, target], {
      cwd: process.cwd(),
      env,
      stdio: ["pipe", "ignore", "ignore"]
    });
    child.stdin.end(`${value}\n`);
    child.on("error", () => {
      resolveReport({ key, target, action, exitCode: 127 });
    });
    child.on("close", (exitCode) => {
      resolveReport({ key, target, action, exitCode: exitCode ?? 1 });
    });
  });
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
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
  const report = writeEvidenceIfRequested(await runHostedClerkConfigRepair({
    enabled: args["confirm-hosted-clerk-config-repair"] === true,
    apply: args.apply === true,
    acknowledgeProduction: args["acknowledge-production"] === true,
    acknowledgePublicKeyReplace: args["acknowledge-public-key-replace"] === true
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
