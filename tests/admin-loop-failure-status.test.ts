import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAdminLocalAiLoop } from "../scripts/local-ai-loop-admin.mjs";
import { runAdminModelBenchmark } from "../scripts/model-benchmark-admin.mjs";

const benchmarkLoopMock = vi.hoisted(() => ({
  buildModelBenchmarkAdminCatalog: vi.fn(() => ({ stories: {}, textCandidates: [], imageCandidates: [] })),
  runModelBenchmarkLoopFromArgs: vi.fn(),
  stories: {}
}));

const localAiQueueMock = vi.hoisted(() => ({
  buildLocalAiQueuePlan: vi.fn(() => ({
    allStories: false,
    aggregateTracking: { enabled: true },
    blockers: [],
    dryRun: false,
    jobs: [
      {
        id: "local-ai-job-1",
        payload: {
          body: { storyId: "botanical-birthday" },
          idempotencyKey: "local-ai-job-1",
          localLoop: { storyId: "botanical-birthday" },
          security: { humanReviewRequired: true }
        },
        routeId: "ai-card-generate",
        status: "planned",
        storyId: "botanical-birthday",
        userId: "local-admin-human-loop"
      }
    ],
    localOnly: true,
    outputDir: "docs/evidence/generated-card-comparisons/local-ai-loop",
    runWorker: false,
    write: true
  })),
  queueLocalAiJobs: vi.fn(),
  runQueuedLocalAiJobs: vi.fn(),
  writeLocalAiQueueReport: vi.fn()
}));

vi.mock("../scripts/model-benchmark-loop.mjs", () => benchmarkLoopMock);
vi.mock("../scripts/local-ai-job-queue.mjs", () => localAiQueueMock);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin loop failure statuses", () => {
  it("returns a blocked model benchmark payload instead of throwing HTTP 500", async () => {
    benchmarkLoopMock.runModelBenchmarkLoopFromArgs.mockRejectedValue(new Error("benchmark evidence store unavailable"));

    const result = await runAdminModelBenchmark({ body: { phase: "pipeline-quality", live: true } });

    expect(result).toMatchObject({
      statusCode: 409,
      payload: {
        service: "customcard-api",
        status: "model-benchmark-run-blocked",
        error: "benchmark evidence store unavailable",
        externalNetworkCalls: true,
        realOrdersEnabled: false
      }
    });
  });

  it("returns a blocked local AI loop payload instead of throwing HTTP 500", async () => {
    localAiQueueMock.queueLocalAiJobs.mockRejectedValue(new Error("api_jobs unavailable"));

    const result = await runAdminLocalAiLoop({
      body: { mode: "queue", stories: "botanical-birthday" },
      writeReport: false
    });

    expect(result).toMatchObject({
      statusCode: 409,
      payload: {
        service: "customcard-api",
        status: "blocked",
        externalNetworkCalls: false,
        localMachineCallsOnly: true,
        realOrdersEnabled: false,
        queueResult: {
          status: "blocked",
          error: "api_jobs unavailable"
        }
      }
    });
  });
});
