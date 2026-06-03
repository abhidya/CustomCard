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
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" }
];

const customerToken = "live-postgres-customer-session-token";
const adminToken = "live-postgres-admin-session-token";
const doctorDatabase = `customcard_doctor_${process.pid}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
const adminUrl = buildDatabaseUrl(databaseUrl, "postgres");
const doctorUrl = buildDatabaseUrl(databaseUrl, doctorDatabase);
const adminPool = new pg.Pool(poolConfig(adminUrl));
const blockers = [];
const checks = [];
let finalRuntime = { mode: "postgres", postgresConfigured: Boolean(databaseUrl) };
let finalPersistence = {
  idempotencyRecords: 0,
  auditRecords: 0,
  queuedJobs: 0
};
let exitCode = 0;
let runtime;

try {
  await runCheck("creates isolated doctor database", async () => {
    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(doctorDatabase)}`);
  });

  const doctorPool = new pg.Pool(poolConfig(doctorUrl));
  try {
    await runCheck("applies initial migration to live Postgres", async () => {
      const migrationSql = await readFile("infra/migrations/001_initial_schema.sql", "utf8");
      await doctorPool.query(migrationSql);
      const tables = await doctorPool.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
      );
      const tableNames = new Set(tables.rows.map((row) => row.table_name));
      for (const requiredTable of ["users", "auth_sessions", "idempotency_keys", "api_jobs", "audit_log"]) {
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
    let customerAuth;

    await runCheck("authorizes real Postgres customer session", async () => {
      const auth = await runtime.authorize(route("render-packets"), request({ token: customerToken }));
      expect(auth.ok, "Customer session should authorize.");
      expect(auth.userId === "user-demo", "Customer auth should return seeded user id.");
      customerAuth = auth;
    });

    await runCheck("blocks wrong-role real Postgres session", async () => {
      const auth = await runtime.authorize(route("admin-readiness"), request({ token: customerToken }));
      expect(!auth.ok, "Customer token must not authorize admin route.");
      expect(auth.statusCode === 403, "Wrong-role auth should return 403.");
    });

    await runCheck("persists real Postgres idempotent queue mutation", async () => {
      const result = await runtime.persistMutation({
        route: route("render-packets"),
        request: request({ token: customerToken, idempotencyKey: "render-packets-live-postgres-0001" }),
        authContext: customerAuth,
        bodyText: JSON.stringify({ projectId: "project-live-postgres" }),
        responsePayload: {
          service: "customcard-api",
          status: "accepted-contract-only",
          route: "render-packets",
          realOrdersEnabled: false,
          externalNetworkCalls: false
        }
      });
      expect(result.statusCode === 202, "First mutation should be accepted.");
      expect(result.payload.runtimeMode === "postgres", "Mutation should use postgres runtime.");
      expect(result.payload.idempotencyPersisted, "Mutation should persist idempotency.");
    });

    await runCheck("replays and conflicts real Postgres idempotency", async () => {
      const replay = await runtime.persistMutation({
        route: route("render-packets"),
        request: request({ token: customerToken, idempotencyKey: "render-packets-live-postgres-0001" }),
        authContext: customerAuth,
        bodyText: JSON.stringify({ projectId: "project-live-postgres" }),
        responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
      });
      expect(replay.statusCode === 202, "Replay should be accepted.");
      expect(replay.payload.idempotencyReplayed, "Replay should be marked.");

      const conflict = await runtime.persistMutation({
        route: route("render-packets"),
        request: request({ token: customerToken, idempotencyKey: "render-packets-live-postgres-0001" }),
        authContext: customerAuth,
        bodyText: JSON.stringify({ projectId: "changed-live-postgres" }),
        responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
      });
      expect(conflict.statusCode === 409, "Changed body should conflict.");
      expect(conflict.payload.status === "idempotency-conflict", "Conflict status should be explicit.");
    });

    const persistenceCounts = await readPersistenceCounts(doctorPool);
    await runCheck("records real Postgres audit and queue rows", async () => {
      expect(persistenceCounts.idempotencyRecords === 1, "Expected one idempotency record.");
      expect(persistenceCounts.auditRecords === 1, "Expected one audit record.");
      expect(persistenceCounts.queuedJobs === 1, "Expected one queued job.");
    });

    finalRuntime = runtime.describe();
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
  const [idempotency, audit, jobs] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM idempotency_keys"),
    pool.query("SELECT COUNT(*)::int AS count FROM audit_log"),
    pool.query("SELECT COUNT(*)::int AS count FROM api_jobs")
  ]);
  return {
    idempotencyRecords: idempotency.rows[0].count,
    auditRecords: audit.rows[0].count,
    queuedJobs: jobs.rows[0].count
  };
}

async function dropDoctorDatabase(pool, databaseName) {
  await pool.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName]
  );
  await pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
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
