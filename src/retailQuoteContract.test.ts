import { describe, expect, it } from "vitest";
import {
  buildStubRetailQuoteResponse,
  retailQuoteEnablementChecklists,
  validateRetailQuoteRequest,
  validateRetailQuoteResponse,
  type RetailQuoteRequest
} from "./retailQuoteContract";

const nowMs = 1_700_000_000_000;

const basePickupRequest: RetailQuoteRequest = {
  vendorId: "walgreens",
  productSku: "walgreens-5x7-double-sided",
  quantity: 1,
  fulfillmentMode: "pickup",
  storeId: "store-1234",
  couponCode: undefined,
  customerApprovalToken: "customer-approved-token-abc",
  liveQuoteEnabled: false,
  noNetwork: true
};

const baseShippingRequest: RetailQuoteRequest = {
  ...basePickupRequest,
  fulfillmentMode: "shipping",
  zipCode: "90210"
};

describe("retailQuoteEnablementChecklists", () => {
  it("has a checklist for every supported vendor", () => {
    const vendors = retailQuoteEnablementChecklists.map((c) => c.vendorId);
    expect(vendors).toContain("walgreens");
    expect(vendors).toContain("cvs");
    expect(vendors).toContain("fedex");
    expect(vendors).toContain("walmart");
  });

  it("keeps liveQuoteEnabled false on every checklist", () => {
    for (const checklist of retailQuoteEnablementChecklists) {
      expect(checklist.liveQuoteEnabled).toBe(false);
    }
  });

  it("requires vendor-certification gate for every vendor", () => {
    for (const checklist of retailQuoteEnablementChecklists) {
      expect(checklist.requiredGates).toContain("vendor-certification");
    }
  });

  it("lists at least one blocked reason per vendor", () => {
    for (const checklist of retailQuoteEnablementChecklists) {
      expect(checklist.blockedReasons.length).toBeGreaterThan(0);
    }
  });

  it("lists required evidence per vendor", () => {
    for (const checklist of retailQuoteEnablementChecklists) {
      expect(checklist.requiredEvidence.length).toBeGreaterThan(0);
    }
  });
});

describe("validateRetailQuoteRequest", () => {
  it("passes a valid pickup request", () => {
    expect(validateRetailQuoteRequest(basePickupRequest)).toEqual([]);
  });

  it("passes a valid shipping request with zipCode", () => {
    expect(validateRetailQuoteRequest(baseShippingRequest)).toEqual([]);
  });

  it("rejects shipping request without zipCode", () => {
    const issues = validateRetailQuoteRequest({ ...baseShippingRequest, zipCode: undefined });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("zipCode")]));
  });

  it("rejects unknown vendor", () => {
    const issues = validateRetailQuoteRequest({
      ...basePickupRequest,
      vendorId: "unknown-vendor" as "walgreens"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("Unknown vendor")]));
  });

  it("rejects zero quantity", () => {
    const issues = validateRetailQuoteRequest({ ...basePickupRequest, quantity: 0 });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("quantity")]));
  });

  it("rejects missing productSku", () => {
    const issues = validateRetailQuoteRequest({ ...basePickupRequest, productSku: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("productSku")]));
  });

  it("rejects missing customerApprovalToken", () => {
    const issues = validateRetailQuoteRequest({ ...basePickupRequest, customerApprovalToken: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("customerApprovalToken")]));
  });

  it("rejects if liveQuoteEnabled is true", () => {
    const issues = validateRetailQuoteRequest({
      ...basePickupRequest,
      liveQuoteEnabled: true as false
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("liveQuoteEnabled")]));
  });

  it("rejects if noNetwork is false", () => {
    const issues = validateRetailQuoteRequest({
      ...basePickupRequest,
      noNetwork: false as true
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("noNetwork")]));
  });
});

describe("buildStubRetailQuoteResponse", () => {
  it("produces a valid pickup response", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    expect(validateRetailQuoteResponse(res)).toEqual([]);
  });

  it("produces a valid shipping response", () => {
    const res = buildStubRetailQuoteResponse(baseShippingRequest, nowMs);
    expect(validateRetailQuoteResponse(res)).toEqual([]);
  });

  it("applies coupon savings when couponCode is set", () => {
    const res = buildStubRetailQuoteResponse({ ...basePickupRequest, couponCode: "SAVE20" }, nowMs);
    expect(res.couponApplied).toBe(true);
    expect(res.couponSavingsCents).toBeGreaterThan(0);
    expect(res.couponCode).toBe("SAVE20");
    expect(validateRetailQuoteResponse(res)).toEqual([]);
  });

  it("adds shipping cost for shipping fulfillment", () => {
    const pickupRes = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const shippingRes = buildStubRetailQuoteResponse(baseShippingRequest, nowMs);
    expect(shippingRes.shippingCents).toBeGreaterThan(pickupRes.shippingCents);
  });

  it("keeps liveQuoteEnabled false", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    expect(res.liveQuoteEnabled).toBe(false);
  });

  it("keeps requiresCustomerConfirmation true", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    expect(res.requiresCustomerConfirmation).toBe(true);
  });

  it("sets quoteValidUntilMs to 15 minutes from now", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    expect(res.quoteValidUntilMs).toBe(nowMs + 15 * 60 * 1000);
  });

  it("includes a blockedReason mentioning the vendor", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    expect(res.blockedReason.toLowerCase()).toContain("walgreens");
  });
});

describe("validateRetailQuoteResponse", () => {
  it("passes a valid stub response", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    expect(validateRetailQuoteResponse(res)).toEqual([]);
  });

  it("rejects liveQuoteEnabled = true in response", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const issues = validateRetailQuoteResponse({ ...res, liveQuoteEnabled: true as false });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("liveQuoteEnabled")]));
  });

  it("rejects missing customer confirmation requirement", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const issues = validateRetailQuoteResponse({
      ...res,
      requiresCustomerConfirmation: false as true
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("confirmation")]));
  });

  it("rejects coupon applied without positive savings", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const issues = validateRetailQuoteResponse({
      ...res,
      couponApplied: true,
      couponSavingsCents: 0,
      couponCode: "SAVE20"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("savings")]));
  });

  it("rejects coupon applied without coupon code", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const issues = validateRetailQuoteResponse({
      ...res,
      couponApplied: true,
      couponSavingsCents: 100,
      couponCode: undefined
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("coupon code")]));
  });

  it("rejects zero subtotal on quoted status", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const issues = validateRetailQuoteResponse({ ...res, subtotalCents: 0, status: "quoted" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("subtotal")]));
  });

  it("rejects missing blocked reason", () => {
    const res = buildStubRetailQuoteResponse(basePickupRequest, nowMs);
    const issues = validateRetailQuoteResponse({ ...res, blockedReason: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("fulfillment blockers")]));
  });
});
