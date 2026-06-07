import type { VendorId } from "./freeMvp";

export type RetailPrinterVendorId = Extract<VendorId, "walgreens" | "cvs" | "fedex" | "walmart">;
export type RetailPrinterOperationKind = "fetch-price" | "upload-image" | "place-order";
export type RetailPrinterOperationStatus = "blocked";
export type RetailPrinterSourceLinkPurpose = "product" | RetailPrinterOperationKind;
export type RetailPrinterEntrypointEvidenceMode =
  | "public-product-price-review"
  | "provider-project-preview-review"
  | "provider-cart-final-review";
export type RetailPrinterEntrypointCouponMode =
  | "apply-during-price-collection"
  | "preserve-price-collection-coupon-state"
  | "final-cart-coupon-recheck";
export type RetailPrinterOperationFieldSource =
  | "customer-approval"
  | "operator"
  | "payment-processor"
  | "pricing-observation"
  | "provider-account"
  | "provider-portal"
  | "render-packet";
export type RetailPrinterFulfillmentMode = "pickup" | "shipping";
export type RetailPrinterCouponProof = "same-cart-provider-portal";
export type RetailPrinterUploadArtifactKind = "combined-pdf-proof" | "svg-panel-set" | "print-ready-image-files";
export type RetailPrinterProviderAccountMode =
  | "customer-account-required"
  | "guest-or-customer-account"
  | "operator-reviewed-provider-session";

export interface RetailPrinterSourceLink {
  purpose: RetailPrinterSourceLinkPurpose;
  label: string;
  url: string;
  sourceKind: "retailer-product-page";
}

export interface RetailPrinterOperationContract {
  kind: RetailPrinterOperationKind;
  label: string;
  status: RetailPrinterOperationStatus;
  sourceUrl: string;
  providerEntrypoint: RetailPrinterProviderOperationEntrypoint;
  noNetwork: true;
  preparesRequest: false;
  requiredEvidence: string[];
  certificationGateIds: string[];
  requestBlueprint: RetailPrinterOperationRequestBlueprint;
  blockedReason: string;
}

export interface RetailPrinterOperationRequestBlueprint {
  transport: "future-certified-api-or-reviewed-browser-session";
  requestFields: RetailPrinterOperationRequestField[];
  responseEvidence: string[];
  forbiddenFields: string[];
  successCriteria: string[];
}

export interface RetailPrinterOperationRequestField {
  name: string;
  label: string;
  source: RetailPrinterOperationFieldSource;
  required: boolean;
  pii: boolean;
}

export interface RetailPrinterAdapterContract {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  vendorName: string;
  productName: string;
  productSku: string;
  productUrl: string;
  pricingObservationId: string;
  uploadAssetExpectation: string;
  operationPolicy: RetailPrinterVendorOperationPolicy;
  providerEntrypoints: RetailPrinterProviderOperationEntrypoint[];
  sourceLinks: RetailPrinterSourceLink[];
  checkoutMode: "vendor-browser-session";
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  operations: RetailPrinterOperationContract[];
}

export interface RetailPrinterVendorOperationPolicy {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  productUrl: string;
  productSku: string;
  portalHost: string;
  productIdentityTokens: string[];
  price: RetailPrinterPriceOperationPolicy;
  upload: RetailPrinterUploadOperationPolicy;
  order: RetailPrinterOrderOperationPolicy;
}

export interface RetailPrinterPriceOperationPolicy {
  kind: "fetch-price";
  minimumQuantity: number;
  quantityIncrement: number;
  supportedFulfillmentModes: RetailPrinterFulfillmentMode[];
  couponProof: RetailPrinterCouponProof;
  requiredEvidenceFields: string[];
}

export interface RetailPrinterUploadOperationPolicy {
  kind: "upload-image";
  acceptedArtifactKinds: RetailPrinterUploadArtifactKind[];
  providerAccountMode: RetailPrinterProviderAccountMode;
  preflightChecks: string[];
  previewEvidenceFields: string[];
}

export interface RetailPrinterOrderOperationPolicy {
  kind: "place-order";
  requiredApprovalFields: string[];
  prohibitedUntilEvidence: string[];
  recoveryEvidenceFields: string[];
}

export type RetailPrinterOperationPolicy =
  | RetailPrinterPriceOperationPolicy
  | RetailPrinterUploadOperationPolicy
  | RetailPrinterOrderOperationPolicy;

export interface RetailPrinterProviderOperationEntrypoint {
  operation: RetailPrinterOperationKind;
  label: string;
  url: string;
  portalHost: string;
  productSku: string;
  productIdentityTokens: string[];
  publicEvidence: RetailPrinterProviderOperationEvidence;
  evidenceMode: RetailPrinterEntrypointEvidenceMode;
  couponMode: RetailPrinterEntrypointCouponMode;
  requiresCustomerApproval: true;
  noNetwork: true;
  requestPreparationBlocked: true;
  orderSubmissionBlocked: true;
}

export interface RetailPrinterProviderOperationEvidence {
  observedAtIso: string;
  sourceTitle: string;
  pageSignals: string[];
  requiredOperatorProof: string[];
}

export interface RetailPrinterProductLinkContract {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  vendorName: string;
  productName: string;
  productSku: string;
  productUrl: string;
  pricingObservationId: string;
  requiredUrlTokens: string[];
  operationEvidence: Record<RetailPrinterOperationKind, RetailPrinterProviderOperationEvidence>;
}

export interface RetailPrinterCertificationPacket {
  packetId: string;
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  operation: RetailPrinterOperationKind;
  providerPortalUrl: string;
  productUrl: string;
  productSku: string;
  pricingObservationId: string;
  publicEvidence: RetailPrinterProviderOperationEvidence;
  status: "certification-evidence-required";
  requiredGateIds: string[];
  requiredEvidenceArtifacts: string[];
  requiredProviderEvidence: string[];
  operatorEvidenceFields: string[];
  blockedLiveOperationFields: string[];
  liveEnablementChecks: string[];
  canEnableLiveOperation: false;
}

export const retailPrinterRequiredVendorIds = ["walmart", "fedex", "cvs", "walgreens"] satisfies RetailPrinterVendorId[];
export const retailPrinterOperationKinds = ["fetch-price", "upload-image", "place-order"] satisfies RetailPrinterOperationKind[];

const vendorEvidence = {
  price: [
    "Official current price extraction",
    "Tax and coupon portal application proof",
    "Store availability or shipping-window proof"
  ],
  upload: ["Vendor upload API or certified browser automation contract", "Asset-size acceptance proof", "Crop/fold preview screenshot"],
  order: ["Vendor certification", "Explicit customer approval record", "Payment and cancellation recovery proof"]
};

const sharedForbiddenFields = ["raw relationship memories", "raw payment card data", "unapproved recipient PII"];
const sharedGateIds = ["vendor-certification", "real-order-kill-switch", "customer-approval"];
const retailPrinterLinkObservedAtIso = "2026-06-07T12:00:00.000Z";

export const retailPrinterProductLinks: Record<RetailPrinterVendorId, RetailPrinterProductLinkContract> = {
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
    operationEvidence: {
      "fetch-price": operationEvidence(
        "Photo Upload 5x7 Folded Card, Blank Envelope | Walmart Photo",
        [
          "Photo Upload 5x7 Folded Card",
          "$0.56",
          "361-5x7-folded-card-blank-envelope",
          "selected_delivery_options=2"
        ],
        ["current unit price", "selected pickup store or ZIP", "tax and coupon status"]
      ),
      "upload-image": operationEvidence(
        "Photo Upload 5x7 Folded Card, Blank Envelope | Walmart Photo",
        ["Upload Photos", "design_code=standard.custom", "wmcards-WMT.themepack%3Awmt_custom_5x7.card"],
        ["approved print-ready files accepted", "provider preview screenshot", "fold and crop state"]
      ),
      "place-order": operationEvidence(
        "Photo Upload 5x7 Folded Card, Blank Envelope | Walmart Photo",
        ["Photo Cart", "Sign In", "selected_delivery_options=2"],
        ["provider cart id", "final pickup commitment", "customer final approval before order"]
      )
    }
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
    operationEvidence: {
      "fetch-price": operationEvidence(
        "Quick Greeting & Holiday Cards | Quick Print & Pickup | FedEx Office",
        ["Quick Greeting & Holiday Cards", "5\" x 7\" flat card", "Ready same day or within 24 hours", "in-store pickup"],
        ["current package price", "pickup or shipping path", "production window"]
      ),
      "upload-image": operationEvidence(
        "Quick Greeting & Holiday Cards | Quick Print & Pickup | FedEx Office",
        ["Upload your design", ".PDF", ".JPG", "Upload a File", "one file per side"],
        ["front/back file mapping", "file acceptance result", "provider preview screenshot"]
      ),
      "place-order": operationEvidence(
        "Quick Greeting & Holiday Cards | Quick Print & Pickup | FedEx Office",
        ["paid for", "Production Time + Shipping", "1-3 business days", "same day"],
        ["provider cart id", "payment authorization reference", "pickup or shipping commitment"]
      )
    }
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
    operationEvidence: {
      "fetch-price": operationEvidence(
        "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        ["Folded Greeting Card, 5x7", "8.98", "CommerceProduct_26126", "productCategory=Card%20%26%20Stationery"],
        ["current subtotal", "pickup availability", "coupon and tax status"]
      ),
      "upload-image": operationEvidence(
        "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        ["Folded Greeting Card, 5x7", "CommerceProduct_26126", "dgview", "Cards & Stationery"],
        ["provider project reference", "provider preview screenshot", "crop and fold state"]
      ),
      "place-order": operationEvidence(
        "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        ["CommerceProduct_26126", "JUNESW", "8.98"],
        ["provider cart id", "same-cart coupon recheck", "customer final approval before order"]
      )
    }
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
    operationEvidence: {
      "fetch-price": operationEvidence(
        "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
        ["5x7 Folded Cards", "3.49", "CommerceProduct_33272", "productCategory=Card%20%26%20Stationery"],
        ["current subtotal", "logged-in pickup availability", "coupon and tax status"]
      ),
      "upload-image": operationEvidence(
        "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
        ["Upload Your Design", "CommerceProduct_33272", "dgview", "Cards & Stationery"],
        ["provider project reference", "provider preview screenshot", "crop and fold state"]
      ),
      "place-order": operationEvidence(
        "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
        ["CommerceProduct_33272", "CRISPCARD", "3.49"],
        ["provider cart id", "same-cart coupon recheck", "customer final approval before order"]
      )
    }
  }
};

function operationEvidence(
  sourceTitle: string,
  pageSignals: string[],
  requiredOperatorProof: string[]
): RetailPrinterProviderOperationEvidence {
  return {
    observedAtIso: retailPrinterLinkObservedAtIso,
    sourceTitle,
    pageSignals,
    requiredOperatorProof
  };
}

export const retailPrinterVendorOperationPolicies: Record<RetailPrinterVendorId, RetailPrinterVendorOperationPolicy> = {
  walmart: buildRetailPrinterVendorOperationPolicy(retailPrinterProductLinks.walmart, {
    portalHost: "photos3.walmart.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "guest-or-customer-account",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "5x7 folded-card design selected", "blank envelope product selected"]
  }),
  fedex: buildRetailPrinterVendorOperationPolicy(retailPrinterProductLinks.fedex, {
    portalHost: "www.office.fedex.com",
    minimumQuantity: 10,
    quantityIncrement: 10,
    supportedFulfillmentModes: ["pickup", "shipping"],
    providerAccountMode: "guest-or-customer-account",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "quick greeting-card product selected", "front/back print files mapped"]
  }),
  cvs: buildRetailPrinterVendorOperationPolicy(retailPrinterProductLinks.cvs, {
    portalHost: "www.cvs.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "guest-or-customer-account",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "CommerceProduct_26126 selected", "CVS Photo preview captured"]
  }),
  walgreens: buildRetailPrinterVendorOperationPolicy(retailPrinterProductLinks.walgreens, {
    portalHost: "photo.walgreens.com",
    minimumQuantity: 1,
    quantityIncrement: 1,
    supportedFulfillmentModes: ["pickup"],
    providerAccountMode: "customer-account-required",
    acceptedArtifactKinds: ["combined-pdf-proof", "svg-panel-set", "print-ready-image-files"],
    uploadPreflightChecks: ["approved render packet", "CommerceProduct_33272 selected", "Walgreens Photo preview captured"]
  })
};

export function getRetailPrinterProductLink(vendorId: RetailPrinterVendorId): RetailPrinterProductLinkContract {
  return retailPrinterProductLinks[vendorId];
}

export function getRetailPrinterProductLinkByProvider(providerAdapterId: string): RetailPrinterProductLinkContract | undefined {
  return Object.values(retailPrinterProductLinks).find((productLink) => productLink.providerAdapterId === providerAdapterId);
}

export function getRetailPrinterVendorOperationPolicy(vendorId: RetailPrinterVendorId): RetailPrinterVendorOperationPolicy {
  return retailPrinterVendorOperationPolicies[vendorId];
}

export function getRetailPrinterOperationPolicy(
  vendorId: RetailPrinterVendorId,
  operation: RetailPrinterOperationKind
): RetailPrinterOperationPolicy {
  const policy = getRetailPrinterVendorOperationPolicy(vendorId);
  if (operation === "fetch-price") return policy.price;
  if (operation === "upload-image") return policy.upload;
  return policy.order;
}

export function buildRetailPrinterAdapterContract(
  productLink: RetailPrinterProductLinkContract,
  uploadAssetExpectation: string
): RetailPrinterAdapterContract {
  const operationPolicy = getRetailPrinterVendorOperationPolicy(productLink.vendorId);
  const providerEntrypoints = buildProviderEntrypoints(productLink, operationPolicy.portalHost);
  return {
    vendorId: productLink.vendorId,
    providerAdapterId: productLink.providerAdapterId,
    vendorName: productLink.vendorName,
    productName: productLink.productName,
    productSku: productLink.productSku,
    productUrl: productLink.productUrl,
    pricingObservationId: productLink.pricingObservationId,
    uploadAssetExpectation,
    operationPolicy,
    providerEntrypoints,
    sourceLinks: buildSourceLinks(productLink, providerEntrypoints),
    checkoutMode: "vendor-browser-session",
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    operations: buildOperations(productLink, providerEntrypoints)
  };
}

export function validateRetailPrinterProductUrl(adapter: RetailPrinterAdapterContract): string[] {
  const issues: string[] = [];
  const productLink = getRetailPrinterProductLink(adapter.vendorId);

  if (isPlaceholderRetailProductUrl(adapter.productUrl)) {
    issues.push(`${adapter.vendorId} adapter product URL must not be placeholder, demo, localhost, or example content.`);
  }

  if (adapter.providerAdapterId !== productLink.providerAdapterId) {
    issues.push(`${adapter.vendorId} adapter must use provider adapter id ${productLink.providerAdapterId}.`);
  }
  if (adapter.productUrl !== productLink.productUrl) {
    issues.push(`${adapter.vendorId} adapter must use the exact supplied ${productLink.vendorName} product URL.`);
  }
  for (const token of productLink.requiredUrlTokens) {
    if (!adapter.productUrl.includes(token)) {
      issues.push(`${adapter.vendorId} adapter product URL is missing required product token: ${token}.`);
    }
  }

  return issues;
}

export function validateRetailPrinterOperationPolicy(adapter: RetailPrinterAdapterContract): string[] {
  const issues: string[] = [];
  const policy = adapter.operationPolicy;
  const productLink = getRetailPrinterProductLink(adapter.vendorId);

  if (!policy) return [`${adapter.vendorId} adapter must expose a provider-specific operation policy.`];
  if (policy.vendorId !== adapter.vendorId) issues.push(`${adapter.vendorId} operation policy vendor id must match adapter.`);
  if (policy.providerAdapterId !== adapter.providerAdapterId) {
    issues.push(`${adapter.vendorId} operation policy provider adapter id must match adapter.`);
  }
  if (policy.productUrl !== adapter.productUrl) issues.push(`${adapter.vendorId} operation policy must use adapter product URL.`);
  if (policy.productSku !== adapter.productSku) issues.push(`${adapter.vendorId} operation policy must use adapter product SKU.`);
  if (!policy.portalHost || !adapter.productUrl.includes(policy.portalHost)) {
    issues.push(`${adapter.vendorId} operation policy portal host must match product URL.`);
  }
  for (const token of productLink.requiredUrlTokens) {
    if (!policy.productIdentityTokens.includes(token)) {
      issues.push(`${adapter.vendorId} operation policy is missing product identity token: ${token}.`);
    }
  }
  if (policy.price.minimumQuantity < 1) issues.push(`${adapter.vendorId} price policy must require a positive minimum quantity.`);
  if (policy.price.quantityIncrement < 1) issues.push(`${adapter.vendorId} price policy must require a positive quantity increment.`);
  if (policy.price.supportedFulfillmentModes.length === 0) {
    issues.push(`${adapter.vendorId} price policy must name supported fulfillment modes.`);
  }
  if (policy.price.couponProof !== "same-cart-provider-portal") {
    issues.push(`${adapter.vendorId} price policy must require same-cart provider portal coupon proof.`);
  }
  for (const evidenceField of ["subtotal", "taxStatus", "pickupOrShippingWindow"]) {
    if (!policy.price.requiredEvidenceFields.includes(evidenceField)) {
      issues.push(`${adapter.vendorId} price policy must require ${evidenceField} evidence.`);
    }
  }
  for (const artifactKind of ["combined-pdf-proof", "svg-panel-set"] satisfies RetailPrinterUploadArtifactKind[]) {
    if (!policy.upload.acceptedArtifactKinds.includes(artifactKind)) {
      issues.push(`${adapter.vendorId} upload policy must accept ${artifactKind}.`);
    }
  }
  for (const evidenceField of ["providerPreviewScreenshot", "cropFoldState"]) {
    if (!policy.upload.previewEvidenceFields.includes(evidenceField)) {
      issues.push(`${adapter.vendorId} upload policy must require ${evidenceField}.`);
    }
  }
  for (const approvalField of ["customerApprovalId", "quoteEvidenceId"]) {
    if (!policy.order.requiredApprovalFields.includes(approvalField)) {
      issues.push(`${adapter.vendorId} order policy must require ${approvalField}.`);
    }
  }
  for (const recoveryField of ["cancellationRecoveryPlanId", "wrongStoreRecoveryPlanId"]) {
    if (!policy.order.recoveryEvidenceFields.includes(recoveryField)) {
      issues.push(`${adapter.vendorId} order policy must require ${recoveryField}.`);
    }
  }

  return issues;
}

export function validateRetailPrinterProviderEntrypoints(adapter: RetailPrinterAdapterContract): string[] {
  const issues: string[] = [];
  const productLink = getRetailPrinterProductLink(adapter.vendorId);
  const expectedModes: Record<RetailPrinterOperationKind, RetailPrinterEntrypointEvidenceMode> = {
    "fetch-price": "public-product-price-review",
    "upload-image": "provider-project-preview-review",
    "place-order": "provider-cart-final-review"
  };
  const expectedCouponModes: Record<RetailPrinterOperationKind, RetailPrinterEntrypointCouponMode> = {
    "fetch-price": "apply-during-price-collection",
    "upload-image": "preserve-price-collection-coupon-state",
    "place-order": "final-cart-coupon-recheck"
  };

  for (const kind of retailPrinterOperationKinds) {
    const entrypoint = adapter.providerEntrypoints.find((candidate) => candidate.operation === kind);
    const operation = adapter.operations.find((candidate) => candidate.kind === kind);
    if (!entrypoint) {
      issues.push(`${adapter.vendorId} adapter must expose provider entrypoint: ${kind}.`);
      continue;
    }
    if (entrypoint.url !== adapter.productUrl) issues.push(`${adapter.vendorId} ${kind} entrypoint must use adapter product URL.`);
    if (entrypoint.productSku !== adapter.productSku) issues.push(`${adapter.vendorId} ${kind} entrypoint must use adapter product SKU.`);
    if (!entrypoint.url.includes(entrypoint.portalHost) || entrypoint.portalHost !== adapter.operationPolicy.portalHost) {
      issues.push(`${adapter.vendorId} ${kind} entrypoint portal host must match the provider product URL.`);
    }
    issues.push(...validateRetailPrinterProviderOperationEvidence(adapter.vendorId, kind, entrypoint.publicEvidence, productLink.operationEvidence[kind]));
    for (const token of productLink.requiredUrlTokens) {
      if (!entrypoint.productIdentityTokens.includes(token)) {
        issues.push(`${adapter.vendorId} ${kind} entrypoint is missing product identity token: ${token}.`);
      }
    }
    if (entrypoint.evidenceMode !== expectedModes[kind]) {
      issues.push(`${adapter.vendorId} ${kind} entrypoint must use evidence mode ${expectedModes[kind]}.`);
    }
    if (entrypoint.couponMode !== expectedCouponModes[kind]) {
      issues.push(`${adapter.vendorId} ${kind} entrypoint must use coupon mode ${expectedCouponModes[kind]}.`);
    }
    if (!entrypoint.requiresCustomerApproval || !entrypoint.noNetwork || !entrypoint.requestPreparationBlocked) {
      issues.push(`${adapter.vendorId} ${kind} entrypoint must require approval and stay no-network/request-blocked.`);
    }
    if (!entrypoint.orderSubmissionBlocked) {
      issues.push(`${adapter.vendorId} ${kind} entrypoint must keep order submission blocked.`);
    }
    if (operation && operation.providerEntrypoint !== entrypoint) {
      issues.push(`${adapter.vendorId} ${kind} operation must reference the adapter provider entrypoint.`);
    }
    if (operation && operation.sourceUrl !== entrypoint.url) {
      issues.push(`${adapter.vendorId} ${kind} operation source URL must match provider entrypoint URL.`);
    }
  }

  return issues;
}

export function validateRetailPrinterProviderOperationEvidence(
  vendorId: RetailPrinterVendorId,
  operation: RetailPrinterOperationKind,
  evidence: RetailPrinterProviderOperationEvidence | undefined,
  expectedEvidence?: RetailPrinterProviderOperationEvidence
): string[] {
  const issues: string[] = [];
  if (!evidence) return [`${vendorId} ${operation} entrypoint must include public page evidence.`];
  if (expectedEvidence && evidence !== expectedEvidence) {
    issues.push(`${vendorId} ${operation} entrypoint must use the registered public page evidence object.`);
  }
  if (typeof evidence.observedAtIso !== "string" || Number.isNaN(new Date(evidence.observedAtIso).getTime())) {
    issues.push(`${vendorId} ${operation} public evidence must include a valid observedAtIso timestamp.`);
  }
  if (typeof evidence.sourceTitle !== "string" || !evidence.sourceTitle.trim()) {
    issues.push(`${vendorId} ${operation} public evidence must include a source title.`);
  }
  if (!Array.isArray(evidence.pageSignals) || evidence.pageSignals.length < 3) {
    issues.push(`${vendorId} ${operation} public evidence must include at least three page signals.`);
  }
  if (!Array.isArray(evidence.requiredOperatorProof) || evidence.requiredOperatorProof.length < 3) {
    issues.push(`${vendorId} ${operation} public evidence must include at least three required operator proof fields.`);
  }
  for (const signal of evidence.pageSignals ?? []) {
    if (typeof signal !== "string" || !signal.trim()) {
      issues.push(`${vendorId} ${operation} public evidence page signals must be non-empty strings.`);
    }
    if (isPlaceholderRetailProductUrl(signal)) {
      issues.push(`${vendorId} ${operation} public evidence must not include placeholder-like page signals.`);
    }
  }
  for (const proof of evidence.requiredOperatorProof ?? []) {
    if (typeof proof !== "string" || !proof.trim()) {
      issues.push(`${vendorId} ${operation} public evidence proof fields must be non-empty strings.`);
    }
  }
  return issues;
}

export function validateRetailPrinterOperationBlueprint(
  vendorId: RetailPrinterVendorId,
  operation: RetailPrinterOperationContract
): string[] {
  const issues: string[] = [];
  if (!operation.certificationGateIds.includes("vendor-certification")) {
    issues.push(`${vendorId} ${operation.kind} operation must require vendor certification.`);
  }
  if (!operation.certificationGateIds.includes("real-order-kill-switch")) {
    issues.push(`${vendorId} ${operation.kind} operation must require real-order kill-switch evidence.`);
  }
  if (!operation.certificationGateIds.includes("customer-approval")) {
    issues.push(`${vendorId} ${operation.kind} operation must require customer approval.`);
  }
  if (operation.kind === "place-order") {
    for (const gateId of ["payment-certification", "cancellation-recovery", "physical-print-qa"]) {
      if (!operation.certificationGateIds.includes(gateId)) issues.push(`${vendorId} place-order operation must require ${gateId}.`);
    }
  }
  if (operation.requestBlueprint.transport !== "future-certified-api-or-reviewed-browser-session") {
    issues.push(`${vendorId} ${operation.kind} operation must use the future certified transport blueprint.`);
  }
  if (operation.requestBlueprint.requestFields.length < 4) {
    issues.push(`${vendorId} ${operation.kind} operation must define request fields.`);
  }
  const optionalFields = operation.requestBlueprint.requestFields.filter((field) => !field.required);
  const invalidOptionalFields = optionalFields.filter((field) => operation.kind !== "fetch-price" || field.name !== "couponCode");
  if (invalidOptionalFields.length > 0) {
    issues.push(
      `${vendorId} ${operation.kind} operation has unsupported optional request fields: ${invalidOptionalFields
        .map((field) => field.name)
        .join(", ")}.`
    );
  }
  if (operation.requestBlueprint.responseEvidence.length < 3) {
    issues.push(`${vendorId} ${operation.kind} operation must define response evidence.`);
  }
  for (const forbiddenField of sharedForbiddenFields) {
    if (!operation.requestBlueprint.forbiddenFields.includes(forbiddenField)) {
      issues.push(`${vendorId} ${operation.kind} operation must forbid ${forbiddenField}.`);
    }
  }
  if (operation.requestBlueprint.successCriteria.length < 2) {
    issues.push(`${vendorId} ${operation.kind} operation must define success criteria.`);
  }
  return issues;
}

export function buildRetailPrinterCertificationPacket(
  adapter: RetailPrinterAdapterContract,
  operation: RetailPrinterOperationContract,
  sourceLink: RetailPrinterSourceLink
): RetailPrinterCertificationPacket {
  return {
    packetId: `${adapter.vendorId}-${operation.kind}-certification-packet`,
    vendorId: adapter.vendorId,
    providerAdapterId: adapter.providerAdapterId,
    operation: operation.kind,
    providerPortalUrl: sourceLink.url,
    productUrl: adapter.productUrl,
    productSku: adapter.productSku,
    pricingObservationId: adapter.pricingObservationId,
    publicEvidence: operation.providerEntrypoint.publicEvidence,
    status: "certification-evidence-required",
    requiredGateIds: operation.certificationGateIds,
    requiredEvidenceArtifacts: operation.requiredEvidence,
    requiredProviderEvidence: operation.requestBlueprint.responseEvidence,
    operatorEvidenceFields: operation.requestBlueprint.requestFields
      .filter((field) => field.source !== "pricing-observation" && field.source !== "render-packet")
      .map((field) => field.name),
    blockedLiveOperationFields: [
      "network request from CustomCard",
      "provider API payload preparation",
      ...operation.requestBlueprint.forbiddenFields
    ],
    liveEnablementChecks: [
      `Exact provider portal URL remains ${sourceLink.url}.`,
      "Vendor certification artifacts are attached to this packet.",
      "Real-order kill switch policy is proven before enabling live execution.",
      "Customer approval, payment, and recovery evidence are linked before any live order step."
    ],
    canEnableLiveOperation: false
  };
}

export function isPlaceholderRetailProductUrl(url: string): boolean {
  const normalized = safeDecodeUrlText(url).toLowerCase();
  if (/\b(example\.com|localhost|127\.0\.0\.1|placeholder|dummy|todo|mock)\b/.test(normalized)) return true;
  return /(^|[/?#&=._-])demo($|[/?#&=._-])/.test(normalized);
}

function buildSourceLinks(
  productLink: RetailPrinterProductLinkContract,
  providerEntrypoints: RetailPrinterProviderOperationEntrypoint[]
): RetailPrinterSourceLink[] {
  return [
    {
      purpose: "product",
      label: `${productLink.vendorName} product page`,
      url: productLink.productUrl,
      sourceKind: "retailer-product-page"
    },
    ...providerEntrypoints.map((entrypoint) => ({
      purpose: entrypoint.operation,
      label: entrypoint.label,
      url: entrypoint.url,
      sourceKind: "retailer-product-page" as const
    }))
  ];
}

function buildOperations(
  productLink: RetailPrinterProductLinkContract,
  providerEntrypoints: RetailPrinterProviderOperationEntrypoint[]
): RetailPrinterOperationContract[] {
  const getEntrypoint = (kind: RetailPrinterOperationKind) => {
    const entrypoint = providerEntrypoints.find((candidate) => candidate.operation === kind);
    if (!entrypoint) throw new Error(`Missing retail printer provider entrypoint: ${productLink.vendorId} ${kind}`);
    return entrypoint;
  };

  return [
    {
      kind: "fetch-price",
      label: `Fetch ${productLink.vendorName} price`,
      status: "blocked",
      sourceUrl: productLink.productUrl,
      providerEntrypoint: getEntrypoint("fetch-price"),
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.price,
      certificationGateIds: sharedGateIds,
      requestBlueprint: buildPriceBlueprint(),
      blockedReason: "Only review-only public price observations are available; no certified live quote endpoint is configured."
    },
    {
      kind: "upload-image",
      label: `Upload image to ${productLink.vendorName}`,
      status: "blocked",
      sourceUrl: productLink.productUrl,
      providerEntrypoint: getEntrypoint("upload-image"),
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.upload,
      certificationGateIds: sharedGateIds,
      requestBlueprint: buildUploadBlueprint(),
      blockedReason: "Image upload requires vendor certification plus a certified API or reviewed browser-session automation contract."
    },
    {
      kind: "place-order",
      label: `Place ${productLink.vendorName} order`,
      status: "blocked",
      sourceUrl: productLink.productUrl,
      providerEntrypoint: getEntrypoint("place-order"),
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.order,
      certificationGateIds: [...sharedGateIds, "payment-certification", "cancellation-recovery", "physical-print-qa"],
      requestBlueprint: buildOrderBlueprint(),
      blockedReason: "Order placement remains disabled until vendor certification, payment, recovery, and kill-switch gates are proven."
    }
  ];
}

function buildProviderEntrypoints(
  productLink: RetailPrinterProductLinkContract,
  portalHost: string
): RetailPrinterProviderOperationEntrypoint[] {
  return [
    {
      operation: "fetch-price",
      label: `${productLink.vendorName} price collection entrypoint`,
      url: productLink.productUrl,
      portalHost,
      productSku: productLink.productSku,
      productIdentityTokens: productLink.requiredUrlTokens,
      publicEvidence: productLink.operationEvidence["fetch-price"],
      evidenceMode: "public-product-price-review",
      couponMode: "apply-during-price-collection",
      requiresCustomerApproval: true,
      noNetwork: true,
      requestPreparationBlocked: true,
      orderSubmissionBlocked: true
    },
    {
      operation: "upload-image",
      label: `${productLink.vendorName} upload preview entrypoint`,
      url: productLink.productUrl,
      portalHost,
      productSku: productLink.productSku,
      productIdentityTokens: productLink.requiredUrlTokens,
      publicEvidence: productLink.operationEvidence["upload-image"],
      evidenceMode: "provider-project-preview-review",
      couponMode: "preserve-price-collection-coupon-state",
      requiresCustomerApproval: true,
      noNetwork: true,
      requestPreparationBlocked: true,
      orderSubmissionBlocked: true
    },
    {
      operation: "place-order",
      label: `${productLink.vendorName} final cart review entrypoint`,
      url: productLink.productUrl,
      portalHost,
      productSku: productLink.productSku,
      productIdentityTokens: productLink.requiredUrlTokens,
      publicEvidence: productLink.operationEvidence["place-order"],
      evidenceMode: "provider-cart-final-review",
      couponMode: "final-cart-coupon-recheck",
      requiresCustomerApproval: true,
      noNetwork: true,
      requestPreparationBlocked: true,
      orderSubmissionBlocked: true
    }
  ];
}

function buildPriceBlueprint(): RetailPrinterOperationRequestBlueprint {
  return {
    transport: "future-certified-api-or-reviewed-browser-session",
    requestFields: [
      requestField("productUrl", "Persisted vendor product URL", "pricing-observation", false),
      requestField("productSku", "Vendor product SKU or design code", "pricing-observation", false),
      requestField("quantity", "Customer selected quantity", "customer-approval", false),
      requestField("fulfillmentMode", "Pickup or shipping path", "customer-approval", false),
      requestField("storeOrShippingZip", "Store identifier or shipping ZIP", "customer-approval", true),
      requestField("couponCode", "Candidate coupon code for portal proof", "operator", false, false)
    ],
    responseEvidence: [
      "Quoted subtotal",
      "Tax estimate or tax blocked reason",
      "Coupon application status",
      "Pickup or shipping window"
    ],
    forbiddenFields: sharedForbiddenFields,
    successCriteria: [
      "Quote evidence matches the persisted product URL and SKU",
      "No payment or order submission occurs while fetching price"
    ]
  };
}

function buildUploadBlueprint(): RetailPrinterOperationRequestBlueprint {
  return {
    transport: "future-certified-api-or-reviewed-browser-session",
    requestFields: [
      requestField("renderPacketArtifactUris", "Approved render packet artifact URIs", "render-packet", false),
      requestField("panelManifestChecksum", "Render manifest checksum", "render-packet", false),
      requestField("productSku", "Vendor product SKU or design code", "pricing-observation", false),
      requestField("customerApprovalId", "Explicit customer approval record", "customer-approval", false),
      requestField("providerAccountReference", "Provider account or guest session reference", "provider-account", true)
    ],
    responseEvidence: [
      "Vendor preview screenshot",
      "Asset acceptance result",
      "Crop/fold preview state",
      "Provider project or cart reference without order submission"
    ],
    forbiddenFields: sharedForbiddenFields,
    successCriteria: [
      "Preview shows the intended 5x7 panels",
      "No raw memory text leaves the system",
      "No provider project is advanced to payment without customer approval"
    ]
  };
}

function buildOrderBlueprint(): RetailPrinterOperationRequestBlueprint {
  return {
    transport: "future-certified-api-or-reviewed-browser-session",
    requestFields: [
      requestField("providerCartId", "Provider cart or project identifier", "provider-portal", true),
      requestField("quoteEvidenceId", "Matching live quote evidence identifier", "pricing-observation", false),
      requestField("paymentAuthorizationReference", "Tokenized payment authorization reference", "payment-processor", true),
      requestField("customerApprovalId", "Explicit customer final approval record", "customer-approval", false),
      requestField("cancellationRecoveryPlanId", "Cancellation and wrong-store recovery proof", "operator", false)
    ],
    responseEvidence: [
      "Provider order confirmation",
      "Pickup or shipping commitment",
      "Cancellation/refund policy snapshot",
      "Audit event IDs for approval, payment, and order submission"
    ],
    forbiddenFields: sharedForbiddenFields,
    successCriteria: [
      "Order confirmation references the approved cart and quote evidence",
      "Payment capture, cancellation, and recovery audit events are persisted"
    ]
  };
}

interface RetailPrinterVendorPolicyOptions {
  portalHost: string;
  minimumQuantity: number;
  quantityIncrement: number;
  supportedFulfillmentModes: RetailPrinterFulfillmentMode[];
  providerAccountMode: RetailPrinterProviderAccountMode;
  acceptedArtifactKinds: RetailPrinterUploadArtifactKind[];
  uploadPreflightChecks: string[];
}

function buildRetailPrinterVendorOperationPolicy(
  productLink: RetailPrinterProductLinkContract,
  options: RetailPrinterVendorPolicyOptions
): RetailPrinterVendorOperationPolicy {
  return {
    vendorId: productLink.vendorId,
    providerAdapterId: productLink.providerAdapterId,
    productUrl: productLink.productUrl,
    productSku: productLink.productSku,
    portalHost: options.portalHost,
    productIdentityTokens: productLink.requiredUrlTokens,
    price: {
      kind: "fetch-price",
      minimumQuantity: options.minimumQuantity,
      quantityIncrement: options.quantityIncrement,
      supportedFulfillmentModes: options.supportedFulfillmentModes,
      couponProof: "same-cart-provider-portal",
      requiredEvidenceFields: ["subtotal", "taxStatus", "couponApplicationStatus", "pickupOrShippingWindow"]
    },
    upload: {
      kind: "upload-image",
      acceptedArtifactKinds: options.acceptedArtifactKinds,
      providerAccountMode: options.providerAccountMode,
      preflightChecks: options.uploadPreflightChecks,
      previewEvidenceFields: ["providerPreviewScreenshot", "assetAcceptanceResult", "cropFoldState"]
    },
    order: {
      kind: "place-order",
      requiredApprovalFields: ["customerApprovalId", "quoteEvidenceId", "paymentAuthorizationReference"],
      prohibitedUntilEvidence: ["vendorCertification", "physicalPrintQa", "realOrderKillSwitch", "customerFinalApproval"],
      recoveryEvidenceFields: ["cancellationRecoveryPlanId", "wrongStoreRecoveryPlanId"]
    }
  };
}

function requestField(
  name: string,
  label: string,
  source: RetailPrinterOperationFieldSource,
  pii: boolean,
  required = true
): RetailPrinterOperationRequestField {
  return { name, label, source, required, pii };
}

function safeDecodeUrlText(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}
