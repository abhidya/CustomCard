import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  cloudflareTextModelEnvKeys,
  localProductionTextComfyGuidance,
  productionCardCopyModel,
  productionCardCopyModelOverrideEnvKey,
  productionCardCopyProviderId
} from "./aiProviderSetupProfile.mjs";
import {
  buildDefaultAiFlowAdminConfigs,
  loadBrowserAiFlowAdminConfigs,
  resolveAiFlowConfig,
  saveBrowserAiFlowAdminConfigs,
  summarizeBenchmarkBestAiWorkflowParity,
  summarizeAiFlowConfigs,
  type AiFlowAdminConfig
} from "./aiFlowConfig";

const cloudflareEnv = {
  CLOUDFLARE_ACCOUNT_ID: "acct_123",
  CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
  CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "token_image"
};

const recommendedCardGenerationEnv = {
  HUGGINGFACE_API_TOKEN: "hf-token",
  DEEPAI_API_KEY: "deepai-token"
};

describe("AI flow config", () => {
  it("resolves configured Cloudflare text flows as live-ready from env", () => {
    const flow = resolveAiFlowConfig("card-copy", cloudflareEnv);

    expect(flow.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(flow.model).toBe(productionCardCopyModel);
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("treats Cloudflare card-copy as ready with account plus token only and uses the default Qwen model", () => {
    const flow = resolveAiFlowConfig("card-copy", {
      CLOUDFLARE_ACCOUNT_ID: "acct_123",
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text"
    });

    expect(flow.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(flow.model).toBe(productionCardCopyModel);
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("defaults card generation to the benchmark-backed Cloudflare copy plus local Comfy image lane", () => {
    const configs = buildDefaultAiFlowAdminConfigs();
    const cardCopy = configs.find((config) => config.flowId === "card-copy");
    const cardImage = configs.find((config) => config.flowId === "card-image");

    expect(cardCopy?.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(cardCopy?.fallbackAdapterId).toBe("huggingface-chat");
    expect(cardCopy?.fallbackQueueEnabled).toBe(true);
    expect(cardCopy?.model).toBe(productionCardCopyModel);
    expect(cardCopy?.maxTokens).toBe(4096);
    expect(cardCopy?.rateLimitPerMinute).toBe(4);
    expect(cardCopy?.perRequestBudgetCents).toBe(5);
    expect(cardCopy?.liveProviderCallsEnabled).toBe(true);
    expect(cardImage?.primaryAdapterId).toBe("local-comfyui-api-image");
    expect(cardImage?.model).toBe("flux-2-klein-4b.safetensors");
    expect(cardImage?.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(cardImage?.fallbackQueueEnabled).toBe(true);
    expect(cardImage?.renderingMode).toBe("final-text-composited");
    expect(cardImage?.workflowId).toBe("customcard-flux2-klein-production-text-overlay");
    expect(cardImage?.workflowPath).toBe("comfyui-workflows/customcard-flux2-klein-production-text-overlay.json");
    expect(JSON.parse(cardImage?.workflowInputsJson ?? "{}")).toMatchObject({
      width: 960,
      height: 1344,
      steps: 4,
      cfg: 1,
      sampler: "euler",
      poll_ms: 1500,
      timeout_ms: 900000
    });
    expect(cardImage?.rateLimitPerMinute).toBe(8);
    expect(cardImage?.perRequestBudgetCents).toBe(1);
    expect(cardImage?.liveProviderCallsEnabled).toBe(true);
  });

  it("keeps admin card-copy model config as the model source", () => {
    const flow = resolveAiFlowConfig(
      "card-copy",
      {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text"
      },
      [
        {
          flowId: "card-copy",
          primaryAdapterId: "cloudflare-workers-ai-chat",
          fallbackAdapterId: "huggingface-chat",
          model: "@cf/meta/llama-3.1-8b-instruct-fast",
          liveProviderCallsEnabled: true
        }
      ]
    );

    expect(flow.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(flow.model).toBe("@cf/meta/llama-3.1-8b-instruct-fast");
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("uses the default Cloudflare model for generic Cloudflare text resolution", () => {
    const customerChat = resolveAiFlowConfig("customer-chat", {
      CLOUDFLARE_ACCOUNT_ID: "acct_123",
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text"
    });

    expect(cloudflareTextModelEnvKeys).toEqual([]);
    expect(productionCardCopyModelOverrideEnvKey).toBe("");
    expect(customerChat.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(customerChat.model).toBe(productionCardCopyModel);
    expect(customerChat.readyForLiveCalls).toBe(true);
  });

  it("uses the default Cloudflare card-copy model when no admin model is set", () => {
    const flow = resolveAiFlowConfig("card-copy", {
      CLOUDFLARE_ACCOUNT_ID: "acct_123",
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text"
    });

    expect(flow.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(flow.model).toBe(productionCardCopyModel);
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("uses the fallback Qwen plus DeepAI text2img combo when only those credentials exist", () => {
    const adminConfig: Partial<AiFlowAdminConfig>[] = [
      { flowId: "card-copy", primaryAdapterId: "huggingface-chat", model: "Qwen/Qwen3-235B-A22B-Instruct-2507", liveProviderCallsEnabled: true },
      { flowId: "card-image", primaryAdapterId: "deepai-text2img-image", fallbackAdapterId: "cloudflare-workers-ai-image", model: "text2img", liveProviderCallsEnabled: true }
    ];
    const cardCopy = resolveAiFlowConfig("card-copy", recommendedCardGenerationEnv, adminConfig);
    const cardImage = resolveAiFlowConfig("card-image", {
      ...recommendedCardGenerationEnv,
    }, adminConfig);

    expect(cardCopy.primaryAdapterId).toBe("huggingface-chat");
    expect(cardCopy.model).toBe("Qwen/Qwen3-235B-A22B-Instruct-2507");
    expect(cardCopy.rateLimitPerMinute).toBe(4);
    expect(cardCopy.readyForLiveCalls).toBe(true);
    expect(cardImage.primaryAdapterId).toBe("deepai-text2img-image");
    expect(cardImage.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(cardImage.fallbackQueueEnabled).toBe(true);
    expect(cardImage.model).toBe("text2img");
    expect(cardImage.rateLimitPerMinute).toBe(8);
    expect(cardImage.perRequestBudgetCents).toBe(1);
    expect(cardImage.readyForLiveCalls).toBe(true);
  });

  it("routes card-image to Cloudflare when image credentials and live calls are enabled", () => {
    const flow = resolveAiFlowConfig("card-image", {
      ...cloudflareEnv,
    }, [
      {
        flowId: "card-image",
        primaryAdapterId: "cloudflare-workers-ai-image",
        fallbackAdapterId: "cloudflare-workers-ai-image",
        model: "@cf/bytedance/stable-diffusion-xl-lightning",
        liveProviderCallsEnabled: true
      }
    ]);

    expect(flow.primaryAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.model).toBe("@cf/bytedance/stable-diffusion-xl-lightning");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("uses Cloudflare Flux as the image-model default when Cloudflare image is selected without a model env", () => {
    const flow = resolveAiFlowConfig("card-image", {
      CLOUDFLARE_ACCOUNT_ID: "acct_123",
      CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "token_image"
    }, [
      { flowId: "card-image", primaryAdapterId: "cloudflare-workers-ai-image", liveProviderCallsEnabled: true }
    ]);

    expect(flow.primaryAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.model).toBe("@cf/black-forest-labs/flux-1-schnell");
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("allows DeepAI text2img as an executable card-image override", () => {
    const flow = resolveAiFlowConfig("card-image", {
      DEEPAI_API_KEY: "deepai-token",
    }, [
      { flowId: "card-image", primaryAdapterId: "deepai-text2img-image", liveProviderCallsEnabled: true }
    ]);

    expect(flow.primaryAdapterId).toBe("deepai-text2img-image");
    expect(flow.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.model).toBe("text2img");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("allows RunComfy Model API image generation when token and admin model id are configured", () => {
    const flow = resolveAiFlowConfig("card-image", {
      RUNCOMFY_API_TOKEN: "runcomfy-token",
    }, [
      { flowId: "card-image", primaryAdapterId: "runcomfy-model-api-image", liveProviderCallsEnabled: true }
    ]);

    expect(flow.primaryAdapterId).toBe("runcomfy-model-api-image");
    expect(flow.model).toBe("blackforestlabs/flux-2/dev/text-to-image");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("lets admin clear production text workflow fields for standard local Comfy artwork mode", () => {
    const flow = resolveAiFlowConfig("card-image", {
      CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
    }, [
      {
        flowId: "card-image",
        primaryAdapterId: "local-comfyui-api-image",
        fallbackAdapterId: "local-comfyui-api-image",
        model: "DreamShaper_8_pruned.safetensors",
        renderingMode: "",
        workflowId: "",
        workflowPath: "",
        workflowJson: "",
        workflowInputsJson: "",
        liveProviderCallsEnabled: true
      }
    ]);

    expect(flow.renderingMode).toBe("");
    expect(flow.workflowId).toBe("");
    expect(flow.workflowPath).toBe("");
    expect(flow.model).toBe("DreamShaper_8_pruned.safetensors");
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("normalizes the removed deterministic SVG renderer back to the default image adapter", () => {
    const flow = resolveAiFlowConfig("card-image", cloudflareEnv, [
      { flowId: "card-image", primaryAdapterId: "browser-svg-renderer", liveProviderCallsEnabled: true }
    ]);

    expect(flow.primaryAdapterId).toBe("local-comfyui-api-image");
    expect(flow.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(false);
    expect(flow.blockedReasons).toEqual(
      expect.arrayContaining(["local-comfyui-api-image missing CUSTOMCARD_COMFYUI_URL or COMFYUI_URL."])
    );
  });

  it("summarizes drift from the benchmark-best workflow for admin provider review", () => {
    const defaults = buildDefaultAiFlowAdminConfigs();
    const defaultParity = summarizeBenchmarkBestAiWorkflowParity(defaults);
    const runComfyParity = summarizeBenchmarkBestAiWorkflowParity(
      defaults.map((config) =>
        config.flowId === "card-image"
          ? {
              ...config,
              primaryAdapterId: "runcomfy-model-api-image",
              model: "blackforestlabs/flux-2/dev/text-to-image",
              renderingMode: ""
            }
          : config
      )
    );

    expect(defaultParity.status).toBe("matched");
    expect(defaultParity.matched).toBe(defaultParity.total);
    expect(defaultParity.evidencePath).toContain("production-text-workflow-20260629-flux2-klein-prod-normal-size");
    expect(runComfyParity.status).toBe("drift");
    expect(runComfyParity.rows.find((row) => row.flowId === "card-image")?.missing).toEqual(
      expect.arrayContaining(["Provider", "Model", "Rendering"])
    );
  });

  it("honors admin provider, model, prompt, rate, budget, and fallback queue overrides", () => {
    const flow = resolveAiFlowConfig("customer-chat", cloudflareEnv, [
      {
        flowId: "customer-chat",
        primaryAdapterId: "groq-chat",
        fallbackAdapterId: "",
        model: "llama-3.1-8b-instant",
        promptInstructions: "Reply in one sentence.",
        rateLimitPerMinute: 3,
        monthlyBudgetCents: 111,
        perRequestBudgetCents: 2,
        queueEnabled: true,
        fallbackQueueEnabled: false,
        liveProviderCallsEnabled: true,
        maxRetries: 0,
        maxTokens: 100,
        temperature: 0.2
      }
    ]);

    expect(flow.primaryAdapterId).toBe("groq-chat");
    expect(flow.model).toBe("llama-3.1-8b-instant");
    expect(flow.promptInstructions).toBe("Reply in one sentence.");
    expect(flow.rateLimitPerMinute).toBe(3);
    expect(flow.monthlyBudgetCents).toBe(111);
    expect(flow.perRequestBudgetCents).toBe(2);
    expect(flow.queueEnabled).toBe(true);
    expect(flow.fallbackQueueEnabled).toBe(false);
    expect(flow.readyForLiveCalls).toBe(false);
    expect(flow.blockedReasons.join(" ")).toContain("GROQ_API_KEY");
  });

  it("saves browser admin profiles as optional session drafts", () => {
    const restore = installSessionStorageStub();
    try {
      const configs = buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-image"
          ? { ...config, liveProviderCallsEnabled: true, rateLimitPerMinute: 1, monthlyBudgetCents: 75 }
          : config
      );

      saveBrowserAiFlowAdminConfigs(configs);
      const loaded = loadBrowserAiFlowAdminConfigs();
      const cardImage = loaded.find((config) => config.flowId === "card-image");

      expect(cardImage).toMatchObject({
        liveProviderCallsEnabled: true,
        rateLimitPerMinute: 1,
        monthlyBudgetCents: 75
      });
    } finally {
      restore();
    }
  });

  it("summarizes configured providers without exposing secret values", () => {
    const summary = summarizeAiFlowConfigs(cloudflareEnv);

    expect(summary.total).toBe(3);
    expect(summary.configuredProviders).toEqual(
      expect.arrayContaining(["cloudflare-workers-ai-chat", "cloudflare-workers-ai-image"])
    );
    expect(JSON.stringify(summary)).not.toContain("token_text");
  });

  it("keeps docs and env examples pinned to the shared production card-copy setup profile", () => {
    const rootEnvExample = readFileSync(resolve("D:/manny/Documents/CustomCard/.env.example"), "utf8");
    const envExample = readFileSync(resolve("D:/manny/Documents/CustomCard/infra/env/.env.example"), "utf8");
    const infraReadme = readFileSync(resolve("D:/manny/Documents/CustomCard/infra/README.md"), "utf8");
    const cloudflareSetupDoc = readFileSync(resolve("D:/manny/Documents/CustomCard/docs/cloudflare-workers-ai-setup.md"), "utf8");
    const forbiddenRuntimeConfigEnv = [
      "VITE_CARD_GEN_URL",
      "CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED",
      "CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED",
      "CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID",
      "CUSTOMCARD_RUNCOMFY_IMAGE_INPUT_JSON",
      "CLOUDFLARE_WORKERS_AI_TEXT_MODEL",
      "CLOUDFLARE_WORKERS_AI_IMAGE_MODEL"
    ];

    for (const envName of forbiddenRuntimeConfigEnv) expect(rootEnvExample).not.toContain(envName);
    expect(envExample).not.toMatch(/CUSTOMCARD_AI_[A-Z_]+MODEL=/);
    expect(envExample).not.toMatch(/CLOUDFLARE_WORKERS_AI_[A-Z_]+MODEL=/);
    expect(infraReadme).toContain("Set provider, model, budget, queue, and");
    expect(cloudflareSetupDoc).toContain("Configure that model in Admin Providers, not env.");
    expect(cloudflareSetupDoc).toContain("hosted Cloudflare image keys are not");
    expect(localProductionTextComfyGuidance.requiresHostedImageKeys).toBe(false);
  });
});

function installSessionStorageStub() {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    }
  } as Storage;
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage
  });
  return () => {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  };
}
