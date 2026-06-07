import type { VendorId } from "./freeMvp";

export type PrinterPricingConfidence = "public-current" | "public-ambiguous" | "manual-estimate";
export type PrinterPricingSpeed = "same-day" | "24-hour" | "ships-in-days" | "manual-confirm";
export type PrinterProductKind = "folded-card" | "flat-card" | "photo-card" | "premium-card";
export type PrinterPricingCollectionMode = "official-developer-catalog" | "official-public-page" | "official-product-page";
export type PrinterPricingFreshnessStatus = "fresh" | "stale" | "future-dated";
export type PrinterCouponReviewMode = "apply-during-provider-portal-collection";
export type PrinterCouponCollectionMode = "retailer-public-coupon-page" | "coupon-provider-feed" | "provider-portal-checkout";
export type PrinterCouponEvidenceStatus = "source-listed" | "provider-listed" | "provider-portal-applied";
export type PrinterCouponApplicationStatus = "applied" | "portal-evidence-required" | "expired" | "not-found";

export interface PrinterPricingSource {
  label: string;
  url: string;
  observedAtIso: string;
  notes: string;
}

export interface PrinterPriceObservation {
  id: string;
  vendorId: VendorId;
  vendorName: string;
  productName: string;
  productKind: PrinterProductKind;
  size: "5x7";
  unitPriceCents: number;
  startingPackagePriceCents?: number;
  minimumQuantity: number;
  speed: PrinterPricingSpeed;
  pickupEligible: boolean;
  liveQuote: false;
  requiresManualConfirmation: true;
  confidence: PrinterPricingConfidence;
  source: PrinterPricingSource;
}

export interface PrinterPriceEstimate {
  observation: PrinterPriceObservation;
  quantity: number;
  pricedQuantity: number;
  subtotalCents: number;
  subtotalLabel: string;
  effectiveSubtotalCents: number;
  effectiveSubtotalLabel: string;
  couponDiscountCents: number;
  couponDiscountLabel: string;
  subtotalIncludesCoupon: boolean;
  couponApplication: PrinterCouponApplication;
  couponPolicy: PrinterCouponPolicy;
}

export interface PrinterPricingCollectionRule {
  sourceLabel: string;
  url: string;
  vendorIds: VendorId[];
  mode: PrinterPricingCollectionMode;
  maxAgeDays: number;
  extractHints: string[];
  blockedFields: string[];
  noNetworkRuntime: true;
}

export interface PrinterPricingSourceFreshness {
  sourceLabel: string;
  url: string;
  observedAtIso: string;
  ageDays: number;
  status: PrinterPricingFreshnessStatus;
  observationIds: string[];
}

export interface PrinterPricingRefreshReport {
  generatedAtIso: string;
  maxAgeDays: number;
  totalObservations: number;
  sourceCount: number;
  couponSourceCount: number;
  couponOfferCount: number;
  activeCouponOfferCount: number;
  portalAppliedCouponOfferCount: number;
  freshSources: number;
  staleSources: PrinterPricingSourceFreshness[];
  futureDatedSources: PrinterPricingSourceFreshness[];
  collectionRules: PrinterPricingCollectionRule[];
  couponSources: PrinterCouponSource[];
  couponOffers: PrinterCouponOffer[];
  couponPolicy: PrinterCouponPolicy;
  blockers: string[];
  canShowComparison: boolean;
  liveQuote: false;
  disclaimer: string;
}

export interface PrinterPricingComparison {
  selectedVendorId: VendorId;
  quantity: number;
  selectedVendorOptions: PrinterPriceEstimate[];
  rankedKnownPrices: PrinterPriceEstimate[];
  manualConfirmationVendors: VendorId[];
  refreshReport: PrinterPricingRefreshReport;
  couponPolicy: PrinterCouponPolicy;
  disclaimer: string;
  liveQuote: false;
}

export interface PrinterCouponPolicy {
  reviewMode: PrinterCouponReviewMode;
  eligibleVendorIds: VendorId[];
  collectionModes: PrinterCouponCollectionMode[];
  couponProviderFeedAllowed: true;
  retailerCouponScrapeAllowed: true;
  providerPortalApplicationRequired: true;
  couponsAppliedToBestPrice: true;
  couponsIncludedInDisplayedPrices: "only-after-provider-portal-application";
  defaultAppliedDiscountCents: 0;
  blockedFields: string[];
  requiredEvidence: string[];
  confirmationCopy: string;
}

export interface PrinterCouponSource {
  label: string;
  url: string;
  observedAtIso: string;
  mode: PrinterCouponCollectionMode;
  notes: string;
}

export interface PrinterCouponOffer {
  id: string;
  vendorId: VendorId;
  label: string;
  code: string;
  discountPercent: number;
  appliesToProductKinds: PrinterProductKind[];
  startsAtIso: string;
  endsAtIso: string;
  source: PrinterCouponSource;
  evidenceStatus: PrinterCouponEvidenceStatus;
  requiresLoggedInAccount: boolean;
  excludes: string[];
}

export interface PrinterCouponApplication {
  status: PrinterCouponApplicationStatus;
  offer?: PrinterCouponOffer;
  discountCents: number;
  discountedSubtotalCents: number;
  discountedSubtotalLabel: string;
  evidenceRequired: string[];
  reason: string;
}

export interface PrinterPricingEstimateOptions {
  now?: Date;
  couponOffers?: PrinterCouponOffer[];
}

const observedAtIso = "2026-06-07T12:00:00.000Z";

export const printerPricingSources = {
  walgreensProductCatalog: {
    label: "Walgreens Photo 5x7 folded upload card",
    url: "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery",
    observedAtIso,
    notes: "Official design-detail page exposes JSON-LD price 3.49 for CommerceProduct_33272; store availability and taxes still require manual confirmation."
  },
  cvsCards: {
    label: "CVS Photo cards",
    url: "https://www.cvs.com/Photo/Cards",
    observedAtIso,
    notes: "Official CVS cards page lists same-day 5x7 photo, premium, folded, and double-sided card starting prices."
  },
  cvsDoubleSidedCards: {
    label: "CVS Photo double-sided cards",
    url: "https://www.cvs.com/Photo/Cards",
    observedAtIso,
    notes: "Official CVS cards page lists 5x7 double-sided cardstock pricing separately from premium cards."
  },
  cvsFoldedDesignDetail: {
    label: "CVS Photo 5x7 folded greeting card design detail",
    url: "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery",
    observedAtIso,
    notes: "Official design-detail page exposes JSON-LD price 8.98 for CommerceProduct_26126; checkout must confirm quantity, pickup, tax, and availability."
  },
  cvsSameDay: {
    label: "CVS Photo same-day photo gifts",
    url: "https://www.cvs.com/photo/same-day-photo-gifts",
    observedAtIso,
    notes: "Official same-day page lists current card starting prices; store-specific availability still must be checked."
  },
  fedexGreetingCards: {
    label: "FedEx Office quick greeting and holiday cards",
    url: "https://www.office.fedex.com/default/greeting-cards-quick.html",
    observedAtIso,
    notes: "Official FedEx Office page documents 5x7 quick cards, upload-file support, PDF/image formats, and same-day/24-hour pickup; checkout must confirm live price."
  },
  walmartSameDayFolded: {
    label: "Walmart Photo 5x7 folded card upload your design",
    url: "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
    observedAtIso,
    notes: "Official Walmart Photo page lists 5x7 folded card upload-your-design quantities from 1 card at $0.56 each through larger bundles; exact store availability still requires checkout confirmation."
  },
  staplesFoldedCards: {
    label: "Staples folded cards",
    url: "https://www.staples.com/services/printing/cards-invitations-announcements/folded-cards/",
    observedAtIso,
    notes: "Official Staples folded-cards page lists a 5x7 25-card folded package; coupon and production-window details require checkout confirmation."
  },
  staplesSameDayCards: {
    label: "Staples same-day cards",
    url: "https://www.staples.com/services/printing/cards-invitations-announcements/same-day-cards/",
    observedAtIso,
    notes:
      "Official Staples same-day cards page lists a 5x7 25-card package; coupon candidates require provider-portal application proof before best-price ranking."
  },
  officeDepotPhotoCards: {
    label: "Office Depot custom photo holiday cards",
    url: "https://www.officedepot.com/a/products/7395368/Custom-Photo-Holiday-Cards-With-Envelopes/",
    observedAtIso,
    notes: "Official Office Depot custom photo card product page lists a 25-card 7x5 package price; production and pickup/ship details require manual confirmation."
  }
} satisfies Record<string, PrinterPricingSource>;

export const printerCouponPolicy: PrinterCouponPolicy = {
  reviewMode: "apply-during-provider-portal-collection",
  eligibleVendorIds: ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"],
  collectionModes: ["retailer-public-coupon-page", "coupon-provider-feed", "provider-portal-checkout"],
  couponProviderFeedAllowed: true,
  retailerCouponScrapeAllowed: true,
  providerPortalApplicationRequired: true,
  couponsAppliedToBestPrice: true,
  couponsIncludedInDisplayedPrices: "only-after-provider-portal-application",
  defaultAppliedDiscountCents: 0,
  blockedFields: [
    "coupon provider API credentials",
    "coupon expiration",
    "coupon stacking rules",
    "loyalty account pricing",
    "promo code application proof",
    "provider portal checkout session"
  ],
  requiredEvidence: [
    "retailer coupon page or coupon-provider feed capture",
    "provider portal checkout subtotal after coupon application",
    "coupon code, expiration, and product-scope evidence",
    "same product, quantity, fulfillment mode, and account state"
  ],
  confirmationCopy:
    "Coupons are collected and tested during provider-portal pricing; best-price ranking uses a coupon only after the portal applies it to the same product, quantity, fulfillment mode, and account state."
};

export const printerCouponSources = {
  walgreensPhotoDeals: {
    label: "Walgreens Photo coupon codes and promo terms",
    url: "https://photo.walgreens.com/store/deals?tab=photo_downsplash_top",
    observedAtIso,
    mode: "retailer-public-coupon-page",
    notes:
      "Official Walgreens Photo deals page listed card and stationery coupon terms; code must be entered in the logged-in photo account, kiosk, or mobile checkout."
  },
  cvsPhotoCoupons: {
    label: "CVS Photo coupons and promo terms",
    url: "https://www.cvs.com/photo/cvs-photo-coupons?cid=cvs-home-s5-l2-bnrshop-fs-photo",
    observedAtIso,
    mode: "retailer-public-coupon-page",
    notes:
      "Official CVS Photo coupons page listed premium-card coupon terms; code must be entered at checkout and only one discount may apply per item."
  }
} satisfies Record<string, PrinterCouponSource>;

export const printerCouponOffers: PrinterCouponOffer[] = [
  {
    id: "walgreens-crispcard-cards-2026-06-06",
    vendorId: "walgreens",
    label: "60% off All Photo Cards and Premium Stationery",
    code: "CRISPCARD",
    discountPercent: 60,
    appliesToProductKinds: ["folded-card", "flat-card", "photo-card", "premium-card"],
    startsAtIso: "2026-05-31T00:00:00.000-05:00",
    endsAtIso: "2026-06-06T23:59:00.000-05:00",
    source: printerCouponSources.walgreensPhotoDeals,
    evidenceStatus: "source-listed",
    requiresLoggedInAccount: true,
    excludes: ["previous purchases", "taxes", "shipping charges", "account product credits"]
  },
  {
    id: "cvs-graduation-premium-cards-2026-06-06",
    vendorId: "cvs",
    label: "60% off Premium Cards",
    code: "GRADUATION",
    discountPercent: 60,
    appliesToProductKinds: ["premium-card"],
    startsAtIso: "2026-05-10T00:01:00.000-04:00",
    endsAtIso: "2026-06-06T23:59:00.000-04:00",
    source: printerCouponSources.cvsPhotoCoupons,
    evidenceStatus: "source-listed",
    requiresLoggedInAccount: false,
    excludes: ["nonpremium photo cards", "shipping charges", "tax"]
  }
];

export const printerPricingCollectionRules: PrinterPricingCollectionRule[] = [
  {
    sourceLabel: printerPricingSources.walgreensProductCatalog.label,
    url: printerPricingSources.walgreensProductCatalog.url,
    vendorIds: ["walgreens"],
    mode: "official-product-page",
    maxAgeDays: 30,
    extractHints: ["5x7 Folded Cards", "CommerceProduct_33272", "JSON-LD price", "Upload Your Design"],
    blockedFields: ["tax", "coupon portal proof", "store stock", "pickup window", "live order placement"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.cvsCards.label,
    url: printerPricingSources.cvsCards.url,
    vendorIds: ["cvs"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 Photo Cards", "Same Day 5x7 Premium Cards", "5x7 Folded Cards", "starting price", "minimum quantity"],
    blockedFields: ["tax", "coupon portal proof", "store stock", "pickup window", "photo checkout availability"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.cvsDoubleSidedCards.label,
    url: printerPricingSources.cvsDoubleSidedCards.url,
    vendorIds: ["cvs"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 Double-Sided Cardstock", "starting price", "minimum quantity"],
    blockedFields: ["tax", "coupon portal proof", "store stock", "pickup window", "photo checkout availability"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.cvsFoldedDesignDetail.label,
    url: printerPricingSources.cvsFoldedDesignDetail.url,
    vendorIds: ["cvs"],
    mode: "official-product-page",
    maxAgeDays: 30,
    extractHints: ["Folded Greeting Card, 5x7", "CommerceProduct_26126", "JSON-LD price", "Erin Condren"],
    blockedFields: ["tax", "coupon portal proof", "store stock", "pickup window", "photo checkout availability"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.fedexGreetingCards.label,
    url: printerPricingSources.fedexGreetingCards.url,
    vendorIds: ["fedex"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 Folded Portrait", "Upload a file", "PDF", "same day or within 24 hours", "related product each price"],
    blockedFields: ["tax", "coupon portal proof", "local pickup slot", "delivery date", "print QA result", "live checkout price"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.walmartSameDayFolded.label,
    url: printerPricingSources.walmartSameDayFolded.url,
    vendorIds: ["walmart"],
    mode: "official-product-page",
    maxAgeDays: 30,
    extractHints: ["Same-Day Folded Photo Card", "5x7", "each"],
    blockedFields: ["tax", "coupon portal proof", "store stock", "pickup window", "business-account checkout"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.staplesFoldedCards.label,
    url: printerPricingSources.staplesFoldedCards.url,
    vendorIds: ["staples"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 folded cards", "25 quantity", "pre-tax subtotal"],
    blockedFields: ["tax", "coupon portal proof", "pickup window", "delivery availability", "card-stock proof"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.staplesSameDayCards.label,
    url: printerPricingSources.staplesSameDayCards.url,
    vendorIds: ["staples"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 same-day cards", "25 quantity", "pre-tax subtotal"],
    blockedFields: ["tax", "coupon portal proof", "store stock", "pickup window", "card-stock proof"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.officeDepotPhotoCards.label,
    url: printerPricingSources.officeDepotPhotoCards.url,
    vendorIds: ["office-depot"],
    mode: "official-product-page",
    maxAgeDays: 30,
    extractHints: ["7x5 custom photo holiday cards", "25 pack", "package price"],
    blockedFields: ["tax", "coupon portal proof", "pickup window", "delivery availability", "card-stock proof"],
    noNetworkRuntime: true
  }
];

export const printerPriceCatalog: PrinterPriceObservation[] = [
  {
    id: "walgreens-5x7-folded-card",
    vendorId: "walgreens",
    vendorName: "Walgreens Photo",
    productName: "5x7 folded cards, standard cardstock 85lb",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 349,
    minimumQuantity: 1,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.walgreensProductCatalog
  },
  {
    id: "cvs-5x7-double-sided-cardstock",
    vendorId: "cvs",
    vendorName: "CVS Photo",
    productName: "5x7 double-sided cardstock card",
    productKind: "flat-card",
    size: "5x7",
    unitPriceCents: 199,
    minimumQuantity: 20,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.cvsDoubleSidedCards
  },
  {
    id: "cvs-5x7-photo-card",
    vendorId: "cvs",
    vendorName: "CVS Photo",
    productName: "5x7 photo card",
    productKind: "photo-card",
    size: "5x7",
    unitPriceCents: 109,
    minimumQuantity: 20,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.cvsCards
  },
  {
    id: "cvs-5x7-premium-card",
    vendorId: "cvs",
    vendorName: "CVS Photo",
    productName: "Same Day 5x7 Premium card",
    productKind: "premium-card",
    size: "5x7",
    unitPriceCents: 249,
    minimumQuantity: 20,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.cvsCards
  },
  {
    id: "cvs-5x7-folded-card",
    vendorId: "cvs",
    vendorName: "CVS Photo",
    productName: "Folded greeting card, 5x7",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 898,
    minimumQuantity: 1,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-ambiguous",
    source: printerPricingSources.cvsFoldedDesignDetail
  },
  {
    id: "fedex-quick-5x7-single-sided-card",
    vendorId: "fedex",
    vendorName: "FedEx Office",
    productName: "Quick 5x7 single-sided greeting card",
    productKind: "flat-card",
    size: "5x7",
    unitPriceCents: 140,
    startingPackagePriceCents: 1399,
    minimumQuantity: 10,
    speed: "24-hour",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.fedexGreetingCards
  },
  {
    id: "fedex-quick-5x7-double-sided-card",
    vendorId: "fedex",
    vendorName: "FedEx Office",
    productName: "Quick 5x7 double-sided greeting card",
    productKind: "flat-card",
    size: "5x7",
    unitPriceCents: 180,
    startingPackagePriceCents: 1799,
    minimumQuantity: 10,
    speed: "24-hour",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.fedexGreetingCards
  },
  {
    id: "fedex-premium-5x7-folded-card",
    vendorId: "fedex",
    vendorName: "FedEx Office",
    productName: "Premium 5x7 folded greeting card",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 115,
    startingPackagePriceCents: 2299,
    minimumQuantity: 20,
    speed: "ships-in-days",
    pickupEligible: false,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.fedexGreetingCards
  },
  {
    id: "walmart-5x7-same-day-folded-card",
    vendorId: "walmart",
    vendorName: "Walmart Photo",
    productName: "Same-day folded photo card",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 56,
    minimumQuantity: 1,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.walmartSameDayFolded
  },
  {
    id: "staples-5x7-folded-card-bundle",
    vendorId: "staples",
    vendorName: "Staples Print",
    productName: "5x7 folded card bundle",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 200,
    startingPackagePriceCents: 4999,
    minimumQuantity: 25,
    speed: "ships-in-days",
    pickupEligible: false,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.staplesFoldedCards
  },
  {
    id: "staples-5x7-same-day-card-bundle",
    vendorId: "staples",
    vendorName: "Staples Print",
    productName: "5x7 same-day card bundle",
    productKind: "flat-card",
    size: "5x7",
    unitPriceCents: 200,
    startingPackagePriceCents: 4999,
    minimumQuantity: 25,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.staplesSameDayCards
  },
  {
    id: "office-depot-7x5-photo-holiday-card-bundle",
    vendorId: "office-depot",
    vendorName: "Office Depot",
    productName: "7x5 custom photo holiday card bundle",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 310,
    startingPackagePriceCents: 7760,
    minimumQuantity: 25,
    speed: "ships-in-days",
    pickupEligible: false,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-ambiguous",
    source: printerPricingSources.officeDepotPhotoCards
  }
];

export function getPrinterPriceOptionsForVendor(
  vendorId: VendorId,
  catalog: PrinterPriceObservation[] = printerPriceCatalog
): PrinterPriceObservation[] {
  return catalog.filter((observation) => observation.vendorId === vendorId);
}

export function estimatePrinterSubtotal(
  observation: PrinterPriceObservation,
  quantity = 1,
  options: PrinterPricingEstimateOptions = {}
): PrinterPriceEstimate {
  const normalizedQuantity = Math.max(Math.round(quantity), 1);
  const pricedQuantity = Math.max(normalizedQuantity, observation.minimumQuantity);
  const subtotalCents =
    observation.startingPackagePriceCents !== undefined && pricedQuantity === observation.minimumQuantity
      ? observation.startingPackagePriceCents
      : pricedQuantity * observation.unitPriceCents;
  const couponApplication = buildPrinterCouponApplication(
    observation,
    subtotalCents,
    options.now ?? new Date(observedAtIso),
    options.couponOffers ?? printerCouponOffers
  );
  const couponDiscountLabel =
    couponApplication.status === "applied"
      ? `-${formatCents(couponApplication.discountCents)} with ${couponApplication.offer?.code}`
      : couponApplication.reason;

  return {
    observation,
    quantity: normalizedQuantity,
    pricedQuantity,
    subtotalCents,
    subtotalLabel: formatCents(subtotalCents),
    effectiveSubtotalCents: couponApplication.discountedSubtotalCents,
    effectiveSubtotalLabel: couponApplication.discountedSubtotalLabel,
    couponDiscountCents: couponApplication.discountCents,
    couponDiscountLabel,
    subtotalIncludesCoupon: couponApplication.status === "applied",
    couponApplication,
    couponPolicy: printerCouponPolicy
  };
}

export function buildPrinterPricingComparison(
  selectedVendorId: VendorId,
  quantity = 1,
  catalog: PrinterPriceObservation[] = printerPriceCatalog,
  now = new Date()
): PrinterPricingComparison {
  const estimates = catalog.map((observation) => estimatePrinterSubtotal(observation, quantity, { now }));
  const rankedKnownPrices = estimates.slice().sort((first, second) =>
    first.effectiveSubtotalCents - second.effectiveSubtotalCents ||
    speedRank(first.observation.speed) - speedRank(second.observation.speed) ||
    first.observation.vendorName.localeCompare(second.observation.vendorName)
  );
  const vendorIds = new Set<VendorId>([
    "walgreens",
    "cvs",
    "fedex",
    "walmart",
    "staples",
    "office-depot",
    "local-print-shop"
  ]);

  return {
    selectedVendorId,
    quantity: Math.max(Math.round(quantity), 1),
    selectedVendorOptions: rankedKnownPrices.filter((estimate) => estimate.observation.vendorId === selectedVendorId),
    rankedKnownPrices,
    manualConfirmationVendors: Array.from(vendorIds).filter((vendorId) =>
      vendorId === "local-print-shop" || catalog.some((observation) => observation.vendorId === vendorId)
    ),
    refreshReport: buildPrinterPricingRefreshReport(catalog, now),
    couponPolicy: printerCouponPolicy,
    disclaimer:
      "Public printer prices are review-only observations, not live quotes. Apply available coupons during provider-portal collection, then confirm tax, pickup window, and stock before upload.",
    liveQuote: false
  };
}

export function buildPrinterPricingRefreshReport(
  catalog: PrinterPriceObservation[] = printerPriceCatalog,
  now = new Date()
): PrinterPricingRefreshReport {
  const sourceMap = new Map<string, { source: PrinterPricingSource; observationIds: string[] }>();
  for (const observation of catalog) {
    const key = observation.source.url;
    const current = sourceMap.get(key) ?? { source: observation.source, observationIds: [] };
    current.observationIds.push(observation.id);
    sourceMap.set(key, current);
  }

  const freshness = Array.from(sourceMap.values()).map(({ source, observationIds }) =>
    buildSourceFreshness(source, observationIds, now)
  );
  const staleSources = freshness.filter((source) => source.status === "stale");
  const futureDatedSources = freshness.filter((source) => source.status === "future-dated");
  const catalogErrors = validatePrinterPricingCatalog(catalog, { skipFreshness: true });
  const blockers = [
    ...catalogErrors,
    ...staleSources.map((source) => `${source.sourceLabel} source is ${source.ageDays} days old; refresh before showing as current.`),
    ...futureDatedSources.map((source) => `${source.sourceLabel} source observation date is in the future.`)
  ];
  const activeCouponOffers = printerCouponOffers.filter((offer) => isPrinterCouponActive(offer, now));
  const portalAppliedCouponOffers = activeCouponOffers.filter((offer) => offer.evidenceStatus === "provider-portal-applied");

  return {
    generatedAtIso: now.toISOString(),
    maxAgeDays: maxPrinterPricingAgeDays,
    totalObservations: catalog.length,
    sourceCount: sourceMap.size,
    couponSourceCount: Object.keys(printerCouponSources).length,
    couponOfferCount: printerCouponOffers.length,
    activeCouponOfferCount: activeCouponOffers.length,
    portalAppliedCouponOfferCount: portalAppliedCouponOffers.length,
    freshSources: freshness.filter((source) => source.status === "fresh").length,
    staleSources,
    futureDatedSources,
    collectionRules: printerPricingCollectionRules,
    couponSources: Object.values(printerCouponSources),
    couponOffers: printerCouponOffers,
    couponPolicy: printerCouponPolicy,
    blockers,
    canShowComparison: blockers.length === 0,
    liveQuote: false,
    disclaimer:
      "Pricing collection uses official public pages plus coupon-source evidence; coupon discounts are applied only after provider-portal application proof, and taxes, stock, pickup windows, payments, and live order placement remain excluded."
  };
}

export function buildPrinterCouponApplication(
  observation: PrinterPriceObservation,
  subtotalCents: number,
  now: Date = new Date(observedAtIso),
  offers: PrinterCouponOffer[] = printerCouponOffers
): PrinterCouponApplication {
  const applicableOffers = offers.filter(
    (offer) => offer.vendorId === observation.vendorId && offer.appliesToProductKinds.includes(observation.productKind)
  );
  const activeOffers = applicableOffers.filter((offer) => isPrinterCouponActive(offer, now));
  const portalAppliedOffers = activeOffers
    .filter((offer) => offer.evidenceStatus === "provider-portal-applied")
    .sort((first, second) => second.discountPercent - first.discountPercent);

  if (portalAppliedOffers[0]) {
    const offer = portalAppliedOffers[0];
    const discountCents = Math.floor((subtotalCents * offer.discountPercent) / 100);
    const discountedSubtotalCents = Math.max(subtotalCents - discountCents, 0);

    return {
      status: "applied",
      offer,
      discountCents,
      discountedSubtotalCents,
      discountedSubtotalLabel: formatCents(discountedSubtotalCents),
      evidenceRequired: [],
      reason: `${offer.code} applied in provider portal`
    };
  }

  const activeOffer = activeOffers.sort((first, second) => second.discountPercent - first.discountPercent)[0];
  if (activeOffer) {
    return {
      status: "portal-evidence-required",
      offer: activeOffer,
      discountCents: 0,
      discountedSubtotalCents: subtotalCents,
      discountedSubtotalLabel: formatCents(subtotalCents),
      evidenceRequired: printerCouponPolicy.requiredEvidence,
      reason: `${activeOffer.code} found; apply and verify in provider portal before ranking as best available`
    };
  }

  const expiredOffer = applicableOffers
    .filter((offer) => new Date(offer.endsAtIso).getTime() < now.getTime())
    .sort((first, second) => new Date(second.endsAtIso).getTime() - new Date(first.endsAtIso).getTime())[0];
  if (expiredOffer) {
    return {
      status: "expired",
      offer: expiredOffer,
      discountCents: 0,
      discountedSubtotalCents: subtotalCents,
      discountedSubtotalLabel: formatCents(subtotalCents),
      evidenceRequired: printerCouponPolicy.requiredEvidence,
      reason: `${expiredOffer.code} expired on ${formatCouponDate(expiredOffer.endsAtIso)}`
    };
  }

  return {
    status: "not-found",
    discountCents: 0,
    discountedSubtotalCents: subtotalCents,
    discountedSubtotalLabel: formatCents(subtotalCents),
    evidenceRequired: printerCouponPolicy.requiredEvidence,
    reason: "No applicable coupon collected from provider feed or retailer coupon page"
  };
}

export function isPrinterCouponActive(offer: PrinterCouponOffer, now: Date = new Date(observedAtIso)): boolean {
  const startsAt = new Date(offer.startsAtIso).getTime();
  const endsAt = new Date(offer.endsAtIso).getTime();
  const current = now.getTime();

  return startsAt <= current && current <= endsAt;
}

export function validatePrinterPricingCatalog(
  catalog: PrinterPriceObservation[] = printerPriceCatalog,
  options: { enforceFreshness?: boolean; now?: Date; skipFreshness?: boolean } = {}
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const sourceUrlsWithRules = new Set(printerPricingCollectionRules.map((rule) => rule.url));

  for (const observation of catalog) {
    if (ids.has(observation.id)) errors.push(`Duplicate printer price id: ${observation.id}`);
    ids.add(observation.id);
    if (observation.size !== "5x7") errors.push(`Printer price ${observation.id} must target 5x7 cards.`);
    if (observation.unitPriceCents <= 0) errors.push(`Printer price ${observation.id} must have a positive public price.`);
    if (observation.startingPackagePriceCents !== undefined && observation.startingPackagePriceCents <= 0) {
      errors.push(`Printer price ${observation.id} must have a positive package starting price.`);
    }
    if (observation.minimumQuantity < 1) errors.push(`Printer price ${observation.id} must have a positive minimum quantity.`);
    if (observation.liveQuote) errors.push(`Printer price ${observation.id} must not claim a live quote.`);
    if (!observation.requiresManualConfirmation) {
      errors.push(`Printer price ${observation.id} must require manual confirmation.`);
    }
    if (!observation.source.url.startsWith("https://")) {
      errors.push(`Printer price ${observation.id} must cite an HTTPS source.`);
    }
    if (!sourceUrlsWithRules.has(observation.source.url)) {
      errors.push(`Printer price ${observation.id} must have a collection rule for ${observation.source.url}.`);
    }
  }

  for (const vendorId of ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot"] satisfies VendorId[]) {
    if (!catalog.some((observation) => observation.vendorId === vendorId)) {
      errors.push(`Missing public printer pricing for ${vendorId}.`);
    }
  }

  if (options.enforceFreshness && !options.skipFreshness) {
    const report = buildPrinterPricingRefreshReport(catalog, options.now ?? new Date());
    errors.push(...report.staleSources.map((source) => `${source.sourceLabel} source is stale.`));
    errors.push(...report.futureDatedSources.map((source) => `${source.sourceLabel} source is future dated.`));
  }

  errors.push(...validatePrinterCouponPolicy());
  errors.push(...validatePrinterCouponOffers(printerCouponOffers, options.now ?? new Date(observedAtIso)));

  return errors;
}

export function validatePrinterCouponPolicy(policy: PrinterCouponPolicy = printerCouponPolicy): string[] {
  const errors: string[] = [];

  if (!policy.collectionModes.includes("retailer-public-coupon-page")) {
    errors.push("Printer coupon policy must allow retailer coupon page collection.");
  }
  if (!policy.collectionModes.includes("coupon-provider-feed")) {
    errors.push("Printer coupon policy must allow coupon provider feed collection.");
  }
  if (!policy.collectionModes.includes("provider-portal-checkout")) {
    errors.push("Printer coupon policy must require provider portal checkout collection.");
  }
  if (!policy.couponProviderFeedAllowed) errors.push("Printer coupon policy must allow coupon provider feeds.");
  if (!policy.retailerCouponScrapeAllowed) errors.push("Printer coupon policy must allow retailer coupon page scraping.");
  if (!policy.providerPortalApplicationRequired) {
    errors.push("Printer coupon policy must require provider portal application proof.");
  }
  if (!policy.couponsAppliedToBestPrice) errors.push("Printer coupon policy must apply verified coupons to best price.");
  if (policy.couponsIncludedInDisplayedPrices !== "only-after-provider-portal-application") {
    errors.push("Printer coupon policy must include coupons only after provider portal application.");
  }
  if (policy.defaultAppliedDiscountCents !== 0) {
    errors.push("Printer coupon policy must keep default applied discounts at zero.");
  }
  for (const requiredField of ["coupon provider API credentials", "coupon expiration", "promo code application proof"]) {
    if (!policy.blockedFields.includes(requiredField)) {
      errors.push(`Printer coupon policy must block ${requiredField}.`);
    }
  }
  for (const requiredEvidence of ["provider portal checkout subtotal after coupon application", "same product, quantity, fulfillment mode, and account state"]) {
    if (!policy.requiredEvidence.includes(requiredEvidence)) {
      errors.push(`Printer coupon policy must require ${requiredEvidence}.`);
    }
  }

  return errors;
}

export function validatePrinterCouponOffers(
  offers: PrinterCouponOffer[] = printerCouponOffers,
  now: Date = new Date(observedAtIso)
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const vendors = new Set(offers.map((offer) => offer.vendorId));

  for (const offer of offers) {
    if (ids.has(offer.id)) errors.push(`Duplicate printer coupon id: ${offer.id}`);
    ids.add(offer.id);
    if (!offer.code.trim()) errors.push(`Printer coupon ${offer.id} must include a code.`);
    if (offer.discountPercent <= 0 || offer.discountPercent > 100) {
      errors.push(`Printer coupon ${offer.id} must have a percent discount from 1 to 100.`);
    }
    if (!offer.source.url.startsWith("https://")) {
      errors.push(`Printer coupon ${offer.id} must cite an HTTPS source.`);
    }
    if (new Date(offer.startsAtIso).getTime() > new Date(offer.endsAtIso).getTime()) {
      errors.push(`Printer coupon ${offer.id} must start before it ends.`);
    }
    if (offer.evidenceStatus === "provider-portal-applied" && !isPrinterCouponActive(offer, now)) {
      errors.push(`Printer coupon ${offer.id} cannot be portal-applied after expiration.`);
    }
  }

  for (const vendorId of ["walgreens", "cvs"] satisfies VendorId[]) {
    if (!vendors.has(vendorId)) errors.push(`Missing printer coupon source observation for ${vendorId}.`);
  }

  return errors;
}

const maxPrinterPricingAgeDays = 30;
const dayInMs = 24 * 60 * 60 * 1000;

function buildSourceFreshness(
  source: PrinterPricingSource,
  observationIds: string[],
  now: Date
): PrinterPricingSourceFreshness {
  const observedAt = new Date(source.observedAtIso);
  const ageDays = Math.floor((now.getTime() - observedAt.getTime()) / dayInMs);
  const status: PrinterPricingFreshnessStatus =
    ageDays < 0 ? "future-dated" : ageDays > maxPrinterPricingAgeDays ? "stale" : "fresh";

  return {
    sourceLabel: source.label,
    url: source.url,
    observedAtIso: source.observedAtIso,
    ageDays,
    status,
    observationIds
  };
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCouponDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function speedRank(speed: PrinterPricingSpeed): number {
  const ranks: Record<PrinterPricingSpeed, number> = {
    "same-day": 1,
    "24-hour": 2,
    "ships-in-days": 3,
    "manual-confirm": 4
  };
  return ranks[speed];
}
