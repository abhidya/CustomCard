const requiredMobileRenderReadinessIds = [
  "native-shell-source-render-contract",
  "customer-flow-screen-state",
  "mobile-print-proof-render",
  "mobile-responsive-layout-constraints",
  "mobile-rtl-render-review",
  "expo-preview-profile-render-contract",
  "native-emulator-render-proof",
  "signed-native-artifact-proof"
];

const requiredNativeBuildProfileIds = ["development", "preview", "production"];
const requiredViewportProfiles = ["iphone-se", "standard-phone", "large-phone", "tablet-portrait"];
const allowedStatuses = new Set(["repo-local-ready", "evidence-missing", "artifact-blocked"]);

export const mobileRenderReadinessItems = [
  {
    id: "native-shell-source-render-contract",
    label: "Native shell source render contract",
    lane: "source-render-contract",
    status: "repo-local-ready",
    screenSectionIds: [
      "header",
      "status-band",
      "sign-in-import",
      "today-card",
      "workflow-coverage",
      "card-queue",
      "memory-review",
      "approval-controls",
      "text-interface",
      "card-proof-path",
      "best-available-options",
      "print-proof",
      "checkout-confirmation",
      "offline-sync",
      "locale-readiness"
    ],
    viewportProfiles: requiredViewportProfiles,
    nativeBuildProfileIds: [],
    requiredSourceSignals: [
      "SafeAreaView",
      "ScrollView",
      "StyleSheet.create",
      "mobileAccountOptions",
      "mobileImportActions",
      "mobileExperienceSections",
      "mobileFulfillmentRecommendations",
      "mobileProofBoundary",
      "summarizeMobileExperience"
    ],
    deterministicProofBoundary: "repo-local-source-contract",
    blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"],
    customerVisible: true,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["Expo App.tsx source", "mobile customer experience contract", "mobile contract tests"],
    requiredEvidence: ["React Native render test output", "Expo preview screenshot", "Screen-reader pass notes"],
    blocker: "Native source render contract exists; no React Native renderer output or emulator screenshot is attached."
  },
  {
    id: "customer-flow-screen-state",
    label: "Customer flow screen state",
    lane: "customer-flow",
    status: "repo-local-ready",
    screenSectionIds: [
      "today-card",
      "sign-in-import",
      "workflow-coverage",
      "card-queue",
      "approval-controls",
      "text-interface",
      "best-available-options",
      "offline-sync"
    ],
    viewportProfiles: ["standard-phone", "large-phone"],
    nativeBuildProfileIds: [],
    requiredSourceSignals: [
      "mobileProofBoundary",
      "mobileAccountOptions",
      "mobileImportActions",
      "mobileTodaySummary",
      "mobileCardQueueItems",
      "mobileApprovalActions",
      "mobileChatTranscript",
      "mobileFulfillmentRecommendations",
      "mobileSyncState"
    ],
    deterministicProofBoundary: "repo-local-customer-flow-contract",
    blockedLiveProofs: ["native-emulator-render", "live-retail-order"],
    customerVisible: true,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["next-action summary", "approval controls", "offline sync contract"],
    requiredEvidence: ["Tap-through recording", "Offline replay screen recording", "Customer session token drill"],
    blocker: "Repo-local state is modeled; no native tap-through or offline replay screen recording is attached."
  },
  {
    id: "mobile-print-proof-render",
    label: "Mobile print proof render",
    lane: "print-proof",
    status: "repo-local-ready",
    screenSectionIds: ["print-proof", "checkout-confirmation", "card-proof-path"],
    viewportProfiles: ["standard-phone", "large-phone"],
    nativeBuildProfileIds: [],
    requiredSourceSignals: ["mobilePrintProofChecks", "proof-size", "proof-resolution", "proof-safe-zone", "proof-order-gate"],
    deterministicProofBoundary: "repo-local-print-proof-contract",
    blockedLiveProofs: ["native-emulator-render", "live-retail-order"],
    customerVisible: true,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["four print proof checks", "checkout confirmation steps", "real-order disabled proof gate"],
    requiredEvidence: ["Native print proof screenshot", "Device-safe-zone screenshot", "Checkout confirmation visual QA"],
    blocker: "Print proof rows are represented in source; no native screenshot or device visual QA evidence is attached."
  },
  {
    id: "mobile-responsive-layout-constraints",
    label: "Mobile responsive layout constraints",
    lane: "viewport-layout",
    status: "repo-local-ready",
    screenSectionIds: ["status-band", "sign-in-import", "today-card", "card-queue", "best-available-options", "locale-readiness"],
    viewportProfiles: requiredViewportProfiles,
    nativeBuildProfileIds: [],
    requiredSourceSignals: ["flex: 1", "ScrollView", "gap:", "maxWidth: 92", "lineHeight"],
    deterministicProofBoundary: "repo-local-layout-source-contract",
    blockedLiveProofs: ["native-emulator-render"],
    customerVisible: true,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["flex layout source", "bounded status pills", "Chrome mobile web overflow smoke test"],
    requiredEvidence: ["Native small-phone screenshot", "Native large-phone screenshot", "Text clipping report"],
    blocker: "Responsive source constraints exist; no native viewport screenshot set or text clipping report is attached."
  },
  {
    id: "mobile-rtl-render-review",
    label: "Mobile RTL render review",
    lane: "rtl-review",
    status: "evidence-missing",
    screenSectionIds: ["locale-readiness", "text-interface"],
    viewportProfiles: ["standard-phone", "large-phone"],
    nativeBuildProfileIds: [],
    requiredSourceSignals: ["ar-EG", "ur-PK", "writingDirection", "copyReviewRequired", "rtl"],
    deterministicProofBoundary: "repo-local-locale-contract",
    blockedLiveProofs: ["native-emulator-render", "app-store-review"],
    customerVisible: true,
    requiresEmulatorProof: true,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["mobile locale options", "RTL copy-review gates", "web/mobile localization tests"],
    requiredEvidence: ["RTL native screenshot", "Arabic layout review", "Urdu layout review"],
    blocker: "RTL locales are modeled and gated; no native RTL screenshot or human layout review is attached."
  },
  {
    id: "expo-preview-profile-render-contract",
    label: "Expo preview profile render contract",
    lane: "native-profile",
    status: "repo-local-ready",
    screenSectionIds: ["preview-build", "development-build", "production-build"],
    viewportProfiles: ["standard-phone"],
    nativeBuildProfileIds: requiredNativeBuildProfileIds,
    requiredSourceSignals: ["developmentClient", "ios.simulator", "android.buildType", "autoIncrement", "REAL_ORDER_KILL_SWITCH"],
    deterministicProofBoundary: "repo-local-eas-profile-contract",
    blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review"],
    customerVisible: false,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["EAS development profile", "EAS preview simulator/APK profile", "EAS production profile"],
    requiredEvidence: ["EAS preview build ID", "Simulator install log", "Preview screenshot"],
    blocker: "EAS profiles are present; no preview build ID, simulator install log, or screenshot is attached."
  },
  {
    id: "native-emulator-render-proof",
    label: "Native emulator render proof",
    lane: "emulator-proof",
    status: "evidence-missing",
    screenSectionIds: ["customer-home", "sign-in-import", "print-proof"],
    viewportProfiles: requiredViewportProfiles,
    nativeBuildProfileIds: ["development", "preview"],
    requiredSourceSignals: ["CUSTOMCARD_API_BASE_URL", "REAL_ORDER_KILL_SWITCH", "expo", "react-native"],
    deterministicProofBoundary: "missing-native-emulator-proof",
    blockedLiveProofs: ["native-emulator-render"],
    customerVisible: true,
    requiresEmulatorProof: true,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["mobile app config", "mobile release doctor", "contract-only customer model"],
    requiredEvidence: ["Emulator screenshot", "Emulator boot log", "Native smoke transcript"],
    blocker: "No iOS or Android emulator screenshot, boot log, or native smoke transcript is attached."
  },
  {
    id: "signed-native-artifact-proof",
    label: "Signed native artifact proof",
    lane: "signed-artifact",
    status: "artifact-blocked",
    screenSectionIds: ["release-artifact", "store-submission"],
    viewportProfiles: [],
    nativeBuildProfileIds: ["production"],
    requiredSourceSignals: ["bundleIdentifier", "package: \"com.customcard.app\"", "submit", "production"],
    deterministicProofBoundary: "missing-signed-native-artifact-proof",
    blockedLiveProofs: ["signed-native-artifact", "app-store-review"],
    customerVisible: false,
    requiresEmulatorProof: false,
    requiresSignedArtifact: true,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["iOS bundle identifier", "Android package identifier", "production EAS profile"],
    requiredEvidence: ["Signed iOS artifact", "Signed Android artifact", "Store signing certificate proof"],
    blocker: "No signed iOS or Android native artifact, EAS artifact URL, or signing certificate proof is attached."
  }
];

export function summarizeMobileRenderReadiness(items = mobileRenderReadinessItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
    artifactBlocked: items.filter((item) => item.status === "artifact-blocked").length,
    customerVisibleItems: items.filter((item) => item.customerVisible).length,
    screenSections: new Set(items.flatMap((item) => item.screenSectionIds)).size,
    viewportProfiles: new Set(items.flatMap((item) => item.viewportProfiles)).size,
    nativeBuildProfiles: new Set(items.flatMap((item) => item.nativeBuildProfileIds)).size,
    sourceSignals: new Set(items.flatMap((item) => item.requiredSourceSignals)).size,
    deterministicProofBoundaries: new Set(items.map((item) => item.deterministicProofBoundary)).size,
    blockedLiveProofs: new Set(items.flatMap((item) => item.blockedLiveProofs)).size,
    emulatorRequired: items.filter((item) => item.requiresEmulatorProof).length,
    signedArtifactRequired: items.filter((item) => item.requiresSignedArtifact).length,
    emulatorRenderProofs: items.filter((item) => item.emulatorRenderProofAttached).length,
    signedArtifacts: items.filter((item) => item.nativeArtifactSigned).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
    liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
    requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort(),
    blockers: validateMobileRenderReadiness(items)
  };
}

export function validateMobileRenderReadiness(items = mobileRenderReadinessItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate mobile render readiness item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (!allowedStatuses.has(item.status)) issues.push(`Mobile render readiness item ${item.id} has unsupported status.`);
    if (item.screenSectionIds.length < 1) issues.push(`Mobile render readiness item ${item.id} must list screen sections.`);
    if (item.requiredSourceSignals.length < 2) issues.push(`Mobile render readiness item ${item.id} must list source signals.`);
    if (!item.deterministicProofBoundary) {
      issues.push(`Mobile render readiness item ${item.id} must name its deterministic proof boundary.`);
    }
    if (!Array.isArray(item.blockedLiveProofs) || item.blockedLiveProofs.length < 1) {
      issues.push(`Mobile render readiness item ${item.id} must list blocked live proof claims.`);
    }
    if (item.currentEvidence.length < 1) issues.push(`Mobile render readiness item ${item.id} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`Mobile render readiness item ${item.id} must list at least two required evidence items.`);
    if (!item.blocker) issues.push(`Mobile render readiness item ${item.id} must explain its blocker.`);
    if (item.emulatorRenderProofAttached !== false) {
      issues.push(`Mobile render readiness item ${item.id} must not claim emulatorRenderProofAttached.`);
    }
    if (item.nativeArtifactSigned !== false) {
      issues.push(`Mobile render readiness item ${item.id} must not claim nativeArtifactSigned.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Mobile render readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.realOrdersEnabled !== false) {
      issues.push(`Mobile render readiness item ${item.id} must keep realOrdersEnabled=false.`);
    }
    if (item.liveProviderCalls !== false) {
      issues.push(`Mobile render readiness item ${item.id} must keep liveProviderCalls=false.`);
    }
  }

  for (const requiredId of requiredMobileRenderReadinessIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing mobile render readiness item: ${requiredId}.`);
  }

  const shell = itemsById.get("native-shell-source-render-contract");
  if (shell) {
    assertCoversViewportProfiles(shell, issues, "Mobile native shell render contract");
    for (const section of [
      "sign-in-import",
      "card-queue",
      "approval-controls",
      "text-interface",
      "best-available-options",
      "print-proof",
      "offline-sync",
      "locale-readiness"
    ]) {
      if (!shell.screenSectionIds.includes(section)) {
        issues.push(`Mobile native shell render contract must include section: ${section}.`);
      }
    }
  }

  const preview = itemsById.get("expo-preview-profile-render-contract");
  if (preview) {
    assertCoversNativeBuildProfiles(preview, issues, "Expo preview profile render contract");
  }

  const rtl = itemsById.get("mobile-rtl-render-review");
  if (rtl) {
    if (!rtl.requiresEmulatorProof || rtl.emulatorRenderProofAttached !== false) {
      issues.push("Mobile RTL render review must require emulator proof without claiming it.");
    }
    for (const signal of ["ar-EG", "ur-PK", "rtl"]) {
      if (!rtl.requiredSourceSignals.includes(signal)) issues.push(`Mobile RTL render review must include source signal: ${signal}.`);
    }
  }

  const emulator = itemsById.get("native-emulator-render-proof");
  if (emulator) {
    assertCoversViewportProfiles(emulator, issues, "Native emulator render proof");
    if (!emulator.requiresEmulatorProof || emulator.emulatorRenderProofAttached !== false) {
      issues.push("Native emulator render proof must require emulator evidence without claiming it.");
    }
  }

  const signed = itemsById.get("signed-native-artifact-proof");
  if (signed) {
    if (signed.status !== "artifact-blocked") {
      issues.push("Signed native artifact proof must remain artifact-blocked.");
    }
    if (!signed.requiresSignedArtifact || signed.nativeArtifactSigned !== false) {
      issues.push("Signed native artifact proof must require signed artifact evidence without claiming it.");
    }
  }

  return issues;
}

function assertCoversViewportProfiles(item, issues, label) {
  for (const viewport of requiredViewportProfiles) {
    if (!item.viewportProfiles.includes(viewport)) issues.push(`${label} must include viewport: ${viewport}.`);
  }
}

function assertCoversNativeBuildProfiles(item, issues, label) {
  for (const profile of requiredNativeBuildProfileIds) {
    if (!item.nativeBuildProfileIds.includes(profile)) issues.push(`${label} must include native build profile: ${profile}.`);
  }
}
