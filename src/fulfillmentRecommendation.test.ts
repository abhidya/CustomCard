import { describe, expect, it } from "vitest";
import {
  buildFulfillmentRecommendations,
  validateFulfillmentRecommendations,
  type FulfillmentRecommendation
} from "./fulfillmentRecommendation";
import { buildPrinterPricingComparison, printerPriceCatalog } from "./printerPricing";

const reviewedAt = new Date("2026-06-07T12:00:00.000Z");

describe("fulfillment recommendations", () => {
  it("builds customer-safe estimate, pickup, and shipped recommendations from public pricing", () => {
    const comparison = buildPrinterPricingComparison("walgreens", 1, printerPriceCatalog, reviewedAt);
    const recommendationSet = buildFulfillmentRecommendations(comparison);

    expect(recommendationSet).toMatchObject({
      quantity: 1,
      liveQuote: false,
      directOrderEnabled: false,
      blockers: []
    });
    expect(recommendationSet.recommendations.map((recommendation) => recommendation.kind)).toEqual([
      "lowest-current-estimate",
      "fastest-pickup",
      "cheapest-shipped"
    ]);
    expect(recommendationSet.recommendations[0]).toMatchObject({
      label: "Lowest current estimate",
      vendorName: "Walmart Photo",
      subtotalLabel: "$0.56",
      etaLabel: "same-day pickup candidate",
      subtotalIncludesCoupon: false,
      priceProofStatus: "public-estimate-only",
      priceProofLabel: "Estimate only",
      sourceMode: "review-only-public-price",
      liveQuote: false,
      directOrderEnabled: false,
      requiresManualConfirmation: true,
      confirmationCopy: expect.stringContaining("print shop accepts them in the same cart")
    });
    expect(recommendationSet.recommendations.map((recommendation) => recommendation.label)).not.toContain("Cheapest known price");
    expect(recommendationSet.recommendations[0].confirmationCopy).not.toMatch(/provider-portal|gated/i);
    expect(recommendationSet.recommendations[1]).toMatchObject({
      label: "Fastest pickup candidate",
      vendorName: "Walmart Photo",
      subtotalLabel: "$0.56",
      etaLabel: "same-day pickup candidate"
    });
    expect(recommendationSet.recommendations[2]).toMatchObject({
      label: "Cheapest shipped option",
      vendorName: "FedEx Office",
      subtotalLabel: "$22.99",
      etaLabel: "ships in days",
      pickupEligible: false
    });
    expect(recommendationSet.recommendations.every((recommendation) => recommendation.blocker.includes("Live tax"))).toBe(
      true
    );
  });

  it("keeps recommendations review-only and fails unsafe live-fulfillment claims", () => {
    const recommendations = buildFulfillmentRecommendations(buildPrinterPricingComparison("walgreens")).recommendations;
    const unsafe: FulfillmentRecommendation = {
      ...recommendations[0],
      label: "Cheapest known price",
      subtotalCents: 0,
      liveQuote: true as never,
      directOrderEnabled: true as never,
      requiresManualConfirmation: false as never,
      sourceMode: "manual-confirmation-required",
      confirmationCopy: "",
      blocker: ""
    };

    expect(validateFulfillmentRecommendations([unsafe, recommendations[0]])).toEqual(
      expect.arrayContaining([
        "Duplicate fulfillment recommendation: lowest-current-estimate.",
        "Fulfillment recommendation lowest-current-estimate must expose a positive subtotal.",
        "Fulfillment recommendation lowest-current-estimate must not claim a live quote.",
        "Fulfillment recommendation lowest-current-estimate must not enable direct ordering.",
        "Fulfillment recommendation lowest-current-estimate must require manual confirmation.",
        "Fulfillment recommendation lowest-current-estimate must stay review-only.",
        "Fulfillment recommendation lowest-current-estimate must include confirmation copy.",
        "Fulfillment recommendation lowest-current-estimate must not claim cheapest known price.",
        "Fulfillment recommendation lowest-current-estimate must explain live fulfillment blockers.",
        "Missing fulfillment recommendation: fastest-pickup.",
        "Missing fulfillment recommendation: cheapest-shipped."
      ])
    );
  });
});
