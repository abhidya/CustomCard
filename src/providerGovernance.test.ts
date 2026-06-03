import { describe, expect, it } from "vitest";
import { providerCatalog, type ProviderAdapter } from "./providerCatalog";
import {
  buildProviderGovernancePolicy,
  summarizeProviderGovernance,
  validateProviderGovernance
} from "./providerGovernance";

describe("provider governance", () => {
  it("caps paid provider spend and preserves ready-local fallbacks", () => {
    const summary = summarizeProviderGovernance();

    expect(summary.total).toBe(providerCatalog.length);
    expect(summary.blockers).toEqual([]);
    expect(summary.budgetCapped).toBeGreaterThan(50);
    expect(summary.zeroPlatformSpend).toBeGreaterThanOrEqual(16);
    expect(summary.blockedZeroSpend).toBe(6);
    expect(summary.monthlyBudgetCents).toBeGreaterThan(0);
    expect(summary.maxPerRequestBudgetCents).toBe(75);
    expect(summary.rateLimited).toBe(summary.total - summary.blockedZeroSpend);
    expect(summary.fallbackCovered).toBe(summary.total);
    expect(summary.liveNetworkDefault).toBe(false);
    expect(summary.realOrdersEnabled).toBe(false);

    expect(summary.policies.find((policy) => policy.adapterId === "openai-responses-chat")).toMatchObject({
      spendTier: "budget-capped",
      monthlyBudgetCents: 2500,
      perRequestBudgetCents: 10,
      rateLimitPerMinute: 12,
      fallbackAdapterId: "deterministic-customer-chat",
      queueRequired: true,
      liveNetworkDefault: false
    });
    expect(summary.policies.find((policy) => policy.adapterId === "openai-images")).toMatchObject({
      spendTier: "budget-capped",
      monthlyBudgetCents: 3000,
      perRequestBudgetCents: 75,
      rateLimitPerMinute: 6,
      fallbackAdapterId: "browser-svg-renderer",
      humanApprovalRequired: true
    });
    expect(summary.policies.find((policy) => policy.adapterId === "docker-compose-droplet")).toMatchObject({
      spendTier: "budget-capped",
      monthlyBudgetCents: 2500,
      fallbackAdapterId: "docker-compose-dev"
    });
  });

  it("keeps blocked live vendor adapters at zero spend with manual handoff fallback", () => {
    const walgreens = providerCatalog.find((adapter) => adapter.id === "walgreens-live-order");
    expect(walgreens).toBeDefined();

    const policy = buildProviderGovernancePolicy(walgreens!);

    expect(policy).toMatchObject({
      spendTier: "blocked-zero-spend",
      monthlyBudgetCents: 0,
      perRequestBudgetCents: 0,
      rateLimitPerMinute: 0,
      queueRequired: true,
      fallbackAdapterId: "manual-vendor-handoff",
      humanApprovalRequired: true,
      liveNetworkDefault: false,
      realOrdersEnabled: false
    });
  });

  it("reports broken fallback and unbounded spend policies", () => {
    const brokenAdapters: ProviderAdapter[] = providerCatalog.map((adapter) =>
      adapter.id === "browser-svg-renderer" ? { ...adapter, status: "credential-gated", credentials: ["BROKEN_IMAGE_KEY"] } : adapter
    );
    const brokenPolicy = {
      ...buildProviderGovernancePolicy(brokenAdapters.find((adapter) => adapter.id === "openai-images")!),
      monthlyBudgetCents: Number.POSITIVE_INFINITY,
      rateLimitPerMinute: 0
    };

    expect(validateProviderGovernance(brokenAdapters, [brokenPolicy])).toEqual(
      expect.arrayContaining([
        "Governance policy for openai-images must use a finite monthly budget.",
        "Non-blocked adapter openai-images must have a rate limit.",
        "Adapter openai-images must map to a ready-local Image generation fallback.",
        "Governance fallback browser-svg-renderer must be ready-local for image-generation."
      ])
    );
  });
});
