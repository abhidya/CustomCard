import { readFileSync } from "node:fs";
import {
  retailFulfillmentReadinessItems,
  summarizeRetailFulfillmentReadiness,
  validateRetailFulfillmentReadiness
} from "../src/retailFulfillmentReadinessData.mjs";

const files = {
  retailTest: "src/retailFulfillmentReadiness.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  providerCatalog: "src/providerCatalog.ts",
  providerRuntime: "src/providerRuntime.ts",
  retailPrinterAdapters: "src/retailPrinterAdapters.ts",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeRetailFulfillmentReadiness(retailFulfillmentReadinessItems);
const validationBlockers = validateRetailFulfillmentReadiness(retailFulfillmentReadinessItems);
const itemIds = retailFulfillmentReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "live-vendor-contracts", summary.liveVendorAdapterContracts, 6),
  checkExact("register", "manual-fallbacks", summary.manualFallbacks, 2),
  checkExact("register", "no-live-quotes", summary.liveQuoteEnabled, 0),
  checkExact("register", "no-direct-orders", summary.directOrderEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-real-payments", summary.realPaymentsEnabled, 0),
  checkExact("register", "no-physical-certification-claim", summary.physicalCertificationAttached, 0),
  checkMinimum("register", "recovery-drill-events", summary.recoveryDrillEvents, 12),
  checkMinimum("register", "human-approval-count", summary.humanApprovalRequired, 8),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-retail-readiness-ids", itemIds, [
    "manual-handoff-package",
    "review-only-pricing",
    "live-quote-contracts",
    "vendor-api-certification",
    "order-mutation-kill-switch",
    "pickup-cancel-recovery-drills",
    "payment-refund-boundary",
    "physical-print-qa"
  ]),
  checkItemsShape("register", "retail-readiness-item-shape", retailFulfillmentReadinessItems),
  checkIncludes("tests", "retail-readiness-tests", contents.retailTest, [
    "tracks direct retail-printer fulfillment readiness without live ordering claims",
    "covers live vendor adapters, manual fallbacks, and recovery drills explicitly",
    "flags unsafe retail launch claims"
  ]),
  checkIncludes("surfaces", "admin-api-retail-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Retail fulfillment readiness",
    "summarizeRetailFulfillmentReadiness",
    "retailFulfillment",
    "directOrderEnabled",
    "physicalCertificationAttached"
  ]),
  checkIncludes("provider-contracts", "retail-provider-contracts", `${contents.providerCatalog}\n${contents.providerRuntime}\n${contents.retailPrinterAdapters}`, [
    "manual-vendor-handoff",
    "public-printer-pricing-research",
    "walgreens-live-order",
    "cvs-live-order",
    "fedex-live-print",
    "walmart-live-print",
    "staples-live-print",
    "office-depot-live-print",
    "RetailPrinterSourceLink",
    "sourceLinks",
    "RetailPrinterOperationRequestBlueprint",
    "createRetailPrinterOperationAdapter",
    "networkAttempted: false",
    "requestPrepared: false",
    "future-certified-api-or-reviewed-browser-session",
    "raw relationship memories",
    "raw payment card data",
    "paymentAuthorizationReference",
    "Live vendor orders remain disabled"
  ]),
  checkIncludes("docs", "retail-readiness-docs", contents.docs, [
    "Retail fulfillment readiness",
    "`src/retailFulfillmentReadiness.ts`",
    "`npm run retail:doctor`",
    "not live retail ordering"
  ]),
  checkIncludes("ci", "retail-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"retail:doctor": "node scripts/retail-fulfillment-readiness-doctor.mjs"',
    "Validate retail fulfillment readiness",
    "npm run retail:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Retail partner certification",
    "Physical 5x7 sample set",
    "Wrong-store recovery drill",
    "Processor refund proof",
    "Sandbox live quote response"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-retail-fulfillment-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      liveVendorAdapterContracts: summary.liveVendorAdapterContracts,
      manualFallbacks: summary.manualFallbacks,
      recoveryDrillEvents: summary.recoveryDrillEvents,
      liveQuoteEnabled: summary.liveQuoteEnabled,
      directOrderEnabled: summary.directOrderEnabled,
      externalNetworkCalls: summary.externalNetworkCalls,
      realPaymentsEnabled: summary.realPaymentsEnabled,
      physicalCertificationAttached: summary.physicalCertificationAttached,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkMinimum(lane, id, actual, minimum) {
  return {
    id,
    lane,
    passed: actual >= minimum,
    detail: actual >= minimum ? `${actual} is at least ${minimum}.` : `${actual} is below required minimum ${minimum}.`
  };
}

function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

function checkNoBlockers(lane, id, blockers) {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Executable retail fulfillment readiness contract has no blockers." : blockers.join(" ")
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "vendorAdapterIds",
    "fallbackAdapterIds",
    "recoveryEventNames",
    "manualConfirmationRequired",
    "humanApprovalRequired",
    "liveQuoteEnabled",
    "directOrderEnabled",
    "externalNetworkCalls",
    "realPaymentsEnabled",
    "physicalCertificationAttached",
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
        ? `Validated ${items.length} executable retail fulfillment readiness item shapes.`
        : `Missing retail fulfillment readiness fields: ${missing.join(", ")}`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required retail fulfillment readiness signals.`
        : `Missing retail fulfillment readiness signals: ${missing.join(", ")}`
  };
}

function checkArrayIncludes(lane, id, values, required) {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required retail fulfillment readiness signals.`
        : `Missing retail fulfillment readiness signals: ${missing.join(", ")}`
  };
}
