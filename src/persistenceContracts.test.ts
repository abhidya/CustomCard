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
      (contract) => contract.requiredRole !== "public" && !hostedCheckoutExemptRouteIds.has(contract.routeId)
    );
    expect(nonPublicRoutes.every((contract) => contract.sessionRequired)).toBe(true);
    expect(nonPublicRoutes.every((contract) => contract.persistedTables.includes("auth_sessions"))).toBe(true);
  });

  it("keeps mutation routes idempotent, audited, and queue-backed where required", () => {
    const mutationRoutes = apiRouteContracts.filter(
      (route) => route.method === "POST" && !hostedCheckoutExemptRouteIds.has(route.id)
    );
    const mutationContracts = apiPersistenceRouteContracts.filter((contract) => contract.mode === "mutation");
    const queueBackedRouteIds = apiRouteContracts.filter((route) => route.runtimeMode === "queue-backed").map((route) => route.id);

    expect(mutationContracts).toHaveLength(mutationRoutes.length);
    expect(mutationContracts.every((contract) => contract.idempotencyReplayRequired)).toBe(true);
    expect(mutationContracts.every((contract) => contract.persistedTables.includes("idempotency_keys"))).toBe(true);
    expect(mutationContracts.every((contract) => contract.persistedTables.includes("audit_log"))).toBe(true);
    for (const routeId of queueBackedRouteIds) {
      const contract = apiPersistenceRouteContracts.find((candidate) => candidate.routeId === routeId);
      expect(contract?.queueBacked).toBe(true);
      expect(contract?.persistedTables).toContain("api_jobs");
    }
  });

  it("summarizes persistence readiness without claiming live production auth", () => {
    const summary = buildPersistenceReadinessSummary();

    expect(summary.status).toBe("ready");
    expect(summary.tables.total).toBe(19);
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
    expect(persistenceTableContracts.find((contract) => contract.name === "provider_call_events")).toMatchObject({
      appendOnly: true,
      requiredColumns: expect.arrayContaining(["tenant_id", "adapter_id", "month_bucket", "estimated_cost_cents", "pii_free", "live_network_call"])
    });
    expect(apiPersistenceRouteContracts.find((contract) => contract.routeId === "render-packets")?.persistedTables).toContain(
      "provider_call_events"
    );
    expect(summary.routes.schemaBacked).toBe(18);
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
