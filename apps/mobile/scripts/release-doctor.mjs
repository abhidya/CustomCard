import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appConfigSource = readFileSync(resolve(mobileRoot, "app.config.js"), "utf8");
const customerExperienceSource = readFileSync(resolve(mobileRoot, "src/customerExperience.ts"), "utf8");
const eas = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8"));

const checks = [
  checkIncludes("app-config", "platform-identifiers", appConfigSource, [
    'platforms: ["ios", "android"]',
    'scheme: "customcard"',
    'bundleIdentifier: "com.customcard.app"',
    'package: "com.customcard.app"'
  ]),
  checkIncludes("app-config", "runtime-env-resolution", appConfigSource, [
    "process.env.CUSTOMCARD_API_BASE_URL",
    "CUSTOMCARD_API_BASE_URL is required",
    "realOrderKillSwitch",
    'process.env.REAL_ORDER_KILL_SWITCH ?? "disabled"'
  ]),
  checkProfile("eas-build", "development-profile", eas.build?.development, {
    channel: "development",
    distribution: "internal",
    developmentClient: true,
    realOrderKillSwitch: "disabled"
  }),
  checkProfile("eas-build", "preview-profile", eas.build?.preview, {
    channel: "preview",
    distribution: "internal",
    iosSimulator: true,
    androidBuildType: "apk",
    realOrderKillSwitch: "disabled"
  }),
  checkProfile("eas-build", "production-profile", eas.build?.production, {
    channel: "production",
    autoIncrement: true,
    realOrderKillSwitch: "disabled"
  }),
  checkIncludes("package", "release-doctor-script", JSON.stringify(packageJson, null, 2), [
    '"doctor": "node ./scripts/doctor.mjs"',
    '"release:doctor": "node ./scripts/release-doctor.mjs"',
    '"expo"',
    '"react-native"'
  ]),
  checkIncludes("proof-boundary", "deterministic-customer-proof-boundary", customerExperienceSource, [
    "mobileProofBoundary",
    'deterministicProofMode: "repo-local-contract"',
    '"account-import"',
    '"event-review"',
    '"card-approval"',
    '"proof-review"',
    '"fulfillment-review"',
    '"checkout-confirmation"',
    '"native-emulator-render"',
    '"signed-native-artifact"',
    '"app-store-review"',
    '"live-retail-order"',
    "emulatorProofClaimed: false",
    "signedArtifactClaimed: false",
    "liveOrderClaimed: false"
  ]),
  checkAbsent("safety", "no-hardcoded-mobile-api-or-live-order", `${appConfigSource}\n${JSON.stringify(eas, null, 2)}`, [
    "https://api.customcard",
    "customcard-prod.example",
    "REAL_ORDER_KILL_SWITCH\": \"enabled",
    "vendor api connected",
    "paid ai active"
  ])
];

const failed = checks.filter((check) => !check.passed);
const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});

console.log(
  JSON.stringify(
    {
      service: "customcard-mobile-release-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      platforms: ["ios", "android"],
      nativeBuildProfiles: ["development", "preview", "production"],
      proofBoundary: "repo-local-contract",
      blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"],
      signedArtifactBuilt: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkProfile(lane, id, profile, expected) {
  const missing = [];
  if (!profile) {
    missing.push("profile missing");
  } else {
    if (expected.channel && profile.channel !== expected.channel) missing.push(`channel ${expected.channel}`);
    if (expected.distribution && profile.distribution !== expected.distribution) missing.push(`distribution ${expected.distribution}`);
    if (expected.developmentClient && profile.developmentClient !== true) missing.push("developmentClient true");
    if (expected.iosSimulator && profile.ios?.simulator !== true) missing.push("ios.simulator true");
    if (expected.androidBuildType && profile.android?.buildType !== expected.androidBuildType) {
      missing.push(`android.buildType ${expected.androidBuildType}`);
    }
    if (expected.autoIncrement && profile.autoIncrement !== true) missing.push("autoIncrement true");
    if (expected.realOrderKillSwitch && profile.env?.REAL_ORDER_KILL_SWITCH !== expected.realOrderKillSwitch) {
      missing.push(`REAL_ORDER_KILL_SWITCH ${expected.realOrderKillSwitch}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail: missing.length === 0 ? "Mobile native build profile is release-ready." : `Missing mobile build profile signals: ${missing.join(", ")}`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail: missing.length === 0 ? `Found ${required.length} required mobile release signals.` : `Missing mobile release signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? "No forbidden mobile release defaults found." : `Forbidden mobile release defaults present: ${present.join(", ")}`
  };
}
