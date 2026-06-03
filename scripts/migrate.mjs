import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import pg from "pg";

const requiredEnv = ["CUSTOMCARD_ENV", "DATABASE_URL"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`CustomCard migration runner missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const migrationsDir = resolve("infra/migrations");
const migrationFiles = (await readdir(migrationsDir))
  .filter((file) => /^\d+_.+\.sql$/.test(file))
  .sort();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
});

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const appliedResult = await client.query("SELECT filename FROM schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.filename));
  const newlyApplied = [];

  for (const file of migrationFiles) {
    if (applied.has(file)) continue;

    const sql = await readFile(join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      newlyApplied.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log(
    JSON.stringify({
      service: "customcard-migrations",
      env: process.env.CUSTOMCARD_ENV,
      migrations: migrationFiles.map((file) => basename(file)),
      applied: newlyApplied
    })
  );
} finally {
  await client.end().catch(() => undefined);
}
