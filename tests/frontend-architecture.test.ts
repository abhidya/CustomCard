import { describe, expect, it } from "vitest";
import { buildCheckoutCustomer, mergeCheckoutCustomerDefaults, updateCheckoutCustomerField } from "../webapp/checkoutModel";
import { buildDraftProgressState, displayDraftValue } from "../webapp/draftProgress";
import {
  getAdminAccessStatus,
  getAdminSurfaceHeading,
  getAdminTargetLabel,
  resolveActiveCustomerNavView,
  resolveVisibleCustomerView,
  shouldShowCustomerCta
} from "../webapp/routePolicy";
import type { CardDraftInput } from "../src/customerWorkflow";

const defaultDraftInput: CardDraftInput = {
  recipient: "Someone important",
  sender: "Local User",
  relationship: "Friends",
  occasion: "card",
  tone: "warm",
  style: "botanical",
  language: "English",
  personalNote: "",
  useMemory: true
};

describe("frontend architecture seams", () => {
  it("keeps route visibility policy out of the app shell render logic", () => {
    expect(resolveVisibleCustomerView("admin")).toBe("customer");
    expect(resolveVisibleCustomerView("adapters")).toBe("customer");
    expect(resolveVisibleCustomerView("legal")).toBe("customer");
    expect(resolveVisibleCustomerView("business")).toBe("customer");
    expect(resolveVisibleCustomerView("opportunities")).toBe("opportunities");

    expect(resolveActiveCustomerNavView("business")).toBe("customer");
    expect(resolveActiveCustomerNavView("legal")).toBe("legal");

    expect(shouldShowCustomerCta("customer")).toBe(true);
    expect(shouldShowCustomerCta("legal")).toBe(false);
    expect(shouldShowCustomerCta("business")).toBe(false);
    expect(shouldShowCustomerCta("admin")).toBe(false);
  });

  it("keeps admin gate labels and statuses behind one policy interface", () => {
    expect(getAdminTargetLabel("adapters")).toBe("Adapters");
    expect(getAdminTargetLabel("admin")).toBe("Admin panel");
    expect(getAdminSurfaceHeading("adapters")).toBe("Adapter readiness");
    expect(getAdminSurfaceHeading("admin")).toBe("Admin panel");

    expect(getAdminAccessStatus({ isLoaded: false, isSignedIn: false, isAdmin: false })).toBe("Checking account access");
    expect(getAdminAccessStatus({ isLoaded: true, isSignedIn: false, isAdmin: false })).toBe("Sign in required");
    expect(getAdminAccessStatus({ isLoaded: true, isSignedIn: true, isAdmin: false })).toBe("Admin access required");
  });

  it("centralizes draft progress and placeholder display rules", () => {
    expect(buildDraftProgressState(defaultDraftInput, false)).toEqual({
      hasMeaningfulProgress: false,
      status: "draft"
    });
    expect(displayDraftValue("Someone important")).toBe("");
    expect(displayDraftValue("Local User")).toBe("");
    expect(displayDraftValue("Sara")).toBe("Sara");

    const namedDraft = { ...defaultDraftInput, recipient: "Sara" };
    expect(buildDraftProgressState(namedDraft, false)).toEqual({
      hasMeaningfulProgress: true,
      status: "in-progress"
    });
    expect(buildDraftProgressState(namedDraft, true).status).toBe("ready-for-review");
  });

  it("normalizes checkout customer defaults and edits outside PrintView", () => {
    expect(buildCheckoutCustomer({ name: "Maya Patel", email: "maya@example.com", phone: "+1 (212) 555-0199" })).toEqual({
      firstName: "Maya",
      lastName: "Patel",
      email: "maya@example.com",
      phone: "2125550199"
    });

    expect(
      mergeCheckoutCustomerDefaults(
        { firstName: "", lastName: "Custom", email: "", phone: "" },
        { name: "Maya Patel", email: "maya@example.com", phone: "212-555-0199" }
      )
    ).toEqual({
      firstName: "Maya",
      lastName: "Custom",
      email: "maya@example.com",
      phone: "2125550199"
    });

    expect(updateCheckoutCustomerField({ firstName: "", lastName: "", email: "", phone: "" }, "phone", "1-212-555-0199"))
      .toMatchObject({ phone: "2125550199" });
  });
});
