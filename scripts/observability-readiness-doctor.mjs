import { readFileSync } from "node:fs";
import {
  observabilityReadinessItems,
  summarizeObservabilityReadiness,
  validateObservabilityReadiness
} from "../src/observabilityReadinessData.mjs";
import { checkArrayIncludes, checkExact, checkIncludes, checkMinimum, checkNoBlockers } from "./doctor-harness.mjs";

const files = {
  observabilityTest: "src/observabilityReadiness.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  providerRuntime: "src/providerRuntime.ts",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeObservabilityReadiness(observabilityReadinessItems);
const validationBlockers = validateObservabilityReadiness(observabilityReadinessItems);
const itemIds = observabilityReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 7),
  checkExact("register", "no-live-ingestion", summary.liveIngestionEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-production-alerts", summary.productionAlertsEnabled, 0),
  checkMinimum("register", "provider-contract-count", summary.providerContracts, 6),
  checkMinimum("register", "alert-route-count", summary.alertRoutesRequired, 4),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-observability-ids", itemIds, [
    "telemetry-event-schema",
    "pii-redaction-sample",
    "sampling-and-budget-policy",
    "retention-policy",
    "alert-routing-drill",
    "observability-provider-contracts",
    "incident-review-runbook"
  ]),
  checkItemsShape("register", "observability-item-shape", observabilityReadinessItems),
  checkIncludes("tests", "observability-tests", contents.observabilityTest, [
    "tracks telemetry and alerting readiness without live ingestion claims",
    "covers provider contracts and critical alert events explicitly",
    "flags unsafe telemetry claims"
  ]),
  checkIncludes("surfaces", "admin-api-observability-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Observability readiness",
    "summarizeObservabilityReadiness",
    "observability:",
    "liveIngestionEnabled",
    "productionAlertsEnabled"
  ]),
  checkIncludes("provider-runtime", "observability-provider-runtime-contracts", contents.providerRuntime, [
    "sentry-error-observability",
    "posthog-product-observability",
    "opentelemetry-otlp-observability",
    "grafana-cloud-otlp-observability",
    "datadog-logs-observability",
    "betterstack-logs-observability",
    "live_telemetry: \"disabled\""
  ]),
  checkIncludes("docs", "observability-docs", contents.docs, [
    "Observability readiness",
    "`src/observabilityReadiness.ts`",
    "`npm run observability:doctor`",
    "not live telemetry ingestion"
  ]),
  checkIncludes("ci", "observability-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"observability:doctor": "node scripts/observability-readiness-doctor.mjs"',
    "Validate observability readiness",
    "npm run observability:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Telemetry endpoint proof",
    "PII redaction sample",
    "Alert route drill",
    "Retention policy approval",
    "Incident response drill"
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
      service: "customcard-observability-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      providerContracts: summary.providerContracts,
      alertRoutesRequired: summary.alertRoutesRequired,
      liveIngestionEnabled: summary.liveIngestionEnabled,
      externalNetworkCalls: summary.externalNetworkCalls,
      productionAlertsEnabled: summary.productionAlertsEnabled,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
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
    "providerAdapterIds",
    "eventNames",
    "piiRedacted",
    "samplingPolicy",
    "retentionDays",
    "alertRouteRequired",
    "liveIngestionEnabled",
    "externalNetworkCalls",
    "productionAlertEnabled",
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
        ? `Validated ${items.length} executable observability item shapes.`
        : `Missing observability fields: ${missing.join(", ")}`
  };
}

