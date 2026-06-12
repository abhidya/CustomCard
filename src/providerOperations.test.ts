import { describe, expect, it } from "vitest";
import { getProviderAdapter } from "./providerCatalog";
import {
  buildProviderCallEvent,
  buildProviderFailoverPlan,
  monthBucketFromIso,
  providerMonthlySpendCents,
  providerRateWindowCount,
  summarizeProviderUsage
} from "./providerOperations";
import type { ProviderGateState, ProviderRuntimeEnv } from "./providerRuntime";

const nowIso = "2026-06-11T15:04:30.000Z";
const openAiEnv: ProviderRuntimeEnv = {
  OPENAI_API_KEY: "live-openai-contract-key"
};
const googleEnv: ProviderRuntimeEnv = {
  GOOGLE_GENERATIVE_AI_API_KEY: "live-google-contract-key"
};
const imageGates: ProviderGateState = {
  humanApprovalBeforePrint: true,
  promptAuditApproved: true,
  spendLimitCents: 3000
};

describe("provider operations", () => {
  it("falls back to deterministic local rendering when preferred providers are unavailable", () => {
    const plan = buildProviderFailoverPlan({
      capability: "image-generation",
      routeId: "render-packets",
      tenantId: "tenant-a",
      preferredAdapterIds: ["openai-images", "google-gemini-image"],
      nowIso,
      requestUnits: 4
    });

    expect(plan).toMatchObject({
      mode: "local-fallback",
      selectedAdapterId: "browser-svg-renderer",
      fallbackAdapterId: "browser-svg-renderer",
      liveNetworkDefault: false,
      auditRequired: true,
      blockers: []
    });
    expect(plan.attempts.map((attempt) => attempt.reason)).toEqual(["missing-credentials", "missing-credentials"]);
    expect(plan.ledgerEvents.map((event) => event.status)).toEqual(["blocked", "blocked", "fallback-selected"]);
    expect(plan.ledgerEvents.slice(0, 2)).toEqual([
      expect.objectContaining({
        adapterId: "openai-images",
        status: "blocked",
        fallbackReason: "missing-credentials",
        requestUnits: 4,
        auditEventName: "provider.request.blocked"
      }),
      expect.objectContaining({
        adapterId: "google-gemini-image",
        status: "blocked",
        fallbackReason: "missing-credentials",
        requestUnits: 4,
        auditEventName: "provider.request.blocked"
      })
    ]);
    expect(plan.ledgerEvents.at(-1)).toEqual(
      expect.objectContaining({
        adapterId: "browser-svg-renderer",
        status: "fallback-selected",
        fallbackFromAdapterId: "openai-images",
        fallbackReason: "missing-credentials",
        estimatedCostCents: 0,
        piiFree: true,
        liveNetworkCall: false,
        auditEventName: "provider.fallback.selected"
      })
    );
  });

  it("reserves budget for the first ready provider without performing a live call", () => {
    const plan = buildProviderFailoverPlan({
      capability: "image-generation",
      routeId: "render-packets",
      tenantId: "tenant-a",
      preferredAdapterIds: ["openai-images", "google-gemini-image"],
      env: openAiEnv,
      gates: imageGates,
      nowIso,
      requestUnits: 4
    });

    expect(plan.mode).toBe("prepared-request");
    expect(plan.selectedAdapterId).toBe("openai-images");
    expect(plan.attempts[0]).toMatchObject({
      adapterId: "openai-images",
      status: "ready",
      monthlyBudgetCents: 4000,
      projectedMonthlySpendCents: 4
    });
    expect(plan.ledgerEvents).toEqual([
      expect.objectContaining({
        adapterId: "openai-images",
        status: "reserved",
        requestUnits: 4,
        estimatedCostCents: 4,
        monthBucket: "2026-06",
        piiFree: true,
        liveNetworkCall: false,
        auditEventName: "provider.request.reserved"
      })
    ]);
  });

  it("skips over-budget providers and selects the next configured provider", () => {
    const openAi = getProviderAdapter("openai-images");
    expect(openAi).toBeDefined();
    const priorSpend = buildProviderCallEvent({
      adapter: openAi!,
      tenantId: "tenant-a",
      routeId: "render-packets",
      status: "succeeded",
      nowIso: "2026-06-10T11:00:00.000Z",
      requestUnits: 3997,
      estimatedCostCents: 3997,
      actualCostCents: 3997
    });

    const plan = buildProviderFailoverPlan({
      capability: "image-generation",
      routeId: "render-packets",
      tenantId: "tenant-a",
      preferredAdapterIds: ["openai-images", "google-gemini-image"],
      env: { ...openAiEnv, ...googleEnv },
      gates: imageGates,
      usageEvents: [priorSpend],
      nowIso,
      requestUnits: 4
    });

    expect(plan.mode).toBe("prepared-request");
    expect(plan.selectedAdapterId).toBe("google-gemini-image");
    expect(plan.attempts[0]).toMatchObject({
      adapterId: "openai-images",
      status: "blocked",
      reason: "monthly-budget-exceeded",
      monthlySpentCents: 3997,
      projectedMonthlySpendCents: 4001
    });
    expect(plan.ledgerEvents.map((event) => event.status)).toEqual(["blocked", "reserved"]);
    expect(plan.ledgerEvents[0]).toMatchObject({
      adapterId: "openai-images",
      status: "blocked",
      fallbackReason: "monthly-budget-exceeded",
      requestUnits: 4,
      estimatedCostCents: 4
    });
    expect(plan.ledgerEvents[1]).toMatchObject({
      adapterId: "google-gemini-image",
      status: "reserved",
      estimatedCostCents: 4
    });
  });

  it("uses the local fallback when every configured provider exceeds the current rate window", () => {
    const openAi = getProviderAdapter("openai-images");
    const google = getProviderAdapter("google-gemini-image");
    expect(openAi).toBeDefined();
    expect(google).toBeDefined();
    const recentEvents = [...Array(6)].flatMap((_, index) => [
      buildProviderCallEvent({
        adapter: openAi!,
        tenantId: "tenant-a",
        routeId: "render-packets",
        status: "reserved",
        nowIso: `2026-06-11T15:04:${String(10 + index).padStart(2, "0")}.000Z`,
        requestUnits: 1,
        estimatedCostCents: 75
      }),
      buildProviderCallEvent({
        adapter: google!,
        tenantId: "tenant-a",
        routeId: "render-packets",
        status: "reserved",
        nowIso: `2026-06-11T15:04:${String(20 + index).padStart(2, "0")}.000Z`,
        requestUnits: 1,
        estimatedCostCents: 75
      })
    ]);

    const plan = buildProviderFailoverPlan({
      capability: "image-generation",
      routeId: "render-packets",
      tenantId: "tenant-a",
      preferredAdapterIds: ["openai-images", "google-gemini-image"],
      env: { ...openAiEnv, ...googleEnv },
      gates: imageGates,
      usageEvents: recentEvents,
      nowIso,
      requestUnits: 1
    });

    expect(plan.mode).toBe("local-fallback");
    expect(plan.selectedAdapterId).toBe("browser-svg-renderer");
    expect(plan.attempts.every((attempt) => attempt.reason === "rate-limit-exceeded")).toBe(true);
    expect(plan.ledgerEvents.map((event) => event.status)).toEqual(["blocked", "blocked", "fallback-selected"]);
    expect(plan.ledgerEvents.slice(0, 2).map((event) => event.fallbackReason)).toEqual([
      "rate-limit-exceeded",
      "rate-limit-exceeded"
    ]);
    expect(plan.ledgerEvents.at(-1)).toMatchObject({
      status: "fallback-selected",
      fallbackReason: "rate-limit-exceeded",
      liveNetworkCall: false
    });
  });

  it("summarizes monthly spend and audit events by tenant", () => {
    const openAi = getProviderAdapter("openai-images");
    const fallback = getProviderAdapter("browser-svg-renderer");
    expect(openAi).toBeDefined();
    expect(fallback).toBeDefined();
    const events = [
      buildProviderCallEvent({
        adapter: openAi!,
        tenantId: "tenant-a",
        routeId: "render-packets",
        status: "succeeded",
        nowIso,
        requestUnits: 4,
        estimatedCostCents: 300,
        actualCostCents: 280
      }),
      buildProviderCallEvent({
        adapter: fallback!,
        tenantId: "tenant-a",
        routeId: "render-packets",
        status: "fallback-selected",
        nowIso,
        requestUnits: 1,
        estimatedCostCents: 0,
        fallbackFromAdapterId: "openai-images",
        fallbackReason: "monthly-budget-exceeded"
      }),
      buildProviderCallEvent({
        adapter: openAi!,
        tenantId: "tenant-b",
        routeId: "render-packets",
        status: "succeeded",
        nowIso,
        requestUnits: 1,
        estimatedCostCents: 75
      })
    ];

    expect(monthBucketFromIso(nowIso)).toBe("2026-06");
    expect(providerMonthlySpendCents({ events, adapterId: "openai-images", tenantId: "tenant-a", monthBucket: "2026-06" })).toBe(280);
    expect(providerRateWindowCount({ events, adapterId: "openai-images", tenantId: "tenant-a", nowIso })).toBe(4);
    expect(summarizeProviderUsage(events, { tenantId: "tenant-a", nowIso })).toMatchObject({
      tenantId: "tenant-a",
      monthBucket: "2026-06",
      events: 2,
      adapters: 2,
      reservedOrSpentCents: 300,
      actualSpendCents: 280,
      fallbackEvents: 1,
      overBudgetBlocks: 1,
      liveNetworkCalls: 0
    });
  });
});
