import type { VendorId } from "./freeMvp";

export type RetailPrinterVendorId = Extract<VendorId, "walgreens" | "cvs" | "fedex" | "walmart">;
export type RetailPrinterOperationKind = "fetch-price" | "upload-image" | "place-order";
export type RetailPrinterOperationStatus = "blocked";

export interface RetailPrinterOperationContract {
  kind: RetailPrinterOperationKind;
  label: string;
  status: RetailPrinterOperationStatus;
  sourceUrl: string;
  noNetwork: true;
  preparesRequest: false;
  requiredEvidence: string[];
  blockedReason: string;
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
  selectedOperation: RetailPrinterOperationKind;
  operation: RetailPrinterOperationContract;
  operations: RetailPrinterOperationContract[];
  noNetwork: true;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
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

export function validateRetailPrinterAdapters(adapters: RetailPrinterAdapterContract[] = retailPrinterAdapters): string[] {
  const issues: string[] = [];
  const vendorIds = new Set<RetailPrinterVendorId>();

  for (const adapter of adapters) {
    if (vendorIds.has(adapter.vendorId)) issues.push(`Duplicate retail printer adapter: ${adapter.vendorId}`);
    vendorIds.add(adapter.vendorId);
    if (!adapter.productUrl.startsWith("https://")) issues.push(`${adapter.vendorId} adapter must persist an HTTPS product URL.`);
    if (!adapter.pricingObservationId) issues.push(`${adapter.vendorId} adapter must point at a pricing observation.`);
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
    }
  }

  for (const requiredVendorId of ["walmart", "fedex", "cvs", "walgreens"] satisfies RetailPrinterVendorId[]) {
    if (!vendorIds.has(requiredVendorId)) issues.push(`Missing retail printer adapter: ${requiredVendorId}`);
  }

  return issues;
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
      blockedReason: "Image upload requires a certified vendor API or reviewed browser-session automation contract."
    },
    {
      kind: "place-order",
      label: `Place ${vendorName} order`,
      status: "blocked",
      sourceUrl: productUrl,
      noNetwork: true,
      preparesRequest: false,
      requiredEvidence: vendorEvidence.order,
      blockedReason: "Order placement remains disabled until vendor certification, payment, recovery, and kill-switch gates are proven."
    }
  ];
}
