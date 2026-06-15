import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const guardEnvName = "CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF";
const defaultBundleId = "com.customcard.app";

const requiredCurrentSignals = Object.freeze([
  "print through your preferred print shop",
  "Finish at a print shop",
  "Draft again",
  "The card assistant",
  "secure Google Calendar connection is still pending"
]);

const forbiddenStaleSignals = Object.freeze([
  "print through Walgreens",
  "Finish manually",
  "Server-gated",
  "Local scripted assistant",
  "Regenerate locally",
  "Manual upload stays active",
  "request local regeneration",
  "Template artwork is ready now"
]);

export function runMobileNativeInstallProof({
  env = process.env,
  execFileSyncImpl = execFileSync,
  now = new Date()
} = {}) {
  const blockers = [];
  if (env[guardEnvName] !== "enabled") {
    blockers.push(`${guardEnvName}=enabled is required before scanning installed native app bundles.`);
  }

  const bundleId = String(env.CUSTOMCARD_MOBILE_BUNDLE_ID ?? defaultBundleId).trim() || defaultBundleId;
  const bundlePathResult = resolveBundlePath({ env, bundleId, execFileSyncImpl });
  blockers.push(...bundlePathResult.blockers);

  const bundlePath = bundlePathResult.bundlePath;
  const mainBundlePath = bundlePath ? join(bundlePath, "main.jsbundle") : "";
  const configPath = bundlePath ? join(bundlePath, "EXConstants.bundle", "app.config") : "";
  const text = mainBundlePath && existsSync(mainBundlePath) ? readFileSync(mainBundlePath, "utf8") : "";
  if (bundlePath && !text) blockers.push("Installed native bundle is missing main.jsbundle or it could not be read.");

  const currentSignals = requiredCurrentSignals.map((signal) => ({ signal, present: text.includes(signal) }));
  const staleSignals = forbiddenStaleSignals.map((signal) => ({ signal, present: text.includes(signal) }));
  const missingCurrentSignals = currentSignals.filter((item) => !item.present).map((item) => item.signal);
  const presentStaleSignals = staleSignals.filter((item) => item.present).map((item) => item.signal);

  if (missingCurrentSignals.length > 0) {
    blockers.push(`Installed native bundle is missing current customer copy: ${missingCurrentSignals.join(", ")}.`);
  }
  if (presentStaleSignals.length > 0) {
    blockers.push(`Installed native bundle still contains stale customer copy: ${presentStaleSignals.join(", ")}.`);
  }

  const appConfig = readRedactedAppConfig(configPath);
  if (appConfig.realOrderKillSwitch && appConfig.realOrderKillSwitch !== "disabled") {
    blockers.push("Installed native bundle must keep REAL_ORDER_KILL_SWITCH disabled for proof capture.");
  }

  return {
    service: "customcard-mobile-native-install-proof",
    status: blockers.length === 0 ? "ready" : "blocked",
    scope: "local-simulator-native-install",
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    bundle: {
      bundleId,
      simulatorUdidConfigured: Boolean(String(env.CUSTOMCARD_MOBILE_SIMULATOR_UDID ?? "").trim()),
      bundlePathConfigured: Boolean(String(env.CUSTOMCARD_MOBILE_APP_BUNDLE_PATH ?? "").trim()),
      bundlePathResolved: Boolean(bundlePath),
      bundlePathFingerprint: bundlePath ? fingerprint(bundlePath) : null,
      mainBundleFound: Boolean(text),
      mainBundleBytes: Buffer.byteLength(text)
    },
    appConfig,
    currentSignals,
    staleSignals,
    missingCurrentSignals,
    presentStaleSignals,
    valuesRedacted: true,
    destructiveActions: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    blockers
  };
}

function resolveBundlePath({ env, bundleId, execFileSyncImpl }) {
  const directPath = String(env.CUSTOMCARD_MOBILE_APP_BUNDLE_PATH ?? "").trim();
  if (directPath) return { bundlePath: resolve(directPath), blockers: existsSync(resolve(directPath)) ? [] : ["CUSTOMCARD_MOBILE_APP_BUNDLE_PATH does not exist."] };

  const simulatorUdid = String(env.CUSTOMCARD_MOBILE_SIMULATOR_UDID ?? "").trim();
  if (!simulatorUdid) {
    return {
      bundlePath: "",
      blockers: ["CUSTOMCARD_MOBILE_SIMULATOR_UDID or CUSTOMCARD_MOBILE_APP_BUNDLE_PATH is required."]
    };
  }

  try {
    const output = execFileSyncImpl("xcrun", ["simctl", "appinfo", simulatorUdid, bundleId], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const match = String(output).match(/\bPath = "([^"]+)"/);
    if (!match?.[1]) return { bundlePath: "", blockers: [`Unable to resolve installed ${bundleId} path from simctl appinfo.`] };
    return { bundlePath: match[1], blockers: existsSync(match[1]) ? [] : [`Resolved ${bundleId} path does not exist.`] };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "simctl appinfo failed.";
    return { bundlePath: "", blockers: [`Unable to read installed ${bundleId} appinfo: ${detail}`] };
  }
}

function readRedactedAppConfig(configPath) {
  if (!configPath || !existsSync(configPath)) {
    return {
      present: false,
      appEnv: null,
      apiBaseUrlConfigured: false,
      clerkPublishableKeyKind: null,
      oauthRedirectConfigured: false,
      realOrderKillSwitch: null
    };
  }

  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const extra = config.extra ?? {};
    const clerkKey = String(extra.clerkPublishableKey ?? "");
    return {
      present: true,
      appEnv: typeof extra.appEnv === "string" ? extra.appEnv : null,
      apiBaseUrlConfigured: Boolean(String(extra.apiBaseUrl ?? "")),
      clerkPublishableKeyKind: clerkKey.startsWith("pk_live_") ? "live" : clerkKey.startsWith("pk_test_") ? "test" : null,
      oauthRedirectConfigured: Boolean(String(extra.oauthRedirectUrl ?? "")),
      realOrderKillSwitch: typeof extra.realOrderKillSwitch === "string" ? extra.realOrderKillSwitch : null
    };
  } catch {
    return {
      present: true,
      appEnv: null,
      apiBaseUrlConfigured: false,
      clerkPublishableKeyKind: null,
      oauthRedirectConfigured: false,
      realOrderKillSwitch: null
    };
  }
}

function fingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function writeEvidenceIfRequested(report, env = process.env) {
  const outputPath = String(env.CUSTOMCARD_MOBILE_NATIVE_INSTALL_PROOF_EVIDENCE_OUT ?? "").trim();
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
  const report = writeEvidenceIfRequested(runMobileNativeInstallProof());
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready") process.exit(1);
}
