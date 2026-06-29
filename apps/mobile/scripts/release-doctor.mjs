import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appConfigSource = readFileSync(resolve(mobileRoot, "app.config.js"), "utf8");
const customerExperienceSource = readFileSync(resolve(mobileRoot, "src/customerExperience.ts"), "utf8");
const eas = JSON.parse(readFileSync(resolve(mobileRoot, "eas.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(resolve(mobileRoot, "package.json"), "utf8"));
const buildProfiles = eas.build ?? {};

const checks = [
  checkIncludes("app-config", "platform-identifiers", appConfigSource, [
    'platforms: ["ios", "android"]',
    'scheme: "customcard"',
    'bundleIdentifier: "com.customcard.app"',
    "supportsTablet: true",
    'package: "com.customcard.app"'
  ]),
  checkIncludes("app-config", "runtime-env-resolution", appConfigSource, [
    "env.CUSTOMCARD_API_BASE_URL",
    "env.CUSTOMCARD_QA_API_BASE_URL",
    "env.CUSTOMCARD_PRODUCTION_API_BASE_URL",
    "process.env.CUSTOMCARD_APP_ENV",
    "process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "process.env.CUSTOMCARD_OAUTH_REDIRECT_URL",
    "resolveApiBaseUrl",
    "is required for the mobile app shell",
    "CUSTOMCARD_APP_ENV must be qa or production",
    "Clerk publishable key",
    "QA mobile builds require a Clerk test publishable key",
    "CUSTOMCARD_OAUTH_REDIRECT_URL must be customcard://sso-callback",
    "realOrderKillSwitch"
  ]),
  checkProfile("eas-build", "development-profile", resolveBuildProfile("development"), {
    channel: "qa",
    distribution: "internal",
    developmentClient: true,
    appEnv: "qa",
    oauthRedirectUrl: "customcard://sso-callback",
  }),
  checkProfile("eas-build", "qa-profile", resolveBuildProfile("qa"), {
    channel: "qa",
    distribution: "internal",
    iosSimulator: true,
    androidBuildType: "apk",
    appEnv: "qa",
    oauthRedirectUrl: "customcard://sso-callback",
  }),
  checkProfile("eas-build", "preview-profile", resolveBuildProfile("preview"), {
    channel: "qa",
    distribution: "internal",
    iosSimulator: true,
    androidBuildType: "apk",
    appEnv: "qa",
    oauthRedirectUrl: "customcard://sso-callback",
  }),
  checkProfile("eas-build", "production-profile", resolveBuildProfile("production"), {
    channel: "production",
    autoIncrement: true,
    appEnv: "production",
    oauthRedirectUrl: "customcard://sso-callback",
  }),
  checkIncludes("package", "release-doctor-script", JSON.stringify(packageJson, null, 2), [
    '"doctor": "node ./scripts/doctor.mjs"',
    '"release:doctor": "node ./scripts/release-doctor.mjs"',
    '"assets:brand": "node ./scripts/generate-brand-assets.mjs"',
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
      nativeBuildProfiles: ["development", "qa", "preview", "production"],
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
    if (expected.appEnv && profile.env?.CUSTOMCARD_APP_ENV !== expected.appEnv) {
      missing.push(`CUSTOMCARD_APP_ENV ${expected.appEnv}`);
    }
    if (expected.oauthRedirectUrl && profile.env?.CUSTOMCARD_OAUTH_REDIRECT_URL !== expected.oauthRedirectUrl) {
      missing.push(`CUSTOMCARD_OAUTH_REDIRECT_URL ${expected.oauthRedirectUrl}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail: missing.length === 0 ? "Mobile native build profile is release-ready." : `Missing mobile build profile signals: ${missing.join(", ")}`
  };
}

function resolveBuildProfile(name, seen = new Set()) {
  const profile = buildProfiles[name];
  if (!profile || !profile.extends || seen.has(name)) return profile;
  seen.add(name);
  const parent = resolveBuildProfile(profile.extends, seen) ?? {};
  return {
    ...parent,
    ...profile,
    env: {
      ...(parent.env ?? {}),
      ...(profile.env ?? {})
    },
    ios: {
      ...(parent.ios ?? {}),
      ...(profile.ios ?? {})
    },
    android: {
      ...(parent.android ?? {}),
      ...(profile.android ?? {})
    }
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
