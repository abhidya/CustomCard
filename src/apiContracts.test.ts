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
    expect(summary.runtime.localReady).toBeGreaterThanOrEqual(16);
    expect(summary.runtime.blocked).toBeGreaterThan(0);
    expect(summary.mobile.customerVisibleSections).toBeGreaterThanOrEqual(8);
    expect(summary.mobile.queueItems).toBeGreaterThanOrEqual(2);
    expect(summary.mobile.idempotentApprovalActions).toBeGreaterThanOrEqual(5);
    expect(summary.mobile.reviewOnlyPricingOptions).toBeGreaterThanOrEqual(3);
    expect(summary.mobile.offlineMutationTypes).toBeGreaterThanOrEqual(5);
  });

  it("builds bootstrap payloads for customer, admin, and mobile clients", () => {
    const payload = buildApiBootstrapPayload();

    expect(payload.customer.primaryActions.map((action) => action.capability)).toEqual(
      expect.arrayContaining(["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"])
    );
    expect(payload.admin.coverage.total).toBeGreaterThanOrEqual(102);
    expect(payload.mobile.safetyBanner.label).toBe("Real orders disabled");
    expect(payload.mobile.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["approval-controls", "pricing-preview", "offline-sync"])
    );
    expect(payload.mobile.queueItems.every((item) => item.panelCount === 4)).toBe(true);
    expect(payload.mobile.approvalActions.every((action) => action.idempotencyRequired)).toBe(true);
    expect(payload.mobile.pricingPreviews.every((preview) => preview.sourceMode === "review-only-public-price" && !preview.liveQuote)).toBe(true);
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
