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

export function parseRetailPrinterVendorId(value) {
  const candidate = `${value ?? ""}`.trim();
  return Object.hasOwn(retailPrinterProductLinks, candidate) ? candidate : undefined;
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
  const candidateOfferCodes = productLink.candidateOfferCodes ?? [];
  const portalApplicationPacketIds = productLink.portalApplicationPacketIds ?? [];
  const providerFeedTargetIds = ["fmtc-deal-feed", "rakuten-coupon-feed"];
  const retailerCouponTargetIds = [`${productLink.vendorId}-official-photo-coupons`];
  const printEntrypointTargetIds = [`${productLink.vendorId}-photo-card-design-entrypoint`];

  return {
    vendorId: productLink.vendorId,
    quantity,
    collectionTargetIds: [...providerFeedTargetIds, ...retailerCouponTargetIds, ...printEntrypointTargetIds],
    providerFeedTargetIds,
    retailerCouponTargetIds,
    printEntrypointTargetIds,
    credentialEnvKeys: ["FMTC_API_TOKEN", "RAKUTEN_ADVERTISING_API_TOKEN"],
    candidateOfferCodes,
    portalApplicationPacketIds,
    providerFeedTargets: [],
    retailerCouponTargets: [],
    printEntrypointTargets: [],
    portalApplicationPackets: portalApplicationPacketIds.map((id) => ({
      id,
      vendorId: productLink.vendorId,
      status: "portal-evidence-required",
      canAffectBestPrice: false
    })),
    couponPolicy: {
      providerPortalApplicationRequired: true,
      couponsIncludedInDisplayedPrices: "only-after-provider-portal-application",
      sameCartEvidenceRequired: true,
      noBestPriceRankingWithoutPortalProof: true
    },
    bestPriceRequiresProviderPortalEvidence: true,
    canAffectBestPriceBeforePortalEvidence: false,
    noNetworkRuntime: true,
    operatorSteps: [
      "Collect coupon candidates from configured coupon provider feeds when credentials exist.",
      "Open the exact provider product print link for same-cart application proof.",
      candidateOfferCodes.length > 0
        ? `Apply candidate coupon code(s) ${candidateOfferCodes.join(", ")} in the same provider portal cart during pricing collection.`
        : "Record that no active source-listed coupon code is available for this provider before ranking.",
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
