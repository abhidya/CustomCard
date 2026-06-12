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
    mobileDoctor: "apps/mobile/scripts/doctor.mjs",
    mobileReleaseDoctor: "apps/mobile/scripts/release-doctor.mjs",
    appConfig: "apps/mobile/app.config.js",
    eas: "apps/mobile/eas.json",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    adminApp: "src/App.tsx",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    docs: "docs/platform-expansion-design.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

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
  checkItemsHaveKeys("register", "mobile-render-readiness-item-shape", mobileRenderReadinessItems, [
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
  ], {
    readyDetail: `Validated ${mobileRenderReadinessItems.length} executable mobile render readiness item shapes.`,
    missingPrefix: "Missing mobile render readiness fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "mobile-render-readiness-tests",
    sourceKeys: ["readinessTest"],
    signals: [
      "tracks mobile render readiness without claiming emulator or signed artifact proof",
      "covers customer mobile sections, viewports, and native build profiles explicitly",
      "flags unsafe native render proof claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "mobile-source",
    id: "native-mobile-render-source-signals",
    sourceKeys: ["mobileApp", "mobileExperience"],
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
      "signedArtifacts"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not an emulator render proof"], { id: "mobile-render-readiness-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "mobile-render-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "React Native render test output",
    "Emulator screenshot",
    "RTL native screenshot",
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
  emulatorRequired: summary.emulatorRequired,
  signedArtifactRequired: summary.signedArtifactRequired,
  emulatorRenderProofs: summary.emulatorRenderProofs,
  signedArtifacts: summary.signedArtifacts,
  externalNetworkCalls: summary.externalNetworkCalls,
  realOrdersEnabled: summary.realOrdersEnabled,
  liveProviderCalls: summary.liveProviderCalls
}, checks);
