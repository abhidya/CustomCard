import { describe, expect, it } from "vitest";
import {
  mobileRenderReadinessItems,
  summarizeMobileRenderReadiness,
  validateMobileRenderReadiness,
  type MobileRenderReadinessItem
} from "./mobileRenderReadiness";

describe("mobile render readiness", () => {
  it("tracks mobile render readiness with iOS release simulator evidence without claiming full emulator or signed artifact proof", () => {
    const summary = summarizeMobileRenderReadiness();

    expect(validateMobileRenderReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 5,
      evidenceMissing: 2,
      artifactBlocked: 1,
      customerVisibleItems: 6,
      screenSections: 21,
      viewportProfiles: 4,
      nativeBuildProfiles: 3,
      deterministicProofBoundaries: 8,
      blockedLiveProofs: 4,
      evidenceArtifacts: 9,
      emulatorSmokeEvidenceArtifacts: 9,
      emulatorRequired: 2,
      signedArtifactRequired: 1,
      emulatorRenderProofs: 0,
      signedArtifacts: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.sourceSignals).toBeGreaterThanOrEqual(25);
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "React Native render test output",
        "Print proof native screenshot",
        "RTL native screenshot",
        "Signed iOS artifact",
        "Signed Android artifact"
      ])
    );
  });

  it("covers customer mobile sections, viewports, and native build profiles explicitly", () => {
    const shell = mobileRenderReadinessItems.find((item) => item.id === "native-shell-source-render-contract");
    const preview = mobileRenderReadinessItems.find((item) => item.id === "expo-preview-profile-render-contract");
    const rtl = mobileRenderReadinessItems.find((item) => item.id === "mobile-rtl-render-review");
    const emulator = mobileRenderReadinessItems.find((item) => item.id === "native-emulator-render-proof");
    const signed = mobileRenderReadinessItems.find((item) => item.id === "signed-native-artifact-proof");

    expect(shell?.screenSectionIds).toEqual(
      expect.arrayContaining([
        "sign-in-import",
        "next-action",
        "card-queue",
        "approval-controls",
        "card-assistant",
        "card-proof-path",
        "best-available-options",
        "print-proof",
        "checkout-confirmation",
        "offline-sync"
      ])
    );
    expect(shell?.viewportProfiles).toEqual(
      expect.arrayContaining(["iphone-se", "standard-phone", "large-phone", "tablet-portrait"])
    );
    expect(preview?.nativeBuildProfileIds).toEqual(expect.arrayContaining(["development", "preview", "production"]));
    expect(shell).toMatchObject({
      deterministicProofBoundary: "repo-local-source-contract",
      blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"]
    });
    expect(mobileRenderReadinessItems.every((item) => item.emulatorRenderProofAttached === false)).toBe(true);
    expect(mobileRenderReadinessItems.every((item) => item.nativeArtifactSigned === false)).toBe(true);
    expect(mobileRenderReadinessItems.every((item) => item.blockedLiveProofs.length > 0)).toBe(true);
    expect(mobileRenderReadinessItems.every((item) => Array.isArray(item.evidenceArtifactRefs))).toBe(true);
    expect(rtl).toMatchObject({
      status: "evidence-missing",
      requiresEmulatorProof: true,
      emulatorRenderProofAttached: false,
      liveProviderCalls: false
    });
    expect(emulator).toMatchObject({
      requiresEmulatorProof: true,
      emulatorRenderProofAttached: false,
      externalNetworkCalls: false,
      evidenceArtifactRefs: [
        "docs/evidence/mobile-render/2026-06-15-ios-prod-review-smoke.md",
        "docs/evidence/mobile-render/2026-06-15-ios-prod-review-smoke.png",
        "docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.md",
        "docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.png",
        "docs/evidence/mobile-render/2026-06-15-ios-release-viewport-screenshots.md",
        "docs/evidence/mobile-render/2026-06-15-ios-release-iphone-se.png",
        "docs/evidence/mobile-render/2026-06-15-ios-release-standard-phone.png",
        "docs/evidence/mobile-render/2026-06-15-ios-release-large-phone.png",
        "docs/evidence/mobile-render/2026-06-15-ios-release-tablet-portrait.png"
      ]
    });
    expect(signed).toMatchObject({
      status: "artifact-blocked",
      requiresSignedArtifact: true,
      nativeArtifactSigned: false
    });
  });

  it("flags unsafe native render proof claims before admin or API readiness can expose them", () => {
    const unsafeItems: MobileRenderReadinessItem[] = [
      {
        ...mobileRenderReadinessItems[0],
        emulatorRenderProofAttached: true,
        nativeArtifactSigned: true,
        externalNetworkCalls: true,
        realOrdersEnabled: true,
        liveProviderCalls: true,
        screenSectionIds: [],
        requiredSourceSignals: ["one"],
        deterministicProofBoundary: "",
        blockedLiveProofs: [],
        evidenceArtifactRefs: ["docs/not-evidence.png"],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as MobileRenderReadinessItem,
      {
        ...mobileRenderReadinessItems[0]
      }
    ];

    expect(validateMobileRenderReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate mobile render readiness item: native-shell-source-render-contract.",
        "Mobile render readiness item native-shell-source-render-contract must list screen sections.",
        "Mobile render readiness item native-shell-source-render-contract must list source signals.",
        "Mobile render readiness item native-shell-source-render-contract must name its deterministic proof boundary.",
        "Mobile render readiness item native-shell-source-render-contract must list blocked live proof claims.",
        "Mobile render readiness item native-shell-source-render-contract has invalid evidenceArtifactRefs: docs/not-evidence.png.",
        "Mobile render readiness item native-shell-source-render-contract must list current repo-local evidence.",
        "Mobile render readiness item native-shell-source-render-contract must list at least two required evidence items.",
        "Mobile render readiness item native-shell-source-render-contract must explain its blocker.",
        "Mobile render readiness item native-shell-source-render-contract must not claim emulatorRenderProofAttached.",
        "Mobile render readiness item native-shell-source-render-contract must not claim nativeArtifactSigned.",
        "Mobile render readiness item native-shell-source-render-contract must not require live external network calls.",
        "Mobile render readiness item native-shell-source-render-contract must keep realOrdersEnabled=false.",
        "Mobile render readiness item native-shell-source-render-contract must keep liveProviderCalls=false.",
        "Missing mobile render readiness item: native-emulator-render-proof.",
        "Missing mobile render readiness item: signed-native-artifact-proof."
      ])
    );

    expect(
      validateMobileRenderReadiness([
        {
          ...mobileRenderReadinessItems.find((item) => item.id === "mobile-rtl-render-review")!,
          requiresEmulatorProof: false,
          requiredSourceSignals: ["writingDirection"]
        },
        {
          ...mobileRenderReadinessItems.find((item) => item.id === "native-emulator-render-proof")!,
          viewportProfiles: ["standard-phone"],
          requiresEmulatorProof: false
        },
        {
          ...mobileRenderReadinessItems.find((item) => item.id === "signed-native-artifact-proof")!,
          status: "evidence-missing",
          requiresSignedArtifact: false
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Mobile RTL render review must require emulator proof without claiming it.",
        "Mobile RTL render review must include source signal: ar-EG.",
        "Native emulator render proof must include viewport: iphone-se.",
        "Native emulator render proof must require emulator evidence without claiming it.",
        "Signed native artifact proof must remain artifact-blocked.",
        "Signed native artifact proof must require signed artifact evidence without claiming it."
      ])
    );
  });
});
