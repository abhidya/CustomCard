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
const embeddedAssetDataUrlCache = new Map();
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

      if (!copyFlow.readyForLiveCalls) {
        const providerFailure = copyFlow.blockedReasons[0] ?? "Live card-copy provider is disabled.";
        return providerUnavailableResponse({
          statusCode: 503,
          flowKey: "card_copy",
          flow: copyFlow,
          providerFailure,
          providerCallEvents
        });
      }

      const textReservation = await costGate.reserve(
        aiCostGateInput({
          flow: copyFlow,
          requestContext,
          routeId: aiCardGenerateRoute,
          requestUnits: 1,
          phase: "card-copy"
        })
      );
      providerCallEvents.push(textReservation.event);
      if (!textReservation.ok) {
        return providerUnavailableResponse({
          statusCode: textReservation.statusCode ?? 503,
          flowKey: "card_copy",
          flow: copyFlow,
          providerFailure: textReservation.providerFailure,
          providerCallEvents,
          extraPayload: textReservation.payload
        });
      }

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
        providerCallEvents.push(await costGate.settle(textReservation.reservation, { status: "succeeded" }));
      } catch (error) {
        const providerFailure = error instanceof Error ? error.message : "Provider text generation failed.";
        providerCallEvents.push(
          await costGate.settle(textReservation.reservation, {
            status: "failed",
            errorClass: "provider-text-generation-failed",
            metadata: { providerFailure }
          })
        );
        return providerUnavailableResponse({
          statusCode: 502,
          flowKey: "card_copy",
          flow: copyFlow,
          providerFailure,
          providerCallEvents
        });
      }

      if (!imageFlow.readyForLiveCalls) {
        return buildCardGenerationPayload({
          draftInput,
          cardCopy,
          images: [],
          copyFlow,
          imageFlow,
          imageProvider: "",
          imageProviderFailure: imageFlow.blockedReasons[0] ?? "Live card-image provider is disabled.",
          providerCallEvents
        });
      }

      const imagePromptPlan = buildImagePromptPlan(draftInput, cardCopy);
      const imageReservation = await costGate.reserve(
        aiCostGateInput({
          flow: imageFlow,
          requestContext,
          routeId: aiCardGenerateRoute,
          requestUnits: imagePromptPlan.length,
          phase: "card-image",
          metadata: { panelCount: imagePromptPlan.length }
        })
      );
      providerCallEvents.push(imageReservation.event);
      if (!imageReservation.ok) {
        return providerUnavailableResponse({
          statusCode: imageReservation.statusCode ?? 503,
          flowKey: "card_image",
          flow: imageFlow,
          providerFailure: imageReservation.providerFailure,
          providerCallEvents,
          extraPayload: {
            ...imageReservation.payload,
            draft_id: buildDraftId(draftInput),
            card_copy: cardCopy,
            images: [],
            ai_flow: {
              card_copy: publicFlowState(copyFlow, copyFlow.primaryAdapterId, "")
            }
          }
        });
      }

      const images = [];
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
        if (images.length !== imagePromptPlan.length) {
          throw new Error("Image provider returned " + images.length + " of " + imagePromptPlan.length + " required panels.");
        }
        providerCallEvents.push(
          await costGate.settle(imageReservation.reservation, {
            status: "succeeded",
            metadata: { generatedPanelCount: images.length }
          })
        );
      } catch (error) {
        const providerFailure = error instanceof Error ? error.message : "Provider image generation failed.";
        providerCallEvents.push(
          await costGate.settle(imageReservation.reservation, {
            status: "failed",
            errorClass: "provider-image-generation-failed",
            metadata: { providerFailure, generatedPanelCount: images.length }
          })
        );
        return providerUnavailableResponse({
          statusCode: 502,
          flowKey: "card_image",
          flow: imageFlow,
          providerFailure,
          providerCallEvents,
          extraPayload: {
            draft_id: buildDraftId(draftInput),
            card_copy: cardCopy,
            images: [],
            ai_flow: {
              card_copy: publicFlowState(copyFlow, copyFlow.primaryAdapterId, "")
            }
          }
        });
      }

      return buildCardGenerationPayload({
        draftInput,
        cardCopy,
        images,
        copyFlow,
        imageFlow,
        imageProvider: imageFlow.primaryAdapterId,
        providerCallEvents
      });
    },

    async respondChat(body, requestContext = {}) {
      const adminConfig = runtimeAiFlowConfig(body, env, requestContext);
      const flow = resolveAiFlowConfig("customer-chat", env, adminConfig);

      const input = normalizeChatInput(body);
      const providerCallEvents = [];
      let assistantMessage;

      if (!flow.readyForLiveCalls) {
        const providerFailure = flow.blockedReasons[0] ?? "Live customer-chat provider is disabled.";
        return providerUnavailableResponse({
          statusCode: 503,
          flowKey: "customer_chat",
          flow,
          providerFailure,
          providerCallEvents
        });
      }

      const reservation = await costGate.reserve(
        aiCostGateInput({
          flow,
          requestContext,
          routeId: aiChatRespondRoute,
          requestUnits: 1,
          phase: "customer-chat"
        })
      );
      providerCallEvents.push(reservation.event);
      if (!reservation.ok) {
        return providerUnavailableResponse({
          statusCode: reservation.statusCode ?? 503,
          flowKey: "customer_chat",
          flow,
          providerFailure: reservation.providerFailure,
          providerCallEvents,
          extraPayload: reservation.payload
        });
      }

      try {
        assistantMessage = await executeTextProvider({
          flow,
          env,
          fetchImpl,
          systemPrompt: flow.promptInstructions,
          userPrompt: buildChatPrompt(input)
        });
        providerCallEvents.push(await costGate.settle(reservation.reservation, { status: "succeeded" }));
      } catch (error) {
        const providerFailure = error instanceof Error ? error.message : "Provider chat generation failed.";
        providerCallEvents.push(
          await costGate.settle(reservation.reservation, {
            status: "failed",
            errorClass: "provider-chat-generation-failed",
            metadata: { providerFailure }
          })
        );
        return providerUnavailableResponse({
          statusCode: 502,
          flowKey: "customer_chat",
          flow,
          providerFailure,
          providerCallEvents
        });
      }

      return {
        statusCode: 200,
        payload: {
          status: "succeeded",
          assistant_message: truncate(cleanText(assistantMessage), 900),
          ai_flow: {
            customer_chat: publicFlowState(flow, flow.primaryAdapterId, "")
          },
          provider_call_events: publicProviderCallEvents(providerCallEvents),
          ai_cost_gate: publicCostGateSummary(providerCallEvents),
          live_provider_calls_enabled: hasLiveProviderEvent(providerCallEvents),
          fallback_queued: false,
          external_network_calls: hasExternalNetworkEvent(providerCallEvents)
        }
      };
    }
  };
}

function buildCardGenerationPayload({
  draftInput,
  cardCopy,
  images,
  copyFlow,
  imageFlow,
  imageProvider,
  imageProviderFailure,
  providerCallEvents
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
        card_copy: publicFlowState(copyFlow, copyFlow.primaryAdapterId, ""),
        card_image: publicFlowState(imageFlow, imageProvider, imageProviderFailure)
      },
      provider_call_events: publicProviderCallEvents(providerCallEvents),
      ai_cost_gate: publicCostGateSummary(providerCallEvents),
      live_provider_calls_enabled: hasLiveProviderEvent(providerCallEvents),
      fallback_queued: false,
      external_network_calls: hasExternalNetworkEvent(providerCallEvents)
    }
  };
}

function providerUnavailableResponse({ statusCode, flowKey, flow, providerFailure, providerCallEvents, extraPayload = {} }) {
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
        [flowKey]: publicFlowState(flow, flow.readyForLiveCalls ? flow.primaryAdapterId : "", providerFailure)
      },
      provider_call_events: publicProviderCallEvents(providerCallEvents),
      ai_cost_gate: publicCostGateSummary(providerCallEvents),
      live_provider_calls_enabled: hasLiveProviderEvent(providerCallEvents),
      fallback_queued: false,
      external_network_calls: hasExternalNetworkEvent(providerCallEvents)
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

  if (flow.primaryAdapterId === "huggingface-image") {
    const request = buildHuggingFaceImageRequestBody({ flow, env, panelId, prompt, negativePrompt });
    const response = await fetchWithProviderBackoff(
      fetchImpl,
      request.url,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${requiredEnv(env, "HUGGINGFACE_API_TOKEN")}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(request.body)
      },
      { retries: flow.maxRetries, baseDelayMs: 1500, maxDelayMs: 5000 }
    );
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (!response.ok) {
      throw new Error(`Hugging Face image provider returned ${response.status}: ${await readProviderError(response, contentType)}.`);
    }
    if (contentType.startsWith("image/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }
    const data = await response.json().catch(() => undefined);
    return materializeGeneratedImageUrl(extractImageUrl(data, contentType || "image/png"), fetchImpl);
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

function buildCloudflareImageRequestBody({ flow, panelId, prompt, negativePrompt }) {
  const providerPrompt = buildCloudflareImagePrompt({ panelId, prompt });
  const providerNegativePrompt = buildCloudflareNegativePrompt({ negativePrompt, prompt });
  if (isCloudflareFluxModel(flow.model)) {
    return {
      prompt: truncate(providerPrompt, 1600),
      steps: 8
    };
  }
  return {
    prompt: providerPrompt,
    negative_prompt: providerNegativePrompt,
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

function buildCloudflareImagePrompt({ panelId, prompt }) {
  if (!isQuietCarePrompt(prompt)) return prompt;
  const role = panelId === "front" ? "front cover" : panelId === "back" ? "back cover" : `${panelId} interior`;
  const shared =
    "Premium flat 2D vertical 5x7 greeting-card panel artwork, print-ready editorial paper-cut illustration, vector-poster flatness, no camera, no physical paper mockup, no tabletop scene, no open book, no page seam, no real room, no floor, no wall, no people, no hands, no faces, no readable text, no letters, no tiny glyphs, no labels, no logos, no watermark.";
  if (panelId === "front") {
    return [
      shared,
      `${role}: deep moss field, warm title-safe glow in upper middle, lower-third practical-care vignette made from paper-cut shapes: sealed meal container, folded cloth, blank note card, and muted phone silhouette with blank screen, all as one quiet support cluster; sophisticated negative space, no door, no table, no room, no waves, no road, no landscape.`
    ].join(" ");
  }
  if (panelId === "back") {
    return [
      shared,
      `${role}: mostly deep moss negative space, small lower-corner echo of the care vignette as simple ivory/taupe paper-cut sealed container and blank note shapes, subtle paper grain, premium stationery finish, open center with no decoration, no door, no table, no room, no waves or landscape.`
    ].join(" ");
  }
  return [
    shared,
    `${role}: warm ivory interior, huge plain central negative space for later typography, small low-contrast practical-care vignette only along lower outside edge, sealed meal container, folded cloth, blank note card, quiet path curve for rides, muted moss line accents, soft taupe paper layers, generous margins, calm paired interior spread, no open book, no page seam, no waves or landscape.`
  ].join(" ");
}

function buildCloudflareNegativePrompt({ negativePrompt, prompt }) {
  const base = isQuietCarePrompt(prompt)
    ? "readable text, fake text, letters, words, handwriting, calligraphy, signature, label, logo, watermark, tiny glyphs, small symbols, people, face, portrait, hands, body, folded card mockup, physical card mockup, open book, book, paper fold, crease line, page seam, wall floor corner, room, wall, floor, door, window, envelope, tabletop scene, table, desk, product photo, frame, QR code, busy background, car, vehicle, road, highway, lane line, landscape, horizon, hills, mountains, river, ocean, waves, sunset, cup, pot, key, visible food, fruit, cans, jars, package labels, screen text, phone app interface, hospital, religious symbols"
    : negativePrompt;
  return truncate(base || negativePrompt || "", 700);
}

function isQuietCarePrompt(prompt) {
  return /\b(sympathy|condolence|grieving|grief|quiet[- ]support|quiet care|father'?s loss|losing (?:a|his|her|their) father|threshold-light|care-package)\b/i.test(
    String(prompt || "")
  );
}

function isCloudflareFluxModel(model) {
  return String(model || "").includes("/flux-1-schnell");
}

function buildHuggingFaceImageRequestBody({ flow, env, panelId, prompt, negativePrompt }) {
  const provider = String(env.CUSTOMCARD_HUGGINGFACE_IMAGE_PROVIDER || "fal-ai").trim() || "fal-ai";
  const route = huggingFaceImageRoute(flow.model, provider);
  const seed = numericSeed(`${flow.model}:${panelId}:${prompt}`) % 2147483647;
  if (route.payloadFormat === "hf-inference") {
    return {
      url: route.url,
      body: {
        inputs: truncate(prompt, 2048),
        parameters: {
          negative_prompt: truncate(negativePrompt, 700),
          width: 1024,
          height: 1536,
          num_inference_steps: 8,
          seed
        }
      }
    };
  }
  return {
    url: route.url,
    body: {
      prompt: truncate(prompt, 2048),
      negative_prompt: truncate(negativePrompt, 700),
      image_size: {
        width: 1024,
        height: 1536
      },
      num_inference_steps: 8,
      seed
    }
  };
}

function huggingFaceImageRoute(model, provider) {
  if (provider === "hf-inference") {
    return {
      url: `https://router.huggingface.co/hf-inference/models/${String(model || "").trim()}`,
      payloadFormat: "hf-inference"
    };
  }
  const providerModel = huggingFaceImageProviderModel(model, provider);
  return {
    url: `https://router.huggingface.co/${provider}/${providerModel}`,
    payloadFormat: provider
  };
}

function huggingFaceImageProviderModel(model, provider) {
  const modelId = String(model || "").trim();
  const mappings = {
    "fal-ai": {
      "black-forest-labs/FLUX.1-schnell": "fal-ai/flux/schnell",
      "Qwen/Qwen-Image": "fal-ai/qwen-image",
      "Qwen/Qwen-Image-2512": "fal-ai/qwen-image-2512",
      "Tongyi-MAI/Z-Image-Turbo": "fal-ai/z-image/turbo"
    },
    replicate: {
      "black-forest-labs/FLUX.1-schnell": "black-forest-labs/flux-schnell",
      "Qwen/Qwen-Image": "qwen/qwen-image",
      "Tongyi-MAI/Z-Image-Turbo": "prunaai/z-image-turbo"
    }
  };
  return mappings[provider]?.[modelId] ?? modelId;
}

function numericSeed(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

async function readProviderError(response, contentType) {
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => undefined);
    return data?.error?.message || data?.error || data?.message || data?.detail || data?.status || "request failed";
  }
  return (await response.text().catch(() => "")).slice(0, 300) || "request failed";
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
      negative_prompt: normalizePanelImageNegativePrompt(panel.image_negative_prompt, input)
    };
  });
}

function isSympathyInput(input) {
  const source = `${input?.occasion || ""} ${input?.tone || ""} ${input?.style || ""} ${input?.personal_note || ""} ${(input?.memory_notes || []).join(" ")}`.toLowerCase();
  return /\b(sympathy|condolence|loss|grieving|grief|quiet support|losing (?:a|his|her|their) father|father'?s loss)\b/.test(source);
}

function buildPanelImagePrompt(input, panelId, panel) {
  const isSympathy = isSympathyInput(input);
  const panelInstruction = (isSympathy
      ? {
        front:
          "Full-bleed flat 2D practical-care sympathy illustration for the front of a premium vertical 5x7 print panel; deep moss field, warm title-safe glow, and one lower paper-cut care vignette.",
        "inside-left":
          "Full-bleed flat 2D practical-care sympathy illustration for a vertical 5x7 inside-left panel; warm ivory open field, generous center text area, and one small lower-edge care vignette.",
        "inside-right":
          "Full-bleed flat 2D practical-care sympathy illustration for a vertical 5x7 inside-right panel; matching warm ivory open field, generous center text area, and one mirrored lower-edge care vignette.",
        back:
          "Full-bleed flat 2D practical-care sympathy illustration for a minimal vertical 5x7 back panel; deep moss field, readable upper/center text-safe area, and one small lower care-vignette echo."
      }
    : {
        front:
          "Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep an integrated clean lower or central text-safe area, no caption plaque, and avoid all-over motif wallpaper.",
        "inside-left":
          "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; light ivory or cream low-contrast note-sheet field, border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet blank center, clean text-safe area, generous safe margins, no inner text box.",
        "inside-right":
          "Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching light ivory or cream low-contrast note-sheet field, border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet blank center, clean text-safe area, generous safe margins, no inner text box.",
        back:
          "Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo, no caption plaque."
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
    "Safety constraints: no readable text, no words, no letters, no numbers, no handwriting, no labels, No people, No hands, no logos, no watermark, no physical card mockup.",
    visualBrief,
    `Use this panel-specific composition: ${visualCue}`,
    `Keep natural negative space for app-rendered typography in the ${textSafeCue}; do not draw words, labels, or handwriting.`,
    isSympathy
      ? "Artwork layer only, not a photographed object. Avoid blank-message templates, ruled sheets, closed frames, card-within-card layouts, mockup frames, tables, envelopes, labels, signs, blank tags, text boxes, and shadowed sheets. Premium print-ready flat artwork, full-bleed 2D composition, minimal clutter, disciplined negative space, no all-over repeating wallpaper pattern, generous safe margins, no readable text, no words, no letters, no numbers, no handwriting, no calligraphy, no faux script, no fake text, no logos, no watermark."
      : "Artwork layer only, not a physical card or photographed paper. No caption plaque, no inner card rectangle, no mockup frame, no table, no envelope, no label, no sign, no blank tag, no text box, no shadowed paper sheet. Decorative print borders are allowed. Premium print-ready flat artwork, full-bleed 2D composition, minimal clutter, disciplined negative space, no all-over repeating wallpaper pattern, generous safe margins, no readable text, no words, no letters, no numbers, no handwriting, no calligraphy, no faux script, no fake text, no logos, no watermark."
  ].join(" ");
}

function buildSympathyImagePrompt({ panelInstruction, visualBrief, visualCue, textSafeCue }) {
  return [
    panelInstruction,
    "Artwork layer only, flat 2D editorial illustration, not a photo, not a physical card, not a book, not a page.",
    `Text contract: keep the ${textSafeCue} empty, plain, low-contrast, and free of objects; put all artwork below or outside that field.`,
    "Use one cohesive paper-cut practical-care vignette: sealed meal container, folded cloth, blank note card, muted phone silhouette with blank screen, and quiet path curve for rides; make it tasteful, not icon clipart.",
    "No cars, keys, visible food, fruit, flowers, vases, urns, table settings, window bars, ornate frames, dense line art, thickets, wallpaper, page seams, or closed blank-message template.",
    "No readable text, words, letters, numbers, handwriting, labels, fake text, people, hands, logos, watermark, mockup, envelope, or tabletop scene.",
    visualBrief,
    `Panel cue: ${visualCue}`,
    "Palette: warm ivory, muted gray-green, deep moss, soft taupe; quiet practical sympathy, no religious symbols unless requested."
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
  if (isSympathyInput(input)) {
    guardrails.push("Sympathy art must keep a plain text field and use only sparse lower-edge support objects; no fruit, flowers, vases, urns, table settings, window bars, ornate frames, or line-art thickets.");
  }
  if (panelId.startsWith("inside") && !/\b(?:ivory|cream|paper|note-sheet|light|low-contrast)\b/i.test(base)) {
    guardrails.push(
      isSympathyInput(input)
        ? "Use a light warm-ivory low-contrast open field for the interior; keep artwork on edges and preserve a quiet blank center."
        : "Use a light ivory or cream low-contrast note-sheet field for the interior unless the user explicitly requested a dark interior."
    );
  }
  if (!/\bnot (?:a )?(?:physical|photographed|mockup|photo)\b/i.test(base)) {
    guardrails.push("Not a photo, not a physical paper card, not a folded card mockup, not a tabletop scene, not a product photograph.");
  }
  return truncate([base, ...guardrails].join(" "), 1800);
}

function imagePromptNeedsRepair(prompt, panelId, input, panel) {
  return imagePromptHasUnsafeSubject(prompt) ||
    imagePromptLeaksAppCopy(prompt) ||
    sympathyImagePromptNeedsRepair(prompt, input) ||
    imagePromptConflictsWithPanelRole(prompt, panelId) ||
    imagePromptIsUnderspecified(prompt, panelId, input, panel);
}

function sympathyImagePromptNeedsRepair(prompt, input) {
  if (!isSympathyInput(input)) return false;
  return /\b(?:photo[- ]note|note[- ]sheet|border[- ]first|stationery design|framed blank page|blank page|ruled paper|paper field|paper texture|thin refined frame|frame motif|closed frame)\b/i.test(prompt);
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
        "trees",
        "artist signature"
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
    return "Reverent practical-care sympathy artwork: deep moss front/back, warm ivory interiors, lower-edge paper-cut care vignette with sealed meal container, folded cloth, blank note card, muted phone silhouette, quiet path curve, and large calm text fields; no people, fake text, fruit, flowers, vases, urns, table settings, religious symbols unless requested, cliches, or blank-message template.";
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
      palette: ["warm ivory", "muted gray-green", "deep moss", "soft taupe"],
      motifs: ["practical-care vignette", "sealed meal container", "folded cloth", "blank note card", "muted phone silhouette", "quiet path curve"],
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
      front: "Premium quiet-support sympathy cover: deep moss field, warm upper title-safe glow, and one lower paper-cut practical-care vignette with sealed meal container, folded cloth, blank note card, and muted phone silhouette; no clipart, cars, fake text, or labels.",
      "inside-left": "Soft left interior with warm ivory plain center text-safe space and a small lower-left practical-care vignette below the copy area: sealed meal container, folded cloth, blank note card, quiet path curve; no page seam, fake text, cars, fruit, flowers, or table setting.",
      "inside-right": "Matching right interior with warm ivory plain center text-safe space and mirrored lower-right care vignette: blank note card, muted phone silhouette, folded cloth, quiet path curve for rides; no page seam, fake text, route labels, cars, fruit, flowers, or table setting.",
      back: "Minimal deep moss back cover with readable upper/center text-safe area and one small lower practical-care echo: sealed container and blank note shapes; no urn, vase, fruit, flowers, table setting, physical paper card, car-like marks, fake text, or labels."
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
        color_mode: fallback.color_mode,
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
  if (!/\b(sympathy|condolence|loss|grieving|grief|quiet support)\b/.test(source) &&
    /\b(bold type|bold-type|poster|editorial)\b/.test(source)) {
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
        body_zone: "upper",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "light-ink",
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
        headline_zone: "upper",
        body_zone: "center",
        alignment: "center",
        font_pairing: "soft-serif",
        color_mode: "light-ink",
        scale: "standard"
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
    data?.images?.[0]?.url ??
    data?.images?.[0]?.image_url ??
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
