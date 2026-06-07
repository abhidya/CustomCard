import {
  buildCalendarConnectionStartPackets,
  type CalendarConnectionStartMode,
  type CalendarConnectionStartPacket
} from "../../../src/onboardingCalendar";

export const requiredMobileCapabilities = [
  "account-import",
  "card-queue",
  "approval-controls",
  "memory-review",
  "text-chat",
  "image-render",
  "pricing-preview",
  "handoff",
  "offline-sync"
] as const;

export type MobileExperienceCapability = (typeof requiredMobileCapabilities)[number];
export type MobileExperienceStatus = "Ready" | "Approved" | "Local" | "Free" | "Manual";
export type MobileCardQueueStatus = "needs-approval" | "approved" | "ready-for-handoff";
export type MobileApprovalActionKind = "approve" | "edit-tone" | "snooze" | "dismiss" | "request-regeneration";
export type MobileMutationType = "approve-card" | "update-tone" | "snooze-card" | "dismiss-card" | "prepare-handoff";
export type MobileAccountProvider = "Google" | "Apple";
export type MobileImportActionKind = "calendar" | "email" | "invite";
export type MobileCalendarSourceMode = "oauth-readiness" | "manual-export" | "contract-gated" | "local-paste";
export type MobileFulfillmentRecommendationKind = "cheapest-known-price" | "fastest-pickup" | "cheapest-shipped";
export type MobileCustomerFlowStage =
  | "account-import"
  | "event-review"
  | "card-approval"
  | "proof-review"
  | "fulfillment-review"
  | "checkout-confirmation";

export interface MobileExperienceSection {
  id: MobileExperienceCapability;
  title: string;
  detail: string;
  status: MobileExperienceStatus;
  customerVisible: boolean;
}

export interface MobileTodaySummary {
  cardQueueItemId: string;
  recipientLabel: string;
  eventLabel: string;
  dueLabel: string;
  primaryAction: MobileApprovalActionKind;
  riskBadge: string;
  panelCount: number;
  offlineReady: boolean;
  realOrdersEnabled: boolean;
  customerVisible: boolean;
}

export interface MobileCardQueueItem {
  id: string;
  recipientLabel: string;
  eventLabel: string;
  dueIso: string;
  status: MobileCardQueueStatus;
  nextAction: MobileApprovalActionKind;
  panelCount: number;
  source: "ics-import" | "manual-entry" | "crm-lifecycle";
  customerVisible: boolean;
}

export interface MobileAccountOption {
  provider: MobileAccountProvider;
  label: string;
  detail: string;
  sourceMode: Extract<MobileCalendarSourceMode, "oauth-readiness" | "manual-export">;
  startMode: Extract<CalendarConnectionStartMode, "oauth-evidence-required" | "manual-export-guide">;
  startRoute: CalendarConnectionStartPacket["apiRoute"];
  nextApiRoute: CalendarConnectionStartPacket["nextApiRoute"];
  clientMayPrepareProviderRequest: false;
  canStartNow: boolean;
  dataBoundary: string;
  credentialBoundary: string;
  liveOAuthEnabled: false;
  networkRequestPrepared: false;
  credentialStorageEnabled: false;
  providerRequestUrl: null;
  customerVisible: boolean;
  blockedReason?: string;
}

export interface MobileImportAction {
  kind: MobileImportActionKind;
  label: string;
  detail: string;
  sourceMode: Extract<MobileCalendarSourceMode, "contract-gated" | "local-paste">;
  customerVisible: boolean;
}

export interface MobileApprovalAction {
  kind: MobileApprovalActionKind;
  label: string;
  detail: string;
  mutationType: MobileMutationType;
  idempotencyRequired: boolean;
  networkMode: "local-first-api" | "local-only";
  requiresCustomerConfirmation: boolean;
}

export interface MobileChatMessage {
  speaker: "assistant" | "customer";
  text: string;
  source: "local-script" | "customer-approval";
}

export interface MobileMemoryReviewItem {
  id: string;
  cardQueueItemId: string;
  recipientLabel: string;
  memoryLabel: string;
  usage: "approved" | "review-required";
  approvalRequired: boolean;
  rawContentStored: boolean;
  customerVisible: boolean;
}

export interface MobileRenderChoice {
  label: string;
  detail: string;
  mode: "free-local" | "credential-gated";
}

export interface MobilePricingPreview {
  vendor: "Walgreens" | "CVS" | "FedEx" | "Walmart" | "Staples" | "Office Depot";
  product: string;
  estimatedTotalCents: number;
  sourceMode: "review-only-public-price";
  manualConfirmationRequired: boolean;
  liveQuote: boolean;
}

export interface MobileFulfillmentRecommendation {
  kind: MobileFulfillmentRecommendationKind;
  label: string;
  vendorName: string;
  totalCents: number;
  etaLabel: string;
  confirmationCopy: string;
  liveQuote: false;
  liveOrder: false;
  customerVisible: boolean;
}

export interface MobileHandoffStep {
  label: string;
  detail: string;
  realOrderState: "manual" | "disabled";
}

export interface MobilePrintProofCheck {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  realOrderState: "manual" | "disabled";
  customerVisible: boolean;
}

export interface MobileSafetyBanner {
  label: string;
  detail: string;
}

export interface MobileLocaleOption {
  locale: "en-US" | "es-US" | "ur-PK" | "ar-EG";
  label: string;
  cardLanguage: "English" | "Spanish" | "Urdu" | "Arabic";
  writingDirection: "ltr" | "rtl";
  copyReviewRequired: boolean;
  customerVisible: boolean;
}

export interface MobileSyncState {
  apiBaseUrlRequired: boolean;
  authMode: "customer-session";
  offlineQueueEnabled: boolean;
  idempotencyRequired: boolean;
  pendingMutationTypes: MobileMutationType[];
  forbiddenMutationTypes: Array<"submit-live-order" | "charge-payment" | "upload-raw-memory">;
  retryPolicy: "exponential-backoff";
}

export interface MobileProofBoundary {
  deterministicProofMode: "repo-local-contract";
  webCustomerFlowStages: MobileCustomerFlowStage[];
  repoLocalEvidence: string[];
  blockedLiveProofs: Array<"native-emulator-render" | "signed-native-artifact" | "app-store-review" | "live-retail-order">;
  emulatorProofClaimed: false;
  signedArtifactClaimed: false;
  liveOrderClaimed: false;
}

export interface MobileExperienceModel {
  safetyBanner: MobileSafetyBanner;
  proofBoundary: MobileProofBoundary;
  todaySummary: MobileTodaySummary;
  sections: MobileExperienceSection[];
  accountOptions: MobileAccountOption[];
  importActions: MobileImportAction[];
  queueItems: MobileCardQueueItem[];
  approvalActions: MobileApprovalAction[];
  chatTranscript: MobileChatMessage[];
  memoryReviewItems: MobileMemoryReviewItem[];
  renderChoices: MobileRenderChoice[];
  pricingPreviews: MobilePricingPreview[];
  fulfillmentRecommendations: MobileFulfillmentRecommendation[];
  printProofChecks: MobilePrintProofCheck[];
  handoffSteps: MobileHandoffStep[];
  localeOptions: MobileLocaleOption[];
  syncState: MobileSyncState;
}

export interface MobileRenderMetric {
  label: string;
  value: string;
}

export interface MobileRenderAction {
  label: string;
  detail: string;
  modeLabel: string;
  actionKind?: MobileApprovalActionKind;
}

export interface MobileRenderRow {
  title: string;
  detail: string;
  modeLabel: string;
  actionKind?: MobileApprovalActionKind;
}

export interface MobileRenderSection {
  id:
    | "sign-in-import"
    | "next-action"
    | "card-queue"
    | "memory-review"
    | "approval-controls"
    | "card-assistant"
    | "card-proof-path"
    | "best-available-options"
    | "print-proof"
    | "checkout-confirmation"
    | "offline-sync";
  title: string;
  rows: MobileRenderRow[];
}

export interface MobileRenderSnapshot {
  screenTitle: string;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryAction: MobileRenderAction;
  };
  safetyBand: {
    label: string;
    detail: string;
    metrics: MobileRenderMetric[];
  };
  sections: MobileRenderSection[];
  footerSafetyMessages: string[];
}

export const mobileSafetyBanner = {
  label: "Confirm before checkout",
  detail: "Confirm price, pickup, payment, and ordering on the print shop site before ordering."
} as const;

export const mobileProofBoundary: MobileProofBoundary = {
  deterministicProofMode: "repo-local-contract",
  webCustomerFlowStages: [
    "account-import",
    "event-review",
    "card-approval",
    "proof-review",
    "fulfillment-review",
    "checkout-confirmation"
  ],
  repoLocalEvidence: ["mobile contract tests", "mobile render readiness data", "mobile doctor scripts"],
  blockedLiveProofs: ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"],
  emulatorProofClaimed: false,
  signedArtifactClaimed: false,
  liveOrderClaimed: false
};

export const mobileTodaySummary: MobileTodaySummary = {
  cardQueueItemId: "card_anniversary_sara_ahmed",
  recipientLabel: "Sara and Ahmed",
  eventLabel: "Anniversary",
  dueLabel: "Today by 5:00 PM",
  primaryAction: "approve",
  riskBadge: "Ready to review",
  panelCount: 4,
  offlineReady: true,
  realOrdersEnabled: false,
  customerVisible: true
};

export const mobileExperienceSections: MobileExperienceSection[] = [
  {
    id: "account-import",
    title: "Start with an event",
    detail: "Paste invite/ICS works now; Google Calendar is not connected yet, and Apple uses manual ICS export.",
    status: "Ready",
    customerVisible: true
  },
  {
    id: "card-queue",
    title: "Cards to review",
    detail: "Upcoming card candidates show event source, approval state, due date, and next customer action.",
    status: "Ready",
    customerVisible: true
  },
  {
    id: "approval-controls",
    title: "Card actions",
    detail: "Approve, edit tone, snooze, dismiss, or request local regeneration before any paid generation is used.",
    status: "Manual",
    customerVisible: true
  },
  {
    id: "memory-review",
    title: "Memory review",
    detail: "Only approved relationship notes are eligible for reuse.",
    status: "Approved",
    customerVisible: true
  },
  {
    id: "text-chat",
    title: "Customer chat",
    detail: "Local scripted assistant explains event, memory, artwork, and checkout state.",
    status: "Local",
    customerVisible: true
  },
  {
    id: "image-render",
    title: "Card proof path",
    detail: "Template artwork is ready now; AI artwork stays off until account, review, and spend controls exist.",
    status: "Free",
    customerVisible: true
  },
  {
    id: "pricing-preview",
    title: "Print options",
    detail: "The app compares cheapest known price, fastest pickup, and cheapest shipped options before checkout.",
    status: "Manual",
    customerVisible: true
  },
  {
    id: "handoff",
    title: "Finish manually",
    detail: "Manual upload stays active while automatic retail checkout remains blocked.",
    status: "Manual",
    customerVisible: true
  },
  {
    id: "offline-sync",
    title: "Saved offline",
    detail: "Customer actions stay saved locally and replay safely when the session is available.",
    status: "Local",
    customerVisible: true
  }
];

export const mobileCalendarConnectionStartPackets = buildCalendarConnectionStartPackets().filter(
  (packet) => packet.id === "google-calendar-events" || packet.id === "icloud-ics-fallback"
);

export function buildMobileAccountOptions(
  startPackets: CalendarConnectionStartPacket[] = mobileCalendarConnectionStartPackets
): MobileAccountOption[] {
  return startPackets.map((packet) => {
    const provider = packet.id === "google-calendar-events" ? "Google" : "Apple";

    return {
      provider,
      label: provider === "Google" ? "Google Calendar" : "Apple Calendar ICS export",
      detail:
        provider === "Google"
          ? "Google Calendar is not connected yet. Paste invite/ICS works now while consent and revocation controls are finished."
          : "Export an ICS event or calendar copy, then paste selected event details locally.",
      sourceMode: packet.sourceMode === "manual-export" ? "manual-export" : "oauth-readiness",
      startMode: packet.startMode === "manual-export-guide" ? "manual-export-guide" : "oauth-evidence-required",
      startRoute: packet.apiRoute,
      nextApiRoute: packet.nextApiRoute,
      clientMayPrepareProviderRequest: false,
      canStartNow: packet.canStartNow,
      dataBoundary: packet.dataBoundary,
      credentialBoundary: packet.credentialBoundary,
      liveOAuthEnabled: false,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      providerRequestUrl: null,
      customerVisible: packet.customerVisible,
      blockedReason: packet.blockedReason
    };
  });
}

export const mobileAccountOptions: MobileAccountOption[] = buildMobileAccountOptions();

export const mobileImportActions: MobileImportAction[] = [
  {
    kind: "calendar",
    label: "Review calendar options",
    detail: "Paste invite/ICS works now; Google Calendar is not connected yet, and Apple uses manual ICS export.",
    sourceMode: "contract-gated",
    customerVisible: true
  },
  {
    kind: "email",
    label: "Email receipts later",
    detail: "Email receipt review requires consent, metadata limits, and retention review.",
    sourceMode: "contract-gated",
    customerVisible: true
  },
  {
    kind: "invite",
    label: "Paste invite or ICS",
    detail: "Use the no-account local path for an event or note.",
    sourceMode: "local-paste",
    customerVisible: true
  }
];

export const mobileCardQueueItems: MobileCardQueueItem[] = [
  {
    id: "card_anniversary_sara_ahmed",
    recipientLabel: "Sara and Ahmed",
    eventLabel: "Anniversary",
    dueIso: "2026-06-03T17:00:00.000Z",
    status: "needs-approval",
    nextAction: "approve",
    panelCount: 4,
    source: "ics-import",
    customerVisible: true
  },
  {
    id: "card_birthday_mom",
    recipientLabel: "Mom",
    eventLabel: "Birthday",
    dueIso: "2026-07-10T12:00:00.000Z",
    status: "approved",
    nextAction: "edit-tone",
    panelCount: 4,
    source: "manual-entry",
    customerVisible: true
  }
];

export const mobileApprovalActions: MobileApprovalAction[] = [
  {
    kind: "approve",
    label: "Approve card",
    detail: "Moves the prepared card to print review.",
    mutationType: "approve-card",
    idempotencyRequired: true,
    networkMode: "local-first-api",
    requiresCustomerConfirmation: true
  },
  {
    kind: "edit-tone",
    label: "Edit tone",
    detail: "Stores a customer-approved tone adjustment without calling paid generation.",
    mutationType: "update-tone",
    idempotencyRequired: true,
    networkMode: "local-first-api",
    requiresCustomerConfirmation: true
  },
  {
    kind: "snooze",
    label: "Snooze",
    detail: "Keeps the opportunity in the queue for later review.",
    mutationType: "snooze-card",
    idempotencyRequired: true,
    networkMode: "local-first-api",
    requiresCustomerConfirmation: false
  },
  {
    kind: "dismiss",
    label: "Dismiss",
    detail: "Marks the opportunity inactive without deleting relationship memory.",
    mutationType: "dismiss-card",
    idempotencyRequired: true,
    networkMode: "local-first-api",
    requiresCustomerConfirmation: true
  },
  {
    kind: "request-regeneration",
    label: "Regenerate locally",
    detail: "Uses deterministic local copy and artwork until paid generation is enabled.",
    mutationType: "update-tone",
    idempotencyRequired: true,
    networkMode: "local-only",
    requiresCustomerConfirmation: false
  }
];

export const mobileChatTranscript: MobileChatMessage[] = [
  {
    speaker: "assistant",
    source: "local-script",
    text: "I found one anniversary card candidate from your pasted invite."
  },
  {
    speaker: "customer",
    source: "customer-approval",
    text: "Use the approved memory about their first apartment, but keep it short."
  },
  {
    speaker: "assistant",
    source: "local-script",
    text: "Local scripted assistant can draft and explain the card before any live generation is connected."
  },
  {
    speaker: "assistant",
    source: "local-script",
    text: "Live AI and automatic orders stay off until account, review, and certification gates pass."
  }
];

export const mobileMemoryReviewItems: MobileMemoryReviewItem[] = [
  {
    id: "memory_sara_ahmed_first_apartment",
    cardQueueItemId: "card_anniversary_sara_ahmed",
    recipientLabel: "Sara and Ahmed",
    memoryLabel: "First apartment note",
    usage: "approved",
    approvalRequired: false,
    rawContentStored: false,
    customerVisible: true
  },
  {
    id: "memory_mom_garden",
    cardQueueItemId: "card_birthday_mom",
    recipientLabel: "Mom",
    memoryLabel: "Garden hobby note",
    usage: "review-required",
    approvalRequired: true,
    rawContentStored: false,
    customerVisible: true
  }
];

export const mobileRenderChoices: MobileRenderChoice[] = [
  {
    label: "Template card proof",
    detail: "Free 5x7 panel rendering mirrors the web customer path.",
    mode: "free-local"
  },
  {
    label: "AI artwork",
    detail: "AI artwork is available later after account, budget, and review controls are ready.",
    mode: "credential-gated"
  }
];

export const mobilePricingPreviews: MobilePricingPreview[] = [
  {
    vendor: "Walgreens",
    product: "5x7 folded card",
    estimatedTotalCents: 349,
    sourceMode: "review-only-public-price",
    manualConfirmationRequired: true,
    liveQuote: false
  },
  {
    vendor: "CVS",
    product: "5x7 folded card",
    estimatedTotalCents: 898,
    sourceMode: "review-only-public-price",
    manualConfirmationRequired: true,
    liveQuote: false
  },
  {
    vendor: "FedEx",
    product: "5x7 card print option",
    estimatedTotalCents: 329,
    sourceMode: "review-only-public-price",
    manualConfirmationRequired: true,
    liveQuote: false
  }
];

export const mobileFulfillmentRecommendations: MobileFulfillmentRecommendation[] = [
  {
    kind: "cheapest-known-price",
    label: "Cheapest known price",
    vendorName: "Walmart Photo",
    totalCents: 56,
    etaLabel: "same-day pickup candidate",
    confirmationCopy:
      "Discounts are checked at checkout; tax, stock, and pickup still need review.",
    liveQuote: false,
    liveOrder: false,
    customerVisible: true
  },
  {
    kind: "fastest-pickup",
    label: "Fastest pickup candidate",
    vendorName: "Walmart Photo",
    totalCents: 56,
    etaLabel: "same-day pickup candidate",
    confirmationCopy: "Closest store ETA needs live location and inventory confirmation.",
    liveQuote: false,
    liveOrder: false,
    customerVisible: true
  },
  {
    kind: "cheapest-shipped",
    label: "Cheapest shipped option",
    vendorName: "FedEx Office",
    totalCents: 2299,
    etaLabel: "ships in days",
    confirmationCopy: "Shipping dates and delivery fees require checkout confirmation.",
    liveQuote: false,
    liveOrder: false,
    customerVisible: true
  }
];

export const mobilePrintProofChecks: MobilePrintProofCheck[] = [
  {
    id: "proof-size",
    label: "5x7 format",
    detail: "Four SVG panels match the customer print package.",
    passed: true,
    realOrderState: "manual",
    customerVisible: true
  },
  {
    id: "proof-resolution",
    label: "300 DPI export",
    detail: "The print package keeps print dimensions and checksum evidence together.",
    passed: true,
    realOrderState: "manual",
    customerVisible: true
  },
  {
    id: "proof-safe-zone",
    label: "Safe zone",
    detail: "Panel text stays inside the tested SVG print area.",
    passed: true,
    realOrderState: "manual",
    customerVisible: true
  },
  {
    id: "proof-order-gate",
    label: "Checkout review",
    detail: "Automatic checkout stays off; confirm print shop, price, and pickup before ordering.",
    passed: true,
    realOrderState: "disabled",
    customerVisible: true
  }
];

export const mobileHandoffSteps: MobileHandoffStep[] = [
  {
    label: "Download print package",
    detail: "Download the 5x7 PDF proof and four SVG panels for print shop upload.",
    realOrderState: "manual"
  },
  {
    label: "Confirm pickup or shipping",
    detail: "Automatic checkout is blocked; confirm pickup, shipping, price, and payment on the print shop site.",
    realOrderState: "disabled"
  }
];

export const mobileLocaleOptions: MobileLocaleOption[] = [
  {
    locale: "en-US",
    label: "English (US)",
    cardLanguage: "English",
    writingDirection: "ltr",
    copyReviewRequired: false,
    customerVisible: true
  },
  {
    locale: "es-US",
    label: "Spanish (US)",
    cardLanguage: "Spanish",
    writingDirection: "ltr",
    copyReviewRequired: true,
    customerVisible: true
  },
  {
    locale: "ur-PK",
    label: "Urdu (RTL)",
    cardLanguage: "Urdu",
    writingDirection: "rtl",
    copyReviewRequired: true,
    customerVisible: true
  },
  {
    locale: "ar-EG",
    label: "Arabic (RTL)",
    cardLanguage: "Arabic",
    writingDirection: "rtl",
    copyReviewRequired: true,
    customerVisible: true
  }
];

export const mobileSyncState: MobileSyncState = {
  apiBaseUrlRequired: true,
  authMode: "customer-session",
  offlineQueueEnabled: true,
  idempotencyRequired: true,
  pendingMutationTypes: ["approve-card", "update-tone", "snooze-card", "dismiss-card", "prepare-handoff"],
  forbiddenMutationTypes: ["submit-live-order", "charge-payment", "upload-raw-memory"],
  retryPolicy: "exponential-backoff"
};

export const mobileExperience: MobileExperienceModel = {
  safetyBanner: mobileSafetyBanner,
  proofBoundary: mobileProofBoundary,
  todaySummary: mobileTodaySummary,
  sections: mobileExperienceSections,
  accountOptions: mobileAccountOptions,
  importActions: mobileImportActions,
  queueItems: mobileCardQueueItems,
  approvalActions: mobileApprovalActions,
  chatTranscript: mobileChatTranscript,
  memoryReviewItems: mobileMemoryReviewItems,
  renderChoices: mobileRenderChoices,
  pricingPreviews: mobilePricingPreviews,
  fulfillmentRecommendations: mobileFulfillmentRecommendations,
  printProofChecks: mobilePrintProofChecks,
  handoffSteps: mobileHandoffSteps,
  localeOptions: mobileLocaleOptions,
  syncState: mobileSyncState
};

export const mobileRenderSnapshot = buildMobileRenderSnapshot();

export function buildMobileRenderSnapshot(model: MobileExperienceModel = mobileExperience): MobileRenderSnapshot {
  const approvalByKind = new Map(model.approvalActions.map((action) => [action.kind, action]));
  const primaryAction = approvalByKind.get(model.todaySummary.primaryAction) ?? model.approvalActions[0];

  return {
    screenTitle: "CustomCard",
    hero: {
      eyebrow: "Your card assistant",
      title: "CustomCard",
      subtitle: "Create a local workspace, paste an invite or ICS event, approve a card, and review print options.",
      primaryAction: {
        label: `Review ${model.todaySummary.recipientLabel}'s card`,
        detail: "Check event details, memory, proof, and print options before approving.",
        modeLabel: "Ready to review",
        actionKind: primaryAction.kind
      }
    },
    safetyBand: {
      label: model.safetyBanner.label,
      detail: model.safetyBanner.detail,
      metrics: [
        { label: "cards", value: String(model.queueItems.length) },
        { label: "panels", value: String(model.todaySummary.panelCount) },
        { label: "actions", value: String(model.approvalActions.length) },
        { label: "orders", value: model.todaySummary.realOrdersEnabled ? "On" : "Off" }
      ]
    },
    sections: [
      {
        id: "sign-in-import",
        title: "Start with an event",
        rows: [
          ...model.accountOptions.map((option) => ({
            title: option.label,
            detail: option.detail,
            modeLabel: option.canStartNow ? "Manual" : "Not connected"
          })),
          ...model.importActions.map((action) => ({
            title: action.label,
            detail: action.detail,
            modeLabel: action.sourceMode === "local-paste" ? "Local" : "Later"
          }))
        ]
      },
      {
        id: "next-action",
        title: "Today's card",
        rows: [
          {
            title: `Review ${model.todaySummary.recipientLabel}'s card`,
            detail: `${model.todaySummary.eventLabel} - ${model.todaySummary.dueLabel}`,
            modeLabel: model.todaySummary.riskBadge,
            actionKind: model.todaySummary.primaryAction
          }
        ]
      },
      {
        id: "card-queue",
        title: "Cards to review",
        rows: model.queueItems.map((item) => ({
          title: item.recipientLabel,
          detail: `${item.eventLabel} due ${item.dueIso.slice(0, 10)} from ${sourceLabel(item.source)}; ${item.panelCount} panels ready.`,
          modeLabel: queueStatusLabel(item.status),
          actionKind: item.nextAction
        }))
      },
      {
        id: "memory-review",
        title: "People and memories",
        rows: model.memoryReviewItems.map((item) => ({
          title: item.recipientLabel,
          detail: item.memoryLabel,
          modeLabel: item.usage === "approved" ? "Approved" : "Review"
        }))
      },
      {
        id: "approval-controls",
        title: "Card actions",
        rows: model.approvalActions.map((action) => ({
          title: action.label,
          detail: action.detail,
          modeLabel: actionModeLabel(action),
          actionKind: action.kind
        }))
      },
      {
        id: "card-assistant",
        title: "Card assistant",
        rows: model.chatTranscript.map((message) => ({
          title: message.speaker === "customer" ? "Customer" : "Assistant",
          detail: message.text,
          modeLabel: message.source === "local-script" ? "Local" : "Customer"
        }))
      },
      {
        id: "card-proof-path",
        title: "Preview the card",
        rows: model.renderChoices.map((choice) => ({
          title: choice.label,
          detail: choice.detail,
          modeLabel: choice.mode === "free-local" ? "Free" : "Later"
        }))
      },
      {
        id: "best-available-options",
        title: "Printing options",
        rows: model.fulfillmentRecommendations.map((recommendation) => ({
          title: recommendation.label,
          detail: `${formatCents(recommendation.totalCents)} at ${recommendation.vendorName}; ${recommendation.etaLabel}. ${recommendation.confirmationCopy}`,
          modeLabel: "Confirm"
        }))
      },
      {
        id: "print-proof",
        title: "Print file checks",
        rows: model.printProofChecks.map((check) => ({
          title: check.label,
          detail: check.detail,
          modeLabel: check.passed ? "Passed" : "Check"
        }))
      },
      {
        id: "checkout-confirmation",
        title: "Finish manually",
        rows: model.handoffSteps.map((step) => ({
          title: step.label,
          detail: step.detail,
          modeLabel: step.realOrderState === "manual" ? "Manual" : "Off"
        }))
      },
      {
        id: "offline-sync",
        title: "Saved offline",
        rows: [
          {
            title: "Customer session",
            detail: "Customer actions stay queued offline and replay safely when your session is available.",
            modeLabel: model.syncState.offlineQueueEnabled ? "Saved offline" : "Off"
          }
        ]
      }
    ],
    footerSafetyMessages: [
      "No automatic order, charge, or raw memory upload can run from this mobile shell.",
      "Confirm pickup, shipping, payment, and coupons at checkout before ordering."
    ]
  };
}

export function summarizeMobileExperience(model: MobileExperienceModel = mobileExperience) {
  return {
    capabilityCount: new Set(model.sections.map((section) => section.id)).size,
    customerVisibleSections: model.sections.filter((section) => section.customerVisible).length,
    accountOptions: model.accountOptions.length,
    liveOAuthOptions: model.accountOptions.filter((option) => option.liveOAuthEnabled).length,
    importActions: model.importActions.length,
    todayPrimaryActions: model.todaySummary.customerVisible ? 1 : 0,
    queueItems: model.queueItems.length,
    pendingApprovalItems: model.queueItems.filter((item) => item.status === "needs-approval").length,
    idempotentApprovalActions: model.approvalActions.filter((action) => action.idempotencyRequired).length,
    localChatMessages: model.chatTranscript.filter((message) => message.source === "local-script").length,
    memoryReviewItems: model.memoryReviewItems.length,
    approvedMemoryReviewItems: model.memoryReviewItems.filter((item) => item.usage === "approved").length,
    freeRenderChoices: model.renderChoices.filter((choice) => choice.mode === "free-local").length,
    reviewOnlyPricingOptions: model.pricingPreviews.filter((preview) => preview.sourceMode === "review-only-public-price").length,
    fulfillmentRecommendations: model.fulfillmentRecommendations.length,
    liveFulfillmentRecommendations: model.fulfillmentRecommendations.filter(
      (recommendation) => recommendation.liveQuote || recommendation.liveOrder
    ).length,
    printProofChecks: model.printProofChecks.length,
    passedPrintProofChecks: model.printProofChecks.filter((check) => check.passed).length,
    disabledHandoffSteps: model.handoffSteps.filter((step) => step.realOrderState === "disabled").length,
    localeOptions: model.localeOptions.length,
    rtlLocales: model.localeOptions.filter((locale) => locale.writingDirection === "rtl").length,
    copyReviewRequiredLocales: model.localeOptions.filter((locale) => locale.copyReviewRequired).length,
    offlineMutationTypes: model.syncState.pendingMutationTypes.length,
    webCustomerFlowStages: model.proofBoundary.webCustomerFlowStages.length,
    blockedLiveProofs: model.proofBoundary.blockedLiveProofs.length
  };
}

export function summarizeMobileRenderSnapshot(snapshot: MobileRenderSnapshot = mobileRenderSnapshot) {
  const snapshotText = collectMobileRenderSnapshotText(snapshot);

  return {
    sectionCount: snapshot.sections.length,
    rowCount: snapshot.sections.reduce((total, section) => total + section.rows.length, 0),
    primaryActionCount:
      (snapshot.hero.primaryAction.actionKind === "approve" ? 1 : 0) +
      snapshot.sections
        .filter((section) => section.id === "next-action")
        .flatMap((section) => section.rows)
        .filter((row) => row.actionKind === "approve").length,
    footerSafetyMessages: snapshot.footerSafetyMessages.length,
    blockedLiveActionCount: snapshotText.filter((phrase) => /\b(live order ready|real orders enabled|payment active|paid ai active)\b/i.test(phrase)).length,
    internalProofTermCount: snapshotText.filter((phrase) =>
      /\b(repo-local-contract|native-emulator-render|signed-native-artifact|app-store-review|adapter|provider|vendor api|retail-printer)\b/i.test(phrase)
    ).length
  };
}

export function validateMobileRenderSnapshot(snapshot: MobileRenderSnapshot = mobileRenderSnapshot): string[] {
  const issues: string[] = [];
  const summary = summarizeMobileRenderSnapshot(snapshot);
  const sectionIds = new Set(snapshot.sections.map((section) => section.id));

  if (snapshot.screenTitle !== "CustomCard") issues.push("Mobile render snapshot must name the product.");
  if (!snapshot.hero.primaryAction.label || !snapshot.hero.primaryAction.actionKind) {
    issues.push("Mobile render snapshot must expose a primary customer action.");
  }
  if (snapshot.safetyBand.label !== "Confirm before checkout") {
    issues.push("Mobile render snapshot must keep checkout confirmation in the safety band.");
  }
  for (const metric of ["cards", "panels", "actions", "orders"]) {
    if (!snapshot.safetyBand.metrics.some((item) => item.label === metric)) {
      issues.push(`Mobile render snapshot missing safety metric: ${metric}.`);
    }
  }
  for (const sectionId of [
    "sign-in-import",
    "next-action",
    "card-queue",
    "memory-review",
    "approval-controls",
    "card-assistant",
    "card-proof-path",
    "best-available-options",
    "print-proof",
    "checkout-confirmation",
    "offline-sync"
  ] satisfies MobileRenderSection["id"][]) {
    if (!sectionIds.has(sectionId)) issues.push(`Mobile render snapshot missing section: ${sectionId}.`);
  }
  if (summary.sectionCount !== 11) issues.push("Mobile render snapshot must expose 11 rendered sections.");
  if (summary.rowCount < 30) issues.push("Mobile render snapshot must expose the full customer workflow rows.");
  if (summary.primaryActionCount < 2) issues.push("Mobile render snapshot must place the primary approval action in hero and workflow.");
  if (summary.footerSafetyMessages < 2) issues.push("Mobile render snapshot must keep safety footer messages.");
  if (summary.blockedLiveActionCount > 0) issues.push("Mobile render snapshot must not claim live order, payment, or paid AI actions.");
  if (summary.internalProofTermCount > 0) issues.push("Mobile render snapshot must not expose internal proof terms to customers.");
  if (snapshot.sections.some((section) => section.rows.length === 0)) {
    issues.push("Mobile render snapshot sections must not be empty.");
  }
  if (snapshot.sections.flatMap((section) => section.rows).some((row) => !row.title.trim() || !row.detail.trim() || !row.modeLabel.trim())) {
    issues.push("Mobile render snapshot rows must include title, detail, and mode label.");
  }

  return issues;
}

export function validateMobileExperience(model: MobileExperienceModel = mobileExperience): string[] {
  const issues: string[] = [];
  const sectionIds = new Set(model.sections.map((section) => section.id));

  for (const capability of requiredMobileCapabilities) {
    if (!sectionIds.has(capability)) {
      issues.push(`Missing mobile customer capability: ${capability}`);
    }
  }

  if (model.sections.some((section) => !section.customerVisible)) {
    issues.push("Every mobile experience section must be customer-visible.");
  }

  if (model.sections.length < requiredMobileCapabilities.length) {
    issues.push("Mobile experience does not expose enough customer sections.");
  }

  const accountProviders = new Set(model.accountOptions.map((option) => option.provider));
  for (const provider of ["Google", "Apple"] as const) {
    if (!accountProviders.has(provider)) issues.push(`Missing mobile account option: ${provider}`);
  }
  if (model.accountOptions.some((option) => !option.customerVisible)) {
    issues.push("Every mobile account option must be customer-visible.");
  }
  if (model.accountOptions.some((option) => option.liveOAuthEnabled)) {
    issues.push("Mobile account options must not claim live OAuth.");
  }
  if (
    model.accountOptions.some(
      (option) =>
        option.startRoute !== "/api/calendar/connections/start" ||
        option.clientMayPrepareProviderRequest ||
        option.networkRequestPrepared ||
        option.credentialStorageEnabled ||
        option.providerRequestUrl !== null
    )
  ) {
    issues.push("Mobile account options must be derived from server-owned calendar start packets.");
  }
  if (model.accountOptions.some((option) => option.label.startsWith("Continue with"))) {
    issues.push("Mobile account options must not expose live-provider sign-in CTAs.");
  }
  if (
    !model.accountOptions.some(
      (option) =>
        option.provider === "Google" &&
        option.sourceMode === "oauth-readiness" &&
        option.startMode === "oauth-evidence-required" &&
        option.nextApiRoute === null &&
        option.canStartNow === false
    )
  ) {
    issues.push("Mobile Google Calendar option must stay OAuth-readiness gated.");
  }
  if (
    !model.accountOptions.some(
      (option) =>
        option.provider === "Apple" &&
        option.sourceMode === "manual-export" &&
        option.startMode === "manual-export-guide" &&
        option.nextApiRoute === "/api/import-preview" &&
        option.canStartNow === true
    )
  ) {
    issues.push("Mobile Apple Calendar option must stay manual-export ready.");
  }
  if (model.accountOptions.some((option) => !option.dataBoundary || !option.credentialBoundary)) {
    issues.push("Every mobile account option must name its data and credential boundary.");
  }

  const importActions = new Set(model.importActions.map((action) => action.kind));
  for (const action of ["calendar", "email", "invite"] as const) {
    if (!importActions.has(action)) issues.push(`Missing mobile import action: ${action}`);
  }
  if (model.importActions.some((action) => !action.customerVisible)) {
    issues.push("Every mobile import action must be customer-visible.");
  }
  if (!model.importActions.some((action) => action.kind === "invite" && action.label === "Paste invite or ICS" && action.sourceMode === "local-paste")) {
    issues.push("Mobile import actions must keep Paste invite or ICS as the ready local path.");
  }
  if (model.importActions.some((action) => action.label === "Future calendar sync")) {
    issues.push("Mobile import actions must expose concrete calendar options instead of future-sync placeholder copy.");
  }

  const queueItemIds = new Set(model.queueItems.map((item) => item.id));
  if (!model.todaySummary.customerVisible || model.todaySummary.realOrdersEnabled) {
    issues.push("Mobile today summary must be customer-visible with real orders disabled.");
  }
  if (!queueItemIds.has(model.todaySummary.cardQueueItemId)) {
    issues.push("Mobile today summary must point at a queued card.");
  }
  if (model.todaySummary.panelCount !== 4) {
    issues.push("Mobile today summary must use a four-panel card.");
  }

  if (model.queueItems.length === 0) {
    issues.push("Mobile card queue must include at least one customer-visible card.");
  }
  if (model.queueItems.some((item) => !item.customerVisible)) {
    issues.push("Every mobile card queue item must be customer-visible.");
  }
  if (model.queueItems.some((item) => item.panelCount !== 4)) {
    issues.push("Every mobile card queue item must reference four 5x7 panels.");
  }

  const actionKinds = new Set(model.approvalActions.map((action) => action.kind));
  for (const action of ["approve", "edit-tone", "snooze", "dismiss"] as const) {
    if (!actionKinds.has(action)) issues.push(`Missing mobile approval action: ${action}`);
  }
  if (model.approvalActions.some((action) => !action.idempotencyRequired)) {
    issues.push("Every mobile approval action must require idempotency.");
  }
  if (model.approvalActions.some((action) => action.networkMode === "local-first-api" && !model.syncState.pendingMutationTypes.includes(action.mutationType))) {
    issues.push("Mobile API-backed approval actions must be represented in the offline sync queue.");
  }
  if (!actionKinds.has(model.todaySummary.primaryAction)) {
    issues.push("Mobile today summary primary action must exist in approval controls.");
  }

  if (!model.chatTranscript.some((message) => message.text.includes("Local scripted assistant"))) {
    issues.push("Mobile chat must identify the local scripted assistant path.");
  }

  if (!model.chatTranscript.some((message) => message.text.includes("Live AI and automatic orders stay off"))) {
    issues.push("Mobile chat must disclose that live AI and automatic orders are off.");
  }

  if (model.memoryReviewItems.length < 2) {
    issues.push("Mobile memory review must expose at least two customer memory items.");
  }
  if (model.memoryReviewItems.some((item) => !item.customerVisible)) {
    issues.push("Every mobile memory review item must be customer-visible.");
  }
  if (model.memoryReviewItems.some((item) => item.rawContentStored)) {
    issues.push("Mobile memory review must not store raw memory content.");
  }
  const memoryUsageStates = new Set(model.memoryReviewItems.map((item) => item.usage));
  if (!memoryUsageStates.has("approved") || !memoryUsageStates.has("review-required")) {
    issues.push("Mobile memory review must include approved and review-required states.");
  }

  if (!model.renderChoices.some((choice) => choice.mode === "free-local" && choice.label === "Template card proof")) {
    issues.push("Mobile card proof path must include the free template renderer.");
  }

  if (!model.renderChoices.some((choice) => choice.mode === "credential-gated")) {
    issues.push("Mobile card proof path must keep AI artwork credential-gated.");
  }

  if (model.pricingPreviews.length < 2) {
    issues.push("Mobile pricing preview must expose multiple retail-printer choices.");
  }
  if (model.pricingPreviews.some((preview) => preview.liveQuote || !preview.manualConfirmationRequired)) {
    issues.push("Mobile pricing previews must stay review-only and manually confirmed.");
  }

  const fulfillmentKinds = new Set(model.fulfillmentRecommendations.map((recommendation) => recommendation.kind));
  for (const kind of ["cheapest-known-price", "fastest-pickup", "cheapest-shipped"] as const) {
    if (!fulfillmentKinds.has(kind)) issues.push(`Missing mobile fulfillment recommendation: ${kind}`);
  }
  if (model.fulfillmentRecommendations.some((recommendation) => !recommendation.customerVisible)) {
    issues.push("Every mobile fulfillment recommendation must be customer-visible.");
  }
  if (model.fulfillmentRecommendations.some((recommendation) => recommendation.liveQuote || recommendation.liveOrder)) {
    issues.push("Mobile fulfillment recommendations must not claim live quotes or direct orders.");
  }
  if (model.fulfillmentRecommendations.some((recommendation) => recommendation.totalCents <= 0)) {
    issues.push("Mobile fulfillment recommendations must expose positive estimated totals.");
  }

  if (model.printProofChecks.length < 4) {
    issues.push("Mobile print proof must expose at least four checks.");
  }
  if (model.printProofChecks.some((check) => !check.customerVisible)) {
    issues.push("Every mobile print proof check must be customer-visible.");
  }
  if (model.printProofChecks.some((check) => !check.passed)) {
    issues.push("Mobile print proof checks must pass before handoff.");
  }
  const printProofOrderStates = new Set<string>(["manual", "disabled"]);
  if (model.printProofChecks.some((check) => !printProofOrderStates.has(check.realOrderState))) {
    issues.push("Mobile print proof must not claim live retail-printer ordering.");
  }

  if (!model.handoffSteps.some((step) => step.realOrderState === "manual")) {
    issues.push("Mobile handoff must keep a manual upload path.");
  }

  if (!model.handoffSteps.every((step) => step.realOrderState !== "disabled" || step.detail.includes("blocked"))) {
    issues.push("Disabled mobile handoff steps must explain blocked automatic checkout.");
  }

  if (model.safetyBanner.label !== "Confirm before checkout") {
    issues.push("Mobile safety banner must require checkout confirmation.");
  }
  if (model.proofBoundary.deterministicProofMode !== "repo-local-contract") {
    issues.push("Mobile proof boundary must stay repo-local and deterministic.");
  }
  for (const stage of [
    "account-import",
    "event-review",
    "card-approval",
    "proof-review",
    "fulfillment-review",
    "checkout-confirmation"
  ] as const) {
    if (!model.proofBoundary.webCustomerFlowStages.includes(stage)) {
      issues.push(`Mobile proof boundary missing web customer flow stage: ${stage}.`);
    }
  }
  if (model.proofBoundary.repoLocalEvidence.length < 3) {
    issues.push("Mobile proof boundary must list repo-local evidence.");
  }
  for (const liveProof of ["native-emulator-render", "signed-native-artifact", "app-store-review", "live-retail-order"] as const) {
    if (!model.proofBoundary.blockedLiveProofs.includes(liveProof)) {
      issues.push(`Mobile proof boundary must block live proof: ${liveProof}.`);
    }
  }
  if (
    model.proofBoundary.emulatorProofClaimed ||
    model.proofBoundary.signedArtifactClaimed ||
    model.proofBoundary.liveOrderClaimed
  ) {
    issues.push("Mobile proof boundary must not claim emulator, signed artifact, or live order proof.");
  }
  if (!model.syncState.apiBaseUrlRequired || model.syncState.authMode !== "customer-session") {
    issues.push("Mobile sync must require the configured API base URL and customer session auth.");
  }
  if (!model.syncState.offlineQueueEnabled || !model.syncState.idempotencyRequired) {
    issues.push("Mobile sync must keep offline queueing and idempotency enabled.");
  }
  if (model.syncState.forbiddenMutationTypes.length < 3) {
    issues.push("Mobile sync must forbid live order, payment, and raw-memory mutations.");
  }

  const localeCodes = new Set(model.localeOptions.map((locale) => locale.locale));
  for (const locale of ["en-US", "es-US", "ur-PK", "ar-EG"] as const) {
    if (!localeCodes.has(locale)) issues.push(`Missing mobile locale option: ${locale}`);
  }
  if (model.localeOptions.some((locale) => !locale.customerVisible)) {
    issues.push("Every mobile locale option must be customer-visible.");
  }
  if (model.localeOptions.some((locale) => locale.writingDirection === "rtl" && !locale.copyReviewRequired)) {
    issues.push("RTL mobile locale options must require copy review.");
  }

  for (const phrase of collectMobileCustomerCopy(model)) {
    if (
      /\b(oauth[- ]gated|credential[- ]gated|repo-local-contract|handoff|fulfillment|vendor|adapter|mock|dummy|placeholder)\b/i.test(
        phrase
      )
    ) {
      const customerCopyIssue = `Mobile customer copy must not expose implementation-stage terms: ${phrase}`;
      if (!issues.includes(customerCopyIssue)) issues.push(customerCopyIssue);
    }
  }

  for (const phrase of collectMobileExperienceText(model)) {
    if (/\b(live order ready|real orders enabled|payment active|vendor api connected|paid ai active)\b/i.test(phrase)) {
      const unsafeClaim = `Unsafe mobile live-provider claim: ${phrase}`;
      if (!issues.includes(unsafeClaim)) issues.push(unsafeClaim);
    }
    if (/\b(adapter|provider|vendor api|retail-printer|browser svg renderer|ai image providers)\b/i.test(phrase)) {
      const jargonClaim = `Mobile customer text must not expose provider/adapters: ${phrase}`;
      if (!issues.includes(jargonClaim)) issues.push(jargonClaim);
    }
  }

  return issues;
}

export function collectMobileCustomerCopy(model: MobileExperienceModel = mobileExperience): string[] {
  return [
    model.safetyBanner.label,
    model.safetyBanner.detail,
    model.todaySummary.recipientLabel,
    model.todaySummary.eventLabel,
    model.todaySummary.dueLabel,
    model.todaySummary.riskBadge,
    ...model.sections.flatMap((section) => [section.title, section.detail, section.status]),
    ...model.accountOptions.flatMap((option) => [option.label, option.detail]),
    ...model.importActions.flatMap((action) => [action.label, action.detail]),
    ...model.queueItems.flatMap((item) => [item.recipientLabel, item.eventLabel]),
    ...model.approvalActions.flatMap((action) => [action.label, action.detail]),
    ...model.chatTranscript.map((message) => message.text),
    ...model.memoryReviewItems.flatMap((item) => [item.recipientLabel, item.memoryLabel, item.usage]),
    ...model.renderChoices.flatMap((choice) => [choice.label, choice.detail]),
    ...model.pricingPreviews.flatMap((preview) => [preview.vendor, preview.product]),
    ...model.fulfillmentRecommendations.flatMap((recommendation) => [
      recommendation.label,
      recommendation.vendorName,
      recommendation.etaLabel,
      recommendation.confirmationCopy
    ]),
    ...model.printProofChecks.flatMap((check) => [check.label, check.detail]),
    ...model.handoffSteps.flatMap((step) => [step.label, step.detail]),
    ...model.localeOptions.flatMap((locale) => [locale.label, locale.cardLanguage]),
    ...collectMobileRenderSnapshotText(buildMobileRenderSnapshot(model))
  ];
}

function collectMobileExperienceText(model: MobileExperienceModel): string[] {
  return [
    model.safetyBanner.label,
    model.safetyBanner.detail,
    model.todaySummary.recipientLabel,
    model.todaySummary.eventLabel,
    model.todaySummary.dueLabel,
    model.todaySummary.primaryAction,
    model.todaySummary.riskBadge,
    ...model.sections.flatMap((section) => [section.title, section.detail, section.status]),
    ...model.accountOptions.flatMap((option) => [option.provider, option.label, option.detail]),
    ...model.importActions.flatMap((action) => [action.kind, action.label, action.detail, action.sourceMode]),
    ...model.queueItems.flatMap((item) => [item.recipientLabel, item.eventLabel, item.status, item.source]),
    ...model.approvalActions.flatMap((action) => [action.label, action.detail, action.networkMode, action.mutationType]),
    ...model.chatTranscript.map((message) => message.text),
    ...model.memoryReviewItems.flatMap((item) => [item.recipientLabel, item.memoryLabel, item.usage]),
    ...model.renderChoices.flatMap((choice) => [choice.label, choice.detail, choice.mode]),
    ...model.pricingPreviews.flatMap((preview) => [preview.vendor, preview.product, preview.sourceMode]),
    ...model.fulfillmentRecommendations.flatMap((recommendation) => [
      recommendation.kind,
      recommendation.label,
      recommendation.vendorName,
      recommendation.etaLabel,
      recommendation.confirmationCopy
    ]),
    ...model.printProofChecks.flatMap((check) => [check.label, check.detail, check.realOrderState]),
    ...model.handoffSteps.flatMap((step) => [step.label, step.detail, step.realOrderState]),
    ...model.localeOptions.flatMap((locale) => [locale.locale, locale.label, locale.cardLanguage, locale.writingDirection]),
    ...model.syncState.pendingMutationTypes,
    model.syncState.authMode,
    model.syncState.retryPolicy
  ];
}

function collectMobileRenderSnapshotText(snapshot: MobileRenderSnapshot): string[] {
  return [
    snapshot.screenTitle,
    snapshot.hero.eyebrow,
    snapshot.hero.title,
    snapshot.hero.subtitle,
    snapshot.hero.primaryAction.label,
    snapshot.hero.primaryAction.detail,
    snapshot.hero.primaryAction.modeLabel,
    snapshot.safetyBand.label,
    snapshot.safetyBand.detail,
    ...snapshot.safetyBand.metrics.flatMap((metric) => [metric.label, metric.value]),
    ...snapshot.sections.flatMap((section) => [
      section.title,
      ...section.rows.flatMap((row) => [row.title, row.detail, row.modeLabel])
    ]),
    ...snapshot.footerSafetyMessages
  ];
}

function actionModeLabel(action: MobileApprovalAction): string {
  return action.networkMode === "local-only" ? "Local" : "Queued";
}

function sourceLabel(source: MobileCardQueueItem["source"]): string {
  if (source === "ics-import") return "ICS import";
  if (source === "manual-entry") return "manual entry";
  return "customer history";
}

function queueStatusLabel(status: MobileCardQueueStatus): string {
  if (status === "needs-approval") return "Review";
  if (status === "ready-for-handoff") return "Ready to print";
  return "Approved";
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
