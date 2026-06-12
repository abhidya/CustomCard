import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../scripts/api-server.mjs";
import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";

const shellDoctorTimeoutMs = 30_000;
const runtimeDoctorEnv = {
  ...process.env,
  CUSTOMCARD_ENV: "prod",
  CUSTOMCARD_API_RUNTIME: "postgres",
  DATABASE_URL: "postgres://customcard:customcard@127.0.0.1:5432/customcard_ci",
  QUEUE_URL: "redis://runtime-doctor",
  OBJECT_STORE_URL: "https://object-store.customcard.test",
  OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
  AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
  REAL_ORDER_KILL_SWITCH: "disabled"
};
const expectedIdempotentMutations = apiRouteContracts.filter((route) => route.method === "POST" && route.idempotencyKeyRequired).length;

function walgreensPortalEvidenceArtifact() {
  return {
    service: "customcard-printer-coupon-portal-evidence",
    generatedAtIso: "2026-06-07T12:15:00.000Z",
    operatorAction:
      "Opened Walgreens Photo provider portal, selected the same 5x7 folded-card product and quantity, applied CRISPCARD, recorded subtotal evidence, and stopped before upload, payment, or order placement.",
    blockedFields: ["payment submission", "live order placement", "card upload", "tax finalization", "pickup slot reservation"],
    records: [
      {
        offerId: "walgreens-crispcard-cards-2026-06-13",
        code: "CRISPCARD",
        evidence: {
          observedAtIso: "2026-06-07T12:15:00.000Z",
          portalUrl: "https://photo.walgreens.com/store/cart",
          providerPortal: true,
          sourcePriceObservationId: "walgreens-5x7-folded-card",
          subtotalBeforeCouponCents: 349,
          discountCents: 209,
          subtotalAfterCouponCents: 140,
          cartTerms: {
            vendorId: "walgreens",
            productKind: "folded-card",
            size: "5x7",
            pricedQuantity: 1,
            fulfillmentMode: "pickup",
            accountState: "logged-in"
          },
          sameCartTermsProven: true,
          noOrderPlaced: true,
          blockedFields: ["payment submission", "live order placement", "tax", "pickup window"]
        }
      }
    ]
  };
}

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
        legalCompliance: {
          total: number;
          euRequirements: number;
          usRequirements: number;
          externalReviewRequired: number;
          launchBlocked: number;
          publicClaimsAllowed: number;
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
          providerUsageLedgerTable: boolean;
          relationshipMemoryRepository: boolean;
          importPreviewRepository: boolean;
          cardProjectRepository: boolean;
          manualVendorHandoffRepository: boolean;
          dataRequestRepository: boolean;
          renderPacketRepository: boolean;
          renderPacketArtifacts: boolean;
          signedArtifactUrls: boolean;
          localBrowserState: {
            audited: boolean;
            dbRequiredItems: number;
            objectStoreRequiredItems: number;
            browserOnlyItems: number;
          };
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
          providerCallEventRecords: number | null;
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
    expect(report.readiness.providers.total).toBeGreaterThanOrEqual(124);
    expect(report.readiness.providerGovernance).toMatchObject({
      total: 131,
      budgetCapped: 104,
      blockedZeroSpend: 6,
      fallbackCovered: 131,
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
      textProviderContracts: 16,
      imageProviderContracts: 17,
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
    expect(report.readiness.legalCompliance).toMatchObject({
      total: 12,
      euRequirements: 6,
      usRequirements: 6,
      externalReviewRequired: 12,
      launchBlocked: 12,
      publicClaimsAllowed: 0
    });
    expect(report.readiness.reviewerDbSeedReadiness).toMatchObject({
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
    expect(report.readiness.routes.total).toBe(31);
    expect(report.readiness.routes.idempotentMutations).toBe(expectedIdempotentMutations);
    expect(report.readiness.security).toMatchObject({
      headers: 8,
      cspFrameAncestors: true,
      cspObjectBlocked: true,
      cspUnsafeEvalBlocked: true,
      apiCachePolicy: "no-store",
      staticIndexCachePolicy: "no-store"
    });
    expect(report.readiness.persistence).toMatchObject({
      tables: 21,
      schemaBackedRoutes: 22,
      authSessionTable: true,
      accountIdentityTable: true,
      accountRecoveryTable: true,
      idempotencyTable: true,
      providerUsageLedgerTable: true,
      relationshipMemoryRepository: true,
      importPreviewRepository: true,
      cardProjectRepository: true,
      manualVendorHandoffRepository: true,
      dataRequestRepository: true,
      renderPacketRepository: true,
      renderPacketArtifacts: true,
      signedArtifactUrls: true,
      localBrowserState: {
        audited: true,
        dbRequiredItems: 0,
        objectStoreRequiredItems: 0,
        browserOnlyItems: 0
      }
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
  }, shellDoctorTimeoutMs);

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
  }, shellDoctorTimeoutMs);

  it("blocks production-shaped API doctors from falling back to contract runtime", () => {
    for (const customcardRuntime of ["", "contract", "memory"]) {
      const result = spawnSync("node", ["scripts/api-server.mjs", "--doctor"], {
        encoding: "utf8",
        env: {
          ...process.env,
          CUSTOMCARD_ENV: "prod",
          NODE_ENV: "test",
          CUSTOMCARD_API_RUNTIME: customcardRuntime
        },
        stdio: ["ignore", "pipe", "pipe"]
      });
      const report = JSON.parse(result.stdout) as {
        status: string;
        readiness: { runtime: { mode: string; requestedMode: string } };
        blockers: string[];
      };

      expect(result.status).toBe(1);
      expect(report.status).toBe("blocked");
      expect(report.readiness.runtime.mode).toBe("invalid");
      expect(report.blockers).toContain(
        "Production API runtime requires CUSTOMCARD_API_RUNTIME=postgres. Contract and memory runtimes are reviewer-only and do not provide durable production auth/idempotency."
      );
    }
  }, shellDoctorTimeoutMs);

  it("fails closed for invalid production runtime before public API handlers", async () => {
    const port = 6200 + Math.floor(Math.random() * 1000);
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        CUSTOMCARD_API_RUNTIME: "contract",
        HOST: "127.0.0.1",
        PORT: String(port)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApiPort(port, server);

      const healthResponse = await fetch(`http://127.0.0.1:${port}/api/health`);
      expect(healthResponse.status).toBe(503);
      expect(await healthResponse.json()).toMatchObject({
        service: "customcard-api",
        status: "blocked",
        runtime: {
          mode: "invalid",
          requestedMode: "contract"
        }
      });

      const routesResponse = await fetch(`http://127.0.0.1:${port}/api/routes`);
      expect(routesResponse.status).toBe(503);
      expect(await routesResponse.json()).toMatchObject({
        status: "api-runtime-invalid",
        path: "/api/routes",
        runtime: {
          mode: "invalid",
          requestedMode: "contract"
        }
      });

      const artifactResponse = await fetch(`http://127.0.0.1:${port}/api/artifacts/projects/project/render-packets/render/front.svg`);
      expect(artifactResponse.status).toBe(503);
      expect(await artifactResponse.json()).toMatchObject({
        status: "api-runtime-invalid",
        path: "/api/artifacts/projects/project/render-packets/render/front.svg"
      });

      const oauthResponse = await fetch(`http://127.0.0.1:${port}/oauth/callback?state=bad&code=fake`);
      expect(oauthResponse.status).toBe(503);
      expect(await oauthResponse.json()).toMatchObject({
        status: "api-runtime-invalid",
        path: "/oauth/callback"
      });
    } finally {
      server.kill();
      await waitForExit(server);
    }
  }, 30_000);

  it("requires an explicit durable API runtime in runtime doctor", () => {
    const ready = spawnSync(process.execPath, ["scripts/validate-runtime-env.mjs"], {
      encoding: "utf8",
      env: runtimeDoctorEnv,
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(ready.status).toBe(0);
    expect(JSON.parse(ready.stdout)).toMatchObject({
      service: "customcard-runtime-doctor",
      status: "ready",
      apiRuntime: "postgres"
    });

    const contract = spawnSync(process.execPath, ["scripts/validate-runtime-env.mjs"], {
      encoding: "utf8",
      env: { ...runtimeDoctorEnv, CUSTOMCARD_API_RUNTIME: "contract" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    expect(contract.status).toBe(1);
    expect(contract.stderr).toContain("CustomCard production runtime requires CUSTOMCARD_API_RUNTIME=postgres.");
  }, shellDoctorTimeoutMs);

  it("serves API readiness, bootstrap, and contract-only mutation responses", async () => {
    const port = 6100 + Math.floor(Math.random() * 1000);
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        GOOGLE_OAUTH_CLIENT_ID: "test-google-calendar-client.apps.googleusercontent.com",
        GOOGLE_OAUTH_CLIENT_SECRET: "test-google-calendar-secret",
        GOOGLE_OAUTH_REDIRECT_URI: `http://localhost:${port}/oauth/callback`,
        GOOGLE_OAUTH_STATE_SECRET: "test-google-oauth-state-secret-32-chars",
        GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "test-google-oauth-token-key-32-chars"
      },
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
      expect(readiness.routes).toMatchObject({ total: 31, admin: 9, idempotentMutations: expectedIdempotentMutations });
      expect(readiness.providers).toMatchObject({ total: 131, readyLocal: 18, credentialGated: 97, blocked: 6 });
      expect(readiness.providerGovernance).toMatchObject({
        total: 131,
        fallbackCovered: 131,
        budgetCapped: 104,
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
        textProviderContracts: 16,
        imageProviderContracts: 17,
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
      expect(readiness.legalCompliance).toMatchObject({
        total: 12,
        euRequirements: 6,
        usRequirements: 6,
        externalReviewRequired: 12,
        launchBlocked: 12,
        publicClaimsAllowed: 0
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
        tables: 21,
        schemaBackedRoutes: 22,
        authSessionTable: true,
        accountIdentityTable: true,
        accountRecoveryTable: true,
        idempotencyTable: true,
        providerUsageLedgerTable: true,
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
        total: 131,
        monthlyBudgetCents: 202600,
        maxPerRequestBudgetCents: 5,
        rateLimited: 125,
        queueRequired: 91,
        fallbackCovered: 131,
        liveNetworkDefault: false,
        realOrdersEnabled: false,
        blockers: []
      });

      const mobile = await getJson(port, "/api/mobile/bootstrap");
      expect(mobile.sections.map((section: { id: string }) => section.id)).toEqual(
        expect.arrayContaining(["account-import", "card-queue", "approval-controls", "text-chat", "pricing-preview", "handoff", "offline-sync"])
      );
      expect(mobile.proofBoundary).toMatchObject({
        deterministicProofMode: "repo-local-contract",
        proofApproved: false,
        printOptionsUnlocked: false,
        blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"]
      });
      expect(mobile.safetyBanner).toMatchObject({ label: "Confirm before checkout" });
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
      expect(mobile.accountOptions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ provider: "Google", liveOAuthEnabled: false, canStartNow: false }),
          expect.objectContaining({ provider: "Apple", liveOAuthEnabled: false, canStartNow: true })
        ])
      );
      expect(mobile.chatTranscript).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ speaker: "assistant", source: "local-script", text: expect.stringContaining("Local scripted assistant") }),
          expect.objectContaining({ speaker: "assistant", source: "local-script", text: expect.stringContaining("Live AI and automatic orders stay off") })
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
      expect(mobile.localeOptions.map((option: { locale: string }) => option.locale)).toEqual(["en-US", "es-US", "ur-PK", "ar-EG"]);
      expect(mobile.localization).toMatchObject({ supportedLocales: 4, rtlLocales: 2, liveTranslationProvider: false });
      expect(mobile.realOrdersEnabled).toBe(false);

      const customer = await getJson(port, "/api/customer/bootstrap");
      expect(customer.localization).toMatchObject({ supportedLocales: 4, copyReviewRequired: 3, liveTranslationProvider: false });
      expect(customer.printerPricing).toMatchObject({
        selectedVendorId: "walgreens",
        liveQuote: false,
        knownPriceCount: 12,
        sourceCount: 8,
        couponSourceCount: 4,
        couponCollectionTargetCount: 6,
        couponProviderTargetCount: 2,
        retailerCouponCollectionTargetCount: 4,
        couponOfferCount: 2,
        activeCouponOfferCount: 2,
        portalAppliedCouponOfferCount: 0,
        couponPortalApplicationPacketCount: 2,
        couponPortalApplicationTargetCount: 5,
        couponsIncludedInShownPrices: "only-after-provider-portal-application",
        liveCouponLookup: "operator-script-or-credential-gated-provider",
        couponProviderFeedAllowed: true,
        retailerCouponScrapeAllowed: true,
        providerPortalApplicationRequired: true,
        bestAvailablePriceRequiresCouponPortalEvidence: true,
        maxAgeDays: 30,
        externalNetworkCalls: false
      });
      expect(customer.calendarConnections).toMatchObject({
        startRoute: "/api/calendar/connections/start",
        blockers: []
      });
      expect(customer.calendarConnections.startPackets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "google-calendar-events",
            startMode: "oauth-evidence-required",
            canStartNow: false,
            providerRequestUrl: null,
            clientMayPrepareProviderRequest: false,
            networkRequestPrepared: false
          }),
          expect.objectContaining({
            id: "icloud-ics-fallback",
            startMode: "manual-export-guide",
            nextApiRoute: "/api/import-preview"
          })
        ])
      );
      expect(customer.retailOperations).toMatchObject({
        startRoute: "/api/retail-printers/operations/start",
        blockers: []
      });
      expect(customer.retailOperations.startPackets).toHaveLength(12);
      expect(customer.retailOperations.startPackets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "walgreens-fetch-price-operation-start",
            vendorId: "walgreens",
            operation: "fetch-price",
            providerAdapterId: "walgreens-live-order",
            providerPortalUrl: expect.stringContaining("photo.walgreens.com"),
            providerRequestUrl: null,
            providerRequestPrepared: false,
            clientMayPrepareProviderRequest: false,
            networkRequestPrepared: false,
            liveQuoteEnabled: false,
            couponPortalApplicationRequired: true,
            couponCollectionPlan: expect.objectContaining({
              retailerCouponTargetIds: ["walgreens-photo-official-deals"],
              printEntrypointTargetIds: ["walgreens-photo-card-design-entrypoint"],
              candidateOfferCodes: ["CRISPCARD"]
            })
          }),
          expect.objectContaining({
            id: "cvs-place-order-operation-start",
            vendorId: "cvs",
            operation: "place-order",
            providerRequestUrl: null,
            realOrdersEnabled: false,
            orderPlacementEnabled: false,
            couponCollectionPlan: expect.objectContaining({
              retailerCouponTargetIds: ["cvs-photo-official-coupons"],
              printEntrypointTargetIds: ["cvs-photo-card-design-entrypoint"],
              candidateOfferCodes: ["JUNESW"]
            })
          })
        ])
      );

      const missingCalendarChoice = await postJson(
        port,
        "/api/calendar/connections/start",
        {},
        bearer("contract-customer-token")
      );
      expect(missingCalendarChoice.status).toBe(400);
      expect(await missingCalendarChoice.json()).toMatchObject({
        status: "invalid-calendar-connection-start-payload",
        route: "calendar-connection-start",
        requiredFields: expect.arrayContaining(["calendarChoiceId"]),
        rawContentStored: false
      });

      const googleConnectionStart = await postJson(
        port,
        "/api/calendar/connections/start",
        { calendarChoiceId: "google-calendar-events" },
        bearer("contract-customer-token")
      );
      expect(googleConnectionStart.status).toBe(202);
      expect(await googleConnectionStart.json()).toMatchObject({
        status: "oauth-ready",
        route: "calendar-connection-start",
        requestedChoiceId: "google-calendar-events",
        providerRequestUrl: expect.stringContaining("https://accounts.google.com/o/oauth2/v2/auth"),
        networkRequestPrepared: true,
        credentialStorageEnabled: false,
        externalNetworkCalls: true,
        realOrdersEnabled: false,
        rawContentStored: false,
        nextApiRoute: null,
        blockers: [],
        missingEnv: [],
        oauth: expect.objectContaining({
          provider: "google-calendar",
          redirectUri: `http://localhost:${port}/oauth/callback`,
          scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
          credentialStorageEnabled: false,
          rawContentStored: false
        }),
        startPacket: expect.objectContaining({
          id: "google-calendar-events",
          startMode: "oauth-provider-redirect",
          canStartNow: true,
          serverOwned: true,
          clientMayPrepareProviderRequest: false,
          providerRequestUrl: expect.stringContaining("client_id=test-google-calendar-client.apps.googleusercontent.com"),
          requiredEnv: [
            "GOOGLE_OAUTH_CLIENT_ID",
            "GOOGLE_OAUTH_CLIENT_SECRET",
            "GOOGLE_OAUTH_REDIRECT_URI",
            "GOOGLE_OAUTH_STATE_SECRET",
            "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"
          ],
          requiredScopes: ["calendar.events.readonly"],
          officialScopeUris: ["https://www.googleapis.com/auth/calendar.events.readonly"]
        }),
        repository: {
          tables: ["auth_sessions", "idempotency_keys", "audit_log"],
          runtimeMode: "contract",
          persisted: false,
          rawContentStored: false,
          providerCredentialsStored: false
        }
      });

      const missingRetailOperation = await postJson(port, "/api/retail-printers/operations/start", {});
      expect(missingRetailOperation.status).toBe(400);
      expect(await missingRetailOperation.json()).toMatchObject({
        status: "invalid-retail-printer-operation-start-payload",
        route: "retail-printer-operation-start",
        requiredFields: expect.arrayContaining(["vendorId", "operation"]),
        missingFields: expect.arrayContaining(["vendorId", "operation"]),
        rawContentStored: false
      });

      const walgreensPriceStart = await postJson(port, "/api/retail-printers/operations/start", {
        vendorId: "walgreens",
        operation: "fetch-price"
      });
      expect(walgreensPriceStart.status).toBe(202);
      expect(await walgreensPriceStart.json()).toMatchObject({
        status: "blocked",
        route: "retail-printer-operation-start",
        requestedVendorId: "walgreens",
        requestedOperation: "fetch-price",
        serverOwned: true,
        clientMayPrepareProviderRequest: false,
        providerPortalUrl: expect.stringContaining("photo.walgreens.com"),
        providerRequestUrl: null,
        providerRequestPrepared: false,
        networkRequestPrepared: false,
        requestPrepared: false,
        networkAttempted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false,
        liveQuoteEnabled: false,
        imageUploadEnabled: false,
        orderPlacementEnabled: false,
        blockers: expect.arrayContaining(["provider-coupon-portal-proof", "retail-price-freshness-proof"]),
        startPacket: expect.objectContaining({
          id: "walgreens-fetch-price-operation-start",
          providerAdapterId: "walgreens-live-order",
          serverOwned: true,
          couponPortalApplicationRequired: true,
          bestPriceRequiresProviderPortalEvidence: true,
          canAffectBestPriceBeforePortalEvidence: false,
          providerRequestUrl: null,
          requestPrepared: false,
          couponCollectionPlan: expect.objectContaining({
            providerFeedTargetIds: ["fmtc-deal-feed", "rakuten-coupon-feed"],
            retailerCouponTargetIds: ["walgreens-photo-official-deals"],
            printEntrypointTargetIds: ["walgreens-photo-card-design-entrypoint"],
            candidateOfferCodes: ["CRISPCARD"],
            portalApplicationPacketIds: ["walgreens-crispcard-cards-2026-06-13-portal-application-packet"]
          })
        }),
        repository: {
          tables: ["auth_sessions", "idempotency_keys", "audit_log"],
          runtimeMode: "contract",
          persisted: false,
          providerPayloadPrepared: false,
          realOrdersEnabled: false
        }
      });

      const missingRenderPacketProject = await postJson(
        port,
        "/api/render-packets",
        {}
      );
      expect(missingRenderPacketProject.status).toBe(400);
      expect(await missingRenderPacketProject.json()).toMatchObject({
        status: "invalid-render-packets-payload",
        route: "render-packets",
        requiredFields: expect.arrayContaining(["projectId"])
      });

      const mutation = await postJson(
        port,
        "/api/render-packets",
        { projectId: "project-contract-api" }
      );
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

      const missingImportMetadata = await postJson(
        port,
        "/api/import-preview",
        { sourceKind: "manual-ics" }
      );
      expect(missingImportMetadata.status).toBe(400);
      expect(await missingImportMetadata.json()).toMatchObject({
        status: "invalid-import-preview-payload",
        route: "import-preview",
        requiredFields: expect.arrayContaining([
          "sourceKind",
          "metadataOnlyPayload.title",
          "metadataOnlyPayload.recipientName",
          "metadataOnlyPayload.startsAt"
        ])
      });

      const rawIcsImportPreview = await postJson(
        port,
        "/api/import-preview",
        {
          sourceKind: "manual-ics",
          rawImportText: [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "BEGIN:VEVENT",
            "SUMMARY:Wedding dinner for Sara",
            "DTSTART;TZID=America/New_York:20300603T180000",
            "LOCATION:Brooklyn, NY",
            "ATTENDEE;CN=Sara:mailto:sara@example.com",
            "DESCRIPTION:Private note that must not return in API metadata.",
            "END:VEVENT",
            "END:VCALENDAR"
          ].join("\n")
        }
      );
      expect(rawIcsImportPreview.status).toBe(202);
      const rawIcsPayload = await rawIcsImportPreview.json();
      expect(rawIcsPayload).toMatchObject({
        status: "accepted-contract-only",
        route: "import-preview",
        rawContentStored: false,
        importParser: {
          parsedFromRawText: true,
          rawTextField: "rawImportText",
          rawContentStored: false,
          evidenceSummary: expect.arrayContaining(["ICS VEVENT detected", "DTSTART field present"])
        },
        opportunities: [
          expect.objectContaining({
            recipientName: "Sara",
            title: "Wedding dinner for Sara",
            startsAt: "2030-06-03T18:00:00.000Z",
            timezone: "America/New_York",
            decision: "generate"
          })
        ]
      });
      expect(JSON.stringify(rawIcsPayload)).not.toContain("Private note");

      const missingCardProjectRecipient = await postJson(
        port,
        "/api/card-projects",
        { opportunityId: "opportunity-contract-api" }
      );
      expect(missingCardProjectRecipient.status).toBe(400);
      expect(await missingCardProjectRecipient.json()).toMatchObject({
        status: "invalid-card-projects-payload",
        route: "card-projects",
        requiredFields: expect.arrayContaining(["opportunityId", "recipientName"])
      });

      const missingMemoryReviewFields = await postJson(
        port,
        "/api/memories/review",
        { recipientName: "Sara" }
      );
      expect(missingMemoryReviewFields.status).toBe(400);
      expect(await missingMemoryReviewFields.json()).toMatchObject({
        status: "invalid-relationship-memories-payload",
        route: "relationship-memories",
        requiredFields: expect.arrayContaining(["recipientName", "text", "decision"])
      });

      const missingManualHandoffFields = await postJson(
        port,
        "/api/vendor-handoff/manual",
        { projectId: "project-contract-api" }
      );
      expect(missingManualHandoffFields.status).toBe(400);
      expect(await missingManualHandoffFields.json()).toMatchObject({
        status: "invalid-manual-vendor-handoff-payload",
        route: "manual-vendor-handoff",
        requiredFields: expect.arrayContaining(["projectId", "renderPacketId", "vendorId", "externalShareApproval"])
      });

      const missingDataRequestFields = await postJson(
        port,
        "/api/data-requests",
        { requestType: "delete" }
      );
      expect(missingDataRequestFields.status).toBe(400);
      expect(await missingDataRequestFields.json()).toMatchObject({
        status: "invalid-data-requests-payload",
        route: "data-requests",
        requiredFields: expect.arrayContaining(["requestType", "region", "consentGranted"])
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
        importParser: {
          parsedFromRawText: false,
          rawContentStored: false
        },
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
      const dataRequestPayload = await dataRequest.json();
      // The server sets the deadline; the client-supplied dueAt must be ignored.
      expect(dataRequestPayload.dueAt).not.toBe("2030-01-31T00:00:00.000Z");
      expect(new Date(dataRequestPayload.dueAt).getTime()).toBeGreaterThan(Date.now());
      expect(dataRequestPayload).toMatchObject({
        status: "accepted-contract-only",
        route: "data-requests",
        dataRequestId: "data-request-contract-api",
        requestType: "delete",
        requestStatus: "pending_verification",
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
      expect(demoReset.status).toBe(403);
      expect(await demoReset.json()).toMatchObject({
        status: "admin-mutation-requires-durable-runtime",
        route: "admin-demo-reset"
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
        CUSTOMCARD_AI_CUSTOMER_CHAT_LIVE_ENABLED: "false",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "false",
        CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG: "false",
        WALGREENS_VENDOR_MODE: "disabled_until_certified",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
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
	        providerCallEventRecords: 0,
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
        couponSourceCount: 4,
        couponCollectionTargetCount: 6,
        couponProviderTargetCount: 2,
        retailerCouponCollectionTargetCount: 4,
        couponOfferCount: 2,
        activeCouponOfferCount: 2,
        portalAppliedCouponOfferCount: 0,
        couponPortalApplicationPacketCount: 2,
        couponPortalApplicationTargetCount: 5,
        couponsIncludedInShownPrices: "only-after-provider-portal-application",
        liveCouponLookup: "operator-script-or-credential-gated-provider",
        providerPortalApplicationRequired: true,
        bestAvailablePriceRequiresCouponPortalEvidence: true
      });

      const unauthenticatedWalgreensStatus = await fetch(`http://127.0.0.1:${port}/api/walgreens/checkout/status`);
      expect(unauthenticatedWalgreensStatus.status).toBe(401);
      expect(await unauthenticatedWalgreensStatus.json()).toMatchObject({
        status: "auth-required",
        requiredAuth: "customer-session"
      });

      const authenticatedWalgreensStatus = await fetch(`http://127.0.0.1:${port}/api/walgreens/checkout/status`, {
        headers: bearer(customerToken)
      });
      expect(authenticatedWalgreensStatus.status).toBe(503);
      expect(await authenticatedWalgreensStatus.json()).toMatchObject({
        ok: false,
        status: "walgreens-checkout-not-configured",
        error: "Walgreens checkout is not enabled."
      });

      const unauthenticatedWalgreensUpload = await postJson(
        port,
        "/api/walgreens/checkout/upload",
        { imageBase64: "anonymous-checkout-reaches-walgreens-gate" }
      );
      expect(unauthenticatedWalgreensUpload.status).toBe(401);
      expect(await unauthenticatedWalgreensUpload.json()).toMatchObject({
        status: "auth-required",
        requiredAuth: "customer-session"
      });

      const authenticatedWalgreensUpload = await postJson(
        port,
        "/api/walgreens/checkout/upload",
        { imageBase64: "authenticated-checkout-reaches-walgreens-gate" },
        bearer(customerToken)
      );
      expect(authenticatedWalgreensUpload.status).toBe(503);
      expect(await authenticatedWalgreensUpload.json()).toMatchObject({
        ok: false,
        error: "Walgreens checkout is not enabled."
      });

      const unauthenticatedWalgreensSession = await postJson(
        port,
        "/api/walgreens/checkout/session",
        {
          customer: {
            firstName: "Maya",
            lastName: "Patel",
            email: "maya@example.com",
            phone: "3125550199"
          },
          images: ["https://customcard.invalid/Image-demo.jpg"]
        }
      );
      expect(unauthenticatedWalgreensSession.status).toBe(401);
      expect(await unauthenticatedWalgreensSession.json()).toMatchObject({
        status: "auth-required",
        requiredAuth: "customer-session"
      });

      const authenticatedWalgreensSession = await postJson(
        port,
        "/api/walgreens/checkout/session",
        {
          customer: {
            firstName: "Maya",
            lastName: "Patel",
            email: "maya@example.com",
            phone: "3125550199"
          },
          images: ["https://customcard.invalid/Image-demo.jpg"]
        },
        bearer(customerToken)
      );
      expect(authenticatedWalgreensSession.status).toBe(503);
      expect(await authenticatedWalgreensSession.json()).toMatchObject({
        ok: false,
        error: "Walgreens checkout is not enabled."
      });

      const unauthenticatedAiChat = await postJson(
        port,
        "/api/ai/chat/respond",
        { customer_message: "Can you warm this up?", recipient_name: "Sara" },
        { "X-Idempotency-Key": "ai-chat-missing-auth" }
      );
      expect(unauthenticatedAiChat.status).toBe(401);
      expect(await unauthenticatedAiChat.json()).toMatchObject({
        status: "auth-required",
        requiredAuth: "customer-session"
      });

      const unauthenticatedAiCardGenerate = await postJson(
        port,
        "/api/ai/card/generate",
        {
          sender: "Maya",
          recipient: "Sara",
          relationship: "friends",
          occasion: "birthday",
          tone: "warm",
          style: "botanical",
          language: "English",
          memory_notes: []
        },
        { "X-Idempotency-Key": "ai-card-missing-auth" }
      );
      expect(unauthenticatedAiCardGenerate.status).toBe(401);
      expect(await unauthenticatedAiCardGenerate.json()).toMatchObject({
        status: "auth-required",
        requiredAuth: "customer-session"
      });

      const wrongRoleAiChat = await postJson(
        port,
        "/api/ai/chat/respond",
        { customer_message: "Can you warm this up?", recipient_name: "Sara" },
        {
          ...bearer(adminToken),
          "X-Idempotency-Key": "ai-chat-wrong-role"
        }
      );
      expect(wrongRoleAiChat.status).toBe(403);
      expect(await wrongRoleAiChat.json()).toMatchObject({
        status: "wrong-role",
        requiredAuth: "customer-session"
      });

      const customerAiChat = await postJson(
        port,
        "/api/ai/chat/respond",
        {
          customer_message: "Can you make this feel warmer?",
          recipient_name: "Sara",
          approved_memory_notes: ["She likes botanical cards."],
          locale: "en-US",
          aiFlowConfig: [{ flowId: "customer-chat", liveProviderCallsEnabled: true }]
        },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "ai-chat-customer-session"
        }
      );
      expect(customerAiChat.status).toBe(200);
      expect(await customerAiChat.json()).toMatchObject({
        assistant_message: expect.stringContaining("Sara"),
        live_provider_calls_enabled: false,
        external_network_calls: false
      });

      const wrongRoleCouponEvidence = await postJson(
        port,
        "/api/retail-printers/coupon-portal-evidence",
        { evidenceArtifact: walgreensPortalEvidenceArtifact() },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "coupon-portal-evidence-wrong-role"
        }
      );
      expect(wrongRoleCouponEvidence.status).toBe(403);
      expect(await wrongRoleCouponEvidence.json()).toMatchObject({
        status: "wrong-role",
        requiredAuth: "admin-session"
      });

      const missingCouponEvidence = await postJson(
        port,
        "/api/retail-printers/coupon-portal-evidence",
        {},
        {
          ...bearer(adminToken),
          "X-Idempotency-Key": "coupon-portal-evidence-missing"
        }
      );
      expect(missingCouponEvidence.status).toBe(400);
      expect(await missingCouponEvidence.json()).toMatchObject({
        status: "invalid-retail-printer-coupon-portal-evidence-payload",
        route: "retail-printer-coupon-portal-evidence",
        requiredFields: expect.arrayContaining(["evidenceArtifact"]),
        rawContentStored: false
      });

      const couponEvidence = await postJson(
        port,
        "/api/retail-printers/coupon-portal-evidence",
        { evidenceArtifact: walgreensPortalEvidenceArtifact() },
        {
          ...bearer(adminToken),
          "X-Idempotency-Key": "coupon-portal-evidence-valid"
        }
      );
      expect(couponEvidence.status).toBe(202);
      expect(await couponEvidence.json()).toMatchObject({
        status: "accepted",
        route: "retail-printer-coupon-portal-evidence",
        runtimeMode: "memory",
        authenticatedUserId: "admin-demo",
        serverOwned: true,
        clientMayPrepareProviderRequest: false,
        providerRequestPrepared: false,
        networkRequestPrepared: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false,
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
        repository: {
          tables: ["auth_sessions", "idempotency_keys", "audit_log"],
          runtimeMode: "contract",
          persisted: false,
          providerPayloadPrepared: false,
          realOrdersEnabled: false
        },
        persistedTables: expect.arrayContaining(["idempotency_keys", "audit_log"])
      });

      const missingAuth = await fetch(`http://127.0.0.1:${port}/api/render-packets`, { method: "POST" });
      expect(missingAuth.status).toBe(401);

      const missingIdempotency = await postJson(port, "/api/render-packets", { projectId: "project-memory-api" }, bearer(customerToken));
      expect(missingIdempotency.status).toBe(400);
      expect(await missingIdempotency.json()).toMatchObject({ status: "idempotency-key-required" });

      const missingImportMetadata = await postJson(
        port,
        "/api/import-preview",
        { sourceKind: "manual-ics" },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "import-preview-missing-metadata"
        }
      );
      expect(missingImportMetadata.status).toBe(400);
      expect(await missingImportMetadata.json()).toMatchObject({
        status: "invalid-import-preview-payload",
        route: "import-preview",
        requiredFields: expect.arrayContaining([
          "sourceKind",
          "metadataOnlyPayload.title",
          "metadataOnlyPayload.recipientName",
          "metadataOnlyPayload.startsAt"
        ])
      });

      const rawInvitePreview = await postJson(
        port,
        "/api/import-preview",
        {
          sourceKind: "manual-invite",
          rawInviteText: "Birthday brunch for Mom on 2030-07-12 at Queens, NY.",
          connectionId: "connection-memory-raw-invite",
          eventId: "event-memory-raw-invite",
          opportunityId: "opportunity-memory-raw-invite"
        },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "import-preview-raw-invite"
        }
      );
      expect(rawInvitePreview.status).toBe(202);
      expect(await rawInvitePreview.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        repositoryPersisted: true,
        rawContentStored: false,
        importParser: {
          parsedFromRawText: true,
          rawTextField: "rawInviteText",
          rawContentStored: false,
          evidenceSummary: expect.arrayContaining(["Plain invite text detected"])
        },
        opportunities: [
          expect.objectContaining({
            opportunityId: "opportunity-memory-raw-invite",
            eventId: "event-memory-raw-invite",
            recipientName: "Mom",
            startsAt: "2030-07-12T00:00:00.000Z",
            decision: "generate"
          })
        ]
      });

      const missingRenderPacketProject = await postJson(
        port,
        "/api/render-packets",
        {},
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "render-packets-missing-project"
        }
      );
      expect(missingRenderPacketProject.status).toBe(400);
      expect(await missingRenderPacketProject.json()).toMatchObject({
        status: "invalid-render-packets-payload",
        route: "render-packets",
        requiredFields: expect.arrayContaining(["projectId"])
      });

      const missingManualHandoffFields = await postJson(
        port,
        "/api/vendor-handoff/manual",
        { projectId: "project-memory-api" },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "vendor-handoff-missing-fields"
        }
      );
      expect(missingManualHandoffFields.status).toBe(400);
      expect(await missingManualHandoffFields.json()).toMatchObject({
        status: "invalid-manual-vendor-handoff-payload",
        route: "manual-vendor-handoff",
        requiredFields: expect.arrayContaining(["projectId", "renderPacketId", "vendorId", "externalShareApproval"])
      });

      const missingMemoryReviewFields = await postJson(
        port,
        "/api/memories/review",
        { recipientName: "Sara" },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "relationship-memories-missing-fields"
        }
      );
      expect(missingMemoryReviewFields.status).toBe(400);
      expect(await missingMemoryReviewFields.json()).toMatchObject({
        status: "invalid-relationship-memories-payload",
        route: "relationship-memories",
        requiredFields: expect.arrayContaining(["recipientName", "text", "decision"])
      });

      const missingCardProjectRecipient = await postJson(
        port,
        "/api/card-projects",
        { opportunityId: "opportunity-memory-api" },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "card-projects-missing-recipient"
        }
      );
      expect(missingCardProjectRecipient.status).toBe(400);
      expect(await missingCardProjectRecipient.json()).toMatchObject({
        status: "invalid-card-projects-payload",
        route: "card-projects",
        requiredFields: expect.arrayContaining(["opportunityId", "recipientName"])
      });

      const missingDataRequestFields = await postJson(
        port,
        "/api/data-requests",
        { requestType: "delete" },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "data-requests-missing-fields"
        }
      );
      expect(missingDataRequestFields.status).toBe(400);
      expect(await missingDataRequestFields.json()).toMatchObject({
        status: "invalid-data-requests-payload",
        route: "data-requests",
        requiredFields: expect.arrayContaining(["requestType", "region", "consentGranted"])
      });

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
        importParser: {
          parsedFromRawText: false,
          rawContentStored: false
        },
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
      const dataRequestPayload = await dataRequest.json();
      // The server sets the deadline; the client-supplied dueAt must be ignored.
      expect(dataRequestPayload.dueAt).not.toBe("2030-01-31T00:00:00.000Z");
      expect(new Date(dataRequestPayload.dueAt).getTime()).toBeGreaterThan(Date.now());
      expect(dataRequestPayload).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        repositoryPersisted: true,
        dataRequestId: "data-request-memory-api",
        requestType: "delete",
        requestStatus: "pending_verification",
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
        idempotencyRecords: 9,
        auditRecords: 9,
        queuedJobs: 2,
        providerConnectionRecords: 2,
        importedEventRecords: 2,
        cardOpportunityRecords: 2,
        relationshipMemoryRecords: 1,
	        cardProjectRecords: 1,
	        renderPacketRecords: 1,
	        providerCallEventRecords: 1,
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

  it("completes Google Calendar OAuth callback and imports metadata-only events", async () => {
    const google = await startFakeGoogleCalendarServer();
    const port = 6250 + Math.floor(Math.random() * 500);
    const customerToken = "google-calendar-customer-token";
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: customerToken,
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "google-calendar-admin-token",
        GOOGLE_OAUTH_CLIENT_ID: "test-google-calendar-client.apps.googleusercontent.com",
        GOOGLE_OAUTH_CLIENT_SECRET: "test-google-calendar-secret",
        GOOGLE_OAUTH_REDIRECT_URI: `http://127.0.0.1:${port}/oauth/callback`,
        GOOGLE_OAUTH_STATE_SECRET: "test-google-oauth-state-secret-32-chars",
        GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: "test-google-oauth-token-key-32-chars",
        GOOGLE_OAUTH_TOKEN_ENDPOINT: `http://127.0.0.1:${google.port}/token`,
        GOOGLE_CALENDAR_EVENTS_ENDPOINT: `http://127.0.0.1:${google.port}/calendar/v3/calendars/primary/events`
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApi(port, server);
      const startResponse = await postJson(
        port,
        "/api/calendar/connections/start",
        { calendarChoiceId: "google-calendar-events", returnTo: `http://127.0.0.1:${port}/?view=opportunities` },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "google-calendar-start-live"
        }
      );
      expect(startResponse.status).toBe(202);
      const startPayload = await startResponse.json();
      const providerUrl = new URL(startPayload.providerRequestUrl);
      expect(providerUrl.host).toBe("accounts.google.com");
      expect(providerUrl.searchParams.get("redirect_uri")).toBe(`http://127.0.0.1:${port}/oauth/callback`);
      expect(providerUrl.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/calendar.events.readonly");
      expect(providerUrl.searchParams.get("code_challenge_method")).toBe("S256");
      expect(providerUrl.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const callbackResponse = await fetch(
        `http://127.0.0.1:${port}/oauth/callback?code=fake-auth-code&state=${encodeURIComponent(providerUrl.searchParams.get("state") ?? "")}`,
        { headers: { Accept: "application/json" } }
      );
      expect(callbackResponse.status).toBe(200);
      const callbackPayload = await callbackResponse.json();
      expect(callbackPayload).toMatchObject({
        status: "google-calendar-connected",
        importedEventCount: 3,
        opportunityCount: 3,
        credentialStorageEnabled: true,
        rawContentStored: false,
        calendarConnection: expect.objectContaining({
          provider: "google_calendar",
          status: "connected",
          credentialStorageEnabled: true,
          rawContentStored: false
        }),
        importedEvents: [
          expect.objectContaining({
            title: "Nadia birthday dinner",
            timezone: "America/New_York",
            sourceEvidence: "Google Calendar metadata: title and start time."
          }),
          expect.objectContaining({
            title: "Papa's birthday"
          }),
          expect.objectContaining({
            title: "Happy birthday!"
          })
        ],
        opportunities: [
          expect.objectContaining({ recipientName: "Nadia", decision: "pending" }),
          expect.objectContaining({ recipientName: "Papa", decision: "pending" }),
          expect.objectContaining({ recipientName: "Someone important", decision: "pending" })
        ],
        repository: expect.objectContaining({
          runtimeMode: "memory",
          persisted: true,
          rawContentStored: false,
          providerCredentialsStored: true
        })
      });
      const serialized = JSON.stringify(callbackPayload);
      expect(serialized).not.toContain("This raw description must not be stored");
      expect(serialized).not.toContain("fake-google-refresh-token");
      expect(serialized).not.toContain("Papa's\",");
      expect(serialized).not.toContain("Happy !");
      expect(google.requests).toEqual(expect.arrayContaining(["POST /token", "GET /calendar/v3/calendars/primary/events"]));
      expect(new URLSearchParams(google.tokenRequestBodies[0]).get("code_verifier")).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const health = await getJson(port, "/api/health");
      expect(health.runtime).toMatchObject({
        mode: "memory",
        providerConnectionRecords: 1,
        importedEventRecords: 3,
        cardOpportunityRecords: 3
      });
    } finally {
      server.kill();
      await waitForExit(server);
      await closeServer(google.server);
    }
  }, 30_000);

  it("persists render artifacts to the configured object store and serves signed downloads", async () => {
    const port = 6300 + Math.floor(Math.random() * 1000);
    const customerToken = "test-customer-session-token";
    const adminToken = "test-admin-session-token";
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: customerToken,
        CUSTOMCARD_ADMIN_SESSION_TOKEN: adminToken,
        CUSTOMCARD_ARTIFACT_PERSISTENCE: "enabled",
        OBJECT_STORE_URL: "memory://cloudflare-r2",
        OBJECT_STORE_BUCKET: "customcard-prod",
        OBJECT_STORE_ACCESS_KEY_ID: "write-key",
        OBJECT_STORE_SECRET_ACCESS_KEY: "write-secret",
        OBJECT_STORE_READ_ACCESS_KEY_ID: "read-key",
        OBJECT_STORE_READ_SECRET_ACCESS_KEY: "read-secret",
        OBJECT_STORE_REGION: "auto",
        OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
        OBJECT_STORE_PUBLIC_BASE_URL: `http://127.0.0.1:${port}/api/artifacts`
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApi(port, server);
      const response = await postJson(
        port,
        "/api/render-packets",
        {
          projectId: "project-r2-api",
          renderPacketId: "render-packet-r2-api",
          artifacts: [
            {
              kind: "panel-svg",
              fileName: "front.svg",
              mimeType: "image/svg+xml",
              text: "<svg viewBox=\"0 0 1500 2100\"><text>Stored card</text></svg>",
              panelId: "front"
            }
          ]
        },
        {
          ...bearer(customerToken),
          "X-Idempotency-Key": "render-packets-r2-store"
        }
      );
      expect(response.status).toBe(202);
      const payload = await response.json();
      expect(payload).toMatchObject({
        runtimeMode: "memory",
        repositoryPersisted: true,
        artifactManifest: expect.objectContaining({
          storageProvider: "s3-compatible",
          bucket: "customcard-prod",
          persistenceStatus: "stored",
          liveNetworkCalls: false,
          blockers: []
        }),
        artifactPersistence: {
          status: "stored",
          storageProvider: "s3-compatible",
          provider: "memory-s3-compatible",
          bucket: "customcard-prod",
          artifactCount: 1,
          verifiedWrites: 1,
          manifestStored: true,
          liveNetworkCalls: false,
          blockers: []
        },
        signedArtifactUrls: [expect.objectContaining({ method: "GET", signatureVersion: "hmac-sha256-v1" })]
      });

      const artifactResponse = await fetch(payload.signedArtifactUrls[0].url);
      expect(artifactResponse.status).toBe(200);
      expect(artifactResponse.headers.get("content-type")).toBe("image/svg+xml");
      expect(await artifactResponse.text()).toContain("Stored card");

      const bucket = await getJson(
        port,
        "/api/admin/artifacts/bucket?prefix=projects/project-r2-api&limit=10",
        bearer(adminToken)
      );
      expect(bucket).toMatchObject({
        service: "customcard-api",
        status: "ready",
        objectStore: {
          provider: "memory-s3-compatible",
          bucket: "customcard-prod",
          credentialMode: "write-read-split"
        },
        objectCount: 2,
        blockers: []
      });
      expect(bucket.objects.map((object: { objectKey: string }) => object.objectKey)).toEqual([
        "projects/project-r2-api/render-packets/render-packet-r2-api/artifact-handoff-manifest.json",
        "projects/project-r2-api/render-packets/render-packet-r2-api/front.svg"
      ]);
      expect(JSON.stringify(bucket)).not.toContain("write-secret");
      expect(JSON.stringify(bucket)).not.toContain("read-secret");
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

async function startFakeGoogleCalendarServer(): Promise<{ port: number; server: Server; requests: string[]; tokenRequestBodies: string[] }> {
  const requests: string[] = [];
  const tokenRequestBodies: string[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    requests.push(`${request.method} ${url.pathname}`);
    if (request.method === "POST" && url.pathname === "/token") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => {
        body += chunk;
      });
      request.on("end", () => {
        tokenRequestBodies.push(body);
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(
          JSON.stringify({
            access_token: "fake-google-access-token",
            refresh_token: "fake-google-refresh-token",
            expires_in: 3600,
            token_type: "Bearer",
            scope: "https://www.googleapis.com/auth/calendar.events.readonly"
          })
        );
      });
      return;
    }
    if (request.method === "GET" && url.pathname === "/calendar/v3/calendars/primary/events") {
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          items: [
            {
              id: "google-event-1",
              summary: "Nadia birthday dinner",
              start: {
                dateTime: "2026-07-24T18:30:00-04:00",
                timeZone: "America/New_York"
              },
              description: "This raw description must not be stored or returned."
            },
            {
              id: "google-event-2",
              summary: "Papa's birthday",
              start: {
                date: "2027-05-02",
                timeZone: "America/New_York"
              }
            },
            {
              id: "google-event-3",
              summary: "Happy birthday!",
              start: {
                date: "2026-09-12",
                timeZone: "America/New_York"
              }
            }
          ]
        })
      );
      return;
    }
    response.statusCode = 404;
    response.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fake Google server did not expose a port.");
  return { port: address.port, server, requests, tokenRequestBodies };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
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

async function waitForApiPort(port: number, server: ChildProcess): Promise<void> {
  let stderr = "";
  server.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited early: ${stderr}`);
    }
    try {
      await fetch(`http://127.0.0.1:${port}/api/health`);
      return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`API server did not open a port: ${stderr}`);
}

async function waitForExit(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    server.once("exit", () => resolve());
    setTimeout(() => resolve(), 1000);
  });
}
