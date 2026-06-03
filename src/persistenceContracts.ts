import { apiRouteContracts, type ApiAudience, type ApiRouteContract } from "./apiContracts";

export type PersistenceTableName =
  | "users"
  | "auth_sessions"
  | "provider_connections"
  | "imported_events"
  | "card_opportunities"
  | "relationship_memories"
  | "card_projects"
  | "render_packets"
  | "orders"
  | "order_events"
  | "vendor_quotes"
  | "consent_records"
  | "data_requests"
  | "idempotency_keys"
  | "api_jobs"
  | "audit_log";

export type RoutePersistenceMode = "none" | "read-only" | "mutation";

export interface PersistenceTableContract {
  name: PersistenceTableName;
  requiredColumns: string[];
  indexes: string[];
  storesCustomerData: boolean;
  rawContentAllowed: false;
  appendOnly: boolean;
}

export interface ApiRoutePersistenceContract {
  routeId: string;
  mode: RoutePersistenceMode;
  requiredRole: ApiAudience;
  sessionRequired: boolean;
  persistedTables: PersistenceTableName[];
  idempotencyReplayRequired: boolean;
  auditRequired: boolean;
  queueBacked: boolean;
}

export interface PersistenceReadinessSummary {
  service: "customcard-persistence";
  status: "ready" | "blocked";
  tables: {
    total: number;
    customerData: number;
    rawContentAllowed: number;
    appendOnly: number;
    authSessionTable: boolean;
    idempotencyTable: boolean;
    jobTable: boolean;
  };
  routes: {
    total: number;
    schemaBacked: number;
    customerSession: number;
    adminSession: number;
    mutations: number;
    idempotentMutations: number;
    queueBacked: number;
  };
  migrationSignals: string[];
  blockers: string[];
}

export const requiredPersistenceTableNames: PersistenceTableName[] = [
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

export const persistenceTableContracts: PersistenceTableContract[] = [
  table("users", ["id", "email", "locale", "region", "platform"], ["users_email_key"], true),
  table(
    "auth_sessions",
    ["id", "user_id", "session_hash", "role", "expires_at", "revoked_at"],
    ["idx_auth_sessions_user", "idx_auth_sessions_hash"],
    false
  ),
  table("provider_connections", ["id", "user_id", "provider", "status", "metadata_schema"], ["idx_provider_connections_user"], true),
  table("imported_events", ["id", "connection_id", "title", "starts_at", "source_evidence"], ["idx_imported_events_connection"], true),
  table("card_opportunities", ["id", "event_id", "recipient_name", "decision"], ["idx_card_opportunities_event"], true),
  table("relationship_memories", ["id", "user_id", "recipient_name", "approved", "forgotten_at"], ["idx_relationship_memories_recipient"], true),
  table("card_projects", ["id", "opportunity_id", "approved_memory_ids"], ["idx_card_projects_opportunity"], true),
  table(
    "render_packets",
    [
      "id",
      "project_id",
      "checksum",
      "artifact_uri",
      "storage_provider",
      "artifact_count",
      "artifact_manifest",
      "signed_url_expires_at",
      "external_share_approval_required",
      "real_orders_enabled"
    ],
    ["idx_render_packets_project"],
    true
  ),
  table("orders", ["id", "project_id", "status", "recovery_actions"], ["idx_orders_project"], true),
  table("order_events", ["id", "order_id", "event_type", "payload"], ["idx_order_events_order"], true, true),
  table("vendor_quotes", ["id", "order_id", "vendor", "live_quote"], ["idx_vendor_quotes_order"], false),
  table("consent_records", ["id", "user_id", "action", "granted"], ["idx_consent_records_user"], true),
  table("data_requests", ["id", "user_id", "request_type", "status"], ["idx_data_requests_user"], true),
  table(
    "idempotency_keys",
    ["id", "user_id", "route_id", "idempotency_key", "request_hash", "response_body", "status", "expires_at"],
    ["idx_idempotency_keys_user_route", "unique_idempotency_replay"],
    true
  ),
  table("api_jobs", ["id", "user_id", "route_id", "idempotency_key_id", "status", "payload", "result"], ["idx_api_jobs_user_status"], true),
  table("audit_log", ["id", "subject_type", "subject_id", "actor_id", "action", "metadata"], ["idx_audit_subject"], true, true)
];

export const apiPersistenceRouteContracts: ApiRoutePersistenceContract[] = [
  routePersistence("health", "none", "public", [], false, false, false),
  routePersistence("route-catalog", "none", "public", [], false, false, false),
  routePersistence("customer-bootstrap", "read-only", "customer", ["users", "auth_sessions", "relationship_memories", "card_projects", "render_packets", "orders"], true, false, false),
  routePersistence("mobile-bootstrap", "read-only", "customer", ["users", "auth_sessions", "relationship_memories", "card_projects", "render_packets", "orders"], true, false, false),
  routePersistence("admin-readiness", "read-only", "admin", ["auth_sessions", "provider_connections", "audit_log"], true, false, false),
  routePersistence("admin-provider-catalog", "read-only", "admin", ["auth_sessions", "provider_connections"], true, false, false),
  routePersistence("admin-persistence-readiness", "read-only", "admin", ["auth_sessions", "idempotency_keys", "api_jobs", "audit_log"], true, false, false),
  routePersistence(
    "admin-demo-reset",
    "mutation",
    "admin",
    [
      "auth_sessions",
      "idempotency_keys",
      "users",
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
      "audit_log"
    ],
    true,
    true,
    false
  ),
  routePersistence("import-preview", "mutation", "customer", ["auth_sessions", "idempotency_keys", "provider_connections", "imported_events", "card_opportunities", "audit_log"], true, true, false),
  routePersistence("card-projects", "mutation", "customer", ["auth_sessions", "idempotency_keys", "card_opportunities", "relationship_memories", "card_projects", "audit_log"], true, true, false),
  routePersistence("render-packets", "mutation", "customer", ["auth_sessions", "idempotency_keys", "card_projects", "render_packets", "api_jobs", "audit_log"], true, true, true),
  routePersistence("manual-vendor-handoff", "mutation", "customer", ["auth_sessions", "idempotency_keys", "render_packets", "orders", "order_events", "consent_records", "api_jobs", "audit_log"], true, true, true),
  routePersistence("data-requests", "mutation", "customer", ["auth_sessions", "idempotency_keys", "data_requests", "consent_records", "audit_log"], true, true, false)
];

export const migrationRequiredSignals = [
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

export function buildPersistenceReadinessSummary(
  routes: ApiRouteContract[] = apiRouteContracts,
  tables: PersistenceTableContract[] = persistenceTableContracts,
  routeContracts: ApiRoutePersistenceContract[] = apiPersistenceRouteContracts
): PersistenceReadinessSummary {
  const blockers = validatePersistenceContracts(routes, tables, routeContracts);
  const schemaBackedRoutes = routeContracts.filter((contract) => contract.persistedTables.length > 0);
  const mutations = routes.filter((route) => route.method === "POST");

  return {
    service: "customcard-persistence",
    status: blockers.length === 0 ? "ready" : "blocked",
    tables: {
      total: tables.length,
      customerData: tables.filter((contract) => contract.storesCustomerData).length,
      rawContentAllowed: tables.filter((contract) => contract.rawContentAllowed).length,
      appendOnly: tables.filter((contract) => contract.appendOnly).length,
      authSessionTable: tables.some((contract) => contract.name === "auth_sessions"),
      idempotencyTable: tables.some((contract) => contract.name === "idempotency_keys"),
      jobTable: tables.some((contract) => contract.name === "api_jobs")
    },
    routes: {
      total: routes.length,
      schemaBacked: schemaBackedRoutes.length,
      customerSession: routeContracts.filter((contract) => contract.requiredRole === "customer" && contract.sessionRequired).length,
      adminSession: routeContracts.filter((contract) => contract.requiredRole === "admin" && contract.sessionRequired).length,
      mutations: mutations.length,
      idempotentMutations: routeContracts.filter((contract) => contract.mode === "mutation" && contract.idempotencyReplayRequired).length,
      queueBacked: routeContracts.filter((contract) => contract.queueBacked).length
    },
    migrationSignals: migrationRequiredSignals,
    blockers
  };
}

export function validatePersistenceContracts(
  routes: ApiRouteContract[] = apiRouteContracts,
  tables: PersistenceTableContract[] = persistenceTableContracts,
  routeContracts: ApiRoutePersistenceContract[] = apiPersistenceRouteContracts
): string[] {
  const issues: string[] = [];
  const tableNames = new Set(tables.map((contract) => contract.name));
  const routeContractById = new Map(routeContracts.map((contract) => [contract.routeId, contract]));

  for (const requiredTable of requiredPersistenceTableNames) {
    if (!tableNames.has(requiredTable)) issues.push(`Missing persistence table contract: ${requiredTable}`);
  }

  for (const tableContract of tables) {
    if (tableContract.rawContentAllowed) issues.push(`Persistence table ${tableContract.name} must not allow raw content.`);
    if (tableContract.name === "auth_sessions") {
      for (const column of ["user_id", "session_hash", "role", "expires_at", "revoked_at"]) {
        if (!tableContract.requiredColumns.includes(column)) issues.push("auth_sessions must include durable session columns.");
      }
    }
    if (tableContract.name === "idempotency_keys") {
      for (const column of ["user_id", "route_id", "idempotency_key", "request_hash", "response_body", "status", "expires_at"]) {
        if (!tableContract.requiredColumns.includes(column)) issues.push("idempotency_keys must include replay-safe columns.");
      }
    }
    if (tableContract.name === "audit_log" && !tableContract.appendOnly) {
      issues.push("audit_log must be append-only.");
    }
    if (tableContract.name === "render_packets") {
      for (const column of [
        "artifact_manifest",
        "signed_url_expires_at",
        "external_share_approval_required",
        "real_orders_enabled"
      ]) {
        if (!tableContract.requiredColumns.includes(column)) issues.push("render_packets must include signed artifact handoff columns.");
      }
    }
  }

  for (const route of routes) {
    const contract = routeContractById.get(route.id);
    if (!contract) {
      issues.push(`Missing API persistence contract: ${route.id}`);
      continue;
    }
    if (contract.requiredRole !== route.audience) {
      issues.push(`Route ${route.id} persistence role must match API audience.`);
    }
    if (route.audience !== "public" && !contract.sessionRequired) {
      issues.push(`Route ${route.id} must require durable auth session persistence.`);
    }
    for (const tableName of contract.persistedTables) {
      if (!tableNames.has(tableName)) issues.push(`Route ${route.id} references missing table ${tableName}.`);
    }
    if (route.method === "POST") {
      if (contract.mode !== "mutation") issues.push(`Mutation route ${route.id} must be marked as persistence mutation.`);
      if (!contract.idempotencyReplayRequired) issues.push(`Mutation route ${route.id} must persist idempotency replay state.`);
      if (!contract.persistedTables.includes("idempotency_keys")) issues.push(`Mutation route ${route.id} must use idempotency_keys.`);
      if (!contract.auditRequired || !contract.persistedTables.includes("audit_log")) {
        issues.push(`Mutation route ${route.id} must write audit_log.`);
      }
    }
    if (route.runtimeMode === "queue-backed" && (!contract.queueBacked || !contract.persistedTables.includes("api_jobs"))) {
      issues.push(`Queue-backed route ${route.id} must persist api_jobs.`);
    }
  }

  return issues;
}

export function validatePersistenceMigration(sql: string): string[] {
  return migrationRequiredSignals
    .filter((signal) => !sql.includes(signal))
    .map((signal) => `Migration missing required persistence signal: ${signal}`);
}

function table(
  name: PersistenceTableName,
  requiredColumns: string[],
  indexes: string[],
  storesCustomerData: boolean,
  appendOnly = false
): PersistenceTableContract {
  return {
    name,
    requiredColumns,
    indexes,
    storesCustomerData,
    rawContentAllowed: false,
    appendOnly
  };
}

function routePersistence(
  routeId: string,
  mode: RoutePersistenceMode,
  requiredRole: ApiAudience,
  persistedTables: PersistenceTableName[],
  sessionRequired: boolean,
  idempotencyReplayRequired: boolean,
  queueBacked: boolean
): ApiRoutePersistenceContract {
  return {
    routeId,
    mode,
    requiredRole,
    persistedTables,
    sessionRequired,
    idempotencyReplayRequired,
    auditRequired: mode === "mutation",
    queueBacked
  };
}
