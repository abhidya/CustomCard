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
  summarizeAiFlowConfigs
} from "./aiFlowConfig";

const cloudflareEnv = {
  CLOUDFLARE_ACCOUNT_ID: "acct_123",
  CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
  CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8",
  CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "token_image",
  CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning"
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

  it("defaults card generation to Cloudflare copy and RunComfy image with live calls enabled", () => {
    const configs = buildDefaultAiFlowAdminConfigs();
    const cardCopy = configs.find((config) => config.flowId === "card-copy");
    const cardImage = configs.find((config) => config.flowId === "card-image");

    expect(cardCopy?.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(cardCopy?.fallbackAdapterId).toBe("huggingface-chat");
    expect(cardCopy?.fallbackQueueEnabled).toBe(true);
    expect(cardCopy?.model).toBe(productionCardCopyModel);
    expect(cardCopy?.rateLimitPerMinute).toBe(4);
    expect(cardCopy?.perRequestBudgetCents).toBe(5);
    expect(cardCopy?.liveProviderCallsEnabled).toBe(true);
    expect(cardImage?.primaryAdapterId).toBe("runcomfy-model-api-image");
    expect(cardImage?.model).toBe("blackforestlabs/flux-2/dev/text-to-image");
    expect(cardImage?.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(cardImage?.fallbackQueueEnabled).toBe(true);
    expect(cardImage?.rateLimitPerMinute).toBe(8);
    expect(cardImage?.perRequestBudgetCents).toBe(1);
    expect(cardImage?.liveProviderCallsEnabled).toBe(true);
  });

  it("lets the production card-copy model env override stale admin and provider defaults", () => {
    const flow = resolveAiFlowConfig(
      "card-copy",
      {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
        CUSTOMCARD_AI_CARD_COPY_MODEL: productionCardCopyModel
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
    expect(flow.model).toBe(productionCardCopyModel);
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("treats the route-specific card-copy model pin as a valid hosted Cloudflare text setup key", () => {
    const flow = resolveAiFlowConfig("card-copy", {
      CLOUDFLARE_ACCOUNT_ID: "acct_123",
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
      [productionCardCopyModelOverrideEnvKey]: productionCardCopyModel
    });

    expect(cloudflareTextModelEnvKeys).toContain(productionCardCopyModelOverrideEnvKey);
    expect(flow.primaryAdapterId).toBe(productionCardCopyProviderId);
    expect(flow.model).toBe(productionCardCopyModel);
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("uses the fallback Qwen plus DeepAI text2img combo when only those credentials exist", () => {
    const cardCopy = resolveAiFlowConfig("card-copy", recommendedCardGenerationEnv);
    const cardImage = resolveAiFlowConfig("card-image", {
      ...recommendedCardGenerationEnv,
    });

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
    });

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
      CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "token_image",
      CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "cloudflare-workers-ai-image",
    });

    expect(flow.primaryAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.model).toBe("@cf/black-forest-labs/flux-1-schnell");
    expect(flow.readyForLiveCalls).toBe(true);
  });

  it("allows DeepAI text2img as an executable card-image override", () => {
    const flow = resolveAiFlowConfig("card-image", {
      DEEPAI_API_KEY: "deepai-token",
      CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "deepai-text2img-image",
    });

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
      CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "runcomfy-model-api-image",
    });

    expect(flow.primaryAdapterId).toBe("runcomfy-model-api-image");
    expect(flow.model).toBe("blackforestlabs/flux-2/dev/text-to-image");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("rejects the removed deterministic SVG renderer as a card-image override", () => {
    const flow = resolveAiFlowConfig("card-image", {
      ...cloudflareEnv,
      CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "browser-svg-renderer",
    });

    expect(flow.primaryAdapterId).toBe("browser-svg-renderer");
    expect(flow.fallbackAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(false);
    expect(flow.blockedReasons).toEqual(
      expect.arrayContaining(["Adapter browser-svg-renderer is not allowed for card-image."])
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
    const envExample = readFileSync(resolve("D:/manny/Documents/CustomCard/infra/env/.env.example"), "utf8");
    const infraReadme = readFileSync(resolve("D:/manny/Documents/CustomCard/infra/README.md"), "utf8");
    const cloudflareSetupDoc = readFileSync(resolve("D:/manny/Documents/CustomCard/docs/cloudflare-workers-ai-setup.md"), "utf8");

    expect(envExample).toContain(`${productionCardCopyModelOverrideEnvKey}=${productionCardCopyModel}`);
    expect(envExample).toContain(`CUSTOMCARD_CLOUDFLARE_TEXT_MODEL=${productionCardCopyModel}`);
    expect(envExample).toContain(`CLOUDFLARE_WORKERS_AI_TEXT_MODEL=${productionCardCopyModel}`);
    expect(infraReadme).toContain(`CUSTOMCARD_AI_CARD_COPY_MODEL=${productionCardCopyModel}`);
    expect(cloudflareSetupDoc).toContain(`CUSTOMCARD_AI_CARD_COPY_MODEL=${productionCardCopyModel}`);
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
