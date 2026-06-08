import { defineReadinessRegister } from "./readinessRegister.mjs";

const requiredPaymentReadinessIds = [
  "no-payment-local-gate",
  "sandbox-payment-contracts",
  "idempotent-checkout-session",
  "no-card-data-storage",
  "webhook-signature-verification",
  "live-charge-capture-approval",
  "refund-void-dispute-drills",
  "settlement-reconciliation"
];

const requiredPaymentAdapterIds = [
  "stripe-checkout-payment",
  "paypal-orders-payment",
  "square-payments-sandbox",
  "adyen-checkout-payment"
];

const requiredFallbackAdapterIds = ["no-payment-checkout-gate"];
const allowedStatuses = new Set(["repo-local-ready", "evidence-missing", "certification-blocked"]);

export const paymentReadinessItems = [
  {
    id: "no-payment-local-gate",
    label: "No-payment local gate",
    lane: "local-fallback",
    status: "repo-local-ready",
    paymentAdapterIds: [],
    fallbackAdapterIds: ["no-payment-checkout-gate"],
    ledgerEventNames: ["payment.skipped", "manual_checkout_selected"],
    idempotencyRequired: true,
    webhookSignatureRequired: false,
    processorApprovalRequired: false,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["no-payment checkout gate", "manual handoff flow", "mobile forbidden charge-payment mutation"],
    requiredEvidence: ["Manual payment policy", "Customer checkout disclosure", "Support refund script"],
    blocker: "The repo-local MVP deliberately collects no card data and creates no charges."
  },
  {
    id: "sandbox-payment-contracts",
    label: "Sandbox payment contracts",
    lane: "provider-contracts",
    status: "repo-local-ready",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: ["payment.sandbox_request_prepared", "payment.provider_contract_blocked"],
    idempotencyRequired: true,
    webhookSignatureRequired: true,
    processorApprovalRequired: false,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["providerRuntime payment dry-run contracts", "redacted payment payload tests", "provider governance budget caps"],
    requiredEvidence: ["Processor sandbox credentials", "Sandbox checkout transcript", "Webhook signing secret proof"],
    blocker: "Payment contracts are no-network sandbox request shapes; no processor sandbox transcript is attached."
  },
  {
    id: "idempotent-checkout-session",
    label: "Idempotent checkout session",
    lane: "idempotency",
    status: "repo-local-ready",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: ["checkout.idempotency_key_created", "checkout.idempotency_conflict", "checkout.replay_detected"],
    idempotencyRequired: true,
    webhookSignatureRequired: false,
    processorApprovalRequired: false,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["API idempotency contract", "payment idempotency key runtime gate", "Postgres idempotency doctors"],
    requiredEvidence: ["Processor idempotency replay transcript", "Duplicate-charge prevention drill", "Timeout/retry proof"],
    blocker: "Local idempotency is covered; no processor replay or duplicate-charge drill is attached."
  },
  {
    id: "no-card-data-storage",
    label: "No card data storage",
    lane: "pci-boundary",
    status: "repo-local-ready",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: ["card_data.tokenized_client_side", "card_data.storage_blocked"],
    idempotencyRequired: true,
    webhookSignatureRequired: false,
    processorApprovalRequired: false,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["providerRuntime payment redaction", "no-card-data-storage safety gate", "raw content storage blockers"],
    requiredEvidence: ["PCI scope memo", "Hosted checkout architecture review", "Sensitive-data scan report"],
    blocker: "No PCI scope memo or hosted checkout architecture review is attached."
  },
  {
    id: "webhook-signature-verification",
    label: "Webhook signature verification",
    lane: "webhooks",
    status: "evidence-missing",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: ["payment.webhook.received", "payment.webhook.signature_verified", "payment.webhook.replay_rejected"],
    idempotencyRequired: true,
    webhookSignatureRequired: true,
    processorApprovalRequired: false,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["payment webhook signature safety gate", "production payment launch gate", "external audit payment review item"],
    requiredEvidence: ["Webhook signature proof", "Replay rejection transcript", "Processor event mapping"],
    blocker: "No signed webhook payload, replay rejection, or event mapping evidence is attached."
  },
  {
    id: "live-charge-capture-approval",
    label: "Live charge and capture approval",
    lane: "processor-approval",
    status: "certification-blocked",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: ["payment.live_charge_blocked", "payment.capture_blocked", "payment.void_required"],
    idempotencyRequired: true,
    webhookSignatureRequired: true,
    processorApprovalRequired: true,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["production live payment gate", "no-payment fallback", "sandbox-only payment request contracts"],
    requiredEvidence: ["Processor live-mode approval", "PCI/legal approval", "Charge/capture dry-run transcript"],
    blocker: "No live-mode processor approval, PCI/legal approval, or charge/capture transcript is attached."
  },
  {
    id: "refund-void-dispute-drills",
    label: "Refund void and dispute drills",
    lane: "refunds-disputes",
    status: "evidence-missing",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: [
      "payment.refund_requested",
      "payment.refund_succeeded",
      "payment.refund_failed",
      "payment.dispute_opened",
      "payment.void_succeeded"
    ],
    idempotencyRequired: true,
    webhookSignatureRequired: true,
    processorApprovalRequired: true,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["refund path documented safety gate", "observability refund failure event", "retail payment/refund boundary"],
    requiredEvidence: ["Refund drill output", "Void drill output", "Dispute handling runbook", "Customer support refund transcript"],
    blocker: "No processor refund, void, dispute, or customer-support drill evidence is attached."
  },
  {
    id: "settlement-reconciliation",
    label: "Settlement reconciliation",
    lane: "reconciliation",
    status: "evidence-missing",
    paymentAdapterIds: requiredPaymentAdapterIds,
    fallbackAdapterIds: requiredFallbackAdapterIds,
    ledgerEventNames: ["payment.settlement_report_imported", "payment.ledger_reconciled", "payment.reconciliation_mismatch"],
    idempotencyRequired: true,
    webhookSignatureRequired: true,
    processorApprovalRequired: true,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false,
    pciScopeApproved: false,
    currentEvidence: ["append-only audit contract", "provider governance budget caps", "persistence readiness doctor"],
    requiredEvidence: ["Settlement report sample", "Ledger reconciliation proof", "Mismatch remediation drill"],
    blocker: "No processor settlement report, ledger reconciliation proof, or mismatch drill is attached."
  }
];

const paymentRegister = defineReadinessRegister({
  domainLabel: "payment",
  items: paymentReadinessItems,
  requiredIds: requiredPaymentReadinessIds,
  itemRules(item) {
    const issues = [];
    if (!allowedStatuses.has(item.status)) issues.push(`Payment readiness item ${item.id} has unsupported status.`);
    if (item.idempotencyRequired !== true) issues.push(`Payment readiness item ${item.id} must require idempotency.`);
    if (item.liveChargesEnabled !== false) issues.push(`Payment readiness item ${item.id} must keep liveChargesEnabled=false.`);
    if (item.liveRefundsEnabled !== false) issues.push(`Payment readiness item ${item.id} must keep liveRefundsEnabled=false.`);
    if (item.liveCaptureEnabled !== false) issues.push(`Payment readiness item ${item.id} must keep liveCaptureEnabled=false.`);
    if (item.externalNetworkCalls !== false) issues.push(`Payment readiness item ${item.id} must not require live external network calls.`);
    if (item.cardDataStored !== false) issues.push(`Payment readiness item ${item.id} must keep cardDataStored=false.`);
    if (item.pciScopeApproved !== false) issues.push(`Payment readiness item ${item.id} must not claim pciScopeApproved.`);
    if (item.ledgerEventNames.length < 1) issues.push(`Payment readiness item ${item.id} must list ledger event names.`);
    if (item.currentEvidence.length < 1) issues.push(`Payment readiness item ${item.id} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`Payment readiness item ${item.id} must list at least two required evidence items.`);
    if (!item.blocker) issues.push(`Payment readiness item ${item.id} must explain its blocker.`);
    return issues;
  },
  crossRules(itemsById) {
    const issues = [];

    const sandboxContracts = itemsById.get("sandbox-payment-contracts");
    if (sandboxContracts) {
      assertCoversPaymentAdapters(sandboxContracts, issues, "Payment sandbox contracts");
      if (!sandboxContracts.webhookSignatureRequired) {
        issues.push("Payment sandbox contracts must require webhook signatures.");
      }
    }

    const liveApproval = itemsById.get("live-charge-capture-approval");
    if (liveApproval) {
      assertCoversPaymentAdapters(liveApproval, issues, "Payment live charge and capture approval");
      if (liveApproval.status !== "certification-blocked") {
        issues.push("Payment live charge and capture approval must remain certification-blocked.");
      }
      if (!liveApproval.processorApprovalRequired || !liveApproval.webhookSignatureRequired) {
        issues.push("Payment live charge and capture approval must require processor approval and webhook signatures.");
      }
    }

    const refunds = itemsById.get("refund-void-dispute-drills");
    if (refunds) {
      assertCoversPaymentAdapters(refunds, issues, "Payment refund void and dispute drills");
      if (!refunds.processorApprovalRequired || !refunds.webhookSignatureRequired) {
        issues.push("Payment refund void and dispute drills must require processor approval and webhook signatures.");
      }
    }

    const noCardStorage = itemsById.get("no-card-data-storage");
    if (noCardStorage && noCardStorage.cardDataStored !== false) {
      issues.push("Payment no-card-data-storage item must keep cardDataStored=false.");
    }

    const localGate = itemsById.get("no-payment-local-gate");
    if (localGate && !localGate.fallbackAdapterIds.includes("no-payment-checkout-gate")) {
      issues.push("Payment no-payment local gate must include no-payment-checkout-gate fallback.");
    }

    return issues;
  },
  summarize(items) {
    return {
      repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
      evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
      certificationBlocked: items.filter((item) => item.status === "certification-blocked").length,
      paymentProviderContracts: new Set(
        items.flatMap((item) => item.paymentAdapterIds).filter((adapterId) => requiredPaymentAdapterIds.includes(adapterId))
      ).size,
      localFallbacks: new Set(items.flatMap((item) => item.fallbackAdapterIds)).size,
      ledgerEvents: new Set(items.flatMap((item) => item.ledgerEventNames)).size,
      idempotencyRequired: items.filter((item) => item.idempotencyRequired).length,
      webhookSignatureRequired: items.filter((item) => item.webhookSignatureRequired).length,
      processorApprovalRequired: items.filter((item) => item.processorApprovalRequired).length,
      liveChargesEnabled: items.filter((item) => item.liveChargesEnabled).length,
      liveRefundsEnabled: items.filter((item) => item.liveRefundsEnabled).length,
      liveCaptureEnabled: items.filter((item) => item.liveCaptureEnabled).length,
      externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
      cardDataStored: items.filter((item) => item.cardDataStored).length,
      pciScopeApproved: items.filter((item) => item.pciScopeApproved).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizePaymentReadiness(items = paymentReadinessItems) {
  return paymentRegister.summarize(items);
}

export function validatePaymentReadiness(items = paymentReadinessItems) {
  return paymentRegister.validate(items);
}

function assertCoversPaymentAdapters(item, issues, label) {
  for (const adapterId of requiredPaymentAdapterIds) {
    if (!item.paymentAdapterIds.includes(adapterId)) issues.push(`${label} must include adapter: ${adapterId}.`);
  }
}
