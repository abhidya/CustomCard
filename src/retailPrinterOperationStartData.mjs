import {
  retailPrinterRegistryLinkObservedAtIso as observedAtIso,
  retailPrinterRegistryOperationKinds,
  retailPrinterRegistryProductLinks
} from "./retailPrinterRegistryData.mjs";
import {
  buildSharedPrinterCouponCollectionPlan,
  getPrinterCouponCollectionContract,
  printerCouponCollectionPriority,
  printerCouponProviderFeedTargets
} from "./printerCouponPlanningData.mjs";

export const retailPrinterOperationStartRoute = "/api/retail-printers/operations/start";
export const retailPrinterOperationKinds = retailPrinterRegistryOperationKinds;
export const retailPrinterProductLinks = retailPrinterRegistryProductLinks;

const sharedForbiddenFields = ["raw relationship memories", "raw payment card data", "unapproved recipient PII"];
const sharedGateIds = ["vendor-certification", "real-order-kill-switch", "customer-approval"];

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
  const couponContract = getPrinterCouponCollectionContract(packet.vendorId);
  const expectedProviderFeedTargetIds = couponContract ? printerCouponProviderFeedTargets.map((target) => target.id) : [];
  const expectedRetailerCouponTargetIds = couponContract?.retailerCouponTargets.map((target) => target.id) ?? [];
  const expectedPrintEntrypointTargetIds = couponContract?.printEntrypointTargets.map((target) => target.id) ?? [];
  const expectedCandidateOfferCodes = productLink?.candidateOfferCodes ?? [];
  const expectedPortalApplicationPacketIds = productLink?.portalApplicationPacketIds ?? [];
  const registeredPortalApplicationPacketIds = couponContract?.portalApplicationPackets.map((portalPacket) => portalPacket.id) ?? [];
  const expectedCollectionTargetIds = [
    ...expectedProviderFeedTargetIds,
    ...expectedRetailerCouponTargetIds,
    ...expectedPrintEntrypointTargetIds
  ];

  if (!sameStringArray(plan.collectionPriority?.map((step) => step.id), printerCouponCollectionPriority.map((step) => step.id))) {
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
  if (!sameStringArray(registeredPortalApplicationPacketIds, expectedPortalApplicationPacketIds)) {
    errors.push(`Retail printer operation start packet ${packet.id} portal packet objects must match registry portal application packet ids.`);
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
  const couponCollectionPlan = buildSharedPrinterCouponCollectionPlan(productLink, {
    quantity: operation === "fetch-price" ? productLink.minimumQuantity : 1
  });

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
      acceptedArtifactKinds: productLink.acceptedArtifactKinds,
      providerAccountMode: productLink.providerAccountMode,
      preflightChecks: productLink.uploadPreflightChecks,
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
