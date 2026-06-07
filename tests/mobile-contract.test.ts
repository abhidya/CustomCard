import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildFulfillmentRecommendations } from "../src/fulfillmentRecommendation";
import { buildPrinterPricingComparison } from "../src/printerPricing";
import {
  buildMobileAccountOptions,
  mobileAccountOptions,
  mobileApprovalActions,
  mobileCalendarConnectionStartPackets,
  mobileCardQueueItems,
  mobileChatTranscript,
  mobileExperience,
  mobileExperienceSections,
  mobileFulfillmentRecommendations,
  mobileHandoffSteps,
  mobileImportActions,
  mobileLocaleOptions,
  mobileMemoryReviewItems,
  mobilePricingPreviews,
  mobilePrintProofChecks,
  mobileProofBoundary,
  mobileRenderSnapshot,
  mobileRenderChoices,
  mobileSyncState,
  mobileTodaySummary,
  summarizeMobileRenderSnapshot,
  requiredMobileCapabilities,
  collectMobileCustomerCopy,
  validateMobileRenderSnapshot,
  summarizeMobileExperience,
  validateMobileExperience,
  type MobileExperienceModel
} from "../apps/mobile/src/customerExperience";

const shellDoctorTimeoutMs = 15_000;

describe("mobile customer experience contract", () => {
  it("exposes the Expo root entrypoint and native launch scripts", () => {
    const rootApp = readFileSync("apps/mobile/App.tsx", "utf8");
    const packageJson = JSON.parse(readFileSync("apps/mobile/package.json", "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(rootApp.trim()).toBe('export { default } from "./src/App";');
    expect(packageJson.scripts).toMatchObject({
      start: "expo start",
      ios: "expo start --ios",
      android: "expo start --android",
      doctor: "node ./scripts/doctor.mjs",
      "release:doctor": "node ./scripts/release-doctor.mjs"
    });
  });

  it("covers the required customer app capabilities with visible sections", () => {
    const summary = summarizeMobileExperience();

    expect(validateMobileExperience()).toEqual([]);
    expect(summary.capabilityCount).toBe(requiredMobileCapabilities.length);
    expect(summary.customerVisibleSections).toBe(requiredMobileCapabilities.length);
    expect(summary.accountOptions).toBe(2);
    expect(summary.liveOAuthOptions).toBe(0);
    expect(summary.importActions).toBe(3);
    expect(summary.localeOptions).toBe(4);
    expect(summary.rtlLocales).toBe(2);
    expect(summary.copyReviewRequiredLocales).toBe(3);
    expect(summary.webCustomerFlowStages).toBe(6);
    expect(summary.blockedLiveProofs).toBe(4);
    expect(summary.proofApproved).toBe(false);
    expect(summary.printOptionsUnlocked).toBe(false);
    expect(summary.todayPrimaryActions).toBe(1);
    expect(summary.queueItems).toBeGreaterThanOrEqual(2);
    expect(summary.pendingApprovalItems).toBeGreaterThanOrEqual(1);
    expect(summary.idempotentApprovalActions).toBe(mobileApprovalActions.length);
    expect(summary.memoryReviewItems).toBeGreaterThanOrEqual(2);
    expect(summary.approvedMemoryReviewItems).toBeGreaterThanOrEqual(1);
    expect(summary.reviewOnlyPricingOptions).toBe(mobilePricingPreviews.length);
    expect(summary.fulfillmentRecommendations).toBe(3);
    expect(summary.liveFulfillmentRecommendations).toBe(0);
    expect(summary.printProofChecks).toBeGreaterThanOrEqual(4);
    expect(summary.passedPrintProofChecks).toBe(mobilePrintProofChecks.length);
    expect(summary.offlineMutationTypes).toBeGreaterThanOrEqual(5);
    expect(mobileExperienceSections.map((section) => section.id)).toEqual(
      expect.arrayContaining(requiredMobileCapabilities)
    );
  });

  it("keeps mobile sign-in, import, queue, chat, print options, and checkout paths local or gated", () => {
    expect(mobileAccountOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: "Google",
          label: "Google Calendar",
          liveOAuthEnabled: false,
          sourceMode: "oauth-readiness",
          startMode: "oauth-evidence-required",
          startRoute: "/api/calendar/connections/start",
          nextApiRoute: null,
          clientMayPrepareProviderRequest: false,
          networkRequestPrepared: false,
          credentialStorageEnabled: false,
          providerRequestUrl: null,
          canStartNow: false,
          blockedReason: "No live OAuth consent flow is implemented in this repository state."
        }),
        expect.objectContaining({
          provider: "Apple",
          label: "Apple Calendar ICS export",
          liveOAuthEnabled: false,
          sourceMode: "manual-export",
          startMode: "manual-export-guide",
          startRoute: "/api/calendar/connections/start",
          nextApiRoute: "/api/import-preview",
          clientMayPrepareProviderRequest: false,
          networkRequestPrepared: false,
          credentialStorageEnabled: false,
          providerRequestUrl: null,
          canStartNow: true
        })
      ])
    );
    expect(mobileCalendarConnectionStartPackets.map((packet) => packet.id)).toEqual([
      "google-calendar-events",
      "icloud-ics-fallback"
    ]);
    expect(buildMobileAccountOptions(mobileCalendarConnectionStartPackets)).toEqual(mobileAccountOptions);
    expect(mobileAccountOptions.every((option) => option.dataBoundary.length > 0 && option.credentialBoundary.length > 0)).toBe(true);
    expect(mobileImportActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "calendar", label: "Review calendar options", customerVisible: true }),
        expect.objectContaining({ kind: "email", label: "Email receipts later", customerVisible: true }),
        expect.objectContaining({ kind: "invite", label: "Paste invite or ICS", sourceMode: "local-paste" })
      ])
    );
    expect(mobileImportActions.map((action) => action.label)).not.toContain("Future calendar sync");
    expect(mobileAccountOptions.map((option) => option.label).join(" ")).not.toContain("Continue with");
    expect(mobileProofBoundary).toMatchObject({
      deterministicProofMode: "repo-local-contract",
      webCustomerFlowStages: [
        "account-import",
        "event-review",
        "card-approval",
        "proof-review",
        "fulfillment-review",
        "checkout-confirmation"
      ],
      blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"],
      emulatorProofClaimed: false,
      signedArtifactClaimed: false,
      liveOrderClaimed: false
    });
    expect(mobileTodaySummary).toMatchObject({
      cardQueueItemId: "card_anniversary_sara_ahmed",
      primaryAction: "approve",
      panelCount: 4,
      offlineReady: true,
      realOrdersEnabled: false,
      customerVisible: true
    });
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
      "Live AI and automatic orders stay off"
    );
    expect(mobileMemoryReviewItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ usage: "approved", rawContentStored: false, customerVisible: true }),
        expect.objectContaining({ usage: "review-required", rawContentStored: false, customerVisible: true })
      ])
    );
    expect(mobileRenderChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Template card proof", mode: "free-local" }),
        expect.objectContaining({ label: "AI artwork", mode: "credential-gated" })
      ])
    );
    expect(mobilePricingPreviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ vendor: "Walgreens", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false }),
        expect.objectContaining({ vendor: "CVS", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false })
      ])
    );
    expect(mobileFulfillmentRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "cheapest-known-price",
          label: "Cheapest known price",
          vendorName: "Walmart Photo",
          liveQuote: false,
          liveOrder: false
        }),
        expect.objectContaining({
          kind: "fastest-pickup",
          label: "Fastest pickup candidate",
          vendorName: "Walmart Photo",
          liveQuote: false,
          liveOrder: false
        }),
        expect.objectContaining({
          kind: "cheapest-shipped",
          label: "Cheapest shipped option",
          vendorName: "FedEx Office",
          liveQuote: false,
          liveOrder: false
        })
      ])
    );
    expect(
      mobileFulfillmentRecommendations.map((recommendation) => ({
        kind: recommendation.kind,
        label: recommendation.label,
        vendorName: recommendation.vendorName,
        totalCents: recommendation.totalCents,
        etaLabel: recommendation.etaLabel
      }))
    ).toEqual(
      buildFulfillmentRecommendations(buildPrinterPricingComparison("walgreens")).recommendations.map((recommendation) => ({
        kind: recommendation.kind,
        label: recommendation.label,
        vendorName: recommendation.vendorName,
        totalCents: recommendation.subtotalCents,
        etaLabel: recommendation.etaLabel
      }))
    );
    expect(mobilePrintProofChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "proof-size", passed: true, realOrderState: "manual", customerVisible: true }),
        expect.objectContaining({ id: "proof-order-gate", passed: true, realOrderState: "disabled", customerVisible: true })
      ])
    );
    expect(mobileHandoffSteps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Download print package", realOrderState: "manual" }),
        expect.objectContaining({ label: "Confirm pickup or shipping", realOrderState: "disabled" })
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
    expect(mobileProofBoundary).toMatchObject({
      currentStage: "proof-review",
      proofApproved: false,
      printOptionsUnlocked: false
    });
  });

  it("keeps customer-visible mobile copy free of implementation-stage jargon", () => {
    const customerCopy = collectMobileCustomerCopy().join(" ");

    expect(validateMobileExperience()).toEqual([]);
    expect(customerCopy).toContain("Google Calendar is not connected yet");
    expect(customerCopy).toContain("Print options");
    expect(customerCopy).toContain("Download print package");
    expect(customerCopy).toContain("Discounts are checked at checkout");
    expect(customerCopy).not.toMatch(/\b(oauth[- ]gated|credential[- ]gated|repo-local-contract|handoff|fulfillment|vendor|adapter|mock|dummy|placeholder)\b/i);
  });

  it("rejects mobile calendar account options that drift from server-owned start packets", () => {
    expect(
      validateMobileExperience({
        ...mobileExperience,
        accountOptions: mobileExperience.accountOptions.map((option) =>
          option.provider === "Google"
            ? {
                ...option,
                startRoute: "/api/import-preview" as never,
                clientMayPrepareProviderRequest: true as never,
                networkRequestPrepared: true as never
              }
            : option
        )
      })
    ).toEqual(
      expect.arrayContaining(["Mobile account options must be derived from server-owned calendar start packets."])
    );
  });

  it("builds a render snapshot for the native app shell without exposing contract internals", () => {
    const source = readFileSync("apps/mobile/src/App.tsx", "utf8");
    const summary = summarizeMobileRenderSnapshot();

    expect(validateMobileRenderSnapshot()).toEqual([]);
    expect(source).toContain("mobileRenderSnapshot");
    expect(source).not.toContain("mobileAccountOptions");
    expect(summary).toMatchObject({
      sectionCount: 11,
      rowCount: 28,
      primaryActionCount: 2,
      footerSafetyMessages: 2,
      blockedLiveActionCount: 0,
      internalProofTermCount: 0
    });
    expect(mobileRenderSnapshot).toMatchObject({
      screenTitle: "CustomCard",
      proofGate: {
        currentStage: "proof-review",
        proofApproved: false,
        printOptionsUnlocked: false
      },
      hero: expect.objectContaining({
        eyebrow: "Your card assistant",
        title: "CustomCard",
        primaryAction: expect.objectContaining({
          label: "Review Sara and Ahmed's card",
          modeLabel: "Ready to review"
        })
      }),
      safetyBand: expect.objectContaining({
        label: "Confirm before checkout",
        metrics: [
          { label: "cards", value: "2" },
          { label: "panels", value: "4" },
          { label: "actions", value: "5" },
          { label: "orders", value: "Off" }
        ]
      }),
      sections: expect.arrayContaining([
        expect.objectContaining({ title: "Start with an event" }),
        expect.objectContaining({ title: "Cards to review" }),
        expect.objectContaining({ title: "Card assistant" }),
        expect.objectContaining({ title: "Printing options" }),
        expect.objectContaining({ title: "Finish manually" }),
        expect.objectContaining({ title: "Saved offline" })
      ])
    });
    expect(mobileRenderSnapshot.sections.flatMap((section) => section.rows).map((row) => row.modeLabel)).toEqual(
      expect.arrayContaining([
        "Local",
        "Queued",
        "Free",
        "Later",
        "After proof",
        "Not connected",
        "Ready to review",
        "Saved offline"
      ])
    );
    expect(mobileRenderSnapshot.sections.find((section) => section.id === "best-available-options")?.rows).toEqual([
      {
        title: "Approve proof first",
        detail: "Print estimates unlock after you approve copy, language, and artwork.",
        modeLabel: "After proof"
      }
    ]);
    expect(mobileRenderSnapshot.sections.find((section) => section.id === "checkout-confirmation")?.rows).toEqual([
      {
        title: "Approve proof first",
        detail: "Download and print shop steps unlock after proof approval.",
        modeLabel: "After proof"
      }
    ]);
    expect(JSON.stringify(mobileRenderSnapshot)).not.toContain("Cheapest known price");
    expect(JSON.stringify(mobileRenderSnapshot)).not.toContain("Download print package");
    expect(mobileRenderSnapshot.footerSafetyMessages.join(" ")).toContain("No automatic order");
    expect(JSON.stringify(mobileRenderSnapshot)).not.toMatch(
      /repo-local-contract|native-emulator-render|signed-native-artifact|app-store-review|adapter|provider|vendor api|retail-printer|oauth[- ]gated|credential[- ]gated|handoff|fulfillment/i
    );
    expect(JSON.stringify(mobileRenderSnapshot)).not.toContain("Future calendar sync");
    expect(JSON.stringify(mobileRenderSnapshot)).toContain("Review calendar options");
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
    const releaseOutput = execFileSync("node", ["apps/mobile/scripts/release-doctor.mjs"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(releaseOutput) as {
      service: string;
      status: string;
      platforms: string[];
      nativeBuildProfiles: string[];
      proofBoundary: string;
      blockedLiveProofs: string[];
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
      proofBoundary: "repo-local-contract",
      blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"],
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
      proofBoundary: {
        ...mobileExperience.proofBoundary,
        deterministicProofMode: "repo-local-contract",
        proofApproved: false,
        printOptionsUnlocked: true,
        webCustomerFlowStages: ["account-import"],
        repoLocalEvidence: ["mobile contract tests"],
        blockedLiveProofs: ["native-emulator-render"],
        emulatorProofClaimed: true,
        signedArtifactClaimed: true,
        liveOrderClaimed: true
      },
      todaySummary: {
        ...mobileExperience.todaySummary,
        cardQueueItemId: "missing_card",
        primaryAction: "edit-tone",
        riskBadge: "real orders enabled",
        panelCount: 2,
        realOrdersEnabled: true,
        customerVisible: false
      },
      sections: [
        {
          ...mobileExperience.sections[0],
          customerVisible: false,
          detail: "live order ready"
        }
      ],
      accountOptions: [
        {
          provider: "Google",
          label: "Google",
          detail: "provider adapter connected",
          sourceMode: "manual-export",
          canStartNow: true,
          dataBoundary: "",
          credentialBoundary: "",
          liveOAuthEnabled: true as never,
          customerVisible: false
        }
      ],
      importActions: [],
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
      memoryReviewItems: [
        {
          ...mobileExperience.memoryReviewItems[0],
          customerVisible: false,
          rawContentStored: true
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
      fulfillmentRecommendations: [
        {
          ...mobileExperience.fulfillmentRecommendations[0],
          liveQuote: true,
          liveOrder: true,
          customerVisible: false,
          totalCents: 0,
          confirmationCopy: "vendor api connected"
        }
      ],
      printProofChecks: [
        {
          ...mobileExperience.printProofChecks[0],
          detail: "live order ready",
          passed: false,
          customerVisible: false
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
        "Missing mobile customer capability: card-queue",
        "Missing mobile customer capability: memory-review",
        "Missing mobile customer capability: text-chat",
        "Missing mobile customer capability: image-render",
        "Missing mobile customer capability: pricing-preview",
        "Missing mobile customer capability: handoff",
        "Missing mobile customer capability: offline-sync",
        "Every mobile experience section must be customer-visible.",
        "Mobile experience does not expose enough customer sections.",
        "Missing mobile account option: Apple",
        "Every mobile account option must be customer-visible.",
        "Mobile account options must not claim live OAuth.",
        "Missing mobile import action: calendar",
        "Missing mobile import action: email",
        "Missing mobile import action: invite",
        "Mobile today summary must be customer-visible with real orders disabled.",
        "Mobile today summary must point at a queued card.",
        "Mobile today summary must use a four-panel card.",
        "Every mobile card queue item must be customer-visible.",
        "Every mobile card queue item must reference four 5x7 panels.",
        "Missing mobile approval action: edit-tone",
        "Missing mobile approval action: snooze",
        "Missing mobile approval action: dismiss",
        "Every mobile approval action must require idempotency.",
        "Mobile today summary primary action must exist in approval controls.",
        "Mobile chat must identify the local scripted assistant path.",
        "Mobile chat must disclose that live AI and automatic orders are off.",
        "Mobile memory review must expose at least two customer memory items.",
        "Every mobile memory review item must be customer-visible.",
        "Mobile memory review must not store raw memory content.",
        "Mobile memory review must include approved and review-required states.",
        "Mobile card proof path must include the free template renderer.",
        "Mobile pricing preview must expose multiple retail-printer choices.",
        "Mobile pricing previews must stay review-only and manually confirmed.",
        "Missing mobile fulfillment recommendation: fastest-pickup",
        "Missing mobile fulfillment recommendation: cheapest-shipped",
        "Every mobile fulfillment recommendation must be customer-visible.",
        "Mobile fulfillment recommendations must not claim live quotes or direct orders.",
        "Mobile fulfillment recommendations must expose positive estimated totals.",
        "Mobile print proof must expose at least four checks.",
        "Every mobile print proof check must be customer-visible.",
        "Mobile print proof checks must pass before handoff.",
        "Mobile handoff must keep a manual upload path.",
        "Disabled mobile handoff steps must explain blocked automatic checkout.",
        "Mobile print options must stay locked until proof approval.",
        "Mobile safety banner must require checkout confirmation.",
        "Mobile proof boundary missing web customer flow stage: event-review.",
        "Mobile proof boundary missing web customer flow stage: card-approval.",
        "Mobile proof boundary missing web customer flow stage: proof-review.",
        "Mobile proof boundary missing web customer flow stage: fulfillment-review.",
        "Mobile proof boundary missing web customer flow stage: checkout-confirmation.",
        "Mobile proof boundary must list repo-local evidence.",
        "Mobile proof boundary must block live proof: signed-native-artifact.",
        "Mobile proof boundary must block live proof: app-store-review.",
        "Mobile proof boundary must block live proof: live-retail-order.",
        "Mobile proof boundary must not claim emulator, signed artifact, or live order proof.",
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
        "Unsafe mobile live-provider claim: vendor api connected",
        "Mobile customer text must not expose provider/adapters: provider adapter connected",
        "Mobile customer text must not expose provider/adapters: vendor api connected"
      ])
    );

    expect(
      validateMobileExperience({
        ...mobileExperience,
        renderChoices: [
          {
            label: "Template card proof",
            detail: "Free renderer stays available.",
            mode: "free-local"
          }
        ]
      })
    ).toContain("Mobile card proof path must keep AI artwork credential-gated.");

    expect(
      validateMobileExperience({
        ...mobileExperience,
        printProofChecks: [
          {
            ...mobileExperience.printProofChecks[0],
            realOrderState: "live-order" as never
          }
        ]
      })
    ).toContain("Mobile print proof must not claim live retail-printer ordering.");
  });
});
