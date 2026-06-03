import { describe, expect, it } from "vitest";
import {
  buildPrinterPricingComparison,
  estimatePrinterSubtotal,
  getPrinterPriceOptionsForVendor,
  printerPriceCatalog,
  validatePrinterPricingCatalog,
  type PrinterPriceObservation
} from "./printerPricing";

describe("printer pricing research", () => {
  it("keeps public printer pricing review-only and source-backed", () => {
    expect(validatePrinterPricingCatalog()).toEqual([]);
    expect(printerPriceCatalog.length).toBeGreaterThanOrEqual(8);
    expect(printerPriceCatalog.every((observation) => observation.liveQuote === false)).toBe(true);
    expect(printerPriceCatalog.every((observation) => observation.requiresManualConfirmation)).toBe(true);
    expect(printerPriceCatalog.every((observation) => observation.source.url.startsWith("https://"))).toBe(true);
    expect(printerPriceCatalog.map((observation) => observation.vendorId)).toEqual(
      expect.arrayContaining(["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot"])
    );
  });

  it("estimates subtotal using vendor minimum quantity rules", () => {
    const cvsBulk = printerPriceCatalog.find((observation) => observation.id === "cvs-5x7-double-sided-cardstock");
    const walgreensSingle = printerPriceCatalog.find((observation) => observation.id === "walgreens-5x7-folded-card");

    expect(cvsBulk).toBeDefined();
    expect(walgreensSingle).toBeDefined();
    expect(estimatePrinterSubtotal(cvsBulk!, 1)).toMatchObject({
      pricedQuantity: 20,
      subtotalCents: 4980,
      subtotalLabel: "$49.80"
    });
    expect(estimatePrinterSubtotal(walgreensSingle!, 1)).toMatchObject({
      pricedQuantity: 1,
      subtotalCents: 299,
      subtotalLabel: "$2.99"
    });
  });

  it("builds ranked known prices and selected vendor options without live quotes", () => {
    const comparison = buildPrinterPricingComparison("walgreens", 1);

    expect(comparison.liveQuote).toBe(false);
    expect(comparison.selectedVendorOptions[0].observation.vendorId).toBe("walgreens");
    expect(comparison.selectedVendorOptions[0].subtotalLabel).toBe("$2.99");
    expect(comparison.rankedKnownPrices[0]).toMatchObject({
      observation: expect.objectContaining({ vendorId: "walmart" }),
      subtotalLabel: "$1.42"
    });
    expect(comparison.manualConfirmationVendors).toEqual(
      expect.arrayContaining(["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"])
    );
    expect(comparison.disclaimer).toContain("not live quotes");
  });

  it("surfaces local print shops as manual quote required", () => {
    const comparison = buildPrinterPricingComparison("local-print-shop", 4);

    expect(comparison.quantity).toBe(4);
    expect(comparison.selectedVendorOptions).toEqual([]);
    expect(comparison.manualConfirmationVendors).toContain("local-print-shop");
  });

  it("keeps exact public package starts when vendors publish minimum bundles", () => {
    const fedexQuick = printerPriceCatalog.find((observation) => observation.id === "fedex-quick-5x7-double-sided-card");
    const fedexPremium = printerPriceCatalog.find((observation) => observation.id === "fedex-premium-5x7-folded-card");
    const staplesFolded = printerPriceCatalog.find((observation) => observation.id === "staples-5x7-folded-card-bundle");
    const officeDepotPhoto = printerPriceCatalog.find(
      (observation) => observation.id === "office-depot-7x5-photo-holiday-card-bundle"
    );

    expect(fedexQuick).toBeDefined();
    expect(fedexPremium).toBeDefined();
    expect(staplesFolded).toBeDefined();
    expect(officeDepotPhoto).toBeDefined();
    expect(estimatePrinterSubtotal(fedexQuick!, 1)).toMatchObject({
      pricedQuantity: 10,
      subtotalCents: 1799,
      subtotalLabel: "$17.99"
    });
    expect(estimatePrinterSubtotal(fedexPremium!, 1)).toMatchObject({
      pricedQuantity: 20,
      subtotalCents: 2299,
      subtotalLabel: "$22.99"
    });
    expect(estimatePrinterSubtotal(staplesFolded!, 1)).toMatchObject({
      pricedQuantity: 25,
      subtotalCents: 2999,
      subtotalLabel: "$29.99"
    });
    expect(estimatePrinterSubtotal(officeDepotPhoto!, 1)).toMatchObject({
      pricedQuantity: 25,
      subtotalCents: 7760,
      subtotalLabel: "$77.60"
    });
  });

  it("reports broken pricing catalog entries", () => {
    const unsafe = {
      ...printerPriceCatalog[0],
      id: printerPriceCatalog[1].id,
      size: "5x7",
      unitPriceCents: 0,
      startingPackagePriceCents: 0,
      minimumQuantity: 0,
      requiresManualConfirmation: false,
      source: {
        ...printerPriceCatalog[0].source,
        url: "http://example.invalid"
      }
    } as unknown as PrinterPriceObservation;

    expect(validatePrinterPricingCatalog([printerPriceCatalog[1], unsafe])).toEqual(
      expect.arrayContaining([
        `Duplicate printer price id: ${printerPriceCatalog[1].id}`,
        `Printer price ${unsafe.id} must have a positive public price.`,
        `Printer price ${unsafe.id} must have a positive package starting price.`,
        `Printer price ${unsafe.id} must have a positive minimum quantity.`,
        `Printer price ${unsafe.id} must require manual confirmation.`,
        `Printer price ${unsafe.id} must cite an HTTPS source.`,
        "Missing public printer pricing for fedex."
      ])
    );
  });

  it("filters pricing options by vendor", () => {
    expect(getPrinterPriceOptionsForVendor("cvs").map((observation) => observation.vendorId)).toEqual(["cvs", "cvs"]);
    expect(getPrinterPriceOptionsForVendor("walmart").map((observation) => observation.id)).toEqual([
      "walmart-5x7-same-day-folded-card"
    ]);
    expect(getPrinterPriceOptionsForVendor("local-print-shop")).toEqual([]);
  });
});
