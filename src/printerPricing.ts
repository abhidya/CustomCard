import type { VendorId } from "./freeMvp";

export type PrinterPricingConfidence = "public-current" | "public-ambiguous" | "manual-estimate";
export type PrinterPricingSpeed = "same-day" | "24-hour" | "ships-in-days" | "manual-confirm";
export type PrinterProductKind = "folded-card" | "flat-card" | "photo-card" | "premium-card";
export type PrinterPricingCollectionMode = "official-developer-catalog" | "official-public-page" | "official-product-page";
export type PrinterPricingFreshnessStatus = "fresh" | "stale" | "future-dated";

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
  freshSources: number;
  staleSources: PrinterPricingSourceFreshness[];
  futureDatedSources: PrinterPricingSourceFreshness[];
  collectionRules: PrinterPricingCollectionRule[];
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
  disclaimer: string;
  liveQuote: false;
}

const observedAtIso = "2026-06-03T12:00:00.000Z";

export const printerPricingSources = {
  walgreensProductCatalog: {
    label: "Walgreens Developer Portal photo product catalog",
    url: "https://developer.walgreens.com/support/photo-product-catalog",
    observedAtIso,
    notes: "Official product catalog lists 5x7 folded card pricing; store availability and taxes still require manual confirmation."
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
  cvsSameDay: {
    label: "CVS Photo same-day photo gifts",
    url: "https://www.cvs.com/photo/same-day-photo-gifts",
    observedAtIso,
    notes: "Official same-day page lists current card starting prices; store-specific availability still must be checked."
  },
  fedexGreetingCards: {
    label: "FedEx Office greeting and holiday cards",
    url: "https://www.office.fedex.com/default/greeting-cards",
    observedAtIso,
    notes: "Official FedEx Office page lists quick single/double-sided and premium 5x7 greeting card starting prices and production windows."
  },
  walmartSameDayFolded: {
    label: "Walmart Photo same-day folded photo card",
    url: "https://business.walmart.com/ip/Same-Day-Folded-Photo-Card/15907786",
    observedAtIso,
    notes: "Official Walmart product page lists same-day folded photo card pricing; exact store availability still requires checkout confirmation."
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
    notes: "Official Staples same-day cards page lists a 5x7 25-card package; coupon prices are excluded until checkout confirmation."
  },
  officeDepotPhotoCards: {
    label: "Office Depot custom photo holiday cards",
    url: "https://www.officedepot.com/a/products/7395368/Custom-Photo-Holiday-Cards-With-Envelopes/",
    observedAtIso,
    notes: "Official Office Depot custom photo card product page lists a 25-card 7x5 package price; production and pickup/ship details require manual confirmation."
  }
} satisfies Record<string, PrinterPricingSource>;

export const printerPricingCollectionRules: PrinterPricingCollectionRule[] = [
  {
    sourceLabel: printerPricingSources.walgreensProductCatalog.label,
    url: printerPricingSources.walgreensProductCatalog.url,
    vendorIds: ["walgreens"],
    mode: "official-developer-catalog",
    maxAgeDays: 30,
    extractHints: ["5x7 folded card", "unit retail price", "same-day photo product"],
    blockedFields: ["tax", "coupon", "store stock", "pickup window", "live order placement"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.cvsCards.label,
    url: printerPricingSources.cvsCards.url,
    vendorIds: ["cvs"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 Photo Cards", "Same Day 5x7 Premium Cards", "5x7 Folded Cards", "starting price", "minimum quantity"],
    blockedFields: ["tax", "coupon", "store stock", "pickup window", "photo checkout availability"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.cvsDoubleSidedCards.label,
    url: printerPricingSources.cvsDoubleSidedCards.url,
    vendorIds: ["cvs"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 Double-Sided Cardstock", "starting price", "minimum quantity"],
    blockedFields: ["tax", "coupon", "store stock", "pickup window", "photo checkout availability"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.fedexGreetingCards.label,
    url: printerPricingSources.fedexGreetingCards.url,
    vendorIds: ["fedex"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["Quick 5x7 single-sided greeting card", "Quick 5x7 double-sided greeting card", "Premium 5x7 folded greeting card", "package start"],
    blockedFields: ["tax", "coupon", "local pickup slot", "delivery date", "print QA result"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.walmartSameDayFolded.label,
    url: printerPricingSources.walmartSameDayFolded.url,
    vendorIds: ["walmart"],
    mode: "official-product-page",
    maxAgeDays: 30,
    extractHints: ["Same-Day Folded Photo Card", "5x7", "each"],
    blockedFields: ["tax", "coupon", "store stock", "pickup window", "business-account checkout"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.staplesFoldedCards.label,
    url: printerPricingSources.staplesFoldedCards.url,
    vendorIds: ["staples"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 folded cards", "25 quantity", "pre-tax subtotal"],
    blockedFields: ["tax", "coupon", "pickup window", "delivery availability", "card-stock proof"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.staplesSameDayCards.label,
    url: printerPricingSources.staplesSameDayCards.url,
    vendorIds: ["staples"],
    mode: "official-public-page",
    maxAgeDays: 30,
    extractHints: ["5x7 same-day cards", "25 quantity", "pre-tax subtotal"],
    blockedFields: ["tax", "coupon", "store stock", "pickup window", "card-stock proof"],
    noNetworkRuntime: true
  },
  {
    sourceLabel: printerPricingSources.officeDepotPhotoCards.label,
    url: printerPricingSources.officeDepotPhotoCards.url,
    vendorIds: ["office-depot"],
    mode: "official-product-page",
    maxAgeDays: 30,
    extractHints: ["7x5 custom photo holiday cards", "25 pack", "package price"],
    blockedFields: ["tax", "coupon", "pickup window", "delivery availability", "card-stock proof"],
    noNetworkRuntime: true
  }
];

export const printerPriceCatalog: PrinterPriceObservation[] = [
  {
    id: "walgreens-5x7-folded-card",
    vendorId: "walgreens",
    vendorName: "Walgreens",
    productName: "5x7 folded card",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 299,
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
    productName: "5x7 folded card",
    productKind: "folded-card",
    size: "5x7",
    unitPriceCents: 299,
    minimumQuantity: 1,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-current",
    source: printerPricingSources.cvsCards
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
    unitPriceCents: 142,
    minimumQuantity: 1,
    speed: "same-day",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-ambiguous",
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

export function estimatePrinterSubtotal(observation: PrinterPriceObservation, quantity = 1): PrinterPriceEstimate {
  const normalizedQuantity = Math.max(Math.round(quantity), 1);
  const pricedQuantity = Math.max(normalizedQuantity, observation.minimumQuantity);
  const subtotalCents =
    observation.startingPackagePriceCents !== undefined && pricedQuantity === observation.minimumQuantity
      ? observation.startingPackagePriceCents
      : pricedQuantity * observation.unitPriceCents;

  return {
    observation,
    quantity: normalizedQuantity,
    pricedQuantity,
    subtotalCents,
    subtotalLabel: formatCents(subtotalCents)
  };
}

export function buildPrinterPricingComparison(
  selectedVendorId: VendorId,
  quantity = 1,
  catalog: PrinterPriceObservation[] = printerPriceCatalog,
  now = new Date()
): PrinterPricingComparison {
  const estimates = catalog.map((observation) => estimatePrinterSubtotal(observation, quantity));
  const rankedKnownPrices = estimates.slice().sort((first, second) =>
    first.subtotalCents - second.subtotalCents ||
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
    disclaimer:
      "Public printer prices are review-only observations, not live quotes. Confirm price, tax, pickup window, and stock in the vendor checkout before upload.",
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

  return {
    generatedAtIso: now.toISOString(),
    maxAgeDays: maxPrinterPricingAgeDays,
    totalObservations: catalog.length,
    sourceCount: sourceMap.size,
    freshSources: freshness.filter((source) => source.status === "fresh").length,
    staleSources,
    futureDatedSources,
    collectionRules: printerPricingCollectionRules,
    blockers,
    canShowComparison: blockers.length === 0,
    liveQuote: false,
    disclaimer:
      "Pricing collection uses official public pages only and excludes taxes, coupons, stock, pickup windows, payments, and live order placement."
  };
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

function speedRank(speed: PrinterPricingSpeed): number {
  const ranks: Record<PrinterPricingSpeed, number> = {
    "same-day": 1,
    "24-hour": 2,
    "ships-in-days": 3,
    "manual-confirm": 4
  };
  return ranks[speed];
}
