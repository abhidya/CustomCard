import { describe, expect, it } from "vitest";
import {
  hasMatchingProviderPortalCouponEvidence,
  isPrinterCouponActive,
  validatePrinterCouponPortalApplicationEvidence
} from "./printerCouponCartTerms";
import { printerCouponOffers, printerPriceCatalog } from "./printerPricing";
import type {
  PrinterCouponOffer,
  PrinterCouponPortalApplicationEvidence,
  PrinterPriceObservation
} from "./printerPricing";

// Real fixtures: the Cart Terms seam is the single fact both ranking and
// evidence-import depend on, so the tests exercise it against the live catalog
// observation rather than a hand-built shape that could drift from production.
const walgreensFoldedCard = printerPriceCatalog.find(
  (observation) => observation.id === "walgreens-5x7-folded-card"
) as PrinterPriceObservation;

// Reuse a real Coupon Source so the offer fixture cannot drift from the
// production source shape; only the cart-relevant fields are pinned here.
const realCouponSource = printerCouponOffers[0].source;

const SUBTOTAL_CENTS = walgreensFoldedCard.unitPriceCents; // qty 1 -> 349
const DISCOUNT_PERCENT = 60;
const EXPECTED_DISCOUNT = Math.floor((SUBTOTAL_CENTS * DISCOUNT_PERCENT) / 100); // 209
const EXPECTED_AFTER = SUBTOTAL_CENTS - EXPECTED_DISCOUNT; // 140

function validEvidence(): PrinterCouponPortalApplicationEvidence {
  return {
    observedAtIso: "2026-06-07T12:15:00.000Z",
    portalUrl: "https://photo.walgreens.com/store/cart",
    providerPortal: true,
    sourcePriceObservationId: walgreensFoldedCard.id,
    subtotalBeforeCouponCents: SUBTOTAL_CENTS,
    discountCents: EXPECTED_DISCOUNT,
    subtotalAfterCouponCents: EXPECTED_AFTER,
    cartTerms: {
      vendorId: walgreensFoldedCard.vendorId,
      productKind: walgreensFoldedCard.productKind,
      size: "5x7",
      pricedQuantity: walgreensFoldedCard.minimumQuantity,
      fulfillmentMode: walgreensFoldedCard.pickupEligible ? "pickup" : "shipping",
      accountState: "logged-in"
    },
    sameCartTermsProven: true,
    noOrderPlaced: true,
    blockedFields: ["payment submission", "live order placement", "tax", "pickup window"]
  };
}

function validOffer(): PrinterCouponOffer {
  return {
    id: "test-walgreens-portal-applied",
    vendorId: walgreensFoldedCard.vendorId,
    label: "Test 60% folded cards",
    code: "TESTCARD",
    discountPercent: DISCOUNT_PERCENT,
    appliesToProductKinds: ["folded-card", "flat-card", "photo-card", "premium-card"],
    startsAtIso: "2026-06-01T00:00:00.000Z",
    endsAtIso: "2026-06-30T23:59:00.000Z",
    source: realCouponSource,
    sourceTargetIds: [],
    evidenceStatus: "provider-portal-applied",
    portalApplicationEvidence: validEvidence(),
    requiresLoggedInAccount: true,
    excludes: []
  };
}

// Deep-clone a copy so each branch test mutates in isolation.
function offerWith(
  mutate: (offer: PrinterCouponOffer, evidence: PrinterCouponPortalApplicationEvidence) => void
): PrinterCouponOffer {
  const offer = validOffer();
  mutate(offer, offer.portalApplicationEvidence!);
  return offer;
}

describe("isPrinterCouponActive", () => {
  const offer = validOffer();
  const start = new Date(offer.startsAtIso);
  const end = new Date(offer.endsAtIso);

  it("is active inside the window", () => {
    expect(isPrinterCouponActive(offer, new Date("2026-06-15T00:00:00.000Z"))).toBe(true);
  });

  it("is inclusive at the start and end boundaries", () => {
    expect(isPrinterCouponActive(offer, start)).toBe(true);
    expect(isPrinterCouponActive(offer, end)).toBe(true);
  });

  it("is inactive one millisecond before start and after end", () => {
    expect(isPrinterCouponActive(offer, new Date(start.getTime() - 1))).toBe(false);
    expect(isPrinterCouponActive(offer, new Date(end.getTime() + 1))).toBe(false);
  });
});

describe("validatePrinterCouponPortalApplicationEvidence", () => {
  it("returns no errors for fully valid evidence", () => {
    expect(validatePrinterCouponPortalApplicationEvidence(validOffer())).toEqual([]);
  });

  it("rejects a missing evidence record", () => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((offer) => {
        offer.portalApplicationEvidence = undefined;
      })
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("must include structured provider portal application evidence");
  });

  it.each([
    ["non-HTTPS portal url", (e: PrinterCouponPortalApplicationEvidence) => (e.portalUrl = "http://x"), "HTTPS provider portal URL"],
    ["non-provider portal", (e: PrinterCouponPortalApplicationEvidence) => ((e.providerPortal as boolean) = false), "must come from a provider portal"],
    ["unproven cart terms", (e: PrinterCouponPortalApplicationEvidence) => ((e.sameCartTermsProven as boolean) = false), "must prove same cart terms"],
    ["order placed", (e: PrinterCouponPortalApplicationEvidence) => ((e.noOrderPlaced as boolean) = false), "no-live-order safety"],
    ["non-positive pre-coupon subtotal", (e: PrinterCouponPortalApplicationEvidence) => (e.subtotalBeforeCouponCents = 0), "positive pre-coupon subtotal"],
    ["non-positive discount", (e: PrinterCouponPortalApplicationEvidence) => (e.discountCents = 0), "positive discount"],
    ["negative post-coupon subtotal", (e: PrinterCouponPortalApplicationEvidence) => (e.subtotalAfterCouponCents = -1), "negative post-coupon subtotal"],
    ["non-positive priced quantity", (e: PrinterCouponPortalApplicationEvidence) => (e.cartTerms.pricedQuantity = 0), "positive priced quantity"]
  ])("rejects %s", (_label, mutate, expectedFragment) => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((_offer, evidence) => mutate(evidence))
    );
    expect(errors.some((error) => error.includes(expectedFragment))).toBe(true);
  });

  it("rejects subtotal math that does not equal before - discount", () => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((_offer, evidence) => {
        evidence.subtotalAfterCouponCents = evidence.subtotalBeforeCouponCents; // discount ignored
      })
    );
    expect(errors.some((error) => error.includes("subtotal math must match the applied discount"))).toBe(true);
  });

  it.each([
    ["missing payment block", "payment submission", "must block payment submission"],
    ["missing live-order block", "live order placement", "must block live order placement"]
  ])("rejects %s", (_label, removed, expectedFragment) => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((_offer, evidence) => {
        evidence.blockedFields = evidence.blockedFields.filter((field) => field !== removed);
      })
    );
    expect(errors.some((error) => error.includes(expectedFragment))).toBe(true);
  });

  it("rejects a vendor mismatch between cart terms and the offer", () => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((_offer, evidence) => {
        evidence.cartTerms.vendorId = "cvs";
      })
    );
    expect(errors.some((error) => error.includes("must match the coupon vendor"))).toBe(true);
  });

  it("rejects a product kind the offer does not cover", () => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((offer, evidence) => {
        offer.appliesToProductKinds = ["flat-card"];
        evidence.cartTerms.productKind = "folded-card";
      })
    );
    expect(errors.some((error) => error.includes("must match an eligible product kind"))).toBe(true);
  });

  it("rejects a logged-out cart when the offer requires a logged-in account", () => {
    const errors = validatePrinterCouponPortalApplicationEvidence(
      offerWith((offer, evidence) => {
        offer.requiresLoggedInAccount = true;
        evidence.cartTerms.accountState = "guest-or-public";
      })
    );
    expect(errors.some((error) => error.includes("required logged-in account state"))).toBe(true);
  });
});

describe("hasMatchingProviderPortalCouponEvidence", () => {
  it("matches a fully valid portal-applied offer", () => {
    expect(
      hasMatchingProviderPortalCouponEvidence(validOffer(), walgreensFoldedCard, SUBTOTAL_CENTS, 1)
    ).toBe(true);
  });

  it("rejects an offer that is only source-listed", () => {
    expect(
      hasMatchingProviderPortalCouponEvidence(
        offerWith((offer) => {
          offer.evidenceStatus = "source-listed";
        }),
        walgreensFoldedCard,
        SUBTOTAL_CENTS,
        1
      )
    ).toBe(false);
  });

  it("rejects when the underlying evidence fails validation", () => {
    expect(
      hasMatchingProviderPortalCouponEvidence(
        offerWith((_offer, evidence) => {
          evidence.discountCents = 0; // invalid evidence
        }),
        walgreensFoldedCard,
        SUBTOTAL_CENTS,
        1
      )
    ).toBe(false);
  });

  it("rejects a subtotal that differs from the proven cart", () => {
    expect(
      hasMatchingProviderPortalCouponEvidence(validOffer(), walgreensFoldedCard, SUBTOTAL_CENTS + 100, 1)
    ).toBe(false);
  });

  it("rejects a priced quantity that differs from the proven cart", () => {
    expect(
      hasMatchingProviderPortalCouponEvidence(validOffer(), walgreensFoldedCard, SUBTOTAL_CENTS, 5)
    ).toBe(false);
  });

  it("rejects evidence recorded against a different price observation", () => {
    expect(
      hasMatchingProviderPortalCouponEvidence(
        offerWith((_offer, evidence) => {
          evidence.sourcePriceObservationId = "some-other-observation";
        }),
        walgreensFoldedCard,
        SUBTOTAL_CENTS,
        1
      )
    ).toBe(false);
  });
});
