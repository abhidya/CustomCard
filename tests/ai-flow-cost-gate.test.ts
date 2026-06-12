import { describe, expect, it } from "vitest";
import {
  createAiFlowCostGate,
  createMemoryAiFlowCostStore,
  createPostgresAiFlowCostStore
} from "../scripts/ai-flow-cost-gate.mjs";

const liveFlow = {
  flowId: "card-copy",
  label: "Card copy",
  capability: "text-chat",
  primaryAdapterId: "openai-gpt-4o-mini",
  fallbackAdapterId: "browser-svg-renderer",
  rateLimitPerMinute: 2,
  monthlyBudgetCents: 100,
  perRequestBudgetCents: 50,
  readyForLiveCalls: true,
  blockedReasons: []
};

function reserveInput(overrides: Record<string, unknown> = {}) {
  return {
    flow: liveFlow,
    routeId: "/api/ai/card/generate",
    tenantId: "tenant-1",
    rateKey: "tenant-1",
    unitCostCents: 40,
    requestUnits: 1,
    ...overrides
  };
}

interface FakeQuery {
  text: string;
  values: unknown[];
}

function createFakePool({ reservedCents = 0, rateUnits = 0 }: { reservedCents?: number; rateUnits?: number } = {}) {
  const queries: FakeQuery[] = [];
  const client = {
    async query(text: string, values: unknown[] = []) {
      queries.push({ text, values });
      if (text.includes("SUM(estimated_cost_cents)") && text.includes("metadata->>'flowId'")) {
        return { rows: [{ reserved_cents: reservedCents }] };
      }
      if (text.includes("SUM(request_units)")) {
        return { rows: [{ units: rateUnits }] };
      }
      return { rows: [] };
    },
    release() {
      queries.push({ text: "RELEASE-CLIENT", values: [] });
    }
  };
  return {
    queries,
    pool: {
      query: client.query,
      connect: async () => client
    }
  };
}

describe("ai flow cost gate", () => {
  it("reserves spend and rate units atomically through the store", async () => {
    const gate = createAiFlowCostGate({ store: createMemoryAiFlowCostStore() });

    const first = await gate.reserve(reserveInput({ idempotencyKey: "req-1" }));
    expect(first.ok).toBe(true);
    expect(first.event.status).toBe("reserved");

    // Second request projects 80c of 100c budget — still allowed.
    const second = await gate.reserve(reserveInput({ idempotencyKey: "req-2" }));
    expect(second.ok).toBe(true);

    // Third request would cross the monthly budget and is refused.
    const third = await gate.reserve(reserveInput({ idempotencyKey: "req-3" }));
    expect(third.ok).toBe(false);
    expect(third.fallbackReason).toBe("monthly-budget-exceeded");
    expect(third.event.status).toBe("blocked");
  });

  it("enforces the per-minute rate limit across sequential reservations", async () => {
    const gate = createAiFlowCostGate({ store: createMemoryAiFlowCostStore() });
    const cheap = { unitCostCents: 1 };

    expect((await gate.reserve(reserveInput({ ...cheap, idempotencyKey: "r-1" }))).ok).toBe(true);
    expect((await gate.reserve(reserveInput({ ...cheap, idempotencyKey: "r-2" }))).ok).toBe(true);
    const limited = await gate.reserve(reserveInput({ ...cheap, idempotencyKey: "r-3" }));
    expect(limited.ok).toBe(false);
    expect(limited.statusCode).toBe(429);
    expect(limited.fallbackReason).toBe("rate-limit-exceeded");
  });

  it("runs Postgres reservations as one advisory-locked transaction", async () => {
    const { pool, queries } = createFakePool();
    const store = createPostgresAiFlowCostStore({ getPool: async () => pool });
    const gate = createAiFlowCostGate({ store });

    const outcome = await gate.reserve(reserveInput({ idempotencyKey: "pg-1" }));

    expect(outcome.ok).toBe(true);
    const statements = queries.map((entry) => entry.text);
    expect(statements[0]).toBe("BEGIN");
    expect(statements[1]).toContain("pg_advisory_xact_lock");
    expect(statements.some((text) => text.includes("INSERT INTO provider_call_events"))).toBe(true);
    expect(statements[statements.length - 2]).toBe("COMMIT");
    expect(statements[statements.length - 1]).toBe("RELEASE-CLIENT");

    const insert = queries.find((entry) => entry.text.includes("INSERT INTO provider_call_events"));
    expect(insert?.text).toContain("ON CONFLICT (id) DO NOTHING");
    expect(insert?.values?.[7]).toBe("reserved");
    const metadata = JSON.parse(String(insert?.values?.[18]));
    expect(metadata.flowId).toBe("card-copy");
    expect(metadata.rateBucketKey).toBe("card-copy:tenant-1");
  });

  it("blocks in Postgres when the shared ledger already holds the monthly budget", async () => {
    const { pool, queries } = createFakePool({ reservedCents: 90 });
    const store = createPostgresAiFlowCostStore({ getPool: async () => pool });
    const gate = createAiFlowCostGate({ store });

    const outcome = await gate.reserve(reserveInput({ idempotencyKey: "pg-2" }));

    expect(outcome.ok).toBe(false);
    expect(outcome.fallbackReason).toBe("monthly-budget-exceeded");
    const insert = queries.find((entry) => entry.text.includes("INSERT INTO provider_call_events"));
    expect(insert?.values?.[7]).toBe("blocked");
    expect(queries.map((entry) => entry.text)).toContain("COMMIT");
  });

  it("fails closed when the cost ledger is unreachable", async () => {
    const store = createPostgresAiFlowCostStore({
      getPool: async () => {
        throw new Error("database unreachable");
      }
    });
    const gate = createAiFlowCostGate({ store });

    const outcome = await gate.reserve(reserveInput({ idempotencyKey: "pg-3" }));

    expect(outcome.ok).toBe(false);
    expect(outcome.fallbackReason).toBe("provider-unavailable");
    expect(outcome.providerFailure).toContain("cost ledger is unavailable");
  });

  it("settles reservations into the durable ledger without failing the response", async () => {
    const { pool, queries } = createFakePool();
    const store = createPostgresAiFlowCostStore({ getPool: async () => pool });
    const gate = createAiFlowCostGate({ store });

    const reservation = await gate.reserve(reserveInput({ idempotencyKey: "pg-4" }));
    const settled = await gate.settle(reservation.reservation, { status: "succeeded", actualCostCents: 38 });

    expect(settled.status).toBe("succeeded");
    const inserts = queries.filter((entry) => entry.text.includes("INSERT INTO provider_call_events"));
    expect(inserts).toHaveLength(2);
    expect(inserts[1].values[7]).toBe("succeeded");
    expect(inserts[1].values[13]).toBe(38);

    const failingGate = createAiFlowCostGate({
      store: createPostgresAiFlowCostStore({
        getPool: async () => {
          throw new Error("database unreachable");
        }
      })
    });
    await expect(
      failingGate.settle(reservation.reservation, { status: "succeeded" })
    ).resolves.toMatchObject({ status: "succeeded" });
  });
});
