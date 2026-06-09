import { describe, expect, it } from "vitest";
import {
  importCatalogBackedCouponPortalEvidence,
  summarizePrinterCouponBrowserEvidence,
  validatePrinterCouponBrowserEvidenceArtifact,
  validatePrinterCouponPortalEvidenceArtifact
} from "./printerCouponEvidence";

describe("printerCouponEvidence coordinator", () => {
  it("importCatalogBackedCouponPortalEvidence returns not-provided when artifact is null", () => {
    const result = importCatalogBackedCouponPortalEvidence(null);
    expect(result.status).toBe("not-provided");
    expect(result.providerPortalApplicationProof).toBe(false);
    expect(result.bestPriceDiscountingAllowed).toBe(false);
  });

  it("importCatalogBackedCouponPortalEvidence returns live offers in the result", () => {
    const result = importCatalogBackedCouponPortalEvidence(null);
    expect(result.offers.length).toBeGreaterThan(0);
  });

  it("portal evidence validator is accessible from the coordinator seam", () => {
    const errors = validatePrinterCouponPortalEvidenceArtifact({
      service: "wrong-service",
      generatedAtIso: "not-a-date",
      operatorAction: "",
      records: [],
      blockedFields: []
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("browser evidence validator is accessible from the coordinator seam", () => {
    const errors = validatePrinterCouponBrowserEvidenceArtifact(null);
    expect(errors).toEqual(["Printer coupon browser evidence artifact must be a structured object."]);
  });

  it("summarizePrinterCouponBrowserEvidence returns null when evidence is null", () => {
    const target = {
      id: "walgreens-5x7",
      vendorId: "walgreens" as const,
      role: "print-entrypoint" as const,
      url: "https://www.walgreens.com/photo/",
      expectedOfferCodes: ["SAVE20"],
      verificationSignals: ["save", "20%"],
      collectionMode: "rendered-browser-read" as const,
      collectionMethod: "rendered-browser-read" as const,
      browserRenderProofRequired: true,
      readiness: "ready-public-page" as const,
      vendorIds: ["walgreens" as const]
    };
    expect(summarizePrinterCouponBrowserEvidence(null, target)).toBeNull();
  });
});
