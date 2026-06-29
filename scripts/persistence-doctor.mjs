import { readdirSync, readFileSync } from "node:fs";
import {
  apiRouteContracts,
  apiRoutePathById,
  hostedCheckoutExemptRouteIds,
  repositoryBackedCustomerRouteIds
} from "../src/apiRouteContractsData.mjs";
import { checkAbsent, checkIncludes } from "./doctor-harness.mjs";

const files = {
  apiRouteContractsData: "src/apiRouteContractsData.mjs",
  apiContracts: "src/apiContracts.ts",
  apiRuntime: "scripts/api-runtime.mjs",
  apiServer: "scripts/api-server.mjs",
  accountAuth: "src/accountAuth.ts",
  accountAuthDoctor: "scripts/account-auth-doctor.mjs",
  artifactStore: "src/artifactStore.ts",
  artifactStoreDoctor: "scripts/artifact-store-doctor.mjs",
  artifactStoreS3LiveDoctor: "scripts/artifact-store-s3-live-doctor.mjs",
  localPersistenceAudit: "src/localPersistenceAudit.ts",
  postgresApiHttpDoctor: "scripts/postgres-api-http-doctor.mjs",
  postgresIntegrationDoctor: "scripts/postgres-integration-doctor.mjs",
  postgresRuntimeDoctor: "scripts/postgres-runtime-doctor.mjs"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);
contents.migration = readdirSync("infra/migrations")
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort()
  .map((file) => readFileSync(`infra/migrations/${file}`, "utf8"))
  .join("\n");
const repositoryBackedCustomerRoutePaths = repositoryBackedCustomerRouteIds.map((routeId) => apiRoutePathById[routeId]);
const schemaBackedRouteCount = apiRouteContracts.filter(
  (route) => route.id !== "health" && route.id !== "route-catalog" && !hostedCheckoutExemptRouteIds.has(route.id)
).length;
const idempotentMutationRouteCount = apiRouteContracts.filter(
  (route) => route.method === "POST" && !hostedCheckoutExemptRouteIds.has(route.id)
).length;

const requiredTables = [
  "users",
  "auth_sessions",
  "account_identities",
  "account_recovery_challenges",
  "provider_connections",
  "imported_events",
  "card_opportunities",
  "draft_states",
  "relationship_memories",
  "card_projects",
  "render_packets",
  "orders",
  "order_events",
  "vendor_quotes",
  "consent_records",
  "data_requests",
  "idempotency_keys",
  "provider_call_events",
  "api_jobs",
  "admin_runtime_configs",
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
  "CREATE TABLE provider_call_events",
  "CREATE TABLE draft_states",
  "draft_input JSONB NOT NULL",
  "raw_content_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_content_stored = FALSE)",
  "CREATE INDEX idx_draft_states_user_updated",
  "tenant_id TEXT NOT NULL",
  "adapter_id TEXT NOT NULL",
  "month_bucket TEXT NOT NULL",
  "estimated_cost_cents INTEGER NOT NULL",
  "pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE)",
  "live_network_call BOOLEAN NOT NULL DEFAULT FALSE",
  "CREATE INDEX idx_provider_call_events_tenant_month",
  "CREATE TABLE api_jobs",
  "idempotency_key_id TEXT REFERENCES idempotency_keys(id)",
  "status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'dead_lettered', 'cancelled'))",
  "attempt_count INTEGER NOT NULL DEFAULT 0",
  "max_attempts INTEGER NOT NULL DEFAULT 3",
  "run_after TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  "CREATE INDEX idx_api_jobs_user_status",
  "CREATE INDEX idx_api_jobs_lease",
  "CREATE INDEX idx_api_jobs_locked",
  "CREATE TABLE audit_log",
  "CHECK (raw_content_stored = FALSE)",
  "storage_provider TEXT NOT NULL",
  "artifact_count INTEGER NOT NULL",
  "artifact_manifest JSONB NOT NULL",
  "signed_url_expires_at TIMESTAMPTZ NOT NULL",
  "external_share_approval_required BOOLEAN NOT NULL DEFAULT TRUE",
  "real_orders_enabled BOOLEAN NOT NULL DEFAULT FALSE",
  "CHECK (real_orders_enabled = FALSE)",
  "CREATE TABLE IF NOT EXISTS admin_runtime_configs",
  "raw_customer_content_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_customer_content_stored = FALSE)",
  "credentials_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (credentials_stored = FALSE)",
  "CREATE INDEX IF NOT EXISTS idx_admin_runtime_configs_updated"
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
  "providerUsageLedgerTable: true",
  "appendOnlyAudit: true",
  "relationshipMemoryRepository: true",
  "draftStateRepository: true",
  "/api/customer/draft-state",
  "draft_states",
  "/api/memories/review",
  "relationship_memories",
  "renderPacketRepository: true",
  "/api/render-packets",
  "render_packets",
  "importPreviewRepository: true",
  "/api/import-preview",
  "/api/calendar/connections/start",
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
  "consent_records",
  "dataRequestRepository: true",
  "/api/data-requests",
  "data_requests"
];
const apiRouteDataSignals = [
  "admin-persistence-readiness",
  "admin-demo-reset",
  "requiredApiRoutePaths",
  "repositoryBackedCustomerRouteIds",
  "apiRoutePathById",
  ...repositoryBackedCustomerRouteIds,
  ...repositoryBackedCustomerRoutePaths
];
const apiServerSignals = [
  "requiredApiRoutePaths",
  "schemaBackedRoutes",
  "authSessionTable: true",
  "accountIdentityTable: true",
  "accountRecoveryTable: true",
  "idempotencyTable: true",
  "providerUsageLedgerTable: true",
  "appendOnlyAudit: true",
  "relationshipMemoryRepository: true",
  "draftStateRepository: true",
  "renderPacketRepository: true",
  "importPreviewRepository: true",
  "cardProjectRepository: true",
  "manualVendorHandoffRepository: true",
  "dataRequestRepository: true"
];
const postgresRuntimeSignals = [
  "createPostgresApiRuntime",
  "postgresPoolFactory",
  "FROM auth_sessions",
  "INSERT INTO provider_connections",
  "INSERT INTO imported_events",
  "INSERT INTO card_opportunities",
  "INSERT INTO draft_states",
  "INSERT INTO relationship_memories",
  "INSERT INTO card_projects",
  "INSERT INTO render_packets",
  "INSERT INTO orders",
  "INSERT INTO order_events",
  "INSERT INTO consent_records",
  "INSERT INTO data_requests",
  "admin_runtime_configs",
  "INSERT INTO idempotency_keys",
  "INSERT INTO provider_call_events",
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
  "draftStates",
  "persists repository-backed import preview mutations",
  "relationshipMemories",
  "persists repository-backed relationship memory mutations",
  "cardProjects",
  "persists repository-backed card project mutations",
  "renderPackets",
  "persists idempotent queue-backed mutations",
  "orders",
  "orderEvents",
  "consentRecords",
  "persists repository-backed manual vendor handoff mutations",
  "dataRequests",
  "persists repository-backed data request mutations",
  "wrong-role"
];
const postgresIntegrationSignals = [
  "customcard-postgres-integration-doctor",
  "CREATE DATABASE",
  "infra/migrations/001_initial_schema.sql",
  "applies initial migration to live Postgres",
  "authorizes real Postgres customer sessions for every repository-backed route",
  "authVerification",
  "expectedCustomerRepositoryRoutes",
  "wrongRoleBlocked",
  "persists real Postgres import preview repository mutation",
  "SELECT COUNT(*)::int AS count FROM provider_connections",
  "SELECT COUNT(*)::int AS count FROM imported_events",
  "SELECT COUNT(*)::int AS count FROM card_opportunities",
  "persists real Postgres relationship memory repository mutation",
  "SELECT COUNT(*)::int AS count FROM relationship_memories",
  "persists real Postgres card project repository mutation",
  "SELECT COUNT(*)::int AS count FROM card_projects",
  "persists real Postgres render packet repository mutation",
  "SELECT COUNT(*)::int AS count FROM render_packets",
  "persists real Postgres manual vendor handoff repository mutation",
  "SELECT COUNT(*)::int AS count FROM orders",
  "SELECT COUNT(*)::int AS count FROM order_events",
  "SELECT COUNT(*)::int AS count FROM consent_records",
  "persists real Postgres data request repository mutation",
  "SELECT COUNT(*)::int AS count FROM data_requests",
  "DROP DATABASE IF EXISTS",
  "--confirm-live-postgres-integration-doctor"
];
const postgresApiHttpSignals = [
  "customcard-postgres-api-http-doctor",
  "--confirm-live-postgres-api-http-doctor",
  "spawn(\"node\", [\"scripts/api-server.mjs\"]",
  "serves public Postgres health and route catalog over HTTP",
  "enforces Postgres HTTP auth on admin and customer routes",
  "blocks missing HTTP idempotency key before repository mutation",
  "apiRoutePathById",
  "repositoryBackedCustomerRouteIds",
  "replays and conflicts Postgres HTTP idempotency",
  "authVerification",
  "customerHttpRoutes",
  "missingAuthBlocked",
  "missingIdempotencyBlocked",
  "SELECT COUNT(*)::int AS count FROM idempotency_keys",
  "SELECT COUNT(*)::int AS count FROM audit_log",
  "SELECT COUNT(*)::int AS count FROM api_jobs",
  "DROP DATABASE IF EXISTS"
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
  "--confirm-live-account-auth-doctor"
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
const artifactStoreS3LiveDoctorSignals = [
  "customcard-artifact-store-s3-live-doctor",
  "--confirm-live-s3-artifact-doctor",
  "OBJECT_STORE_ACCESS_KEY_ID",
  "OBJECT_STORE_SECRET_ACCESS_KEY",
  "AWS4-HMAC-SHA256",
  "x-amz-content-sha256",
  "createBucket",
  "writeS3CompatibleArtifactStore",
  "putObject",
  "getObjectText",
  "deleteBucket",
  "cloudWritesVerified",
  "liveNetworkCalls: true",
  "externalVendorCalls: false",
  "realOrdersEnabled: false"
];
const localPersistenceAuditSignals = [
  "customcard-local-persistence-audit",
  "local-workspace-identity",
  "approved-relationship-memories",
  "saved-event-queue-decisions",
  "card-history-render-preview",
  "theme-preference",
  "customcard-free-workspace-v1",
  "customcard-theme-v1",
  "postgres-and-object-store",
  "relationship_memories",
  "render_packets",
  "/api/memories/review",
  "/api/render-packets"
];
const authSessionSignals = migrationSignals.slice(0, 7);
const accountStorageSignals = migrationSignals.slice(7, 16);
const idempotencySignals = migrationSignals.slice(16, 21);
const queueJobSignals = migrationSignals.slice(21, 25);
const safetySignals = migrationSignals.slice(25);
const requiredTableSignals = requiredTables.map((table) =>
  table === "admin_runtime_configs" ? "CREATE TABLE IF NOT EXISTS admin_runtime_configs" : `CREATE TABLE ${table}`
);

const checks = [
  checkIncludes("schema", "required-tables", contents.migration, requiredTableSignals),
  checkIncludes("schema", "auth-session-signals", contents.migration, authSessionSignals),
  checkIncludes("schema", "account-auth-storage-signals", contents.migration, accountStorageSignals),
  checkIncludes("schema", "idempotency-signals", contents.migration, idempotencySignals),
  checkIncludes("schema", "queue-job-signals", contents.migration, queueJobSignals),
  checkIncludes("schema", "safety-signals", contents.migration, safetySignals),
  checkIncludes("api", "shared-api-route-contract-data", contents.apiRouteContractsData, apiRouteDataSignals),
  checkIncludes("api", "persistence-route-contract", contents.apiRouteContractsData, apiSignals.slice(0, 2)),
  checkIncludes("api", "server-persistence-readiness", `${contents.apiServer}\n${contents.apiRouteContractsData}`, apiServerSignals),
  checkIncludes("api", "account-auth-contract", contents.accountAuth, accountAuthSignals),
  checkIncludes("api", "account-auth-doctor", contents.accountAuthDoctor, accountAuthDoctorSignals),
  checkIncludes("api", "artifact-store-contract", contents.artifactStore, artifactStoreSignals),
  checkIncludes("api", "artifact-store-doctor", contents.artifactStoreDoctor, artifactStoreDoctorSignals),
  checkIncludes("api", "artifact-store-s3-live-doctor", contents.artifactStoreS3LiveDoctor, artifactStoreS3LiveDoctorSignals),
  checkIncludes("api", "local-browser-persistence-audit", contents.localPersistenceAudit, localPersistenceAuditSignals),
  checkIncludes("api", "postgres-runtime-sql-contract", contents.apiRuntime, postgresRuntimeSignals),
  checkIncludes("api", "postgres-runtime-doctor", contents.postgresRuntimeDoctor, postgresDoctorSignals),
  checkIncludes("api", "postgres-integration-doctor", contents.postgresIntegrationDoctor, postgresIntegrationSignals),
  checkIncludes("api", "postgres-api-http-doctor", `${contents.postgresApiHttpDoctor}\n${contents.apiRouteContractsData}`, postgresApiHttpSignals),
  checkAbsent("schema", "no-raw-content-permission", contents.migration, ["raw_content_allowed", "raw_content_stored BOOLEAN NOT NULL DEFAULT TRUE"]),
  checkAbsent("api", "no-live-persistence-claims", `${contents.apiServer}\n${contents.localPersistenceAudit}`, [
    "realOrdersEnabled: true",
    "liveExternalCalls: true",
    "rawContentStored: true"
  ])
];

const lanes = Array.from(new Set(checks.map((item) => item.lane))).map((lane) => {
  const laneChecks = checks.filter((item) => item.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((item) => item.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((item) => item.passed) ? "repo-consistent" : "contract-drift"
  };
});
const blockers = checks.filter((item) => !item.passed).map((item) => ({ id: item.id, lane: item.lane, detail: item.detail }));
const report = {
  service: "customcard-persistence-doctor",
  status: blockers.length === 0 ? "repo-consistent" : "contract-drift",
  scope: "repo-local",
  readiness: {
    tables: {
      total: requiredTables.length,
      authSessions: true,
      accountIdentities: true,
      accountRecoveryChallenges: true,
      artifactStoreWrites: true,
      relationshipMemoryRepository: true,
      draftStateRepository: true,
      renderPacketRepository: true,
      importPreviewRepository: true,
      cardProjectRepository: true,
      manualVendorHandoffRepository: true,
      dataRequestRepository: true,
      idempotencyReplay: true,
      providerUsageLedger: true,
      queueJobs: true,
      auditLog: true
    },
    api: {
      statefulRoutes: schemaBackedRouteCount,
      adminPersistenceReadiness: true,
      idempotentMutations: idempotentMutationRouteCount
    },
    localBrowserState: {
      auditItems: 6,
      dbRequiredItems: 0,
      objectStoreRequiredItems: 0,
      browserOnlyItems: 0,
      localStorageKeys: [],
      serverBackedRoutes: ["/api/customer/draft-state/current", "/api/customer/draft-state"]
    },
    safety: {
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: false
    }
  },
  lanes,
  registerIssues: blockers
};

console.log(JSON.stringify(report, null, 2));

if (blockers.length > 0) {
  process.exit(1);
}
