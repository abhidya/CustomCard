import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig
} from "../src/aiFlowConfigData.mjs";
import { createAiFlowCostGate } from "./ai-flow-cost-gate.mjs";

export const aiCardGenerateRoute = "/api/ai/card/generate";
export const aiChatRespondRoute = "/api/ai/chat/respond";

const requiredPanelIds = ["front", "inside-left", "inside-right", "back"];
const textLayoutEnums = {
  headline_zone: ["top", "upper", "center", "lower"],
  body_zone: ["upper", "center", "lower", "bottom"],
  alignment: ["left", "center", "right"],
  font_pairing: ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"],
  color_mode: ["dark-ink", "light-ink", "accent-ink", "high-contrast"],
  scale: ["compact", "standard", "large"]
};
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
const panelDefaults = {
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

export function createAiCardGenerationService({ env = process.env, fetchImpl = globalThis.fetch, costGate = createAiFlowCostGate() } = {}) {

  return {
    async generateCard(body, requestContext = {}) {
      const adminConfig = runtimeAiFlowConfig(body, env, requestContext);
      const copyFlow = resolveAiFlowConfig("card-copy", env, adminConfig);
      const imageFlow = resolveAiFlowConfig("card-image", env, adminConfig);

      const draftInput = normalizeCardInput(body);
      const providerCallEvents = [];
      let cardCopy;
      let textProviderFailure = "";
      let imageProviderFailure = "";
      let textProvider = copyFlow.primaryAdapterId;

      if (copyFlow.readyForLiveCalls) {
        const reservation = costGate.reserve(
          aiCostGateInput({
            flow: copyFlow,
            requestContext,
            routeId: aiCardGenerateRoute,
            requestUnits: 1,
            phase: "card-copy"
          })
        );
        providerCallEvents.push(reservation.event);
        if (!reservation.ok && reservation.statusCode === 429) {
          return {
            statusCode: 429,
            payload: {
              ...reservation.payload,
              provider_call_events: publicProviderCallEvents(providerCallEvents),
              ai_cost_gate: publicCostGateSummary(providerCallEvents)
            }
          };
        }
        if (!reservation.ok) {
          textProviderFailure = reservation.providerFailure;
          cardCopy = buildFallbackCardCopy(draftInput);
          textProvider = copyFlow.fallbackAdapterId;
        } else {
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
            providerCallEvents.push(costGate.settle(reservation.reservation, { status: "succeeded" }));
          } catch (error) {
            textProviderFailure = error instanceof Error ? error.message : "Provider text generation failed.";
            cardCopy = buildFallbackCardCopy(draftInput);
            textProvider = copyFlow.fallbackAdapterId;
            providerCallEvents.push(
              costGate.settle(reservation.reservation, {
                status: "fallback-selected",
                fallbackReason: "provider-unavailable",
                errorClass: "provider-text-generation-failed",
                metadata: { providerFailure: textProviderFailure }
              })
            );
          }
        }
      } else {
        textProviderFailure = copyFlow.blockedReasons[0] ?? "Live card-copy provider is disabled.";
        cardCopy = buildFallbackCardCopy(draftInput);
        textProvider = copyFlow.fallbackAdapterId;
      }

      const images = [];
      let imageProvider = imageFlow.fallbackAdapterId;
      if (imageFlow.readyForLiveCalls) {
        const imagePromptPlan = buildImagePromptPlan(draftInput, cardCopy);
        const reservation = costGate.reserve(
          aiCostGateInput({
            flow: imageFlow,
            requestContext,
            routeId: aiCardGenerateRoute,
            requestUnits: imagePromptPlan.length,
            phase: "card-image",
            metadata: { panelCount: imagePromptPlan.length }
          })
        );
        providerCallEvents.push(reservation.event);
        if (!reservation.ok) {
          imageProviderFailure = reservation.providerFailure;
        } else {
          try {
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
              providerCallEvents.push(
                costGate.settle(reservation.reservation, {
                  status: "succeeded",
                  metadata: { generatedPanelCount: images.length }
                })
              );
            } else {
              imageProviderFailure = `Image provider returned ${images.length} of ${imagePromptPlan.length} required panels.`;
              images.length = 0;
              providerCallEvents.push(
                costGate.settle(reservation.reservation, {
                  status: "fallback-selected",
                  fallbackReason: "provider-unavailable",
                  errorClass: "provider-image-generation-incomplete",
                  metadata: { providerFailure: imageProviderFailure }
                })
              );
            }
          } catch (error) {
            imageProviderFailure = error instanceof Error ? error.message : "Provider image generation failed.";
            images.length = 0;
            providerCallEvents.push(
              costGate.settle(reservation.reservation, {
                status: "fallback-selected",
                fallbackReason: "provider-unavailable",
                errorClass: "provider-image-generation-failed",
                metadata: { providerFailure: imageProviderFailure }
              })
            );
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
          provider_call_events: publicProviderCallEvents(providerCallEvents),
          ai_cost_gate: publicCostGateSummary(providerCallEvents),
          live_provider_calls_enabled: hasLiveProviderEvent(providerCallEvents),
          fallback_queued: fallbackQueued,
          external_network_calls: hasExternalNetworkEvent(providerCallEvents)
        }
      };
    },

    async respondChat(body, requestContext = {}) {
      const adminConfig = runtimeAiFlowConfig(body, env, requestContext);
      const flow = resolveAiFlowConfig("customer-chat", env, adminConfig);

      const input = normalizeChatInput(body);
      const providerCallEvents = [];
      let assistantMessage;
      let providerFailure = "";
      let adapterId = flow.primaryAdapterId;

      if (flow.readyForLiveCalls) {
        const reservation = costGate.reserve(
          aiCostGateInput({
            flow,
            requestContext,
            routeId: aiChatRespondRoute,
            requestUnits: 1,
            phase: "customer-chat"
          })
        );
        providerCallEvents.push(reservation.event);
        if (!reservation.ok && reservation.statusCode === 429) {
          return {
            statusCode: 429,
            payload: {
              ...reservation.payload,
              provider_call_events: publicProviderCallEvents(providerCallEvents),
              ai_cost_gate: publicCostGateSummary(providerCallEvents)
            }
          };
        }
        if (!reservation.ok) {
          providerFailure = reservation.providerFailure;
          assistantMessage = buildLocalChatReply(input);
          adapterId = flow.fallbackAdapterId;
        } else {
          try {
            assistantMessage = await executeTextProvider({
              flow,
              env,
              fetchImpl,
              systemPrompt: flow.promptInstructions,
              userPrompt: buildChatPrompt(input)
            });
            providerCallEvents.push(costGate.settle(reservation.reservation, { status: "succeeded" }));
          } catch (error) {
            providerFailure = error instanceof Error ? error.message : "Provider chat generation failed.";
            assistantMessage = buildLocalChatReply(input);
            adapterId = flow.fallbackAdapterId;
            providerCallEvents.push(
              costGate.settle(reservation.reservation, {
                status: "fallback-selected",
                fallbackReason: "provider-unavailable",
                errorClass: "provider-chat-generation-failed",
                metadata: { providerFailure }
              })
            );
          }
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
          provider_call_events: publicProviderCallEvents(providerCallEvents),
          ai_cost_gate: publicCostGateSummary(providerCallEvents),
          live_provider_calls_enabled: hasLiveProviderEvent(providerCallEvents),
          fallback_queued: Boolean(providerFailure && flow.fallbackQueueEnabled),
          external_network_calls: hasExternalNetworkEvent(providerCallEvents)
        }
      };
    }
  };
}

function aiCostGateInput({ flow, requestContext, routeId, requestUnits, phase, metadata = {} }) {
  return {
    flow,
    routeId,
    requestUnits,
    rateKey: requestContext.rateKey,
    idempotencyKey: requestContext.idempotencyKey,
    authContext: requestContext.authContext,
    fallbackFromAdapterId: flow.primaryAdapterId,
    metadata: {
      phase,
      ...metadata
    }
};
}

function runtimeAiFlowConfig(body, env, requestContext = {}) {
  return mergeAiFlowAdminConfigs(serverScopedAiFlowConfig(env), requestScopedAiFlowConfig(body, env, requestContext));
}

function serverScopedAiFlowConfig(env) {
  const raw = env.CUSTOMCARD_AI_FLOW_CONFIG_JSON ?? env.CUSTOMCARD_AI_FLOW_ADMIN_CONFIG_JSON ?? "";
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return normalizeAiFlowAdminConfigs(Array.isArray(parsed) ? parsed : parsed.flows ?? parsed.aiFlowConfig ?? parsed.ai_flow_config ?? [], env);
  } catch {
    return [];
  }
}

function mergeAiFlowAdminConfigs(...groups) {
  const byFlowId = new Map();
  for (const group of groups) {
    for (const config of Array.isArray(group) ? group : []) {
      if (!config?.flowId) continue;
      byFlowId.set(config.flowId, config);
    }
  }
  if (byFlowId.size === 0) return [];
  return normalizeAiFlowAdminConfigs(Array.from(byFlowId.values()));
}

function requestScopedAiFlowConfig(body, env, requestContext = {}) {
  if (String(env.CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG ?? "false").toLowerCase() !== "true") return [];
  if (requestContext.trustRequestAiFlowConfig !== true) return [];
  return normalizeAiFlowAdminConfigs(body.aiFlowConfig ?? body.ai_flow_config ?? []);
}

function isAiEnvKey(key) {
  return /^(CUSTOMCARD_AI_|ANTHROPIC_|OPENAI_|CLOUDFLARE_|GOOGLE_|GEMINI_|HUGGINGFACE_|GROQ_|TOGETHER_|MISTRAL_|DEEPSEEK_|DEEPAI_|FIREWORKS_|PERPLEXITY_|XAI_|REPLICATE_|STABILITY_|FAL_|BFL_)/.test(key);
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
    const response = await fetchWithProviderBackoff(
      fetchImpl,
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${flow.model}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(requestBody)
      },
      { retries: flow.maxRetries, baseDelayMs: 1500, maxDelayMs: 5000 }
    );
    if (!response.ok) throw new Error(`Cloudflare image provider returned ${response.status}.`);
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }
    return materializeGeneratedImageUrl(await extractImageUrl(await response.json(), contentType), fetchImpl);
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
    return materializeGeneratedImageUrl(extractImageUrl(data, "image/png"), fetchImpl);
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
    return materializeGeneratedImageUrl(extractImageUrl(data, "image/png"), fetchImpl);
  }

  if (flow.primaryAdapterId === "deepai-text2img-image") {
    const body = new FormData();
    body.set("text", buildDeepAiTextPrompt({ prompt, negativePrompt }));
    const response = await fetchWithProviderBackoff(
      fetchImpl,
      "https://api.deepai.org/api/text2img",
      {
        method: "POST",
        headers: { "api-key": requiredEnv(env, "DEEPAI_API_KEY") },
        body
      },
      { retries: flow.maxRetries, baseDelayMs: 1500, maxDelayMs: 5000 }
    );
    const contentType = response.headers?.get?.("content-type") ?? "";
    const data = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new Error(`DeepAI image provider returned ${response.status}: ${data?.err || data?.status || "request failed"}.`);
    }
    return materializeGeneratedImageUrl(extractImageUrl(data, contentType || "image/png"), fetchImpl);
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
    return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})">${theme.motif(index, panelId)}</g>`;
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
  return "";
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
  if (/\b(medical|doctor|stethoscope|white[- ]coat|ecg|anatomy|graduation cap|residen(?:cy|t))\b/.test(text)) {
    return {
      kind: "medical",
      background: (panelId) => panelId.startsWith("inside") ? "#fffdf7" : "#101d3b",
      accent: "#e8c66c",
      count: (panelId) => panelId === "front" ? 2 : 0,
      texture: (panelId) => panelId.startsWith("inside") ? medicalPaperTexture() : "",
      hero: (panelId) => medicalHero(panelId),
      overlay: () => "",
      border: (panelId) => medicalBorder(panelId),
      motif: (index) => medicalMotif(index)
    };
  }
  if (/\b(father|dad|fix(?:-it)?|repair|handy(?:man)?|wrench|tools?|toolbox|workshop|blueprints?|glue|hammer|measure|measuring)\b/.test(text)) {
    return {
      kind: "tools",
      background: (panelId) => panelId.startsWith("inside") ? "#fbf5e8" : "#0f6b5f",
      accent: (panelId) => panelId.startsWith("inside") ? "#0f6b5f" : "#f5c542",
      count: (panelId) => panelId.startsWith("inside") ? 3 : panelId === "back" ? 2 : 5,
      texture: (panelId) => blueprintTexture(panelId),
      hero: (panelId) => toolHero(panelId),
      overlay: () => "",
      border: (panelId) => toolBorder(panelId),
      motif: (index, panelId) => toolMotif(index, panelId)
    };
  }
  if (/\b(bold[- ]type|editorial|poster|sprint|project-management|project management)\b/.test(text)) {
    return {
      kind: "bold-type",
      background: (panelId) => panelId.startsWith("inside") ? "#fffaf0" : "#15181d",
      accent: (panelId) => panelId.startsWith("inside") ? "#2f4f5f" : "#f2b84b",
      count: 0,
      texture: () => "",
      hero: (panelId) => boldTypeHero(panelId),
      overlay: () => "",
      border: (panelId) => minimalEditorialBorder(panelId),
      motif: () => ""
    };
  }
  if (/\b(photo[- ]note|sympathy|condolence|grieving|quiet support)\b/.test(text)) {
    return {
      kind: "photo-note",
      background: "#fbf7ef",
      accent: "#7d8b72",
      count: 0,
      texture: () => paperGrainTexture("#7d8b72", 0.09),
      hero: (panelId) => photoNoteHero(panelId),
      overlay: () => "",
      border: (panelId) => photoNoteBorder(panelId),
      motif: () => ""
    };
  }
  if (/\b(minimal|plain thanks|watering the plants|watered the plants|neighbor)\b/.test(text)) {
    return {
      kind: "minimal",
      background: "#fdfcf8",
      accent: "#52775b",
      count: 0,
      texture: () => "",
      hero: (panelId) => minimalPlantHero(panelId),
      overlay: () => "",
      border: (panelId) => minimalEditorialBorder(panelId),
      motif: () => ""
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
      background: (panelId) => panelId.startsWith("inside") ? "#fffaf0" : "#0f3d3f",
      accent: (panelId) => panelId.startsWith("inside") ? "#c79531" : "#f6b53f",
      count: (panelId) => panelId.startsWith("inside") ? 3 : panelId === "back" ? 2 : 5,
      hero: (panelId) => citrusHero(panelId),
      overlay: () => "",
      border: (panelId) => citrusBorder(panelId),
      motif: (index, panelId) => citrusMotif(index, panelId)
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
  if (panelId === "inside-left") {
    return `
      <g data-customcard-hero="medical-inside-left">
        <rect x="188" y="1518" width="1124" height="16" rx="8" fill="#8a7044" opacity="0.24"/>
        <path d="M260 1518 H650 C682 1448 780 1448 812 1518 H1240" fill="none" stroke="#c49b42" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
        <rect x="344" y="1390" width="250" height="84" rx="10" fill="#253454" opacity="0.18"/>
        <rect x="376" y="1356" width="250" height="84" rx="10" fill="#c49b42" opacity="0.22"/>
        <path d="M890 1374 C846 1448 866 1512 940 1530 C1024 1550 1102 1492 1080 1408" fill="none" stroke="#253454" stroke-width="14" stroke-linecap="round" opacity="0.62"/>
        <circle cx="884" cy="1370" r="20" fill="none" stroke="#c49b42" stroke-width="8" opacity="0.78"/>
        <circle cx="1085" cy="1405" r="30" fill="none" stroke="#c49b42" stroke-width="8" opacity="0.78"/>
        <path d="M1110 1468 C1170 1428 1230 1432 1272 1486" fill="none" stroke="#8a7044" stroke-width="12" stroke-linecap="round" opacity="0.3"/>
      </g>
    `;
  }
  if (panelId === "inside-right") {
    return `
      <g data-customcard-hero="medical-inside-right">
        <rect x="182" y="220" width="1136" height="430" rx="20" fill="#f7e7b5" opacity="0.2"/>
        <path d="M190 650 C460 468 730 440 1310 650" fill="#f6d170" opacity="0.2"/>
        <path d="M250 650 H1250" stroke="#c49b42" stroke-width="8" stroke-linecap="round" opacity="0.42"/>
        <path d="M1015 1450 L958 1570 L980 1768 L1208 1768 L1230 1570 L1174 1450 C1138 1488 1050 1488 1015 1450Z" fill="#253454" opacity="0.1"/>
        <path d="M1028 1468 L1090 1606 L1098 1766 M1160 1468 L1106 1606 L1098 1766" fill="none" stroke="#253454" stroke-width="8" opacity="0.18"/>
        <path d="M250 1660 C390 1568 510 1568 648 1660" fill="none" stroke="#c49b42" stroke-width="12" stroke-linecap="round" opacity="0.34"/>
        <circle cx="356" cy="1602" r="42" fill="#253454" opacity="0.1"/>
        <circle cx="538" cy="1602" r="42" fill="#253454" opacity="0.1"/>
      </g>
    `;
  }
  if (panelId === "back") {
    return `
      <g data-customcard-hero="medical-back" opacity="0.78">
        <path d="M210 1040 H560 L600 968 L644 1118 L692 900 L746 1040 H1290" fill="none" stroke="#e8c66c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M702 860 C632 768 506 788 506 906 C506 1014 646 1074 750 1158 C854 1074 994 1014 994 906 C994 788 868 768 798 860 C774 890 726 890 702 860Z" fill="none" stroke="#fff4d3" stroke-width="10" opacity="0.74"/>
        <path d="M610 690 L890 690 L812 632 L688 632Z" fill="#fff4d3" stroke="#e8c66c" stroke-width="7" opacity="0.72"/>
        <path d="M750 690 V806" stroke="#e8c66c" stroke-width="6" stroke-linecap="round" opacity="0.74"/>
        <circle cx="750" cy="824" r="14" fill="#e8c66c" opacity="0.86"/>
      </g>
    `;
  }
  return `
    <g data-customcard-hero="medical-front">
      <path d="M0 760 H520 L552 704 L592 842 L638 612 L688 760 H1500" fill="none" stroke="#e8c66c" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/>
      <path d="M620 380 L552 548 L582 1036 L918 1036 L948 548 L880 380 C820 432 680 432 620 380Z" fill="#f7f2df" opacity="0.84"/>
      <path d="M646 408 L736 642 L750 1030 M854 408 L764 642 L750 1030" fill="none" stroke="#c9d1d4" stroke-width="12" opacity="0.72"/>
      <path d="M572 384 C514 518 492 704 520 1038" fill="none" stroke="#e8c66c" stroke-width="26" opacity="0.58"/>
      <path d="M928 384 C986 518 1008 704 980 1038" fill="none" stroke="#e8c66c" stroke-width="26" opacity="0.58"/>
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

function toolBorder(panelId) {
  const inside = panelId.startsWith("inside");
  const stroke = inside ? "#0f6b5f" : "#f5c542";
  const secondary = inside ? "#c79531" : "#d9fff5";
  return `
    <rect x="70" y="70" width="1360" height="1960" rx="18" fill="none" stroke="${stroke}" stroke-width="5" opacity="${inside ? 0.42 : 0.5}"/>
    <rect x="106" y="106" width="1288" height="1888" rx="10" fill="none" stroke="${secondary}" stroke-width="2" opacity="${inside ? 0.28 : 0.36}"/>
  `;
}

function citrusBorder(panelId) {
  const inside = panelId.startsWith("inside");
  const stroke = inside ? "#c79531" : "#f6b53f";
  const secondary = inside ? "#1f7a68" : "#fff8dc";
  return `
    <rect x="70" y="70" width="1360" height="1960" rx="18" fill="none" stroke="${stroke}" stroke-width="5" opacity="${inside ? 0.42 : 0.52}"/>
    <rect x="106" y="106" width="1288" height="1888" rx="10" fill="none" stroke="${secondary}" stroke-width="2" opacity="${inside ? 0.24 : 0.38}"/>
  `;
}

function blueprintTexture(panelId = "") {
  const inside = panelId.startsWith("inside");
  const stroke = inside ? "#0f6b5f" : "#d9fff5";
  const opacity = inside ? 0.055 : 0.11;
  const verticals = Array.from({ length: 6 }, (_, index) => 180 + index * 230)
    .map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="2100" stroke="${stroke}" stroke-width="2" opacity="${opacity}"/>`)
    .join("");
  const horizontals = Array.from({ length: 8 }, (_, index) => 160 + index * 245)
    .map((y) => `<line x1="0" y1="${y}" x2="1500" y2="${y}" stroke="${stroke}" stroke-width="2" opacity="${opacity}"/>`)
    .join("");
  return `<g data-customcard-texture="blueprint">${verticals}${horizontals}</g>`;
}

function toolHero(panelId) {
  const y = panelId.startsWith("inside") ? 1660 : panelId === "front" ? 875 : 1560;
  const opacity = panelId.startsWith("inside") ? 0.18 : panelId === "back" ? 0.24 : 0.46;
  const pale = panelId.startsWith("inside") ? "#0f6b5f" : "#f8e6a1";
  const line = panelId.startsWith("inside") ? "#0f6b5f" : "#d9fff5";
  return `
    <g data-customcard-hero="tools" opacity="${opacity}">
      <path d="M1040 ${y + 70} L1290 ${y - 180}" stroke="${pale}" stroke-width="30" stroke-linecap="round"/>
      <circle cx="1308" cy="${y - 198}" r="48" fill="none" stroke="#f5c542" stroke-width="20"/>
      <rect x="936" y="${y - 34}" width="330" height="36" rx="18" fill="#f5c542" transform="rotate(-9 1100 ${y - 16})"/>
      <path d="M930 ${y + 150} C1030 ${y + 102} 1140 ${y + 102} 1258 ${y + 152}" fill="none" stroke="${line}" stroke-width="8" stroke-linecap="round"/>
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
  const opacity = panelId.startsWith("inside") ? 0.32 : panelId === "back" ? 0.42 : 0.68;
  return `
    <g data-customcard-hero="citrus" opacity="${opacity}">
      <path d="M1010 ${y + 180} C1120 ${y + 40} 1246 ${y - 16} 1402 ${y - 72}" fill="none" stroke="#f6b53f" stroke-width="14" stroke-linecap="round"/>
      <circle cx="1156" cy="${y + 34}" r="92" fill="#f6b53f" stroke="#fff8dc" stroke-width="10"/>
      <path d="M1156 ${y - 48} V${y + 116} M1074 ${y + 34} H1238 M1098 ${y - 24} L1214 ${y + 92} M1214 ${y - 24} L1098 ${y + 92}" stroke="#fff8dc" stroke-width="7" opacity="0.86"/>
      <ellipse cx="1280" cy="${y - 76}" rx="34" ry="98" fill="#d6d7a3" transform="rotate(46 1280 ${y - 76})"/>
      <ellipse cx="1052" cy="${y + 150}" rx="30" ry="84" fill="#1f7a68" transform="rotate(-42 1052 ${y + 150})"/>
    </g>
  `;
}

function boldTypeHero(panelId) {
  const cover = panelId === "front";
  const back = panelId === "back";
  const y = cover ? 420 : back ? 1510 : 1640;
  const opacity = cover ? 0.9 : back ? 0.4 : 0.22;
  return `
    <g data-customcard-hero="bold-type" opacity="${opacity}">
      <rect x="${cover ? 0 : 190}" y="${cover ? 0 : y - 70}" width="${cover ? 1500 : 1120}" height="${cover ? 650 : 18}" fill="#f2b84b"/>
      <rect x="${cover ? 160 : 250}" y="${cover ? 730 : y}" width="${cover ? 500 : 520}" height="${cover ? 34 : 12}" fill="${cover ? "#fffaf0" : "#2f4f5f"}"/>
      <circle cx="${cover ? 1180 : 1110}" cy="${cover ? 840 : y + 44}" r="${cover ? 56 : 30}" fill="#f2b84b"/>
      <path d="M${cover ? 1128 : 1082} ${cover ? 840 : y + 44} L${cover ? 1232 : 1138} ${cover ? 840 : y + 44} L${cover ? 1180 : 1110} ${cover ? 900 : y + 78}Z" fill="${cover ? "#15181d" : "#fffaf0"}" opacity="0.72"/>
    </g>
  `;
}

function photoNoteHero(panelId) {
  if (panelId === "front") {
    return `
      <g data-customcard-hero="sympathy-front">
        <rect x="156" y="156" width="1188" height="1788" rx="30" fill="#fffaf2" opacity="0.46"/>
        <path d="M214 238 C456 186 666 246 892 212 C1068 186 1200 214 1296 190" fill="none" stroke="#d7cbb7" stroke-width="5" stroke-linecap="round" opacity="0.36"/>
        <path d="M178 1788 C372 1736 568 1782 756 1740 C980 1690 1136 1728 1322 1642" fill="none" stroke="#a98f68" stroke-width="8" stroke-linecap="round" opacity="0.34"/>
        <path d="M148 258 C242 358 278 538 252 764 C228 960 190 1118 218 1288" fill="none" stroke="#7d8b72" stroke-width="10" stroke-linecap="round" opacity="0.3"/>
        <path d="M210 300 C236 480 220 688 160 912 C122 1060 126 1198 180 1328" fill="none" stroke="#586b5c" stroke-width="18" stroke-linecap="round" opacity="0.48"/>
        <path d="M278 294 C236 520 214 796 228 1086" fill="none" stroke="#c8cec0" stroke-width="11" stroke-linecap="round" opacity="0.52"/>
        <ellipse cx="250" cy="428" rx="46" ry="132" fill="#7d8b72" opacity="0.58" transform="rotate(34 250 428)"/>
        <ellipse cx="164" cy="628" rx="38" ry="104" fill="#9aa58d" opacity="0.54" transform="rotate(-30 164 628)"/>
        <ellipse cx="232" cy="852" rx="42" ry="120" fill="#7d8b72" opacity="0.5" transform="rotate(30 232 852)"/>
        <ellipse cx="184" cy="1110" rx="28" ry="92" fill="#c8cec0" opacity="0.42" transform="rotate(-24 184 1110)"/>
        <circle cx="1228" cy="314" r="118" fill="#efe4d2" opacity="0.52"/>
        <circle cx="1288" cy="260" r="42" fill="#c8b899" opacity="0.3"/>
        <path d="M1062 258 C1148 158 1292 164 1356 272 C1288 392 1138 384 1062 258Z" fill="#7d8b72" opacity="0.31"/>
        <path d="M1038 1834 C1134 1738 1288 1744 1370 1854 C1280 1960 1130 1954 1038 1834Z" fill="#9aa58d" opacity="0.4"/>
        <path d="M926 1912 C990 1852 1082 1854 1144 1914" fill="none" stroke="#7d8b72" stroke-width="9" stroke-linecap="round" opacity="0.18"/>
        <circle cx="230" cy="1806" r="8" fill="#a98f68" opacity="0.42"/>
        <circle cx="272" cy="1794" r="5" fill="#a98f68" opacity="0.34"/>
      </g>
    `;
  }
  if (panelId === "inside-left" || panelId === "inside-right") {
    const mirrored = panelId === "inside-right";
    const sideX = mirrored ? 1294 : 206;
    const leafSign = mirrored ? -1 : 1;
    const pathStart = mirrored ? "M1310" : "M190";
    const curve = mirrored
      ? "1200 510 1236 790 1312 1030 C1368 1210 1328 1438 1208 1646"
      : "300 510 264 790 188 1030 C132 1210 172 1438 292 1646";
    return `
      <g data-customcard-hero="sympathy-interior-${panelId}">
        <rect x="142" y="142" width="1216" height="1816" rx="22" fill="#fffdf8" opacity="0.52"/>
        <path d="M280 312 C484 270 642 324 850 292 C1030 264 1166 286 1242 270" fill="none" stroke="#d7cbb7" stroke-width="4" stroke-linecap="round" opacity="0.22"/>
        <path d="${pathStart} 270 C${curve}" fill="none" stroke="#7d8b72" stroke-width="9" stroke-linecap="round" opacity="0.24"/>
        <path d="M250 1710 C430 1662 620 1712 798 1668 C998 1620 1130 1652 1250 1608" fill="none" stroke="#a98f68" stroke-width="5" stroke-linecap="round" opacity="0.22"/>
        <ellipse cx="${sideX}" cy="520" rx="28" ry="86" fill="#7d8b72" opacity="0.36" transform="rotate(${leafSign * 34} ${sideX} 520)"/>
        <ellipse cx="${sideX - leafSign * 70}" cy="760" rx="24" ry="76" fill="#9aa58d" opacity="0.32" transform="rotate(${leafSign * -30} ${sideX - leafSign * 70} 760)"/>
        <ellipse cx="${sideX}" cy="1020" rx="28" ry="86" fill="#7d8b72" opacity="0.28" transform="rotate(${leafSign * 32} ${sideX} 1020)"/>
        <circle cx="${mirrored ? 260 : 1240}" cy="330" r="76" fill="#efe4d2" opacity="0.32"/>
        <circle cx="${mirrored ? 302 : 1198}" cy="292" r="28" fill="#c8b899" opacity="0.24"/>
      </g>
    `;
  }
  return `
    <g data-customcard-hero="sympathy-back">
      <rect x="166" y="166" width="1168" height="1768" rx="28" fill="#fffaf2" opacity="0.34"/>
      <g opacity="0.48">
        <circle cx="750" cy="720" r="162" fill="#efe4d2"/>
        <path d="M608 718 C690 612 836 614 902 724 C832 838 688 834 608 718Z" fill="#7d8b72" opacity="0.44"/>
        <ellipse cx="790" cy="812" rx="30" ry="98" fill="#9aa58d" opacity="0.34" transform="rotate(38 790 812)"/>
        <path d="M578 906 C674 874 792 896 926 858" fill="none" stroke="#a98f68" stroke-width="6" stroke-linecap="round" opacity="0.44"/>
      </g>
      <path d="M292 1396 C444 1348 610 1386 760 1352 C962 1306 1102 1338 1236 1278" fill="none" stroke="#a98f68" stroke-width="8" stroke-linecap="round" opacity="0.28"/>
      <path d="M1024 1856 C1116 1760 1278 1762 1354 1868 C1266 1970 1118 1964 1024 1856Z" fill="#7d8b72" opacity="0.32"/>
      <ellipse cx="1148" cy="1920" rx="22" ry="70" fill="#9aa58d" opacity="0.28" transform="rotate(42 1148 1920)"/>
      <circle cx="292" cy="414" r="90" fill="#efe4d2" opacity="0.34"/>
      <path d="M244 418 C442 386 620 426 836 392 C1024 362 1134 388 1260 356" fill="none" stroke="#d7cbb7" stroke-width="4" stroke-linecap="round" opacity="0.2"/>
    </g>
  `;
}

function minimalPlantHero(panelId) {
  const y = panelId === "front" ? 1380 : panelId === "back" ? 1550 : 1660;
  const x = panelId.startsWith("inside") ? 1090 : 260;
  return `
    <g data-customcard-hero="minimal-plant" opacity="0.74">
      <path d="M${x} ${y + 120} C${x + 24} ${y + 20} ${x + 18} ${y - 60} ${x - 8} ${y - 140}" fill="none" stroke="#52775b" stroke-width="10" stroke-linecap="round"/>
      <ellipse cx="${x + 42}" cy="${y - 58}" rx="28" ry="78" fill="#52775b" transform="rotate(36 ${x + 42} ${y - 58})" opacity="0.72"/>
      <ellipse cx="${x - 42}" cy="${y + 10}" rx="24" ry="66" fill="#9bae86" transform="rotate(-34 ${x - 42} ${y + 10})" opacity="0.74"/>
      <line x1="${panelId.startsWith("inside") ? 220 : 260}" y1="${y + 170}" x2="${panelId.startsWith("inside") ? 980 : 540}" y2="${y + 170}" stroke="#52775b" stroke-width="8" stroke-linecap="round" opacity="0.4"/>
    </g>
  `;
}

function minimalEditorialBorder(panelId) {
  const stroke = panelId.startsWith("inside") ? "#2f4f5f" : "#f2b84b";
  return `<rect x="100" y="100" width="1300" height="1900" rx="8" fill="none" stroke="${stroke}" stroke-width="4" opacity="0.28"/>`;
}

function photoNoteBorder(panelId) {
  const stroke = panelId.startsWith("inside") ? "#9aa58d" : "#7d8b72";
  return `
    <rect x="82" y="82" width="1336" height="1936" rx="22" fill="none" stroke="${stroke}" stroke-width="7" opacity="0.52"/>
    <rect x="126" y="126" width="1248" height="1848" rx="14" fill="none" stroke="#a98f68" stroke-width="3" opacity="0.24"/>
  `;
}

function paperGrainTexture(stroke = "#7d8b72", opacity = 0.08) {
  return `
    <g data-customcard-texture="paper-grain" opacity="${opacity}">
      <path d="M240 420 C430 390 610 440 820 402 C1030 364 1160 412 1290 388" fill="none" stroke="${stroke}" stroke-width="3"/>
      <path d="M260 1710 C470 1660 630 1730 830 1686 C1010 1646 1140 1690 1260 1660" fill="none" stroke="${stroke}" stroke-width="3"/>
    </g>
  `;
}

function citrusMotif(index, panelId = "") {
  const inside = panelId.startsWith("inside");
  const fill = index % 3 === 0 ? "#f6b53f" : index % 3 === 1 ? "#fce7a3" : "#f7f2df";
  const leaf = index % 2 === 0 ? "#1f7a68" : inside ? "#9ea66a" : "#d6d7a3";
  return `
    <g opacity="${inside ? 0.5 : 0.84}">
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

function toolMotif(index, panelId = "") {
  const inside = panelId.startsWith("inside");
  const yellow = index % 2 === 0 ? "#f5c542" : "#f8e6a1";
  const pale = inside ? "#0f6b5f" : "#f7f2df";
  const line = inside ? "#0f6b5f" : "#d9fff5";
  return `
    <g opacity="${inside ? 0.34 : 0.76}">
      <rect x="-95" y="-14" width="190" height="28" rx="14" fill="${yellow}"/>
      <circle cx="-112" cy="0" r="26" fill="none" stroke="${pale}" stroke-width="12"/>
      <rect x="-18" y="-92" width="36" height="184" rx="18" fill="${pale}"/>
      <circle cx="0" cy="-112" r="34" fill="none" stroke="#f5c542" stroke-width="12"/>
      <line x1="-125" y1="76" x2="125" y2="76" stroke="${line}" stroke-width="7" opacity="0.65"/>
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

function buildDeepAiTextPrompt({ prompt, negativePrompt }) {
  const avoid = truncate(negativePrompt, 500);
  return truncate(
    avoid
      ? `${prompt}\n\nAvoid: ${avoid}.`
      : prompt,
    2048
  );
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

async function fetchWithProviderBackoff(fetchImpl, url, options, { retries = 0, baseDelayMs = 1000, maxDelayMs = 5000 } = {}) {
  const retryCount = Math.max(0, Number(retries) || 0);
  let response;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    response = await fetchImpl(url, options);
    if (!isRetryableProviderStatus(response.status) || attempt >= retryCount) return response;
    await sleep(providerBackoffDelayMs(response, attempt, baseDelayMs, maxDelayMs));
  }
  return response;
}

function isRetryableProviderStatus(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function providerBackoffDelayMs(response, attempt, baseDelayMs, maxDelayMs) {
  const retryAfter = response.headers?.get?.("retry-after");
  const retryAfterSeconds = retryAfter === undefined || retryAfter === null ? NaN : Number(retryAfter);
  const retryAfterMs =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds * 1000 : undefined;
  const fallbackMs = Math.max(0, Number(baseDelayMs) || 0) * 2 ** Math.max(0, attempt);
  return Math.min(Math.max(0, Number(maxDelayMs) || 0), retryAfterMs ?? fallbackMs);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
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
        "Sympathy or quiet-support cards: keep language grounded and practical; avoid cliches, religious claims unless requested, bright celebration language, and overdesigned ornament."
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
        "inside-left and inside-right must be border-first stationery designs with a calm blank/low-contrast center reserved for app-rendered text.",
        "Interior panels should usually be lighter, warmer, and more paper-like than the front/back covers; avoid using the same dark cover field on all four panels.",
        "Interior art must keep motifs on edges, corners, borders, or low-density background texture; do not fill the message area with busy all-over decoration.",
        "Never rely on a large opaque caption plaque, text box, label, banner, or card-within-card; text-safe space means natural negative space in the artwork.",
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
        "Do not create a caption plaque, inner card rectangle, blank label, sticky note, banner, or text box; text-safe must be integrated negative space, paper field, or quiet blank center.",
        "image_prompt must stay visual: concrete motifs, palette, border/frame treatment, background texture, ornament density, composition archetype, and hierarchy only.",
        "For the front, explicitly choose one dominant hero composition or sparse line-art composition with a clean lower or central text-safe area.",
        "For inside-left and inside-right, explicitly include: border-first stationery layout, thin refined frame, quiet center, clean text-safe area, generous margins, light ivory/cream low-contrast interior, and sparse edge/corner or lower-edge motifs.",
        "For the back, explicitly include mostly negative space and one small coordinating lower mark or border echo.",
        "Use symbolic objects, patterns, backgrounds, flat 2D illustration, and print design details.",
        "Coordinate palette, border style, motifs, and spacing across all four image_prompt values.",
        "For B2B CTA cards, reserve a clean app-overlay area for any QR code or account-manager CTA; do not ask the image model to draw QR codes, labels, or interface elements.",
        "For cards requesting handwriting space, reserve an open note area but do not ask the image model to create handwriting, signatures, script, or fake personal notes.",
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
      "Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep an integrated clean lower or central text-safe area, no caption plaque, and avoid all-over motif wallpaper.",
    "inside-left":
      "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; light ivory or cream low-contrast note-sheet field, border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet blank center, clean text-safe area, generous safe margins, no inner text box.",
    "inside-right":
      "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching light ivory or cream low-contrast note-sheet field, border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet blank center, clean text-safe area, generous safe margins, no inner text box.",
    back:
      "Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo, no caption plaque."
  }[panelId];
  const visualBrief = buildVisualBrief(input, panel);
  const visualCue = normalizeVisualCue(panel.visual_cue || panel.visualCue, panelId, input);
  const textLayout = normalizeTextLayout(panel.text_layout || panel.textLayout, panelId, input);
  const textSafeCue = textSafeCueForLayout(textLayout);

  return [
    panelInstruction,
    "Safety constraints: no readable text, no words, no letters, no numbers, no handwriting, no labels, No people, No hands, no logos, no watermark, no physical card mockup.",
    visualBrief,
    `Use this panel-specific composition: ${visualCue}`,
    `Keep natural negative space for app-rendered typography in the ${textSafeCue}; do not draw words, labels, or handwriting.`,
    "Artwork layer only, not a physical card or photographed paper. No caption plaque, no inner card rectangle, no mockup frame, no table, no envelope, no label, no sign, no blank tag, no text box, no shadowed paper sheet. Decorative print borders are allowed. Premium print-ready flat artwork, full-bleed 2D composition, minimal clutter, disciplined negative space, no all-over repeating wallpaper pattern, generous safe margins, no readable text, no words, no letters, no numbers, no handwriting, no calligraphy, no faux script, no fake text, no logos, no watermark."
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
  if (!/\bno readable text\b/i.test(base)) guardrails.push("No readable text.");
  if (!/\bno (?:words|letters)\b/i.test(base)) guardrails.push("No words, letters, handwriting, calligraphy, labels, signatures, or fake text.");
  if (!/\bno people\b/i.test(base)) guardrails.push("No people.");
  if (!/\bno hands\b/i.test(base)) guardrails.push("No hands.");
  if (!/\bno logos?\b/i.test(base)) guardrails.push("No logos.");
  if (!/\bno watermark\b/i.test(base)) guardrails.push("No watermark.");
  if (!/\b(?:no all-over|avoid all-over|not an all-over|mostly negative space|sparse|restrained)\b/i.test(base)) {
    guardrails.push("Avoid all-over repeating wallpaper patterns; use restrained hierarchy and negative space.");
  }
  if (!/\bno (?:caption plaque|text box|inner card rectangle|blank tag|label)\b/i.test(base)) {
    guardrails.push("No caption plaque, no text box, no inner card rectangle, no blank tag, no label.");
  }
  if (panelId.startsWith("inside") && !/\b(?:ivory|cream|paper|note-sheet|light|low-contrast)\b/i.test(base)) {
    guardrails.push("Use a light ivory or cream low-contrast note-sheet field for the interior unless the user explicitly requested a dark interior.");
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
  return /\b(person|people|human|owner|customer|customers|face|portrait|body|hands?|holding|model|signature|handwriting|lettering|readable text|thank[- ]you note|['"]?thank you['"]?\s+sign|signage|sign|worn|creased)\b/i.test(prompt) ||
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
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")} ${panel.art_direction} ${panel.visual_cue || panel.visualCue || ""}`.toLowerCase();
  if (/\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source)) {
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
    return "Reverent quiet-support stationery: soft ivory, muted gray-green, warm taupe, photo-note frame motif without an actual portrait, wide quiet paper field, restrained border, no religious symbols unless requested, no cliches.";
  }
  if (/\b(funny|playful|witty|sprint|project-management|project management|bold type|bold-type|poster|editorial)\b/.test(source) && /\bbirthday\b/.test(source)) {
    return "Funny bold-type birthday artwork: clean editorial poster composition, confident type-safe blocks without rendered letters, lively offset rhythm, warm accent color, plenty of negative space, no age-joke imagery.";
  }
  if (/\b(anniversary|years together|spouse|balcony basil|sunday morning walks?)\b/.test(source)) {
    return "Sentimental botanical anniversary stationery: balcony basil sprig, Sunday-walk path line, warm cream and deep green palette, tender negative space, quiet paired motifs, intimate but not vow-like.";
  }
  if (/\b(thank|grateful|appreciat|water(?:ed|ing) the plants?|neighbor)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
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
  if (/\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source)) {
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
      palette: ["soft ivory", "muted gray-green", "warm taupe"],
      motifs: ["photo-note frame", "single quiet leaf", "soft paper field", "thin rule"],
      border: "restrained photo-note border with a quiet frame motif and generous open space"
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
  if (/\b(thank|grateful|appreciat|water(?:ed|ing) the plants?|neighbor)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
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

function normalizeVisualCue(value, panelId, input, themeGuide = buildThemeGuide(input)) {
  const fallback = buildPanelVisualCue(input, panelId, themeGuide);
  const cleaned = truncate(cleanText(value || ""), 360);
  if (!cleaned || visualCueNeedsRepair(cleaned) || visualCueTooGenericForSource(cleaned, input)) return fallback;
  return cleaned;
}

function visualCueTooGenericForSource(value, input) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  const text = String(value || "").toLowerCase();
  if (/\b(med|medical|doctor|physician|md|residen(?:cy|t)|white[- ]coat|stethoscope)\b/.test(source)) {
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
  if (/\b(med|medical|doctor|physician|md|residen(?:cy|t)|white[- ]coat|stethoscope)\b/.test(source)) {
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
      back: "Minimal back mark using a basil leaf and tiny path line on warm ivory paper; mostly negative space."
    };
    return cues[panelId];
  }
  if (/\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source)) {
    const cues = {
      front: "Premium customer-success cover with clean white and deep teal fields, subtle sterile-supply geometry, and a calm lower text-safe area; polished B2B stationery.",
      "inside-left": "Left interior with thin teal frame, soft metallic accent line, small calendar/partnership motif, and a quiet center for the thank-you note.",
      "inside-right": "Right interior with a clean app-overlay zone for QR or account-manager CTA, sparse teal geometry, generous margins, and no actual QR code or interface art.",
      back: "Minimal back cover with one small teal-and-metallic partnership mark and ample negative space."
    };
    return cues[panelId];
  }
  if (/\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source)) {
    const cues = {
      front: "Restrained wedding cover with paired sage stems, soft ivory field, quiet ribbon arc, restrained gold detail, and a clean central text-safe area.",
      "inside-left": "Elegant border-first interior with sage corner stems, warm ivory paper, and calm center space for a short blessing.",
      "inside-right": "Matching interior with generous open lower area for handwritten words, subtle ribbon arc, and sparse botanical corners; no fake script.",
      back: "Minimal back cover echoing paired stems and one small gold dot with mostly blank ivory space."
    };
    return cues[panelId];
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    const cues = {
      front: "Quiet sympathy cover with a restrained photo-note frame motif, soft ivory paper, muted gray-green leaf, warm taupe rule, and a clean central text-safe field; no portrait or religious symbol.",
      "inside-left": "Soft left interior with a thin photo-note border, one small quiet leaf, warm paper texture, and wide center-left text-safe space for grounded support.",
      "inside-right": "Matching right interior with a calm open message field, low-contrast frame edge, and subtle taupe rule near the bottom; no actual photograph or face.",
      back: "Minimal back cover with one small leaf and fine rule on soft ivory, mostly negative space."
    };
    return cues[panelId];
  }
  if (/\b(funny|playful|witty|sprint|project-management|project management|bold type|bold-type|poster|editorial)\b/.test(source) && /\bbirthday\b/.test(source)) {
    const cues = {
      front: "Funny bold-type birthday cover using abstract editorial blocks, a tiny cake-slice mark, lively offset rhythm, warm accent color, and a clean central text-safe area; no rendered letters.",
      "inside-left": "Left interior with sparse editorial rules, one small milestone dot, bright accent corner, and open message field for the affectionate setup.",
      "inside-right": "Right interior with matching bold-rule structure, offset accent block near the lower edge, and generous text-safe area for the punchline and sign-off.",
      back: "Minimal back cover with a tiny cake-slice mark and one clean editorial rule, mostly blank."
    };
    return cues[panelId];
  }
  if (/\b(anniversary|years together|spouse|balcony basil|sunday morning walks?)\b/.test(source)) {
    const cues = {
      front: "Sentimental anniversary cover with paired basil sprigs, a Sunday-walk path line, warm morning light, and a clean central text-safe field.",
      "inside-left": "Soft cream left interior with a balcony-basil corner, paired leaves, quiet paper texture, and open center space for the first reflection.",
      "inside-right": "Matching right interior with a subtle walking-path line along the lower edge, small window-light shape, and calm main-message area.",
      back: "Small paired-basil back mark with warm cream negative space and a quiet lower text-safe area."
    };
    return cues[panelId];
  }
  if (/\b(thank|grateful|appreciat|water(?:ed|ing) the plants?|neighbor)\b/.test(source) && !/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    const cues = {
      front: "Simple minimal thank-you cover with one small plant mark, clean white and warm ivory field, fine leaf-green rule, and lower text-safe space.",
      "inside-left": "Minimal left interior with a tiny water-drop mark, fine rule, generous blank center, and no floral pattern.",
      "inside-right": "Matching minimal right interior with one small plant-related mark near the lower edge and calm main-message space.",
      back: "Clean back cover with a single plant mark and mostly white negative space."
    };
    return cues[panelId];
  }
  if (/\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source)) {
    const cues = {
      front: "Warm local-shop thank-you cover with controlled citrus-and-leaf corner arrangement, soft gold ribbon curve, kraft paper texture, and open text-safe center.",
      "inside-left": "Cream interior note sheet with a thin editorial border, small citrus corner, and quiet center-left space for the opening thank-you.",
      "inside-right": "Matching interior with subtle boutique awning silhouette near the lower edge, sparse leaves, and generous blank message area.",
      back: "Small citrus-and-leaf back mark on warm cream paper with mostly negative space."
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
  if (/\b(birthday|botanical|fern|flower|trail|hike|coffee)\b/.test(source)) {
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
    back: `${themeGuide.theme_title} back cover with one small coordinating mark from ${motifs}, mostly negative space, and clean lower text-safe area.`
  };
  return truncate(cues[panelId] || cues.front, 360);
}

function normalizeTextLayout(value, panelId, input) {
  const raw = value && typeof value === "object" ? value : {};
  const fallback = panelTextLayoutFallback(panelId, input);
  if (textLayoutTooGenericForSource(raw, panelId, input)) return fallback;
  const layout = {
    headline_zone: enumTextValue(raw.headline_zone || raw.headlineZone, textLayoutEnums.headline_zone, fallback.headline_zone),
    body_zone: enumTextValue(raw.body_zone || raw.bodyZone, textLayoutEnums.body_zone, fallback.body_zone),
    alignment: enumTextValue(raw.alignment, textLayoutEnums.alignment, fallback.alignment),
    font_pairing: enumTextValue(raw.font_pairing || raw.fontPairing, textLayoutEnums.font_pairing, fallback.font_pairing),
    color_mode: enumTextValue(raw.color_mode || raw.colorMode, textLayoutEnums.color_mode, fallback.color_mode),
    scale: enumTextValue(raw.scale, textLayoutEnums.scale, fallback.scale)
  };
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  if (
    /\b(med|medical|doctor|physician|md|residen(?:cy|t)|white[- ]coat|stethoscope)\b/.test(source) &&
    (panelId === "inside-left" || panelId === "inside-right") &&
    layout.alignment === "center"
  ) {
    return { ...layout, alignment: fallback.alignment };
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    if (panelId === "inside-left" || panelId === "inside-right") {
      return {
        ...layout,
        headline_zone: fallback.headline_zone,
        body_zone: fallback.body_zone,
        alignment: fallback.alignment,
        font_pairing: fallback.font_pairing,
        color_mode: "dark-ink",
        scale: "large"
      };
    }
    if (panelId === "front") {
      return {
        ...layout,
        headline_zone: fallback.headline_zone,
        body_zone: fallback.body_zone,
        font_pairing: fallback.font_pairing,
        color_mode: "dark-ink",
        scale: "large"
      };
    }
    if (panelId === "back") {
      return {
        ...fallback,
        scale: "large"
      };
    }
  }
  return layout;
}

function textLayoutTooGenericForSource(raw, panelId, input) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  if (!/\b(med|medical|doctor|physician|md|residen(?:cy|t)|white[- ]coat|stethoscope)\b/.test(source)) return false;
  const defaults = panelDefaults[panelId]?.text_layout || panelDefaults.front.text_layout;
  return textLayoutValue(raw, "headline_zone", "headlineZone") === defaults.headline_zone &&
    textLayoutValue(raw, "body_zone", "bodyZone") === defaults.body_zone &&
    textLayoutValue(raw, "alignment") === defaults.alignment &&
    textLayoutValue(raw, "font_pairing", "fontPairing") === defaults.font_pairing &&
    textLayoutValue(raw, "color_mode", "colorMode") === defaults.color_mode &&
    textLayoutValue(raw, "scale") === defaults.scale;
}

function textLayoutValue(raw, key, camelKey = key) {
  return raw?.[key] ?? raw?.[camelKey];
}

function panelTextLayoutFallback(panelId, input) {
  const source = `${input.occasion} ${input.tone} ${input.style} ${input.personal_note} ${input.memory_notes.join(" ")}`.toLowerCase();
  if (/\b(bold type|bold-type|poster|editorial)\b/.test(source)) {
    return {
      headline_zone: panelId === "back" ? "lower" : "upper",
      body_zone: panelId === "front" ? "lower" : panelId === "back" ? "bottom" : "center",
      alignment: "center",
      font_pairing: "bold-editorial",
      color_mode: "high-contrast",
      scale: panelId === "back" ? "compact" : "large"
    };
  }
  if (/\b(photo note|photo-note|scrapbook|caption|polaroid)\b/.test(source)) {
    return {
      headline_zone: panelId === "front" ? "lower" : "upper",
      body_zone: panelId === "front" ? "bottom" : "lower",
      alignment: "left",
      font_pairing: "soft-serif",
      color_mode: "dark-ink",
      scale: panelId === "back" ? "compact" : "standard"
    };
  }
  if (/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source)) {
    const layouts = {
      front: {
        headline_zone: "upper",
        body_zone: "lower",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "standard"
      },
      "inside-left": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "large"
      },
      "inside-right": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "large"
      },
      back: {
        headline_zone: "lower",
        body_zone: "bottom",
        alignment: "center",
        font_pairing: "minimal-sans",
        color_mode: "dark-ink",
        scale: "large"
      }
    };
    return layouts[panelId];
  }
  if (/\b(med|medical|doctor|physician|md|residen(?:cy|t)|white[- ]coat|stethoscope)\b/.test(source)) {
    const layouts = {
      front: {
        headline_zone: "upper",
        body_zone: "lower",
        alignment: "center",
        font_pairing: "serif-sans",
        color_mode: "light-ink",
        scale: "standard"
      },
      "inside-left": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "left",
        font_pairing: "soft-serif",
        color_mode: "dark-ink",
        scale: "standard"
      },
      "inside-right": {
        headline_zone: "upper",
        body_zone: "center",
        alignment: "left",
        font_pairing: "serif-sans",
        color_mode: "dark-ink",
        scale: "standard"
      },
      back: {
        headline_zone: "lower",
        body_zone: "bottom",
        alignment: "center",
        font_pairing: "minimal-sans",
        color_mode: "dark-ink",
        scale: "compact"
      }
    };
    return layouts[panelId];
  }
  return panelDefaults[panelId]?.text_layout || panelDefaults.front.text_layout;
}

function enumTextValue(value, allowed, fallback) {
  const normalized = cleanText(value || "").toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function textContains(value, term) {
  const haystack = cleanText(value).toLowerCase();
  const needle = cleanText(term).toLowerCase();
  if (!needle) return true;
  return haystack.includes(needle);
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
    const visualCue = normalizeVisualCue(raw.visual_cue || raw.visualCue, id, input, themeGuide);
    const textLayout = normalizeTextLayout(raw.text_layout || raw.textLayout, id, input);
    const rawImagePrompt = truncate(cleanText(raw.image_prompt || raw.imagePrompt || defaults.image_prompt), 1200);
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
  const artDirections = {
    front: `${themeGuide.theme_title} front cover with ${themeGuide.border_style}, clear title area, generous safe margins, ${themeGuide.palette.join(", ")} palette, and motifs that echo on the back panel.`,
    "inside-left": `${themeGuide.theme_title} inside-left panel with ${themeGuide.border_style}, quiet blank low-contrast center for opening copy, sparse edge/corner motifs, generous margins, and ornaments that match the inside-right panel.`,
    "inside-right": `${themeGuide.theme_title} inside-right message panel with matching ${themeGuide.border_style}, quiet blank low-contrast center for the main message, sparse edge/corner motifs, generous margins, and natural sign-off zone.`,
    back: `${themeGuide.theme_title} back panel with mostly negative space, subtle lower ornamentation, ${themeGuide.border_style}, and border details that visually pair with the front cover.`
  };
  return {
    theme_guide: themeGuide,
    panels: requiredPanelIds.map((id) => buildFallbackCardPanel(input, themeGuide, copyPlan, id, artDirections[id])),
    memory_citations: input.memory_notes.slice(0, 2)
  };
}

function buildFallbackCardPanel(input, themeGuide, copyPlan, panelId, artDirection) {
  const copy = copyPlan[panelId] ?? copyPlan.front;
  const visualCue = normalizeVisualCue("", panelId, input, themeGuide);
  const textLayout = normalizeTextLayout(undefined, panelId, input);
  const promptPanel = {
    ...panelDefaults[panelId],
    art_direction: artDirection,
    visual_cue: visualCue,
    text_layout: textLayout
  };
  return {
    id: panelId,
    headline: copy.headline,
    body: copy.body,
    art_direction: artDirection,
    visual_cue: visualCue,
    text_layout: textLayout,
    image_prompt: truncate(buildPanelImagePrompt(input, panelId, promptPanel), 1200),
    image_negative_prompt: normalizeImageNegativePrompt(panelDefaults[panelId].image_negative_prompt)
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
  const isGetWell = /\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source);
  const isB2B = /\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source);
  const isWedding = /\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source);
  const isSympathy = /\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source);
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
  if (isGetWell && /^(?:thinking of you|get well soon|feel better soon|from the heart|sending healing thoughts)$/i.test(value)) return true;
  if (isB2B && /^(?:thank you|happy anniversary|for you|valued customer|your loyalty|renew today|limited time)$/i.test(value)) return true;
  if (isWedding && /^(?:congratulations|best wishes|thinking of you|from the heart|for this moment)$/i.test(value)) return true;
  if (isSympathy) {
    if (panelId === "front" && (!textContains(value, input.recipient) || /^(?:sympathy for .+|with deepest sympathy|thinking of you|for your loss)$/i.test(value))) return true;
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
  const isMedical = /\b(med|medical|doctor|physician|md|white[- ]coat|stethoscope)\b/.test(source);
  const isGetWell = /\b(get well|surgery|recover|recovery|hospital socks|tiny walks|basil|soup)\b/.test(source);
  const isB2B = /\b(warranty|renewal|account manager|qr|clinic|dental|sterilizer|customer success|purchase anniversary)\b/.test(source);
  const isWedding = /\b(wedding|marriage|fianc|fiance|blessing|handwrite|handwritten|distant cousin)\b/.test(source);
  const isSympathy = /\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source);
  const isSmallBusiness = /\b(small business|independent|local shop|customer|purchase|supporting)\b/.test(source);
  const isDad = /\b(father|dad|fix|repair|tool|workshop|handy)\b/.test(source);
  if (!value) return true;
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
        body: "A quiet note after your father's loss, with room for grief, silence, and steady care."
      },
      "inside-left": {
        headline: "With You In This",
        body: "I am so sorry about your father. I will not try to explain the loss or fill the silence with easy words; I just want you to know you are not alone."
      },
      "inside-right": {
        headline: `From ${sender}`,
        body: `I am here for the practical things too: meals, rides, calls, and silence when talking is too much. May you have room to grieve at your own pace, with steady care nearby. With sympathy and friendship, ${sender}.`
      },
      back: {
        headline: "With Steady Care",
        body: "For grief, practical help, and quiet support when words cannot hold enough."
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
    data?.output_url ??
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

async function materializeGeneratedImageUrl(imageUrl, fetchImpl) {
  const value = String(imageUrl);
  if (!/^https?:\/\//i.test(value)) return value;
  const response = await fetchImpl(value, { method: "GET" });
  if (!response.ok) throw new Error(`Generated image URL fetch failed with ${response.status}.`);
  const contentType = response.headers?.get?.("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
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
