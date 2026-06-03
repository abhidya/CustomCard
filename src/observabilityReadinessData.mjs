const requiredObservabilityIds = [
  "telemetry-event-schema",
  "pii-redaction-sample",
  "sampling-and-budget-policy",
  "retention-policy",
  "alert-routing-drill",
  "observability-provider-contracts",
  "incident-review-runbook"
];

const requiredProviderAdapters = [
  "sentry-error-observability",
  "posthog-product-observability",
  "opentelemetry-otlp-observability",
  "grafana-cloud-otlp-observability",
  "datadog-logs-observability",
  "betterstack-logs-observability"
];

export const observabilityReadinessItems = [
  {
    id: "telemetry-event-schema",
    label: "Telemetry event schema",
    lane: "event-schema",
    status: "repo-local-ready",
    providerAdapterIds: [],
    eventNames: [
      "card.generated",
      "render.packet.created",
      "vendor.handoff.prepared",
      "api.idempotency.conflict",
      "provider.request.blocked"
    ],
    piiRedacted: true,
    samplingPolicy: "Capture 100% of safety and billing-adjacent events; sample routine UI events after launch approval.",
    retentionDays: 30,
    alertRouteRequired: false,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["providerRuntime telemetry metadata", "API safety posture", "security doctor raw-content block"],
    requiredEvidence: ["Telemetry workspace schema", "PII redaction sample", "Event replay sample"],
    blocker: "No live telemetry workspace has ingested the event schema."
  },
  {
    id: "pii-redaction-sample",
    label: "PII redaction sample",
    lane: "privacy",
    status: "repo-local-ready",
    providerAdapterIds: [],
    eventNames: ["provider.request.prepared", "customer.memory.approved", "data.request.created"],
    piiRedacted: true,
    samplingPolicy: "Redaction proof is mandatory before any provider-bound operational event is emitted.",
    retentionDays: 30,
    alertRouteRequired: false,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["providerRuntime redaction tests", "security/privacy/accessibility doctor"],
    requiredEvidence: ["Redacted payload capture", "Privacy reviewer signoff", "DPA retention approval"],
    blocker: "No production-equivalent redacted payload capture is attached."
  },
  {
    id: "sampling-and-budget-policy",
    label: "Sampling and budget policy",
    lane: "cost",
    status: "repo-local-ready",
    providerAdapterIds: [],
    eventNames: ["provider.spend.budget_near_limit", "queue.depth.changed", "worker.retry.scheduled"],
    piiRedacted: true,
    samplingPolicy: "Keep safety, spend, queue, and error events unsampled; sample product analytics by tenant budget.",
    retentionDays: 30,
    alertRouteRequired: true,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["provider governance budgets", "capacity profiles", "worker readiness doctor"],
    requiredEvidence: ["Telemetry spend limit", "Sampling config export", "Alert route drill"],
    blocker: "No telemetry spend limit or sampling config export is attached."
  },
  {
    id: "retention-policy",
    label: "Telemetry retention policy",
    lane: "retention",
    status: "evidence-missing",
    providerAdapterIds: [],
    eventNames: ["telemetry.retention.policy_applied"],
    piiRedacted: true,
    samplingPolicy: "Retention metadata is emitted once per deploy after policy approval.",
    retentionDays: 30,
    alertRouteRequired: false,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["external audit readiness register", "data-request contract"],
    requiredEvidence: ["Retention policy approval", "Workspace retention screenshot", "Deletion drill output"],
    blocker: "No live telemetry retention policy approval or workspace screenshot is attached."
  },
  {
    id: "alert-routing-drill",
    label: "Alert route drill",
    lane: "alerting",
    status: "evidence-missing",
    providerAdapterIds: [],
    eventNames: [
      "order.kill_switch.enabled",
      "payment.refund.failed",
      "vendor.order.blocked",
      "queue.age.slo_breached"
    ],
    piiRedacted: true,
    samplingPolicy: "Alert-triggering events are never sampled.",
    retentionDays: 90,
    alertRouteRequired: true,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["production launch gate", "capacity profile required evidence"],
    requiredEvidence: ["On-call route proof", "Alert delivery transcript", "Acknowledgement drill"],
    blocker: "No live alert route or acknowledgement drill is attached."
  },
  {
    id: "observability-provider-contracts",
    label: "Observability provider contracts",
    lane: "provider-contracts",
    status: "repo-local-ready",
    providerAdapterIds: requiredProviderAdapters,
    eventNames: ["error.captured", "product.event.captured", "trace.exported", "metric.exported", "log.exported"],
    piiRedacted: true,
    samplingPolicy: "Provider-bound payloads are prepared as redacted no-network request contracts until credentials are attached.",
    retentionDays: 30,
    alertRouteRequired: true,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["Sentry/PostHog/OTLP/Grafana/Datadog/Better Stack provider contracts", "provider runtime dry runs"],
    requiredEvidence: ["Telemetry endpoint proof", "Provider credential proof", "Alert route drill"],
    blocker: "Provider contracts exist, but no live telemetry endpoint proof is attached."
  },
  {
    id: "incident-review-runbook",
    label: "Incident review runbook",
    lane: "incident-review",
    status: "evidence-missing",
    providerAdapterIds: [],
    eventNames: ["incident.review.created", "incident.remediation.closed"],
    piiRedacted: true,
    samplingPolicy: "Incident lifecycle events are retained without product analytics sampling.",
    retentionDays: 365,
    alertRouteRequired: true,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false,
    currentEvidence: ["handoff notes", "production launch blockers"],
    requiredEvidence: ["Incident response drill", "Remediation owner signoff", "Retest transcript"],
    blocker: "No incident response drill or remediation signoff evidence is attached."
  }
];

export function summarizeObservabilityReadiness(items = observabilityReadinessItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
    alertRoutesRequired: items.filter((item) => item.alertRouteRequired).length,
    piiRedacted: items.filter((item) => item.piiRedacted).length,
    providerContracts: new Set(items.flatMap((item) => item.providerAdapterIds)).size,
    unsampledCriticalEvents: items.filter((item) => item.samplingPolicy.toLowerCase().includes("never sampled")).length,
    maxRetentionDays: Math.max(...items.map((item) => item.retentionDays), 0),
    liveIngestionEnabled: items.filter((item) => item.liveIngestionEnabled).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    productionAlertsEnabled: items.filter((item) => item.productionAlertEnabled).length,
    requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort(),
    blockers: validateObservabilityReadiness(items)
  };
}

export function validateObservabilityReadiness(items = observabilityReadinessItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate observability readiness item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (item.liveIngestionEnabled !== false) {
      issues.push(`Observability readiness item ${item.id} must keep liveIngestionEnabled=false.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Observability readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.productionAlertEnabled !== false) {
      issues.push(`Observability readiness item ${item.id} must keep productionAlertEnabled=false.`);
    }
    if (!item.piiRedacted) {
      issues.push(`Observability readiness item ${item.id} must require PII redaction.`);
    }
    if (!item.samplingPolicy || item.samplingPolicy.length < 20) {
      issues.push(`Observability readiness item ${item.id} must describe its sampling policy.`);
    }
    if (!Number.isFinite(item.retentionDays) || item.retentionDays < 7 || item.retentionDays > 400) {
      issues.push(`Observability readiness item ${item.id} must use a finite retention window between 7 and 400 days.`);
    }
    if (item.eventNames.length < 1) {
      issues.push(`Observability readiness item ${item.id} must list telemetry event names.`);
    }
    if (item.currentEvidence.length < 1) {
      issues.push(`Observability readiness item ${item.id} must list current repo-local evidence.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`Observability readiness item ${item.id} must list at least two required evidence items.`);
    }
    if (item.status !== "repo-local-ready" && !item.blocker) {
      issues.push(`Observability readiness item ${item.id} must explain its blocker.`);
    }
  }

  for (const requiredId of requiredObservabilityIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing observability readiness item: ${requiredId}.`);
  }

  const providerContracts = itemsById.get("observability-provider-contracts");
  if (providerContracts) {
    const missing = requiredProviderAdapters.filter((adapterId) => !providerContracts.providerAdapterIds.includes(adapterId));
    for (const adapterId of missing) {
      issues.push(`Observability provider contracts must include adapter: ${adapterId}.`);
    }
  }

  const alertDrill = itemsById.get("alert-routing-drill");
  if (alertDrill && !alertDrill.alertRouteRequired) {
    issues.push("Observability alert-routing drill must require an alert route.");
  }

  return issues;
}
