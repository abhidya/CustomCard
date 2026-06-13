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
        "Preserve exact concrete facts from personal_note and memory_notes in final copy: names, relationships, dates, places, product names, CTA nouns, and practical support items. Do not replace literal requested items such as meals, rides, calls, silence, QR, dates, names, or business terms with generic summaries.",
        "inside-right body should be 180-420 characters and carry the main personal message plus a natural sign-off when appropriate.",
        "Write final card copy only. Never write meta-copy about the requested tone, style, design language, prompt, theme instructions, CustomCard requirements, or what the card should feel like."
      ])
    );
    expect(userPrompt.story_playbooks).toEqual(
      expect.arrayContaining([
        "High-memory get-well or recovery cards: weave only approved inside jokes into tender support, avoid medical advice, diagnosis, miracle-cure language, pity, or clownish meme overload.",
        "B2B lifecycle or warranty cards: preserve exact customer, business, date, product, and CTA facts; make the CTA clear but calm; never invent discounts, legal terms, shipment status, or order/payment claims.",
        "Wedding or distant-family cards: be respectful and warm without overclaiming closeness; use a short non-denominational blessing unless a religion is explicitly specified, and reserve handwriting space when requested."
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
        "Do not use all-over repeating motif patterns unless the user explicitly requests wallpaper, wrapping paper, or dense pattern.",
        "visual_cue is binding for the image prompt: make front, inside-left, inside-right, and back visually distinct while still coordinated.",
        "text_layout controls app-rendered typography only. Choose zones that match the clean text-safe area in visual_cue; never ask the image model to draw the text."
      ])
    );
    expect(userPrompt.image_prompt_requirements).toEqual(
      expect.arrayContaining([
        "For B2B CTA cards, reserve a clean app-overlay area for any QR code or account-manager CTA; do not ask the image model to draw QR codes, labels, or interface elements.",
        "For cards requesting handwriting space, reserve an open note area but do not ask the image model to create handwriting, signatures, script, or fake personal notes."
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
                  required: ["id", "headline", "body", "art_direction", "visual_cue", "text_layout", "image_prompt", "image_negative_prompt"]
                }
              }
            }
          }
    });
    expect(JSON.stringify(result.payload)).toContain("text_layout");
    expect(JSON.stringify(result.payload)).toContain("visual_cue");
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

  it("enforces monthly text spend caps before making another provider call", async () => {
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
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_COPY_MONTHLY_BUDGET_CENTS: "12",
        CUSTOMCARD_AI_CARD_COPY_PER_REQUEST_BUDGET_CENTS: "12"
      },
      fetchImpl
    });

    const first = await service.generateCard(cardRequest, { rateKey: "test-monthly-budget", idempotencyKey: "idem-1" });
    const second = await service.generateCard(cardRequest, { rateKey: "test-monthly-budget", idempotencyKey: "idem-2" });
    const secondPayload = second.payload as {
      ai_flow: { card_copy: { provider_failure?: string } };
      ai_cost_gate: { blocked_reasons: string[]; reserved_or_spent_cents: number };
      provider_call_events: Array<{ status: string; fallback_reason?: string }>;
    };

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(secondPayload.ai_flow.card_copy.provider_failure).toContain("projected monthly spend");
    expect(secondPayload.ai_cost_gate.blocked_reasons).toContain("monthly-budget-exceeded");
    expect(secondPayload.provider_call_events).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "blocked", fallback_reason: "monthly-budget-exceeded" })])
    );
  });

  it("counts all four image panels against rate limits before image provider calls", async () => {
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
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_RATE_LIMIT_PER_MINUTE: "3"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-image-rate-units" });
    const payload = result.payload as {
      generated_by: string;
      images: unknown[];
      ai_flow: { card_image: { provider_failure?: string } };
      provider_call_events: Array<{ flow_id: string; status: string; fallback_reason?: string; request_units: number }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(payload.generated_by).toBe("ai-text-only");
    expect(payload.images).toHaveLength(0);
    expect(payload.ai_flow.card_image.provider_failure).toContain("rate limit 3/minute");
    expect(payload.provider_call_events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flow_id: "card-image",
          status: "blocked",
          fallback_reason: "rate-limit-exceeded",
          request_units: 4
        })
      ])
    );
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
      card_copy: { panels: Array<{ id: string; headline: string; body: string; visual_cue?: string; text_layout?: Record<string, string>; image_prompt?: string }> };
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
      card_copy: {
        panels: Array<{
          id: string;
          headline: string;
          body: string;
          visual_cue?: string;
          text_layout?: Record<string, string>;
          image_prompt?: string;
        }>;
      };
    };

    expect(payload.card_copy.panels[1]).toMatchObject({
      headline: "Years In The Making",
      body: "You kept going through exams, late nights, long shifts, and the sacrifices most people never saw. Today honors the discipline behind the white coat as much as the degree itself."
    });
    expect(payload.card_copy.panels[2].body).toContain("We are proud not only of the doctor you are becoming");
    expect(payload.card_copy.panels[3].headline).toBe("From Dream to Doctor");
    expect(payload.card_copy.panels[0].visual_cue).toContain("White doctor's coat");
    expect(payload.card_copy.panels[1].visual_cue).toContain("Quiet desk after a long hospital shift");
    expect(payload.card_copy.panels[2].visual_cue).toContain("Golden sunrise through a hospital window");
    expect(payload.card_copy.panels[3].visual_cue).toContain("stethoscope forming a subtle heart");
    expect(payload.card_copy.panels[0].text_layout).toMatchObject({ headline_zone: "upper", body_zone: "lower" });
    expect(payload.card_copy.panels[1].text_layout).toMatchObject({ alignment: "left", font_pairing: "soft-serif" });
    expect(payload.card_copy.panels[1].image_prompt).toContain("Quiet desk after a long hospital shift");
    expect(payload.card_copy.panels[2].image_prompt).toContain("Golden sunrise through a hospital window");
  });

  it("repairs benchmark copy misses for dad and small-business cards", async () => {
    const weakDadResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline:
          panel.id === "front"
            ? "Fixing Everything with Love"
            : panel.id === "inside-left"
              ? "A Handy Dad's Love"
              : panel.id === "inside-right"
                ? "Love from the Heart"
                : "To an Amazing Dad",
        body:
          panel.id === "front"
            ? "Happy Father's Day to the best handyman in the world!"
            : panel.id === "inside-left"
              ? "You're the one who keeps our home running smoothly, Dad. Your steady presence and practical love mean the world to me."
              : panel.id === "inside-right"
                ? "This Father's Day, I wanted you to know those quiet repairs never went unnoticed. They added up to something bigger: steadiness, care, and a home that always felt looked after. With love, Manny."
                : "For the dad who fixes the small things and makes them mean everything."
      }))
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: weakDadResponse } }), {
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

    const dadResult = await service.generateCard(
      {
        ...cardRequest,
        recipient: "Dad",
        occasion: "Father's Day",
        style: "workshop blueprint tools",
        memory_notes: [
          "Dad shows love by fixing the small things before anyone asks.",
          "Use tools as symbols, not a cluttered hardware-store scene."
        ]
      },
      { rateKey: "test-dad-benchmark-copy-repair" }
    );
    const dadPayload = dadResult.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };

    expect(dadPayload.card_copy.panels[0].body).toContain("every quiet fix");
    expect(dadPayload.card_copy.panels[1].body).toContain("tightened screw");
    expect(dadPayload.card_copy.panels[3].headline).toBe("Built With Love");
    expect(JSON.stringify(dadPayload.card_copy)).not.toMatch(/best handyman|Amazing Dad|mean the world to me/i);
  });

  it("repairs salesy small-business copy into specific gratitude", async () => {
    const weakSmallBusinessResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline:
          panel.id === "front"
            ? "You're the best!"
            : panel.id === "inside-left"
              ? "A Big Thank You"
              : panel.id === "inside-right"
                ? "Thanks again!"
                : "The CustomCard Team",
        body:
          panel.id === "front"
            ? "Thank you for supporting our small business!"
            : panel.id === "inside-left"
              ? "Thanks for being a valued customer. We look forward to serving you again."
              : panel.id === "inside-right"
                ? "Thank you for being a valued customer and for helping to keep our community vibrant and unique."
                : "Wishing you continued success and happiness in all your endeavors."
      }))
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: weakSmallBusinessResponse } }), {
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
        occasion: "thank-you for supporting a small business",
        style: "warm citrus, soft gold, deep teal, local shop texture",
        memory_notes: [
          "The customer chose an independent small business instead of a large marketplace.",
          "The owner wants the message to feel handmade, specific, and grateful rather than promotional."
        ]
      },
      { rateKey: "test-small-business-benchmark-copy-repair" }
    );
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };

    expect(payload.card_copy.panels[0]).toMatchObject({
      headline: "Thank you for choosing local"
    });
    expect(payload.card_copy.panels[1].body).toContain("independent small business");
    expect(payload.card_copy.panels[2].body).toContain("trust");
    expect(payload.card_copy.panels[3]).toMatchObject({
      headline: "With Thanks",
      body: "Made with gratitude for customers who choose small."
    });
    expect(JSON.stringify(payload.card_copy)).not.toMatch(/You're the best|Thanks again|The CustomCard Team|valued customer|continued success|all your endeavors|look forward to serving/i);
  });

  it("repairs core benchmark risks for recovery, warranty CTA, and distant wedding cards", async () => {
    const weakResponse = (headlineFor: (panelId: string) => string, bodyFor: (panelId: string) => string) => ({
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline: headlineFor(panel.id),
        body: bodyFor(panel.id),
        art_direction: "Simple card layout.",
        image_prompt: "A simple border style reserved for the message.",
        image_negative_prompt: "readable text"
      }))
    });
    const generateWithResponse = async (
      response: unknown,
      request: Record<string, unknown>,
      rateKey: string
    ): Promise<{ card_copy: { panels: Array<{ id: string; headline: string; body: string }> } }> => {
      const fetchImpl = vi.fn(async () =>
        new Response(JSON.stringify({ result: { response } }), {
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
      const result = await service.generateCard(request, { rateKey });
      expect(result.statusCode).toBe(200);
      return result.payload as { card_copy: { panels: Array<{ id: string; headline: string; body: string }> } };
    };

    const getWellPayload = await generateWithResponse(
      weakResponse(
        () => "Get Well Soon",
        () => "Wishing you a speedy recovery and hoping you feel better soon."
      ),
      {
        ...cardRequest,
        sender: "Jordan",
        recipient: "Sam",
        relationship: "close friend",
        occasion: "get well after surgery",
        style: "calm recovery stationery with basil green and soup-warm ivory",
        personal_note: "Sam is recovering from surgery.",
        memory_notes: [
          "Inside joke: the soup rating spreadsheet.",
          "Inside joke: terrible hospital socks.",
          "Sam has a garden that only grows basil.",
          "Sam is jokingly the mayor of taking tiny walks."
        ]
      },
      "test-get-well-benchmark-risk-repair"
    );
    const getWellCopy = JSON.stringify(getWellPayload.card_copy);
    expect(getWellCopy).toMatch(/tiny walks|tiny-walk/);
    expect(getWellCopy).toMatch(/soup/);
    expect(getWellCopy).toMatch(/basil/);
    expect(getWellCopy).not.toMatch(/speedy recovery|feel better soon|miracle cure/i);

    const b2bPayload = await generateWithResponse(
      weakResponse(
        () => "Valued Customer",
        () => "Act now for a limited time exclusive discount. Terms and conditions apply."
      ),
      {
        ...cardRequest,
        sender: "Northstar Dental Supply",
        recipient: "Avery at BrightSmile Clinic",
        relationship: "customer success team to clinic operations contact",
        occasion: "one-year purchase anniversary and extended warranty renewal reminder",
        style: "premium dental supply customer-success stationery",
        personal_note:
          "Thank Avery at BrightSmile Clinic for one year since purchase of their sterilizer system and gently remind them their extended warranty renewal window closes July 31. CTA: Scan the enclosed QR code or contact their account manager.",
        memory_notes: [
          "BrightSmile Clinic purchased a sterilizer system one year ago.",
          "The extended warranty renewal window closes July 31.",
          "Leave a clean area for an app-rendered QR code and account-manager CTA."
        ]
      },
      "test-b2b-warranty-benchmark-risk-repair"
    );
    const b2bCopy = JSON.stringify(b2bPayload.card_copy);
    expect(b2bCopy).toContain("BrightSmile Clinic");
    expect(b2bCopy).toContain("July 31");
    expect(b2bCopy).toContain("QR code");
    expect(b2bCopy).toContain("account manager");
    expect(b2bCopy).not.toMatch(/exclusive discount|limited time|terms and conditions|valued customer/i);

    const weddingPayload = await generateWithResponse(
      weakResponse(
        () => "Congratulations",
        () => "As your close family, I have watched your love story become perfect. God bless your soulmate journey forever."
      ),
      {
        ...cardRequest,
        sender: "Jordan",
        recipient: "Lina and Omar",
        relationship: "distant cousin",
        occasion: "wedding",
        style: "elegant wedding stationery with soft ivory, sage, restrained gold, generous handwriting space",
        personal_note:
          "Make a wedding card for distant cousin Lina and her fiance Omar. It should feel respectful and warm even though we are not close. Include a short blessing and leave room for a handwritten note.",
        memory_notes: [
          "Lina and Omar are getting married.",
          "The sender is not close to them and wants restraint.",
          "The inside should leave space for a handwritten note."
        ]
      },
      "test-wedding-benchmark-risk-repair"
    );
    const weddingCopy = JSON.stringify(weddingPayload.card_copy);
    expect(weddingCopy).toContain("Lina and Omar");
    expect(weddingCopy).toMatch(/blessing/i);
    expect(weddingCopy).toMatch(/handwritten|handwriting/i);
    expect(weddingCopy).not.toMatch(/God bless|close family|soulmate|perfect/i);
  });

  it("repairs quiet sympathy copy into literal practical support and readable layout", async () => {
    const weakSympathyResponse = {
      theme_guide: {
        theme_title: "Quiet Sympathy",
        palette: ["soft gray", "warm ivory", "palette"],
        motifs: ["line-art branch", "sparse lower-edge motifs", "palette", "style"],
        border_style: "thin refined frame",
        front_back_pairing: "restrained stationery",
        interior_pairing: "border-first stationery"
      },
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline:
          panel.id === "front"
            ? "Eli, I'm here for you."
            : panel.id === "inside-left"
                ? "A friend's support"
                : panel.id === "inside-right"
                  ? "A friend's support"
                  : "Gratitude for Eli",
        body:
          panel.id === "front"
            ? "A quiet note for the days that ask for steadiness, space, and care."
            : panel.id === "inside-left"
              ? "I am so sorry for the loss your family is carrying. I will not try to explain it away or fill the silence with easy words; I just want you to know you are not alone."
              : panel.id === "inside-right"
                ? "I am here for the practical things, the quiet check-ins, and the days when talking is too much. May you have room to grieve at your own pace, with steady care around you. With sympathy and friendship, Jordan."
                : "A quiet support note, made with room for what words cannot hold.",
        text_layout: {
          headline_zone: "center",
          body_zone: "lower",
          alignment: "right",
          font_pairing: "minimal-sans",
          color_mode: "light-ink",
          scale: "standard"
        },
        art_direction: "Simple sympathy stationery.",
        image_prompt: "A simple border-first stationery design with a quiet center.",
        image_negative_prompt: "readable text"
      })),
      memory_citations: [
        "Eli lost his father.",
        "Jordan wants to offer practical support: meals, rides, calls, and silence."
      ]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: weakSympathyResponse } }), {
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
        sender: "Jordan",
        recipient: "Eli",
        relationship: "friend",
        occasion: "sympathy after losing a parent",
        tone: "quiet, grounded, deeply respectful, practical, not cliched",
        style: "restrained sympathy stationery, soft gray, warm ivory, one small line-art branch, generous whitespace",
        personal_note:
          "A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.",
        memory_notes: [
          "Eli lost his father.",
          "Jordan wants to offer practical support: meals, rides, calls, and silence.",
          "The card should avoid platitudes and religious claims unless requested."
        ]
      },
      { rateKey: "test-sympathy-literal-support-repair" }
    );
    const payload = result.payload as {
      card_copy: {
        theme_guide: { palette: string[]; motifs: string[] };
        panels: Array<{ id: string; headline: string; body: string; image_prompt?: string; text_layout?: Record<string, string> }>;
      };
    };
    const copy = JSON.stringify(payload.card_copy);
    const front = payload.card_copy.panels.find((panel) => panel.id === "front");
    const insideLeft = payload.card_copy.panels.find((panel) => panel.id === "inside-left");
    const insideRight = payload.card_copy.panels.find((panel) => panel.id === "inside-right");
    const back = payload.card_copy.panels.find((panel) => panel.id === "back");

    expect(copy).toContain("Eli");
    expect(copy).toContain("father");
    expect(copy).toContain("meals");
    expect(copy).toContain("rides");
    expect(copy).toContain("calls");
    expect(copy).toContain("silence");
    expect(copy).not.toMatch(/everything happens for a reason|thoughts and prayers|better place/i);
    expect(front?.headline).toBe("For Eli");
    expect(insideLeft?.headline).toBe("With You In This");
    expect(insideRight?.headline).toBe("From Jordan");
    expect(back?.headline).toBe("With Steady Care");
    expect(back?.body).toContain("practical help");
    expect(back?.body).toContain("quiet support");
    expect(back?.body).not.toMatch(/thank you for being a part of our lives|in memory/i);
    expect(payload.card_copy.theme_guide.palette).not.toContain("palette");
    expect(payload.card_copy.theme_guide.motifs).not.toContain("style");
    expect(payload.card_copy.panels.map((panel) => panel.image_prompt).join("\n")).not.toMatch(/recipient.?s? name|card copy|headline|body/i);
    expect(front?.text_layout).toMatchObject({ color_mode: "dark-ink", headline_zone: "upper", body_zone: "lower", scale: "large" });
    expect(insideLeft?.text_layout).toMatchObject({ color_mode: "dark-ink", font_pairing: "soft-serif", scale: "large" });
    expect(insideRight?.text_layout).toMatchObject({ color_mode: "dark-ink", font_pairing: "soft-serif", scale: "large" });
    expect(back?.text_layout).toMatchObject({ color_mode: "dark-ink", headline_zone: "lower", body_zone: "bottom", scale: "large" });
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

  it("honors server-owned AI flow profile JSON without accepting customer-controlled profile changes", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        CUSTOMCARD_AI_FLOW_CONFIG_JSON: JSON.stringify({
          flows: buildDefaultAiFlowAdminConfigs().map((config) =>
            config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
          )
        })
      },
      fetchImpl
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        aiFlowConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
          config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: true } : config
        )
      },
      { rateKey: "test-server-profile" }
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

  it("backs off and retries transient Cloudflare Flux image failures", async () => {
    let imageCallCount = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      imageCallCount += 1;
      if (imageCallCount === 1) {
        return new Response(JSON.stringify({ errors: [{ message: "busy" }] }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "0" }
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

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-flux-backoff" });
    const payload = result.payload as { images: Array<{ image_url: string }> };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(imageCallCount).toBe(5);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/jpeg;base64,"))).toBe(true);
  });

  it("uses DeepAI text2img generation with documented request fields when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ output_url: "data:image/png;base64,iVBORw0KGgo=" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: cloudflareTextModel,
        DEEPAI_API_KEY: "test_deepai_token",
        CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "deepai-text2img-image",
        CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED: "true",
        CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED: "true"
      },
      fetchImpl
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-deepai-text2img-images" });
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => call[1]?.body as FormData);
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(imageCalls.every((call) => String(call[0]) === "https://api.deepai.org/api/text2img")).toBe(true);
    expect(imageCalls.every((call) => (call[1]?.headers as Record<string, string>)["api-key"] === "test_deepai_token")).toBe(true);
    expect(imageBodies.every((body) => Array.from(body.keys()).join(",") === "text")).toBe(true);
    expect(imageBodies.every((body) => String(body.get("text") ?? "").includes("Full-bleed flat 2D artwork layer"))).toBe(true);
    expect(imageBodies.every((body) => String(body.get("text") ?? "").includes("Avoid:"))).toBe(true);
    expect(imageBodies.every((body) => String(body.get("text") ?? "").includes("folded card mockup"))).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_deepai_token");
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

  it("materializes provider-hosted image URLs into embeddable data URLs", async () => {
    let imageIndex = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/v1/responses")) {
        return new Response(JSON.stringify({ output_text: JSON.stringify(cardCopyResponse) }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/v1/images/generations")) {
        imageIndex += 1;
        return new Response(JSON.stringify({ data: [{ url: `https://images.example/panel-${imageIndex}.png` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.startsWith("https://images.example/")) {
        return new Response(new Uint8Array([1, 2, 3, imageIndex]), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
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

    const result = await service.generateCard(cardRequest, { rateKey: "test-openai-hosted-images" });
    const payload = result.payload as { images: Array<{ image_url: string }> };
    const hostedFetches = fetchImpl.mock.calls.filter(([url]) => String(url).startsWith("https://images.example/"));

    expect(result.statusCode).toBe(200);
    expect(hostedFetches).toHaveLength(4);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(payload.images.some((image) => image.image_url.includes("https://images.example/"))).toBe(false);
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
