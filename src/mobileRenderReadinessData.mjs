import { defineReadinessRegister, invalidEvidenceArtifactRefs } from "./readinessRegister.mjs";

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
      "next-action",
      "card-queue",
      "memory-review",
      "approval-controls",
      "card-assistant",
      "card-proof-path",
      "best-available-options",
      "print-proof",
      "checkout-confirmation",
      "offline-sync"
    ],
    viewportProfiles: requiredViewportProfiles,
    nativeBuildProfileIds: [],
    requiredSourceSignals: [
      "SafeAreaView",
      "ScrollView",
      "Pressable",
      "accessibilityRole",
      "StyleSheet.create",
      "mobileRenderSnapshot",
      "MobileRenderSection",
      "MobileRenderRow",
      "MobileRenderAction",
      "ActionSurface",
      "buildMobileRenderSnapshot",
      "validateMobileRenderSnapshot",
      "summarizeMobileRenderSnapshot"
    ],
    deterministicProofBoundary: "repo-local-source-contract",
    blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"],
    evidenceArtifactRefs: [],
    customerVisible: true,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["Expo App.tsx source", "mobile render snapshot contract", "mobile contract tests"],
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
      "next-action",
      "card-queue",
      "approval-controls",
      "card-assistant",
      "best-available-options",
      "offline-sync"
    ],
    viewportProfiles: ["standard-phone", "large-phone"],
    nativeBuildProfileIds: [],
    requiredSourceSignals: [
      "mobileProofBoundary",
      "mobileRenderSnapshot",
      "buildMobileRenderSnapshot",
      "mobileAccountOptions",
      "mobileImportActions",
      "mobileTodaySummary",
      "mobileCardQueueItems",
      "mobileApprovalActions",
      "secondaryActions",
      "presentation",
      "disabled",
      "mobileChatTranscript",
      "mobileFulfillmentRecommendations",
      "mobileSyncState"
    ],
    deterministicProofBoundary: "repo-local-customer-flow-contract",
    blockedLiveProofs: ["native-emulator-render", "live-retail-order"],
    evidenceArtifactRefs: [],
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
    evidenceArtifactRefs: [],
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
    evidenceArtifactRefs: [],
    customerVisible: true,
    requiresEmulatorProof: false,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "flex layout source",
      "bounded status pills",
      "Chrome mobile web overflow smoke test",
      "iOS Release compact, standard, large, and tablet home screenshots"
    ],
    requiredEvidence: ["Text clipping report", "Print proof responsive screenshot"],
    blocker: "Responsive source constraints and native home viewport screenshots exist; no native text clipping report or print-proof responsive screenshot is attached."
  },
  {
    id: "mobile-rtl-render-review",
    label: "Mobile RTL render review",
    lane: "rtl-review",
    status: "evidence-missing",
    screenSectionIds: ["card-assistant", "sign-in-import"],
    viewportProfiles: ["standard-phone", "large-phone"],
    nativeBuildProfileIds: [],
    requiredSourceSignals: ["ar-EG", "ur-PK", "writingDirection", "copyReviewRequired", "rtl"],
    deterministicProofBoundary: "repo-local-locale-contract",
    blockedLiveProofs: ["native-emulator-render", "app-store-review"],
    evidenceArtifactRefs: [],
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
    requiredSourceSignals: ["developmentClient", "ios.simulator", "android.buildType", "autoIncrement", "realOrderKillSwitch"],
    deterministicProofBoundary: "repo-local-eas-profile-contract",
    blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review"],
    evidenceArtifactRefs: [],
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
    requiredSourceSignals: [
      "CUSTOMCARD_QA_API_BASE_URL",
      "CUSTOMCARD_PRODUCTION_API_BASE_URL",
      "CUSTOMCARD_API_BASE_URL",
      "realOrderKillSwitch",
      "expo",
      "react-native"
    ],
    deterministicProofBoundary: "missing-native-emulator-proof",
    blockedLiveProofs: ["native-emulator-render"],
    evidenceArtifactRefs: [
      "docs/evidence/mobile-render/2026-06-15-ios-prod-review-smoke.md",
      "docs/evidence/mobile-render/2026-06-15-ios-prod-review-smoke.png",
      "docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.md",
      "docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.png",
      "docs/evidence/mobile-render/2026-06-15-ios-release-viewport-screenshots.md",
      "docs/evidence/mobile-render/2026-06-15-ios-release-iphone-se.png",
      "docs/evidence/mobile-render/2026-06-15-ios-release-standard-phone.png",
      "docs/evidence/mobile-render/2026-06-15-ios-release-large-phone.png",
      "docs/evidence/mobile-render/2026-06-15-ios-release-tablet-portrait.png",
      "docs/evidence/mobile-render/2026-06-15-ios-native-install-stale-proof.json",
      "docs/evidence/mobile-render/2026-06-15-ios-native-export-current-proof.json"
    ],
    customerVisible: true,
    requiresEmulatorProof: true,
    requiresSignedArtifact: false,
    emulatorRenderProofAttached: false,
    nativeArtifactSigned: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "mobile app config",
      "mobile release doctor",
      "contract-only customer model",
      "iOS Expo Go production-mode smoke artifact with Tools bubble caveat",
      "tooling-free iOS Release simulator home screenshot",
      "tooling-free iOS Release compact, standard, large, and tablet viewport screenshots",
      "guarded native install scan that blocks stale simulator bundles from counting as current release proof",
      "fresh iOS exported native JS bundle scan with current print-shop copy and redacted QA config"
    ],
    requiredEvidence: [
      "Print proof native screenshot",
      "RTL native screenshot",
      "Native smoke transcript"
    ],
    blocker: "Clean iOS Release simulator home, compact-phone, standard-phone, large-phone, and tablet screenshots are attached; the guarded native install scan proves one simulator install is stale, and a fresh exported iOS JS bundle now has current copy, but the native evidence still does not cover the print, RTL, smoke-transcript, installed-current-bundle, or signed-artifact proof matrix."
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
    evidenceArtifactRefs: [],
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

const mobileRenderReadinessRegister = defineReadinessRegister({
  domainLabel: "mobile render",
  items: mobileRenderReadinessItems,
  requiredIds: requiredMobileRenderReadinessIds,
  itemRules(item) {
    const issues = [];

    if (!allowedStatuses.has(item.status)) issues.push(`Mobile render readiness item ${item.id} has unsupported status.`);
    if (item.screenSectionIds.length < 1) issues.push(`Mobile render readiness item ${item.id} must list screen sections.`);
    if (item.requiredSourceSignals.length < 2) issues.push(`Mobile render readiness item ${item.id} must list source signals.`);
    if (!item.deterministicProofBoundary) {
      issues.push(`Mobile render readiness item ${item.id} must name its deterministic proof boundary.`);
    }
    if (!Array.isArray(item.blockedLiveProofs) || item.blockedLiveProofs.length < 1) {
      issues.push(`Mobile render readiness item ${item.id} must list blocked live proof claims.`);
    }
    if (!Array.isArray(item.evidenceArtifactRefs)) {
      issues.push(`Mobile render readiness item ${item.id} must list evidenceArtifactRefs.`);
    } else {
      const invalidRefs = invalidEvidenceArtifactRefs(item.evidenceArtifactRefs);
      if (invalidRefs.length > 0) {
        issues.push(`Mobile render readiness item ${item.id} has invalid evidenceArtifactRefs: ${invalidRefs.join(", ")}.`);
      }
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

    return issues;
  },
  crossRules(itemsById) {
    const issues = [];

    const shell = itemsById.get("native-shell-source-render-contract");
    if (shell) {
      assertCoversViewportProfiles(shell, issues, "Mobile native shell render contract");
      for (const section of [
        "sign-in-import",
        "next-action",
        "card-queue",
        "approval-controls",
        "card-assistant",
        "best-available-options",
        "print-proof",
        "offline-sync"
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
  },
  summarize(items) {
    return {
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
      evidenceArtifacts: items.reduce((total, item) => total + item.evidenceArtifactRefs.length, 0),
      emulatorSmokeEvidenceArtifacts:
        items.find((item) => item.id === "native-emulator-render-proof")?.evidenceArtifactRefs.length ?? 0,
      emulatorRequired: items.filter((item) => item.requiresEmulatorProof).length,
      signedArtifactRequired: items.filter((item) => item.requiresSignedArtifact).length,
      emulatorRenderProofs: items.filter((item) => item.emulatorRenderProofAttached).length,
      signedArtifacts: items.filter((item) => item.nativeArtifactSigned).length,
      externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
      realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
      liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizeMobileRenderReadiness(items = mobileRenderReadinessItems) {
  return mobileRenderReadinessRegister.summarize(items);
}

export function validateMobileRenderReadiness(items = mobileRenderReadinessItems) {
  return mobileRenderReadinessRegister.validate(items);
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
