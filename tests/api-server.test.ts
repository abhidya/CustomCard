import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../scripts/api-server.mjs";

const shellDoctorTimeoutMs = 15_000;

describe("api server wrapper", () => {
  it("passes its doctor contract", () => {
    const output = execFileSync("node", ["scripts/api-server.mjs", "--doctor"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      readiness: {
        providers: { total: number };
        providerGovernance: {
          total: number;
          budgetCapped: number;
          blockedZeroSpend: number;
          fallbackCovered: number;
          liveNetworkDefault: boolean;
          realOrdersEnabled: boolean;
          blockers: unknown[];
        };
        localization: {
          defaultLocale: string;
          supportedLocales: number;
          rtlLocales: number;
          copyReviewRequired: number;
          completeBundles: number;
          liveTranslationProvider: boolean;
          blockers: unknown[];
        };
        production: {
          total: number;
          evidenceMissing: number;
          blocked: number;
          liveEnabled: number;
          blockers: string[];
        };
        externalAudit: {
          total: number;
          productionBlocked: number;
          publicClaimsAllowed: number;
          externalArtifactsAttached: number;
          blockers: string[];
        };
        e2eCoverage: {
          total: number;
          covered: number;
          repoLocalCoveragePercent: number;
          ciGated: number;
          liveProductionProofs: number;
          realOrdersEnabled: number;
          externalNetworkCalls: number;
          blockers: string[];
        };
        aiProviderReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          textProviderContracts: number;
          imageProviderContracts: number;
          localFallbacks: number;
          promptAuditRequired: number;
          humanReviewRequired: number;
          liveProviderCallsEnabled: number;
          externalNetworkCalls: number;
          productionTrafficEnabled: number;
          blockers: string[];
        };
        observability: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          providerContracts: number;
          alertRoutesRequired: number;
          liveIngestionEnabled: number;
          externalNetworkCalls: number;
          productionAlertsEnabled: number;
          blockers: string[];
        };
        retailFulfillment: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          certificationBlocked: number;
          liveVendorAdapterContracts: number;
          manualFallbacks: number;
          recoveryDrillEvents: number;
          liveQuoteEnabled: number;
          directOrderEnabled: number;
          externalNetworkCalls: number;
          realPaymentsEnabled: number;
          physicalCertificationAttached: number;
          blockers: string[];
        };
        paymentReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          certificationBlocked: number;
          paymentProviderContracts: number;
          localFallbacks: number;
          ledgerEvents: number;
          liveChargesEnabled: number;
          liveRefundsEnabled: number;
          liveCaptureEnabled: number;
          externalNetworkCalls: number;
          cardDataStored: number;
          pciScopeApproved: number;
          blockers: string[];
        };
        mobileRenderReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          artifactBlocked: number;
          screenSections: number;
          viewportProfiles: number;
          nativeBuildProfiles: number;
          emulatorRenderProofs: number;
          signedArtifacts: number;
          realOrdersEnabled: number;
          liveProviderCalls: number;
          blockers: string[];
        };
        hostedApiReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          protectionBlocked: number;
          routeContracts: number;
          requiredEnvVars: number;
          hostedDbRequired: number;
          publicRouteProofRequired: number;
          hostedTokenVerificationRequired: number;
          envSyncProofs: number;
          hostedDbProofs: number;
          publicRouteProofs: number;
          hostedTokenVerificationProofs: number;
          backupPolicies: number;
          deploymentProtectionBypasses: number;
          realOrdersEnabled: number;
          liveProviderCalls: number;
          blockers: string[];
        };
        reviewerDbSeedReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          hostedDatabaseRequired: number;
          hostedSeedExecutionRequired: number;
          hostedTokenProbeRequired: number;
          vercelEnvSyncRequired: number;
          tableContracts: number;
          routeContracts: number;
          requiredEnvVars: number;
          hostedSeedProofs: number;
          hostedTokenProbeProofs: number;
          vercelEnvSyncProofs: number;
          destructiveLiveMutations: number;
          externalNetworkCalls: number;
          liveProviderCalls: number;
          realOrdersEnabled: number;
          blockers: string[];
        };
        cloudArtifactProofReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          appliedCloudRequired: number;
          bucketArnProofRequired: number;
          iamPolicyProofRequired: number;
          signedUrlProbeRequired: number;
          accessLogProofRequired: number;
          secretSyncRequired: number;
          restoreDrillRequired: number;
          terraformFileContracts: number;
          envOutputContracts: number;
          terraformApplyExecutions: number;
          appliedBucketArnProofs: number;
          iamPolicyOutputProofs: number;
          signedUrlProbeProofs: number;
          accessLogProofs: number;
          secretSyncProofs: number;
          restoreDrillProofs: number;
          externalNetworkCalls: number;
          liveProviderCalls: number;
          realOrdersEnabled: number;
          blockers: string[];
        };
        businessEngagementReadiness: {
          total: number;
          repoLocalReady: number;
          evidenceMissing: number;
          approvalBlocked: number;
          crmAdapterContracts: number;
          workflowAdapterContracts: number;
          notificationAdapterContracts: number;
          lifecycleTriggerKinds: number;
          liveOAuthRequired: number;
          liveMessagesEnabled: number;
          crmWritesEnabled: number;
          externalNetworkCalls: number;
          realOrdersEnabled: number;
          blockers: string[];
        };
        capacity: {
          total: number;
          localProfiles: number;
          cloudProfiles: number;
          maxDailyCards: number;
          maxDailyImageGenerations: number;
          queueBackedProfiles: number;
          objectStoreBackedProfiles: number;
          realOrdersEnabled: number;
          liveProviderCalls: number;
          blockers: unknown[];
        };
        routes: { total: number; mutations: number; idempotentMutations: number };
        security: {
          headers: number;
          cspFrameAncestors: boolean;
          cspObjectBlocked: boolean;
          cspUnsafeEvalBlocked: boolean;
          apiCachePolicy: string;
          staticIndexCachePolicy: string;
        };
        persistence: {
          tables: number;
          authSessionTable: boolean;
          accountIdentityTable: boolean;
          accountRecoveryTable: boolean;
          idempotencyTable: boolean;
          relationshipMemoryRepository: boolean;
          importPreviewRepository: boolean;
          cardProjectRepository: boolean;
          manualVendorHandoffRepository: boolean;
          dataRequestRepository: boolean;
          renderPacketRepository: boolean;
          renderPacketArtifacts: boolean;
          signedArtifactUrls: boolean;
        };
        runtime: {
          mode: string;
          authEnforced: boolean;
          idempotencyEnforced: boolean;
          providerConnectionRecords: number | null;
          importedEventRecords: number | null;
          cardOpportunityRecords: number | null;
          relationshipMemoryRecords: number | null;
          cardProjectRecords: number | null;
          renderPacketRecords: number | null;
          orderRecords: number | null;
          orderEventRecords: number | null;
          consentRecords: number | null;
          dataRequestRecords: number | null;
        };
      };
      blockers: string[];
    };

    expect(report.service).toBe("customcard-api-doctor");
    expect(report.status).toBe("ready");
    expect(report.blockers).toEqual([]);
    expect(report.readiness.providers.total).toBeGreaterThanOrEqual(121);
    expect(report.readiness.providerGovernance).toMatchObject({
      total: 121,
      budgetCapped: 95,
      blockedZeroSpend: 6,
      fallbackCovered: 121,
      liveNetworkDefault: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(report.readiness.production).toMatchObject({
      total: 13,
      evidenceMissing: 11,
      blocked: 2,
      liveEnabled: 0
    });
    expect(report.readiness.externalAudit).toMatchObject({
      total: 15,
      productionBlocked: 15,
      publicClaimsAllowed: 0,
      externalArtifactsAttached: 0
    });
    expect(report.readiness.e2eCoverage).toMatchObject({
      total: 29,
      covered: 29,
      repoLocalCoveragePercent: 100,
      ciGated: 29,
      liveProductionProofs: 0,
      realOrdersEnabled: 0,
      externalNetworkCalls: 0,
      blockers: []
    });
    expect(report.readiness.aiProviderReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 4,
      evidenceMissing: 4,
      textProviderContracts: 15,
      imageProviderContracts: 15,
      localFallbacks: 2,
      promptAuditRequired: 6,
      humanReviewRequired: 5,
      liveProviderCallsEnabled: 0,
      externalNetworkCalls: 0,
      productionTrafficEnabled: 0,
      blockers: []
    });
    expect(report.readiness.observability).toMatchObject({
      total: 7,
      repoLocalReady: 4,
      evidenceMissing: 3,
      providerContracts: 6,
      alertRoutesRequired: 4,
      liveIngestionEnabled: 0,
      externalNetworkCalls: 0,
      productionAlertsEnabled: 0,
      blockers: []
    });
    expect(report.readiness.retailFulfillment).toMatchObject({
      total: 8,
      repoLocalReady: 3,
      evidenceMissing: 3,
      certificationBlocked: 2,
      liveVendorAdapterContracts: 6,
      manualFallbacks: 2,
      recoveryDrillEvents: 21,
      liveQuoteEnabled: 0,
      directOrderEnabled: 0,
      externalNetworkCalls: 0,
      realPaymentsEnabled: 0,
      physicalCertificationAttached: 0,
      blockers: []
    });
    expect(report.readiness.paymentReadiness).toMatchObject({
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
      externalNetworkCalls: 0,
      cardDataStored: 0,
      pciScopeApproved: 0,
      blockers: []
    });
    expect(report.readiness.mobileRenderReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 5,
      evidenceMissing: 2,
      artifactBlocked: 1,
      screenSections: 21,
      viewportProfiles: 4,
      nativeBuildProfiles: 3,
      emulatorRenderProofs: 0,
      signedArtifacts: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(report.readiness.hostedApiReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 2,
      evidenceMissing: 5,
      protectionBlocked: 1,
      routeContracts: 5,
      requiredEnvVars: 6,
      hostedDbRequired: 5,
      publicRouteProofRequired: 3,
      hostedTokenVerificationRequired: 3,
      envSyncProofs: 0,
      hostedDbProofs: 0,
      publicRouteProofs: 0,
      hostedTokenVerificationProofs: 0,
      backupPolicies: 0,
      deploymentProtectionBypasses: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(report.readiness.reviewerDbSeedReadiness).toMatchObject({
      total: 8,
      repoLocalReady: 3,
      evidenceMissing: 5,
      hostedDatabaseRequired: 5,
      hostedSeedExecutionRequired: 3,
      hostedTokenProbeRequired: 4,
      vercelEnvSyncRequired: 5,
      tableContracts: 14,
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
    expect(report.readiness.cloudArtifactProofReadiness).toMatchObject({
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
      envOutputContracts: 6,
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
    expect(report.readiness.businessEngagementReadiness).toMatchObject({
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
    expect(report.readiness.capacity).toMatchObject({
      total: 4,
      localProfiles: 1,
      cloudProfiles: 3,
      maxDailyCards: 12000,
      maxDailyImageGenerations: 1000,
      queueBackedProfiles: 4,
      objectStoreBackedProfiles: 4,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(report.readiness.production.blockers).toEqual(
      expect.arrayContaining([
        "Vercel deployment exists, but hosted DB env vars and public DB doctor output are not present.",
        "No physical sample or retailer certification has been recorded."
      ])
    );
    expect(report.readiness.externalAudit.blockers).toEqual(
      expect.arrayContaining([
        "No external legal review report is attached.",
        "Only internal security baseline evidence exists; no external security assessment is attached.",
        "No physical print sample, pickup proof, or retailer QA certification is attached."
      ])
    );
    expect(report.readiness.routes.total).toBe(15);
    expect(report.readiness.routes.mutations).toBe(report.readiness.routes.idempotentMutations);
    expect(report.readiness.security).toMatchObject({
      headers: 7,
      cspFrameAncestors: true,
      cspObjectBlocked: true,
      cspUnsafeEvalBlocked: true,
      apiCachePolicy: "no-store",
      staticIndexCachePolicy: "no-store"
    });
    expect(report.readiness.persistence).toMatchObject({
      tables: 18,
      authSessionTable: true,
      accountIdentityTable: true,
      accountRecoveryTable: true,
      idempotencyTable: true,
      relationshipMemoryRepository: true,
      importPreviewRepository: true,
      cardProjectRepository: true,
      manualVendorHandoffRepository: true,
      dataRequestRepository: true,
      renderPacketRepository: true,
      renderPacketArtifacts: true,
      signedArtifactUrls: true
    });
    expect(report.readiness.runtime).toMatchObject({
      mode: "contract",
      authEnforced: false,
      idempotencyEnforced: false
    });
  }, shellDoctorTimeoutMs);

  it("serves health through the Vercel serverless API seam", async () => {
    const response = createMockResponse();

    await handleApiRequest({ method: "GET", url: "/api/health", headers: { host: "customcard.test" } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(response.body)).toMatchObject({
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false,
      runtime: { mode: "contract" }
    });
  });

  it("blocks unsupported API runtime modes in doctor output", () => {
    const result = spawnSync("node", ["scripts/api-server.mjs", "--doctor"], {
      encoding: "utf8",
      env: { ...process.env, CUSTOMCARD_API_RUNTIME: "surprise-runtime" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(result.stdout) as {
      status: string;
      readiness: { runtime: { mode: string; requestedMode: string } };
      blockers: string[];
    };

    expect(result.status).toBe(1);
    expect(report.status).toBe("blocked");
    expect(report.readiness.runtime).toMatchObject({
      mode: "invalid",
      requestedMode: "surprise-runtime"
    });
    expect(report.blockers).toContain("Unsupported CUSTOMCARD_API_RUNTIME: surprise-runtime. Expected contract, memory, or postgres.");
  });

  it("serves API readiness, bootstrap, and contract-only mutation responses", async () => {
    const port = 6100 + Math.floor(Math.random() * 1000);
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApi(port, server);

      const healthResponse = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(healthResponse.status).toBe(200);
      expectSecurityHeaders(healthResponse);
      expect(healthResponse.headers.get("cache-control")).toBe("no-store");
      const health = await healthResponse.json();
      expect(health).toMatchObject({ service: "customcard-api", status: "ready", realOrdersEnabled: false });

      const staticResponse = await fetch(`http://127.0.0.1:${port}/`);
      expectSecurityHeaders(staticResponse);
      expect(staticResponse.headers.get("cache-control")).toBe("no-store");

      const readiness = await getJson(port, "/api/admin/readiness");
      expect(readiness.routes).toMatchObject({ total: 15, admin: 5, idempotentMutations: 7 });
      expect(readiness.providers).toMatchObject({ total: 121, readyLocal: 18, credentialGated: 88, blocked: 6 });
      expect(readiness.providerGovernance).toMatchObject({
        total: 121,
        fallbackCovered: 121,
        budgetCapped: 95,
        liveNetworkDefault: false,
        realOrdersEnabled: false,
        blockers: []
      });
      expect(readiness.localization).toMatchObject({
        defaultLocale: "en-US",
        supportedLocales: 4,
        rtlLocales: 2,
        copyReviewRequired: 3,
        completeBundles: 4,
        liveTranslationProvider: false,
        blockers: []
      });
      expect(readiness.production).toMatchObject({
        total: 13,
        evidenceMissing: 11,
        blocked: 2,
        liveEnabled: 0
      });
      expect(readiness.externalAudit).toMatchObject({
        total: 15,
        productionBlocked: 15,
        publicClaimsAllowed: 0,
        externalArtifactsAttached: 0
      });
      expect(readiness.e2eCoverage).toMatchObject({
        total: 29,
        covered: 29,
        repoLocalCoveragePercent: 100,
        liveProductionProofs: 0,
        realOrdersEnabled: 0,
        externalNetworkCalls: 0
      });
      expect(readiness.aiProviderReadiness).toMatchObject({
        total: 8,
        repoLocalReady: 4,
        evidenceMissing: 4,
        textProviderContracts: 15,
        imageProviderContracts: 15,
        localFallbacks: 2,
        promptAuditRequired: 6,
        humanReviewRequired: 5,
        liveProviderCallsEnabled: 0,
        externalNetworkCalls: 0,
        productionTrafficEnabled: 0,
        blockers: []
      });
      expect(readiness.observability).toMatchObject({
        total: 7,
        repoLocalReady: 4,
        evidenceMissing: 3,
        providerContracts: 6,
        alertRoutesRequired: 4,
        liveIngestionEnabled: 0,
        externalNetworkCalls: 0,
        productionAlertsEnabled: 0,
        blockers: []
      });
      expect(readiness.retailFulfillment).toMatchObject({
        total: 8,
        repoLocalReady: 3,
        evidenceMissing: 3,
        certificationBlocked: 2,
        liveVendorAdapterContracts: 6,
        manualFallbacks: 2,
        recoveryDrillEvents: 21,
        liveQuoteEnabled: 0,
        directOrderEnabled: 0,
        externalNetworkCalls: 0,
        realPaymentsEnabled: 0,
        physicalCertificationAttached: 0,
        blockers: []
      });
      expect(readiness.paymentReadiness).toMatchObject({
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
        externalNetworkCalls: 0,
        cardDataStored: 0,
        pciScopeApproved: 0,
        blockers: []
      });
      expect(readiness.mobileRenderReadiness).toMatchObject({
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
      expect(readiness.hostedApiReadiness).toMatchObject({
        total: 8,
        repoLocalReady: 2,
        evidenceMissing: 5,
        protectionBlocked: 1,
        routeContracts: 5,
        requiredEnvVars: 6,
        hostedTokenVerificationRequired: 3,
        envSyncProofs: 0,
        hostedDbProofs: 0,
        publicRouteProofs: 0,
        hostedTokenVerificationProofs: 0,
        backupPolicies: 0,
        deploymentProtectionBypasses: 0,
        realOrdersEnabled: 0,
        liveProviderCalls: 0,
        blockers: []
      });
      expect(readiness.reviewerDbSeedReadiness).toMatchObject({
        total: 8,
        repoLocalReady: 3,
        evidenceMissing: 5,
        hostedSeedProofs: 0,
        hostedTokenProbeProofs: 0,
        vercelEnvSyncProofs: 0,
        externalNetworkCalls: 0,
        realOrdersEnabled: 0,
        blockers: []
      });
      expect(readiness.cloudArtifactProofReadiness).toMatchObject({
        total: 8,
        repoLocalReady: 2,
        evidenceMissing: 6,
        appliedCloudRequired: 6,
        terraformFileContracts: 3,
        envOutputContracts: 6,
        appliedBucketArnProofs: 0,
        iamPolicyOutputProofs: 0,
        signedUrlProbeProofs: 0,
        accessLogProofs: 0,
        secretSyncProofs: 0,
        restoreDrillProofs: 0,
        externalNetworkCalls: 0,
        realOrdersEnabled: 0,
        blockers: []
      });
      expect(readiness.businessEngagementReadiness).toMatchObject({
        total: 8,
        repoLocalReady: 4,
        evidenceMissing: 3,
        approvalBlocked: 1,
        crmAdapterContracts: 14,
        workflowAdapterContracts: 11,
        notificationAdapterContracts: 16,
        lifecycleTriggerKinds: 3,
        liveMessagesEnabled: 0,
        crmWritesEnabled: 0,
        externalNetworkCalls: 0,
        realOrdersEnabled: 0,
        blockers: []
      });
      expect(readiness.capacity).toMatchObject({
        total: 4,
        localProfiles: 1,
        cloudProfiles: 3,
        maxDailyCards: 12000,
        maxDailyImageGenerations: 1000,
        queueBackedProfiles: 4,
        objectStoreBackedProfiles: 4,
        realOrdersEnabled: 0,
        liveProviderCalls: 0,
        blockers: []
      });
      expect(readiness.safety).toMatchObject({
        externalNetworkCalls: false,
        liveVendorOrders: false,
        rawContentStored: false
      });

      const persistence = await getJson(port, "/api/admin/persistence-readiness");
      expect(persistence.persistence).toMatchObject({
        tables: 18,
        schemaBackedRoutes: 13,
        authSessionTable: true,
        accountIdentityTable: true,
        accountRecoveryTable: true,
        idempotencyTable: true,
        relationshipMemoryRepository: true,
        importPreviewRepository: true,
        cardProjectRepository: true,
        manualVendorHandoffRepository: true,
        dataRequestRepository: true,
        renderPacketRepository: true,
        renderPacketArtifacts: true,
        signedArtifactUrls: true
      });
      expect(persistence.blockers).toEqual([]);

      const governance = await getJson(port, "/api/admin/provider-governance");
      expect(governance.providerGovernance).toMatchObject({
        total: 121,
        monthlyBudgetCents: 133200,
        maxPerRequestBudgetCents: 75,
        rateLimited: 115,
        queueRequired: 86,
        fallbackCovered: 121,
        liveNetworkDefault: false,
        realOrdersEnabled: false,
        blockers: []
      });

      const mobile = await getJson(port, "/api/mobile/bootstrap");
      expect(mobile.sections).toEqual(
        expect.arrayContaining(["card-queue", "approval-controls", "text-chat", "pricing-preview", "handoff", "offline-sync"])
      );
      expect(mobile.safetyBanner).toMatchObject({ label: "Real orders disabled" });
      expect(mobile.todaySummary).toMatchObject({
        cardQueueItemId: "card_anniversary_sara_ahmed",
        primaryAction: "approve",
        panelCount: 4,
        offlineReady: true,
        realOrdersEnabled: false,
        customerVisible: true
      });
      expect(mobile.queueItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "needs-approval", panelCount: 4 }),
          expect.objectContaining({ status: "approved", panelCount: 4 })
        ])
      );
      expect(mobile.approvalActions.every((action: { idempotencyRequired: boolean }) => action.idempotencyRequired)).toBe(true);
      expect(mobile.memoryReviewItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ usage: "approved", rawContentStored: false, customerVisible: true }),
          expect.objectContaining({ usage: "review-required", rawContentStored: false, customerVisible: true })
        ])
      );
      expect(mobile.pricingPreviews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ vendor: "Walgreens", sourceMode: "review-only-public-price", liveQuote: false }),
          expect.objectContaining({ vendor: "CVS", sourceMode: "review-only-public-price", liveQuote: false })
        ])
      );
      expect(mobile.printProofChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "proof-size", passed: true, realOrderState: "manual", customerVisible: true }),
          expect.objectContaining({ id: "proof-order-gate", passed: true, realOrderState: "disabled", customerVisible: true })
        ])
      );
      expect(mobile.syncState).toMatchObject({
        authMode: "customer-session",
        offlineQueueEnabled: true,
        idempotencyRequired: true,
        forbiddenMutationTypes: ["submit-live-order", "charge-payment", "upload-raw-memory"]
      });
      expect(mobile.localeOptions).toEqual(["en-US", "es-US", "ur-PK", "ar-EG"]);
      expect(mobile.localization).toMatchObject({ supportedLocales: 4, rtlLocales: 2, liveTranslationProvider: false });
      expect(mobile.realOrdersEnabled).toBe(false);

      const customer = await getJson(port, "/api/customer/bootstrap");
      expect(customer.localization).toMatchObject({ supportedLocales: 4, copyReviewRequired: 3, liveTranslationProvider: false });
      expect(customer.printerPricing).toMatchObject({
        selectedVendorId: "walgreens",
        liveQuote: false,
        knownPriceCount: 12,
        sourceCount: 8,
        couponSourceCount: 2,
        couponOfferCount: 2,
        activeCouponOfferCount: 0,
        portalAppliedCouponOfferCount: 0,
        couponsIncludedInShownPrices: "only-after-provider-portal-application",
        liveCouponLookup: "credential-gated-provider-or-retailer-coupon-page",
        couponProviderFeedAllowed: true,
        retailerCouponScrapeAllowed: true,
        providerPortalApplicationRequired: true,
        bestAvailablePriceRequiresCouponPortalEvidence: true,
        maxAgeDays: 30,
        externalNetworkCalls: false
      });

      const mutation = await fetch(`http://127.0.0.1:${port}/api/render-packets`, { method: "POST" });
      expect(mutation.status).toBe(202);
      expect(await mutation.json()).toMatchObject({
        status: "accepted-contract-only",
        idempotencyRequired: true,
        runtimeMode: "contract",
        idempotencyPersisted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false,
        checksum: expect.stringMatching(/^cc_[0-9a-f]{8}$/),
        artifactManifest: {
          artifactCount: 6,
          manifestChecksum: expect.stringMatching(/^cc_[0-9a-f]{8}$/),
          signedUrlTtlMinutes: 15,
          externalShareApprovalRequired: true,
          realOrdersEnabled: false
        },
        signedArtifactUrls: [expect.objectContaining({ signatureVersion: "hmac-sha256-v1" })],
        repository: {
          table: "render_packets",
          runtimeMode: "contract",
          persisted: false,
          signedArtifactUrls: true,
          realOrdersEnabled: false
        }
      });

      const importPreview = await postJson(
        port,
        "/api/import-preview",
        {
          sourceKind: "manual-ics",
          eventId: "event-contract-api",
          opportunityId: "opportunity-contract-api",
          metadataOnlyPayload: {
            title: "Anniversary dinner",
            recipientName: "Sara",
            startsAt: "2030-06-03T18:00:00.000Z",
            timezone: "America/New_York",
            confidence: 0.96
          }
        }
      );
      expect(importPreview.status).toBe(202);
      expect(await importPreview.json()).toMatchObject({
        status: "accepted-contract-only",
        route: "import-preview",
        rawContentStored: false,
        opportunities: [
          expect.objectContaining({
            opportunityId: "opportunity-contract-api",
            eventId: "event-contract-api",
            recipientName: "Sara",
            title: "Anniversary dinner",
            decision: "generate"
          })
        ],
        repository: {
          tables: ["provider_connections", "imported_events", "card_opportunities"],
          runtimeMode: "contract",
          persisted: false,
          rawContentStored: false
        },
        runtimeMode: "contract",
        idempotencyPersisted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      });

      const cardProject = await postJson(
        port,
        "/api/card-projects",
        {
          projectId: "project-contract-api",
          opportunityId: "opportunity-contract-api",
          recipientName: "Sara",
          locale: "ar-AE",
          approvedMemoryIds: ["memory-contract-api"]
        }
      );
      expect(cardProject.status).toBe(202);
      expect(await cardProject.json()).toMatchObject({
        status: "accepted-contract-only",
        route: "card-projects",
        projectId: "project-contract-api",
        opportunityId: "opportunity-contract-api",
        renderStatus: "ready-for-render",
        requiresRtlLayout: true,
        repository: {
          table: "card_projects",
          runtimeMode: "contract",
          persisted: false
        },
        runtimeMode: "contract",
        idempotencyPersisted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      });

      const manualHandoff = await postJson(
        port,
        "/api/vendor-handoff/manual",
        {
          projectId: "project-contract-api",
          renderPacketId: "render-packet-contract-api",
          storeId: "walgreens-store-042",
          externalShareApproval: "false"
        }
      );
      expect(manualHandoff.status).toBe(202);
      expect(await manualHandoff.json()).toMatchObject({
        status: "accepted-contract-only",
        route: "manual-vendor-handoff",
        projectId: "project-contract-api",
        renderPacketId: "render-packet-contract-api",
        handoffStatus: "vendor_handoff_blocked",
        externalShareApproval: false,
        repository: {
          tables: ["orders", "order_events", "consent_records"],
          runtimeMode: "contract",
          persisted: false,
          liveQuote: false,
          realOrdersEnabled: false
        },
        runtimeMode: "contract",
        idempotencyPersisted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      });

      const dataRequest = await postJson(
        port,
        "/api/data-requests",
        {
          requestId: "data-request-contract-api",
          requestType: "delete",
          region: "US",
          dueAt: "2030-01-31T00:00:00.000Z",
          requestConfirmed: "true"
        }
      );
      expect(dataRequest.status).toBe(202);
      expect(await dataRequest.json()).toMatchObject({
        status: "accepted-contract-only",
        route: "data-requests",
        dataRequestId: "data-request-contract-api",
        requestType: "delete",
        requestStatus: "pending_verification",
        dueAt: "2030-01-31T00:00:00.000Z",
        consentGranted: true,
        privacyControls: {
          region: "US",
          rawContentStored: false,
          verificationRequired: true,
          deletionRequiresRetentionReview: true
        },
        repository: {
          tables: ["data_requests", "consent_records"],
          runtimeMode: "contract",
          persisted: false,
          rawContentStored: false
        },
        runtimeMode: "contract",
        idempotencyPersisted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      });

      const demoReset = await fetch(`http://127.0.0.1:${port}/api/admin/demo-reset`, { method: "POST" });
      expect(demoReset.status).toBe(202);
      expect(await demoReset.json()).toMatchObject({
        status: "accepted-contract-only",
        route: "admin-demo-reset",
        seedSummary: {
          service: "customcard-demo-seed",
          status: "ready",
          rows: 17,
          signedArtifactUrls: true,
          realOrdersEnabled: false
        },
        signedArtifactUrls: true,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      });

      const wrongMethod = await fetch(`http://127.0.0.1:${port}/api/health`, { method: "POST" });
      expect(wrongMethod.status).toBe(405);

      const missing = await fetch(`http://127.0.0.1:${port}/api/unknown`);
      expect(missing.status).toBe(404);
    } finally {
      server.kill();
      await waitForExit(server);
    }
  }, 30_000);

  it("enforces memory-runtime auth sessions and idempotent mutation replay", async () => {
    const port = 7100 + Math.floor(Math.random() * 1000);
    const customerToken = "customer-session-token-for-api-test";
    const adminToken = "admin-session-token-for-api-test";
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: {
        ...process.env,
        CUSTOMCARD_API_RUNTIME: "memory",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: customerToken,
        CUSTOMCARD_ADMIN_SESSION_TOKEN: adminToken,
        HOST: "127.0.0.1",
        PORT: String(port)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApi(port, server);

      const unauthenticatedAdmin = await fetch(`http://127.0.0.1:${port}/api/admin/readiness`);
      expect(unauthenticatedAdmin.status).toBe(401);
      expect(await unauthenticatedAdmin.json()).toMatchObject({ status: "auth-required", requiredAuth: "admin-session" });

      const wrongRole = await getJson(port, "/api/admin/readiness", bearer(customerToken), 403);
      expect(wrongRole).toMatchObject({ status: "wrong-role", requiredAuth: "admin-session" });

      const initialReadiness = await getJson(port, "/api/admin/readiness", bearer(adminToken));
      expect(initialReadiness.runtime).toMatchObject({
        mode: "memory",
        authEnforced: true,
        idempotencyEnforced: true,
        sessionsConfigured: 2,
        idempotencyRecords: 0,
        auditRecords: 0,
        queuedJobs: 0,
        providerConnectionRecords: 0,
        importedEventRecords: 0,
        cardOpportunityRecords: 0,
        relationshipMemoryRecords: 0,
        cardProjectRecords: 0,
        renderPacketRecords: 0,
        orderRecords: 0,
        orderEventRecords: 0,
        consentRecords: 0,
        dataRequestRecords: 0
      });

      const customerBootstrap = await getJson(port, "/api/customer/bootstrap", bearer(customerToken));
      expect(customerBootstrap.runtime).toMatchObject({ mode: "memory", authEnforced: true });
      expect(customerBootstrap.localization).toMatchObject({ supportedLocales: 4, rtlLocales: 2, liveTranslationProvider: false });
      expect(customerBootstrap.printerPricing).toMatchObject({
        liveQuote: false,
        knownPriceCount: 12,
        sourceCount: 8,
        couponSourceCount: 2,
        couponOfferCount: 2,
        couponsIncludedInShownPrices: "only-after-provider-portal-application",
        liveCouponLookup: "credential-gated-provider-or-retailer-coupon-page",
        providerPortalApplicationRequired: true,
        bestAvailablePriceRequiresCouponPortalEvidence: true
      });

      const missingAuth = await fetch(`http://127.0.0.1:${port}/api/render-packets`, { method: "POST" });
      expect(missingAuth.status).toBe(401);

      const missingIdempotency = await postJson(port, "/api/render-packets", { projectId: "project-demo" }, bearer(customerToken));
      expect(missingIdempotency.status).toBe(400);
      expect(await missingIdempotency.json()).toMatchObject({ status: "idempotency-key-required" });

      const headers = {
        ...bearer(customerToken),
        "X-Idempotency-Key": "render-packets-0001"
      };
      const renderPacketBody = {
        projectId: "project-memory-api",
        renderPacketId: "render-packet-memory-api",
        locale: "ar-AE",
        signedUrlExpiresAt: "2020-01-01T00:00:00.000Z"
      };
      const first = await postJson(port, "/api/render-packets", renderPacketBody, headers);
      expect(first.status).toBe(202);
      const firstPayload = await first.json();
      expect(firstPayload).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        idempotencyPersisted: true,
        idempotencyReplayed: false,
        repositoryPersisted: true,
        renderPacketId: "render-packet-memory-api",
        checksum: expect.stringMatching(/^cc_[0-9a-f]{8}$/),
        artifactManifest: expect.objectContaining({
          artifactCount: 6,
          manifestChecksum: expect.stringMatching(/^cc_[0-9a-f]{8}$/),
          externalShareApprovalRequired: true,
          realOrdersEnabled: false,
          direction: "rtl"
        }),
        signedArtifactUrls: [expect.objectContaining({ method: "GET", signatureVersion: "hmac-sha256-v1" })],
        repository: {
          table: "render_packets",
          runtimeMode: "memory",
          persisted: true,
          signedArtifactUrls: true,
          realOrdersEnabled: false
        },
        persistedTables: expect.arrayContaining(["auth_sessions", "idempotency_keys", "render_packets", "api_jobs", "audit_log"])
      });
      expect(new Date(firstPayload.artifactManifest.signedUrlExpiresAt).getTime()).toBeGreaterThan(Date.now());

      const handoff = await postJson(
        port,
        "/api/vendor-handoff/manual",
        {
          projectId: "project-memory-api",
          renderPacketId: "render-packet-memory-api",
          storeId: "walgreens-store-042",
          region: "US",
          externalShareApproval: true
        },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "vendor-handoff-0001"
        }
      );
      expect(handoff.status).toBe(202);
      expect(await handoff.json()).toMatchObject({
        runtimeMode: "memory",
        realOrdersEnabled: false,
        repositoryPersisted: true,
        projectId: "project-memory-api",
        renderPacketId: "render-packet-memory-api",
        handoffStatus: "vendor_handoff_ready",
        externalShareApproval: true,
        manualOrderTrail: expect.objectContaining({
          status: "vendor_handoff_ready",
          eventType: "attempt_vendor_handoff",
          storeId: "walgreens-store-042"
        }),
        repository: {
          tables: ["orders", "order_events", "consent_records"],
          runtimeMode: "memory",
          persisted: true,
          liveQuote: false,
          realOrdersEnabled: false
        },
        handoffChecklist: expect.arrayContaining(["Download signed artifacts"]),
        signedArtifactUrls: [expect.objectContaining({ signatureVersion: "hmac-sha256-v1" })],
        disabledReasons: expect.arrayContaining(["Live vendor order APIs remain disabled until certification and kill-switch gates pass."]),
        persistedTables: expect.arrayContaining(["orders", "order_events", "consent_records", "api_jobs", "audit_log"])
      });

      const importPreviewHeaders = {
        ...bearer(customerToken),
        "X-Idempotency-Key": "import-preview-0001"
      };
      const importPreview = await postJson(
        port,
        "/api/import-preview",
        {
          sourceKind: "manual-ics",
          connectionId: "connection-memory-api",
          eventId: "event-memory-api",
          opportunityId: "opportunity-memory-api",
          metadataOnlyPayload: {
            title: "Anniversary dinner",
            recipientName: "Sara",
            startsAt: "2030-06-03T18:00:00.000Z",
            timezone: "America/New_York",
            confidence: 0.96,
            leadTimeHours: 240
          }
        },
        importPreviewHeaders
      );
      expect(importPreview.status).toBe(202);
      expect(await importPreview.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        repositoryPersisted: true,
        rawContentStored: false,
        opportunities: [
          expect.objectContaining({
            opportunityId: "opportunity-memory-api",
            eventId: "event-memory-api",
            recipientName: "Sara",
            title: "Anniversary dinner",
            confidence: 0.96,
            decision: "generate"
          })
        ],
        repository: {
          tables: ["provider_connections", "imported_events", "card_opportunities"],
          runtimeMode: "memory",
          persisted: true,
          rawContentStored: false
        },
        persistedTables: expect.arrayContaining(["provider_connections", "imported_events", "card_opportunities", "audit_log"])
      });

      const memoryHeaders = {
        ...bearer(customerToken),
        "X-Idempotency-Key": "relationship-memories-0001"
      };
      const memoryReview = await postJson(
        port,
        "/api/memories/review",
        {
          memoryId: "memory-memory-api",
          recipientName: "Sara",
          text: "Sara keeps every handwritten note.",
          sensitivity: "normal",
          locale: "en-US",
          decision: "approve"
        },
        memoryHeaders
      );
      expect(memoryReview.status).toBe(202);
      expect(await memoryReview.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        repositoryPersisted: true,
        memoryId: "memory-memory-api",
        recipientName: "Sara",
        approved: true,
        forgottenAt: null,
        memoryUseAllowed: true,
        privacyControls: {
          customerApproved: true,
          rawProviderContentStored: false,
          forgetSupported: true
        },
        repository: {
          table: "relationship_memories",
          runtimeMode: "memory",
          persisted: true,
          rawContentStored: false
        },
        persistedTables: expect.arrayContaining(["relationship_memories", "audit_log"])
      });

      const cardProjectHeaders = {
        ...bearer(customerToken),
        "X-Idempotency-Key": "card-projects-0001"
      };
      const cardProject = await postJson(
        port,
        "/api/card-projects",
        {
          projectId: "project-memory-api",
          opportunityId: "opportunity-memory-api",
          recipientName: "Sara",
          locale: "ar-AE",
          approvedMemoryIds: ["memory-memory-api"]
        },
        cardProjectHeaders
      );
      expect(cardProject.status).toBe(202);
      expect(await cardProject.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        repositoryPersisted: true,
        projectId: "project-memory-api",
        opportunityId: "opportunity-memory-api",
        renderStatus: "ready-for-render",
        requiresRtlLayout: true,
        approvedMemoryIds: ["memory-memory-api"],
        repository: {
          table: "card_projects",
          runtimeMode: "memory",
          persisted: true
        },
        persistedTables: expect.arrayContaining(["card_opportunities", "relationship_memories", "card_projects", "audit_log"])
      });

      const dataRequestHeaders = {
        ...bearer(customerToken),
        "X-Idempotency-Key": "data-requests-0001"
      };
      const dataRequest = await postJson(
        port,
        "/api/data-requests",
        {
          requestId: "data-request-memory-api",
          requestType: "delete",
          region: "US",
          dueAt: "2030-01-31T00:00:00.000Z",
          requestConfirmed: true
        },
        dataRequestHeaders
      );
      expect(dataRequest.status).toBe(202);
      expect(await dataRequest.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        repositoryPersisted: true,
        dataRequestId: "data-request-memory-api",
        requestType: "delete",
        requestStatus: "pending_verification",
        dueAt: "2030-01-31T00:00:00.000Z",
        consentGranted: true,
        privacyControls: {
          region: "US",
          rawContentStored: false,
          verificationRequired: true,
          deletionRequiresRetentionReview: true
        },
        repository: {
          tables: ["data_requests", "consent_records"],
          runtimeMode: "memory",
          persisted: true,
          rawContentStored: false
        },
        persistedTables: expect.arrayContaining(["data_requests", "consent_records", "audit_log"])
      });

      const demoReset = await postJson(
        port,
        "/api/admin/demo-reset",
        { resetKey: "demo-reset-api-test", confirmDemoOnly: true },
        {
          ...bearer(adminToken),
          "X-Idempotency-Key": "admin-demo-reset-0001"
        }
      );
      expect(demoReset.status).toBe(202);
      expect(await demoReset.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "admin-demo",
        seedSummary: expect.objectContaining({
          service: "customcard-demo-seed",
          resetKey: "demo-reset-api-test",
          rows: 17,
          signedArtifactUrls: true,
          realOrdersEnabled: false
        }),
        persistedTables: expect.arrayContaining(["users", "render_packets", "orders", "order_events", "vendor_quotes", "data_requests", "audit_log"])
      });

      const replay = await postJson(port, "/api/render-packets", renderPacketBody, headers);
      expect(replay.status).toBe(202);
      expect(await replay.json()).toMatchObject({
        runtimeMode: "memory",
        idempotencyPersisted: true,
        idempotencyReplayed: true
      });

      const conflict = await postJson(port, "/api/render-packets", { projectId: "changed-project" }, headers);
      expect(conflict.status).toBe(409);
      expect(await conflict.json()).toMatchObject({ status: "idempotency-conflict" });

      const finalReadiness = await getJson(port, "/api/admin/readiness", bearer(adminToken));
      expect(finalReadiness.runtime).toMatchObject({
        mode: "memory",
        idempotencyRecords: 7,
        auditRecords: 7,
        queuedJobs: 2,
        providerConnectionRecords: 1,
        importedEventRecords: 1,
        cardOpportunityRecords: 1,
        relationshipMemoryRecords: 1,
        cardProjectRecords: 1,
        renderPacketRecords: 1,
        orderRecords: 1,
        orderEventRecords: 1,
        consentRecords: 2,
        dataRequestRecords: 1
      });
    } finally {
      server.kill();
      await waitForExit(server);
    }
  }, 30_000);
});

function createMockResponse() {
  return {
    body: "",
    headers: new Map<string, string>(),
    statusCode: 0,
    setHeader(name: string, value: string) {
      this.headers.set(name.toLowerCase(), value);
    },
    end(body: string) {
      this.body = body;
    }
  };
}

async function getJson(port: number, path: string, headers: Record<string, string> = {}, expectedStatus = 200): Promise<any> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
  expect(response.status).toBe(expectedStatus);
  return response.json();
}

function postJson(port: number, path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function expectSecurityHeaders(response: Response): void {
  const csp = response.headers.get("content-security-policy");
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("form-action 'self'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  expect(response.headers.get("permissions-policy")).toContain("camera=()");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
}

async function waitForApi(port: number, server: ChildProcess): Promise<void> {
  let stderr = "";
  server.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited early: ${stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`API server did not start: ${stderr}`);
}

async function waitForExit(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    server.once("exit", () => resolve());
    setTimeout(() => resolve(), 1000);
  });
}
