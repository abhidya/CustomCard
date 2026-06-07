export const retailPrinterOperationStartRoute = "/api/retail-printers/operations/start";

export const retailPrinterOperationKinds = ["fetch-price", "upload-image", "place-order"];

const observedAtIso = "2026-06-07T12:00:00.000Z";
const sharedForbiddenFields = ["raw relationship memories", "raw payment card data", "unapproved recipient PII"];
const sharedGateIds = ["vendor-certification", "real-order-kill-switch", "customer-approval"];

export const retailPrinterProductLinks = {
  walmart: {
    vendorId: "walmart",
    providerAdapterId: "walmart-live-print",
    vendorName: "Walmart Photo",
    productName: "5x7 folded card, blank envelope - upload your design",
    productSku: "361-5x7-folded-card-blank-envelope",
    productUrl:
      "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
    pricingObservationId: "walmart-5x7-same-day-folded-card",
    requiredUrlTokens: [
      "product=361-5x7-folded-card-blank-envelope",
      "theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card",
      "design_code=standard.custom",
      "selected_delivery_options=2"
    ],
    portalHost: "photos3.walmart.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "guest-or-customer-account"
  },
  fedex: {
    vendorId: "fedex",
    providerAdapterId: "fedex-live-print",
    vendorName: "FedEx Office",
    productName: "Quick greeting and holiday cards",
    productSku: "fedex-office-quick-greeting-cards",
    productUrl: "https://www.office.fedex.com/default/greeting-cards-quick.html",
    pricingObservationId: "fedex-quick-5x7-single-sided-card",
    requiredUrlTokens: ["/default/greeting-cards-quick.html"],
    portalHost: "www.office.fedex.com",
    minimumQuantity: 10,
    quantityIncrement: 10,
    supportedFulfillmentModes: ["pickup", "shipping"],
    providerAccountMode: "guest-or-customer-account"
  },
  cvs: {
    vendorId: "cvs",
    providerAdapterId: "cvs-live-order",
    vendorName: "CVS Photo",
    productName: "Folded greeting card, 5x7",
    productSku: "CommerceProduct_26126",
    productUrl:
      "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery",
    pricingObservationId: "cvs-5x7-folded-card",
    requiredUrlTokens: [
      "/photo/design-detail",
      "category=StoreCat_22821",
      "designId=1f0682a2d34546bf86cbb799c3811d4e",
      "sku=CommerceProduct_26126",
      "productCategory=Card%20%26%20Stationery"
    ],
    portalHost: "www.cvs.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "guest-or-customer-account",
    candidateOfferCodes: ["JUNESW"],
    portalApplicationPacketIds: ["cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet"]
  },
  walgreens: {
    vendorId: "walgreens",
    providerAdapterId: "walgreens-live-order",
    vendorName: "Walgreens Photo",
    productName: "5x7 folded cards, standard cardstock 85lb",
    productSku: "CommerceProduct_33272",
    productUrl:
      "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery",
    pricingObservationId: "walgreens-5x7-folded-card",
    requiredUrlTokens: [
      "/store/design-detail",
      "category=StoreCat_24955",
      "designId=0c158c44e2f34d9fabc9e1b3ada2eaa6",
      "sku=CommerceProduct_33272",
      "productCategory=Card%20%26%20Stationery"
    ],
    portalHost: "photo.walgreens.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "customer-account-required",
    candidateOfferCodes: ["CRISPCARD"],
    portalApplicationPacketIds: ["walgreens-crispcard-cards-2026-06-13-portal-application-packet"]
  }
};

const couponProviderFeedTargets = [
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
    verificationSignals: ["status", "code_verified_at", "link_verified_at", "end_date"],
    staticHtmlSignalAllowed: false,
    browserRenderProofRequired: false,
    legalReviewRequired: true,
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
    verificationSignals: ["coupon code", "promotional link", "offerstartdate", "offerenddate", "advertiser"],
    staticHtmlSignalAllowed: false,
    browserRenderProofRequired: false,
    legalReviewRequired: true,
    noNetworkRuntime: true
  }
];

const couponCollectionPriority = [
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

const couponCollectionContracts = {
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
        verificationSignals: ["CRISPCARD", "60% OFF All Photo Cards & Premium Stationery", "Offer expires at 11:59 p.m. CT"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: false,
        legalReviewRequired: true,
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
        verificationSignals: ["5x7 folded card", "3.49", "CommerceProduct_33272", "CRISPCARD"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: true,
        legalReviewRequired: true,
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
            expectedDiscountCents: 209,
            expectedSubtotalAfterCouponCents: 140,
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
        liveCheckoutAutomation: false,
        noOrderPlacedRequired: true,
        canAffectBestPrice: false
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
        verificationSignals: ["JUNESW", "50% off Sitewide", "Offer valid online and in the CVS Health app"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: false,
        legalReviewRequired: true,
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
        verificationSignals: ["Folded Greeting Card, 5x7", "8.98", "CommerceProduct_26126", "JUNESW"],
        staticHtmlSignalAllowed: true,
        browserRenderProofRequired: true,
        legalReviewRequired: true,
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
            expectedDiscountCents: 1990,
            expectedSubtotalAfterCouponCents: 1990,
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
            expectedDiscountCents: 1090,
            expectedSubtotalAfterCouponCents: 1090,
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
            expectedDiscountCents: 2490,
            expectedSubtotalAfterCouponCents: 2490,
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
            expectedDiscountCents: 449,
            expectedSubtotalAfterCouponCents: 449,
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
        liveCheckoutAutomation: false,
        noOrderPlacedRequired: true,
        canAffectBestPrice: false
      }
    ]
  }
};

const operationShapes = {
  "fetch-price": {
    label: "Fetch price",
    requiredInputFields: ["storeOrShippingZip"],
    optionalInputFields: ["productUrl", "productSku", "quantity", "fulfillmentMode", "couponCode"],
    sourceBackedFields: ["productUrl", "productSku"],
    evidenceMode: "public-product-price-review",
    couponMode: "same-cart-provider-portal-proof",
    requiredEvidence: [
      "Official product page price evidence",
      "Tax and coupon portal application proof",
      "Store availability or shipping-window proof"
    ],
    requiredGateIds: ["provider-coupon-portal-proof", "retail-price-freshness-proof", "vendor-certification"],
    blockedReason: "Live quote collection remains blocked until provider portal coupon proof and certification are attached."
  },
  "upload-image": {
    label: "Upload image",
    requiredInputFields: ["providerAccountReference"],
    optionalInputFields: ["renderPacketArtifactUris", "panelManifestChecksum", "productSku", "customerApprovalId"],
    sourceBackedFields: ["productSku"],
    evidenceMode: "provider-project-preview-review",
    couponMode: "preserve-price-cart-coupon-state",
    requiredEvidence: [
      "Vendor upload API or certified browser automation contract",
      "Asset-size acceptance proof",
      "Crop/fold preview screenshot"
    ],
    requiredGateIds: ["vendor-certification", "asset-upload-proof", "customer-approval"],
    blockedReason: "Image upload remains blocked until a certified transport and provider preview proof exist."
  },
  "place-order": {
    label: "Place order",
    requiredInputFields: ["providerCartId", "paymentAuthorizationReference"],
    optionalInputFields: ["quoteEvidenceId", "customerApprovalId", "cancellationRecoveryPlanId"],
    sourceBackedFields: ["quoteEvidenceId"],
    evidenceMode: "provider-cart-final-review",
    couponMode: "final-cart-coupon-recheck",
    requiredEvidence: ["Vendor certification", "Explicit customer approval record", "Payment and cancellation recovery proof"],
    requiredGateIds: ["vendor-certification", "real-order-kill-switch", "customer-approval"],
    blockedReason: "Live ordering remains blocked until certification, customer approval, tokenized payment, and recovery gates pass."
  }
};

export function buildRetailPrinterOperationStartPackets() {
  return Object.values(retailPrinterProductLinks).flatMap((productLink) =>
    retailPrinterOperationKinds.map((operation) => buildRetailPrinterOperationStartPacket(productLink.vendorId, operation))
  );
}

export function buildRetailPrinterOperationStartResponse(request = {}) {
  const requestedVendorId = parseRetailPrinterVendorId(request.vendorId) ?? "walgreens";
  const requestedOperation = parseRetailPrinterOperationKind(request.operation) ?? "fetch-price";
  const startPacket = buildRetailPrinterOperationStartPackets().find(
    (packet) => packet.vendorId === requestedVendorId && packet.operation === requestedOperation
  );

  if (!startPacket) throw new Error(`Missing retail printer operation start packet: ${requestedVendorId} ${requestedOperation}`);

  return {
    service: "customcard-retail-printer-operation-start",
    status: "blocked",
    requestedVendorId,
    requestedOperation,
    startPacket,
    serverOwned: true,
    clientMayPrepareProviderRequest: false,
    providerPortalUrl: startPacket.providerPortalUrl,
    providerRequestUrl: null,
    providerRequestPrepared: false,
    networkRequestPrepared: false,
    requestPrepared: false,
    networkAttempted: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    blockers: startPacket.blockers
  };
}

export function validateRetailPrinterOperationStartPackets(packets = buildRetailPrinterOperationStartPackets()) {
  const errors = [];
  const ids = new Set();

  for (const packet of packets) {
    const productLink = retailPrinterProductLinks[packet.vendorId];
    if (ids.has(packet.id)) errors.push(`Duplicate retail printer operation start packet: ${packet.id}`);
    ids.add(packet.id);
    if (packet.apiRoute !== retailPrinterOperationStartRoute) {
      errors.push(`Retail printer operation start packet ${packet.id} must use the operation start API route.`);
    }
    if (!packet.serverOwned || !packet.customerVisible) {
      errors.push(`Retail printer operation start packet ${packet.id} must be server-owned and customer-visible.`);
    }
    if (!productLink || packet.productUrl !== productLink.productUrl || packet.manualReviewUrl !== productLink.productUrl) {
      errors.push(`Retail printer operation start packet ${packet.id} must use the exact persisted product URL.`);
    }
    if (packet.providerPortalUrl !== productLink?.productUrl) {
      errors.push(`Retail printer operation start packet ${packet.id} must expose the persisted provider portal URL.`);
    }
    if (packet.providerRequestUrl !== null || packet.clientMayPrepareProviderRequest || packet.providerRequestPrepared) {
      errors.push(`Retail printer operation start packet ${packet.id} must not expose a client-prepared provider request.`);
    }
    if (
      packet.networkRequestPrepared ||
      packet.requestPrepared ||
      packet.networkAttempted ||
      !packet.noNetwork ||
      packet.externalNetworkCalls ||
      packet.realOrdersEnabled
    ) {
      errors.push(`Retail printer operation start packet ${packet.id} must stay no-network and real-order disabled.`);
    }
    if (packet.liveQuoteEnabled || packet.imageUploadEnabled || packet.orderPlacementEnabled) {
      errors.push(`Retail printer operation start packet ${packet.id} must not enable live quote, upload, or order operations.`);
    }
    if (packet.sourceLink.url !== productLink?.productUrl || packet.providerEntrypoint.url !== productLink?.productUrl) {
      errors.push(`Retail printer operation start packet ${packet.id} must point source and entrypoint to the persisted URL.`);
    }
    if (packet.sourceLink.purpose !== packet.operation || packet.providerEntrypoint.operation !== packet.operation) {
      errors.push(`Retail printer operation start packet ${packet.id} must align source, entrypoint, and operation.`);
    }
    if (packet.couponCollectionPlan.bestPriceRequiresProviderPortalEvidence !== true) {
      errors.push(`Retail printer operation start packet ${packet.id} must require provider-portal coupon evidence.`);
    }
    if (packet.couponCollectionPlan.canAffectBestPriceBeforePortalEvidence !== false) {
      errors.push(`Retail printer operation start packet ${packet.id} must block coupon ranking before portal evidence.`);
    }
    errors.push(...validateOperationStartCouponCollectionPlan(packet, productLink));
    if (
      !packet.couponPortalApplicationRequired ||
      !packet.bestPriceRequiresProviderPortalEvidence ||
      packet.canAffectBestPriceBeforePortalEvidence
    ) {
      errors.push(`Retail printer operation start packet ${packet.id} must keep coupon pricing portal-gated.`);
    }
    if (packet.requiredEvidence.length < 3 || packet.requiredGateIds.length < 3 || packet.operatorSteps.length < 4) {
      errors.push(`Retail printer operation start packet ${packet.id} must include evidence, gates, and operator steps.`);
    }
    if (packet.blockers.length < packet.requiredGateIds.length) {
      errors.push(`Retail printer operation start packet ${packet.id} must expose all gate blockers.`);
    }
    if (
      packet.operation === "fetch-price" &&
      (!packet.blockers.includes("provider-coupon-portal-proof") ||
        !packet.blockers.includes("retail-price-freshness-proof"))
    ) {
      errors.push(`Retail printer operation start packet ${packet.id} must block price starts on coupon and freshness proof.`);
    }
    if (packet.requiredInputFields.length === 0 || packet.expectedInputFields.length < packet.requiredInputFields.length) {
      errors.push(`Retail printer operation start packet ${packet.id} must expose required operation inputs.`);
    }
  }

  for (const vendorId of Object.keys(retailPrinterProductLinks)) {
    for (const operation of retailPrinterOperationKinds) {
      if (!packets.some((packet) => packet.vendorId === vendorId && packet.operation === operation)) {
        errors.push(`Missing retail printer operation start packet: ${vendorId} ${operation}.`);
      }
    }
  }

  return errors;
}

function validateOperationStartCouponCollectionPlan(packet, productLink) {
  const errors = [];
  const plan = packet.couponCollectionPlan;
  const couponContract = couponCollectionContracts[packet.vendorId];
  const expectedProviderFeedTargetIds = couponContract ? couponProviderFeedTargets.map((target) => target.id) : [];
  const expectedRetailerCouponTargetIds = couponContract?.retailerCouponTargets.map((target) => target.id) ?? [];
  const expectedPrintEntrypointTargetIds = couponContract?.printEntrypointTargets.map((target) => target.id) ?? [];
  const expectedCandidateOfferCodes = couponContract?.candidateOfferCodes ?? [];
  const expectedPortalApplicationPacketIds = couponContract?.portalApplicationPackets.map((portalPacket) => portalPacket.id) ?? [];
  const expectedCollectionTargetIds = [
    ...expectedProviderFeedTargetIds,
    ...expectedRetailerCouponTargetIds,
    ...expectedPrintEntrypointTargetIds
  ];

  if (!sameStringArray(plan.collectionPriority?.map((step) => step.id), couponCollectionPriority.map((step) => step.id))) {
    errors.push(`Retail printer operation start packet ${packet.id} must expose the coupon collection priority contract.`);
  }
  if (plan.couponProviderFeedPreferred !== true || plan.retailerScrapeFallbackAllowed !== true || plan.printLinkRenderFallbackAllowed !== true) {
    errors.push(`Retail printer operation start packet ${packet.id} must keep provider-first coupon collection with retailer and print-link fallbacks.`);
  }
  if (plan.providerPortalApplicationRequired !== true) {
    errors.push(`Retail printer operation start packet ${packet.id} must require provider portal coupon application.`);
  }
  if (!sameStringArray(plan.providerFeedTargetIds, expectedProviderFeedTargetIds)) {
    errors.push(`Retail printer operation start packet ${packet.id} must use registered coupon provider feed target ids.`);
  }
  if (!sameStringArray(plan.retailerCouponTargetIds, expectedRetailerCouponTargetIds)) {
    errors.push(`Retail printer operation start packet ${packet.id} must use registered official retailer coupon target ids.`);
  }
  if (!sameStringArray(plan.printEntrypointTargetIds, expectedPrintEntrypointTargetIds)) {
    errors.push(`Retail printer operation start packet ${packet.id} must use registered rendered print-link target ids.`);
  }
  if (!sameStringArray(plan.collectionTargetIds, expectedCollectionTargetIds)) {
    errors.push(`Retail printer operation start packet ${packet.id} must expose coupon collection target ids without drift.`);
  }
  if (!sameStringArray(plan.candidateOfferCodes, expectedCandidateOfferCodes)) {
    errors.push(`Retail printer operation start packet ${packet.id} must expose only registered source-listed coupon codes.`);
  }
  if (!sameStringArray(plan.portalApplicationPacketIds, expectedPortalApplicationPacketIds)) {
    errors.push(`Retail printer operation start packet ${packet.id} must expose registered portal application packet ids.`);
  }
  if (!couponContract && plan.collectionTargetIds.length > 0) {
    errors.push(`Retail printer operation start packet ${packet.id} must not invent coupon targets for ${packet.vendorId}.`);
  }

  for (const target of [...plan.providerFeedTargets, ...plan.retailerCouponTargets, ...plan.printEntrypointTargets]) {
    if (!plan.collectionTargetIds.includes(target.id)) {
      errors.push(`Retail printer operation start packet ${packet.id} coupon target ${target.id} must appear in collectionTargetIds.`);
    }
    if (target.role === "provider-feed" && target.collectionMethod !== "provider-api-feed") {
      errors.push(`Retail printer operation start packet ${packet.id} provider feed ${target.id} must use provider-api-feed.`);
    }
    if (target.role === "coupon-source" && target.collectionMethod !== "server-fetch-html") {
      errors.push(`Retail printer operation start packet ${packet.id} coupon source ${target.id} must use server-fetch-html.`);
    }
    if (target.role === "print-entrypoint") {
      if (target.collectionMethod !== "rendered-browser-read") {
        errors.push(`Retail printer operation start packet ${packet.id} print entrypoint ${target.id} must use rendered-browser-read.`);
      }
      if (target.url !== productLink?.productUrl) {
        errors.push(`Retail printer operation start packet ${packet.id} print entrypoint ${target.id} must use the exact product URL.`);
      }
      if (target.browserRenderProofRequired !== true) {
        errors.push(`Retail printer operation start packet ${packet.id} print entrypoint ${target.id} must require browser render proof.`);
      }
    }
  }

  for (const portalPacket of plan.portalApplicationPackets) {
    if (portalPacket.vendorId !== packet.vendorId) {
      errors.push(`Retail printer operation start packet ${packet.id} portal packet ${portalPacket.id} must match packet vendor.`);
    }
    if (portalPacket.canAffectBestPrice !== false || portalPacket.liveCheckoutAutomation !== false) {
      errors.push(`Retail printer operation start packet ${packet.id} portal packet ${portalPacket.id} must stay proof-gated.`);
    }
    if (!Array.isArray(portalPacket.applicationTargets) || portalPacket.applicationTargets.length === 0) {
      errors.push(`Retail printer operation start packet ${packet.id} portal packet ${portalPacket.id} must include application targets.`);
    }
  }

  return errors;
}

export function parseRetailPrinterVendorId(value) {
  const candidate = `${value ?? ""}`.trim();
  return Object.hasOwn(retailPrinterProductLinks, candidate) ? candidate : undefined;
}

function sameStringArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

export function parseRetailPrinterOperationKind(value) {
  const candidate = `${value ?? ""}`.trim();
  return retailPrinterOperationKinds.find((operation) => operation === candidate);
}

function buildRetailPrinterOperationStartPacket(vendorId, operation) {
  const productLink = retailPrinterProductLinks[vendorId] ?? retailPrinterProductLinks.walgreens;
  const operationShape = operationShapes[operation] ?? operationShapes["fetch-price"];
  const expectedInputFields = [...operationShape.requiredInputFields, ...operationShape.optionalInputFields];
  const couponCollectionPlan = buildCouponCollectionPlan(productLink, operation);

  return {
    id: `${productLink.vendorId}-${operation}-operation-start`,
    vendorId: productLink.vendorId,
    providerAdapterId: productLink.providerAdapterId,
    vendorName: productLink.vendorName,
    productName: productLink.productName,
    productSku: productLink.productSku,
    operation,
    label: operationShape.label,
    status: "blocked",
    apiRoute: retailPrinterOperationStartRoute,
    serverOwned: true,
    customerVisible: true,
    productUrl: productLink.productUrl,
    manualReviewUrl: productLink.productUrl,
    providerPortalUrl: productLink.productUrl,
    providerRequestUrl: null,
    clientMayPrepareProviderRequest: false,
    providerRequestPrepared: false,
    networkRequestPrepared: false,
    requestPrepared: false,
    networkAttempted: false,
    noNetwork: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    sourceLink: {
      purpose: operation,
      label: `${productLink.vendorName} ${operation}`,
      url: productLink.productUrl,
      sourceKind: "retailer-product-page",
      observedAtIso,
      evidenceMode: operationShape.evidenceMode
    },
    providerEntrypoint: {
      operation,
      label: `${productLink.vendorName} ${operation}`,
      url: productLink.productUrl,
      portalHost: productLink.portalHost,
      productSku: productLink.productSku,
      productIdentityTokens: productLink.requiredUrlTokens,
      evidenceMode: operationShape.evidenceMode,
      couponMode: operationShape.couponMode,
      requiresCustomerApproval: true,
      noNetwork: true,
      requestPreparationBlocked: true,
      orderSubmissionBlocked: true
    },
    operationPolicy: buildOperationPolicy(productLink, operation),
    couponCollectionPlan,
    couponPortalApplicationRequired: true,
    bestPriceRequiresProviderPortalEvidence: true,
    canAffectBestPriceBeforePortalEvidence: false,
    expectedInputFields,
    requiredInputFields: operationShape.requiredInputFields,
    optionalInputFields: operationShape.optionalInputFields,
    sourceBackedFields: operationShape.sourceBackedFields,
    requiredEvidence: operationShape.requiredEvidence,
    requiredGateIds: operationShape.requiredGateIds,
    blockers: buildOperationStartBlockers(operation, operationShape.requiredGateIds),
    forbiddenFields: sharedForbiddenFields,
    operatorSteps: buildRetailPrinterOperationSteps(productLink, operation, couponCollectionPlan),
    safetyChecks: [
      "Do not send a network request from CustomCard.",
      "Do not prepare a provider API payload in client or app runtime.",
      "Do not upload files, submit payment, reserve pickup, or place a live order from this packet.",
      "Use provider-portal evidence only after customer approval and certification gates are attached."
    ],
    blockedReason: operationShape.blockedReason
  };
}

function buildOperationPolicy(productLink, operation) {
  if (operation === "fetch-price") {
    return {
      kind: "fetch-price",
      minimumQuantity: productLink.minimumQuantity,
      quantityIncrement: productLink.quantityIncrement,
      supportedFulfillmentModes: productLink.supportedFulfillmentModes,
      couponProof: "same-cart-provider-portal",
      requiredEvidenceFields: ["subtotal", "taxStatus", "couponApplicationStatus", "pickupOrShippingWindow"]
    };
  }
  if (operation === "upload-image") {
    return {
      kind: "upload-image",
      acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
      providerAccountMode: productLink.providerAccountMode,
      preflightChecks: ["approved render packet", `${productLink.productSku} selected`, `${productLink.vendorName} preview captured`],
      previewEvidenceFields: ["providerPreviewScreenshot", "assetAcceptanceResult", "cropFoldState"]
    };
  }
  return {
    kind: "place-order",
    requiredApprovalFields: ["customerApprovalId", "quoteEvidenceId", "paymentAuthorizationReference"],
    prohibitedUntilEvidence: ["vendorCertification", "physicalPrintQa", "realOrderKillSwitch", "customerFinalApproval"],
    recoveryEvidenceFields: ["cancellationRecoveryPlanId", "wrongStoreRecoveryPlanId"]
  };
}

function buildCouponCollectionPlan(productLink, operation) {
  const quantity = operation === "fetch-price" ? productLink.minimumQuantity : 1;
  const couponContract = couponCollectionContracts[productLink.vendorId];
  const providerFeedTargets = couponContract ? couponProviderFeedTargets : [];
  const retailerCouponTargets = couponContract?.retailerCouponTargets ?? [];
  const printEntrypointTargets = couponContract?.printEntrypointTargets ?? [];
  const portalApplicationPackets = couponContract?.portalApplicationPackets ?? [];
  const candidateOfferCodes = couponContract?.candidateOfferCodes ?? [];
  const providerFeedTargetIds = providerFeedTargets.map((target) => target.id);
  const retailerCouponTargetIds = retailerCouponTargets.map((target) => target.id);
  const printEntrypointTargetIds = printEntrypointTargets.map((target) => target.id);
  const portalApplicationPacketIds = portalApplicationPackets.map((packet) => packet.id);

  return {
    vendorId: productLink.vendorId,
    quantity,
    collectionPriority: couponCollectionPriority,
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
    operatorSteps: [
      providerFeedTargets.length > 0
        ? `Run credentialed coupon provider feed targets first when approved server/operator credentials exist: ${providerFeedTargetIds.join(", ")}.`
        : `No credentialed coupon provider feed target is registered for ${productLink.vendorId}; do not invent third-party coupon candidates.`,
      [...retailerCouponTargetIds, ...printEntrypointTargetIds].length > 0
        ? `Collect official retailer coupon-page evidence and rendered print-link evidence from: ${[
            ...retailerCouponTargetIds,
            ...printEntrypointTargetIds
          ].join(", ")}.`
        : `No official retailer coupon target is registered for ${productLink.vendorId}; record no source-listed coupon before ranking.`,
      candidateOfferCodes.length > 0
        ? `Apply candidate coupon code(s) ${candidateOfferCodes.join(", ")} in the same provider portal cart during pricing collection.`
        : "Record that no active source-listed coupon code is available for this provider before ranking.",
      portalApplicationPacketIds.length > 0
        ? `Record same-cart provider portal evidence against packet(s): ${portalApplicationPacketIds.join(", ")}.`
        : "Do not create ad hoc coupon portal evidence without a registered packet.",
      "Do not apply a discount to best-price ranking until the provider portal shows the code accepted."
    ]
  };
}

function buildOperationStartBlockers(operation, requiredGateIds) {
  if (operation === "fetch-price") {
    return [...requiredGateIds, "provider-coupon-portal-proof", "retail-price-freshness-proof"];
  }
  if (operation === "upload-image") {
    return [...requiredGateIds, "asset-upload-proof", "provider-preview-proof"];
  }
  return requiredGateIds;
}

function buildRetailPrinterOperationSteps(productLink, operation, couponCollectionPlan) {
  if (operation === "fetch-price") {
    return [
      `Open ${productLink.vendorName} ${operation}: ${productLink.productUrl}`,
      `Confirm ${productLink.productName} and ${productLink.productSku} before collecting price evidence.`,
      "Collect public subtotal, tax status, pickup or shipping window, and coupon application status in the provider portal.",
      ...couponCollectionPlan.operatorSteps,
      "Stop before upload, payment, pickup reservation, or live order placement."
    ];
  }
  if (operation === "upload-image") {
    return [
      `Open ${productLink.vendorName} ${operation}: ${productLink.productUrl}`,
      `Confirm ${productLink.productName} and ${productLink.productSku} before creating a provider preview.`,
      "Use only approved render-packet artifacts and record provider preview/crop/fold evidence.",
      "Preserve the price-collection coupon state; do not submit payment or place an order."
    ];
  }
  return [
    `Open ${productLink.vendorName} ${operation}: ${productLink.productUrl}`,
    `Confirm ${productLink.productName}, ${productLink.productSku}, quote evidence, and approved render packet still match.`,
    "Recheck coupon application in the same provider portal cart before any final price claim.",
    "Require customer final approval, tokenized payment authorization, recovery plan, certification, and kill-switch evidence.",
    "Stop unless every live enablement gate is attached and audited."
  ];
}
