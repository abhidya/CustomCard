const ownerOrder = [
  "identity-access",
  "provider-integrations",
  "commerce-fulfillment",
  "platform-infrastructure",
  "observability-audit"
];

const ownersById = {
  "identity-access": {
    id: "identity-access",
    label: "Identity and access",
    description: "Hosted auth, token verification, account recovery, and scoped OAuth consent."
  },
  "provider-integrations": {
    id: "provider-integrations",
    label: "Provider integrations",
    description: "Calendar, CRM, AI, and other credential-gated provider approvals."
  },
  "commerce-fulfillment": {
    id: "commerce-fulfillment",
    label: "Commerce and fulfillment",
    description: "Retail quote/order certification, payment processors, refunds, coupons, and print QA."
  },
  "platform-infrastructure": {
    id: "platform-infrastructure",
    label: "Platform infrastructure",
    description: "Deployment, hosted database, cloud artifacts, secrets, backup, and release evidence."
  },
  "observability-audit": {
    id: "observability-audit",
    label: "Observability and audit",
    description: "Telemetry, alert routing, incident review, and external audit evidence."
  }
};

const taskSourceLabels = {
  "production-launch": "Production gate",
  "credential-vault": "Credential vault",
  "hosted-api": "Hosted API",
  retail: "Retail fulfillment",
  payment: "Payment",
  observability: "Observability",
  "external-audit": "External audit"
};

const priorityOrder = { p0: 0, p1: 1, p2: 2 };
const statusOrder = {
  blocked: 0,
  "protection-blocked": 1,
  "certification-blocked": 2,
  "evidence-required": 3,
  "repo-local-ready": 4
};

export function buildAdminOperationsWorkflow(input) {
  const tasks = [
    ...input.productionGates.map(buildProductionGateTask),
    buildCredentialVaultTask(input.model.coverage.requiredEnv),
    ...input.hostedApiReadinessItems
      .filter((item) =>
        ["hosted-env-sync", "hosted-postgres-connectivity", "public-db-backed-route-proof", "hosted-account-token-verification", "backup-recovery-policy"].includes(item.id)
      )
      .map(buildHostedApiTask),
    ...input.retailFulfillmentReadinessItems
      .filter((item) => ["live-quote-contracts", "vendor-api-certification", "pickup-cancel-recovery-drills", "physical-print-qa"].includes(item.id))
      .map(buildRetailTask),
    ...input.paymentReadinessItems
      .filter((item) => ["live-charge-capture-approval", "refund-void-dispute-drills", "settlement-reconciliation"].includes(item.id))
      .map(buildPaymentTask),
    ...input.observabilityReadinessItems
      .filter((item) => ["alert-routing-drill", "incident-review-runbook"].includes(item.id))
      .map(buildObservabilityTask),
    ...input.externalAuditReadinessItems
      .filter((item) => ["security-assessment", "privacy-dpa-review", "accessibility-audit", "legal-review"].includes(item.id))
      .map(buildExternalAuditTask)
  ];
  const sortedTasks = tasks.sort(compareTasks);
  const ownerLanes = ownerOrder.map((ownerId) => buildOwnerLane(ownerId, sortedTasks));

  return {
    summary: summarizeAdminOperationsWorkflow(sortedTasks, ownerLanes),
    ownerLanes,
    tasks: sortedTasks,
    priorityTasks: selectPriorityTasks(sortedTasks),
    sourceLabels: taskSourceLabels,
    blockers: validateAdminOperationsWorkflow({ tasks: sortedTasks, ownerLanes })
  };
}

function selectPriorityTasks(tasks) {
  const pinnedIds = [
    "credential-vault-required-env",
    "hosted-account-token-verification",
    "alert-routing-drill",
    "incident-review-runbook"
  ];
  const pinnedTasks = pinnedIds.map((id) => tasks.find((task) => task.id === id)).filter(Boolean);
  const remainingTasks = tasks.filter((task) => task.priority === "p0" && !pinnedIds.includes(task.id));

  return [...pinnedTasks, ...remainingTasks].slice(0, 8);
}

export function summarizeAdminOperationsWorkflow(tasks, ownerLanes) {
  return {
    taskCount: tasks.length,
    ownerCount: ownerLanes.length,
    p0Tasks: tasks.filter((task) => task.priority === "p0").length,
    p1Tasks: tasks.filter((task) => task.priority === "p1").length,
    repoLocalReady: tasks.filter((task) => task.status === "repo-local-ready").length,
    evidenceRequired: tasks.filter((task) => ["evidence-required", "certification-blocked", "protection-blocked", "blocked"].includes(task.status)).length,
    blocked: tasks.filter((task) => ["blocked", "certification-blocked", "protection-blocked"].includes(task.status)).length,
    credentialTasks: tasks.filter((task) => task.envVarNames.length > 0).length,
    requiredEvidence: Array.from(new Set(tasks.flatMap((task) => task.requiredEvidence))).sort(),
    liveEnabled: tasks.filter((task) => task.liveEnabled).length
  };
}

export function validateAdminOperationsWorkflow(workflow) {
  const issues = [];
  const ids = new Set();

  for (const task of workflow.tasks) {
    if (ids.has(task.id)) issues.push(`Duplicate admin operation task: ${task.id}.`);
    ids.add(task.id);

    if (!ownerOrder.includes(task.ownerId)) issues.push(`Admin operation task ${task.id} must have a known owner.`);
    if (!["p0", "p1", "p2"].includes(task.priority)) issues.push(`Admin operation task ${task.id} has unsupported priority.`);
    if (!Object.keys(statusOrder).includes(task.status)) issues.push(`Admin operation task ${task.id} has unsupported status.`);
    if (!Object.keys(taskSourceLabels).includes(task.source)) issues.push(`Admin operation task ${task.id} has unsupported source.`);
    if (!task.adminAction) issues.push(`Admin operation task ${task.id} must name a concrete admin action.`);
    if (task.requiredEvidence.length < 1) issues.push(`Admin operation task ${task.id} must list required evidence.`);
    if (task.currentEvidence.length < 1) issues.push(`Admin operation task ${task.id} must list current evidence.`);
    if (!task.blocker) issues.push(`Admin operation task ${task.id} must explain the blocker or local status.`);
    if (task.liveEnabled !== false) issues.push(`Admin operation task ${task.id} must not claim live production enablement.`);
  }

  for (const requiredId of [
    "production-user-auth",
    "credential-vault-required-env",
    "hosted-account-token-verification",
    "alert-routing-drill",
    "incident-review-runbook"
  ]) {
    if (!ids.has(requiredId)) issues.push(`Missing admin operation task: ${requiredId}.`);
  }

  if (workflow.ownerLanes) {
    for (const ownerId of ownerOrder) {
      const lane = workflow.ownerLanes.find((candidate) => candidate.id === ownerId);
      if (!lane) issues.push(`Missing admin operation owner lane: ${ownerId}.`);
      else if (lane.tasks.length < 1) issues.push(`Admin operation owner lane ${ownerId} must include tasks.`);
    }
  }

  return issues;
}

function buildProductionGateTask(gate) {
  return {
    id: gate.id,
    label: gate.label,
    ownerId: ownerForProductionCategory(gate.category),
    priority: priorityForProductionGate(gate),
    status: mapProductionStatus(gate.status),
    source: "production-launch",
    adminAction: gate.adminAction,
    requiredEvidence: gate.requiredEvidence,
    currentEvidence: gate.currentEvidence,
    blocker: gate.blocker,
    envVarNames: [],
    liveEnabled: gate.liveEnabled
  };
}

function buildCredentialVaultTask(requiredEnv) {
  const envVarNames = Array.from(new Set(requiredEnv)).sort();

  return {
    id: "credential-vault-required-env",
    label: "Credential vault setup",
    ownerId: "platform-infrastructure",
    priority: "p0",
    status: envVarNames.length > 0 ? "evidence-required" : "repo-local-ready",
    source: "credential-vault",
    adminAction: "Assign a credential owner and store required env values in the deployment secret manager before enabling gated adapters.",
    requiredEvidence: [
      "Secret manager path for every required environment variable",
      "Rotation owner",
      "Runtime doctor output without placeholder credentials"
    ],
    currentEvidence: [`${envVarNames.length} required environment variable names are cataloged in provider adapters.`],
    blocker: envVarNames.length > 0
      ? "Required environment variable names are known, but no production secret-manager proof is attached."
      : "No credential-gated environment variables are required by the current catalog.",
    envVarNames,
    liveEnabled: false
  };
}

function buildHostedApiTask(item) {
  return {
    id: item.id,
    label: item.label,
    ownerId: item.id === "hosted-account-token-verification" ? "identity-access" : "platform-infrastructure",
    priority: item.id === "hosted-account-token-verification" || item.id === "public-db-backed-route-proof" ? "p0" : "p1",
    status: mapReadinessStatus(item.status),
    source: "hosted-api",
    adminAction: hostedApiAction(item),
    requiredEvidence: item.requiredEvidence,
    currentEvidence: item.currentEvidence,
    blocker: item.blocker,
    envVarNames: item.envVarNames ?? [],
    liveEnabled: item.liveProofClaimed || item.externalNetworkCalls || item.realOrdersEnabled || item.liveProviderCalls
  };
}

function buildRetailTask(item) {
  return {
    id: item.id,
    label: item.label,
    ownerId: "commerce-fulfillment",
    priority: item.id === "vendor-api-certification" || item.id === "live-quote-contracts" ? "p0" : "p1",
    status: mapReadinessStatus(item.status),
    source: "retail",
    adminAction: retailAction(item),
    requiredEvidence: item.requiredEvidence,
    currentEvidence: item.currentEvidence,
    blocker: item.blocker,
    envVarNames: [],
    liveEnabled: item.liveQuoteEnabled || item.directOrderEnabled || item.externalNetworkCalls || item.realPaymentsEnabled
  };
}

function buildPaymentTask(item) {
  return {
    id: item.id,
    label: item.label,
    ownerId: "commerce-fulfillment",
    priority: item.id === "live-charge-capture-approval" ? "p0" : "p1",
    status: mapReadinessStatus(item.status),
    source: "payment",
    adminAction: paymentAction(item),
    requiredEvidence: item.requiredEvidence,
    currentEvidence: item.currentEvidence,
    blocker: item.blocker,
    envVarNames: [],
    liveEnabled: item.liveChargesEnabled || item.liveRefundsEnabled || item.liveCaptureEnabled || item.externalNetworkCalls || item.cardDataStored
  };
}

function buildObservabilityTask(item) {
  return {
    id: item.id,
    label: item.label,
    ownerId: "observability-audit",
    priority: item.id === "alert-routing-drill" ? "p0" : "p1",
    status: mapReadinessStatus(item.status),
    source: "observability",
    adminAction: observabilityAction(item),
    requiredEvidence: item.requiredEvidence,
    currentEvidence: item.currentEvidence,
    blocker: item.blocker,
    envVarNames: [],
    liveEnabled: item.liveIngestionEnabled || item.externalNetworkCalls || item.productionAlertEnabled
  };
}

function buildExternalAuditTask(item) {
  return {
    id: item.id,
    label: item.label,
    ownerId: "observability-audit",
    priority: item.id === "security-assessment" || item.id === "privacy-dpa-review" ? "p0" : "p1",
    status: mapReadinessStatus(item.status),
    source: "external-audit",
    adminAction: `Schedule ${item.reviewer} review and attach the signed report before public launch claims.`,
    requiredEvidence: item.requiredEvidence,
    currentEvidence: item.currentEvidence,
    blocker: item.blocker,
    envVarNames: [],
    liveEnabled: item.publicClaimAllowed === true || item.externalArtifactsAttached === true
  };
}

function buildOwnerLane(ownerId, tasks) {
  const laneTasks = tasks.filter((task) => task.ownerId === ownerId);

  return {
    ...ownersById[ownerId],
    tasks: laneTasks,
    p0Tasks: laneTasks.filter((task) => task.priority === "p0").length,
    evidenceRequired: laneTasks.filter((task) => task.status !== "repo-local-ready").length,
    blocked: laneTasks.filter((task) => ["blocked", "certification-blocked", "protection-blocked"].includes(task.status)).length,
    nextTask: laneTasks[0]
  };
}

function compareTasks(left, right) {
  return (
    priorityOrder[left.priority] - priorityOrder[right.priority] ||
    ownerOrder.indexOf(left.ownerId) - ownerOrder.indexOf(right.ownerId) ||
    statusOrder[left.status] - statusOrder[right.status] ||
    left.label.localeCompare(right.label)
  );
}

function ownerForProductionCategory(category) {
  if (category === "identity") return "identity-access";
  if (category === "provider") return "provider-integrations";
  if (category === "commerce" || category === "print") return "commerce-fulfillment";
  if (category === "cloud" || category === "mobile") return "platform-infrastructure";
  return "observability-audit";
}

function priorityForProductionGate(gate) {
  if (gate.id === "production-user-auth") return "p0";
  if (gate.status === "blocked") return "p0";
  if (["identity", "commerce", "cloud", "audit"].includes(gate.category)) return "p0";
  return "p1";
}

function mapProductionStatus(status) {
  if (status === "contract-ready") return "repo-local-ready";
  if (status === "blocked") return "blocked";
  return "evidence-required";
}

function mapReadinessStatus(status) {
  if (status === "repo-local-ready") return "repo-local-ready";
  if (status === "certification-blocked") return "certification-blocked";
  if (status === "protection-blocked") return "protection-blocked";
  if (status === "blocked") return "blocked";
  return "evidence-required";
}

function hostedApiAction(item) {
  if (item.id === "hosted-account-token-verification") {
    return "Run hosted customer and admin token probes against a DB-backed deployment and attach the output.";
  }
  if (item.id === "hosted-env-sync") return "Sync required hosted env vars from the credential vault and attach the deployment env proof.";
  if (item.id === "hosted-postgres-connectivity") return "Run the hosted Postgres route doctor and attach authenticated route evidence.";
  if (item.id === "public-db-backed-route-proof") return "Capture public DB-backed route responses for health, admin readiness, customer bootstrap, and render packets.";
  return "Attach hosted backup and restore evidence before public production claims.";
}

function retailAction(item) {
  if (item.id === "live-quote-contracts") return "Collect certified live quote, tax, coupon, pickup-window, and stock proof for each retail path.";
  if (item.id === "vendor-api-certification") return "Complete retail partner certification before enabling upload or order mutations.";
  if (item.id === "physical-print-qa") return "Attach physical 5x7 print QA with safe-zone, color, and pickup receipt evidence.";
  return "Run pickup, cancellation, wrong-store, and mismatch recovery drills before live ordering.";
}

function paymentAction(item) {
  if (item.id === "live-charge-capture-approval") return "Complete processor live-mode approval, webhook proof, and PCI scope review before any charge capture.";
  if (item.id === "refund-void-dispute-drills") return "Run refund, void, timeout, duplicate-charge, and dispute drills with ledger evidence.";
  return "Attach settlement reconciliation and payout report samples before enabling live commerce.";
}

function observabilityAction(item) {
  if (item.id === "alert-routing-drill") return "Connect a telemetry workspace and run a redacted alert-route drill.";
  return "Record an incident review drill with remediation owner and signoff evidence.";
}
