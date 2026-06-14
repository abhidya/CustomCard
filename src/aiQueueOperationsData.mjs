import { defineReadinessRegister } from "./readinessRegister.mjs";

const requiredAiQueueOperationIds = [
  "queue-admission-contract",
  "worker-lease-retry-dlq",
  "status-polling-contract",
  "payload-minimization-retention",
  "operational-metrics",
  "alert-thresholds",
  "human-dead-letter-management"
];

export const aiQueueOperationMetrics = [
  {
    id: "queued-job-count",
    metric: "api_jobs_queued_total",
    source: "api_jobs WHERE status='queued'",
    owner: "operations",
    piiFree: true,
    warnAt: 50,
    pageAt: 200,
    runbookAction: "Scale worker replicas or pause new live-provider admission until queue drains."
  },
  {
    id: "oldest-queued-age",
    metric: "api_jobs_oldest_queued_age_seconds",
    source: "MAX(NOW() - created_at) for queued jobs",
    owner: "operations",
    piiFree: true,
    warnAt: 300,
    pageAt: 900,
    runbookAction: "Check worker health, provider spend gates, and Postgres lease contention."
  },
  {
    id: "stale-running-job-count",
    metric: "api_jobs_stale_running_total",
    source: "api_jobs WHERE status='running' AND locked_at older than worker lease",
    owner: "operations",
    piiFree: true,
    warnAt: 1,
    pageAt: 3,
    runbookAction: "Run worker once to requeue expired jobs; inspect worker logs for lease loss."
  },
  {
    id: "dead-letter-count",
    metric: "api_jobs_dead_lettered_total",
    source: "api_jobs WHERE status='dead_lettered'",
    owner: "human-ops",
    piiFree: true,
    warnAt: 1,
    pageAt: 5,
    runbookAction: "Assign dead-letter review, redact payload before escalation, replay only after root cause is fixed."
  },
  {
    id: "provider-budget-burn",
    metric: "provider_spend_budget_percent",
    source: "provider_call_events estimated_cost_cents by tenant/month/capability",
    owner: "finance-ops",
    piiFree: true,
    warnAt: 80,
    pageAt: 100,
    runbookAction: "Disable live AI provider flags for the tenant and let deterministic fallback continue."
  }
];

export const aiQueueOperationsItems = [
  {
    id: "queue-admission-contract",
    label: "AI queue admission contract",
    lane: "api",
    status: "repo-local-ready",
    currentEvidence: ["scripts/api-runtime.mjs", "tests/api-server.test.ts", "tests/vite-api-middleware.test.ts"],
    requiredEvidence: ["POST returns 202 queued", "idempotency key replay", "api_jobs insert"],
    metrics: ["api_jobs_queued_total"],
    alertIds: ["queued-job-count", "oldest-queued-age"],
    humanOwner: "api-on-call",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  },
  {
    id: "worker-lease-retry-dlq",
    label: "Worker lease, retry, and dead-letter contract",
    lane: "worker",
    status: "repo-local-ready",
    currentEvidence: ["scripts/worker-runtime.mjs", "tests/worker-runtime.test.ts"],
    requiredEvidence: ["FOR UPDATE SKIP LOCKED lease", "retry backoff", "dead_lettered terminal state", "audit_log event"],
    metrics: ["api_jobs_stale_running_total", "api_jobs_dead_lettered_total"],
    alertIds: ["stale-running-job-count", "dead-letter-count"],
    humanOwner: "worker-on-call",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  },
  {
    id: "status-polling-contract",
    label: "Customer status polling contract",
    lane: "api",
    status: "repo-local-ready",
    currentEvidence: ["src/apiRouteContractsData.mjs", "scripts/api-route-families.mjs", "src/appStateOrchestrator.ts"],
    requiredEvidence: ["job_status_url", "Retry-After-compatible retry_after_seconds", "user-scoped job lookup"],
    metrics: ["api_jobs_queued_total", "api_jobs_oldest_queued_age_seconds"],
    alertIds: ["oldest-queued-age"],
    humanOwner: "customer-support",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  },
  {
    id: "payload-minimization-retention",
    label: "Payload minimization and retention",
    lane: "privacy",
    status: "repo-local-ready",
    currentEvidence: ["sanitizeAiChatJobBody", "sanitizeAiCardJobBody", "compactAiWorkerPayload"],
    requiredEvidence: ["PII redaction", "no client aiFlowConfig", "no credentials", "no inline image bytes in api_jobs.result"],
    metrics: ["api_jobs_dead_lettered_total"],
    alertIds: ["dead-letter-count"],
    humanOwner: "privacy-reviewer",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  },
  {
    id: "operational-metrics",
    label: "AI queue operational metrics",
    lane: "observability",
    status: "repo-local-ready",
    currentEvidence: ["src/aiQueueOperationsData.mjs", "docs/ai-queue-operations-runbook.md"],
    requiredEvidence: aiQueueOperationMetrics.map((metric) => metric.metric),
    metrics: aiQueueOperationMetrics.map((metric) => metric.metric),
    alertIds: aiQueueOperationMetrics.map((metric) => metric.id),
    humanOwner: "observability-owner",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  },
  {
    id: "alert-thresholds",
    label: "AI queue alert thresholds",
    lane: "alerting",
    status: "repo-local-ready",
    currentEvidence: ["src/aiQueueOperationsData.mjs", "docs/ai-queue-operations-runbook.md"],
    requiredEvidence: ["warn/page thresholds", "human owner", "runbook action", "no PII in alerts"],
    metrics: aiQueueOperationMetrics.map((metric) => metric.metric),
    alertIds: aiQueueOperationMetrics.map((metric) => metric.id),
    humanOwner: "incident-commander",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  },
  {
    id: "human-dead-letter-management",
    label: "Human dead-letter management",
    lane: "human-ops",
    status: "repo-local-ready",
    currentEvidence: ["docs/ai-queue-operations-runbook.md", "scripts/worker-runtime.mjs"],
    requiredEvidence: ["dead-letter owner", "privacy-safe triage", "replay rule", "customer support script"],
    metrics: ["api_jobs_dead_lettered_total"],
    alertIds: ["dead-letter-count"],
    humanOwner: "support-lead",
    externalNetworkCalls: false,
    liveProviderCalls: false,
    productionReady: true
  }
];

const aiQueueOperationsRegister = defineReadinessRegister({
  domainLabel: "AI queue operations",
  items: aiQueueOperationsItems,
  requiredIds: requiredAiQueueOperationIds,
  itemRules(item) {
    const issues = [];
    if (item.status !== "repo-local-ready") issues.push(`AI queue operation item ${item.id} must be repo-local-ready.`);
    if (item.externalNetworkCalls !== false) issues.push(`AI queue operation item ${item.id} must not require external calls.`);
    if (item.liveProviderCalls !== false) issues.push(`AI queue operation item ${item.id} must not enable live providers.`);
    if (item.productionReady !== true) issues.push(`AI queue operation item ${item.id} must be productionReady=true.`);
    if (!item.humanOwner) issues.push(`AI queue operation item ${item.id} must name a human owner.`);
    if (!Array.isArray(item.metrics) || item.metrics.length < 1) issues.push(`AI queue operation item ${item.id} must list metrics.`);
    if (!Array.isArray(item.alertIds) || item.alertIds.length < 1) issues.push(`AI queue operation item ${item.id} must list alert ids.`);
    if (!Array.isArray(item.currentEvidence) || item.currentEvidence.length < 1) {
      issues.push(`AI queue operation item ${item.id} must list current evidence.`);
    }
    if (!Array.isArray(item.requiredEvidence) || item.requiredEvidence.length < 2) {
      issues.push(`AI queue operation item ${item.id} must list at least two evidence requirements.`);
    }
    return issues;
  },
  crossRules(itemsById) {
    const issues = [];
    for (const metric of aiQueueOperationMetrics) {
      if (!Number.isFinite(metric.warnAt) || !Number.isFinite(metric.pageAt) || metric.warnAt >= metric.pageAt) {
        issues.push(`AI queue metric ${metric.id} must define finite warn/page thresholds.`);
      }
      if (!metric.piiFree) issues.push(`AI queue metric ${metric.id} must be piiFree.`);
      if (!metric.owner) issues.push(`AI queue metric ${metric.id} must name an owner.`);
      if (!metric.runbookAction || metric.runbookAction.length < 20) {
        issues.push(`AI queue metric ${metric.id} must include a runbook action.`);
      }
    }
    const allAlertIds = new Set(aiQueueOperationMetrics.map((metric) => metric.id));
    for (const item of itemsById.values()) {
      for (const alertId of item.alertIds ?? []) {
        if (!allAlertIds.has(alertId)) issues.push(`AI queue operation item ${item.id} references unknown alert id ${alertId}.`);
      }
    }
    return issues;
  },
  summarize(items) {
    const metricNames = new Set(items.flatMap((item) => item.metrics));
    const alertIds = new Set(items.flatMap((item) => item.alertIds));
    return {
      repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
      productionReadyControls: items.filter((item) => item.productionReady).length,
      metricsTracked: metricNames.size,
      alertThresholds: aiQueueOperationMetrics.length,
      alertRoutesRequired: aiQueueOperationMetrics.length,
      humanOwnedControls: items.filter((item) => item.humanOwner).length,
      deadLetterControls: items.filter((item) => item.alertIds.includes("dead-letter-count")).length,
      piiFreeMetrics: aiQueueOperationMetrics.filter((metric) => metric.piiFree).length,
      externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
      liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
      alertIds: Array.from(alertIds),
      metrics: Array.from(metricNames)
    };
  }
});

export const summarizeAiQueueOperations = aiQueueOperationsRegister.summarize;
export const validateAiQueueOperations = aiQueueOperationsRegister.validate;
