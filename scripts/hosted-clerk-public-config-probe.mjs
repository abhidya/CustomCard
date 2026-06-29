import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveHostedTarget } from "./hosted-clerk-route-probe.mjs";

const guardRequirement = "--confirm-hosted-clerk-public-config-probe";
const publishableKeyPattern = /pk_(?:test|live)_[A-Za-z0-9_-]+/g;

export async function runHostedClerkPublicConfigProbe({
  env = process.env,
  enabled = false,
  fetchImpl = globalThis.fetch,
  now = new Date()
} = {}) {
  const target = resolveHostedTarget(env);
  const blockers = [...target.blockers];
  if (!enabled) {
    blockers.unshift(`${guardRequirement} is required before hosted Clerk public config probes run.`);
  }
  if (typeof fetchImpl !== "function") blockers.push("A fetch implementation is required for hosted Clerk public config probes.");

  if (blockers.length > 0) {
    return buildReport({ target, assets: [], keys: [], blockers, now });
  }

  const htmlResult = await fetchText(fetchImpl, new URL("/", target.baseUrl));
  if (!htmlResult.ok) {
    return buildReport({
      target,
      assets: [{ url: "/", fetched: false, status: htmlResult.status }],
      keys: [],
      blockers: [`Public app HTML fetch failed with HTTP ${htmlResult.status}.`],
      now
    });
  }

  const assetPaths = collectScriptAssetPaths(htmlResult.text);
  const assets = [{ url: "/", fetched: true, status: htmlResult.status }];
  const keys = collectPublishableKeys(htmlResult.text, "/");

  for (const path of assetPaths) {
    const assetResult = await fetchText(fetchImpl, new URL(path, target.baseUrl));
    assets.push({ url: path, fetched: assetResult.ok, status: assetResult.status });
    if (assetResult.ok) keys.push(...collectPublishableKeys(assetResult.text, path));
  }

  const uniqueKeys = dedupeKeys(keys);
  const probeBlockers = [];
  if (uniqueKeys.length === 0) {
    probeBlockers.push("No Clerk publishable key was found in the hosted public app bundle.");
  }
  const kinds = new Set(uniqueKeys.map((key) => key.kind));
  if (target.targetEnvironment === "production" && kinds.has("test")) {
    probeBlockers.push("Production hosted public app bundle must not ship a Clerk pk_test publishable key.");
  }
  if (target.targetEnvironment === "production" && !kinds.has("live")) {
    probeBlockers.push("Production hosted public app bundle must ship a Clerk pk_live publishable key.");
  }
  if (target.targetEnvironment === "qa" && kinds.has("live")) {
    probeBlockers.push("QA hosted public app bundle must not ship a Clerk pk_live publishable key.");
  }

  return buildReport({ target, assets, keys: uniqueKeys, blockers: probeBlockers, now });
}

function collectScriptAssetPaths(html) {
  return Array.from(
    new Set(
      Array.from(String(html ?? "").matchAll(/(?:src|href)=["']([^"']+\.js)["']/gi))
        .map((match) => match[1])
        .filter((src) => src.startsWith("/assets/"))
    )
  );
}

function collectPublishableKeys(text, sourcePath) {
  return Array.from(String(text ?? "").matchAll(publishableKeyPattern)).map((match) => {
    const value = match[0];
    return {
      sourcePath,
      kind: value.startsWith("pk_live_") ? "live" : "test",
      fingerprint: fingerprint(value),
      decodedIssuerCandidate: deriveClerkIssuerCandidate(value),
      valueLength: value.length
    };
  });
}

function dedupeKeys(keys) {
  const seen = new Set();
  const unique = [];
  for (const key of keys) {
    if (seen.has(key.fingerprint)) continue;
    seen.add(key.fingerprint);
    unique.push(key);
  }
  return unique;
}

export function deriveClerkIssuerCandidate(key) {
  const encoded = key.replace(/^pk_(?:test|live)_/, "");
  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8").replace(/\$+$/, "");
    if (!decoded || !/^[A-Za-z0-9.-]+$/.test(decoded)) return null;
    return `https://${decoded}`;
  } catch {
    return null;
  }
}

function fingerprint(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

async function fetchText(fetchImpl, url) {
  try {
    const response = await fetchImpl(url, { headers: { Accept: "text/html,application/javascript,text/javascript,*/*" } });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

function buildReport({ target, assets, keys, blockers, now }) {
  const kinds = Array.from(new Set(keys.map((key) => key.kind))).sort();
  const issuerCandidates = Array.from(new Set(keys.map((key) => key.decodedIssuerCandidate).filter(Boolean))).sort();
  const productionPublicClerkReady = target.targetEnvironment === "production" && kinds.includes("live") && !kinds.includes("test");

  return {
    service: "customcard-hosted-clerk-public-config-probe",
    status: blockers.length === 0 ? "ready" : "blocked",
    scope: "live-hosted-clerk-public-config",
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    targetEnvironment: target.targetEnvironment,
    baseUrl: target.baseUrl,
    mutationsEnabled: false,
    valuesRedacted: true,
    assets,
    publishableKeys: keys.map((key) => ({
      sourcePath: key.sourcePath,
      kind: key.kind,
      fingerprint: key.fingerprint,
      valueLength: key.valueLength,
      decodedIssuerCandidate: key.decodedIssuerCandidate
    })),
    keyCount: keys.length,
    keyKinds: kinds,
    issuerCandidates,
    publicConfig: {
      productionPublicClerkReady,
      testKeyDetected: kinds.includes("test"),
      liveKeyDetected: kinds.includes("live")
    },
    blockers
  };
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
  const report = writeEvidenceIfRequested(await runHostedClerkPublicConfigProbe({
    enabled: args["confirm-hosted-clerk-public-config-probe"] === true
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
