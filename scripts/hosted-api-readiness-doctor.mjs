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
    vercelAiCardGenerateHandler: "api/ai/card/generate.js",
    vercelAiChatRespondHandler: "api/ai/chat/respond.js",
    envExample: "infra/env/.env.example",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    adminApp: "src/App.tsx",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    postgresHttpDoctor: "scripts/postgres-api-http-doctor.mjs",
    accountDoctor: "scripts/account-auth-doctor.mjs"
  },
  docsKeys: ["platformDocs", "verificationDocs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

const summary = summarizeHostedApiReadiness(hostedApiReadinessItems);
const validationBlockers = validateHostedApiReadiness(hostedApiReadinessItems);
const itemIds = hostedApiReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 2),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 5),
  checkExact("register", "protection-blocked-count", summary.protectionBlocked, 1),
  checkExact("register", "hosted-db-required-count", summary.hostedDbRequired, 5),
  checkExact("register", "public-route-proof-required-count", summary.publicRouteProofRequired, 3),
  checkExact("register", "hosted-token-required-count", summary.hostedTokenVerificationRequired, 3),
  checkExact("register", "backup-policy-required-count", summary.backupPolicyRequired, 2),
  checkExact("register", "repo-local-contract-proof-count", summary.repoLocalContractProofs, 2),
  checkExact("register", "live-hosted-proof-required-count", summary.liveHostedProofRequired, 5),
  checkExact("register", "protection-blocked-proof-count", summary.protectionBlockedProofs, 1),
  checkExact("register", "no-live-proof-claim", summary.liveProofClaims, 0),
  checkExact("register", "route-contract-count", summary.routeContracts, 5),
  checkExact("register", "required-env-var-count", summary.requiredEnvVars, 6),
  checkExact("register", "no-env-sync-proof-claim", summary.envSyncProofs, 0),
  checkExact("register", "no-hosted-db-proof-claim", summary.hostedDbProofs, 0),
  checkExact("register", "no-public-route-proof-claim", summary.publicRouteProofs, 0),
  checkExact("register", "no-hosted-token-proof-claim", summary.hostedTokenVerificationProofs, 0),
  checkExact("register", "no-backup-policy-claim", summary.backupPolicies, 0),
  checkExact("register", "no-deployment-protection-bypass-claim", summary.deploymentProtectionBypasses, 0),
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
    "hosted-account-token-verification",
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
    sourceKeys: ["vercel", "vercelApiHandler", "vercelAiCardGenerateHandler", "vercelAiChatRespondHandler"],
    signals: [
      '"buildCommand": "npm run build"',
      '"source": "/api/(.*)"',
      '"destination": "/api/$1"',
      '"source": "/oauth/callback"',
      '"destination": "/api/oauth/callback"',
      "handleApiRequest"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-env",
    id: "hosted-env-and-db-source-signals",
    sourceKeys: ["envExample", "postgresHttpDoctor", "accountDoctor"],
    signals: [
      "CUSTOMCARD_API_RUNTIME=contract",
      "DATABASE_URL=",
      "CUSTOMCARD_CUSTOMER_SESSION_TOKEN=",
      "CUSTOMCARD_ADMIN_SESSION_TOKEN=",
      "AUTH_SESSION_SECRET=",
      "CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled",
      "CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled"
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
      "Vercel",
      "Deployment URL",
      "HTTP 401 from Vercel deployment protection",
      "no environment variables",
      "hosted DB doctor run"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not public DB-backed Vercel proof"], { id: "hosted-api-readiness-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "hosted-api-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Vercel project link",
    "DATABASE_URL configured proof",
    "Hosted /api/admin/readiness runtime=postgres response",
    "Hosted customer token probe",
    "Hosted backup policy"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
  items: summary.total,
  repoLocalReady: summary.repoLocalReady,
  evidenceMissing: summary.evidenceMissing,
  protectionBlocked: summary.protectionBlocked,
  hostedDbRequired: summary.hostedDbRequired,
  publicRouteProofRequired: summary.publicRouteProofRequired,
  hostedTokenVerificationRequired: summary.hostedTokenVerificationRequired,
  backupPolicyRequired: summary.backupPolicyRequired,
  repoLocalContractProofs: summary.repoLocalContractProofs,
  liveHostedProofRequired: summary.liveHostedProofRequired,
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
  externalNetworkCalls: summary.externalNetworkCalls,
  realOrdersEnabled: summary.realOrdersEnabled,
  liveProviderCalls: summary.liveProviderCalls
}, checks);
