import { describe, expect, it } from "vitest";
import {
  getOrderEnablementPolicy,
  getRetailOrderEnablementPolicies,
  orderEnablementRuntimeFlags,
  retailOrderEnablementVendorIds,
  validateOrderEnablementPolicies
} from "./orderEnablement";

describe("Order enablement policy", () => {
  it("keeps every Order and retail operation disabled until Proof exists", () => {
    expect(validateOrderEnablementPolicies()).toEqual([]);

    for (const policy of getRetailOrderEnablementPolicies()) {
      expect(policy.realOrdersEnabled).toBe(false);
      expect(policy.directOrderEnabled).toBe(false);
      expect(policy.canPlaceRealOrder).toBe(false);
      expect(policy.requiresManualConfirmation).toBe(true);
      expect(policy.liveQuoteEnabled).toBe(false);
      expect(policy.imageUploadEnabled).toBe(false);
      expect(policy.orderPlacementEnabled).toBe(false);
      expect(policy.requiredGates).toEqual(expect.arrayContaining(["customer-approval", "real-order-kill-switch"]));
      expect(policy.requiredEvidence.length).toBeGreaterThan(0);
      expect(policy.disabledReasons.length).toBeGreaterThan(0);
    }
  });

  it("exposes one runtime flag shape for Handoff, Order, and Vendor Adapter modules", () => {
    expect(retailOrderEnablementVendorIds).toEqual(["walgreens", "cvs", "fedex", "walmart"]);
    expect(orderEnablementRuntimeFlags("walgreens")).toEqual({
      realOrdersEnabled: false,
      directOrderEnabled: false,
      canPlaceRealOrder: false,
      requiresManualConfirmation: true,
      liveQuoteEnabled: false,
      imageUploadEnabled: false,
      orderPlacementEnabled: false
    });
    expect(orderEnablementRuntimeFlags(getOrderEnablementPolicy("walgreens"))).toEqual(orderEnablementRuntimeFlags("walgreens"));
  });

  it("fails closed for unsupported Handoff vendors", () => {
    expect(getOrderEnablementPolicy("unknown-printer")).toBe(getOrderEnablementPolicy("local-print-shop"));
  });
});
