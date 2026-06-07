import { describe, expect, it } from "vitest";
import { buildPrinterCouponApplication, printerCouponOffers, printerPriceCatalog } from "./printerPricing";
import {
  importPrinterCouponPortalEvidenceArtifact,
  validatePrinterCouponPortalEvidenceArtifact,
  type PrinterCouponPortalEvidenceArtifact
} from "./printerCouponPortalEvidence";

const reviewedAt = new Date("2026-06-07T12:00:00.000Z");

function walgreensPortalEvidenceArtifact(): PrinterCouponPortalEvidenceArtifact {
  return {
    service: "customcard-printer-coupon-portal-evidence",
    generatedAtIso: "2026-06-07T12:15:00.000Z",
    operatorAction:
      "Opened Walgreens Photo provider portal, selected the same 5x7 folded-card product and quantity, applied CRISPCARD, recorded subtotal evidence, and stopped before upload, payment, or order placement.",
    blockedFields: ["payment submission", "live order placement", "card upload", "tax finalization", "pickup slot reservation"],
    records: [
      {
        offerId: "walgreens-crispcard-cards-2026-06-13",
        code: "CRISPCARD",
        evidence: {
          observedAtIso: "2026-06-07T12:15:00.000Z",
          portalUrl: "https://photo.walgreens.com/store/cart",
          providerPortal: true,
          sourcePriceObservationId: "walgreens-5x7-folded-card",
          subtotalBeforeCouponCents: 349,
          discountCents: 209,
          subtotalAfterCouponCents: 140,
          cartTerms: {
            vendorId: "walgreens",
            productKind: "folded-card",
            size: "5x7",
            pricedQuantity: 1,
            fulfillmentMode: "pickup",
            accountState: "logged-in"
          },
          sameCartTermsProven: true,
          noOrderPlaced: true,
          blockedFields: ["payment submission", "live order placement", "tax", "pickup window"]
        }
      }
    ]
  };
}

describe("printer coupon portal evidence import", () => {
  it("reports not-provided without silently applying discounts", () => {
    const result = importPrinterCouponPortalEvidenceArtifact(null);

    expect(result).toMatchObject({
      status: "not-provided",
      totalEvidenceRecords: 0,
      acceptedEvidenceCount: 0,
      providerPortalApplicationProof: false,
      bestPriceDiscountingAllowed: false,
      offers: printerCouponOffers
    });
  });

  it("attaches valid same-cart portal evidence and allows the existing pricing seam to discount", () => {
    const result = importPrinterCouponPortalEvidenceArtifact(walgreensPortalEvidenceArtifact());
    const walgreensOffer = result.offers.find((offer) => offer.id === "walgreens-crispcard-cards-2026-06-13");
    const walgreensPrice = printerPriceCatalog.find((observation) => observation.id === "walgreens-5x7-folded-card")!;

    expect(result).toMatchObject({
      status: "accepted",
      totalEvidenceRecords: 1,
      acceptedEvidenceCount: 1,
      rejectedEvidenceCount: 0,
      providerPortalApplicationProof: true,
      bestPriceDiscountingAllowed: true,
      acceptedEvidence: [
        expect.objectContaining({
          offerId: "walgreens-crispcard-cards-2026-06-13",
          code: "CRISPCARD",
          sourcePriceObservationId: "walgreens-5x7-folded-card",
          discountCents: 209,
          subtotalAfterCouponCents: 140
        })
      ]
    });
    expect(walgreensOffer).toMatchObject({
      evidenceStatus: "provider-portal-applied",
      portalApplicationEvidence: expect.objectContaining({
        sameCartTermsProven: true,
        noOrderPlaced: true
      })
    });
    expect(buildPrinterCouponApplication(walgreensPrice, 349, reviewedAt, result.offers)).toMatchObject({
      status: "applied",
      discountCents: 209,
      discountedSubtotalCents: 140
    });
  });

  it("rejects unsafe artifacts and leaves offers unchanged", () => {
    const unsafeArtifact = {
      ...walgreensPortalEvidenceArtifact(),
      blockedFields: ["card upload", "tax finalization"]
    };
    const result = importPrinterCouponPortalEvidenceArtifact(unsafeArtifact);

    expect(validatePrinterCouponPortalEvidenceArtifact(unsafeArtifact)).toEqual([
      "Printer coupon portal evidence artifact must block payment submission.",
      "Printer coupon portal evidence artifact must block live order placement."
    ]);
    expect(result).toMatchObject({
      status: "rejected",
      acceptedEvidenceCount: 0,
      rejectedEvidenceCount: 1,
      providerPortalApplicationProof: false,
      bestPriceDiscountingAllowed: false,
      offers: printerCouponOffers
    });
  });

  it("rejects malformed records instead of throwing", () => {
    const malformedArtifact = {
      ...walgreensPortalEvidenceArtifact(),
      records: [{ offerId: "walgreens-crispcard-cards-2026-06-13", code: "CRISPCARD" }]
    } as unknown as PrinterCouponPortalEvidenceArtifact;

    expect(() => importPrinterCouponPortalEvidenceArtifact(malformedArtifact)).not.toThrow();
    expect(importPrinterCouponPortalEvidenceArtifact(malformedArtifact)).toMatchObject({
      status: "rejected",
      acceptedEvidenceCount: 0,
      rejectedEvidence: [
        {
          reasons: ["Printer coupon portal evidence record must include offerId, code, and structured provider portal evidence."]
        }
      ]
    });
  });

  it("rejects mismatched same-cart evidence before it can affect best-price ranking", () => {
    const mismatchedArtifact = walgreensPortalEvidenceArtifact();
    mismatchedArtifact.records[0] = {
      ...mismatchedArtifact.records[0],
      evidence: {
        ...mismatchedArtifact.records[0].evidence,
        cartTerms: {
          ...mismatchedArtifact.records[0].evidence.cartTerms,
          pricedQuantity: 2
        }
      }
    };
    const result = importPrinterCouponPortalEvidenceArtifact(mismatchedArtifact);

    expect(result).toMatchObject({
      status: "rejected",
      acceptedEvidenceCount: 0,
      providerPortalApplicationProof: false,
      bestPriceDiscountingAllowed: false
    });
    expect(result.rejectedEvidence[0].reasons).toEqual(
      expect.arrayContaining([
        "Provider portal evidence must match the same product, quantity, fulfillment mode, account state, and subtotal math."
      ])
    );
  });

  it("rejects otherwise valid evidence when the coupon is expired at review time", () => {
    const result = importPrinterCouponPortalEvidenceArtifact(walgreensPortalEvidenceArtifact(), {
      now: new Date("2026-07-01T12:00:00.000Z")
    });

    expect(result).toMatchObject({
      status: "rejected",
      acceptedEvidenceCount: 0,
      providerPortalApplicationProof: false,
      bestPriceDiscountingAllowed: false
    });
    expect(result.rejectedEvidence[0].reasons).toContain("Coupon CRISPCARD is not active at the portal evidence review time.");
  });

  it("rejects proof observed outside the coupon validity window even when reviewed while active", () => {
    const expiredObservationArtifact = walgreensPortalEvidenceArtifact();
    expiredObservationArtifact.records[0] = {
      ...expiredObservationArtifact.records[0],
      evidence: {
        ...expiredObservationArtifact.records[0].evidence,
        observedAtIso: "2026-07-01T12:15:00.000Z"
      }
    };
    const result = importPrinterCouponPortalEvidenceArtifact(expiredObservationArtifact, { now: reviewedAt });
    const walgreensPrice = printerPriceCatalog.find((observation) => observation.id === "walgreens-5x7-folded-card")!;

    expect(result).toMatchObject({
      status: "rejected",
      acceptedEvidenceCount: 0,
      providerPortalApplicationProof: false,
      bestPriceDiscountingAllowed: false
    });
    expect(result.rejectedEvidence[0].reasons).toContain(
      "Coupon CRISPCARD portal evidence timestamp must be inside the coupon validity window."
    );
    expect(buildPrinterCouponApplication(walgreensPrice, 349, reviewedAt, result.offers)).toMatchObject({
      status: "portal-evidence-required",
      discountCents: 0,
      discountedSubtotalCents: 349
    });
  });

  it("rejects proof observed after the review time", () => {
    const futureObservationArtifact = walgreensPortalEvidenceArtifact();
    futureObservationArtifact.records[0] = {
      ...futureObservationArtifact.records[0],
      evidence: {
        ...futureObservationArtifact.records[0].evidence,
        observedAtIso: "2026-06-08T12:15:00.000Z"
      }
    };
    const result = importPrinterCouponPortalEvidenceArtifact(futureObservationArtifact, { now: reviewedAt });

    expect(result).toMatchObject({
      status: "rejected",
      acceptedEvidenceCount: 0,
      bestPriceDiscountingAllowed: false
    });
    expect(result.rejectedEvidence[0].reasons).toContain("Coupon CRISPCARD portal evidence timestamp must not be after the review time.");
  });
});
