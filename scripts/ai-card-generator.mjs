import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig
} from "../src/aiFlowConfigData.mjs";

export const aiCardGenerateRoute = "/api/ai/card/generate";
export const aiChatRespondRoute = "/api/ai/chat/respond";

const requiredPanelIds = ["front", "inside-left", "inside-right", "back"];
const cardCopyJsonSchema = {
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
        required: ["id", "headline", "body", "art_direction", "image_prompt", "image_negative_prompt"],
        properties: {
          id: { type: "string", enum: requiredPanelIds },
          headline: { type: "string", maxLength: 120 },
          body: { type: "string", maxLength: 600 },
          art_direction: { type: "string", maxLength: 500 },
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
const panelDefaults = {
  front: {
    headline: "For you",
    body: "A card made with care.",
    art_direction: "Coordinated front cover artwork with safe margins.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a premium 5x7 vertical front print panel, one clear hero visual idea, disciplined negative space for app-added typography, restrained edge ornament, refined print stationery composition, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-left": {
    headline: "Thinking of you",
    body: "A note for this moment.",
    art_direction: "Soft interior panel with room for a short message.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a soft 5x7 vertical inside-left print panel, border-first stationery layout, thin refined frame, sparse corner or lower-edge motif, large quiet blank center for app-added typography, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-right": {
    headline: "From the heart",
    body: "With warm wishes.",
    art_direction: "Main message panel with readable typography and generous margins.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a clean 5x7 vertical inside-right print panel, matching border-first stationery layout, thin refined frame, sparse corner or lower-edge motif, generous quiet text-safe center for app-added typography, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  back: {
    headline: "CustomCard",
    body: "Made with CustomCard. Printed locally.",
    art_direction: "Clean coordinating back panel with minimal ornamentation.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a minimal 5x7 vertical back print panel, mostly negative space, one small coordinating lower mark or border echo, refined print stationery finish, no all-over wallpaper pattern, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  }
};

export function loadLocalAiEnvFiles({ cwd = process.cwd(), target = process.env } = {}) {
  for (const filePath of [".env.local", "infra/env/.env"]) {
    const absolutePath = resolve(cwd, filePath);
    if (!existsSync(absolutePath)) continue;
    const parsed = parseDotenv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!isAiEnvKey(key)) continue;
      if (!target[key]) target[key] = value;
    }
  }
  return target;
}

export function createAiCardGenerationService({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const rateBuckets = new Map();

  return {
    async generateCard(body, requestContext = {}) {
      const adminConfig = requestScopedAiFlowConfig(body, env, requestContext);
      const copyFlow = resolveAiFlowConfig("card-copy", env, adminConfig);
      const imageFlow = resolveAiFlowConfig("card-image", env, adminConfig);
      const rateLimit = checkRateLimit(rateBuckets, requestContext.rateKey, copyFlow);
      if (rateLimit) return rateLimit;

      const draftInput = normalizeCardInput(body);
      let cardCopy;
      let textProviderFailure = "";
      let imageProviderFailure = "";
      let textProvider = copyFlow.primaryAdapterId;

      if (copyFlow.readyForLiveCalls) {
        try {
          const text = await executeTextProvider({
            flow: copyFlow,
            env,
            fetchImpl,
            systemPrompt: copyFlow.promptInstructions,
            userPrompt: buildCardCopyPrompt(draftInput),
            responseFormat: buildCardCopyResponseFormat(copyFlow)
          });
          cardCopy = normalizeCardCopy(parseJsonFromText(text), draftInput);
        } catch (error) {
          textProviderFailure = error instanceof Error ? error.message : "Provider text generation failed.";
          cardCopy = buildFallbackCardCopy(draftInput);
          textProvider = copyFlow.fallbackAdapterId;
        }
      } else {
        textProviderFailure = copyFlow.blockedReasons[0] ?? "Live card-copy provider is disabled.";
        cardCopy = buildFallbackCardCopy(draftInput);
        textProvider = copyFlow.fallbackAdapterId;
      }

      const images = [];
      let imageProvider = imageFlow.fallbackAdapterId;
      if (imageFlow.readyForLiveCalls) {
        const imageRateLimit = checkRateLimit(rateBuckets, `${requestContext.rateKey}:image`, imageFlow);
        if (!imageRateLimit) {
          try {
            const imagePromptPlan = buildImagePromptPlan(draftInput, cardCopy);
            for (const panelPrompt of imagePromptPlan) {
              const imageUrl = await executeImageProvider({
                flow: imageFlow,
                env,
                fetchImpl,
                panelId: panelPrompt.panel_id,
                prompt: panelPrompt.prompt,
                negativePrompt: panelPrompt.negative_prompt
              });
              if (!imageUrl) continue;
              images.push({
                panel_id: panelPrompt.panel_id,
                image_url: imageUrl,
                revised_prompt: panelPrompt.prompt,
                width: 1500,
                height: 2100
              });
            }
            if (images.length === imagePromptPlan.length) {
              imageProvider = imageFlow.primaryAdapterId;
            } else {
              imageProviderFailure = `Image provider returned ${images.length} of ${imagePromptPlan.length} required panels.`;
              images.length = 0;
            }
          } catch (error) {
            imageProviderFailure = error instanceof Error ? error.message : "Provider image generation failed.";
            images.length = 0;
          }
        }
      }

      const fallbackQueued =
        Boolean(textProviderFailure && copyFlow.fallbackQueueEnabled) ||
        Boolean(imageProviderFailure && imageFlow.fallbackQueueEnabled);

      return {
        statusCode: 200,
        payload: {
          draft_id: buildDraftId(draftInput),
          card_copy: cardCopy,
          images,
          generated_by: images.length > 0 ? "ai-text-and-image" : "ai-text-only",
          ai_flow: {
            card_copy: publicFlowState(copyFlow, textProvider, textProviderFailure),
            card_image: publicFlowState(
              imageFlow,
              imageProvider,
              imageProviderFailure || (imageFlow.readyForLiveCalls ? "" : imageFlow.blockedReasons[0] ?? "")
            )
          },
          live_provider_calls_enabled: copyFlow.readyForLiveCalls || imageFlow.readyForLiveCalls,
          fallback_queued: fallbackQueued,
          external_network_calls: copyFlow.readyForLiveCalls || imageFlow.readyForLiveCalls
        }
      };
    },

    async respondChat(body, requestContext = {}) {
      const adminConfig = requestScopedAiFlowConfig(body, env, requestContext);
      const flow = resolveAiFlowConfig("customer-chat", env, adminConfig);
      const rateLimit = checkRateLimit(rateBuckets, requestContext.rateKey, flow);
      if (rateLimit) return rateLimit;

      const input = normalizeChatInput(body);
      let assistantMessage;
      let providerFailure = "";
      let adapterId = flow.primaryAdapterId;

      if (flow.readyForLiveCalls) {
        try {
          assistantMessage = await executeTextProvider({
            flow,
            env,
            fetchImpl,
            systemPrompt: flow.promptInstructions,
            userPrompt: buildChatPrompt(input)
          });
        } catch (error) {
          providerFailure = error instanceof Error ? error.message : "Provider chat generation failed.";
          assistantMessage = buildLocalChatReply(input);
          adapterId = flow.fallbackAdapterId;
        }
      } else {
        providerFailure = flow.blockedReasons[0] ?? "Live customer-chat provider is disabled.";
        assistantMessage = buildLocalChatReply(input);
        adapterId = flow.fallbackAdapterId;
      }

      return {
        statusCode: 200,
        payload: {
          assistant_message: truncate(cleanText(assistantMessage), 900),
          ai_flow: {
            customer_chat: publicFlowState(flow, adapterId, providerFailure)
          },
          live_provider_calls_enabled: flow.readyForLiveCalls,
          fallback_queued: Boolean(providerFailure && flow.fallbackQueueEnabled),
          external_network_calls: flow.readyForLiveCalls
        }
      };
    }
  };
}

function requestScopedAiFlowConfig(body, env, requestContext = {}) {
  if (String(env.CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG ?? "false").toLowerCase() !== "true") return [];
  if (requestContext.trustRequestAiFlowConfig !== true) return [];
  return normalizeAiFlowAdminConfigs(body.aiFlowConfig ?? body.ai_flow_config ?? []);
}

function isAiEnvKey(key) {
  return /^(CUSTOMCARD_AI_|ANTHROPIC_|OPENAI_|CLOUDFLARE_|GOOGLE_|GEMINI_|HUGGINGFACE_|GROQ_|TOGETHER_|MISTRAL_|DEEPSEEK_|FIREWORKS_|PERPLEXITY_|XAI_|REPLICATE_|STABILITY_|FAL_|BFL_)/.test(key);
}

async function executeTextProvider({ flow, env, fetchImpl, systemPrompt, userPrompt, responseFormat }) {
  const adapterId = flow.primaryAdapterId;
  if (adapterId === "deterministic-customer-chat") {
    throw new Error("Deterministic chat is a local fallback, not a live provider.");
  }

  if (adapterId === "cloudflare-workers-ai-chat") {
    const accountId = requiredEnv(env, "CLOUDFLARE_ACCOUNT_ID");
    const token = env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN || requiredEnv(env, "CLOUDFLARE_API_TOKEN");
    const data = await postJson(fetchImpl, `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`, {
      headers: { authorization: `Bearer ${token}` },
      body: {
        model: flow.model,
        messages: buildMessages(systemPrompt, userPrompt),
        max_tokens: flow.maxTokens || 700,
        temperature: flow.temperature,
        ...(responseFormat ? { response_format: responseFormat } : {})
      }
    });
    return extractText(data);
  }

  if (adapterId === "openai-responses-chat") {
    const textFormat = buildOpenAiResponsesTextFormat(responseFormat);
    const data = await postJson(fetchImpl, "https://api.openai.com/v1/responses", {
      headers: { authorization: `Bearer ${requiredEnv(env, "OPENAI_API_KEY")}` },
      body: {
        model: flow.model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_output_tokens: flow.maxTokens || 700,
        temperature: flow.temperature,
        ...(textFormat ? { text: { format: textFormat } } : {})
      }
    });
    return extractText(data);
  }

  if (adapterId === "anthropic-messages-chat") {
    const data = await postJson(fetchImpl, "https://api.anthropic.com/v1/messages", {
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": requiredEnv(env, "ANTHROPIC_API_KEY")
      },
      body: {
        model: flow.model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: flow.maxTokens || 700,
        temperature: flow.temperature
      }
    });
    return extractText(data);
  }

  if (adapterId === "google-gemini-chat") {
    const model = encodeURIComponent(flow.model);
    const data = await postJson(
      fetchImpl,
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        headers: { "x-goog-api-key": requiredEnv(env, "GOOGLE_GENERATIVE_AI_API_KEY") },
        body: {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: flow.maxTokens || 700,
            temperature: flow.temperature,
            ...(responseFormat ? { responseFormat: buildGeminiTextResponseFormat(responseFormat) } : {})
          }
        }
      }
    );
    return extractText(data);
  }

  const compatible = openAiCompatibleAdapter(adapterId, env);
  if (compatible) {
    const data = await postJson(fetchImpl, compatible.url, {
      headers: compatible.headers,
      body: {
        model: flow.model,
        messages: buildMessages(systemPrompt, userPrompt),
        max_tokens: flow.maxTokens || 700,
        temperature: flow.temperature
      }
    });
    return extractText(data);
  }

  throw new Error(`Adapter ${adapterId} is configured but not executable in this runtime yet.`);
}

async function executeImageProvider({ flow, env, fetchImpl, panelId, prompt, negativePrompt }) {
  if (flow.primaryAdapterId === "browser-svg-renderer") {
    return buildDeterministicPanelSvgDataUrl({ panelId, prompt });
  }

  if (flow.primaryAdapterId === "cloudflare-workers-ai-image") {
    const accountId = requiredEnv(env, "CLOUDFLARE_ACCOUNT_ID");
    const token = env.CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN || requiredEnv(env, "CLOUDFLARE_API_TOKEN");
    const requestBody = buildCloudflareImageRequestBody({ flow, panelId, prompt, negativePrompt });
    const response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${flow.model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(requestBody)
      }
    );
    if (!response.ok) throw new Error(`Cloudflare image provider returned ${response.status}.`);
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }
    return extractImageUrl(await response.json(), contentType);
  }

  if (flow.primaryAdapterId === "openai-images") {
    const data = await postJson(fetchImpl, "https://api.openai.com/v1/images/generations", {
      headers: { authorization: `Bearer ${requiredEnv(env, "OPENAI_API_KEY")}` },
      body: {
        model: flow.model,
        prompt,
        size: "1024x1536",
        n: 1
      }
    });
    return extractImageUrl(data, "image/png");
  }

  if (flow.primaryAdapterId === "google-gemini-image") {
    const model = encodeURIComponent(flow.model);
    const data = await postJson(
      fetchImpl,
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
      {
        headers: { "x-goog-api-key": requiredEnv(env, "GOOGLE_GENERATIVE_AI_API_KEY") },
        body: {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["Image"],
            responseFormat: { image: { aspectRatio: "3:4", imageSize: "2K" } }
          }
        }
      }
    );
    return extractImageUrl(data, "image/png");
  }

  throw new Error(`Image adapter ${flow.primaryAdapterId} is configured but not executable in this runtime yet.`);
}

function buildDeterministicPanelSvgDataUrl({ panelId, prompt }) {
  const svg = buildDeterministicPanelSvg({ panelId, prompt });
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function buildDeterministicPanelSvg({ panelId, prompt }) {
  const theme = themeForPrompt(prompt);
  const seed = numericSeed(`${panelId}:${prompt}`);
  const background = resolvePanelThemeValue(theme.background, panelId);
  const accent = resolvePanelThemeValue(theme.accent, panelId);
  const safeArea = svgTextSafeArea(panelId);
  const motifCount = Math.max(0, resolvePanelThemeValue(theme.count, panelId));
  const motifs = Array.from({ length: motifCount }, (_, index) => {
    const scale = seededRange(seed, index + 71, 48, 118) / 100;
    const { x, y } = svgMotifPosition(seed, index, scale, safeArea);
    const rotation = seededRange(seed, index + 103, -24, 24);
    return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${theme.motif(index)}</g>`;
  }).join("\n");
  const texture = theme.texture?.(panelId) ?? "";
  const hero = theme.hero?.(panelId) ?? "";
  const calmOverlay = theme.overlay?.(panelId) ?? defaultPanelOverlay(panelId);
  const border = theme.border?.(panelId) ??
    `<rect x="70" y="70" width="1360" height="1960" rx="28" fill="none" stroke="${accent}" stroke-width="5" opacity="0.34"/>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100" role="img" aria-label="CustomCard generated artwork layer" data-customcard-theme="${theme.kind}">`,
    `<rect width="1500" height="2100" fill="${background}"/>`,
    texture,
    hero,
    motifs,
    calmOverlay,
    border,
    "</svg>"
  ].join("\n");
}

function resolvePanelThemeValue(value, panelId) {
  return typeof value === "function" ? value(panelId) : value;
}

function defaultPanelOverlay(panelId) {
  if (panelId === "front") return '<rect x="0" y="1180" width="1500" height="520" fill="#fffaf0" opacity="0.18"/>';
  if (panelId === "back") return '<rect x="0" y="1450" width="1500" height="380" fill="#fffaf0" opacity="0.12"/>';
  return '<rect x="240" y="430" width="1020" height="1240" rx="34" fill="#fffdf7" opacity="0.16"/>';
}

function svgTextSafeArea(panelId) {
  if (panelId === "front") return { x: 130, y: 1130, width: 1240, height: 620 };
  if (panelId === "back") return { x: 220, y: 1390, width: 1060, height: 520 };
  return { x: 220, y: 400, width: 1060, height: 1320 };
}

function svgMotifPosition(seed, index, scale, safeArea) {
  const zones = [
    { x1: -120, x2: 1620, y1: -120, y2: Math.max(-120, safeArea.y - 230) },
    { x1: -120, x2: 1620, y1: Math.min(2100, safeArea.y + safeArea.height + 230), y2: 2220 },
    { x1: -120, x2: Math.max(-120, safeArea.x - 210), y1: -120, y2: 2220 },
    { x1: Math.min(1620, safeArea.x + safeArea.width + 210), x2: 1620, y1: -120, y2: 2220 }
  ].filter((zone) => zone.x2 >= zone.x1 && zone.y2 >= zone.y1);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const offset = attempt * 149;
    const zone = zones[seededRange(seed, index + offset + 19, 0, zones.length - 1)] ?? zones[0];
    const x = seededRange(seed, index + offset, zone.x1, zone.x2);
    const y = seededRange(seed, index + 37 + offset, zone.y1, zone.y2);
    if (!svgMotifOverlapsSafeArea(x, y, scale, safeArea)) return { x, y };
  }
  const top = seededRange(seed, index + 503, 0, 1) === 0 || safeArea.y > 760;
  return {
    x: seededRange(seed, index + 557, -120, 1500),
    y: top
      ? seededRange(seed, index + 601, -120, Math.max(-120, safeArea.y - 190))
      : seededRange(seed, index + 641, Math.min(2100, safeArea.y + safeArea.height + 190), 2100)
  };
}

function svgMotifOverlapsSafeArea(x, y, scale, safeArea) {
  const radius = 155 * scale;
  return x + radius > safeArea.x &&
    x - radius < safeArea.x + safeArea.width &&
    y + radius > safeArea.y &&
    y - radius < safeArea.y + safeArea.height;
}

function themeForPrompt(prompt) {
  const text = String(prompt).toLowerCase();
  if (/\b(medical|doctor|stethoscope|white[- ]coat|ecg|anatomy|graduation cap)\b/.test(text)) {
    return {
      kind: "medical",
      background: (panelId) => panelId.startsWith("inside") ? "#fffdf7" : "#101d3b",
      accent: "#e8c66c",
      count: (panelId) => panelId === "front" ? 4 : panelId === "back" ? 3 : 0,
      texture: (panelId) => panelId.startsWith("inside") ? medicalPaperTexture() : "",
      hero: (panelId) => medicalHero(panelId),
      overlay: (panelId) => panelId.startsWith("inside")
        ? '<rect x="190" y="300" width="1120" height="1500" rx="26" fill="#fffefa" opacity="0.82"/>'
        : defaultPanelOverlay(panelId),
      border: (panelId) => medicalBorder(panelId),
      motif: (index) => medicalMotif(index)
    };
  }
  if (/\b(father|dad|fix(?:-it)?|repair|handy(?:man)?|wrench|tools?|toolbox|workshop|blueprints?|glue|hammer|measure|measuring)\b/.test(text)) {
    return {
      kind: "tools",
      background: "#0f6b5f",
      accent: "#f5c542",
      count: (panelId) => panelId.startsWith("inside") ? 8 : 14,
      texture: () => blueprintTexture(),
      hero: (panelId) => toolHero(panelId),
      motif: (index) => toolMotif(index)
    };
  }
  if (/\b(birthday|botanical|flower|fern|rose)\b/.test(text)) {
    return {
      kind: "botanical",
      background: "#fff7ed",
      accent: "#2f6f52",
      count: (panelId) => panelId.startsWith("inside") ? 10 : 18,
      hero: (panelId) => botanicalHero(panelId),
      motif: (index) => botanicalMotif(index)
    };
  }
  if (/\b(citrus|small-business|shop|thank)\b/.test(text)) {
    return {
      kind: "citrus",
      background: "#0f3d3f",
      accent: "#f6b53f",
      count: (panelId) => panelId.startsWith("inside") ? 10 : 18,
      hero: (panelId) => citrusHero(panelId),
      motif: (index) => citrusMotif(index)
    };
  }
  return {
    kind: "stationery",
    background: "#f8f1e7",
    accent: "#3d6f67",
    count: (panelId) => panelId.startsWith("inside") ? 8 : 16,
    hero: (panelId) => botanicalHero(panelId),
    motif: (index) => botanicalMotif(index)
  };
}

function medicalPaperTexture() {
  return `
    <g data-customcard-texture="medical-paper" opacity="0.16">
      <path d="M260 560 C360 520 410 620 520 574 C640 524 710 592 830 548 C950 506 1040 560 1240 506" fill="none" stroke="#d7c38b" stroke-width="3"/>
      <path d="M300 1470 C430 1420 540 1508 660 1458 C780 1408 880 1486 1010 1432 C1110 1392 1190 1428 1260 1390" fill="none" stroke="#d7c38b" stroke-width="3"/>
      <circle cx="318" cy="360" r="4" fill="#caa75b"/>
      <circle cx="1182" cy="1740" r="4" fill="#caa75b"/>
    </g>
  `;
}

function medicalHero(panelId) {
  if (panelId.startsWith("inside")) {
    return `
      <g data-customcard-hero="medical-interior">
        <path d="M170 1682 L360 1682 L390 1608 L435 1742 L485 1526 L535 1682 L1030 1682 L1070 1628 L1122 1728 L1182 1588 L1222 1682 L1332 1682" fill="none" stroke="#c49b42" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
        <path d="M1114 1556 C1080 1608 1086 1664 1130 1690 C1178 1718 1242 1688 1258 1634" fill="none" stroke="#253454" stroke-width="12" stroke-linecap="round" opacity="0.75"/>
        <circle cx="1102" cy="1550" r="22" fill="none" stroke="#c49b42" stroke-width="9" opacity="0.82"/>
        <circle cx="1270" cy="1628" r="34" fill="none" stroke="#c49b42" stroke-width="9" opacity="0.82"/>
      </g>
    `;
  }
  if (panelId === "back") {
    return `
      <g data-customcard-hero="medical-back" opacity="0.78">
        <path d="M210 1040 H560 L600 968 L644 1118 L692 900 L746 1040 H1290" fill="none" stroke="#e8c66c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M702 860 C632 768 506 788 506 906 C506 1014 646 1074 750 1158 C854 1074 994 1014 994 906 C994 788 868 768 798 860 C774 890 726 890 702 860Z" fill="none" stroke="#fff4d3" stroke-width="10" opacity="0.74"/>
      </g>
    `;
  }
  return `
    <g data-customcard-hero="medical-front">
      <path d="M0 760 H520 L552 704 L592 842 L638 612 L688 760 H1500" fill="none" stroke="#e8c66c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
      <path d="M620 380 L552 548 L582 1036 L918 1036 L948 548 L880 380 C820 432 680 432 620 380Z" fill="#f7f2df" opacity="0.84"/>
      <path d="M646 408 L736 642 L750 1030 M854 408 L764 642 L750 1030" fill="none" stroke="#c9d1d4" stroke-width="12" opacity="0.72"/>
      <path d="M520 336 L980 336 L858 248 L642 248Z" fill="#1d4267" stroke="#e8c66c" stroke-width="8" opacity="0.96"/>
      <path d="M750 336 V546" stroke="#e8c66c" stroke-width="7" stroke-linecap="round"/>
      <circle cx="750" cy="574" r="20" fill="#e8c66c"/>
      <path d="M640 710 C594 790 610 894 710 924 C814 954 924 884 894 772" fill="none" stroke="#24324c" stroke-width="20" stroke-linecap="round" opacity="0.84"/>
      <circle cx="630" cy="704" r="24" fill="none" stroke="#e8c66c" stroke-width="10"/>
      <circle cx="900" cy="768" r="34" fill="none" stroke="#e8c66c" stroke-width="10"/>
    </g>
  `;
}

function medicalBorder(panelId) {
  const stroke = panelId.startsWith("inside") ? "#c49b42" : "#e8c66c";
  const opacity = panelId.startsWith("inside") ? 0.62 : 0.44;
  return `
    <rect x="70" y="70" width="1360" height="1960" rx="18" fill="none" stroke="${stroke}" stroke-width="5" opacity="${opacity}"/>
    <rect x="102" y="102" width="1296" height="1896" rx="10" fill="none" stroke="${stroke}" stroke-width="2" opacity="${opacity * 0.72}"/>
  `;
}

function blueprintTexture() {
  const verticals = Array.from({ length: 6 }, (_, index) => 180 + index * 230)
    .map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="2100" stroke="#d9fff5" stroke-width="2" opacity="0.11"/>`)
    .join("");
  const horizontals = Array.from({ length: 8 }, (_, index) => 160 + index * 245)
    .map((y) => `<line x1="0" y1="${y}" x2="1500" y2="${y}" stroke="#d9fff5" stroke-width="2" opacity="0.11"/>`)
    .join("");
  return `<g data-customcard-texture="blueprint">${verticals}${horizontals}</g>`;
}

function toolHero(panelId) {
  const y = panelId.startsWith("inside") ? 1660 : panelId === "front" ? 875 : 1560;
  const opacity = panelId.startsWith("inside") ? 0.42 : 0.56;
  return `
    <g data-customcard-hero="tools" opacity="${opacity}">
      <path d="M1040 ${y + 70} L1290 ${y - 180}" stroke="#f8e6a1" stroke-width="30" stroke-linecap="round"/>
      <circle cx="1308" cy="${y - 198}" r="48" fill="none" stroke="#f5c542" stroke-width="20"/>
      <rect x="936" y="${y - 34}" width="330" height="36" rx="18" fill="#f5c542" transform="rotate(-9 1100 ${y - 16})"/>
      <path d="M930 ${y + 150} C1030 ${y + 102} 1140 ${y + 102} 1258 ${y + 152}" fill="none" stroke="#d9fff5" stroke-width="8" stroke-linecap="round"/>
    </g>
  `;
}

function botanicalHero(panelId) {
  const leftOpacity = panelId.startsWith("inside") ? 0.44 : 0.6;
  return `
    <g data-customcard-hero="botanical" opacity="${leftOpacity}">
      <path d="M178 1720 C248 1390 236 1080 166 720" fill="none" stroke="#2f6f52" stroke-width="12" stroke-linecap="round"/>
      <ellipse cx="224" cy="1390" rx="42" ry="112" fill="#6d8b57" transform="rotate(34 224 1390)"/>
      <ellipse cx="154" cy="1220" rx="36" ry="98" fill="#8ea36a" transform="rotate(-32 154 1220)"/>
      <ellipse cx="238" cy="1010" rx="40" ry="106" fill="#6d8b57" transform="rotate(30 238 1010)"/>
      <ellipse cx="150" cy="835" rx="34" ry="92" fill="#8ea36a" transform="rotate(-30 150 835)"/>
      <circle cx="206" cy="1548" r="56" fill="#f4b7a1" opacity="0.72"/>
      <circle cx="170" cy="1518" r="34" fill="#fff7ed" opacity="0.84"/>
    </g>
  `;
}

function citrusHero(panelId) {
  const y = panelId.startsWith("inside") ? 1640 : panelId === "front" ? 420 : 1530;
  return `
    <g data-customcard-hero="citrus" opacity="0.72">
      <path d="M1010 ${y + 180} C1120 ${y + 40} 1246 ${y - 16} 1402 ${y - 72}" fill="none" stroke="#f6b53f" stroke-width="14" stroke-linecap="round"/>
      <circle cx="1156" cy="${y + 34}" r="92" fill="#f6b53f" stroke="#fff8dc" stroke-width="10"/>
      <path d="M1156 ${y - 48} V${y + 116} M1074 ${y + 34} H1238 M1098 ${y - 24} L1214 ${y + 92} M1214 ${y - 24} L1098 ${y + 92}" stroke="#fff8dc" stroke-width="7" opacity="0.86"/>
      <ellipse cx="1280" cy="${y - 76}" rx="34" ry="98" fill="#d6d7a3" transform="rotate(46 1280 ${y - 76})"/>
      <ellipse cx="1052" cy="${y + 150}" rx="30" ry="84" fill="#1f7a68" transform="rotate(-42 1052 ${y + 150})"/>
    </g>
  `;
}

function citrusMotif(index) {
  const fill = index % 3 === 0 ? "#f6b53f" : index % 3 === 1 ? "#fce7a3" : "#f7f2df";
  const leaf = index % 2 === 0 ? "#1f7a68" : "#d6d7a3";
  return `
    <g opacity="0.92">
      <circle cx="0" cy="0" r="58" fill="${fill}" stroke="#fff8dc" stroke-width="8"/>
      ${Array.from({ length: 10 }, (_, ray) => `<line x1="0" y1="0" x2="${Math.cos((ray * Math.PI) / 5) * 52}" y2="${Math.sin((ray * Math.PI) / 5) * 52}" stroke="#fff8dc" stroke-width="5"/>`).join("")}
      <ellipse cx="96" cy="-50" rx="24" ry="62" fill="${leaf}" transform="rotate(35 96 -50)"/>
      <ellipse cx="-92" cy="54" rx="22" ry="58" fill="${leaf}" transform="rotate(-42 -92 54)"/>
    </g>
  `;
}

function botanicalMotif(index) {
  const flower = index % 2 === 0 ? "#f4b7a1" : "#f3ce72";
  const leaf = index % 3 === 0 ? "#2f6f52" : "#184d3d";
  return `
    <g opacity="0.9">
      <path d="M0 0 C42 -80 96 -80 120 0 C92 72 36 78 0 0Z" fill="${flower}" opacity="0.85"/>
      <path d="M0 0 C-42 -76 -94 -72 -118 4 C-86 70 -34 76 0 0Z" fill="${flower}" opacity="0.72"/>
      <circle cx="0" cy="0" r="20" fill="#f9e6a1"/>
      <ellipse cx="80" cy="92" rx="22" ry="70" fill="${leaf}" transform="rotate(32 80 92)"/>
      <ellipse cx="-82" cy="-94" rx="20" ry="64" fill="${leaf}" transform="rotate(28 -82 -94)"/>
    </g>
  `;
}

function toolMotif(index) {
  const yellow = index % 2 === 0 ? "#f5c542" : "#f8e6a1";
  return `
    <g opacity="0.9">
      <rect x="-95" y="-14" width="190" height="28" rx="14" fill="${yellow}"/>
      <circle cx="-112" cy="0" r="26" fill="none" stroke="#f7f2df" stroke-width="12"/>
      <rect x="-18" y="-92" width="36" height="184" rx="18" fill="#f7f2df"/>
      <circle cx="0" cy="-112" r="34" fill="none" stroke="#f5c542" stroke-width="12"/>
      <line x1="-125" y1="76" x2="125" y2="76" stroke="#d9fff5" stroke-width="7" opacity="0.65"/>
    </g>
  `;
}

function medicalMotif(index) {
  const gold = index % 2 === 0 ? "#e8c66c" : "#fff4d3";
  return `
    <g opacity="0.86">
      <path d="M-120 0 C-60 -80 60 -80 120 0 C60 86 -60 86 -120 0Z" fill="none" stroke="${gold}" stroke-width="10"/>
      <path d="M-115 92 L-70 92 L-52 40 L-18 144 L18 -18 L46 92 L112 92" fill="none" stroke="#f7f2df" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="-42" y="-130" width="84" height="54" rx="8" fill="#f7f2df" opacity="0.84"/>
      <path d="M-78 -76 L78 -76 L42 -44 L-42 -44Z" fill="${gold}" opacity="0.78"/>
    </g>
  `;
}

function numericSeed(value) {
  let seed = 2166136261;
  for (const char of String(value)) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function seededRange(seed, index, min, max) {
  const value = Math.sin(seed + index * 99991) * 10000;
  const fraction = value - Math.floor(value);
  return Math.round(min + fraction * (max - min));
}

function buildCloudflareImageRequestBody({ flow, panelId, prompt, negativePrompt }) {
  if (isCloudflareFluxModel(flow.model)) {
    return {
      prompt: truncate(prompt, 2048),
      steps: 8
    };
  }
  return {
    prompt,
    negative_prompt: negativePrompt,
    width: 1464,
    height: 2048,
    guidance: 3.5,
    num_steps: 8,
    metadata: {
      customcard: {
        prompt_contract: "folded-card-four-panel-v1",
        generation_strategy: "one-provider-request-per-panel",
        panel_id: panelId,
        target_width: 1500,
        target_height: 2100,
        target_dpi: 300
      }
    }
  };
}

function isCloudflareFluxModel(model) {
  return String(model || "").includes("/flux-1-schnell");
}

function openAiCompatibleAdapter(adapterId, env) {
  const adapters = {
    "huggingface-chat": {
      url: "https://router.huggingface.co/v1/chat/completions",
      token: "HUGGINGFACE_API_TOKEN"
    },
    "mistral-chat": {
      url: "https://api.mistral.ai/v1/chat/completions",
      token: "MISTRAL_API_KEY"
    },
    "groq-chat": {
      url: "https://api.groq.com/openai/v1/chat/completions",
      token: "GROQ_API_KEY"
    },
    "together-chat": {
      url: "https://api.together.xyz/v1/chat/completions",
      token: "TOGETHER_API_KEY"
    },
    "deepseek-chat": {
      url: "https://api.deepseek.com/chat/completions",
      token: "DEEPSEEK_API_KEY"
    },
    "fireworks-chat": {
      url: "https://api.fireworks.ai/inference/v1/chat/completions",
      token: "FIREWORKS_API_KEY"
    },
    "perplexity-sonar-chat": {
      url: "https://api.perplexity.ai/chat/completions",
      token: "PERPLEXITY_API_KEY"
    },
    "xai-chat": {
      url: "https://api.x.ai/v1/chat/completions",
      token: "XAI_API_KEY"
    }
  };
  if (adapterId === "self-hosted-openai-compatible-chat") {
    return {
      url: `${String(requiredEnv(env, "SELF_HOSTED_LLM_BASE_URL")).replace(/\/$/, "")}/v1/chat/completions`,
      headers: { authorization: `Bearer ${requiredEnv(env, "SELF_HOSTED_LLM_API_KEY")}` }
    };
  }
  const config = adapters[adapterId];
  if (!config) return undefined;
  return {
    url: config.url,
    headers: { authorization: `Bearer ${requiredEnv(env, config.token)}` }
  };
}

async function postJson(fetchImpl, url, { headers = {}, body }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
  const data = await response.json();
  if (data?.success === false) {
    throw new Error(data?.errors?.[0]?.message || "AI provider rejected the request.");
  }
  return data;
}

function buildMessages(systemPrompt, userPrompt) {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];
}

function buildCardCopyPrompt(input) {
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
          image_prompt: "string",
          image_negative_prompt: "string"
        })),
        memory_citations: ["string"]
      },
      section_order: [
        "Choose one cohesive theme_guide from the occasion, personal_note, style, and approved memory_notes before writing panels.",
        "Write the panel copy so the card has an emotional arc from cover to interior to back.",
        "Write art_direction as layout notes for app-rendered typography and print-safe artwork.",
        "Write each image_prompt as a separate one-panel visual request for the image provider."
      ],
      copy_requirements: [
        "Exactly four panels.",
        "Use each panel id exactly once in this order: front, inside-left, inside-right, back.",
        "Use only provided memory_notes.",
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
      layout_requirements: [
        "theme_guide is binding, but reuse motifs with restraint: a panel should have one dominant composition idea, not a scattered wallpaper of every motif.",
        "art_direction must name the panel's composition archetype, layout purpose, typography area, safe-margin plan, palette, border or ornament strategy, and relationship to its matching panel.",
        "front and back should visually match each other; the front carries the strongest hero idea and the back repeats a small quiet echo.",
        "inside-left and inside-right should visually match each other and feel like the opened interior spread.",
        "inside-left and inside-right must be border-first stationery designs with a calm blank/low-contrast center reserved for app-rendered text.",
        "Interior art must keep motifs on edges, corners, borders, or low-density background texture; do not fill the message area with busy all-over decoration.",
        "Prefer one of these composition archetypes per panel: cinematic single-object cover, sparse line-art cover, ornate border-first note sheet, lower-corner object cluster, or mostly blank back mark.",
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
        "image_prompt must stay visual: concrete motifs, palette, border/frame treatment, background texture, ornament density, composition archetype, and hierarchy only.",
        "For the front, explicitly choose one dominant hero composition or sparse line-art composition with a clean lower or central text-safe area.",
        "For inside-left and inside-right, explicitly include: border-first stationery layout, thin refined frame, quiet center, clean text-safe area, generous margins, low-contrast interior, and sparse edge/corner or lower-edge motifs.",
        "For the back, explicitly include mostly negative space and one small coordinating lower mark or border echo.",
        "Use symbolic objects, patterns, backgrounds, flat 2D illustration, and print design details.",
        "Coordinate palette, border style, motifs, and spacing across all four image_prompt values.",
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

function buildCardCopyResponseFormat(flow) {
  if (!["cloudflare-workers-ai-chat", "openai-responses-chat", "google-gemini-chat"].includes(flow.primaryAdapterId)) {
    return undefined;
  }
  return {
    type: "json_schema",
    json_schema: cardCopyJsonSchema
  };
}

function buildOpenAiResponsesTextFormat(responseFormat) {
  if (responseFormat?.type !== "json_schema" || !responseFormat.json_schema) return undefined;
  return {
    type: "json_schema",
    name: "customcard_card_copy",
    schema: responseFormat.json_schema,
    strict: true
  };
}

function buildGeminiTextResponseFormat(responseFormat) {
  return {
    text: {
      mimeType: "application/json",
      schema: responseFormat.json_schema
    }
  };
}

function buildChatPrompt(input) {
  return JSON.stringify(
    {
      task: "Reply to the customer about card drafting, memories, artwork, or fulfillment.",
      constraints: [
        "One short helpful paragraph.",
        "Use only approved memories.",
        "Do not claim provider orders, payments, or shipments happened.",
        "Do not store or repeat sensitive data."
      ],
      input
    },
    null,
    2
  );
}

function buildImagePromptPlan(input, cardCopy) {
  const panelsById = new Map((cardCopy.panels ?? []).map((panel) => [panel.id, panel]));
  return requiredPanelIds.map((panelId) => {
    const panel = panelsById.get(panelId) ?? panelDefaults[panelId];
    return {
      panel_id: panelId,
      prompt: normalizeImagePrompt(panel.image_prompt || buildPanelImagePrompt(input, panelId, panel), panelId, input, panel),
      negative_prompt: normalizeImageNegativePrompt(panel.image_negative_prompt)
    };
  });
}

function buildPanelImagePrompt(input, panelId, panel) {
  const panelInstruction = {
    front:
      "Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep a clean text-safe area, and avoid all-over motif wallpaper.",
    "inside-left":
      "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet blank low-contrast center, clean text-safe area, generous safe margins.",
    "inside-right":
      "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet blank low-contrast center, clean text-safe area, generous safe margins.",
    back:
      "Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo."
  }[panelId];
  const visualBrief = buildVisualBrief(input, panel);

  return [
    panelInstruction,
    visualBrief,
    "Artwork layer only, not a physical card or photographed paper. No inner card rectangle, no mockup frame, no table, no envelope, no label, no sign, no blank tag, no text box, no shadowed paper sheet. Decorative print borders are allowed. Premium print-ready flat artwork, full-bleed 2D composition, minimal clutter, disciplined negative space, no all-over repeating wallpaper pattern, generous safe margins, no readable text, no words, no letters, no numbers, no handwriting, no calligraphy, no faux script, no fake text, no logos, no watermark."
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
  if (!/\b5x7\b/i.test(base)) guardrails.push("5x7 vertical print panel.");
  if (!/\bflat\b/i.test(base) || !/\b2d\b/i.test(base)) guardrails.push("Flat 2D full-bleed digital illustration.");
  if (!/\bno readable text\b/i.test(base)) guardrails.push("No readable text.");
  if (!/\bno (?:words|letters)\b/i.test(base)) guardrails.push("No words, letters, handwriting, calligraphy, labels, signatures, or fake text.");
  if (!/\bno people\b/i.test(base)) guardrails.push("No people.");
  if (!/\bno hands\b/i.test(base)) guardrails.push("No hands.");
  if (!/\bno logos?\b/i.test(base)) guardrails.push("No logos.");
  if (!/\bno watermark\b/i.test(base)) guardrails.push("No watermark.");
  if (!/\b(?:no all-over|avoid all-over|not an all-over|mostly negative space|sparse|restrained)\b/i.test(base)) {
    guardrails.push("Avoid all-over repeating wallpaper patterns; use restrained hierarchy and negative space.");
  }
  if (!/\bnot (?:a )?(?:physical|photographed|mockup|photo)\b/i.test(base)) {
    guardrails.push("Not a photo, not a physical paper card, not a folded card mockup, not a tabletop scene, not a product photograph.");
  }
  return truncate([base, ...guardrails].join(" "), 1200);
}

function imagePromptNeedsRepair(prompt, panelId, input, panel) {
  return imagePromptHasUnsafeSubject(prompt) ||
    imagePromptLeaksAppCopy(prompt) ||
    imagePromptConflictsWithPanelRole(prompt, panelId) ||
    imagePromptIsUnderspecified(prompt, panelId, input, panel);
}

function imagePromptHasUnsafeSubject(prompt) {
  return /\b(person|people|human|owner|customer|customers|face|portrait|body|hands?|holding|model|signature|handwriting|lettering|readable text|['"]?thank you['"]?\s+sign|signage|sign|worn|creased)\b/i.test(prompt) ||
    /(?:shop|store|brand|company|business)['’]?\s+logo|\blogo\s+(?:in|at|on|near|as)\b/i.test(prompt);
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
        "letters",
        "words",
        "numbers",
        "typography",
        "handwriting",
        "calligraphy",
        "cursive script",
        "faux script",
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
        "paper sheet",
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
        "portrait"
      ]
        .map((item) => cleanText(item).toLowerCase())
        .filter(Boolean)
    )
  ).join(", ");
}

function buildVisualBrief(input, panel) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")} ${panel.art_direction}`.toLowerCase();
  if (/\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source)) {
    return "Elegant medical-school graduation artwork: deep navy and soft gold, one white coat plus graduation cap and stethoscope hero composition or sparse ECG line; interiors use ivory note-sheet field, thin gold border, lower ECG, one stethoscope corner; never dense repeated medical icons.";
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
  if (/\b(birthday|cake|candles|party)\b/.test(source)) {
    return "Warm birthday stationery: botanical greenery and soft flowers as elegant side or corner border, small candle accents, morning-light palette, generous blank field, no dense confetti wallpaper.";
  }
  if (/\b(thank|grateful|appreciat)\b/.test(source)) {
    return "Elegant thank-you stationery: ribbon curves, botanical sprigs, soft paper texture, warm accents, border-first layout, quiet premium composition, large clean message field.";
  }
  return `Original ${truncate(input.occasion || "celebration", 80)} theme in a ${truncate(input.style || "refined", 120)} style with specific symbolic motifs, coordinated palette, and emotional tone: ${truncate(input.tone || "warm", 120)}.`;
}

function parseJsonFromText(text) {
  const trimmed = String(text ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("AI text provider did not return parseable JSON.");
  }
}

function normalizeCardInput(body) {
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
        : []
  };
}

function normalizeChatInput(body) {
  return {
    customer_message: cleanText(body.customer_message || body.customerMessage || ""),
    recipient_name: cleanText(body.recipient_name || body.recipientName || "the recipient"),
    approved_memory_notes: Array.isArray(body.approved_memory_notes)
      ? body.approved_memory_notes.map(cleanText).filter(Boolean).slice(0, 6)
      : Array.isArray(body.approvedMemoryNotes)
        ? body.approvedMemoryNotes.map(cleanText).filter(Boolean).slice(0, 6)
        : [],
    locale: cleanText(body.locale || "en-US"),
    fulfillment_context: cleanText(body.fulfillment_context || body.fulfillmentContext || "")
  };
}

function normalizeThemeGuide(rawThemeGuide, input) {
  const fallback = buildThemeGuide(input);
  const raw = rawThemeGuide && typeof rawThemeGuide === "object" ? rawThemeGuide : {};
  const palette = Array.isArray(raw.palette) ? raw.palette.map(cleanText).filter(Boolean).slice(0, 6) : [];
  const motifs = Array.isArray(raw.motifs) ? raw.motifs.map(cleanText).filter(Boolean).filter(isSafeThemeMotif).slice(0, 8) : [];
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
  return !/\b(?:face|smile|smiling|person|people|hands?|signature|handwriting|lettering|text|logo|watermark)\b/i.test(value);
}

function buildThemeGuide(input) {
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  if (/\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source)) {
    return themeGuide({
      title: "From Dream to Doctor",
      palette: ["deep navy", "white coat ivory", "soft gold"],
      motifs: ["stethoscope line", "graduation cap", "ECG curve", "anatomy sketch texture"],
      border: "thin gold-and-navy medical stationery border with sparse corner linework"
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
  if (/\b(birthday|botanical|fern|flower|trail|hike)\b/.test(source)) {
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
    front_back_pairing: "Front carries the strongest motif and title area; back repeats the same border language with mostly negative space.",
    interior_pairing: "Inside-left and inside-right use the same decorative border/frame, sparse edge motifs, quiet blank center, and generous text-safe margins."
  };
}

function normalizeCardCopy(parsed, input) {
  const rawThemeGuide = parsed?.theme_guide || parsed?.themeGuide || parsed?.card_copy?.theme_guide || parsed?.cardCopy?.themeGuide;
  const rawPanels = Array.isArray(parsed?.panels)
    ? parsed.panels
    : Array.isArray(parsed?.card_copy?.panels)
      ? parsed.card_copy.panels
      : [];
  const themeGuide = normalizeThemeGuide(rawThemeGuide, input);
  const panels = requiredPanelIds.map((id) => {
    const raw = rawPanels.find((panel) => panel?.id === id) ?? {};
    const defaults = panelDefaults[id];
    const headline = truncate(cleanText(raw.headline || defaults.headline), 120);
    const body = truncate(cleanText(raw.body || defaults.body), 600);
    const artDirection = truncate(cleanText(raw.art_direction || raw.artDirection || defaults.art_direction), 500);
    const rawImagePrompt = truncate(cleanText(raw.image_prompt || raw.imagePrompt || defaults.image_prompt), 1200);
    return {
      id,
      headline,
      body,
      art_direction: artDirection,
      image_prompt: truncate(
        normalizeImagePrompt(rawImagePrompt, id, input, { ...defaults, headline, body, art_direction: artDirection, image_prompt: rawImagePrompt }),
        1200
      ),
      image_negative_prompt: truncate(
        normalizeImageNegativePrompt(raw.image_negative_prompt || raw.imageNegativePrompt || defaults.image_negative_prompt),
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

function buildFallbackCardCopy(input) {
  const themeGuide = buildThemeGuide(input);
  const copyPlan = buildCopyRepairPlan(input, themeGuide);
  return {
    theme_guide: themeGuide,
    panels: [
      {
        id: "front",
        headline: copyPlan.front.headline,
        body: copyPlan.front.body,
        art_direction: `${themeGuide.theme_title} front cover with ${themeGuide.border_style}, clear title area, generous safe margins, ${themeGuide.palette.join(", ")} palette, and motifs that echo on the back panel.`,
        image_prompt: buildPanelImagePrompt(input, "front", {
          ...panelDefaults.front,
          art_direction: `${themeGuide.theme_title} front cover with ${themeGuide.border_style}, clear title area, generous safe margins, ${themeGuide.palette.join(", ")} palette, and motifs that echo on the back panel.`
        }),
        image_negative_prompt: normalizeImageNegativePrompt(panelDefaults.front.image_negative_prompt)
      },
      {
        id: "inside-left",
        headline: copyPlan["inside-left"].headline,
        body: copyPlan["inside-left"].body,
        art_direction: `${themeGuide.theme_title} inside-left panel with ${themeGuide.border_style}, quiet blank low-contrast center for opening copy, sparse edge/corner motifs, generous margins, and ornaments that match the inside-right panel.`,
        image_prompt: buildPanelImagePrompt(input, "inside-left", {
          ...panelDefaults["inside-left"],
          art_direction: `${themeGuide.theme_title} inside-left panel with ${themeGuide.border_style}, quiet blank low-contrast center for opening copy, sparse edge/corner motifs, generous margins, and ornaments that match the inside-right panel.`
        }),
        image_negative_prompt: normalizeImageNegativePrompt(panelDefaults["inside-left"].image_negative_prompt)
      },
      {
        id: "inside-right",
        headline: copyPlan["inside-right"].headline,
        body: copyPlan["inside-right"].body,
        art_direction: `${themeGuide.theme_title} inside-right message panel with matching ${themeGuide.border_style}, quiet blank low-contrast center for the main message, sparse edge/corner motifs, generous margins, and natural sign-off zone.`,
        image_prompt: buildPanelImagePrompt(input, "inside-right", {
          ...panelDefaults["inside-right"],
          art_direction: `${themeGuide.theme_title} inside-right message panel with matching ${themeGuide.border_style}, quiet blank low-contrast center for the main message, sparse edge/corner motifs, generous margins, and natural sign-off zone.`
        }),
        image_negative_prompt: normalizeImageNegativePrompt(panelDefaults["inside-right"].image_negative_prompt)
      },
      {
        id: "back",
        headline: copyPlan.back.headline,
        body: copyPlan.back.body,
        art_direction: `${themeGuide.theme_title} back panel with mostly negative space, subtle lower ornamentation, ${themeGuide.border_style}, and border details that visually pair with the front cover.`,
        image_prompt: buildPanelImagePrompt(input, "back", {
          ...panelDefaults.back,
          art_direction: `${themeGuide.theme_title} back panel with mostly negative space, subtle lower ornamentation, ${themeGuide.border_style}, and border details that visually pair with the front cover.`
        }),
        image_negative_prompt: normalizeImageNegativePrompt(panelDefaults.back.image_negative_prompt)
      }
    ],
    memory_citations: input.memory_notes.slice(0, 2)
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
  const isMedical = /\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source);
  const isSmallBusiness = /\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source);
  const isDad = /\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source);
  if (!value) return true;
  if (panelId === "inside-left" && /^for this moment$/i.test(value)) return true;
  if (panelId === "back" && /^customcard$/i.test(value)) return true;
  if (panelId === "front" && new RegExp(`^for ${escapeRegExp(input.recipient)}$`, "i").test(value)) return true;
  if (isSmallBusiness && panelId === "front" && /^for you$/i.test(value)) return true;
  if (isMedical && /^(?:thinking of you|from the heart)$/i.test(value)) return true;
  if (isMedical && /^(?:congratulations, doctor!?|congrats, doctor!?)$/i.test(value)) return true;
  if (isMedical && panelId === "back" && /^(?:wishing you a bright future|wishing you a wonderful day|congratulations, doctor!?|congrats, doctor!?)$/i.test(value)) return true;
  if (isSmallBusiness && /^(?:you matter|thank you for choosing us|a big thank you|a heartfelt thank you|a sincere thank you|until next time|our small business)$/i.test(value)) return true;
  if ((isSmallBusiness || isDad) && /^(?:thinking of you|from the heart)$/i.test(value)) return true;
  if (isDad && /^(?:with love and appreciation|a love that's always fixing|thanks for being the best dad|wishing you a wonderful day)$/i.test(value)) return true;
  if (isDad && panelId !== "front" && /^thanks for fixing everything$/i.test(value)) return true;
  return /\b(?:card front|panel|headline|title area)\b/i.test(value);
}

function panelBodyNeedsRepair(body, panelId, input) {
  const value = cleanText(body);
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const isMedical = /\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source);
  const isSmallBusiness = /\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source);
  const isDad = /\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source);
  if (!value) return true;
  const metaCopy = /\b(?:with a .* feeling|i wanted this card to feel|design language|the heart of it is simple|it should carry this approved detail|make this feel|design a theme called|customcard needs|approved detail|a card made with care|made for .* with customcard|made with customcard|not salesy feeling|not cheesy feeling)\b/i;
  if (metaCopy.test(value)) return true;
  const genericMilestoneCopy = /\b(?:congratulations on achieving your dream|congratulations on this amazing achievement|congratulations on your medical school graduation|you are now a doctor|as you begin this new chapter|may your dreams continue to flourish|compassion and kindness|filled with compassion|lifetime of healing and service)\b/i;
  if (isMedical && genericMilestoneCopy.test(value)) return true;
  if (isMedical && panelId.startsWith("inside") && /\b(?:he|his|him)\b/i.test(value) && !/\byou\b/i.test(value)) return true;
  if (isMedical && panelId === "inside-right" && !/\b(?:discipline|patience|heart|dedication|late nights?|long shifts?|sacrifices?)\b/i.test(value)) return true;
  const genericSmallBusinessCopy = /\b(?:thank you for supporting our small business|customers like you|loyalty means the world|opportunity to serve you|loyalty and trust mean everything|thank you again for your loyalty and support|continued success and happiness|all your endeavors)\b/i;
  if (isSmallBusiness && genericSmallBusinessCopy.test(value)) return true;
  const genericDadCopy = /\b(?:love is in the details|thanks for being a rock|steady presence is a powerful thing|tools for the job, love for the family)\b/i;
  const broadDadCopy = /\b(?:best dad|amazing dad|glue that holds our family together|shows love by fixing the small things|our family feel safe and secure)\b/i;
  if (isDad && genericDadCopy.test(value)) return true;
  if (isDad && broadDadCopy.test(value)) return true;
  if (panelId === "front" && value.length < 35) return true;
  if (panelId === "inside-left" && value.length < 90) return true;
  if (panelId === "inside-right" && value.length < 130) return true;
  if (panelId === "back" && value.length < 35) return true;
  return false;
}

function buildCopyRepairPlan(input, themeGuide) {
  const source = `${input.occasion} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const sender = truncate(input.sender || "Your friend", 80);
  const recipient = truncate(input.recipient || "you", 80);
  if (/\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source)) {
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
        body: `Wishing you a year of more hikes, more laughter, and more quiet moments that feel like yours. I am grateful for the warmth you bring into the lives around you. With love, ${sender}.`
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

function buildLocalChatReply(input) {
  const message = input.customer_message.toLowerCase();
  if (/\b(price|pickup|ship|order|walgreens|cvs|fedex|walmart)\b/.test(message)) {
    return `I can compare ${input.fulfillment_context || "the available print options"}, but checkout still needs your final review before anything is ordered.`;
  }
  if (/\b(memory|private|personal|approved)\b/.test(message)) {
    return `I will use only ${input.approved_memory_notes.length} approved memory note${input.approved_memory_notes.length === 1 ? "" : "s"} for ${input.recipient_name}.`;
  }
  if (/\b(image|art|picture|style|generate|ai)\b/.test(message)) {
    return "Artwork can follow the configured image flow, with deterministic SVG fallback and human proofing before print.";
  }
  return `I can help shape this into a card for ${input.recipient_name}, keeping memories approved and checkout human-reviewed.`;
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
    live_provider_calls_enabled: flow.readyForLiveCalls,
    ready_for_live_calls: flow.readyForLiveCalls,
    blocked_reasons: flow.blockedReasons,
    provider_failure: providerFailure || undefined
  };
}

function checkRateLimit(rateBuckets, rateKey = "unknown", flow) {
  const limit = Math.max(1, Number(flow.rateLimitPerMinute) || 1);
  const key = `${flow.flowId}:${rateKey}`;
  const now = Date.now();
  const fresh = (rateBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000);
  fresh.push(now);
  if (rateBuckets.size > 10_000) rateBuckets.clear();
  rateBuckets.set(key, fresh);
  if (fresh.length <= limit) return undefined;
  return {
    statusCode: 429,
    payload: {
      status: "rate-limited",
      ai_flow: { [flow.flowId.replace(/-/g, "_")]: publicFlowState(flow, flow.fallbackAdapterId, "rate-limited") },
      retry_after_seconds: 60
    }
  };
}

function extractText(data) {
  const parsedMessage = data?.choices?.[0]?.message?.parsed;
  if (parsedMessage && typeof parsedMessage === "object") return JSON.stringify(parsedMessage);
  const responseOutputText = Array.isArray(data?.output)
    ? data.output
        .flatMap((item) => item?.content ?? [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join("\n")
    : "";
  const text =
    data?.choices?.[0]?.message?.content ??
    stringifyStructuredText(data?.result?.response) ??
    stringifyStructuredText(data?.response) ??
    data?.output_text ??
    data?.content?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") ??
    responseOutputText;
  if (!text) throw new Error("AI provider response did not contain text.");
  return String(text);
}

function stringifyStructuredText(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function extractImageUrl(data, contentType) {
  const inlineImage = extractInlineImage(data);
  const image =
    data?.result?.image_url ??
    data?.result?.url ??
    data?.image_url ??
    data?.url ??
    data?.data?.[0]?.url ??
    data?.data?.[0]?.b64_json ??
    data?.output?.[0] ??
    data?.result?.image ??
    data?.image ??
    inlineImage?.data;
  if (!image) throw new Error("AI image provider response did not contain an image.");
  if (String(image).startsWith("http") || String(image).startsWith("data:")) return String(image);
  return `data:${inferImageContentType(image, inlineImage?.mimeType || contentType)};base64,${image}`;
}

function extractInlineImage(data) {
  const parts = data?.candidates?.[0]?.content?.parts ?? data?.parts ?? [];
  const part = parts.find((candidate) => candidate?.inlineData?.data || candidate?.inline_data?.data);
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) return undefined;
  return {
    data: inline.data,
    mimeType: inline.mimeType || inline.mime_type
  };
}

function inferImageContentType(image, contentType) {
  if (contentType && contentType.startsWith("image/")) return contentType;
  const text = String(image);
  if (text.startsWith("/9j/")) return "image/jpeg";
  if (text.startsWith("iVBOR")) return "image/png";
  if (text.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function requiredEnv(env, key) {
  const value = env[key];
  if (!value || ["disabled", "example", "replace-me", "changeme", "dummy", "fake"].includes(String(value).trim().toLowerCase())) {
    throw new Error(`Missing required provider env: ${key}`);
  }
  return String(value).trim();
}

function buildDraftId(input) {
  return `ai-${Date.now().toString(36)}-${slug(input.recipient || "card")}`;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "card";
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

function parseDotenv(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) parsed[key] = value;
  }
  return parsed;
}
