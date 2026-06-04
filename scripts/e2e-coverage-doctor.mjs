import { readFileSync } from "node:fs";
import { e2eCoverageItems, summarizeE2eCoverage, validateE2eCoverage } from "../src/e2eCoverageData.mjs";

const files = {
  e2eTest: "src/e2eCoverage.test.ts",
  appSmoke: "tests/app-smoke.test.ts",
  mobileTest: "tests/mobile-contract.test.ts",
  apiServerTest: "tests/api-server.test.ts",
  infraTest: "tests/infra-contract.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeE2eCoverage(e2eCoverageItems);
const validationBlockers = validateE2eCoverage(e2eCoverageItems);

const checks = [
  checkExact("matrix", "item-count", summary.total, 26),
  checkExact("matrix", "repo-local-coverage-percent", summary.repoLocalCoveragePercent, 100),
  checkExact("matrix", "covered-count", summary.covered, summary.total),
  checkExact("matrix", "ci-gated-count", summary.ciGated, summary.total),
  checkExact("safety", "no-live-production-proof", summary.liveProductionProofs, 0),
  checkExact("safety", "no-real-orders", summary.realOrdersEnabled, 0),
  checkExact("safety", "no-live-external-network-calls", summary.externalNetworkCalls, 0),
  checkNoBlockers("matrix", "executable-summary-and-validation", validationBlockers),
  checkItemsShape("matrix", "coverage-item-shape", e2eCoverageItems),
  checkArrayIncludes("surfaces", "required-surfaces", summary.surfaces, [
    "web-customer",
    "web-admin",
    "adapters",
    "api",
    "identity",
    "mobile",
    "infra",
    "governance"
  ]),
  checkIncludes("tests", "coverage-tests", contents.e2eTest, [
    "covers every repo-local reviewer workflow",
    "maps the customer, admin, mobile, API, adapter, and infra journeys",
    "flags unsafe or weak coverage claims"
  ]),
  checkIncludes("tests", "backing-test-files", `${contents.appSmoke}\n${contents.mobileTest}\n${contents.apiServerTest}\n${contents.infraTest}`, [
    "runs local auth, free import, card studio, and manual handoff",
    "exposes customer and admin panels without overflow",
    "passes the mobile doctor",
    "passes its doctor contract",
    "defines a CI verification workflow"
  ]),
  checkIncludes("surfaces", "admin-api-coverage-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "End-to-end coverage",
    "summarizeE2eCoverage",
    "e2eCoverage",
    "repoLocalCoveragePercent",
    "liveProductionProofs"
  ]),
  checkIncludes("docs", "coverage-docs", contents.docs, [
    "End-to-end coverage",
    "`src/e2eCoverage.ts`",
    "`npm run e2e:coverage:doctor`",
    "repo-local end-to-end coverage"
  ]),
  checkIncludes("ci", "coverage-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"e2e:coverage:doctor": "node scripts/e2e-coverage-doctor.mjs"',
    "Validate end-to-end coverage readiness",
    "npm run e2e:coverage:doctor"
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
      service: "customcard-e2e-coverage-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      journeys: summary.total,
      repoLocalCoveragePercent: summary.repoLocalCoveragePercent,
      ciGated: summary.ciGated,
      liveProductionProofs: summary.liveProductionProofs,
      realOrdersEnabled: summary.realOrdersEnabled,
      externalNetworkCalls: summary.externalNetworkCalls,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

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
    detail: blockers.length === 0 ? "Executable E2E coverage contract has no validation blockers." : blockers.join(" ")
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "surface",
    "automationType",
    "status",
    "ciGated",
    "testCommands",
    "evidence",
    "liveProductionProof",
    "realOrdersEnabled",
    "externalNetworkCalls"
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
        ? `Validated ${items.length} executable E2E coverage item shapes.`
        : `Missing E2E coverage fields: ${missing.join(", ")}`
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
        ? `Found ${required.length} required E2E coverage signals.`
        : `Missing E2E coverage signals: ${missing.join(", ")}`
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
        ? `Found ${required.length} required E2E surfaces.`
        : `Missing E2E surfaces: ${missing.join(", ")}`
  };
}
