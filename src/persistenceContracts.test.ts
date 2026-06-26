import { describe, expect, it } from "vitest";
import { apiRouteContracts, hostedCheckoutExemptRouteIds } from "./apiContracts";
import {
  apiPersistenceRouteContracts,
  buildPersistenceReadinessSummary,
  migrationRequiredSignals,
  persistenceTableContracts,
  validatePersistenceContracts,
  validatePersistenceMigration,
  type ApiRoutePersistenceContract,
  type PersistenceTableContract
} from "./persistenceContracts";

describe("persistence contracts", () => {
  it("maps every API route to durable auth, idempotency, and schema contracts", () => {
    expect(validatePersistenceContracts()).toEqual([]);
    expect(apiPersistenceRouteContracts.map((contract) => contract.routeId)).toEqual(
      apiRouteContracts.map((route) => route.id)
    );

    const nonPublicRoutes = apiPersistenceRouteContracts.filter(
      (contract) =>
        contract.requiredRole !== "public" &&
        contract.requiredRole !== "provider" &&
        !hostedCheckoutExemptRouteIds.has(contract.routeId)
    );
    expect(nonPublicRoutes.every((contract) => contract.sessionRequired)).toBe(true);
    expect(nonPublicRoutes.every((contract) => contract.persistedTables.includes("auth_sessions"))).toBe(true);
  });

  it("keeps mutation routes idempotent, audited, and queue-backed where required", () => {
    const mutationRoutes = apiRouteContracts.filter(
      (route) => route.method === "POST" && route.audience !== "provider" && !hostedCheckoutExemptRouteIds.has(route.id)
    );
    const mutationContracts = apiPersistenceRouteContracts.filter((contract) => contract.mode === "mutation");
    const idempotentMutationContracts = mutationContracts.filter((contract) => contract.requiredRole !== "provider");
    const queueBackedRouteIds = apiRouteContracts.filter((route) => route.runtimeMode === "queue-backed").map((route) => route.id);

    expect(idempotentMutationContracts).toHaveLength(mutationRoutes.length);
    expect(idempotentMutationContracts.every((contract) => contract.idempotencyReplayRequired)).toBe(true);
    expect(idempotentMutationContracts.every((contract) => contract.persistedTables.includes("idempotency_keys"))).toBe(true);
    expect(mutationContracts.every((contract) => contract.persistedTables.includes("audit_log"))).toBe(true);
    expect(apiPersistenceRouteContracts.find((contract) => contract.routeId === "provider-job-lease")).toMatchObject({
      requiredRole: "provider",
      sessionRequired: false,
      idempotencyReplayRequired: false,
      persistedTables: expect.arrayContaining(["api_jobs", "audit_log"])
    });
    expect(apiPersistenceRouteContracts.find((contract) => contract.routeId === "provider-job-status")).toMatchObject({
      mode: "read-only",
      requiredRole: "provider",
      sessionRequired: false,
      idempotencyReplayRequired: false,
      persistedTables: ["api_jobs"]
    });
    for (const routeId of queueBackedRouteIds) {
      const contract = apiPersistenceRouteContracts.find((candidate) => candidate.routeId === routeId);
      expect(contract?.queueBacked).toBe(true);
      expect(contract?.persistedTables).toContain("api_jobs");
    }
  });

  it("summarizes persistence readiness without claiming live production auth", () => {
    const summary = buildPersistenceReadinessSummary();

    expect(summary.status).toBe("ready");
    expect(summary.tables.total).toBe(22);
    expect(summary.tables.authSessionTable).toBe(true);
    expect(summary.tables.idempotencyTable).toBe(true);
    expect(summary.tables.providerUsageLedgerTable).toBe(true);
    expect(summary.tables.jobTable).toBe(true);
    expect(persistenceTableContracts.find((contract) => contract.name === "account_identities")?.requiredColumns).toEqual(
      expect.arrayContaining(["provider_subject", "raw_profile_stored", "claims_schema"])
    );
    expect(persistenceTableContracts.find((contract) => contract.name === "account_recovery_challenges")?.requiredColumns).toEqual(
      expect.arrayContaining(["challenge_hash", "expires_at", "used_at"])
    );
    expect(summary.tables.rawContentAllowed).toBe(0);
    expect(persistenceTableContracts.find((contract) => contract.name === "render_packets")?.requiredColumns).toEqual(
      expect.arrayContaining(["artifact_manifest", "signed_url_expires_at", "external_share_approval_required", "real_orders_enabled"])
    );
    expect(persistenceTableContracts.find((contract) => contract.name === "draft_states")?.requiredColumns).toEqual(
      expect.arrayContaining(["user_id", "status", "draft_input", "updated_at", "raw_content_stored"])
    );
    expect(persistenceTableContracts.find((contract) => contract.name === "provider_call_events")).toMatchObject({
      appendOnly: true,
      requiredColumns: expect.arrayContaining(["tenant_id", "adapter_id", "month_bucket", "estimated_cost_cents", "pii_free", "live_network_call"])
    });
    expect(persistenceTableContracts.find((contract) => contract.name === "api_jobs")).toMatchObject({
      requiredColumns: expect.arrayContaining(["attempt_count", "max_attempts", "locked_by", "locked_at", "run_after", "last_error"]),
      indexes: expect.arrayContaining(["idx_api_jobs_lease", "idx_api_jobs_locked"])
    });
    expect(persistenceTableContracts.find((contract) => contract.name === "admin_runtime_configs")).toMatchObject({
      requiredColumns: expect.arrayContaining(["payload", "version", "raw_customer_content_stored", "credentials_stored"]),
      indexes: expect.arrayContaining(["idx_admin_runtime_configs_updated"])
    });
    expect(apiPersistenceRouteContracts.find((contract) => contract.routeId === "render-packets")?.persistedTables).toContain(
      "provider_call_events"
    );
    expect(apiPersistenceRouteContracts.find((contract) => contract.routeId === "customer-draft-state-save")).toMatchObject({
      mode: "mutation",
      requiredRole: "customer",
      persistedTables: expect.arrayContaining(["auth_sessions", "idempotency_keys", "draft_states", "audit_log"])
    });
    expect(summary.routes.schemaBacked).toBe(37);
    expect(summary.routes.idempotentMutations).toBe(summary.routes.mutations);
    expect(apiPersistenceRouteContracts.find((contract) => contract.routeId === "admin-demo-reset")).toMatchObject({
      requiredRole: "admin",
      mode: "mutation",
      idempotencyReplayRequired: true,
      persistedTables: expect.arrayContaining(["users", "render_packets", "orders", "audit_log"])
    });
    expect(summary.blockers).toEqual([]);
  });

  it("validates required migration signals without filesystem access", () => {
    expect(validatePersistenceMigration(migrationRequiredSignals.join("\n"))).toEqual([]);
    expect(validatePersistenceMigration("CREATE TABLE users")).toEqual(
      expect.arrayContaining(["Migration missing required persistence signal: CREATE TABLE auth_sessions"])
    );
  });

  it("flags unsafe persistence edits before implementation", () => {
    const unsafeTables: PersistenceTableContract[] = persistenceTableContracts.map((contract) =>
      contract.name === "audit_log" ? { ...contract, appendOnly: false } : contract
    );
    const unsafeRouteContracts: ApiRoutePersistenceContract[] = apiPersistenceRouteContracts.map((contract) =>
      contract.routeId === "card-projects"
        ? {
            ...contract,
            idempotencyReplayRequired: false,
            auditRequired: false,
            persistedTables: ["auth_sessions", "card_projects"]
          }
        : contract
    );

    expect(validatePersistenceContracts(apiRouteContracts, unsafeTables, unsafeRouteContracts)).toEqual(
      expect.arrayContaining([
        "audit_log must be append-only.",
        "Mutation route card-projects must persist idempotency replay state.",
        "Mutation route card-projects must use idempotency_keys.",
        "Mutation route card-projects must write audit_log."
      ])
    );
  });
});
