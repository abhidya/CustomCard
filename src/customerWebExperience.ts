export type CustomerWebStage = "setup" | "event-review" | "proof-review";

export type CustomerWebActionId =
  | "create-workspace"
  | "paste-invite"
  | "review-event"
  | "continue-proof"
  | "choose-fulfillment"
  | "add-memory";

export type CustomerWebActionPriority = "primary" | "secondary";
export type CustomerWebStepState = "complete" | "current" | "next";

export interface CustomerWebExperienceInput {
  hasWorkspace: boolean;
  cardReviewStarted: boolean;
  opportunityTitle: string;
  opportunityDateLabel: string;
  opportunityStatus: "ready" | "needs-more-detail";
  opportunityRecommendedPath: string;
  opportunityConfidence: number;
  evidenceCount: number;
  memoryMatched: boolean;
  panelCount: number;
  checkoutMode: "manual" | "ready";
  supportedLocaleCount: number;
  selectedLocaleLabel: string;
  selectedLocaleRequiresRtl: boolean;
  selectedLocaleReviewState: "ready" | "human-review-required";
  cardLanguage: string;
  productionGateCount: number;
  productionEvidenceMissing: number;
}

export interface CustomerWebAction {
  id: CustomerWebActionId;
  label: string;
  detail: string;
  priority: CustomerWebActionPriority;
}

export interface CustomerWebStep {
  label: string;
  detail: string;
  state: CustomerWebStepState;
}

export interface CustomerWebEventSummary {
  title: string;
  dateLabel: string;
  statusLabel: string;
  recommendedPath: string;
  confidenceLabel: string;
  panelLabel: string;
  memoryLabel: string;
  checkoutLabel: string;
}

export interface CustomerWebFulfillmentSummary {
  title: string;
  statusLabel: string;
  holdTitle: string;
  holdDescription: string;
  showOptions: boolean;
}

export interface CustomerWebExperience {
  stage: CustomerWebStage;
  eyebrow: string;
  title: string;
  statusLabel: string;
  workspaceTitle: string;
  workspaceStatusLabel: string;
  workspaceHelp: string;
  actions: CustomerWebAction[];
  flowSteps: CustomerWebStep[];
  event: CustomerWebEventSummary;
  fulfillment: CustomerWebFulfillmentSummary;
  panelNote: string;
  chatTitle: string;
  chatStatusLabel: string;
  chatSafetyBadges: string[];
  artworkMetrics: Record<string, string>;
  privacyMetrics: Record<string, string>;
  localeMetrics: Record<string, string>;
  safetyMetrics: Record<string, string>;
}

export function buildCustomerWebExperience(input: CustomerWebExperienceInput): CustomerWebExperience {
  const stage = resolveStage(input);
  const actions = buildActions(stage);
  const localeReviewLabel = input.selectedLocaleReviewState === "ready" ? "Ready" : "Review";

  return {
    stage,
    eyebrow: "Customer workspace",
    title:
      stage === "setup"
        ? "Create private workspace"
        : stage === "event-review"
          ? "Review event before drafting"
          : "Review card proof",
    statusLabel:
      stage === "setup"
        ? "No account required"
        : stage === "event-review"
          ? "Private workspace"
          : "Proof ready",
    workspaceTitle:
      stage === "setup"
        ? "Create private workspace"
        : stage === "event-review"
          ? "Workspace ready"
          : "Draft in progress",
    workspaceStatusLabel:
      stage === "setup"
        ? "Browser only"
        : stage === "event-review"
          ? "Saved locally"
          : "Needs approval",
    workspaceHelp:
      stage === "setup"
        ? "Start with browser storage or paste an invite without connecting an account."
        : stage === "event-review"
          ? `${input.evidenceCount} source item${input.evidenceCount === 1 ? "" : "s"} are ready for your review before a draft is created.`
          : "Check copy, names, language, and artwork before export or fulfillment.",
    actions,
    flowSteps: buildFlowSteps(stage),
    event: {
      title: input.opportunityTitle,
      dateLabel: input.opportunityDateLabel,
      statusLabel: input.opportunityStatus === "ready" ? "Ready for review" : "Needs details",
      recommendedPath: input.opportunityRecommendedPath,
      confidenceLabel: `${input.opportunityConfidence}%`,
      panelLabel: `${input.panelCount}`,
      memoryLabel: input.memoryMatched ? "Matched" : "None",
      checkoutLabel: input.checkoutMode === "ready" ? "Ready" : "Manual"
    },
    fulfillment: {
      title: stage === "proof-review" ? "Best available options" : "Fulfillment after proof",
      statusLabel: stage === "proof-review" ? "Ready to compare" : "Waiting for proof",
      holdTitle: "Manual print options unlock after the card proof exists.",
      holdDescription: "Prices stay review-only until you confirm the final cart, coupons, pickup, and tax.",
      showOptions: stage === "proof-review"
    },
    panelNote:
      stage === "setup"
        ? "No outside account sign-in is needed for the local path."
        : stage === "event-review"
          ? "Drafting stays behind event review so the card starts from details you approve."
          : "Manual export and fulfillment comparison are available after proof review.",
    chatTitle: "Card assistant",
    chatStatusLabel: "Private local replies",
    chatSafetyBadges: ["Runs in this browser", "No outside transcript"],
    artworkMetrics: {
      Artwork: "Template",
      Images: "Off",
      "Print size": "5x7",
      Approval: "You"
    },
    privacyMetrics: {
      Memory: "Approved",
      Import: "Review",
      Checkout: "Manual",
      Payments: "Off"
    },
    localeMetrics: {
      Locales: `${input.supportedLocaleCount}`,
      RTL: input.selectedLocaleRequiresRtl ? "Review" : "No",
      Copy: localeReviewLabel,
      "Card language": input.cardLanguage || input.selectedLocaleLabel
    },
    safetyMetrics: {
      Orders: "Off",
      Charges: "Off",
      Checks: `${input.productionGateCount}`,
      "Before launch": `${input.productionEvidenceMissing}`
    }
  };
}

export function validateCustomerWebExperience(experience: CustomerWebExperience): string[] {
  const issues: string[] = [];
  const primaryActions = experience.actions.filter((action) => action.priority === "primary");

  if (primaryActions.length !== 1) {
    issues.push("Customer web experience must expose exactly one primary action.");
  }

  const copy = collectCustomerWebCopy(experience).join(" ");
  if (/\b(provider adapters?|credential-gated|no live model call|runtime|launch gates?|evidence gaps?|api)\b/i.test(copy)) {
    issues.push("Customer web copy must not expose internal readiness/provider terms.");
  }

  if (experience.stage !== "proof-review" && experience.actions.some((action) => action.id === "choose-fulfillment")) {
    issues.push("Fulfillment comparison must stay unavailable until card proof review starts.");
  }

  return issues;
}

export function collectCustomerWebCopy(experience: CustomerWebExperience): string[] {
  return [
    experience.eyebrow,
    experience.title,
    experience.statusLabel,
    experience.workspaceTitle,
    experience.workspaceStatusLabel,
    experience.workspaceHelp,
    experience.panelNote,
    experience.chatTitle,
    experience.chatStatusLabel,
    ...experience.chatSafetyBadges,
    ...experience.actions.flatMap((action) => [action.label, action.detail]),
    ...experience.flowSteps.flatMap((step) => [step.label, step.detail]),
    ...Object.values(experience.event),
    ...Object.values(experience.fulfillment).map((value) => String(value)),
    ...Object.values(experience.artworkMetrics),
    ...Object.values(experience.privacyMetrics),
    ...Object.values(experience.localeMetrics),
    ...Object.values(experience.safetyMetrics)
  ];
}

function resolveStage(input: CustomerWebExperienceInput): CustomerWebStage {
  if (!input.hasWorkspace) return "setup";
  if (!input.cardReviewStarted) return "event-review";
  return "proof-review";
}

function buildActions(stage: CustomerWebStage): CustomerWebAction[] {
  if (stage === "setup") {
    return [
      {
        id: "create-workspace",
        label: "Create local workspace",
        detail: "Save drafts and approved memories in this browser.",
        priority: "primary"
      },
      {
        id: "paste-invite",
        label: "Paste invite or ICS",
        detail: "Continue without connecting an account.",
        priority: "secondary"
      }
    ];
  }

  if (stage === "event-review") {
    return [
      {
        id: "review-event",
        label: "Review event",
        detail: "Confirm recipient, date, and source details first.",
        priority: "primary"
      },
      {
        id: "add-memory",
        label: "Add memory",
        detail: "Attach only personal details you approve.",
        priority: "secondary"
      }
    ];
  }

  return [
    {
      id: "continue-proof",
      label: "Continue proof review",
      detail: "Check copy, language, and artwork before export.",
      priority: "primary"
    },
    {
      id: "choose-fulfillment",
      label: "Compare fulfillment",
      detail: "Review pickup, shipping, and coupon evidence.",
      priority: "secondary"
    },
    {
      id: "add-memory",
      label: "Add memory",
      detail: "Save details you want reused later.",
      priority: "secondary"
    }
  ];
}

function buildFlowSteps(stage: CustomerWebStage): CustomerWebStep[] {
  if (stage === "setup") {
    return [
      { label: "Create workspace", detail: "Local browser storage", state: "current" },
      { label: "Review event", detail: "Confirm what was imported", state: "next" },
      { label: "Proof card", detail: "Check copy and artwork", state: "next" },
      { label: "Fulfillment", detail: "Compare manual print options", state: "next" }
    ];
  }

  if (stage === "event-review") {
    return [
      { label: "Workspace", detail: "Ready in this browser", state: "complete" },
      { label: "Review event", detail: "Current step", state: "current" },
      { label: "Proof card", detail: "After event approval", state: "next" },
      { label: "Fulfillment", detail: "After proof approval", state: "next" }
    ];
  }

  return [
    { label: "Workspace", detail: "Ready in this browser", state: "complete" },
    { label: "Event", detail: "Approved for drafting", state: "complete" },
    { label: "Proof card", detail: "Current step", state: "current" },
    { label: "Fulfillment", detail: "After proof review", state: "next" }
  ];
}
