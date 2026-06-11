const requiredProfileIds = ["local-dev", "cheap-droplet", "cloud-native", "saas-scale"];
const requiredCostGuardrails = [
  "Provider budget caps",
  "Queue concurrency limit",
  "Artifact retention window",
  "Real-order kill switch"
];

export const capacityProfiles = [
  {
    id: "local-dev",
    label: "Local dev",
    lane: "local",
    targetUse: "Reviewer demo and local development without production credentials.",
    runtimeShape: "Vite/API server, local Postgres, Redis, and MinIO from Docker Compose.",
    dailyCardCapacity: 25,
    dailyImageGenerationBudget: 0,
    webReplicas: 1,
    workerReplicas: 1,
    databaseMode: "local-postgres",
    queueMode: "local-redis",
    objectStoreMode: "local-minio",
    providerPolicy: "Use deterministic local render, no paid provider calls, and no live vendor orders.",
    realOrdersEnabled: false,
    liveProviderCalls: false,
    costGuardrails: [
      "Provider budget caps",
      "Queue concurrency limit",
      "Artifact retention window",
      "Real-order kill switch",
      "Local-only provider policy"
    ],
    requiredEvidence: ["npm run check", "npm run deployment:doctor", "npm run artifact:doctor"],
    scalingSignals: ["Developer workstation saturation", "Local queue depth", "Artifact write/read timing"],
    tradeoffs: ["Not a hosted environment", "No uptime claim", "No live provider traffic"]
  },
  {
    id: "cheap-droplet",
    label: "Cheap droplet",
    lane: "single-host",
    targetUse: "Early hosted validation for a small business pilot with manual fulfillment.",
    runtimeShape: "Single VM running app, worker, Postgres, Redis, and mounted artifact storage.",
    dailyCardCapacity: 200,
    dailyImageGenerationBudget: 20,
    webReplicas: 1,
    workerReplicas: 1,
    databaseMode: "self-hosted-postgres",
    queueMode: "self-hosted-redis",
    objectStoreMode: "filesystem-mounted",
    providerPolicy: "Keep live adapters credential-gated; review-only public pricing and manual handoff only.",
    realOrdersEnabled: false,
    liveProviderCalls: false,
    costGuardrails: [
      "Provider budget caps",
      "Queue concurrency limit",
      "Artifact retention window",
      "Real-order kill switch",
      "Single-host backup drill"
    ],
    requiredEvidence: [
      "infra/docker-compose.droplet.yml",
      "runtime doctor output",
      "backup restore drill",
      "host metrics snapshot",
      "manual fulfillment QA"
    ],
    scalingSignals: ["CPU sustained over 70%", "Queue age over 15 minutes", "Artifact volume over retention target"],
    tradeoffs: ["single-host failure domain", "manual backup operations", "limited image-generation budget"]
  },
  {
    id: "cloud-native",
    label: "Cloud native",
    lane: "managed-cloud",
    targetUse: "Production-style staging with managed persistence and independent web/worker scaling.",
    runtimeShape: "Kubernetes web and worker deployments with managed Postgres, Redis, and S3-compatible storage.",
    dailyCardCapacity: 2500,
    dailyImageGenerationBudget: 250,
    webReplicas: 3,
    workerReplicas: 2,
    databaseMode: "managed-postgres",
    queueMode: "managed-redis",
    objectStoreMode: "managed-s3-compatible",
    providerPolicy: "Require per-provider budget gates, queue-backed rendering, and admin evidence before live traffic.",
    realOrdersEnabled: false,
    liveProviderCalls: false,
    costGuardrails: [
      "Provider budget caps",
      "Queue concurrency limit",
      "Artifact retention window",
      "Real-order kill switch",
      "Managed service alarms"
    ],
    requiredEvidence: [
      "infra/k8s/app.yaml",
      "applied bucket/IAM output",
      "managed database connectivity doctor",
      "alert route drill",
      "deployment URL"
    ],
    scalingSignals: ["HTTP p95 latency", "Worker queue age", "Database connection pool saturation"],
    tradeoffs: ["Requires managed service spend", "Requires applied cloud evidence", "Requires alert ownership"]
  },
  {
    id: "saas-scale",
    label: "SaaS scale",
    lane: "multi-tenant",
    targetUse: "Multi-tenant growth path after production proof and external audits exist.",
    runtimeShape: "Horizontally scaled web/worker pools, pooled Postgres, sharded queues, and lifecycle-managed artifacts.",
    dailyCardCapacity: 12000,
    dailyImageGenerationBudget: 1000,
    webReplicas: 6,
    workerReplicas: 8,
    databaseMode: "managed-postgres-pooled",
    queueMode: "managed-queue-sharded",
    objectStoreMode: "managed-s3-compatible",
    providerPolicy: "Tenant-scoped budget gates, queue partitions, audit logs, and hard vendor kill switches.",
    realOrdersEnabled: false,
    liveProviderCalls: false,
    costGuardrails: [
      "Provider budget caps",
      "Queue concurrency limit",
      "Artifact retention window",
      "Real-order kill switch",
      "Tenant spend ledger"
    ],
    requiredEvidence: [
      "tenant isolation tests",
      "load-test report",
      "provider spend report",
      "external security audit",
      "incident response drill"
    ],
    scalingSignals: ["Tenant queue skew", "Provider spend burn rate", "Object-store lifecycle backlog"],
    tradeoffs: ["Requires production traffic evidence", "Requires external audit evidence", "Requires stricter tenant isolation"]
  }
];

export const capacityEvidenceThresholds = [
  {
    id: "api-job-queue-depth",
    label: "API job queue depth per worker",
    metric: "queued_api_jobs_per_worker",
    profiles: ["cheap-droplet", "cloud-native", "saas-scale"],
    measuredBy: "worker lease query plus api_jobs status counts",
    warnAt: 50,
    blockAt: 200,
    requiredEvidence: "Timestamped api_jobs queued/running/dead_lettered count sampled during load rehearsal."
  },
  {
    id: "postgres-pool-pressure",
    label: "Postgres pool pressure",
    metric: "postgres_pool_utilization_percent",
    profiles: ["cheap-droplet", "cloud-native", "saas-scale"],
    measuredBy: "Postgres runtime pool describe output plus database connection count",
    warnAt: 70,
    blockAt: 85,
    requiredEvidence: "Pool max, active connection count, and release audit from the API and worker runtimes."
  },
  {
    id: "artifact-write-latency",
    label: "Render artifact write p95",
    metric: "artifact_write_p95_ms",
    profiles: ["cloud-native", "saas-scale"],
    measuredBy: "artifact store doctor write/read timing",
    warnAt: 750,
    blockAt: 1500,
    requiredEvidence: "Object-store write/read p95 timing from a render-packet artifact rehearsal."
  },
  {
    id: "provider-spend-burn",
    label: "Provider spend burn rate",
    metric: "provider_spend_budget_percent",
    profiles: ["cloud-native", "saas-scale"],
    measuredBy: "provider_call_events monthly ledger aggregation",
    warnAt: 80,
    blockAt: 100,
    requiredEvidence: "Provider spend ledger sample showing tenant budget percent and fallback selection rate."
  }
];

export function summarizeCapacityPlan(profiles = capacityProfiles) {
  const thresholdBlockers = validateCapacityEvidenceThresholds(capacityEvidenceThresholds, profiles);
  return {
    total: profiles.length,
    localProfiles: profiles.filter((profile) => profile.lane === "local").length,
    cloudProfiles: profiles.filter((profile) => profile.lane !== "local").length,
    maxDailyCards: Math.max(...profiles.map((profile) => profile.dailyCardCapacity), 0),
    maxDailyImageGenerations: Math.max(...profiles.map((profile) => profile.dailyImageGenerationBudget), 0),
    queueBackedProfiles: profiles.filter((profile) => profile.queueMode !== "none").length,
    objectStoreBackedProfiles: profiles.filter((profile) => profile.objectStoreMode !== "browser-local").length,
    realOrdersEnabled: profiles.filter((profile) => profile.realOrdersEnabled).length,
    liveProviderCalls: profiles.filter((profile) => profile.liveProviderCalls).length,
    requiredEvidenceCount: profiles.reduce((total, profile) => total + profile.requiredEvidence.length, 0),
    sloThresholds: capacityEvidenceThresholds.length,
    workerBackedThresholds: capacityEvidenceThresholds.filter((threshold) => threshold.measuredBy.includes("worker")).length,
    databaseThresholds: capacityEvidenceThresholds.filter((threshold) => threshold.metric.includes("postgres")).length,
    artifactThresholds: capacityEvidenceThresholds.filter((threshold) => threshold.metric.includes("artifact")).length,
    providerSpendThresholds: capacityEvidenceThresholds.filter((threshold) => threshold.metric.includes("provider_spend")).length,
    measuredEvidenceRequired: capacityEvidenceThresholds.length,
    blockers: [...validateCapacityProfiles(profiles), ...thresholdBlockers]
  };
}

export function validateCapacityProfiles(profiles = capacityProfiles) {
  const issues = [];
  const profilesById = new Map();

  for (const profile of profiles) {
    if (profilesById.has(profile.id)) issues.push(`Duplicate capacity profile: ${profile.id}.`);
    profilesById.set(profile.id, profile);

    if (profile.realOrdersEnabled !== false) {
      issues.push(`Capacity profile ${profile.id} must keep realOrdersEnabled=false.`);
    }
    if (profile.liveProviderCalls !== false) {
      issues.push(`Capacity profile ${profile.id} must keep liveProviderCalls=false.`);
    }
    if (!Number.isFinite(profile.dailyCardCapacity) || profile.dailyCardCapacity < 0) {
      issues.push(`Capacity profile ${profile.id} must use a finite daily card capacity.`);
    }
    if (!Number.isFinite(profile.dailyImageGenerationBudget) || profile.dailyImageGenerationBudget < 0) {
      issues.push(`Capacity profile ${profile.id} must use a finite image-generation budget.`);
    }
    if (profile.queueMode === "none") {
      issues.push(`Capacity profile ${profile.id} must be queue-backed.`);
    }
    if (profile.objectStoreMode === "browser-local") {
      issues.push(`Capacity profile ${profile.id} must be object-store backed.`);
    }
    for (const guardrail of requiredCostGuardrails) {
      if (!profile.costGuardrails.includes(guardrail)) {
        issues.push(`Capacity profile ${profile.id} must include cost guardrail: ${guardrail}.`);
      }
    }
    if (profile.requiredEvidence.length < 3) {
      issues.push(`Capacity profile ${profile.id} must name at least three evidence requirements.`);
    }
  }

  for (const requiredId of requiredProfileIds) {
    if (!profilesById.has(requiredId)) issues.push(`Missing capacity profile: ${requiredId}.`);
  }

  const cheapDroplet = profilesById.get("cheap-droplet");
  if (
    cheapDroplet &&
    (cheapDroplet.webReplicas !== 1 ||
      cheapDroplet.workerReplicas !== 1 ||
      cheapDroplet.databaseMode !== "self-hosted-postgres" ||
      cheapDroplet.queueMode !== "self-hosted-redis" ||
      cheapDroplet.objectStoreMode !== "filesystem-mounted" ||
      cheapDroplet.dailyImageGenerationBudget > 25)
  ) {
    issues.push("Capacity profile cheap-droplet must stay single-host with low image budget.");
  }

  const cloudNative = profilesById.get("cloud-native");
  if (cloudNative) {
    if (cloudNative.webReplicas < 2) issues.push("Capacity profile cloud-native must use at least two web replicas.");
    if (cloudNative.workerReplicas < 2) issues.push("Capacity profile cloud-native must use at least two worker replicas.");
    if (cloudNative.databaseMode !== "managed-postgres") {
      issues.push("Capacity profile cloud-native must use managed Postgres.");
    }
    if (cloudNative.objectStoreMode !== "managed-s3-compatible") {
      issues.push("Capacity profile cloud-native must use managed object storage.");
    }
  }

  const saasScale = profilesById.get("saas-scale");
  if (saasScale) {
    if (saasScale.webReplicas < 4) issues.push("Capacity profile saas-scale must use at least four web replicas.");
    if (saasScale.workerReplicas < 4) issues.push("Capacity profile saas-scale must use at least four worker replicas.");
    if (saasScale.queueMode !== "managed-queue-sharded") {
      issues.push("Capacity profile saas-scale must use sharded managed queues.");
    }
    if (!saasScale.providerPolicy.includes("budget gates")) {
      issues.push("Capacity profile saas-scale must require tenant budget gates.");
    }
  }

  return issues;
}

export function validateCapacityEvidenceThresholds(thresholds = capacityEvidenceThresholds, profiles = capacityProfiles) {
  const issues = [];
  const profileIds = new Set(profiles.map((profile) => profile.id));
  const ids = new Set();

  for (const threshold of thresholds) {
    if (ids.has(threshold.id)) issues.push(`Duplicate capacity evidence threshold: ${threshold.id}.`);
    ids.add(threshold.id);
    if (!threshold.metric) issues.push(`Capacity evidence threshold ${threshold.id} must name a metric.`);
    if (!threshold.measuredBy) issues.push(`Capacity evidence threshold ${threshold.id} must name a measurement source.`);
    if (!threshold.requiredEvidence) issues.push(`Capacity evidence threshold ${threshold.id} must name required evidence.`);
    if (!Number.isFinite(threshold.warnAt) || !Number.isFinite(threshold.blockAt) || threshold.warnAt >= threshold.blockAt) {
      issues.push(`Capacity evidence threshold ${threshold.id} must set warnAt lower than blockAt.`);
    }
    if (!Array.isArray(threshold.profiles) || threshold.profiles.length === 0) {
      issues.push(`Capacity evidence threshold ${threshold.id} must apply to at least one profile.`);
      continue;
    }
    for (const profileId of threshold.profiles) {
      if (!profileIds.has(profileId)) issues.push(`Capacity evidence threshold ${threshold.id} references unknown profile ${profileId}.`);
    }
  }

  for (const requiredMetric of [
    "queued_api_jobs_per_worker",
    "postgres_pool_utilization_percent",
    "artifact_write_p95_ms",
    "provider_spend_budget_percent"
  ]) {
    if (!thresholds.some((threshold) => threshold.metric === requiredMetric)) {
      issues.push(`Missing capacity evidence threshold metric: ${requiredMetric}.`);
    }
  }

  return issues;
}
