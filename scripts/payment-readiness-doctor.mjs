import { paymentReadinessItems, summarizePaymentReadiness, validatePaymentReadiness } from "../src/paymentReadinessData.mjs";
import {
  blockersFromFailedChecks,
  checkArrayIncludes,
  checkExact,
  checkIncludes,
  checkMinimum,
  checkNoBlockers,
  exitIfBlocked,
  failedChecks,
  printDoctorReport,
  readTextFiles,
  summarizeCheckLanes
} from "./doctor-harness.mjs";

const files = {
  paymentTest: "src/paymentReadiness.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  providerCatalog: "src/providerCatalog.ts",
  providerRuntime: "src/providerRuntime.ts",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = readTextFiles(files);

const summary = summarizePaymentReadiness(paymentReadinessItems);
const validationBlockers = validatePaymentReadiness(paymentReadinessItems);
const itemIds = paymentReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "payment-provider-contracts", summary.paymentProviderContracts, 4),
  checkExact("register", "local-fallbacks", summary.localFallbacks, 1),
  checkExact("register", "no-live-charges", summary.liveChargesEnabled, 0),
  checkExact("register", "no-live-refunds", summary.liveRefundsEnabled, 0),
  checkExact("register", "no-live-captures", summary.liveCaptureEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-card-data-storage", summary.cardDataStored, 0),
  checkExact("register", "no-pci-claim", summary.pciScopeApproved, 0),
  checkMinimum("register", "ledger-event-count", summary.ledgerEvents, 20),
  checkMinimum("register", "webhook-signature-count", summary.webhookSignatureRequired, 5),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-payment-readiness-ids", itemIds, [
    "no-payment-local-gate",
    "sandbox-payment-contracts",
    "idempotent-checkout-session",
    "no-card-data-storage",
    "webhook-signature-verification",
    "live-charge-capture-approval",
    "refund-void-dispute-drills",
    "settlement-reconciliation"
  ]),
  checkItemsShape("register", "payment-readiness-item-shape", paymentReadinessItems),
  checkIncludes("tests", "payment-readiness-tests", contents.paymentTest, [
    "tracks payment and refund readiness without live charge claims",
    "covers sandbox payment providers, fallback, and refund ledger events explicitly",
    "flags unsafe payment launch claims"
  ]),
  checkIncludes("surfaces", "admin-api-payment-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Payment readiness",
    "summarizePaymentReadiness",
    "paymentReadiness",
    "liveChargesEnabled",
    "pciScopeApproved"
  ]),
  checkIncludes("provider-contracts", "payment-provider-contracts", `${contents.providerCatalog}\n${contents.providerRuntime}`, [
    "no-payment-checkout-gate",
    "stripe-checkout-payment",
    "paypal-orders-payment",
    "square-payments-sandbox",
    "adyen-checkout-payment",
    "real_charges_enabled",
    "refundPathDocumented",
    "webhookSignatureVerified"
  ]),
  checkIncludes("docs", "payment-readiness-docs", contents.docs, [
    "Payment readiness",
    "`src/paymentReadiness.ts`",
    "`npm run payment:doctor`",
    "not live payment processing"
  ]),
  checkIncludes("ci", "payment-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"payment:doctor": "node scripts/payment-readiness-doctor.mjs"',
    "Validate payment readiness",
    "npm run payment:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Processor live-mode approval",
    "Refund drill output",
    "Webhook signature proof",
    "PCI scope memo",
    "Settlement report sample"
  ])
];

const lanes = summarizeCheckLanes(checks);
const failed = failedChecks(checks);

printDoctorReport({
  service: "customcard-payment-readiness-doctor",
  status: failed.length === 0 ? "ready" : "blocked",
  items: summary.total,
  paymentProviderContracts: summary.paymentProviderContracts,
  localFallbacks: summary.localFallbacks,
  ledgerEvents: summary.ledgerEvents,
  webhookSignatureRequired: summary.webhookSignatureRequired,
  liveChargesEnabled: summary.liveChargesEnabled,
  liveRefundsEnabled: summary.liveRefundsEnabled,
  liveCaptureEnabled: summary.liveCaptureEnabled,
  externalNetworkCalls: summary.externalNetworkCalls,
  cardDataStored: summary.cardDataStored,
  pciScopeApproved: summary.pciScopeApproved,
  lanes,
  checks,
  blockers: blockersFromFailedChecks(checks)
});

exitIfBlocked(checks);

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "paymentAdapterIds",
    "fallbackAdapterIds",
    "ledgerEventNames",
    "idempotencyRequired",
    "webhookSignatureRequired",
    "processorApprovalRequired",
    "liveChargesEnabled",
    "liveRefundsEnabled",
    "liveCaptureEnabled",
    "externalNetworkCalls",
    "cardDataStored",
    "pciScopeApproved",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ];
  const missing = [];

  for (const item of items) {
    for (const key of requiredKeys) {
      if (!(key in item)) missing.push(`${item.id ?? "unknown"}.${key}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${items.length} executable payment readiness item shapes.`
        : `Missing payment readiness fields: ${missing.join(", ")}`
  };
}
