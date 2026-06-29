import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";

const guardRequirement = "--confirm-hosted-db-restore-drill";
const restoreUrlEnvName = "CUSTOMCARD_RESTORE_DATABASE_URL";
const productionUrlEnvName = "DATABASE_URL";
const retentionDaysEnvName = "CUSTOMCARD_BACKUP_RETENTION_DAYS";
const rpoMinutesEnvName = "CUSTOMCARD_BACKUP_RPO_MINUTES";
const rtoMinutesEnvName = "CUSTOMCARD_BACKUP_RTO_MINUTES";
const restorePointEnvName = "CUSTOMCARD_RESTORE_POINT_IN_TIME";

const requiredTables = Object.freeze([
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
]);

const requiredIndexes = Object.freeze([
  "idx_auth_sessions_user",
  "idx_auth_sessions_hash",
  "idx_provider_call_events_tenant_month",
  "idx_render_packets_project",
  "idx_idempotency_keys_user_route",
  "idx_audit_subject"
]);

export async function runHostedDbRestoreDrill({
  env = process.env,
  enabled = false,
  pgModule = pg,
  now = new Date()
} = {}) {
  const metadata = resolveRestoreMetadata(env);
  const blockers = validateRestoreDrillEnv(env, metadata, enabled);
  if (typeof pgModule?.Pool !== "function") blockers.push("A pg Pool implementation is required for hosted DB restore drills.");
  if (blockers.length > 0) {
    return buildReport({ metadata, checks: [], schema: emptySchemaSummary(), blockers, now });
  }

  const pool = new pgModule.Pool(poolConfig(metadata.restoreDatabaseUrl, env));
  const checks = [];
  let schema = emptySchemaSummary();
  try {
    const connectionResult = await pool.query("SELECT current_database() AS database_name, current_user AS user_name");
    const databaseName = String(connectionResult.rows?.[0]?.database_name ?? "").trim();
    checks.push(check("connects-to-restore-database", databaseName.length > 0, `Connected to restore database ${databaseName || "unknown"}.`));

    const tableNames = await readTableNames(pool);
    const indexNames = await readIndexNames(pool);
    const rowCounts = await readRowCounts(pool, requiredTables);
    schema = {
      databaseName,
      tables: tableNames.length,
      indexes: indexNames.length,
      requiredTablesPresent: requiredTables.filter((table) => tableNames.includes(table)).length,
      requiredIndexesPresent: requiredIndexes.filter((index) => indexNames.includes(index)).length,
      rowCounts
    };

    checks.push(
      check(
        "required-tables-present",
        schema.requiredTablesPresent === requiredTables.length,
        `Found ${schema.requiredTablesPresent}/${requiredTables.length} required tables.`
      )
    );
    checks.push(
      check(
        "required-indexes-present",
        schema.requiredIndexesPresent === requiredIndexes.length,
        `Found ${schema.requiredIndexesPresent}/${requiredIndexes.length} required indexes.`
      )
    );
    checks.push(
      check(
        "key-tables-readable",
        Object.values(rowCounts).every((value) => Number.isFinite(value)),
        `Read counts from ${Object.keys(rowCounts).length} required tables.`
      )
    );
  } catch (error) {
    checks.push(check("restore-database-read", false, error instanceof Error ? error.message : "Restore database read failed."));
  } finally {
    await pool.end().catch(() => undefined);
  }

  return buildReport({
    metadata,
    checks,
    schema,
    blockers: checks.filter((item) => !item.passed).map((item) => `${item.id}: ${item.detail}`),
    now
  });
}

function resolveRestoreMetadata(env) {
  return {
    restoreSource: String(env.CUSTOMCARD_RESTORE_SOURCE ?? "").trim(),
    restoreDatabaseUrl: String(env[restoreUrlEnvName] ?? "").trim(),
    productionDatabaseUrlConfigured: Boolean(String(env[productionUrlEnvName] ?? "").trim()),
    restorePointInTime: String(env[restorePointEnvName] ?? "").trim(),
    retentionDays: numberOrNull(env[retentionDaysEnvName]),
    rpoMinutes: numberOrNull(env[rpoMinutesEnvName]),
    rtoMinutes: numberOrNull(env[rtoMinutesEnvName])
  };
}

function validateRestoreDrillEnv(env, metadata, enabled) {
  const blockers = [];
  if (!enabled) {
    blockers.push(`${guardRequirement} is required before hosted restore drills run.`);
  }
  if (!metadata.restoreDatabaseUrl) blockers.push(`${restoreUrlEnvName} is required.`);
  if (metadata.restoreDatabaseUrl && !isPostgresUrl(metadata.restoreDatabaseUrl)) blockers.push(`${restoreUrlEnvName} must be a Postgres URL.`);
  const productionUrl = String(env[productionUrlEnvName] ?? "").trim();
  if (productionUrl && normalizeUrl(productionUrl) === normalizeUrl(metadata.restoreDatabaseUrl)) {
    blockers.push(`${restoreUrlEnvName} must point at a restored clone, not the production ${productionUrlEnvName}.`);
  }
  if (!metadata.restoreSource) blockers.push("CUSTOMCARD_RESTORE_SOURCE is required.");
  if (!isIsoTimestamp(metadata.restorePointInTime)) blockers.push(`${restorePointEnvName} must be an ISO timestamp.`);
  if (!Number.isFinite(metadata.retentionDays) || metadata.retentionDays < 7) {
    blockers.push(`${retentionDaysEnvName} must be at least 7.`);
  }
  if (!Number.isFinite(metadata.rpoMinutes) || metadata.rpoMinutes < 0) blockers.push(`${rpoMinutesEnvName} must be zero or greater.`);
  if (!Number.isFinite(metadata.rtoMinutes) || metadata.rtoMinutes < 0) blockers.push(`${rtoMinutesEnvName} must be zero or greater.`);
  return blockers;
}

function isPostgresUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.password = url.password ? "<redacted>" : "";
    return url.toString();
  } catch {
    return String(value ?? "").trim();
  }
}

function isIsoTimestamp(value) {
  const date = new Date(value);
  return Boolean(value) && Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function poolConfig(connectionString, env) {
  const sslMode = String(env.CUSTOMCARD_RESTORE_DATABASE_SSL ?? env.DATABASE_SSL ?? "").trim();
  return {
    connectionString,
    ssl: sslMode === "require" ? { rejectUnauthorized: true } : undefined
  };
}

async function readTableNames(pool) {
  const result = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return result.rows.map((row) => String(row.table_name)).sort();
}

async function readIndexNames(pool) {
  const result = await pool.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public'
     ORDER BY indexname`
  );
  return result.rows.map((row) => String(row.indexname)).sort();
}

async function readRowCounts(pool, tables) {
  const counts = {};
  for (const table of tables) {
    const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(table)}`);
    counts[table] = Number(result.rows?.[0]?.count);
  }
  return counts;
}

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function check(id, passed, detail) {
  return { id, passed, detail };
}

function emptySchemaSummary() {
  return {
    databaseName: "",
    tables: 0,
    indexes: 0,
    requiredTablesPresent: 0,
    requiredIndexesPresent: 0,
    rowCounts: {}
  };
}

function buildReport({ metadata, checks, schema, blockers, now }) {
  const failed = checks.filter((item) => !item.passed).length;
  return {
    service: "customcard-hosted-db-restore-drill",
    status: blockers.length === 0 && failed === 0 ? "ready" : "blocked",
    scope: "live-hosted-restore-drill",
    checkedAt: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    restoreMetadata: {
      restoreSource: metadata.restoreSource,
      restorePointInTime: metadata.restorePointInTime,
      retentionDays: metadata.retentionDays,
      rpoMinutes: metadata.rpoMinutes,
      rtoMinutes: metadata.rtoMinutes,
      productionDatabaseUrlConfigured: metadata.productionDatabaseUrlConfigured,
      restoreDatabaseUrlConfigured: Boolean(metadata.restoreDatabaseUrl)
    },
    schema,
    backupPolicy: {
      restoredCloneValidated: checks.length > 0 && failed === 0,
      productionUrlSeparated: metadata.productionDatabaseUrlConfigured ? true : null,
      requiredTablesPresent: schema.requiredTablesPresent === requiredTables.length,
      requiredIndexesPresent: schema.requiredIndexesPresent === requiredIndexes.length,
      retentionConfigured: Number.isFinite(metadata.retentionDays) && metadata.retentionDays >= 7,
      restorePointAttached: isIsoTimestamp(metadata.restorePointInTime),
      destructiveLiveMutations: false,
      realOrdersEnabled: false,
      externalVendorCalls: false
    },
    checks,
    passed: checks.filter((item) => item.passed).length,
    failed,
    blockers
  };
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function writeEvidenceIfRequested(report, outputPath = "") {
  outputPath = String(outputPath ?? "").trim();
  if (!outputPath) return report;
  const absolutePath = resolve(outputPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, evidencePath: absolutePath };
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}

if (isCliEntrypoint()) {
  const args = parseArgs(process.argv.slice(2));
  const report = writeEvidenceIfRequested(await runHostedDbRestoreDrill({
    enabled: args["confirm-hosted-db-restore-drill"] === true
  }), args["evidence-out"]);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready") process.exit(1);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [rawKey, inlineValue] = value.slice(2).split("=");
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
      continue;
    }
    if (values[index + 1] && !values[index + 1].startsWith("--")) {
      parsed[rawKey] = values[index + 1];
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }
  return parsed;
}
