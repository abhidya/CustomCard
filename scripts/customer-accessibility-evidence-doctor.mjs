import { readFileSync } from "node:fs";
import {
  customerAccessibilityEvidenceItems,
  summarizeCustomerAccessibilityEvidence,
  validateCustomerAccessibilityEvidence
} from "../src/customerAccessibilityEvidenceData.mjs";
import { checkArrayIncludes, checkExact, checkIncludes, checkMinimum, checkNoBlockers } from "./doctor-harness.mjs";

const files = {
  evidenceTest: "src/customerAccessibilityEvidence.test.ts",
  evidenceData: "src/customerAccessibilityEvidenceData.mjs",
  appSmoke: "tests/app-smoke.test.ts",
  mobileContract: "tests/mobile-contract.test.ts",
  app: "src/App.tsx",
  webappApp: "webapp/App.tsx",
  webappPrint: "webapp/views/PrintView.tsx",
  customerWebExperience: "src/customerWebExperience.ts",
  securityDoctor: "scripts/security-privacy-accessibility-doctor.mjs",
  externalAuditData: "src/externalAuditReadinessData.mjs",
  e2eCoverageData: "src/e2eCoverageData.mjs",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  workstreams: "docs/workstreams.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeCustomerAccessibilityEvidence(customerAccessibilityEvidenceItems);
const validationBlockers = validateCustomerAccessibilityEvidence(customerAccessibilityEvidenceItems);
const itemIds = customerAccessibilityEvidenceItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 6),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 5),
  checkExact("register", "external-evidence-missing-count", summary.externalEvidenceMissing, 1),
  checkExact("register", "external-audit-required-count", summary.externalAuditRequired, 6),
  checkExact("register", "no-external-audit-claim", summary.externalAuditAttached, 0),
  checkExact("register", "no-manual-screen-reader-proof-claim", summary.manualScreenReaderProofAttached, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-real-orders", summary.realOrdersEnabled, 0),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkMinimum("register", "source-signal-count", summary.sourceSignals.length, 20),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-customer-accessibility-ids", itemIds, [
    "customer-shell-landmarks",
    "customer-form-labels",
    "customer-action-focus-order",
    "customer-responsive-overflow",
    "mobile-preview-semantics",
    "external-assistive-technology-audit"
  ]),
  checkItemsShape("register", "customer-accessibility-item-shape", customerAccessibilityEvidenceItems),
  checkIncludes("tests", "customer-accessibility-evidence-tests", contents.evidenceTest, [
    "tracks repo-local customer accessibility proof without claiming external audit evidence",
    "keeps customer and mobile accessibility signals explicit at the Module Interface",
    "flags unsafe accessibility claims"
  ]),
  checkIncludes("tests", "browser-smoke-accessibility-signals", `${contents.appSmoke}\n${contents.evidenceData}`, [
    "keeps the mobile first viewport from overflowing horizontally",
    "aria-label=\\\"Customer chat message\\\"",
    "aria-label=\\\"CustomCard native customer shell\\\"",
    "const controls ="
  ]),
  checkIncludes("source", "customer-accessibility-source-signals", `${contents.app}\n${contents.webappApp}\n${contents.webappPrint}\n${contents.customerWebExperience}\n${contents.evidenceData}`, [
    'className="skipLink"',
    'href="#main-content"',
    'aria-label="CustomCard navigation"',
    '<main id="main-content">',
    'aria-label="Print-shop payment status"',
    "aria-label=\\\"Customer chat message\\\"",
    "aria-label=\\\"CustomCard native customer shell\\\"",
    "Customer web experience must expose exactly one primary action."
  ]),
  checkIncludes("existing-baseline", "security-doctor-imports-accessibility-module", contents.securityDoctor, [
    "customerAccessibilityEvidenceItems",
    "summarizeCustomerAccessibilityEvidence",
    "validateCustomerAccessibilityEvidence",
    "customerAccessibilityEvidenceData"
  ]),
  checkIncludes("governance", "external-audit-register-references-customer-evidence", contents.externalAuditData, [
    "Customer accessibility evidence doctor",
    "customerAccessibilityEvidence Module",
    "External accessibility audit"
  ]),
  checkIncludes("coverage", "e2e-coverage-references-customer-evidence", contents.e2eCoverageData, [
    "Customer accessibility evidence doctor",
    "Labeled customer controls covered",
    "External accessibility audit remains unclaimed"
  ]),
  checkIncludes("docs", "workstream-docs-reference-customer-accessibility-evidence", contents.workstreams, [
    "customer accessibility evidence doctor",
    "external accessibility audit evidence"
  ]),
  checkIncludes("ci", "customer-accessibility-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"customer:accessibility:doctor": "node scripts/customer-accessibility-evidence-doctor.mjs"',
    "Validate customer accessibility evidence",
    "npm run customer:accessibility:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "External WCAG audit report",
    "Keyboard tab-order capture",
    "Native emulator accessibility tree",
    "Assistive technology test notes",
    "Remediation signoff"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "repo-consistent" : "contract-drift"
  };
});

const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-customer-accessibility-evidence-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      items: summary.total,
      repoLocalReady: summary.repoLocalReady,
      externalEvidenceMissing: summary.externalEvidenceMissing,
      externalAuditRequired: summary.externalAuditRequired,
      externalAuditAttached: summary.externalAuditAttached,
      manualScreenReaderProofAttached: summary.manualScreenReaderProofAttached,
      externalNetworkCalls: summary.externalNetworkCalls,
      realOrdersEnabled: summary.realOrdersEnabled,
      liveProviderCalls: summary.liveProviderCalls,
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "surface",
    "sourceSignals",
    "currentEvidence",
    "requiredEvidence",
    "customerVisible",
    "externalAuditRequired",
    "externalAuditAttached",
    "manualScreenReaderProofAttached",
    "externalNetworkCalls",
    "realOrdersEnabled",
    "liveProviderCalls",
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
        ? `Validated ${items.length} executable customer accessibility evidence item shapes.`
        : `Missing customer accessibility evidence fields: ${missing.join(", ")}`
  };
}
