const requiredRetailFulfillmentIds = [
  "manual-handoff-package",
  "review-only-pricing",
  "live-quote-contracts",
  "vendor-api-certification",
  "order-mutation-kill-switch",
  "pickup-cancel-recovery-drills",
  "payment-refund-boundary",
  "physical-print-qa"
];

const requiredLiveVendorAdapterIds = [
  "walgreens-live-order",
  "cvs-live-order",
  "fedex-live-print",
  "walmart-live-print",
  "staples-live-print",
  "office-depot-live-print"
];

const requiredFallbackAdapterIds = ["manual-vendor-handoff", "public-printer-pricing-research"];
const allowedStatuses = new Set(["repo-local-ready", "evidence-missing", "certification-blocked"]);

export const retailFulfillmentReadinessItems = [
  {
    id: "manual-handoff-package",
    label: "Manual handoff package",
    lane: "manual-handoff",
    status: "repo-local-ready",
    vendorAdapterIds: [],
    fallbackAdapterIds: ["manual-vendor-handoff"],
    recoveryEventNames: ["manual_upload_confirmed"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["local print package export", "manual vendor handoff checklist", "signed artifact handoff"],
    requiredEvidence: ["Customer approval transcript", "Manual checkout confirmation", "Pickup receipt"],
    blocker: "Manual handoff is repo-local ready, but checkout and pickup still happen outside the app."
  },
  {
    id: "review-only-pricing",
    label: "Review-only printer pricing",
    lane: "pricing-research",
    status: "repo-local-ready",
    vendorAdapterIds: [],
    fallbackAdapterIds: ["public-printer-pricing-research"],
    recoveryEventNames: ["public_price_refresh_required", "checkout_price_mismatch"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["printer pricing research doctor", "review-only public observations", "manual confirmation flags"],
    requiredEvidence: ["Fresh public price review", "Checkout confirmation screenshot", "Tax and coupon portal proof"],
    blocker:
      "Public prices are comparison hints only; no retailer quote, tax, coupon portal application, or stock API is connected."
  },
  {
    id: "live-quote-contracts",
    label: "Live quote contracts",
    lane: "quote-freshness",
    status: "evidence-missing",
    vendorAdapterIds: requiredLiveVendorAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    recoveryEventNames: ["quote_stale", "quote_mismatch", "pickup_window_changed"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["blocked live vendor adapters", "printer pricing research freshness report", "production live quote gate"],
    requiredEvidence: ["Sandbox live quote response", "Tax and coupon quote proof", "Pickup window freshness proof"],
    blocker: "No sandbox or live retail quote API response is attached."
  },
  {
    id: "vendor-api-certification",
    label: "Vendor API certification",
    lane: "vendor-certification",
    status: "certification-blocked",
    vendorAdapterIds: requiredLiveVendorAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    recoveryEventNames: ["certification_rejected", "terms_review_required"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["provider catalog blocked vendor adapters", "external audit retail partner certification item"],
    requiredEvidence: ["Retail partner certification", "Order mutation approval", "Terms and brand approval"],
    blocker: "Retail partner certification and order mutation approval are not attached."
  },
  {
    id: "order-mutation-kill-switch",
    label: "Order mutation kill switch",
    lane: "order-safety",
    status: "repo-local-ready",
    vendorAdapterIds: requiredLiveVendorAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    recoveryEventNames: ["kill_switch_enabled", "idempotency_conflict", "order_mutation_blocked"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["REAL_ORDER_KILL_SWITCH=disabled", "providerRuntime blocked live order tests", "idempotent manual handoff API"],
    requiredEvidence: ["Kill-switch release approval", "Real-order dry-run transcript", "Idempotent order mutation proof"],
    blocker: "The kill switch is enforced locally; no approved release to order mutations exists."
  },
  {
    id: "pickup-cancel-recovery-drills",
    label: "Pickup and recovery drills",
    lane: "recovery",
    status: "evidence-missing",
    vendorAdapterIds: requiredLiveVendorAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    recoveryEventNames: ["wrong_store_recovery", "cancel_order", "pickup_sla_breached", "reorder_required"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["order recovery_actions persistence", "production wrong-store recovery gate"],
    requiredEvidence: ["Wrong-store recovery drill", "Cancel/reorder transcript", "Pickup SLA proof"],
    blocker: "No retailer pickup, cancellation, wrong-store, or reorder drill evidence is attached."
  },
  {
    id: "payment-refund-boundary",
    label: "Payment and refund boundary",
    lane: "payment-boundary",
    status: "evidence-missing",
    vendorAdapterIds: [],
    fallbackAdapterIds: requiredFallbackAdapterIds,
    recoveryEventNames: ["charge_voided", "refund_issued", "refund_failed"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["payment sandbox provider contracts", "provider governance budget caps", "production payment gate"],
    requiredEvidence: ["Processor refund proof", "PCI/legal approval", "Vendor refund policy mapping"],
    blocker: "No payment processor approval, live charge, void, or refund evidence is attached."
  },
  {
    id: "physical-print-qa",
    label: "Physical print QA",
    lane: "physical-qa",
    status: "certification-blocked",
    vendorAdapterIds: requiredLiveVendorAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    recoveryEventNames: ["print_bleed_failed", "color_shift_detected", "physical_sample_rejected"],
    manualConfirmationRequired: true,
    humanApprovalRequired: true,
    liveQuoteEnabled: false,
    directOrderEnabled: false,
    externalNetworkCalls: false,
    realPaymentsEnabled: false,
    physicalCertificationAttached: false,
    currentEvidence: ["print proof checks", "local SVG/PDF export", "external audit physical print certification item"],
    requiredEvidence: ["Physical 5x7 sample set", "Pickup receipt", "Retailer QA certification", "Safe-zone photo evidence"],
    blocker: "No physical print sample, pickup proof, or retailer QA certification is attached."
  }
];

export function summarizeRetailFulfillmentReadiness(items = retailFulfillmentReadinessItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
    certificationBlocked: items.filter((item) => item.status === "certification-blocked").length,
    liveVendorAdapterContracts: new Set(
      items.flatMap((item) => item.vendorAdapterIds).filter((adapterId) => requiredLiveVendorAdapterIds.includes(adapterId))
    ).size,
    manualFallbacks: new Set(items.flatMap((item) => item.fallbackAdapterIds)).size,
    recoveryDrillEvents: new Set(items.flatMap((item) => item.recoveryEventNames)).size,
    manualConfirmationRequired: items.filter((item) => item.manualConfirmationRequired).length,
    humanApprovalRequired: items.filter((item) => item.humanApprovalRequired).length,
    liveQuoteEnabled: items.filter((item) => item.liveQuoteEnabled).length,
    directOrderEnabled: items.filter((item) => item.directOrderEnabled).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    realPaymentsEnabled: items.filter((item) => item.realPaymentsEnabled).length,
    physicalCertificationAttached: items.filter((item) => item.physicalCertificationAttached).length,
    requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort(),
    blockers: validateRetailFulfillmentReadiness(items)
  };
}

export function validateRetailFulfillmentReadiness(items = retailFulfillmentReadinessItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate retail fulfillment readiness item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (!allowedStatuses.has(item.status)) {
      issues.push(`Retail fulfillment readiness item ${item.id} has unsupported status.`);
    }
    if (item.liveQuoteEnabled !== false) {
      issues.push(`Retail fulfillment readiness item ${item.id} must keep liveQuoteEnabled=false.`);
    }
    if (item.directOrderEnabled !== false) {
      issues.push(`Retail fulfillment readiness item ${item.id} must keep directOrderEnabled=false.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Retail fulfillment readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.realPaymentsEnabled !== false) {
      issues.push(`Retail fulfillment readiness item ${item.id} must keep realPaymentsEnabled=false.`);
    }
    if (item.physicalCertificationAttached !== false) {
      issues.push(`Retail fulfillment readiness item ${item.id} must not claim physicalCertificationAttached.`);
    }
    if (item.manualConfirmationRequired !== true) {
      issues.push(`Retail fulfillment readiness item ${item.id} must require manual confirmation.`);
    }
    if (item.humanApprovalRequired !== true) {
      issues.push(`Retail fulfillment readiness item ${item.id} must require human approval.`);
    }
    if (item.recoveryEventNames.length < 1) {
      issues.push(`Retail fulfillment readiness item ${item.id} must list recovery event names.`);
    }
    if (item.currentEvidence.length < 1) {
      issues.push(`Retail fulfillment readiness item ${item.id} must list current repo-local evidence.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`Retail fulfillment readiness item ${item.id} must list at least two required evidence items.`);
    }
    if (!item.blocker) {
      issues.push(`Retail fulfillment readiness item ${item.id} must explain its blocker.`);
    }
  }

  for (const requiredId of requiredRetailFulfillmentIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing retail fulfillment readiness item: ${requiredId}.`);
  }

  const liveQuoteContracts = itemsById.get("live-quote-contracts");
  if (liveQuoteContracts) assertCoversLiveVendors(liveQuoteContracts, issues, "Retail live quote contracts");

  const vendorCertification = itemsById.get("vendor-api-certification");
  if (vendorCertification) {
    assertCoversLiveVendors(vendorCertification, issues, "Retail vendor certification");
    if (vendorCertification.status !== "certification-blocked") {
      issues.push("Retail vendor certification must remain certification-blocked.");
    }
  }

  const killSwitch = itemsById.get("order-mutation-kill-switch");
  if (killSwitch) assertCoversLiveVendors(killSwitch, issues, "Retail order mutation kill switch");

  const physicalQa = itemsById.get("physical-print-qa");
  if (physicalQa) {
    assertCoversLiveVendors(physicalQa, issues, "Retail physical print QA");
    if (physicalQa.status !== "certification-blocked") issues.push("Retail physical print QA must remain certification-blocked.");
  }

  const manual = itemsById.get("manual-handoff-package");
  if (manual && !manual.fallbackAdapterIds.includes("manual-vendor-handoff")) {
    issues.push("Retail manual handoff package must include manual-vendor-handoff fallback.");
  }

  const pricing = itemsById.get("review-only-pricing");
  if (pricing && !pricing.fallbackAdapterIds.includes("public-printer-pricing-research")) {
    issues.push("Retail review-only pricing must include public-printer-pricing-research fallback.");
  }

  return issues;
}

function assertCoversLiveVendors(item, issues, label) {
  for (const adapterId of requiredLiveVendorAdapterIds) {
    if (!item.vendorAdapterIds.includes(adapterId)) issues.push(`${label} must include adapter: ${adapterId}.`);
  }
}
