import { describe, expect, it } from "vitest";
import {
  buildCustomerWebExperience,
  collectCustomerWebCopy,
  validateCustomerWebExperience,
  type CustomerWebExperienceInput
} from "./customerWebExperience";

const baseInput: CustomerWebExperienceInput = {
  hasWorkspace: false,
  cardReviewStarted: false,
  opportunityTitle: "Anniversary card for Sara and Ahmed",
  opportunityDateLabel: "July 12, 2026",
  opportunityStatus: "ready",
  opportunityRecommendedPath: "Review the pasted invite, then draft a botanical card.",
  opportunityConfidence: 92,
  evidenceCount: 3,
  memoryMatched: true,
  panelCount: 4,
  checkoutMode: "manual",
  supportedLocaleCount: 4,
  selectedLocaleLabel: "English (US)",
  selectedLocaleRequiresRtl: false,
  selectedLocaleReviewState: "ready",
  cardLanguage: "English",
  productionGateCount: 13,
  productionEvidenceMissing: 13
};

describe("customer web experience contract", () => {
  it("starts with one local setup primary action and customer-safe copy", () => {
    const experience = buildCustomerWebExperience(baseInput);

    expect(experience.stage).toBe("setup");
    expect(experience.actions.filter((action) => action.priority === "primary")).toEqual([
      expect.objectContaining({ id: "create-workspace", label: "Create local workspace" })
    ]);
    expect(experience.actions.map((action) => action.id)).toEqual(["create-workspace", "paste-invite"]);
    expect(experience.eyebrow).toBe("Your workspace");
    expect(experience.safetyMetrics).toMatchObject({
      Ordering: "Outside app",
      Payment: "No charge",
      Checkout: "Confirm first",
      "Price check": "Before print"
    });
    expect(validateCustomerWebExperience(experience)).toEqual([]);
    expect(collectCustomerWebCopy(experience)).toEqual(expect.arrayContaining(["Create private workspace"]));
  });

  it("routes an existing workspace through event review before drafting", () => {
    const experience = buildCustomerWebExperience({
      ...baseInput,
      hasWorkspace: true
    });

    expect(experience.stage).toBe("event-review");
    expect(experience.actions.filter((action) => action.priority === "primary")).toEqual([
      expect.objectContaining({ id: "review-event", label: "Review event" })
    ]);
    expect(experience.actions.map((action) => action.id)).not.toContain("make-card");
    expect(experience.flowSteps.map((step) => step.state)).toEqual(["complete", "current", "next", "next"]);
    expect(validateCustomerWebExperience(experience)).toEqual([]);
  });

  it("unlocks proof and fulfillment only after the card review starts", () => {
    const experience = buildCustomerWebExperience({
      ...baseInput,
      hasWorkspace: true,
      cardReviewStarted: true
    });

    expect(experience.stage).toBe("proof-review");
    expect(experience.actions.filter((action) => action.priority === "primary")).toEqual([
      expect.objectContaining({ id: "continue-proof", label: "Continue proof review" })
    ]);
    expect(experience.actions.map((action) => action.id)).toEqual([
      "continue-proof",
      "choose-fulfillment",
      "add-memory"
    ]);
    expect(experience.fulfillment.title).toBe("Best available options");
    expect(experience.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "choose-fulfillment",
          label: "Compare print options",
          detail: "Confirm pickup, shipping, coupons, and tax before checkout."
        })
      ])
    );
    expect(validateCustomerWebExperience(experience)).toEqual([]);
  });

  it("rejects multiple primary actions and internal customer copy", () => {
    const experience = buildCustomerWebExperience(baseInput);
    const unsafeExperience = {
      ...experience,
      actions: [
        ...experience.actions,
        { ...experience.actions[1], priority: "primary" as const, label: "Provider adapters gated" }
      ],
      chatSafetyBadges: [...experience.chatSafetyBadges, "No live model call"],
      fulfillment: { ...experience.fulfillment, holdDescription: "OAuth gated vendor coupon evidence" }
    };

    expect(validateCustomerWebExperience(unsafeExperience)).toEqual(
      expect.arrayContaining([
        "Customer web experience must expose exactly one primary action.",
        "Customer web copy must not expose internal readiness/provider terms."
      ])
    );
  });
});
