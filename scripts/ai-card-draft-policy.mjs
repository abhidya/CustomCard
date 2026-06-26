export const requiredPanelIds = ["front", "inside-left", "inside-right", "back"];

export const textLayoutEnums = {
  headline_zone: ["top", "upper", "center", "lower"],
  body_zone: ["upper", "center", "lower", "bottom"],
  alignment: ["left", "center", "right"],
  font_pairing: ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"],
  color_mode: ["dark-ink", "light-ink", "accent-ink", "high-contrast"],
  scale: ["compact", "standard", "large"]
};

export const cardCopyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["theme_guide", "panels", "memory_citations"],
  properties: {
    theme_guide: {
      type: "object",
      additionalProperties: false,
      required: ["theme_title", "palette", "motifs", "border_style", "front_back_pairing", "interior_pairing"],
      properties: {
        theme_title: { type: "string", maxLength: 120 },
        palette: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: { type: "string", maxLength: 80 }
        },
        motifs: {
          type: "array",
          minItems: 3,
          maxItems: 8,
          items: { type: "string", maxLength: 80 }
        },
        border_style: { type: "string", maxLength: 180 },
        front_back_pairing: { type: "string", maxLength: 220 },
        interior_pairing: { type: "string", maxLength: 220 }
      }
    },
    panels: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "headline", "body", "art_direction", "visual_cue", "text_layout", "image_prompt", "image_negative_prompt"],
        properties: {
          id: { type: "string", enum: requiredPanelIds },
          headline: { type: "string", maxLength: 120 },
          body: { type: "string", maxLength: 600 },
          art_direction: { type: "string", maxLength: 500 },
          visual_cue: { type: "string", maxLength: 360 },
          text_layout: {
            type: "object",
            additionalProperties: false,
            required: ["headline_zone", "body_zone", "alignment", "font_pairing", "color_mode", "scale"],
            properties: {
              headline_zone: { type: "string", enum: textLayoutEnums.headline_zone },
              body_zone: { type: "string", enum: textLayoutEnums.body_zone },
              alignment: { type: "string", enum: textLayoutEnums.alignment },
              font_pairing: { type: "string", enum: textLayoutEnums.font_pairing },
              color_mode: { type: "string", enum: textLayoutEnums.color_mode },
              scale: { type: "string", enum: textLayoutEnums.scale }
            }
          },
          image_prompt: { type: "string", maxLength: 1200 },
          image_negative_prompt: { type: "string", maxLength: 500 }
        }
      }
    },
    memory_citations: {
      type: "array",
      maxItems: 4,
      items: { type: "string" }
    }
  }
};

export const panelDefaults = {
  front: {
    headline: "For you",
    body: "A card made with care.",
    art_direction: "Coordinated front cover artwork with safe margins.",
    visual_cue: "One dominant front-cover symbol with a clean upper or lower text-safe area.",
    text_layout: {
      headline_zone: "upper",
      body_zone: "lower",
      alignment: "center",
      font_pairing: "serif-sans",
      color_mode: "dark-ink",
      scale: "standard"
    },
    image_prompt:
      "Full-bleed flat 2D artwork layer for a premium 5x7 vertical front print panel, one clear hero visual idea, disciplined negative space for app-added typography, restrained edge ornament, refined print stationery composition, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-left": {
    headline: "Thinking of you",
    body: "A note for this moment.",
    art_direction: "Soft interior panel with room for a short message.",
    visual_cue: "Quiet left-interior opening panel with border detail and a calm center for the first note.",
    text_layout: {
      headline_zone: "upper",
      body_zone: "center",
      alignment: "center",
      font_pairing: "soft-serif",
      color_mode: "dark-ink",
      scale: "standard"
    },
    image_prompt:
      "Full-bleed flat 2D artwork layer for a soft 5x7 vertical inside-left print panel, border-first stationery layout, thin refined frame, sparse corner or lower-edge motif, large quiet blank center for app-added typography, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-right": {
    headline: "From the heart",
    body: "With warm wishes.",
    art_direction: "Main message panel with readable typography and generous margins.",
    visual_cue: "Quiet right-interior message panel with matching border detail and generous open space for the main note.",
    text_layout: {
      headline_zone: "upper",
      body_zone: "center",
      alignment: "center",
      font_pairing: "serif-sans",
      color_mode: "dark-ink",
      scale: "standard"
    },
    image_prompt:
      "Full-bleed flat 2D artwork layer for a clean 5x7 vertical inside-right print panel, matching border-first stationery layout, thin refined frame, sparse corner or lower-edge motif, generous quiet text-safe center for app-added typography, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  back: {
    headline: "CustomCard",
    body: "Made with CustomCard. Printed locally.",
    art_direction: "Clean coordinating back panel with minimal ornamentation.",
    visual_cue: "Minimal back-cover echo with one small coordinating mark and a clean lower text-safe area.",
    text_layout: {
      headline_zone: "lower",
      body_zone: "bottom",
      alignment: "center",
      font_pairing: "minimal-sans",
      color_mode: "dark-ink",
      scale: "compact"
    },
    image_prompt:
      "Full-bleed flat 2D artwork layer for a minimal 5x7 vertical back print panel, mostly negative space, one small coordinating lower mark or border echo, refined print stationery finish, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  }
};

export function buildCardCopyPrompt(input) {
  return JSON.stringify(
    {
      task:
        "Generate a cohesive folded 5x7 greeting card theme, layout, panel copy, and literal image-generation prompts as JSON only.",
      required_schema: {
        theme_guide: {
          theme_title: "string",
          palette: ["string"],
          motifs: ["string"],
          border_style: "string",
          front_back_pairing: "string",
          interior_pairing: "string"
        },
        panels: requiredPanelIds.map((id) => ({
          id,
          headline: "string",
          body: "string",
          art_direction: "string",
          visual_cue: "string",
          text_layout: {
            headline_zone: "top|upper|center|lower",
            body_zone: "upper|center|lower|bottom",
            alignment: "left|center|right",
            font_pairing: "serif-sans|bold-editorial|minimal-sans|soft-serif",
            color_mode: "dark-ink|light-ink|accent-ink|high-contrast",
            scale: "compact|standard|large"
          },
          image_prompt: "string",
          image_negative_prompt: "string"
        })),
        memory_citations: ["string"]
      },
      section_order: [
        "Choose one cohesive theme_guide from the occasion, personal_note, style, and approved memory_notes before writing panels.",
        "Write the panel copy so the card has an emotional arc from cover to interior to back.",
        "Write art_direction as layout notes for app-rendered typography and print-safe artwork.",
        "Write visual_cue as the specific image composition each panel should show.",
        "Write text_layout as a safe typography plan using only the enumerated zones, alignment, font_pairing, color_mode, and scale values.",
        "Write each image_prompt as a separate one-panel visual request for the image provider."
      ],
      copy_requirements: [
        "Exactly four panels.",
        "Use each panel id exactly once in this order: front, inside-left, inside-right, back.",
        "Use only provided memory_notes.",
        "Preserve exact concrete facts from personal_note and memory_notes in final copy: names, relationships, dates, places, product names, CTA nouns, and practical support items. Do not replace literal requested items such as meals, rides, calls, silence, QR, dates, names, or business terms with generic summaries.",
        "No order/payment claims.",
        "Never invent facts, quotes, religious claims, medical claims, sender history, or recipient traits that are not in the input.",
        "Do not produce generic one-line cards unless the input is extremely thin.",
        "Write final card copy only. Never write meta-copy about the requested tone, style, design language, prompt, theme instructions, CustomCard requirements, or what the card should feel like.",
        "Do not use filler such as 'A card made with care', 'For this moment', 'I wanted this card to feel like...', 'The heart of it is simple...', or '[occasion] with a [tone] feeling'.",
        "When memory_notes are provided, transform them into natural human card language instead of restating them as approved details.",
        "front headline <= 90 characters and body <= 160 characters; use the body only as a subtitle or short dedication.",
        "inside-left body should be 120-320 characters and feel like an opening note, quote, blessing, or scene-setting message.",
        "inside-right body should be 180-420 characters and carry the main personal message plus a natural sign-off when appropriate.",
        "back body <= 160 characters and should feel quiet, polished, and optional.",
        "All body text must fit a 5x7 card panel with generous margins."
      ],
      story_playbooks: [
        "Low-context first-time cards: be useful and specific from the supplied occasion/style without inventing memories; use one gentle human detail and enough copy that the sender could approve it immediately.",
        "High-memory get-well or recovery cards: weave only approved inside jokes into tender support, avoid medical advice, diagnosis, miracle-cure language, pity, or clownish meme overload.",
        "B2B lifecycle or warranty cards: preserve exact customer, business, date, product, and CTA facts; make the CTA clear but calm; never invent discounts, legal terms, shipment status, or order/payment claims.",
        "Wedding or distant-family cards: be respectful and warm without overclaiming closeness; use a short non-denominational blessing unless a religion is explicitly specified, and reserve handwriting space when requested.",
        "Sympathy or quiet-support cards: keep language grounded and practical; avoid cliches, religious claims unless requested, bright celebration language, overdesigned ornament, and generic note-template stationery."
      ],
      layout_requirements: [
        "theme_guide is binding, but reuse motifs with restraint: a panel should have one dominant composition idea, not a scattered wallpaper of every motif.",
        "art_direction must name the panel's composition archetype, layout purpose, typography area, safe-margin plan, palette, border or ornament strategy, and relationship to its matching panel.",
        "visual_cue is binding for the image prompt: make front, inside-left, inside-right, and back visually distinct while still coordinated.",
        "visual_cue should describe concrete objects, light, palette, spacing, and text-safe negative space for that exact panel; do not mention final words, letters, signatures, or fake handwriting.",
        "text_layout controls app-rendered typography only. Choose zones that match the clean text-safe area in visual_cue; never ask the image model to draw the text.",
        "text_layout must use only these values: headline_zone top/upper/center/lower; body_zone upper/center/lower/bottom; alignment left/center/right; font_pairing serif-sans/bold-editorial/minimal-sans/soft-serif; color_mode dark-ink/light-ink/accent-ink/high-contrast; scale compact/standard/large.",
        "front and back should visually match each other; the front carries the strongest hero idea and the back repeats a small quiet echo.",
        "inside-left and inside-right should visually match each other and feel like the opened interior spread.",
        "inside-left and inside-right must keep a calm blank/low-contrast center reserved for app-rendered text; use edge-led artwork, not a generic note-template.",
        "Interior panels should usually be lighter, warmer, and more paper-like than the front/back covers; avoid using the same dark cover field on all four panels.",
        "Interior art must keep motifs on edges, corners, borders, or low-density background texture; do not fill the message area with busy all-over decoration.",
        "Never rely on a large opaque caption plaque, text box, label, banner, or card-within-card; text-safe space means natural negative space in the artwork.",
        "Prefer one of these composition archetypes per panel: cinematic single-object cover, sparse line-art cover, edge-led gallery illustration, lower-corner object cluster, or mostly blank back mark.",
        "Do not use all-over repeating motif patterns unless the user explicitly requests wallpaper, wrapping paper, or dense pattern.",
        "Use the requested style/culture/aesthetic as design direction, but keep sensitive cultural or religious text exact and conservative."
      ],
      image_prompt_requirements: [
        "image_prompt is the exact prompt the image model will receive for that panel.",
        "image_prompt must describe one separate portrait 5x7 panel, not the whole four-panel set.",
        "image_prompt must be a concrete visual composition, not a restatement of form fields.",
        "image_prompt must not include labels such as Recipient, Relationship, Occasion, Tone, Style, Language context, Panel headline, Panel body, or Art direction.",
        "Do not ask the image model to render the headline or body. The app overlays typography after generation.",
        "Reserve clean text-safe space for the app overlay where the panel copy belongs.",
        "Do not describe the app overlay as a recipient name, headline, body, quote, blessing, verse, poem, short message, personal message, or scene-setting message; say only clean text-safe area.",
        "Do not create a caption plaque, inner card rectangle, blank label, sticky note, banner, or text box; text-safe must be integrated negative space, soft open field, or quiet blank center.",
        "image_prompt must stay visual: concrete motifs, palette, border/frame treatment, background texture, ornament density, composition archetype, and hierarchy only.",
        "For the front, explicitly choose one dominant hero composition or sparse line-art composition with a clean lower or central text-safe area.",
        "For inside-left and inside-right, explicitly include: quiet center, clean text-safe area, generous margins, light low-contrast interior, and sparse edge/corner or lower-edge artwork.",
        "For the back, explicitly include mostly negative space and one small coordinating lower mark or border echo.",
        "Use symbolic objects, patterns, backgrounds, flat 2D illustration, and print design details.",
        "Coordinate palette, border style, motifs, and spacing across all four image_prompt values.",
        "For B2B CTA cards, reserve a clean app-overlay area for any QR code or account-manager CTA; do not ask the image model to draw QR codes, labels, or interface elements.",
        "For cards requesting handwriting space, reserve an open note area but do not ask the image model to create handwriting, signatures, script, or fake personal notes.",
        "For sympathy image_prompt values, avoid generic blank-message templates entirely: no framed blank page, no ruled sheet, no card-within-card, and no physical mockup.",
        "For each image_prompt include: premium 5x7 vertical flat print panel artwork, the panel role, specific visual motifs, palette, style, composition, full-bleed 2D digital illustration quality, no people/no hands, no physical mockup, and no logos/no watermark/no readable text."
      ],
      safety_requirements: [
        "Do not include people, faces, bodies, hands, customer groups, shop owners, signatures, handwriting, or portraits unless the user explicitly asks for a portrait/photo.",
        "Do not describe a physical paper card, folded card, envelope, tabletop, desk scene, product photo, mockup, shadowed card, framed card, or any object photographed in a scene.",
        "Do not include words, letters, glyphs, calligraphy, handwriting, labels, signatures, fake text, pseudo text, or decorative script marks.",
        "image_negative_prompt is a concise comma-separated list of visual failure modes to avoid for that panel, and must include readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo.",
        "Return JSON only, no markdown."
      ],
      input
    },
    null,
    2
  );
}

export function buildCardCopyResponseFormat(flow) {
  if (!["cloudflare-workers-ai-chat", "openai-responses-chat", "google-gemini-chat"].includes(flow.primaryAdapterId)) {
    return undefined;
  }
  return {
    type: "json_schema",
    json_schema: cardCopyJsonSchema
  };
}

export function createAiCardDraftPolicy({ buildDraftId }) {
  function buildCardGenerationPayload({
    draftInput,
    cardCopy,
    images,
    copyFlow,
    copyProvider,
    imageFlow,
    imageProvider,
    imageProviderFailure,
    providerCallEvents,
    fallbackQueued = false
  }) {
    return {
      statusCode: 200,
      payload: {
        status: imageProviderFailure ? "partial" : "succeeded",
        draft_id: buildDraftId(draftInput),
        card_copy: cardCopy,
        images,
        generated_by: images.length > 0 ? "ai-text-and-image" : "ai-text-only",
        user_content_only: false,
        ai_flow: {
          card_copy: publicFlowState(copyFlow, copyProvider || copyFlow.primaryAdapterId, ""),
          card_image: publicFlowState(imageFlow, imageProvider, imageProviderFailure)
        },
        provider_call_events: publicProviderCallEvents(providerCallEvents),
        ai_cost_gate: publicCostGateSummary(providerCallEvents),
        fallback_queued: fallbackQueued
      }
    };
  }

  function providerUnavailableResponse({
    statusCode,
    flowKey,
    flow,
    adapterId,
    providerFailure,
    providerCallEvents,
    fallbackQueued = false,
    extraPayload = {}
  }) {
    const { ai_flow: extraAiFlow, ...payloadRest } = extraPayload ?? {};
    const mergedAiFlow = extraAiFlow && typeof extraAiFlow === "object" && !Array.isArray(extraAiFlow)
      ? extraAiFlow
      : {};
    return {
      statusCode,
      payload: {
        ...payloadRest,
        status: "provider-unavailable",
        detail: providerFailure,
        error: providerFailure,
        user_content_only: false,
        ai_flow: {
          ...mergedAiFlow,
          [flowKey]: publicFlowState(flow, adapterId ?? (flow.readyForLiveCalls ? flow.primaryAdapterId : ""), providerFailure)
        },
        provider_call_events: publicProviderCallEvents(providerCallEvents),
        ai_cost_gate: publicCostGateSummary(providerCallEvents),
        fallback_queued: fallbackQueued
      }
    };
  }

  function publicFlowState(flow, adapterId, providerFailure) {
    return {
      flow_id: flow.flowId,
      adapter_id: adapterId,
      primary_adapter_id: flow.primaryAdapterId,
      fallback_adapter_id: flow.fallbackAdapterId,
      model: flow.model,
      rate_limit_per_minute: flow.rateLimitPerMinute,
      monthly_budget_cents: flow.monthlyBudgetCents,
      per_request_budget_cents: flow.perRequestBudgetCents,
      queue_enabled: flow.queueEnabled,
      fallback_queue_enabled: flow.fallbackQueueEnabled,
      ready_for_live_calls: flow.readyForLiveCalls,
      blocked_reasons: flow.blockedReasons,
      provider_failure: providerFailure || undefined
    };
  }

  function publicProviderCallEvents(events) {
    return events
      .filter(Boolean)
      .map((event) => ({
        id: event.id,
        tenant_id: event.tenantId,
        route_id: event.routeId,
        flow_id: event.flowId,
        adapter_id: event.adapterId,
        provider: event.provider,
        capability: event.capability,
        status: event.status,
        fallback_from_adapter_id: event.fallbackFromAdapterId ?? undefined,
        fallback_reason: event.fallbackReason ?? undefined,
        month_bucket: event.monthBucket,
        request_units: event.requestUnits,
        estimated_cost_cents: event.estimatedCostCents,
        actual_cost_cents: event.actualCostCents ?? undefined,
        rate_limit_window_start: event.rateLimitWindowStartIso,
        live_network_call: event.liveNetworkCall,
        metadata: event.metadata
      }));
  }

  function publicCostGateSummary(events) {
    const publicEvents = publicProviderCallEvents(events);
    const reservedEvents = publicEvents.filter((event) => event.status === "reserved");
    return {
      event_count: publicEvents.length,
      reserved_or_spent_cents: reservedEvents
        .reduce((total, event) => total + event.estimated_cost_cents, 0),
      actual_spend_cents: publicEvents.reduce((total, event) => total + (event.actual_cost_cents ?? 0), 0),
      request_units: reservedEvents.reduce((total, event) => total + event.request_units, 0),
      live_network_calls: publicEvents.some((event) => event.live_network_call),
      blocked_reasons: publicEvents
        .filter((event) => event.status === "blocked" && event.fallback_reason)
        .map((event) => event.fallback_reason)
    };
  }

  function hasLiveProviderEvent(events) {
    return publicProviderCallEvents(events).some((event) => event.status !== "blocked");
  }

  function hasExternalNetworkEvent(events) {
    return publicProviderCallEvents(events).some((event) => event.live_network_call && event.status !== "blocked");
  }

  return {
    buildCardGenerationPayload,
    hasExternalNetworkEvent,
    hasLiveProviderEvent,
    providerUnavailableResponse,
    publicCostGateSummary,
    publicFlowState,
    publicProviderCallEvents
  };
}
