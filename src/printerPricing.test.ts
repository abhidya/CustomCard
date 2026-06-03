import { describe, expect, it } from "vitest";
import {
  buildPrinterPricingComparison,
  buildPrinterPricingRefreshReport,
  estimatePrinterSubtotal,
  getPrinterPriceOptionsForVendor,
  printerPriceCatalog,
  printerPricingCollectionRules,
  validatePrinterPricingCatalog,
  type PrinterPriceObservation
} from "./printerPricing";

const reviewedAt = new Date("2026-06-03T12:00:00.000Z");

describe("printer pricing research", () => {
  it("keeps public printer pricing review-only and source-backed", () => {
    expect(validatePrinterPricingCatalog()).toEqual([]);
    expect(printerPriceCatalog.length).toBeGreaterThanOrEqual(10);
    expect(printerPriceCatalog.every((observation) => observation.liveQuote === false)).toBe(true);
    expect(printerPriceCatalog.every((observation) => observation.requiresManualConfirmation)).toBe(true);
    expect(printerPriceCatalog.every((observation) => observation.source.url.startsWith("https://"))).toBe(true);
    expect(printerPriceCatalog.map((observation) => observation.vendorId)).toEqual(
      expect.arrayContaining(["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot"])
    );
  });

  it("estimates subtotal using vendor minimum quantity rules", () => {
    const cvsDoubleSided = printerPriceCatalog.find((observation) => observation.id === "cvs-5x7-double-sided-cardstock");
    const cvsPremium = printerPriceCatalog.find((observation) => observation.id === "cvs-5x7-premium-card");
    const walgreensSingle = printerPriceCatalog.find((observation) => observation.id === "walgreens-5x7-folded-card");

    expect(cvsDoubleSided).toBeDefined();
    expect(cvsPremium).toBeDefined();
    expect(walgreensSingle).toBeDefined();
    expect(estimatePrinterSubtotal(cvsDoubleSided!, 1)).toMatchObject({
      pricedQuantity: 20,
      subtotalCents: 3980,
      subtotalLabel: "$39.80"
    });
    expect(estimatePrinterSubtotal(cvsPremium!, 1)).toMatchObject({
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
    const comparison = buildPrinterPricingComparison("walgreens", 1, printerPriceCatalog, reviewedAt);

    expect(comparison.liveQuote).toBe(false);
    expect(comparison.selectedVendorOptions[0].observation.vendorId).toBe("walgreens");
    expect(comparison.selectedVendorOptions[0].subtotalLabel).toBe("$2.99");
    expect(comparison.refreshReport).toMatchObject({
      totalObservations: printerPriceCatalog.length,
      sourceCount: 7,
      freshSources: 7,
      canShowComparison: true,
      liveQuote: false
    });
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
    const staplesSameDay = printerPriceCatalog.find((observation) => observation.id === "staples-5x7-same-day-card-bundle");
    const officeDepotPhoto = printerPriceCatalog.find(
      (observation) => observation.id === "office-depot-7x5-photo-holiday-card-bundle"
    );

    expect(fedexQuick).toBeDefined();
    expect(fedexPremium).toBeDefined();
    expect(staplesFolded).toBeDefined();
    expect(staplesSameDay).toBeDefined();
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
      subtotalCents: 4999,
      subtotalLabel: "$49.99"
    });
    expect(estimatePrinterSubtotal(staplesSameDay!, 1)).toMatchObject({
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
        `Printer price ${unsafe.id} must have a collection rule for http://example.invalid.`,
        "Missing public printer pricing for fedex."
      ])
    );
  });

  it("filters pricing options by vendor", () => {
    expect(getPrinterPriceOptionsForVendor("cvs").map((observation) => observation.id)).toEqual([
      "cvs-5x7-double-sided-cardstock",
      "cvs-5x7-premium-card",
      "cvs-5x7-folded-card"
    ]);
    expect(getPrinterPriceOptionsForVendor("walmart").map((observation) => observation.id)).toEqual([
      "walmart-5x7-same-day-folded-card"
    ]);
    expect(getPrinterPriceOptionsForVendor("local-print-shop")).toEqual([]);
  });

  it("describes how public printer pricing can be collected without live quote claims", () => {
    const ruleUrls = new Set(printerPricingCollectionRules.map((rule) => rule.url));
    const sourceUrls = new Set(printerPriceCatalog.map((observation) => observation.source.url));

    expect(printerPricingCollectionRules.length).toBeGreaterThanOrEqual(7);
    expect([...sourceUrls].every((url) => ruleUrls.has(url))).toBe(true);
    expect(printerPricingCollectionRules.every((rule) => rule.noNetworkRuntime)).toBe(true);
    expect(printerPricingCollectionRules.flatMap((rule) => rule.blockedFields)).toEqual(
      expect.arrayContaining(["tax", "coupon", "store stock", "pickup window", "live order placement"])
    );
  });

  it("marks stale public printer pricing before showing it as current", () => {
    const staleReport = buildPrinterPricingRefreshReport(printerPriceCatalog, new Date("2026-08-05T12:00:00.000Z"));

    expect(staleReport.canShowComparison).toBe(false);
    expect(staleReport.staleSources.length).toBe(staleReport.sourceCount);
    expect(staleReport.blockers[0]).toContain("source is 63 days old");
  });
});
