import { createApiRuntime, hashSessionToken } from "./api-runtime.mjs";

const routes = [
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "import-preview", method: "POST", path: "/api/import-preview", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "card-projects", method: "POST", path: "/api/card-projects", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "manual-vendor-handoff", method: "POST", path: "/api/vendor-handoff/manual", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "data-requests", method: "POST", path: "/api/data-requests", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" }
];

const customerToken = "postgres-customer-session-token";
const adminToken = "postgres-admin-session-token";
const fakeDb = createFakePostgresState({ customerToken, adminToken });
const runtime = createApiRuntime({
  env: {
    CUSTOMCARD_API_RUNTIME: "postgres",
    DATABASE_URL: "postgres://contract-only/customcard"
  },
  routes,
  postgresPoolFactory: () => fakeDb.pool
});

const blockers = [];
const checks = [];

await runCheck("runtime validates postgres configuration", async () => {
  expect(runtime.mode === "postgres", "runtime mode should be postgres");
  expect(runtime.validate().length === 0, "postgres runtime should have no validation blockers");
  expect(runtime.describe().postgresConfigured, "postgres runtime should report DATABASE_URL configured");
});

const customerAuth = await runCheck("authorizes customer sessions from auth_sessions", async () => {
  const auth = await runtime.authorize(route("render-packets"), request({ token: customerToken }));
  expect(auth.ok, "customer auth should pass");
  expect(auth.userId === "user-demo", "customer auth should return the user id from auth_sessions");
  return auth;
});

await runCheck("blocks wrong-role sessions before admin routes", async () => {
  const auth = await runtime.authorize(route("admin-readiness"), request({ token: customerToken }));
  expect(!auth.ok, "customer token must not authorize admin route");
  expect(auth.statusCode === 403, "wrong role should return 403");
});

await runCheck("persists idempotent queue-backed mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      renderPacketId: "render-packet-postgres-contract",
      locale: "ar-AE"
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "render-packets",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "first mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "mutation should report postgres runtime");
  expect(result.payload.idempotencyPersisted, "mutation should persist idempotency");
  expect(result.payload.repositoryPersisted, "render-packet mutation should persist through repository path");
  expect(result.payload.renderPacketId === "render-packet-postgres-contract", "render-packet response should include persisted id");
  expect(result.payload.artifactManifest.direction === "rtl", "Arabic render packet should be RTL");
  expect(result.payload.persistedTables.includes("api_jobs"), "queue-backed route should include api_jobs");
  expect(fakeDb.idempotencyRecords.size === 1, "idempotency record should be inserted");
  expect(fakeDb.auditRecords.length === 1, "audit record should be inserted");
  expect(fakeDb.jobs.length === 1, "queue-backed route should insert an api job");
  expect(fakeDb.renderPackets.length === 1, "render_packets row should be inserted");
});

await runCheck("persists repository-backed import preview mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("import-preview"),
    request: request({ token: customerToken, idempotencyKey: "import-preview-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      sourceKind: "manual-ics",
      connectionId: "connection-postgres-contract",
      eventId: "event-postgres-contract",
      opportunityId: "opportunity-postgres-contract",
      metadataOnlyPayload: {
        title: "Anniversary dinner",
        recipientName: "Sara",
        startsAt: "2030-06-03T18:00:00.000Z",
        timezone: "America/New_York",
        confidence: 0.96
      }
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "import-preview",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "import-preview mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "import-preview mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "import-preview mutation should persist through repository path");
  expect(result.payload.rawContentStored === false, "import-preview must keep raw content storage disabled");
  expect(result.payload.opportunities[0].opportunityId === "opportunity-postgres-contract", "import-preview should return the persisted opportunity id");
  expect(fakeDb.providerConnections.length === 1, "provider_connections row should be inserted");
  expect(fakeDb.importedEvents.length === 1, "imported_events row should be inserted");
  expect(fakeDb.cardOpportunities.length === 1, "card_opportunities row should be inserted");
});

await runCheck("persists repository-backed card project mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("card-projects"),
    request: request({ token: customerToken, idempotencyKey: "card-projects-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      opportunityId: "opportunity-postgres-contract",
      recipientName: "Sara",
      locale: "ar-AE",
      approvedMemoryIds: ["memory-postgres-contract"]
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "card-projects",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "card-project mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "card-project mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "card-project mutation should persist through repository path");
  expect(result.payload.projectId === "project-postgres-contract", "card-project response should include the persisted project id");
  expect(result.payload.requiresRtlLayout, "Arabic locale should require RTL layout");
  expect(fakeDb.cardProjects.length === 1, "card_projects row should be inserted");
});

await runCheck("persists repository-backed manual vendor handoff mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("manual-vendor-handoff"),
    request: request({ token: customerToken, idempotencyKey: "vendor-handoff-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      renderPacketId: "render-packet-postgres-contract",
      storeId: "walgreens-store-042",
      region: "US",
      externalShareApproval: true
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "manual-vendor-handoff",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "manual vendor handoff mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "manual vendor handoff mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "manual vendor handoff should persist through repository path");
  expect(result.payload.handoffStatus === "vendor_handoff_ready", "approved handoff should be marked ready for manual upload");
  expect(result.payload.repository.tables.includes("orders"), "manual handoff repository payload should include orders");
  expect(fakeDb.orders.length === 1, "orders row should be inserted");
  expect(fakeDb.orderEvents.length === 1, "order_events row should be inserted");
  expect(fakeDb.consentRecords.length === 1, "consent_records row should be inserted");
});

await runCheck("persists repository-backed data request mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("data-requests"),
    request: request({ token: customerToken, idempotencyKey: "data-requests-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      requestId: "data-request-postgres-contract",
      requestType: "delete",
      region: "US",
      dueAt: "2030-01-31T00:00:00.000Z",
      requestConfirmed: true
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "data-requests",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "data-request mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "data-request mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "data-request should persist through repository path");
  expect(result.payload.requestType === "delete", "data-request response should include request type");
  expect(result.payload.privacyControls.deletionRequiresRetentionReview, "delete requests should require retention review");
  expect(fakeDb.dataRequests.length === 1, "data_requests row should be inserted");
  expect(fakeDb.consentRecords.length === 2, "data-request consent row should be inserted");
});

await runCheck("replays matching idempotent mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      renderPacketId: "render-packet-postgres-contract",
      locale: "ar-AE"
    }),
    responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
  });

  expect(result.statusCode === 202, "replay should return accepted status");
  expect(result.payload.idempotencyReplayed, "replay should mark idempotencyReplayed");
  expect(fakeDb.idempotencyRecords.size === 5, "replay must not insert another idempotency record");
});

await runCheck("rejects idempotency conflicts", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({ projectId: "changed-project" }),
    responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
  });

  expect(result.statusCode === 409, "changed body with same idempotency key should conflict");
  expect(result.payload.status === "idempotency-conflict", "conflict payload should be explicit");
});

const report = {
  service: "customcard-postgres-runtime-doctor",
  status: blockers.length === 0 ? "ready" : "blocked",
  runtime: runtime.describe(),
  persistence: {
    authSessionQueries: fakeDb.authSessionQueries,
    idempotencyRecords: fakeDb.idempotencyRecords.size,
    auditRecords: fakeDb.auditRecords.length,
    queuedJobs: fakeDb.jobs.length,
    providerConnections: fakeDb.providerConnections.length,
    importedEvents: fakeDb.importedEvents.length,
    cardOpportunities: fakeDb.cardOpportunities.length,
    cardProjects: fakeDb.cardProjects.length,
    renderPackets: fakeDb.renderPackets.length,
    orders: fakeDb.orders.length,
    orderEvents: fakeDb.orderEvents.length,
    consentRecords: fakeDb.consentRecords.length,
    dataRequests: fakeDb.dataRequests.length
  },
  checks,
  blockers
};

console.log(JSON.stringify(report, null, 2));
if (blockers.length > 0) process.exit(1);

async function runCheck(id, fn) {
  try {
    const value = await fn();
    checks.push({ id, passed: true });
    return value;
  } catch (error) {
    blockers.push({
      id,
      detail: error instanceof Error ? error.message : String(error)
    });
    checks.push({ id, passed: false });
    return undefined;
  }
}

function route(id) {
  const found = routes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing route in postgres runtime doctor: ${id}`);
  return found;
}

function request({ token, idempotencyKey }) {
  return {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {})
    }
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function createFakePostgresState({ customerToken, adminToken }) {
  const sessions = new Map([
    [
      hashSessionToken(customerToken),
      {
        session_id: "session-user-demo",
        user_id: "user-demo",
        role: "customer",
        email: "customer@example.test"
      }
    ],
    [
      hashSessionToken(adminToken),
      {
        session_id: "session-admin-demo",
        user_id: "admin-demo",
        role: "admin",
        email: "admin@example.test"
      }
    ]
  ]);
  const state = {
    sessions,
    idempotencyRecords: new Map(),
    auditRecords: [],
    jobs: [],
    providerConnections: [],
    importedEvents: [],
    cardOpportunities: [],
    cardProjects: [],
    renderPackets: [],
    orders: [],
    orderEvents: [],
    consentRecords: [],
    dataRequests: [],
    authSessionQueries: 0,
    pool: undefined
  };

  state.pool = {
    async query(sql, params) {
      if (sql.includes("FROM auth_sessions")) {
        state.authSessionQueries += 1;
        return { rows: state.sessions.has(params[0]) ? [state.sessions.get(params[0])] : [] };
      }
      throw new Error(`Unexpected pool query: ${compactSql(sql)}`);
    },
    async connect() {
      return createFakeClient(state);
    }
  };

  return state;
}

function createFakeClient(state) {
  return {
    async query(sql, params = []) {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [], rowCount: 0 };

      if (sql.includes("FROM idempotency_keys")) {
        const record = state.idempotencyRecords.get(idempotencyRecordKey(params[0], params[1], params[2]));
        return {
          rows: record ? [{ request_hash: record.requestHash, response_body: record.responseBody, status: record.status }] : [],
          rowCount: record ? 1 : 0
        };
      }

      if (sql.includes("INSERT INTO idempotency_keys")) {
        const key = idempotencyRecordKey(params[1], params[2], params[3]);
        if (state.idempotencyRecords.has(key)) return { rows: [], rowCount: 0 };
        state.idempotencyRecords.set(key, {
          id: params[0],
          userId: params[1],
          routeId: params[2],
          idempotencyKey: params[3],
          requestHash: params[4],
          responseBody: JSON.parse(params[5]),
          status: "completed"
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO audit_log")) {
        state.auditRecords.push({ routeId: params[0], actorId: params[1], metadata: JSON.parse(params[2]) });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO provider_connections")) {
        state.providerConnections.push({
          id: params[0],
          userId: params[1],
          provider: params[2],
          scopes: params[3],
          adapterVersion: params[4],
          metadataSchema: JSON.parse(params[5])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO imported_events")) {
        state.importedEvents.push({
          id: params[0],
          connectionId: params[1],
          title: params[2],
          startsAt: params[3],
          timezone: params[4],
          sourceEvidence: params[5],
          recipientHint: params[6]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO card_opportunities")) {
        state.cardOpportunities.push({
          id: params[0],
          eventId: params[1],
          recipientName: params[2],
          leadTimeHours: params[3],
          confidence: params[4],
          decision: params[5],
          evidence: JSON.parse(params[6])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO card_projects")) {
        state.cardProjects.push({
          id: params[0],
          opportunityId: params[1],
          recipientName: params[2],
          locale: params[3],
          requiresRtlLayout: params[4],
          approvedMemoryIds: params[5]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO render_packets")) {
        state.renderPackets.push({
          id: params[0],
          projectId: params[1],
          kind: params[2],
          width: params[3],
          height: params[4],
          dpi: params[5],
          locale: params[6],
          direction: params[7],
          safeZonePassed: params[8],
          textOverflow: params[9],
          checksum: params[10],
          artifactUri: params[11],
          storageProvider: params[12],
          artifactCount: params[13],
          artifactManifest: JSON.parse(params[14]),
          signedUrlExpiresAt: params[15],
          externalShareApprovalRequired: params[16]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO orders")) {
        state.orders.push({
          id: params[0],
          projectId: params[1],
          status: params[2],
          storeId: params[3],
          quoteCents: params[4],
          pickupWindowMinutes: params[5],
          recoveryActions: JSON.parse(params[6])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO order_events")) {
        state.orderEvents.push({
          orderId: params[0],
          eventType: params[1],
          payload: JSON.parse(params[2])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO data_requests")) {
        state.dataRequests.push({
          id: params[0],
          userId: params[1],
          requestType: params[2],
          status: params[3],
          dueAt: params[4]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO consent_records")) {
        state.consentRecords.push({
          id: params[0],
          userId: params[1],
          action: params[2],
          region: params[3],
          granted: params[4],
          controls: JSON.parse(params[5])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO api_jobs")) {
        state.jobs.push({
          id: params[0],
          userId: params[1],
          routeId: params[2],
          idempotencyId: params[3],
          payload: JSON.parse(params[4])
        });
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Unexpected client query: ${compactSql(sql)}`);
    },
    release() {
      return undefined;
    }
  };
}

function idempotencyRecordKey(userId, routeId, idempotencyKey) {
  return `${userId}:${routeId}:${idempotencyKey}`;
}

function compactSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}
