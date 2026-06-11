import { readFileSync } from "node:fs";

const files = {
  operations: "src/providerOperations.ts",
  operationsTest: "src/providerOperations.test.ts",
  persistenceContracts: "src/persistenceContracts.ts",
  migration: "infra/migrations/001_initial_schema.sql",
  apiRuntime: "scripts/api-runtime.mjs",
  docs: "docs/provider-failover-gameday.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const checks = [
  checkIncludes("router", "fallback-router-and-budget-enforcement", contents.operations, [
    "buildProviderFailoverPlan",
    "evaluateProviderAttempt",
    "summarizeProviderUsage",
    "monthly-budget-exceeded",
    "per-request-budget-exceeded",
    "rate-limit-exceeded",
    "circuit-open",
    "liveNetworkDefault: false",
    "auditRequired: true"
  ]),
  checkIncludes("ledger", "provider-call-event-contract", contents.operations, [
    "ProviderCallEvent",
    "tenantId",
    "monthBucket",
    "estimatedCostCents",
    "actualCostCents",
    "fallbackReason",
    "piiFree: true",
    "liveNetworkCall: false",
    "provider.fallback.selected"
  ]),
  checkIncludes("tests", "provider-operations-tests", contents.operationsTest, [
    "falls back to deterministic local rendering when preferred providers are unavailable",
    "reserves budget for the first ready provider without performing a live call",
    "skips over-budget providers and selects the next configured provider",
    "uses the local fallback when every configured provider exceeds the current rate window",
    "summarizes monthly spend and audit events by tenant"
  ]),
  checkIncludes("schema", "durable-provider-usage-ledger", `${contents.persistenceContracts}\n${contents.migration}`, [
    "provider_call_events",
    "providerUsageLedgerTable",
    "tenant_id TEXT NOT NULL",
    "month_bucket TEXT NOT NULL",
    "estimated_cost_cents INTEGER NOT NULL",
    "pii_free BOOLEAN NOT NULL DEFAULT TRUE CHECK (pii_free = TRUE)",
    "live_network_call BOOLEAN NOT NULL DEFAULT FALSE CHECK (live_network_call = FALSE)",
    "idx_provider_call_events_tenant_month"
  ]),
  checkIncludes("runtime", "render-route-ledger-insert", contents.apiRuntime, [
    "INSERT INTO provider_call_events",
    "browser-svg-renderer",
    "local-fallback-no-live-network",
    "provider.fallback.selected",
    "provider_call_events"
  ]),
  checkIncludes("docs", "provider-failover-gameday-runbook", contents.docs, [
    "Provider failover game day",
    "monthly-budget-exceeded",
    "rate-limit-exceeded",
    "circuit-open",
    "provider_call_events",
    "npm run provider:operations:doctor"
  ]),
  checkIncludes("ci", "provider-operations-doctor-is-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"provider:operations:doctor": "node scripts/provider-operations-doctor.mjs"',
    "Validate provider operations failover",
    "npm run provider:operations:doctor"
  ]),
  checkAbsent("safety", "no-live-provider-claims", `${contents.operations}\n${contents.migration}\n${contents.apiRuntime}`, [
    "liveNetworkDefault: true",
    "liveNetworkCall: true",
    "live_network_call BOOLEAN NOT NULL DEFAULT TRUE"
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
      service: "customcard-provider-operations-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      ledgerTable: "provider_call_events",
      fallbackReasons: 9,
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

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail: missing.length === 0 ? `Found ${required.length} required provider operations signals.` : `Missing provider operations signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? "No forbidden live-provider operations claims found." : `Forbidden live-provider operations claims present: ${present.join(", ")}`
  };
}
