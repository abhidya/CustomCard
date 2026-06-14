import { readFileSync } from "node:fs";
import { checkAbsent, checkExact, checkIncludes, checkMinimum } from "./doctor-harness.mjs";

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
  checkMinimum("catalog", "expanded-adapter-catalog", adapterCount, 121),
  checkMinimum("catalog", "usage-based-adapters-present", usageBasedCount, 57),
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
    'auth: "local-workspace-auth"',
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
    status: laneChecks.every((check) => check.passed) ? "repo-consistent" : "contract-drift"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-provider-governance-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      adapterCount,
      usageBasedCount,
      blockedCount,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

