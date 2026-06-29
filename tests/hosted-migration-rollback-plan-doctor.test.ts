import { describe, expect, it } from "vitest";
import { buildHostedMigrationRollbackPlanReport } from "../scripts/hosted-migration-rollback-plan-doctor.mjs";

const completeFiles = {
  rollbackPlan: `
# Hosted Migration Rollback Plan
Forward-only migrations
Restore-before-switch
Production URL separation
No destructive live mutations without explicit operator approval
Preserve append-only \`audit_log\` evidence
Rollback Decision Tree
Restore-Switch Procedure
Reviewer Seed Cleanup
Completion Evidence
Rollback plan attached: yes
Executed hosted rollback drill: no
`,
  migrateScript: `
CREATE TABLE IF NOT EXISTS schema_migrations
await client.query("BEGIN")
await client.query("ROLLBACK")
await client.query("COMMIT")
INSERT INTO schema_migrations
`,
  restoreDrill: `
--confirm-hosted-db-restore-drill
CUSTOMCARD_RESTORE_DATABASE_URL
must point at a restored clone
requiredTablesPresent
requiredIndexesPresent
destructiveLiveMutations: false
realOrdersEnabled: false
externalVendorCalls: false
`,
  envInventory: `
--confirm-hosted-env-inventory
vercel env ls --format=json
valuesRedacted: true
environmentSynced: ready
`,
  hostedReadiness: `
Migration rollback plan
backupPolicyAttached: false
`,
  reviewerSeedReadiness: `
rollback-cleanup-drill
Hosted rollback run
Rollback audit entry
destructiveLiveMutation: false
`,
  migrationSql: `
CREATE TABLE audit_log
CREATE TABLE data_requests
CREATE TABLE idempotency_keys
`
};

describe("hosted migration rollback plan doctor", () => {
  it("validates the repo-local rollback plan without claiming live execution", () => {
    const report = buildHostedMigrationRollbackPlanReport({
      fileContents: completeFiles
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-migration-rollback-plan-doctor",
      status: "repo-consistent",
      scope: "repo-local",
      rollbackPlanAttached: true,
      hostedRollbackExecuted: false,
      restoredCloneSwitchExecuted: false,
      destructiveLiveMutations: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      registerIssues: []
    });
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });

  it("blocks when the plan stops preserving the unexecuted-live-rollback boundary", () => {
    const report = buildHostedMigrationRollbackPlanReport({
      fileContents: {
        ...completeFiles,
        rollbackPlan: completeFiles.rollbackPlan.replace("Executed hosted rollback drill: no", "")
      }
    });

    expect(report.status).toBe("contract-drift");
    expect(report.registerIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rollback-plan-required-sections",
          lane: "plan"
        })
      ])
    );
  });

  it("blocks secret-shaped placeholders in the rollback plan", () => {
    const report = buildHostedMigrationRollbackPlanReport({
      fileContents: {
        ...completeFiles,
        rollbackPlan: `${completeFiles.rollbackPlan}\npostgres://user:password@example.invalid/db`
      }
    });

    expect(report.status).toBe("contract-drift");
    expect(report.registerIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rollback-plan-no-secret-placeholders",
          lane: "plan"
        })
      ])
    );
  });
});
