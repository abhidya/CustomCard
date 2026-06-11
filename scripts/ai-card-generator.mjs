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
  required: ["panels", "memory_citations"],
  properties: {
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
      "Full-bleed flat 2D artwork layer for a premium 5x7 vertical front print panel, refined abstract celebration background, coordinated palette, balanced decorative pattern with a slightly calmer lower third, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-left": {
    headline: "Thinking of you",
    body: "A note for this moment.",
    art_direction: "Soft interior panel with room for a short message.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a soft 5x7 vertical inside-left print panel, subtle coordinating pattern, gentle low-contrast center, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  "inside-right": {
    headline: "From the heart",
    body: "With warm wishes.",
    art_direction: "Main message panel with readable typography and generous margins.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a clean 5x7 vertical inside-right print panel, warm pale background, subtle coordinating pattern, generous calm low-contrast center, no words, no letters, no typography, no logos, no watermark.",
    image_negative_prompt:
      "readable text, misspelled text, logo, watermark, QR code, folded card mockup, tabletop scene, hands, people, face, portrait"
  },
  back: {
    headline: "CustomCard",
    body: "Made with CustomCard. Printed locally.",
    art_direction: "Clean coordinating back panel with minimal ornamentation.",
    image_prompt:
      "Full-bleed flat 2D artwork layer for a minimal 5x7 vertical back print panel, coordinating flat background, subtle ornament near the lower edge, mostly negative space, no words, no letters, no typography, no logos, no watermark.",
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
      const adminConfig = requestScopedAiFlowConfig(body, env);
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
      const adminConfig = requestScopedAiFlowConfig(body, env);
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

function requestScopedAiFlowConfig(body, env) {
  if (String(env.CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG ?? "false").toLowerCase() !== "true") return [];
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
    const data = await postJson(fetchImpl, "https://api.openai.com/v1/responses", {
      headers: { authorization: `Bearer ${requiredEnv(env, "OPENAI_API_KEY")}` },
      body: {
        model: flow.model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_output_tokens: flow.maxTokens || 700,
        temperature: flow.temperature
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
          generationConfig: { maxOutputTokens: flow.maxTokens || 700, temperature: flow.temperature }
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

  throw new Error(`Image adapter ${flow.primaryAdapterId} is configured but not executable in this runtime yet.`);
}

function buildDeterministicPanelSvgDataUrl({ panelId, prompt }) {
  const svg = buildDeterministicPanelSvg({ panelId, prompt });
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function buildDeterministicPanelSvg({ panelId, prompt }) {
  const theme = themeForPrompt(prompt);
  const seed = numericSeed(`${panelId}:${prompt}`);
  const background = theme.background;
  const motifs = Array.from({ length: theme.count }, (_, index) => {
    const x = seededRange(seed, index, -120, 1500);
    const y = seededRange(seed, index + 37, -120, 2100);
    const scale = seededRange(seed, index + 71, 55, 150) / 100;
    const rotation = seededRange(seed, index + 103, -35, 35);
    return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${theme.motif(index)}</g>`;
  }).join("\n");
  const calmOverlay = panelId === "front"
    ? '<rect x="0" y="1180" width="1500" height="520" fill="#fffaf0" opacity="0.18"/>'
    : panelId === "back"
      ? '<rect x="0" y="1450" width="1500" height="380" fill="#fffaf0" opacity="0.12"/>'
      : '<rect x="240" y="430" width="1020" height="1240" rx="34" fill="#fffdf7" opacity="0.16"/>';
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100" role="img" aria-label="CustomCard generated artwork layer">',
    `<rect width="1500" height="2100" fill="${background}"/>`,
    motifs,
    calmOverlay,
    `<rect x="70" y="70" width="1360" height="1960" rx="28" fill="none" stroke="${theme.accent}" stroke-width="5" opacity="0.34"/>`,
    "</svg>"
  ].join("\n");
}

function themeForPrompt(prompt) {
  const text = String(prompt).toLowerCase();
  if (/\b(medical|doctor|stethoscope|white coat|ecg)\b/.test(text)) {
    return {
      background: "#101d3b",
      accent: "#e8c66c",
      count: 32,
      motif: (index) => medicalMotif(index)
    };
  }
  if (/\b(father|dad|fix(?:-it)?|repair|handy(?:man)?|wrench|tools?|toolbox|workshop|blueprints?|glue|hammer|measure|measuring)\b/.test(text)) {
    return {
      background: "#0f6b5f",
      accent: "#f5c542",
      count: 42,
      motif: (index) => toolMotif(index)
    };
  }
  if (/\b(birthday|botanical|flower|fern|rose)\b/.test(text)) {
    return {
      background: "#fff7ed",
      accent: "#2f6f52",
      count: 42,
      motif: (index) => botanicalMotif(index)
    };
  }
  if (/\b(citrus|small-business|shop|thank)\b/.test(text)) {
    return {
      background: "#0f3d3f",
      accent: "#f6b53f",
      count: 46,
      motif: (index) => citrusMotif(index)
    };
  }
  return {
    background: "#f8f1e7",
    accent: "#3d6f67",
    count: 34,
    motif: (index) => botanicalMotif(index)
  };
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
      task: "Generate greeting card copy and literal image-generation prompts as JSON only.",
      required_schema: {
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
      constraints: [
        "Exactly four panels.",
        "Use each panel id exactly once in this order: front, inside-left, inside-right, back.",
        "Use only provided memory_notes.",
        "No order/payment claims.",
        "headline <= 120 characters.",
        "body <= 600 characters.",
        "image_prompt is the exact prompt the image model will receive for that panel.",
        "image_prompt must be a concrete visual composition, not a restatement of form fields.",
        "image_prompt must not include labels such as Recipient, Relationship, Occasion, Tone, Style, Language context, Panel headline, Panel body, or Art direction.",
        "Do not ask the image model to render the headline or body. The app overlays typography after generation.",
        "Use symbolic objects, patterns, backgrounds, flat 2D illustration, and print design details.",
        "Do not include people, faces, bodies, hands, customer groups, shop owners, signatures, handwriting, or portraits unless the user explicitly asks for a portrait/photo.",
        "Do not describe a physical paper card, folded card, envelope, tabletop, desk scene, product photo, mockup, shadowed card, framed card, or any object photographed in a scene.",
        "Do not include words, letters, glyphs, calligraphy, handwriting, labels, signatures, fake text, pseudo text, or decorative script marks.",
        "For each image_prompt include: premium 5x7 vertical flat print panel artwork, the panel role, specific visual motifs, palette, style, composition, full-bleed 2D digital illustration quality, no people/no hands, no physical mockup, and no logos/no watermark/no readable text.",
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
  if (flow.primaryAdapterId !== "cloudflare-workers-ai-chat") return undefined;
  return {
    type: "json_schema",
    json_schema: cardCopyJsonSchema
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
      "Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; fill the canvas edge to edge with decorative background artwork and keep the lower third slightly less busy.",
    "inside-left":
      "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; use a subtle low-contrast decorative pattern with gentle edge emphasis.",
    "inside-right":
      "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; use a subtle low-contrast decorative pattern with gentle corner emphasis.",
    back:
      "Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with subtle coordinating ornamentation near the lower area."
  }[panelId];
  const visualBrief = buildVisualBrief(input, panel);

  return [
    panelInstruction,
    visualBrief,
    "Artwork layer only, not a physical card or photographed paper. No inner card rectangle, no frame, no table, no envelope, no label, no sign, no blank tag, no text box, no shadowed paper sheet. Premium print-ready flat artwork, full-bleed 2D composition, minimal clutter, generous safe margins, no readable text, no words, no letters, no numbers, no handwriting, no calligraphy, no faux script, no fake text, no logos, no watermark."
  ].join(" ");
}

function normalizeImagePrompt(prompt, panelId, input, panel) {
  const cleaned = cleanText(prompt)
    .replace(/\b(?:Recipient|Relationship|Occasion|Tone|Style|Language context|Panel headline|Panel body|Art direction)\s*:[^.]+\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const base = imagePromptNeedsRepair(cleaned)
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
  if (!/\bnot (?:a )?(?:physical|photographed|mockup|photo)\b/i.test(base)) {
    guardrails.push("Not a photo, not a physical paper card, not a folded card mockup, not a tabletop scene, not a product photograph.");
  }
  return truncate([base, ...guardrails].join(" "), 1200);
}

function imagePromptNeedsRepair(prompt) {
  return /\b(person|people|human|owner|customer|customers|face|portrait|body|hands?|holding|model|signature|handwriting|lettering|readable text|['"]?thank you['"]?\s+sign|signage|sign|worn|creased)\b/i.test(prompt) ||
    /(?:shop|store|brand|company|business)['’]?\s+logo|\blogo\s+(?:in|at|on|near|as)\b/i.test(prompt);
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
  if (/\b(med|medical|doctor|physician|md|white coat|stethoscope)\b/.test(source)) {
    return "Elegant medical-school graduation background: deep navy field with soft gold accents, simple white coat silhouette, graduation cap icon, stethoscope line forming a subtle heart, faint unlabeled anatomical linework texture, and quiet ECG heartbeat motif.";
  }
  if (/\b(graduat|class year|diploma|school)\b/.test(source)) {
    return "Elegant graduation background: refined navy, ivory, and gold palette with graduation cap icon, ribbon-like curves, subtle starbursts, celebratory confetti, and clean milestone pattern details.";
  }
  if (/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    return "Warm small-business thank-you background: cream field with citrus slices, soft gold ribbon curves, deep teal leaves, subtle boutique awning silhouette, kraft paper texture, botanical sprigs, and handmade local-shop pattern details.";
  }
  if (/\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source)) {
    return "Warm Father's Day practical-love background: clean blueprint-inspired field, organized wrench and measuring-tape icons, pencil lines, small hardware details, golden yellow and workshop green accents, polished friendly illustration pattern.";
  }
  if (/\b(birthday|cake|candles|party)\b/.test(source)) {
    return "Warm birthday background: botanical greenery, soft flowers, small candle shapes, cheerful confetti, morning-light palette, refined celebratory illustration pattern.";
  }
  if (/\b(thank|grateful|appreciat)\b/.test(source)) {
    return "Elegant thank-you background: ribbon curves, botanical sprigs, soft paper texture, warm accent shapes, quiet premium composition, sincere and polished.";
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

function normalizeCardCopy(parsed, input) {
  const rawPanels = Array.isArray(parsed?.panels)
    ? parsed.panels
    : Array.isArray(parsed?.card_copy?.panels)
      ? parsed.card_copy.panels
      : [];
  const panels = requiredPanelIds.map((id) => {
    const raw = rawPanels.find((panel) => panel?.id === id) ?? {};
    const defaults = panelDefaults[id];
    return {
      id,
      headline: truncate(cleanText(raw.headline || defaults.headline), 120),
      body: truncate(cleanText(raw.body || defaults.body), 600),
      art_direction: truncate(cleanText(raw.art_direction || raw.artDirection || defaults.art_direction), 500),
      image_prompt: truncate(cleanText(raw.image_prompt || raw.imagePrompt || defaults.image_prompt), 1200),
      image_negative_prompt: truncate(
        cleanText(raw.image_negative_prompt || raw.imageNegativePrompt || defaults.image_negative_prompt),
        500
      )
    };
  });
  const memoryCitations = Array.isArray(parsed?.memory_citations)
    ? parsed.memory_citations
    : Array.isArray(parsed?.memoryCitations)
      ? parsed.memoryCitations
      : input.memory_notes.slice(0, 2);
  return {
    panels,
    memory_citations: memoryCitations.map(cleanText).filter(Boolean).slice(0, 4)
  };
}

function buildFallbackCardCopy(input) {
  return {
    panels: [
      {
        id: "front",
        headline: `For ${truncate(input.recipient, 80)}`,
        body: `A ${input.tone} ${input.occasion} card made with care.`,
        art_direction: `${input.style} cover, print-safe margins, coordinated palette.`,
        image_prompt: buildPanelImagePrompt(input, "front", {
          ...panelDefaults.front,
          art_direction: `${input.style} cover, print-safe margins, coordinated palette.`
        }),
        image_negative_prompt: panelDefaults.front.image_negative_prompt
      },
      {
        id: "inside-left",
        headline: "Thinking of you",
        body: input.personal_note || `A warm note for ${input.recipient} on this ${input.occasion}.`,
        art_direction: `${input.style} interior, quiet decorative border.`,
        image_prompt: buildPanelImagePrompt(input, "inside-left", {
          ...panelDefaults["inside-left"],
          art_direction: `${input.style} interior, quiet decorative border.`
        }),
        image_negative_prompt: panelDefaults["inside-left"].image_negative_prompt
      },
      {
        id: "inside-right",
        headline: `From ${truncate(input.sender, 80)}`,
        body: input.memory_notes[0]
          ? `This made me think of you: ${truncate(input.memory_notes[0], 420)}`
          : `With appreciation for everything that makes this ${input.occasion} special.`,
        art_direction: `${input.style} message panel, readable type area, matching inside-left.`,
        image_prompt: buildPanelImagePrompt(input, "inside-right", {
          ...panelDefaults["inside-right"],
          art_direction: `${input.style} message panel, readable type area, matching inside-left.`
        }),
        image_negative_prompt: panelDefaults["inside-right"].image_negative_prompt
      },
      {
        id: "back",
        headline: "CustomCard",
        body: "Made with CustomCard. Printed locally.",
        art_direction: "Minimal back panel with small coordinating ornament.",
        image_prompt: buildPanelImagePrompt(input, "back", {
          ...panelDefaults.back,
          art_direction: "Minimal back panel with small coordinating ornament."
        }),
        image_negative_prompt: panelDefaults.back.image_negative_prompt
      }
    ],
    memory_citations: input.memory_notes.slice(0, 2)
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
  const image =
    data?.result?.image_url ??
    data?.result?.url ??
    data?.image_url ??
    data?.url ??
    data?.data?.[0]?.url ??
    data?.output?.[0] ??
    data?.result?.image ??
    data?.image;
  if (!image) throw new Error("AI image provider response did not contain an image.");
  if (String(image).startsWith("http") || String(image).startsWith("data:")) return String(image);
  return `data:${inferImageContentType(image, contentType)};base64,${image}`;
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
  return String(value ?? "").slice(0, maxLength);
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
