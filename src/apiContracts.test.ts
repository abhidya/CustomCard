import { describe, expect, it } from "vitest";
import {
  apiRouteContracts,
  buildApiBootstrapPayload,
  buildApiReadinessSummary,
  resolveApiContractResponse,
  validateApiContracts,
  type ApiRouteContract
} from "./apiContracts";

describe("api contracts", () => {
  it("defines customer, admin, mobile, render, and handoff API routes with safe defaults", () => {
    expect(validateApiContracts()).toEqual([]);
    expect(apiRouteContracts.map((route) => route.id)).toEqual(
      expect.arrayContaining([
        "health",
        "route-catalog",
        "customer-bootstrap",
        "mobile-bootstrap",
        "admin-readiness",
        "admin-provider-catalog",
        "admin-provider-governance",
        "admin-persistence-readiness",
        "admin-demo-reset",
        "import-preview",
        "card-projects",
        "relationship-memories",
        "render-packets",
        "manual-vendor-handoff",
        "data-requests"
      ])
    );
    expect(apiRouteContracts.every((route) => route.externalNetworkCalls === false)).toBe(true);
    expect(apiRouteContracts.every((route) => route.realOrdersEnabled === false)).toBe(true);
  });

  it("keeps mutations idempotent and admin routes session-gated", () => {
    const mutations = apiRouteContracts.filter((route) => route.method === "POST");
    const adminRoutes = apiRouteContracts.filter((route) => route.audience === "admin");
    const adminDemoReset = apiRouteContracts.find((route) => route.id === "admin-demo-reset");
    const renderPackets = apiRouteContracts.find((route) => route.id === "render-packets");
    const relationshipMemories = apiRouteContracts.find((route) => route.id === "relationship-memories");
    const manualHandoff = apiRouteContracts.find((route) => route.id === "manual-vendor-handoff");

    expect(mutations.length).toBeGreaterThanOrEqual(6);
    expect(mutations.every((route) => route.idempotencyKeyRequired)).toBe(true);
    expect(mutations.every((route) => route.requestSchema.includes("X-Idempotency-Key"))).toBe(true);
    expect(adminRoutes.every((route) => route.auth === "admin-session")).toBe(true);
    expect(adminDemoReset).toMatchObject({
      method: "POST",
      auth: "admin-session",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    });
    expect(adminDemoReset?.responseSchema).toEqual(expect.arrayContaining(["seedSummary", "signedArtifactUrls"]));
    expect(renderPackets?.responseSchema).toEqual(expect.arrayContaining(["artifactManifest", "signedArtifactUrls"]));
    expect(renderPackets?.backedBy).toContain("buildArtifactHandoffContract");
    expect(relationshipMemories?.path).toBe("/api/memories/review");
    expect(relationshipMemories?.responseSchema).toEqual(expect.arrayContaining(["memoryId", "memoryUseAllowed"]));
    expect(manualHandoff?.responseSchema).toContain("signedArtifactUrls");
    expect(apiRouteContracts.find((route) => route.id === "mobile-bootstrap")?.responseSchema).toEqual(
      expect.arrayContaining(["queueItems", "approvalActions", "pricingPreviews", "syncState"])
    );
  });

  it("summarizes API readiness from provider, runtime, and mobile contracts", () => {
    const summary = buildApiReadinessSummary();

    expect(summary.status).toBe("ready");
    expect(summary.routes.total).toBe(apiRouteContracts.length);
    expect(summary.routes.idempotentMutations).toBe(summary.routes.mutations);
    expect(summary.providers.total).toBeGreaterThanOrEqual(102);
    expect(summary.providers.credentialGated).toBeGreaterThanOrEqual(69);
    expect(summary.governance.total).toBe(summary.providers.total);
    expect(summary.governance.blockers).toEqual([]);
    expect(summary.governance.fallbackCovered).toBe(summary.providers.total);
    expect(summary.governance.liveNetworkDefault).toBe(false);
    expect(summary.localization).toMatchObject({
      defaultLocale: "en-US",
      supportedLocales: 4,
      rtlLocales: 2,
      copyReviewRequired: 3,
      completeBundles: 4,
      liveTranslationProvider: false,
      blockers: []
    });
    expect(summary.production).toMatchObject({
      total: 13,
      evidenceMissing: 11,
      blocked: 2,
      liveEnabled: 0
    });
    expect(summary.externalAudit).toMatchObject({
      total: 15,
      productionBlocked: 15,
      publicClaimsAllowed: 0,
      externalArtifactsAttached: 0
    });
    expect(summary.e2eCoverage).toMatchObject({
      total: 25,
      covered: 25,
      repoLocalCoveragePercent: 100,
      ciGated: 25,
      liveProductionProofs: 0,
      realOrdersEnabled: 0,
      externalNetworkCalls: 0
    });
    expect(summary.aiProviderReadiness).toMatchObject({
      total: 8,
      textProviderContracts: 15,
      imageProviderContracts: 12,
      localFallbacks: 2,
      liveProviderCallsEnabled: 0,
      externalNetworkCalls: 0,
      productionTrafficEnabled: 0,
      blockers: []
    });
    expect(summary.capacity).toMatchObject({
      total: 4,
      localProfiles: 1,
      cloudProfiles: 3,
      queueBackedProfiles: 4,
      objectStoreBackedProfiles: 4,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.capacity.maxDailyCards).toBe(12000);
    expect(summary.capacity.maxDailyImageGenerations).toBe(1000);
    expect(summary.observability).toMatchObject({
      total: 7,
      providerContracts: 6,
      alertRoutesRequired: 4,
      liveIngestionEnabled: 0,
      externalNetworkCalls: 0,
      productionAlertsEnabled: 0,
      blockers: []
    });
    expect(summary.retailFulfillment).toMatchObject({
      total: 8,
      repoLocalReady: 3,
      evidenceMissing: 3,
      certificationBlocked: 2,
      liveVendorAdapterContracts: 6,
      manualFallbacks: 2,
      liveQuoteEnabled: 0,
      directOrderEnabled: 0,
      realPaymentsEnabled: 0,
      physicalCertificationAttached: 0,
      blockers: []
    });
    expect(summary.paymentReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 4,
      evidenceMissing: 3,
      certificationBlocked: 1,
      paymentProviderContracts: 4,
      localFallbacks: 1,
      ledgerEvents: 23,
      liveChargesEnabled: 0,
      liveRefundsEnabled: 0,
      liveCaptureEnabled: 0,
      cardDataStored: 0,
      pciScopeApproved: 0,
      blockers: []
    });
    expect(summary.mobileRenderReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 5,
      evidenceMissing: 2,
      artifactBlocked: 1,
      viewportProfiles: 4,
      nativeBuildProfiles: 3,
      emulatorRenderProofs: 0,
      signedArtifacts: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.runtime.localReady).toBeGreaterThanOrEqual(16);
    expect(summary.runtime.blocked).toBeGreaterThan(0);
    expect(summary.mobile.customerVisibleSections).toBeGreaterThanOrEqual(8);
    expect(summary.mobile.todayPrimaryActions).toBe(1);
    expect(summary.mobile.queueItems).toBeGreaterThanOrEqual(2);
    expect(summary.mobile.idempotentApprovalActions).toBeGreaterThanOrEqual(5);
    expect(summary.mobile.memoryReviewItems).toBeGreaterThanOrEqual(2);
    expect(summary.mobile.reviewOnlyPricingOptions).toBeGreaterThanOrEqual(3);
    expect(summary.mobile.printProofChecks).toBeGreaterThanOrEqual(4);
    expect(summary.mobile.passedPrintProofChecks).toBeGreaterThanOrEqual(4);
    expect(summary.mobile.offlineMutationTypes).toBeGreaterThanOrEqual(5);
  });

  it("builds bootstrap payloads for customer, admin, and mobile clients", () => {
    const payload = buildApiBootstrapPayload();

    expect(payload.customer.primaryActions.map((action) => action.capability)).toEqual(
      expect.arrayContaining(["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"])
    );
    expect(payload.admin.coverage.total).toBeGreaterThanOrEqual(102);
    expect(payload.mobile.safetyBanner.label).toBe("Real orders disabled");
    expect(payload.mobile.todaySummary).toMatchObject({
      cardQueueItemId: "card_anniversary_sara_ahmed",
      primaryAction: "approve",
      realOrdersEnabled: false,
      customerVisible: true
    });
    expect(payload.mobile.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["approval-controls", "pricing-preview", "offline-sync"])
    );
    expect(payload.mobile.queueItems.every((item) => item.panelCount === 4)).toBe(true);
    expect(payload.mobile.approvalActions.every((action) => action.idempotencyRequired)).toBe(true);
    expect(payload.mobile.memoryReviewItems.every((item) => item.customerVisible && !item.rawContentStored)).toBe(true);
    expect(payload.mobile.pricingPreviews.every((preview) => preview.sourceMode === "review-only-public-price" && !preview.liveQuote)).toBe(true);
    expect(payload.mobile.printProofChecks.every((check) => check.customerVisible && check.passed)).toBe(true);
    expect(payload.mobile.syncState).toMatchObject({
      authMode: "customer-session",
      offlineQueueEnabled: true,
      idempotencyRequired: true
    });
    expect(payload.mobile.localeOptions.map((locale) => locale.locale)).toEqual(["en-US", "es-US", "ur-PK", "ar-EG"]);
    expect(payload.localization.summary).toMatchObject({
      supportedLocales: 4,
      rtlLocales: 2,
      blockers: []
    });
    expect(payload.production.summary).toMatchObject({ total: 13, liveEnabled: 0 });
    expect(payload.production.gates.map((gate) => gate.id)).toContain("vercel-deployment-db-access");
    expect(payload.externalAudit.summary).toMatchObject({
      total: 15,
      productionBlocked: 15,
      publicClaimsAllowed: 0
    });
    expect(payload.externalAudit.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["security-assessment", "accessibility-audit", "physical-print-certification"])
    );
    expect(payload.e2eCoverage.summary).toMatchObject({
      total: 25,
      repoLocalCoveragePercent: 100,
      liveProductionProofs: 0
    });
    expect(payload.e2eCoverage.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "customer-workspace-to-handoff",
        "admin-panel-readiness",
        "mobile-customer-shell",
        "mobile-render-readiness",
        "ai-provider-readiness",
        "observability-alerting-readiness",
        "retail-fulfillment-readiness",
        "payment-refund-readiness"
      ])
    );
    expect(payload.aiProviderReadiness.summary).toMatchObject({
      total: 8,
      textProviderContracts: 15,
      imageProviderContracts: 12,
      liveProviderCallsEnabled: 0,
      productionTrafficEnabled: 0
    });
    expect(payload.aiProviderReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["ai-adapter-inventory", "prompt-brand-safety-review", "image-print-qa"])
    );
    expect(payload.capacity.summary).toMatchObject({
      total: 4,
      maxDailyCards: 12000,
      liveProviderCalls: 0,
      realOrdersEnabled: 0
    });
    expect(payload.capacity.profiles.map((profile) => profile.id)).toEqual([
      "local-dev",
      "cheap-droplet",
      "cloud-native",
      "saas-scale"
    ]);
    expect(payload.capacity.profiles.every((profile) => !profile.liveProviderCalls && !profile.realOrdersEnabled)).toBe(true);
    expect(payload.observability.summary).toMatchObject({
      total: 7,
      providerContracts: 6,
      liveIngestionEnabled: 0,
      productionAlertsEnabled: 0
    });
    expect(payload.observability.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["telemetry-event-schema", "alert-routing-drill", "observability-provider-contracts"])
    );
    expect(payload.retailFulfillment.summary).toMatchObject({
      total: 8,
      liveVendorAdapterContracts: 6,
      liveQuoteEnabled: 0,
      directOrderEnabled: 0,
      physicalCertificationAttached: 0
    });
    expect(payload.retailFulfillment.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["live-quote-contracts", "vendor-api-certification", "physical-print-qa"])
    );
    expect(payload.paymentReadiness.summary).toMatchObject({
      total: 8,
      paymentProviderContracts: 4,
      liveChargesEnabled: 0,
      liveRefundsEnabled: 0,
      pciScopeApproved: 0
    });
    expect(payload.paymentReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["sandbox-payment-contracts", "live-charge-capture-approval", "refund-void-dispute-drills"])
    );
    expect(payload.mobileRenderReadiness.summary).toMatchObject({
      total: 8,
      screenSections: 21,
      viewportProfiles: 4,
      emulatorRenderProofs: 0,
      signedArtifacts: 0
    });
    expect(payload.mobileRenderReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["native-shell-source-render-contract", "native-emulator-render-proof", "signed-native-artifact-proof"])
    );
    expect(payload.chatTranscript.map((message) => message.text).join(" ")).toContain("Live AI and vendor orders stay off");
    expect(payload.printerPricing).toMatchObject({
      selectedVendorId: "walgreens",
      liveQuote: false,
      refreshReport: expect.objectContaining({
        sourceCount: 7
      })
    });
  });

  it("resolves safe GET response contracts for the API server wrapper", () => {
    expect(resolveApiContractResponse("/api/health")).toMatchObject({
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false
    });
    expect(resolveApiContractResponse("/api/admin/readiness")).toMatchObject({
      service: "customcard-api",
      status: "ready",
      capacity: {
        total: 4,
        liveProviderCalls: 0,
        realOrdersEnabled: 0
      },
      externalAudit: {
        total: 15,
        publicClaimsAllowed: 0,
        externalArtifactsAttached: 0
      },
      e2eCoverage: {
        total: 25,
        repoLocalCoveragePercent: 100,
        liveProductionProofs: 0
      },
      aiProviderReadiness: {
        total: 8,
        liveProviderCallsEnabled: 0,
        productionTrafficEnabled: 0
      },
      observability: {
        total: 7,
        liveIngestionEnabled: 0,
        productionAlertsEnabled: 0
      },
      retailFulfillment: {
        total: 8,
        liveQuoteEnabled: 0,
        directOrderEnabled: 0,
        physicalCertificationAttached: 0
      },
      paymentReadiness: {
        total: 8,
        liveChargesEnabled: 0,
        liveRefundsEnabled: 0,
        pciScopeApproved: 0
      },
      mobileRenderReadiness: {
        total: 8,
        emulatorRenderProofs: 0,
        signedArtifacts: 0
      }
    });
    expect(resolveApiContractResponse("/api/admin/provider-governance")).toMatchObject({
      total: expect.any(Number),
      budgetCapped: expect.any(Number),
      fallbackCovered: expect.any(Number),
      liveNetworkDefault: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(resolveApiContractResponse("/api/routes")).toEqual(apiRouteContracts);
    expect(resolveApiContractResponse("/api/mobile/bootstrap")).toMatchObject({
      safetyBanner: { label: "Real orders disabled" },
      todaySummary: { primaryAction: "approve", realOrdersEnabled: false },
      memoryReviewItems: expect.arrayContaining([expect.objectContaining({ usage: "approved", rawContentStored: false })]),
      printProofChecks: expect.arrayContaining([expect.objectContaining({ id: "proof-order-gate", passed: true })]),
      syncState: { authMode: "customer-session", idempotencyRequired: true }
    });
    expect(resolveApiContractResponse("/api/not-found")).toBeUndefined();
  });

  it("flags unsafe route contracts before implementation", () => {
    const unsafeRoutes: ApiRouteContract[] = [
      {
        ...apiRouteContracts[0],
        id: "unsafe-admin",
        path: "/api/admin/unsafe",
        audience: "admin",
        auth: "none"
      },
      {
        ...apiRouteContracts.find((route) => route.id === "card-projects")!,
        id: "unsafe-mutation",
        path: "/api/card-projects/unsafe",
        idempotencyKeyRequired: false,
        requestSchema: ["opportunityId"],
        piiPolicy: "raw content stored"
      }
    ];

    expect(validateApiContracts(unsafeRoutes)).toEqual(
      expect.arrayContaining([
        "Admin route unsafe-admin must require admin-session auth.",
        "Mutation route unsafe-mutation must require an idempotency key.",
        "Mutation route unsafe-mutation must name X-Idempotency-Key in the request schema.",
        "Route unsafe-mutation must not allow raw content policy language.",
        "Missing API route contract: health"
      ])
    );
  });
});
