import {
  aiQueueOperationMetrics,
  aiQueueOperationsItems,
  summarizeAiQueueOperations,
  validateAiQueueOperations
} from "../src/aiQueueOperationsData.mjs";
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
  id: "ai-queue-operations",
  service: "customcard-ai-queue-operations-doctor",
  npmScript: "ai:queue:doctor",
  scriptPath: "scripts/ai-queue-operations-doctor.mjs",
  workflowLabel: "Validate AI queue operations readiness",
  docsTitle: "AI queue operations",
  readinessModule: "src/aiQueueOperationsData.mjs",
  files: {
    aiQueueData: "src/aiQueueOperationsData.mjs",
    aiQueueTest: "src/aiQueueOperations.test.ts",
    apiRuntime: "scripts/api-runtime.mjs",
    apiMutationRuntime: "scripts/api-route-mutation-runtime.mjs",
    apiRoutes: "scripts/api-route-families.mjs",
    apiContracts: "src/apiContracts.ts",
    routeContracts: "src/apiRouteContractsData.mjs",
    workerRuntime: "scripts/worker-runtime.mjs",
    workerScript: "scripts/worker.mjs",
    workerTest: "tests/worker-runtime.test.ts",
    docs: "docs/ai-queue-operations-runbook.md",
    decisions: "docs/decisions.md"
  },
  docsKeys: ["docs", "decisions"]
});

const contents = readDoctorManifestFiles(doctorManifest);
const summary = summarizeAiQueueOperations(aiQueueOperationsItems);
const blockers = validateAiQueueOperations(aiQueueOperationsItems);

const checks = [
  checkExact("controls", "control-count", summary.total, 7),
  checkExact("controls", "all-controls-production-ready", summary.productionReadyControls, summary.total),
  checkExact("controls", "all-controls-human-owned", summary.humanOwnedControls, summary.total),
  checkNoBlockers("controls", "executable-ai-queue-validation", blockers),
  checkMinimum("metrics", "tracked-metric-count", summary.metricsTracked, 5),
  checkMinimum("metrics", "alert-threshold-count", summary.alertThresholds, 5),
  checkExact("metrics", "pii-free-metrics", summary.piiFreeMetrics, aiQueueOperationMetrics.length),
  checkMinimum("human-ops", "dead-letter-controls", summary.deadLetterControls, 3),
  checkArrayIncludes("metrics", "required-metrics", summary.metrics, [
    "api_jobs_queued_total",
    "api_jobs_oldest_queued_age_seconds",
    "api_jobs_stale_running_total",
    "api_jobs_dead_lettered_total",
    "provider_spend_budget_percent"
  ]),
  checkItemsHaveKeys("controls", "control-contract-shape", aiQueueOperationsItems, [
    "id",
    "label",
    "lane",
    "status",
    "currentEvidence",
    "requiredEvidence",
    "metrics",
    "alertIds",
    "humanOwner",
    "productionReady"
  ], {
    readyDetail: `Validated ${aiQueueOperationsItems.length} AI queue operation controls.`,
    missingPrefix: "Missing AI queue operation fields"
  }),
  checkItemsHaveKeys("metrics", "metric-contract-shape", aiQueueOperationMetrics, [
    "id",
    "metric",
    "source",
    "owner",
    "piiFree",
    "warnAt",
    "pageAt",
    "runbookAction"
  ], {
    readyDetail: `Validated ${aiQueueOperationMetrics.length} AI queue metrics.`,
    missingPrefix: "Missing AI queue metric fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "api",
    id: "queue-admission-signals",
    sourceKeys: ["apiRuntime", "apiMutationRuntime", "apiRoutes", "routeContracts"],
    signals: [
      "publicQueuedJobAcceptance",
      "buildQueuedJobPayload",
      "sanitizeAiChatJobBody",
      "sanitizeAiCardJobBody",
      "job_status_url",
      "ai-job-status",
      "api_jobs"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "worker",
    id: "worker-retry-dlq-signals",
    sourceKeys: ["workerRuntime", "workerTest"],
    signals: [
      "FOR UPDATE SKIP LOCKED",
      "runLoop",
      "pollIntervalMs",
      "dead_lettered",
      "retryBackoffSeconds",
      "requeueExpiredJobs",
      "compactAiWorkerPayload",
      "executes queued AI card jobs",
      "bounded polling loop"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "worker",
    id: "worker-cli-pickup-signals",
    sourceKeys: ["docs", "workerRuntime", "workerScript"],
    signals: [
      "npm run worker",
      "--once",
      "--describe",
      "runtime.runLoop",
      "/api/admin/worker-config",
      "CUSTOMCARD_API_RUNTIME=postgres"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "fallbacks",
    id: "provider-fallback-signals",
    sourceKeys: ["docs", "aiQueueData", "workerTest"],
    signals: [
      "Provider fallback configuration",
      "user-content-only",
      "provider_failure",
      "provider_call_events",
      "ai_cost_gate.blocked_reasons"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "admin-api",
    id: "admin-readiness-surface",
    sourceKeys: ["apiContracts", "routeContracts"],
    signals: [
      "aiQueueOperations",
      "AiQueueOperationsSummary",
      "readiness.aiQueueOperations.summary"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "ai-queue-tests",
    sourceKeys: ["aiQueueTest"],
    signals: [
      "defines production-ready queue controls",
      "tracks concrete queue health and cost metrics",
      "summarizes admin-facing readiness",
      "rejects missing alert ownership"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, [
    "api_jobs_queued_total",
    "api_jobs_oldest_queued_age_seconds",
    "api_jobs_dead_lettered_total",
    "Worker pickup configuration",
    "Provider fallback configuration",
    "Dead-letter triage",
    "Page immediately",
    "Customer support script"
  ], { id: "ai-queue-runbook-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "ai-queue-doctor-scripted-and-gated" }),
  checkExact("safety", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkExact("safety", "no-external-network-calls", summary.externalNetworkCalls, 0)
];

runDoctorReport({
  service: doctorManifest.service,
  controls: summary.total,
  metricsTracked: summary.metricsTracked,
  alertThresholds: summary.alertThresholds,
  humanOwnedControls: summary.humanOwnedControls,
  deadLetterControls: summary.deadLetterControls,
  liveProviderCalls: summary.liveProviderCalls > 0,
  externalNetworkCalls: summary.externalNetworkCalls > 0
}, checks);
