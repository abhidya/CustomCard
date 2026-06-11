import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig
} from "../src/aiFlowConfigData.mjs";

export const aiCardGenerateRoute = "/api/ai/card/generate";
export const aiChatRespondRoute = "/api/ai/chat/respond";

const requiredPanelIds = ["front", "inside-left", "inside-right", "back"];
const panelDefaults = {
  front: {
    headline: "For you",
    body: "A card made with care.",
    art_direction: "Coordinated front cover artwork with safe margins."
  },
  "inside-left": {
    headline: "Thinking of you",
    body: "A note for this moment.",
    art_direction: "Soft interior panel with room for a short message."
  },
  "inside-right": {
    headline: "From the heart",
    body: "With warm wishes.",
    art_direction: "Main message panel with readable typography and generous margins."
  },
  back: {
    headline: "CustomCard",
    body: "Made with CustomCard. Printed locally.",
    art_direction: "Clean coordinating back panel with minimal ornamentation."
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
      let providerFailure = "";
      let textProvider = copyFlow.primaryAdapterId;

      if (copyFlow.readyForLiveCalls) {
        try {
          const text = await executeTextProvider({
            flow: copyFlow,
            env,
            fetchImpl,
            systemPrompt: copyFlow.promptInstructions,
            userPrompt: buildCardCopyPrompt(draftInput)
          });
          cardCopy = normalizeCardCopy(parseJsonFromText(text), draftInput);
        } catch (error) {
          providerFailure = error instanceof Error ? error.message : "Provider text generation failed.";
          cardCopy = buildFallbackCardCopy(draftInput);
          textProvider = copyFlow.fallbackAdapterId;
        }
      } else {
        providerFailure = copyFlow.blockedReasons[0] ?? "Live card-copy provider is disabled.";
        cardCopy = buildFallbackCardCopy(draftInput);
        textProvider = copyFlow.fallbackAdapterId;
      }

      const images = [];
      let imageProvider = imageFlow.fallbackAdapterId;
      if (imageFlow.readyForLiveCalls) {
        const imageRateLimit = checkRateLimit(rateBuckets, `${requestContext.rateKey}:image`, imageFlow);
        if (!imageRateLimit) {
          try {
            const imageUrl = await executeImageProvider({
              flow: imageFlow,
              env,
              fetchImpl,
              prompt: buildImagePrompt(draftInput, cardCopy.panels[0]?.art_direction ?? "")
            });
            if (imageUrl) {
              images.push({
                panel_id: "front",
                image_url: imageUrl,
                revised_prompt: imageFlow.promptInstructions,
                width: 1500,
                height: 2100
              });
              imageProvider = imageFlow.primaryAdapterId;
            }
          } catch (error) {
            providerFailure = providerFailure || (error instanceof Error ? error.message : "Provider image generation failed.");
          }
        }
      }

      return {
        statusCode: 200,
        payload: {
          draft_id: buildDraftId(draftInput),
          card_copy: cardCopy,
          images,
          generated_by: images.length > 0 ? "ai-text-and-image" : "ai-text-only",
          ai_flow: {
            card_copy: publicFlowState(copyFlow, textProvider, providerFailure),
            card_image: publicFlowState(imageFlow, imageProvider, imageFlow.readyForLiveCalls ? "" : imageFlow.blockedReasons[0] ?? "")
          },
          live_provider_calls_enabled: copyFlow.readyForLiveCalls,
          fallback_queued: Boolean(providerFailure && copyFlow.fallbackQueueEnabled),
          external_network_calls: copyFlow.readyForLiveCalls
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
  if (String(env.CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG ?? "true").toLowerCase() === "false") return [];
  return normalizeAiFlowAdminConfigs(body.aiFlowConfig ?? body.ai_flow_config ?? []);
}

function isAiEnvKey(key) {
  return /^(CUSTOMCARD_AI_|ANTHROPIC_|OPENAI_|CLOUDFLARE_|GOOGLE_|GEMINI_|HUGGINGFACE_|GROQ_|TOGETHER_|MISTRAL_|DEEPSEEK_|FIREWORKS_|PERPLEXITY_|XAI_|REPLICATE_|STABILITY_|FAL_|BFL_)/.test(key);
}

async function executeTextProvider({ flow, env, fetchImpl, systemPrompt, userPrompt }) {
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
        temperature: flow.temperature
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

async function executeImageProvider({ flow, env, fetchImpl, prompt }) {
  if (flow.primaryAdapterId === "cloudflare-workers-ai-image") {
    const accountId = requiredEnv(env, "CLOUDFLARE_ACCOUNT_ID");
    const token = env.CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN || requiredEnv(env, "CLOUDFLARE_API_TOKEN");
    const response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${flow.model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt })
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
      task: "Generate greeting card copy JSON only.",
      required_schema: {
        panels: requiredPanelIds.map((id) => ({ id, headline: "string", body: "string", art_direction: "string" })),
        memory_citations: ["string"]
      },
      constraints: [
        "Exactly four panels.",
        "Use only provided memory_notes.",
        "No order/payment claims.",
        "headline <= 120 characters.",
        "body <= 600 characters.",
        "Return JSON only, no markdown."
      ],
      input
    },
    null,
    2
  );
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

function buildImagePrompt(input, artDirection) {
  return [
    "Portrait 5x7 greeting card front cover artwork, print-ready, flat artwork only.",
    `Recipient: ${input.recipient}.`,
    `Occasion: ${input.occasion}.`,
    `Style: ${input.style}.`,
    `Art direction: ${artDirection}.`,
    "No collage, no mockup, no table scene, no crop marks. Leave safe margins for deterministic text overlay."
  ].join(" ");
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
      art_direction: truncate(cleanText(raw.art_direction || raw.artDirection || defaults.art_direction), 500)
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
        art_direction: `${input.style} cover, print-safe margins, coordinated palette.`
      },
      {
        id: "inside-left",
        headline: "Thinking of you",
        body: input.personal_note || `A warm note for ${input.recipient} on this ${input.occasion}.`,
        art_direction: `${input.style} interior, quiet decorative border.`
      },
      {
        id: "inside-right",
        headline: `From ${truncate(input.sender, 80)}`,
        body: input.memory_notes[0]
          ? `This made me think of you: ${truncate(input.memory_notes[0], 420)}`
          : `With appreciation for everything that makes this ${input.occasion} special.`,
        art_direction: `${input.style} message panel, readable type area, matching inside-left.`
      },
      {
        id: "back",
        headline: "CustomCard",
        body: "Made with CustomCard. Printed locally.",
        art_direction: "Minimal back panel with small coordinating ornament."
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
  const responseOutputText = Array.isArray(data?.output)
    ? data.output
        .flatMap((item) => item?.content ?? [])
        .map((part) => part?.text)
        .filter(Boolean)
        .join("\n")
    : "";
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.result?.response ??
    data?.response ??
    data?.output_text ??
    data?.content?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n") ??
    responseOutputText;
  if (!text) throw new Error("AI provider response did not contain text.");
  return String(text);
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
  return `data:${contentType || "image/png"};base64,${image}`;
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
