import { describe, expect, it } from "vitest";
import { createAiCardGenerationService } from "../scripts/ai-card-generator.mjs";

const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

describe("AI card generator image prompts", () => {
  it("sends DeepAI a compact quiet-care prompt without literal device or note-card motifs", async () => {
    const deepAiPrompts: string[] = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.includes("chat/completions")) {
        return jsonResponse({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  theme_guide: {
                    theme_title: "Quiet Support",
                    palette: ["deep moss", "warm ivory", "soft taupe"],
                    motifs: ["practical-care relief", "folded cloth", "quiet path curve"],
                    border_style: "open-edge practical care",
                    front_back_pairing: "deep moss covers",
                    interior_pairing: "warm ivory interiors"
                  },
                  panels: ["front", "inside-left", "inside-right", "back"].map((id) => ({
                    id,
                    headline: id === "inside-right" ? "From Jordan" : id === "back" ? "With Care" : "For Eli",
                    body:
                      id === "inside-left"
                        ? "I am so sorry about your father. I am here beside you at whatever pace the day allows."
                        : id === "inside-right"
                          ? "Meals, rides, calls, and silence are all real forms of care. You do not have to manage this alone."
                          : "",
                    art_direction:
                      "Practical-care sympathy panel with deep moss and warm ivory, lower-edge care relief, and plain text-safe space.",
                    visual_cue:
                      "Deep moss and warm ivory practical-care relief with covered meal shape, folded cloth, quiet path curve, and open text-safe field.",
                    text_layout: {
                      headline_zone: "upper",
                      body_zone: "center",
                      alignment: "center",
                      font_pairing: "soft-serif",
                      color_mode: id === "front" || id === "back" ? "light-ink" : "dark-ink",
                      scale: "large"
                    },
                    image_prompt:
                      "Full-bleed flat 2D practical-care sympathy illustration with muted phone silhouette, blank note card, warm title-safe glow, and lower care vignette.",
                    image_negative_prompt:
                      "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
                  })),
                  memory_citations: ["Eli lost his father."]
                })
              }
            }
          ]
        });
      }

      if (href.includes("deepai.org/api/text2img")) {
        const body = init?.body;
        if (body instanceof FormData) {
          deepAiPrompts.push(String(body.get("text") || ""));
        }
        return jsonResponse({ output_url: `data:image/png;base64,${onePixelPng}` });
      }

      throw new Error(`Unexpected fetch URL: ${href}`);
    };

    const service = createAiCardGenerationService({
      env: {
        CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG: "true",
        CLOUDFLARE_ACCOUNT_ID: "account",
        CLOUDFLARE_API_TOKEN: "token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
        DEEPAI_API_KEY: "deepai"
      },
      fetchImpl
    });

    const response = await service.generateCard(
      {
        sender: "Jordan",
        recipient: "Eli",
        relationship: "friend",
        occasion: "sympathy/support",
        tone: "calm, grounded, deeply respectful",
        style: "quiet practical care",
        language: "English",
        personal_note:
          "A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.",
        memory_notes: [
          "Eli lost his father.",
          "Jordan wants to offer practical support: meals, rides, calls, and silence."
        ],
        aiFlowConfig: [
          {
            flowId: "card-copy",
            primaryAdapterId: "cloudflare-workers-ai-chat",
            liveProviderCallsEnabled: true
          },
          {
            flowId: "card-image",
            primaryAdapterId: "deepai-text2img-image",
            liveProviderCallsEnabled: true
          }
        ]
      },
      {
        rateKey: "prompt-test",
        trustRequestAiFlowConfig: true
      }
    );

    expect(response.statusCode).toBe(200);
    expect(deepAiPrompts).toHaveLength(4);
    expect(deepAiPrompts[0]).toContain("Portrait 5x7 front cover");
    expect(deepAiPrompts[0]).toContain("covered meal shape");
    expect(deepAiPrompts[0]).toContain("No bright yellow");
    expect(deepAiPrompts[0]).toContain("No phone");
    expect(deepAiPrompts.join("\n")).not.toContain("muted phone silhouette");
    expect(deepAiPrompts.join("\n")).not.toContain("blank note card, and muted phone");
    expect(deepAiPrompts.join("\n")).not.toContain("warm title-safe glow");
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
