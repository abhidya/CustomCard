import { readFileSync } from "node:fs";
import {
  mobileRenderReadinessItems,
  summarizeMobileRenderReadiness,
  validateMobileRenderReadiness
} from "../src/mobileRenderReadinessData.mjs";

const files = {
  readinessTest: "src/mobileRenderReadiness.test.ts",
  mobileApp: "apps/mobile/src/App.tsx",
  mobileExperience: "apps/mobile/src/customerExperience.ts",
  mobileDoctor: "apps/mobile/scripts/doctor.mjs",
  mobileReleaseDoctor: "apps/mobile/scripts/release-doctor.mjs",
  appConfig: "apps/mobile/app.config.js",
  eas: "apps/mobile/eas.json",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  adminApp: "src/App.tsx",
  docs: "docs/platform-expansion-design.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeMobileRenderReadiness(mobileRenderReadinessItems);
const validationBlockers = validateMobileRenderReadiness(mobileRenderReadinessItems);
const itemIds = mobileRenderReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 5),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 2),
  checkExact("register", "artifact-blocked-count", summary.artifactBlocked, 1),
  checkExact("register", "viewport-profile-count", summary.viewportProfiles, 4),
  checkExact("register", "native-build-profile-count", summary.nativeBuildProfiles, 3),
  checkExact("register", "no-emulator-proof-claim", summary.emulatorRenderProofs, 0),
  checkExact("register", "no-signed-artifact-claim", summary.signedArtifacts, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-real-orders", summary.realOrdersEnabled, 0),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkMinimum("register", "screen-section-count", summary.screenSections, 20),
  checkMinimum("register", "source-signal-count", summary.sourceSignals, 25),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-mobile-render-readiness-ids", itemIds, [
    "native-shell-source-render-contract",
    "customer-flow-screen-state",
    "mobile-print-proof-render",
    "mobile-responsive-layout-constraints",
    "mobile-rtl-render-review",
    "expo-preview-profile-render-contract",
    "native-emulator-render-proof",
    "signed-native-artifact-proof"
  ]),
  checkItemsShape("register", "mobile-render-readiness-item-shape", mobileRenderReadinessItems),
  checkIncludes("tests", "mobile-render-readiness-tests", contents.readinessTest, [
    "tracks mobile render readiness without claiming emulator or signed artifact proof",
    "covers customer mobile sections, viewports, and native build profiles explicitly",
    "flags unsafe native render proof claims"
  ]),
  checkIncludes("mobile-source", "native-mobile-render-source-signals", `${contents.mobileApp}\n${contents.mobileExperience}`, [
    "SafeAreaView",
    "ScrollView",
    "Card queue",
    "Approval controls",
    "Text interface",
    "Render choices",
    "Print proof",
    "Offline API sync",
    "Locale readiness",
    "mobilePrintProofChecks",
    "mobileLocaleOptions"
  ]),
  checkIncludes("native-profiles", "expo-native-render-profile-signals", `${contents.appConfig}\n${contents.eas}\n${contents.mobileReleaseDoctor}`, [
    'platforms: ["ios", "android"]',
    'scheme: "customcard"',
    'bundleIdentifier: "com.customcard.app"',
    'package: "com.customcard.app"',
    '"preview"',
    '"simulator": true',
    '"buildType": "apk"',
    "signedArtifactBuilt: false"
  ]),
  checkIncludes("surfaces", "admin-api-mobile-render-surfaces", `${contents.adminApp}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Mobile render readiness",
    "summarizeMobileRenderReadiness",
    "mobileRenderReadiness",
    "emulatorRenderProofs",
    "signedArtifacts"
  ]),
  checkIncludes("docs", "mobile-render-readiness-docs", contents.docs, [
    "Mobile render readiness",
    "`src/mobileRenderReadiness.ts`",
    "`npm run mobile:render:doctor`",
    "not an emulator render proof"
  ]),
  checkIncludes("ci", "mobile-render-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"mobile:render:doctor": "node scripts/mobile-render-readiness-doctor.mjs"',
    "Validate mobile render readiness",
    "npm run mobile:render:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "React Native render test output",
    "Emulator screenshot",
    "RTL native screenshot",
    "Signed iOS artifact",
    "Signed Android artifact"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-mobile-render-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      repoLocalReady: summary.repoLocalReady,
      evidenceMissing: summary.evidenceMissing,
      artifactBlocked: summary.artifactBlocked,
      screenSections: summary.screenSections,
      viewportProfiles: summary.viewportProfiles,
      nativeBuildProfiles: summary.nativeBuildProfiles,
      emulatorRequired: summary.emulatorRequired,
      signedArtifactRequired: summary.signedArtifactRequired,
      emulatorRenderProofs: summary.emulatorRenderProofs,
      signedArtifacts: summary.signedArtifacts,
      externalNetworkCalls: summary.externalNetworkCalls,
      realOrdersEnabled: summary.realOrdersEnabled,
      liveProviderCalls: summary.liveProviderCalls,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkMinimum(lane, id, actual, minimum) {
  return {
    id,
    lane,
    passed: actual >= minimum,
    detail: actual >= minimum ? `${actual} is at least ${minimum}.` : `${actual} is below required minimum ${minimum}.`
  };
}

function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

function checkNoBlockers(lane, id, blockers) {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Executable mobile render readiness contract has no blockers." : blockers.join(" ")
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "screenSectionIds",
    "viewportProfiles",
    "nativeBuildProfileIds",
    "requiredSourceSignals",
    "customerVisible",
    "requiresEmulatorProof",
    "requiresSignedArtifact",
    "emulatorRenderProofAttached",
    "nativeArtifactSigned",
    "externalNetworkCalls",
    "realOrdersEnabled",
    "liveProviderCalls",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ];
  const missing = [];

  for (const item of items) {
    for (const key of requiredKeys) {
      if (!(key in item)) missing.push(`${item.id ?? "unknown"}.${key}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${items.length} executable mobile render readiness item shapes.`
        : `Missing mobile render readiness fields: ${missing.join(", ")}`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required mobile render readiness signals.`
        : `Missing mobile render readiness signals: ${missing.join(", ")}`
  };
}

function checkArrayIncludes(lane, id, values, required) {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required mobile render readiness signals.`
        : `Missing mobile render readiness signals: ${missing.join(", ")}`
  };
}
