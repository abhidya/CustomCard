import { readFile } from "node:fs/promises";
import pg from "pg";
import { createApiRuntime, hashSessionToken } from "./api-runtime.mjs";

const requiredGate = "enabled";
const guardValue = process.env.CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR;
const databaseUrl = process.env.DATABASE_URL;

if (guardValue !== requiredGate) {
  console.error("Set CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled to run the live Postgres integration doctor.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required for the live Postgres integration doctor.");
  process.exit(1);
}

const routes = [
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none", runtimeMode: "local-contract" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "import-preview", method: "POST", path: "/api/import-preview", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "calendar-connection-start", method: "POST", path: "/api/calendar/connections/start", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "retail-printer-operation-start", method: "POST", path: "/api/retail-printers/operations/start", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "card-projects", method: "POST", path: "/api/card-projects", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "relationship-memories", method: "POST", path: "/api/memories/review", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "manual-vendor-handoff", method: "POST", path: "/api/vendor-handoff/manual", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "data-requests", method: "POST", path: "/api/data-requests", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" }
];

const customerToken = "live-postgres-customer-session-token";
const adminToken = "live-postgres-admin-session-token";
const repositoryBackedCustomerRouteIds = [
  "import-preview",
  "relationship-memories",
  "card-projects",
  "render-packets",
  "manual-vendor-handoff",
  "data-requests"
];
const doctorDatabase = `customcard_doctor_${process.pid}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
const adminUrl = databaseUrl;
const doctorUrl = buildDatabaseUrl(databaseUrl, doctorDatabase);
const adminPool = new pg.Pool(poolConfig(adminUrl));
const blockers = [];
const checks = [];
const customerAuthContexts = new Map();
const verifiedCustomerRouteIds = new Set();
const verifiedAdminRouteIds = new Set();
let wrongRoleBlocked = false;
let finalRuntime = { mode: "postgres", postgresConfigured: Boolean(databaseUrl) };
let finalAuthVerification = buildAuthVerificationReport();
let finalPersistence = {
  idempotencyRecords: 0,
  auditRecords: 0,
  queuedJobs: 0,
  providerConnections: 0,
  importedEvents: 0,
  cardOpportunities: 0,
  relationshipMemories: 0,
  cardProjects: 0,
  renderPackets: 0,
  orders: 0,
  orderEvents: 0,
  consentRecords: 0,
  dataRequests: 0
};
let exitCode = 0;
let runtime;
let doctorPool;

try {
  await runCheck("connects to configured Postgres database", async () => {
    await waitForPostgres(adminPool);
  });

  await runCheck("creates isolated doctor database", async () => {
    await retryOperation(() => adminPool.query(`CREATE DATABASE ${quoteIdentifier(doctorDatabase)}`));
  });

  doctorPool = new pg.Pool(poolConfig(doctorUrl));
  try {
    await runCheck("connects to isolated doctor database", async () => {
      await waitForPostgres(doctorPool);
    });

    await runCheck("applies initial migration to live Postgres", async () => {
      const migrationSql = await readFile("infra/migrations/001_initial_schema.sql", "utf8");
      await doctorPool.query(migrationSql);
      const tables = await doctorPool.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
      );
      const tableNames = new Set(tables.rows.map((row) => row.table_name));
      for (const requiredTable of ["users", "auth_sessions", "provider_connections", "imported_events", "card_opportunities", "relationship_memories", "card_projects", "render_packets", "orders", "order_events", "consent_records", "data_requests", "idempotency_keys", "api_jobs", "audit_log"]) {
        expect(tableNames.has(requiredTable), `Migration did not create ${requiredTable}.`);
      }
    });

    await runCheck("seeds customer and admin auth sessions", async () => {
      await doctorPool.query(
        `INSERT INTO users (id, email, locale, region, platform)
         VALUES
           ('user-demo', 'customer@example.test', 'en-US', 'US', 'web'),
           ('admin-demo', 'admin@example.test', 'en-US', 'US', 'web')`
      );
      await doctorPool.query(
        `INSERT INTO auth_sessions (id, user_id, session_hash, role, expires_at)
         VALUES
           ('session-user-demo', 'user-demo', $1, 'customer', NOW() + INTERVAL '1 hour'),
           ('session-admin-demo', 'admin-demo', $2, 'admin', NOW() + INTERVAL '1 hour')`,
        [hashSessionToken(customerToken), hashSessionToken(adminToken)]
      );
    });

    runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "postgres",
        DATABASE_URL: doctorUrl
      },
      routes
    });

    await runCheck("authorizes real Postgres customer sessions for every repository-backed route", async () => {
      for (const routeId of repositoryBackedCustomerRouteIds) {
        const auth = await runtime.authorize(route(routeId), request({ token: customerToken }));
        expect(auth.ok, `Customer session should authorize ${routeId}.`);
        expect(auth.userId === "user-demo", `Customer auth for ${routeId} should return seeded user id.`);
        expect(auth.role === "customer", `Customer auth for ${routeId} should return customer role.`);
        customerAuthContexts.set(routeId, auth);
        verifiedCustomerRouteIds.add(routeId);
      }
    });

    await runCheck("authorizes real Postgres admin session", async () => {
      const auth = await runtime.authorize(route("admin-readiness"), request({ token: adminToken }));
      expect(auth.ok, "Admin session should authorize admin readiness.");
      expect(auth.userId === "admin-demo", "Admin auth should return seeded admin id.");
      expect(auth.role === "admin", "Admin auth should return admin role.");
      verifiedAdminRouteIds.add("admin-readiness");
    });

    await runCheck("blocks wrong-role real Postgres session", async () => {
      const auth = await runtime.authorize(route("admin-readiness"), request({ token: customerToken }));
      expect(!auth.ok, "Customer token must not authorize admin route.");
      expect(auth.statusCode === 403, "Wrong-role auth should return 403.");
      wrongRoleBlocked = true;
    });

    await runCheck("persists real Postgres import preview repository mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("import-preview"),
        request: request({ token: customerToken, idempotencyKey: "import-preview-live-postgres-0001" }),
        authContext: authContextForRoute("import-preview"),
        bodyText: JSON.stringify({
          sourceKind: "manual-ics",
          connectionId: "connection-live-postgres",
          eventId: "event-live-postgres",
          opportunityId: "opportunity-live-postgres",
          leadTimeHours: 240,
          rawImportText: [
            "BEGIN:VCALENDAR",
            "BEGIN:VEVENT",
            "SUMMARY:Anniversary dinner",
            "DTSTART;TZID=America/New_York:20300603T180000",
            "ATTENDEE;CN=Sara:mailto:sara@example.invalid",
            "DESCRIPTION:Private dinner note that must not be returned",
            "END:VEVENT",
            "END:VCALENDAR"
          ].join("\n")
        }),
        responsePayload: {
          service: "customcard-api",
          status: "accepted-contract-only",
          route: "import-preview",
          realOrdersEnabled: false,
          externalNetworkCalls: false
        }
      });
      expect(result.statusCode === 202, "Import-preview mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Import-preview mutation should use postgres runtime.");
      expect(result.payload.repositoryPersisted, "Import-preview mutation should persist through repository path.");
      expect(result.payload.rawContentStored === false, "Import-preview mutation must not store raw content.");
      expect(result.payload.importParser.parsedFromRawText, "Import-preview mutation should accept server-parsed raw ICS text.");
      expect(result.payload.importParser.rawContentStored === false, "Raw import parser must keep raw content storage disabled.");
      expect(result.payload.opportunities[0].opportunityId === "opportunity-live-postgres", "Import-preview response should return persisted opportunity id.");
      expect(result.payload.opportunities[0].startsAt === "2030-06-03T18:00:00.000Z", "Import-preview response should return parsed ICS start time.");
      expect(!JSON.stringify(result.payload).includes("Private dinner note"), "Import-preview response must not return raw private DESCRIPTION text.");
    });

    await runCheck("persists real Postgres relationship memory repository mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("relationship-memories"),
        request: request({ token: customerToken, idempotencyKey: "relationship-memories-live-postgres-0001" }),
        authContext: authContextForRoute("relationship-memories"),
        bodyText: JSON.stringify({
          memoryId: "memory-live-postgres",
          recipientName: "Sara",
          text: "Sara prefers quiet dinners.",
          sensitivity: "normal",
          locale: "en-US",
          decision: "approve"
        }),
        responsePayload: {
          service: "customcard-api",
          status: "accepted-contract-only",
          route: "relationship-memories",
          realOrdersEnabled: false,
          externalNetworkCalls: false
        }
      });
      expect(result.statusCode === 202, "Relationship-memory mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Relationship-memory mutation should use postgres runtime.");
      expect(result.payload.repositoryPersisted, "Relationship-memory mutation should persist through repository path.");
      expect(result.payload.memoryId === "memory-live-postgres", "Relationship-memory response should return persisted id.");
      expect(result.payload.memoryUseAllowed, "Approved relationship memory should be reusable.");
    });

    await runCheck("persists real Postgres card project repository mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("card-projects"),
        request: request({ token: customerToken, idempotencyKey: "card-projects-live-postgres-0001" }),
        authContext: authContextForRoute("card-projects"),
        bodyText: JSON.stringify({
          projectId: "project-live-postgres",
          opportunityId: "opportunity-live-postgres",
          recipientName: "Sara",
          locale: "en-US",
          approvedMemoryIds: ["memory-live-postgres"]
        }),
        responsePayload: {
          service: "customcard-api",
          status: "accepted-contract-only",
          route: "card-projects",
          realOrdersEnabled: false,
          externalNetworkCalls: false
        }
      });
      expect(result.statusCode === 202, "Card-project mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Card-project mutation should use postgres runtime.");
      expect(result.payload.repositoryPersisted, "Card-project mutation should persist through repository path.");
      expect(result.payload.projectId === "project-live-postgres", "Card-project response should return persisted project id.");
    });

    const renderPacketBody = {
      projectId: "project-live-postgres",
      renderPacketId: "render-packet-live-postgres",
      locale: "en-US"
    };
    await runCheck("persists real Postgres render packet repository mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("render-packets"),
        request: request({ token: customerToken, idempotencyKey: "render-packets-live-postgres-0001" }),
        authContext: authContextForRoute("render-packets"),
        bodyText: JSON.stringify(renderPacketBody),
        responsePayload: {
          service: "customcard-api",
          status: "accepted-contract-only",
          route: "render-packets",
          realOrdersEnabled: false,
          externalNetworkCalls: false
        }
      });
      expect(result.statusCode === 202, "Render-packet mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Render-packet mutation should use postgres runtime.");
      expect(result.payload.idempotencyPersisted, "Render-packet mutation should persist idempotency.");
      expect(result.payload.repositoryPersisted, "Render-packet mutation should persist through repository path.");
      expect(result.payload.renderPacketId === "render-packet-live-postgres", "Render-packet response should return persisted id.");
    });

    await runCheck("persists real Postgres manual vendor handoff repository mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("manual-vendor-handoff"),
        request: request({ token: customerToken, idempotencyKey: "vendor-handoff-live-postgres-0001" }),
        authContext: authContextForRoute("manual-vendor-handoff"),
        bodyText: JSON.stringify({
          projectId: "project-live-postgres",
          renderPacketId: "render-packet-live-postgres",
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
      expect(result.statusCode === 202, "Manual vendor handoff mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Manual vendor handoff mutation should use postgres runtime.");
      expect(result.payload.repositoryPersisted, "Manual vendor handoff mutation should persist through repository path.");
      expect(result.payload.handoffStatus === "vendor_handoff_ready", "Approved manual handoff should be ready for manual upload.");
      expect(result.payload.realOrdersEnabled === false, "Manual handoff must not enable real orders.");
    });

    await runCheck("persists real Postgres data request repository mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("data-requests"),
        request: request({ token: customerToken, idempotencyKey: "data-requests-live-postgres-0001" }),
        authContext: authContextForRoute("data-requests"),
        bodyText: JSON.stringify({
          requestId: "data-request-live-postgres",
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
      expect(result.statusCode === 202, "Data-request mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Data-request mutation should use postgres runtime.");
      expect(result.payload.repositoryPersisted, "Data-request mutation should persist through repository path.");
      expect(result.payload.requestType === "delete", "Data-request response should return request type.");
      expect(result.payload.privacyControls.deletionRequiresRetentionReview, "Delete request should require retention review.");
    });

    await runCheck("replays and conflicts real Postgres idempotency", async () => {
      const replay = await runtime.persistMutation({
        route: route("render-packets"),
        request: request({ token: customerToken, idempotencyKey: "render-packets-live-postgres-0001" }),
        authContext: authContextForRoute("render-packets"),
        bodyText: JSON.stringify(renderPacketBody),
        responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
      });
      expect(replay.statusCode === 202, "Replay should be accepted.");
      expect(replay.payload.idempotencyReplayed, "Replay should be marked.");

      const conflict = await runtime.persistMutation({
        route: route("render-packets"),
        request: request({ token: customerToken, idempotencyKey: "render-packets-live-postgres-0001" }),
        authContext: authContextForRoute("render-packets"),
        bodyText: JSON.stringify({ projectId: "changed-live-postgres" }),
        responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
      });
      expect(conflict.statusCode === 409, "Changed body should conflict.");
      expect(conflict.payload.status === "idempotency-conflict", "Conflict status should be explicit.");
    });

    const persistenceCounts = await readPersistenceCounts(doctorPool);
    await runCheck("records real Postgres audit and queue rows", async () => {
      expect(persistenceCounts.idempotencyRecords === 6, "Expected six idempotency records.");
      expect(persistenceCounts.auditRecords === 6, "Expected six audit records.");
      expect(persistenceCounts.queuedJobs === 2, "Expected two queued jobs.");
      expect(persistenceCounts.providerConnections === 1, "Expected one provider connection.");
      expect(persistenceCounts.importedEvents === 1, "Expected one imported event.");
      expect(persistenceCounts.cardOpportunities === 1, "Expected one card opportunity.");
      expect(persistenceCounts.relationshipMemories === 1, "Expected one relationship memory.");
      expect(persistenceCounts.cardProjects === 1, "Expected one card project.");
      expect(persistenceCounts.renderPackets === 1, "Expected one render packet.");
      expect(persistenceCounts.orders === 1, "Expected one manual handoff order.");
      expect(persistenceCounts.orderEvents === 1, "Expected one manual handoff order event.");
      expect(persistenceCounts.consentRecords === 2, "Expected two consent records.");
      expect(persistenceCounts.dataRequests === 1, "Expected one data request.");
    });

    finalRuntime = runtime.describe();
    finalAuthVerification = buildAuthVerificationReport();
    finalPersistence = persistenceCounts;
  } finally {
    await doctorPool.end().catch(() => undefined);
  }
} catch (error) {
  exitCode = 1;
  blockers.push({ id: "postgres-integration-doctor", detail: error instanceof Error ? error.message : String(error) });
} finally {
  if (runtime && typeof runtime.close === "function") {
    await runtime.close().catch((error) => {
      exitCode = 1;
      blockers.push({ id: "close-postgres-runtime", detail: error instanceof Error ? error.message : String(error) });
    });
  }
  await dropDoctorDatabase(adminPool, doctorDatabase).catch((error) => {
    exitCode = 1;
    blockers.push({ id: "drop-doctor-database", detail: error instanceof Error ? error.message : String(error) });
  });
  await adminPool.end().catch(() => undefined);
  printReport(exitCode === 0 ? "ready" : "blocked", finalRuntime, finalPersistence);
  if (exitCode !== 0) process.exit(exitCode);
}

async function readPersistenceCounts(pool) {
  const [idempotency, audit, jobs, providerConnections, importedEvents, cardOpportunities, relationshipMemories, cardProjects, renderPackets, orders, orderEvents, consentRecords, dataRequests] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM idempotency_keys"),
    pool.query("SELECT COUNT(*)::int AS count FROM audit_log"),
    pool.query("SELECT COUNT(*)::int AS count FROM api_jobs"),
    pool.query("SELECT COUNT(*)::int AS count FROM provider_connections"),
    pool.query("SELECT COUNT(*)::int AS count FROM imported_events"),
    pool.query("SELECT COUNT(*)::int AS count FROM card_opportunities"),
    pool.query("SELECT COUNT(*)::int AS count FROM relationship_memories"),
    pool.query("SELECT COUNT(*)::int AS count FROM card_projects"),
    pool.query("SELECT COUNT(*)::int AS count FROM render_packets"),
    pool.query("SELECT COUNT(*)::int AS count FROM orders"),
    pool.query("SELECT COUNT(*)::int AS count FROM order_events"),
    pool.query("SELECT COUNT(*)::int AS count FROM consent_records"),
    pool.query("SELECT COUNT(*)::int AS count FROM data_requests")
  ]);
  return {
    idempotencyRecords: idempotency.rows[0].count,
    auditRecords: audit.rows[0].count,
    queuedJobs: jobs.rows[0].count,
    providerConnections: providerConnections.rows[0].count,
    importedEvents: importedEvents.rows[0].count,
    cardOpportunities: cardOpportunities.rows[0].count,
    relationshipMemories: relationshipMemories.rows[0].count,
    cardProjects: cardProjects.rows[0].count,
    renderPackets: renderPackets.rows[0].count,
    orders: orders.rows[0].count,
    orderEvents: orderEvents.rows[0].count,
    consentRecords: consentRecords.rows[0].count,
    dataRequests: dataRequests.rows[0].count
  };
}

async function dropDoctorDatabase(pool, databaseName) {
  await pool.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName]
  );
  await retryOperation(() => pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`));
}

async function retryOperation(operation) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, attempt * 150));
    }
  }
  throw lastError;
}

async function waitForPostgres(pool) {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, attempt * 100));
    }
  }
  throw lastError;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAuthVerificationReport() {
  const customerRouteIds = [...verifiedCustomerRouteIds].sort();
  const adminRouteIds = [...verifiedAdminRouteIds].sort();
  return {
    authSessionTable: true,
    customerRepositoryRoutes: customerRouteIds.length,
    expectedCustomerRepositoryRoutes: repositoryBackedCustomerRouteIds.length,
    customerRepositoryRouteIds: customerRouteIds,
    adminRoutes: adminRouteIds.length,
    adminRouteIds,
    wrongRoleBlocked
  };
}

function authContextForRoute(routeId) {
  const authContext = customerAuthContexts.get(routeId);
  if (!authContext) throw new Error(`Missing authorized customer auth context for ${routeId}.`);
  return authContext;
}

function printReport(status, runtime, persistence) {
  console.log(
    JSON.stringify(
      {
        service: "customcard-postgres-integration-doctor",
        status: blockers.length === 0 ? status : "blocked",
        database: {
          isolatedDatabase: doctorDatabase,
          migrationApplied: checks.some((check) => check.id === "applies initial migration to live Postgres" && check.passed)
        },
        runtime,
        authVerification: finalAuthVerification,
        persistence,
        checks,
        blockers
      },
      null,
      2
    )
  );
}

async function runCheck(id, fn) {
  try {
    const value = await fn();
    checks.push({ id, passed: true });
    return value;
  } catch (error) {
    blockers.push({ id, detail: error instanceof Error ? error.message : String(error) });
    checks.push({ id, passed: false });
    throw error;
  }
}

function route(id) {
  const found = routes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing route in live Postgres doctor: ${id}`);
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

function poolConfig(connectionString) {
  return {
    connectionString,
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
  };
}

function buildDatabaseUrl(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}
