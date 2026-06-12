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
      art_direction: "Botanical watercolor cover.",
      image_prompt:
        "A premium 5x7 vertical greeting card front design for a warm botanical birthday. Soft fern fronds, morning sunlight, tiny trail wildflowers, warm cream paper texture, deep green accents, elegant open space for app-added typography, refined print-ready stationery composition, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    },
    {
      id: "inside-left",
      headline: "A little sunshine",
      body: "May the morning feel bright and unhurried.",
      art_direction: "Soft fern border.",
      image_prompt:
        "A soft 5x7 vertical greeting card inside-left panel with a delicate fern border, pale cream background, subtle watercolor texture, wide blank center area for app-added note text, calm refined stationery design, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    },
    {
      id: "inside-right",
      headline: "From Manny",
      body: "I hope this year brings more hikes, more laughs, and more tiny wonders.",
      art_direction: "Readable message panel.",
      image_prompt:
        "A clean 5x7 vertical greeting card inside-right message panel with warm ivory background, tiny fern sprigs in the corners, subtle trail-line ornament near the bottom, generous blank writing area for app-added message text, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    },
    {
      id: "back",
      headline: "CustomCard",
      body: "Made with CustomCard. Printed locally.",
      art_direction: "Minimal back cover.",
      image_prompt:
        "A minimal 5x7 vertical greeting card back cover design with a warm cream background, small fern sprig near the lower edge, mostly negative space, refined coordinating stationery style, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card" });
    const firstCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const requestBody = JSON.parse(String(firstCall[1]?.body));
    const userPrompt = JSON.parse(requestBody.messages[1].content);

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(firstCall[0])).toContain("/ai/v1/chat/completions");
    expect(requestBody.model).toBe(cloudflareTextModel);
    expect(requestBody.max_tokens).toBe(2200);
    expect(requestBody.messages[0].content).toContain("theme, layout, and copy plan");
    expect(userPrompt.section_order).toEqual(
      expect.arrayContaining([
        "Choose one cohesive theme_guide from the occasion, personal_note, style, and approved memory_notes before writing panels."
      ])
    );
    expect(userPrompt.copy_requirements).toEqual(
      expect.arrayContaining([
        "inside-right body should be 180-420 characters and carry the main personal message plus a natural sign-off when appropriate.",
        "Write final card copy only. Never write meta-copy about the requested tone, style, design language, prompt, theme instructions, CustomCard requirements, or what the card should feel like."
      ])
    );
    expect(userPrompt.layout_requirements).toEqual(
      expect.arrayContaining([
        "front and back should visually match each other; the front carries the strongest hero idea and the back repeats a small quiet echo.",
        "inside-left and inside-right should visually match each other and feel like the opened interior spread."
      ])
    );
    expect(userPrompt.layout_requirements).toEqual(
      expect.arrayContaining([
        "Prefer one of these composition archetypes per panel: cinematic single-object cover, sparse line-art cover, ornate border-first note sheet, lower-corner object cluster, or mostly blank back mark.",
        "Do not use all-over repeating motif patterns unless the user explicitly requests wallpaper, wrapping paper, or dense pattern."
      ])
    );
    expect(requestBody.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
            required: ["theme_guide", "panels", "memory_citations"],
            properties: {
              theme_guide: {
                required: ["theme_title", "palette", "motifs", "border_style", "front_back_pairing", "interior_pairing"]
              },
              panels: {
                minItems: 4,
                maxItems: 4,
                items: {
                  required: ["id", "headline", "body", "art_direction", "image_prompt", "image_negative_prompt"]
                }
              }
            }
          }
    });
    expect(JSON.stringify(result.payload)).toContain("Happy Birthday Sara");
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("falls back to deterministic copy when configured provider credentials are missing", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({ env: {}, fetchImpl });

    const result = await service.generateCard(cardRequest, { rateKey: "test-fallback" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result.payload)).toContain("Happy Birthday Sara");
    expect(JSON.stringify(result.payload)).toContain("fallback_queued");
  });

  it("repairs meta provider copy into human card language before returning the payload", async () => {
    const metaCopyResponse = {
      theme_guide: {
        theme_title: "From Dream to Doctor",
        palette: ["deep navy", "white", "soft gold"],
        motifs: ["white coat", "stethoscope", "ECG line"],
        border_style: "thin gold medical stationery border",
        front_back_pairing: "front and back share the stethoscope motif",
        interior_pairing: "inside panels share quiet borders"
      },
      panels: [
        {
          id: "front",
          headline: "For my brother",
          body: "medical school graduation with a proud, emotional, premium, warm family pride, not cheesy feeling.",
          art_direction: "Medical graduation cover.",
          image_prompt: "A simple border style reserved for the recipient's name.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-left",
          headline: "For this moment",
          body: "He is graduating med school. Design a theme called From Dream to Doctor for the card front. It should carry this approved detail: He pushed through years of exams, late nights, long shifts, and sacrifices.",
          art_direction: "Medical interior.",
          image_prompt: "A simple border style reserved for the main message.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-right",
          headline: "From Manny",
          body: "I wanted this card to feel like proud, emotional, premium, warm family pride, not cheesy, with a design language of deep navy, white, soft gold. The heart of it is simple: The family is proud of his discipline, patience, heart, and dedication. With care, Manny.",
          art_direction: "Medical message panel.",
          image_prompt: "A quiet, polished design with a simple border style.",
          image_negative_prompt: "readable text"
        },
        {
          id: "back",
          headline: "CustomCard",
          body: "Made for my brother with CustomCard.",
          art_direction: "Medical back panel.",
          image_prompt: "A simple border style.",
          image_negative_prompt: "readable text"
        }
      ],
      memory_citations: [
        "He pushed through years of exams, late nights, long shifts, and sacrifices.",
        "The family is proud of his discipline, patience, heart, and dedication."
      ]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: metaCopyResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        recipient: "my brother",
        relationship: "brother",
        occasion: "medical school graduation",
        tone: "proud, emotional, premium, warm family pride, not cheesy",
        style: "deep navy, white, soft gold, elegant medical graduation stationery",
        personal_note: "He is graduating med school. Design a theme called From Dream to Doctor.",
        memory_notes: [
          "He pushed through years of exams, late nights, long shifts, and sacrifices.",
          "The family is proud of his discipline, patience, heart, and dedication."
        ]
      },
      { rateKey: "test-meta-copy-repair" }
    );
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };
    const serializedCopy = JSON.stringify(payload.card_copy);

    expect(result.statusCode).toBe(200);
    expect(payload.card_copy.panels[0]).toMatchObject({
      headline: "From Dream to Doctor",
      body: "For every late night, long shift, and quiet sacrifice that brought you here."
    });
    expect(payload.card_copy.panels[1]).toMatchObject({
      headline: "Years In The Making"
    });
    expect(payload.card_copy.panels[2].body).toContain("patience, heart, and dedication");
    expect(payload.card_copy.panels[3]).toMatchObject({
      headline: "From Dream to Doctor"
    });
    expect(serializedCopy).not.toMatch(
      /with a .* feeling|I wanted this card to feel|design language|The heart of it is simple|approved detail|Made for .* with CustomCard|A card made with care/i
    );
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("repairs third-person medical milestone copy before returning the payload", async () => {
    const medicalRegressionResponse = {
      theme_guide: {
        theme_title: "From Dream to Doctor",
        palette: ["deep navy", "white", "soft gold"],
        motifs: ["white coat", "stethoscope", "ECG line"],
        border_style: "thin gold medical stationery border",
        front_back_pairing: "front and back share the medical line motif",
        interior_pairing: "inside panels share quiet borders"
      },
      panels: [
        {
          id: "front",
          headline: "From Dream to Doctor",
          body: "For every late night, long shift, and quiet sacrifice that brought you here.",
          art_direction: "Medical cover.",
          image_prompt: "A deep navy medical graduation cover with a stethoscope and cap.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-left",
          headline: "Congratulations, Doctor!",
          body: "He pushed through years of exams, late nights, long shifts, and sacrifices. His dedication paid off.",
          art_direction: "Medical interior.",
          image_prompt: "A border-first inside-left medical stationery panel.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-right",
          headline: "A Journey of Discipline and Heart",
          body: "He pushed through years of exams, late nights, long shifts, and sacrifices. His dedication, patience, heart, and discipline led him here.",
          art_direction: "Medical interior.",
          image_prompt: "A border-first inside-right medical stationery panel.",
          image_negative_prompt: "readable text"
        },
        {
          id: "back",
          headline: "Congratulations, Doctor!",
          body: "With pride, love, and deep respect for the doctor you worked so hard to become.",
          art_direction: "Medical back.",
          image_prompt: "A minimal medical back panel.",
          image_negative_prompt: "readable text"
        }
      ],
      memory_citations: ["He pushed through years of exams, late nights, long shifts, and sacrifices."]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: medicalRegressionResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        recipient: "my brother",
        relationship: "brother",
        occasion: "medical school graduation",
        style: "deep navy, white, soft gold medical graduation stationery",
        memory_notes: [
          "He pushed through years of exams, late nights, long shifts, and sacrifices.",
          "The family is proud of his discipline, patience, heart, and dedication."
        ]
      },
      { rateKey: "test-medical-third-person-repair" }
    );
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };

    expect(payload.card_copy.panels[1]).toMatchObject({
      headline: "Years In The Making",
      body: "You kept going through exams, late nights, long shifts, and the sacrifices most people never saw. Today honors the discipline behind the white coat as much as the degree itself."
    });
    expect(payload.card_copy.panels[2].body).toContain("We are proud not only of the doctor you are becoming");
    expect(payload.card_copy.panels[3].headline).toBe("From Dream to Doctor");
  });

  it("honors a trusted admin live-provider off toggle even when credentials exist", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG: "true"
      },
      fetchImpl
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard(
      { ...cardRequest, aiFlowConfig },
      { rateKey: "test-admin-off", trustRequestAiFlowConfig: true }
    );

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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
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

  it("ignores request-scoped provider toggles from untrusted customer contexts even when env opt-in exists", async () => {
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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG: "true"
      },
      fetchImpl
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard({ ...cardRequest, aiFlowConfig }, { rateKey: "test-untrusted-config" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.payload).toMatchObject({
      live_provider_calls_enabled: true,
      external_network_calls: true
    });
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "cloudflare-workers-ai-image",
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
    expect(imageBodies[0].prompt).toContain("Full-bleed flat 2D artwork layer");
    expect(imageBodies[1].prompt).toContain("inside-left print panel");
    expect(imageBodies[2].prompt).toContain("inside-right print panel");
    expect(imageBodies[3].prompt).toContain("back print panel");
    expect(imageBodies.every((body) => body.prompt.includes("no readable text"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("no words"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("no logos"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("no watermark"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("No people"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("No hands"))).toBe(true);
    expect(imageBodies.every((body) => /not a physical .*card/i.test(body.prompt))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("folded card mockup"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("tabletop scene"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("people"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("hands"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("readable text"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("fake text"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("product photo"))).toBe(true);
    expect(imageBodies.map((body) => body.prompt).join(" ")).not.toMatch(
      /Recipient:|Relationship:|Panel headline|Panel body|Language context|Art direction:/
    );
    expect(JSON.stringify(result.payload)).not.toContain("test_image_token");
  });

  it("uses the Flux image request shape and unwraps JSON base64 images", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ result: { image: "/9j/AAAA" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "cloudflare-workers-ai-image",
        CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/black-forest-labs/flux-1-schnell",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-flux-images" });
    const imageBodies = (fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][])
      .map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(imageBodies.every((body) => body.steps === 8)).toBe(true);
    expect(imageBodies.every((body) => typeof body.prompt === "string" && body.prompt.length > 0)).toBe(true);
    expect(imageBodies.every((body) => !("negative_prompt" in body))).toBe(true);
    expect(imageBodies.every((body) => !("width" in body) && !("height" in body))).toBe(true);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/jpeg;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_image_token");
  });

  it("uses OpenAI Responses structured output and OpenAI image generation when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/v1/responses")) {
        return new Response(JSON.stringify({ output_text: JSON.stringify(cardCopyResponse) }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ data: [{ b64_json: "iVBORw0KGgo=" }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        OPENAI_API_KEY: "test_openai_token",
        CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID: "openai-responses-chat",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "openai-images",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-openai-images" });
    const textCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const textBody = JSON.parse(String(textCall[1]?.body));
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(String(textCall[0])).toBe("https://api.openai.com/v1/responses");
    expect(textBody.text.format).toMatchObject({
      type: "json_schema",
      name: "customcard_card_copy",
      strict: true
    });
    expect(textBody.text.format.schema.required).toEqual(expect.arrayContaining(["theme_guide", "panels", "memory_citations"]));
    expect(imageCalls.every((call) => String(call[0]) === "https://api.openai.com/v1/images/generations")).toBe(true);
    expect(imageBodies.every((body) => body.model === "gpt-image-2")).toBe(true);
    expect(imageBodies.every((body) => body.size === "1024x1536" && body.n === 1)).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_openai_token");
  });

  it("uses Gemini structured text output and Gemini inline image responses when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/v1beta/models/")) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(cardCopyResponse) }] } }]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "iVBORw0KGgo=" } }] } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const service = createAiCardGenerationService({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "test_google_token",
        CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID: "google-gemini-chat",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "google-gemini-image",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-gemini-images" });
    const textCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const textBody = JSON.parse(String(textCall[1]?.body));
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(String(textCall[0])).toContain("/v1beta/models/gemini-1.5-flash:generateContent");
    expect(textBody.generationConfig.responseFormat.text).toMatchObject({
      mimeType: "application/json",
      schema: expect.objectContaining({ required: ["theme_guide", "panels", "memory_citations"] })
    });
    expect(imageCalls.every((call) => String(call[0]).includes("/v1/models/gemini-3.1-flash-image:generateContent"))).toBe(true);
    expect(imageBodies.every((body) => body.generationConfig.responseModalities[0] === "Image")).toBe(true);
    expect(imageBodies.every((body) => body.generationConfig.responseFormat.image.aspectRatio === "3:4")).toBe(true);
    expect(imageBodies.every((body) => body.generationConfig.responseFormat.image.imageSize === "2K")).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_google_token");
  });

  it("repairs unsafe LLM image prompts before sending them to the image provider", async () => {
    const unsafeCopyResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) =>
        panel.id === "front"
          ? {
              ...panel,
              image_prompt:
                "A small business owner holding a 'Thank you' sign with hands visible, surrounded by happy customers, with the shop's logo in the top left and a worn creased paper card.",
              image_negative_prompt: "readable text, people, hands"
            }
          : panel
      )
    };
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(unsafeCopyResponse) } }] }), {
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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "cloudflare-workers-ai-image",
        CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    await service.generateCard(
      {
        ...cardRequest,
        occasion: "thank-you for supporting a small business",
        style: "warm citrus, soft gold, deep teal, local shop texture"
      },
      { rateKey: "test-card-image-repair" }
    );
    const frontImageCall = fetchImpl.mock.calls[1] as unknown as [RequestInfo | URL, RequestInit?];
    const frontBody = JSON.parse(String(frontImageCall[1]?.body));

    expect(frontBody.prompt).toContain("small-business thank-you stationery");
    expect(frontBody.prompt).toContain("controlled citrus-and-leaf corner arrangement");
    expect(frontBody.prompt).toContain("boutique awning silhouette");
    expect(frontBody.prompt).not.toMatch(/owner|customers|holding|['"]?thank you['"]?\s+sign|signage|shop['’]?s logo|creased|worn/i);
    expect(frontBody.prompt).toMatch(/no readable text/i);
    expect(frontBody.prompt).toMatch(/no people/i);
    expect(frontBody.prompt).toMatch(/no hands/i);
  });

  it("rebuilds vague or copy-leaking LLM image prompts into concrete visual briefs", async () => {
    const vagueCopyResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        art_direction:
          panel.id === "front" ? "Elegant medical graduation cover with navy, gold, stethoscope, and cap motifs." : panel.art_direction,
        image_prompt:
          panel.id === "front"
            ? "Deep navy background, white (10%) text, soft gold accents, centered white graduation cap with soft gold tassel."
            : panel.id === "back"
              ? "A simple border style reserved for the main message."
              : "A quiet, polished design with a simple border style reserved for the recipient's name.",
        image_negative_prompt: "readable text, fake text, mockup"
      }))
    };
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(vagueCopyResponse) } }] }), {
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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "cloudflare-workers-ai-image",
        CLOUDFLARE_WORKERS_AI_IMAGE_MODEL: "@cf/bytedance/stable-diffusion-xl-lightning",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    await service.generateCard(
      {
        ...cardRequest,
        occasion: "medical school graduation",
        style: "deep navy and soft gold medical milestone",
        personal_note: "Sara is becoming a doctor."
      },
      { rateKey: "test-card-image-specificity-repair" }
    );
    const imageBodies = (fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][])
      .map((call) => JSON.parse(String(call[1]?.body)));

    expect(imageBodies[0].prompt).toContain("medical-school graduation artwork");
    expect(imageBodies[0].prompt).toContain("graduation cap");
    expect(imageBodies[0].prompt).toContain("stethoscope hero composition");
    expect(imageBodies[0].prompt).toContain("never dense repeated medical icons");
    expect(imageBodies[1].prompt).toContain("inside-left print panel");
    expect(imageBodies[2].prompt).toContain("inside-right print panel");
    expect(imageBodies[3].prompt).toContain("back print panel");
    expect(imageBodies.map((body) => body.prompt).join(" ")).not.toMatch(
      /recipient['’]?s?\s+name|main message|headline|card copy|exact text|personal message|scene-setting message|white\s*\(\d+%\)\s*text/i
    );
  });

  it("can route card images to deterministic browser SVG artwork when configured", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "browser-svg-renderer",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-browser-svg-images" });
    const payload = result.payload as {
      generated_by: string;
      images: Array<{ panel_id: string; image_url: string; revised_prompt: string }>;
      ai_flow: { card_image: { primary_adapter_id: string; adapter_id: string } };
    };

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(payload.generated_by).toBe("ai-text-and-image");
    expect(payload.ai_flow.card_image.primary_adapter_id).toBe("browser-svg-renderer");
    expect(payload.ai_flow.card_image.adapter_id).toBe("browser-svg-renderer");
    expect(payload.images.map((image) => image.panel_id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/svg+xml;base64,"))).toBe(true);
    expect(Buffer.from(payload.images[0].image_url.split(",")[1], "base64").toString("utf8")).toContain("<svg");
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("keeps deterministic SVG artwork on the tool theme for plural tools and glue prompts", async () => {
    const toolCopyResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        image_prompt:
          panel.id === "inside-right"
            ? "A stylized illustration of a glue stick, surrounded by a few tools and blueprint accents."
            : "A flat Father's Day pattern with tools, blueprints, wrenches, and fix-it workshop details.",
        image_negative_prompt: "readable text, fake text, mockup, people, hands"
      }))
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(toolCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "browser-svg-renderer",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        recipient: "Dad",
        occasion: "Father's Day",
        style: "workshop blueprint tools"
      },
      { rateKey: "test-browser-svg-tools" }
    );
    const payload = result.payload as {
      images: Array<{ image_url: string }>;
    };
    const svgs = payload.images.map((image) => decodeSvgDataUrl(image.image_url));
    const interiorMotifCenters = svgs
      .slice(1, 3)
      .flatMap((svg) => svgMotifCenters(svg));

    expect(payload.images).toHaveLength(4);
    expect(svgs.every((svg) => svg.includes('fill="#0f6b5f"'))).toBe(true);
    expect(interiorMotifCenters.some(({ x, y }) => x > 220 && x < 1280 && y > 400 && y < 1720)).toBe(false);
    expect(svgs.join(" ")).not.toContain("<text");
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
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
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
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });
});

function decodeSvgDataUrl(dataUrl: string) {
  return Buffer.from(dataUrl.split(",")[1], "base64").toString("utf8");
}

function svgMotifCenters(svg: string) {
  return Array.from(svg.matchAll(/transform="translate\((-?\d+) (-?\d+)\)/g), ([, x, y]) => ({
    x: Number(x),
    y: Number(y)
  }));
}
