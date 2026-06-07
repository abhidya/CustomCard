import type { PrinterPriceEstimate, PrinterPricingComparison, PrinterPricingSpeed } from "./printerPricing";

export type FulfillmentRecommendationKind = "cheapest-known-price" | "fastest-pickup" | "cheapest-shipped";
export type FulfillmentRecommendationMode = "review-only-public-price" | "manual-confirmation-required";

export interface FulfillmentRecommendation {
  kind: FulfillmentRecommendationKind;
  label: string;
  vendorName: string;
  productName: string;
  subtotalCents: number;
  subtotalLabel: string;
  etaLabel: string;
  pricedQuantity: number;
  pickupEligible: boolean;
  sourceMode: FulfillmentRecommendationMode;
  liveQuote: false;
  directOrderEnabled: false;
  requiresManualConfirmation: true;
  confirmationCopy: string;
  blocker: string;
}

export interface FulfillmentRecommendationSet {
  quantity: number;
  recommendations: FulfillmentRecommendation[];
  blockers: string[];
  liveQuote: false;
  directOrderEnabled: false;
  disclaimer: string;
}

const requiredKinds: FulfillmentRecommendationKind[] = [
  "cheapest-known-price",
  "fastest-pickup",
  "cheapest-shipped"
];

export function buildFulfillmentRecommendations(comparison: PrinterPricingComparison): FulfillmentRecommendationSet {
  const cheapestKnown = comparison.rankedKnownPrices[0];
  const fastestPickup = comparison.rankedKnownPrices
    .filter((estimate) => estimate.observation.pickupEligible)
    .sort(comparePickupEstimate)[0];
  const cheapestShipped = comparison.rankedKnownPrices.find((estimate) => !estimate.observation.pickupEligible);
  const recommendations = [
    buildRecommendation(
      "cheapest-known-price",
      "Cheapest known price",
      cheapestKnown,
      "Effective price includes only provider-portal-applied coupons; tax, stock, and checkout confirmation remain gated."
    ),
    buildRecommendation(
      "fastest-pickup",
      "Fastest pickup candidate",
      fastestPickup,
      "Closest store ETA needs live location and inventory confirmation."
    ),
    buildRecommendation(
      "cheapest-shipped",
      "Cheapest shipped option",
      cheapestShipped,
      "Shipping dates and delivery fees require checkout confirmation."
    )
  ];

  const blockers = validateFulfillmentRecommendations(recommendations);

  return {
    quantity: comparison.quantity,
    recommendations,
    blockers,
    liveQuote: false,
    directOrderEnabled: false,
    disclaimer: comparison.disclaimer
  };
}

export function validateFulfillmentRecommendations(recommendations: FulfillmentRecommendation[]): string[] {
  const issues: string[] = [];
  const byKind = new Map<FulfillmentRecommendationKind, FulfillmentRecommendation>();

  for (const recommendation of recommendations) {
    if (byKind.has(recommendation.kind)) issues.push(`Duplicate fulfillment recommendation: ${recommendation.kind}.`);
    byKind.set(recommendation.kind, recommendation);

    if (recommendation.subtotalCents <= 0) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must expose a positive subtotal.`);
    }
    if (recommendation.liveQuote) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must not claim a live quote.`);
    }
    if (recommendation.directOrderEnabled) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must not enable direct ordering.`);
    }
    if (!recommendation.requiresManualConfirmation) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must require manual confirmation.`);
    }
    if (recommendation.sourceMode !== "review-only-public-price") {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must stay review-only.`);
    }
    if (!recommendation.confirmationCopy.trim()) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must include confirmation copy.`);
    }
    if (!recommendation.blocker.trim()) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must explain live fulfillment blockers.`);
    }
  }

  for (const kind of requiredKinds) {
    if (!byKind.has(kind)) issues.push(`Missing fulfillment recommendation: ${kind}.`);
  }

  return issues;
}

function buildRecommendation(
  kind: FulfillmentRecommendationKind,
  label: string,
  estimate: PrinterPriceEstimate | undefined,
  confirmationCopy: string
): FulfillmentRecommendation {
  if (!estimate) {
    return {
      kind,
      label,
      vendorName: "Manual quote",
      productName: "Manual quote required",
      subtotalCents: 1,
      subtotalLabel: "Manual quote",
      etaLabel: "manual confirmation",
      pricedQuantity: 1,
      pickupEligible: false,
      sourceMode: "manual-confirmation-required",
      liveQuote: false,
      directOrderEnabled: false,
      requiresManualConfirmation: true,
      confirmationCopy,
      blocker: "No public price observation is available for this recommendation."
    };
  }

  return {
    kind,
    label,
    vendorName: estimate.observation.vendorName,
    productName: estimate.observation.productName,
    subtotalCents: estimate.effectiveSubtotalCents,
    subtotalLabel: estimate.effectiveSubtotalLabel,
    etaLabel: speedLabel(estimate.observation.speed, estimate.observation.pickupEligible),
    pricedQuantity: estimate.pricedQuantity,
    pickupEligible: estimate.observation.pickupEligible,
    sourceMode: "review-only-public-price",
    liveQuote: false,
    directOrderEnabled: false,
    requiresManualConfirmation: true,
    confirmationCopy,
    blocker: "Live tax, stock, pickup slot, shipping fee, payment, and direct order submission remain gated."
  };
}

function comparePickupEstimate(first: PrinterPriceEstimate, second: PrinterPriceEstimate): number {
  return (
    speedRank(first.observation.speed) - speedRank(second.observation.speed) ||
    first.effectiveSubtotalCents - second.effectiveSubtotalCents ||
    first.observation.vendorName.localeCompare(second.observation.vendorName)
  );
}

function speedLabel(speed: PrinterPricingSpeed, pickupEligible: boolean): string {
  if (pickupEligible && speed === "same-day") return "same-day pickup candidate";
  if (pickupEligible && speed === "24-hour") return "24-hour pickup candidate";
  if (speed === "ships-in-days") return "ships in days";
  return "manual ETA";
}

function speedRank(speed: PrinterPricingSpeed): number {
  const ranks: Record<PrinterPricingSpeed, number> = {
    "same-day": 1,
    "24-hour": 2,
    "ships-in-days": 3,
    "manual-confirm": 4
  };
  return ranks[speed];
}
