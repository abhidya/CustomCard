import {
  retailPrinterRegistryProductLinks as retailPrinterProductLinks
} from "./retailPrinterRegistryData.mjs";

export const printerCouponCollectionPriority = [
  {
    id: "credentialed-coupon-provider-feed",
    order: 1,
    label: "Credentialed coupon provider feed",
    collectionMode: "coupon-provider-feed",
    collectionMethod: "provider-api-feed",
    evidenceRole: "coupon-discovery",
    targetRoles: ["provider-feed"],
    requiresCredentials: true,
    fallbackAllowed: false,
    canAffectBestPrice: false,
    requiredEvidence: ["provider feed response with coupon code, link, expiration, and verification metadata"],
    noNetworkRuntime: true
  },
  {
    id: "official-retailer-coupon-page",
    order: 2,
    label: "Official retailer coupon page",
    collectionMode: "retailer-public-coupon-page",
    collectionMethod: "server-fetch-html",
    evidenceRole: "retailer-source-confirmation",
    targetRoles: ["coupon-source"],
    requiresCredentials: false,
    fallbackAllowed: true,
    canAffectBestPrice: false,
    requiredEvidence: ["official retailer coupon page code, product scope, terms, and expiration"],
    noNetworkRuntime: true
  },
  {
    id: "exact-rendered-print-link",
    order: 3,
    label: "Exact rendered Walgreens/CVS print link",
    collectionMode: "retailer-public-coupon-page",
    collectionMethod: "rendered-browser-read",
    evidenceRole: "product-code-price-proof",
    targetRoles: ["print-entrypoint"],
    requiresCredentials: false,
    fallbackAllowed: true,
    canAffectBestPrice: false,
    requiredEvidence: ["visible coupon text plus matching product, price, and SKU signals from the exact print link"],
    noNetworkRuntime: true
  },
  {
    id: "same-cart-provider-portal-proof",
    order: 4,
    label: "Same-cart provider portal proof",
    collectionMode: "provider-portal-checkout",
    collectionMethod: "provider-portal-cart-evidence",
    evidenceRole: "best-price-discount-proof",
    targetRoles: [],
    requiresCredentials: false,
    fallbackAllowed: false,
    canAffectBestPrice: true,
    requiredEvidence: [
      "provider portal checkout subtotal after coupon application",
      "same product, quantity, fulfillment mode, account state, and subtotal math",
      "no payment or order submission"
    ],
    noNetworkRuntime: true
  }
];

export const printerCouponProviderFeedTargets = [
  {
    id: "fmtc-deal-feed",
    label: "FMTC Deal Feed provider API",
    vendorIds: ["walgreens", "cvs"],
    mode: "coupon-provider-feed",
    role: "provider-feed",
    readiness: "credential-gated",
    url: "https://docs.fmtc.co/kb/deals-4-2-0",
    collectionMethod: "provider-api-feed",
    credentialEnvKeys: ["FMTC_API_TOKEN"],
    sourceProvider: "affiliate-provider",
    maxAgeHours: 12,
    expectedOfferCodes: [],
    extractHints: ["merchant", "code", "code_verified_at", "link_verified_at", "valid_from", "valid_to"],
    verificationSignals: ["status", "code_verified_at", "link_verified_at", "end_date"],
    staticHtmlSignalAllowed: false,
    browserRenderProofRequired: false,
    legalReviewRequired: true,
    blockedFields: [
      "provider credentials in client",
      "unapproved affiliate campaign",
      "provider-only checkout proof",
      "coupon application proof",
      "tax",
      "store availability"
    ],
    noNetworkRuntime: true
  },
  {
    id: "rakuten-coupon-feed",
    label: "Rakuten Advertising Coupon Feed API",
    vendorIds: ["walgreens", "cvs"],
    mode: "coupon-provider-feed",
    role: "provider-feed",
    readiness: "credential-gated",
    url: "https://pubhelp.rakutenadvertising.com/hc/en-us/articles/5949828511757-Coupon-Feed-API",
    collectionMethod: "provider-api-feed",
    credentialEnvKeys: ["RAKUTEN_ADVERTISING_API_TOKEN"],
    sourceProvider: "affiliate-provider",
    maxAgeHours: 12,
    expectedOfferCodes: [],
    extractHints: ["advertiser", "coupon code", "promotional link", "offerstartdate", "offerenddate", "promotion type"],
    verificationSignals: ["coupon code", "promotional link", "offerstartdate", "offerenddate", "advertiser"],
    staticHtmlSignalAllowed: false,
    browserRenderProofRequired: false,
    legalReviewRequired: true,
    blockedFields: [
      "provider credentials in client",
      "unapproved advertiser relationship",
      "provider-only checkout proof",
      "coupon application proof",
      "tax",
      "store availability"
    ],
    noNetworkRuntime: true
  }
];

export const printerCouponCollectionContracts = {
  walgreens: {
    retailerCouponTargets: [
      {
        id: "walgreens-photo-official-deals",
        label: "Walgreens Photo official deals page",
        vendorIds: ["walgreens"],
        mode: "retailer-public-coupon-page",
        role: "coupon-source",
        readiness: "ready-public-page",
        url: "https://photo.walgreens.com/store/deals?tab=photo_downsplash_top",
        collectionMethod: "server-fetch-html",
        credentialEnvKeys: [],
        sourceProvider: "retailer",
        maxAgeHours: 24,
        expectedOfferCodes: ["CRISPCARD"],
        extractHints: ["Coupon code:", "All Photo Cards and Premium Stationery", "Offer expires", "logged in registered Walgreens.com/Photo"],
        verificationSignals: ["CRISPCARD", "60% OFF All Photo Cards & Premium Stationery", "Offer expires at 11:59 p.m. CT"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: false,
        legalReviewRequired: true,
        blockedFields: ["login session", "cart subtotal", "coupon application proof", "tax", "shipping", "store availability"],
        noNetworkRuntime: true
      }
    ],
    printEntrypointTargets: [
      {
        id: "walgreens-photo-card-design-entrypoint",
        label: "Walgreens Photo 5x7 folded card design-detail print entrypoint",
        vendorIds: ["walgreens"],
        mode: "retailer-public-coupon-page",
        role: "print-entrypoint",
        readiness: "ready-public-page",
        url: retailPrinterProductLinks.walgreens.productUrl,
        collectionMethod: "rendered-browser-read",
        credentialEnvKeys: [],
        sourceProvider: "retailer",
        maxAgeHours: 24,
        expectedOfferCodes: ["CRISPCARD"],
        extractHints: ["5x7 Folded Card", "Price $3.49 each", "CommerceProduct_33272", "Create now"],
        verificationSignals: ["5x7 folded card", "3.49", "CommerceProduct_33272", "CRISPCARD"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: true,
        legalReviewRequired: true,
        blockedFields: ["logged-in cart", "coupon application proof", "tax", "pickup window", "real order placement"],
        noNetworkRuntime: true
      }
    ],
    candidateOfferCodes: ["CRISPCARD"],
    portalApplicationPackets: [
      {
        id: "walgreens-crispcard-cards-2026-06-13-portal-application-packet",
        offerId: "walgreens-crispcard-cards-2026-06-13",
        vendorId: "walgreens",
        code: "CRISPCARD",
        label: "60% off All Photo Cards and Premium Stationery",
        status: "portal-evidence-required",
        evidenceStatus: "source-listed",
        discountPercent: 60,
        startsAtIso: "2026-06-07T00:00:00.000-05:00",
        endsAtIso: "2026-06-13T23:59:00.000-05:00",
        requiresLoggedInAccount: true,
        sourceTargetIds: ["walgreens-photo-official-deals", "walgreens-photo-card-design-entrypoint"],
        providerPortalUrls: [
          retailPrinterProductLinks.walgreens.productUrl,
          "https://photo.walgreens.com/store/cards?tab=Photo_Deals2",
          "https://photo.walgreens.com/store/cards?tab=PhotoNav%7CSameDayPickup%7CAllCards"
        ],
        applicationTargets: [
          {
            sourcePriceObservationId: "walgreens-5x7-folded-card",
            vendorName: "Walgreens Photo",
            productName: "5x7 folded cards, standard cardstock 85lb",
            portalUrl: retailPrinterProductLinks.walgreens.productUrl,
            subtotalBeforeCouponCents: 349,
            subtotalBeforeCouponLabel: "$3.49",
            expectedDiscountCents: 209,
            expectedDiscountLabel: "-$2.09",
            expectedSubtotalAfterCouponCents: 140,
            expectedSubtotalAfterCouponLabel: "$1.40",
            cartTerms: {
              vendorId: "walgreens",
              productKind: "folded-card",
              size: "5x7",
              pricedQuantity: 1,
              fulfillmentMode: "pickup",
              accountState: "logged-in"
            },
            sameCartTermsEvidenceRequired: true
          }
        ],
        requiredEvidence: [
          "retailer coupon page or coupon-provider feed capture",
          "provider portal checkout subtotal after coupon application",
          "same product, quantity, fulfillment mode, and account state",
          "no payment or order submission"
        ],
        operatorSteps: [
          "Open the provider portal product link and apply CRISPCARD only inside the reviewed cart.",
          "Record subtotal before discount, accepted coupon state, subtotal after discount, and matching cart terms.",
          "Stop before payment, pickup-slot reservation, upload, or live order placement."
        ],
        blockedFields: ["payment data", "live order submission", "unreviewed account session", "raw provider checkout session"],
        liveCheckoutAutomation: false,
        noOrderPlacedRequired: true,
        canAffectBestPrice: false,
        reason: "Provider portal application proof is required before this coupon can affect best-price ranking."
      }
    ]
  },
  cvs: {
    retailerCouponTargets: [
      {
        id: "cvs-photo-official-coupons",
        label: "CVS Photo official coupon page",
        vendorIds: ["cvs"],
        mode: "retailer-public-coupon-page",
        role: "coupon-source",
        readiness: "ready-public-page",
        url: "https://www.cvs.com/photo/cvs-photo-coupons?cid=cvs-home-s5-shop-photo",
        collectionMethod: "server-fetch-html",
        credentialEnvKeys: [],
        sourceProvider: "retailer",
        maxAgeHours: 24,
        expectedOfferCodes: ["JUNESW"],
        extractHints: ["Promo code:", "50% off Sitewide", "JUNESW", "Offer starts", "Offer valid online and in the CVS Health app"],
        verificationSignals: ["JUNESW", "50% off Sitewide", "Offer valid online and in the CVS Health app"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: false,
        legalReviewRequired: true,
        blockedFields: ["logged-in cart", "coupon application proof", "tax", "shipping", "store availability"],
        noNetworkRuntime: true
      }
    ],
    printEntrypointTargets: [
      {
        id: "cvs-photo-card-design-entrypoint",
        label: "CVS Photo 5x7 folded greeting card design-detail print entrypoint",
        vendorIds: ["cvs"],
        mode: "retailer-public-coupon-page",
        role: "print-entrypoint",
        readiness: "ready-public-page",
        url: retailPrinterProductLinks.cvs.productUrl,
        collectionMethod: "rendered-browser-read",
        credentialEnvKeys: [],
        sourceProvider: "retailer",
        maxAgeHours: 24,
        expectedOfferCodes: ["JUNESW"],
        extractHints: ["Folded Greeting Card, 5x7", "JSON-LD price 8.98", "50% off Sitewide with promo code JUNESW", "Offer ends 6/20/2026"],
        verificationSignals: ["Folded Greeting Card, 5x7", "8.98", "CommerceProduct_26126", "JUNESW"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: true,
        legalReviewRequired: true,
        blockedFields: ["logged-in cart", "coupon application proof", "tax", "pickup window", "real order placement"],
        noNetworkRuntime: true
      }
    ],
    candidateOfferCodes: ["JUNESW"],
    portalApplicationPackets: [
      {
        id: "cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet",
        offerId: "cvs-junesw-sitewide-photo-2026-06-20",
        vendorId: "cvs",
        code: "JUNESW",
        label: "50% off Sitewide Photo",
        status: "portal-evidence-required",
        evidenceStatus: "source-listed",
        discountPercent: 50,
        startsAtIso: "2026-06-07T00:01:00.000-04:00",
        endsAtIso: "2026-06-20T23:59:00.000-04:00",
        requiresLoggedInAccount: false,
        sourceTargetIds: ["cvs-photo-official-coupons", "cvs-photo-card-design-entrypoint"],
        providerPortalUrls: [
          retailPrinterProductLinks.cvs.productUrl,
          "https://www.cvs.com/photo/prints",
          "https://www.cvs.com/photo/cards",
          "https://www.cvs.com/Photo/Cards"
        ],
        applicationTargets: [
          {
            sourcePriceObservationId: "cvs-5x7-double-sided-cardstock",
            vendorName: "CVS Photo",
            productName: "5x7 double-sided cardstock card",
            portalUrl: "https://www.cvs.com/Photo/Cards",
            subtotalBeforeCouponCents: 3980,
            subtotalBeforeCouponLabel: "$39.80",
            expectedDiscountCents: 1990,
            expectedDiscountLabel: "-$19.90",
            expectedSubtotalAfterCouponCents: 1990,
            expectedSubtotalAfterCouponLabel: "$19.90",
            cartTerms: {
              vendorId: "cvs",
              productKind: "flat-card",
              size: "5x7",
              pricedQuantity: 20,
              fulfillmentMode: "pickup",
              accountState: "guest-or-public"
            },
            sameCartTermsEvidenceRequired: true
          },
          {
            sourcePriceObservationId: "cvs-5x7-photo-card",
            vendorName: "CVS Photo",
            productName: "5x7 photo card",
            portalUrl: "https://www.cvs.com/Photo/Cards",
            subtotalBeforeCouponCents: 2180,
            subtotalBeforeCouponLabel: "$21.80",
            expectedDiscountCents: 1090,
            expectedDiscountLabel: "-$10.90",
            expectedSubtotalAfterCouponCents: 1090,
            expectedSubtotalAfterCouponLabel: "$10.90",
            cartTerms: {
              vendorId: "cvs",
              productKind: "photo-card",
              size: "5x7",
              pricedQuantity: 20,
              fulfillmentMode: "pickup",
              accountState: "guest-or-public"
            },
            sameCartTermsEvidenceRequired: true
          },
          {
            sourcePriceObservationId: "cvs-5x7-premium-card",
            vendorName: "CVS Photo",
            productName: "Same Day 5x7 Premium card",
            portalUrl: "https://www.cvs.com/Photo/Cards",
            subtotalBeforeCouponCents: 4980,
            subtotalBeforeCouponLabel: "$49.80",
            expectedDiscountCents: 2490,
            expectedDiscountLabel: "-$24.90",
            expectedSubtotalAfterCouponCents: 2490,
            expectedSubtotalAfterCouponLabel: "$24.90",
            cartTerms: {
              vendorId: "cvs",
              productKind: "premium-card",
              size: "5x7",
              pricedQuantity: 20,
              fulfillmentMode: "pickup",
              accountState: "guest-or-public"
            },
            sameCartTermsEvidenceRequired: true
          },
          {
            sourcePriceObservationId: "cvs-5x7-folded-card",
            vendorName: "CVS Photo",
            productName: "Folded greeting card, 5x7",
            portalUrl: retailPrinterProductLinks.cvs.productUrl,
            subtotalBeforeCouponCents: 898,
            subtotalBeforeCouponLabel: "$8.98",
            expectedDiscountCents: 449,
            expectedDiscountLabel: "-$4.49",
            expectedSubtotalAfterCouponCents: 449,
            expectedSubtotalAfterCouponLabel: "$4.49",
            cartTerms: {
              vendorId: "cvs",
              productKind: "folded-card",
              size: "5x7",
              pricedQuantity: 1,
              fulfillmentMode: "pickup",
              accountState: "guest-or-public"
            },
            sameCartTermsEvidenceRequired: true
          }
        ],
        requiredEvidence: [
          "retailer coupon page or coupon-provider feed capture",
          "provider portal checkout subtotal after coupon application",
          "same product, quantity, fulfillment mode, and account state",
          "no payment or order submission"
        ],
        operatorSteps: [
          "Open the provider portal product link and apply JUNESW only inside the reviewed cart.",
          "Record subtotal before discount, accepted coupon state, subtotal after discount, and matching cart terms.",
          "Stop before payment, pickup-slot reservation, upload, or live order placement."
        ],
        blockedFields: ["payment data", "live order submission", "unreviewed account session", "raw provider checkout session"],
        liveCheckoutAutomation: false,
        noOrderPlacedRequired: true,
        canAffectBestPrice: false,
        reason: "Provider portal application proof is required before this coupon can affect best-price ranking."
      }
    ]
  }
};

export const printerCouponCollectionTargets = [
  ...printerCouponProviderFeedTargets,
  ...Object.values(printerCouponCollectionContracts).flatMap((contract) => [
    ...contract.retailerCouponTargets,
    ...contract.printEntrypointTargets
  ])
];

export function getPrinterCouponCollectionContract(vendorId) {
  return printerCouponCollectionContracts[vendorId];
}

export function buildSharedPrinterCouponCollectionPlan(productLinkOrVendorId, options = {}) {
  const productLink =
    typeof productLinkOrVendorId === "string"
      ? retailPrinterProductLinks[productLinkOrVendorId]
      : productLinkOrVendorId;
  const vendorId = productLink?.vendorId ?? productLinkOrVendorId;
  const quantity = Math.max(Math.round(options.quantity ?? productLink?.minimumQuantity ?? 1), 1);
  const couponContract = getPrinterCouponCollectionContract(vendorId);
  const providerFeedTargets = couponContract ? printerCouponProviderFeedTargets : [];
  const retailerCouponTargets = couponContract?.retailerCouponTargets ?? [];
  const printEntrypointTargets = couponContract?.printEntrypointTargets ?? [];
  const portalApplicationPackets = couponContract?.portalApplicationPackets ?? [];
  const candidateOfferCodes = productLink?.candidateOfferCodes ?? couponContract?.candidateOfferCodes ?? [];
  const providerFeedTargetIds = providerFeedTargets.map((target) => target.id);
  const retailerCouponTargetIds = retailerCouponTargets.map((target) => target.id);
  const printEntrypointTargetIds = printEntrypointTargets.map((target) => target.id);
  const portalApplicationPacketIds = productLink?.portalApplicationPacketIds ?? portalApplicationPackets.map((packet) => packet.id);

  return {
    vendorId,
    quantity,
    collectionPriority: printerCouponCollectionPriority,
    collectionTargetIds: [...providerFeedTargetIds, ...retailerCouponTargetIds, ...printEntrypointTargetIds],
    providerFeedTargetIds,
    retailerCouponTargetIds,
    printEntrypointTargetIds,
    credentialEnvKeys: [...new Set(providerFeedTargets.flatMap((target) => target.credentialEnvKeys))],
    candidateOfferCodes,
    portalApplicationPacketIds,
    providerFeedTargets,
    retailerCouponTargets,
    printEntrypointTargets,
    portalApplicationPackets,
    couponPolicy: {
      providerPortalApplicationRequired: true,
      couponsIncludedInDisplayedPrices: "only-after-provider-portal-application",
      sameCartEvidenceRequired: true,
      noBestPriceRankingWithoutPortalProof: true
    },
    couponProviderFeedPreferred: true,
    retailerScrapeFallbackAllowed: true,
    printLinkRenderFallbackAllowed: true,
    providerPortalApplicationRequired: true,
    bestPriceRequiresProviderPortalEvidence: true,
    canAffectBestPriceBeforePortalEvidence: false,
    noNetworkRuntime: true,
    operatorSteps: buildSharedPrinterCouponCollectionOperatorSteps(
      vendorId,
      providerFeedTargetIds,
      retailerCouponTargetIds,
      printEntrypointTargetIds,
      candidateOfferCodes,
      portalApplicationPacketIds
    )
  };
}

function buildSharedPrinterCouponCollectionOperatorSteps(
  vendorId,
  providerFeedTargetIds,
  retailerCouponTargetIds,
  printEntrypointTargetIds,
  candidateOfferCodes,
  portalApplicationPacketIds
) {
  return [
    providerFeedTargetIds.length > 0
      ? `Run credentialed coupon provider feed targets first when approved server/operator credentials exist: ${providerFeedTargetIds.join(", ")}.`
      : `No credentialed coupon provider feed target is registered for ${vendorId}; do not invent third-party coupon candidates.`,
    [...retailerCouponTargetIds, ...printEntrypointTargetIds].length > 0
      ? `Collect official retailer coupon-page evidence and rendered print-link evidence from: ${[
          ...retailerCouponTargetIds,
          ...printEntrypointTargetIds
        ].join(", ")}.`
      : `No official retailer coupon target is registered for ${vendorId}; record no source-listed coupon before ranking.`,
    candidateOfferCodes.length > 0
      ? `Apply candidate coupon code(s) ${candidateOfferCodes.join(", ")} in the same provider portal cart during pricing collection.`
      : "Record that no active source-listed coupon code is available for this provider before ranking.",
    portalApplicationPacketIds.length > 0
      ? `Record same-cart provider portal evidence against packet(s): ${portalApplicationPacketIds.join(", ")}.`
      : "Do not create ad hoc coupon portal evidence without a registered packet.",
    "Do not apply a discount to best-price ranking until the provider portal shows the code accepted."
  ];
}
