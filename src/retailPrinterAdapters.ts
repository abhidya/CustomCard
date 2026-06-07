import type { VendorId } from "./freeMvp";

export type RetailPrinterVendorId = Extract<VendorId, "walgreens" | "cvs" | "fedex" | "walmart">;
export type RetailPrinterOperationKind = "fetch-price" | "upload-image" | "place-order";
export type RetailPrinterOperationStatus = "blocked";
export type RetailPrinterSourceLinkPurpose = "product" | RetailPrinterOperationKind;
export type RetailPrinterOperationFieldSource =
  | "customer-approval"
  | "operator"
  | "payment-processor"
  | "pricing-observation"
  | "provider-account"
  | "provider-portal"
  | "render-packet";
export type RetailPrinterFulfillmentMode = "pickup" | "shipping";

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
  sourceLinks: RetailPrinterSourceLink[];
  checkoutMode: "vendor-browser-session";
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  operations: RetailPrinterOperationContract[];
}

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
}

export interface RetailPrinterOperationAdapter {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  fetchPrice(input: RetailPrinterPriceAttemptInput): RetailPrinterBlockedOperationResult;
  uploadImages(input: RetailPrinterImageUploadAttemptInput): RetailPrinterBlockedOperationResult;
  placeOrder(input: RetailPrinterOrderAttemptInput): RetailPrinterBlockedOperationResult;
}

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

export const retailPrinterAdapters: RetailPrinterAdapterContract[] = [
  {
    vendorId: "walmart",
    providerAdapterId: "walmart-live-print",
    vendorName: "Walmart Photo",
    productName: "5x7 folded card, blank envelope - upload your design",
    productSku: "361-5x7-folded-card-blank-envelope",
    productUrl:
      "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
    pricingObservationId: "walmart-5x7-same-day-folded-card",
    uploadAssetExpectation: "One or more 5x7 print-ready image/PDF assets through Walmart Photo's upload-your-design flow.",
    sourceLinks: buildSourceLinks(
      "Walmart Photo",
      "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2"
    ),
    checkoutMode: "vendor-browser-session",
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    operations: buildOperations(
      "Walmart Photo",
      "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2"
    )
  },
  {
    vendorId: "fedex",
    providerAdapterId: "fedex-live-print",
    vendorName: "FedEx Office",
    productName: "Quick greeting and holiday cards",
    productSku: "fedex-office-quick-greeting-cards",
    productUrl: "https://www.office.fedex.com/default/greeting-cards-quick.html",
    pricingObservationId: "fedex-quick-5x7-single-sided-card",
    uploadAssetExpectation: "PDF or image files uploaded through FedEx Office quick-card setup, with double-sided files split or combined as required.",
    sourceLinks: buildSourceLinks("FedEx Office", "https://www.office.fedex.com/default/greeting-cards-quick.html"),
    checkoutMode: "vendor-browser-session",
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    operations: buildOperations("FedEx Office", "https://www.office.fedex.com/default/greeting-cards-quick.html")
  },
  {
    vendorId: "cvs",
    providerAdapterId: "cvs-live-order",
    vendorName: "CVS Photo",
    productName: "Folded greeting card, 5x7",
    productSku: "CommerceProduct_26126",
    productUrl:
      "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery",
    pricingObservationId: "cvs-5x7-folded-card",
    uploadAssetExpectation: "Images routed through CVS Photo/Snapfish project creation after the customer signs in or continues as guest where allowed.",
    sourceLinks: buildSourceLinks(
      "CVS Photo",
      "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery"
    ),
    checkoutMode: "vendor-browser-session",
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    operations: buildOperations(
      "CVS Photo",
      "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery"
    )
  },
  {
    vendorId: "walgreens",
    providerAdapterId: "walgreens-live-order",
    vendorName: "Walgreens Photo",
    productName: "5x7 folded cards, standard cardstock 85lb",
    productSku: "CommerceProduct_33272",
    productUrl:
      "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery",
    pricingObservationId: "walgreens-5x7-folded-card",
    uploadAssetExpectation: "Images routed through Walgreens Photo/Snapfish project creation after customer sign-in and preview review.",
    sourceLinks: buildSourceLinks(
      "Walgreens Photo",
      "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery"
    ),
    checkoutMode: "vendor-browser-session",
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    operations: buildOperations(
      "Walgreens Photo",
      "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery"
    )
  }
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

export function validateRetailPrinterAdapters(adapters: RetailPrinterAdapterContract[] = retailPrinterAdapters): string[] {
  const issues: string[] = [];
  const vendorIds = new Set<RetailPrinterVendorId>();

  for (const adapter of adapters) {
    if (vendorIds.has(adapter.vendorId)) issues.push(`Duplicate retail printer adapter: ${adapter.vendorId}`);
    vendorIds.add(adapter.vendorId);
    if (!adapter.productUrl.startsWith("https://")) issues.push(`${adapter.vendorId} adapter must persist an HTTPS product URL.`);
    if (!adapter.pricingObservationId) issues.push(`${adapter.vendorId} adapter must point at a pricing observation.`);
    issues.push(...validateRetailPrinterSourceLinks(adapter));
    if (adapter.realOrdersEnabled || adapter.liveQuoteEnabled || adapter.imageUploadEnabled || adapter.orderPlacementEnabled) {
      issues.push(`${adapter.vendorId} adapter must not enable live retail operations.`);
    }
    for (const kind of ["fetch-price", "upload-image", "place-order"] satisfies RetailPrinterOperationKind[]) {
      const operation = adapter.operations.find((candidate) => candidate.kind === kind);
      if (!operation) issues.push(`${adapter.vendorId} adapter missing operation: ${kind}`);
      if (operation && !operation.sourceUrl.startsWith("https://")) {
        issues.push(`${adapter.vendorId} ${kind} operation must cite an HTTPS source URL.`);
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

  for (const requiredVendorId of ["walmart", "fedex", "cvs", "walgreens"] satisfies RetailPrinterVendorId[]) {
    if (!vendorIds.has(requiredVendorId)) issues.push(`Missing retail printer adapter: ${requiredVendorId}`);
  }

  return issues;
}

export function validateRetailPrinterSourceLinks(adapter: RetailPrinterAdapterContract): string[] {
  const issues: string[] = [];
  const purposes = new Set(adapter.sourceLinks.map((sourceLink) => sourceLink.purpose));

  for (const purpose of ["product", "fetch-price", "upload-image", "place-order"] satisfies RetailPrinterSourceLinkPurpose[]) {
    if (!purposes.has(purpose)) issues.push(`${adapter.vendorId} adapter must persist source link purpose: ${purpose}.`);
  }

  for (const sourceLink of adapter.sourceLinks) {
    if (!sourceLink.url.startsWith("https://")) {
      issues.push(`${adapter.vendorId} ${sourceLink.purpose} source link must cite an HTTPS URL.`);
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

function buildSourceLinks(vendorName: string, productUrl: string): RetailPrinterSourceLink[] {
  return [
    {
      purpose: "product",
      label: `${vendorName} product page`,
      url: productUrl,
      sourceKind: "retailer-product-page"
    },
    {
      purpose: "fetch-price",
      label: `${vendorName} price source`,
      url: productUrl,
      sourceKind: "retailer-product-page"
    },
    {
      purpose: "upload-image",
      label: `${vendorName} image upload source`,
      url: productUrl,
      sourceKind: "retailer-product-page"
    },
    {
      purpose: "place-order",
      label: `${vendorName} order source`,
      url: productUrl,
      sourceKind: "retailer-product-page"
    }
  ];
}

function buildBlockedOperationResult(
  adapter: RetailPrinterAdapterContract,
  kind: RetailPrinterOperationKind,
  input: RetailPrinterPriceAttemptInput | RetailPrinterImageUploadAttemptInput | RetailPrinterOrderAttemptInput
): RetailPrinterBlockedOperationResult {
  const operation = adapter.operations.find((candidate) => candidate.kind === kind);
  if (!operation) throw new Error(`Retail printer adapter ${adapter.vendorId} is missing operation: ${kind}`);
  const sourceLink = adapter.sourceLinks.find((candidate) => candidate.purpose === kind);
  if (!sourceLink) throw new Error(`Retail printer adapter ${adapter.vendorId} is missing source link: ${kind}`);

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
    forbiddenFields: operation.requestBlueprint.forbiddenFields
  };
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

function buildOperations(vendorName: string, productUrl: string): RetailPrinterOperationContract[] {
  return [
    {
      kind: "fetch-price",
      label: `Fetch ${vendorName} price`,
      status: "blocked",
      sourceUrl: productUrl,
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.price,
      certificationGateIds: sharedGateIds,
      requestBlueprint: buildPriceBlueprint(),
      blockedReason: "Only review-only public price observations are available; no certified live quote endpoint is configured."
    },
    {
      kind: "upload-image",
      label: `Upload image to ${vendorName}`,
      status: "blocked",
      sourceUrl: productUrl,
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.upload,
      certificationGateIds: sharedGateIds,
      requestBlueprint: buildUploadBlueprint(),
      blockedReason: "Image upload requires vendor certification plus a certified API or reviewed browser-session automation contract."
    },
    {
      kind: "place-order",
      label: `Place ${vendorName} order`,
      status: "blocked",
      sourceUrl: productUrl,
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.order,
      certificationGateIds: [...sharedGateIds, "payment-certification", "cancellation-recovery", "physical-print-qa"],
      requestBlueprint: buildOrderBlueprint(),
      blockedReason: "Order placement remains disabled until vendor certification, payment, recovery, and kill-switch gates are proven."
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

function requestField(
  name: string,
  label: string,
  source: RetailPrinterOperationFieldSource,
  pii: boolean,
  required = true
): RetailPrinterOperationRequestField {
  return { name, label, source, required, pii };
}
