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
  liveOAuthEnabled: false;
  customerVisible: boolean;
}

export interface MobileImportAction {
  kind: MobileImportActionKind;
  label: string;
  detail: string;
  sourceMode: "contract-gated" | "local-paste";
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

export const mobileSafetyBanner = {
  label: "Confirm before checkout",
  detail: "No automatic charge, live quote, or direct order runs from the mobile shell."
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
  riskBadge: "Review before handoff",
  panelCount: 4,
  offlineReady: true,
  realOrdersEnabled: false,
  customerVisible: true
};

export const mobileExperienceSections: MobileExperienceSection[] = [
  {
    id: "account-import",
    title: "Sign in and import",
    detail: "Google, Apple, calendar, email, and invite paths start the customer flow without exposing integration setup.",
    status: "Ready",
    customerVisible: true
  },
  {
    id: "card-queue",
    title: "Card queue",
    detail: "Upcoming card candidates show event source, approval state, due date, and next customer action.",
    status: "Ready",
    customerVisible: true
  },
  {
    id: "approval-controls",
    title: "Approval controls",
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
    title: "Fulfillment options",
    detail: "The app compares cheapest known price, fastest pickup, and cheapest shipped options before checkout.",
    status: "Manual",
    customerVisible: true
  },
  {
    id: "handoff",
    title: "Checkout confirmation",
    detail: "Manual upload stays active while automatic retail checkout remains blocked.",
    status: "Manual",
    customerVisible: true
  },
  {
    id: "offline-sync",
    title: "Offline sync",
    detail: "Customer actions queue locally and replay through idempotent API mutations when the session is available.",
    status: "Local",
    customerVisible: true
  }
];

export const mobileAccountOptions: MobileAccountOption[] = [
  {
    provider: "Google",
    label: "Continue with Google",
    detail: "Use calendar and Gmail signals after consent.",
    liveOAuthEnabled: false,
    customerVisible: true
  },
  {
    provider: "Apple",
    label: "Continue with Apple",
    detail: "Use Apple account and calendar signals after consent.",
    liveOAuthEnabled: false,
    customerVisible: true
  }
];

export const mobileImportActions: MobileImportAction[] = [
  {
    kind: "calendar",
    label: "Import calendar",
    detail: "Birthdays, anniversaries, weddings, trips, and renewals.",
    sourceMode: "contract-gated",
    customerVisible: true
  },
  {
    kind: "email",
    label: "Scan email receipts",
    detail: "Purchases, warranties, deliveries, and subscription dates.",
    sourceMode: "contract-gated",
    customerVisible: true
  },
  {
    kind: "invite",
    label: "Paste invite",
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
    detail: "Moves the prepared card to checkout confirmation readiness.",
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
    detail: "Paid artwork generation remains account-gated, spend-limited, and review-gated.",
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
    product: "5x7 card print handoff",
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
    confirmationCopy: "Public price before tax, coupons, stock, and checkout confirmation.",
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
    detail: "Render packet keeps print dimensions and checksum evidence together.",
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
    label: "Order gate",
    detail: "Automatic retail checkout stays blocked until certification evidence exists.",
    passed: true,
    realOrderState: "disabled",
    customerVisible: true
  }
];

export const mobileHandoffSteps: MobileHandoffStep[] = [
  {
    label: "Download SVG set",
    detail: "Customer can export four panels for manual upload.",
    realOrderState: "manual"
  },
  {
    label: "Confirm pickup or shipping",
    detail: "Automatic checkout is blocked until live quote, payment, and certification evidence exists.",
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

  const importActions = new Set(model.importActions.map((action) => action.kind));
  for (const action of ["calendar", "email", "invite"] as const) {
    if (!importActions.has(action)) issues.push(`Missing mobile import action: ${action}`);
  }
  if (model.importActions.some((action) => !action.customerVisible)) {
    issues.push("Every mobile import action must be customer-visible.");
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
