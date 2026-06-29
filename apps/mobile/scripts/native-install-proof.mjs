import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const guardEnabledRequirement = "--confirm-mobile-native-install-proof";
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
  enabled = false,
  execFileSyncImpl = execFileSync,
  now = new Date()
} = {}) {
  const blockers = [];
  if (!enabled) {
    blockers.push(`${guardEnabledRequirement} is required before scanning installed native app bundles.`);
  }

  const bundleId = String(env.CUSTOMCARD_MOBILE_BUNDLE_ID ?? defaultBundleId).trim() || defaultBundleId;
  const bundlePathResult = resolveBundlePath({ env, bundleId, execFileSyncImpl });
  blockers.push(...bundlePathResult.blockers);

  const bundlePath = bundlePathResult.bundlePath;
  const mainBundlePath = bundlePathResult.mainBundlePath;
  const configPath = bundlePathResult.configPath;
  const text = mainBundlePath && existsSync(mainBundlePath) ? readFileSync(mainBundlePath, "utf8") : "";
  if (bundlePathResult.bundleInputResolved && !text) blockers.push("Native bundle is missing main.jsbundle or it could not be read.");

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
  if (!appConfig.present) {
    blockers.push("Installed native bundle is missing embedded Expo app config.");
  }
  if (!["qa", "prod", "production"].includes(appConfig.appEnv ?? "")) {
    blockers.push("Installed native bundle must declare CUSTOMCARD_APP_ENV as qa or prod.");
  }
  if (!appConfig.apiBaseUrlConfigured) {
    blockers.push("Installed native bundle must include a configured API base URL.");
  }
  if (!appConfig.clerkPublishableKeyKind) {
    blockers.push("Installed native bundle must include a Clerk publishable key.");
  }
  if ((appConfig.appEnv === "prod" || appConfig.appEnv === "production") && appConfig.clerkPublishableKeyKind !== "live") {
    blockers.push("Production native bundle must use a live Clerk publishable key.");
  }
  if (!appConfig.oauthRedirectConfigured) {
    blockers.push("Installed native bundle must include an OAuth redirect URL.");
  }
  if (appConfig.realOrderKillSwitch !== "disabled") {
    blockers.push("Installed native bundle must keep the disabled order safety state for proof capture.");
  }

  return {
    service: "customcard-mobile-native-install-proof",
    status: blockers.length === 0 ? "ready" : "blocked",
    scope: bundlePathResult.bundlePath ? "local-simulator-native-install" : "exported-native-js-bundle",
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    bundle: {
      bundleId,
      simulatorUdidConfigured: Boolean(String(env.CUSTOMCARD_MOBILE_SIMULATOR_UDID ?? "").trim()),
      bundlePathConfigured: Boolean(String(env.CUSTOMCARD_MOBILE_APP_BUNDLE_PATH ?? "").trim()),
      mainBundlePathConfigured: Boolean(String(env.CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH ?? "").trim()),
      appConfigPathConfigured: Boolean(String(env.CUSTOMCARD_MOBILE_APP_CONFIG_PATH ?? "").trim()),
      bundlePathResolved: Boolean(bundlePath),
      bundlePathFingerprint: bundlePath ? fingerprint(bundlePath) : null,
      mainBundlePathFingerprint: mainBundlePath ? fingerprint(mainBundlePath) : null,
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
  const directMainBundlePath = String(env.CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH ?? "").trim();
  if (directMainBundlePath) {
    const mainBundlePath = resolve(directMainBundlePath);
    const configPath = String(env.CUSTOMCARD_MOBILE_APP_CONFIG_PATH ?? "").trim()
      ? resolve(String(env.CUSTOMCARD_MOBILE_APP_CONFIG_PATH))
      : "";
    const blockers = [];
    if (!existsSync(mainBundlePath)) blockers.push("CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH does not exist.");
    if (configPath && !existsSync(configPath)) blockers.push("CUSTOMCARD_MOBILE_APP_CONFIG_PATH does not exist.");
    if (!configPath) blockers.push("CUSTOMCARD_MOBILE_APP_CONFIG_PATH is required with CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH.");
    return {
      bundlePath: "",
      mainBundlePath,
      configPath,
      bundleInputResolved: existsSync(mainBundlePath),
      blockers
    };
  }

  const directPath = String(env.CUSTOMCARD_MOBILE_APP_BUNDLE_PATH ?? "").trim();
  if (directPath) {
    const bundlePath = resolve(directPath);
    return {
      bundlePath,
      mainBundlePath: join(bundlePath, "main.jsbundle"),
      configPath: join(bundlePath, "EXConstants.bundle", "app.config"),
      bundleInputResolved: existsSync(bundlePath),
      blockers: existsSync(bundlePath) ? [] : ["CUSTOMCARD_MOBILE_APP_BUNDLE_PATH does not exist."]
    };
  }

  const simulatorUdid = String(env.CUSTOMCARD_MOBILE_SIMULATOR_UDID ?? "").trim();
  if (!simulatorUdid) {
    return {
      bundlePath: "",
      mainBundlePath: "",
      configPath: "",
      bundleInputResolved: false,
      blockers: ["CUSTOMCARD_MOBILE_SIMULATOR_UDID, CUSTOMCARD_MOBILE_APP_BUNDLE_PATH, or CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH is required."]
    };
  }

  try {
    const output = execFileSyncImpl("xcrun", ["simctl", "appinfo", simulatorUdid, bundleId], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const match = String(output).match(/\bPath = "([^"]+)"/);
    if (!match?.[1]) {
      return {
        bundlePath: "",
        mainBundlePath: "",
        configPath: "",
        bundleInputResolved: false,
        blockers: [`Unable to resolve installed ${bundleId} path from simctl appinfo.`]
      };
    }
    return {
      bundlePath: match[1],
      mainBundlePath: join(match[1], "main.jsbundle"),
      configPath: join(match[1], "EXConstants.bundle", "app.config"),
      bundleInputResolved: existsSync(match[1]),
      blockers: existsSync(match[1]) ? [] : [`Resolved ${bundleId} path does not exist.`]
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "simctl appinfo failed.";
    return {
      bundlePath: "",
      mainBundlePath: "",
      configPath: "",
      bundleInputResolved: false,
      blockers: [`Unable to read installed ${bundleId} appinfo: ${detail}`]
    };
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
    const extra = config.extra ?? config.expo?.extra ?? {};
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
  const report = writeEvidenceIfRequested(runMobileNativeInstallProof({
    enabled: args["confirm-mobile-native-install-proof"] === true
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
