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

describe("AI card generator service", () => {
  it("uses configured Cloudflare text provider for card copy without returning secrets", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
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
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "secret_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.2-3b-instruct",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card" });
    const firstCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(firstCall[0])).toContain("/ai/v1/chat/completions");
    expect(JSON.parse(String(firstCall[1]?.body)).model).toBe("@cf/meta/llama-3.2-3b-instruct");
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
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.2-3b-instruct"
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
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.2-3b-instruct",
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
