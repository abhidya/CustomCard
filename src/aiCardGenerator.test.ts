import { describe, expect, it, vi } from "vitest";
import { createAiCardGenerationService } from "../scripts/ai-card-generator.mjs";
import { buildDefaultAiFlowAdminConfigs } from "./aiFlowConfig";

const cardRequest = {
  sender: "Manny",
  recipient: "Sara",
  relationship: "friend",
  occasion: "birthday",
  tone: "warm",
  style: "botanical",
  language: "English",
  personal_note: "She loves morning hikes.",
  memory_notes: ["She keeps a fern by the kitchen window."],
  aiFlowConfig: buildDefaultAiFlowAdminConfigs()
};

const cloudflareTextModel = "@cf/meta/llama-3.1-8b-instruct-fast";

const cardCopyResponse = {
  panels: [
    {
      id: "front",
      headline: "Happy Birthday Sara",
      body: "Wishing you a day full of green trails and good coffee.",
      art_direction: "Botanical watercolor cover."
    },
    {
      id: "inside-left",
      headline: "A little sunshine",
      body: "May the morning feel bright and unhurried.",
      art_direction: "Soft fern border."
    },
    {
      id: "inside-right",
      headline: "From Manny",
      body: "I hope this year brings more hikes, more laughs, and more tiny wonders.",
      art_direction: "Readable message panel."
    },
    {
      id: "back",
      headline: "CustomCard",
      body: "Made with CustomCard. Printed locally.",
      art_direction: "Minimal back cover."
    }
  ],
  memory_citations: ["She keeps a fern by the kitchen window."]
};

describe("AI card generator service", () => {
  it("uses Cloudflare JSON Mode for card copy without returning secrets", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: { response: cardCopyResponse }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "secret_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card" });
    const firstCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const requestBody = JSON.parse(String(firstCall[1]?.body));

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(firstCall[0])).toContain("/ai/v1/chat/completions");
    expect(requestBody.model).toBe(cloudflareTextModel);
    expect(requestBody.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        required: ["panels", "memory_citations"],
        properties: {
          panels: {
            minItems: 4,
            maxItems: 4
          }
        }
      }
    });
    expect(JSON.stringify(result.payload)).toContain("Happy Birthday Sara");
    expect(JSON.stringify(result.payload)).not.toContain("secret_text");
  });

  it("falls back to deterministic copy when configured provider credentials are missing", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({ env: {}, fetchImpl });

    const result = await service.generateCard(cardRequest, { rateKey: "test-fallback" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result.payload)).toContain("For Sara");
    expect(JSON.stringify(result.payload)).toContain("fallback_queued");
  });

  it("honors an admin live-provider off toggle even when credentials exist", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "secret_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG: "true"
      },
      fetchImpl
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard({ ...cardRequest, aiFlowConfig }, { rateKey: "test-admin-off" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result.payload)).toContain("Live provider calls disabled");
  });

  it("ignores request-scoped provider toggles unless explicitly enabled", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ panels: [] }) } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "secret_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel
      },
      fetchImpl
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard({ ...cardRequest, aiFlowConfig }, { rateKey: "test-request-config-ignored" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.payload).toMatchObject({
      live_provider_calls_enabled: true
    });
  });

  it("generates one live image request for each 5x7 card panel", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "secret_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "secret_image",
        CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-images" });
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      generated_by: string;
      images: Array<{ panel_id: string; revised_prompt: string; width: number; height: number }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(payload.generated_by).toBe("ai-text-and-image");
    expect(payload.images.map((image) => image.panel_id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(imageBodies.map((body) => body.metadata.customcard.panel_id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(imageBodies.every((body) => body.width === 1464 && body.height === 2048)).toBe(true);
    expect(imageBodies.every((body) => body.metadata.customcard.generation_strategy === "one-provider-request-per-panel")).toBe(true);
    expect(imageBodies[0].prompt).toContain("FRONT COVER");
    expect(imageBodies[1].prompt).toContain("INSIDE LEFT PANEL");
    expect(imageBodies[2].prompt).toContain("INSIDE RIGHT PANEL");
    expect(imageBodies[3].prompt).toContain("BACK COVER");
    expect(JSON.stringify(result.payload)).not.toContain("secret_image");
  });

  it("uses the customer-chat flow for chat replies", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "I can help shape this into a warm birthday card." } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "secret_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CUSTOMER_CHAT_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.respondChat(
      {
        customer_message: "Can you make it warmer?",
        recipient_name: "Sara",
        approved_memory_notes: [],
        locale: "en-US",
        fulfillment_context: "Walgreens pickup is review-only.",
        aiFlowConfig: buildDefaultAiFlowAdminConfigs()
      },
      { rateKey: "test-chat" }
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.stringify(result.payload)).toContain("warm birthday card");
    expect(JSON.stringify(result.payload)).not.toContain("secret_text");
  });
});
