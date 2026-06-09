/**
 * Live retail price quote contract.
 *
 * Gate: liveQuoteEnabled is false. Fulfillment currently shows public-estimate
 * prices. When this gate is flipped, the quote request goes to the vendor API
 * (or a certified browser session) and returns a real cart price.
 *
 * Unlock requires: vendor API access or certified browser automation contract,
 * price proof evidence, store availability check, and coupon portal re-check
 * in the same cart session (see D002, D008).
 */

import type {
  RetailPrinterFulfillmentMode,
  RetailPrinterVendorId
} from "./retailPrinterContracts";

export type RetailQuoteSource = "vendor-cart-api" | "certified-browser-session" | "public-estimate-fallback";
export type RetailQuoteStatus =
  | "quoted"
  | "coupon-applied"
  | "out-of-stock"
  | "store-not-found"
  | "price-changed"
  | "error";

/** Request for a live price quote from a retail vendor. */
export interface RetailQuoteRequest {
  vendorId: RetailPrinterVendorId;
  productSku: string;
  quantity: number;
  fulfillmentMode: RetailPrinterFulfillmentMode;
  storeId?: string;
  zipCode?: string;
  couponCode?: string;
  customerApprovalToken: string;
  liveQuoteEnabled: false;
  noNetwork: true;
}

/** Live price quote response from a retail vendor. */
export interface RetailQuoteResponse {
  vendorId: RetailPrinterVendorId;
  productSku: string;
  quantity: number;
  fulfillmentMode: RetailPrinterFulfillmentMode;
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  couponApplied: boolean;
  couponCode?: string;
  couponSavingsCents: number;
  totalCents: number;
  etaLabel: string;
  storeId?: string;
  quoteSource: RetailQuoteSource;
  quoteValidUntilMs: number;
  status: RetailQuoteStatus;
  requiresCustomerConfirmation: true;
  liveQuoteEnabled: false;
  blockedReason: string;
}

/** What's needed to flip the liveQuoteEnabled gate for a vendor. */
export interface RetailQuoteEnablementChecklist {
  vendorId: RetailPrinterVendorId;
  liveQuoteEnabled: false;
  requiredEvidence: string[];
  requiredGates: string[];
  blockedReasons: string[];
}

export const retailQuoteEnablementChecklists: RetailQuoteEnablementChecklist[] = [
  {
    vendorId: "walgreens",
    liveQuoteEnabled: false,
    requiredEvidence: [
      "Walgreens Photo API access or certified browser session contract",
      "Price extraction from live Walgreens cart (same-session)",
      "Coupon portal application proof in same cart",
      "Store availability and pickup-slot confirmation",
      "Tax and shipping calculation evidence"
    ],
    requiredGates: [
      "vendor-certification",
      "real-order-kill-switch",
      "customer-approval",
      "price-proof-evidence"
    ],
    blockedReasons: [
      "No Walgreens API access — requires vendor terms review and account setup.",
      "Coupon portal requires same-cart session to verify savings.",
      "Live tax and shipping require real store lookup."
    ]
  },
  {
    vendorId: "cvs",
    liveQuoteEnabled: false,
    requiredEvidence: [
      "CVS Photo API access or certified browser session contract",
      "Price extraction from live CVS cart",
      "Coupon application proof",
      "Store availability confirmation"
    ],
    requiredGates: ["vendor-certification", "real-order-kill-switch", "customer-approval"],
    blockedReasons: [
      "No CVS API access — requires vendor terms review.",
      "CVS pricing requires live cart session."
    ]
  },
  {
    vendorId: "fedex",
    liveQuoteEnabled: false,
    requiredEvidence: [
      "FedEx Office API access or certified browser session contract",
      "Shipping rate quote from FedEx rate API",
      "Print product price from FedEx Office catalog",
      "Delivery window evidence"
    ],
    requiredGates: ["vendor-certification", "real-order-kill-switch", "customer-approval"],
    blockedReasons: [
      "No FedEx API access — requires FedEx developer account.",
      "Shipping rate calculation requires destination zip code and live rate lookup."
    ]
  },
  {
    vendorId: "walmart",
    liveQuoteEnabled: false,
    requiredEvidence: [
      "Walmart Photo Center API access or certified browser session contract",
      "Price extraction from live Walmart cart",
      "Store pickup availability confirmation"
    ],
    requiredGates: ["vendor-certification", "real-order-kill-switch", "customer-approval"],
    blockedReasons: [
      "No Walmart API access — requires vendor terms review.",
      "Walmart pricing requires live cart session."
    ]
  }
];

/** Validate a quote request before sending to the vendor. */
export function validateRetailQuoteRequest(req: RetailQuoteRequest): string[] {
  const issues: string[] = [];

  if (req.liveQuoteEnabled) {
    issues.push("Retail quote request must keep liveQuoteEnabled = false.");
  }
  if (!req.noNetwork) {
    issues.push("Retail quote request must keep noNetwork = true until vendor certification is complete.");
  }

  const validVendors: RetailPrinterVendorId[] = ["walgreens", "cvs", "fedex", "walmart"];
  if (!validVendors.includes(req.vendorId)) {
    issues.push(`Unknown vendor: ${req.vendorId}.`);
  }
  if (!req.productSku?.trim()) {
    issues.push("Retail quote request requires a productSku.");
  }
  if (req.quantity < 1) {
    issues.push("Retail quote request quantity must be at least 1.");
  }
  if (!["pickup", "shipping"].includes(req.fulfillmentMode)) {
    issues.push(`Unknown fulfillmentMode: ${req.fulfillmentMode}.`);
  }
  if (req.fulfillmentMode === "shipping" && !req.zipCode) {
    issues.push("Retail quote request requires a zipCode for shipping fulfillment.");
  }
  if (!req.customerApprovalToken?.trim()) {
    issues.push("Retail quote request requires a customerApprovalToken.");
  }

  return issues;
}

/** Validate a quote response before surfacing to the customer. */
export function validateRetailQuoteResponse(res: RetailQuoteResponse): string[] {
  const issues: string[] = [];

  if (res.liveQuoteEnabled) {
    issues.push("Retail quote response must preserve liveQuoteEnabled = false.");
  }
  if (!res.requiresCustomerConfirmation) {
    issues.push("Retail quote response must require customer confirmation.");
  }
  if (res.subtotalCents <= 0 && res.status === "quoted") {
    issues.push("Retail quote response subtotal must be positive for a quoted status.");
  }
  if (res.couponApplied && res.couponSavingsCents <= 0) {
    issues.push("Retail quote response must show positive savings when coupon is applied.");
  }
  if (res.couponApplied && !res.couponCode) {
    issues.push("Retail quote response must include coupon code when coupon is applied.");
  }
  if (res.quoteValidUntilMs <= 0) {
    issues.push("Retail quote response must include a quote expiry timestamp.");
  }
  if (!res.etaLabel?.trim()) {
    issues.push("Retail quote response must include an ETA label.");
  }
  if (!res.blockedReason?.trim()) {
    issues.push("Retail quote response must explain live fulfillment blockers.");
  }

  return issues;
}

/** Build a stub quote response for local testing (no vendor API required). */
export function buildStubRetailQuoteResponse(req: RetailQuoteRequest, nowMs: number): RetailQuoteResponse {
  const vendorNames: Record<RetailPrinterVendorId, string> = {
    walgreens: "Walgreens",
    cvs: "CVS",
    fedex: "FedEx Office",
    walmart: "Walmart"
  };

  return {
    vendorId: req.vendorId,
    productSku: req.productSku,
    quantity: req.quantity,
    fulfillmentMode: req.fulfillmentMode,
    subtotalCents: 399,
    taxCents: 0,
    shippingCents: req.fulfillmentMode === "shipping" ? 599 : 0,
    couponApplied: Boolean(req.couponCode),
    couponCode: req.couponCode,
    couponSavingsCents: req.couponCode ? 100 : 0,
    totalCents: req.fulfillmentMode === "shipping"
      ? (req.couponCode ? 898 : 998)
      : (req.couponCode ? 299 : 399),
    etaLabel: req.fulfillmentMode === "pickup" ? "same-day pickup candidate" : "ships in 3–5 days",
    storeId: req.storeId,
    quoteSource: "public-estimate-fallback",
    quoteValidUntilMs: nowMs + 15 * 60 * 1000,
    status: "quoted",
    requiresCustomerConfirmation: true,
    liveQuoteEnabled: false,
    blockedReason: `Live ${vendorNames[req.vendorId]} price requires vendor API access and in-cart coupon verification.`
  };
}
