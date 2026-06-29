import { describe, expect, it } from "vitest";
import {
  buildLocalAiQueuePlan,
  queueLocalAiJobs
} from "../scripts/local-ai-job-queue.mjs";
import { runAdminLocalAiLoop } from "../scripts/local-ai-loop-admin.mjs";
import { apiRouteContracts, persistedTablesForRouteId } from "../src/apiRouteContractsData.mjs";

const localEnv = {
  CUSTOMCARD_API_RUNTIME: "postgres",
  DATABASE_URL: "postgres://customcard.local/customcard",
  CUSTOMCARD_LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
  CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
};

describe("local AI job queue", () => {
  it("registers the admin local AI loop as an idempotent local-only admin route", () => {
    const route = apiRouteContracts.find((candidate) => candidate.id === "admin-local-ai-loop-run");

    expect(route).toMatchObject({
      method: "POST",
      path: "/api/admin/local-ai-loop/run",
      audience: "admin",
      auth: "admin-session",
      idempotencyKeyRequired: true,
      externalNetworkCalls: false,
      realOrdersEnabled: false
    });
    expect(route?.requestSchema).toEqual(expect.arrayContaining(["X-Idempotency-Key", "mode", "stories"]));
    expect(route?.responseSchema).toEqual(expect.arrayContaining(["jobs", "queueResult", "workerResult", "humanReview"]));
    expect(persistedTablesForRouteId("admin-local-ai-loop-run")).toEqual(expect.arrayContaining(["users", "api_jobs", "audit_log"]));
  });

  it("builds sanitized local-only ai-card-generate queue payloads from benchmark stories", () => {
    const plan = buildLocalAiQueuePlan({
      args: {
        stories: "botanical-birthday",
        runId: "test-run",
        llmModel: "qwen3-8b-q4_k_m",
        checkpoint: "sd_xl_base_1.0.safetensors",
        workflowId: "api-sdxl-checkpoint-card-v1"
      },
      env: localEnv,
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });
    const job = plan.jobs[0];

    expect(plan).toMatchObject({
      status: "dry-run",
      dryRun: true,
      localOnly: {
        required: true,
        textAdapterId: "local-openai-compatible-chat",
        imageAdapterId: "local-comfyui-api-image",
        llmBaseUrl: "http://127.0.0.1:1234/v1",
        llmModel: "qwen3-8b-q4_k_m"
      },
      blockers: []
    });
    expect(job.payload).toMatchObject({
      routeId: "ai-card-generate",
      jobKind: "ai-flow",
      flowId: "card-generation",
      requestContext: {
        authContext: {
          userId: "local-admin-human-loop",
          role: "admin"
        }
      },
      security: {
        payloadMinimized: true,
        clientAiFlowConfigAccepted: false,
        credentialsPersisted: false,
        rawProviderContentStored: false,
        localOnlyModelCalls: true
      },
      body: {
        sender: "Manny",
        recipient: "Sara",
        occasion: "birthday"
      },
      localLoop: {
        benchmarkStoryId: "botanical-birthday",
        humanReview: {
          required: true,
          status: "pending-admin-review"
        },
        providers: {
          textAdapterId: "local-openai-compatible-chat",
          imageAdapterId: "local-comfyui-api-image",
          imageCheckpoint: "sd_xl_base_1.0.safetensors"
        }
      }
    });
    expect(JSON.stringify(job.payload)).not.toContain("aiFlowConfig");
    expect(JSON.stringify(job.payload)).not.toContain("CLOUDFLARE");
  });

  it("blocks queue plans that point model calls at non-local endpoints", () => {
    const plan = buildLocalAiQueuePlan({
      args: { stories: "botanical-birthday" },
      env: {
        ...localEnv,
        CUSTOMCARD_LOCAL_LLM_BASE_URL: "https://api.openai.com/v1"
      },
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });

    expect(plan.status).toBe("blocked");
    expect(plan.blockers).toEqual([
      "Local LLM base URL must be localhost/127.0.0.1, got https://api.openai.com/v1."
    ]);
  });

  it("writes local queue jobs and audit evidence through the postgres runtime", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const plan = buildLocalAiQueuePlan({
      args: { stories: "botanical-birthday", runId: "write-test", write: "true", ensureUser: "true" },
      env: localEnv,
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });

    const result = await queueLocalAiJobs({
      plan,
      env: localEnv,
      postgresPoolFactory: () => createQueuePool(queries)
    });

    expect(result).toMatchObject({
      status: "queued",
      inserted: 1,
      skipped: 0
    });
    expect(queries.some((query) => query.sql.includes("INSERT INTO users"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("INSERT INTO api_jobs"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("INSERT INTO audit_log"))).toBe(true);
    expect(queries.some((query) => String(query.params[3]).includes("\"localOnlyModelCalls\":true"))).toBe(true);
  });

  it("runs the admin local AI loop in plan mode with full review metadata", async () => {
    const result = await runAdminLocalAiLoop({
      body: { mode: "plan", stories: "botanical-birthday" },
      env: localEnv,
      writeReport: false
    });

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({
      status: "planned",
      mode: "plan",
      dryRun: true,
      write: false,
      localMachineCallsOnly: true,
      externalNetworkCalls: false,
      realOrdersEnabled: false,
      queueResult: {
        status: "dry-run",
        inserted: 0,
        skipped: 0
      },
      humanReview: {
        required: true,
        status: "pending-admin-review"
      }
    });
    expect(result.payload.jobs[0]).toMatchObject({
      routeId: "ai-card-generate",
      storyId: "botanical-birthday",
      queueInsert: {
        table: "api_jobs",
        status: "queued",
        attemptCount: 0,
        maxAttempts: 3
      },
      security: {
        localOnlyModelCalls: true,
        rawProviderContentStored: false
      }
    });
    expect(result.payload.report.markdownPath).toContain("queued-jobs.md");
  });

  it("blocks the admin local AI loop when local model endpoints are not local", async () => {
    const result = await runAdminLocalAiLoop({
      body: { mode: "queue", stories: "botanical-birthday" },
      env: { ...localEnv, CUSTOMCARD_LOCAL_LLM_BASE_URL: "https://api.openai.com/v1" },
      writeReport: false
    });

    expect(result.statusCode).toBe(409);
    expect(result.payload).toMatchObject({
      status: "blocked",
      queueResult: {
        status: "blocked"
      },
      externalNetworkCalls: false,
      localMachineCallsOnly: true
    });
    expect(result.payload.blockers).toEqual([
      "Local LLM base URL must be localhost/127.0.0.1, got https://api.openai.com/v1."
    ]);
  });
});

function createQueuePool(queries: Array<{ sql: string; params: unknown[] }>) {
  const client = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql: compactSql(sql), params });
      return { rows: [], rowCount: sql.includes("INSERT INTO api_jobs") ? 1 : 0 };
    },
    release() {
      return undefined;
    }
  };
  return {
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
