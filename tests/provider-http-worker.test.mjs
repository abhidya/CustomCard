import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compactProviderCompletionPayloadForPost,
  createProviderHttpWorkerRuntime,
  loadProviderWorkerEnvFiles
} from "../scripts/provider-http-worker.mjs";

const providerBaseEnv = {
  CUSTOMCARD_PROVIDER_API_BASE_URL: "https://customcard.example",
  CUSTOMCARD_PROVIDER_WORKER_TOKEN: "test-provider-worker-token-32-chars",
  CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
};
const workerConfig = {
  providerWorker: {
    routeIds: ["ai-card-generate"],
    batchSize: 1,
    leaseSeconds: 300,
    retryBackoffSeconds: 60,
    pollIntervalMs: 5000
  }
};
const localImageAdminConfig = [
  {
    flowId: "card-image",
    primaryAdapterId: "local-comfyui-api-image",
    fallbackAdapterId: "local-comfyui-api-image",
    liveProviderCallsEnabled: true
  }
];
const cloudflareCopyLocalImageAdminConfig = [
  {
    flowId: "card-copy",
    primaryAdapterId: "cloudflare-workers-ai-chat",
    fallbackAdapterId: "cloudflare-workers-ai-chat",
    model: "@cf/qwen/qwen3-30b-a3b-fp8",
    liveProviderCallsEnabled: true
  },
  ...localImageAdminConfig
];

const cardCopyResponse = {
  theme_guide: "warm botanical birthday",
  panels: [
    { id: "front", headline: "Happy Birthday Sara", body: "Wishing you a day full of green trails and good coffee.", image_prompt: "front botanical art", image_negative_prompt: "text", art_direction: "front art" },
    { id: "inside-left", headline: "A little sunshine", body: "May the morning feel bright and unhurried.", image_prompt: "inside-left botanical art", image_negative_prompt: "text", art_direction: "inside-left art" },
    { id: "inside-right", headline: "From Manny", body: "I hope this year brings more hikes, more laughs, and more tiny wonders.", image_prompt: "inside-right botanical art", image_negative_prompt: "text", art_direction: "inside-right art" },
    { id: "back", headline: "CustomCard", body: "Made with CustomCard. Printed locally.", image_prompt: "back botanical art", image_negative_prompt: "text", art_direction: "back art" }
  ],
  memory_citations: ["She keeps a fern by the kitchen window."]
};

let tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

describe("provider HTTP worker", () => {
  it("loads provider credentials while provider selection stays in admin config", () => {
    const cwd = mkdtempSync(join(tmpdir(), "customcard-provider-http-worker-"));
    tempDirs.push(cwd);
    writeFileSync(
      join(cwd, ".env.local"),
      [
        "CUSTOMCARD_LOCAL_LLM_BASE_URL=http://127.0.0.1:5003/v1"
      ].join("\n")
    );
    writeFileSync(
      join(cwd, ".env.provider.local"),
      [
        "CLOUDFLARE_ACCOUNT_ID=acct_123",
        "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN=cf_text_token",
        "CUSTOMCARD_COMFYUI_URL=http://127.0.0.1:8188"
      ].join("\n")
    );

    const target = loadProviderWorkerEnvFiles({ cwd, target: {} });
    const runtime = createProviderHttpWorkerRuntime({
      env: { ...providerBaseEnv, ...target },
      aiFlowAdminConfig: cloudflareCopyLocalImageAdminConfig,
      workerConfig
    });

    expect(Object.keys(target).some((key) => key.startsWith("CUSTOMCARD_AI_"))).toBe(false);
    expect(runtime.describe()).toMatchObject({
      copyAdapter: "cloudflare-workers-ai-chat",
      copyModel: "@cf/qwen/qwen3-30b-a3b-fp8",
      imageAdapter: "local-comfyui-api-image",
      comfyUrl: "http://127.0.0.1:8188"
    });
    expect(runtime.validate()).toEqual([]);
  });

  it("blocks before leasing when the selected Cloudflare text flow is not configured", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ jobs: [] }), { status: 200 }));
    const runtime = createProviderHttpWorkerRuntime({
      env: {
        ...providerBaseEnv
      },
      aiFlowAdminConfig: cloudflareCopyLocalImageAdminConfig,
      workerConfig,
      fetchImpl
    });

    const report = await runtime.runOnce();

    expect(report).toMatchObject({
      status: "blocked",
      leased: 0,
      processed: 0,
      copyAdapter: "cloudflare-workers-ai-chat"
    });
    expect(report.blockers.join(" ")).toContain("cloudflare-workers-ai-chat missing");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the leased server admin route config for generator execution", async () => {
    const completionBodies = [];
    const heartbeatBodies = [];
    const { base64: imageBase64 } = await buildCompressiblePngBase64();
    let delayedImageGeneration = false;
    const env = {
      CUSTOMCARD_PROVIDER_API_BASE_URL: "https://customcard.example",
      CUSTOMCARD_PROVIDER_WORKER_TOKEN: "test-provider-worker-token-32-chars",
      OPENAI_API_KEY: "openai_token"
    };
    const aiFlowAdminConfig = [
      {
        flowId: "card-copy",
        primaryAdapterId: "openai-responses-chat",
        fallbackAdapterId: "openai-responses-chat",
        model: "gpt-4.1-mini",
        liveProviderCallsEnabled: true
      },
      {
        flowId: "card-image",
        primaryAdapterId: "openai-images",
        fallbackAdapterId: "openai-images",
        model: "gpt-image-2",
        liveProviderCallsEnabled: true
      }
    ];
    const leasedAiFlowAdminConfig = [
      {
        flowId: "card-copy",
        primaryAdapterId: "openai-responses-chat",
        fallbackAdapterId: "openai-responses-chat",
        model: "gpt-4.1-mini-lease",
        liveProviderCallsEnabled: true
      },
      {
        flowId: "card-image",
        primaryAdapterId: "openai-images",
        fallbackAdapterId: "openai-images",
        model: "gpt-image-lease",
        liveProviderCallsEnabled: true
      }
    ];
    const fetchImpl = vi.fn(async (url, init) => {
      const requestUrl = String(url);
      if (requestUrl === "https://customcard.example/api/provider/jobs/lease") {
        return new Response(
          JSON.stringify({
            jobs: [
              {
                job_id: "job_123",
                lease_token: "lease_123",
                lease_ttl_seconds: 1,
                lease_expires_at: "2030-01-01T00:00:01.000Z",
                route_id: "ai-card-generate",
                payload: {
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
                    rateKey: "provider-worker-route-config"
                  },
                  aiFlowAdminConfig: leasedAiFlowAdminConfig
                }
              }
            ]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl === "https://api.openai.com/v1/responses") {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl === "https://api.openai.com/v1/images/generations") {
        if (!delayedImageGeneration) {
          delayedImageGeneration = true;
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        return new Response(JSON.stringify({ data: [{ b64_json: imageBase64 }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl === "https://customcard.example/api/provider/jobs/job_123/heartbeat") {
        heartbeatBodies.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            status: "lease-renewed",
            lease_token: "lease_renewed",
            lease_ttl_seconds: 1,
            lease_expires_at: "2030-01-01T00:00:02.000Z",
            heartbeat_at: "2030-01-01T00:00:01.000Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl === "https://customcard.example/api/provider/jobs/job_123/complete") {
        completionBodies.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const runtime = createProviderHttpWorkerRuntime({ env, aiFlowAdminConfig, workerConfig, fetchImpl });

    const report = await runtime.runOnce();
    const completion = completionBodies[0];

    expect(runtime.describe()).toMatchObject({
      copyAdapter: "openai-responses-chat",
      copyModel: "gpt-4.1-mini",
      imageAdapter: "openai-images",
      imageModel: "gpt-image-2",
      aiFlowReadiness: {
        cardCopy: expect.objectContaining({
          adapterId: "openai-responses-chat",
          model: "gpt-4.1-mini",
          readyForLiveCalls: true
        }),
        cardImage: expect.objectContaining({
          adapterId: "openai-images",
          model: "gpt-image-2",
          readyForLiveCalls: true
        })
      }
    });
    expect(report).toMatchObject({
      status: "ready",
      leased: 1,
      processed: 1,
      succeeded: 1,
      failed: 0
    });
    expect(heartbeatBodies.length).toBeGreaterThan(0);
    expect(heartbeatBodies[0]).toMatchObject({
      worker_id: expect.any(String),
      lease_token: "lease_123"
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toMatchObject({
      routes: ["ai-card-generate"],
      limit: 1
    });
    expect(completion).toMatchObject({
      worker_id: heartbeatBodies[0].worker_id,
      lease_token: "lease_renewed",
      status: "succeeded",
      result: {
        httpStatusCode: 200,
        payload: {
          ai_flow: {
            card_copy: expect.objectContaining({
              adapter_id: "openai-responses-chat",
              model: "gpt-4.1-mini-lease"
            }),
            card_image: expect.objectContaining({
              adapter_id: "openai-images",
              model: "gpt-image-lease"
            })
          },
          images: expect.arrayContaining([
            expect.objectContaining({
              image_url: expect.stringMatching(/^data:image\/webp;base64,/),
              provider_completion_compression: expect.objectContaining({
                status: "compressed",
                algorithm: "sharp-webp-v1",
                originalMimeType: "image/png",
                storedMimeType: "image/webp"
              })
            })
          ])
        }
      }
    });
    expect(JSON.stringify(completion)).not.toContain(`data:image/png;base64,${imageBase64}`);
  });

  it("leaves completion payloads unchanged when there are no inline image data URLs", async () => {
    const payload = {
      generated_by: "ai-text-only",
      images: [{ panel_id: "front", image_url: "/api/artifacts/front.webp" }]
    };

    await expect(compactProviderCompletionPayloadForPost(payload)).resolves.toEqual(payload);
  });

  it("keeps raw node mjs runtime files off TypeScript-only control-plane imports", () => {
    const runtimeFiles = [
      readFileSync(new URL("../scripts/ai-card-generator.mjs", import.meta.url), "utf8"),
      readFileSync(new URL("../scripts/provider-http-worker.mjs", import.meta.url), "utf8")
    ];

    for (const source of runtimeFiles) {
      expect(source).not.toMatch(/from\s+["'][^"']+\.ts["']/);
      expect(source).not.toContain("aiProviderControlPlane.ts");
      expect(source).not.toContain("aiProviderReadiness.ts");
    }
  });
});

async function buildCompressiblePngBase64() {
  const sharp = (await import("sharp")).default;
  const buffer = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 3,
      background: "#f7ead1"
    }
  })
    .png()
    .toBuffer();
  return { buffer, base64: buffer.toString("base64") };
}
