import { describe, expect, it } from "vitest";
import { buildReadinessSummary } from "./readinessSummary";

describe("readinessSummary", () => {
  it("builds a summary with all 12 readiness domains present", () => {
    const summary = buildReadinessSummary();

    expect(summary.aiProvider.items.length).toBeGreaterThan(0);
    expect(summary.aiProvider.summary.total).toBeGreaterThan(0);

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
    expect(a.capacity.profiles).toBe(b.capacity.profiles);
  });

  it("production gates are all blocked — no live services claimed ready", () => {
    const { aiProvider, payment, hostedApi, retailFulfillment } = buildReadinessSummary();
    expect(aiProvider.summary.liveProviderCallsEnabled).toBe(0);
    expect(payment.summary.liveChargesEnabled).toBe(0);
    expect(hostedApi.summary.liveProviderCalls).toBe(0);
    expect(retailFulfillment.summary.directOrderEnabled).toBe(0);
  });
});
