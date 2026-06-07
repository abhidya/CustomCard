import { describe, expect, it } from "vitest";
import {
  buildPrinterCouponApplication,
  buildPrinterPricingComparison,
  buildPrinterPricingRefreshReport,
  estimatePrinterSubtotal,
  extractPrinterCouponOffers,
  getPrinterPriceOptionsForVendor,
  hasMatchingProviderPortalCouponEvidence,
  isPrinterCouponActive,
  printerCouponCollectionTargets,
  printerCouponOffers,
  printerCouponPolicy,
  printerCouponSources,
  printerPriceCatalog,
  printerPricingCollectionRules,
  printerPricingSources,
  validatePrinterCouponCollectionTargets,
  validatePrinterCouponOffers,
  validatePrinterPricingCatalog,
  validatePrinterCouponPolicy,
  type PrinterPriceObservation
} from "./printerPricing";

const reviewedAt = new Date("2026-06-07T12:00:00.000Z");

describe("printer pricing research", () => {
  it("keeps public printer pricing review-only and source-backed", () => {
    expect(validatePrinterPricingCatalog()).toEqual([]);
    expect(printerPriceCatalog.length).toBeGreaterThanOrEqual(12);
    expect(printerPriceCatalog.every((observation) => observation.liveQuote === false)).toBe(true);
    expect(printerPriceCatalog.every((observation) => observation.requiresManualConfirmation)).toBe(true);
    expect(printerPriceCatalog.every((observation) => observation.source.url.startsWith("https://"))).toBe(true);
    expect(printerPriceCatalog.map((observation) => observation.vendorId)).toEqual(
      expect.arrayContaining(["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot"])
    );
  });

  it("estimates subtotal using vendor minimum quantity rules", () => {
    const cvsDoubleSided = printerPriceCatalog.find((observation) => observation.id === "cvs-5x7-double-sided-cardstock");
    const cvsPhotoCard = printerPriceCatalog.find((observation) => observation.id === "cvs-5x7-photo-card");
    const cvsPremium = printerPriceCatalog.find((observation) => observation.id === "cvs-5x7-premium-card");
    const walgreensSingle = printerPriceCatalog.find((observation) => observation.id === "walgreens-5x7-folded-card");

    expect(cvsDoubleSided).toBeDefined();
    expect(cvsPhotoCard).toBeDefined();
    expect(cvsPremium).toBeDefined();
    expect(walgreensSingle).toBeDefined();
    expect(estimatePrinterSubtotal(cvsDoubleSided!, 1)).toMatchObject({
      pricedQuantity: 20,
      subtotalCents: 3980,
      subtotalLabel: "$39.80"
    });
    expect(estimatePrinterSubtotal(cvsPhotoCard!, 1)).toMatchObject({
      pricedQuantity: 20,
      subtotalCents: 2180,
      subtotalLabel: "$21.80"
    });
    expect(estimatePrinterSubtotal(cvsPremium!, 1)).toMatchObject({
      pricedQuantity: 20,
      subtotalCents: 4980,
      subtotalLabel: "$49.80"
    });
    expect(estimatePrinterSubtotal(walgreensSingle!, 1)).toMatchObject({
      pricedQuantity: 1,
      subtotalCents: 349,
      subtotalLabel: "$3.49",
      effectiveSubtotalCents: 349,
      effectiveSubtotalLabel: "$3.49",
      couponDiscountCents: 0,
      couponDiscountLabel: "CRISPCARD found; apply and verify same cart terms in provider portal before ranking as best available",
      subtotalIncludesCoupon: false,
      couponApplication: expect.objectContaining({
        status: "portal-evidence-required",
        offer: expect.objectContaining({ code: "CRISPCARD" })
      }),
      couponPolicy: expect.objectContaining({
        providerPortalApplicationRequired: true,
        couponsAppliedToBestPrice: true
      })
    });
  });

  it("builds ranked known prices and selected vendor options without live quotes", () => {
    const comparison = buildPrinterPricingComparison("walgreens", 1, printerPriceCatalog, reviewedAt);

    expect(comparison.liveQuote).toBe(false);
    expect(comparison.selectedVendorOptions[0].observation.vendorId).toBe("walgreens");
    expect(comparison.selectedVendorOptions[0].subtotalLabel).toBe("$3.49");
    expect(comparison.refreshReport).toMatchObject({
      totalObservations: printerPriceCatalog.length,
      sourceCount: 8,
      couponSourceCount: 3,
      couponCollectionTargetCount: 5,
      couponProviderTargetCount: 1,
      retailerCouponCollectionTargetCount: 4,
      couponOfferCount: 2,
      activeCouponOfferCount: 2,
      portalAppliedCouponOfferCount: 0,
      freshSources: 8,
      canShowComparison: true,
      liveQuote: false,
      couponPolicy: expect.objectContaining({
        providerPortalApplicationRequired: true,
        couponsAppliedToBestPrice: true
      })
    });
    expect(comparison.couponPolicy).toMatchObject({
      reviewMode: "apply-during-provider-portal-collection",
      collectionModes: expect.arrayContaining([
        "retailer-public-coupon-page",
        "coupon-provider-feed",
        "provider-portal-checkout"
      ]),
      couponProviderFeedAllowed: true,
      retailerCouponScrapeAllowed: true,
      providerPortalApplicationRequired: true,
      couponsAppliedToBestPrice: true,
      couponsIncludedInDisplayedPrices: "only-after-provider-portal-application",
      defaultAppliedDiscountCents: 0,
      blockedFields: expect.arrayContaining([
        "coupon provider API credentials",
        "coupon expiration",
        "coupon stacking rules",
        "provider portal checkout session",
        "promo code application proof"
      ])
    });
    expect(comparison.rankedKnownPrices[0]).toMatchObject({
      observation: expect.objectContaining({ vendorId: "walmart" }),
      subtotalLabel: "$0.56",
      effectiveSubtotalLabel: "$0.56",
      subtotalIncludesCoupon: false,
      couponApplication: expect.objectContaining({ status: "not-found" })
    });
    expect(comparison.manualConfirmationVendors).toEqual(
      expect.arrayContaining(["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"])
    );
    expect(comparison.disclaimer).toContain("not live quotes");
    expect(comparison.disclaimer).toContain("coupons");
  });

  it("requires coupon collection and portal application proof before discounting", () => {
    expect(validatePrinterCouponPolicy()).toEqual([]);
    expect(validatePrinterCouponCollectionTargets()).toEqual([]);
    expect(validatePrinterCouponOffers()).toEqual([]);
    expect(printerCouponPolicy).toMatchObject({
      reviewMode: "apply-during-provider-portal-collection",
      eligibleVendorIds: expect.arrayContaining(["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot"]),
      couponProviderFeedAllowed: true,
      retailerCouponScrapeAllowed: true,
      providerPortalApplicationRequired: true,
      couponsAppliedToBestPrice: true,
      couponsIncludedInDisplayedPrices: "only-after-provider-portal-application",
      defaultAppliedDiscountCents: 0,
      blockedFields: expect.arrayContaining([
        "coupon provider API credentials",
        "coupon expiration",
        "coupon stacking rules",
        "promo code application proof",
        "provider portal checkout session"
      ])
    });
    expect(
      validatePrinterCouponPolicy({
        ...printerCouponPolicy,
        collectionModes: ["retailer-public-coupon-page"],
        couponProviderFeedAllowed: false as never,
        retailerCouponScrapeAllowed: false as never,
        providerPortalApplicationRequired: false as never,
        couponsAppliedToBestPrice: false as never,
        couponsIncludedInDisplayedPrices: "always" as never,
        defaultAppliedDiscountCents: 250 as never,
        blockedFields: [],
        requiredEvidence: []
      })
    ).toEqual(
      expect.arrayContaining([
        "Printer coupon policy must allow coupon provider feed collection.",
        "Printer coupon policy must require provider portal checkout collection.",
        "Printer coupon policy must allow coupon provider feeds.",
        "Printer coupon policy must allow retailer coupon page scraping.",
        "Printer coupon policy must require provider portal application proof.",
        "Printer coupon policy must apply verified coupons to best price.",
        "Printer coupon policy must include coupons only after provider portal application.",
        "Printer coupon policy must keep default applied discounts at zero.",
        "Printer coupon policy must block promo code application proof.",
        "Printer coupon policy must require provider portal checkout subtotal after coupon application.",
        "Printer coupon policy must require structured provider portal application evidence."
      ])
    );
  });

  it("collects active coupons from official retailer pages and print entrypoint targets without runtime networking", () => {
    const walgreensPage = `
      <div class="tile-price info-2b gwc4a">Coupon code: CRISPCARD</div>
      <div class="taclist"><p>Must use code <strong>CRISPCARD</strong> to receive
      60% off All Photo Cards and Premium Stationery through a logged in registered
      Walgreens.com/Photo online account, in store on photo kiosk or through the
      Walgreens Mobile App. Offer expires at 11:59 p.m. CT on June 13, 2026.</p></div>
    `;
    const cvsPrintPage = `
      <p><b>Weekly offers end 6/20/2026 <br/> 65% off Same Day Posters |
      Promo Code: SAMEDAY65 <br/> 50% off Sitewide | Promo Code: JUNESW </b></p>
      <div class="caption text-left">Add any photo products to your cart and enter promo
      code JUNESW to receive 50% off your photo order. Offer valid online and in the
      CVS Health app. Offer starts June 7, 2026, at 12:01 AM and ends June 20, 2026,
      at 11:59 PM ET. Only one discount may be applied to each item.</div>
    `;

    expect(printerCouponCollectionTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "walgreens-photo-official-deals",
          role: "coupon-source",
          readiness: "ready-public-page",
          noNetworkRuntime: true
        }),
        expect.objectContaining({
          id: "cvs-photo-card-design-entrypoint",
          role: "print-entrypoint",
          url: printerPricingSources.cvsFoldedDesignDetail.url,
          noNetworkRuntime: true
        }),
        expect.objectContaining({
          id: "fmtc-deal-feed",
          role: "provider-feed",
          readiness: "credential-gated",
          credentialEnvKeys: ["FMTC_API_TOKEN"],
          noNetworkRuntime: true
        })
      ])
    );

    expect(extractPrinterCouponOffers({ vendorId: "walgreens", source: printerCouponSources.walgreensPhotoDeals, documentText: walgreensPage })).toMatchObject({
      offers: [
        expect.objectContaining({
          id: "walgreens-crispcard-cards-2026-06-13",
          code: "CRISPCARD",
          discountPercent: 60,
          endsAtIso: "2026-06-13T23:59:00.000-05:00",
          requiresLoggedInAccount: true,
          evidenceStatus: "source-listed"
        })
      ],
      warnings: []
    });
    expect(extractPrinterCouponOffers({ vendorId: "cvs", source: printerCouponSources.cvsPhotoCoupons, documentText: cvsPrintPage })).toMatchObject({
      offers: [
        expect.objectContaining({
          id: "cvs-junesw-sitewide-photo-2026-06-20",
          code: "JUNESW",
          discountPercent: 50,
          startsAtIso: "2026-06-07T00:01:00.000-04:00",
          endsAtIso: "2026-06-20T23:59:00.000-04:00",
          evidenceStatus: "source-listed"
        })
      ],
      warnings: []
    });
  });

  it("treats proper provider feeds and rendered print links as explicit coupon proof targets", () => {
    const walgreensPrintTarget = printerCouponCollectionTargets.find((target) => target.id === "walgreens-photo-card-design-entrypoint");
    const cvsPrintTarget = printerCouponCollectionTargets.find((target) => target.id === "cvs-photo-card-design-entrypoint");
    const providerFeedTarget = printerCouponCollectionTargets.find((target) => target.id === "fmtc-deal-feed");
    const walgreensOffer = printerCouponOffers.find((offer) => offer.code === "CRISPCARD");
    const cvsOffer = printerCouponOffers.find((offer) => offer.code === "JUNESW");

    expect(printerCouponSources.walgreensPhotoDeals).toMatchObject({
      authority: "official-retailer",
      preferredCollectionMethod: "server-fetch-html"
    });
    expect(printerCouponSources.cvsPhotoCoupons).toMatchObject({
      authority: "official-retailer",
      preferredCollectionMethod: "server-fetch-html"
    });
    expect(printerCouponSources.fmtcProviderFeed).toMatchObject({
      authority: "credentialed-coupon-provider",
      preferredCollectionMethod: "provider-api-feed"
    });

    expect(walgreensPrintTarget).toMatchObject({
      url: printerPricingSources.walgreensProductCatalog.url,
      role: "print-entrypoint",
      collectionMethod: "rendered-browser-read",
      expectedOfferCodes: ["CRISPCARD"],
      verificationSignals: expect.arrayContaining(["5x7 Folded Card", "Price $3.49 each", "CommerceProduct_33272"]),
      legalReviewRequired: true,
      noNetworkRuntime: true
    });
    expect(cvsPrintTarget).toMatchObject({
      url: printerPricingSources.cvsFoldedDesignDetail.url,
      role: "print-entrypoint",
      collectionMethod: "rendered-browser-read",
      expectedOfferCodes: ["JUNESW"],
      verificationSignals: expect.arrayContaining([
        "5x7 Folded Greeting Cards",
        "Price $4.49 each",
        "50% off Sitewide with promo code JUNESW"
      ]),
      legalReviewRequired: true,
      noNetworkRuntime: true
    });
    expect(providerFeedTarget).toMatchObject({
      collectionMethod: "provider-api-feed",
      credentialEnvKeys: ["FMTC_API_TOKEN"],
      legalReviewRequired: true,
      verificationSignals: expect.arrayContaining(["status", "code_verified_at", "link_verified_at"])
    });
    expect(walgreensOffer).toMatchObject({
      sourceTargetIds: ["walgreens-photo-official-deals", "walgreens-photo-card-design-entrypoint"]
    });
    expect(cvsOffer).toMatchObject({
      sourceTargetIds: ["cvs-photo-official-coupons", "cvs-photo-card-design-entrypoint"]
    });
  });

  it("applies an active coupon only after provider portal evidence proves matching cart terms", () => {
    const walgreensSingle = printerPriceCatalog.find((observation) => observation.id === "walgreens-5x7-folded-card");
    const statusOnlyPortalOffer = {
      ...printerCouponOffers.find((offer) => offer.code === "CRISPCARD")!,
      endsAtIso: "2026-06-30T23:59:00.000-05:00",
      evidenceStatus: "provider-portal-applied" as const
    };
    const activePortalOffer = {
      ...statusOnlyPortalOffer,
      portalApplicationEvidence: {
        observedAtIso: "2026-06-07T12:15:00.000Z",
        portalUrl: "https://photo.walgreens.com/store/cart",
        providerPortal: true as const,
        sourcePriceObservationId: "walgreens-5x7-folded-card",
        subtotalBeforeCouponCents: 349,
        discountCents: 209,
        subtotalAfterCouponCents: 140,
        cartTerms: {
          vendorId: "walgreens" as const,
          productKind: "folded-card" as const,
          size: "5x7" as const,
          pricedQuantity: 1,
          fulfillmentMode: "pickup" as const,
          accountState: "logged-in" as const
        },
        sameCartTermsProven: true as const,
        noOrderPlaced: true as const,
        blockedFields: ["payment submission", "live order placement", "tax", "pickup window"]
      }
    };
    const mismatchedQuantityOffer = {
      ...activePortalOffer,
      portalApplicationEvidence: {
        ...activePortalOffer.portalApplicationEvidence,
        cartTerms: {
          ...activePortalOffer.portalApplicationEvidence.cartTerms,
          pricedQuantity: 2
        }
      }
    };

    expect(walgreensSingle).toBeDefined();
    expect(isPrinterCouponActive(activePortalOffer, reviewedAt)).toBe(true);
    expect(validatePrinterCouponOffers([statusOnlyPortalOffer], reviewedAt)).toEqual(
      expect.arrayContaining(["Printer coupon walgreens-crispcard-cards-2026-06-13 must include structured provider portal application evidence."])
    );
    expect(hasMatchingProviderPortalCouponEvidence(statusOnlyPortalOffer, walgreensSingle!, 349, 1)).toBe(false);
    expect(hasMatchingProviderPortalCouponEvidence(mismatchedQuantityOffer, walgreensSingle!, 349, 1)).toBe(false);
    expect(hasMatchingProviderPortalCouponEvidence(activePortalOffer, walgreensSingle!, 349, 1)).toBe(true);
    expect(buildPrinterCouponApplication(walgreensSingle!, 349, reviewedAt, [statusOnlyPortalOffer])).toMatchObject({
      status: "portal-evidence-required",
      discountCents: 0,
      discountedSubtotalCents: 349
    });
    expect(buildPrinterCouponApplication(walgreensSingle!, 349, reviewedAt, [mismatchedQuantityOffer], { pricedQuantity: 1 })).toMatchObject({
      status: "portal-evidence-required",
      discountCents: 0,
      discountedSubtotalCents: 349
    });
    expect(buildPrinterCouponApplication(walgreensSingle!, 349, reviewedAt, [activePortalOffer])).toMatchObject({
      status: "applied",
      discountCents: 209,
      discountedSubtotalCents: 140,
      discountedSubtotalLabel: "$1.40"
    });
    expect(estimatePrinterSubtotal(walgreensSingle!, 1, { now: reviewedAt, couponOffers: [activePortalOffer] })).toMatchObject({
      subtotalCents: 349,
      effectiveSubtotalCents: 140,
      effectiveSubtotalLabel: "$1.40",
      couponDiscountCents: 209,
      subtotalIncludesCoupon: true,
      couponApplication: expect.objectContaining({
        status: "applied",
        offer: expect.objectContaining({ code: "CRISPCARD" })
      })
    });
  });

  it("surfaces local print shops as manual quote required", () => {
    const comparison = buildPrinterPricingComparison("local-print-shop", 4);

    expect(comparison.quantity).toBe(4);
    expect(comparison.selectedVendorOptions).toEqual([]);
    expect(comparison.manualConfirmationVendors).toContain("local-print-shop");
  });

  it("keeps exact public package starts when vendors publish minimum bundles", () => {
    const fedexQuickSingle = printerPriceCatalog.find((observation) => observation.id === "fedex-quick-5x7-single-sided-card");
    const fedexQuick = printerPriceCatalog.find((observation) => observation.id === "fedex-quick-5x7-double-sided-card");
    const fedexPremium = printerPriceCatalog.find((observation) => observation.id === "fedex-premium-5x7-folded-card");
    const staplesFolded = printerPriceCatalog.find((observation) => observation.id === "staples-5x7-folded-card-bundle");
    const staplesSameDay = printerPriceCatalog.find((observation) => observation.id === "staples-5x7-same-day-card-bundle");
    const officeDepotPhoto = printerPriceCatalog.find(
      (observation) => observation.id === "office-depot-7x5-photo-holiday-card-bundle"
    );

    expect(fedexQuickSingle).toBeDefined();
    expect(fedexQuick).toBeDefined();
    expect(fedexPremium).toBeDefined();
    expect(staplesFolded).toBeDefined();
    expect(staplesSameDay).toBeDefined();
    expect(officeDepotPhoto).toBeDefined();
    expect(estimatePrinterSubtotal(fedexQuickSingle!, 1)).toMatchObject({
      pricedQuantity: 10,
      subtotalCents: 1399,
      subtotalLabel: "$13.99"
    });
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
      subtotalCents: 4999,
      subtotalLabel: "$49.99"
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
      "cvs-5x7-photo-card",
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

    expect(printerPricingCollectionRules.length).toBeGreaterThanOrEqual(8);
    expect([...sourceUrls].every((url) => ruleUrls.has(url))).toBe(true);
    expect(printerPricingCollectionRules.every((rule) => rule.noNetworkRuntime)).toBe(true);
    expect(printerPricingCollectionRules.flatMap((rule) => rule.blockedFields)).toEqual(
      expect.arrayContaining(["tax", "coupon portal proof", "store stock", "pickup window", "live order placement"])
    );
  });

  it("marks stale public printer pricing before showing it as current", () => {
    const staleReport = buildPrinterPricingRefreshReport(printerPriceCatalog, new Date("2026-08-05T12:00:00.000Z"));

    expect(staleReport.canShowComparison).toBe(false);
    expect(staleReport.staleSources.length).toBe(staleReport.sourceCount);
    expect(staleReport.blockers[0]).toContain("source is 59 days old");
  });
});
