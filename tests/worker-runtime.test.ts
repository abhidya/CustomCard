import { describe, expect, it } from "vitest";
import { createWorkerRuntime, describeWorkerReadiness } from "../scripts/worker-runtime.mjs";

const baseEnv = {
  CUSTOMCARD_ENV: "dev",
  CUSTOMCARD_API_RUNTIME: "contract",
  DATABASE_URL: "postgres://customcard.local/customcard",
  QUEUE_URL: "redis://queue.customcard.local",
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
      pollIntervalMs: 5000,
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

  it("runs a bounded polling loop so worker processes can continuously pick up queued jobs", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const pool = createWorkerPool(queries, [
      {
        id: "job-render-loop-1",
        user_id: "user-demo",
        route_id: "render-packets",
        idempotency_key_id: "idem-render-loop-1",
        payload: { routeId: "render-packets" },
        attempt_count: 1,
        max_attempts: 3
      }
    ]);
    const runtime = createWorkerRuntime({
      env: { ...baseEnv, CUSTOMCARD_API_RUNTIME: "postgres", CUSTOMCARD_WORKER_POLL_INTERVAL_MS: "250" },
      routes,
      postgresPoolFactory: () => pool,
      workerId: "worker-loop-test"
    });

    const result = await runtime.runLoop({ maxIterations: 2, pollIntervalMs: 0 });

    expect(result).toMatchObject({
      service: "customcard-worker",
      status: "ready",
      iterations: 2,
      processed: 1,
      succeeded: 1,
      failed: 0,
      deadLettered: 0
    });
    expect(queries.filter((query) => query.sql.includes("FOR UPDATE SKIP LOCKED"))).toHaveLength(2);
  });

  it("executes queued AI card jobs through the worker with live text provider coverage", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const cardCopyResponse = {
      panels: ["front", "inside-left", "inside-right", "back"].map((id) => ({
        id,
        headline: id === "front" ? "Happy Birthday Sara" : "For Sara",
        body: "Warm birthday copy shaped from approved memories.",
        art_direction: "Botanical greeting-card panel.",
        image_prompt: `Full-bleed flat 2D botanical artwork layer for the ${id} panel, no readable text.`,
        image_negative_prompt: "readable text, logo, watermark"
      })),
      memory_citations: ["She keeps a fern by the kitchen window."]
    };
    const fetchImpl = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    const pool = createWorkerPool(queries, [
      {
        id: "job-ai-card-1",
        user_id: "user-demo",
        route_id: "ai-card-generate",
        idempotency_key_id: "idem-ai-card-1",
        payload: {
          routeId: "ai-card-generate",
          body: {
            sender: "Manny",
            recipient: "Sara",
            relationship: "friend",
            occasion: "birthday",
            tone: "warm",
            style: "botanical",
            language: "English",
            personal_note: "She loves morning hikes.",
            memory_notes: ["She keeps a fern by the kitchen window."]
          },
          requestContext: {
            rateKey: "user-demo",
            idempotencyKey: "ai-card-worker-test",
            authContext: { userId: "user-demo", role: "customer", sessionId: "session-demo" }
          },
          security: { clientAiFlowConfigAccepted: false, payloadMinimized: true }
        },
        attempt_count: 1,
        max_attempts: 3
      }
    ]);
    const runtime = createWorkerRuntime({
      env: {
        ...baseEnv,
        CUSTOMCARD_API_RUNTIME: "postgres",
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
        CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID: "cloudflare-workers-ai-chat",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "false"
      },
      routes: [{ id: "ai-card-generate", runtimeMode: "queue-backed" }],
      postgresPoolFactory: () => pool,
      fetchImpl,
      workerId: "worker-ai-card",
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });

    const result = await runtime.runOnce({ limit: 1 });
    const completed = queries.find((query) => query.sql.includes("status = 'succeeded'"));
    const completedPayload = JSON.parse(String(completed?.params[1] ?? "{}"));

    expect(result).toMatchObject({
      processed: 1,
      succeeded: 1,
      failed: 0
    });
    expect(completedPayload).toMatchObject({
      status: "ai-result-ready",
      routeId: "ai-card-generate",
      payload: {
        generated_by: "ai-text-only",
        card_copy: {
          panels: expect.any(Array)
        },
        external_network_calls: true,
        fallback_queued: false
      },
      liveNetworkCalls: true
    });
    expect(JSON.stringify(completedPayload)).not.toContain("aiFlowConfig");
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
