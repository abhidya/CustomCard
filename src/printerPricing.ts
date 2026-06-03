import type { VendorId } from "./freeMvp";

export type PrinterPricingConfidence = "public-current" | "public-ambiguous" | "manual-estimate";
export type PrinterPricingSpeed = "same-day" | "24-hour" | "ships-in-days" | "manual-confirm";
export type PrinterProductKind = "folded-card" | "flat-card" | "photo-card" | "premium-card";

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

export interface PrinterPricingComparison {
  selectedVendorId: VendorId;
  quantity: number;
  selectedVendorOptions: PrinterPriceEstimate[];
  rankedKnownPrices: PrinterPriceEstimate[];
  manualConfirmationVendors: VendorId[];
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
    notes: "Official CVS cards page lists same-day 5x7 card starting prices and pickup availability counts."
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
    notes: "Official FedEx Office page lists quick and premium 5x7 greeting card starting prices and production windows."
  },
  walmartSameDayFolded: {
    label: "Walmart Photo same-day folded photo card",
    url: "https://business.walmart.com/ip/Same-Day-Folded-Photo-Card/15907786",
    observedAtIso,
    notes: "Official Walmart product page lists same-day folded photo card pricing; exact store availability still requires checkout confirmation."
  },
  staplesFoldedCards: {
    label: "Staples folded cards",
    url: "https://www.staples.com/services/printing/cards-invitations/",
    observedAtIso,
    notes: "Official Staples cards and invitations page lists 5x7 folded card bundle pricing; coupon and production-window details require checkout confirmation."
  },
  officeDepotPhotoCards: {
    label: "Office Depot custom photo holiday cards",
    url: "https://www.officedepot.com/a/products/7395368/Custom-Photo-Holiday-Cards-With-Envelopes/",
    observedAtIso,
    notes: "Official Office Depot custom photo card product page lists a 25-card 7x5 package price; production and pickup/ship details require manual confirmation."
  }
} satisfies Record<string, PrinterPricingSource>;

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
    productName: "Same Day 5x7 Premium / double-sided cardstock card",
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
    unitPriceCents: 120,
    startingPackagePriceCents: 2999,
    minimumQuantity: 25,
    speed: "24-hour",
    pickupEligible: true,
    liveQuote: false,
    requiresManualConfirmation: true,
    confidence: "public-ambiguous",
    source: printerPricingSources.staplesFoldedCards
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
  catalog: PrinterPriceObservation[] = printerPriceCatalog
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
    disclaimer:
      "Public printer prices are review-only observations, not live quotes. Confirm price, tax, pickup window, and stock in the vendor checkout before upload.",
    liveQuote: false
  };
}

export function validatePrinterPricingCatalog(catalog: PrinterPriceObservation[] = printerPriceCatalog): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

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
  }

  for (const vendorId of ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot"] satisfies VendorId[]) {
    if (!catalog.some((observation) => observation.vendorId === vendorId)) {
      errors.push(`Missing public printer pricing for ${vendorId}.`);
    }
  }

  return errors;
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
