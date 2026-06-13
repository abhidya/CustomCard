// Minimal fixtures shaped like real memory-runtime API responses (captured
// from `scripts/api-server.mjs` in this repo).
import type { MobileBootstrapResponse } from "../types";

export const mobileBootstrapFixture: MobileBootstrapResponse = {
  service: "customcard-api",
  safetyBanner: {
    label: "Confirm before checkout",
    detail: "Confirm price, pickup, payment, and ordering on the print shop site before ordering."
  },
  proofBoundary: {
    currentStage: "proof-review",
    proofApproved: false,
    printOptionsUnlocked: false
  },
  todaySummary: {
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
  },
  sections: [
    {
      id: "card-queue",
      title: "Cards to review",
      detail: "Upcoming card candidates.",
      status: "Ready",
      customerVisible: true
    }
  ],
  accountOptions: [],
  importActions: [],
  queueItems: [
    {
      id: "card_anniversary_sara_ahmed",
      recipientLabel: "Sara and Ahmed",
      eventLabel: "Anniversary",
      dueIso: "2026-06-13T17:00:00.000Z",
      status: "ready",
      nextAction: "Approve the card",
      panelCount: 4,
      source: "Pasted invite",
      customerVisible: true
    }
  ],
  approvalActions: [],
  chatTranscript: [
    { speaker: "Assistant", source: "local", text: "Your anniversary card is ready to review." }
  ],
  memoryReviewItems: [
    {
      id: "memory-1",
      cardQueueItemId: "card_anniversary_sara_ahmed",
      recipientLabel: "Sara and Ahmed",
      memoryLabel: "Met hiking in autumn",
      usage: "Pending review",
      approvalRequired: true,
      rawContentStored: false,
      customerVisible: true
    }
  ],
  renderChoices: [],
  pricingPreviews: [
    {
      vendor: "Walgreens Photo",
      product: "5x7 folded cards",
      estimatedTotalCents: 219,
      sourceMode: "review-only-public-price",
      manualConfirmationRequired: true,
      liveQuote: false
    }
  ],
  fulfillmentRecommendations: [
    {
      kind: "fastest-pickup",
      label: "Fastest pickup",
      vendorName: "Walgreens Photo",
      totalCents: 219,
      etaLabel: "Today",
      confirmationCopy: "Confirm in the Walgreens cart before paying.",
      priceProofStatus: "estimate",
      priceProofLabel: "Estimate only",
      liveQuote: false,
      liveOrder: false,
      customerVisible: true
    }
  ],
  printProofChecks: [
    {
      id: "safe-zone",
      label: "Safe zones",
      detail: "Text stays inside the printable area.",
      passed: true,
      realOrderState: "blocked",
      customerVisible: true
    }
  ],
  handoffSteps: [],
  localeOptions: [
    {
      locale: "en-US",
      label: "English (US)",
      cardLanguage: "English",
      writingDirection: "ltr",
      copyReviewRequired: false,
      customerVisible: true
    }
  ],
  realOrdersEnabled: false
};
