import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
});
