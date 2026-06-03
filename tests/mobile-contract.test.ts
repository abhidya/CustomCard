import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mobileApprovalActions,
  mobileCardQueueItems,
  mobileChatTranscript,
  mobileExperience,
  mobileExperienceSections,
  mobileHandoffSteps,
  mobileLocaleOptions,
  mobilePricingPreviews,
  mobileRenderChoices,
  mobileSyncState,
  requiredMobileCapabilities,
  summarizeMobileExperience,
  validateMobileExperience,
  type MobileExperienceModel
} from "../apps/mobile/src/customerExperience";

const shellDoctorTimeoutMs = 15_000;

describe("mobile customer experience contract", () => {
  it("covers the required customer app capabilities with visible sections", () => {
    const summary = summarizeMobileExperience();

    expect(validateMobileExperience()).toEqual([]);
    expect(summary.capabilityCount).toBe(requiredMobileCapabilities.length);
    expect(summary.customerVisibleSections).toBe(requiredMobileCapabilities.length);
    expect(summary.localeOptions).toBe(4);
    expect(summary.rtlLocales).toBe(2);
    expect(summary.copyReviewRequiredLocales).toBe(3);
    expect(summary.queueItems).toBeGreaterThanOrEqual(2);
    expect(summary.pendingApprovalItems).toBeGreaterThanOrEqual(1);
    expect(summary.idempotentApprovalActions).toBe(mobileApprovalActions.length);
    expect(summary.reviewOnlyPricingOptions).toBe(mobilePricingPreviews.length);
    expect(summary.offlineMutationTypes).toBeGreaterThanOrEqual(5);
    expect(mobileExperienceSections.map((section) => section.id)).toEqual(
      expect.arrayContaining(requiredMobileCapabilities)
    );
  });

  it("keeps mobile queue, approval, chat, render, pricing, and handoff paths local or gated", () => {
    expect(mobileCardQueueItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "needs-approval", panelCount: 4, customerVisible: true }),
        expect.objectContaining({ status: "approved", panelCount: 4, customerVisible: true })
      ])
    );
    expect(mobileApprovalActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "approve", mutationType: "approve-card", idempotencyRequired: true }),
        expect.objectContaining({ kind: "dismiss", mutationType: "dismiss-card", idempotencyRequired: true }),
        expect.objectContaining({ kind: "request-regeneration", networkMode: "local-only" })
      ])
    );
    expect(mobileChatTranscript.map((message) => message.text).join(" ")).toContain(
      "Live AI and vendor orders stay off"
    );
    expect(mobileRenderChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Browser SVG renderer", mode: "free-local" }),
        expect.objectContaining({ label: "AI image providers", mode: "credential-gated" })
      ])
    );
    expect(mobilePricingPreviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "Walgreens", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false }),
        expect.objectContaining({ vendor: "CVS", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false })
      ])
    );
    expect(mobileHandoffSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Download SVG set", realOrderState: "manual" }),
        expect.objectContaining({ label: "Confirm pickup manually", realOrderState: "disabled" })
      ])
    );
    expect(mobileLocaleOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ locale: "en-US", cardLanguage: "English", copyReviewRequired: false }),
        expect.objectContaining({ locale: "ar-EG", cardLanguage: "Arabic", writingDirection: "rtl", copyReviewRequired: true })
      ])
    );
    expect(mobileSyncState).toMatchObject({
      apiBaseUrlRequired: true,
      authMode: "customer-session",
      offlineQueueEnabled: true,
      idempotencyRequired: true,
      retryPolicy: "exponential-backoff"
    });
    expect(mobileSyncState.pendingMutationTypes).toEqual(
      expect.arrayContaining(["approve-card", "update-tone", "snooze-card", "dismiss-card", "prepare-handoff"])
    );
    expect(mobileSyncState.forbiddenMutationTypes).toEqual(
      expect.arrayContaining(["submit-live-order", "charge-payment", "upload-raw-memory"])
    );
  });

  it("passes the mobile doctor with env configuration and fails if real orders are enabled", () => {
    const validOutput = execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
      encoding: "utf8",
      env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "disabled" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(validOutput).toContain("customer experience contract");

    let stderr = "";
    try {
      execFileSync("node", ["apps/mobile/scripts/doctor.mjs"], {
        encoding: "utf8",
        env: { ...process.env, CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173", REAL_ORDER_KILL_SWITCH: "enabled" },
        stdio: ["ignore", "pipe", "pipe"]
      });
    } catch (error) {
      stderr = String((error as { stderr?: string }).stderr);
    }
    expect(stderr).toContain("kill switch must resolve to disabled");
  }, shellDoctorTimeoutMs);

  it("ships a native release profile gate without hardcoded production API endpoints", () => {
    const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8")) as {
      build: Record<string, {
        channel?: string;
        distribution?: string;
        developmentClient?: boolean;
        autoIncrement?: boolean;
        env?: Record<string, string>;
        ios?: { simulator?: boolean };
        android?: { buildType?: string };
      }>;
    };
    const releaseOutput = execFileSync("npm", ["run", "mobile:release:doctor", "--silent"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(releaseOutput) as {
      service: string;
      status: string;
      platforms: string[];
      nativeBuildProfiles: string[];
      signedArtifactBuilt: boolean;
      liveProviderCalls: boolean;
      realOrdersEnabled: boolean;
      blockers: unknown[];
    };

    expect(eas.build.development).toMatchObject({
      developmentClient: true,
      distribution: "internal",
      channel: "development",
      env: { REAL_ORDER_KILL_SWITCH: "disabled" }
    });
    expect(eas.build.preview).toMatchObject({
      distribution: "internal",
      channel: "preview",
      ios: { simulator: true },
      android: { buildType: "apk" },
      env: { REAL_ORDER_KILL_SWITCH: "disabled" }
    });
    expect(eas.build.production).toMatchObject({
      channel: "production",
      autoIncrement: true,
      env: { REAL_ORDER_KILL_SWITCH: "disabled" }
    });
    expect(JSON.stringify(eas)).not.toContain("CUSTOMCARD_API_BASE_URL");
    expect(report).toMatchObject({
      service: "customcard-mobile-release-doctor",
      status: "ready",
      platforms: ["ios", "android"],
      nativeBuildProfiles: ["development", "preview", "production"],
      signedArtifactBuilt: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      blockers: []
    });
  }, shellDoctorTimeoutMs);

  it("flags incomplete or unsafe mobile customer models before they reach the app", () => {
    const unsafeModel: MobileExperienceModel = {
      safetyBanner: {
        label: "Real orders enabled",
        detail: "payment active"
      },
      sections: [
        {
          ...mobileExperience.sections[0],
          customerVisible: false,
          detail: "live order ready"
        }
      ],
      queueItems: [
        {
          ...mobileExperience.queueItems[0],
          customerVisible: false,
          panelCount: 2
        }
      ],
      approvalActions: [
        {
          ...mobileExperience.approvalActions[0],
          idempotencyRequired: false
        }
      ],
      chatTranscript: [
        {
          speaker: "assistant",
          source: "local-script",
          text: "I can help."
        }
      ],
      renderChoices: [
        {
          label: "AI only",
          detail: "paid ai active",
          mode: "credential-gated"
        }
      ],
      pricingPreviews: [
        {
          ...mobileExperience.pricingPreviews[0],
          liveQuote: true,
          manualConfirmationRequired: false
        }
      ],
      handoffSteps: [
        {
          label: "Auto vendor submit",
          detail: "vendor api connected",
          realOrderState: "disabled"
        }
      ],
      localeOptions: [
        {
          locale: "ar-EG",
          label: "Arabic unsafe",
          cardLanguage: "Arabic",
          writingDirection: "rtl",
          copyReviewRequired: false,
          customerVisible: false
        }
      ],
      syncState: {
        ...mobileExperience.syncState,
        apiBaseUrlRequired: false,
        offlineQueueEnabled: false,
        idempotencyRequired: false,
        forbiddenMutationTypes: ["submit-live-order"]
      }
    };

    expect(validateMobileExperience(unsafeModel)).toEqual(
      expect.arrayContaining([
        "Missing mobile customer capability: approval-controls",
        "Missing mobile customer capability: memory-review",
        "Missing mobile customer capability: text-chat",
        "Missing mobile customer capability: image-render",
        "Missing mobile customer capability: pricing-preview",
        "Missing mobile customer capability: handoff",
        "Missing mobile customer capability: offline-sync",
        "Every mobile experience section must be customer-visible.",
        "Mobile experience does not expose enough customer sections.",
        "Every mobile card queue item must be customer-visible.",
        "Every mobile card queue item must reference four 5x7 panels.",
        "Missing mobile approval action: edit-tone",
        "Missing mobile approval action: snooze",
        "Missing mobile approval action: dismiss",
        "Every mobile approval action must require idempotency.",
        "Mobile chat must identify the local scripted assistant path.",
        "Mobile chat must disclose that live AI and vendor orders are off.",
        "Mobile render choices must include the free browser SVG renderer.",
        "Mobile pricing preview must expose multiple retail-printer choices.",
        "Mobile pricing previews must stay review-only and manually confirmed.",
        "Mobile handoff must keep a manual upload path.",
        "Disabled mobile handoff steps must explain blocked live order APIs.",
        "Mobile safety banner must keep real orders disabled.",
        "Mobile sync must require the configured API base URL and customer session auth.",
        "Mobile sync must keep offline queueing and idempotency enabled.",
        "Mobile sync must forbid live order, payment, and raw-memory mutations.",
        "Missing mobile locale option: en-US",
        "Missing mobile locale option: es-US",
        "Missing mobile locale option: ur-PK",
        "Every mobile locale option must be customer-visible.",
        "RTL mobile locale options must require copy review.",
        "Unsafe mobile live-provider claim: Real orders enabled",
        "Unsafe mobile live-provider claim: payment active",
        "Unsafe mobile live-provider claim: live order ready",
        "Unsafe mobile live-provider claim: paid ai active",
        "Unsafe mobile live-provider claim: vendor api connected"
      ])
    );

    expect(
      validateMobileExperience({
        ...mobileExperience,
        renderChoices: [
          {
            label: "Browser SVG renderer",
            detail: "Free renderer stays available.",
            mode: "free-local"
          }
        ]
      })
    ).toContain("Mobile render choices must keep AI image providers credential-gated.");
  });
});
