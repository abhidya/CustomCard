import { describe, expect, it } from "vitest";
import { createAiProviderExecutionAdapter } from "../scripts/ai-provider-execution-adapter.mjs";

describe("AI provider execution adapter", () => {
  it("describes text, OpenAI-compatible, and image adapters from one seam", () => {
    const adapter = createAiProviderExecutionAdapter({
      textProviderExecutors: { "cloudflare-workers-ai-chat": async () => "text" },
      imageProviderExecutors: { "cloudflare-workers-ai-image": async () => "image" },
      openAiCompatibleAdapter: () => undefined,
      executeOpenAiCompatibleTextProvider: async () => "compatible"
    });

    expect(adapter.describe()).toEqual({
      text: [
        "cloudflare-workers-ai-chat",
        "deepseek-chat",
        "fireworks-chat",
        "groq-chat",
        "huggingface-chat",
        "mistral-chat",
        "perplexity-sonar-chat",
        "self-hosted-openai-compatible-chat",
        "together-chat",
        "xai-chat"
      ],
      image: ["cloudflare-workers-ai-image"]
    });
  });

  it("routes direct executors, OpenAI-compatible text adapters, and unsupported adapters explicitly", async () => {
    const adapter = createAiProviderExecutionAdapter({
      textProviderExecutors: { "direct-chat": async () => "direct" },
      imageProviderExecutors: { "direct-image": async () => "image" },
      openAiCompatibleAdapter: (adapterId: string) => (adapterId === "compatible-chat" ? { url: "/v1/chat" } : undefined),
      executeOpenAiCompatibleTextProvider: async (_input: unknown, compatible: { url: string }) => compatible.url
    });

    await expect(adapter.executeText({ flow: { primaryAdapterId: "direct-chat" }, env: {} })).resolves.toBe("direct");
    await expect(adapter.executeText({ flow: { primaryAdapterId: "compatible-chat" }, env: {} })).resolves.toBe(
      "/v1/chat"
    );
    await expect(adapter.executeImage({ flow: { primaryAdapterId: "direct-image" }, env: {} })).resolves.toBe("image");
    await expect(adapter.executeText({ flow: { primaryAdapterId: "missing-chat" }, env: {} })).rejects.toThrow(
      "Adapter missing-chat is configured but not executable in this runtime yet."
    );
    await expect(adapter.executeImage({ flow: { primaryAdapterId: "missing-image" }, env: {} })).rejects.toThrow(
      "Image adapter missing-image is configured but not executable in this runtime yet."
    );
  });
});
