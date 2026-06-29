import pg from "pg";

const productionEnvNames = new Set(["prod", "production"]);

export function postgresPoolConfig(env = process.env) {
  return {
    connectionString: env.DATABASE_URL,
    max: safeIntegerEnv(env.CUSTOMCARD_POSTGRES_POOL_MAX, 5, 1, 20),
    connectionTimeoutMillis: safeIntegerEnv(env.CUSTOMCARD_POSTGRES_POOL_CONNECTION_TIMEOUT_MS, 5000, 1000, 30_000),
    idleTimeoutMillis: safeIntegerEnv(env.CUSTOMCARD_POSTGRES_POOL_IDLE_TIMEOUT_MS, 10_000, 1000, 120_000),
    allowExitOnIdle: true,
    ssl: env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
  };
}

export function createPostgresRuntime({ env = process.env, postgresPoolFactory, attachDatabasePool } = {}) {
  let poolPromise;
  let lifecycleAttached = false;

  async function getPool() {
    if (!poolPromise) {
      const poolConfig = postgresPoolConfig(env);
      poolPromise = Promise.resolve(
        postgresPoolFactory ? postgresPoolFactory({ env, poolConfig }) : createDefaultPostgresPool(poolConfig)
      ).then(async (pool) => {
        lifecycleAttached = await attachPostgresPoolLifecycle({ pool, env, attachDatabasePool });
        return pool;
      });
    }
    return poolPromise;
  }

  return {
    describe() {
      const poolConfig = postgresPoolConfig(env);
      return {
        configured: Boolean(env.DATABASE_URL),
        max: poolConfig.max,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        allowExitOnIdle: poolConfig.allowExitOnIdle,
        lifecycleAttached
      };
    },
    getPool,
    async query(sql, params) {
      const pool = await getPool();
      return pool.query(sql, params);
    },
    async withClient(callback) {
      const pool = await getPool();
      const client = await pool.connect();
      try {
        return await callback(client);
      } finally {
        client.release();
      }
    },
    async withTransaction(callback) {
      return this.withClient(async (client) => {
        await client.query("BEGIN");
        try {
          const result = await callback(client);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw error;
        }
      });
    },
    async close() {
      if (!poolPromise) return;
      const pool = await poolPromise;
      if (typeof pool.end === "function") await pool.end();
    }
  };
}

export async function attachPostgresPoolLifecycle({ pool, env = process.env, attachDatabasePool } = {}) {
  if (!pool || env.CUSTOMCARD_POSTGRES_ATTACH_DATABASE_POOL === "disabled") return false;
  const shouldAttach =
    attachDatabasePool ||
    env.CUSTOMCARD_POSTGRES_ATTACH_DATABASE_POOL === "enabled" ||
    env.VERCEL === "1" ||
    isProductionRuntimeEnv(env);
  if (!shouldAttach) return false;

  const attach = attachDatabasePool ?? (await loadVercelAttachDatabasePool());
  if (typeof attach !== "function") return false;
  attach(pool);
  return true;
}

async function createDefaultPostgresPool(poolConfig) {
  return new pg.Pool(poolConfig);
}

async function loadVercelAttachDatabasePool() {
  try {
    const packageName = "@vercel/functions";
    const mod = await import(/* @vite-ignore */ packageName);
    return mod.attachDatabasePool;
  } catch {
    return undefined;
  }
}

function isProductionRuntimeEnv(env) {
  const customCardEnv = String(env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV ?? "").trim().toLowerCase();
  return productionEnvNames.has(customCardEnv) || nodeEnv === "production";
}

function safeIntegerEnv(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
