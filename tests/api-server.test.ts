import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { describe, expect, it } from "vitest";

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
    expect(report.readiness.providers.total).toBeGreaterThanOrEqual(87);
    expect(report.readiness.providerGovernance).toMatchObject({
      total: 87,
      budgetCapped: 63,
      blockedZeroSpend: 6,
      fallbackCovered: 87,
      liveNetworkDefault: false,
      realOrdersEnabled: false,
      blockers: []
    });
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
      expect(readiness.providers).toMatchObject({ total: 87, readyLocal: 16, credentialGated: 56, blocked: 6 });
      expect(readiness.providerGovernance).toMatchObject({
        total: 87,
        fallbackCovered: 87,
        budgetCapped: 63,
        liveNetworkDefault: false,
        realOrdersEnabled: false,
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
        total: 87,
        monthlyBudgetCents: 101800,
        maxPerRequestBudgetCents: 75,
        rateLimited: 81,
        queueRequired: 56,
        fallbackCovered: 87,
        liveNetworkDefault: false,
        realOrdersEnabled: false,
        blockers: []
      });

      const mobile = await getJson(port, "/api/mobile/bootstrap");
      expect(mobile.sections).toEqual(expect.arrayContaining(["card-queue", "text-chat", "handoff"]));
      expect(mobile.realOrdersEnabled).toBe(false);

      const customer = await getJson(port, "/api/customer/bootstrap");
      expect(customer.printerPricing).toMatchObject({
        selectedVendorId: "walgreens",
        liveQuote: false,
        sourceCount: 7,
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
      expect(customerBootstrap.printerPricing).toMatchObject({ liveQuote: false, sourceCount: 7 });

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
