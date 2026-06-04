const requiredReviewerDbSeedReadinessIds = [
  "reviewer-seed-plan-contract",
  "reviewer-session-token-contract",
  "seed-sql-preview-safety",
  "hosted-database-migration-prereq",
  "hosted-seed-execution-proof",
  "hosted-admin-customer-token-probe",
  "vercel-env-seed-sync",
  "rollback-cleanup-drill"
];

const requiredReviewerSeedTables = [
  "users",
  "auth_sessions",
  "provider_connections",
  "imported_events",
  "card_opportunities",
  "relationship_memories",
  "card_projects",
  "render_packets",
  "orders",
  "order_events",
  "vendor_quotes",
  "consent_records",
  "data_requests",
  "audit_log"
];

const requiredReviewerSeedEnvVars = [
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "CUSTOMCARD_CUSTOMER_SESSION_TOKEN",
  "CUSTOMCARD_ADMIN_SESSION_TOKEN",
  "AUTH_SESSION_SECRET",
  "IDEMPOTENCY_KEY_TTL_HOURS"
];

const requiredReviewerProbeRoutes = [
  "/api/admin/readiness",
  "/api/customer/bootstrap",
  "/api/admin/demo-reset",
  "/api/render-packets"
];

const allowedStatuses = new Set(["repo-local-ready", "evidence-missing"]);

export const reviewerDbSeedReadinessItems = [
  {
    id: "reviewer-seed-plan-contract",
    label: "Reviewer seed plan contract",
    lane: "seed-plan",
    status: "repo-local-ready",
    tableNames: requiredReviewerSeedTables,
    envVarNames: [],
    routeIds: ["/api/admin/demo-reset"],
    requiredSourceSignals: ["buildDemoSeedPlan", "customcard-demo-seed", "rows: 17", "rawContentStored: false"],
    requiresHostedDatabase: false,
    requiresHostedSeedExecution: false,
    requiresHostedTokenProbe: false,
    requiresVercelEnvSync: false,
    rollbackRequired: true,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["src/demoSeed.ts builds 17 deterministic reviewer fixture rows across 14 tables"],
    requiredEvidence: ["Hosted reviewer database URL", "Operator-scoped seed approval", "Hosted seed execution output"],
    blocker: "Seed plan exists locally; no hosted reviewer database mutation proof is attached."
  },
  {
    id: "reviewer-session-token-contract",
    label: "Reviewer session token contract",
    lane: "session-tokens",
    status: "repo-local-ready",
    tableNames: ["users", "auth_sessions"],
    envVarNames: ["CUSTOMCARD_CUSTOMER_SESSION_TOKEN", "CUSTOMCARD_ADMIN_SESSION_TOKEN", "AUTH_SESSION_SECRET"],
    routeIds: ["/api/admin/readiness", "/api/customer/bootstrap"],
    requiredSourceSignals: ["hashSessionToken", "session-demo-customer", "session-demo-admin", "wrong-role"],
    requiresHostedDatabase: false,
    requiresHostedSeedExecution: false,
    requiresHostedTokenProbe: true,
    requiresVercelEnvSync: false,
    rollbackRequired: true,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["API runtime hashes bearer tokens", "memory/Postgres doctors enforce customer/admin roles"],
    requiredEvidence: ["Hosted customer token probe", "Hosted admin token probe", "Hosted wrong-role rejection"],
    blocker: "Local token contracts exist; hosted reviewer account-token probes are not attached."
  },
  {
    id: "seed-sql-preview-safety",
    label: "Seed SQL preview safety",
    lane: "sql-preview",
    status: "repo-local-ready",
    tableNames: requiredReviewerSeedTables,
    envVarNames: [],
    routeIds: ["/api/admin/demo-reset"],
    requiredSourceSignals: ["buildDemoSeedSqlPreview", "DELETE FROM", "INSERT INTO", "execute only against an isolated reviewer database"],
    requiresHostedDatabase: false,
    requiresHostedSeedExecution: false,
    requiresHostedTokenProbe: false,
    requiresVercelEnvSync: false,
    rollbackRequired: true,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["SQL preview uses demo-scoped IDs", "demo reset script does not mutate persistence"],
    requiredEvidence: ["Reviewed SQL preview", "Confirmed isolated reviewer DB target", "Rollback capture"],
    blocker: "SQL preview is local-only; no hosted seed execution or rollback evidence is attached."
  },
  {
    id: "hosted-database-migration-prereq",
    label: "Hosted database migration prerequisite",
    lane: "hosted-db",
    status: "evidence-missing",
    tableNames: requiredReviewerSeedTables,
    envVarNames: ["DATABASE_URL", "CUSTOMCARD_API_RUNTIME"],
    routeIds: ["/api/admin/readiness"],
    requiredSourceSignals: ["infra/migrations/001_initial_schema.sql", "npm run migrate", "api:doctor:postgres:live"],
    requiresHostedDatabase: true,
    requiresHostedSeedExecution: false,
    requiresHostedTokenProbe: false,
    requiresVercelEnvSync: true,
    rollbackRequired: true,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["migration contract", "isolated Postgres doctors", "deployment evidence gap"],
    requiredEvidence: ["Hosted migration run", "Hosted schema table count", "Hosted admin readiness runtime=postgres response"],
    blocker: "No deployed reviewer database migration output is attached."
  },
  {
    id: "hosted-seed-execution-proof",
    label: "Hosted seed execution proof",
    lane: "hosted-seed",
    status: "evidence-missing",
    tableNames: requiredReviewerSeedTables,
    envVarNames: requiredReviewerSeedEnvVars,
    routeIds: ["/api/admin/demo-reset", "/api/admin/readiness"],
    requiredSourceSignals: ["demo:doctor", "admin-demo", "user-demo", "audit-demo-reset"],
    requiresHostedDatabase: true,
    requiresHostedSeedExecution: true,
    requiresHostedTokenProbe: true,
    requiresVercelEnvSync: true,
    rollbackRequired: true,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["demo reset preview", "repository-backed admin route contract", "append-only audit contract"],
    requiredEvidence: ["Hosted demo reset response", "Hosted row counts for seeded tables", "Hosted audit row for seed action", "Rollback-safe reset key"],
    blocker: "No hosted reviewer seed execution report is attached."
  },
  {
    id: "hosted-admin-customer-token-probe",
    label: "Hosted admin and customer token probe",
    lane: "hosted-token-probe",
    status: "evidence-missing",
    tableNames: ["users", "auth_sessions", "audit_log"],
    envVarNames: ["CUSTOMCARD_CUSTOMER_SESSION_TOKEN", "CUSTOMCARD_ADMIN_SESSION_TOKEN", "AUTH_SESSION_SECRET"],
    routeIds: requiredReviewerProbeRoutes,
    requiredSourceSignals: ["Bearer auth", "CUSTOMCARD_CUSTOMER_SESSION_TOKEN", "CUSTOMCARD_ADMIN_SESSION_TOKEN", "wrong-role"],
    requiresHostedDatabase: true,
    requiresHostedSeedExecution: true,
    requiresHostedTokenProbe: true,
    requiresVercelEnvSync: true,
    rollbackRequired: false,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["local memory auth doctor", "local Postgres HTTP auth doctor", "hosted API proof readiness register"],
    requiredEvidence: ["Hosted admin readiness token probe", "Hosted customer bootstrap token probe", "Hosted wrong-role rejection", "Hosted idempotency replay"],
    blocker: "Hosted customer/admin bearer token verification is not attached."
  },
  {
    id: "vercel-env-seed-sync",
    label: "Vercel env seed sync",
    lane: "vercel-env",
    status: "evidence-missing",
    tableNames: [],
    envVarNames: requiredReviewerSeedEnvVars,
    routeIds: ["/api/health", "/api/admin/readiness"],
    requiredSourceSignals: ["vercel env ls", "CUSTOMCARD_API_RUNTIME=postgres", "DATABASE_URL", "Deployment URL"],
    requiresHostedDatabase: true,
    requiresHostedSeedExecution: false,
    requiresHostedTokenProbe: true,
    requiresVercelEnvSync: true,
    rollbackRequired: false,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["docs/deployment-evidence.md records no Vercel env vars"],
    requiredEvidence: ["Vercel env ls with required keys", "Production runtime env proof", "Protected route verification bypass"],
    blocker: "Vercel env sync for hosted reviewer database and tokens is not attached."
  },
  {
    id: "rollback-cleanup-drill",
    label: "Rollback cleanup drill",
    lane: "rollback",
    status: "evidence-missing",
    tableNames: requiredReviewerSeedTables,
    envVarNames: ["DATABASE_URL"],
    routeIds: ["/api/admin/demo-reset"],
    requiredSourceSignals: ["DELETE FROM", "resetKey", "audit_log", "idempotentReset"],
    requiresHostedDatabase: true,
    requiresHostedSeedExecution: true,
    requiresHostedTokenProbe: false,
    requiresVercelEnvSync: true,
    rollbackRequired: true,
    sqlPreviewOnly: true,
    hostedSeedExecuted: false,
    hostedTokenProbeAttached: false,
    vercelEnvSynced: false,
    destructiveLiveMutation: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["demo seed rows use demo-scoped IDs", "SQL preview includes reset statements"],
    requiredEvidence: ["Hosted rollback run", "Post-rollback row count", "Rollback audit entry"],
    blocker: "No hosted reviewer database rollback drill is attached."
  }
];

export function summarizeReviewerDbSeedReadiness(items = reviewerDbSeedReadinessItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
    hostedDatabaseRequired: items.filter((item) => item.requiresHostedDatabase).length,
    hostedSeedExecutionRequired: items.filter((item) => item.requiresHostedSeedExecution).length,
    hostedTokenProbeRequired: items.filter((item) => item.requiresHostedTokenProbe).length,
    vercelEnvSyncRequired: items.filter((item) => item.requiresVercelEnvSync).length,
    rollbackRequired: items.filter((item) => item.rollbackRequired).length,
    sqlPreviewOnly: items.filter((item) => item.sqlPreviewOnly).length,
    tableContracts: new Set(items.flatMap((item) => item.tableNames)).size,
    routeContracts: new Set(items.flatMap((item) => item.routeIds)).size,
    requiredEnvVars: new Set(items.flatMap((item) => item.envVarNames)).size,
    hostedSeedProofs: items.filter((item) => item.hostedSeedExecuted).length,
    hostedTokenProbeProofs: items.filter((item) => item.hostedTokenProbeAttached).length,
    vercelEnvSyncProofs: items.filter((item) => item.vercelEnvSynced).length,
    destructiveLiveMutations: items.filter((item) => item.destructiveLiveMutation).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
    realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
    requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort(),
    blockers: validateReviewerDbSeedReadiness(items)
  };
}

export function validateReviewerDbSeedReadiness(items = reviewerDbSeedReadinessItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate reviewer DB seed readiness item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (!allowedStatuses.has(item.status)) issues.push(`Reviewer DB seed readiness item ${item.id} has unsupported status.`);
    if (item.requiredSourceSignals.length < 2) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must list source signals.`);
    }
    if (item.currentEvidence.length < 1) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must list current repo-local evidence.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must list at least two required evidence items.`);
    }
    if (!item.blocker) issues.push(`Reviewer DB seed readiness item ${item.id} must explain its blocker.`);
    if (item.hostedSeedExecuted !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must not claim hostedSeedExecuted.`);
    }
    if (item.hostedTokenProbeAttached !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must not claim hostedTokenProbeAttached.`);
    }
    if (item.vercelEnvSynced !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must not claim vercelEnvSynced.`);
    }
    if (item.destructiveLiveMutation !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must not enable destructive live mutations.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.liveProviderCalls !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must keep liveProviderCalls=false.`);
    }
    if (item.realOrdersEnabled !== false) {
      issues.push(`Reviewer DB seed readiness item ${item.id} must keep realOrdersEnabled=false.`);
    }
  }

  for (const requiredId of requiredReviewerDbSeedReadinessIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing reviewer DB seed readiness item: ${requiredId}.`);
  }

  const seedPlan = itemsById.get("reviewer-seed-plan-contract");
  if (seedPlan) {
    assertCoversTables(seedPlan, issues, "Reviewer seed plan contract");
    if (!seedPlan.rollbackRequired || !seedPlan.sqlPreviewOnly) {
      issues.push("Reviewer seed plan contract must stay rollback-required and SQL-preview-only.");
    }
  }

  const tokenContract = itemsById.get("reviewer-session-token-contract");
  if (tokenContract) {
    assertCoversEnvVars(tokenContract, ["CUSTOMCARD_CUSTOMER_SESSION_TOKEN", "CUSTOMCARD_ADMIN_SESSION_TOKEN"], issues, "Reviewer session token contract");
    for (const route of ["/api/admin/readiness", "/api/customer/bootstrap"]) {
      if (!tokenContract.routeIds.includes(route)) {
        issues.push(`Reviewer session token contract must include route: ${route}.`);
      }
    }
  }

  const hostedSeed = itemsById.get("hosted-seed-execution-proof");
  if (hostedSeed) {
    assertCoversTables(hostedSeed, issues, "Hosted seed execution proof");
    assertCoversEnvVars(hostedSeed, requiredReviewerSeedEnvVars, issues, "Hosted seed execution proof");
    if (!hostedSeed.requiresHostedDatabase || !hostedSeed.requiresHostedSeedExecution || !hostedSeed.requiresHostedTokenProbe) {
      issues.push("Hosted seed execution proof must require hosted database, seed execution, and token probe evidence.");
    }
  }

  const hostedProbe = itemsById.get("hosted-admin-customer-token-probe");
  if (hostedProbe) {
    for (const route of ["/api/admin/readiness", "/api/customer/bootstrap", "/api/render-packets"]) {
      if (!hostedProbe.routeIds.includes(route)) {
        issues.push(`Hosted admin and customer token probe must include route: ${route}.`);
      }
    }
    if (!hostedProbe.requiresHostedDatabase || !hostedProbe.requiresHostedTokenProbe || hostedProbe.hostedTokenProbeAttached !== false) {
      issues.push("Hosted admin and customer token probe must require hosted token evidence without claiming it.");
    }
  }

  const vercelEnv = itemsById.get("vercel-env-seed-sync");
  if (vercelEnv) {
    assertCoversEnvVars(vercelEnv, requiredReviewerSeedEnvVars, issues, "Vercel env seed sync");
    if (!vercelEnv.requiresVercelEnvSync || vercelEnv.vercelEnvSynced !== false) {
      issues.push("Vercel env seed sync must require env sync evidence without claiming it.");
    }
  }

  const rollback = itemsById.get("rollback-cleanup-drill");
  if (rollback) {
    assertCoversTables(rollback, issues, "Rollback cleanup drill");
    if (!rollback.rollbackRequired || !rollback.requiresHostedSeedExecution) {
      issues.push("Rollback cleanup drill must require hosted seed execution and rollback evidence.");
    }
  }

  return issues;
}

function assertCoversTables(item, issues, label) {
  for (const table of requiredReviewerSeedTables) {
    if (!item.tableNames.includes(table)) issues.push(`${label} must include table: ${table}.`);
  }
}

function assertCoversEnvVars(item, envVars, issues, label) {
  for (const envVar of envVars) {
    if (!item.envVarNames.includes(envVar)) issues.push(`${label} must include env var: ${envVar}.`);
  }
}
