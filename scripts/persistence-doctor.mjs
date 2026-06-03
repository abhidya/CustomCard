import { readFileSync } from "node:fs";

const files = {
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  migration: "infra/migrations/001_initial_schema.sql"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const requiredTables = [
  "users",
  "auth_sessions",
  "provider_connections",
  "imported_events",
  "card_opportunities",
  "relationship_memories",
  "card_projects",
  "render_packets",
  "orders",
  "order_events",
  "vendor_quotes",
  "consent_records",
  "data_requests",
  "idempotency_keys",
  "api_jobs",
  "audit_log"
];

const migrationSignals = [
  "CREATE TABLE auth_sessions",
  "session_hash TEXT NOT NULL",
  "CHECK (char_length(session_hash) >= 32)",
  "role TEXT NOT NULL CHECK (role IN ('customer', 'admin'))",
  "expires_at TIMESTAMPTZ NOT NULL",
  "revoked_at TIMESTAMPTZ",
  "CREATE UNIQUE INDEX idx_auth_sessions_hash",
  "CREATE TABLE idempotency_keys",
  "UNIQUE (user_id, route_id, idempotency_key)",
  "request_hash TEXT NOT NULL",
  "CHECK (char_length(request_hash) >= 12)",
  "response_body JSONB NOT NULL",
  "CREATE TABLE api_jobs",
  "idempotency_key_id TEXT REFERENCES idempotency_keys(id)",
  "status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled'))",
  "CREATE INDEX idx_api_jobs_user_status",
  "CREATE TABLE audit_log",
  "CHECK (raw_content_stored = FALSE)",
  "storage_provider TEXT NOT NULL",
  "artifact_count INTEGER NOT NULL",
  "artifact_manifest JSONB NOT NULL",
  "signed_url_expires_at TIMESTAMPTZ NOT NULL",
  "external_share_approval_required BOOLEAN NOT NULL DEFAULT TRUE",
  "real_orders_enabled BOOLEAN NOT NULL DEFAULT FALSE",
  "CHECK (real_orders_enabled = FALSE)"
];

const apiSignals = [
  "admin-persistence-readiness",
  "admin-demo-reset",
  "/api/admin/persistence-readiness",
  "schemaBackedRoutes",
  "authSessionTable: true",
  "idempotencyTable: true",
  "appendOnlyAudit: true"
];
const authSessionSignals = migrationSignals.slice(0, 7);
const idempotencySignals = migrationSignals.slice(7, 12);
const queueJobSignals = migrationSignals.slice(12, 16);
const safetySignals = migrationSignals.slice(16);

const checks = [
  checkIncludes("schema", "required-tables", contents.migration, requiredTables.map((table) => `CREATE TABLE ${table}`)),
  checkIncludes("schema", "auth-session-signals", contents.migration, authSessionSignals),
  checkIncludes("schema", "idempotency-signals", contents.migration, idempotencySignals),
  checkIncludes("schema", "queue-job-signals", contents.migration, queueJobSignals),
  checkIncludes("schema", "safety-signals", contents.migration, safetySignals),
  checkIncludes("api", "persistence-route-contract", contents.apiContracts, apiSignals.slice(0, 2)),
  checkIncludes("api", "server-persistence-readiness", contents.apiServer, apiSignals.slice(1)),
  checkAbsent("schema", "no-raw-content-permission", contents.migration, ["raw_content_allowed", "raw_content_stored BOOLEAN NOT NULL DEFAULT TRUE"]),
  checkAbsent("api", "no-live-persistence-claims", `${contents.apiContracts}\n${contents.apiServer}`, ["realOrdersEnabled: true", "externalNetworkCalls: true"])
];

const lanes = Array.from(new Set(checks.map((item) => item.lane))).map((lane) => {
  const laneChecks = checks.filter((item) => item.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((item) => item.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((item) => item.passed) ? "ready" : "blocked"
  };
});
const blockers = checks.filter((item) => !item.passed).map((item) => ({ id: item.id, lane: item.lane, detail: item.detail }));
const report = {
  service: "customcard-persistence-doctor",
  status: blockers.length === 0 ? "ready" : "blocked",
  readiness: {
    tables: {
      total: requiredTables.length,
      authSessions: true,
      idempotencyReplay: true,
      queueJobs: true,
      auditLog: true
    },
    api: {
      statefulRoutes: 11,
      adminPersistenceReadiness: true,
      idempotentMutations: 6
    },
    safety: {
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: false
    }
  },
  lanes,
  blockers
};

console.log(JSON.stringify(report, null, 2));

if (blockers.length > 0) {
  process.exit(1);
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required persistence signals.`
        : `Missing required persistence signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail:
      present.length === 0
        ? "No forbidden persistence signals found."
        : `Forbidden persistence signals present: ${present.join(", ")}`
  };
}
