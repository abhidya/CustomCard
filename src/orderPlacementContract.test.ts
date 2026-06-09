import { describe, expect, it } from "vitest";
import {
  buildStubOrderPlacementResponse,
  orderEnablementChecklists,
  validateCustomerOrderApproval,
  validateOrderPlacementRequest,
  validateOrderPlacementResponse,
  type CustomerOrderApproval,
  type OrderPlacementRequest
} from "./orderPlacementContract";

const nowMs = 1_700_000_000_000;

const baseApproval: CustomerOrderApproval = {
  approvalToken: "approval-token-abc123",
  approvedAt: nowMs,
  customerId: "customer-1",
  cardDraftId: "draft-sara-birthday",
  vendorId: "walgreens",
  productSku: "walgreens-5x7-double-sided",
  quantity: 1,
  fulfillmentMode: "pickup",
  subtotalCents: 399,
  totalCents: 399,
  couponApplied: false,
  printArtifactId: "artifact-001",
  customerAgreedToVendorTerms: true,
  realOrdersEnabled: false
};

const baseRequest: OrderPlacementRequest = {
  vendorId: "walgreens",
  productSku: "walgreens-5x7-double-sided",
  quantity: 1,
  fulfillmentMode: "pickup",
  storeId: "store-1234",
  printArtifactId: "artifact-001",
  printArtifactKind: "combined-pdf-proof",
  customerApproval: baseApproval,
  paymentMode: "vendor-checkout-session",
  realOrdersEnabled: false,
  directOrderEnabled: false,
  requiresManualConfirmation: true
};

describe("orderEnablementChecklists", () => {
  it("has a checklist for every supported vendor", () => {
    const vendors = orderEnablementChecklists.map((c) => c.vendorId);
    expect(vendors).toContain("walgreens");
    expect(vendors).toContain("cvs");
    expect(vendors).toContain("fedex");
    expect(vendors).toContain("walmart");
  });

  it("keeps realOrdersEnabled false on every checklist", () => {
    for (const checklist of orderEnablementChecklists) {
      expect(checklist.realOrdersEnabled).toBe(false);
    }
  });

  it("keeps directOrderEnabled false on every checklist", () => {
    for (const checklist of orderEnablementChecklists) {
      expect(checklist.directOrderEnabled).toBe(false);
    }
  });

  it("requires vendor-certification and real-order-kill-switch for every vendor", () => {
    for (const checklist of orderEnablementChecklists) {
      expect(checklist.requiredGates).toContain("vendor-certification");
      expect(checklist.requiredGates).toContain("real-order-kill-switch");
    }
  });

  it("requires legal review for every vendor", () => {
    for (const checklist of orderEnablementChecklists) {
      expect(checklist.requiredLegalReview.length).toBeGreaterThan(0);
    }
  });
});

describe("validateCustomerOrderApproval", () => {
  it("passes a valid approval", () => {
    expect(validateCustomerOrderApproval(baseApproval)).toEqual([]);
  });

  it("rejects missing approvalToken", () => {
    const issues = validateCustomerOrderApproval({ ...baseApproval, approvalToken: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("approvalToken")]));
  });

  it("rejects missing customerId", () => {
    const issues = validateCustomerOrderApproval({ ...baseApproval, customerId: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("customerId")]));
  });

  it("rejects missing cardDraftId", () => {
    const issues = validateCustomerOrderApproval({ ...baseApproval, cardDraftId: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("cardDraftId")]));
  });

  it("rejects missing printArtifactId", () => {
    const issues = validateCustomerOrderApproval({ ...baseApproval, printArtifactId: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("printArtifactId")]));
  });

  it("rejects zero quantity", () => {
    const issues = validateCustomerOrderApproval({ ...baseApproval, quantity: 0 });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("quantity")]));
  });

  it("rejects zero subtotal", () => {
    const issues = validateCustomerOrderApproval({ ...baseApproval, subtotalCents: 0 });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("subtotal")]));
  });

  it("rejects total less than subtotal", () => {
    const issues = validateCustomerOrderApproval({
      ...baseApproval,
      subtotalCents: 399,
      totalCents: 100
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("total")]));
  });

  it("rejects missing vendor terms agreement", () => {
    const issues = validateCustomerOrderApproval({
      ...baseApproval,
      customerAgreedToVendorTerms: false as true
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("terms")]));
  });

  it("rejects coupon applied without coupon code", () => {
    const issues = validateCustomerOrderApproval({
      ...baseApproval,
      couponApplied: true,
      couponCode: undefined
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("coupon code")]));
  });

  it("rejects if realOrdersEnabled is true on approval", () => {
    const issues = validateCustomerOrderApproval({
      ...baseApproval,
      realOrdersEnabled: true as false
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("realOrdersEnabled")]));
  });
});

describe("validateOrderPlacementRequest", () => {
  it("passes a valid request", () => {
    expect(validateOrderPlacementRequest(baseRequest)).toEqual([]);
  });

  it("rejects if realOrdersEnabled is true", () => {
    const issues = validateOrderPlacementRequest({
      ...baseRequest,
      realOrdersEnabled: true as false
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("realOrdersEnabled")]));
  });

  it("rejects if directOrderEnabled is true", () => {
    const issues = validateOrderPlacementRequest({
      ...baseRequest,
      directOrderEnabled: true as false
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("directOrderEnabled")]));
  });

  it("rejects mismatched printArtifactId", () => {
    const issues = validateOrderPlacementRequest({
      ...baseRequest,
      printArtifactId: "different-artifact"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("printArtifactId")]));
  });

  it("rejects mismatched vendorId", () => {
    const issues = validateOrderPlacementRequest({
      ...baseRequest,
      vendorId: "cvs",
      customerApproval: { ...baseApproval, vendorId: "walgreens" }
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("vendorId")]));
  });

  it("rejects mismatched quantity", () => {
    const issues = validateOrderPlacementRequest({
      ...baseRequest,
      quantity: 2,
      customerApproval: { ...baseApproval, quantity: 1 }
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("quantity")]));
  });

  it("rejects shipping request without zipCode", () => {
    const issues = validateOrderPlacementRequest({
      ...baseRequest,
      fulfillmentMode: "shipping",
      customerApproval: { ...baseApproval, fulfillmentMode: "shipping" },
      zipCode: undefined
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("zipCode")]));
  });
});

describe("buildStubOrderPlacementResponse", () => {
  it("produces a valid pickup order response", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    expect(validateOrderPlacementResponse(res)).toEqual([]);
  });

  it("produces a valid shipping order response", () => {
    const shippingRequest: OrderPlacementRequest = {
      ...baseRequest,
      fulfillmentMode: "shipping",
      zipCode: "90210",
      customerApproval: { ...baseApproval, fulfillmentMode: "shipping" }
    };
    const res = buildStubOrderPlacementResponse(shippingRequest, nowMs);
    expect(validateOrderPlacementResponse(res)).toEqual([]);
    expect(res.estimatedDeliveryAt).toBeGreaterThan(nowMs);
  });

  it("keeps realOrdersEnabled false in response", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    expect(res.realOrdersEnabled).toBe(false);
  });

  it("sets pickup estimatedReadyAt approximately 2 hours out", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    expect(res.estimatedReadyAt).toBe(nowMs + 2 * 60 * 60 * 1000);
  });

  it("includes vendor name in cancellation policy", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    expect(res.cancellationPolicy.toLowerCase()).toContain("walgreens");
  });

  it("includes next steps with fulfillment guidance", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    expect(res.nextSteps.length).toBeGreaterThanOrEqual(2);
    expect(res.nextSteps.join(" ").toLowerCase()).toContain("walgreens");
  });
});

describe("validateOrderPlacementResponse", () => {
  it("passes a valid stub response", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    expect(validateOrderPlacementResponse(res)).toEqual([]);
  });

  it("rejects realOrdersEnabled = true in response", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    const issues = validateOrderPlacementResponse({ ...res, realOrdersEnabled: true as false });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("realOrdersEnabled")]));
  });

  it("rejects missing requiresCustomerConfirmation", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    const issues = validateOrderPlacementResponse({
      ...res,
      requiresCustomerConfirmation: false as true
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("confirmation")]));
  });

  it("rejects missing orderId", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    const issues = validateOrderPlacementResponse({ ...res, orderId: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("orderId")]));
  });

  it("rejects missing cancellation policy", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    const issues = validateOrderPlacementResponse({ ...res, cancellationPolicy: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("cancellation policy")]));
  });

  it("rejects empty next steps", () => {
    const res = buildStubOrderPlacementResponse(baseRequest, nowMs);
    const issues = validateOrderPlacementResponse({ ...res, nextSteps: [] });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("next step")]));
  });
});
