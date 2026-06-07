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
  proofApproved: boolean;
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
  primaryAction: CustomerWebAction;
  supportingActions: CustomerWebAction[];
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

const customerVisibleFixtureTermSources = [
  "placeholders?",
  "demos?",
  "mock(?:ups?)?",
  "dumm(?:y|ies)"
];

const customerVisibleImplementationTermSources = [
  "providers?",
  "provider[- ]portals?",
  "handoffs?",
  "vendors?",
  "adapters?",
  "apis?",
  "oauth[- ]gated",
  "credential[- ]gated",
  "runtime",
  "launch[- ]gates?",
  "evidence[- ]gaps?",
  "mvp",
  "no live model call",
  "production safety",
  "real orders disabled",
  "coupon evidence"
];

export const customerVisibleFixtureTermPattern = new RegExp(
  `\\b(?:${customerVisibleFixtureTermSources.join("|")})\\b`,
  "i"
);

export const customerVisibleImplementationTermPattern = new RegExp(
  `\\b(?:${customerVisibleImplementationTermSources.join("|")})\\b`,
  "i"
);

const customerVisibleUnsafeCopyPattern = new RegExp(
  `\\b(?:${[...customerVisibleFixtureTermSources, ...customerVisibleImplementationTermSources].join("|")})\\b`,
  "i"
);

export function buildCustomerWebExperience(input: CustomerWebExperienceInput): CustomerWebExperience {
  const stage = resolveStage(input);
  const proofApproved = stage === "proof-review" && input.proofApproved;
  const actions = buildActions(stage, proofApproved);
  const primaryAction = actions.find((action) => action.priority === "primary");
  if (!primaryAction) throw new Error(`Customer web stage ${stage} is missing a primary action.`);
  const localeReviewLabel = input.selectedLocaleReviewState === "ready" ? "Ready" : "Review";

  return {
    stage,
    eyebrow: "Your workspace",
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
          : "Check copy, names, language, and artwork before export or print options.",
    actions,
    primaryAction,
    supportingActions: actions.filter((action) => action.priority === "secondary"),
    flowSteps: buildFlowSteps(stage, proofApproved),
    event: {
      title: input.opportunityTitle,
      dateLabel: input.opportunityDateLabel,
      statusLabel: input.opportunityStatus === "ready" ? "Ready for review" : "Needs details",
      recommendedPath: input.opportunityRecommendedPath,
      confidenceLabel: `${input.opportunityConfidence}%`,
      panelLabel: `${input.panelCount}`,
      memoryLabel: input.memoryMatched ? "Matched" : "None",
      checkoutLabel: input.checkoutMode === "ready" ? "Ready" : "Confirm first"
    },
    fulfillment: {
      title: proofApproved ? "Best available options" : "Print options after proof",
      statusLabel: proofApproved ? "Ready to compare" : "Waiting for proof approval",
      holdTitle: "Print options unlock after the proof passes review.",
      holdDescription: "Final price, coupons, tax, and pickup time are confirmed before checkout.",
      showOptions: proofApproved
    },
    panelNote:
      stage === "setup"
        ? "No outside account sign-in is needed for the local path."
        : stage === "event-review"
          ? "Drafting stays behind event review so the card starts from details you approve."
          : "Print files and comparison are available after proof review.",
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
      Ordering: "Outside app",
      Payment: "No charge",
      Checkout: "Confirm first",
      "Price check": "Before print"
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
  if (customerVisibleUnsafeCopyPattern.test(copy)) {
    issues.push("Customer web copy must not expose internal readiness/provider terms.");
  }

  if (experience.stage !== "proof-review" && experience.actions.some((action) => action.id === "choose-fulfillment")) {
    issues.push("Fulfillment comparison must stay unavailable until card proof review starts.");
  }

  if (experience.primaryAction.priority !== "primary") {
    issues.push("Customer web primary action must be the single prominent action.");
  }

  if (experience.supportingActions.some((action) => action.priority !== "secondary")) {
    issues.push("Customer web supporting actions must stay secondary.");
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
    experience.primaryAction.label,
    experience.primaryAction.detail,
    ...experience.supportingActions.flatMap((action) => [action.label, action.detail]),
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

function buildActions(stage: CustomerWebStage, proofApproved = false): CustomerWebAction[] {
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
        detail: "Use an invite when you are ready to add details.",
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
        detail: "Optional: add details you want used in this card.",
        priority: "secondary"
      }
    ];
  }

  if (!proofApproved) {
    return [
      {
        id: "continue-proof",
        label: "Continue proof review",
        detail: "Check copy, language, and artwork before export.",
        priority: "primary"
      },
      {
        id: "add-memory",
        label: "Add memory",
        detail: "Optional: save details for future cards.",
        priority: "secondary"
      }
    ];
  }

  return [
    {
      id: "choose-fulfillment",
      label: "Compare print options",
      detail: "Review the estimate, then finish on the print shop site.",
      priority: "primary"
    },
    {
      id: "add-memory",
      label: "Add memory",
      detail: "Optional: save details for future cards.",
      priority: "secondary"
    }
  ];
}

function buildFlowSteps(stage: CustomerWebStage, proofApproved = false): CustomerWebStep[] {
  if (stage === "setup") {
    return [
      { label: "Create workspace", detail: "Local browser storage", state: "current" },
      { label: "Review event", detail: "Confirm what was imported", state: "next" },
      { label: "Proof card", detail: "Check copy and artwork", state: "next" },
      { label: "Print options", detail: "Compare manual print choices", state: "next" }
    ];
  }

  if (stage === "event-review") {
    return [
      { label: "Workspace", detail: "Ready in this browser", state: "complete" },
      { label: "Review event", detail: "Current step", state: "current" },
      { label: "Proof card", detail: "After event approval", state: "next" },
      { label: "Print options", detail: "After proof approval", state: "next" }
    ];
  }

  return [
    { label: "Workspace", detail: "Ready in this browser", state: "complete" },
    { label: "Event", detail: "Approved for drafting", state: "complete" },
    { label: "Proof card", detail: proofApproved ? "Approved" : "Current step", state: proofApproved ? "complete" : "current" },
    { label: "Print options", detail: proofApproved ? "Current step" : "After proof review", state: proofApproved ? "current" : "next" }
  ];
}
