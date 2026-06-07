import { readFileSync } from "node:fs";
import {
  reviewerDbSeedReadinessItems,
  summarizeReviewerDbSeedReadiness,
  validateReviewerDbSeedReadiness
} from "../src/reviewerDbSeedReadinessData.mjs";

const files = {
  readinessTest: "src/reviewerDbSeedReadiness.test.ts",
  demoSeed: "src/demoSeed.ts",
  demoSeedScript: "scripts/demo-reset.mjs",
  apiRuntime: "scripts/api-runtime.mjs",
  postgresHttpDoctor: "scripts/postgres-api-http-doctor.mjs",
  hostedApiReadiness: "src/hostedApiReadinessData.mjs",
  deploymentEvidence: "docs/deployment-evidence.md",
  platformDocs: "docs/platform-expansion-design.md",
  verificationDocs: "docs/verification.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  adminApp: "src/App.tsx",
  e2eCoverage: "src/e2eCoverageData.mjs",
  viteConfig: "vite.config.ts"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeReviewerDbSeedReadiness(reviewerDbSeedReadinessItems);
const validationBlockers = validateReviewerDbSeedReadiness(reviewerDbSeedReadinessItems);
const itemIds = reviewerDbSeedReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 3),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 5),
  checkExact("register", "hosted-database-required-count", summary.hostedDatabaseRequired, 5),
  checkExact("register", "hosted-seed-required-count", summary.hostedSeedExecutionRequired, 3),
  checkExact("register", "hosted-token-probe-required-count", summary.hostedTokenProbeRequired, 4),
  checkExact("register", "vercel-env-sync-required-count", summary.vercelEnvSyncRequired, 5),
  checkExact("register", "rollback-required-count", summary.rollbackRequired, 6),
  checkExact("register", "repo-local-contract-proof-count", summary.repoLocalContractProofs, 3),
  checkExact("register", "live-hosted-proof-required-count", summary.liveHostedProofRequired, 5),
  checkExact("register", "sql-preview-rollback-mode-count", summary.sqlPreviewRollbackModes, 3),
  checkExact("register", "hosted-rollback-mode-count", summary.hostedRollbackModes, 3),
  checkExact("register", "no-rollback-probe-mode-count", summary.noRollbackProbeModes, 2),
  checkExact("register", "sql-preview-only-count", summary.sqlPreviewOnly, 8),
  checkExact("register", "table-contract-count", summary.tableContracts, 14),
  checkExact("register", "route-contract-count", summary.routeContracts, 5),
  checkExact("register", "required-env-var-count", summary.requiredEnvVars, 6),
  checkExact("register", "no-hosted-seed-proof-claim", summary.hostedSeedProofs, 0),
  checkExact("register", "no-hosted-token-probe-claim", summary.hostedTokenProbeProofs, 0),
  checkExact("register", "no-vercel-env-sync-claim", summary.vercelEnvSyncProofs, 0),
  checkExact("register", "no-destructive-live-mutations", summary.destructiveLiveMutations, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkExact("register", "no-real-orders", summary.realOrdersEnabled, 0),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-reviewer-db-seed-readiness-ids", itemIds, [
    "reviewer-seed-plan-contract",
    "reviewer-session-token-contract",
    "seed-sql-preview-safety",
    "hosted-database-migration-prereq",
    "hosted-seed-execution-proof",
    "hosted-admin-customer-token-probe",
    "vercel-env-seed-sync",
    "rollback-cleanup-drill"
  ]),
  checkItemsShape("register", "reviewer-db-seed-readiness-item-shape", reviewerDbSeedReadinessItems),
  checkIncludes("tests", "reviewer-db-seed-readiness-tests", contents.readinessTest, [
    "tracks hosted reviewer seed proof requirements without claiming hosted DB mutation evidence",
    "matches the demo seed plan tables, rows, SQL preview, and account-token contract",
    "flags unsafe hosted seed claims"
  ]),
  checkIncludes("seed-contract", "demo-seed-plan-and-sql-preview", `${contents.demoSeed}\n${contents.demoSeedScript}`, [
    "buildDemoSeedPlan",
    "buildDemoSeedSqlPreview",
    "customcard-demo-seed",
    "rows: 17",
    "execute only against an isolated reviewer database",
    "realOrdersEnabled: false"
  ]),
  checkIncludes("token-contract", "account-token-source-signals", `${contents.apiRuntime}\n${contents.postgresHttpDoctor}`, [
    "hashSessionToken",
    "CUSTOMCARD_CUSTOMER_SESSION_TOKEN",
    "CUSTOMCARD_ADMIN_SESSION_TOKEN",
    "wrong-role",
    "idempotency-key-required"
  ]),
  checkIncludes("hosted-proof-boundary", "hosted-proof-gap-signals", `${contents.hostedApiReadiness}\n${contents.deploymentEvidence}`, [
    "hosted-account-token-verification",
    "hosted DB doctor run",
    "no environment variables",
    "DB-backed API access are not yet complete"
  ]),
  checkIncludes("surfaces", "admin-api-reviewer-db-seed-surfaces", `${contents.adminApp}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Reviewer DB seed readiness",
    "summarizeReviewerDbSeedReadiness",
    "reviewerDbSeedReadiness",
    "hostedSeedProofs",
    "hostedTokenProbeProofs"
  ]),
  checkIncludes("e2e", "reviewer-db-seed-e2e-matrix", contents.e2eCoverage, [
    "reviewer-db-seed-readiness",
    "Reviewer DB seed readiness",
    "npm run reviewer:db:seed:doctor",
    "Hosted seed proof remains unclaimed"
  ]),
  checkIncludes("docs", "reviewer-db-seed-docs", `${contents.platformDocs}\n${contents.verificationDocs}`, [
    "Reviewer DB seed readiness",
    "`src/reviewerDbSeedReadiness.ts`",
    "`npm run reviewer:db:seed:doctor`",
    "not hosted reviewer DB mutation or hosted account-token proof"
  ]),
  checkIncludes("ci", "reviewer-db-seed-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"reviewer:db:seed:doctor": "node scripts/reviewer-db-seed-readiness-doctor.mjs"',
    "Validate reviewer DB seed readiness",
    "npm run reviewer:db:seed:doctor"
  ]),
  checkIncludes("coverage", "reviewer-db-seed-coverage-config", contents.viteConfig, [
    "src/reviewerDbSeedReadiness.ts",
    "src/reviewerDbSeedReadinessData.mjs"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Hosted reviewer database URL",
    "Hosted demo reset response",
    "Hosted admin readiness token probe",
    "Vercel env ls with required keys",
    "Hosted rollback run"
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
      service: "customcard-reviewer-db-seed-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      repoLocalReady: summary.repoLocalReady,
      evidenceMissing: summary.evidenceMissing,
      hostedDatabaseRequired: summary.hostedDatabaseRequired,
      hostedSeedExecutionRequired: summary.hostedSeedExecutionRequired,
      hostedTokenProbeRequired: summary.hostedTokenProbeRequired,
      vercelEnvSyncRequired: summary.vercelEnvSyncRequired,
      rollbackRequired: summary.rollbackRequired,
      repoLocalContractProofs: summary.repoLocalContractProofs,
      liveHostedProofRequired: summary.liveHostedProofRequired,
      sqlPreviewRollbackModes: summary.sqlPreviewRollbackModes,
      hostedRollbackModes: summary.hostedRollbackModes,
      noRollbackProbeModes: summary.noRollbackProbeModes,
      sqlPreviewOnly: summary.sqlPreviewOnly,
      tableContracts: summary.tableContracts,
      routeContracts: summary.routeContracts,
      requiredEnvVars: summary.requiredEnvVars,
      hostedSeedProofs: summary.hostedSeedProofs,
      hostedTokenProbeProofs: summary.hostedTokenProbeProofs,
      vercelEnvSyncProofs: summary.vercelEnvSyncProofs,
      destructiveLiveMutations: summary.destructiveLiveMutations,
      externalNetworkCalls: summary.externalNetworkCalls,
      liveProviderCalls: summary.liveProviderCalls,
      realOrdersEnabled: summary.realOrdersEnabled,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

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
    detail: blockers.length === 0 ? "Executable reviewer DB seed readiness contract has no blockers." : blockers.join("; ")
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
        ? `Found ${required.length} required reviewer DB seed readiness signals.`
        : `Missing reviewer DB seed readiness signals: ${missing.join(", ")}`
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
        ? `Found ${required.length} required reviewer DB seed readiness signals.`
        : `Missing reviewer DB seed readiness signals: ${missing.join(", ")}`
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "proofScope",
    "tableNames",
    "envVarNames",
    "routeIds",
    "requiredSourceSignals",
    "requiresHostedDatabase",
    "requiresHostedSeedExecution",
    "requiresHostedTokenProbe",
    "requiresVercelEnvSync",
    "rollbackRequired",
    "rollbackMode",
    "sqlPreviewOnly",
    "hostedSeedExecuted",
    "hostedTokenProbeAttached",
    "vercelEnvSynced",
    "destructiveLiveMutation",
    "externalNetworkCalls",
    "liveProviderCalls",
    "realOrdersEnabled",
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
        ? `Validated ${items.length} executable reviewer DB seed readiness item shapes.`
        : `Missing reviewer DB seed readiness fields: ${missing.join(", ")}`
  };
}
