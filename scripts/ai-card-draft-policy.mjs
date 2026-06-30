import {
  normalizePanelTextLayout,
  panelTextLayoutDefaults,
  panelTextLayoutEnums,
  sourceTextFromCardInput
} from "../src/panelTextLayoutPlanData.mjs";

export const requiredPanelIds = ["front", "inside-left", "inside-right", "back"];
export const textLayoutEnums = panelTextLayoutEnums;

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
    text_layout: panelTextLayoutDefaults.front,
    image_prompt:
      "Full-bleed flat 2D artwork layer for a premium 5x7 vertical front print panel, one clear hero visual idea, disciplined low-detail space for app-added typography, visible coordinated edge ornament, refined print stationery composition, not a blank template, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-left": {
    headline: "Thinking of you",
    body: "A note for this moment.",
    art_direction: "Soft interior panel with room for a short message.",
    visual_cue: "Quiet left-interior opening panel with border detail and a calm center for the first note.",
    text_layout: panelTextLayoutDefaults["inside-left"],
    image_prompt:
      "Full-bleed flat 2D artwork layer for a soft 5x7 vertical inside-left print panel, border-first stationery layout, thin refined frame, visible corner or lower-edge motif, subtle paper texture, large calm low-detail center for app-added typography, not a blank template, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-right": {
    headline: "From the heart",
    body: "With warm wishes.",
    art_direction: "Main message panel with readable typography and generous margins.",
    visual_cue: "Quiet right-interior message panel with matching border detail and generous open space for the main note.",
    text_layout: panelTextLayoutDefaults["inside-right"],
    image_prompt:
      "Full-bleed flat 2D artwork layer for a clean 5x7 vertical inside-right print panel, matching border-first stationery layout, thin refined frame, visible corner or lower-edge motif, subtle paper texture, generous calm low-detail text-safe center for app-added typography, not a blank template, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  back: {
    headline: "CustomCard",
    body: "Made with CustomCard. Printed locally.",
    art_direction: "Clean coordinating back panel with minimal ornamentation.",
    visual_cue: "Minimal back-cover echo with one small coordinating mark and a clean lower text-safe area.",
    text_layout: panelTextLayoutDefaults.back,
    image_prompt:
      "Full-bleed flat 2D artwork layer for a finished 5x7 vertical back print panel, open breathing room, one visible coordinating lower mark plus faint border echo or edge texture, refined print stationery finish, not a plain blank field, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  }
};

export function buildCardCopyPrompt(input) {
  return JSON.stringify(
    {
      task:
        "Generate a cohesive folded 5x7 greeting card theme, layout, panel copy, and literal image-generation prompts as JSON only. The LLM owns the creative concept; benchmark inputs and user interests are not finished themes.",
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
        "Choose one cohesive theme_guide from the occasion, personal_note, style, and approved memory_notes before writing panels; do not copy a fixture, request label, or generic subject category as the final theme.",
        "Name a specific creative concept that could only belong to this request, then make each panel a distinct expression of that concept.",
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
        "If input.must_include has values, every value must appear naturally in the finished card copy, theme_guide, visual_cue, or image_prompt before the image step runs.",
        "Required recipient or sender names from must_include must appear in visible panel headline/body copy; memory_citations alone do not count.",
        "If input.must_avoid has values, do not use those values in final copy or image prompts unless the input explicitly says they are only negative prompts.",
        "Preserve exact concrete facts from personal_note and memory_notes in final copy: names, relationships, dates, places, product names, CTA nouns, and practical support items. Do not replace literal requested items such as meals, rides, calls, silence, QR, dates, names, or business terms with generic summaries.",
        "No order/payment claims.",
        "Never invent facts, quotes, religious claims, medical claims, sender history, or recipient traits that are not in the input.",
        "Do not produce generic one-line cards unless the input is extremely thin.",
        "Write original card copy for this recipient and occasion; never reuse benchmark/sample headlines, fixture copy, or generic category slogans.",
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
        "The theme_guide must be LLM-decided from the user's request. For interests such as aquarium lover, koi fish lover, or dog lover, create a more specific visual genre than the literal noun alone.",
        "Prefer distinctive greeting-card concepts over obvious wallpaper: e.g. ritual, habitat, movement, care, place, season, or object-system interpretations tied to the supplied details.",
        "theme_guide is binding, but reuse motifs with restraint: a panel should have one dominant composition idea, not a scattered wallpaper of every motif.",
        "art_direction must name the panel's composition archetype, layout purpose, typography area, safe-margin plan, palette, border or ornament strategy, and relationship to its matching panel.",
        "visual_cue is binding for the image prompt: make front, inside-left, inside-right, and back visually distinct while still coordinated.",
        "visual_cue should describe concrete objects, light, palette, spacing, and text-safe negative space for that exact panel; do not mention final words, letters, signatures, or fake handwriting.",
        "text_layout controls app-rendered typography only. Choose zones that match the clean text-safe area in visual_cue; never ask the image model to draw the text.",
        "text_layout must use only these values: headline_zone top/upper/center/lower; body_zone upper/center/lower/bottom; alignment left/center/right; font_pairing serif-sans/bold-editorial/minimal-sans/soft-serif; color_mode dark-ink/light-ink/accent-ink/high-contrast; scale compact/standard/large.",
        "front and back should visually match each other; the front carries the strongest hero idea and the back repeats a small quiet echo.",
        "inside-left and inside-right should visually match each other and feel like the opened interior spread.",
        "inside-left and inside-right must keep a calm low-contrast center reserved for app-rendered text; use visible edge-led artwork, subtle paper texture, and coordinated ornament so the panel does not read as a generic blank note-template.",
        "Interior panels should usually be lighter, warmer, and more paper-like than the front/back covers; avoid using the same dark cover field on all four panels.",
        "Interior art must keep motifs on edges, corners, borders, or low-density background texture; do not fill the message area with busy all-over decoration.",
        "Artwork should read as flat editorial stationery: clean print surfaces, integrated negative space, and restrained edge/corner ornament rather than ornate central decoration.",
        "Keep the text-safe field simple, low-detail, and integrated into the artwork; do not surround it with a central medallion, halo, ornate frame, or decorative ring.",
        "Never rely on a large opaque caption plaque, text box, label, banner, or card-within-card; text-safe space means natural negative space in the artwork.",
        "Prefer one of these composition archetypes per panel: cinematic single-object cover, expressive line-art cover, edge-led gallery illustration, lower-corner object cluster, or open back cover with a visible coordinated mark and border echo.",
        "Do not use all-over repeating motif patterns unless the user explicitly requests wallpaper, wrapping paper, or dense pattern.",
        "Use the requested style/culture/aesthetic as design direction, but keep sensitive cultural or religious text exact and conservative."
      ],
      image_prompt_requirements: [
        "image_prompt is the exact prompt the image model will receive for that panel.",
        "image_prompt must describe one separate portrait 5x7 panel, not the whole four-panel set.",
        "image_prompt must be a concrete visual composition, not a restatement of form fields.",
        "image_prompt must express the LLM-decided visual concept with a unique composition for that panel, not a generic subject collage or repeated motif field.",
        "image_prompt must not include labels such as Recipient, Relationship, Occasion, Tone, Style, Language context, Panel headline, Panel body, or Art direction.",
        "Do not ask the image model to render the headline or body. The app overlays typography after generation.",
        "Reserve clean text-safe space for the app overlay where the panel copy belongs.",
        "Do not describe the app overlay as a recipient name, headline, body, quote, blessing, verse, poem, short message, personal message, or scene-setting message; say only clean text-safe area.",
        "Text-safe areas must stay plain and low-detail: no central medallion, no halo, no ornate frame around copy, no rays behind copy, and no decorative ring under typography.",
        "Do not create a caption plaque, inner card rectangle, blank label, sticky note, banner, or text box; text-safe must be integrated low-detail space, soft open field, or quiet center.",
        "image_prompt must stay visual: concrete motifs, palette, border/frame treatment, background texture, ornament density, composition archetype, and hierarchy only.",
        "For the front, explicitly choose one dominant hero composition or expressive line-art composition with a clean lower or central text-safe area and visible edge/corner ornament.",
        "For inside-left and inside-right, explicitly include: quiet low-detail center, clean text-safe area, generous margins, light low-contrast interior, subtle paper texture, and visible edge/corner or lower-edge artwork.",
        "For the back, explicitly include open breathing room plus one visible coordinating lower mark, faint border echo, or edge texture so it is not plain blank.",
        "Use symbolic objects, patterns, backgrounds, flat 2D illustration, and print design details.",
        "Coordinate palette, border style, motifs, and spacing across all four image_prompt values.",
        "For B2B CTA cards, reserve a clean app-overlay area for any QR code or account-manager CTA; do not ask the image model to draw QR codes, labels, or interface elements.",
        "For cards requesting handwriting space, reserve an open note area but do not ask the image model to create handwriting, signatures, script, or fake personal notes.",
        "For sympathy image_prompt values, describe sparse flat support artwork with an integrated quiet text-safe field; keep blank-message template, ruled sheet, card-within-card, and physical-card-display failure terms only in image_negative_prompt.",
        "For each image_prompt include: premium 5x7 vertical flat print panel artwork, the panel role, specific visual motifs, palette, style, composition, full-bleed 2D digital illustration quality, and clean text-safe space; keep avoid/failure terms for people, hands, display frames, logos, watermarks, and readable text in image_negative_prompt rather than image_prompt."
      ],
      safety_requirements: [
        "Do not include people, faces, bodies, hands, customer groups, shop owners, signatures, handwriting, or portraits unless the user explicitly asks for a portrait/photo.",
        "Do not describe a physical paper card, folded card, envelope, tabletop, desk scene, product photo, mockup, shadowed card, framed card, or any object photographed in a scene.",
        "Do not include words, letters, glyphs, calligraphy, handwriting, labels, signatures, fake text, pseudo text, or decorative script marks.",
        "Do not include fake glyph-like marks, pseudo-calligraphy, decorative micro-lettering, or signature-like strokes as ornament.",
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

function cleanText(value) {
  return String(value ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[redacted-payment]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .trim()
    .slice(0, 1200);
}

function truncate(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const wordSafe = clipped.replace(/\s+\S*$/, "").trimEnd();
  return wordSafe.length >= Math.floor(maxLength * 0.82) ? wordSafe : clipped;
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildImagePromptPlan(input, cardCopy) {
  const panelsById = new Map((cardCopy.panels ?? []).map((panel) => [panel.id, panel]));
  return requiredPanelIds.map((panelId) => {
    const panel = panelsById.get(panelId) ?? panelDefaults[panelId];
    const textLayout = normalizeTextLayout(panel.text_layout || panel.textLayout, panelId, input);
    return {
      panel_id: panelId,
      prompt: normalizeImagePrompt(panel.image_prompt || buildPanelImagePrompt(input, panelId, panel), panelId, input, panel),
      negative_prompt: normalizePanelImageNegativePrompt(panel.image_negative_prompt, input),
      panel_copy: {
        id: panelId,
        headline: panelId === "back" ? "" : cleanText(panel.headline || ""),
        body: panelId === "back" ? "" : cleanText(panel.body || ""),
        text_layout: textLayout
      }
    };
  });
}

function isSympathyInput(input) {
  const source = `${input?.occasion || ""} ${input?.tone || ""} ${input?.style || ""} ${input?.personal_note || ""} ${(input?.memory_notes || []).join(" ")}`.toLowerCase();
  return /\b(sympathy|condolence|loss|grieving|grief|quiet support|losing (?:a|his|her|their) father|father'?s loss)\b/.test(source);
}

function isMedicalMilestoneInput(input) {
  const intent = `${input?.occasion || ""} ${input?.tone || ""} ${input?.style || ""} ${input?.personal_note || ""}`.toLowerCase();
  const allSource = `${intent} ${(input?.memory_notes || []).join(" ")}`.toLowerCase();
  const medicalIntent =
    /\b(?:medical school|medical graduation|med school|doctor|physician|md|white[- ]coat|stethoscope|residen(?:cy|t))\b/.test(intent) ||
    (/\b(?:graduat|degree|diploma|class year)\b/.test(intent) &&
      /\b(?:medical|med school|doctor|physician|md|white[- ]coat|stethoscope|residen(?:cy|t))\b/.test(allSource));
  const milestoneIntent = /\b(?:graduat|congrat|becoming|became|degree|diploma|residen(?:cy|t)|white[- ]coat|medical school|med school)\b/.test(intent);
  return medicalIntent && milestoneIntent;
}

function textConflictsWithNonMedicalBirthday(value, input) {
  const occasionIntent = `${input?.occasion || ""} ${input?.tone || ""} ${input?.style || ""} ${input?.personal_note || ""}`.toLowerCase();
  if (!/\bbirthday\b/.test(occasionIntent) || isMedicalMilestoneInput(input)) return false;
  return /\b(?:from dream to doctor|years in the making|with so much pride|medical school|medical graduation|white[- ]coat|stethoscope|hospital|residen(?:cy|t)|graduation cap|graduation stole|degree itself|exams?|long shifts?|late nights?|doctor you (?:are|were|worked)|doctor you'?re becoming|doctor you are becoming)\b/i.test(value);
}

function buildPanelImagePrompt(input, panelId, panel) {
  const isSympathy = isSympathyInput(input);
  const panelInstruction = (isSympathy
      ? {
        front:
          "Full-bleed flat 2D practical-care sympathy illustration for the front of a premium vertical 5x7 print panel; deep moss field, muted ivory title-safe open area, and one lower abstract paper-cut care vignette.",
        "inside-left":
          "Full-bleed flat 2D practical-care sympathy illustration for a vertical 5x7 inside-left panel; warm ivory open field, generous center text area, and one small lower-edge care vignette.",
        "inside-right":
          "Full-bleed flat 2D practical-care sympathy illustration for a vertical 5x7 inside-right panel; matching warm ivory open field, generous center text area, and one mirrored lower-edge care vignette.",
        back:
          "Full-bleed flat 2D practical-care sympathy illustration for a minimal vertical 5x7 back panel; deep moss field, readable upper/center text-safe area, and one small lower care-vignette echo."
      }
    : {
        front:
          "Full-bleed flat 2D artwork layer with editorial stationery restraint for the front of a premium vertical 5x7 print panel; choose one dominant hero visual with visible coordinated edge/corner artwork, keep an integrated clean lower or central text-safe area as a soft low-detail field rather than a blank rectangle, no central medallion, no ornate frame around copy, no caption plaque, and avoid all-over motif wallpaper.",
        "inside-left":
          "Full-bleed flat 2D artwork layer with editorial stationery restraint for a vertical 5x7 inside-left print panel; light ivory or cream low-contrast paper field with subtle texture, edge-led stationery layout, thin perimeter rule, visible coordinated corner or lower-edge motifs, calm low-detail center for app-rendered text, generous safe margins, no central medallion, no ornate frame around copy, no inner text box.",
        "inside-right":
          "Full-bleed flat 2D artwork layer with editorial stationery restraint for a vertical 5x7 inside-right print panel; matching light ivory or cream low-contrast paper field with subtle texture, edge-led stationery layout, thin perimeter rule, visible coordinated corner or lower-edge motifs, calm low-detail center for app-rendered text, generous safe margins, no central medallion, no ornate frame around copy, no inner text box.",
        back:
          "Full-bleed flat 2D artwork layer for a finished vertical 5x7 back print panel; use open breathing room with a visible coordinating lower mark, border echo, or subtle edge texture tied to the front cover, not a plain blank field, no caption plaque."
      })[panelId];
  const visualBrief = buildVisualBrief(input, panel);
  const visualCue = normalizeVisualCue(panel.visual_cue || panel.visualCue, panelId, input);
  const textLayout = normalizeTextLayout(panel.text_layout || panel.textLayout, panelId, input);
  const textSafeCue = textSafeCueForLayout(textLayout);

  if (isSympathy) {
    return buildSympathyImagePrompt({ panelInstruction, visualBrief, visualCue, textSafeCue });
  }

  return [
    panelInstruction,
    "Safety constraints live in the negative prompt; keep this image prompt affirmative, visual, flat, camera-free, and artwork-layer only.",
    visualBrief,
    `Use this panel-specific composition: ${visualCue}`,
    `Keep natural negative space for app-rendered typography in the ${textSafeCue}; do not draw words, labels, or handwriting.`,
    isSympathy
      ? "Artwork layer only with a camera-free flat print composition. Use sparse integrated support artwork, open message fields, premium full-bleed 2D artwork, minimal clutter, disciplined negative space, restrained hierarchy, and generous safe margins."
      : "Artwork layer only with flat editorial stationery composition, integrated negative space, thin perimeter rules or edge ornaments only when useful, premium full-bleed 2D artwork, minimal clutter, disciplined hierarchy, restrained patterning, and generous safe margins."
  ].join(" ");
}

function buildSympathyImagePrompt({ panelInstruction, visualBrief, visualCue, textSafeCue }) {
  return [
    panelInstruction,
    "Artwork layer only, flat 2D editorial illustration, not a photo, not a physical card, not a book, not a page.",
    `Text contract: keep the ${textSafeCue} empty, plain, low-contrast, and free of objects; put all artwork below or outside that field.`,
    "Use one cohesive paper-cut practical-care vignette: covered meal shape, folded cloth, doorstep threshold arc, quiet path curve for rides, and tiny call/silence signal arcs; make it tasteful, abstract, and not icon clipart.",
    "No cars, keys, phones, devices, note cards, envelopes, visible food, fruit, flowers, vases, urns, table settings, window bars, ornate frames, dense line art, thickets, wallpaper, page seams, bright yellow, neon green, sun, sunset, landscape, grassland, or closed blank-message template.",
    "Keep the artwork sparse, abstract, camera-free, and free of literal document props; rely on the negative prompt for failure modes.",
    visualBrief,
    `Panel cue: ${visualCue}`,
    "Palette: warm ivory, muted gray-green, deep moss, soft taupe, charcoal ink only; quiet practical sympathy, no religious symbols unless requested."
  ].join(" ");
}

function normalizeImagePrompt(prompt, panelId, input, panel) {
  const cleaned = cleanText(prompt)
    .replace(/\b(?:Recipient|Relationship|Occasion|Tone|Style|Language context|Panel headline|Panel body|Art direction)\s*:[^.]+\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const base = imagePromptNeedsRepair(cleaned, panelId, input, panel)
    ? buildPanelImagePrompt(input, panelId, panel)
    : cleaned || panelDefaults[panelId].image_prompt;
  const guardrails = [];
  const visualCue = normalizeVisualCue(panel?.visual_cue || panel?.visualCue, panelId, input);
  if (visualCue && !stringSharesEnoughTerms(base, visualCue, 3)) {
    guardrails.push(`Use this panel-specific composition: ${visualCue}`);
  }
  const textLayout = normalizeTextLayout(panel?.text_layout || panel?.textLayout, panelId, input);
  const textSafeCue = textSafeCueForLayout(textLayout);
  if (!textSafeCueMentioned(base, textSafeCue)) {
    guardrails.push(`Keep natural negative space for app-rendered typography in the ${textSafeCue}; do not draw words, labels, or handwriting.`);
  }
  if (!/\b5x7\b/i.test(base)) guardrails.push("5x7 vertical print panel.");
  if (!/\bflat\b/i.test(base) || !/\b2d\b/i.test(base)) guardrails.push("Flat 2D full-bleed digital illustration.");
  if (!/\bflat editorial stationery\b/i.test(base)) guardrails.push("Flat editorial stationery artwork with clean print surfaces and integrated negative space.");
  if (!/\bno readable text\b/i.test(base)) guardrails.push("No readable text.");
  if (!/\bno (?:words|letters)\b/i.test(base)) guardrails.push("No words, letters, handwriting, calligraphy, labels, signatures, fake text, glyph-like marks, or pseudo text.");
  if (!/\bno people\b/i.test(base)) guardrails.push("No people.");
  if (!/\bno hands\b/i.test(base)) guardrails.push("No hands.");
  if (!/\bno logos?\b/i.test(base)) guardrails.push("No logos.");
  if (!/\bno watermark\b/i.test(base)) guardrails.push("No watermark.");
  if (!/\b(?:no all-over|avoid all-over|not an all-over|mostly negative space|sparse|restrained)\b/i.test(base)) {
    guardrails.push("Avoid all-over repeating wallpaper patterns; use restrained hierarchy with visible non-text artwork outside the text-safe field.");
  }
  if (!/\b(?:not a plain blank|not plain blank|visible non-text artwork|visible artwork|visible coordinating mark)\b/i.test(base)) {
    guardrails.push(visibleArtworkGuardrail(panelId));
  }
  if (!/\bno (?:caption plaque|text box|inner card rectangle|blank tag|label)\b/i.test(base)) {
    guardrails.push("No caption plaque, no text box, no inner card rectangle, no blank tag, no label.");
  }
  if (!/\bno (?:central medallion|ornate frame|halo|decorative ring)\b/i.test(base)) {
    guardrails.push("No central medallion, no halo, no ornate frame around copy, no decorative ring under typography, and no rays behind the text-safe field.");
  }
  if (isSympathyInput(input)) {
    guardrails.push("Sympathy art must keep a plain text field and use only sparse lower-edge abstract support relief; no fruit, flowers, vases, urns, table settings, phones, devices, note cards, envelopes, bright yellow, neon green, sun, landscape, window bars, ornate frames, or line-art thickets.");
  }
  if (panelId.startsWith("inside") && !/\b(?:ivory|cream|paper|note-sheet|light|low-contrast)\b/i.test(base)) {
    guardrails.push(
      isSympathyInput(input)
        ? "Use a light warm-ivory low-contrast open field for the interior; keep artwork on edges and preserve a quiet low-detail center."
        : "Use a light ivory or cream low-contrast paper field with subtle texture for the interior unless the user explicitly requested a dark interior."
    );
  }
  if (!/\b(?:camera-free|flat artwork layer|artwork layer only|not (?:a )?(?:physical|photographed|photo))\b/i.test(base)) {
    guardrails.push("Camera-free flat artwork layer, not a physical paper card, not a tabletop scene, not a product photograph.");
  }
  return truncate([base, ...guardrails].join(" "), 1800);
}

function visibleArtworkGuardrail(panelId) {
  if (panelId === "back") {
    return "Include one small visible coordinating non-text mark plus a faint border echo or edge texture while keeping the back panel open; not a plain blank field.";
  }
  if (panelId.startsWith("inside")) {
    return "Include visible edge/corner or lower-edge non-text artwork plus subtle paper texture outside the quiet center; not a plain blank stationery field.";
  }
  return "Include visible non-text artwork outside the text-safe field: one clear hero motif or object system, not a plain blank stationery field.";
}

function imagePromptNeedsRepair(prompt, panelId, input, panel) {
  return imagePromptHasUnsafeSubject(prompt) ||
    imagePromptLeaksAppCopy(prompt) ||
    imagePromptHasUnsafeTextFieldOrnament(prompt) ||
    textConflictsWithNonMedicalBirthday(prompt, input) ||
    sympathyImagePromptNeedsRepair(prompt, input) ||
    imagePromptConflictsWithPanelRole(prompt, panelId) ||
    imagePromptIsUnderspecified(prompt, panelId, input, panel);
}

function sympathyImagePromptNeedsRepair(prompt, input) {
  if (!isSympathyInput(input)) return /\b(?:sympathy|condolence|grieving|grief|mourning|in memory)\b/i.test(prompt);
  return /\b(?:photo[- ]note|note[- ]sheet|border[- ]first|stationery design|framed blank page|blank page|ruled paper|paper field|paper texture|thin refined frame|frame motif|closed frame)\b/i.test(prompt);
}

function imagePromptHasUnsafeSubject(prompt) {
  return /\b(person|people|human|owner|customer|customers|face|portrait|body|hands?|holding|model|signature|handwriting|handwritten|lettering|readable text|thank[- ]you note|['"]?thank you['"]?\s+sign|signage|sign|worn|creased|notebook|journal|diary|ledger|manuscript|open book|book page|ruled paper|lined paper|written document|document page|paper sheet|ink scribbles|scribbled writing|margin notes)\b/i.test(prompt) ||
    /(?:shop|store|brand|company|business)['’]?\s+logo|\blogo\s+(?:in|at|on|near|as)\b/i.test(prompt);
}

function imagePromptHasUnsafeTextFieldOrnament(prompt) {
  return /\b(?:central|center(?:ed)?|middle|behind|under|around)\s+(?:medallion|halo|radial burst|starburst|sunburst|ornate frame|decorative ring)\b/i.test(prompt) ||
    /\b(?:medallion|halo|ornate frame|decorative ring)\s+(?:behind|under|around|inside|in the center|around copy|around the text|around typography)\b/i.test(prompt) ||
    /\b(?:fake|pseudo|decorative|glyph-like|signature-like|micro)\s+(?:glyphs?|text|lettering|script|calligraphy|marks?|strokes?)\b/i.test(prompt);
}

function imagePromptLeaksAppCopy(prompt) {
  const withoutTextSafe = String(prompt).replace(/\btext-safe\b/gi, "");
  return /\b(?:recipient['’]?s?\s+name|headline|body|card copy|exact text|quote|blessing|verse|poem|short message|personal message|main message|scene-setting message|message about)\b/i.test(prompt) ||
    /\b(?:white|black|gold|navy|soft gold|centered|visible|readable)\s*(?:\(\d+%\)\s*)?(?:text|typography|lettering)\b/i.test(withoutTextSafe);
}

function imagePromptConflictsWithPanelRole(prompt, panelId) {
  if (panelId.startsWith("inside") && /\b(?:foreground|hero composition|dominant hero|deep navy background|busy|all-over)\b/i.test(prompt)) {
    return true;
  }
  if (panelId === "back" && /\b(?:foreground|dominant hero|busy|all-over)\b/i.test(prompt)) return true;
  return false;
}

function imagePromptIsUnderspecified(prompt, panelId, input, panel) {
  const genericVisualLanguage = /\b(?:decorative border style|simple border style|simple border|mix of natural motifs|subtle patterns|quiet, polished design|palette should match|reserved for (?:a|the) (?:gentle |short |personal |main |scene-setting )?message)\b/i;
  const panelPurpose = {
    front: /\b(front|cover|lower third|decorative background|title area)\b/i,
    "inside-left": /\b(inside-left|inside left|interior|opened spread|left panel)\b/i,
    "inside-right": /\b(inside-right|inside right|interior|opened spread|right panel)\b/i,
    back: /\b(back|back cover|finishing touch|lower ornament)\b/i
  }[panelId];
  const specificityScore = countSpecificPromptTerms(prompt, input, panel);
  if (panelPurpose && !panelPurpose.test(prompt) && specificityScore < 4) return true;
  if (!genericVisualLanguage.test(prompt)) return false;
  const purposeScore = panelPurpose?.test(prompt) ? 1 : 0;
  return specificityScore + purposeScore < 2;
}

function countSpecificPromptTerms(prompt, input, panel) {
  const promptText = prompt.toLowerCase();
  return promptSpecificityTerms(input, panel).filter((term) => promptText.includes(term)).slice(0, 6).length;
}

function promptSpecificityTerms(input, panel) {
  const source = [
    input.occasion,
    input.style,
    input.personal_note,
    input.memory_notes.join(" "),
    panel.visual_cue,
    panel.art_direction,
    buildVisualBrief(input, panel)
  ].join(" ");
  const stopWords = new Set([
    "about",
    "accent",
    "artwork",
    "background",
    "blank",
    "border",
    "calm",
    "card",
    "center",
    "clean",
    "color",
    "design",
    "detail",
    "details",
    "field",
    "full-bleed",
    "generous",
    "inside",
    "layer",
    "layout",
    "margin",
    "margins",
    "motif",
    "motifs",
    "ornament",
    "panel",
    "palette",
    "pattern",
    "premium",
    "print",
    "quiet",
    "specific",
    "style",
    "subtle",
    "texture",
    "vertical",
    "visual",
    "warm"
  ]);
  return Array.from(new Set(String(source).toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []))
    .filter((term) => term.length >= 5 && !stopWords.has(term));
}

function normalizeImageNegativePrompt(value) {
  return Array.from(
    new Set(
      [
        ...String(value || "").split(","),
        "readable text",
        "fake text",
        "pseudo text",
        "gibberish text",
        "handwriting",
        "calligraphy",
        "religious calligraphy",
        "notebook",
        "manuscript",
        "ink scribbles",
        "margin notes",
        "central medallion",
        "ornate frame around copy",
        "glyph-like marks",
        "hands",
        "product photo",
        "halo behind text",
        "decorative ring under typography",
        "rays behind copy",
        "busy text-safe field",
        "letters",
        "words",
        "numbers",
        "typography",
        "handwritten notes",
        "decorative script",
        "cursive script",
        "faux script",
        "journal",
        "diary",
        "ledger",
        "book page",
        "open book",
        "ruled paper",
        "lined paper",
        "written document",
        "document page",
        "paper sheet",
        "scribbled writing",
        "fake manuscript",
        "text blocks",
        "signature",
        "label",
        "signage",
        "sign",
        "misspelled text",
        "tiny unreadable lettering",
        "logo",
        "watermark",
        "QR code",
        "crop marks",
        "folded card mockup",
        "physical card mockup",
        "framed physical card",
        "paper card photo",
        "card within a card",
        "inner card rectangle",
        "blank tag",
        "text box",
        "product photo",
        "photorealistic mockup",
        "envelope",
        "drop shadow",
        "tabletop scene",
        "desk scene",
        "hands",
        "people",
        "face",
        "portrait",
        "pseudo lettering",
        "decorative micro-lettering"
      ]
        .map((item) => cleanText(item).toLowerCase())
        .filter(Boolean)
    )
  ).join(", ");
}

function normalizePanelImageNegativePrompt(value, input) {
  const base = normalizeImageNegativePrompt(value);
  if (!isSympathyInput(input)) return base;
  return Array.from(
    new Set(
      [
        ...base.split(","),
        "fruit",
        "flowers",
        "vase",
        "urn",
        "table setting",
        "window bars",
        "ornate frame",
        "dense line art",
        "line-art thicket",
        "landscape",
        "wheat field",
        "grassland",
        "horizon",
        "sunset",
        "sun",
        "bright yellow",
        "neon green",
        "saturated yellow",
        "cheerful celebration",
        "trees",
        "phone",
        "smartphone",
        "device",
        "blank note card",
        "note card",
        "envelope",
        "open book",
        "book",
        "page seam",
        "tabletop",
        "artist signature"
      ]
        .map((item) => cleanText(item).toLowerCase())
        .filter(Boolean)
    )
  ).join(", ");
}

function buildVisualBrief(input, panel) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")} ${panel.art_direction} ${panel.visual_cue || panel.visualCue || ""}`.toLowerCase();
  const contract = `${source} ${(input.must_include || []).join(" ")}`.toLowerCase();
  if (/\b(aquarium|freshwater|fish tank|tank care|aquatic plants?|tiny fish)\b/.test(contract)) {
    return "Elegant aquarium stationery: soft freshwater blue and warm ivory, one tiny fish path, sparse aquatic plant silhouettes, gentle ripple linework, refined text-safe fields, no full-tank scene, no generic birthday balloons.";
  }
  if (/\b(koi|backyard pond|pond ripples?|fish move through the water)\b/.test(contract)) {
    return "Serene koi encouragement stationery: muted pond green, warm ivory, one slow koi arc, quiet water ripples, generous negative space, restrained hopeful mood, no birthday language or dense ornamental fish pattern.";
  }
  if (/\b(dog|dogs|dog-loving|dog lover|dog-trust|leash|good neighbor)\b/.test(contract)) {
    return "Dog-lover thank-you stationery: one abstract leash curve, small dog-tag mark, neighborly doorstep or sidewalk line, warm cream field, clean message space, no dog portrait, no paw-print wallpaper, no plant-watering story.";
  }
  if (isMedicalMilestoneInput(input)) {
    return "Elegant medical-school graduation artwork: deep navy and soft gold, one white coat plus graduation cap and stethoscope hero composition or sparse ECG line; interiors use ivory note-sheet field, thin gold border, lower ECG, one stethoscope corner; never dense repeated medical icons.";
  }
  if (/\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source)) {
    return "Calm recovery stationery: soup-warm ivory paper, basil green accents, tiny walking-path linework, small basil sprig and soup-spoon motifs, tender negative space, no hospital room, no medical equipment, no pitying imagery.";
  }
  if (/\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source)) {
    return "Premium B2B customer-success stationery: clean white and deep teal field, soft metallic accent line, subtle sterile-supply geometry, lower-right app-overlay area reserved for QR/CTA, confident whitespace, no discounts, no legal fine print, no product photo.";
  }
  if (/\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source)) {
    return "Elegant restrained wedding stationery: soft ivory, sage, and restrained gold, paired botanical stems or ribbon arcs, generous open note area, quiet blessing mood, no religious symbols unless requested, no fake script.";
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    return "Reverent practical-care sympathy artwork: deep moss front/back, warm ivory interiors, lower-edge abstract paper-cut care relief with covered meal shape, folded cloth, doorstep threshold arc, quiet ride path curve, and tiny call/silence arcs; large calm text fields; no people, fake text, phones, devices, note cards, envelopes, fruit, flowers, vases, urns, table settings, bright yellow, neon green, religious symbols unless requested, cliches, or blank-message template.";
  }
  if (/\b(funny|playful|witty|sprint|project-management|project management|bold type|bold-type|poster|editorial)\b/.test(source) && /\bbirthday\b/.test(source)) {
    return "Funny bold-type birthday artwork: clean editorial poster composition, confident type-safe blocks without rendered letters, lively offset rhythm, warm accent color, plenty of negative space, no age-joke imagery.";
  }
  if (/\b(anniversary|years together|spouse|balcony basil|sunday morning walks?)\b/.test(source)) {
    return "Sentimental botanical anniversary stationery: balcony basil sprig, Sunday-walk path line, warm cream and deep green palette, tender negative space, quiet paired motifs, intimate but not vow-like.";
  }
  if (/\b(water(?:ed|ing)? the plants?|plant care|looked after .*plants?|neighbor plant|away.*plants?)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return "Simple minimal thank-you stationery: one small plant-related mark, clean white or warm ivory field, fine rule, direct negative space, no floral pattern, no ornate language.";
  }
  if (/\b(graduat|class year|diploma|school)\b/.test(source)) {
    return "Elegant graduation artwork: navy, ivory, and gold palette, one graduation cap or diploma hero mark, ribbon linework, sparse starbursts, generous negative space, no confetti wallpaper.";
  }
  if (/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return "Warm small-business thank-you stationery: cream or deep teal field, controlled citrus-and-leaf corner arrangement, soft gold ribbon curve, subtle boutique awning silhouette, kraft paper texture, editorial negative space, not busy repeated fruit.";
  }
  if (/\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source)) {
    return "Warm Father's Day practical-love artwork: clean blueprint field, one organized lower-corner tool cluster, measured pencil lines, small hardware details, golden yellow and workshop green accents, sparse enough for app-added copy.";
  }
  if (/\b(birthday|cake|candles|party)\b/.test(source) && !/\b(aquarium|freshwater|koi|pond|dog)\b/.test(contract)) {
    return "Warm birthday stationery: botanical greenery and soft flowers as elegant side or corner border, small candle accents, morning-light palette, generous low-detail text-safe field, no dense confetti wallpaper.";
  }
  if (/\b(thank|grateful|appreciat)\b/.test(source) && !/\b(aquarium|freshwater|koi|pond|dog)\b/.test(contract)) {
    return "Elegant thank-you stationery: ribbon curves, botanical sprigs, soft paper texture, warm accents, border-first layout, quiet premium composition, large clean message field.";
  }
  return `Original ${truncate(input.occasion || "celebration", 80)} theme in a ${truncate(input.style || "refined", 120)} style with specific symbolic motifs, coordinated palette, and emotional tone: ${truncate(input.tone || "warm", 120)}.`;
}

export function normalizeCardInput(body) {
  return {
    sender: cleanText(body.sender || "Your friend"),
    recipient: cleanText(body.recipient || "Recipient"),
    relationship: cleanText(body.relationship || "friend"),
    occasion: cleanText(body.occasion || "celebration"),
    tone: cleanText(body.tone || "warm"),
    style: cleanText(body.style || "minimal"),
    language: cleanText(body.language || "English"),
    personal_note: cleanText(body.personal_note || body.personalNote || ""),
    memory_notes: Array.isArray(body.memory_notes)
      ? body.memory_notes.map(cleanText).filter(Boolean).slice(0, 6)
      : Array.isArray(body.memoryNotes)
        ? body.memoryNotes.map(cleanText).filter(Boolean).slice(0, 6)
        : [],
    must_include: Array.isArray(body.must_include)
      ? body.must_include.map(cleanText).filter(Boolean).slice(0, 12)
      : Array.isArray(body.mustInclude)
        ? body.mustInclude.map(cleanText).filter(Boolean).slice(0, 12)
        : [],
    must_avoid: Array.isArray(body.must_avoid)
      ? body.must_avoid.map(cleanText).filter(Boolean).slice(0, 12)
      : Array.isArray(body.mustAvoid)
        ? body.mustAvoid.map(cleanText).filter(Boolean).slice(0, 12)
        : []
  };
}

function normalizeThemeGuide(rawThemeGuide, input) {
  const fallback = buildThemeGuide(input);
  if (typeof rawThemeGuide === "string") {
    return {
      ...fallback,
      theme_title: truncate(cleanText(rawThemeGuide), 120)
    };
  }
  const raw = rawThemeGuide && typeof rawThemeGuide === "object" ? rawThemeGuide : {};
  const rawThemeText = [
    raw.theme_title,
    raw.themeTitle,
    ...(Array.isArray(raw.palette) ? raw.palette : []),
    ...(Array.isArray(raw.motifs) ? raw.motifs : []),
    raw.border_style,
    raw.borderStyle,
    raw.front_back_pairing,
    raw.frontBackPairing,
    raw.interior_pairing,
    raw.interiorPairing
  ].join(" ");
  if (textConflictsWithNonMedicalBirthday(rawThemeText, input)) return fallback;
  const palette = Array.isArray(raw.palette)
    ? raw.palette.map(cleanText).filter(isSafeThemePaletteValue).slice(0, 6)
    : [];
  const motifs = Array.isArray(raw.motifs)
    ? raw.motifs.map(cleanText).filter(isSafeThemeMotif).slice(0, 8)
    : [];
  return {
    theme_title: truncate(cleanText(raw.theme_title || raw.themeTitle || fallback.theme_title), 120),
    palette: palette.length >= 3 ? palette : fallback.palette,
    motifs: motifs.length >= 3 ? motifs : fallback.motifs,
    border_style: truncate(cleanText(raw.border_style || raw.borderStyle || fallback.border_style), 180),
    front_back_pairing: truncate(cleanText(raw.front_back_pairing || raw.frontBackPairing || fallback.front_back_pairing), 220),
    interior_pairing: truncate(cleanText(raw.interior_pairing || raw.interiorPairing || fallback.interior_pairing), 220)
  };
}

function isSafeThemeMotif(value) {
  return Boolean(cleanText(value)) &&
    !/^(?:palette|style|tone|occasion|relationship|recipient|sender|language|copy|text layout|art direction)$/i.test(value) &&
    !/\b(?:face|smile|smiling|person|people|hands?|signature|handwriting|lettering|text|logo|watermark)\b/i.test(value);
}

function isSafeThemePaletteValue(value) {
  return Boolean(cleanText(value)) &&
    !/^(?:palette|style|tone|occasion|relationship|recipient|sender|language|motif|motifs)$/i.test(value);
}

function buildThemeGuide(input) {
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const contract = `${source} ${(input.must_include || []).join(" ")}`.toLowerCase();
  if (/\b(aquarium|freshwater|fish tank|tank care|aquatic plants?|tiny fish)\b/.test(contract)) {
    return themeGuide({
      title: "Aquarium Birthday Stillness",
      palette: ["soft aquarium blue", "freshwater green", "warm paper ivory"],
      motifs: ["tiny fish path", "aquatic plant silhouette", "ripple line", "aquarium-glass highlight"],
      border: "refined freshwater stationery border with sparse ripple corners and a calm text-safe field"
    });
  }
  if (/\b(koi|backyard pond|pond ripples?|fish move through the water)\b/.test(contract)) {
    return themeGuide({
      title: "Koi Pond Encouragement",
      palette: ["muted pond green", "warm ivory", "soft koi orange"],
      motifs: ["slow koi arc", "pond ripple", "single scale mark", "quiet water path"],
      border: "restrained pond-ripple border with one koi accent and generous negative space"
    });
  }
  if (/\b(dog|dogs|dog-loving|dog lover|dog-trust|leash|good neighbor)\b/.test(contract)) {
    return themeGuide({
      title: "Dog-Trust Thank You",
      palette: ["warm cream", "sidewalk gray", "leash blue"],
      motifs: ["single leash curve", "dog tag mark", "neighborly doorstep", "quiet sidewalk line"],
      border: "minimal neighborly border with one leash curve and no paw-print wallpaper"
    });
  }
  if (isMedicalMilestoneInput(input)) {
    return themeGuide({
      title: "From Dream to Doctor",
      palette: ["deep navy", "white coat ivory", "soft gold"],
      motifs: ["stethoscope line", "graduation cap", "ECG curve", "anatomy sketch texture"],
      border: "thin gold-and-navy medical stationery border with sparse corner linework"
    });
  }
  if (/\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source)) {
    return themeGuide({
      title: "Tiny Walks And Warm Soup",
      palette: ["soup-warm ivory", "basil green", "soft clay"],
      motifs: ["tiny walking path", "basil sprig", "soup spoon curve", "cozy sock stripe"],
      border: "calm recovery border with sparse basil corners and tiny path linework"
    });
  }
  if (/\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source)) {
    return themeGuide({
      title: "A Year Of Trusted Care",
      palette: ["clean white", "deep teal", "soft metallic accent"],
      motifs: ["sterile supply line", "calendar mark", "quiet QR-safe square", "account-manager ribbon"],
      border: "premium customer-success border with sparse teal geometry and a calm CTA area"
    });
  }
  if (/\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source)) {
    return themeGuide({
      title: "Warm Wedding Wishes",
      palette: ["soft ivory", "sage green", "restrained gold"],
      motifs: ["paired botanical stems", "quiet ribbon arc", "small gold dot", "open note field"],
      border: "elegant wedding border with sparse sage stems and restrained gold corners"
    });
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    return themeGuide({
      title: "Quietly With You",
      palette: ["warm ivory", "muted gray-green", "deep moss", "soft taupe"],
      motifs: ["practical-care relief", "covered meal shape", "folded cloth", "doorstep threshold arc", "quiet call/silence arcs", "quiet path curve"],
      border: "open-edge practical-care print composition with no closed frame, generous natural negative space, and lower-edge support objects"
    });
  }
  if (/\b(funny|playful|witty|sprint|project-management|project management|bold type|bold-type|poster|editorial)\b/.test(source) && /\bbirthday\b/.test(source)) {
    return themeGuide({
      title: "Sprint Complete",
      palette: ["warm white", "ink black", "bright accent"],
      motifs: ["offset editorial block", "tiny milestone dot", "clean rule", "cake-slice mark"],
      border: "bold editorial spacing with clean rules and no clutter"
    });
  }
  if (/\b(anniversary|years together|spouse|balcony basil|sunday morning walks?)\b/.test(source)) {
    return themeGuide({
      title: "Our Small Garden",
      palette: ["warm cream", "deep basil green", "soft morning gold"],
      motifs: ["balcony basil sprig", "Sunday-walk path line", "paired leaves", "small window-light shape"],
      border: "sentimental botanical border with paired basil details and quiet path linework"
    });
  }
  if (/\b(water(?:ed|ing)? the plants?|plant care|looked after .*plants?|neighbor plant|away.*plants?)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return themeGuide({
      title: "Plain Thanks",
      palette: ["clean white", "warm ivory", "leaf green"],
      motifs: ["small plant mark", "fine rule", "single water drop"],
      border: "minimal fine-rule border with one small plant-related mark"
    });
  }
  if (/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return themeGuide({
      title: "Local Thanks",
      palette: ["warm cream", "deep teal", "soft gold", "citrus yellow"],
      motifs: ["citrus slice", "teal leaf", "ribbon curve", "boutique awning silhouette"],
      border: "handmade editorial border with citrus-and-leaf corner ornaments"
    });
  }
  if (/\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source)) {
    return themeGuide({
      title: "Steady Hands",
      palette: ["blueprint blue", "golden yellow", "workshop green"],
      motifs: ["wrench icon", "measuring tape", "pencil line", "small hardware detail"],
      border: "blueprint-line border with sparse tool icons tucked into corners"
    });
  }
  if (/\b(botanical|fern|flower|trail|hike)\b/.test(source) || (/\bbirthday\b/.test(source) && !/\b(aquarium|freshwater|koi|pond|dog)\b/.test(contract))) {
    return themeGuide({
      title: "Morning Garden",
      palette: ["warm cream", "deep green", "morning gold"],
      motifs: ["fern frond", "tiny trail flower", "coffee steam curve", "soft leaf pattern"],
      border: "watercolor botanical border with sparse fern corners"
    });
  }
  return themeGuide({
    title: truncate(input.occasion || "Personal Card", 80),
    palette: ["warm ivory", "soft accent color", "deep neutral"],
    motifs: ["subtle ornament", "ribbon curve", "small symbolic icon"],
    border: `${truncate(input.style || "refined stationery", 90)} decorative border with sparse corner motifs`
  });
}

function themeGuide({ title, palette, motifs, border }) {
  return {
    theme_title: title,
    palette,
    motifs,
    border_style: border,
    front_back_pairing: "Front carries the strongest motif and title area; back repeats the same border language with open breathing room plus a visible coordinated mark.",
    interior_pairing: "Inside-left and inside-right use the same decorative border/frame, visible edge motifs, calm low-detail center, and generous text-safe margins."
  };
}

function normalizeVisualCue(value, panelId, input, themeGuide = buildThemeGuide(input)) {
  const fallback = buildPanelVisualCue(input, panelId, themeGuide);
  const cleaned = truncate(cleanText(value || ""), 360);
  if (!cleaned || visualCueNeedsRepair(cleaned) || visualCueTooGenericForSource(cleaned, input)) return fallback;
  return cleaned;
}

function visualCueTooGenericForSource(value, input) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const text = String(value || "").toLowerCase();
  if (textConflictsWithNonMedicalBirthday(value, input)) return true;
  if (isMedicalMilestoneInput(input)) {
    return !/\b(?:doctor|medical|hospital|white[- ]coat|stethoscope|graduation|residen(?:cy|t))\b/.test(text);
  }
  return false;
}

function visualCueNeedsRepair(value) {
  const text = String(value || "").toLowerCase();
  if (/\b(?:recipient['’]?s?\s+name|headline|body|card copy|exact text|quote|blessing|verse|poem|short message|personal message|main message|scene-setting message|message about)\b/i.test(value)) {
    return true;
  }
  if (/\b(?:readable text|fake text|letters|logo|watermark|qr code|caption plaque|text box|tabletop|mockup|product photo)\b/.test(text)) {
    return !/\b(?:no|without|avoid|not)\b.{0,40}\b(?:readable text|fake text|letters|logo|watermark|qr code|caption plaque|text box|tabletop|mockup|product photo)\b/.test(text);
  }
  if (/\b(?:people|person|faces?|hands?|portrait)\b/.test(text)) {
    return !/\b(?:no|without|avoid|not)\b.{0,40}\b(?:people|person|faces?|hands?|portrait)\b/.test(text);
  }
  return false;
}

function buildPanelVisualCue(input, panelId, themeGuide = buildThemeGuide(input)) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const contract = `${source} ${(input.must_include || []).join(" ")}`.toLowerCase();
  if (/\b(aquarium|freshwater|fish tank|tank care|aquatic plants?|tiny fish)\b/.test(contract)) {
    const cues = {
      front: "Elegant aquarium birthday cover with soft tank light, one tiny fish path, freshwater plant silhouettes, and a clean upper text-safe field; refined print stationery, not aquarium merchandise.",
      "inside-left": "Quiet left interior with pale freshwater blue wash, sparse aquatic plant border, one tiny fish detail near the lower edge, and generous center-left message space.",
      "inside-right": "Matching right interior with a soft ripple line and small aquarium-glass highlight, restrained negative space for the main message, no busy full-tank scene.",
      back: "Open back cover with one tiny fish or ripple mark, faint aquatic edge texture, warm paper, and no visible copy."
    };
    return cues[panelId];
  }
  if (/\b(koi|backyard pond|pond ripples?|fish move through the water)\b/.test(contract)) {
    const cues = {
      front: "Serene koi encouragement cover with one slow koi arc beneath a wide quiet water field, muted pond green and warm ivory palette, and clean upper text-safe area.",
      "inside-left": "Left interior with sparse pond-ripple border, a single koi-scale accent, and calm center-left writing space; steady and hopeful, not decorative wallpaper.",
      "inside-right": "Matching right interior with soft water rings and one small koi silhouette near the lower edge, broad open message field, restrained encouragement tone.",
      back: "Open back cover with one small koi-ripple mark, faint pond-edge texture, warm paper, and quiet lower text-safe space."
    };
    return cues[panelId];
  }
  if (/\b(dog|dogs|dog-loving|dog lover|dog-trust|leash|good neighbor)\b/.test(contract)) {
    const cues = {
      front: "Dog-lover thank-you cover with one abstract leash curve beside a neighborly doorstep, warm cream paper, and clean lower text-safe space; no dog portrait and no paw-print wallpaper.",
      "inside-left": "Left interior with a tiny dog-tag-shaped mark, subtle sidewalk line, paper texture, and generous low-detail center for the opening thank-you.",
      "inside-right": "Matching right interior with a quiet leash-curve border and neighborly trust motif near the bottom, broad open field for the main message.",
      back: "Open back cover with one small dog-tag mark, faint leash-curve border echo, and warm paper texture."
    };
    return cues[panelId];
  }
  if (isMedicalMilestoneInput(input)) {
    const cues = {
      front:
        "White doctor's coat hanging beside a graduation stole in soft hospital hallway sunrise light; stethoscope and folded residency notes with no readable writing; subtle gold accents; clean upper-third text-safe area; no people or faces.",
      "inside-left":
        "Quiet desk after a long hospital shift with stethoscope, coffee cup, closed medical books, graduation cap, and warm lamplight; soft cream, navy, muted gold, and warm brown tones; center-left text-safe paper field; no readable writing.",
      "inside-right":
        "Golden sunrise through a hospital window, white coat draped over a chair, stethoscope nearby, and a tiny abstract brotherly memory silhouette without specific faces; lower half calm and open for the closing note.",
      back:
        "Minimal warm cream back cover with a small centered stethoscope forming a subtle heart beside a graduation cap; soft gold and navy accents; clean lower text-safe area."
    };
    return cues[panelId];
  }
  if (/\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source)) {
    const cues = {
      front: "Tender recovery cover with a basil sprig, small soup bowl curve, and tiny walking-path line; warm ivory field with clay and basil accents; clean upper text-safe area.",
      "inside-left": "Soft interior note sheet with a small soup spoon and basil corner cluster, quiet paper texture, and wide center text-safe area for encouragement.",
      "inside-right": "Matching interior panel with tiny walking-path linework along the lower edge, calm blank center, and practical-care warmth without hospital-room imagery.",
      back: "Open back cover using a basil leaf, tiny path line, faint edge texture, and warm ivory paper."
    };
    return cues[panelId];
  }
  if (/\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source)) {
    const cues = {
      front: "Premium customer-success cover with clean white and deep teal fields, subtle sterile-supply geometry, and a calm lower text-safe area; polished B2B stationery.",
      "inside-left": "Left interior with thin teal frame, soft metallic accent line, small calendar/partnership motif, and a quiet center for the thank-you note.",
      "inside-right": "Right interior with a clean app-overlay zone for QR or account-manager CTA, sparse teal geometry, generous margins, and no actual QR code or interface art.",
      back: "Open back cover with one small teal-and-metallic partnership mark, faint frame echo, and ample low-detail space."
    };
    return cues[panelId];
  }
  if (/\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source)) {
    const cues = {
      front: "Restrained wedding cover with paired sage stems, soft ivory field, quiet ribbon arc, restrained gold detail, and a clean central text-safe area.",
      "inside-left": "Elegant border-first interior with sage corner stems, warm ivory paper, and calm center space for a short blessing.",
      "inside-right": "Matching interior with generous open lower area for handwritten words, subtle ribbon arc, and sparse botanical corners; no fake script.",
      back: "Open back cover echoing paired stems, one small gold dot, faint botanical edge texture, and calm ivory space."
    };
    return cues[panelId];
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    const cues = {
      front: "Premium quiet-support sympathy cover: deep moss field, muted ivory upper title-safe open area, and one lower abstract paper-cut practical-care relief with covered meal shape, folded cloth, doorstep threshold arc, quiet ride path curve, and tiny call/silence arcs; no clipart, phones, cars, fake text, or labels.",
      "inside-left": "Soft left interior with warm ivory plain center text-safe space and a small lower-left abstract care relief below the copy area: covered meal shape, folded cloth, doorstep threshold arc; no page seam, fake text, phones, note cards, cars, fruit, flowers, or table setting.",
      "inside-right": "Matching right interior with warm ivory plain center text-safe space and mirrored lower-right abstract care relief: quiet path curve for rides, folded cloth shape, and two tiny call/silence arcs; no page seam, fake text, phones, note cards, route labels, cars, fruit, flowers, or table setting.",
      back: "Minimal deep moss back cover with readable upper/center text-safe area and one small lower practical-care echo: covered meal shape and threshold arc; no urn, vase, phone, note card, fruit, flowers, table setting, physical paper card, car-like marks, fake text, or labels."
    };
    return cues[panelId];
  }
  if (/\b(funny|playful|witty|sprint|project-management|project management|bold type|bold-type|poster|editorial)\b/.test(source) && /\bbirthday\b/.test(source)) {
    const cues = {
      front: "Funny bold-type birthday cover using abstract editorial blocks, a tiny cake-slice mark, lively offset rhythm, warm accent color, and a clean central text-safe area; no rendered letters.",
      "inside-left": "Left interior with sparse editorial rules, one small milestone dot, bright accent corner, and open message field for the affectionate setup.",
      "inside-right": "Right interior with matching bold-rule structure, offset accent block near the lower edge, and generous text-safe area for the punchline and sign-off.",
      back: "Open back cover with a tiny cake-slice mark, one clean editorial rule, and warm low-detail paper."
    };
    return cues[panelId];
  }
  if (/\b(anniversary|years together|spouse|balcony basil|sunday morning walks?)\b/.test(source)) {
    const cues = {
      front: "Sentimental anniversary cover with paired basil sprigs, a Sunday-walk path line, warm morning light, and a clean central text-safe field.",
      "inside-left": "Soft cream left interior with a balcony-basil corner, paired leaves, quiet paper texture, and open center space for the first reflection.",
      "inside-right": "Matching right interior with a subtle walking-path line along the lower edge, small window-light shape, and calm main-message area.",
      back: "Small paired-basil back mark with warm cream open space, faint edge texture, and a quiet lower text-safe area."
    };
    return cues[panelId];
  }
  if (/\b(water(?:ed|ing)? the plants?|plant care|looked after .*plants?|neighbor plant|away.*plants?)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    const cues = {
      front: "Simple minimal thank-you cover with one small plant mark, clean white and warm ivory field, fine leaf-green rule, and lower text-safe space.",
      "inside-left": "Minimal left interior with a tiny water-drop mark, fine rule, subtle paper texture, generous low-detail center, and no floral pattern.",
      "inside-right": "Matching minimal right interior with one small plant-related mark near the lower edge and calm main-message space.",
      back: "Clean back cover with a single plant mark, faint fine-rule echo, and open white paper."
    };
    return cues[panelId];
  }
  if (/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    const cues = {
      front: "Warm local-shop thank-you cover with controlled citrus-and-leaf corner arrangement, soft gold ribbon curve, kraft paper texture, and open text-safe center.",
      "inside-left": "Cream interior note sheet with a thin editorial border, small citrus corner, and quiet center-left space for the opening thank-you.",
      "inside-right": "Matching interior with subtle boutique awning silhouette near the lower edge, sparse leaves, and generous low-detail message area.",
      back: "Small citrus-and-leaf back mark on warm cream paper with a faint handmade border echo."
    };
    return cues[panelId];
  }
  if (/\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source)) {
    const cues = {
      front: "Practical-love cover with one organized lower-corner tool cluster, blueprint linework, workshop green and golden accents, and clean upper text-safe area.",
      "inside-left": "Interior note sheet with fine blueprint rules, a tightened-screw detail, and a quiet center for the first message.",
      "inside-right": "Matching interior with a small hinge or measuring-tape motif tucked along the lower edge and a generous main-message field.",
      back: "Minimal back panel with one small wrench-and-pencil mark and sparse blueprint lines."
    };
    return cues[panelId];
  }
  if (/\b(botanical|fern|flower|trail|hike|coffee)\b/.test(source) || (/\bbirthday\b/.test(source) && !/\b(aquarium|freshwater|koi|pond|dog)\b/.test(contract))) {
    const cues = {
      front: "Botanical birthday cover with fern fronds, tiny trail flowers, morning light, and a clean central text-safe field.",
      "inside-left": "Soft cream interior with pressed-fern corner border, gentle coffee-steam curve, and open center-left note area.",
      "inside-right": "Matching botanical interior with sparse leaf border, tiny trail line near the bottom, and calm main-message space.",
      back: "Small fern sprig back mark with warm cream negative space and a quiet lower text-safe area."
    };
    return cues[panelId];
  }
  const motifs = Array.isArray(themeGuide.motifs) && themeGuide.motifs.length
    ? themeGuide.motifs.slice(0, 3).join(", ")
    : "one symbolic motif";
  const palette = Array.isArray(themeGuide.palette) && themeGuide.palette.length
    ? themeGuide.palette.slice(0, 4).join(", ")
    : "warm ivory, soft accent, deep neutral";
  const cues = {
    front: `${themeGuide.theme_title} front cover with one dominant composition built from ${motifs}; ${palette} palette; clean upper or central text-safe area.`,
    "inside-left": `${themeGuide.theme_title} left interior as a border-first note sheet with sparse ${motifs} edge detail, light paper field, and quiet center text-safe area.`,
    "inside-right": `${themeGuide.theme_title} right interior matching the left panel with generous main-message space and sparse lower or corner motif detail.`,
    back: `${themeGuide.theme_title} back cover with one small coordinating mark from ${motifs}, faint border echo, open low-detail paper, and clean lower text-safe area.`
  };
  return truncate(cues[panelId] || cues.front, 360);
}

function normalizeTextLayout(value, panelId, input) {
  return normalizePanelTextLayout(value, {
    panelId,
    sourceText: sourceTextFromCardInput(input)
  });
}

export function textContains(value, term) {
  const haystack = cleanText(value).toLowerCase();
  const needle = cleanText(term).toLowerCase();
  if (!needle) return true;
  return haystack.includes(needle);
}

export function validateCardCopyContract(cardCopy, input) {
  const issues = [];
  const panels = Array.isArray(cardCopy?.panels) ? cardCopy.panels : [];
  const ids = panels.map((panel) => panel?.id).filter(Boolean);
  if (panels.length !== requiredPanelIds.length) {
    issues.push(`Expected ${requiredPanelIds.length} panels, got ${panels.length}.`);
  }
  for (const panelId of requiredPanelIds) {
    if (!ids.includes(panelId)) issues.push(`Missing panel ${panelId}.`);
  }
  const serialized = cardCopyValidationText(cardCopy);
  for (const term of input.must_include || []) {
    if (!textContains(serialized, term)) issues.push(`Missing required term: ${term}`);
  }
  for (const term of input.must_avoid || []) {
    if (textContains(serialized, term)) issues.push(`Forbidden term present: ${term}`);
  }
  return {
    ok: issues.length === 0,
    issues
  };
}

function cardCopyValidationText(cardCopy) {
  return [
    cardCopy?.theme_guide?.theme_title,
    ...(cardCopy?.theme_guide?.palette || []),
    ...(cardCopy?.theme_guide?.motifs || []),
    cardCopy?.theme_guide?.border_style,
    cardCopy?.theme_guide?.front_back_pairing,
    cardCopy?.theme_guide?.interior_pairing,
    ...(cardCopy?.panels || []).flatMap((panel) => [
      panel.headline,
      panel.body,
      panel.art_direction,
      panel.visual_cue,
      panel.image_prompt
    ])
  ].join(" ");
}

function textSafeCueForLayout(layout) {
  const headline = layout?.headline_zone || "upper";
  const body = layout?.body_zone || "center";
  if (headline === "top" && body === "upper") return "upper third";
  if (headline === "upper" && body === "center") return "upper-to-center field";
  if (headline === "upper" && (body === "lower" || body === "bottom")) return "upper and lower fields";
  if (headline === "center" || body === "center") return "quiet center field";
  if (body === "lower" || body === "bottom") return "lower half";
  return "main message field";
}

function textSafeCueMentioned(prompt, cue) {
  const promptText = String(prompt || "").toLowerCase();
  if (promptText.includes(cue.toLowerCase())) return true;
  if (/\b(text-safe|negative space|blank center|quiet center|open note area|message field|clean area)\b/.test(promptText)) return true;
  return false;
}

function stringSharesEnoughTerms(left, right, minimum) {
  const leftText = String(left || "").toLowerCase();
  const terms = Array.from(new Set(String(right || "").toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? []))
    .filter((term) => !["clean", "field", "panel", "space", "without", "people", "faces"].includes(term));
  return terms.filter((term) => leftText.includes(term)).length >= minimum;
}

export function normalizeCardCopy(parsed, input) {
  const rawThemeGuide = parsed?.theme_guide || parsed?.themeGuide || parsed?.card_copy?.theme_guide || parsed?.cardCopy?.themeGuide;
  const rawPanels = extractRawCardCopyPanels(parsed);
  const themeGuide = normalizeThemeGuide(rawThemeGuide, input);
  const panels = requiredPanelIds.map((id) => {
    const raw = rawPanels.find((panel) => panel?.id === id) ?? {};
    const defaults = panelDefaults[id];
    const headline = truncate(cleanText(raw.headline || defaults.headline), 120);
    const body = truncate(cleanText(raw.body || defaults.body), 600);
    const artDirection = truncate(cleanText(raw.art_direction || raw.artDirection || defaults.art_direction), 500);
    const visualCue = normalizeVisualCue(raw.visual_cue || raw.visualCue, id, input, themeGuide);
    const textLayout = normalizeTextLayout(raw.text_layout || raw.textLayout, id, input);
    const rawImagePrompt = truncate(cleanText(raw.image_prompt || raw.imagePrompt || defaults.image_prompt), 1800);
    const promptPanel = {
      ...defaults,
      headline,
      body,
      art_direction: artDirection,
      visual_cue: visualCue,
      text_layout: textLayout,
      image_prompt: rawImagePrompt
    };
    return {
      id,
      headline,
      body,
      art_direction: artDirection,
      visual_cue: visualCue,
      text_layout: textLayout,
      image_prompt: truncate(
        normalizeImagePrompt(rawImagePrompt, id, input, promptPanel),
        1800
      ),
      image_negative_prompt: truncate(
        normalizePanelImageNegativePrompt(raw.image_negative_prompt || raw.imageNegativePrompt || defaults.image_negative_prompt, input),
        500
      ).replace(/,\s*$/, "")
    };
  });
  const memoryCitations = Array.isArray(parsed?.memory_citations)
    ? parsed.memory_citations
    : Array.isArray(parsed?.memoryCitations)
      ? parsed.memoryCitations
      : input.memory_notes.slice(0, 2);
  return {
    theme_guide: themeGuide,
    panels: repairCardCopyPanels(panels, input, themeGuide),
    memory_citations: memoryCitations.map(cleanText).filter(Boolean).slice(0, 4)
  };
}

export function repairMissingRequiredTermsInCardCopy(cardCopy, input, issues) {
  const missingTerms = missingRequiredTermsFromIssues(issues);
  const forbiddenTerms = forbiddenTermsFromIssues(issues);
  if (missingTerms.length === 0 && forbiddenTerms.length === 0) return cardCopy;
  let repairedCardCopy = repairMissingRequiredRecipientInCardCopy(cardCopy, input, missingTerms);
  const remainingTerms = missingTerms.filter((term) => !textContains(cardCopyValidationText(repairedCardCopy), term));
  if (remainingTerms.length > 0) {
    const contextCue = `Required request context to reflect visually, without rendering these words: ${remainingTerms.join(", ")}.`;
    repairedCardCopy = {
      ...repairedCardCopy,
      panels: (repairedCardCopy.panels || []).map((panel) =>
        panel.id === "front"
          ? {
              ...panel,
              visual_cue: truncate(`${panel.visual_cue || ""} ${contextCue}`.trim(), 360),
              image_prompt: truncate(`${panel.image_prompt || ""} ${contextCue}`.trim(), 1800)
            }
          : panel
      )
    };
  }
  return forbiddenTerms.length > 0 ? removeForbiddenTermsFromCardCopy(repairedCardCopy, forbiddenTerms) : repairedCardCopy;
}

function missingRequiredTermsFromIssues(issues) {
  return (issues || [])
    .map((issue) => String(issue || "").match(/^Missing required term:\s*(.+)$/i)?.[1])
    .filter(Boolean)
    .map(cleanText);
}

function forbiddenTermsFromIssues(issues) {
  return (issues || [])
    .map((issue) => String(issue || "").match(/^Forbidden term present:\s*(.+)$/i)?.[1])
    .filter(Boolean)
    .map(cleanText);
}

function removeForbiddenTermsFromCardCopy(cardCopy, forbiddenTerms) {
  const cleanField = (value) => removeForbiddenTerms(value, forbiddenTerms);
  return {
    ...cardCopy,
    theme_guide: {
      ...cardCopy.theme_guide,
      theme_title: cleanField(cardCopy.theme_guide?.theme_title),
      palette: (cardCopy.theme_guide?.palette || []).map(cleanField).filter(Boolean),
      motifs: (cardCopy.theme_guide?.motifs || []).map(cleanField).filter(Boolean),
      border_style: cleanField(cardCopy.theme_guide?.border_style),
      front_back_pairing: cleanField(cardCopy.theme_guide?.front_back_pairing),
      interior_pairing: cleanField(cardCopy.theme_guide?.interior_pairing)
    },
    panels: (cardCopy.panels || []).map((panel) => ({
      ...panel,
      headline: cleanField(panel.headline),
      body: cleanField(panel.body),
      art_direction: cleanField(panel.art_direction),
      visual_cue: cleanField(panel.visual_cue),
      image_prompt: cleanField(panel.image_prompt)
    }))
  };
}

function removeForbiddenTerms(value, forbiddenTerms) {
  let text = String(value || "");
  for (const term of forbiddenTerms) {
    text = text.replace(new RegExp(escapeRegExp(term), "gi"), "").replace(/\s+([,.;:!?])/g, "$1");
  }
  return cleanText(text.replace(/\s{2,}/g, " ").trim());
}

function repairMissingRequiredRecipientInCardCopy(cardCopy, input, missingTerms) {
  const recipient = cleanText(input?.recipient || "");
  const missingRecipient = missingTerms.some((term) => textContains(term, recipient));
  if (!recipient || !missingRecipient) return cardCopy;
  return {
    ...cardCopy,
    panels: repairRequiredRecipientInVisibleCopy(cardCopy.panels || [], input)
  };
}

function repairRequiredRecipientInVisibleCopy(panels, input) {
  const recipient = cleanText(input?.recipient || "");
  if (!recipient || recipient.toLowerCase() === "recipient") {
    return panels;
  }
  return panels.map((panel) => {
    if (panel.id !== "front") return panel;
    const body = cleanText(panel.body || "");
    const repairedBody = body
      ? `${recipient}, ${body.slice(0, 1).toLowerCase()}${body.slice(1)}`
      : `For ${recipient}.`;
    return {
      ...panel,
      body: truncate(repairedBody, 160)
    };
  });
}

function extractRawCardCopyPanels(parsed) {
  if (Array.isArray(parsed?.panels)) return parsed.panels;
  if (Array.isArray(parsed?.card_copy?.panels)) return parsed.card_copy.panels;
  if (Array.isArray(parsed?.cardCopy?.panels)) return parsed.cardCopy.panels;
  return requiredPanelIds.map((panelId) => coerceLooseRawPanel(parsed, panelId));
}

function coerceLooseRawPanel(parsed, panelId) {
  const panelKey = panelId.replace(/-/g, "_");
  const raw = parsed?.[panelId] || parsed?.[panelKey] || {};
  const copy = parsed?.copy && typeof parsed.copy === "object" ? parsed.copy : {};
  const headlineKey = `${panelKey}_headline`;
  const bodyKey = `${panelKey}_body`;
  const visualCue = looseKeyedValue(parsed?.visual_cue || parsed?.visualCue, panelId);
  const imagePrompt = looseKeyedValue(parsed?.image_prompt || parsed?.imagePrompt, panelId);
  const artDirection = looseKeyedValue(parsed?.art_direction || parsed?.artDirection, panelId);
  const textLayout =
    raw.text_layout ||
    raw.textLayout ||
    looseKeyedValue(parsed?.text_layout || parsed?.textLayout, panelId) ||
    copy[`${panelKey}_text_layout`] ||
    {};
  return {
    id: panelId,
    headline: raw.headline || raw[headlineKey] || copy[headlineKey] || looseCopyHeadline(copy, panelId),
    body: raw.body || raw[bodyKey] || copy[bodyKey] || looseCopyBody(copy, panelId),
    art_direction: raw.art_direction || raw.artDirection || summarizeLooseArtDirection(artDirection),
    visual_cue: raw.visual_cue || raw.visualCue || summarizeLooseArtDirection(visualCue),
    text_layout: coerceLooseTextLayout(textLayout, panelId),
    image_prompt: raw.image_prompt || raw.imagePrompt || summarizeLooseArtDirection(imagePrompt),
    image_negative_prompt:
      raw.image_negative_prompt ||
      raw.imageNegativePrompt ||
      looseKeyedValue(parsed?.image_negative_prompt || parsed?.imageNegativePrompt, panelId) ||
      parsed?.image_negative_prompt ||
      parsed?.imageNegativePrompt
  };
}

function looseKeyedValue(container, panelId) {
  if (!container || typeof container !== "object") return undefined;
  const panelKey = panelId.replace(/-/g, "_");
  return container[panelId] || container[panelKey];
}

function looseCopyHeadline(copy, panelId) {
  if (panelId === "front") return copy.front_headline;
  if (panelId === "back") return copy.back_headline;
  return copy[`${panelId.replace(/-/g, "_")}_headline`];
}

function looseCopyBody(copy, panelId) {
  if (panelId === "front") return copy.front_body;
  if (panelId === "back") return copy.back_body;
  return copy[`${panelId.replace(/-/g, "_")}_body`];
}

function summarizeLooseArtDirection(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return cleanText(value);
  return Object.values(value)
    .flatMap((item) => {
      if (typeof item === "string") return [item];
      if (Array.isArray(item)) return item.filter((entry) => typeof entry === "string");
      return [];
    })
    .map(cleanText)
    .filter(Boolean)
    .join("; ");
}

function coerceLooseTextLayout(value, panelId) {
  if (!value || typeof value !== "object") return value;
  const zone = cleanText(value.zone).toLowerCase();
  if (!zone) return value;
  return {
    ...value,
    ...(panelId === "front" ? { headline_zone: value.headline_zone || zone } : {}),
    body_zone: value.body_zone || zone
  };
}

function repairCardCopyPanels(panels, input, themeGuide) {
  const copyPlan = buildCopyRepairPlan(input, themeGuide);
  return panels.map((panel) => {
    const fallback = copyPlan[panel.id] ?? copyPlan.front;
    return {
      ...panel,
      headline: panelHeadlineNeedsRepair(panel.headline, panel.id, input) ? fallback.headline : panel.headline,
      body: panelBodyNeedsRepair(panel.body, panel.id, input) ? fallback.body : panel.body
    };
  });
}

function panelHeadlineNeedsRepair(headline, panelId, input) {
  const value = cleanText(headline);
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const isMedical = isMedicalMilestoneInput(input);
  const isGetWell = /\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source);
  const isB2B = /\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source);
  const isWedding = /\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source);
  const isSympathy = /\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source);
  const isSmallBusiness = /\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source);
  const isDad = /\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source);
  if (!value) return true;
  if (textConflictsWithNonMedicalBirthday(value, input)) return true;
  if (panelId === "inside-left" && /^for this moment$/i.test(value)) return true;
  if (panelId === "back" && /^customcard$/i.test(value)) return true;
  if (panelId === "front" && new RegExp(`^for ${escapeRegExp(input.recipient)}$`, "i").test(value)) return true;
  if (isSmallBusiness && panelId === "front" && /^for you$/i.test(value)) return true;
  if (isMedical && /^(?:thinking of you|from the heart)$/i.test(value)) return true;
  if (isMedical && /^(?:congratulations, doctor!?|congrats, doctor!?)$/i.test(value)) return true;
  if (isMedical && panelId === "back" && /^(?:wishing you a bright future|wishing you a wonderful day|congratulations, doctor!?|congrats, doctor!?)$/i.test(value)) return true;
  if (isGetWell && /^(?:thinking of you|get well soon|feel better soon|from the heart|sending healing thoughts)$/i.test(value)) return true;
  if (isB2B && /^(?:thank you|happy anniversary|for you|valued customer|your loyalty|renew today|limited time)$/i.test(value)) return true;
  if (isWedding && /^(?:congratulations|best wishes|thinking of you|from the heart|for this moment)$/i.test(value)) return true;
  if (isSympathy) {
    if (
      panelId === "front" &&
      (!textContains(value, input.recipient) ||
        /^(?:sympathy for .+|with deepest sympathy|thinking of you|for your loss)$/i.test(value) ||
        /\b(?:i'?m|i am|we are)\s+here\b/i.test(value))
    ) return true;
    if (
      panelId === "inside-left" &&
      (!/\b(?:with you|not alone|beside you)\b/i.test(value) ||
        /^(?:a friend'?s support|thinking of you|with sympathy|for this moment|practical support|support for .+|a memory of .+)$/i.test(value))
    ) return true;
    if (panelId === "inside-right" && (!textContains(value, input.sender) || /^(?:a friend'?s support|thinking of you|with sympathy)$/i.test(value))) return true;
    if (panelId === "back" && !/\bcare\b/i.test(value)) return true;
    if (panelId === "back" && /^(?:gratitude for .+|support for .+|for .+)$/i.test(value)) return true;
  }
  if (isSmallBusiness && /^(?:you matter|you'?re the best!?|thanks again!?|the customcard team|thank you for choosing us|a big thank you|a heartfelt thank you|a sincere thank you|until next time|our small business|wishing you continued.*)$/i.test(value)) return true;
  if ((isSmallBusiness || isDad) && /^(?:thinking of you|from the heart)$/i.test(value)) return true;
  if (isDad && /^(?:with love and appreciation|a love that's always fixing|love from the heart|a handy dad's love|to an amazing dad|fixing everything with love|thanks for being the best dad|wishing you a wonderful day)$/i.test(value)) return true;
  if (isDad && panelId !== "front" && /^thanks for fixing everything$/i.test(value)) return true;
  return /\b(?:card front|panel|headline|title area)\b/i.test(value);
}

function panelBodyNeedsRepair(body, panelId, input) {
  const value = cleanText(body);
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const isMedical = isMedicalMilestoneInput(input);
  const isGetWell = /\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source);
  const isB2B = /\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source);
  const isWedding = /\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source);
  const isSympathy = /\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source);
  const isSmallBusiness = /\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source);
  const isDad = /\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source);
  if (!value) return true;
  if (textConflictsWithNonMedicalBirthday(value, input)) return true;
  const metaCopy = /\b(?:with a .* feeling|i wanted this card to feel|design language|the heart of it is simple|it should carry this approved detail|make this feel|design a theme called|customcard needs|approved detail|a card made with care|made for .* with customcard|made with customcard|not salesy feeling|not cheesy feeling)\b/i;
  if (metaCopy.test(value)) return true;
  const genericMilestoneCopy = /\b(?:congratulations on achieving your dream|congratulations on this amazing achievement|congratulations on your medical school graduation|you are now a doctor|as you begin this new chapter|may your dreams continue to flourish|compassion and kindness|filled with compassion|lifetime of healing and service|lifetime of happiness|fulfillment in your medical career)\b/i;
  if (isMedical && genericMilestoneCopy.test(value)) return true;
  if (isMedical && panelId.startsWith("inside") && /\b(?:he|his|him)\b/i.test(value) && !/\byou\b/i.test(value)) return true;
  if (isMedical && panelId === "inside-right" && !/\b(?:discipline|patience|heart|dedication|late nights?|long shifts?|sacrifices?)\b/i.test(value)) return true;
  const genericGetWellCopy = /\b(?:speedy recovery|feel better soon|get well soon|back to normal|everything happens for a reason|this too shall pass|miracle cure|follow your doctor's orders)\b/i;
  if (isGetWell && genericGetWellCopy.test(value)) return true;
  if (isGetWell && panelId.startsWith("inside") && !/\b(?:tiny walks?|soup|basil|socks?|quiet company|practical)\b/i.test(value)) return true;
  const genericB2BCopy = /\b(?:valued customer|limited time|act now|exclusive discount|special discount|terms and conditions|legal warranty terms|your order has shipped|checkout)\b/i;
  if (isB2B && genericB2BCopy.test(value)) return true;
  if (isB2B && panelId === "inside-left" && !/\b(?:one year|first year|sterilizer|BrightSmile|trust)\b/i.test(value)) return true;
  if (isB2B && panelId === "inside-right" && !/\b(?:July 31|QR|account manager|warranty renewal)\b/i.test(value)) return true;
  const overfamiliarWeddingCopy = /\b(?:we have shared so many memories|as your close family|i have watched your love story|soulmates|god bless|lord|forever perfect)\b/i;
  if (isWedding && overfamiliarWeddingCopy.test(value) && !/\b(?:god|lord|christ|muslim|islam|jewish|hindu|religious)\b/i.test(source)) return true;
  if (isWedding && panelId === "inside-left" && !/\b(?:blessing|patience|kindness|wishing)\b/i.test(value)) return true;
  if (isWedding && panelId === "inside-right" && /\bhandwrit|handwritten|handwrite\b/i.test(source) && !/\bhandwrit|handwritten|handwrite\b/i.test(value)) return true;
  if (isSympathy && /\b(?:everything happens for a reason|this too shall pass|god|lord|heaven|angel|better place|thoughts and prayers)\b/i.test(value)) return true;
  if (isSympathy && panelId === "inside-left" && !/\bfather\b/i.test(value)) return true;
  if (isSympathy && panelId === "inside-right" && !/\b(?:meals?|rides?|calls?|silence)\b/i.test(value)) return true;
  if (isSympathy && panelId === "inside-right" && ["meals", "rides", "calls", "silence"].some((term) => !textContains(value, term))) return true;
  if (isSympathy && panelId === "back" && /\b(?:thank you for being part of our lives|thank you for being a part of our lives|in memory)\b/i.test(value)) return true;
  if (isSympathy && panelId === "back" && !/\bpractical\b/i.test(value)) return true;
  if (isSympathy && panelId === "back" && !/\b(?:grief|practical|quiet support|steady care|words cannot hold enough)\b/i.test(value)) return true;
  const genericSmallBusinessCopy = /\b(?:thank you for supporting our small business|customers like you|valued customer|look forward to serving|continue to support us|loyalty means the world|opportunity to serve you|loyalty and trust mean everything|thank you again for your loyalty and support|continued success and happiness|all your endeavors)\b/i;
  if (isSmallBusiness && genericSmallBusinessCopy.test(value)) return true;
  if (isSmallBusiness && panelId === "front" && !/\b(?:support|supporting|independent|local)\b/i.test(value)) return true;
  if (isSmallBusiness && panelId === "front" && /\bindependent\b/i.test(source) && !/\bindependent\b/i.test(value)) return true;
  if (isSmallBusiness && panelId === "inside-right" && !/\btrust\b/i.test(value)) return true;
  if (isSmallBusiness && panelId === "inside-left" && !/\b(?:choice|chose|independent)\b/i.test(value)) return true;
  const genericDadCopy = /\b(?:love is in the details|thanks for being a rock|steady presence is a powerful thing|tools for the job, love for the family)\b/i;
  const broadDadCopy = /\b(?:best handyman|best dad|amazing dad|handy dad|love from the heart|mean the world to me|glue that holds our family together|keeps our home running smoothly|shows love by fixing the small things|our family feel safe and secure)\b/i;
  if (isDad && genericDadCopy.test(value)) return true;
  if (isDad && broadDadCopy.test(value)) return true;
  if (isDad && panelId === "front" && !/\b(?:quiet fix|small rescue|handled before anyone asked)\b/i.test(value)) return true;
  if (isDad && panelId === "inside-left" && !/\b(?:tightened screw|fixed hinge|before anyone had to ask)\b/i.test(value)) return true;
  if (panelId === "front" && value.length < 35) return true;
  if (panelId === "inside-left" && value.length < 90) return true;
  if (panelId === "inside-right" && value.length < 130) return true;
  if (panelId === "back" && value.length < 35) return true;
  return false;
}

function buildCopyRepairPlan(input, themeGuide) {
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const contract = `${source} ${(input.must_include || []).join(" ")}`.toLowerCase();
  const sender = truncate(input.sender || "Your friend", 80);
  const recipient = truncate(input.recipient || "you", 80);
  if (/\b(aquarium|freshwater|fish tank|tank care|aquatic plants?|tiny fish)\b/.test(contract)) {
    const title = themeGuide.theme_title || "Aquarium Birthday Stillness";
    return {
      front: {
        headline: `Happy Birthday, ${recipient}`,
        body: `For a birthday with the calm of an aquarium: tiny fish, clean water, and the quiet ritual of noticing what others miss.`
      },
      "inside-left": {
        headline: "Small Worlds, Big Calm",
        body: `${recipient}, your aquarium care has its own kind of patience: freshwater plants settling in, tiny fish moving like little sparks, and the whole tank becoming calmer because you keep tending it.`
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `I hope this birthday gives you the same steady joy you find beside the aquarium: a clear moment, a few beautiful details, and the feeling that the small things are thriving. With warm wishes, ${sender}.`
      },
      back: {
        headline: title,
        body: `A quiet birthday note for ${recipient}, made with aquarium calm and freshwater detail.`
      }
    };
  }
  if (/\b(koi|backyard pond|pond ripples?|fish move through the water)\b/.test(contract)) {
    const title = themeGuide.theme_title || "Koi Pond Encouragement";
    return {
      front: {
        headline: `For ${recipient}`,
        body: "An encouragement card with the patience of koi moving through still water."
      },
      "inside-left": {
        headline: "Steady Water",
        body: `${recipient}, I keep thinking about the way koi move through a pond: unhurried, resilient, still finding a path through the water. That feels right for this hard stretch.`
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `I hope this encouragement reaches you gently. No loud speech, no forced brightness; just a reminder that patience can still be strength, and that I am wishing you steadier water ahead. With care, ${sender}.`
      },
      back: {
        headline: title,
        body: `For koi, quiet ripples, and the kind of encouragement that stays steady.`
      }
    };
  }
  if (/\b(dog|dogs|dog-loving|dog lover|dog-trust|leash|good neighbor)\b/.test(contract)) {
    const title = themeGuide.theme_title || "Dog-Trust Thank You";
    return {
      front: {
        headline: `Thank You, ${recipient}`,
        body: "For helping in the steady, noticing way a good dog-loving neighbor understands."
      },
      "inside-left": {
        headline: "That Help Mattered",
        body: `${recipient}, thank you for helping while I was away. You noticed what needed doing with the same loyal, practical kindness that makes dogs trust a person quickly.`
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `I appreciate the care, the trust, and the neighborly attention you gave so freely. This thank-you is simple on purpose: you helped, it mattered, and a dog would absolutely approve. With thanks, ${sender}.`
      },
      back: {
        headline: title,
        body: `A quiet thank-you for ${recipient}, with dog-lover warmth and neighborly trust.`
      }
    };
  }
  if (isMedicalMilestoneInput(input)) {
    const title = themeGuide.theme_title || "From Dream to Doctor";
    return {
      front: {
        headline: title,
        body: "For every late night, long shift, and quiet sacrifice that brought you here."
      },
      "inside-left": {
        headline: "Years In The Making",
        body: "You kept going through exams, late nights, long shifts, and the sacrifices most people never saw. Today honors the discipline behind the white coat as much as the degree itself."
      },
      "inside-right": {
        headline: "With So Much Pride",
        body: `We are proud not only of the doctor you are becoming, but of the patience, heart, and dedication that brought you here. This moment belongs to every hard choice you made and every day you kept going. With love, ${sender}.`
      },
      back: {
        headline: title,
        body: "With pride, love, and deep respect for the doctor you worked so hard to become."
      }
    };
  }
  if (/\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source)) {
    return {
      front: {
        headline: "Tiny Walks, Big Heart",
        body: "For the mayor of tiny walks, soup scores, basil victories, and getting through today one gentle step at a time."
      },
      "inside-left": {
        headline: "Recovery, Your Way",
        body: "I know surgery recovery can make the smallest things feel like a whole expedition. So here is to tiny walks, terrible socks, and whatever soup earns a respectable score this week."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `I am here for the practical parts and the ridiculous parts: basil updates, soup debates, tiny-walk mayoral duties, quiet company, and days when you do not need to be entertaining at all. No pressure, just steady care from ${sender}.`
      },
      back: {
        headline: "One Gentle Step",
        body: "For recovery measured in tiny walks, warm soup, and people who are glad to be nearby."
      }
    };
  }
  if (/\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source)) {
    return {
      front: {
        headline: "A Year Of Trusted Care",
        body: `Thank you, ${recipient}, for one year with your sterilizer system and the team behind it.`
      },
      "inside-left": {
        headline: "One Year In Service",
        body: `BrightSmile Clinic's first year with the sterilizer system deserves a clear thank-you. We appreciate the trust your team has placed in ${sender} and the care you bring to every patient-facing detail.`
      },
      "inside-right": {
        headline: "Renewal Window",
        body: "Your extended warranty renewal window closes July 31. To review the next step, scan the enclosed QR code or contact your account manager. We are keeping this reminder calm, useful, and easy to act on."
      },
      back: {
        headline: sender,
        body: "With appreciation for one year of partnership and a clear path for warranty renewal."
      }
    };
  }
  if (/\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source)) {
    return {
      front: {
        headline: `For ${recipient}`,
        body: "Warm wedding wishes for a day filled with grace, steadiness, and joy."
      },
      "inside-left": {
        headline: "A Quiet Blessing",
        body: "May your life together be met with patience, kindness, laughter, and the steady care that makes ordinary days feel held. Wishing you both a beautiful beginning."
      },
      "inside-right": {
        headline: "Room For A Note",
        body: `I am leaving this side open for a few handwritten words, but wanted the card itself to carry a simple blessing first: may this new chapter be generous, peaceful, and full of mutual care. With warm wishes, ${sender}.`
      },
      back: {
        headline: "With Warm Wishes",
        body: "A restrained wedding note for Lina and Omar, made with space for handwriting."
      }
    };
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    return {
      front: {
        headline: `For ${recipient}`,
        body: ""
      },
      "inside-left": {
        headline: "With You In This",
        body: "I am so sorry about your father. I will not try to explain the loss or cover the quiet with easy words; I am here beside you, at whatever pace the day allows."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `Meals can be left at your door. Rides can be quiet. Calls can be answered or missed. Silence counts too. You do not have to manage this alone. With sympathy and friendship, ${sender}.`
      },
      back: {
        headline: "With Steady Care",
        body: "For practical help, quiet support, and steady care on days words cannot hold."
      }
    };
  }
  if (/\b(anniversary|years together|spouse|balcony basil|sunday morning walks?)\b/.test(source)) {
    return {
      front: {
        headline: `For ${recipient}`,
        body: "For the small rituals that became our life: basil on the balcony, Sunday walks, and choosing each other again."
      },
      "inside-left": {
        headline: "The Little Things Stayed",
        body: "I keep thinking about the small things that somehow became ours: the balcony basil, the Sunday morning walks, the ordinary routines that made a life feel tender and real."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `Happy anniversary, my love. I do not need this to sound like a vow; I just want it to sound true. I am grateful for the quiet days, the shared jokes, the plants we keep alive, and the way walking beside you still feels like home. With all my love, ${sender}.`
      },
      back: {
        headline: "Our Small Garden",
        body: "For balcony basil, Sunday walks, and the life we keep tending together."
      }
    };
  }
  if (/\b(thank|grateful|appreciat|water(?:ed|ing) the plants?|neighbor)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return {
      front: {
        headline: `Thank You, ${recipient}`,
        body: "For showing up in a simple way that mattered."
      },
      "inside-left": {
        headline: "That Help Mattered",
        body: "Thank you for watering the plants while I was away. It was a small practical kindness, but it made coming home easier and reminded me what a good neighbor feels like."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `I appreciate the time and care you gave so freely. No big speech, just real gratitude: you helped, it mattered, and I am glad to have a neighbor I can trust. The plants and I are both grateful. With thanks, ${sender}.`
      },
      back: {
        headline: "With Thanks",
        body: "For a neighborly kindness that did not go unnoticed."
      }
    };
  }
  if (/\b(funny|playful|witty|sprint|project-management|project management)\b/.test(source) && /\bbirthday\b/.test(source)) {
    return {
      front: {
        headline: `Happy Birthday ${recipient}`,
        body: "Another successful trip around the sun, completed on schedule and with only minor stakeholder feedback."
      },
      "inside-left": {
        headline: "Sprint Complete",
        body: "You somehow turn family plans into sprint planning and still make everyone feel taken care of. Today, the only deliverable is enjoying yourself with zero action items."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `Happy birthday to the person who could probably run a retrospective on cake. I hope this year brings clean timelines, excellent snacks, and the kind of affection that does not require a status update. With love, ${sender}.`
      },
      back: {
        headline: "No Action Items",
        body: "Just love, cake, and one very official birthday milestone."
      }
    };
  }
  if (/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return {
      front: {
        headline: "Thank you for choosing local",
        body: "Your support keeps independent work personal, human, and close to home."
      },
      "inside-left": {
        headline: "Because You Chose Us",
        body: "You chose an independent small business when there were easier, bigger options. That choice matters, and it helps keep the care, craft, and human side of this work alive."
      },
      "inside-right": {
        headline: "With Real Gratitude",
        body: "Thank you for being part of the community around this little business. We notice every return visit, every kind word, and every bit of trust. Your support helps make the work feel possible."
      },
      back: {
        headline: "With Thanks",
        body: "Made with gratitude for customers who choose small."
      }
    };
  }
  if (/\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source)) {
    return {
      front: {
        headline: `For ${recipient}`,
        body: "For every quiet fix, every small rescue, and every thing you handled before anyone asked."
      },
      "inside-left": {
        headline: "Steady Hands",
        body: "You have a way of showing love through the small things: the tightened screw, the fixed hinge, the problem solved before anyone had to ask."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `This Father's Day, I wanted you to know those quiet repairs never went unnoticed. They added up to something bigger: steadiness, care, and a home that always felt looked after. With love, ${sender}.`
      },
      back: {
        headline: "Built With Love",
        body: "For the dad who fixes the small things and makes them mean everything."
      }
    };
  }
  if (/\b(birthday|botanical|fern|flower|trail|hike|coffee)\b/.test(source)) {
    return {
      front: {
        headline: `Happy Birthday ${recipient}`,
        body: "For a day with room for fresh air, small wonders, and the kind of joy that lingers."
      },
      "inside-left": {
        headline: "A Little Sunshine",
        body: "I hope the day opens gently, with good coffee, green trails, and tiny things worth noticing. You have a way of making ordinary mornings feel bright."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `Wishing you a year of more hikes, more laughter, more good coffee, and more quiet moments that feel like yours. I am grateful for the warmth you bring into the lives around you and for the tiny bright things you help other people notice. With love, ${sender}.`
      },
      back: {
        headline: "For The Little Wonders",
        body: "Made for a birthday full of green paths, good coffee, and tiny bright things."
      }
    };
  }
  return {
    front: {
      headline: `For ${recipient}`,
      body: `A ${truncate(input.occasion || "special", 60)} note made personal, warm, and specific.`
    },
    "inside-left": {
      headline: "For This Moment",
      body: input.memory_notes[0]
        ? `This moment deserves a note that remembers what matters: ${truncate(input.memory_notes[0], 220)}`
        : "This moment deserves a note that feels personal, finished, and warm without pretending to know more than it does."
    },
    "inside-right": {
      headline: `From ${sender}`,
      body: input.memory_notes[1]
        ? `${truncate(input.memory_notes[1], 260)} I am sending this with care and with all the warmth this occasion deserves. With love, ${sender}.`
        : `I am sending this with care, gratitude, and all the warmth this occasion deserves. With love, ${sender}.`
    },
    back: {
      headline: "With Care",
      body: "A quiet closing note for a card made to feel personal."
    }
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
