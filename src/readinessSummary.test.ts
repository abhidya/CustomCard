import { describe, expect, it } from "vitest";
import { buildApiBootstrapPayload, buildApiReadinessSummary } from "./apiContracts";
import {
  buildReadinessSummary,
  readinessDomainIds,
  validateReadinessDomains,
  validateReadinessSummary
} from "./readinessSummary";
import {
  buildReadinessSummary as buildRuntimeReadinessSummary,
  readinessDomainIds as runtimeReadinessDomainIds,
  validateReadinessDomains as validateRuntimeReadinessDomains,
  validateReadinessSummary as validateRuntimeReadinessSummary
} from "./readinessSummaryData.mjs";

describe("readinessSummary", () => {
  it("keeps the readiness domain manifest as the single domain list", () => {
    expect(readinessDomainIds).toEqual([
      "aiProvider",
      "aiQueueOperations",
      "businessEngagement",
      "capacity",
      "cloudArtifactProof",
      "e2eCoverage",
      "externalAudit",
      "hostedApi",
      "legalCompliance",
      "mobileRender",
      "observability",
      "payment",
      "retailFulfillment",
      "reviewerDbSeed"
    ]);
    expect(runtimeReadinessDomainIds).toEqual(readinessDomainIds);
    expect(new Set(readinessDomainIds).size).toBe(readinessDomainIds.length);
    expect(validateReadinessDomains()).toEqual([]);
    expect(validateRuntimeReadinessDomains()).toEqual([]);
    expect(validateReadinessSummary()).toEqual([]);
    expect(validateRuntimeReadinessSummary()).toEqual([]);
  });

  it("builds a summary with all 14 readiness domains present", () => {
    const summary = buildReadinessSummary();
    const runtimeSummary = buildRuntimeReadinessSummary();

    expect(Object.keys(summary)).toEqual(readinessDomainIds);
    expect(Object.keys(runtimeSummary)).toEqual(readinessDomainIds);

    expect(summary.aiProvider.items.length).toBeGreaterThan(0);
    expect(summary.aiProvider.summary.total).toBeGreaterThan(0);

    expect(summary.aiQueueOperations.items.length).toBeGreaterThan(0);
    expect(summary.aiQueueOperations.summary.total).toBeGreaterThan(0);

    expect(summary.businessEngagement.items.length).toBeGreaterThan(0);
    expect(summary.businessEngagement.summary.total).toBeGreaterThan(0);

    expect(summary.capacity.profiles.length).toBeGreaterThan(0);
    expect(summary.capacity.summary.total).toBeGreaterThan(0);

    expect(summary.cloudArtifactProof.items.length).toBeGreaterThan(0);
    expect(summary.cloudArtifactProof.summary.total).toBeGreaterThan(0);

    expect(summary.e2eCoverage.items.length).toBeGreaterThan(0);
    expect(summary.e2eCoverage.summary.total).toBeGreaterThan(0);

    expect(summary.externalAudit.items.length).toBeGreaterThan(0);
    expect(summary.externalAudit.summary.total).toBeGreaterThan(0);

    expect(summary.hostedApi.items.length).toBeGreaterThan(0);
    expect(summary.hostedApi.summary.total).toBeGreaterThan(0);

    expect(summary.legalCompliance.items.length).toBeGreaterThan(0);
    expect(summary.legalCompliance.summary.total).toBeGreaterThan(0);

    expect(summary.mobileRender.items.length).toBeGreaterThan(0);
    expect(summary.mobileRender.summary.total).toBeGreaterThan(0);

    expect(summary.observability.items.length).toBeGreaterThan(0);
    expect(summary.observability.summary.total).toBeGreaterThan(0);

    expect(summary.payment.items.length).toBeGreaterThan(0);
    expect(summary.payment.summary.total).toBeGreaterThan(0);

    expect(summary.retailFulfillment.items.length).toBeGreaterThan(0);
    expect(summary.retailFulfillment.summary.total).toBeGreaterThan(0);

    expect(summary.reviewerDbSeed.items.length).toBeGreaterThan(0);
    expect(summary.reviewerDbSeed.summary.total).toBeGreaterThan(0);
  });

  it("summary items are immutable references to the static item arrays (no re-allocation)", () => {
    const a = buildReadinessSummary();
    const b = buildReadinessSummary();
    expect(a.aiProvider.items).toBe(b.aiProvider.items);
    expect(a.aiQueueOperations.items).toBe(b.aiQueueOperations.items);
    expect(a.capacity.profiles).toBe(b.capacity.profiles);
  });

  it("production gates are all blocked — no live services claimed ready", () => {
    const { aiProvider, aiQueueOperations, payment, hostedApi, retailFulfillment } = buildReadinessSummary();
    expect(aiProvider.summary.liveProviderCallsEnabled).toBe(0);
    expect(aiQueueOperations.summary.liveProviderCalls).toBe(0);
    expect(aiQueueOperations.summary.externalNetworkCalls).toBe(0);
    expect(payment.summary.liveChargesEnabled).toBe(0);
    expect(hostedApi.summary.liveProviderCalls).toBe(0);
    expect(retailFulfillment.summary.directOrderEnabled).toBe(0);
    expect(buildReadinessSummary().legalCompliance.summary.publicClaimsAllowed).toBe(0);
  });

  it("validates domain proof rules from the runtime manifest", () => {
    const readiness = buildReadinessSummary();

    expect(
      validateReadinessSummary({
        ...readiness,
        aiProvider: {
          ...readiness.aiProvider,
          summary: {
            ...readiness.aiProvider.summary,
            liveProviderCallsEnabled: 1
          }
        }
      })
    ).toContain("AI provider readiness cannot enable live provider calls.");

    expect(
      validateReadinessSummary({
        ...readiness,
        legalCompliance: {
          ...readiness.legalCompliance,
          summary: {
            ...readiness.legalCompliance.summary,
            publicClaimsAllowed: 1
          }
        }
      })
    ).toContain("Legal compliance readiness cannot allow public claims.");
  });

  it("feeds API readiness and bootstrap from the same readiness seam", () => {
    const readiness = buildReadinessSummary();
    const apiReadiness = buildApiReadinessSummary();
    const bootstrap = buildApiBootstrapPayload();

    expect(apiReadiness.aiProviderReadiness).toEqual(readiness.aiProvider.summary);
    expect(apiReadiness.aiQueueOperations).toEqual(readiness.aiQueueOperations.summary);
    expect(apiReadiness.paymentReadiness).toEqual(readiness.payment.summary);
    expect(apiReadiness.hostedApiReadiness).toEqual(readiness.hostedApi.summary);
    expect(apiReadiness.legalCompliance).toEqual(readiness.legalCompliance.summary);
    expect(apiReadiness.businessEngagementReadiness).toEqual(readiness.businessEngagement.summary);

    expect(bootstrap.aiProviderReadiness.items).toBe(readiness.aiProvider.items);
    expect(bootstrap.aiQueueOperations.items).toBe(readiness.aiQueueOperations.items);
    expect(bootstrap.capacity.profiles).toBe(readiness.capacity.profiles);
    expect(bootstrap.cloudArtifactProofReadiness.items).toBe(readiness.cloudArtifactProof.items);
    expect(bootstrap.legalCompliance.items).toBe(readiness.legalCompliance.items);
    expect(bootstrap.reviewerDbSeedReadiness.items).toBe(readiness.reviewerDbSeed.items);
  });
});
