import { existsSync } from "node:fs";
import {
  mobileRenderReadinessItems,
  summarizeMobileRenderReadiness,
  validateMobileRenderReadiness
} from "../src/mobileRenderReadinessData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkItemsHaveKeys,
  checkMinimum,
  checkNoBlockers,
  runDoctorReport
} from "./doctor-harness.mjs";
import {
  checkDoctorDocs,
  checkDoctorScriptedAndGated,
  checkDoctorSourceSignals,
  defineDoctorManifest,
  readDoctorManifestFiles
} from "./doctor-manifest.mjs";

const doctorManifest = defineDoctorManifest({
  id: "mobile-render",
  service: "customcard-mobile-render-readiness-doctor",
  npmScript: "mobile:render:doctor",
  scriptPath: "scripts/mobile-render-readiness-doctor.mjs",
  workflowLabel: "Validate mobile render readiness",
  docsTitle: "Mobile render readiness",
  readinessModule: "src/mobileRenderReadiness.ts",
  files: {
    readinessTest: "src/mobileRenderReadiness.test.ts",
    mobileApp: "apps/mobile/src/App.tsx",
    mobileExperience: "apps/mobile/src/customerExperience.ts",
    mobileBootstrap: "src/mobileBootstrapData.mjs",
    mobileDoctor: "apps/mobile/scripts/doctor.mjs",
    mobileReleaseDoctor: "apps/mobile/scripts/release-doctor.mjs",
    mobileNativeInstallProof: "apps/mobile/scripts/native-install-proof.mjs",
    appConfig: "apps/mobile/app.config.js",
    eas: "apps/mobile/eas.json",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    adminApp: "src/App.tsx",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    iosSmokeEvidence: "docs/evidence/mobile-render/2026-06-15-ios-prod-review-smoke.md",
    iosReleaseEvidence: "docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.md",
    iosViewportEvidence: "docs/evidence/mobile-render/2026-06-15-ios-release-viewport-screenshots.md",
    iosNativeInstallStaleEvidence: "docs/evidence/mobile-render/2026-06-15-ios-native-install-stale-proof.json",
    iosNativeExportCurrentEvidence: "docs/evidence/mobile-render/2026-06-15-ios-native-export-current-proof.json",
    docs: "docs/platform-expansion-design.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

const summary = summarizeMobileRenderReadiness(mobileRenderReadinessItems);
const validationBlockers = validateMobileRenderReadiness(mobileRenderReadinessItems);
const itemIds = mobileRenderReadinessItems.map((item) => item.id);
const evidenceArtifactRefs = mobileRenderReadinessItems.flatMap((item) => item.evidenceArtifactRefs);
const missingEvidenceArtifactRefs = evidenceArtifactRefs.filter((ref) => !existsSync(ref));

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 5),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 2),
  checkExact("register", "artifact-blocked-count", summary.artifactBlocked, 1),
  checkExact("register", "viewport-profile-count", summary.viewportProfiles, 4),
  checkExact("register", "native-build-profile-count", summary.nativeBuildProfiles, 3),
  checkExact("register", "evidence-artifact-count", summary.evidenceArtifacts, 11),
  checkExact("register", "emulator-smoke-evidence-artifact-count", summary.emulatorSmokeEvidenceArtifacts, 11),
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
  checkItemsHaveKeys("register", "mobile-render-readiness-item-shape", mobileRenderReadinessItems, [
    "id",
    "label",
    "lane",
    "status",
    "screenSectionIds",
    "viewportProfiles",
    "nativeBuildProfileIds",
    "requiredSourceSignals",
    "deterministicProofBoundary",
    "blockedLiveProofs",
    "evidenceArtifactRefs",
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
  ], {
    readyDetail: `Validated ${mobileRenderReadinessItems.length} executable mobile render readiness item shapes.`,
    missingPrefix: "Missing mobile render readiness fields"
  }),
  {
    id: "mobile-render-evidence-artifacts-exist",
    lane: "evidence",
    passed: missingEvidenceArtifactRefs.length === 0,
    detail:
      missingEvidenceArtifactRefs.length === 0
        ? `Resolved ${evidenceArtifactRefs.length} mobile render evidence artifact refs.`
        : `Missing mobile render evidence artifacts: ${missingEvidenceArtifactRefs.join(", ")}`
  },
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "mobile-render-readiness-tests",
    sourceKeys: ["readinessTest"],
    signals: [
      "tracks mobile render readiness with iOS release simulator evidence without claiming full emulator or signed artifact proof",
      "covers customer mobile sections, viewports, and native build profiles explicitly",
      "flags unsafe native render proof claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "evidence",
    id: "ios-prod-review-smoke-evidence-boundary",
    sourceKeys: ["iosSmokeEvidence"],
    signals: [
      "iOS Production-Mode Review Smoke",
      "CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback",
      "Expo Go production JavaScript bundle",
      "2026-06-15-ios-prod-review-smoke.png",
      "session-token gate is not shown",
      "not a complete emulator render proof",
      "Expo Go `Tools` bubble"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "evidence",
    id: "ios-release-simulator-home-evidence-boundary",
    sourceKeys: ["iosReleaseEvidence"],
    signals: [
      "iOS Release Simulator Home Render",
      "Build Succeeded",
      "Release-iphonesimulator",
      "com.customcard.app",
      "2026-06-15-ios-release-simulator-home.png",
      "without the Expo Go Tools overlay",
      "not the full mobile render proof matrix"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "evidence",
    id: "ios-release-viewport-screenshot-evidence-boundary",
    sourceKeys: ["iosViewportEvidence"],
    signals: [
      "iOS Release Viewport Screenshots",
      "Build Succeeded",
      "Release-iphonesimulator",
      "com.customcard.app",
      "UIDeviceFamily",
      "2026-06-15-ios-release-iphone-se.png",
      "2026-06-15-ios-release-standard-phone.png",
      "2026-06-15-ios-release-large-phone.png",
      "2026-06-15-ios-release-tablet-portrait.png",
      "session-token gate is not shown",
      "not the full mobile render proof matrix"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "evidence",
    id: "ios-native-install-stale-evidence-boundary",
    sourceKeys: ["mobileNativeInstallProof", "iosNativeInstallStaleEvidence"],
    signals: [
      "customcard-mobile-native-install-proof",
      "--confirm-mobile-native-install-proof",
      "CUSTOMCARD_MOBILE_APP_BUNDLE_PATH",
      "CUSTOMCARD_MOBILE_SIMULATOR_UDID",
      "print through your preferred print shop",
      "\"status\": \"blocked\"",
      "\"bundlePathFingerprint\"",
      "\"valuesRedacted\": true",
      "\"realOrdersEnabled\": false",
      "Finish manually",
      "print through Walgreens",
      "request local regeneration"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "evidence",
    id: "ios-native-export-current-evidence-boundary",
    sourceKeys: ["mobileNativeInstallProof", "iosNativeExportCurrentEvidence"],
    signals: [
      "CUSTOMCARD_MOBILE_MAIN_BUNDLE_PATH",
      "CUSTOMCARD_MOBILE_APP_CONFIG_PATH",
      "\"scope\": \"exported-native-js-bundle\"",
      "\"status\": \"ready\"",
      "\"mainBundlePathFingerprint\"",
      "\"valuesRedacted\": true",
      "\"realOrdersEnabled\": false",
      "\"presentStaleSignals\": []",
      "\"missingCurrentSignals\": []",
      "print through your preferred print shop",
      "Finish at a print shop"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "mobile-source",
    id: "native-mobile-render-source-signals",
    sourceKeys: ["mobileApp", "mobileExperience", "mobileBootstrap"],
    signals: [
      "SafeAreaView",
      "ScrollView",
      "Pressable",
      "accessibilityRole",
      "Start with an event",
      "Today's card",
      "Cards to review",
      "Card actions",
      "Card assistant",
      "Preview the card",
      "Printing options",
      "Print file checks",
      "Saved offline",
      "mobileRenderSnapshot",
      "buildMobileRenderSnapshot",
      "validateMobileRenderSnapshot",
      "summarizeMobileRenderSnapshot",
      "MobileRenderSection",
      "MobileRenderRow",
      "MobileRenderAction",
      "ActionSurface",
      "secondaryActions",
      "presentation",
      "disabled",
      "mobileFulfillmentRecommendations",
      "mobilePrintProofChecks",
      "mobileLocaleOptions"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "native-profiles",
    id: "expo-native-render-profile-signals",
    sourceKeys: ["appConfig", "eas", "mobileReleaseDoctor"],
    signals: [
      'platforms: ["ios", "android"]',
      'scheme: "customcard"',
      'bundleIdentifier: "com.customcard.app"',
      'package: "com.customcard.app"',
      '"preview"',
      '"simulator": true',
      '"buildType": "apk"',
      "signedArtifactBuilt: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-mobile-render-surfaces",
    sourceKeys: ["adminApp", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "Mobile render readiness",
      "summarizeMobileRenderReadiness",
      "mobileRenderReadiness",
      "emulatorRenderProofs",
      "emulatorSmokeEvidenceArtifacts",
      "signedArtifacts"
    ]
  }),
  checkDoctorDocs(
    doctorManifest,
    contents,
    [
      "iOS Expo Go smoke",
      "tooling-free Release",
      "compact, standard, large, and tablet Release",
      "guarded stale native-install proof",
      "fresh exported iOS JS bundle",
      "not a complete emulator render proof"
    ],
    { id: "mobile-render-readiness-docs" }
  ),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "mobile-render-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "React Native render test output",
    "RTL native screenshot",
    "Print proof native screenshot",
    "Signed iOS artifact",
    "Signed Android artifact"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
  items: summary.total,
  repoLocalReady: summary.repoLocalReady,
  evidenceMissing: summary.evidenceMissing,
  artifactBlocked: summary.artifactBlocked,
  screenSections: summary.screenSections,
  viewportProfiles: summary.viewportProfiles,
  nativeBuildProfiles: summary.nativeBuildProfiles,
  evidenceArtifacts: summary.evidenceArtifacts,
  emulatorSmokeEvidenceArtifacts: summary.emulatorSmokeEvidenceArtifacts,
  emulatorRequired: summary.emulatorRequired,
  signedArtifactRequired: summary.signedArtifactRequired,
  emulatorRenderProofs: summary.emulatorRenderProofs,
  signedArtifacts: summary.signedArtifacts,
  externalNetworkCalls: summary.externalNetworkCalls,
  realOrdersEnabled: summary.realOrdersEnabled,
  liveProviderCalls: summary.liveProviderCalls
}, checks);
