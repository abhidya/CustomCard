import { describe, expect, it } from "vitest";
import { createAiCardGenerationService } from "../scripts/ai-card-generator.mjs";

const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

describe("AI card generator image prompts", () => {
  it("keeps mockup failure terms out of positive image prompts when must_avoid includes mockup", async () => {
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
                    theme_title: "Quiet Aquarium Ritual",
                    palette: ["soft teal", "warm ivory", "sage"],
                    motifs: ["aquatic plants", "gentle ripples", "small fish silhouettes"],
                    border_style: "thin ripple border",
                    front_back_pairing: "hero plant and small ripple echo",
                    interior_pairing: "edge-led aquatic stationery"
                  },
                  panels: ["front", "inside-left", "inside-right", "back"].map((id) => ({
                    id,
                    headline: id === "front" ? "Nina, a quiet birthday wish" : id === "back" ? "" : "For your calm waters",
                    body:
                      id === "inside-right"
                        ? "Happy birthday, Nina. May your aquarium rituals bring the same small discoveries and calm beauty into the year ahead."
                        : id === "inside-left"
                          ? "For every tiny fish, leaf, and ripple you notice, I hope today gives you a little quiet joy back."
                          : id === "back"
                            ? "With care, Riley"
                            : "for the keeper of calm waters",
                    art_direction:
                      "Flat premium stationery panel with aquatic plant motifs, coordinated ripple border, and clean text-safe space.",
                    visual_cue:
                      "Elegant aquatic plant shapes, gentle ripples, soft teal and ivory palette, and quiet open space for app-rendered typography.",
                    text_layout: {
                      headline_zone: id === "front" ? "upper" : "top",
                      body_zone: id === "back" ? "bottom" : "center",
                      alignment: "center",
                      font_pairing: "soft-serif",
                      color_mode: "dark-ink",
                      scale: "standard"
                    },
                    image_prompt:
                      "Premium 5x7 vertical flat print panel artwork with aquatic plants, gentle ripples, soft teal and ivory palette, and clean text-safe negative space.",
                    image_negative_prompt:
                      "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
                  })),
                  memory_citations: ["Nina loves freshwater aquariums."]
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
        CLOUDFLARE_ACCOUNT_ID: "account",
        CLOUDFLARE_API_TOKEN: "token",
        DEEPAI_API_KEY: "deepai"
      },
      fetchImpl
    });

    const response = await service.generateCard(
      {
        sender: "Riley",
        recipient: "Nina",
        relationship: "friend",
        occasion: "birthday",
        tone: "warm and polished",
        style: "premium folded greeting card for an aquarium lover",
        language: "English",
        personal_note:
          "Make a birthday card for Nina, who relaxes by tending her freshwater aquarium.",
        memory_notes: ["Nina loves freshwater aquariums, aquatic plants, and tiny fish."],
        must_include: ["Nina", "birthday", "aquarium"],
        must_avoid: ["mockup"],
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
        rateKey: "mockup-negative-prompt-test",
        trustRequestAiFlowConfig: true
      }
    );

    expect(response.statusCode).toBe(200);
    expect(deepAiPrompts).toHaveLength(4);
    expect(deepAiPrompts.join("\n").toLowerCase()).not.toContain("mockup");
  });

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
        CLOUDFLARE_ACCOUNT_ID: "account",
        CLOUDFLARE_API_TOKEN: "token",
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

  it("repairs manuscript and fake-writing prompts before sending image work", async () => {
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
                    theme_title: "Quiet Botanical Birthday",
                    palette: ["warm ivory", "deep green", "soft gold"],
                    motifs: ["leaf edge", "small trail mark", "quiet open center"],
                    border_style: "thin leaf rule",
                    front_back_pairing: "single leaf hero and lower echo",
                    interior_pairing: "light interiors with edge leaves"
                  },
                  panels: ["front", "inside-left", "inside-right", "back"].map((id) => ({
                    id,
                    headline: id === "back" ? "" : "Happy Birthday Papa",
                    body:
                      id === "inside-right"
                        ? "Wishing you joy, peace, and more good days outside with the people who love you."
                        : id === "inside-left"
                          ? "For the hikes, stories, and lessons that stay with us."
                          : "",
                    art_direction: "Botanical birthday stationery with quiet text-safe space.",
                    visual_cue: "One leafy edge motif, soft gold corner rule, and a clean open text-safe field.",
                    text_layout: {
                      headline_zone: "upper",
                      body_zone: id === "back" ? "bottom" : "center",
                      alignment: "center",
                      font_pairing: "soft-serif",
                      color_mode: "dark-ink",
                      scale: "standard"
                    },
                    image_prompt:
                      "Ornate notebook manuscript page filled with fake handwritten prayers, religious calligraphy, ink scribbles, and margin notes around a central message field.",
                    image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands"
                  })),
                  memory_citations: ["Papa loves walks, stories, and family wisdom."]
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
        CLOUDFLARE_ACCOUNT_ID: "account",
        CLOUDFLARE_API_TOKEN: "token",
        DEEPAI_API_KEY: "deepai"
      },
      fetchImpl
    });

    const response = await service.generateCard(
      {
        sender: "Mann",
        recipient: "Papa",
        relationship: "son",
        occasion: "birthday",
        tone: "sentimental",
        style: "botanical",
        language: "English",
        personal_note: "Make a warm birthday card for Papa.",
        memory_notes: ["walks", "stories", "family wisdom"],
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
        rateKey: "manuscript-repair-test",
        trustRequestAiFlowConfig: true
      }
    );

    const promptText = deepAiPrompts.join("\n").toLowerCase();

    expect(response.statusCode).toBe(200);
    expect(deepAiPrompts).toHaveLength(4);
    expect(promptText).toContain("no readable text");
    expect(promptText).not.toContain("notebook");
    expect(promptText).not.toContain("manuscript");
    expect(promptText).not.toContain("handwritten prayers");
    expect(promptText).not.toContain("religious calligraphy");
    expect(promptText).not.toContain("ink scribbles");
    expect(promptText).not.toContain("margin notes");
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
