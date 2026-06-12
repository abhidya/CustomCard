import { describe, expect, it } from "vitest";
import {
  buildAdminPortalModel,
  filterAdminPortalRecords,
  validateAdminPortalModel,
  type AdminPortalModel
} from "./adminPortal";
import { summarizeAiFlowConfigs } from "./aiFlowConfig";
import { buildAdminOperationsWorkflow } from "./adminOperations";
import { buildReadinessSummary } from "./readinessSummary";
import { buildAdminPanelModel, getProviderAdapter, providerCatalog } from "./providerCatalog";
import { summarizeProviderGovernance } from "./providerGovernance";
import { buildProviderCallEvent, type ProviderCallEvent } from "./providerOperations";
import { getProviderRuntimeReadiness } from "./providerRuntime";
import { buildProviderOpsModel } from "./providerOps";
import { productionLaunchGates, summarizeProductionReadiness } from "./productionReadiness";

const cloudflareEnv = {
  CLOUDFLARE_ACCOUNT_ID: "acct_123",
  CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
  CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
  CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "token_image",
  CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning"
};
const nowIso = "2026-06-12T04:00:00.000Z";

function buildRuntimeReadiness(env: Record<string, string | undefined> = {}) {
  return new Map(providerCatalog.map((adapter) => [adapter.id, getProviderRuntimeReadiness(adapter.id, env)]));
}

function buildPortal({
  env = {},
  usageEvents = [],
  nowIso: usageNowIso
}: {
  env?: Record<string, string | undefined>;
  usageEvents?: ProviderCallEvent[];
  nowIso?: string;
} = {}): AdminPortalModel {
  const model = buildAdminPanelModel();
  const readiness = buildReadinessSummary();
  const providerGovernance = summarizeProviderGovernance();
  const runtimeReadiness = buildRuntimeReadiness(env);
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
    providerGovernance,
    providerOps: buildProviderOpsModel({
      model,
      readiness,
      providerGovernance,
      runtimeReadiness,
      aiFlowSummary: Object.keys(env).length > 0
        ? summarizeAiFlowConfigs(env)
        : {
            total: 0,
            liveEnabled: 0,
            readyForLiveCalls: 0,
            queued: 0,
            fallbackQueued: 0,
            blocked: 0,
            configuredProviders: [],
            flows: []
          },
      env,
      usageEvents,
      nowIso: usageNowIso
    }),
    productionReadiness: summarizeProductionReadiness(),
    runtimeReadiness,
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
    expect(portal.areas.orders.orderQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "order-demo-manual-handoff",
          provider: "Walgreens",
          status: "vendor_handoff_blocked"
        }),
        expect.objectContaining({
          id: "manual-vendor-handoff-approved",
          status: "vendor_handoff_ready"
        })
      ])
    );
    expect(portal.areas.users.records.map((record) => record.label)).toEqual(
      expect.arrayContaining(["Admin roles and sessions", "Customer account lookup", "Data request desk"])
    );
    expect(portal.areas.assets.records.map((record) => record.label)).toEqual(
      expect.arrayContaining(["Generated card panels", "Object-store artifacts", "Signed mobile artifacts"])
    );
    expect(portal.areas.providers.records.map((record) => record.label)).toEqual(
      expect.arrayContaining(["User management gates", "Usage cost ledger", "ORR latency and alert gates"])
    );
    expect(portal.areas.providers.metrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining(["Available", "Env configured", "Fallback queues", "Cost flows", "Budget month", "Spend est.", "Req capacity", "Provider sources", "Ledger-only", "Latency gates", "User env"])
    );
  });

  it("surfaces env-configured provider usage cost metrics without secrets", () => {
    const cloudflareChat = getProviderAdapter("cloudflare-workers-ai-chat");
    expect(cloudflareChat).toBeDefined();
    const portal = buildPortal({
      env: cloudflareEnv,
      nowIso,
      usageEvents: [
        buildProviderCallEvent({
          adapter: cloudflareChat!,
          tenantId: "default",
          routeId: "ai-card-generate",
          status: "succeeded",
          nowIso,
          requestUnits: 1,
          estimatedCostCents: 12,
          actualCostCents: 9
        })
      ]
    });
    const providerMetrics = new Map(portal.areas.providers.metrics.map((metric) => [metric.label, metric.value]));
    const usageRecord = portal.areas.providers.records.find((record) => record.id === "provider-usage-costs");

    expect(providerMetrics.get("Cost flows")).toBe("3");
    expect(providerMetrics.get("Budget month")).toBe("$85.00");
    expect(providerMetrics.get("Spend est.")).toBe("$0.12");
    expect(providerMetrics.get("Req capacity")).toBe("540");
    expect(providerMetrics.get("Provider sources")).toBe("2");
    expect(providerMetrics.get("Ledger-only")).toBe("0");
    expect(usageRecord).toMatchObject({
      label: "Usage cost ledger",
      status: "attention",
      evidence: expect.arrayContaining(["provider_call_events", "Cloudflare Workers AI", "monthlyBudgetCents"])
    });
    expect(usageRecord?.detail).toContain("$85.00 configured monthly budget");
    expect(usageRecord?.detail).toContain("2 provider-sourced metric adapters");
    expect(JSON.stringify(portal)).not.toContain("token_text");
  });

  it("filters admin portal records by status and search query", () => {
    const portal = buildPortal();

    expect(filterAdminPortalRecords(portal.areas.users.records, { query: "escalation" }).map((record) => record.id)).toEqual([
      "users-support-review"
    ]);
    expect(filterAdminPortalRecords(portal.areas.assets.records, { status: "blocked" }).map((record) => record.id)).toEqual(
      expect.arrayContaining(["assets-object-store", "assets-mobile-artifacts"])
    );
    expect(filterAdminPortalRecords(portal.areas.providers.records, { query: "Provider Ops" }).length).toBeGreaterThan(0);
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
