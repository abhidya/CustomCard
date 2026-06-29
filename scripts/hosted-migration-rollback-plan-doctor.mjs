import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  buildDoctorReport,
  checkAbsent,
  checkIncludes,
  runDoctorReport
} from "./doctor-harness.mjs";

const defaultFiles = Object.freeze({
  rollbackPlan: "docs/hosted-migration-rollback-plan.md",
  migrateScript: "scripts/migrate.mjs",
  restoreDrill: "scripts/hosted-db-restore-drill.mjs",
  envInventory: "scripts/hosted-vercel-env-inventory.mjs",
  mutationProbe: "scripts/hosted-mutation-audit-probe.mjs",
  hostedReadiness: "src/hostedApiReadinessData.mjs",
  reviewerSeedReadiness: "src/reviewerDbSeedReadinessData.mjs",
  migrationSql: "infra/migrations/001_initial_schema.sql"
});

const requiredPlanSignals = Object.freeze([
  "# Hosted Migration Rollback Plan",
  "Forward-only migrations",
  "Restore-before-switch",
  "Production URL separation",
  "No destructive live mutations without explicit operator approval",
  "Preserve append-only `audit_log` evidence",
  "Rollback Decision Tree",
  "Restore-Switch Procedure",
  "Reviewer Seed Cleanup",
  "Completion Evidence",
  "Rollback plan attached: yes",
  "Executed hosted rollback drill: no"
]);

const requiredMigrateSignals = Object.freeze([
  "CREATE TABLE IF NOT EXISTS schema_migrations",
  "await client.query(\"BEGIN\")",
  "await client.query(\"ROLLBACK\")",
  "await client.query(\"COMMIT\")",
  "INSERT INTO schema_migrations"
]);

const requiredRestoreSignals = Object.freeze([
  "--confirm-hosted-db-restore-drill",
  "CUSTOMCARD_RESTORE_DATABASE_URL",
  "must point at a restored clone",
  "requiredTablesPresent",
  "requiredIndexesPresent",
  "destructiveLiveMutations: false",
  "realOrdersEnabled: false",
  "externalVendorCalls: false"
]);

const requiredEnvInventorySignals = Object.freeze([
  "--confirm-hosted-env-inventory",
  "vercel env ls --format=json",
  "valuesRedacted: true",
  "environmentSynced: ready"
]);

const requiredReadinessSignals = Object.freeze([
  "Migration rollback plan",
  "backupPolicyAttached: false",
  "rollback-cleanup-drill",
  "Hosted rollback run",
  "Rollback audit entry",
  "destructiveLiveMutation: false"
]);

const requiredSchemaSignals = Object.freeze([
  "CREATE TABLE audit_log",
  "CREATE TABLE data_requests",
  "CREATE TABLE idempotency_keys",
  "schema_migrations"
]);

export function buildHostedMigrationRollbackPlanReport({
  files = defaultFiles,
  fileContents = readFiles(files)
} = {}) {
  const text = (keys) => keys.map((key) => fileContents[key] ?? "").join("\n");
  const checks = [
    checkIncludes("plan", "rollback-plan-required-sections", text(["rollbackPlan"]), requiredPlanSignals),
    checkAbsent("plan", "rollback-plan-no-secret-placeholders", text(["rollbackPlan"]), [
      "postgres://user:password",
      "CLERK_SECRET_KEY=",
      "CUSTOMCARD_HOSTED_CUSTOMER_JWT=ey",
      "CUSTOMCARD_HOSTED_ADMIN_JWT=ey"
    ]),
    checkIncludes("migration-runner", "migration-runner-transactional-forward-only", text(["migrateScript"]), requiredMigrateSignals),
    checkIncludes("restore-drill", "restore-drill-restored-clone-guardrails", text(["restoreDrill"]), requiredRestoreSignals),
    checkIncludes("env-inventory", "env-inventory-redacted-and-scoped", text(["envInventory"]), requiredEnvInventorySignals),
    checkIncludes("readiness", "readiness-requires-rollback-evidence-without-claiming-it", text(["hostedReadiness", "reviewerSeedReadiness"]), requiredReadinessSignals),
    checkIncludes("schema", "schema-retains-audit-privacy-idempotency-tables", text(["migrationSql", "migrateScript"]), requiredSchemaSignals)
  ];

  return buildDoctorReport({
    service: "customcard-hosted-migration-rollback-plan-doctor",
    scope: "repo-local",
    rollbackPlanAttached: true,
    hostedRollbackExecuted: false,
    restoredCloneSwitchExecuted: false,
    destructiveLiveMutations: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    files: Object.values(files)
  }, checks);
}

function readFiles(files) {
  return Object.fromEntries(Object.entries(files).map(([key, file]) => [key, readFileSync(file, "utf8")]));
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
}

if (isCliEntrypoint()) {
  const report = buildHostedMigrationRollbackPlanReport();
  runDoctorReport({
    service: report.service,
    rollbackPlanAttached: report.rollbackPlanAttached,
    hostedRollbackExecuted: report.hostedRollbackExecuted,
    restoredCloneSwitchExecuted: report.restoredCloneSwitchExecuted,
    destructiveLiveMutations: report.destructiveLiveMutations,
    liveProviderCalls: report.liveProviderCalls,
    realOrdersEnabled: report.realOrdersEnabled,
    files: report.files
  }, report.checks);
}
