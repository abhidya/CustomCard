import { describe, expect, it } from "vitest";
import {
  buildCustomerWebExperience,
  collectCustomerWebCopy,
  customerVisibleImplementationTermPattern,
  validateCustomerWebExperience,
  type CustomerWebExperienceInput
} from "./customerWebExperience";

const baseInput: CustomerWebExperienceInput = {
  hasWorkspace: false,
  cardReviewStarted: false,
  proofApproved: false,
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

const requestedBlockedCustomerTerms = [
  "placeholder",
  "demo",
  "mock",
  "dummy",
  "provider-portal",
  "handoff",
  "adapter",
  "API",
  "OAuth-gated",
  "runtime",
  "launch gate",
  "evidence gap"
];

describe("customer web experience contract", () => {
  it("starts with one local setup primary action and customer-safe copy", () => {
    const experience = buildCustomerWebExperience(baseInput);

    expect(experience.stage).toBe("setup");
    expect(experience.primaryAction).toMatchObject({ id: "create-workspace", label: "Create local workspace" });
    expect(experience.supportingActions.map((action) => action.id)).toEqual(["paste-invite"]);
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
    expect(experience.primaryAction).toMatchObject({ id: "review-event", label: "Review event" });
    expect(experience.supportingActions.map((action) => action.id)).toEqual(["add-memory"]);
    expect(experience.actions.filter((action) => action.priority === "primary")).toEqual([
      expect.objectContaining({ id: "review-event", label: "Review event" })
    ]);
    expect(experience.actions.map((action) => action.id)).not.toContain("make-card");
    expect(experience.flowSteps.map((step) => step.state)).toEqual(["complete", "current", "next", "next"]);
    expect(validateCustomerWebExperience(experience)).toEqual([]);
  });

  it("keeps print comparison locked while proof review is still active", () => {
    const experience = buildCustomerWebExperience({
      ...baseInput,
      hasWorkspace: true,
      cardReviewStarted: true
    });

    expect(experience.stage).toBe("proof-review");
    expect(experience.primaryAction).toMatchObject({ id: "continue-proof", label: "Continue proof review" });
    expect(experience.supportingActions.map((action) => action.id)).toEqual(["add-memory"]);
    expect(experience.actions.filter((action) => action.priority === "primary")).toEqual([
      expect.objectContaining({ id: "continue-proof", label: "Continue proof review" })
    ]);
    expect(experience.actions.map((action) => action.id)).toEqual(["continue-proof", "add-memory"]);
    expect(experience.fulfillment).toMatchObject({
      title: "Print options after proof",
      statusLabel: "Waiting for proof approval",
      showOptions: false
    });
    expect(experience.flowSteps.map((step) => step.state)).toEqual(["complete", "complete", "current", "next"]);
    expect(validateCustomerWebExperience(experience)).toEqual([]);
  });

  it("makes print comparison the primary action after proof approval", () => {
    const experience = buildCustomerWebExperience({
      ...baseInput,
      hasWorkspace: true,
      cardReviewStarted: true,
      proofApproved: true
    });

    expect(experience.stage).toBe("proof-review");
    expect(experience.primaryAction).toMatchObject({ id: "choose-fulfillment", label: "Compare print options" });
    expect(experience.supportingActions.map((action) => action.id)).toEqual(["add-memory"]);
    expect(experience.actions.filter((action) => action.priority === "primary")).toEqual([
      expect.objectContaining({ id: "choose-fulfillment", label: "Compare print options" })
    ]);
    expect(experience.actions.map((action) => action.id)).toEqual(["choose-fulfillment", "add-memory"]);
    expect(experience.fulfillment.title).toBe("Best available options");
    expect(experience.fulfillment.showOptions).toBe(true);
    expect(experience.flowSteps.map((step) => step.state)).toEqual(["complete", "complete", "complete", "current"]);
    expect(experience.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "choose-fulfillment",
          label: "Compare print options",
          detail: "Review the estimate, then finish on the print shop site."
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
      primaryAction: { ...experience.actions[1], priority: "secondary" as const },
      supportingActions: [...experience.supportingActions, { ...experience.actions[0], priority: "primary" as const }],
      chatSafetyBadges: [...experience.chatSafetyBadges, "No live model call"],
      fulfillment: { ...experience.fulfillment, holdDescription: "OAuth gated vendor coupon evidence" }
    };

    expect(validateCustomerWebExperience(unsafeExperience)).toEqual(
      expect.arrayContaining([
        "Customer web experience must expose exactly one primary action.",
        "Customer web primary action must be the single prominent action.",
        "Customer web supporting actions must stay secondary.",
        "Customer web copy must not expose internal readiness/provider terms."
      ])
    );
  });

  it("rejects the requested implementation terms from customer-visible copy", () => {
    const experience = buildCustomerWebExperience(baseInput);

    for (const term of requestedBlockedCustomerTerms) {
      const unsafeExperience = {
        ...experience,
        panelNote: `${experience.panelNote} ${term}`
      };

      expect(customerVisibleImplementationTermPattern.test(term)).toBe(true);
      expect(validateCustomerWebExperience(unsafeExperience)).toContain(
        "Customer web copy must not expose internal readiness/provider terms."
      );
    }
  });
});
