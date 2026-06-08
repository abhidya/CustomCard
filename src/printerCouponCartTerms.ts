import type {
  PrinterCouponAccountState,
  PrinterCouponFulfillmentMode,
  PrinterCouponOffer,
  PrinterPriceObservation
} from "./printerPricing";

/**
 * Cart Terms — the seam that answers one question: is this coupon valid for this
 * cart? A Coupon Offer only earns a discount once provider-portal evidence proves
 * it worked for the exact cart context (vendor, product kind, size, quantity,
 * fulfillment mode, account state) and the discount math matches.
 *
 * Both the ranking path (`buildPrinterCouponApplication` in printerPricing) and
 * the evidence-import path (`printerCouponPortalEvidence`) depend on this one
 * module, so the "valid for this cart" rules live in a single place instead of
 * being one facet of the 2k-line pricing module.
 */

export function isPrinterCouponActive(offer: PrinterCouponOffer, now: Date): boolean {
  const startsAt = new Date(offer.startsAtIso).getTime();
  const endsAt = new Date(offer.endsAtIso).getTime();
  const current = now.getTime();

  return startsAt <= current && current <= endsAt;
}

export function hasMatchingProviderPortalCouponEvidence(
  offer: PrinterCouponOffer,
  observation: PrinterPriceObservation,
  subtotalCents: number,
  pricedQuantity = observation.minimumQuantity
): boolean {
  const evidence = offer.portalApplicationEvidence;
  if (offer.evidenceStatus !== "provider-portal-applied" || !evidence) return false;
  if (validatePrinterCouponPortalApplicationEvidence(offer).length > 0) return false;

  const expectedDiscountCents = Math.floor((subtotalCents * offer.discountPercent) / 100);
  const expectedAfterCouponCents = Math.max(subtotalCents - expectedDiscountCents, 0);
  const expectedFulfillmentMode: PrinterCouponFulfillmentMode = observation.pickupEligible ? "pickup" : "shipping";
  const expectedAccountState: PrinterCouponAccountState = offer.requiresLoggedInAccount ? "logged-in" : evidence.cartTerms.accountState;

  return (
    evidence.sourcePriceObservationId === observation.id &&
    evidence.subtotalBeforeCouponCents === subtotalCents &&
    evidence.discountCents === expectedDiscountCents &&
    evidence.subtotalAfterCouponCents === expectedAfterCouponCents &&
    evidence.cartTerms.vendorId === observation.vendorId &&
    evidence.cartTerms.productKind === observation.productKind &&
    evidence.cartTerms.size === observation.size &&
    evidence.cartTerms.pricedQuantity === pricedQuantity &&
    evidence.cartTerms.fulfillmentMode === expectedFulfillmentMode &&
    evidence.cartTerms.accountState === expectedAccountState
  );
}

export function validatePrinterCouponPortalApplicationEvidence(offer: PrinterCouponOffer): string[] {
  const errors: string[] = [];
  const evidence = offer.portalApplicationEvidence;

  if (!evidence) return [`Printer coupon ${offer.id} must include structured provider portal application evidence.`];
  if (!evidence.portalUrl.startsWith("https://")) {
    errors.push(`Printer coupon ${offer.id} portal evidence must cite an HTTPS provider portal URL.`);
  }
  if (!evidence.providerPortal) errors.push(`Printer coupon ${offer.id} portal evidence must come from a provider portal.`);
  if (!evidence.sameCartTermsProven) {
    errors.push(`Printer coupon ${offer.id} portal evidence must prove same cart terms.`);
  }
  if (!evidence.noOrderPlaced) errors.push(`Printer coupon ${offer.id} portal evidence must preserve no-live-order safety.`);
  if (evidence.subtotalBeforeCouponCents <= 0) {
    errors.push(`Printer coupon ${offer.id} portal evidence must include a positive pre-coupon subtotal.`);
  }
  if (evidence.discountCents <= 0) errors.push(`Printer coupon ${offer.id} portal evidence must include a positive discount.`);
  if (evidence.subtotalAfterCouponCents < 0) {
    errors.push(`Printer coupon ${offer.id} portal evidence must not include a negative post-coupon subtotal.`);
  }
  if (evidence.subtotalBeforeCouponCents - evidence.discountCents !== evidence.subtotalAfterCouponCents) {
    errors.push(`Printer coupon ${offer.id} portal evidence subtotal math must match the applied discount.`);
  }
  if (!evidence.blockedFields.includes("payment submission")) {
    errors.push(`Printer coupon ${offer.id} portal evidence must block payment submission.`);
  }
  if (!evidence.blockedFields.includes("live order placement")) {
    errors.push(`Printer coupon ${offer.id} portal evidence must block live order placement.`);
  }
  if (evidence.cartTerms.vendorId !== offer.vendorId) {
    errors.push(`Printer coupon ${offer.id} portal evidence must match the coupon vendor.`);
  }
  if (!offer.appliesToProductKinds.includes(evidence.cartTerms.productKind)) {
    errors.push(`Printer coupon ${offer.id} portal evidence must match an eligible product kind.`);
  }
  if (evidence.cartTerms.pricedQuantity < 1) {
    errors.push(`Printer coupon ${offer.id} portal evidence must include a positive priced quantity.`);
  }
  if (offer.requiresLoggedInAccount && evidence.cartTerms.accountState !== "logged-in") {
    errors.push(`Printer coupon ${offer.id} portal evidence must match the required logged-in account state.`);
  }

  return errors;
}
