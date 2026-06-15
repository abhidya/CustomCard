import { describe, expect, it, vi } from "vitest";
import { runHostedDbRestoreDrill } from "../scripts/hosted-db-restore-drill.mjs";

const requiredTables = [
  "users",
  "auth_sessions",
  "account_identities",
  "account_recovery_challenges",
  "provider_connections",
  "imported_events",
  "card_opportunities",
  "draft_states",
  "relationship_memories",
  "card_projects",
  "render_packets",
  "orders",
  "order_events",
  "vendor_quotes",
  "consent_records",
  "data_requests",
  "idempotency_keys",
  "provider_call_events",
  "api_jobs",
  "audit_log"
];

const requiredIndexes = [
  "idx_auth_sessions_user",
  "idx_auth_sessions_hash",
  "idx_provider_call_events_tenant_month",
  "idx_render_packets_project",
  "idx_idempotency_keys_user_route",
  "idx_audit_subject"
];

describe("hosted DB restore drill", () => {
  it("fails closed without restore-drill guard, restore URL, and backup policy metadata", async () => {
    const Pool = vi.fn();

    const report = await runHostedDbRestoreDrill({
      env: {
        DATABASE_URL: "postgres://customcard:secret@prod.neon.tech/customcard"
      },
      pgModule: { Pool },
      now: new Date("2026-06-15T14:00:00.000Z")
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-db-restore-drill",
      status: "blocked",
      scope: "live-hosted-restore-drill",
      checkedAt: "2026-06-15T14:00:00.000Z",
      checks: [],
      backupPolicy: {
        restoredCloneValidated: false,
        destructiveLiveMutations: false,
        realOrdersEnabled: false,
        externalVendorCalls: false
      }
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "CUSTOMCARD_HOSTED_DB_RESTORE_DRILL=enabled is required before hosted restore drills run.",
        "CUSTOMCARD_RESTORE_DATABASE_URL is required.",
        "CUSTOMCARD_RESTORE_SOURCE is required.",
        "CUSTOMCARD_RESTORE_POINT_IN_TIME must be an ISO timestamp.",
        "CUSTOMCARD_BACKUP_RETENTION_DAYS must be at least 7."
      ])
    );
    expect(Pool).not.toHaveBeenCalled();
  });

  it("blocks exact production DATABASE_URL reuse", async () => {
    const Pool = vi.fn();
    const databaseUrl = "postgres://customcard:secret@prod.neon.tech/customcard";

    const report = await runHostedDbRestoreDrill({
      env: validEnv({
        DATABASE_URL: databaseUrl,
        CUSTOMCARD_RESTORE_DATABASE_URL: databaseUrl
      }),
      pgModule: { Pool }
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining(["CUSTOMCARD_RESTORE_DATABASE_URL must point at a restored clone, not the production DATABASE_URL."])
    );
    expect(Pool).not.toHaveBeenCalled();
  });

  it("validates restored clone schema, indexes, readable tables, and backup metadata without leaking the restore URL", async () => {
    const pool = new FakeRestorePool();
    class Pool {
      constructor(config: unknown) {
        pool.config = config;
        return pool;
      }
    }

    const report = await runHostedDbRestoreDrill({
      env: validEnv(),
      pgModule: { Pool },
      now: new Date("2026-06-15T14:15:00.000Z")
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-db-restore-drill",
      status: "ready",
      scope: "live-hosted-restore-drill",
      restoreMetadata: {
        restoreSource: "neon-branch",
        restorePointInTime: "2026-06-15T14:00:00.000Z",
        retentionDays: 14,
        rpoMinutes: 15,
        rtoMinutes: 60,
        productionDatabaseUrlConfigured: true,
        restoreDatabaseUrlConfigured: true
      },
      schema: {
        databaseName: "customcard_restore_drill",
        tables: requiredTables.length,
        indexes: requiredIndexes.length,
        requiredTablesPresent: requiredTables.length,
        requiredIndexesPresent: requiredIndexes.length
      },
      backupPolicy: {
        restoredCloneValidated: true,
        productionUrlSeparated: true,
        requiredTablesPresent: true,
        requiredIndexesPresent: true,
        retentionConfigured: true,
        restorePointAttached: true,
        destructiveLiveMutations: false,
        realOrdersEnabled: false,
        externalVendorCalls: false
      },
      passed: 4,
      failed: 0,
      blockers: []
    });
    expect(pool.queries.some((query) => query.includes("information_schema.tables"))).toBe(true);
    expect(pool.queries.some((query) => query.includes("pg_indexes"))).toBe(true);
    expect(pool.queries.filter((query) => query.startsWith("SELECT COUNT")).length).toBe(requiredTables.length);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("secret");
    expect(serialized).not.toContain("restore.neon.tech");
  });
});

function validEnv(overrides: Record<string, string> = {}) {
  return {
    CUSTOMCARD_HOSTED_DB_RESTORE_DRILL: "enabled",
    DATABASE_URL: "postgres://customcard:secret@prod.neon.tech/customcard",
    CUSTOMCARD_RESTORE_DATABASE_URL: "postgres://customcard:secret@restore.neon.tech/customcard_restore_drill",
    CUSTOMCARD_RESTORE_SOURCE: "neon-branch",
    CUSTOMCARD_RESTORE_POINT_IN_TIME: "2026-06-15T14:00:00.000Z",
    CUSTOMCARD_BACKUP_RETENTION_DAYS: "14",
    CUSTOMCARD_BACKUP_RPO_MINUTES: "15",
    CUSTOMCARD_BACKUP_RTO_MINUTES: "60",
    ...overrides
  };
}

class FakeRestorePool {
  config: unknown;
  queries: string[] = [];

  async query(sql: string): Promise<{ rows: Array<Record<string, unknown>> }> {
    this.queries.push(sql.replace(/\s+/g, " ").trim());
    if (sql.includes("current_database()")) {
      return { rows: [{ database_name: "customcard_restore_drill", user_name: "customcard_restore" }] };
    }
    if (sql.includes("information_schema.tables")) {
      return { rows: requiredTables.map((table_name) => ({ table_name })) };
    }
    if (sql.includes("pg_indexes")) {
      return { rows: requiredIndexes.map((indexname) => ({ indexname })) };
    }
    if (sql.startsWith("SELECT COUNT")) {
      return { rows: [{ count: 0 }] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }

  async end(): Promise<void> {
    return undefined;
  }
}
