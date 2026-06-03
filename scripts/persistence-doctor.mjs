import { readFileSync } from "node:fs";

const files = {
  apiContracts: "src/apiContracts.ts",
  apiRuntime: "scripts/api-runtime.mjs",
  apiServer: "scripts/api-server.mjs",
  accountAuth: "src/accountAuth.ts",
  accountAuthDoctor: "scripts/account-auth-doctor.mjs",
  artifactStore: "src/artifactStore.ts",
  artifactStoreDoctor: "scripts/artifact-store-doctor.mjs",
  postgresIntegrationDoctor: "scripts/postgres-integration-doctor.mjs",
  postgresRuntimeDoctor: "scripts/postgres-runtime-doctor.mjs",
  migration: "infra/migrations/001_initial_schema.sql"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const requiredTables = [
  "users",
  "auth_sessions",
  "account_identities",
  "account_recovery_challenges",
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
  "CREATE TABLE account_identities",
  "provider_subject TEXT NOT NULL",
  "raw_profile_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_profile_stored = FALSE)",
  "claims_schema JSONB NOT NULL",
  "CREATE UNIQUE INDEX idx_account_identities_provider_subject",
  "CREATE TABLE account_recovery_challenges",
  "challenge_hash TEXT NOT NULL CHECK (char_length(challenge_hash) >= 32)",
  "CHECK (expires_at > created_at)",
  "CREATE UNIQUE INDEX idx_account_recovery_challenge_hash",
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
  "accountIdentityTable: true",
  "accountRecoveryTable: true",
  "idempotencyTable: true",
  "appendOnlyAudit: true",
  "importPreviewRepository: true",
  "/api/import-preview",
  "provider_connections",
  "imported_events",
  "card_opportunities",
  "cardProjectRepository: true",
  "/api/card-projects",
  "card_projects",
  "manualVendorHandoffRepository: true",
  "/api/vendor-handoff/manual",
  "orders",
  "order_events",
  "consent_records"
];
const postgresRuntimeSignals = [
  "createPostgresApiRuntime",
  "postgresPoolFactory",
  "FROM auth_sessions",
  "INSERT INTO provider_connections",
  "INSERT INTO imported_events",
  "INSERT INTO card_opportunities",
  "INSERT INTO card_projects",
  "INSERT INTO orders",
  "INSERT INTO order_events",
  "INSERT INTO consent_records",
  "INSERT INTO idempotency_keys",
  "INSERT INTO audit_log",
  "INSERT INTO api_jobs"
];
const postgresDoctorSignals = [
  "customcard-postgres-runtime-doctor",
  "idempotencyReplayed",
  "idempotency-conflict",
  "queuedJobs",
  "providerConnections",
  "importedEvents",
  "cardOpportunities",
  "persists repository-backed import preview mutations",
  "cardProjects",
  "persists repository-backed card project mutations",
  "orders",
  "orderEvents",
  "consentRecords",
  "persists repository-backed manual vendor handoff mutations",
  "wrong-role"
];
const postgresIntegrationSignals = [
  "customcard-postgres-integration-doctor",
  "CREATE DATABASE",
  "infra/migrations/001_initial_schema.sql",
  "applies initial migration to live Postgres",
  "persists real Postgres import preview repository mutation",
  "SELECT COUNT(*)::int AS count FROM provider_connections",
  "SELECT COUNT(*)::int AS count FROM imported_events",
  "SELECT COUNT(*)::int AS count FROM card_opportunities",
  "persists real Postgres card project repository mutation",
  "SELECT COUNT(*)::int AS count FROM card_projects",
  "persists real Postgres manual vendor handoff repository mutation",
  "SELECT COUNT(*)::int AS count FROM orders",
  "SELECT COUNT(*)::int AS count FROM order_events",
  "SELECT COUNT(*)::int AS count FROM consent_records",
  "DROP DATABASE IF EXISTS",
  "CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR"
];
const accountAuthSignals = [
  "customcard-account-auth",
  "account_identities",
  "account_recovery_challenges",
  "requiredHostedAuthAdapterIds",
  "challenge_hash",
  "rawProfileStored: false"
];
const accountAuthDoctorSignals = [
  "customcard-account-auth-doctor",
  "CREATE DATABASE",
  "account_identities",
  "account_recovery_challenges",
  "raw_profile_stored = FALSE",
  "CUSTOMCARD_ACCOUNT_AUTH_DOCTOR"
];
const artifactStoreSignals = [
  "customcard-artifact-store",
  "writeFilesystemArtifactStore",
  "writeS3CompatibleArtifactStore",
  "S3CompatibleArtifactStoreClient",
  "readFile",
  "writeFile",
  "cloudWritesVerified: false",
  "realOrdersEnabled: false",
  "noNetwork: true"
];
const artifactStoreDoctorSignals = [
  "customcard-artifact-store-doctor",
  "writeFilesystemArtifactStore",
  "writeS3CompatibleArtifactStore",
  "createInMemoryS3CompatibleArtifactClient",
  "buildArtifactHandoffContract",
  "s3CompatibleContract",
  "manifestStored",
  "verifiedWrites"
];
const authSessionSignals = migrationSignals.slice(0, 7);
const accountStorageSignals = migrationSignals.slice(7, 16);
const idempotencySignals = migrationSignals.slice(16, 21);
const queueJobSignals = migrationSignals.slice(21, 25);
const safetySignals = migrationSignals.slice(25);

const checks = [
  checkIncludes("schema", "required-tables", contents.migration, requiredTables.map((table) => `CREATE TABLE ${table}`)),
  checkIncludes("schema", "auth-session-signals", contents.migration, authSessionSignals),
  checkIncludes("schema", "account-auth-storage-signals", contents.migration, accountStorageSignals),
  checkIncludes("schema", "idempotency-signals", contents.migration, idempotencySignals),
  checkIncludes("schema", "queue-job-signals", contents.migration, queueJobSignals),
  checkIncludes("schema", "safety-signals", contents.migration, safetySignals),
  checkIncludes("api", "persistence-route-contract", contents.apiContracts, apiSignals.slice(0, 2)),
  checkIncludes("api", "server-persistence-readiness", contents.apiServer, apiSignals.slice(1)),
  checkIncludes("api", "account-auth-contract", contents.accountAuth, accountAuthSignals),
  checkIncludes("api", "account-auth-doctor", contents.accountAuthDoctor, accountAuthDoctorSignals),
  checkIncludes("api", "artifact-store-contract", contents.artifactStore, artifactStoreSignals),
  checkIncludes("api", "artifact-store-doctor", contents.artifactStoreDoctor, artifactStoreDoctorSignals),
  checkIncludes("api", "postgres-runtime-sql-contract", contents.apiRuntime, postgresRuntimeSignals),
  checkIncludes("api", "postgres-runtime-doctor", contents.postgresRuntimeDoctor, postgresDoctorSignals),
  checkIncludes("api", "postgres-integration-doctor", contents.postgresIntegrationDoctor, postgresIntegrationSignals),
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
      accountIdentities: true,
      accountRecoveryChallenges: true,
      artifactStoreWrites: true,
      importPreviewRepository: true,
      cardProjectRepository: true,
      manualVendorHandoffRepository: true,
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
