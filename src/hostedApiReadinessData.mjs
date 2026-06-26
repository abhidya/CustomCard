import { defineReadinessRegister, invalidEvidenceArtifactRefs } from "./readinessRegister.mjs";

const requiredHostedApiReadinessIds = [
  "vercel-project-link",
  "serverless-api-route-contract",
  "deployment-protection-boundary",
  "hosted-env-sync",
  "hosted-postgres-connectivity",
  "public-db-backed-route-proof",
  "hosted-clerk-token-verification",
  "backup-recovery-policy"
];

const requiredHostedEnvVars = [
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "AUTH_SESSION_SECRET",
  "CLERK_JWT_KEY",
  "CLERK_AUTHORIZED_PARTIES",
  "CLERK_ISSUER",
  "CLERK_AUDIENCE",
  "IDEMPOTENCY_KEY_TTL_HOURS"
];

const requiredHostedRouteIds = [
  "/api/health",
  "/api/admin/readiness",
  "/api/customer/bootstrap",
  "/api/render-packets"
];

const requiredHostedRestoreDrillEnvVars = [
  "CUSTOMCARD_RESTORE_DATABASE_URL",
  "CUSTOMCARD_BACKUP_RETENTION_DAYS",
  "CUSTOMCARD_BACKUP_RPO_MINUTES",
  "CUSTOMCARD_BACKUP_RTO_MINUTES",
  "CUSTOMCARD_RESTORE_POINT_IN_TIME"
];

const hostedPublicRouteProbeEvidence = "docs/evidence/hosted-api/2026-06-15-public-route-probes.md";
const hostedVercelEnvInventoryEvidence = "docs/evidence/hosted-api/2026-06-15-vercel-env-inventory.json";
const hostedVercelEnvRepairPlanEvidence = "docs/evidence/hosted-api/2026-06-15-vercel-env-repair-plan.json";
const hostedVercelEnvRepairPartialTtlEvidence = "docs/evidence/hosted-api/2026-06-15-vercel-env-repair-partial-ttl.json";
const hostedVercelEnvInventoryAfterTtlRepairEvidence = "docs/evidence/hosted-api/2026-06-15-vercel-env-inventory-after-ttl-repair.json";
const hostedClerkPublicConfigProbeEvidence = "docs/evidence/hosted-api/2026-06-15-clerk-public-config-probe.json";
const hostedClerkConfigRepairPlanEvidence = "docs/evidence/hosted-api/2026-06-15-clerk-config-repair-plan.json";
const hostedDbRestoreDrillPlanEvidence = "docs/evidence/hosted-api/2026-06-15-db-restore-drill-plan.json";

const allowedStatuses = new Set(["repo-local-ready", "evidence-missing", "protection-blocked", "live-proof-attached", "partial-live-proof"]);
const allowedProofScopes = new Set(["repo-local-contract", "live-hosted-required", "protection-blocked", "live-hosted-attached", "partial-live-hosted"]);

export const hostedApiReadinessItems = [
  {
    id: "vercel-project-link",
    label: "Vercel project link",
    lane: "deployment-evidence",
    status: "repo-local-ready",
    proofScope: "repo-local-contract",
    routeIds: ["/", "/api/health"],
    envVarNames: [],
    evidenceArtifactRefs: [hostedDbRestoreDrillPlanEvidence],
    requiredSourceSignals: ["Project: world-prize-s-projects/customcard", "Deployment ID", "Deployment URL", "Status from `vercel inspect`: `Ready`"],
    requiresHostedDb: false,
    requiresPublicRouteProof: false,
    requiresHostedTokenVerification: false,
    requiresBackupPolicy: false,
    liveProofClaimed: false,
    environmentSynced: false,
    hostedDbConnected: false,
    publicRouteProofAttached: false,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["docs/deployment-evidence.md records the Vercel project, deployment ID, URL, and ready status"],
    requiredEvidence: ["Vercel project link", "Deployment URL", "Deployment inspect output"],
    blocker: "Deployment metadata exists; public route and hosted runtime proof are tracked by dedicated hosted API items."
  },
  {
    id: "serverless-api-route-contract",
    label: "Serverless API route contract",
    lane: "serverless-api",
    status: "repo-local-ready",
    proofScope: "repo-local-contract",
    routeIds: requiredHostedRouteIds,
    envVarNames: [],
    evidenceArtifactRefs: [],
    requiredSourceSignals: ["api/[...path].js", "api/robots.js", "handleApiRequest", "vercel.json", '"excludeFiles"', '"source": "/api/(.*)"', "CUSTOMCARD_API_RUNTIME"],
    requiresHostedDb: false,
    requiresPublicRouteProof: false,
    requiresHostedTokenVerification: false,
    requiresBackupPolicy: false,
    liveProofClaimed: false,
    environmentSynced: false,
    hostedDbConnected: false,
    publicRouteProofAttached: false,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: ["Vercel rewrite contract", "serverless handler exports handleApiRequest", "local Vercel seam test"],
    requiredEvidence: ["Hosted /api/health response", "Hosted admin readiness response", "Protected-route bypass proof"],
    blocker: "Serverless source contract exists; hosted public route responses are not attached."
  },
  {
    id: "deployment-protection-boundary",
    label: "Deployment protection boundary",
    lane: "deployment-protection",
    status: "live-proof-attached",
    proofScope: "live-hosted-attached",
    routeIds: ["/", "/api/health"],
    envVarNames: [],
    evidenceArtifactRefs: [hostedPublicRouteProbeEvidence],
    requiredSourceSignals: ["Public `GET /` returned HTTP 401", "Public `GET /api/health` returned HTTP 401", "deployment protection"],
    requiresHostedDb: false,
    requiresPublicRouteProof: true,
    requiresHostedTokenVerification: false,
    requiresBackupPolicy: false,
    liveProofClaimed: true,
    environmentSynced: false,
    hostedDbConnected: false,
    publicRouteProofAttached: true,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "2026-06-15 public GET / returned HTTP 200 from Vercel",
      "2026-06-15 public GET /api/health returned HTTP 200 with runtime.mode=postgres",
      hostedPublicRouteProbeEvidence
    ],
    requiredEvidence: ["Keep public health JSON capture current", "Authenticated hosted API proof tracked separately"],
    blocker: "No deployment-protection blocker remains for public probes; authenticated hosted proof remains tracked by separate items."
  },
  {
    id: "hosted-env-sync",
    label: "Hosted env sync",
    lane: "environment-sync",
    status: "partial-live-proof",
    proofScope: "partial-live-hosted",
    routeIds: [],
    envVarNames: requiredHostedEnvVars,
    evidenceArtifactRefs: [
      hostedVercelEnvInventoryEvidence,
      hostedVercelEnvRepairPlanEvidence,
      hostedVercelEnvRepairPartialTtlEvidence,
      hostedVercelEnvInventoryAfterTtlRepairEvidence
    ],
    requiredSourceSignals: [
      "hosted:env:inventory",
      "hosted:env:repair",
      "CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_APPLY=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_ALLOW_PARTIAL=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled",
      "CUSTOMCARD_HOSTED_API_ENV",
      "CUSTOMCARD_VERCEL_ENV_TARGET",
      "vercel env ls",
      "infra/env/.env.example",
      "CUSTOMCARD_API_RUNTIME=postgres",
      "DATABASE_URL",
      "CLERK_JWT_KEY"
    ],
    requiresHostedDb: true,
    requiresPublicRouteProof: false,
    requiresHostedTokenVerification: true,
    requiresBackupPolicy: false,
    liveProofClaimed: false,
    environmentSynced: false,
    hostedDbConnected: false,
    publicRouteProofAttached: false,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "env example lists required hosted API keys",
      "docs/vercel-env-structure.md records production scoped key inventory",
      "2026-06-15 public health confirms CUSTOMCARD_API_RUNTIME resolves to postgres",
      "scripts/hosted-vercel-env-inventory.mjs provides a guarded, redacted QA/production Vercel env inventory probe",
      "scripts/hosted-vercel-env-repair.mjs provides a guarded, redacted plan/apply path for missing Vercel production env keys",
      "2026-06-15 redacted Vercel production env inventory confirms CUSTOMCARD_API_RUNTIME, DATABASE_URL, AUTH_SESSION_SECRET, CLERK_JWT_KEY, and CLERK_AUTHORIZED_PARTIES",
      "2026-06-15 redacted Vercel production env inventory is missing CLERK_ISSUER, CLERK_AUDIENCE, and IDEMPOTENCY_KEY_TTL_HOURS",
      "2026-06-15 redacted Vercel env repair plan confirms CLERK_ISSUER, CLERK_AUDIENCE, and IDEMPOTENCY_KEY_TTL_HOURS still need operator-supplied values before apply",
      "2026-06-15 guarded partial repair applied IDEMPOTENCY_KEY_TTL_HOURS to production without exposing its value",
      "2026-06-15 post-repair redacted Vercel production env inventory confirms IDEMPOTENCY_KEY_TTL_HOURS is now present and only CLERK_ISSUER plus CLERK_AUDIENCE remain missing",
      hostedVercelEnvInventoryEvidence,
      hostedVercelEnvRepairPlanEvidence,
      hostedVercelEnvRepairPartialTtlEvidence,
      hostedVercelEnvInventoryAfterTtlRepairEvidence
    ],
    requiredEvidence: [
      "Vercel env ls output",
      "Sanitized npm run hosted:env:inventory output",
      "Sanitized npm run hosted:env:repair output",
      "CUSTOMCARD_API_RUNTIME=postgres proof",
      "DATABASE_URL configured proof",
      "Clerk JWT verifier configured proof"
    ],
    blocker: "Redacted production Vercel env inventory is attached but incomplete: CLERK_ISSUER and CLERK_AUDIENCE are still missing after the guarded partial TTL repair; env sync and Clerk verifier proof remain unclaimed until those Clerk keys are applied and re-inventoried."
  },
  {
    id: "hosted-postgres-connectivity",
    label: "Hosted Postgres connectivity",
    lane: "database-connectivity",
    status: "live-proof-attached",
    proofScope: "live-hosted-attached",
    routeIds: ["/api/admin/readiness"],
    envVarNames: ["DATABASE_URL", "CUSTOMCARD_API_RUNTIME"],
    evidenceArtifactRefs: [hostedPublicRouteProbeEvidence],
    requiredSourceSignals: ["api:doctor:postgres:live", "api:doctor:postgres:http", "migrate", "DATABASE_URL"],
    requiresHostedDb: true,
    requiresPublicRouteProof: false,
    requiresHostedTokenVerification: false,
    requiresBackupPolicy: true,
    liveProofClaimed: true,
    environmentSynced: false,
    hostedDbConnected: true,
    publicRouteProofAttached: false,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "2026-06-11 deployment evidence records Vercel Marketplace Neon production resource and migration run",
      "2026-06-15 /api/health reports runtime.mode=postgres and postgresConfigured=true",
      hostedPublicRouteProbeEvidence
    ],
    requiredEvidence: ["Keep hosted health runtime=postgres capture current", "Authenticated hosted admin readiness runtime=postgres response"],
    blocker: "Hosted Postgres runtime proof is attached; authenticated admin readiness and backup proof remain tracked separately."
  },
  {
    id: "public-db-backed-route-proof",
    label: "Public DB-backed route proof",
    lane: "public-route-proof",
    status: "partial-live-proof",
    proofScope: "partial-live-hosted",
    routeIds: requiredHostedRouteIds,
    envVarNames: requiredHostedEnvVars,
    evidenceArtifactRefs: [hostedPublicRouteProbeEvidence],
    requiredSourceSignals: ["route auth probe", "hosted:auth:probe", "idempotency/audit rows", "api:doctor:postgres:http", "Vercel deployment"],
    requiresHostedDb: true,
    requiresPublicRouteProof: true,
    requiresHostedTokenVerification: true,
    requiresBackupPolicy: false,
    liveProofClaimed: false,
    environmentSynced: false,
    hostedDbConnected: true,
    publicRouteProofAttached: true,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "2026-06-15 /api/health returns HTTP 200 with runtime.mode=postgres",
      "2026-06-15 /api/admin/artifacts/bucket reaches app auth and returns route-level 401 auth-required",
      "scripts/hosted-clerk-route-probe.mjs provides a read-only hosted Clerk route probe for QA or production",
      "scripts/hosted-mutation-audit-probe.mjs provides a guarded hosted render-packet mutation, idempotency replay/conflict, and audit-counter probe",
      hostedPublicRouteProbeEvidence
    ],
    requiredEvidence: [
      "Hosted idempotent mutation replay",
      "Hosted audit row count",
      "Hosted Clerk-authenticated customer/admin route probes",
      "Sanitized npm run hosted:auth:probe output",
      "Sanitized npm run hosted:mutation:probe output"
    ],
    blocker: "Public Vercel DB-backed route proof is partially attached and hosted auth/mutation probes are scripted; executed Clerk token proof, authenticated mutation replay, and audit-row proof remain missing."
  },
  {
    id: "hosted-clerk-token-verification",
    label: "Hosted Clerk token verification",
    lane: "hosted-auth-proof",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: ["/api/admin/readiness", "/api/customer/bootstrap"],
    envVarNames: ["AUTH_SESSION_SECRET", "CLERK_JWT_KEY", "CLERK_AUTHORIZED_PARTIES", "CLERK_ISSUER", "CLERK_AUDIENCE"],
    evidenceArtifactRefs: [hostedClerkPublicConfigProbeEvidence, hostedClerkConfigRepairPlanEvidence],
    requiredSourceSignals: [
      "hosted:clerk:public-config",
      "hosted:clerk:repair",
      "CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_APPLY=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PUBLIC_KEY_REPLACE=enabled",
      "VITE_CLERK_PUBLISHABLE_KEY",
      "pk_test",
      "pk_live",
      "hosted:auth:probe",
      "CUSTOMCARD_HOSTED_AUTH_PROBE=enabled",
      "CUSTOMCARD_HOSTED_CUSTOMER_JWT",
      "CUSTOMCARD_HOSTED_ADMIN_JWT",
      "Clerk session JWT",
      "Bearer auth",
      "wrong-role blocking",
      "account:doctor:live",
      "admin-session",
      "customer-session"
    ],
    requiresHostedDb: true,
    requiresPublicRouteProof: true,
    requiresHostedTokenVerification: true,
    requiresBackupPolicy: false,
    liveProofClaimed: false,
    environmentSynced: false,
    hostedDbConnected: false,
    publicRouteProofAttached: false,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "memory auth doctor",
      "Postgres route-auth doctors",
      "account auth storage/recovery doctor",
      "scripts/hosted-clerk-public-config-probe.mjs provides a guarded, redacted hosted public bundle check for Clerk pk_test versus pk_live configuration",
      "2026-06-15 production hosted public app bundle probe found one redacted Clerk pk_test publishable key, no pk_live publishable key, and decoded issuer candidate https://model-bluejay-21.clerk.accounts.dev",
      hostedClerkPublicConfigProbeEvidence,
      "scripts/hosted-clerk-config-repair.mjs provides a guarded, redacted plan/apply path for replacing VITE_CLERK_PUBLISHABLE_KEY with pk_live, deriving CLERK_ISSUER, and applying CLERK_AUDIENCE",
      "2026-06-15 guarded Clerk config repair plan confirms no pk_live publishable key or CLERK_AUDIENCE value is available locally, public config still ships pk_test, and CLERK_ISSUER plus CLERK_AUDIENCE are missing in Vercel production",
      hostedClerkConfigRepairPlanEvidence,
      "scripts/hosted-clerk-route-probe.mjs is available for read-only hosted customer/admin route proof with operator-supplied Clerk JWTs"
    ],
    requiredEvidence: [
      "Hosted public app bundle Clerk pk_live proof",
      "Hosted Clerk customer JWT probe",
      "Hosted Clerk admin JWT probe",
      "Hosted wrong-role rejection",
      "Sanitized npm run hosted:clerk:public-config output",
      "Sanitized npm run hosted:clerk:repair output",
      "Sanitized npm run hosted:auth:probe output",
      "Production-equivalent Clerk token verification logs"
    ],
    blocker: "Hosted Clerk token verification outside isolated local/live Postgres doctors is scripted but not executed with real hosted JWT evidence; production public bundle evidence also shows VITE_CLERK_PUBLISHABLE_KEY currently resolves to a Clerk pk_test key instead of a pk_live key, so production OAuth cannot be claimed until the live publishable key is deployed and re-probed."
  },
  {
    id: "backup-recovery-policy",
    label: "Backup and recovery policy",
    lane: "backup-policy",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: [],
    envVarNames: ["DATABASE_URL", ...requiredHostedRestoreDrillEnvVars],
    evidenceArtifactRefs: [],
    requiredSourceSignals: [
      "hosted:rollback:plan:doctor",
      "docs/hosted-migration-rollback-plan.md",
      "Forward-only migrations",
      "Restore-before-switch",
      "hosted:db:restore:drill",
      "CUSTOMCARD_HOSTED_DB_RESTORE_DRILL=enabled",
      "CUSTOMCARD_RESTORE_DATABASE_URL",
      "CUSTOMCARD_BACKUP_RETENTION_DAYS",
      "CUSTOMCARD_RESTORE_POINT_IN_TIME",
      "Backup policy",
      "Migration run",
      "append-only audit",
      "data request"
    ],
    requiresHostedDb: true,
    requiresPublicRouteProof: false,
    requiresHostedTokenVerification: false,
    requiresBackupPolicy: true,
    liveProofClaimed: false,
    environmentSynced: false,
    hostedDbConnected: false,
    publicRouteProofAttached: false,
    hostedTokenVerificationAttached: false,
    backupPolicyAttached: false,
    deploymentProtectionBypassed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false,
    currentEvidence: [
      "schema migrations",
      "append-only audit contract",
      "data-request privacy contract",
      "docs/hosted-migration-rollback-plan.md attaches the Migration rollback plan",
      "scripts/hosted-migration-rollback-plan-doctor.mjs validates the rollback plan without claiming live rollback execution",
      "scripts/hosted-db-restore-drill.mjs provides a read-only restored-clone schema, index, table-read, retention, RPO, and RTO probe",
      "2026-06-15 guarded restore-drill plan evidence attaches retention=14 days, RPO=15 minutes, RTO=60 minutes, restore source=neon-branch, and restore point metadata without running against production",
      "2026-06-15 guarded restore-drill plan remains blocked only on CUSTOMCARD_RESTORE_DATABASE_URL because no restored clone URL is available locally",
      hostedDbRestoreDrillPlanEvidence
    ],
    requiredEvidence: [
      "Hosted backup policy",
      "Restore drill output",
      "Sanitized npm run hosted:db:restore:drill output",
      "Retention approval",
      "Executed rollback drill output"
    ],
    blocker: "Hosted migration rollback plan is attached and repo-checked; restored-clone drill output, retention approval, and executed rollback drill evidence remain missing."
  }
];

const hostedApiReadinessRegister = defineReadinessRegister({
  domainLabel: "hosted API",
  items: hostedApiReadinessItems,
  requiredIds: requiredHostedApiReadinessIds,
  itemRules(item) {
    const issues = [];

    if (!allowedStatuses.has(item.status)) issues.push(`Hosted API readiness item ${item.id} has unsupported status.`);
    if (!allowedProofScopes.has(item.proofScope)) issues.push(`Hosted API readiness item ${item.id} has unsupported proofScope.`);
    const evidenceArtifactRefsValid = Array.isArray(item.evidenceArtifactRefs);
    if (!evidenceArtifactRefsValid) {
      issues.push(`Hosted API readiness item ${item.id} must list evidenceArtifactRefs.`);
    } else {
      const invalidRefs = invalidEvidenceArtifactRefs(item.evidenceArtifactRefs);
      if (invalidRefs.length > 0) {
        issues.push(`Hosted API readiness item ${item.id} has invalid evidenceArtifactRefs: ${invalidRefs.join(", ")}.`);
      }
    }
    if (item.liveProofClaimed && (!evidenceArtifactRefsValid || item.evidenceArtifactRefs.length < 1)) {
      issues.push(`Hosted API readiness item ${item.id} cannot claim liveProofClaimed without evidenceArtifactRefs.`);
    }
    if (item.requiredSourceSignals.length < 2) issues.push(`Hosted API readiness item ${item.id} must list source signals.`);
    if (item.currentEvidence.length < 1) issues.push(`Hosted API readiness item ${item.id} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`Hosted API readiness item ${item.id} must list at least two required evidence items.`);
    if (!item.blocker) issues.push(`Hosted API readiness item ${item.id} must explain its blocker.`);
    if (item.environmentSynced && (!evidenceArtifactRefsValid || item.evidenceArtifactRefs.length < 1)) {
      issues.push(`Hosted API readiness item ${item.id} cannot claim environmentSynced without evidenceArtifactRefs.`);
    }
    if (item.hostedDbConnected && (!evidenceArtifactRefsValid || item.evidenceArtifactRefs.length < 1)) {
      issues.push(`Hosted API readiness item ${item.id} cannot claim hostedDbConnected without evidenceArtifactRefs.`);
    }
    if (item.publicRouteProofAttached && (!evidenceArtifactRefsValid || item.evidenceArtifactRefs.length < 1)) {
      issues.push(`Hosted API readiness item ${item.id} cannot claim publicRouteProofAttached without evidenceArtifactRefs.`);
    }
    if (item.hostedTokenVerificationAttached !== false) {
      issues.push(`Hosted API readiness item ${item.id} must not claim hostedTokenVerificationAttached.`);
    }
    if (item.backupPolicyAttached !== false) issues.push(`Hosted API readiness item ${item.id} must not claim backupPolicyAttached.`);
    if (item.deploymentProtectionBypassed !== false) {
      if (item.id !== "deployment-protection-boundary" || !evidenceArtifactRefsValid || item.evidenceArtifactRefs.length < 1) {
        issues.push(`Hosted API readiness item ${item.id} cannot claim deploymentProtectionBypassed without deployment-protection evidence.`);
      }
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Hosted API readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.realOrdersEnabled !== false) issues.push(`Hosted API readiness item ${item.id} must keep realOrdersEnabled=false.`);
    if (item.liveProviderCalls !== false) issues.push(`Hosted API readiness item ${item.id} must keep liveProviderCalls=false.`);

    return issues;
  },
  crossRules(itemsById) {
    const issues = [];

    const envSync = itemsById.get("hosted-env-sync");
    if (envSync) {
      assertCoversHostedEnvVars(envSync, issues, "Hosted env sync");
    }

    const publicProof = itemsById.get("public-db-backed-route-proof");
    if (publicProof) {
      assertCoversHostedRoutes(publicProof, issues, "Public DB-backed route proof");
      assertCoversHostedEnvVars(publicProof, issues, "Public DB-backed route proof");
      if (!publicProof.requiresHostedDb || !publicProof.requiresPublicRouteProof || !publicProof.requiresHostedTokenVerification) {
        issues.push("Public DB-backed route proof must require hosted DB, public route, and hosted token evidence.");
      }
    }

    const protection = itemsById.get("deployment-protection-boundary");
    if (protection) {
      if (protection.status !== "live-proof-attached") {
        issues.push("Deployment protection boundary must remain live-proof-attached once public probes are attached.");
      }
      if (!protection.requiresPublicRouteProof || !protection.publicRouteProofAttached || !protection.deploymentProtectionBypassed) {
        issues.push("Deployment protection boundary must include public route proof and deployment-protection bypass evidence.");
      }
      if (protection.proofScope !== "live-hosted-attached") {
        issues.push("Deployment protection boundary must keep proofScope=live-hosted-attached.");
      }
    }

    const hostedToken = itemsById.get("hosted-clerk-token-verification");
    if (hostedToken) {
      if (!hostedToken.requiresHostedTokenVerification || hostedToken.hostedTokenVerificationAttached !== false) {
        issues.push("Hosted Clerk token verification must require hosted token evidence without claiming it.");
      }
      for (const route of ["/api/admin/readiness", "/api/customer/bootstrap"]) {
        if (!hostedToken.routeIds.includes(route)) issues.push(`Hosted Clerk token verification must include route: ${route}.`);
      }
    }

    const backup = itemsById.get("backup-recovery-policy");
    if (backup) {
      if (!backup.requiresBackupPolicy || backup.backupPolicyAttached !== false) {
        issues.push("Backup and recovery policy must require backup evidence without claiming it.");
      }
    }

    return issues;
  },
  summarize(items) {
    return {
      repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
      evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
      liveProofAttached: items.filter((item) => item.status === "live-proof-attached").length,
      partialLiveProof: items.filter((item) => item.status === "partial-live-proof").length,
      protectionBlocked: items.filter((item) => item.status === "protection-blocked").length,
      hostedDbRequired: items.filter((item) => item.requiresHostedDb).length,
      publicRouteProofRequired: items.filter((item) => item.requiresPublicRouteProof).length,
      hostedTokenVerificationRequired: items.filter((item) => item.requiresHostedTokenVerification).length,
      backupPolicyRequired: items.filter((item) => item.requiresBackupPolicy).length,
      repoLocalContractProofs: items.filter((item) => item.proofScope === "repo-local-contract").length,
      liveHostedProofRequired: items.filter((item) => item.proofScope === "live-hosted-required").length,
      liveHostedProofAttached: items.filter((item) => item.proofScope === "live-hosted-attached").length,
      partialLiveHostedProofs: items.filter((item) => item.proofScope === "partial-live-hosted").length,
      protectionBlockedProofs: items.filter((item) => item.proofScope === "protection-blocked").length,
      liveProofClaims: items.filter((item) => item.liveProofClaimed).length,
      routeContracts: new Set(items.flatMap((item) => item.routeIds)).size,
      requiredEnvVars: new Set(items.flatMap((item) => item.envVarNames)).size,
      sourceSignals: new Set(items.flatMap((item) => item.requiredSourceSignals)).size,
      envSyncProofs: items.filter((item) => item.environmentSynced).length,
      hostedDbProofs: items.filter((item) => item.hostedDbConnected).length,
      publicRouteProofs: items.filter((item) => item.publicRouteProofAttached).length,
      hostedTokenVerificationProofs: items.filter((item) => item.hostedTokenVerificationAttached).length,
      backupPolicies: items.filter((item) => item.backupPolicyAttached).length,
      deploymentProtectionBypasses: items.filter((item) => item.deploymentProtectionBypassed).length,
      evidenceArtifacts: items.reduce((total, item) => total + item.evidenceArtifactRefs.length, 0),
      externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
      realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
      liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizeHostedApiReadiness(items = hostedApiReadinessItems) {
  return hostedApiReadinessRegister.summarize(items);
}

export function validateHostedApiReadiness(items = hostedApiReadinessItems) {
  return hostedApiReadinessRegister.validate(items);
}

function assertCoversHostedEnvVars(item, issues, label) {
  for (const envVar of requiredHostedEnvVars) {
    if (!item.envVarNames.includes(envVar)) issues.push(`${label} must include env var: ${envVar}.`);
  }
}

function assertCoversHostedRoutes(item, issues, label) {
  for (const route of requiredHostedRouteIds) {
    if (!item.routeIds.includes(route)) issues.push(`${label} must include route: ${route}.`);
  }
}
