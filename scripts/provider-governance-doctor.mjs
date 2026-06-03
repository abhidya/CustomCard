import { readFileSync } from "node:fs";

const files = {
  governance: "src/providerGovernance.ts",
  governanceTest: "src/providerGovernance.test.ts",
  catalog: "src/providerCatalog.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const catalogText = contents.catalog;
const adapterCount = countMatches(catalogText, /id: "/g);
const usageBasedCount = countMatches(catalogText, /cost: "usage-based"/g);
const blockedCount = countMatches(catalogText, /status: "blocked"/g);

const checks = [
  checkMinimum("catalog", "expanded-adapter-catalog", adapterCount, 102),
  checkMinimum("catalog", "usage-based-adapters-present", usageBasedCount, 30),
  checkExact("catalog", "blocked-live-vendor-count", blockedCount, 6),
  checkIncludes("governance", "budget-rate-fallback-policy", contents.governance, [
    "ProviderGovernancePolicy",
    "monthlyBudgetCents",
    "perRequestBudgetCents",
    "rateLimitPerMinute",
    "fallbackAdapterId",
    "liveNetworkDefault: false",
    "realOrdersEnabled: false",
    "validateProviderGovernance"
  ]),
  checkIncludes("governance", "ready-local-fallbacks", contents.governance, [
    'auth: "local-demo-auth"',
    '"text-chat": "deterministic-customer-chat"',
    '"crm-integration": "crm-csv-lifecycle-import"',
    '"image-generation": "browser-svg-renderer"',
    '"vendor-handoff": "manual-vendor-handoff"',
    'payment: "no-payment-checkout-gate"',
    'observability: "local-health-audit-observability"'
  ]),
  checkIncludes("tests", "governance-contract-tests", contents.governanceTest, [
    "caps paid provider spend",
    "keeps blocked live vendor adapters at zero spend",
    "reports broken fallback and unbounded spend policies"
  ]),
  checkIncludes("surfaces", "admin-and-api-governance-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Provider governance",
    "summarizeProviderGovernance",
    "/api/admin/provider-governance",
    "providerGovernance"
  ]),
  checkIncludes("ci", "governance-doctor-is-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"provider:governance:doctor": "node scripts/provider-governance-doctor.mjs"',
    "Validate provider cost governance",
    "npm run provider:governance:doctor"
  ]),
  checkAbsent("safety", "no-live-governance-defaults", `${contents.governance}\n${contents.apiServer}`, [
    "liveNetworkDefault: true",
    "realOrdersEnabled: true"
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
      service: "customcard-provider-governance-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      adapterCount,
      usageBasedCount,
      blockedCount,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

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

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail: missing.length === 0 ? `Found ${required.length} required governance signals.` : `Missing governance signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? "No forbidden governance defaults found." : `Forbidden governance defaults present: ${present.join(", ")}`
  };
}
