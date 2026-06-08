import { defineReadinessRegister } from "./readinessRegister.mjs";

const requiredHostedApiReadinessIds = [
  "vercel-project-link",
  "serverless-api-route-contract",
  "deployment-protection-boundary",
  "hosted-env-sync",
  "hosted-postgres-connectivity",
  "public-db-backed-route-proof",
  "hosted-account-token-verification",
  "backup-recovery-policy"
];

const requiredHostedEnvVars = [
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "CUSTOMCARD_CUSTOMER_SESSION_TOKEN",
  "CUSTOMCARD_ADMIN_SESSION_TOKEN",
  "AUTH_SESSION_SECRET",
  "IDEMPOTENCY_KEY_TTL_HOURS"
];

const requiredHostedRouteIds = [
  "/api/health",
  "/api/admin/readiness",
  "/api/customer/bootstrap",
  "/api/render-packets"
];

const allowedStatuses = new Set(["repo-local-ready", "evidence-missing", "protection-blocked"]);
const allowedProofScopes = new Set(["repo-local-contract", "live-hosted-required", "protection-blocked"]);

export const hostedApiReadinessItems = [
  {
    id: "vercel-project-link",
    label: "Vercel project link",
    lane: "deployment-evidence",
    status: "repo-local-ready",
    proofScope: "repo-local-contract",
    routeIds: ["/", "/api/health"],
    envVarNames: [],
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
    blocker: "Deployment metadata exists; public route proof is still blocked by deployment protection."
  },
  {
    id: "serverless-api-route-contract",
    label: "Serverless API route contract",
    lane: "serverless-api",
    status: "repo-local-ready",
    proofScope: "repo-local-contract",
    routeIds: requiredHostedRouteIds,
    envVarNames: [],
    requiredSourceSignals: ["api/[...path].mjs", "handleApiRequest", "vercel.json", "CUSTOMCARD_API_RUNTIME"],
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
    status: "protection-blocked",
    proofScope: "protection-blocked",
    routeIds: ["/", "/api/health"],
    envVarNames: [],
    requiredSourceSignals: ["Public `GET /` returned HTTP 401", "Public `GET /api/health` returned HTTP 401", "deployment protection"],
    requiresHostedDb: false,
    requiresPublicRouteProof: true,
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
    currentEvidence: ["Vercel deployment protection returned HTTP 401 for public app and health probes"],
    requiredEvidence: ["Vercel bypass token", "Protection-disabled verification window", "Public health JSON capture"],
    blocker: "Deployment protection blocks public hosted route proof until a safe verification bypass is attached."
  },
  {
    id: "hosted-env-sync",
    label: "Hosted env sync",
    lane: "environment-sync",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: [],
    envVarNames: requiredHostedEnvVars,
    requiredSourceSignals: ["vercel env ls", "infra/env/.env.example", "CUSTOMCARD_API_RUNTIME=postgres", "DATABASE_URL"],
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
    currentEvidence: ["env example lists required hosted API keys", "deployment evidence records no Vercel env vars"],
    requiredEvidence: ["Vercel env ls output", "CUSTOMCARD_API_RUNTIME=postgres proof", "DATABASE_URL configured proof", "session token configured proof"],
    blocker: "No Vercel env sync evidence is attached for Postgres runtime or session tokens."
  },
  {
    id: "hosted-postgres-connectivity",
    label: "Hosted Postgres connectivity",
    lane: "database-connectivity",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: ["/api/admin/readiness"],
    envVarNames: ["DATABASE_URL", "CUSTOMCARD_API_RUNTIME"],
    requiredSourceSignals: ["api:doctor:postgres:live", "api:doctor:postgres:http", "migrate", "DATABASE_URL"],
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
    currentEvidence: ["isolated live Postgres doctors", "process-level Postgres HTTP doctor", "migration contract"],
    requiredEvidence: ["Hosted DATABASE_URL connectivity output", "Hosted migration run output", "Hosted admin readiness runtime=postgres response"],
    blocker: "Postgres doctors run locally or against isolated databases; no hosted Vercel database connectivity proof is attached."
  },
  {
    id: "public-db-backed-route-proof",
    label: "Public DB-backed route proof",
    lane: "public-route-proof",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: requiredHostedRouteIds,
    envVarNames: requiredHostedEnvVars,
    requiredSourceSignals: ["route auth probe", "idempotency/audit rows", "api:doctor:postgres:http", "Vercel deployment"],
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
    currentEvidence: ["local HTTP Postgres API doctor", "Vercel serverless seam test", "deployment URL recorded"],
    requiredEvidence: ["Hosted /api/admin/readiness runtime=postgres response", "Hosted idempotent mutation replay", "Hosted audit row count", "Public DB doctor output"],
    blocker: "No public Vercel DB-backed route response, idempotency replay, or audit-row proof is attached."
  },
  {
    id: "hosted-account-token-verification",
    label: "Hosted account-token verification",
    lane: "hosted-auth-proof",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: ["/api/admin/readiness", "/api/customer/bootstrap"],
    envVarNames: ["CUSTOMCARD_CUSTOMER_SESSION_TOKEN", "CUSTOMCARD_ADMIN_SESSION_TOKEN", "AUTH_SESSION_SECRET"],
    requiredSourceSignals: ["Bearer auth", "wrong-role blocking", "account:doctor:live", "admin-session", "customer-session"],
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
    currentEvidence: ["memory auth doctor", "Postgres route-auth doctors", "account auth storage/recovery doctor"],
    requiredEvidence: ["Hosted customer token probe", "Hosted admin token probe", "Hosted wrong-role rejection", "Production-equivalent token verification logs"],
    blocker: "Hosted token verification outside isolated local/live Postgres doctors is not attached."
  },
  {
    id: "backup-recovery-policy",
    label: "Backup and recovery policy",
    lane: "backup-policy",
    status: "evidence-missing",
    proofScope: "live-hosted-required",
    routeIds: [],
    envVarNames: ["DATABASE_URL"],
    requiredSourceSignals: ["Backup policy", "Migration run", "append-only audit", "data request"],
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
    currentEvidence: ["schema migrations", "append-only audit contract", "data-request privacy contract"],
    requiredEvidence: ["Hosted backup policy", "Restore drill output", "Retention approval", "Migration rollback plan"],
    blocker: "No hosted database backup policy, restore drill, or retention approval is attached."
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
    if (item.liveProofClaimed !== false) issues.push(`Hosted API readiness item ${item.id} must not claim liveProofClaimed.`);
    if (item.requiredSourceSignals.length < 2) issues.push(`Hosted API readiness item ${item.id} must list source signals.`);
    if (item.currentEvidence.length < 1) issues.push(`Hosted API readiness item ${item.id} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`Hosted API readiness item ${item.id} must list at least two required evidence items.`);
    if (!item.blocker) issues.push(`Hosted API readiness item ${item.id} must explain its blocker.`);
    if (item.environmentSynced !== false) issues.push(`Hosted API readiness item ${item.id} must not claim environmentSynced.`);
    if (item.hostedDbConnected !== false) issues.push(`Hosted API readiness item ${item.id} must not claim hostedDbConnected.`);
    if (item.publicRouteProofAttached !== false) issues.push(`Hosted API readiness item ${item.id} must not claim publicRouteProofAttached.`);
    if (item.hostedTokenVerificationAttached !== false) {
      issues.push(`Hosted API readiness item ${item.id} must not claim hostedTokenVerificationAttached.`);
    }
    if (item.backupPolicyAttached !== false) issues.push(`Hosted API readiness item ${item.id} must not claim backupPolicyAttached.`);
    if (item.deploymentProtectionBypassed !== false) {
      issues.push(`Hosted API readiness item ${item.id} must not claim deploymentProtectionBypassed.`);
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
      if (protection.status !== "protection-blocked") {
        issues.push("Deployment protection boundary must remain protection-blocked.");
      }
      if (!protection.requiresPublicRouteProof || protection.deploymentProtectionBypassed !== false) {
        issues.push("Deployment protection boundary must require public route proof without claiming a bypass.");
      }
      if (protection.proofScope !== "protection-blocked") {
        issues.push("Deployment protection boundary must keep proofScope=protection-blocked.");
      }
    }

    const hostedToken = itemsById.get("hosted-account-token-verification");
    if (hostedToken) {
      if (!hostedToken.requiresHostedTokenVerification || hostedToken.hostedTokenVerificationAttached !== false) {
        issues.push("Hosted account-token verification must require hosted token evidence without claiming it.");
      }
      for (const route of ["/api/admin/readiness", "/api/customer/bootstrap"]) {
        if (!hostedToken.routeIds.includes(route)) issues.push(`Hosted account-token verification must include route: ${route}.`);
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
      protectionBlocked: items.filter((item) => item.status === "protection-blocked").length,
      hostedDbRequired: items.filter((item) => item.requiresHostedDb).length,
      publicRouteProofRequired: items.filter((item) => item.requiresPublicRouteProof).length,
      hostedTokenVerificationRequired: items.filter((item) => item.requiresHostedTokenVerification).length,
      backupPolicyRequired: items.filter((item) => item.requiresBackupPolicy).length,
      repoLocalContractProofs: items.filter((item) => item.proofScope === "repo-local-contract").length,
      liveHostedProofRequired: items.filter((item) => item.proofScope === "live-hosted-required").length,
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
