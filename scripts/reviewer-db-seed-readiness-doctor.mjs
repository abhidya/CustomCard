import {
  reviewerDbSeedReadinessItems,
  summarizeReviewerDbSeedReadiness,
  validateReviewerDbSeedReadiness
} from "../src/reviewerDbSeedReadinessData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkItemsHaveKeys,
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
  id: "reviewer-db-seed",
  service: "customcard-reviewer-db-seed-readiness-doctor",
  npmScript: "reviewer:db:seed:doctor",
  scriptPath: "scripts/reviewer-db-seed-readiness-doctor.mjs",
  workflowLabel: "Validate reviewer DB seed readiness",
  docsTitle: "Reviewer DB seed readiness",
  readinessModule: "src/reviewerDbSeedReadiness.ts",
  files: {
    readinessTest: "src/reviewerDbSeedReadiness.test.ts",
    demoSeed: "src/demoSeed.ts",
    demoSeedScript: "scripts/demo-reset.mjs",
    apiRuntime: "scripts/api-runtime.mjs",
    postgresHttpDoctor: "scripts/postgres-api-http-doctor.mjs",
    hostedApiReadiness: "src/hostedApiReadinessData.mjs",
    hostedMigrationRollbackPlanDoctor: "scripts/hosted-migration-rollback-plan-doctor.mjs",
    hostedMigrationRollbackPlan: "docs/hosted-migration-rollback-plan.md",
    deploymentEvidence: "docs/deployment-evidence.md",
    platformDocs: "docs/platform-expansion-design.md",
    verificationDocs: "docs/verification.md",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    adminApp: "src/App.tsx",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    e2eCoverage: "src/e2eCoverageData.mjs",
    viteConfig: "vite.config.ts"
  },
  docsKeys: ["platformDocs", "verificationDocs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

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
  checkExact("register", "table-contract-count", summary.tableContracts, 15),
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
  checkItemsHaveKeys("register", "reviewer-db-seed-readiness-item-shape", reviewerDbSeedReadinessItems, [
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
  ], {
    readyDetail: `Validated ${reviewerDbSeedReadinessItems.length} executable reviewer DB seed readiness item shapes.`,
    missingPrefix: "Missing reviewer DB seed readiness fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "reviewer-db-seed-readiness-tests",
    sourceKeys: ["readinessTest"],
    signals: [
      "tracks hosted reviewer seed proof requirements without claiming hosted DB mutation evidence",
      "matches the demo seed plan tables, rows, SQL preview, and account-token contract",
      "flags unsafe hosted seed claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "seed-contract",
    id: "demo-seed-plan-and-sql-preview",
    sourceKeys: ["demoSeed", "demoSeedScript"],
    signals: [
      "buildDemoSeedPlan",
      "buildDemoSeedSqlPreview",
      "customcard-demo-seed",
      "rows: 18",
      "execute only against an isolated reviewer database",
      "realOrdersEnabled: false"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "token-contract",
    id: "account-token-source-signals",
    sourceKeys: ["apiRuntime", "postgresHttpDoctor"],
    signals: [
      "hashSessionToken",
      "CUSTOMCARD_CUSTOMER_SESSION_TOKEN",
      "CUSTOMCARD_ADMIN_SESSION_TOKEN",
      "wrong-role",
      "idempotency-key-required"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "hosted-proof-boundary",
    id: "hosted-proof-gap-signals",
    sourceKeys: ["hostedApiReadiness", "deploymentEvidence"],
    signals: [
      "hosted-clerk-token-verification",
      "Hosted idempotent mutation replay",
      "Hosted audit row count",
      "hosted Postgres runtime proof are now",
      "authenticated DB-backed mutation replay"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "rollback",
    id: "hosted-migration-rollback-plan-boundary",
    sourceKeys: ["packageJson", "hostedMigrationRollbackPlanDoctor", "hostedMigrationRollbackPlan", "readinessTest"],
    signals: [
      '"hosted:rollback:plan:doctor": "node scripts/hosted-migration-rollback-plan-doctor.mjs"',
      "customcard-hosted-migration-rollback-plan-doctor",
      "Reviewer Seed Cleanup",
      "Hosted rollback run",
      "Rollback audit entry",
      "Executed hosted rollback drill: no",
      "hosted:rollback:plan:doctor",
      "docs/hosted-migration-rollback-plan.md covers reviewer seed cleanup"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-reviewer-db-seed-surfaces",
    sourceKeys: ["adminApp", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "Reviewer DB seed readiness",
      "summarizeReviewerDbSeedReadiness",
      "reviewerDbSeedReadiness",
      "hostedSeedProofs",
      "hostedTokenProbeProofs"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "e2e",
    id: "reviewer-db-seed-e2e-matrix",
    sourceKeys: ["e2eCoverage"],
    signals: [
      "reviewer-db-seed-readiness",
      "Reviewer DB seed readiness",
      "npm run reviewer:db:seed:doctor",
      "Hosted seed proof remains unclaimed"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not hosted reviewer DB mutation or hosted Clerk JWT proof"], {
    id: "reviewer-db-seed-docs"
  }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "reviewer-db-seed-doctor-scripted-and-gated" }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "coverage",
    id: "reviewer-db-seed-coverage-config",
    sourceKeys: ["viteConfig"],
    signals: [
      "src/reviewerDbSeedReadiness.ts",
      "src/reviewerDbSeedReadinessData.mjs"
    ]
  }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Hosted reviewer database URL",
    "Hosted demo reset response",
    "Hosted admin readiness token probe",
    "Vercel env ls with required keys",
    "Hosted rollback run"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
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
  realOrdersEnabled: summary.realOrdersEnabled
}, checks);
