/**
 * Order placement contract — the full path from customer approval to vendor confirmation.
 *
 * Gates: realOrdersEnabled and directOrderEnabled are false.
 * The app currently hands off a print-ready package to the customer with a link
 * to the vendor's site. This contract defines what the direct-order path looks
 * like when both gates are lifted.
 *
 * Unlock requires: vendor terms review, real-order kill-switch infrastructure,
 * customer approval record design, payment processor integration, and physical
 * print certification (see D002, D008).
 */

import type {
  RetailPrinterFulfillmentMode,
  RetailPrinterVendorId
} from "./retailPrinterContracts";

export type OrderStatus =
  | "pending-customer-approval"
  | "pending-vendor-submission"
  | "submitted"
  | "vendor-confirmed"
  | "vendor-rejected"
  | "cancelled"
  | "error";

export type OrderPaymentMode = "vendor-checkout-session" | "payment-processor";

export type OrderArtifactKind = "combined-pdf-proof" | "svg-panel-set";

/** Customer's explicit approval record — required before any order is placed. */
export interface CustomerOrderApproval {
  approvalToken: string;
  approvedAt: number;
  customerId: string;
  cardDraftId: string;
  vendorId: RetailPrinterVendorId;
  productSku: string;
  quantity: number;
  fulfillmentMode: RetailPrinterFulfillmentMode;
  subtotalCents: number;
  totalCents: number;
  couponApplied: boolean;
  couponCode?: string;
  printArtifactId: string;
  customerAgreedToVendorTerms: true;
  realOrdersEnabled: false;
}

/** Request to submit an order to a retail vendor. */
export interface OrderPlacementRequest {
  vendorId: RetailPrinterVendorId;
  productSku: string;
  quantity: number;
  fulfillmentMode: RetailPrinterFulfillmentMode;
  storeId?: string;
  zipCode?: string;
  printArtifactId: string;
  printArtifactKind: OrderArtifactKind;
  customerApproval: CustomerOrderApproval;
  paymentMode: OrderPaymentMode;
  realOrdersEnabled: false;
  directOrderEnabled: false;
  requiresManualConfirmation: true;
}

/** Response from the vendor after order submission. */
export interface OrderPlacementResponse {
  orderId: string;
  vendorId: RetailPrinterVendorId;
  vendorOrderReference?: string;
  status: OrderStatus;
  subtotalCents: number;
  totalCents: number;
  fulfillmentMode: RetailPrinterFulfillmentMode;
  estimatedReadyAt?: number;
  estimatedDeliveryAt?: number;
  storeAddress?: string;
  requiresCustomerConfirmation: true;
  realOrdersEnabled: false;
  cancellationPolicy: string;
  nextSteps: string[];
}

/** What's needed to flip realOrdersEnabled for a vendor. */
export interface OrderEnablementChecklist {
  vendorId: RetailPrinterVendorId;
  realOrdersEnabled: false;
  directOrderEnabled: false;
  requiredEvidence: string[];
  requiredGates: string[];
  requiredLegalReview: string[];
  blockedReasons: string[];
}

export const orderEnablementChecklists: OrderEnablementChecklist[] = [
  {
    vendorId: "walgreens",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    requiredEvidence: [
      "Walgreens Photo API sandbox order confirmed — reference number returned",
      "Image upload to Walgreens cart confirmed — PDF accepted",
      "Coupon applied in same cart session — savings confirmed",
      "Customer approval record signed and stored",
      "Kill-switch tested — order flow halted within 1 second of activation"
    ],
    requiredGates: [
      "vendor-certification",
      "real-order-kill-switch",
      "customer-approval",
      "print-certification",
      "payment-processor"
    ],
    requiredLegalReview: [
      "Walgreens API terms of service",
      "Customer data handling agreement",
      "Print error and refund policy"
    ],
    blockedReasons: [
      "No Walgreens API sandbox access — vendor account setup required.",
      "Image upload API contract not certified — PDF format acceptance unverified.",
      "No real-order kill-switch infrastructure — required before any live order.",
      "Customer approval design not reviewed — explicit consent flow required."
    ]
  },
  {
    vendorId: "cvs",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    requiredEvidence: [
      "CVS Photo API sandbox order confirmed",
      "Image upload accepted",
      "Customer approval record signed"
    ],
    requiredGates: ["vendor-certification", "real-order-kill-switch", "customer-approval", "print-certification"],
    requiredLegalReview: ["CVS API terms of service", "Print error and refund policy"],
    blockedReasons: [
      "No CVS API sandbox access.",
      "No real-order kill-switch infrastructure."
    ]
  },
  {
    vendorId: "fedex",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    requiredEvidence: [
      "FedEx Office API sandbox order confirmed",
      "Print file accepted by FedEx Office format checker",
      "Shipping rate confirmed",
      "Customer approval record signed"
    ],
    requiredGates: ["vendor-certification", "real-order-kill-switch", "customer-approval", "print-certification"],
    requiredLegalReview: ["FedEx API terms of service", "Shipping and print error policy"],
    blockedReasons: [
      "No FedEx Office API sandbox access.",
      "Shipping rate integration not built."
    ]
  },
  {
    vendorId: "walmart",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    requiredEvidence: [
      "Walmart Photo API sandbox order confirmed",
      "Image upload accepted",
      "Customer approval record signed"
    ],
    requiredGates: ["vendor-certification", "real-order-kill-switch", "customer-approval", "print-certification"],
    requiredLegalReview: ["Walmart API terms of service", "Print error and refund policy"],
    blockedReasons: [
      "No Walmart API sandbox access.",
      "No real-order kill-switch infrastructure."
    ]
  }
];

/** Validate a customer approval record before building an order request. */
export function validateCustomerOrderApproval(approval: CustomerOrderApproval): string[] {
  const issues: string[] = [];

  if (approval.realOrdersEnabled) {
    issues.push("Customer order approval must not claim realOrdersEnabled = true.");
  }
  if (!approval.approvalToken?.trim()) {
    issues.push("Customer order approval requires an approvalToken.");
  }
  if (!approval.customerId?.trim()) {
    issues.push("Customer order approval requires a customerId.");
  }
  if (!approval.cardDraftId?.trim()) {
    issues.push("Customer order approval requires a cardDraftId.");
  }
  if (!approval.printArtifactId?.trim()) {
    issues.push("Customer order approval requires a printArtifactId.");
  }
  if (approval.quantity < 1) {
    issues.push("Customer order approval quantity must be at least 1.");
  }
  if (approval.subtotalCents <= 0) {
    issues.push("Customer order approval must include a positive subtotal.");
  }
  if (approval.totalCents < approval.subtotalCents) {
    issues.push("Customer order approval total must be at least equal to subtotal.");
  }
  if (!approval.customerAgreedToVendorTerms) {
    issues.push("Customer order approval requires vendor terms agreement.");
  }
  if (approval.couponApplied && !approval.couponCode) {
    issues.push("Customer order approval must include coupon code when coupon is applied.");
  }

  return issues;
}

/** Validate an order placement request before submitting to the vendor. */
export function validateOrderPlacementRequest(req: OrderPlacementRequest): string[] {
  const issues: string[] = [];

  if (req.realOrdersEnabled) {
    issues.push("Order placement request must keep realOrdersEnabled = false.");
  }
  if (req.directOrderEnabled) {
    issues.push("Order placement request must keep directOrderEnabled = false.");
  }
  if (!req.requiresManualConfirmation) {
    issues.push("Order placement request must require manual confirmation.");
  }

  issues.push(...validateCustomerOrderApproval(req.customerApproval));

  if (!req.printArtifactId?.trim()) {
    issues.push("Order placement request requires a printArtifactId.");
  }
  if (req.printArtifactId !== req.customerApproval.printArtifactId) {
    issues.push("Order placement printArtifactId must match the customer approval artifact.");
  }
  if (req.vendorId !== req.customerApproval.vendorId) {
    issues.push("Order placement vendorId must match the customer approval vendor.");
  }
  if (req.quantity !== req.customerApproval.quantity) {
    issues.push("Order placement quantity must match the customer-approved quantity.");
  }
  if (req.fulfillmentMode === "shipping" && !req.zipCode) {
    issues.push("Order placement requires a zipCode for shipping fulfillment.");
  }

  return issues;
}

/** Validate an order placement response before confirming to the customer. */
export function validateOrderPlacementResponse(res: OrderPlacementResponse): string[] {
  const issues: string[] = [];

  if (res.realOrdersEnabled) {
    issues.push("Order placement response must preserve realOrdersEnabled = false.");
  }
  if (!res.requiresCustomerConfirmation) {
    issues.push("Order placement response must require customer confirmation.");
  }
  if (!res.orderId?.trim()) {
    issues.push("Order placement response must include an orderId.");
  }
  if (res.subtotalCents <= 0) {
    issues.push("Order placement response must include a positive subtotal.");
  }
  if (!res.cancellationPolicy?.trim()) {
    issues.push("Order placement response must include a cancellation policy.");
  }
  if (res.nextSteps.length === 0) {
    issues.push("Order placement response must include at least one next step.");
  }

  return issues;
}

/** Build a stub order response for local testing (no vendor API required). */
export function buildStubOrderPlacementResponse(
  req: OrderPlacementRequest,
  nowMs: number
): OrderPlacementResponse {
  const vendorNames: Record<RetailPrinterVendorId, string> = {
    walgreens: "Walgreens Photo",
    cvs: "CVS Photo",
    fedex: "FedEx Office",
    walmart: "Walmart Photo"
  };

  return {
    orderId: `stub-order-${req.vendorId}-${req.customerApproval.cardDraftId}`,
    vendorId: req.vendorId,
    vendorOrderReference: undefined,
    status: "pending-vendor-submission",
    subtotalCents: req.customerApproval.subtotalCents,
    totalCents: req.customerApproval.totalCents,
    fulfillmentMode: req.fulfillmentMode,
    estimatedReadyAt:
      req.fulfillmentMode === "pickup" ? nowMs + 2 * 60 * 60 * 1000 : undefined,
    estimatedDeliveryAt:
      req.fulfillmentMode === "shipping" ? nowMs + 5 * 24 * 60 * 60 * 1000 : undefined,
    requiresCustomerConfirmation: true,
    realOrdersEnabled: false,
    cancellationPolicy: `Cancel within 1 hour at ${vendorNames[req.vendorId]} — contact store directly.`,
    nextSteps: [
      `Your files have been sent to ${vendorNames[req.vendorId]}.`,
      req.fulfillmentMode === "pickup"
        ? "Show your order confirmation at the photo counter to collect your card."
        : "You will receive a shipping confirmation email from the vendor.",
      "Final price is confirmed at vendor checkout — estimate may differ by tax."
    ]
  };
}
