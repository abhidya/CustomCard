import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { hashSessionToken } from "./api-runtime.mjs";

const cliArgs = parseArgs(process.argv.slice(2));
const confirmLive = cliArgs["confirm-live-account-auth-doctor"] === true;
const databaseUrl = process.env.DATABASE_URL;

if (!confirmLive) {
  console.error("Pass --confirm-live-account-auth-doctor to run the live account auth doctor.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required for the live account auth doctor.");
  process.exit(1);
}

const sessionToken = "live-account-auth-customer-session-token";
const recoverySecret = "live-account-auth-recovery-secret";
const doctorDatabase = `customcard_account_auth_${process.pid}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
const adminUrl = databaseUrl;
const doctorUrl = buildDatabaseUrl(databaseUrl, doctorDatabase);
const adminPool = new pg.Pool(poolConfig(adminUrl));
const checks = [];
const blockers = [];
const cleanupWarnings = [];
let finalCounts = {
  users: 0,
  identities: 0,
  recoveryChallenges: 0,
  sessions: 0,
  auditRecords: 0
};
let exitCode = 0;

try {
  await runCheck("connects to configured Postgres database", async () => {
    await waitForPostgres(adminPool);
  });

  await runCheck("creates isolated account auth database", async () => {
    await retryOperation(() => adminPool.query(`CREATE DATABASE ${quoteIdentifier(doctorDatabase)}`));
  });

  const doctorPool = new pg.Pool(poolConfig(doctorUrl));
  try {
    await runCheck("connects to isolated account auth database", async () => {
      await waitForPostgres(doctorPool);
    });

    await runCheck("applies migration with account auth tables", async () => {
      const migrationSql = await readFile("infra/migrations/001_initial_schema.sql", "utf8");
      await doctorPool.query(migrationSql);
      const tables = await doctorPool.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
      );
      const tableNames = new Set(tables.rows.map((row) => row.table_name));
      for (const requiredTable of ["users", "account_identities", "account_recovery_challenges", "auth_sessions", "audit_log"]) {
        expect(tableNames.has(requiredTable), `Migration did not create ${requiredTable}.`);
      }
    });

    await runCheck("stores hosted identity without raw provider profile", async () => {
      await doctorPool.query(
        `INSERT INTO users (id, email, locale, region, platform)
         VALUES ('user-account-auth', 'customer@example.test', 'en-US', 'US', 'web')`
      );
      await doctorPool.query(
        `INSERT INTO account_identities
           (id, user_id, provider, provider_subject, email, role, raw_profile_stored, claims_schema, verified_at, last_login_at)
         VALUES
           ('identity-auth0-customer', 'user-account-auth', 'auth0', 'auth0|customer-001', 'customer@example.test', 'customer', FALSE, $1::jsonb, NOW(), NOW())`,
        [JSON.stringify({ requiredClaims: ["sub", "email", "email_verified"], rawProfileStored: false })]
      );
      const identity = await doctorPool.query("SELECT raw_profile_stored, claims_schema FROM account_identities WHERE id = 'identity-auth0-customer'");
      expect(identity.rows[0].raw_profile_stored === false, "Hosted identity must not store raw provider profiles.");
      expect(identity.rows[0].claims_schema.rawProfileStored === false, "Claims schema should preserve no-raw-profile policy.");
    });

    await runCheck("enforces provider subject uniqueness", async () => {
      try {
        await doctorPool.query(
          `INSERT INTO account_identities
             (id, user_id, provider, provider_subject, email, role, raw_profile_stored, claims_schema, verified_at)
           VALUES
             ('identity-auth0-duplicate', 'user-account-auth', 'auth0', 'auth0|customer-001', 'customer@example.test', 'customer', FALSE, '{}'::jsonb, NOW())`
        );
      } catch (error) {
        if (error?.code === "23505") return;
        throw error;
      }
      throw new Error("Duplicate provider subject should violate account identity uniqueness.");
    });

    await runCheck("creates hashed recovery challenge and durable session", async () => {
      await doctorPool.query(
        `INSERT INTO account_recovery_challenges
           (id, user_id, channel, challenge_hash, expires_at)
         VALUES
           ('recovery-email-001', 'user-account-auth', 'email-link', $1, NOW() + INTERVAL '30 minutes')`,
        [hashSecret(recoverySecret)]
      );
      await doctorPool.query(
        `INSERT INTO auth_sessions (id, user_id, session_hash, role, expires_at)
         VALUES ('session-account-auth', 'user-account-auth', $1, 'customer', NOW() + INTERVAL '24 hours')`,
        [hashSessionToken(sessionToken)]
      );
      const recovery = await doctorPool.query(
        `SELECT challenge_hash, expires_at > NOW() AS active
         FROM account_recovery_challenges
         WHERE id = 'recovery-email-001'`
      );
      expect(recovery.rows[0].challenge_hash !== recoverySecret, "Recovery challenge must be hashed.");
      expect(recovery.rows[0].active === true, "Recovery challenge should be active before expiry.");
    });

    await runCheck("marks recovery used and appends audit record", async () => {
      await doctorPool.query("UPDATE account_recovery_challenges SET used_at = NOW() WHERE id = 'recovery-email-001'");
      await doctorPool.query(
        `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
         VALUES ('account_recovery_challenge', 'recovery-email-001', 'user-account-auth', 'account.recovery.challenge_used', $1::jsonb)`,
        [JSON.stringify({ channel: "email-link", rawSecretStored: false })]
      );
      const used = await doctorPool.query("SELECT used_at IS NOT NULL AS used FROM account_recovery_challenges WHERE id = 'recovery-email-001'");
      expect(used.rows[0].used === true, "Recovery challenge should be marked used.");
    });

    finalCounts = await readCounts(doctorPool);
  } finally {
    await doctorPool.end().catch(() => undefined);
  }
} catch (error) {
  exitCode = 1;
  blockers.push({ id: "account-auth-doctor", detail: error instanceof Error ? error.message : String(error) });
} finally {
  await dropDoctorDatabase(adminPool, doctorDatabase).catch((error) => {
    cleanupWarnings.push({ id: "drop-account-auth-database", detail: error instanceof Error ? error.message : String(error) });
  });
  await adminPool.end().catch(() => undefined);
  printReport(exitCode === 0 ? "ready" : "blocked");
  if (exitCode !== 0) process.exit(exitCode);
}

async function readCounts(pool) {
  const [users, identities, recovery, sessions, audit] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM users"),
    pool.query("SELECT COUNT(*)::int AS count FROM account_identities WHERE raw_profile_stored = FALSE"),
    pool.query("SELECT COUNT(*)::int AS count FROM account_recovery_challenges WHERE used_at IS NOT NULL"),
    pool.query("SELECT COUNT(*)::int AS count FROM auth_sessions"),
    pool.query("SELECT COUNT(*)::int AS count FROM audit_log")
  ]);
  return {
    users: users.rows[0].count,
    identities: identities.rows[0].count,
    recoveryChallenges: recovery.rows[0].count,
    sessions: sessions.rows[0].count,
    auditRecords: audit.rows[0].count
  };
}

async function dropDoctorDatabase(pool, databaseName) {
  await pool.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName]
  );
  await pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
}

async function retryOperation(operation) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, attempt * 150));
    }
  }
  throw lastError;
}

async function waitForPostgres(pool) {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, attempt * 100));
    }
  }
  throw lastError;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printReport(status) {
  console.log(
    JSON.stringify(
      {
        service: "customcard-account-auth-doctor",
        status: blockers.length === 0 ? status : "blocked",
        database: {
          isolatedDatabase: doctorDatabase,
          migrationApplied: checks.some((check) => check.id === "applies migration with account auth tables" && check.passed)
        },
        accountAuth: {
          hostedIdentityStored: finalCounts.identities === 1,
          recoveryChallengeHashedAndUsed: finalCounts.recoveryChallenges === 1,
          durableSessionCreated: finalCounts.sessions === 1,
          rawProfileStored: false,
          rawRecoverySecretStored: false
        },
        persistence: finalCounts,
        checks,
        blockers,
        cleanupWarnings
      },
      null,
      2
    )
  );
}

async function runCheck(id, fn) {
  try {
    const value = await fn();
    checks.push({ id, passed: true });
    return value;
  } catch (error) {
    blockers.push({ id, detail: error instanceof Error ? error.message : String(error) });
    checks.push({ id, passed: false });
    throw error;
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function hashSecret(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

function poolConfig(connectionString) {
  return {
    connectionString,
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 1000,
    allowExitOnIdle: true,
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
  };
}

function buildDatabaseUrl(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
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
