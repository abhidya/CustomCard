import { describe, expect, it } from "vitest";
import {
  buildAdminAiFlowConfigPayload,
  buildAdminWorkerConfigPayload,
  buildUpdatedAdminWorkerConfigPayload,
  migrateLegacyBenchmarkAiFlowDefaults
} from "./adminRuntimeConfigData.mjs";
import { benchmarkBestAiWorkflow } from "./aiFlowConfigData.mjs";

const legacyRunComfyDefaults = [
  {
    flowId: "card-copy",
    primaryAdapterId: "cloudflare-workers-ai-chat",
    fallbackAdapterId: "huggingface-chat",
    model: "@cf/qwen/qwen3-30b-a3b-fp8",
    contextWindowTokens: 8192,
    maxTokens: 2200,
    temperature: 0.62
  },
  {
    flowId: "card-image",
    primaryAdapterId: "runcomfy-model-api-image",
    fallbackAdapterId: "cloudflare-workers-ai-image",
    model: "blackforestlabs/flux-2/dev/text-to-image",
    liveProviderCallsEnabled: true,
    queueEnabled: true,
    fallbackQueueEnabled: true,
    rateLimitPerMinute: 8,
    monthlyBudgetCents: 4000,
    perRequestBudgetCents: 1,
    maxRetries: 1,
    renderingMode: "",
    workflowId: "",
    workflowPath: "",
    workflowJson: "",
    workflowInputsJson: ""
  }
];

const legacyLocalComfyDefaults = [
  legacyRunComfyDefaults[0],
  {
    ...legacyRunComfyDefaults[1],
    primaryAdapterId: "local-comfyui-api-image",
    fallbackAdapterId: "cloudflare-workers-ai-image",
    model: "sd_xl_turbo_1.0_fp16.safetensors",
    renderingMode: "final-text-composited",
    workflowId: "customcard-production-text-overlay",
    workflowPath: "comfyui-workflows/customcard-production-text-overlay.json",
    workflowJson: "",
    workflowInputsJson: JSON.stringify({
      width: 512,
      height: 704,
      steps: 18,
      cfg: 6.5,
      sampler: "euler",
      scheduler: "normal",
      poll_ms: 1500,
      timeout_ms: 360000,
      client_id: "customcard-local-comfyui-provider"
    })
  }
];

describe("admin runtime AI flow config data", () => {
  it("migrates persisted legacy defaults to the benchmark-best workflow on read", () => {
    const payload = buildAdminAiFlowConfigPayload({
      input: { configs: legacyRunComfyDefaults },
      migrateLegacyDefaults: true
    });
    const cardCopy = payload.configs.find((config) => config.flowId === "card-copy");
    const cardImage = payload.configs.find((config) => config.flowId === "card-image");

    expect(payload.aiFlowDefaultsVersion).toBe(benchmarkBestAiWorkflow.id);
    expect(cardCopy).toMatchObject({
      primaryAdapterId: "cloudflare-workers-ai-chat",
      maxTokens: 3200
    });
    expect(cardImage).toMatchObject({
      primaryAdapterId: "local-comfyui-api-image",
      fallbackAdapterId: "cloudflare-workers-ai-image",
      model: "DreamShaper_8_pruned.safetensors",
      renderingMode: "final-text-composited",
      workflowId: "customcard-production-text-overlay",
      workflowPath: "comfyui-workflows/customcard-production-text-overlay.json"
    });
    expect(JSON.parse(cardImage?.workflowInputsJson ?? "{}")).toMatchObject({
      width: 960,
      height: 1344,
      steps: 18,
      cfg: 6.5,
      poll_ms: 1500,
      timeout_ms: 900000
    });
  });

  it("migrates stale local Comfy production-text defaults to the normal-size benchmark path", () => {
    const payload = buildAdminAiFlowConfigPayload({
      input: { configs: legacyLocalComfyDefaults },
      migrateLegacyDefaults: true
    });
    const cardImage = payload.configs.find((config) => config.flowId === "card-image");

    expect(payload.aiFlowDefaultsVersion).toBe(benchmarkBestAiWorkflow.id);
    expect(cardImage).toMatchObject({
      primaryAdapterId: "local-comfyui-api-image",
      fallbackAdapterId: "cloudflare-workers-ai-image",
      model: "DreamShaper_8_pruned.safetensors",
      renderingMode: "final-text-composited",
      workflowId: "customcard-production-text-overlay",
      workflowPath: "comfyui-workflows/customcard-production-text-overlay.json"
    });
    expect(JSON.parse(cardImage?.workflowInputsJson ?? "{}")).toMatchObject({
      width: 960,
      height: 1344,
      steps: 18,
      cfg: 6.5,
      poll_ms: 1500,
      timeout_ms: 900000
    });
  });

  it("does not migrate a current-version admin policy that intentionally selects RunComfy", () => {
    const payload = buildAdminAiFlowConfigPayload({
      input: {
        aiFlowDefaultsVersion: benchmarkBestAiWorkflow.id,
        configs: legacyRunComfyDefaults
      },
      migrateLegacyDefaults: true
    });
    const cardImage = payload.configs.find((config) => config.flowId === "card-image");

    expect(cardImage).toMatchObject({
      primaryAdapterId: "runcomfy-model-api-image",
      fallbackAdapterId: "cloudflare-workers-ai-image",
      model: "blackforestlabs/flux-2/dev/text-to-image",
      renderingMode: "",
      workflowId: "",
      workflowPath: ""
    });
  });

  it("keeps migration narrowly scoped to the known old default shape", () => {
    const customRunComfy = [
      {
        ...legacyRunComfyDefaults[1],
        monthlyBudgetCents: 9999
      }
    ];

    expect(migrateLegacyBenchmarkAiFlowDefaults(customRunComfy)).toEqual(customRunComfy);
  });
});

describe("admin runtime worker config data", () => {
  it("publishes queue worker defaults as admin configuration, not env feature flags", () => {
    expect(buildAdminWorkerConfigPayload()).toMatchObject({
      service: "customcard-admin-worker-config",
      status: "ready",
      worker: {
        batchSize: 5,
        leaseSeconds: 300,
        retryBackoffSeconds: 60,
        pollIntervalMs: 5000
      },
      providerWorker: {
        routeIds: ["ai-card-generate"],
        batchSize: 1,
        leaseSeconds: 300,
        retryBackoffSeconds: 60,
        pollIntervalMs: 5000
      },
      repository: {
        key: "worker-config",
        rawCustomerContentStored: false,
        credentialsStored: false
      }
    });
  });

  it("normalizes and clamps worker config CRUD input", () => {
    const payload = buildAdminWorkerConfigPayload({
      input: {
        worker: {
          batchSize: "999",
          leaseSeconds: "5",
          retryBackoffSeconds: "4",
          pollIntervalMs: "10"
        },
        providerWorker: {
          routeIds: ["ai-card-generate", " manual-vendor-handoff ", "bad route!", "ai-card-generate"],
          batchSize: "20",
          leaseSeconds: "9999",
          retryBackoffSeconds: "9999",
          pollIntervalMs: "999999"
        }
      }
    });

    expect(payload.worker).toEqual({
      batchSize: 25,
      leaseSeconds: 30,
      retryBackoffSeconds: 5,
      pollIntervalMs: 250
    });
    expect(payload.providerWorker).toEqual({
      routeIds: ["ai-card-generate", "manual-vendor-handoff", "badroute"],
      batchSize: 5,
      leaseSeconds: 3600,
      retryBackoffSeconds: 3600,
      pollIntervalMs: 60000
    });
  });

  it("increments worker config versions without storing credentials", () => {
    const payload = buildUpdatedAdminWorkerConfigPayload({
      body: { worker: { batchSize: 2 }, providerWorker: { routeIds: "ai-card-generate" } },
      authContext: { userId: "admin-1" },
      current: { version: 4 },
      now: () => new Date("2026-06-29T01:02:03.000Z")
    });

    expect(payload).toMatchObject({
      version: 5,
      updatedAtIso: "2026-06-29T01:02:03.000Z",
      updatedBy: "admin-1",
      worker: { batchSize: 2 },
      repository: { credentialsStored: false }
    });
  });
});
