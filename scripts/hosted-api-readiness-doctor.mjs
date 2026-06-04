import { readFileSync } from "node:fs";
import {
  hostedApiReadinessItems,
  summarizeHostedApiReadiness,
  validateHostedApiReadiness
} from "../src/hostedApiReadinessData.mjs";

const files = {
  readinessTest: "src/hostedApiReadiness.test.ts",
  deploymentEvidence: "docs/deployment-evidence.md",
  platformDocs: "docs/platform-expansion-design.md",
  verificationDocs: "docs/verification.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  vercel: "vercel.json",
  vercelApiHandler: "api/[...path].mjs",
  envExample: "infra/env/.env.example",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  adminApp: "src/App.tsx",
  postgresHttpDoctor: "scripts/postgres-api-http-doctor.mjs",
  accountDoctor: "scripts/account-auth-doctor.mjs"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

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
  checkItemsShape("register", "hosted-api-readiness-item-shape", hostedApiReadinessItems),
  checkIncludes("tests", "hosted-api-readiness-tests", contents.readinessTest, [
    "tracks Vercel and hosted DB proof readiness without claiming public production proof",
    "covers hosted env, routes, deployment protection, token verification, and backup policy explicitly",
    "flags unsafe hosted proof claims"
  ]),
  checkIncludes("vercel-source", "vercel-serverless-source-signals", `${contents.vercel}\n${contents.vercelApiHandler}`, [
    '"buildCommand": "npm run build"',
    '"source": "/api/(.*)"',
    '"destination": "/api/$1"',
    "handleApiRequest"
  ]),
  checkIncludes("hosted-env", "hosted-env-and-db-source-signals", `${contents.envExample}\n${contents.postgresHttpDoctor}\n${contents.accountDoctor}`, [
    "CUSTOMCARD_API_RUNTIME=contract",
    "DATABASE_URL=",
    "CUSTOMCARD_CUSTOMER_SESSION_TOKEN=",
    "CUSTOMCARD_ADMIN_SESSION_TOKEN=",
    "AUTH_SESSION_SECRET=",
    "CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled",
    "CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled"
  ]),
  checkIncludes("surfaces", "admin-api-hosted-surfaces", `${contents.adminApp}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Hosted API proof readiness",
    "summarizeHostedApiReadiness",
    "hostedApiReadiness",
    "publicRouteProofs",
    "hostedDbProofs"
  ]),
  checkIncludes("deployment-evidence", "deployment-evidence-boundary", contents.deploymentEvidence, [
    "Vercel",
    "Deployment URL",
    "HTTP 401 from Vercel deployment protection",
    "no environment variables",
    "hosted DB doctor run"
  ]),
  checkIncludes("docs", "hosted-api-readiness-docs", `${contents.platformDocs}\n${contents.verificationDocs}`, [
    "Hosted API proof readiness",
    "`src/hostedApiReadiness.ts`",
    "`npm run hosted:api:doctor`",
    "not public DB-backed Vercel proof"
  ]),
  checkIncludes("ci", "hosted-api-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"hosted:api:doctor": "node scripts/hosted-api-readiness-doctor.mjs"',
    "Validate hosted API proof readiness",
    "npm run hosted:api:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Vercel project link",
    "DATABASE_URL configured proof",
    "Hosted /api/admin/readiness runtime=postgres response",
    "Hosted customer token probe",
    "Hosted backup policy"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-hosted-api-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      repoLocalReady: summary.repoLocalReady,
      evidenceMissing: summary.evidenceMissing,
      protectionBlocked: summary.protectionBlocked,
      hostedDbRequired: summary.hostedDbRequired,
      publicRouteProofRequired: summary.publicRouteProofRequired,
      hostedTokenVerificationRequired: summary.hostedTokenVerificationRequired,
      backupPolicyRequired: summary.backupPolicyRequired,
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
      liveProviderCalls: summary.liveProviderCalls,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkMinimum(lane, id, actual, minimum) {
  return {
    id,
    lane,
    passed: actual >= minimum,
    detail: actual >= minimum ? `${actual} is at least ${minimum}.` : `${actual} is below required minimum ${minimum}.`
  };
}

function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

function checkNoBlockers(lane, id, blockers) {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Executable hosted API readiness contract has no blockers." : blockers.join(" ")
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "routeIds",
    "envVarNames",
    "requiredSourceSignals",
    "requiresHostedDb",
    "requiresPublicRouteProof",
    "requiresHostedTokenVerification",
    "requiresBackupPolicy",
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
  ];
  const missing = [];
  for (const item of items) {
    for (const key of requiredKeys) {
      if (!(key in item)) missing.push(`${item.id ?? "unknown"}.${key}`);
    }
  }
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${items.length} executable hosted API readiness item shapes.`
        : `Missing hosted API readiness fields: ${missing.join(", ")}`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required hosted API readiness signals.`
        : `Missing hosted API readiness signals: ${missing.join(", ")}`
  };
}

function checkArrayIncludes(lane, id, values, required) {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required hosted API readiness signals.`
        : `Missing hosted API readiness signals: ${missing.join(", ")}`
  };
}
