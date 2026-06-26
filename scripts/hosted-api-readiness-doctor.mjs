import { existsSync } from "node:fs";
import {
  hostedApiReadinessItems,
  summarizeHostedApiReadiness,
  validateHostedApiReadiness
} from "../src/hostedApiReadinessData.mjs";
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
  id: "hosted-api",
  service: "customcard-hosted-api-readiness-doctor",
  npmScript: "hosted:api:doctor",
  scriptPath: "scripts/hosted-api-readiness-doctor.mjs",
  workflowLabel: "Validate hosted API proof readiness",
  docsTitle: "Hosted API proof readiness",
  readinessModule: "src/hostedApiReadiness.ts",
  files: {
    readinessTest: "src/hostedApiReadiness.test.ts",
    deploymentEvidence: "docs/deployment-evidence.md",
    platformDocs: "docs/platform-expansion-design.md",
    verificationDocs: "docs/verification.md",
    vercel: "vercel.json",
    vercelApiHandler: "api/[...path].js",
    vercelRobotsHandler: "api/robots.js",
    envExample: "infra/env/.env.example",
    hostedReadinessData: "src/hostedApiReadinessData.mjs",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    adminApp: "src/App.tsx",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    postgresHttpDoctor: "scripts/postgres-api-http-doctor.mjs",
    accountDoctor: "scripts/account-auth-doctor.mjs",
    hostedVercelEnvInventory: "scripts/hosted-vercel-env-inventory.mjs",
    hostedVercelEnvRepair: "scripts/hosted-vercel-env-repair.mjs",
    hostedClerkPublicConfigProbe: "scripts/hosted-clerk-public-config-probe.mjs",
    hostedClerkConfigRepair: "scripts/hosted-clerk-config-repair.mjs",
    hostedClerkRouteProbe: "scripts/hosted-clerk-route-probe.mjs",
    hostedMutationAuditProbe: "scripts/hosted-mutation-audit-probe.mjs",
    hostedDbRestoreDrill: "scripts/hosted-db-restore-drill.mjs",
    hostedMigrationRollbackPlanDoctor: "scripts/hosted-migration-rollback-plan-doctor.mjs",
    hostedMigrationRollbackPlan: "docs/hosted-migration-rollback-plan.md",
    hostedVercelEnvInventoryEvidence: "docs/evidence/hosted-api/2026-06-15-vercel-env-inventory.json",
    hostedVercelEnvRepairPlanEvidence: "docs/evidence/hosted-api/2026-06-15-vercel-env-repair-plan.json",
    hostedVercelEnvRepairPartialTtlEvidence: "docs/evidence/hosted-api/2026-06-15-vercel-env-repair-partial-ttl.json",
    hostedVercelEnvInventoryAfterTtlRepairEvidence: "docs/evidence/hosted-api/2026-06-15-vercel-env-inventory-after-ttl-repair.json",
    hostedClerkPublicConfigProbeEvidence: "docs/evidence/hosted-api/2026-06-15-clerk-public-config-probe.json",
    hostedClerkConfigRepairPlanEvidence: "docs/evidence/hosted-api/2026-06-15-clerk-config-repair-plan.json",
    hostedDbRestoreDrillPlanEvidence: "docs/evidence/hosted-api/2026-06-15-db-restore-drill-plan.json",
    hostedPublicRouteEvidence: "docs/evidence/hosted-api/2026-06-15-public-route-probes.md"
  },
  docsKeys: ["platformDocs", "verificationDocs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

const summary = summarizeHostedApiReadiness(hostedApiReadinessItems);
const validationBlockers = validateHostedApiReadiness(hostedApiReadinessItems);
const itemIds = hostedApiReadinessItems.map((item) => item.id);
const evidenceArtifactRefs = hostedApiReadinessItems.flatMap((item) => item.evidenceArtifactRefs);
const missingEvidenceArtifactRefs = evidenceArtifactRefs.filter((ref) => !existsSync(ref));

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 2),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 2),
  checkExact("register", "live-proof-attached-count", summary.liveProofAttached, 2),
  checkExact("register", "partial-live-proof-count", summary.partialLiveProof, 2),
  checkExact("register", "protection-blocked-count", summary.protectionBlocked, 0),
  checkExact("register", "hosted-db-required-count", summary.hostedDbRequired, 5),
  checkExact("register", "public-route-proof-required-count", summary.publicRouteProofRequired, 3),
  checkExact("register", "hosted-token-required-count", summary.hostedTokenVerificationRequired, 3),
  checkExact("register", "backup-policy-required-count", summary.backupPolicyRequired, 2),
  checkExact("register", "repo-local-contract-proof-count", summary.repoLocalContractProofs, 2),
  checkExact("register", "live-hosted-proof-required-count", summary.liveHostedProofRequired, 2),
  checkExact("register", "live-hosted-proof-attached-count", summary.liveHostedProofAttached, 2),
  checkExact("register", "partial-live-hosted-proof-count", summary.partialLiveHostedProofs, 2),
  checkExact("register", "protection-blocked-proof-count", summary.protectionBlockedProofs, 0),
  checkExact("register", "live-proof-claim-count", summary.liveProofClaims, 2),
  checkExact("register", "route-contract-count", summary.routeContracts, 5),
  checkExact("register", "required-env-var-count", summary.requiredEnvVars, 13),
  checkExact("register", "no-env-sync-proof-claim", summary.envSyncProofs, 0),
  checkExact("register", "hosted-db-proof-count", summary.hostedDbProofs, 2),
  checkExact("register", "public-route-proof-count", summary.publicRouteProofs, 2),
  checkExact("register", "no-hosted-token-proof-claim", summary.hostedTokenVerificationProofs, 0),
  checkExact("register", "no-backup-policy-claim", summary.backupPolicies, 0),
  checkExact("register", "deployment-protection-bypass-count", summary.deploymentProtectionBypasses, 1),
  checkExact("register", "evidence-artifact-count", summary.evidenceArtifacts, 10),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-real-orders", summary.realOrdersEnabled, 0),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkMinimum("register", "source-signal-count", summary.sourceSignals, 25),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-hosted-api-readiness-ids", itemIds, [
    "vercel-project-link",
    "serverless-api-route-contract",
    "deployment-protection-boundary",
    "hosted-env-sync",
    "hosted-postgres-connectivity",
    "public-db-backed-route-proof",
    "hosted-clerk-token-verification",
    "backup-recovery-policy"
  ]),
  checkItemsHaveKeys("register", "hosted-api-readiness-item-shape", hostedApiReadinessItems, [
    "id",
    "label",
    "lane",
    "status",
    "proofScope",
    "routeIds",
    "envVarNames",
    "evidenceArtifactRefs",
    "requiredSourceSignals",
    "requiresHostedDb",
    "requiresPublicRouteProof",
    "requiresHostedTokenVerification",
    "requiresBackupPolicy",
    "liveProofClaimed",
    "environmentSynced",
    "hostedDbConnected",
    "publicRouteProofAttached",
    "hostedTokenVerificationAttached",
    "backupPolicyAttached",
    "deploymentProtectionBypassed",
    "externalNetworkCalls",
    "realOrdersEnabled",
    "liveProviderCalls",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ], {
    readyDetail: `Validated ${hostedApiReadinessItems.length} executable hosted API readiness item shapes.`,
    missingPrefix: "Missing hosted API readiness fields"
  }),
  {
    id: "hosted-api-evidence-artifacts-exist",
    lane: "evidence",
    passed: missingEvidenceArtifactRefs.length === 0,
    detail:
      missingEvidenceArtifactRefs.length === 0
        ? `Resolved ${evidenceArtifactRefs.length} hosted API evidence artifact refs.`
        : `Missing hosted API evidence artifacts: ${missingEvidenceArtifactRefs.join(", ")}`
  },
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "hosted-api-readiness-tests",
    sourceKeys: ["readinessTest"],
    signals: [
      "tracks Vercel and hosted DB proof readiness without claiming public production proof",
      "covers hosted env, routes, deployment protection, token verification, and backup policy explicitly",
      "flags unsafe hosted proof claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "vercel-source",
    id: "vercel-serverless-source-signals",
    sourceKeys: ["vercel", "vercelApiHandler", "vercelRobotsHandler"],
    signals: [
      '"buildCommand": "npm run build"',
      '"functions"',
      '"api/[...path].js"',
      '"excludeFiles"',
      "docs/evidence/generated-card-comparisons/**",
      "node_modules/puppeteer/**",
      "node_modules/wrangler/**",
      '"source": "/api/artifacts/(.*)"',
      '"destination": "/api/artifacts?objectKey=$1"',
      '"source": "/api/(.*)"',
      '"destination": "/api/$1"',
      '"source": "/oauth/callback"',
      '"destination": "/api/oauth/callback"',
      "handleApiRequest",
      "PRODUCTION_ROBOTS"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-env-and-db-source-signals",
    sourceKeys: ["envExample", "postgresHttpDoctor", "accountDoctor", "hostedVercelEnvInventory", "hostedVercelEnvRepair"],
    signals: [
      "CUSTOMCARD_API_RUNTIME=contract",
      "DATABASE_URL=",
      "AUTH_SESSION_SECRET=",
      "CLERK_JWT_KEY=",
      "CLERK_AUTHORIZED_PARTIES=",
      "CLERK_ISSUER=",
      "CLERK_AUDIENCE=",
      "CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled",
      "CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled",
      "customcard-hosted-vercel-env-inventory",
      "customcard-hosted-vercel-env-repair",
      "CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_APPLY=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_ALLOW_PARTIAL=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled",
      "CUSTOMCARD_HOSTED_API_ENV",
      "CUSTOMCARD_VERCEL_ENV_TARGET",
      "vercel env ls --format=json",
      "valuesRedacted: true"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-vercel-env-inventory-scripted",
    sourceKeys: ["packageJson", "hostedVercelEnvInventory", "hostedReadinessData", "readinessTest"],
    signals: [
      '"hosted:env:inventory": "node scripts/hosted-vercel-env-inventory.mjs"',
      "customcard-hosted-vercel-env-inventory",
      "CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled",
      "CUSTOMCARD_HOSTED_API_ENV",
      "CUSTOMCARD_VERCEL_ENV_TARGET",
      "CUSTOMCARD_API_RUNTIME",
      "DATABASE_URL",
      "CLERK_JWT_KEY",
      "IDEMPOTENCY_KEY_TTL_HOURS",
      "Sanitized npm run hosted:env:inventory output",
      "environmentSynced: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-vercel-env-repair-scripted",
    sourceKeys: ["packageJson", "hostedVercelEnvRepair", "hostedReadinessData", "readinessTest"],
    signals: [
      '"hosted:env:repair": "node scripts/hosted-vercel-env-repair.mjs"',
      "customcard-hosted-vercel-env-repair",
      "CUSTOMCARD_HOSTED_ENV_REPAIR=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_APPLY=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_ALLOW_PARTIAL=enabled",
      "CUSTOMCARD_HOSTED_ENV_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled",
      "CLERK_ISSUER",
      "CLERK_AUDIENCE",
      "IDEMPOTENCY_KEY_TTL_HOURS",
      "valuesRedacted: true",
      "environmentSynced: false",
      "Sanitized npm run hosted:env:repair output"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-vercel-env-repair-plan-evidence",
    sourceKeys: ["hostedVercelEnvRepairPlanEvidence", "hostedReadinessData", "readinessTest"],
    signals: [
      "customcard-hosted-vercel-env-repair",
      "\"status\": \"blocked\"",
      "\"applyEnabled\": false",
      "\"valuesRedacted\": true",
      "\"CLERK_ISSUER\"",
      "\"CLERK_AUDIENCE\"",
      "\"IDEMPOTENCY_KEY_TTL_HOURS\"",
      "\"valueSupplied\": false",
      "\"repairApplied\": false",
      "operator-supplied values before apply"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-vercel-env-partial-ttl-repair-evidence",
    sourceKeys: ["hostedVercelEnvRepairPartialTtlEvidence", "hostedReadinessData", "readinessTest"],
    signals: [
      "customcard-hosted-vercel-env-repair",
      "\"status\": \"blocked\"",
      "\"applyEnabled\": true",
      "\"partialApplyEnabled\": true",
      "\"valuesRedacted\": true",
      "\"IDEMPOTENCY_KEY_TTL_HOURS\"",
      "\"exitCode\": 0",
      "\"partialRepairApplied\": true",
      "\"remainingUnappliedRepairKeys\"",
      "CLERK_ISSUER",
      "CLERK_AUDIENCE"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-vercel-env-inventory-evidence",
    sourceKeys: ["hostedVercelEnvInventoryEvidence", "hostedReadinessData", "readinessTest"],
    signals: [
      "customcard-hosted-vercel-env-inventory",
      "\"status\": \"blocked\"",
      "\"valuesRedacted\": true",
      "\"CUSTOMCARD_API_RUNTIME\"",
      "\"DATABASE_URL\"",
      "\"CLERK_JWT_KEY\"",
      "\"CLERK_ISSUER\"",
      "\"present\": false",
      "CLERK_ISSUER, CLERK_AUDIENCE, and IDEMPOTENCY_KEY_TTL_HOURS",
      "environmentSynced: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-vercel-env-after-ttl-repair-inventory-evidence",
    sourceKeys: ["hostedVercelEnvInventoryAfterTtlRepairEvidence", "hostedReadinessData", "readinessTest"],
    signals: [
      "customcard-hosted-vercel-env-inventory",
      "\"status\": \"blocked\"",
      "\"valuesRedacted\": true",
      "\"CLERK_ISSUER\"",
      "\"CLERK_AUDIENCE\"",
      "\"IDEMPOTENCY_KEY_TTL_HOURS\"",
      "\"present\": true",
      "Missing hosted env keys: CLERK_ISSUER, CLERK_AUDIENCE.",
      "\"idempotencyConfigured\": true",
      "\"environmentSynced\": false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-auth",
    id: "hosted-clerk-public-config-probe-scripted",
    sourceKeys: ["packageJson", "hostedClerkPublicConfigProbe", "hostedReadinessData", "readinessTest"],
    signals: [
      '"hosted:clerk:public-config": "node scripts/hosted-clerk-public-config-probe.mjs"',
      "customcard-hosted-clerk-public-config-probe",
      "CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE",
      "VITE_CLERK_PUBLISHABLE_KEY",
      "pk_test",
      "pk_live",
      "valuesRedacted: true",
      "productionPublicClerkReady",
      "Hosted public app bundle Clerk pk_live proof",
      "hostedTokenVerificationAttached: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-auth",
    id: "hosted-clerk-public-config-probe-evidence",
    sourceKeys: ["hostedClerkPublicConfigProbeEvidence", "hostedReadinessData", "readinessTest"],
    signals: [
      "customcard-hosted-clerk-public-config-probe",
      "\"status\": \"blocked\"",
      "\"targetEnvironment\": \"production\"",
      "\"valuesRedacted\": true",
      "\"kind\": \"test\"",
      "\"productionPublicClerkReady\": false",
      "\"testKeyDetected\": true",
      "\"liveKeyDetected\": false",
      "https://model-bluejay-21.clerk.accounts.dev",
      "Production hosted public app bundle must not ship a Clerk pk_test publishable key.",
      "Production hosted public app bundle must ship a Clerk pk_live publishable key."
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-auth",
    id: "hosted-clerk-config-repair-scripted",
    sourceKeys: ["packageJson", "hostedClerkConfigRepair", "hostedReadinessData", "readinessTest"],
    signals: [
      '"hosted:clerk:repair": "node scripts/hosted-clerk-config-repair.mjs"',
      "customcard-hosted-clerk-config-repair",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_APPLY=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled",
      "CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PUBLIC_KEY_REPLACE=enabled",
      "VITE_CLERK_PUBLISHABLE_KEY",
      "pk_live",
      "derivedIssuerCandidate",
      "Sanitized npm run hosted:clerk:repair output",
      "productionReadyClaimed: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-auth",
    id: "hosted-clerk-config-repair-plan-evidence",
    sourceKeys: ["hostedClerkConfigRepairPlanEvidence", "hostedReadinessData", "readinessTest"],
    signals: [
      "customcard-hosted-clerk-config-repair",
      "\"status\": \"blocked\"",
      "\"applyEnabled\": false",
      "\"mutationsEnabled\": false",
      "\"valuesRedacted\": true",
      "\"publishableKeySupplied\": false",
      "\"publishableKeyKind\": \"unknown\"",
      "\"audienceSupplied\": false",
      "\"testKeyDetected\": true",
      "\"liveKeyDetected\": false",
      "\"VITE_CLERK_PUBLISHABLE_KEY\"",
      "\"CLERK_ISSUER\"",
      "\"CLERK_AUDIENCE\"",
      "\"redeployRequired\": true",
      "\"productionReadyClaimed\": false",
      "Production Clerk config repair requires a pk_live publishable key."
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-auth",
    id: "hosted-clerk-route-probe-scripted",
    sourceKeys: ["packageJson", "hostedClerkRouteProbe", "readinessTest"],
    signals: [
      '"hosted:auth:probe": "node scripts/hosted-clerk-route-probe.mjs"',
      "customcard-hosted-clerk-route-probe",
      "CUSTOMCARD_HOSTED_AUTH_PROBE=enabled",
      "CUSTOMCARD_HOSTED_CUSTOMER_JWT",
      "CUSTOMCARD_HOSTED_ADMIN_JWT",
      "CUSTOMCARD_HOSTED_API_ENV",
      "CUSTOMCARD_QA_API_BASE_URL",
      "CUSTOMCARD_PRODUCTION_API_BASE_URL",
      "/api/admin/readiness",
      "/api/customer/bootstrap",
      "wrong-role",
      "auth-required",
      "hostedTokenVerificationAttached: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-mutation",
    id: "hosted-mutation-audit-probe-scripted",
    sourceKeys: ["packageJson", "hostedMutationAuditProbe", "readinessTest"],
    signals: [
      '"hosted:mutation:probe": "node scripts/hosted-mutation-audit-probe.mjs"',
      "customcard-hosted-mutation-audit-probe",
      "CUSTOMCARD_HOSTED_MUTATION_PROBE=enabled",
      "CUSTOMCARD_HOSTED_MUTATION_PROBE_ACKNOWLEDGE_LIVE_WRITES=enabled",
      "CUSTOMCARD_HOSTED_CUSTOMER_JWT",
      "CUSTOMCARD_HOSTED_ADMIN_JWT",
      "/api/render-packets",
      "idempotency-key-required",
      "idempotency-conflict",
      "auditRowsIncreased",
      "destructiveLiveMutations: false",
      "Sanitized npm run hosted:mutation:probe output"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "backup-policy",
    id: "hosted-db-restore-drill-scripted",
    sourceKeys: ["packageJson", "hostedDbRestoreDrill", "readinessTest"],
    signals: [
      '"hosted:db:restore:drill": "node scripts/hosted-db-restore-drill.mjs"',
      "customcard-hosted-db-restore-drill",
      "CUSTOMCARD_HOSTED_DB_RESTORE_DRILL=enabled",
      "CUSTOMCARD_RESTORE_DATABASE_URL",
      "CUSTOMCARD_BACKUP_RETENTION_DAYS",
      "CUSTOMCARD_BACKUP_RPO_MINUTES",
      "CUSTOMCARD_BACKUP_RTO_MINUTES",
      "CUSTOMCARD_RESTORE_POINT_IN_TIME",
      "requiredTablesPresent",
      "requiredIndexesPresent",
      "Sanitized npm run hosted:db:restore:drill output"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "backup-policy",
    id: "hosted-db-restore-drill-plan-evidence",
    sourceKeys: ["hostedReadinessData", "hostedDbRestoreDrillPlanEvidence"],
    signals: [
      "2026-06-15-db-restore-drill-plan.json",
      "customcard-hosted-db-restore-drill",
      "\"status\": \"blocked\"",
      "CUSTOMCARD_RESTORE_DATABASE_URL is required.",
      "\"retentionDays\": 14",
      "\"rpoMinutes\": 15",
      "\"rtoMinutes\": 60",
      "\"restorePointAttached\": true",
      "\"destructiveLiveMutations\": false",
      "\"realOrdersEnabled\": false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "backup-policy",
    id: "hosted-migration-rollback-plan-scripted",
    sourceKeys: ["packageJson", "hostedMigrationRollbackPlanDoctor", "hostedMigrationRollbackPlan", "readinessTest"],
    signals: [
      '"hosted:rollback:plan:doctor": "node scripts/hosted-migration-rollback-plan-doctor.mjs"',
      "customcard-hosted-migration-rollback-plan-doctor",
      "# Hosted Migration Rollback Plan",
      "Forward-only migrations",
      "Restore-before-switch",
      "Production URL separation",
      "Reviewer Seed Cleanup",
      "Completion Evidence",
      "Executed hosted rollback drill: no",
      "hosted:rollback:plan:doctor",
      "Executed rollback drill output"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "evidence",
    id: "hosted-public-route-probe-evidence-boundary",
    sourceKeys: ["hostedPublicRouteEvidence"],
    signals: [
      "Hosted API Public Route Probes",
      "https://customcard-three.vercel.app",
      "GET /` returned HTTP 200",
      "runtime.mode: \"postgres\"",
      "admin-artifact-bucket",
      "not authenticated hosted Clerk token verification evidence"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-hosted-surfaces",
    sourceKeys: ["adminApp", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "Hosted API proof readiness",
      "summarizeHostedApiReadiness",
      "hostedApiReadiness",
      "publicRouteProofs",
      "hostedDbProofs"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "deployment-evidence",
    id: "deployment-evidence-boundary",
    sourceKeys: ["deploymentEvidence"],
    signals: [
      "2026-06-11 Vercel + Neon Update",
      "Vercel Marketplace Neon Free resource",
      "Public `GET /` returned HTTP 200",
      "Public `GET /api/health` returned HTTP 200",
      "runtime.mode=postgres"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["hosted Postgres runtime proof is attached", "No executed production Clerk JWT"], { id: "hosted-api-readiness-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "hosted-api-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Vercel project link",
    "DATABASE_URL configured proof",
    "Keep hosted health runtime=postgres capture current",
    "Hosted Clerk customer JWT probe",
    "Hosted backup policy"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
  items: summary.total,
  repoLocalReady: summary.repoLocalReady,
  evidenceMissing: summary.evidenceMissing,
  liveProofAttached: summary.liveProofAttached,
  partialLiveProof: summary.partialLiveProof,
  protectionBlocked: summary.protectionBlocked,
  hostedDbRequired: summary.hostedDbRequired,
  publicRouteProofRequired: summary.publicRouteProofRequired,
  hostedTokenVerificationRequired: summary.hostedTokenVerificationRequired,
  backupPolicyRequired: summary.backupPolicyRequired,
  repoLocalContractProofs: summary.repoLocalContractProofs,
  liveHostedProofRequired: summary.liveHostedProofRequired,
  liveHostedProofAttached: summary.liveHostedProofAttached,
  partialLiveHostedProofs: summary.partialLiveHostedProofs,
  protectionBlockedProofs: summary.protectionBlockedProofs,
  liveProofClaims: summary.liveProofClaims,
  routeContracts: summary.routeContracts,
  requiredEnvVars: summary.requiredEnvVars,
  envSyncProofs: summary.envSyncProofs,
  hostedDbProofs: summary.hostedDbProofs,
  publicRouteProofs: summary.publicRouteProofs,
  hostedTokenVerificationProofs: summary.hostedTokenVerificationProofs,
  backupPolicies: summary.backupPolicies,
  deploymentProtectionBypasses: summary.deploymentProtectionBypasses,
  evidenceArtifacts: summary.evidenceArtifacts,
  externalNetworkCalls: summary.externalNetworkCalls,
  realOrdersEnabled: summary.realOrdersEnabled,
  liveProviderCalls: summary.liveProviderCalls
}, checks);
