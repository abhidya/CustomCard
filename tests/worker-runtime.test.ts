import { describe, expect, it } from "vitest";
import { createWorkerRuntime, describeWorkerReadiness } from "../scripts/worker-runtime.mjs";

const baseEnv = {
  CUSTOMCARD_ENV: "dev",
  CUSTOMCARD_API_RUNTIME: "contract",
  DATABASE_URL: "postgres://example/customcard",
  QUEUE_URL: "redis://example",
  OBJECT_STORE_URL: "file:///tmp/customcard-objects",
  OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
  AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
  REAL_ORDER_KILL_SWITCH: "disabled"
};

const routes = [
  { id: "render-packets", runtimeMode: "queue-backed" },
  { id: "manual-vendor-handoff", runtimeMode: "queue-backed" }
];

describe("worker runtime", () => {
  it("keeps readiness compatible without requiring postgres execution mode", () => {
    expect(describeWorkerReadiness({ env: baseEnv, routes })).toMatchObject({
      service: "customcard-worker",
      status: "ready",
      executionMode: "postgres-lease",
      queueBackedRoutes: ["render-packets", "manual-vendor-handoff"],
      liveNetworkCalls: false,
      blockers: []
    });
  });

  it("blocks job execution unless the durable postgres runtime is selected", async () => {
    const runtime = createWorkerRuntime({
      env: baseEnv,
      routes,
      postgresPoolFactory: () => createWorkerPool([])
    });

    await expect(runtime.runOnce()).resolves.toMatchObject({
      status: "blocked",
      blockers: ["CustomCard worker execution requires CUSTOMCARD_API_RUNTIME=postgres."],
      processed: 0
    });
  });

  it("leases queued jobs with skip-locked semantics and completes them through route adapters", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const pool = createWorkerPool(queries, [
      {
        id: "job-render-1",
        user_id: "user-demo",
        route_id: "render-packets",
        idempotency_key_id: "idem-render-1",
        payload: { routeId: "render-packets" },
        attempt_count: 1,
        max_attempts: 3
      }
    ]);
    const runtime = createWorkerRuntime({
      env: { ...baseEnv, CUSTOMCARD_API_RUNTIME: "postgres" },
      routes,
      postgresPoolFactory: () => pool,
      workerId: "worker-test-1",
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });

    const result = await runtime.runOnce({ limit: 1 });

    expect(result).toMatchObject({
      status: "ready",
      leased: 1,
      processed: 1,
      succeeded: 1,
      failed: 0,
      deadLettered: 0
    });
    expect(queries.some((query) => query.sql.includes("FOR UPDATE SKIP LOCKED"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("status = 'succeeded'"))).toBe(true);
    expect(queries.some((query) => query.params.includes("api.job.succeeded"))).toBe(true);
  });

  it("dead-letters exhausted jobs and records audit evidence", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const pool = createWorkerPool(queries, [
      {
        id: "job-render-failed",
        user_id: "user-demo",
        route_id: "render-packets",
        idempotency_key_id: "idem-render-failed",
        payload: { routeId: "render-packets" },
        attempt_count: 3,
        max_attempts: 3
      }
    ]);
    const runtime = createWorkerRuntime({
      env: { ...baseEnv, CUSTOMCARD_API_RUNTIME: "postgres" },
      routes,
      postgresPoolFactory: () => pool,
      workerId: "worker-test-2",
      jobHandlers: {
        "render-packets": async () => {
          throw new Error("render adapter unavailable");
        }
      },
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });

    const result = await runtime.runOnce({ limit: 1 });

    expect(result).toMatchObject({
      processed: 1,
      succeeded: 0,
      deadLettered: 1
    });
    expect(queries.some((query) => query.params.includes("dead_lettered"))).toBe(true);
    expect(queries.some((query) => query.params.includes("api.job.dead_lettered"))).toBe(true);
    expect(queries.some((query) => String(query.params[3]).includes("render adapter unavailable"))).toBe(true);
  });
});

function createWorkerPool(queries: Array<{ sql: string; params: unknown[] }>, leasedRows: unknown[] = []) {
  let leaseUsed = false;
  const client = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql: compactSql(sql), params });
      if (sql.includes("locked_at < NOW()")) return { rows: [], rowCount: 0 };
      if (sql.includes("FOR UPDATE SKIP LOCKED")) {
        if (leaseUsed) return { rows: [], rowCount: 0 };
        leaseUsed = true;
        return { rows: leasedRows, rowCount: leasedRows.length };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {
      return undefined;
    }
  };
  return {
    async query(sql: string, params: unknown[] = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
    async end() {
      return undefined;
    }
  };
}

function compactSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}
