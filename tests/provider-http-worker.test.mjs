import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProviderHttpWorkerRuntime,
  loadProviderWorkerEnvFiles
} from "../scripts/provider-http-worker.mjs";

const providerBaseEnv = {
  CUSTOMCARD_PROVIDER_API_BASE_URL: "https://customcard.example",
  CUSTOMCARD_PROVIDER_WORKER_TOKEN: "test-provider-worker-token-32-chars",
  CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS: "ai-card-generate",
  CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "local-comfyui-api-image",
  CUSTOMCARD_AI_CARD_IMAGE_FALLBACK_ADAPTER_ID: "local-comfyui-api-image",
  CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
};

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
  it("loads provider-specific AI overrides after ambient local AI env", () => {
    const cwd = mkdtempSync(join(tmpdir(), "customcard-provider-http-worker-"));
    tempDirs.push(cwd);
    writeFileSync(
      join(cwd, ".env.local"),
      [
        "CUSTOMCARD_LOCAL_LLM_BASE_URL=http://127.0.0.1:5003/v1",
        "CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID=local-openai-compatible-chat"
      ].join("\n")
    );
    writeFileSync(
      join(cwd, ".env.provider.local"),
      [
        "CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID=cloudflare-workers-ai-chat",
        "CUSTOMCARD_AI_CARD_COPY_FALLBACK_ADAPTER_ID=cloudflare-workers-ai-chat",
        "CUSTOMCARD_AI_CARD_COPY_MODEL=@cf/qwen/qwen3-30b-a3b-fp8",
        "CLOUDFLARE_WORKERS_AI_TEXT_MODEL=@cf/qwen/qwen3-30b-a3b-fp8",
        "CLOUDFLARE_ACCOUNT_ID=acct_123",
        "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN=cf_text_token",
        "CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID=local-comfyui-api-image",
        "CUSTOMCARD_COMFYUI_URL=http://127.0.0.1:8188"
      ].join("\n")
    );

    const target = loadProviderWorkerEnvFiles({ cwd, target: {} });
    const runtime = createProviderHttpWorkerRuntime({ env: { ...providerBaseEnv, ...target } });

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
        ...providerBaseEnv,
        CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID: "cloudflare-workers-ai-chat",
        CUSTOMCARD_AI_CARD_COPY_FALLBACK_ADAPTER_ID: "cloudflare-workers-ai-chat"
      },
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

  it("uses the same server-scoped route config for readiness and leased generator execution", async () => {
    const completionBodies = [];
    const env = {
      CUSTOMCARD_PROVIDER_API_BASE_URL: "https://customcard.example",
      CUSTOMCARD_PROVIDER_WORKER_TOKEN: "test-provider-worker-token-32-chars",
      CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS: "ai-card-generate",
      OPENAI_API_KEY: "openai_token",
      CUSTOMCARD_AI_FLOW_CONFIG_JSON: JSON.stringify({
        flows: [
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
        ]
      })
    };
    const fetchImpl = vi.fn(async (url, init) => {
      const requestUrl = String(url);
      if (requestUrl === "https://customcard.example/api/provider/jobs/lease") {
        return new Response(
          JSON.stringify({
            jobs: [
              {
                job_id: "job_123",
                lease_token: "lease_123",
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
                  }
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
        return new Response(JSON.stringify({ data: [{ b64_json: "iVBORw0KGgo=" }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
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
    const runtime = createProviderHttpWorkerRuntime({ env, fetchImpl });

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
    expect(completion).toMatchObject({
      status: "succeeded",
      result: {
        httpStatusCode: 200,
        payload: {
          ai_flow: {
            card_copy: expect.objectContaining({
              adapter_id: "openai-responses-chat",
              model: "gpt-4.1-mini"
            }),
            card_image: expect.objectContaining({
              adapter_id: "openai-images",
              model: "gpt-image-2"
            })
          }
        }
      }
    });
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
