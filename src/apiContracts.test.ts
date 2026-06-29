import { describe, expect, it } from "vitest";
import {
  apiRouteContracts,
  buildApiBootstrapPayload,
  buildApiReadinessSummary,
  gatedProviderNetworkRouteIds,
  hostedCheckoutExemptRouteIds,
  resolveApiContractResponse,
  validateApiContracts,
  type ApiRouteContract
} from "./apiContracts";
import { apiRouteContracts as apiRouteContractData, persistedTablesForRouteId } from "./apiRouteContractsData.mjs";
import { mobileBootstrap } from "./mobileBootstrapData.mjs";

describe("api contracts", () => {
  it("uses the Node-safe route contract data as the canonical route interface", () => {
    expect(apiRouteContracts).toBe(apiRouteContractData);
    expect(persistedTablesForRouteId("render-packets")).toEqual(
      expect.arrayContaining(["render_packets", "provider_call_events", "api_jobs"])
    );
  });

  it("defines customer, admin, mobile, render, and handoff API routes with safe defaults", () => {
    expect(validateApiContracts()).toEqual([]);
    expect(apiRouteContracts.map((route) => route.id)).toEqual(
      expect.arrayContaining([
        "health",
        "route-catalog",
        "ai-chat-respond",
        "ai-card-generate",
        "provider-job-lease",
        "provider-job-status",
        "admin-provider-job-status",
        "provider-job-complete",
        "customer-bootstrap",
        "customer-draft-state",
        "customer-draft-state-save",
        "mobile-bootstrap",
        "admin-readiness",
        "admin-provider-catalog",
        "admin-provider-governance",
        "admin-ai-flow-configs",
        "admin-ai-flow-configs-save",
        "admin-worker-config",
        "admin-worker-config-save",
        "admin-safety-controls",
        "admin-safety-controls-save",
        "admin-persistence-readiness",
        "admin-artifact-bucket",
        "admin-model-benchmarks",
        "admin-model-benchmark-run",
        "admin-model-benchmark-grade",
        "admin-local-ai-loop-run",
        "admin-card-gallery-regenerate",
        "admin-demo-reset",
        "import-preview",
        "calendar-connection-start",
        "retail-printer-operation-start",
        "retail-printer-coupon-portal-evidence",
        "card-projects",
        "relationship-memories",
        "render-packets",
        "manual-vendor-handoff",
        "data-requests"
      ])
    );
    expect(apiRouteContracts.filter((route) => !gatedProviderNetworkRouteIds.has(route.id)).every((route) => route.externalNetworkCalls === false)).toBe(true);
    expect(apiRouteContracts.every((route) => route.realOrdersEnabled === false)).toBe(true);
  });

  it("keeps mutations idempotent and admin routes session-gated", () => {
    const mutations = apiRouteContracts.filter((route) => route.method === "POST");
    const nonCheckoutMutations = mutations.filter(
      (route) => !hostedCheckoutExemptRouteIds.has(route.id) && route.audience !== "provider"
    );
    const adminRoutes = apiRouteContracts.filter((route) => route.audience === "admin");
    const adminPersistenceReadiness = apiRouteContracts.find((route) => route.id === "admin-persistence-readiness");
    const adminArtifactBucket = apiRouteContracts.find((route) => route.id === "admin-artifact-bucket");
    const adminDemoReset = apiRouteContracts.find((route) => route.id === "admin-demo-reset");
    const renderPackets = apiRouteContracts.find((route) => route.id === "render-packets");
    const importPreview = apiRouteContracts.find((route) => route.id === "import-preview");
    const calendarConnectionStart = apiRouteContracts.find((route) => route.id === "calendar-connection-start");
    const retailPrinterOperationStart = apiRouteContracts.find((route) => route.id === "retail-printer-operation-start");
    const retailPrinterCouponPortalEvidence = apiRouteContracts.find((route) => route.id === "retail-printer-coupon-portal-evidence");
    const relationshipMemories = apiRouteContracts.find((route) => route.id === "relationship-memories");
    const draftState = apiRouteContracts.find((route) => route.id === "customer-draft-state");
    const draftStateSave = apiRouteContracts.find((route) => route.id === "customer-draft-state-save");
    const manualHandoff = apiRouteContracts.find((route) => route.id === "manual-vendor-handoff");
    const walgreensCheckoutStatus = apiRouteContracts.find((route) => route.id === "walgreens-checkout-status");
    const walgreensCheckoutUpload = apiRouteContracts.find((route) => route.id === "walgreens-checkout-upload");
    const walgreensCheckoutSession = apiRouteContracts.find((route) => route.id === "walgreens-checkout-session");
    const aiChatRespond = apiRouteContracts.find((route) => route.id === "ai-chat-respond");
    const aiCardGenerate = apiRouteContracts.find((route) => route.id === "ai-card-generate");
    const aiJobStatus = apiRouteContracts.find((route) => route.id === "ai-job-status");
    const providerJobLease = apiRouteContracts.find((route) => route.id === "provider-job-lease");
    const providerJobStatus = apiRouteContracts.find((route) => route.id === "provider-job-status");
    const adminProviderJobStatus = apiRouteContracts.find((route) => route.id === "admin-provider-job-status");
    const providerJobComplete = apiRouteContracts.find((route) => route.id === "provider-job-complete");
    const adminLocalAiLoopRun = apiRouteContracts.find((route) => route.id === "admin-local-ai-loop-run");
    const adminCardGalleryRegenerate = apiRouteContracts.find((route) => route.id === "admin-card-gallery-regenerate");

    expect(mutations.length).toBeGreaterThanOrEqual(6);
    expect(nonCheckoutMutations.every((route) => route.idempotencyKeyRequired)).toBe(true);
    expect(nonCheckoutMutations.every((route) => route.requestSchema.includes("X-Idempotency-Key"))).toBe(true);
    expect(adminRoutes.every((route) => route.auth === "admin-session")).toBe(true);
    expect(adminDemoReset).toMatchObject({
      method: "POST",
      auth: "admin-session",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    });
    expect(adminDemoReset?.responseSchema).toEqual(expect.arrayContaining(["seedSummary", "signedArtifactUrls"]));
    expect(adminPersistenceReadiness?.responseSchema).toEqual(expect.arrayContaining(["localBrowserState", "blockers"]));
    expect(adminArtifactBucket).toMatchObject({
      method: "GET",
      path: "/api/admin/artifacts/bucket",
      audience: "admin",
      auth: "admin-session",
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(adminArtifactBucket?.responseSchema).toEqual(
      expect.arrayContaining(["objectStore", "truncated", "nextCursor", "objects", "renderPackets", "blockers"])
    );
    expect(adminLocalAiLoopRun).toMatchObject({
      method: "POST",
      path: "/api/admin/local-ai-loop/run",
      audience: "admin",
      auth: "admin-session",
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(adminLocalAiLoopRun?.requestSchema).toEqual(expect.arrayContaining(["X-Idempotency-Key", "mode", "stories"]));
    expect(adminLocalAiLoopRun?.responseSchema).toEqual(expect.arrayContaining(["jobs", "queueResult", "workerResult", "humanReview"]));
    expect(persistedTablesForRouteId("admin-local-ai-loop-run")).toEqual(expect.arrayContaining(["users", "api_jobs", "audit_log"]));
    expect(adminCardGalleryRegenerate).toMatchObject({
      method: "POST",
      path: "/api/admin/card-gallery/regenerate",
      audience: "admin",
      auth: "admin-session",
      idempotencyKeyRequired: true,
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(adminCardGalleryRegenerate?.requestSchema).toEqual(
      expect.arrayContaining(["X-Idempotency-Key", "action", "category", "title", "publicCaption", "cardCopy"])
    );
    expect(adminCardGalleryRegenerate?.responseSchema).toEqual(
      expect.arrayContaining(["cardCopy", "galleryCopy", "provider_call_events"])
    );
    expect(persistedTablesForRouteId("admin-card-gallery-regenerate")).toEqual(
      expect.arrayContaining(["idempotency_keys", "provider_call_events", "audit_log"])
    );
    expect(renderPackets?.responseSchema).toEqual(expect.arrayContaining(["artifactManifest", "signedArtifactUrls"]));
    expect(renderPackets?.backedBy).toContain("buildArtifactHandoffContract");
    expect(importPreview?.requestSchema).toEqual(
      expect.arrayContaining(["metadataOnlyPayload", "rawImportText", "rawInviteText", "rawIcsText", "rawCalendarText"])
    );
    expect(importPreview?.backedBy).toContain("resolveImportPreviewMetadata");
    expect(calendarConnectionStart).toMatchObject({
      method: "POST",
      path: "/api/calendar/connections/start",
      audience: "customer",
      auth: "customer-session",
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(calendarConnectionStart?.requestSchema).toEqual(
      expect.arrayContaining(["X-Idempotency-Key", "calendarChoiceId"])
    );
    expect(calendarConnectionStart?.responseSchema).toEqual(
      expect.arrayContaining([
        "startPacket",
        "serverOwned",
        "clientMayPrepareProviderRequest",
        "providerRequestUrl",
        "networkRequestPrepared",
        "credentialStorageEnabled",
        "missingEnv",
        "oauth",
        "rawContentStored",
        "nextApiRoute"
      ])
    );
    expect(calendarConnectionStart?.backedBy).toEqual(
      expect.arrayContaining(["buildCalendarConnectionStartPackets", "validateCalendarConnectionStartPackets"])
    );
    expect(retailPrinterOperationStart).toMatchObject({
      method: "POST",
      path: "/api/retail-printers/operations/start",
      audience: "customer",
      auth: "customer-session",
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(retailPrinterOperationStart?.requestSchema).toEqual(
      expect.arrayContaining(["X-Idempotency-Key", "vendorId", "operation"])
    );
    expect(retailPrinterOperationStart?.responseSchema).toEqual(
      expect.arrayContaining([
        "startPacket",
        "serverOwned",
        "clientMayPrepareProviderRequest",
        "providerPortalUrl",
        "providerRequestUrl",
        "providerRequestPrepared",
        "networkRequestPrepared",
        "requestPrepared",
        "networkAttempted",
        "liveQuoteEnabled",
        "imageUploadEnabled",
        "orderPlacementEnabled"
      ])
    );
    expect(retailPrinterOperationStart?.backedBy).toEqual(
      expect.arrayContaining(["buildRetailPrinterOperationStartPackets", "validateRetailPrinterOperationStartPackets"])
    );
    expect(retailPrinterCouponPortalEvidence).toMatchObject({
      method: "POST",
      path: "/api/retail-printers/coupon-portal-evidence",
      audience: "admin",
      auth: "admin-session",
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(retailPrinterCouponPortalEvidence?.requestSchema).toEqual(
      expect.arrayContaining(["X-Idempotency-Key", "evidenceArtifact"])
    );
    expect(retailPrinterCouponPortalEvidence?.responseSchema).toEqual(
      expect.arrayContaining([
        "providerPortalEvidenceImport",
        "acceptedEvidence",
        "rejectedEvidence",
        "pricingImpact",
        "bestPriceDiscountingAllowed",
        "externalNetworkCalls",
        "realOrdersEnabled"
      ])
    );
    expect(retailPrinterCouponPortalEvidence?.backedBy).toEqual(
      expect.arrayContaining([
        "buildRetailPrinterCouponPortalEvidenceResponse",
        "buildRetailPrinterOperationStartPackets",
        "buildPrinterPricingComparison"
      ])
    );
    expect(relationshipMemories?.path).toBe("/api/memories/review");
    expect(relationshipMemories?.responseSchema).toEqual(expect.arrayContaining(["memoryId", "memoryUseAllowed"]));
    expect(draftState).toMatchObject({
      method: "GET",
      path: "/api/customer/draft-state/current",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: false,
      externalNetworkCalls: false
    });
    expect(draftStateSave).toMatchObject({
      method: "POST",
      path: "/api/customer/draft-state",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: true,
      externalNetworkCalls: false
    });
    expect(draftStateSave?.requestSchema).toEqual(expect.arrayContaining(["draftInput", "status"]));
    expect(draftStateSave?.responseSchema).toEqual(expect.arrayContaining(["draftStateId", "updatedAtIso"]));
    expect(manualHandoff?.responseSchema).toContain("signedArtifactUrls");
    expect(walgreensCheckoutStatus).toMatchObject({
      method: "GET",
      path: "/api/walgreens/checkout/status",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: false,
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(walgreensCheckoutUpload).toMatchObject({
      method: "POST",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: false,
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(walgreensCheckoutSession).toMatchObject({
      method: "POST",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: false,
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(aiChatRespond).toMatchObject({
      method: "POST",
      path: "/api/ai/chat/respond",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: true,
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(aiCardGenerate).toMatchObject({
      method: "POST",
      path: "/api/ai/card/generate",
      audience: "customer",
      auth: "customer-session",
      idempotencyKeyRequired: true,
      externalNetworkCalls: true,
      realOrdersEnabled: false
    });
    expect(aiCardGenerate?.requestSchema).toEqual(expect.arrayContaining(["memory_notes"]));
    expect(aiCardGenerate?.requestSchema).not.toContain("aiFlowConfig");
    expect(aiChatRespond?.requestSchema).not.toContain("aiFlowConfig");
    expect(aiChatRespond?.responseSchema).toEqual(expect.arrayContaining(["ai_flow", "ai_cost_gate", "ai_cost_ledger", "provider_call_events", "fallback_queued"]));
    expect(aiChatRespond?.responseSchema).toEqual(expect.arrayContaining(["job_id", "queue_status", "job_status_url", "ai_queue"]));
    expect(aiJobStatus).toMatchObject({
      method: "GET",
      path: "/api/ai/jobs/status",
      audience: "customer",
      auth: "customer-session",
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(providerJobLease).toMatchObject({
      method: "POST",
      path: "/api/provider/jobs/lease",
      audience: "provider",
      auth: "provider-token",
      idempotencyKeyRequired: false,
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(providerJobLease?.responseSchema).toEqual(expect.arrayContaining(["lease_token", "payload", "artifact_upload"]));
    expect(providerJobStatus).toMatchObject({
      method: "GET",
      path: "/api/provider/jobs/status",
      audience: "provider",
      auth: "provider-token",
      idempotencyKeyRequired: false,
      externalNetworkCalls: false
    });
    expect(providerJobStatus?.responseSchema).toEqual(
      expect.arrayContaining(["queued_total", "running_total", "stale_running_total", "dead_lettered_total", "oldest_queued_age_seconds", "queue.items"])
    );
    expect(adminProviderJobStatus).toMatchObject({
      method: "GET",
      path: "/api/admin/provider/jobs/status",
      audience: "admin",
      auth: "admin-session",
      idempotencyKeyRequired: false,
      externalNetworkCalls: false
    });
    expect(adminProviderJobStatus?.responseSchema).toEqual(
      expect.arrayContaining(["queued_total", "running_total", "stale_running_total", "dead_lettered_total", "oldest_queued_age_seconds", "queue.items"])
    );
    expect(providerJobComplete).toMatchObject({
      method: "POST",
      path: "/api/provider/jobs/:id/complete",
      audience: "provider",
      auth: "provider-token",
      idempotencyKeyRequired: false,
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(providerJobComplete?.responseSchema).toEqual(expect.arrayContaining(["queue_status", "artifact_persistence"]));
    expect(apiRouteContracts.find((route) => route.id === "mobile-bootstrap")?.responseSchema).toEqual(
      expect.arrayContaining(["queueItems", "approvalActions", "pricingPreviews", "syncState"])
    );
  });

  it("summarizes API readiness from provider, runtime, and mobile contracts", () => {
    const summary = buildApiReadinessSummary();

    expect(summary.status).toBe("ready");
    expect(summary.routes.total).toBe(apiRouteContracts.length);
    expect(summary.routes.idempotentMutations).toBe(apiRouteContracts.filter((route) => route.method === "POST" && route.idempotencyKeyRequired).length);
    expect(summary.providers.total).toBeGreaterThanOrEqual(124);
    expect(summary.providers.credentialGated).toBeGreaterThanOrEqual(91);
    expect(summary.governance.total).toBe(summary.providers.total);
    expect(summary.governance.blockers).toEqual([]);
    expect(summary.governance.fallbackCovered).toBeLessThan(summary.providers.total);
    expect(summary.governance.fallbackCovered).toBeGreaterThan(0);
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
      total: 29,
      covered: 29,
      repoLocalCoveragePercent: 100,
      ciGated: 29,
      liveProductionProofs: 0,
      realOrdersEnabled: 0,
      externalNetworkCalls: 0
    });
    expect(summary.aiProviderReadiness).toMatchObject({
      total: 8,
      textProviderContracts: 17,
      imageProviderContracts: 19,
      localFallbacks: 0,
      liveProviderCallsEnabled: 0,
      externalNetworkCalls: 0,
      productionTrafficEnabled: 0,
      blockers: []
    });
    expect(summary.aiQueueOperations).toMatchObject({
      total: 7,
      productionReadyControls: 7,
      metricsTracked: 5,
      alertThresholds: 5,
      humanOwnedControls: 7,
      liveProviderCalls: 0,
      externalNetworkCalls: 0,
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
    expect(summary.hostedApiReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 2,
      evidenceMissing: 2,
      liveProofAttached: 2,
      partialLiveProof: 2,
      protectionBlocked: 0,
      routeContracts: 5,
      requiredEnvVars: 13,
      hostedDbRequired: 5,
      publicRouteProofRequired: 3,
      hostedTokenVerificationRequired: 3,
      envSyncProofs: 0,
      hostedDbProofs: 2,
      publicRouteProofs: 2,
      hostedTokenVerificationProofs: 0,
      backupPolicies: 0,
      deploymentProtectionBypasses: 1,
      evidenceArtifacts: 10,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.legalCompliance).toMatchObject({
      total: 12,
      euRequirements: 6,
      usRequirements: 6,
      externalReviewRequired: 12,
      launchBlocked: 12,
      publicClaimsAllowed: 0
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
      evidenceArtifacts: 11,
      emulatorSmokeEvidenceArtifacts: 11,
      emulatorRenderProofs: 0,
      signedArtifacts: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.reviewerDbSeedReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 3,
      evidenceMissing: 5,
      hostedDatabaseRequired: 5,
      hostedSeedExecutionRequired: 3,
      hostedTokenProbeRequired: 4,
      vercelEnvSyncRequired: 5,
      tableContracts: 15,
      routeContracts: 5,
      requiredEnvVars: 6,
      hostedSeedProofs: 0,
      hostedTokenProbeProofs: 0,
      vercelEnvSyncProofs: 0,
      destructiveLiveMutations: 0,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(summary.cloudArtifactProofReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 2,
      evidenceMissing: 6,
      appliedCloudRequired: 6,
      bucketArnProofRequired: 2,
      iamPolicyProofRequired: 2,
      signedUrlProbeRequired: 3,
      accessLogProofRequired: 2,
      secretSyncRequired: 3,
      restoreDrillRequired: 1,
      terraformFileContracts: 3,
      envOutputContracts: 5,
      terraformApplyExecutions: 0,
      appliedBucketArnProofs: 0,
      iamPolicyOutputProofs: 0,
      signedUrlProbeProofs: 0,
      accessLogProofs: 0,
      secretSyncProofs: 0,
      restoreDrillProofs: 0,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(summary.businessEngagementReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 4,
      evidenceMissing: 3,
      approvalBlocked: 1,
      crmAdapterContracts: 14,
      workflowAdapterContracts: 11,
      notificationAdapterContracts: 16,
      lifecycleTriggerKinds: 3,
      liveOAuthRequired: 1,
      liveMessagesEnabled: 0,
      crmWritesEnabled: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
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
      expect.arrayContaining(["event-import", "render-export", "payment", "vendor-handoff"])
    );
    expect(payload.customer.primaryActions.map((action) => action.capability)).not.toEqual(
      expect.arrayContaining(["text-chat", "image-generation"])
    );
    expect(payload.admin.coverage.total).toBeGreaterThanOrEqual(121);
    expect(payload.mobile.safetyBanner.label).toBe("Confirm before checkout");
    expect(payload.mobile.todaySummary).toMatchObject({
      cardQueueItemId: "card_anniversary_sara_ahmed",
      primaryAction: "approve",
      realOrdersEnabled: false,
      customerVisible: true
    });
    expect(payload.mobile.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["account-import", "approval-controls", "pricing-preview", "offline-sync"])
    );
    expect(payload.mobile.accountOptions.map((option) => option.provider)).toEqual(
      expect.arrayContaining(["Google", "Apple"])
    );
    expect(payload.mobile.importActions.map((action) => action.kind)).toEqual(
      expect.arrayContaining(["calendar", "email", "invite"])
    );
    expect(payload.calendarConnections).toMatchObject({
      startRoute: "/api/calendar/connections/start",
      blockers: []
    });
    expect(payload.calendarConnections.startPackets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "google-calendar-events",
          startMode: "oauth-evidence-required",
          canStartNow: false,
          providerRequestUrl: null,
          clientMayPrepareProviderRequest: false
        }),
        expect.objectContaining({
          id: "icloud-ics-fallback",
          startMode: "manual-export-guide",
          nextApiRoute: "/api/import-preview"
        })
      ])
    );
    expect(payload.retailOperations).toMatchObject({
      startRoute: "/api/retail-printers/operations/start",
      blockers: []
    });
    expect(payload.retailOperations.startPackets).toHaveLength(12);
    expect(payload.retailOperations.startPackets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "walgreens-fetch-price-operation-start",
          vendorId: "walgreens",
          operation: "fetch-price",
          providerAdapterId: "walgreens-live-order",
          providerRequestUrl: null,
          providerRequestPrepared: false,
          clientMayPrepareProviderRequest: false,
          networkRequestPrepared: false,
          liveQuoteEnabled: false,
          couponPortalApplicationRequired: true,
          couponCollectionPlan: expect.objectContaining({
            providerFeedTargetIds: ["fmtc-deal-feed", "rakuten-coupon-feed"],
            retailerCouponTargetIds: ["walgreens-photo-official-deals"],
            printEntrypointTargetIds: ["walgreens-photo-card-design-entrypoint"],
            candidateOfferCodes: ["CRISPCARD"],
            portalApplicationPacketIds: ["walgreens-crispcard-cards-2026-06-13-portal-application-packet"]
          })
        }),
        expect.objectContaining({
          id: "cvs-place-order-operation-start",
          vendorId: "cvs",
          operation: "place-order",
          orderPlacementEnabled: false,
          canAffectBestPriceBeforePortalEvidence: false,
          couponCollectionPlan: expect.objectContaining({
            providerFeedTargetIds: ["fmtc-deal-feed", "rakuten-coupon-feed"],
            retailerCouponTargetIds: ["cvs-photo-official-coupons"],
            printEntrypointTargetIds: ["cvs-photo-card-design-entrypoint"],
            candidateOfferCodes: ["JUNESW"],
            portalApplicationPacketIds: ["cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet"]
          })
        })
      ])
    );
    expect(payload.mobile.fulfillmentRecommendations.map((recommendation) => recommendation.kind)).toEqual(
      expect.arrayContaining(["lowest-current-estimate", "fastest-pickup", "cheapest-shipped"])
    );
    expect(payload.customerChat).toMatchObject({
      mode: "local-scripted",
      adapterId: "local-scripted-customer-chat",
      liveModelCallsEnabled: false,
      externalNetworkCalls: false,
      noNetworkProof: true,
      providerSummary: expect.objectContaining({
        readyLocal: expect.any(Number),
        credentialGated: expect.any(Number)
      })
    });
    expect(payload.customerChat.providerSummary.readyLocal).toBe(0);
    expect(payload.customerChat.providerSummary.credentialGated).toBeGreaterThanOrEqual(13);
    expect(payload.fulfillmentRecommendations).toMatchObject({
      liveQuote: false,
      directOrderEnabled: false,
      blockers: []
    });
    expect(payload.fulfillmentRecommendations.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "lowest-current-estimate",
          label: "Lowest current estimate",
          vendorName: "Walmart Photo",
          subtotalLabel: "$0.56",
          priceProofStatus: "public-estimate-only",
          priceProofLabel: "Estimate only"
        }),
        expect.objectContaining({ kind: "fastest-pickup", vendorName: "Walmart Photo", etaLabel: "same-day pickup candidate" }),
        expect.objectContaining({ kind: "cheapest-shipped", vendorName: "FedEx Office", subtotalLabel: "$22.99" })
      ])
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
      total: 29,
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
        "payment-refund-readiness",
        "hosted-api-proof-readiness",
        "cloud-artifact-proof-readiness",
        "business-engagement-readiness"
      ])
    );
    expect(payload.aiProviderReadiness.summary).toMatchObject({
      total: 8,
      textProviderContracts: 17,
      imageProviderContracts: 19,
      liveProviderCallsEnabled: 0,
      productionTrafficEnabled: 0
    });
    expect(payload.aiProviderReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["ai-adapter-inventory", "prompt-brand-safety-review", "image-print-qa"])
    );
    expect(payload.aiQueueOperations.summary).toMatchObject({
      total: 7,
      metricsTracked: 5,
      alertThresholds: 5,
      humanOwnedControls: 7,
      liveProviderCalls: 0
    });
    expect(payload.aiQueueOperations.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["queue-admission-contract", "worker-lease-retry-dlq", "human-dead-letter-management"])
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
      evidenceArtifacts: 11,
      emulatorSmokeEvidenceArtifacts: 11,
      emulatorRenderProofs: 0,
      signedArtifacts: 0
    });
    expect(payload.mobileRenderReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["native-shell-source-render-contract", "native-emulator-render-proof", "signed-native-artifact-proof"])
    );
    expect(payload.hostedApiReadiness.summary).toMatchObject({
      total: 8,
      routeContracts: 5,
      requiredEnvVars: 13,
      publicRouteProofs: 2,
      hostedDbProofs: 2,
      hostedTokenVerificationProofs: 0
    });
    expect(payload.hostedApiReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["vercel-project-link", "public-db-backed-route-proof", "hosted-clerk-token-verification"])
    );
    expect(payload.reviewerDbSeedReadiness.summary).toMatchObject({
      total: 8,
      tableContracts: 15,
      requiredEnvVars: 6,
      hostedSeedProofs: 0,
      hostedTokenProbeProofs: 0
    });
    expect(payload.reviewerDbSeedReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["reviewer-seed-plan-contract", "hosted-seed-execution-proof", "rollback-cleanup-drill"])
    );
    expect(payload.cloudArtifactProofReadiness.summary).toMatchObject({
      total: 8,
      appliedCloudRequired: 6,
      terraformFileContracts: 3,
      envOutputContracts: 5,
      appliedBucketArnProofs: 0,
      iamPolicyOutputProofs: 0,
      signedUrlProbeProofs: 0
    });
    expect(payload.cloudArtifactProofReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["static-artifact-iac-contract", "applied-bucket-arn-proof", "iam-policy-output-proof"])
    );
    expect(payload.businessEngagementReadiness.summary).toMatchObject({
      total: 8,
      crmAdapterContracts: 14,
      workflowAdapterContracts: 11,
      notificationAdapterContracts: 16,
      liveMessagesEnabled: 0,
      crmWritesEnabled: 0
    });
    expect(payload.businessEngagementReadiness.items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["popular-crm-oauth-contracts", "customer-message-channel-contracts", "consent-suppression-privacy-gate"])
    );
    expect(payload.chatTranscript.map((message) => message.text).join(" ")).toContain(
      "Creative suggestions and checkout stay under your review"
    );
    expect(payload.printerPricing).toMatchObject({
      selectedVendorId: "walgreens",
      liveQuote: false,
      refreshReport: expect.objectContaining({
        sourceCount: 8,
        couponSourceCount: 4,
        couponCollectionTargetCount: 6,
        couponProviderTargetCount: 2,
        retailerCouponCollectionTargetCount: 4,
        couponOfferCount: 2,
        activeCouponOfferCount: expect.any(Number),
        portalAppliedCouponOfferCount: 0,
        couponPortalApplicationPacketCount: 2,
        couponPortalApplicationTargetCount: 5,
        couponPolicy: expect.objectContaining({
          providerPortalApplicationRequired: true,
          couponsAppliedToBestPrice: true
        })
      }),
      couponPolicy: expect.objectContaining({
        couponProviderFeedAllowed: true,
        retailerCouponScrapeAllowed: true,
        providerPortalApplicationRequired: true,
        couponsAppliedToBestPrice: true,
        couponsIncludedInDisplayedPrices: "only-after-provider-portal-application",
        defaultAppliedDiscountCents: 0
      })
    });
    expect(payload.printerPricing.refreshReport.activeCouponOfferCount).toBeGreaterThanOrEqual(0);
    expect(payload.printerPricing.refreshReport.activeCouponOfferCount).toBeLessThanOrEqual(
      payload.printerPricing.refreshReport.couponOfferCount
    );
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
        total: 29,
        repoLocalCoveragePercent: 100,
        liveProductionProofs: 0
      },
      aiProviderReadiness: {
        total: 8,
        liveProviderCallsEnabled: 0,
        productionTrafficEnabled: 0
      },
      aiQueueOperations: {
        total: 7,
        metricsTracked: 5,
        alertThresholds: 5,
        liveProviderCalls: 0
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
        evidenceArtifacts: 11,
        emulatorSmokeEvidenceArtifacts: 11,
        emulatorRenderProofs: 0,
        signedArtifacts: 0
      },
      hostedApiReadiness: {
        total: 8,
        publicRouteProofs: 2,
        hostedDbProofs: 2,
        hostedTokenVerificationProofs: 0
      },
      reviewerDbSeedReadiness: {
        total: 8,
        hostedSeedProofs: 0,
        hostedTokenProbeProofs: 0,
        externalNetworkCalls: 0
      },
      cloudArtifactProofReadiness: {
        total: 8,
        appliedBucketArnProofs: 0,
        iamPolicyOutputProofs: 0,
        signedUrlProbeProofs: 0,
        externalNetworkCalls: 0
      },
      businessEngagementReadiness: {
        total: 8,
        liveMessagesEnabled: 0,
        crmWritesEnabled: 0,
        externalNetworkCalls: 0
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
    expect(resolveApiContractResponse("/api/admin/artifacts/bucket")).toMatchObject({
      service: "customcard-api",
      status: "artifact-store-unconfigured",
      objectStore: {
        configured: false,
        provider: "unconfigured",
        bucket: null,
        liveNetworkCalls: false,
        credentialMode: "unconfigured"
      },
      objectCount: 0,
      nextCursor: null,
      objects: [],
      renderPackets: [],
      blockers: expect.arrayContaining(["Object store persistence is not configured."])
    });
    expect(resolveApiContractResponse("/api/routes")).toEqual(apiRouteContracts);
    expect(resolveApiContractResponse("/api/mobile/bootstrap")).toEqual(mobileBootstrap);
    expect(resolveApiContractResponse("/api/mobile/bootstrap")).toMatchObject({
      safetyBanner: { label: "Confirm before checkout" },
      todaySummary: { primaryAction: "approve", realOrdersEnabled: false },
      accountOptions: expect.arrayContaining([expect.objectContaining({ provider: "Google", liveOAuthEnabled: false })]),
      importActions: expect.arrayContaining([expect.objectContaining({ kind: "calendar", customerVisible: true })]),
      fulfillmentRecommendations: expect.arrayContaining([
        expect.objectContaining({ kind: "cheapest-shipped", liveQuote: false, liveOrder: false })
      ]),
      memoryReviewItems: expect.arrayContaining([expect.objectContaining({ usage: "approved", rawContentStored: false })]),
      printProofChecks: expect.arrayContaining([expect.objectContaining({ id: "proof-order-gate", passed: true })]),
      syncState: { authMode: "customer-session", idempotencyRequired: true }
    });
    expect(resolveApiContractResponse("/api/customer/bootstrap")).toMatchObject({
      calendarConnections: {
        startRoute: "/api/calendar/connections/start",
        startPackets: expect.arrayContaining([
          expect.objectContaining({ id: "google-calendar-events", canStartNow: false })
        ]),
        blockers: []
      },
      retailOperations: {
        startRoute: "/api/retail-printers/operations/start",
        startPackets: expect.arrayContaining([
          expect.objectContaining({
            id: "walgreens-fetch-price-operation-start",
            serverOwned: true,
            clientMayPrepareProviderRequest: false,
            couponPortalApplicationRequired: true
          })
        ]),
        blockers: []
      },
      customerChat: {
        mode: "local-scripted",
        liveModelCallsEnabled: false,
        externalNetworkCalls: false
      },
      fulfillmentRecommendations: {
        recommendations: expect.arrayContaining([
          expect.objectContaining({ kind: "lowest-current-estimate", liveQuote: false, directOrderEnabled: false })
        ])
      }
    });
    expect(resolveApiContractResponse("/api/calendar/connections/start")).toMatchObject({
      status: "ready-local",
      route: "calendar-connection-start",
      requestedChoiceId: "manual-invite-or-ics",
      providerRequestUrl: null,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      startPacket: expect.objectContaining({
        id: "manual-invite-or-ics",
        serverOwned: true,
        nextApiRoute: "/api/import-preview"
      })
    });
    expect(resolveApiContractResponse("/api/retail-printers/operations/start")).toMatchObject({
      status: "blocked",
      requestedVendorId: "walgreens",
      requestedOperation: "fetch-price",
      providerPortalUrl: expect.stringContaining("photo.walgreens.com"),
      providerRequestUrl: null,
      providerRequestPrepared: false,
      networkRequestPrepared: false,
      requestPrepared: false,
      externalNetworkCalls: false,
      realOrdersEnabled: false,
      liveQuoteEnabled: false,
      startPacket: expect.objectContaining({
        id: "walgreens-fetch-price-operation-start",
        serverOwned: true,
        couponPortalApplicationRequired: true
      })
    });
    expect(resolveApiContractResponse("/api/retail-printers/coupon-portal-evidence")).toMatchObject({
      status: "accepted",
      route: "retail-printer-coupon-portal-evidence",
      serverOwned: true,
      clientMayPrepareProviderRequest: false,
      providerPortalEvidenceImport: expect.objectContaining({
        acceptedEvidenceCount: 1,
        rejectedEvidenceCount: 0,
        bestPriceDiscountingAllowed: true
      }),
      pricingImpact: expect.objectContaining({
        sourcePriceObservationId: "walgreens-5x7-folded-card",
        couponCode: "CRISPCARD",
        subtotalBeforeCouponCents: 349,
        discountCents: 209,
        subtotalAfterCouponCents: 140
      }),
      externalNetworkCalls: false,
      realOrdersEnabled: false
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
      },
      {
        ...apiRouteContracts.find((route) => route.id === "card-projects")!,
        id: "unsafe-customer",
        path: "/api/customer/unsafe",
        auth: "none"
      }
    ];

    expect(validateApiContracts(unsafeRoutes)).toEqual(
      expect.arrayContaining([
        "Admin route unsafe-admin must require admin-session auth.",
        "Mutation route unsafe-mutation must require an idempotency key.",
        "Mutation route unsafe-mutation must name X-Idempotency-Key in the request schema.",
        "Route unsafe-mutation must not allow raw content policy language.",
        "Customer route unsafe-customer must require customer-session auth.",
        "Missing API route contract: health"
      ])
    );
  });
});
