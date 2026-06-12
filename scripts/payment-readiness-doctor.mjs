import { paymentReadinessItems, summarizePaymentReadiness, validatePaymentReadiness } from "../src/paymentReadinessData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkItemsHaveKeys,
  checkMinimum,
  checkNoBlockers,
  runDoctorReport
} from "./doctor-harness.mjs";
import {
  checkDoctorDocs,
  checkDoctorScriptedAndGated,
  checkDoctorSourceSignals,
  defineDoctorManifest,
  readDoctorManifestFiles
} from "./doctor-manifest.mjs";

const doctorManifest = defineDoctorManifest({
  id: "payment",
  service: "customcard-payment-readiness-doctor",
  npmScript: "payment:doctor",
  scriptPath: "scripts/payment-readiness-doctor.mjs",
  workflowLabel: "Validate payment readiness",
  docsTitle: "Payment readiness",
  readinessModule: "src/paymentReadiness.ts",
  files: {
    paymentTest: "src/paymentReadiness.test.ts",
    app: "src/App.tsx",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    providerCatalog: "src/providerCatalog.ts",
    providerRuntime: "src/providerRuntime.ts",
    docs: "docs/platform-expansion-design.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

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
  checkItemsHaveKeys("register", "payment-readiness-item-shape", paymentReadinessItems, [
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
  ], {
    readyDetail: `Validated ${paymentReadinessItems.length} executable payment readiness item shapes.`,
    missingPrefix: "Missing payment readiness fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "payment-readiness-tests",
    sourceKeys: ["paymentTest"],
    signals: [
      "tracks payment and refund readiness without live charge claims",
      "covers sandbox payment providers, fallback, and refund ledger events explicitly",
      "flags unsafe payment launch claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-payment-surfaces",
    sourceKeys: ["app", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "Payment readiness",
      "summarizePaymentReadiness",
      "paymentReadiness",
      "liveChargesEnabled",
      "pciScopeApproved"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "provider-contracts",
    id: "payment-provider-contracts",
    sourceKeys: ["providerCatalog", "providerRuntime"],
    signals: [
      "no-payment-checkout-gate",
      "stripe-checkout-payment",
      "paypal-orders-payment",
      "square-payments-sandbox",
      "adyen-checkout-payment",
      "real_charges_enabled",
      "refundPathDocumented",
      "webhookSignatureVerified"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not live payment processing"], { id: "payment-readiness-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "payment-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Processor live-mode approval",
    "Refund drill output",
    "Webhook signature proof",
    "PCI scope memo",
    "Settlement report sample"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
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
  pciScopeApproved: summary.pciScopeApproved
}, checks);
