import { describe, expect, it } from "vitest";
import {
  buildDefaultAiFlowAdminConfigs,
  resolveAiFlowConfig,
  summarizeAiFlowConfigs
} from "./aiFlowConfig";

const cloudflareEnv = {
  CLOUDFLARE_ACCOUNT_ID: "acct_123",
  CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
  CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
  CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "token_image",
  CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning"
};

describe("AI flow config", () => {
  it("resolves configured Cloudflare text flows as live-ready from env", () => {
    const flow = resolveAiFlowConfig("card-copy", cloudflareEnv);

    expect(flow.primaryAdapterId).toBe("cloudflare-workers-ai-chat");
    expect(flow.model).toBe("@cf/meta/llama-3.1-8b-instruct-fast");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("keeps Cloudflare as the preferred image adapter while live calls stay disabled by default", () => {
    const configs = buildDefaultAiFlowAdminConfigs();
    const cardCopy = configs.find((config) => config.flowId === "card-copy");
    const cardImage = configs.find((config) => config.flowId === "card-image");

    expect(cardCopy?.primaryAdapterId).toBe("cloudflare-workers-ai-chat");
    expect(cardCopy?.liveProviderCallsEnabled).toBe(true);
    expect(cardImage?.primaryAdapterId).toBe("cloudflare-workers-ai-image");
    expect(cardImage?.fallbackAdapterId).toBe("browser-svg-renderer");
    expect(cardImage?.liveProviderCallsEnabled).toBe(false);
  });

  it("routes card-image to Cloudflare when image credentials and live calls are enabled", () => {
    const flow = resolveAiFlowConfig("card-image", {
      ...cloudflareEnv,
      CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
    });

    expect(flow.primaryAdapterId).toBe("cloudflare-workers-ai-image");
    expect(flow.fallbackAdapterId).toBe("browser-svg-renderer");
    expect(flow.model).toBe("@cf/bytedance/stable-diffusion-xl-lightning");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("allows the deterministic SVG renderer as an explicit card-image override", () => {
    const flow = resolveAiFlowConfig("card-image", {
      ...cloudflareEnv,
      CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "browser-svg-renderer",
      CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
    });

    expect(flow.primaryAdapterId).toBe("browser-svg-renderer");
    expect(flow.fallbackAdapterId).toBe("browser-svg-renderer");
    expect(flow.liveProviderCallsEnabled).toBe(true);
    expect(flow.readyForLiveCalls).toBe(true);
    expect(flow.blockedReasons).toEqual([]);
  });

  it("honors admin provider, model, prompt, rate, budget, and fallback queue overrides", () => {
    const flow = resolveAiFlowConfig("customer-chat", cloudflareEnv, [
      {
        flowId: "customer-chat",
        primaryAdapterId: "groq-chat",
        fallbackAdapterId: "deterministic-customer-chat",
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

  it("summarizes configured providers without exposing secret values", () => {
    const summary = summarizeAiFlowConfigs(cloudflareEnv);

    expect(summary.total).toBe(3);
    expect(summary.configuredProviders).toEqual(
      expect.arrayContaining(["cloudflare-workers-ai-chat", "cloudflare-workers-ai-image"])
    );
    expect(JSON.stringify(summary)).not.toContain("token_text");
  });
});
