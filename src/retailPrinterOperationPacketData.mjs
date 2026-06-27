import { retailPrinterRegistryLinkObservedAtIso as observedAtIso } from "./retailPrinterRegistryData.mjs";

export const retailPrinterSharedForbiddenFields = [
  "raw relationship memories",
  "raw payment card data",
  "unapproved recipient PII"
];

export const retailPrinterSharedGateIds = ["vendor-certification", "real-order-kill-switch", "customer-approval"];

export const retailPrinterOperationProfiles = {
  "fetch-price": {
    label: "Fetch price",
    requiredInputFields: ["storeOrShippingZip"],
    optionalInputFields: ["productUrl", "productSku", "quantity", "fulfillmentMode", "couponCode"],
    sourceBackedFields: ["productUrl", "productSku"],
    evidenceMode: "public-product-price-review",
    couponMode: "same-cart-provider-portal-proof",
    providerEntrypointCouponMode: "apply-during-price-collection",
    requiredEvidence: [
      "Official product page price evidence",
      "Tax and coupon portal application proof",
      "Store availability or shipping-window proof"
    ],
    adapterRequiredEvidence: [
      "Official current price extraction",
      "Tax and coupon portal application proof",
      "Store availability or shipping-window proof"
    ],
    requiredGateIds: ["provider-coupon-portal-proof", "retail-price-freshness-proof", "vendor-certification"],
    adapterCertificationGateIds: retailPrinterSharedGateIds,
    blockedReason: "Live quote collection remains blocked until provider portal coupon proof and certification are attached.",
    adapterBlockedReason: "Only review-only public price observations are available; no certified live quote endpoint is configured."
  },
  "upload-image": {
    label: "Upload image",
    requiredInputFields: ["providerAccountReference"],
    optionalInputFields: ["renderPacketArtifactUris", "panelManifestChecksum", "productSku", "customerApprovalId"],
    sourceBackedFields: ["productSku"],
    evidenceMode: "provider-project-preview-review",
    couponMode: "preserve-price-cart-coupon-state",
    providerEntrypointCouponMode: "preserve-price-collection-coupon-state",
    requiredEvidence: [
      "Vendor upload API or certified browser automation contract",
      "Asset-size acceptance proof",
      "Crop/fold preview screenshot"
    ],
    adapterRequiredEvidence: [
      "Vendor upload API or certified browser automation contract",
      "Asset-size acceptance proof",
      "Crop/fold preview screenshot"
    ],
    requiredGateIds: ["vendor-certification", "asset-upload-proof", "customer-approval"],
    adapterCertificationGateIds: retailPrinterSharedGateIds,
    blockedReason: "Image upload remains blocked until a certified transport and provider preview proof exist.",
    adapterBlockedReason: "Image upload requires vendor certification plus a certified API or reviewed browser-session automation contract."
  },
  "place-order": {
    label: "Place order",
    requiredInputFields: ["providerCartId", "paymentAuthorizationReference"],
    optionalInputFields: ["quoteEvidenceId", "customerApprovalId", "cancellationRecoveryPlanId"],
    sourceBackedFields: ["quoteEvidenceId"],
    evidenceMode: "provider-cart-final-review",
    couponMode: "final-cart-coupon-recheck",
    providerEntrypointCouponMode: "final-cart-coupon-recheck",
    requiredEvidence: ["Vendor certification", "Explicit customer approval record", "Payment and cancellation recovery proof"],
    adapterRequiredEvidence: ["Vendor certification", "Explicit customer approval record", "Payment and cancellation recovery proof"],
    requiredGateIds: ["vendor-certification", "real-order-kill-switch", "customer-approval"],
    adapterCertificationGateIds: [
      ...retailPrinterSharedGateIds,
      "payment-certification",
      "cancellation-recovery",
      "physical-print-qa"
    ],
    blockedReason: "Live ordering remains blocked until certification, customer approval, tokenized payment, and recovery gates pass.",
    adapterBlockedReason: "Order placement remains disabled until vendor certification, payment, recovery, and kill-switch gates are proven."
  }
};

export function getRetailPrinterOperationProfile(operation) {
  return retailPrinterOperationProfiles[operation] ?? retailPrinterOperationProfiles["fetch-price"];
}

export function buildRetailPrinterOperationExpectedInputFields(operation) {
  const profile = getRetailPrinterOperationProfile(operation);
  return [...profile.requiredInputFields, ...profile.optionalInputFields];
}

export function buildRetailPrinterOperationPolicy(productLink, operation) {
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

export function buildRetailPrinterOperationSourceLink(productLink, operation) {
  const profile = getRetailPrinterOperationProfile(operation);
  return {
    purpose: operation,
    label: `${productLink.vendorName} ${operation}`,
    url: productLink.productUrl,
    sourceKind: "retailer-product-page",
    observedAtIso,
    evidenceMode: profile.evidenceMode
  };
}

export function buildRetailPrinterProviderOperationEntrypoint(productLink, operation) {
  const profile = getRetailPrinterOperationProfile(operation);
  return {
    operation,
    label: `${productLink.vendorName} ${operation}`,
    url: productLink.productUrl,
    portalHost: productLink.portalHost,
    productSku: productLink.productSku,
    productIdentityTokens: productLink.requiredUrlTokens,
    publicEvidence: productLink.operationEvidence?.[operation],
    evidenceMode: profile.evidenceMode,
    couponMode: profile.providerEntrypointCouponMode,
    requiresCustomerApproval: true,
    noNetwork: true,
    requestPreparationBlocked: true,
    orderSubmissionBlocked: true
  };
}

export function buildRetailPrinterOperationBlockers(operation, requiredGateIds = getRetailPrinterOperationProfile(operation).requiredGateIds) {
  if (operation === "fetch-price") {
    return uniqueStrings([...requiredGateIds, "provider-coupon-portal-proof", "retail-price-freshness-proof"]);
  }
  if (operation === "upload-image") {
    return uniqueStrings([...requiredGateIds, "asset-upload-proof", "provider-preview-proof"]);
  }
  return [...requiredGateIds];
}

export function buildRetailPrinterOperationSafetyChecks(gateIds = retailPrinterSharedGateIds) {
  return [
    "Do not send a network request from CustomCard.",
    "Do not prepare a provider API payload in app runtime.",
    "Do not upload raw relationship memories or unapproved recipient PII.",
    "Do not submit payment or place a live order until every certification gate is proven.",
    ...gateIds.map((gateId) => `Gate required: ${gateId}`)
  ];
}

function uniqueStrings(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}
