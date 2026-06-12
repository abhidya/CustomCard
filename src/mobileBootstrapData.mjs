export const mobileBootstrap = {
  service: "customcard-api",
  safetyBanner: {
    label: "Confirm before checkout",
    detail: "Confirm price, pickup, payment, and ordering on the print shop site before ordering."
  },
  proofBoundary: {
    deterministicProofMode: "repo-local-contract",
    currentStage: "proof-review",
    proofApproved: false,
    printOptionsUnlocked: false,
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
      detail: "The app compares current estimates, pickup speed, shipping, and same-cart coupon proof before checkout.",
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
  ],
  accountOptions: [
    {
      provider: "Google",
      label: "Google Calendar",
      detail: "Google Calendar is not connected yet. Paste invite/ICS works now while consent and revocation controls are finished.",
      sourceMode: "oauth-readiness",
      startMode: "oauth-evidence-required",
      startRoute: "/api/calendar/connections/start",
      nextApiRoute: null,
      clientMayPrepareProviderRequest: false,
      canStartNow: false,
      dataBoundary: "Event metadata only after explicit consent; raw descriptions stay out of storage.",
      credentialBoundary: "Needs OAuth client, consent screen, redirect URI, token storage, and revocation handling.",
      liveOAuthEnabled: false,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      providerRequestUrl: null,
      customerVisible: true,
      blockedReason: "No live OAuth consent flow is implemented in this repository state."
    },
    {
      provider: "Apple",
      label: "Apple Calendar ICS export",
      detail: "Export an ICS event or calendar copy, then paste selected event details locally.",
      sourceMode: "manual-export",
      startMode: "manual-export-guide",
      startRoute: "/api/calendar/connections/start",
      nextApiRoute: "/api/import-preview",
      clientMayPrepareProviderRequest: false,
      canStartNow: true,
      dataBoundary: "Customer exports an .ics file or downloads a temporary iCloud.com ICS copy, then pastes selected event data.",
      credentialBoundary: "No Apple ID, app-specific password, CalDAV session, or native Apple Calendar sync.",
      liveOAuthEnabled: false,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      providerRequestUrl: null,
      customerVisible: true,
      blockedReason: "Live iCloud CalDAV/native sync is intentionally not implemented."
    }
  ],
  importActions: [
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
      label: "Import an invite",
      detail: "Paste an email invite, event link, or calendar export.",
      sourceMode: "local-paste",
      customerVisible: true
    }
  ],
  queueItems: [
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
  ],
  approvalActions: [
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
  ],
  chatTranscript: [
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
  ],
  memoryReviewItems: [
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
  ],
  renderChoices: [
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
  ],
  pricingPreviews: [
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
  ],
  fulfillmentRecommendations: [
    {
      kind: "lowest-current-estimate",
      label: "Lowest current estimate",
      vendorName: "Walmart Photo",
      totalCents: 56,
      etaLabel: "same-day pickup candidate",
      confirmationCopy: "Public prices and source-listed coupons are only estimates until the print shop accepts them in the same cart.",
      subtotalIncludesCoupon: false,
      priceProofStatus: "public-estimate-only",
      priceProofLabel: "Estimate only",
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
      subtotalIncludesCoupon: false,
      priceProofStatus: "public-estimate-only",
      priceProofLabel: "Estimate only",
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
      subtotalIncludesCoupon: false,
      priceProofStatus: "public-estimate-only",
      priceProofLabel: "Estimate only",
      liveQuote: false,
      liveOrder: false,
      customerVisible: true
    }
  ],
  printProofChecks: [
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
  ],
  handoffSteps: [
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
  ],
  localeOptions: [
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
  ],
  syncState: {
    apiBaseUrlRequired: true,
    authMode: "customer-session",
    offlineQueueEnabled: true,
    idempotencyRequired: true,
    pendingMutationTypes: ["approve-card", "update-tone", "snooze-card", "dismiss-card", "prepare-handoff"],
    forbiddenMutationTypes: ["submit-live-order", "charge-payment", "upload-raw-memory"],
    retryPolicy: "exponential-backoff"
  },
  realOrdersEnabled: false
};
