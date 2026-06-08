import type { PrinterCouponApplication, PrinterPriceEstimate, PrinterPricingComparison, PrinterPricingSpeed } from "./printerPricing";

export type FulfillmentRecommendationKind = "lowest-current-estimate" | "fastest-pickup" | "cheapest-shipped";
export type FulfillmentRecommendationMode = "review-only-public-price" | "manual-confirmation-required";
export type FulfillmentRecommendationPriceProofStatus = "public-estimate-only" | "same-cart-coupon-verified";

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
  subtotalIncludesCoupon: boolean;
  priceProofStatus: FulfillmentRecommendationPriceProofStatus;
  priceProofLabel: string;
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
  "lowest-current-estimate",
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
      "lowest-current-estimate",
      "Lowest current estimate",
      cheapestKnown,
      "Public prices and source-listed coupons are only estimates until the print shop accepts them in the same cart."
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
    if (recommendation.label === "Cheapest known price") {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must not claim cheapest known price.`);
    }
    if (recommendation.priceProofStatus === "same-cart-coupon-verified" && !recommendation.subtotalIncludesCoupon) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must include a coupon subtotal before claiming same-cart coupon proof.`);
    }
    if (recommendation.priceProofStatus === "public-estimate-only" && recommendation.subtotalIncludesCoupon) {
      issues.push(`Fulfillment recommendation ${recommendation.kind} must not hide same-cart coupon proof as a public estimate.`);
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
      subtotalIncludesCoupon: false,
      priceProofStatus: "public-estimate-only",
      priceProofLabel: "Manual quote",
      sourceMode: "manual-confirmation-required",
      liveQuote: false,
      directOrderEnabled: false,
      requiresManualConfirmation: true,
      confirmationCopy,
      blocker: "No public price observation is available for this recommendation."
    };
  }

  const priceProof = priceProofForCouponApplication(estimate.couponApplication);

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
    subtotalIncludesCoupon: estimate.subtotalIncludesCoupon,
    priceProofStatus: priceProof.status,
    priceProofLabel: priceProof.label,
    sourceMode: "review-only-public-price",
    liveQuote: false,
    directOrderEnabled: false,
    requiresManualConfirmation: true,
    confirmationCopy,
    blocker: "Live tax, stock, pickup slot, shipping fee, payment, and direct order submission still need review."
  };
}

function priceProofForCouponApplication(
  couponApplication: PrinterCouponApplication
): { status: FulfillmentRecommendationPriceProofStatus; label: string } {
  if (couponApplication.status === "applied") {
    return { status: "same-cart-coupon-verified", label: "Coupon verified in cart" };
  }

  return { status: "public-estimate-only", label: "Estimate only" };
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
