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
export type PrinterCouponPortalApplicationPacketStatus =
  | "portal-evidence-required"
  | "provider-portal-applied"
  | "expired"
  | "no-price-target";
export type PrinterCouponCollectionTargetRole = "coupon-source" | "print-entrypoint" | "provider-feed";
export type PrinterCouponCollectionReadiness = "ready-public-page" | "credential-gated";
export type PrinterCouponFulfillmentMode = "pickup" | "shipping";
export type PrinterCouponAccountState = "logged-in" | "guest-or-public";
export type PrinterCouponSourceAuthority = "official-retailer" | "credentialed-coupon-provider";
export type PrinterCouponCollectionMethod = "server-fetch-html" | "rendered-browser-read" | "provider-api-feed";
export type PrinterCouponValidationProviderAuthority = "official-developer-api";
export type PrinterCouponValidationProviderReadiness = "credential-gated";

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
  couponCollectionTargetCount: number;
  couponProviderTargetCount: number;
  retailerCouponCollectionTargetCount: number;
  couponOfferCount: number;
  activeCouponOfferCount: number;
  portalAppliedCouponOfferCount: number;
  couponPortalApplicationPacketCount: number;
  couponPortalApplicationTargetCount: number;
  freshSources: number;
  staleSources: PrinterPricingSourceFreshness[];
  futureDatedSources: PrinterPricingSourceFreshness[];
  collectionRules: PrinterPricingCollectionRule[];
  couponSources: PrinterCouponSource[];
  couponOffers: PrinterCouponOffer[];
  couponPortalApplicationPackets: PrinterCouponPortalApplicationPacket[];
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
  authority: PrinterCouponSourceAuthority;
  preferredCollectionMethod: PrinterCouponCollectionMethod;
  notes: string;
  confirmationUrls?: string[];
}

export interface PrinterCouponCollectionTarget {
  id: string;
  label: string;
  vendorIds: VendorId[];
  mode: PrinterCouponCollectionMode;
  role: PrinterCouponCollectionTargetRole;
  readiness: PrinterCouponCollectionReadiness;
  url: string;
  collectionMethod: PrinterCouponCollectionMethod;
  credentialEnvKeys: string[];
  sourceProvider: "retailer" | "affiliate-provider";
  maxAgeHours: number;
  expectedOfferCodes: string[];
  extractHints: string[];
  verificationSignals: string[];
  staticHtmlSignalAllowed: boolean;
  browserRenderProofRequired: boolean;
  legalReviewRequired: boolean;
  blockedFields: string[];
  noNetworkRuntime: true;
}

export interface PrinterCouponValidationProvider {
  id: string;
  label: string;
  vendorIds: VendorId[];
  authority: PrinterCouponValidationProviderAuthority;
  readiness: PrinterCouponValidationProviderReadiness;
  docsUrl: string;
  endpoint: string;
  credentialEnvKeys: string[];
  requestFields: string[];
  responseEvidenceFields: string[];
  bestPriceEvidenceRule: string;
  blockedFields: string[];
  legalReviewRequired: true;
  noNetworkRuntime: true;
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
  sourceTargetIds: string[];
  evidenceStatus: PrinterCouponEvidenceStatus;
  portalApplicationEvidence?: PrinterCouponPortalApplicationEvidence;
  requiresLoggedInAccount: boolean;
  excludes: string[];
}

export interface PrinterCouponPortalApplicationEvidence {
  observedAtIso: string;
  portalUrl: string;
  providerPortal: true;
  sourcePriceObservationId: string;
  subtotalBeforeCouponCents: number;
  discountCents: number;
  subtotalAfterCouponCents: number;
  cartTerms: PrinterCouponCartTerms;
  sameCartTermsProven: true;
  noOrderPlaced: true;
  blockedFields: string[];
}

export interface PrinterCouponPortalApplicationTarget {
  sourcePriceObservationId: string;
  vendorName: string;
  productName: string;
  portalUrl: string;
  subtotalBeforeCouponCents: number;
  subtotalBeforeCouponLabel: string;
  expectedDiscountCents: number;
  expectedDiscountLabel: string;
  expectedSubtotalAfterCouponCents: number;
  expectedSubtotalAfterCouponLabel: string;
  cartTerms: PrinterCouponCartTerms;
  sameCartTermsEvidenceRequired: true;
}

export interface PrinterCouponPortalApplicationPacket {
  id: string;
  offerId: string;
  vendorId: VendorId;
  code: string;
  label: string;
  status: PrinterCouponPortalApplicationPacketStatus;
  evidenceStatus: PrinterCouponEvidenceStatus;
  discountPercent: number;
  startsAtIso: string;
  endsAtIso: string;
  requiresLoggedInAccount: boolean;
  sourceTargetIds: string[];
  providerPortalUrls: string[];
  applicationTargets: PrinterCouponPortalApplicationTarget[];
  requiredEvidence: string[];
  operatorSteps: string[];
  blockedFields: string[];
  liveCheckoutAutomation: false;
  noOrderPlacedRequired: true;
  canAffectBestPrice: boolean;
  reason: string;
}

export interface PrinterCouponCollectionPlan {
  vendorId: VendorId;
  quantity: number;
  collectionTargetIds: string[];
  providerFeedTargetIds: string[];
  retailerCouponTargetIds: string[];
  printEntrypointTargetIds: string[];
  credentialEnvKeys: string[];
  candidateOfferCodes: string[];
  portalApplicationPacketIds: string[];
  providerFeedTargets: PrinterCouponCollectionTarget[];
  retailerCouponTargets: PrinterCouponCollectionTarget[];
  printEntrypointTargets: PrinterCouponCollectionTarget[];
  portalApplicationPackets: PrinterCouponPortalApplicationPacket[];
  couponPolicy: PrinterCouponPolicy;
  bestPriceRequiresProviderPortalEvidence: true;
  canAffectBestPriceBeforePortalEvidence: false;
  noNetworkRuntime: true;
  operatorSteps: string[];
}

export interface PrinterCouponCartTerms {
  vendorId: VendorId;
  productKind: PrinterProductKind;
  size: "5x7";
  pricedQuantity: number;
  fulfillmentMode: PrinterCouponFulfillmentMode;
  accountState: PrinterCouponAccountState;
}

export interface PrinterCouponExtractionInput {
  vendorId: VendorId;
  source: PrinterCouponSource;
  documentText: string;
  observedAtIso?: string;
}

export interface PrinterCouponSourceEvidence {
  vendorId: VendorId;
  code: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceMode: PrinterCouponCollectionMode;
  sourceAuthority: PrinterCouponSourceAuthority;
  sourceType: "official-retailer-public-page" | "credentialed-coupon-provider-feed";
  observedAtIso: string;
  rawSnippet: string;
  rawSnippetHash: string;
  matchedTerms: string[];
}

export interface PrinterCouponIgnoredSignal {
  vendorId: VendorId;
  code: string;
  label: string;
  sourceUrl: string;
  observedAtIso: string;
  rawSnippet: string;
  rawSnippetHash: string;
  activeAtCollection: boolean;
  reason: "expired-before-collection" | "unsupported-product-scope" | "unpaired-promo-code-terms";
}

export interface PrinterCouponExtractionResult {
  vendorId: VendorId;
  source: PrinterCouponSource;
  extractedAtIso: string;
  offers: PrinterCouponOffer[];
  sourceEvidence: PrinterCouponSourceEvidence[];
  ignoredSignals: PrinterCouponIgnoredSignal[];
  warnings: string[];
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

export interface PrinterCouponApplicationOptions {
  pricedQuantity?: number;
}

export interface PrinterCouponPortalApplicationPacketOptions {
  quantity?: number;
  now?: Date;
  catalog?: PrinterPriceObservation[];
  offers?: PrinterCouponOffer[];
}

export interface PrinterCouponCollectionPlanOptions extends PrinterCouponPortalApplicationPacketOptions {
  targets?: PrinterCouponCollectionTarget[];
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
    "structured provider portal application evidence",
    "same product, quantity, fulfillment mode, and account state",
    "official coupon-validation API or provider portal cart proof for exact product details"
  ],
  confirmationCopy:
    "Coupons are collected and tested during provider-portal pricing; best-price ranking uses a coupon only after the portal applies it to the same product, quantity, fulfillment mode, and account state."
};

export const printerCouponValidationProviders: PrinterCouponValidationProvider[] = [
  {
    id: "walgreens-native-photo-coupon-validation",
    label: "Walgreens Native Photo Prints coupon validation API",
    vendorIds: ["walgreens"],
    authority: "official-developer-api",
    readiness: "credential-gated",
    docsUrl: "https://developer.walgreens.com/sites/default/files/v3_Native_PhotoPrintsAPI.html",
    endpoint: "https://services.walgreens.com/api/photo/order/coupon/v3",
    credentialEnvKeys: ["WALGREENS_API_KEY", "WALGREENS_AFFILIATE_ID"],
    requestFields: [
      "apiKey",
      "affId",
      "couponCode",
      "act=getdiscount",
      "appVer",
      "devInf",
      "productDetails[].productId",
      "productDetails[].qty"
    ],
    responseEvidenceFields: ["status", "orderTotalPrice", "orderDiscountPrice", "err", "errDesc"],
    bestPriceEvidenceRule:
      "Can affect best-price ranking only after certified server-side validation proves the coupon against exact productDetails[] and no order submission occurs.",
    blockedFields: ["client credentials", "uncertified API calls", "image upload", "payment submission", "live order placement"],
    legalReviewRequired: true,
    noNetworkRuntime: true,
    notes:
      "Official Walgreens developer path for exact-cart coupon validation; public Walgreens/CVS coupon pages and coupon feeds remain discovery evidence until same-cart validation exists."
  }
];

export const printerCouponSources = {
  walgreensPhotoDeals: {
    label: "Walgreens Photo coupon codes and promo terms",
    url: "https://photo.walgreens.com/store/deals?tab=photo_downsplash_top",
    observedAtIso,
    mode: "retailer-public-coupon-page",
    authority: "official-retailer",
    preferredCollectionMethod: "server-fetch-html",
    notes:
      "Official Walgreens Photo deals page listed active card and stationery coupon terms; code must be entered in the logged-in photo account, kiosk, or mobile checkout.",
    confirmationUrls: [
      printerPricingSources.walgreensProductCatalog.url,
      "https://photo.walgreens.com/store/cards?tab=Photo_Deals2",
      "https://photo.walgreens.com/store/cards?tab=PhotoNav%7CSameDayPickup%7CAllCards"
    ]
  },
  cvsPhotoCoupons: {
    label: "CVS Photo coupons and promo terms",
    url: "https://www.cvs.com/photo/cvs-photo-coupons?cid=cvs-home-s5-shop-photo",
    observedAtIso,
    mode: "retailer-public-coupon-page",
    authority: "official-retailer",
    preferredCollectionMethod: "server-fetch-html",
    notes:
      "Official CVS Photo coupons page listed sitewide photo coupon terms; code must be entered at checkout and only one discount may apply per item.",
    confirmationUrls: [printerPricingSources.cvsFoldedDesignDetail.url, "https://www.cvs.com/photo/prints", "https://www.cvs.com/photo/cards"]
  },
  fmtcProviderFeed: {
    label: "FMTC Deal Feed provider coupon API",
    url: "https://docs.fmtc.co/kb/deals-4-2-0",
    observedAtIso,
    mode: "coupon-provider-feed",
    authority: "credentialed-coupon-provider",
    preferredCollectionMethod: "provider-api-feed",
    notes:
      "Recommended provider-feed candidate for discovery and affiliate metadata; provider-fed coupons must still be confirmed against official retailer pages or checkout before discounting."
  },
  rakutenCouponFeed: {
    label: "Rakuten Advertising Coupon Feed API",
    url: "https://pubhelp.rakutenadvertising.com/hc/en-us/articles/5949828511757-Coupon-Feed-API",
    observedAtIso,
    mode: "coupon-provider-feed",
    authority: "credentialed-coupon-provider",
    preferredCollectionMethod: "provider-api-feed",
    notes:
      "Credentialed publisher coupon feed candidate; Rakuten validates coupon and promotional link data, but retailer page or checkout evidence is still required before discounting."
  }
} satisfies Record<string, PrinterCouponSource>;

export const printerCouponCollectionTargets: PrinterCouponCollectionTarget[] = [
  {
    id: "walgreens-photo-official-deals",
    label: "Walgreens Photo official deals page",
    vendorIds: ["walgreens"],
    mode: "retailer-public-coupon-page",
    role: "coupon-source",
    readiness: "ready-public-page",
    url: printerCouponSources.walgreensPhotoDeals.url,
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
  },
  {
    id: "walgreens-photo-card-design-entrypoint",
    label: "Walgreens Photo 5x7 folded card design-detail print entrypoint",
    vendorIds: ["walgreens"],
    mode: "retailer-public-coupon-page",
    role: "print-entrypoint",
    readiness: "ready-public-page",
    url: printerCouponSources.walgreensPhotoDeals.confirmationUrls![0],
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
  },
  {
    id: "cvs-photo-official-coupons",
    label: "CVS Photo official coupon page",
    vendorIds: ["cvs"],
    mode: "retailer-public-coupon-page",
    role: "coupon-source",
    readiness: "ready-public-page",
    url: printerCouponSources.cvsPhotoCoupons.url,
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
  },
  {
    id: "cvs-photo-card-design-entrypoint",
    label: "CVS Photo 5x7 folded greeting card design-detail print entrypoint",
    vendorIds: ["cvs"],
    mode: "retailer-public-coupon-page",
    role: "print-entrypoint",
    readiness: "ready-public-page",
    url: printerCouponSources.cvsPhotoCoupons.confirmationUrls![0],
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
  },
  {
    id: "fmtc-deal-feed",
    label: "FMTC Deal Feed provider API",
    vendorIds: ["walgreens", "cvs"],
    mode: "coupon-provider-feed",
    role: "provider-feed",
    readiness: "credential-gated",
    url: printerCouponSources.fmtcProviderFeed.url,
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
    url: printerCouponSources.rakutenCouponFeed.url,
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

export const printerCouponOffers: PrinterCouponOffer[] = [
  {
    id: "walgreens-crispcard-cards-2026-06-13",
    vendorId: "walgreens",
    label: "60% off All Photo Cards and Premium Stationery",
    code: "CRISPCARD",
    discountPercent: 60,
    appliesToProductKinds: ["folded-card", "flat-card", "photo-card", "premium-card"],
    startsAtIso: "2026-06-07T00:00:00.000-05:00",
    endsAtIso: "2026-06-13T23:59:00.000-05:00",
    source: printerCouponSources.walgreensPhotoDeals,
    sourceTargetIds: ["walgreens-photo-official-deals", "walgreens-photo-card-design-entrypoint"],
    evidenceStatus: "source-listed",
    requiresLoggedInAccount: true,
    excludes: ["previous purchases", "taxes", "shipping charges", "account product credits"]
  },
  {
    id: "cvs-junesw-sitewide-photo-2026-06-20",
    vendorId: "cvs",
    label: "50% off Sitewide Photo",
    code: "JUNESW",
    discountPercent: 50,
    appliesToProductKinds: ["folded-card", "flat-card", "photo-card", "premium-card"],
    startsAtIso: "2026-06-07T00:01:00.000-04:00",
    endsAtIso: "2026-06-20T23:59:00.000-04:00",
    source: printerCouponSources.cvsPhotoCoupons,
    sourceTargetIds: ["cvs-photo-official-coupons", "cvs-photo-card-design-entrypoint"],
    evidenceStatus: "source-listed",
    requiresLoggedInAccount: false,
    excludes: [
      "additional photo book pages",
      "eight-gigabyte photo USB drives",
      "Erin Condren licensed planners",
      "NFL licensed products",
      "shipping charges",
      "tax"
    ]
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
  const { normalizedQuantity, pricedQuantity, subtotalCents } = buildPrinterSubtotalTerms(observation, quantity);
  const couponApplication = buildPrinterCouponApplication(
    observation,
    subtotalCents,
    options.now ?? new Date(observedAtIso),
    options.couponOffers ?? printerCouponOffers,
    { pricedQuantity }
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
      "Public printer prices are review-only observations, not live quotes. Apply available coupons only after the same cart is opened and verified, then confirm tax, pickup window, and stock before upload.",
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
  const couponPortalApplicationPackets = buildPrinterCouponPortalApplicationPackets({ catalog, offers: printerCouponOffers, now });

  return {
    generatedAtIso: now.toISOString(),
    maxAgeDays: maxPrinterPricingAgeDays,
    totalObservations: catalog.length,
    sourceCount: sourceMap.size,
    couponSourceCount: Object.keys(printerCouponSources).length,
    couponCollectionTargetCount: printerCouponCollectionTargets.length,
    couponProviderTargetCount: printerCouponCollectionTargets.filter((target) => target.role === "provider-feed").length,
    retailerCouponCollectionTargetCount: printerCouponCollectionTargets.filter((target) => target.sourceProvider === "retailer").length,
    couponOfferCount: printerCouponOffers.length,
    activeCouponOfferCount: activeCouponOffers.length,
    portalAppliedCouponOfferCount: portalAppliedCouponOffers.length,
    couponPortalApplicationPacketCount: couponPortalApplicationPackets.length,
    couponPortalApplicationTargetCount: couponPortalApplicationPackets.reduce(
      (total, packet) => total + packet.applicationTargets.length,
      0
    ),
    freshSources: freshness.filter((source) => source.status === "fresh").length,
    staleSources,
    futureDatedSources,
    collectionRules: printerPricingCollectionRules,
    couponSources: Object.values(printerCouponSources),
    couponOffers: printerCouponOffers,
    couponPortalApplicationPackets,
    couponPolicy: printerCouponPolicy,
    blockers,
    canShowComparison: blockers.length === 0,
    liveQuote: false,
    disclaimer:
      "Pricing collection uses official public pages plus coupon-source evidence; coupon discounts are applied only after provider-portal application proof, and taxes, stock, pickup windows, payments, and live order placement remain excluded."
  };
}

export function buildPrinterCouponCollectionPlan(
  vendorId: VendorId,
  options: PrinterCouponCollectionPlanOptions = {}
): PrinterCouponCollectionPlan {
  const quantity = Math.max(Math.round(options.quantity ?? 1), 1);
  const now = options.now ?? new Date(observedAtIso);
  const targets = (options.targets ?? printerCouponCollectionTargets).filter((target) => target.vendorIds.includes(vendorId));
  const providerFeedTargets = targets.filter((target) => target.role === "provider-feed");
  const retailerCouponTargets = targets.filter((target) => target.role === "coupon-source");
  const printEntrypointTargets = targets.filter((target) => target.role === "print-entrypoint");
  const offers = (options.offers ?? printerCouponOffers).filter(
    (offer) => offer.vendorId === vendorId && isPrinterCouponActive(offer, now)
  );
  const portalApplicationPackets = buildPrinterCouponPortalApplicationPackets({
    catalog: options.catalog,
    offers: options.offers ?? printerCouponOffers,
    quantity,
    now
  }).filter((packet) => packet.vendorId === vendorId && packet.status !== "expired");
  const credentialEnvKeys = [...new Set(providerFeedTargets.flatMap((target) => target.credentialEnvKeys))];
  const candidateOfferCodes = [...new Set(offers.map((offer) => offer.code))];

  return {
    vendorId,
    quantity,
    collectionTargetIds: targets.map((target) => target.id),
    providerFeedTargetIds: providerFeedTargets.map((target) => target.id),
    retailerCouponTargetIds: retailerCouponTargets.map((target) => target.id),
    printEntrypointTargetIds: printEntrypointTargets.map((target) => target.id),
    credentialEnvKeys,
    candidateOfferCodes,
    portalApplicationPacketIds: portalApplicationPackets.map((packet) => packet.id),
    providerFeedTargets,
    retailerCouponTargets,
    printEntrypointTargets,
    portalApplicationPackets,
    couponPolicy: printerCouponPolicy,
    bestPriceRequiresProviderPortalEvidence: true,
    canAffectBestPriceBeforePortalEvidence: false,
    noNetworkRuntime: true,
    operatorSteps: buildPrinterCouponCollectionOperatorSteps(
      vendorId,
      providerFeedTargets,
      retailerCouponTargets,
      printEntrypointTargets,
      candidateOfferCodes,
      portalApplicationPackets
    )
  };
}

export function buildPrinterCouponPortalApplicationPackets(
  options: PrinterCouponPortalApplicationPacketOptions = {}
): PrinterCouponPortalApplicationPacket[] {
  const catalog = options.catalog ?? printerPriceCatalog;
  const offers = options.offers ?? printerCouponOffers;
  const quantity = options.quantity ?? 1;
  const now = options.now ?? new Date(observedAtIso);

  return offers.map((offer) => buildPrinterCouponPortalApplicationPacket(offer, catalog, quantity, now));
}

function buildPrinterCouponCollectionOperatorSteps(
  vendorId: VendorId,
  providerFeedTargets: PrinterCouponCollectionTarget[],
  retailerCouponTargets: PrinterCouponCollectionTarget[],
  printEntrypointTargets: PrinterCouponCollectionTarget[],
  candidateOfferCodes: string[],
  portalApplicationPackets: PrinterCouponPortalApplicationPacket[]
): string[] {
  const providerFeedStep =
    providerFeedTargets.length > 0
      ? `Run credentialed coupon provider feed targets first when approved server/operator credentials exist: ${providerFeedTargets.map((target) => target.id).join(", ")}.`
      : `No credentialed coupon provider feed target is registered for ${vendorId}; do not invent third-party coupon candidates.`;
  const retailerStep =
    retailerCouponTargets.length + printEntrypointTargets.length > 0
      ? `Collect official retailer coupon-page evidence and rendered print-link evidence from: ${[
          ...retailerCouponTargets,
          ...printEntrypointTargets
        ].map((target) => target.id).join(", ")}.`
      : `No official retailer coupon target is registered for ${vendorId}; record no source-listed coupon before ranking.`;
  const candidateStep =
    candidateOfferCodes.length > 0
      ? `Apply candidate coupon code(s) ${candidateOfferCodes.join(", ")} in the same provider portal cart during pricing collection.`
      : "If provider-feed or retailer collection returns a candidate code, apply it only inside the same provider portal cart during pricing collection.";
  const packetStep =
    portalApplicationPackets.length > 0
      ? `Fill provider-portal application packet(s) before any discount can affect best available price: ${portalApplicationPackets.map((packet) => packet.id).join(", ")}.`
      : "Do not discount the best available price until structured provider-portal evidence is attached for the same product, quantity, fulfillment mode, account state, and subtotal math.";

  return [
    providerFeedStep,
    retailerStep,
    candidateStep,
    packetStep,
    "Stop before upload, payment, pickup-slot reservation, or live order placement while collecting coupon pricing evidence."
  ];
}

export function buildPrinterCouponPortalApplicationPacket(
  offer: PrinterCouponOffer,
  catalog: PrinterPriceObservation[] = printerPriceCatalog,
  quantity = 1,
  now: Date = new Date(observedAtIso)
): PrinterCouponPortalApplicationPacket {
  const matchingObservations = catalog.filter(
    (observation) => observation.vendorId === offer.vendorId && offer.appliesToProductKinds.includes(observation.productKind)
  );
  const applicationTargets = matchingObservations.map((observation) =>
    buildPrinterCouponPortalApplicationTarget(offer, observation, quantity)
  );
  const active = isPrinterCouponActive(offer, now);
  const hasAppliedEvidence = matchingObservations.some((observation) => {
    const target = applicationTargets.find((candidate) => candidate.sourcePriceObservationId === observation.id);
    return target
      ? hasMatchingProviderPortalCouponEvidence(offer, observation, target.subtotalBeforeCouponCents, target.cartTerms.pricedQuantity)
      : false;
  });
  const status: PrinterCouponPortalApplicationPacketStatus = !active
    ? "expired"
    : applicationTargets.length === 0
      ? "no-price-target"
      : hasAppliedEvidence
        ? "provider-portal-applied"
        : "portal-evidence-required";

  return {
    id: `${offer.id}-portal-application-packet`,
    offerId: offer.id,
    vendorId: offer.vendorId,
    code: offer.code,
    label: offer.label,
    status,
    evidenceStatus: offer.evidenceStatus,
    discountPercent: offer.discountPercent,
    startsAtIso: offer.startsAtIso,
    endsAtIso: offer.endsAtIso,
    requiresLoggedInAccount: offer.requiresLoggedInAccount,
    sourceTargetIds: offer.sourceTargetIds,
    providerPortalUrls: buildProviderPortalUrlsForCouponOffer(offer, matchingObservations),
    applicationTargets,
    requiredEvidence: [
      ...printerCouponPolicy.requiredEvidence,
      "source price observation id",
      "coupon subtotal before and after application",
      "no payment or order submission"
    ],
    operatorSteps: buildPrinterCouponPortalApplicationSteps(offer),
    blockedFields: ["payment submission", "live order placement", "card upload", "tax finalization", "pickup slot reservation"],
    liveCheckoutAutomation: false,
    noOrderPlacedRequired: true,
    canAffectBestPrice: status === "provider-portal-applied",
    reason: buildPrinterCouponPortalApplicationPacketReason(status, offer)
  };
}

export function validatePrinterCouponPortalApplicationPackets(
  packets: PrinterCouponPortalApplicationPacket[] = buildPrinterCouponPortalApplicationPackets()
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const packet of packets) {
    if (ids.has(packet.id)) errors.push(`Duplicate printer coupon portal application packet: ${packet.id}`);
    ids.add(packet.id);
    if (!packet.offerId.trim()) errors.push(`Printer coupon portal application packet ${packet.id} must name an offer id.`);
    if (!packet.code.trim()) errors.push(`Printer coupon portal application packet ${packet.id} must name a coupon code.`);
    if (packet.liveCheckoutAutomation) {
      errors.push(`Printer coupon portal application packet ${packet.id} must not enable checkout automation.`);
    }
    if (!packet.noOrderPlacedRequired) {
      errors.push(`Printer coupon portal application packet ${packet.id} must require no-order evidence.`);
    }
    if (packet.canAffectBestPrice !== (packet.status === "provider-portal-applied")) {
      errors.push(`Printer coupon portal application packet ${packet.id} best-price flag must match portal-applied status.`);
    }
    for (const field of ["payment submission", "live order placement"]) {
      if (!packet.blockedFields.includes(field)) {
        errors.push(`Printer coupon portal application packet ${packet.id} must block ${field}.`);
      }
    }
    for (const requiredEvidence of ["structured provider portal application evidence", "same product, quantity, fulfillment mode, and account state"]) {
      if (!packet.requiredEvidence.includes(requiredEvidence)) {
        errors.push(`Printer coupon portal application packet ${packet.id} must require ${requiredEvidence}.`);
      }
    }
    if (packet.status === "portal-evidence-required" && packet.applicationTargets.length === 0) {
      errors.push(`Printer coupon portal application packet ${packet.id} must include cart targets while evidence is required.`);
    }
    for (const target of packet.applicationTargets) {
      if (!target.portalUrl.startsWith("https://")) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must cite HTTPS portal URL.`);
      }
      if (target.subtotalBeforeCouponCents <= 0) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must have a positive subtotal.`);
      }
      if (target.expectedDiscountCents <= 0) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must have a positive expected discount.`);
      }
      if (target.expectedSubtotalAfterCouponCents < 0) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must not have a negative expected subtotal.`);
      }
      if (target.subtotalBeforeCouponCents - target.expectedDiscountCents !== target.expectedSubtotalAfterCouponCents) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} subtotal math must match.`);
      }
      if (!target.sameCartTermsEvidenceRequired) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must require same-cart evidence.`);
      }
      if (target.cartTerms.vendorId !== packet.vendorId) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must match packet vendor.`);
      }
      if (target.cartTerms.pricedQuantity < 1) {
        errors.push(`Printer coupon portal application packet ${packet.id} target ${target.sourcePriceObservationId} must include positive quantity.`);
      }
    }
  }

  return errors;
}

export function buildPrinterCouponApplication(
  observation: PrinterPriceObservation,
  subtotalCents: number,
  now: Date = new Date(observedAtIso),
  offers: PrinterCouponOffer[] = printerCouponOffers,
  options: PrinterCouponApplicationOptions = {}
): PrinterCouponApplication {
  const pricedQuantity = options.pricedQuantity ?? observation.minimumQuantity;
  const applicableOffers = offers.filter(
    (offer) => offer.vendorId === observation.vendorId && offer.appliesToProductKinds.includes(observation.productKind)
  );
  const activeOffers = applicableOffers.filter((offer) => isPrinterCouponActive(offer, now));
  const portalAppliedOffers = activeOffers
    .filter((offer) => hasMatchingProviderPortalCouponEvidence(offer, observation, subtotalCents, pricedQuantity))
    .sort((first, second) => second.discountPercent - first.discountPercent);

  if (portalAppliedOffers[0]) {
    const offer = portalAppliedOffers[0];
    const discountCents = offer.portalApplicationEvidence!.discountCents;
    const discountedSubtotalCents = offer.portalApplicationEvidence!.subtotalAfterCouponCents;

    return {
      status: "applied",
      offer,
      discountCents,
      discountedSubtotalCents,
      discountedSubtotalLabel: formatCents(discountedSubtotalCents),
      evidenceRequired: [],
      reason: `${offer.code} applied in provider portal with matching cart terms`
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
      reason: `${activeOffer.code} found; apply and verify same cart terms in provider portal before ranking as best available`
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

export function extractPrinterCouponOffers(input: PrinterCouponExtractionInput): PrinterCouponExtractionResult {
  const text = normalizeCouponDocumentText(input.documentText);
  const extractedAtIso = input.observedAtIso ?? observedAtIso;
  const offers =
    input.vendorId === "walgreens"
      ? extractWalgreensCouponOffers(text, input.source, extractedAtIso)
      : input.vendorId === "cvs"
        ? extractCvsCouponOffers(text, input.source, extractedAtIso)
        : [];
  const ignoredSignals = input.vendorId === "cvs" ? extractIgnoredCvsCouponSignals(text, input.source, extractedAtIso, offers) : [];

  return {
    vendorId: input.vendorId,
    source: input.source,
    extractedAtIso,
    offers,
    sourceEvidence: offers.map((offer) => buildPrinterCouponSourceEvidence(offer, text, extractedAtIso)),
    ignoredSignals,
    warnings: offers.length === 0 ? [`No supported coupon offer found for ${input.vendorId}.`] : []
  };
}

export function extractPrinterCouponCodes(documentText: string): string[] {
  const text = normalizeCouponCodeSearchText(documentText);
  const patterns = [
    /[Cc]oupon\s+[Cc]ode:\s*([A-Z][A-Z0-9]{2,})/g,
    /[Pp]romo\s+[Cc]ode:\s*([A-Z][A-Z0-9]{2,})/g,
    /[Pp]romo\s+[Cc]ode\s+([A-Z][A-Z0-9]{2,})/g,
    /[Ee]nter\s+[Cc]ode\s+([A-Z][A-Z0-9]{2,})/g,
    /[Mm]ust\s+[Uu]se\s+[Cc]ode\s+([A-Z][A-Z0-9]{2,})/g,
    /[Cc]ode\s+([A-Z][A-Z0-9]{2,})\s+(?:[Aa]t\s+[Cc]heckout|[Tt]o\s+[Rr]eceive|[Tt]hru|[Tt]hrough)/g
  ];
  const codes = patterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1]?.trim()).filter(Boolean));

  return [...new Set(codes)].sort();
}

export function isPrinterCouponActive(offer: PrinterCouponOffer, now: Date = new Date(observedAtIso)): boolean {
  const startsAt = new Date(offer.startsAtIso).getTime();
  const endsAt = new Date(offer.endsAtIso).getTime();
  const current = now.getTime();

  return startsAt <= current && current <= endsAt;
}

export function hasMatchingProviderPortalCouponEvidence(
  offer: PrinterCouponOffer,
  observation: PrinterPriceObservation,
  subtotalCents: number,
  pricedQuantity = observation.minimumQuantity
): boolean {
  const evidence = offer.portalApplicationEvidence;
  if (offer.evidenceStatus !== "provider-portal-applied" || !evidence) return false;
  if (validatePrinterCouponPortalApplicationEvidence(offer).length > 0) return false;

  const expectedDiscountCents = Math.floor((subtotalCents * offer.discountPercent) / 100);
  const expectedAfterCouponCents = Math.max(subtotalCents - expectedDiscountCents, 0);
  const expectedFulfillmentMode: PrinterCouponFulfillmentMode = observation.pickupEligible ? "pickup" : "shipping";
  const expectedAccountState: PrinterCouponAccountState = offer.requiresLoggedInAccount ? "logged-in" : evidence.cartTerms.accountState;

  return (
    evidence.sourcePriceObservationId === observation.id &&
    evidence.subtotalBeforeCouponCents === subtotalCents &&
    evidence.discountCents === expectedDiscountCents &&
    evidence.subtotalAfterCouponCents === expectedAfterCouponCents &&
    evidence.cartTerms.vendorId === observation.vendorId &&
    evidence.cartTerms.productKind === observation.productKind &&
    evidence.cartTerms.size === observation.size &&
    evidence.cartTerms.pricedQuantity === pricedQuantity &&
    evidence.cartTerms.fulfillmentMode === expectedFulfillmentMode &&
    evidence.cartTerms.accountState === expectedAccountState
  );
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
  errors.push(...validatePrinterCouponSources());
  errors.push(...validatePrinterCouponCollectionTargets());
  errors.push(...validatePrinterCouponOffers(printerCouponOffers, options.now ?? new Date(observedAtIso)));
  errors.push(...validatePrinterCouponPortalApplicationPackets());

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
  for (const requiredEvidence of [
    "provider portal checkout subtotal after coupon application",
    "structured provider portal application evidence",
    "same product, quantity, fulfillment mode, and account state"
  ]) {
    if (!policy.requiredEvidence.includes(requiredEvidence)) {
      errors.push(`Printer coupon policy must require ${requiredEvidence}.`);
    }
  }

  return errors;
}

export function validatePrinterCouponSources(sources: PrinterCouponSource[] = Object.values(printerCouponSources)): string[] {
  const errors: string[] = [];

  for (const source of sources) {
    if (!source.url.startsWith("https://")) errors.push(`Printer coupon source ${source.label} must cite an HTTPS URL.`);
    if (source.authority === "official-retailer" && source.preferredCollectionMethod !== "server-fetch-html") {
      errors.push(`Printer coupon source ${source.label} must use server-fetch HTML as its primary public-page collection method.`);
    }
    if (source.authority === "credentialed-coupon-provider" && source.preferredCollectionMethod !== "provider-api-feed") {
      errors.push(`Printer coupon source ${source.label} must use a provider API feed collection method.`);
    }
    if (source.mode === "coupon-provider-feed" && source.authority !== "credentialed-coupon-provider") {
      errors.push(`Printer coupon source ${source.label} must be marked as a credentialed coupon provider.`);
    }
    if (source.mode === "retailer-public-coupon-page" && source.authority !== "official-retailer") {
      errors.push(`Printer coupon source ${source.label} must be marked as an official retailer source.`);
    }
  }

  return errors;
}

export function validatePrinterCouponCollectionTargets(
  targets: PrinterCouponCollectionTarget[] = printerCouponCollectionTargets
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const target of targets) {
    if (ids.has(target.id)) errors.push(`Duplicate printer coupon collection target: ${target.id}`);
    ids.add(target.id);
    if (!target.url.startsWith("https://")) errors.push(`Printer coupon collection target ${target.id} must cite an HTTPS URL.`);
    if (!target.noNetworkRuntime) errors.push(`Printer coupon collection target ${target.id} must stay out of app runtime networking.`);
    if (target.maxAgeHours <= 0) errors.push(`Printer coupon collection target ${target.id} must set a positive max age.`);
    if (target.readiness === "credential-gated" && target.credentialEnvKeys.length === 0) {
      errors.push(`Printer coupon collection target ${target.id} must name credential env keys.`);
    }
    if (target.readiness === "ready-public-page" && target.credentialEnvKeys.length > 0) {
      errors.push(`Printer coupon collection target ${target.id} must not require credentials.`);
    }
    if (target.sourceProvider === "retailer" && !target.legalReviewRequired) {
      errors.push(`Printer coupon collection target ${target.id} must keep legal review attached to retailer scraping.`);
    }
    if (target.sourceProvider === "affiliate-provider" && !target.legalReviewRequired) {
      errors.push(`Printer coupon collection target ${target.id} must keep legal review attached to provider feeds.`);
    }
    if (target.role === "coupon-source" && target.collectionMethod !== "server-fetch-html") {
      errors.push(`Printer coupon collection target ${target.id} must collect official coupon pages with server-fetch HTML.`);
    }
    if (target.role === "print-entrypoint" && target.collectionMethod !== "rendered-browser-read") {
      errors.push(`Printer coupon collection target ${target.id} must require rendered browser reads for print entrypoints.`);
    }
    if (target.role === "print-entrypoint" && !target.browserRenderProofRequired) {
      errors.push(`Printer coupon collection target ${target.id} must require browser render proof for print entrypoints.`);
    }
    if (target.role !== "print-entrypoint" && target.browserRenderProofRequired) {
      errors.push(`Printer coupon collection target ${target.id} must not require browser render proof outside print entrypoints.`);
    }
    if (target.role === "provider-feed" && target.collectionMethod !== "provider-api-feed") {
      errors.push(`Printer coupon collection target ${target.id} must use provider API feed collection.`);
    }
    if (target.sourceProvider === "retailer" && !target.staticHtmlSignalAllowed) {
      errors.push(`Printer coupon collection target ${target.id} must allow static HTML signals for official retailer collection.`);
    }
    if (target.sourceProvider === "affiliate-provider" && target.staticHtmlSignalAllowed) {
      errors.push(`Printer coupon collection target ${target.id} must not treat provider API feeds as static HTML signals.`);
    }
    if (target.sourceProvider === "retailer" && target.expectedOfferCodes.length === 0) {
      errors.push(`Printer coupon collection target ${target.id} must name expected offer codes.`);
    }
    if (target.verificationSignals.length === 0) {
      errors.push(`Printer coupon collection target ${target.id} must include verification signals.`);
    }
    if (target.extractHints.length === 0) errors.push(`Printer coupon collection target ${target.id} must include extraction hints.`);
    if (!target.blockedFields.includes("coupon application proof")) {
      errors.push(`Printer coupon collection target ${target.id} must block coupon application proof.`);
    }
  }

  for (const vendorId of ["walgreens", "cvs"] satisfies VendorId[]) {
    const vendorTargets = targets.filter((target) => target.vendorIds.includes(vendorId));
    if (!vendorTargets.some((target) => target.role === "coupon-source" && target.sourceProvider === "retailer")) {
      errors.push(`Missing official retailer coupon source target for ${vendorId}.`);
    }
    if (!vendorTargets.some((target) => target.role === "print-entrypoint")) {
      errors.push(`Missing print entrypoint coupon confirmation target for ${vendorId}.`);
    }
  }

  if (!targets.some((target) => target.role === "provider-feed" && target.sourceProvider === "affiliate-provider")) {
    errors.push("Missing credential-gated coupon provider feed target.");
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
  const targetById = new Map(printerCouponCollectionTargets.map((target) => [target.id, target]));

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
    if (offer.sourceTargetIds.length < 2) {
      errors.push(`Printer coupon ${offer.id} must cite official source and print-entrypoint targets.`);
    }
    const sourceTargets = offer.sourceTargetIds.map((targetId) => targetById.get(targetId));
    for (let index = 0; index < sourceTargets.length; index += 1) {
      const targetId = offer.sourceTargetIds[index];
      const target = sourceTargets[index];
      if (!target) {
        errors.push(`Printer coupon ${offer.id} cites unknown source target ${targetId}.`);
        continue;
      }
      if (!target.vendorIds.includes(offer.vendorId)) {
        errors.push(`Printer coupon ${offer.id} source target ${target.id} must include vendor ${offer.vendorId}.`);
      }
      if (target.sourceProvider === "retailer" && !target.expectedOfferCodes.includes(offer.code)) {
        errors.push(`Printer coupon ${offer.id} source target ${target.id} must expect code ${offer.code}.`);
      }
    }
    if (!sourceTargets.some((target) => target?.role === "coupon-source" && target.sourceProvider === "retailer")) {
      errors.push(`Printer coupon ${offer.id} must cite an official retailer coupon source target.`);
    }
    if (!sourceTargets.some((target) => target?.role === "print-entrypoint")) {
      errors.push(`Printer coupon ${offer.id} must cite a print-entrypoint confirmation target.`);
    }
    if (new Date(offer.startsAtIso).getTime() > new Date(offer.endsAtIso).getTime()) {
      errors.push(`Printer coupon ${offer.id} must start before it ends.`);
    }
    if (offer.evidenceStatus === "provider-portal-applied" && !isPrinterCouponActive(offer, now)) {
      errors.push(`Printer coupon ${offer.id} cannot be portal-applied after expiration.`);
    }
    if (offer.evidenceStatus === "provider-portal-applied") {
      errors.push(...validatePrinterCouponPortalApplicationEvidence(offer));
    }
    if (offer.evidenceStatus !== "provider-portal-applied" && offer.portalApplicationEvidence) {
      errors.push(`Printer coupon ${offer.id} must not attach portal application evidence before provider-portal-applied status.`);
    }
  }

  for (const vendorId of ["walgreens", "cvs"] satisfies VendorId[]) {
    if (!vendors.has(vendorId)) errors.push(`Missing printer coupon source observation for ${vendorId}.`);
  }

  return errors;
}

export function validatePrinterCouponPortalApplicationEvidence(offer: PrinterCouponOffer): string[] {
  const errors: string[] = [];
  const evidence = offer.portalApplicationEvidence;

  if (!evidence) return [`Printer coupon ${offer.id} must include structured provider portal application evidence.`];
  if (!evidence.portalUrl.startsWith("https://")) {
    errors.push(`Printer coupon ${offer.id} portal evidence must cite an HTTPS provider portal URL.`);
  }
  if (!evidence.providerPortal) errors.push(`Printer coupon ${offer.id} portal evidence must come from a provider portal.`);
  if (!evidence.sameCartTermsProven) {
    errors.push(`Printer coupon ${offer.id} portal evidence must prove same cart terms.`);
  }
  if (!evidence.noOrderPlaced) errors.push(`Printer coupon ${offer.id} portal evidence must preserve no-live-order safety.`);
  if (evidence.subtotalBeforeCouponCents <= 0) {
    errors.push(`Printer coupon ${offer.id} portal evidence must include a positive pre-coupon subtotal.`);
  }
  if (evidence.discountCents <= 0) errors.push(`Printer coupon ${offer.id} portal evidence must include a positive discount.`);
  if (evidence.subtotalAfterCouponCents < 0) {
    errors.push(`Printer coupon ${offer.id} portal evidence must not include a negative post-coupon subtotal.`);
  }
  if (evidence.subtotalBeforeCouponCents - evidence.discountCents !== evidence.subtotalAfterCouponCents) {
    errors.push(`Printer coupon ${offer.id} portal evidence subtotal math must match the applied discount.`);
  }
  if (!evidence.blockedFields.includes("payment submission")) {
    errors.push(`Printer coupon ${offer.id} portal evidence must block payment submission.`);
  }
  if (!evidence.blockedFields.includes("live order placement")) {
    errors.push(`Printer coupon ${offer.id} portal evidence must block live order placement.`);
  }
  if (evidence.cartTerms.vendorId !== offer.vendorId) {
    errors.push(`Printer coupon ${offer.id} portal evidence must match the coupon vendor.`);
  }
  if (!offer.appliesToProductKinds.includes(evidence.cartTerms.productKind)) {
    errors.push(`Printer coupon ${offer.id} portal evidence must match an eligible product kind.`);
  }
  if (evidence.cartTerms.pricedQuantity < 1) {
    errors.push(`Printer coupon ${offer.id} portal evidence must include a positive priced quantity.`);
  }
  if (offer.requiresLoggedInAccount && evidence.cartTerms.accountState !== "logged-in") {
    errors.push(`Printer coupon ${offer.id} portal evidence must match the required logged-in account state.`);
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

function buildPrinterSubtotalTerms(observation: PrinterPriceObservation, quantity: number): {
  normalizedQuantity: number;
  pricedQuantity: number;
  subtotalCents: number;
} {
  const normalizedQuantity = Math.max(Math.round(quantity), 1);
  const pricedQuantity = Math.max(normalizedQuantity, observation.minimumQuantity);
  const subtotalCents =
    observation.startingPackagePriceCents !== undefined && pricedQuantity === observation.minimumQuantity
      ? observation.startingPackagePriceCents
      : pricedQuantity * observation.unitPriceCents;

  return { normalizedQuantity, pricedQuantity, subtotalCents };
}

function buildPrinterCouponPortalApplicationTarget(
  offer: PrinterCouponOffer,
  observation: PrinterPriceObservation,
  quantity: number
): PrinterCouponPortalApplicationTarget {
  const { pricedQuantity, subtotalCents } = buildPrinterSubtotalTerms(observation, quantity);
  const expectedDiscountCents = Math.floor((subtotalCents * offer.discountPercent) / 100);
  const expectedSubtotalAfterCouponCents = Math.max(subtotalCents - expectedDiscountCents, 0);

  return {
    sourcePriceObservationId: observation.id,
    vendorName: observation.vendorName,
    productName: observation.productName,
    portalUrl: observation.source.url,
    subtotalBeforeCouponCents: subtotalCents,
    subtotalBeforeCouponLabel: formatCents(subtotalCents),
    expectedDiscountCents,
    expectedDiscountLabel: formatCents(expectedDiscountCents),
    expectedSubtotalAfterCouponCents,
    expectedSubtotalAfterCouponLabel: formatCents(expectedSubtotalAfterCouponCents),
    cartTerms: {
      vendorId: observation.vendorId,
      productKind: observation.productKind,
      size: observation.size,
      pricedQuantity,
      fulfillmentMode: observation.pickupEligible ? "pickup" : "shipping",
      accountState: offer.requiresLoggedInAccount ? "logged-in" : "guest-or-public"
    },
    sameCartTermsEvidenceRequired: true
  };
}

function buildProviderPortalUrlsForCouponOffer(offer: PrinterCouponOffer, observations: PrinterPriceObservation[]): string[] {
  return [
    ...(offer.source.confirmationUrls ?? []),
    ...observations.map((observation) => observation.source.url)
  ].filter((url, index, urls) => urls.indexOf(url) === index);
}

function buildPrinterCouponPortalApplicationSteps(offer: PrinterCouponOffer): string[] {
  return [
    "Open the exact provider portal URL for the matching price observation.",
    "Select the same 5x7 product, priced quantity, fulfillment mode, and account state named in the packet.",
    offer.requiresLoggedInAccount
      ? "Use an approved logged-in account because the retailer terms require it."
      : "Use guest or public checkout unless the portal requires sign-in before coupon entry.",
    `Enter coupon code ${offer.code} before payment.`,
    "Record subtotal before coupon, discount amount, subtotal after coupon, and visible product terms.",
    "Stop before payment submission, upload, pickup reservation, or live order placement."
  ];
}

function buildPrinterCouponPortalApplicationPacketReason(
  status: PrinterCouponPortalApplicationPacketStatus,
  offer: PrinterCouponOffer
): string {
  if (status === "provider-portal-applied") {
    return `${offer.code} has structured same-cart provider portal evidence and may affect best-price ranking.`;
  }
  if (status === "expired") return `${offer.code} is expired and cannot affect best-price ranking.`;
  if (status === "no-price-target") return `${offer.code} has no matching 5x7 price observation target.`;
  return `${offer.code} must be applied in the provider portal and recorded as structured same-cart evidence before it can affect best-price ranking.`;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatCouponDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function extractWalgreensCouponOffers(
  text: string,
  source: PrinterCouponSource,
  extractedAtIso: string
): PrinterCouponOffer[] {
  const cardOffer = text.match(/Must use code\s+([A-Z0-9]+)\s+to receive\s+(\d+)%\s+off\s+All Photo Cards and Premium Stationery/i);
  const code = cardOffer?.[1]?.trim() ?? firstCouponMatch(text, /Coupon code:\s*([A-Z0-9]+)/i);
  const percent = cardOffer?.[2] ? Number.parseInt(cardOffer[2], 10) : firstPercent(text, /receive\s+(\d+)%\s+off\s+All Photo Cards and Premium Stationery/i);
  const endDate = firstCouponMatch(text, /expires at 11:59 p\.m\. CT on ([A-Z][a-z]+ \d{1,2}, \d{4})/i);
  if (!code || percent === undefined || !endDate) return [];

  return [
    {
      id: `walgreens-${code.toLowerCase()}-cards-${isoDateSlug(endDate)}`,
      vendorId: "walgreens",
      label: `${percent}% off All Photo Cards and Premium Stationery`,
      code,
      discountPercent: percent,
      appliesToProductKinds: ["folded-card", "flat-card", "photo-card", "premium-card"],
      startsAtIso: startOfObservedDayIso(extractedAtIso, "-05:00"),
      endsAtIso: couponDateEndIso(endDate, "-05:00"),
      source,
      sourceTargetIds: ["walgreens-photo-official-deals", "walgreens-photo-card-design-entrypoint"],
      evidenceStatus: "source-listed",
      requiresLoggedInAccount: /logged in registered Walgreens\.com\/Photo/i.test(text),
      excludes: ["previous purchases", "taxes", "shipping charges", "account product credits"]
    }
  ];
}

function extractCvsCouponOffers(text: string, source: PrinterCouponSource, _extractedAtIso: string): PrinterCouponOffer[] {
  const sitewideTermsPattern =
    /(\d+)%\s+off\s+Sitewide:\s+Add any photo products to your cart and enter promo code\s+([A-Z0-9]+)\s+to receive\s+\d+%\s+off your photo order\.\s+Offer valid online and in the CVS Health(?:registered|®)? app\.\s+Offer starts ([A-Z][a-z]+ \d{1,2}, \d{4}), at 12:01 AM(?: ET)? and ends ([A-Z][a-z]+ \d{1,2}, \d{4}), at 11:59 PM ET\./gi;
  const offers = [...text.matchAll(sitewideTermsPattern)]
    .map((match): PrinterCouponOffer | null => {
      const percent = match[1] ? Number.parseInt(match[1], 10) : undefined;
      const code = match[2]?.trim();
      const startsOn = match[3];
      const endsOn = match[4];
      if (!code || percent === undefined || !startsOn || !endsOn) return null;

      return {
        id: `cvs-${code.toLowerCase()}-sitewide-photo-${isoDateSlug(endsOn)}`,
        vendorId: "cvs",
        label: `${percent}% off Sitewide Photo`,
        code,
        discountPercent: percent,
        appliesToProductKinds: ["folded-card", "flat-card", "photo-card", "premium-card"],
        startsAtIso: couponDateStartIso(startsOn, "-04:00", "00:01"),
        endsAtIso: couponDateEndIso(endsOn, "-04:00"),
        source,
        sourceTargetIds: ["cvs-photo-official-coupons", "cvs-photo-card-design-entrypoint"],
        evidenceStatus: "source-listed",
        requiresLoggedInAccount: false,
        excludes: [
          "additional photo book pages",
          "eight-gigabyte photo USB drives",
          "Erin Condren licensed planners",
          "NFL licensed products",
          "shipping charges",
          "tax"
        ]
      };
    })
    .filter((offer): offer is PrinterCouponOffer => Boolean(offer));

  return offers.filter((offer, index) => offers.findIndex((candidate) => candidate.code === offer.code) === index);
}

function extractIgnoredCvsCouponSignals(
  text: string,
  source: PrinterCouponSource,
  extractedAtIso: string,
  acceptedOffers: PrinterCouponOffer[]
): PrinterCouponIgnoredSignal[] {
  const acceptedCodes = new Set(acceptedOffers.map((offer) => offer.code));
  const signals: PrinterCouponIgnoredSignal[] = [];
  const now = new Date(extractedAtIso);
  const premiumCards = text.match(
    /(\d+)%\s+off\s+Premium Cards:\s+Add any premium cards to your cart and enter promo code\s+([A-Z0-9]+)\s+to receive\s+\d+%\s+off each item\.\s+Offer valid online and in the CVS Health(?:registered|®)? app\.\s+Offer starts ([A-Z][a-z]+ \d{1,2}, \d{4}), at 12:01 AM(?: ET)? and ends ([A-Z][a-z]+ \d{1,2}, \d{4}), at 11:59 PM ET\.[\s\S]*?Offers do not apply to nonpremium photo cards, shipping charges or tax\./i
  );

  if (premiumCards?.[2] && !acceptedCodes.has(premiumCards[2])) {
    const code = premiumCards[2].trim();
    const endsAtIso = couponDateEndIso(premiumCards[4], "-04:00");
    const activeAtCollection = new Date(endsAtIso).getTime() >= now.getTime();
    const snippet = couponEvidenceSnippet(text, code);
    signals.push({
      vendorId: "cvs",
      code,
      label: `${premiumCards[1]}% off Premium Cards`,
      sourceUrl: source.url,
      observedAtIso: extractedAtIso,
      rawSnippet: snippet,
      rawSnippetHash: stableSnippetHash(snippet),
      activeAtCollection,
      reason: activeAtCollection ? "unsupported-product-scope" : "expired-before-collection"
    });
  }

  const allCodes = extractPrinterCouponCodes(text).filter((code) => !acceptedCodes.has(code) && !signals.some((signal) => signal.code === code));
  for (const code of allCodes) {
    const snippet = couponEvidenceSnippet(text, code);
    signals.push({
      vendorId: "cvs",
      code,
      label: "Unpaired CVS promo-code signal",
      sourceUrl: source.url,
      observedAtIso: extractedAtIso,
      rawSnippet: snippet,
      rawSnippetHash: stableSnippetHash(snippet),
      activeAtCollection: false,
      reason: "unpaired-promo-code-terms"
    });
  }

  return signals;
}

function buildPrinterCouponSourceEvidence(
  offer: PrinterCouponOffer,
  documentText: string,
  observedAtIso: string
): PrinterCouponSourceEvidence {
  const rawSnippet = couponEvidenceSnippet(documentText, offer.code);
  const sourceType =
    offer.source.authority === "credentialed-coupon-provider" ? "credentialed-coupon-provider-feed" : "official-retailer-public-page";
  const matchedTerms = offer.sourceTargetIds
    .flatMap((targetId) => printerCouponCollectionTargets.find((target) => target.id === targetId)?.verificationSignals ?? [])
    .filter((signal, index, signals) => signals.indexOf(signal) === index && rawSnippet.toLowerCase().includes(signal.toLowerCase()));

  return {
    vendorId: offer.vendorId,
    code: offer.code,
    sourceLabel: offer.source.label,
    sourceUrl: offer.source.url,
    sourceMode: offer.source.mode,
    sourceAuthority: offer.source.authority,
    sourceType,
    observedAtIso,
    rawSnippet,
    rawSnippetHash: stableSnippetHash(rawSnippet),
    matchedTerms
  };
}

function normalizeCouponDocumentText(documentText: string): string {
  return documentText
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&reg;/gi, "registered")
    .replace(/&#174;/gi, "registered")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCouponCodeSearchText(documentText: string): string {
  return documentText
    .replace(/<script\b[^>]*>/gi, " ")
    .replace(/<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&reg;/gi, "registered")
    .replace(/&#174;/gi, "registered")
    .replace(/\s+/g, " ")
    .trim();
}

function couponEvidenceSnippet(text: string, code: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const normalizedLower = normalized.toLowerCase();
  const codeLower = code.toLowerCase();
  const codeIndexes: number[] = [];
  let searchFrom = 0;
  while (searchFrom < normalized.length) {
    const nextIndex = normalizedLower.indexOf(codeLower, searchFrom);
    if (nextIndex === -1) break;
    codeIndexes.push(nextIndex);
    searchFrom = nextIndex + code.length;
  }
  const codeIndex =
    codeIndexes.find((index) => /offer starts|offer expires|must use code|to receive|ends/i.test(snippetWindow(normalized, index))) ??
    codeIndexes[0] ??
    -1;
  if (codeIndex === -1) return normalized.slice(0, 420);
  return snippetWindow(normalized, codeIndex).trim();
}

function snippetWindow(text: string, index: number): string {
  const start = Math.max(index - 180, 0);
  const end = Math.min(index + 420, text.length);
  return text.slice(start, end);
}

function stableSnippetHash(snippet: string): string {
  let hash = 2166136261;
  for (let index = 0; index < snippet.length; index += 1) {
    hash ^= snippet.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function firstCouponMatch(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1]?.trim();
}

function firstPercent(text: string, pattern: RegExp): number | undefined {
  const match = firstCouponMatch(text, pattern);
  if (!match) return undefined;
  const percent = Number.parseInt(match, 10);
  return Number.isFinite(percent) ? percent : undefined;
}

function couponDateStartIso(displayDate: string, utcOffset: string, time = "00:00"): string {
  return `${displayDateToIsoDate(displayDate)}T${time}:00.000${utcOffset}`;
}

function couponDateEndIso(displayDate: string, utcOffset: string): string {
  return `${displayDateToIsoDate(displayDate)}T23:59:00.000${utcOffset}`;
}

function startOfObservedDayIso(observedIso: string, utcOffset: string): string {
  return `${observedIso.slice(0, 10)}T00:00:00.000${utcOffset}`;
}

function isoDateSlug(displayDate: string): string {
  return displayDateToIsoDate(displayDate);
}

function displayDateToIsoDate(displayDate: string): string {
  const parsed = new Date(`${displayDate} 12:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) return "unknown-date";
  return parsed.toISOString().slice(0, 10);
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
