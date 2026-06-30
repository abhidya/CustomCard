import { lookup as lookupDns } from "node:dns/promises";
import { existsSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { isIP } from "node:net";
import { resolve } from "node:path";
import {
  adapterMissingEnv,
  modelForAiAdapter
} from "../src/aiFlowConfigData.mjs";
import {
  loadAiRouteActivationContext,
  resolveAiRouteActivation
} from "../src/aiRouteActivation.mjs";
import { createAiFlowCostGate } from "./ai-flow-cost-gate.mjs";
import {
  buildCardCopyPrompt,
  buildCardCopyResponseFormat,
  buildImagePromptPlan,
  createAiCardDraftPolicy,
  normalizeCardInput,
  normalizeCardCopy,
  repairMissingRequiredTermsInCardCopy,
  textContains,
  validateCardCopyContract
} from "./ai-card-draft-policy.mjs";
import {
  createAiProviderExecutionAdapter,
  openAiCompatibleTextAdapterIds
} from "./ai-provider-execution-adapter.mjs";
import {
  interpolateLocalComfyTemplate,
  localComfyTypographyVariables,
  localComfyWorkflowInputsForMetadata
} from "./local-comfy-production-text.mjs";
import {
  classifyProductionTextPlanner,
  productionTextPlannerPolicy
} from "./production-text-planner-policy.mjs";

export const aiCardGenerateRoute = "/api/ai/card/generate";
export const aiChatRespondRoute = "/api/ai/chat/respond";

const maxMaterializedImageBytes = 8_000_000;
const materializedImageFetchTimeoutMs = 15_000;
const defaultLocalLlmRequestTimeoutMs = 1_200_000;
const aiCardDraftPolicy = createAiCardDraftPolicy({ buildDraftId });
const embeddedAssetDataUrlCache = new Map();

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

export function createAiCardGenerationService({
  env = process.env,
  fetchImpl = globalThis.fetch,
  costGate = createAiFlowCostGate(),
  aiFlowAdminConfig = [],
  loadAiFlowAdminConfig
} = {}) {

  return {
    async generateCard(body, requestContext = {}) {
      const activationContext = await loadAiRouteActivationContext({
        env,
        body,
        requestContext,
        serviceAiFlowAdminConfig: aiFlowAdminConfig,
        loadAiFlowAdminConfig
      });
      const copyFlow = resolveAiRouteActivation("card-copy", activationContext).flow;
      const imageFlow = resolveAiRouteActivation("card-image", activationContext).flow;
      const draftInput = normalizeCardInput(body);
      const providerCallEvents = [];
      const productionTextGate = validateProductionTextPlannerForService({ copyFlow, imageFlow, env });
      if (!productionTextGate.ok) {
        return providerUnavailableResponse({
          statusCode: 503,
          flowKey: "card_copy",
          flow: copyFlow,
          adapterId: "",
          providerFailure: productionTextGate.providerFailure,
          providerCallEvents,
          extraPayload: {
            production_text_service: productionTextGate.runtime,
            production_text_policy: productionTextGate.policy
          }
        });
      }

      const copyResult = await generateValidatedCardCopy({
        flow: copyFlow,
        env,
        fetchImpl,
        costGate,
        requestContext,
        providerCallEvents,
        systemPrompt: copyFlow.promptInstructions,
        draftInput,
        responseFormat: buildCardCopyResponseFormat(copyFlow)
      });
      if (!copyResult.ok) {
        return providerUnavailableResponse({
          statusCode: copyResult.statusCode,
          flowKey: "card_copy",
          flow: copyFlow,
          adapterId: copyResult.adapterId,
          providerFailure: copyResult.providerFailure,
          providerCallEvents,
          fallbackQueued: copyResult.fallbackQueued,
          extraPayload: copyResult.extraPayload
        });
      }

      const cardCopy = copyResult.cardCopy;

      const imagePromptPlan = buildImagePromptPlan(draftInput, cardCopy);
      const serviceEvidence = buildServiceGenerationEvidence({
        draftInput,
        cardCopy,
        imagePromptPlan,
        copyFlow,
        imageFlow,
        env,
        productionTextGate
      });
      const imageResult = await executeImageProviderBatchWithFallback({
        flow: imageFlow,
        env,
        fetchImpl,
        costGate,
        requestContext,
        providerCallEvents,
        imagePromptPlan
      });
      const fallbackQueued = copyResult.fallbackQueued || imageResult.fallbackQueued;
      if (!imageResult.ok) {
        if (!imageResult.madeLiveAttempt && !imageResult.madeReservationAttempt) {
          return withServiceEvidence(buildCardGenerationPayload({
            draftInput,
            cardCopy,
            images: [],
            copyFlow,
            copyProvider: copyResult.adapterId,
            imageFlow,
            imageProvider: "",
            imageProviderFailure: imageResult.providerFailure,
            providerCallEvents,
            fallbackQueued
          }), serviceEvidence);
        }
        return providerUnavailableResponse({
          statusCode: imageResult.statusCode,
          flowKey: "card_image",
          flow: imageFlow,
          adapterId: imageResult.adapterId,
          providerFailure: imageResult.providerFailure,
          providerCallEvents,
          fallbackQueued,
          extraPayload: {
            ...imageResult.extraPayload,
            draft_id: buildDraftId(draftInput),
            card_copy: cardCopy,
            images: [],
            service_evidence: serviceEvidence,
            ai_flow: {
              card_copy: publicFlowState(copyFlow, copyResult.adapterId, "")
            }
          }
        });
      }

      return withServiceEvidence(buildCardGenerationPayload({
        draftInput,
        cardCopy,
        images: imageResult.images,
        copyFlow,
        copyProvider: copyResult.adapterId,
        imageFlow,
        imageProvider: imageResult.adapterId,
        providerCallEvents,
        fallbackQueued
      }), serviceEvidence);
    },

    async respondChat(body, requestContext = {}) {
      const activationContext = await loadAiRouteActivationContext({
        env,
        body,
        requestContext,
        serviceAiFlowAdminConfig: aiFlowAdminConfig,
        loadAiFlowAdminConfig
      });
      const flow = resolveAiRouteActivation("customer-chat", activationContext).flow;

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
          fallback_queued: false
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
  copyProvider,
  imageFlow,
  imageProvider,
  imageProviderFailure,
  providerCallEvents,
  fallbackQueued = false
}) {
  return aiCardDraftPolicy.buildCardGenerationPayload({
    draftInput,
    cardCopy,
    images,
    copyFlow,
    copyProvider,
    imageFlow,
    imageProvider,
    imageProviderFailure,
    providerCallEvents,
    fallbackQueued
  });
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
  return aiCardDraftPolicy.providerUnavailableResponse({
    statusCode,
    flowKey,
    flow,
    adapterId,
    providerFailure,
    providerCallEvents,
    fallbackQueued,
    extraPayload
  });
}

function withServiceEvidence(result, serviceEvidence) {
  if (!result?.payload || typeof result.payload !== "object" || !serviceEvidence) return result;
  return {
    ...result,
    payload: {
      ...result.payload,
      service_evidence: serviceEvidence
    }
  };
}

function validateProductionTextPlannerForService({ copyFlow, imageFlow }) {
  const active = isProductionTextServiceMode({ imageFlow });
  const runtime = productionTextPlannerRuntimeForService(copyFlow, {
    requireRuntimeBudget: active && copyFlow.primaryAdapterId === "local-openai-compatible-chat"
  });
  const policy = {
    minContextTokens: productionTextPlannerPolicy.minContextTokens,
    minOutputTokens: productionTextPlannerPolicy.minOutputTokens,
    minimumOpenWeightPlannerClass: productionTextPlannerPolicy.minimumOpenWeightPlannerClass,
    recommendedModels: productionTextPlannerPolicy.recommendedModels
  };
  if (!active || copyFlow.primaryAdapterId !== "local-openai-compatible-chat") {
    return { ok: true, active, runtime, policy };
  }
  if (runtime.productionSuitable || (runtime.allowSmallPlanner && runtime.runAllowed)) {
    return { ok: true, active, runtime, policy };
  }
  const detail = runtime.blockers.length
    ? runtime.blockers.join(" ")
    : `Planner classification '${runtime.classification}' is not production-suitable.`;
  return {
    ok: false,
    active,
    runtime,
    policy,
    providerFailure:
      `Production text generation requires a production-suitable planner before sending the full card-copy contract: ${productionTextPlannerPolicy.minContextTokens}+ context tokens, ${productionTextPlannerPolicy.minOutputTokens}+ output tokens, and ${productionTextPlannerPolicy.minimumOpenWeightPlannerClass}. ${detail}`
  };
}

function productionTextPlannerRuntimeForService(flow, { requireRuntimeBudget = false } = {}) {
  const allowSmallPlanner = false;
  const allowUnknownProductionModel = false;
  const model = productionTextPlannerModelForService(flow);
  const contextTokens = boundedIntegerEnv(flow.contextWindowTokens, 0, 1_000_000, 0);
  const maxOutputTokens = boundedIntegerEnv(flow.maxTokens, 0, 8192, 0);
  const classification = classifyProductionTextPlanner(model, {
    allowSmall: allowSmallPlanner,
    allowUnknownProductionModel,
    reportedContextTokens: contextTokens,
    maxOutputTokens,
    requireRuntimeBudget
  });
  const runAllowed = classification.blockers.length === 0 && (classification.productionSuitable || allowSmallPlanner);
  return {
    adapterId: flow.primaryAdapterId,
    model,
    contextTokens: contextTokens || null,
    maxOutputTokens: maxOutputTokens || null,
    classification: classification.classification,
    productionSuitable: classification.productionSuitable,
    runAllowed,
    allowSmallPlanner,
    allowUnknownProductionModel,
    blockers: classification.blockers,
    warnings: classification.warnings,
    creativeContract: "full-production-card-copy-json"
  };
}

function productionTextPlannerModelForService(flow) {
  const configuredModel = String(flow.model || "").trim();
  return configuredModel;
}

function isProductionTextServiceMode({ imageFlow }) {
  return imageRenderingModeForFlow(imageFlow) === "final-text-composited";
}

function buildServiceGenerationEvidence({ draftInput, cardCopy, imagePromptPlan, copyFlow, imageFlow, env, productionTextGate }) {
  const contentContract = serviceContentContractEvidence(draftInput, cardCopy, imagePromptPlan);
  const imagePromptQuality = serviceImagePromptQuality(imagePromptPlan);
  return {
    service_contract: "customcard-ai-card-generation-v2",
    production_text: {
      active: Boolean(productionTextGate.active),
      rendering_mode: imageRenderingModeForFlow(imageFlow) || imageFlow.renderingMode || "",
      deterministic_text_compositor: imageFlow.primaryAdapterId === "local-comfyui-api-image" && Boolean(productionTextGate.active),
      planner: productionTextGate.runtime,
      manual_visual_grade_required_before_promotion: Boolean(productionTextGate.active),
      promotion_gate: productionTextGate.active ? "manual-grade-and-production-visual-qa-required" : "standard-ai-card-generation"
    },
    routing: {
      text_adapter_id: copyFlow.primaryAdapterId,
      text_model: copyFlow.model,
      image_adapter_id: imageFlow.primaryAdapterId,
      image_model: imageFlow.model
    },
    content_contract: contentContract,
    image_prompt_quality: imagePromptQuality,
    production_recommendation:
      productionTextGate.active || !imagePromptQuality.passed || !contentContract.must_include_covered || !contentContract.must_avoid_clean
        ? "requires-review-before-promotion"
        : "standard-review"
  };
}

function serviceContentContractEvidence(input, cardCopy, imagePromptPlan) {
  const panels = Array.isArray(cardCopy?.panels) ? cardCopy.panels : [];
  const copyText = panels.map((panel) => `${panel.headline || ""} ${panel.body || ""}`).join("\n");
  const promptText = imagePromptPlan.map((panel) => panel.prompt || "").join("\n");
  const missingMustInclude = (input.must_include || []).filter((term) => !textContains(copyText, term) && !textContains(promptText, term));
  const avoidedFailures = (input.must_avoid || []).filter((term) => textContains(copyText, term) || promptContainsUnnegatedServiceTerm(promptText, term));
  return {
    panel_count: panels.length,
    image_prompt_count: imagePromptPlan.length,
    must_include_covered: missingMustInclude.length === 0,
    must_avoid_clean: avoidedFailures.length === 0,
    missing_must_include: missingMustInclude,
    avoided_failures: avoidedFailures
  };
}

function serviceImagePromptQuality(imagePromptPlan) {
  const panels = imagePromptPlan.map((panel) => serviceImagePromptPanelQuality(panel));
  const warnings = panels.flatMap((panel) => panel.warnings.map((warning) => `${panel.panel_id}: ${warning}`));
  return {
    passed: warnings.length === 0,
    warnings,
    panels
  };
}

function serviceImagePromptPanelQuality(panel) {
  const prompt = String(panel.prompt || "");
  const warnings = [];
  if (!/\b(?:text-safe|negative space|quiet center|open field|blank center)\b/i.test(prompt)) {
    warnings.push("missing explicit text-safe negative space");
  }
  if (!/\b(?:visible|hero|motif|illustration|object|cluster|edge|corner|mark|plant|fish|dog|pond|aquarium|water|leaf|ripple)\b/i.test(prompt)) {
    warnings.push("missing concrete visible non-text artwork");
  }
  if (servicePromptContainsUnnegatedRiskyTextField(prompt)) {
    warnings.push("uses a risky framed text-field motif");
  }
  if (!/\b(?:no readable text|no words|no letters|no handwriting|no fake text)\b/i.test(prompt)) {
    warnings.push("missing text-rendering suppression");
  }
  return {
    panel_id: panel.panel_id,
    warnings
  };
}

function servicePromptContainsUnnegatedRiskyTextField(prompt) {
  return [
    "caption plaque",
    "text box",
    "inner card rectangle",
    "blank tag",
    "central medallion",
    "halo",
    "ornate frame"
  ].some((term) => promptContainsUnnegatedServiceTerm(prompt, term));
}

function promptContainsUnnegatedServiceTerm(prompt, term) {
  const needle = String(term || "").trim();
  if (!needle) return false;
  const regex = new RegExp(escapeRegExp(needle), "gi");
  let match;
  while ((match = regex.exec(String(prompt || "")))) {
    const prefix = String(prompt || "").slice(Math.max(0, match.index - 64), match.index);
    if (!/\b(?:no|avoid|avoids|without|exclude|excludes|never|not|negative prompt(?:s)?(?: includes?)?)\b[\w\s,;:-]{0,64}$/i.test(prefix)) {
      return true;
    }
  }
  return false;
}

function aiCostGateInput({ flow, requestContext, routeId, requestUnits, phase, metadata = {}, fallbackFromAdapterId }) {
  return {
    flow,
    routeId,
    requestUnits,
    rateKey: requestContext.rateKey,
    idempotencyKey: requestContext.idempotencyKey,
    authContext: requestContext.authContext,
    fallbackFromAdapterId: fallbackFromAdapterId ?? flow.primaryAdapterId,
    metadata: {
      phase,
      ...metadata
    }
  };
}

function isAiEnvKey(key) {
  return /^(CUSTOMCARD_AI_IMAGE_DOWNLOAD_ALLOWED_HOSTS|CUSTOMCARD_RUNCOMFY_|CUSTOMCARD_LOCAL_LLM_|CUSTOMCARD_COMFYUI_|ANTHROPIC_|OPENAI_|CLOUDFLARE_|COMFYUI_|GOOGLE_|GEMINI_|HUGGINGFACE_|GROQ_|TOGETHER_|MISTRAL_|DEEPSEEK_|DEEPAI_|FIREWORKS_|PERPLEXITY_|XAI_|REPLICATE_|STABILITY_|FAL_|BFL_|RUNCOMFY_|LMSTUDIO_|KOBOLDCPP_)/.test(key);
}

const textProviderExecutors = {
  "cloudflare-workers-ai-chat": executeCloudflareWorkersAiChat,
  "openai-responses-chat": executeOpenAiResponsesChat,
  "anthropic-messages-chat": executeAnthropicMessagesChat,
  "google-gemini-chat": executeGoogleGeminiChat
};
const imageProviderExecutors = {
  "local-comfyui-api-image": executeLocalComfyUiImage,
  "cloudflare-workers-ai-image": executeCloudflareWorkersAiImage,
  "openai-images": executeOpenAiImages,
  "google-gemini-image": executeGoogleGeminiImage,
  "huggingface-image": executeHuggingFaceImage,
  "deepai-text2img-image": executeDeepAiText2ImgImage,
  "runcomfy-model-api-image": executeRunComfyModelApiImage
};
const providerExecutionAdapter = createAiProviderExecutionAdapter({
  textProviderExecutors,
  imageProviderExecutors,
  openAiCompatibleAdapter,
  executeOpenAiCompatibleTextProvider
});

export function describeAiCardGenerationAdapters() {
  return providerExecutionAdapter.describe();
}

async function executeTextProvider(input) {
  return providerExecutionAdapter.executeText(input);
}

async function executeTextProviderWithFallback({
  flow,
  env,
  fetchImpl,
  costGate,
  requestContext,
  providerCallEvents,
  systemPrompt,
  userPrompt,
  responseFormat
}) {
  const attempts = providerAttemptsForFlow(flow, env);
  let fallbackQueued = false;
  let madeReservationAttempt = false;
  let lastFailure = flow.blockedReasons[0] ?? "Live card-copy provider is disabled.";
  let lastStatusCode = 503;
  let lastAdapterId = flow.readyForLiveCalls ? flow.primaryAdapterId : "";
  let lastExtraPayload = {};

  for (const attempt of attempts) {
    if (!attempt.flow.readyForLiveCalls) {
      lastAdapterId = "";
      if (attempt.index === 0 || madeReservationAttempt) {
        lastFailure = attempt.flow.blockedReasons[0] ?? `Live provider calls disabled for ${flow.flowId}.`;
      }
      lastStatusCode = 503;
      continue;
    }
    lastAdapterId = attempt.adapterId;
    fallbackQueued = fallbackQueued || attempt.isFallback;

    const reservation = await costGate.reserve(
      aiCostGateInput({
        flow: attempt.flow,
        requestContext,
        routeId: aiCardGenerateRoute,
        requestUnits: 1,
        phase: "card-copy",
        fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined,
        metadata: {
          providerAttempt: attempt.index + 1,
          fallbackAttempt: attempt.isFallback,
          fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined
        }
      })
    );
    madeReservationAttempt = true;
    providerCallEvents.push(reservation.event);
    if (!reservation.ok) {
      lastFailure = reservation.providerFailure;
      lastStatusCode = reservation.statusCode ?? 503;
      lastExtraPayload = reservation.payload;
      continue;
    }

    try {
      const text = await executeTextProvider({
        flow: attempt.flow,
        env,
        fetchImpl,
        systemPrompt,
        userPrompt,
        responseFormat
      });
      providerCallEvents.push(
        await costGate.settle(reservation.reservation, {
          status: "succeeded",
          metadata: {
            fallbackAttempt: attempt.isFallback,
            fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined
          }
        })
      );
      return {
        ok: true,
        text,
        adapterId: attempt.adapterId,
        fallbackQueued
      };
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "Provider text generation failed.";
      lastStatusCode = 502;
      lastExtraPayload = {};
      providerCallEvents.push(
        await costGate.settle(reservation.reservation, {
          status: "failed",
          errorClass: "provider-text-generation-failed",
          metadata: {
            providerFailure: lastFailure,
            fallbackAttempt: attempt.isFallback,
            fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined
          }
        })
      );
    }
  }

  return {
    ok: false,
    statusCode: lastStatusCode,
    adapterId: lastAdapterId,
    providerFailure: lastFailure,
    fallbackQueued,
    extraPayload: lastExtraPayload
  };
}

async function generateValidatedCardCopy({
  flow,
  env,
  fetchImpl,
  costGate,
  requestContext,
  providerCallEvents,
  systemPrompt,
  draftInput,
  responseFormat
}) {
  let lastResult;
  let lastFailure = "";
  let repairIssues = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const retryInput = attempt === 0
      ? draftInput
      : {
          ...draftInput,
          planner_retry: {
            reason: "Previous card-copy output failed validation. Return the same full schema with all required facts preserved.",
            issues: repairIssues
          }
        };
    const textResult = await executeTextProviderWithFallback({
      flow,
      env,
      fetchImpl,
      costGate,
      requestContext,
      providerCallEvents,
      systemPrompt,
      userPrompt: buildCardCopyPrompt(retryInput),
      responseFormat
    });
    lastResult = textResult;
    if (!textResult.ok) return textResult;

    try {
      const cardCopy = normalizeCardCopy(parseJsonFromText(textResult.text), draftInput);
      const validation = validateCardCopyContract(cardCopy, draftInput);
      if (validation.ok) {
        return {
          ...textResult,
          cardCopy
        };
      }
      const repairedCardCopy = attempt > 0
        ? repairMissingRequiredTermsInCardCopy(cardCopy, draftInput, validation.issues)
        : cardCopy;
      if (repairedCardCopy !== cardCopy) {
        const repairedValidation = validateCardCopyContract(repairedCardCopy, draftInput);
        if (repairedValidation.ok) {
          return {
            ...textResult,
            cardCopy: repairedCardCopy
          };
        }
        repairIssues = repairedValidation.issues;
        lastFailure = repairedValidation.issues.join("; ");
        continue;
      }
      repairIssues = validation.issues;
      lastFailure = validation.issues.join("; ");
    } catch (error) {
      lastFailure = errorMessage(error);
      repairIssues = [`Card-copy JSON parse failed: ${lastFailure}`];
    }
  }

  return {
    ok: false,
    statusCode: 502,
    adapterId: lastResult?.adapterId ?? (flow.readyForLiveCalls ? flow.primaryAdapterId : ""),
    providerFailure: `AI text provider returned invalid card-copy output after retry: ${lastFailure || "unknown validation failure"}.`,
    fallbackQueued: Boolean(lastResult?.fallbackQueued),
    extraPayload: {}
  };
}

async function executeImageProviderBatchWithFallback({
  flow,
  env,
  fetchImpl,
  costGate,
  requestContext,
  providerCallEvents,
  imagePromptPlan
}) {
  const attempts = providerAttemptsForFlow(flow, env);
  let fallbackQueued = false;
  let madeLiveAttempt = false;
  let madeReservationAttempt = false;
  let lastFailure = flow.blockedReasons[0] ?? "Live card-image provider is disabled.";
  let lastStatusCode = 503;
  let lastAdapterId = flow.readyForLiveCalls ? flow.primaryAdapterId : "";
  let lastExtraPayload = {};

  for (const attempt of attempts) {
    if (!attempt.flow.readyForLiveCalls) {
      lastAdapterId = "";
      if (attempt.index === 0 || madeReservationAttempt) {
        lastFailure = attempt.flow.blockedReasons[0] ?? `Live provider calls disabled for ${flow.flowId}.`;
      }
      lastStatusCode = 503;
      continue;
    }
    lastAdapterId = attempt.adapterId;
    fallbackQueued = fallbackQueued || attempt.isFallback;

    const reservation = await costGate.reserve(
      aiCostGateInput({
        flow: attempt.flow,
        requestContext,
        routeId: aiCardGenerateRoute,
        requestUnits: imagePromptPlan.length,
        phase: "card-image",
        fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined,
        metadata: {
          panelCount: imagePromptPlan.length,
          providerAttempt: attempt.index + 1,
          fallbackAttempt: attempt.isFallback,
          fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined
        }
      })
    );
    madeReservationAttempt = true;
    providerCallEvents.push(reservation.event);
    if (!reservation.ok) {
      lastFailure = reservation.providerFailure;
      lastStatusCode = reservation.statusCode ?? 503;
      lastExtraPayload = reservation.payload;
      continue;
    }

    const images = [];
    try {
      madeLiveAttempt = true;
      for (const panelPrompt of imagePromptPlan) {
        const imageUrl = await executeImageProvider({
          flow: attempt.flow,
          env,
          fetchImpl,
          panelId: panelPrompt.panel_id,
          prompt: panelPrompt.prompt,
          negativePrompt: panelPrompt.negative_prompt,
          panelCopy: panelPrompt.panel_copy
        });
        const imageRecord = normalizeImageProviderResult(imageUrl);
        if (!imageRecord?.image_url) continue;
        const renderingMode = imageRenderingModeForFlow(attempt.flow);
        images.push({
          panel_id: panelPrompt.panel_id,
          image_url: imageRecord.image_url,
          revised_prompt: panelPrompt.prompt,
          width: imageRecord.width ?? 1500,
          height: imageRecord.height ?? 2100,
          ...(renderingMode ? { rendering_mode: renderingMode } : {})
        });
      }
      if (images.length !== imagePromptPlan.length) {
        throw new Error("Image provider returned " + images.length + " of " + imagePromptPlan.length + " required panels.");
      }
      providerCallEvents.push(
        await costGate.settle(reservation.reservation, {
          status: "succeeded",
          metadata: {
            generatedPanelCount: images.length,
            fallbackAttempt: attempt.isFallback,
            fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined
          }
        })
      );
      return {
        ok: true,
        images,
        adapterId: attempt.adapterId,
        fallbackQueued,
        madeLiveAttempt,
        madeReservationAttempt
      };
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "Provider image generation failed.";
      lastStatusCode = 502;
      lastExtraPayload = {};
      providerCallEvents.push(
        await costGate.settle(reservation.reservation, {
          status: "failed",
          errorClass: "provider-image-generation-failed",
          metadata: {
            providerFailure: lastFailure,
            generatedPanelCount: images.length,
            fallbackAttempt: attempt.isFallback,
            fallbackFromAdapterId: attempt.isFallback ? flow.primaryAdapterId : undefined
          }
        })
      );
    }
  }

  return {
    ok: false,
    statusCode: lastStatusCode,
    adapterId: lastAdapterId,
    providerFailure: lastFailure,
    fallbackQueued,
    madeLiveAttempt,
    madeReservationAttempt,
    extraPayload: lastExtraPayload
  };
}

function providerAttemptsForFlow(flow, env) {
  const primaryAttempt = {
    index: 0,
    adapterId: flow.primaryAdapterId,
    flow,
    isFallback: false
  };
  if (!flow.fallbackQueueEnabled || !flow.fallbackAdapterId || flow.fallbackAdapterId === flow.primaryAdapterId) {
    return [primaryAttempt];
  }
  return [
    primaryAttempt,
    {
      index: 1,
      adapterId: flow.fallbackAdapterId,
      flow: flowForAdapter(flow, flow.fallbackAdapterId, env),
      isFallback: true
    }
  ];
}

function flowForAdapter(flow, adapterId, env) {
  const missingEnv = adapterMissingEnv(adapterId, env);
  const blockedReasons = [
    ...(flow.allowedAdapterIds.includes(adapterId) ? [] : [`Adapter ${adapterId} is not allowed for ${flow.flowId}.`]),
    ...(flow.liveProviderCallsEnabled ? [] : [`Live provider calls disabled for ${flow.flowId}.`]),
    ...missingEnv.map((missing) => `${adapterId} missing ${missing}.`),
    ...(flow.rateLimitPerMinute > 0 ? [] : [`${flow.flowId} rate limit must be greater than zero.`]),
    ...(flow.perRequestBudgetCents >= 0 && flow.monthlyBudgetCents >= 0
      ? []
      : [`${flow.flowId} budget controls must be non-negative.`])
  ];
  return {
    ...flow,
    primaryAdapterId: adapterId,
    model: modelForAiAdapter(adapterId, env),
    blockedReasons,
    readyForLiveCalls: blockedReasons.length === 0
  };
}

async function executeCloudflareWorkersAiChat({ flow, env, fetchImpl, systemPrompt, userPrompt, responseFormat }) {
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

async function executeOpenAiResponsesChat({ flow, env, fetchImpl, systemPrompt, userPrompt, responseFormat }) {
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

async function executeAnthropicMessagesChat({ flow, env, fetchImpl, systemPrompt, userPrompt }) {
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

async function executeGoogleGeminiChat({ flow, env, fetchImpl, systemPrompt, userPrompt, responseFormat }) {
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

async function executeOpenAiCompatibleTextProvider({ flow, fetchImpl, systemPrompt, userPrompt, responseFormat }, compatible) {
  if (compatible.localModelGuard) {
    await assertLocalOpenAiModelMatch(fetchImpl, compatible, flow.model);
  }
  const useResponseFormat = responseFormat && (!compatible.localProvider || truthyEnv(compatible.strictResponseFormat));
  const data = await postJson(fetchImpl, compatible.url, {
    headers: compatible.headers,
    localProvider: Boolean(compatible.localProvider),
    timeoutLabel: compatible.timeoutLabel,
    timeoutMs: compatible.timeoutMs,
    body: {
      model: flow.model,
      messages: buildMessages(systemPrompt, userPrompt),
      max_tokens: flow.maxTokens || 700,
      temperature: flow.temperature,
      ...(useResponseFormat ? { response_format: responseFormat } : {})
    }
  });
  return extractText(data);
}

async function executeImageProvider(input) {
  return providerExecutionAdapter.executeImage(input);
}

function imageRenderingModeForFlow(flow) {
  if (flow.renderingMode === "final-text-composited") return "final-text-composited";
  if (flow.primaryAdapterId !== "local-comfyui-api-image") return undefined;
  const workflowSignal = [
    localComfyWorkflowId(flow),
    flow.workflowPath,
    flow.workflowJson,
    flow.workflowInputsJson
  ].join(" ");
  return /customcard-production-text-overlay|production-text-overlay|CustomCardTextComposer/i.test(workflowSignal)
    ? "final-text-composited"
    : undefined;
}

async function executeCloudflareWorkersAiImage({ flow, env, fetchImpl, panelId, prompt, negativePrompt }) {
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
  return materializeGeneratedImageUrl(await extractImageUrl(await response.json(), contentType), fetchImpl, env);
}

async function executeOpenAiImages({ flow, env, fetchImpl, prompt }) {
  const data = await postJson(fetchImpl, "https://api.openai.com/v1/images/generations", {
    headers: { authorization: `Bearer ${requiredEnv(env, "OPENAI_API_KEY")}` },
    body: {
      model: flow.model,
      prompt,
      size: "1024x1536",
      n: 1
    }
  });
  return materializeGeneratedImageUrl(extractImageUrl(data, "image/png"), fetchImpl, env);
}

async function executeGoogleGeminiImage({ flow, env, fetchImpl, prompt }) {
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
  return materializeGeneratedImageUrl(extractImageUrl(data, "image/png"), fetchImpl, env);
}

async function executeHuggingFaceImage({ flow, env, fetchImpl, panelId, prompt, negativePrompt }) {
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
  return materializeGeneratedImageUrl(extractImageUrl(data, contentType || "image/png"), fetchImpl, env);
}

async function executeLocalComfyUiImage({ flow, env, fetchImpl, panelId, prompt, negativePrompt, panelCopy = {} }) {
  const comfyUrl = localComfyUiBaseUrl(env);
  const runtimeInputs = runtimeInputsForFlow(flow);
  const width = configuredInteger(runtimeInputs, ["width", "image_width", "imageWidth"], 256, 2048, 960);
  const height = configuredInteger(runtimeInputs, ["height", "image_height", "imageHeight"], 256, 2048, 1344);
  const steps = configuredInteger(runtimeInputs, ["steps", "num_steps", "numSteps"], 1, 80, 18);
  const cfg = configuredNumber(runtimeInputs, ["cfg", "cfg_scale", "cfgScale"], 1, 20, 6.5);
  const sampler = configuredString(runtimeInputs, ["sampler", "sampler_name", "samplerName"], "euler");
  const scheduler = configuredString(runtimeInputs, ["scheduler"], "normal");
  const clientId = configuredString(runtimeInputs, ["client_id", "clientId"], "customcard-local-comfyui-provider");
  const deterministicSeed = numericSeed(`${flow.model}:${panelId}:${prompt}`);
  const seed = configuredInteger(runtimeInputs, ["seed"], 0, 2 ** 32 - 1, deterministicSeed);
  const variables = {
    cfg,
    checkpoint: flow.model || "flux-2-klein-4b.safetensors",
    clientId,
    height,
    negativePrompt,
    panelId,
    prompt,
    sampler,
    scheduler,
    seed,
    steps,
    width,
    workflowId: localComfyWorkflowId(flow),
    ...localComfyTypographyVariables({ panelId, panelCopy, width, height })
  };
  const workflow = buildLocalComfyWorkflow({ flow, variables });
  const promptResponse = await postJson(fetchImpl, localComfyUiApiUrl(comfyUrl, "/prompt"), {
    body: buildLocalComfyPromptBody({ flow, workflow, variables })
  });
  const promptId = String(promptResponse.prompt_id || "").trim();
  if (!promptId) throw new Error("Local ComfyUI did not return a prompt_id.");
  const output = await waitForLocalComfyImage(fetchImpl, comfyUrl, promptId, {
    pollMs: configuredInteger(runtimeInputs, ["poll_ms", "pollMs", "poll_interval_ms", "pollIntervalMs"], 250, 30_000, 1500),
    timeoutMs: configuredInteger(runtimeInputs, ["timeout_ms", "timeoutMs"], 10_000, 900_000, 900_000)
  });
  const imageUrl = new URL(localComfyUiApiUrl(comfyUrl, "/view"));
  imageUrl.searchParams.set("filename", output.filename);
  imageUrl.searchParams.set("subfolder", output.subfolder || "");
  imageUrl.searchParams.set("type", output.type || "output");
  const response = await fetchImpl(imageUrl.toString(), { method: "GET" });
  if (!response.ok) throw new Error(`Local ComfyUI image fetch failed with ${response.status}.`);
  const contentType = response.headers?.get?.("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    image_url: `data:${contentType};base64,${buffer.toString("base64")}`,
    width,
    height
  };
}

function buildLocalComfyWorkflow({ flow, variables }) {
  const workflowSource = String(flow.workflowJson || "").trim();
  const workflowPath = String(flow.workflowPath || "").trim();
  if (workflowSource || workflowPath) {
    const rawWorkflow = workflowSource || readLocalComfyWorkflowFile(workflowPath);
    try {
      return interpolateLocalComfyTemplate(JSON.parse(rawWorkflow), variables);
    } catch (error) {
      throw new Error(`Local ComfyUI workflow template is invalid: ${errorMessage(error)}`);
    }
  }
  return buildLocalComfyTxt2ImgWorkflow(variables);
}

function readLocalComfyWorkflowFile(workflowPath) {
  const resolvedPath = resolve(String(workflowPath));
  if (!existsSync(resolvedPath)) throw new Error(`Local ComfyUI workflow file not found: ${resolvedPath}`);
  return readFileSync(resolvedPath, "utf8");
}

function buildLocalComfyPromptBody({ flow, workflow, variables }) {
  const workflowId = localComfyWorkflowId(flow);
  const workflowInputs = localComfyWorkflowInputsForMetadata({}, variables, flow.workflowInputsJson);
  const customcardExtraData = Object.fromEntries(
    Object.entries({
      workflow_id: workflowId,
      panel_id: variables.panelId,
      seed: variables.seed,
      inputs: workflowInputs
    }).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
  return {
    prompt: workflow,
    client_id: variables.clientId,
    ...(Object.keys(customcardExtraData).length > 0
      ? {
          extra_data: {
            customcard: customcardExtraData
          }
        }
      : {})
  };
}

function localComfyWorkflowId(flow) {
  return String(flow.workflowId || "").trim();
}

async function executeDeepAiText2ImgImage({ flow, env, fetchImpl, panelId, prompt, negativePrompt }) {
  const runtimeInputs = runtimeInputsForFlow(flow);
  const body = new FormData();
  body.set("text", buildDeepAiTextPrompt({ panelId, prompt }));
  body.set("negative_prompt", buildDeepAiNegativePrompt({ prompt, negativePrompt }));
  body.set("width", String(configuredInteger(runtimeInputs, ["width", "image_width", "imageWidth"], 256, 2048, 768)));
  body.set("height", String(configuredInteger(runtimeInputs, ["height", "image_height", "imageHeight"], 256, 2048, 1024)));
  body.set(
    "image_generator_version",
    configuredString(runtimeInputs, ["image_generator_version", "imageGeneratorVersion"], "standard")
  );
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
  return materializeGeneratedImageUrl(extractImageUrl(data, contentType || "image/png"), fetchImpl, env);
}

async function executeRunComfyModelApiImage({ flow, env, fetchImpl, panelId, prompt, negativePrompt }) {
  const token = requiredEnv(env, "RUNCOMFY_API_TOKEN");
  const modelId = requiredRunComfyModelId(flow, env);
  const baseUrl = "https://model-api.runcomfy.net";
  const submitResponse = await fetchWithProviderBackoff(
    fetchImpl,
    `${baseUrl}/v1/models/${encodeRunComfyModelId(modelId)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(buildRunComfyImageRequestBody({ flow, env, panelId, prompt, negativePrompt }))
    },
    { retries: flow.maxRetries, baseDelayMs: 1500, maxDelayMs: 5000 }
  );
  const submitContentType = submitResponse.headers?.get?.("content-type") ?? "";
  if (!submitResponse.ok) {
    throw new Error(`RunComfy image provider returned ${submitResponse.status}: ${await readProviderError(submitResponse, submitContentType)}.`);
  }

  const submission = await submitResponse.json().catch(() => undefined);
  const requestId = String(submission?.request_id || submission?.id || "").trim();
  if (!requestId) throw new Error("RunComfy image provider response did not include request_id.");
  const statusUrl = runComfyQueueUrl(
    submission?.status_url,
    `${baseUrl}/v1/requests/${encodeURIComponent(requestId)}/status`
  );
  const resultUrl = runComfyQueueUrl(
    submission?.result_url,
    `${baseUrl}/v1/requests/${encodeURIComponent(requestId)}/result`
  );

  const runtimeInputs = runtimeInputsForFlow(flow);
  const maxPolls = configuredInteger(runtimeInputs, ["max_polls", "maxPolls"], 1, 120, 30);
  const pollIntervalMs = configuredInteger(runtimeInputs, ["poll_interval_ms", "pollIntervalMs"], 0, 30_000, 2000);
  let completed = false;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const statusResponse = await fetchImpl(statusUrl, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` }
    });
    const statusContentType = statusResponse.headers?.get?.("content-type") ?? "";
    if (!statusResponse.ok) {
      throw new Error(`RunComfy status poll returned ${statusResponse.status}: ${await readProviderError(statusResponse, statusContentType)}.`);
    }
    const statusData = await statusResponse.json().catch(() => undefined);
    const status = String(statusData?.status || "").toLowerCase();
    if (status === "completed" || status === "succeeded") {
      completed = true;
      break;
    }
    if (status === "failed" || status === "cancelled" || status === "canceled") {
      throw new Error(runComfyFailureMessage(statusData, `RunComfy image provider request ${status || "failed"}`));
    }
    if (attempt + 1 < maxPolls && pollIntervalMs > 0) await sleep(pollIntervalMs);
  }
  if (!completed) throw new Error("RunComfy image provider timed out before completion.");

  const resultResponse = await fetchImpl(resultUrl, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` }
  });
  const resultContentType = resultResponse.headers?.get?.("content-type") ?? "";
  if (!resultResponse.ok) {
    throw new Error(`RunComfy result fetch returned ${resultResponse.status}: ${await readProviderError(resultResponse, resultContentType)}.`);
  }
  const resultData = await resultResponse.json().catch(() => undefined);
  const resultStatus = String(resultData?.status || "").toLowerCase();
  if (resultStatus === "failed" || resultStatus === "cancelled" || resultStatus === "canceled") {
    throw new Error(runComfyFailureMessage(resultData, `RunComfy image provider result ${resultStatus}`));
  }
  return materializeGeneratedImageUrl(extractImageUrl(resultData, resultContentType || "image/png"), fetchImpl, env);
}

function buildCloudflareImageRequestBody({ flow, panelId, prompt, negativePrompt }) {
  const providerPrompt = buildCloudflareImagePrompt({ panelId, prompt });
  const providerNegativePrompt = buildCloudflareNegativePrompt({ negativePrompt, prompt });
  const seed = numericSeed(`${flow.model}:${panelId}:${providerPrompt}`) % 2147483647;
  if (isCloudflareFluxModel(flow.model)) {
    return {
      prompt: truncate(providerPrompt, 1600),
      steps: 8,
      seed
    };
  }
  return {
    prompt: providerPrompt,
    negative_prompt: providerNegativePrompt,
    width: 1464,
    height: 2048,
    guidance: 3.5,
    num_steps: 8,
    seed,
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
  const providerGuardrails = "no readable text, no words, no logos, no watermark, No people, No hands, not a physical paper card.";
  if (!isQuietCarePrompt(prompt)) return `${prompt} ${providerGuardrails}`;
  const role = panelId === "front" ? "front cover" : panelId === "back" ? "back cover" : `${panelId} interior`;
  const shared =
    `Premium flat 2D vertical 5x7 greeting-card panel artwork layer, print-ready editorial paper-cut illustration, vector-poster flatness, camera-free full-bleed composition, clean text-safe negative space, simple abstract setting, refined stationery finish, ${providerGuardrails}`;
  if (panelId === "front") {
    return [
      shared,
      `${role}: deep moss field, muted ivory title-safe open field in upper middle, lower-third practical-care vignette made from paper-cut shapes: covered meal form, folded cloth, doorstep threshold arc, quiet ride path curve, and two small call/silence signal arcs, all as one quiet support cluster; sophisticated negative space, no door, no table, no room, no device, no note card, no waves, no road, no landscape.`
    ].join(" ");
  }
  if (panelId === "back") {
    return [
      shared,
      `${role}: mostly deep moss negative space, small lower-corner echo of the care vignette as simple ivory/taupe paper-cut covered-meal shape, folded cloth, and threshold arc, subtle paper grain, premium stationery finish, open center with no decoration, no door, no table, no room, no device, no note card, no waves or landscape.`
    ].join(" ");
  }
  return [
    shared,
    `${role}: warm ivory interior, huge plain central negative space for later typography, small low-contrast practical-care vignette only along lower outside edge, covered meal shape, folded cloth, quiet path curve for rides, two tiny call/silence signal arcs, muted moss line accents, soft taupe paper layers, generous margins, calm paired interior spread, no device, no note card, no open book, no page seam, no waves or landscape.`
  ].join(" ");
}

function buildCloudflareNegativePrompt({ negativePrompt, prompt }) {
  const base = isQuietCarePrompt(prompt)
    ? "readable text, fake text, letters, words, handwriting, calligraphy, signature, label, logo, watermark, tiny glyphs, small symbols, people, face, portrait, hands, body, folded card mockup, physical card mockup, open book, book, paper fold, crease line, page seam, wall floor corner, room, wall, floor, door, window, envelope, tabletop scene, table, desk, product photo, frame, QR code, busy background, car, vehicle, road, highway, lane line, landscape, horizon, hills, mountains, river, ocean, waves, sunset, sun, bright yellow, neon green, cheerful celebration, cup, pot, key, visible food, fruit, cans, jars, package labels, phone, smartphone, device, screen text, phone app interface, hospital, religious symbols"
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

function buildDeepAiTextPrompt({ panelId, prompt }) {
  if (isQuietCarePrompt(prompt)) {
    return buildDeepAiQuietCarePrompt({ panelId });
  }
  return truncate(prompt, 2048);
}

function buildDeepAiNegativePrompt({ prompt, negativePrompt }) {
  const base = isQuietCarePrompt(prompt)
    ? "readable text, fake text, letters, words, handwriting, calligraphy, label, logo, watermark, people, face, portrait, hands, body, folded card mockup, physical card mockup, open book, paper fold, crease line, page seam, room, wall, floor, door, window, envelope, tabletop scene, table, desk, product photo, frame, QR code, busy background, car, road, landscape, horizon, hills, mountains, river, ocean, waves, sunset, sun, bright yellow, neon green, cheerful celebration, phone, device, hospital, religious symbols"
    : negativePrompt;
  return truncate(base || negativePrompt || "", 700);
}

function requiredRunComfyModelId(flow, env) {
  const modelId = String(flow.model || "").trim();
  if (!modelId) throw new Error("RunComfy model is not configured in admin provider settings.");
  return modelId;
}

function encodeRunComfyModelId(modelId) {
  return String(modelId).split("/").map(encodeURIComponent).join("/");
}

function runComfyQueueUrl(value, fallbackUrl) {
  const raw = String(value || "").trim();
  if (!raw) return fallbackUrl;
  try {
    const url = new URL(raw);
    if (url.origin === "https://model-api.runcomfy.net" && url.pathname.startsWith("/v1/requests/")) {
      return url.href;
    }
  } catch {
    /* Fall back to the documented queue URL shape below. */
  }
  return fallbackUrl;
}

function runComfyFailureMessage(data, fallback) {
  const detail = runComfyFailureDetail(data);
  return detail ? `${fallback}: ${detail}.` : `${fallback}.`;
}

function runComfyFailureDetail(data) {
  const parsedError = parseRunComfyError(data?.error);
  const candidate =
    parsedError?.errors?.[0] ??
    parsedError?.error ??
    parsedError?.message ??
    data?.errors?.[0] ??
    data?.message ??
    data?.detail;
  const message =
    typeof candidate === "object"
      ? candidate?.message || candidate?.detail || JSON.stringify(candidate)
      : String(candidate || "").trim();
  const code =
    parsedError?.errors?.[0]?.code ??
    parsedError?.code ??
    data?.errors?.[0]?.code ??
    data?.code;
  const compactMessage = message ? message.replace(/\s+/g, " ").slice(0, 260) : "";
  return [compactMessage, code ? `code ${code}` : ""].filter(Boolean).join(" ");
}

function parseRunComfyError(value) {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildRunComfyImageRequestBody({ flow, panelId, prompt, negativePrompt }) {
  const seed = numericSeed(`${flow.model}:${panelId}:${prompt}`) % 2147483647;
  const body = {
    prompt: truncate(prompt, 2048),
    image_size: "portrait_4_3",
    ...runComfyInputOverrides(flow.workflowInputsJson, { prompt, negativePrompt, panelId, seed })
  };
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function runComfyInputOverrides(raw, variables) {
  if (!raw) return {};
  try {
    return omitRunComfyRuntimeOnlyInputs(interpolateRunComfyInput(JSON.parse(String(raw)), variables));
  } catch {
    return {};
  }
}

function omitRunComfyRuntimeOnlyInputs(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const omitted = new Set(["max_polls", "maxPolls", "poll_interval_ms", "pollIntervalMs"]);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !omitted.has(key)));
}

function interpolateRunComfyInput(value, variables) {
  if (Array.isArray(value)) return value.map((item) => interpolateRunComfyInput(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, interpolateRunComfyInput(nested, variables)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/\{\{prompt\}\}/g, variables.prompt)
    .replace(/\{\{negative_prompt\}\}/g, variables.negativePrompt || "")
    .replace(/\{\{panel_id\}\}/g, variables.panelId)
    .replace(/\{\{seed\}\}/g, String(variables.seed));
}

function buildLocalComfyTxt2ImgWorkflow({ cfg, checkpoint, height, negativePrompt, panelId, prompt, sampler, scheduler, seed, steps, width }) {
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint }
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["1", 1] }
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: negativePrompt || "", clip: ["1", 1] }
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 }
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0]
      }
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] }
    },
    "7": {
      class_type: "SaveImage",
      inputs: {
        images: ["6", 0],
        filename_prefix: `customcard-provider-${panelId}`
      }
    }
  };
}

async function waitForLocalComfyImage(fetchImpl, comfyUrl, promptId, { pollMs, timeoutMs }) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const history = await fetchJsonProvider(fetchImpl, localComfyUiApiUrl(comfyUrl, `/history/${encodeURIComponent(promptId)}`));
    const item = history[promptId];
    if (item?.status?.completed === false && item?.status?.status_str === "error") {
      throw new Error(`Local ComfyUI prompt failed: ${JSON.stringify(item.status)}`);
    }
    const images = Object.values(item?.outputs ?? {}).flatMap((output) => output.images ?? []);
    if (images.length > 0) return images[0];
    await sleep(pollMs);
  }
  throw new Error(`Local ComfyUI prompt ${promptId} timed out after ${timeoutMs}ms.`);
}

async function fetchJsonProvider(fetchImpl, url, init = { method: "GET" }) {
  const response = await fetchImpl(url, init);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Expected JSON from local provider, got ${text.slice(0, 200)}.`);
  }
  if (!response.ok) throw new Error(`Local provider returned ${response.status}: ${JSON.stringify(data).slice(0, 300)}.`);
  return data;
}

function localOpenAiChatCompletionsUrl(env) {
  const baseUrl = firstUsableEnv(env, ["CUSTOMCARD_LOCAL_LLM_BASE_URL", "LMSTUDIO_BASE_URL", "KOBOLDCPP_BASE_URL"]);
  if (!baseUrl) throw new Error("Missing required provider env: CUSTOMCARD_LOCAL_LLM_BASE_URL or LMSTUDIO_BASE_URL or KOBOLDCPP_BASE_URL");
  const parsed = assertLocalProviderBaseUrl(baseUrl, "Local LLM base URL");
  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  if (normalizedPath.endsWith("/chat/completions")) return parsed.toString();
  parsed.pathname = normalizedPath.endsWith("/v1")
    ? `${normalizedPath}/chat/completions`
    : `${normalizedPath || ""}/v1/chat/completions`.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function localOpenAiModelsUrl(chatCompletionsUrl) {
  const parsed = new URL(chatCompletionsUrl);
  let normalizedPath = parsed.pathname.replace(/\/+$/, "");
  if (normalizedPath.endsWith("/chat/completions")) {
    normalizedPath = normalizedPath.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  }
  parsed.pathname = `${normalizedPath || "/v1"}/models`.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

function localComfyUiBaseUrl(env) {
  const baseUrl = firstUsableEnv(env, ["CUSTOMCARD_COMFYUI_URL", "COMFYUI_URL"]) || "http://127.0.0.1:8188";
  return assertLocalProviderBaseUrl(baseUrl, "Local ComfyUI URL").toString().replace(/\/+$/, "");
}

function localComfyUiApiUrl(comfyUrl, pathname) {
  const url = new URL(pathname, `${comfyUrl.replace(/\/+$/, "")}/`);
  assertLocalProviderBaseUrl(url.toString(), "Local ComfyUI API URL");
  return url.toString();
}

function assertLocalProviderBaseUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(String(value));
  } catch {
    throw new Error(`${label} is invalid.`);
  }
  const host = parsed.hostname.toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);
  if (parsed.protocol !== "http:" || !localHosts.has(host)) {
    throw new Error(`${label} must use a localhost http URL for the local-only provider.`);
  }
  parsed.username = "";
  parsed.password = "";
  return parsed;
}

function firstUsableEnv(env, keys) {
  for (const key of keys) {
    const value = env[key];
    if (!value) continue;
    const normalized = String(value).trim();
    if (!normalized || ["disabled", "example", "replace-me", "changeme", "dummy", "fake"].includes(normalized.toLowerCase())) continue;
    return normalized;
  }
  return "";
}

function normalizeImageProviderResult(value) {
  if (!value) return undefined;
  if (typeof value === "string") return { image_url: value };
  if (typeof value === "object") {
    const imageUrl = value.image_url || value.imageUrl || value.url;
    return imageUrl
      ? {
          image_url: String(imageUrl),
          width: Number.isFinite(value.width) ? value.width : undefined,
          height: Number.isFinite(value.height) ? value.height : undefined
        }
      : undefined;
  }
  return undefined;
}

function boundedIntegerEnv(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function boundedNumberEnv(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function runtimeInputsForFlow(flow) {
  const rawInputs = String(flow?.workflowInputsJson || "").trim();
  if (!rawInputs) return {};
  try {
    const parsed = JSON.parse(rawInputs);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function configuredValue(settings, keys) {
  if (!settings || typeof settings !== "object") return undefined;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) continue;
    const value = settings[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function configuredInteger(settings, keys, min, max, fallback) {
  return boundedIntegerEnv(configuredValue(settings, keys), min, max, fallback);
}

function configuredNumber(settings, keys, min, max, fallback) {
  return boundedNumberEnv(configuredValue(settings, keys), min, max, fallback);
}

function configuredString(settings, keys, fallback) {
  const value = configuredValue(settings, keys);
  if (value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
}

function buildDeepAiQuietCarePrompt({ panelId }) {
  const role = panelId === "front" ? "front cover" : panelId === "back" ? "back cover" : "interior panel";
  const shared = [
    `Portrait 5x7 ${role} for a premium sympathy greeting card.`,
    "Flat 2D editorial paper-cut and soft gouache illustration layer with a camera-free full-bleed print composition.",
    "Palette only: deep moss, warm ivory, muted gray-green, soft taupe, charcoal ink.",
    "No bright yellow, no neon green, no sun, no sunset, no landscape, no hills, no grass texture, no flowers.",
    "No phone, no device, no blank note card, no envelope, no open book, no page seam, no table, no readable text, no letters, no people."
  ];
  const panelSpec = {
    front:
      "Deep moss field with a quiet warm-ivory title-safe open area in the upper middle. Lower third has one abstract doorstep-care relief: covered meal shape, folded cloth, threshold arc, quiet ride-path curve, and tiny call/silence arcs. Sophisticated negative space.",
    "inside-left":
      "Warm ivory interior with a huge plain center for app-rendered message copy. Lower-left edge has a tiny muted moss/taupe care relief below the text area: covered meal shape, folded cloth, and threshold arc. Very sparse.",
    "inside-right":
      "Warm ivory interior matching the left panel with a huge plain center for app-rendered message copy. Lower-right edge has tiny abstract care marks: ride-path curve and two call/silence arcs. Very sparse.",
    back:
      "Mostly deep moss negative space with a clean upper/center text-safe area. One small lower-corner ivory/taupe echo of the covered meal and threshold arc. Minimal and quiet."
  }[panelId] ?? "";
  return truncate(
    [
      ...shared,
      panelSpec,
      "Mood: calm, grounded, deeply respectful, practical support without cliches."
    ].join(" "),
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
  if (adapterId === "local-openai-compatible-chat") {
    const apiKey = firstUsableEnv(env, ["CUSTOMCARD_LOCAL_LLM_API_KEY", "LMSTUDIO_API_KEY", "KOBOLDCPP_API_KEY"]);
    const url = localOpenAiChatCompletionsUrl(env);
    return {
      url,
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
      localProvider: true,
      localModelGuard: false,
      modelsUrl: localOpenAiModelsUrl(url),
      strictResponseFormat: "",
      timeoutLabel: "Local LLM chat completion request",
      timeoutMs: defaultLocalLlmRequestTimeoutMs
    };
  }
  const config = adapters[adapterId];
  if (!config) return undefined;
  return {
    url: config.url,
    headers: { authorization: `Bearer ${requiredEnv(env, config.token)}` }
  };
}

async function postJson(fetchImpl, url, { headers = {}, body, localProvider = false, timeoutLabel = "Provider request", timeoutMs = 0 }) {
  const requestFetch = localProvider ? localProviderFetch(fetchImpl, { timeoutLabel, timeoutMs }) : fetchImpl;
  const response = await requestFetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const contentType = response.headers?.get?.("content-type") ?? "";
    throw new Error(`AI provider returned ${response.status}: ${await readProviderError(response, contentType)}.`);
  }
  const data = await response.json();
  if (data?.success === false) {
    throw new Error(data?.errors?.[0]?.message || "AI provider rejected the request.");
  }
  return data;
}

async function assertLocalOpenAiModelMatch(fetchImpl, compatible, requestedModel) {
  const expectedModel = normalizeLocalOpenAiModelId(requestedModel);
  if (!expectedModel) return;
  const requestFetch = localProviderFetch(fetchImpl, {
    timeoutLabel: "Local LLM model guard request",
    timeoutMs: Math.min(compatible.timeoutMs || defaultLocalLlmRequestTimeoutMs, 30_000)
  });
  const response = await requestFetch(compatible.modelsUrl, {
    method: "GET",
    headers: compatible.headers || {}
  });
  if (!response.ok) throw new Error(`Local LLM model guard returned ${response.status}.`);
  const body = await response.json();
  const models = (body?.data || []).map((item) => String(item?.id || "")).filter(Boolean);
  const matched = models.some((model) => normalizeLocalOpenAiModelId(model) === expectedModel);
  if (!matched) {
    throw new Error(
      `Local LLM model mismatch: requested ${requestedModel}, but /models reported ${models.join(", ") || "none"}.`
    );
  }
}

function normalizeLocalOpenAiModelId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^koboldcpp\//, "")
    .replace(/\.gguf$/, "");
}

function truthyEnv(value) {
  return /^(1|true|yes|on)$/i.test(String(value || "").trim());
}

function localProviderFetch(fetchImpl, { timeoutLabel, timeoutMs }) {
  if (typeof fetchImpl?.localProviderFetch === "function") {
    return (url, init) => fetchImpl.localProviderFetch(url, init, { timeoutLabel, timeoutMs });
  }
  if (fetchImpl === globalThis.fetch) {
    return (url, init) => fetchLocalHttpProvider(url, init, { timeoutLabel, timeoutMs });
  }
  return (url, init) => fetchWithTimeout(fetchImpl, url, init, timeoutMs, timeoutLabel);
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

function publicFlowState(flow, adapterId, providerFailure) {
  return aiCardDraftPolicy.publicFlowState(flow, adapterId, providerFailure);
}

function publicProviderCallEvents(events) {
  return aiCardDraftPolicy.publicProviderCallEvents(events);
}

function publicCostGateSummary(events) {
  return aiCardDraftPolicy.publicCostGateSummary(events);
}

function hasLiveProviderEvent(events) {
  return aiCardDraftPolicy.hasLiveProviderEvent(events);
}

function hasExternalNetworkEvent(events) {
  return aiCardDraftPolicy.hasExternalNetworkEvent(events);
}

function extractText(data) {
  const finishReason = data?.choices?.[0]?.finish_reason ?? data?.choices?.[0]?.finishReason ?? data?.finish_reason;
  if (String(finishReason || "").toLowerCase() === "length") {
    throw new Error(
      "AI text provider stopped with finish_reason=length before completing the card-copy JSON; use a production-suitable planner with 8192+ context/output budget instead of reducing the creative contract."
    );
  }
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
  const outputImage = data?.output?.images?.[0];
  const outputArrayImage = data?.output?.[0];
  const image =
    data?.result?.image_url ??
    data?.result?.url ??
    data?.output_url ??
    data?.image_url ??
    data?.url ??
    data?.data?.[0]?.url ??
    data?.data?.[0]?.b64_json ??
    data?.output?.image ??
    data?.output?.image_url ??
    data?.output?.url ??
    data?.output?.images?.[0]?.url ??
    data?.output?.images?.[0]?.image_url ??
    (typeof outputImage === "string" ? outputImage : undefined) ??
    data?.images?.[0]?.url ??
    data?.images?.[0]?.image_url ??
    data?.output?.[0]?.url ??
    data?.output?.[0]?.image_url ??
    (typeof outputArrayImage === "string" ? outputArrayImage : undefined) ??
    data?.result?.image ??
    data?.image ??
    inlineImage?.data;
  if (!image) throw new Error("AI image provider response did not contain an image.");
  if (String(image).startsWith("http") || String(image).startsWith("data:")) return String(image);
  return `data:${inferImageContentType(image, inlineImage?.mimeType || contentType)};base64,${image}`;
}

async function materializeGeneratedImageUrl(imageUrl, fetchImpl, env = process.env) {
  const value = String(imageUrl);
  if (!/^https?:\/\//i.test(value)) return value;
  const safeUrl = await assertSafeGeneratedImageDownloadUrl(value, env);
  const response = await fetchWithTimeout(fetchImpl, safeUrl, { method: "GET" }, materializedImageFetchTimeoutMs);
  if (!response.ok) throw new Error(`Generated image URL fetch failed with ${response.status}.`);
  const contentType = response.headers?.get?.("content-type") || "image/png";
  if (!String(contentType).toLowerCase().startsWith("image/")) {
    throw new Error("Generated image URL did not return an image content type.");
  }
  const contentLength = Number(response.headers?.get?.("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxMaterializedImageBytes) {
    throw new Error("Generated image URL exceeded the maximum allowed size.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxMaterializedImageBytes) {
    throw new Error("Generated image URL exceeded the maximum allowed size.");
  }
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function assertSafeGeneratedImageDownloadUrl(imageUrl, env = process.env) {
  let parsed;
  try {
    parsed = new URL(String(imageUrl));
  } catch {
    throw new Error("Generated image URL is invalid.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Generated image URL must use https.");
  }
  if (!isAllowedGeneratedImageDownloadHost(parsed.hostname, env)) {
    throw new Error("Generated image URL host is not in the configured allowlist.");
  }
  await assertPublicGeneratedImageHost(parsed.hostname);
  parsed.username = "";
  parsed.password = "";
  return parsed.toString();
}

function isAllowedGeneratedImageDownloadHost(hostname, env) {
  const host = normalizeGeneratedImageHost(hostname);
  const allowlist = String(env.CUSTOMCARD_AI_IMAGE_DOWNLOAD_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((value) => normalizeGeneratedImageHost(value))
    .filter(Boolean);
  if (allowlist.length === 0) return true;
  return allowlist.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
}

async function assertPublicGeneratedImageHost(hostname) {
  const host = normalizeGeneratedImageHost(hostname);
  if (isIP(host)) {
    if (isPrivateGeneratedImageAddress(host)) throw new Error("Generated image URL resolved to a private network address.");
    return;
  }
  let addresses;
  try {
    addresses = await lookupDns(host, { all: true, verbatim: false });
  } catch {
    throw new Error("Generated image URL host could not be resolved.");
  }
  if (addresses.length === 0) throw new Error("Generated image URL host could not be resolved.");
  if (addresses.some((entry) => isPrivateGeneratedImageAddress(entry.address))) {
    throw new Error("Generated image URL resolved to a private network address.");
  }
}

export function isPrivateGeneratedImageAddress(address) {
  const value = String(address ?? "").trim().toLowerCase();
  if (!value) return true;
  if (value.startsWith("::ffff:")) return isPrivateGeneratedImageAddress(value.slice("::ffff:".length));
  if (isIP(value) === 6) {
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
  }
  if (isIP(value) !== 4) return true;
  const octets = value.split(".").map((part) => Number(part));
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function normalizeGeneratedImageHost(value) {
  return String(value ?? "").trim().toLowerCase().replace(/^\.+|\.+$/g, "");
}

export async function fetchLocalHttpProvider(url, init = {}, { timeoutLabel = "Local provider request", timeoutMs = defaultLocalLlmRequestTimeoutMs } = {}) {
  const parsed = assertLocalProviderBaseUrl(url, timeoutLabel);
  const timeout = boundedIntegerEnv(timeoutMs, 10_000, 3_600_000, defaultLocalLlmRequestTimeoutMs);
  const body = init.body === undefined || init.body === null
    ? undefined
    : Buffer.isBuffer(init.body)
      ? init.body
      : Buffer.from(String(init.body), "utf8");
  const headers = normalizedHeaderObject(init.headers);
  if (body && !hasHeader(headers, "content-length")) headers["content-length"] = String(body.length);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  return new Promise((resolveResponse, rejectResponse) => {
    let timedOut = false;
    const request = httpRequest(
      {
        protocol: "http:",
        hostname,
        port: parsed.port || 80,
        path: `${parsed.pathname}${parsed.search}`,
        method: init.method || "GET",
        headers
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          clearTimeout(timer);
          resolveResponse(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode || 500,
              statusText: response.statusMessage || "",
              headers: responseHeaders(response.headers)
            })
          );
        });
      }
    );
    const timer = setTimeout(() => {
      timedOut = true;
      request.destroy(new Error(`${timeoutLabel} timed out after ${timeout}ms.`));
    }, timeout);
    request.on("error", (error) => {
      clearTimeout(timer);
      rejectResponse(timedOut ? new Error(`${timeoutLabel} timed out after ${timeout}ms.`) : error);
    });
    if (init.signal) {
      if (init.signal.aborted) {
        clearTimeout(timer);
        request.destroy(new Error(`${timeoutLabel} was aborted.`));
        return;
      }
      init.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          request.destroy(new Error(`${timeoutLabel} was aborted.`));
        },
        { once: true }
      );
    }
    if (body) request.write(body);
    request.end();
  });
}

function normalizedHeaderObject(headers = {}) {
  const entries = headers instanceof Headers
    ? Array.from(headers.entries())
    : Array.isArray(headers)
      ? headers
      : Object.entries(headers || {});
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)]));
}

function hasHeader(headers, name) {
  const normalized = String(name).toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === normalized);
}

function responseHeaders(headers) {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers || {})) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(key, String(item));
    } else if (value !== undefined) {
      result.set(key, String(value));
    }
  }
  return result;
}

async function fetchWithTimeout(fetchImpl, url, init, timeoutMs, timeoutLabel = "Fetch request") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`${timeoutLabel} timed out after ${timeoutMs}ms.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "unknown error");
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
