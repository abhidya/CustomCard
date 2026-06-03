import { createApiRuntime, hashSessionToken } from "./api-runtime.mjs";

const routes = [
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "import-preview", method: "POST", path: "/api/import-preview", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "card-projects", method: "POST", path: "/api/card-projects", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" }
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
    bodyText: JSON.stringify({ projectId: "project-postgres-contract" }),
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
  expect(result.payload.persistedTables.includes("api_jobs"), "queue-backed route should include api_jobs");
  expect(fakeDb.idempotencyRecords.size === 1, "idempotency record should be inserted");
  expect(fakeDb.auditRecords.length === 1, "audit record should be inserted");
  expect(fakeDb.jobs.length === 1, "queue-backed route should insert an api job");
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

await runCheck("replays matching idempotent mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({ projectId: "project-postgres-contract" }),
    responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
  });

  expect(result.statusCode === 202, "replay should return accepted status");
  expect(result.payload.idempotencyReplayed, "replay should mark idempotencyReplayed");
  expect(fakeDb.idempotencyRecords.size === 3, "replay must not insert another idempotency record");
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
    cardProjects: fakeDb.cardProjects.length
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
