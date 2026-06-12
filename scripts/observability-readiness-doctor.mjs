import {
  observabilityReadinessItems,
  summarizeObservabilityReadiness,
  validateObservabilityReadiness
} from "../src/observabilityReadinessData.mjs";
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
  id: "observability",
  service: "customcard-observability-readiness-doctor",
  npmScript: "observability:doctor",
  scriptPath: "scripts/observability-readiness-doctor.mjs",
  workflowLabel: "Validate observability readiness",
  docsTitle: "Observability readiness",
  readinessModule: "src/observabilityReadiness.ts",
  files: {
    observabilityTest: "src/observabilityReadiness.test.ts",
    app: "src/App.tsx",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    providerRuntime: "src/providerRuntime.ts",
    docs: "docs/platform-expansion-design.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

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
  checkItemsHaveKeys("register", "observability-item-shape", observabilityReadinessItems, [
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
  ], {
    readyDetail: `Validated ${observabilityReadinessItems.length} executable observability item shapes.`,
    missingPrefix: "Missing observability fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "observability-tests",
    sourceKeys: ["observabilityTest"],
    signals: [
      "tracks telemetry and alerting readiness without live ingestion claims",
      "covers provider contracts and critical alert events explicitly",
      "flags unsafe telemetry claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-observability-surfaces",
    sourceKeys: ["app", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "Observability readiness",
      "summarizeObservabilityReadiness",
      "observability:",
      "liveIngestionEnabled",
      "productionAlertsEnabled"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "provider-runtime",
    id: "observability-provider-runtime-contracts",
    sourceKeys: ["providerRuntime"],
    signals: [
      "sentry-error-observability",
      "posthog-product-observability",
      "opentelemetry-otlp-observability",
      "grafana-cloud-otlp-observability",
      "datadog-logs-observability",
      "betterstack-logs-observability",
      "live_telemetry: \"disabled\""
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not live telemetry ingestion"], { id: "observability-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "observability-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Telemetry endpoint proof",
    "PII redaction sample",
    "Alert route drill",
    "Retention policy approval",
    "Incident response drill"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
  items: summary.total,
  providerContracts: summary.providerContracts,
  alertRoutesRequired: summary.alertRoutesRequired,
  liveIngestionEnabled: summary.liveIngestionEnabled,
  externalNetworkCalls: summary.externalNetworkCalls,
  productionAlertsEnabled: summary.productionAlertsEnabled
}, checks);
