import {
  buildRetailPrinterAdapterContract,
  buildRetailPrinterCertificationPacket,
  isPlaceholderRetailProductUrl,
  retailPrinterOperationKinds,
  retailPrinterProductLinks,
  retailPrinterRequiredVendorIds,
  validateRetailPrinterOperationBlueprint,
  validateRetailPrinterProductUrl,
  type RetailPrinterAdapterContract,
  type RetailPrinterCertificationPacket,
  type RetailPrinterFulfillmentMode,
  type RetailPrinterOperationContract,
  type RetailPrinterOperationKind,
  type RetailPrinterOperationStatus,
  type RetailPrinterSourceLink,
  type RetailPrinterSourceLinkPurpose,
  type RetailPrinterVendorId
} from "./retailPrinterContracts";

export {
  getRetailPrinterProductLink,
  getRetailPrinterProductLinkByProvider,
  retailPrinterProductLinks,
  type RetailPrinterAdapterContract,
  type RetailPrinterCertificationPacket,
  type RetailPrinterFulfillmentMode,
  type RetailPrinterOperationContract,
  type RetailPrinterOperationFieldSource,
  type RetailPrinterOperationKind,
  type RetailPrinterOperationRequestBlueprint,
  type RetailPrinterOperationRequestField,
  type RetailPrinterOperationStatus,
  type RetailPrinterProductLinkContract,
  type RetailPrinterSourceLink,
  type RetailPrinterSourceLinkPurpose,
  type RetailPrinterVendorId
} from "./retailPrinterContracts";

export interface RetailPrinterAdapterPlan {
  vendorId: RetailPrinterVendorId;
  vendorName: string;
  productName: string;
  productUrl: string;
  sourceLinks: RetailPrinterSourceLink[];
  selectedOperation: RetailPrinterOperationKind;
  operation: RetailPrinterOperationContract;
  operations: RetailPrinterOperationContract[];
  noNetwork: true;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
}

export interface RetailPrinterPriceAttemptInput {
  quantity: number;
  fulfillmentMode: RetailPrinterFulfillmentMode;
  storeOrShippingZip: string;
  couponCode?: string;
}

export interface RetailPrinterImageUploadAttemptInput {
  renderPacketArtifactUris: string[];
  panelManifestChecksum: string;
  customerApprovalId: string;
  providerAccountReference: string;
}

export interface RetailPrinterOrderAttemptInput {
  providerCartId: string;
  quoteEvidenceId: string;
  paymentAuthorizationReference: string;
  customerApprovalId: string;
  cancellationRecoveryPlanId: string;
}

export interface RetailPrinterBlockedOperationResult {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  operation: RetailPrinterOperationKind;
  status: RetailPrinterOperationStatus;
  productUrl: string;
  sourceLink: RetailPrinterSourceLink;
  networkAttempted: false;
  requestPrepared: false;
  requiredEvidence: string[];
  missingEvidence: string[];
  forbiddenFields: string[];
  requestFieldNames: string[];
  receivedFieldNames: string[];
  operationPacket: RetailPrinterOperationPacket;
  blockedReason: string;
}

export interface RetailPrinterOperationPacket {
  packetId: string;
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  operation: RetailPrinterOperationKind;
  productName: string;
  productSku: string;
  productUrl: string;
  pricingObservationId: string;
  sourceLink: RetailPrinterSourceLink;
  uploadAssetExpectation: string;
  noNetwork: true;
  networkAttempted: false;
  requestPrepared: false;
  expectedInputFields: string[];
  sourceBackedFields: string[];
  receivedInputFields: string[];
  missingInputFields: string[];
  evidenceChecklist: string[];
  operatorSteps: string[];
  safetyChecks: string[];
  forbiddenFields: string[];
  certificationPacket: RetailPrinterCertificationPacket;
}

export interface RetailPrinterOperationAdapter {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  fetchPrice(input: RetailPrinterPriceAttemptInput): RetailPrinterBlockedOperationResult;
  uploadImages(input: RetailPrinterImageUploadAttemptInput): RetailPrinterBlockedOperationResult;
  placeOrder(input: RetailPrinterOrderAttemptInput): RetailPrinterBlockedOperationResult;
}

export const retailPrinterAdapters: RetailPrinterAdapterContract[] = [
  buildRetailPrinterAdapterContract(
    retailPrinterProductLinks.walmart,
    "One or more 5x7 print-ready image/PDF assets through Walmart Photo's upload-your-design flow."
  ),
  buildRetailPrinterAdapterContract(
    retailPrinterProductLinks.fedex,
    "PDF or image files uploaded through FedEx Office quick-card setup, with double-sided files split or combined as required."
  ),
  buildRetailPrinterAdapterContract(
    retailPrinterProductLinks.cvs,
    "Images routed through CVS Photo/Snapfish project creation after the customer signs in or continues as guest where allowed."
  ),
  buildRetailPrinterAdapterContract(
    retailPrinterProductLinks.walgreens,
    "Images routed through Walgreens Photo/Snapfish project creation after customer sign-in and preview review."
  )
];

export function getRetailPrinterAdapter(vendorId: RetailPrinterVendorId): RetailPrinterAdapterContract {
  const adapter = retailPrinterAdapters.find((candidate) => candidate.vendorId === vendorId);
  if (!adapter) throw new Error(`Unknown retail printer adapter: ${vendorId}`);
  return adapter;
}

export function getRetailPrinterAdapterForProvider(providerAdapterId: string): RetailPrinterAdapterContract | undefined {
  return retailPrinterAdapters.find((adapter) => adapter.providerAdapterId === providerAdapterId);
}

export function buildRetailPrinterAdapterPlan(
  vendorId: RetailPrinterVendorId,
  selectedOperation: RetailPrinterOperationKind = "place-order"
): RetailPrinterAdapterPlan {
  const adapter = getRetailPrinterAdapter(vendorId);
  const operation = adapter.operations.find((candidate) => candidate.kind === selectedOperation) ?? adapter.operations[0];

  return {
    vendorId: adapter.vendorId,
    vendorName: adapter.vendorName,
    productName: adapter.productName,
    productUrl: adapter.productUrl,
    sourceLinks: adapter.sourceLinks,
    selectedOperation: operation.kind,
    operation,
    operations: adapter.operations,
    noNetwork: true,
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false
  };
}

export function createRetailPrinterOperationAdapter(vendorId: RetailPrinterVendorId): RetailPrinterOperationAdapter {
  const adapter = getRetailPrinterAdapter(vendorId);

  return {
    vendorId: adapter.vendorId,
    providerAdapterId: adapter.providerAdapterId,
    fetchPrice(input: RetailPrinterPriceAttemptInput) {
      return buildBlockedOperationResult(adapter, "fetch-price", input);
    },
    uploadImages(input: RetailPrinterImageUploadAttemptInput) {
      return buildBlockedOperationResult(adapter, "upload-image", input);
    },
    placeOrder(input: RetailPrinterOrderAttemptInput) {
      return buildBlockedOperationResult(adapter, "place-order", input);
    }
  };
}

export function buildRetailPrinterCertificationPackets(vendorId?: RetailPrinterVendorId): RetailPrinterCertificationPacket[] {
  const adapters = vendorId ? [getRetailPrinterAdapter(vendorId)] : retailPrinterAdapters;

  return adapters.flatMap((adapter) =>
    adapter.operations.map((operation) => buildRetailPrinterCertificationPacket(adapter, operation, getSourceLink(adapter, operation.kind)))
  );
}

export function validateRetailPrinterAdapters(adapters: RetailPrinterAdapterContract[] = retailPrinterAdapters): string[] {
  const issues: string[] = [];
  const vendorIds = new Set<RetailPrinterVendorId>();

  for (const adapter of adapters) {
    if (vendorIds.has(adapter.vendorId)) issues.push(`Duplicate retail printer adapter: ${adapter.vendorId}`);
    vendorIds.add(adapter.vendorId);
    if (!adapter.productUrl.startsWith("https://")) issues.push(`${adapter.vendorId} adapter must persist an HTTPS product URL.`);
    issues.push(...validateRetailPrinterProductUrl(adapter));
    if (!adapter.pricingObservationId) issues.push(`${adapter.vendorId} adapter must point at a pricing observation.`);
    issues.push(...validateRetailPrinterSourceLinks(adapter));
    if (adapter.realOrdersEnabled || adapter.liveQuoteEnabled || adapter.imageUploadEnabled || adapter.orderPlacementEnabled) {
      issues.push(`${adapter.vendorId} adapter must not enable live retail operations.`);
    }
    for (const kind of retailPrinterOperationKinds) {
      const operation = adapter.operations.find((candidate) => candidate.kind === kind);
      if (!operation) issues.push(`${adapter.vendorId} adapter missing operation: ${kind}`);
      if (operation && !operation.sourceUrl.startsWith("https://")) {
        issues.push(`${adapter.vendorId} ${kind} operation must cite an HTTPS source URL.`);
      }
      if (operation && isPlaceholderRetailProductUrl(operation.sourceUrl)) {
        issues.push(`${adapter.vendorId} ${kind} operation source URL must not be placeholder, demo, localhost, or example content.`);
      }
      if (operation && operation.sourceUrl !== adapter.productUrl) {
        issues.push(`${adapter.vendorId} ${kind} operation must use the persisted adapter product URL.`);
      }
      if (operation && (operation.status !== "blocked" || !operation.noNetwork || operation.preparesRequest)) {
        issues.push(`${adapter.vendorId} ${kind} operation must stay blocked and no-network.`);
      }
      if (operation && operation.requiredEvidence.length < 3) {
        issues.push(`${adapter.vendorId} ${kind} operation must list required evidence.`);
      }
      if (operation) {
        issues.push(...validateRetailPrinterOperationBlueprint(adapter.vendorId, operation));
      }
    }
  }

  for (const requiredVendorId of retailPrinterRequiredVendorIds) {
    if (!vendorIds.has(requiredVendorId)) issues.push(`Missing retail printer adapter: ${requiredVendorId}`);
  }

  return issues;
}

export function validateRetailPrinterSourceLinks(adapter: RetailPrinterAdapterContract): string[] {
  const issues: string[] = [];
  const purposes = new Set(adapter.sourceLinks.map((sourceLink) => sourceLink.purpose));

  for (const purpose of ["product", ...retailPrinterOperationKinds] satisfies RetailPrinterSourceLinkPurpose[]) {
    if (!purposes.has(purpose)) issues.push(`${adapter.vendorId} adapter must persist source link purpose: ${purpose}.`);
  }

  for (const sourceLink of adapter.sourceLinks) {
    if (!sourceLink.url.startsWith("https://")) {
      issues.push(`${adapter.vendorId} ${sourceLink.purpose} source link must cite an HTTPS URL.`);
    }
    if (isPlaceholderRetailProductUrl(sourceLink.url)) {
      issues.push(`${adapter.vendorId} ${sourceLink.purpose} source link must not be placeholder, demo, localhost, or example content.`);
    }
    if (sourceLink.url !== adapter.productUrl) {
      issues.push(`${adapter.vendorId} ${sourceLink.purpose} source link must use the persisted adapter product URL.`);
    }
    if (sourceLink.sourceKind !== "retailer-product-page") {
      issues.push(`${adapter.vendorId} ${sourceLink.purpose} source link must be a retailer product page.`);
    }
  }

  return issues;
}

function buildBlockedOperationResult(
  adapter: RetailPrinterAdapterContract,
  kind: RetailPrinterOperationKind,
  input: RetailPrinterPriceAttemptInput | RetailPrinterImageUploadAttemptInput | RetailPrinterOrderAttemptInput
): RetailPrinterBlockedOperationResult {
  const operation = adapter.operations.find((candidate) => candidate.kind === kind);
  if (!operation) throw new Error(`Retail printer adapter ${adapter.vendorId} is missing operation: ${kind}`);
  const sourceLink = getSourceLink(adapter, kind);

  return {
    vendorId: adapter.vendorId,
    providerAdapterId: adapter.providerAdapterId,
    operation: kind,
    status: "blocked",
    productUrl: adapter.productUrl,
    sourceLink,
    networkAttempted: false,
    requestPrepared: false,
    requiredEvidence: operation.requiredEvidence,
    missingEvidence: operation.requiredEvidence,
    forbiddenFields: operation.requestBlueprint.forbiddenFields,
    requestFieldNames: operation.requestBlueprint.requestFields.map((field) => field.name),
    receivedFieldNames: Object.keys(input).sort(),
    operationPacket: buildOperationPacket(adapter, operation, sourceLink, input),
    blockedReason: operation.blockedReason
  };
}

function buildOperationPacket(
  adapter: RetailPrinterAdapterContract,
  operation: RetailPrinterOperationContract,
  sourceLink: RetailPrinterSourceLink,
  input: RetailPrinterPriceAttemptInput | RetailPrinterImageUploadAttemptInput | RetailPrinterOrderAttemptInput
): RetailPrinterOperationPacket {
  const expectedInputFields = operation.requestBlueprint.requestFields.map((field) => field.name);
  const sourceBackedFields = operation.requestBlueprint.requestFields
    .filter((field) => field.source === "pricing-observation")
    .map((field) => field.name);
  const receivedInputFields = Object.keys(input).sort();
  const received = new Set(receivedInputFields);

  return {
    packetId: `${adapter.vendorId}-${operation.kind}-blocked-operation-packet`,
    vendorId: adapter.vendorId,
    providerAdapterId: adapter.providerAdapterId,
    operation: operation.kind,
    productName: adapter.productName,
    productSku: adapter.productSku,
    productUrl: adapter.productUrl,
    pricingObservationId: adapter.pricingObservationId,
    sourceLink,
    uploadAssetExpectation: adapter.uploadAssetExpectation,
    noNetwork: true,
    networkAttempted: false,
    requestPrepared: false,
    expectedInputFields,
    sourceBackedFields,
    receivedInputFields,
    missingInputFields: operation.requestBlueprint.requestFields
      .filter((field) => field.required && field.source !== "pricing-observation" && !received.has(field.name))
      .map((field) => field.name),
    evidenceChecklist: operation.requiredEvidence,
    operatorSteps: buildOperatorSteps(adapter, operation.kind, sourceLink),
    safetyChecks: buildOperationSafetyChecks(operation),
    forbiddenFields: operation.requestBlueprint.forbiddenFields,
    certificationPacket: buildRetailPrinterCertificationPacket(adapter, operation, sourceLink)
  };
}

function getSourceLink(
  adapter: RetailPrinterAdapterContract,
  kind: RetailPrinterOperationKind
): RetailPrinterSourceLink {
  const sourceLink = adapter.sourceLinks.find((candidate) => candidate.purpose === kind);
  if (!sourceLink) throw new Error(`Retail printer adapter ${adapter.vendorId} is missing source link: ${kind}`);
  return sourceLink;
}

function buildOperatorSteps(
  adapter: RetailPrinterAdapterContract,
  kind: RetailPrinterOperationKind,
  sourceLink: RetailPrinterSourceLink
): string[] {
  if (kind === "fetch-price") {
    return [
      `Open ${sourceLink.label}: ${sourceLink.url}`,
      `Confirm the product is ${adapter.productName} with SKU/design code ${adapter.productSku}.`,
      "Enter the customer-approved quantity, fulfillment mode, ZIP or store context, and candidate coupon in the provider portal.",
      "Record subtotal, tax status, coupon application status, and pickup or shipping window as evidence before showing a final price."
    ];
  }

  if (kind === "upload-image") {
    return [
      `Open ${sourceLink.label}: ${sourceLink.url}`,
      `Use only the approved render packet for ${adapter.productName}: ${adapter.uploadAssetExpectation}`,
      "Upload the print-ready files in the provider portal without advancing to payment.",
      "Record the provider preview, asset acceptance result, and crop/fold state before asking for final customer approval."
    ];
  }

  return [
    `Open ${sourceLink.label}: ${sourceLink.url}`,
    "Verify the provider cart still matches the approved card proof, quote evidence, pickup or shipping path, and coupon state.",
    "Use only a tokenized payment authorization reference and confirm the cancellation or wrong-store recovery plan.",
    "Record the order confirmation, pickup or shipping commitment, and audit event IDs after customer final approval."
  ];
}

function buildOperationSafetyChecks(operation: RetailPrinterOperationContract): string[] {
  return [
    "Do not send a network request from CustomCard.",
    "Do not prepare a provider API payload in app runtime.",
    "Do not upload raw relationship memories or unapproved recipient PII.",
    "Do not submit payment or place a live order until every certification gate is proven.",
    ...operation.certificationGateIds.map((gateId) => `Gate required: ${gateId}`)
  ];
}
