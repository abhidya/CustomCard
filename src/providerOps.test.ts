import { describe, expect, it } from "vitest";
import { summarizeAiFlowConfigs } from "./aiFlowConfig";
import { buildReadinessSummary } from "./readinessSummary";
import { buildAdminPanelModel, getProviderAdapter, providerCatalog } from "./providerCatalog";
import { summarizeProviderGovernance } from "./providerGovernance";
import { buildProviderCallEvent } from "./providerOperations";
import { getProviderRuntimeReadiness } from "./providerRuntime";
import { buildProviderOpsModel, validateProviderOpsModel } from "./providerOps";

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

describe("provider ops", () => {
  it("routes admin env setup to selected provider adapters instead of every catalog contract", () => {
    const providerOps = buildProviderOpsModel({
      model: buildAdminPanelModel(),
      providerGovernance: summarizeProviderGovernance(),
      runtimeReadiness: buildRuntimeReadiness(),
      aiFlowSummary: summarizeAiFlowConfigs(),
      readiness: buildReadinessSummary()
    });

    expect(validateProviderOpsModel(providerOps)).toEqual([]);
    expect(providerOps.summary.availableProviders).toBeGreaterThan(0);
    expect(providerOps.availableProviders.map((provider) => provider.adapterId)).toEqual(
      expect.arrayContaining(["local-workspace-auth", "deterministic-customer-chat", "browser-svg-renderer"])
    );
    expect(providerOps.env.requiredForSelectedProviders).toEqual(
      expect.arrayContaining(["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN or CLOUDFLARE_API_TOKEN"])
    );
    expect(providerOps.env.requiredForSelectedProviders).not.toContain("AUTH0_DOMAIN");
    expect(providerOps.env.requiredForSelectedProviders).not.toContain("OPENAI_API_KEY");
    expect(JSON.stringify(providerOps)).not.toContain("token_text");
  });

  it("marks env-configured AI providers as available while keeping live gated by safety evidence", () => {
    const cloudflareChat = getProviderAdapter("cloudflare-workers-ai-chat");
    expect(cloudflareChat).toBeDefined();
    const usageEvents = [
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
    ];
    const providerOps = buildProviderOpsModel({
      model: buildAdminPanelModel(),
      providerGovernance: summarizeProviderGovernance(),
      runtimeReadiness: buildRuntimeReadiness(cloudflareEnv),
      aiFlowSummary: summarizeAiFlowConfigs(cloudflareEnv),
      readiness: buildReadinessSummary(),
      env: cloudflareEnv,
      usageEvents,
      nowIso
    });

    const cloudflareChatOps = providerOps.providers.find((provider) => provider.adapterId === "cloudflare-workers-ai-chat");

    expect(validateProviderOpsModel(providerOps)).toEqual([]);
    expect(providerOps.summary.envConfiguredProviders).toBeGreaterThan(0);
    expect(providerOps.env.configuredProviders).toEqual(
      expect.arrayContaining(["cloudflare-workers-ai-chat", "cloudflare-workers-ai-image"])
    );
    expect(cloudflareChatOps).toMatchObject({
      availability: "env-configured",
      missingEnv: [],
      queueRequired: true,
      metricSource: {
        kind: "provider-dashboard",
        label: "Cloudflare Workers AI",
        providerSourced: true,
        usageUnit: "tokens / Neurons"
      }
    });
    expect(cloudflareChatOps?.blockedReasons.join(" ")).toContain("model allowlist");
    expect(providerOps.summary.readyForLiveCalls).toBe(2);
    expect(providerOps.summary.liveReadyProviders).toBe(0);
    expect(providerOps.limits.maxPerRequestBudgetCents).toBeGreaterThanOrEqual(75);
    expect(providerOps.usage).toMatchObject({
      configuredProviders: 2,
      configuredFlows: 3,
      liveEnabledConfiguredFlows: 2,
      monthlyBudgetCents: 8500,
      maxPerRequestBudgetCents: 75,
      estimatedMonthlyRequestsAtBudget: 540,
      reservedOrSpentCents: 12,
      actualSpendCents: 9,
      ledgerEvents: 1,
      providerSourcedMetricAdapters: 2,
      localLedgerMetricAdapters: 0,
      monthBucket: "2026-06"
    });
    expect(providerOps.orr.latencyGateRequired).toBeGreaterThan(0);
    expect(providerOps.users.userManagementRequiredEnv).toEqual(expect.arrayContaining(["VITE_CUSTOMCARD_ADMIN_EMAILS"]));
    expect(JSON.stringify(providerOps)).not.toContain("token_text");
  });
});
