import {
  buildCalendarConnectionStartPackets,
  type CalendarConnectionStartMode,
  type CalendarConnectionStartPacket
} from "../../../src/onboardingCalendar";
import { mobileBootstrap } from "../../../src/mobileBootstrapData.mjs";

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
export type MobileExperienceStatus = "Ready" | "Approved";
export type MobileCardQueueStatus = "needs-approval" | "approved" | "ready-for-handoff";
export type MobileApprovalActionKind = "approve" | "edit-tone" | "snooze" | "dismiss" | "request-regeneration";
export type MobileMutationType = "approve-card" | "update-tone" | "snooze-card" | "dismiss-card" | "prepare-handoff";
export type MobileAccountProvider = "Google" | "Apple";
export type MobileImportActionKind = "calendar" | "email" | "invite";
export type MobileCalendarSourceMode = "oauth-readiness" | "manual-export" | "contract-gated" | "local-paste";
export type MobileFulfillmentRecommendationKind = "lowest-current-estimate" | "fastest-pickup" | "cheapest-shipped";
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
  subtotalIncludesCoupon: boolean;
  priceProofStatus: "public-estimate-only" | "same-cart-coupon-verified";
  priceProofLabel: string;
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
  forbiddenMutationTypes: ("submit-live-order" | "charge-payment" | "upload-raw-memory")[];
  retryPolicy: "exponential-backoff";
}

export interface MobileProofBoundary {
  deterministicProofMode: "repo-local-contract";
  currentStage: MobileCustomerFlowStage;
  proofApproved: boolean;
  printOptionsUnlocked: boolean;
  webCustomerFlowStages: MobileCustomerFlowStage[];
  repoLocalEvidence: string[];
  blockedLiveProofs: (
    | "native-emulator-render"
    | "signed-native-artifact"
    | "app-store-review"
    | "live-retail-order"
  )[];
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

export type MobileRenderActionPresentation = "primary" | "secondary" | "inline" | "locked" | "status";

export interface MobileRenderAction {
  label: string;
  detail: string;
  modeLabel: string;
  actionKind?: MobileApprovalActionKind;
  presentation: Exclude<MobileRenderActionPresentation, "status">;
  disabled: boolean;
  accessibilityLabel: string;
}

export interface MobileRenderRow {
  title: string;
  detail: string;
  modeLabel: string;
  actionKind?: MobileApprovalActionKind;
  presentation?: MobileRenderActionPresentation;
  disabled?: boolean;
  accessibilityLabel?: string;
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
  proofGate: {
    currentStage: MobileCustomerFlowStage;
    proofApproved: boolean;
    printOptionsUnlocked: boolean;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryAction: MobileRenderAction;
    secondaryActions: MobileRenderAction[];
  };
  safetyBand: {
    label: string;
    detail: string;
    metrics: MobileRenderMetric[];
  };
  sections: MobileRenderSection[];
  footerSafetyMessages: string[];
}

const mobileExperienceManifest = mobileBootstrap as MobileExperienceModel & {
  service: 'customcard-api';
  realOrdersEnabled: false;
};

export const mobileCalendarConnectionStartPackets = buildCalendarConnectionStartPackets().filter(
  (packet) => packet.id === 'google-calendar-events' || packet.id === 'icloud-ics-fallback'
);

export function buildMobileAccountOptions(
  startPackets: CalendarConnectionStartPacket[] = mobileCalendarConnectionStartPackets
): MobileAccountOption[] {
  return startPackets.map((packet) => {
    const provider = packet.id === 'google-calendar-events' ? 'Google' : 'Apple';

    return {
      provider,
      label: provider === 'Google' ? 'Google Calendar' : 'Apple Calendar ICS export',
      detail:
        provider === 'Google'
          ? 'Google Calendar can be reviewed here; until secure connection is enabled, paste invite or ICS details.'
          : 'Copy event details from an Apple Calendar export, then paste selected details.',
      sourceMode: packet.sourceMode === 'manual-export' ? 'manual-export' : 'oauth-readiness',
      startMode: packet.startMode === 'manual-export-guide' ? 'manual-export-guide' : 'oauth-evidence-required',
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

export const mobileSafetyBanner: MobileSafetyBanner = mobileExperienceManifest.safetyBanner;
export const mobileProofBoundary: MobileProofBoundary = mobileExperienceManifest.proofBoundary;
export const mobileTodaySummary: MobileTodaySummary = mobileExperienceManifest.todaySummary;
export const mobileExperienceSections: MobileExperienceSection[] = mobileExperienceManifest.sections;
export const mobileAccountOptions: MobileAccountOption[] = mobileExperienceManifest.accountOptions;
export const mobileImportActions: MobileImportAction[] = mobileExperienceManifest.importActions;
export const mobileCardQueueItems: MobileCardQueueItem[] = mobileExperienceManifest.queueItems;
export const mobileApprovalActions: MobileApprovalAction[] = mobileExperienceManifest.approvalActions;
export const mobileChatTranscript: MobileChatMessage[] = mobileExperienceManifest.chatTranscript;
export const mobileMemoryReviewItems: MobileMemoryReviewItem[] = mobileExperienceManifest.memoryReviewItems;
export const mobileRenderChoices: MobileRenderChoice[] = mobileExperienceManifest.renderChoices;
export const mobilePricingPreviews: MobilePricingPreview[] = mobileExperienceManifest.pricingPreviews;
export const mobileFulfillmentRecommendations: MobileFulfillmentRecommendation[] = mobileExperienceManifest.fulfillmentRecommendations;
export const mobilePrintProofChecks: MobilePrintProofCheck[] = mobileExperienceManifest.printProofChecks;
export const mobileHandoffSteps: MobileHandoffStep[] = mobileExperienceManifest.handoffSteps;
export const mobileLocaleOptions: MobileLocaleOption[] = mobileExperienceManifest.localeOptions;
export const mobileSyncState: MobileSyncState = mobileExperienceManifest.syncState;
export const mobileExperience: MobileExperienceModel = mobileExperienceManifest;
export const mobileRenderSnapshot = buildMobileRenderSnapshot();

export function buildMobileRenderSnapshot(model: MobileExperienceModel = mobileExperience): MobileRenderSnapshot {
  const approvalByKind = new Map(model.approvalActions.map((action) => [action.kind, action]));
  const primaryAction = approvalByKind.get(model.todaySummary.primaryAction) ?? model.approvalActions[0];

  return {
    screenTitle: "CustomCard",
    proofGate: {
      currentStage: model.proofBoundary.currentStage,
      proofApproved: model.proofBoundary.proofApproved,
      printOptionsUnlocked: model.proofBoundary.printOptionsUnlocked
    },
    hero: {
      eyebrow: "Your card assistant",
      title: "CustomCard",
      subtitle: "Paste an invite or calendar event, approve the proof, then review print options.",
      primaryAction: {
        label: `Review ${model.todaySummary.recipientLabel}'s card`,
        detail: "Check event details, memory, copy, language, and artwork before printing.",
        modeLabel: "Ready to review",
        actionKind: primaryAction.kind,
        presentation: "primary",
        disabled: false,
        accessibilityLabel: `Review ${model.todaySummary.recipientLabel}'s card`
      },
      secondaryActions: buildMobileHeroSecondaryActions(model)
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
            modeLabel: option.canStartNow ? "Ready" : "Connect later"
          })),
          ...model.importActions.map((action) => ({
            title: action.label,
            detail: action.detail,
            modeLabel: action.sourceMode === "local-paste" ? "Ready" : "Review"
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
            actionKind: model.todaySummary.primaryAction,
            presentation: "primary",
            disabled: false,
            accessibilityLabel: `Review ${model.todaySummary.recipientLabel}'s card`
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
          actionKind: item.nextAction,
          presentation: "secondary",
          disabled: false,
          accessibilityLabel: `Review ${item.recipientLabel} ${item.eventLabel} card`
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
          actionKind: action.kind,
          presentation: "inline",
          disabled: false,
          accessibilityLabel: action.label
        }))
      },
      {
        id: "card-assistant",
        title: "Card assistant",
        rows: model.chatTranscript.map((message) => ({
          title: message.speaker === "customer" ? "Customer" : "Assistant",
          detail: message.text,
          modeLabel: message.source === "local-script" ? "Assistant" : "Customer"
        }))
      },
      {
        id: "card-proof-path",
        title: "Preview the card",
        rows: model.renderChoices.map((choice) => ({
          title: choice.label,
          detail: choice.detail,
          modeLabel: choice.mode === "free-local" ? "Ready" : "Review"
        }))
      },
      {
        id: "best-available-options",
        title: "Printing options",
        rows: buildMobilePrintOptionRows(model)
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
        title: "Finish at a print shop",
        rows: buildMobileHandoffRows(model)
      },
      {
        id: "offline-sync",
        title: "Saved offline",
        rows: [
      {
        title: "Customer session",
        detail: "Customer actions stay saved offline and replay safely when your session is available.",
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
    blockedLiveProofs: model.proofBoundary.blockedLiveProofs.length,
    proofApproved: model.proofBoundary.proofApproved,
    printOptionsUnlocked: model.proofBoundary.printOptionsUnlocked
  };
}

export function summarizeMobileRenderSnapshot(snapshot: MobileRenderSnapshot = mobileRenderSnapshot) {
  const snapshotText = collectMobileRenderSnapshotText(snapshot);
  const approvalRows = snapshot.sections.find((section) => section.id === "approval-controls")?.rows ?? [];
  const lockedRows = snapshot.sections
    .filter((section) => section.id === "best-available-options" || section.id === "checkout-confirmation")
    .flatMap((section) => section.rows);

  return {
    sectionCount: snapshot.sections.length,
    rowCount: snapshot.sections.reduce((total, section) => total + section.rows.length, 0),
    tappableActionCount:
      [snapshot.hero.primaryAction, ...snapshot.hero.secondaryActions].filter((action) => !action.disabled).length +
      approvalRows.filter((row) => row.presentation === "inline" && !row.disabled).length,
    disabledActionCount: lockedRows.filter((row) => row.presentation === "locked" && row.disabled).length,
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
  if (snapshot.hero.primaryAction.presentation !== "primary" || snapshot.hero.primaryAction.disabled) {
    issues.push("Mobile render snapshot primary action must be enabled and primary.");
  }
  if (!snapshot.hero.secondaryActions.some((action) => action.label === "Import an invite" && !action.disabled)) {
    issues.push("Mobile render snapshot must expose Import an invite as the ready secondary action.");
  }
  if (!snapshot.hero.secondaryActions.some((action) => action.label === "Review calendar options" && action.disabled)) {
    issues.push("Mobile render snapshot must keep calendar review as a disabled secondary action until connected.");
  }
  if (!snapshot.proofGate.proofApproved && snapshot.proofGate.printOptionsUnlocked) {
    issues.push("Mobile render snapshot must not unlock print options before proof approval.");
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
  if (summary.rowCount < 28) issues.push("Mobile render snapshot must expose the full customer workflow rows.");
  if (summary.tappableActionCount < 7) issues.push("Mobile render snapshot must expose the ready mobile action surface.");
  if (summary.disabledActionCount < 2) issues.push("Mobile render snapshot must expose disabled proof-gated print actions.");
  if (summary.primaryActionCount < 2) issues.push("Mobile render snapshot must place the primary approval action in hero and workflow.");
  if (summary.footerSafetyMessages < 2) issues.push("Mobile render snapshot must keep safety footer messages.");
  if (summary.blockedLiveActionCount > 0) issues.push("Mobile render snapshot must not claim live order, payment, or paid AI actions.");
  if (summary.internalProofTermCount > 0) issues.push("Mobile render snapshot must not expose internal proof terms to customers.");
  if (snapshot.sections.some((section) => section.rows.length === 0)) {
    issues.push("Mobile render snapshot sections must not be empty.");
  }
  if (!snapshot.proofGate.printOptionsUnlocked) {
    const printRows = snapshot.sections.find((section) => section.id === "best-available-options")?.rows ?? [];
    const checkoutRows = snapshot.sections.find((section) => section.id === "checkout-confirmation")?.rows ?? [];
    if (printRows.length !== 1 || printRows[0]?.title !== "Approve proof first") {
      issues.push("Mobile render snapshot must keep print estimates locked until proof approval.");
    }
    if (checkoutRows.length !== 1 || checkoutRows[0]?.title !== "Approve proof first") {
      issues.push("Mobile render snapshot must keep print shop steps locked until proof approval.");
    }
    if (printRows.some((row) => row.presentation !== "locked" || !row.disabled)) {
      issues.push("Mobile render snapshot print estimates must render as disabled locked actions before proof approval.");
    }
    if (checkoutRows.some((row) => row.presentation !== "locked" || !row.disabled)) {
      issues.push("Mobile render snapshot print shop steps must render as disabled locked actions before proof approval.");
    }
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
  if (!model.importActions.some((action) => action.kind === "invite" && action.label === "Import an invite" && action.sourceMode === "local-paste")) {
    issues.push("Mobile import actions must keep Import an invite as the ready local path.");
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

  if (!model.chatTranscript.some((message) => message.text.includes("card assistant"))) {
    issues.push("Mobile chat must identify the customer card assistant path.");
  }

  if (!model.chatTranscript.some((message) => message.text.includes("automatic orders stay off"))) {
    issues.push("Mobile chat must disclose that automatic orders are off.");
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
  for (const kind of ["lowest-current-estimate", "fastest-pickup", "cheapest-shipped"] as const) {
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
  if (model.fulfillmentRecommendations.some((recommendation) => recommendation.label === "Cheapest known price")) {
    issues.push("Mobile fulfillment recommendations must not claim cheapest known price.");
  }
  if (model.fulfillmentRecommendations.some((recommendation) => !recommendation.priceProofLabel.trim())) {
    issues.push("Mobile fulfillment recommendations must expose customer-facing price proof state.");
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
    issues.push("Mobile print package must keep a customer-controlled print shop path.");
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
  if (model.proofBoundary.printOptionsUnlocked && !model.proofBoundary.proofApproved) {
    issues.push("Mobile print options must stay locked until proof approval.");
  }
  if (model.proofBoundary.proofApproved && model.proofBoundary.currentStage === "proof-review" && !model.proofBoundary.printOptionsUnlocked) {
    issues.push("Mobile proof boundary must move to print review after proof approval.");
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
      /\b(oauth[- ]gated|credential[- ]gated|repo-local-contract|handoff|fulfillment|vendor|adapter|mock|dummy|placeholder|local scripted|deterministic local|manual upload|automatic retail checkout)\b/i.test(
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
    if (/\b(adapter|provider|vendor api|retail-printer|browser svg renderer|ai image providers|local scripted|deterministic local|manual upload|automatic retail checkout)\b/i.test(phrase)) {
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
    ...snapshot.hero.secondaryActions.flatMap((action) => [action.label, action.detail, action.modeLabel]),
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

function buildMobileHeroSecondaryActions(model: MobileExperienceModel): MobileRenderAction[] {
  const pasteInvite = model.importActions.find((action) => action.kind === "invite");
  const calendarReview = model.importActions.find((action) => action.kind === "calendar");

  return [
    {
      label: pasteInvite?.label ?? "Import an invite",
      detail: pasteInvite?.detail ?? "Paste an email invite, event link, or calendar export.",
      modeLabel: "Ready",
      presentation: "secondary",
      disabled: false,
      accessibilityLabel: "Import an invite"
    },
    {
      label: calendarReview?.label ?? "Review calendar options",
      detail: calendarReview?.detail ?? "Paste invite or ICS details now; secure Google Calendar connection is still pending.",
      modeLabel: "Review",
      presentation: "secondary",
      disabled: true,
      accessibilityLabel: "Review calendar options"
    }
  ];
}

function actionModeLabel(action: MobileApprovalAction): string {
  return action.networkMode === "local-only" ? "Draft" : "Saved";
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

function buildMobilePrintOptionRows(model: MobileExperienceModel): MobileRenderRow[] {
  if (!model.proofBoundary.printOptionsUnlocked) {
    return [
      {
        title: "Approve proof first",
        detail: "Print estimates unlock after you approve copy, language, and artwork.",
        modeLabel: "After proof",
        presentation: "locked",
        disabled: true,
        accessibilityLabel: "Approve proof before print estimates"
      }
    ];
  }

  return model.fulfillmentRecommendations.map((recommendation) => ({
    title: recommendation.label,
    detail: `${formatCents(recommendation.totalCents)} at ${recommendation.vendorName}; ${recommendation.etaLabel}. ${recommendation.confirmationCopy}`,
    modeLabel: "Confirm",
    presentation: "secondary",
    disabled: false,
    accessibilityLabel: recommendation.label
  }));
}

function buildMobileHandoffRows(model: MobileExperienceModel): MobileRenderRow[] {
  if (!model.proofBoundary.printOptionsUnlocked) {
    return [
      {
        title: "Approve proof first",
        detail: "Download and print shop steps unlock after proof approval.",
        modeLabel: "After proof",
        presentation: "locked",
        disabled: true,
        accessibilityLabel: "Approve proof before print shop steps"
      }
    ];
  }

  return model.handoffSteps.map((step) => ({
    title: step.label,
    detail: step.detail,
    modeLabel: step.realOrderState === "manual" ? "Print shop" : "Off",
    presentation: step.realOrderState === "manual" ? "secondary" : "locked",
    disabled: step.realOrderState !== "manual",
    accessibilityLabel: step.label
  }));
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
