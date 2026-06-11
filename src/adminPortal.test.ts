import { describe, expect, it } from "vitest";
import {
  buildAdminPortalModel,
  filterAdminPortalRecords,
  validateAdminPortalModel,
  type AdminPortalModel
} from "./adminPortal";
import { buildAdminOperationsWorkflow } from "./adminOperations";
import { buildReadinessSummary } from "./readinessSummary";
import { buildAdminPanelModel, providerCatalog } from "./providerCatalog";
import { summarizeProviderGovernance } from "./providerGovernance";
import { getProviderRuntimeReadiness } from "./providerRuntime";
import { productionLaunchGates, summarizeProductionReadiness } from "./productionReadiness";

function buildPortal(): AdminPortalModel {
  const model = buildAdminPanelModel();
  const readiness = buildReadinessSummary();
  const adminOperationsWorkflow = buildAdminOperationsWorkflow({
    model,
    productionGates: productionLaunchGates,
    hostedApiReadinessItems: readiness.hostedApi.items,
    retailFulfillmentReadinessItems: readiness.retailFulfillment.items,
    paymentReadinessItems: readiness.payment.items,
    observabilityReadinessItems: readiness.observability.items,
    externalAuditReadinessItems: readiness.externalAudit.items
  });

  return buildAdminPortalModel({
    model,
    readiness,
    providerGovernance: summarizeProviderGovernance(),
    productionReadiness: summarizeProductionReadiness(),
    runtimeReadiness: new Map(providerCatalog.map((adapter) => [adapter.id, getProviderRuntimeReadiness(adapter.id)])),
    adminOperationsWorkflow
  });
}

describe("admin portal", () => {
  it("builds the core admin portal sections without enabling live actions", () => {
    const portal = buildPortal();

    expect(validateAdminPortalModel(portal)).toEqual([]);
    expect(portal.summary).toMatchObject({
      sections: 6,
      orderQueues: 4,
      liveMutationsEnabled: 0,
      rawContentExposed: 0
    });
    expect(portal.navigation.map((item) => item.id)).toEqual(["ops", "orders", "users", "assets", "providers", "launch"]);
    expect(portal.areas.orders.records.map((record) => record.label)).toEqual(
      expect.arrayContaining(["Manual handoff orders", "Order status state machine", "Vendor confirmation status"])
    );
    expect(portal.areas.users.records.map((record) => record.label)).toEqual(
      expect.arrayContaining(["Admin roles and sessions", "Customer account lookup", "Data request desk"])
    );
    expect(portal.areas.assets.records.map((record) => record.label)).toEqual(
      expect.arrayContaining(["Generated card panels", "Object-store artifacts", "Signed mobile artifacts"])
    );
  });

  it("filters admin portal records by status and search query", () => {
    const portal = buildPortal();

    expect(filterAdminPortalRecords(portal.areas.users.records, { query: "escalation" }).map((record) => record.id)).toEqual([
      "users-support-review"
    ]);
    expect(filterAdminPortalRecords(portal.areas.assets.records, { status: "blocked" }).map((record) => record.id)).toEqual(
      expect.arrayContaining(["assets-object-store", "assets-mobile-artifacts"])
    );
    expect(filterAdminPortalRecords(portal.areas.providers.records, { query: "credential" }).length).toBeGreaterThan(0);
  });

  it("rejects unsafe portal records before they reach the admin UI", () => {
    const portal = buildPortal();
    const unsafeRecord = {
      ...portal.areas.users.records[0],
      action: "",
      evidence: [],
      liveMutationEnabled: true,
      rawContentExposed: true
    };
    const unsafePortal: AdminPortalModel = {
      ...portal,
      summary: {
        ...portal.summary,
        liveMutationsEnabled: 0,
        rawContentExposed: 0
      },
      areas: {
        ...portal.areas,
        users: {
          ...portal.areas.users,
          records: [unsafeRecord]
        }
      }
    };

    expect(validateAdminPortalModel(unsafePortal)).toEqual(
      expect.arrayContaining([
        "Admin portal record users-admin-roles must name an admin action.",
        "Admin portal record users-admin-roles must list required evidence.",
        "Admin portal record users-admin-roles must not enable live mutations.",
        "Admin portal record users-admin-roles must not expose raw customer content.",
        "Admin portal live mutation summary is out of sync with records.",
        "Admin portal raw content summary is out of sync with records."
      ])
    );
  });
});
