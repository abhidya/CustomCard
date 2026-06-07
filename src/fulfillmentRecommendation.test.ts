import { describe, expect, it } from "vitest";
import {
  buildFulfillmentRecommendations,
  validateFulfillmentRecommendations,
  type FulfillmentRecommendation
} from "./fulfillmentRecommendation";
import { buildPrinterPricingComparison, printerPriceCatalog } from "./printerPricing";

const reviewedAt = new Date("2026-06-07T12:00:00.000Z");

describe("fulfillment recommendations", () => {
  it("builds customer-safe cheapest, pickup, and shipped recommendations from public pricing", () => {
    const comparison = buildPrinterPricingComparison("walgreens", 1, printerPriceCatalog, reviewedAt);
    const recommendationSet = buildFulfillmentRecommendations(comparison);

    expect(recommendationSet).toMatchObject({
      quantity: 1,
      liveQuote: false,
      directOrderEnabled: false,
      blockers: []
    });
    expect(recommendationSet.recommendations.map((recommendation) => recommendation.kind)).toEqual([
      "cheapest-known-price",
      "fastest-pickup",
      "cheapest-shipped"
    ]);
    expect(recommendationSet.recommendations[0]).toMatchObject({
      label: "Cheapest known price",
      vendorName: "Walmart Photo",
      subtotalLabel: "$0.56",
      etaLabel: "same-day pickup candidate",
      sourceMode: "review-only-public-price",
      liveQuote: false,
      directOrderEnabled: false,
      requiresManualConfirmation: true,
      confirmationCopy: expect.stringContaining("provider-portal-applied coupons")
    });
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
        "Duplicate fulfillment recommendation: cheapest-known-price.",
        "Fulfillment recommendation cheapest-known-price must expose a positive subtotal.",
        "Fulfillment recommendation cheapest-known-price must not claim a live quote.",
        "Fulfillment recommendation cheapest-known-price must not enable direct ordering.",
        "Fulfillment recommendation cheapest-known-price must require manual confirmation.",
        "Fulfillment recommendation cheapest-known-price must stay review-only.",
        "Fulfillment recommendation cheapest-known-price must include confirmation copy.",
        "Fulfillment recommendation cheapest-known-price must explain live fulfillment blockers.",
        "Missing fulfillment recommendation: fastest-pickup.",
        "Missing fulfillment recommendation: cheapest-shipped."
      ])
    );
  });
});
