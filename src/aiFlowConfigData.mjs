import {
  cloudflareTextRequiredCredentialGroups,
  productionCardCopyModel
} from "./aiProviderSetupProfile.mjs";

export const aiFlowAdminConfigStorageKey = "customcard-ai-flow-admin-config-v1";

const textProviderAdapterIds = [
  "local-openai-compatible-chat",
  "huggingface-chat",
  "cloudflare-workers-ai-chat",
  "openai-responses-chat",
  "anthropic-messages-chat",
  "google-gemini-chat",
  "groq-chat",
  "together-chat",
  "mistral-chat",
  "deepseek-chat",
  "fireworks-chat",
  "perplexity-sonar-chat",
  "xai-chat",
  "self-hosted-openai-compatible-chat"
];

const imageProviderAdapterIds = [
  "local-comfyui-api-image",
  "deepai-text2img-image",
  "cloudflare-workers-ai-image",
  "openai-images",
  "google-gemini-image",
  "huggingface-image",
  "stability-stable-image",
  "replicate-image",
  "together-image",
  "fal-image",
  "bfl-flux-image",
  "runcomfy-model-api-image"
];

export const benchmarkLocalComfyWorkflowInputsJson = JSON.stringify(
  {
    width: 960,
    height: 1344,
    steps: 18,
    cfg: 6.5,
    sampler: "euler",
    scheduler: "normal",
    poll_ms: 1500,
    timeout_ms: 900000,
    client_id: "customcard-local-comfyui-provider"
  },
  null,
  2
);

export const benchmarkBestAiWorkflow = {
  id: "cloudflare-qwen3-30b-local-comfy-production-text-normal-size-20260629",
  label: "Cloudflare Qwen3 30B + Comfy production text composer",
  status: "structural-pass-needs-manual-visual-gate",
  evidencePath:
    "docs/evidence/generated-card-comparisons/production-text-workflow-20260629-cloudflare-guard-fix-normal-size/production-text-workflow-summary.json",
  summaryPath:
    "docs/evidence/generated-card-comparisons/benchmark-aggregate-20260629-cloudflare-guard-fix-normal-size/aggregate-summary.json",
  rationale:
    "The 2026-06-29 normal-size proof completed all three local-production-text fixtures at 960x1344 with Cloudflare Qwen3 30B card copy, local ComfyUI image generation, and CustomCardTextComposer final text composition. Manual visual QA still gates customer promotion.",
  blockers: [
    "Manual visual QA and aggregate promotion gates still decide customer promotion.",
    "The selected Comfy runtime must expose CustomCardTextComposer before live image work.",
    "Current local Comfy checkpoint can still introduce unwanted figures or objects; production approval must grade visual quality separately from blank-panel prevention."
  ],
  flowExpectations: [
    {
      flowId: "card-copy",
      primaryAdapterId: "cloudflare-workers-ai-chat",
      model: productionCardCopyModel,
      contextWindowTokens: 8192,
      maxTokens: 3200,
      temperature: 0.62,
      evidenceLabel: "Full card-copy JSON contract"
    },
    {
      flowId: "card-image",
      primaryAdapterId: "local-comfyui-api-image",
      fallbackAdapterId: "cloudflare-workers-ai-image",
      model: "DreamShaper_8_pruned.safetensors",
      renderingMode: "final-text-composited",
      workflowId: "customcard-production-text-overlay",
      workflowPath: "comfyui-workflows/customcard-production-text-overlay.json",
      workflowInputsJson: benchmarkLocalComfyWorkflowInputsJson,
      evidenceLabel: "CustomCardTextComposer final images"
    }
  ]
};

export const aiFlowDefinitions = [
  {
    flowId: "customer-chat",
    label: "Customer chat",
    capability: "text-chat",
    defaultPrimaryAdapterId: "cloudflare-workers-ai-chat",
    defaultFallbackAdapterId: "",
    allowedAdapterIds: textProviderAdapterIds,
    liveDefault: "auto",
    queueDefault: false,
    fallbackQueueDefault: false,
    rateLimitPerMinute: 12,
    monthlyBudgetCents: 2500,
    perRequestBudgetCents: 10,
    maxRetries: 1,
    contextWindowTokens: 0,
    maxTokens: 700,
    temperature: 0.4,
    promptInstructions:
      "You are CustomCard's private card concierge. Answer briefly, use only customer-approved memories, do not claim orders were placed, and keep checkout/payment instructions human-reviewed."
  },
  {
    flowId: "card-copy",
    label: "Card copy",
    capability: "text-chat",
    defaultPrimaryAdapterId: "cloudflare-workers-ai-chat",
    defaultFallbackAdapterId: "huggingface-chat",
    allowedAdapterIds: textProviderAdapterIds,
    liveDefault: "auto",
    queueDefault: false,
    fallbackQueueDefault: true,
    rateLimitPerMinute: 4,
    monthlyBudgetCents: 5000,
    perRequestBudgetCents: 5,
    maxRetries: 1,
    contextWindowTokens: 8192,
    maxTokens: 3200,
    temperature: 0.62,
    promptInstructions:
      "Create a cohesive folded 5x7 greeting-card theme, layout, and copy plan, panel-specific visual cues, and safe text-layout plan. Return only JSON with exactly four panels: front, inside-left, inside-right, back. Use approved memories only, avoid private claims, and make the card feel finished rather than terse. Each panel needs purposeful copy, art_direction layout notes, visual_cue composition notes, text_layout enum choices, and a literal one-panel image_prompt. The app overlays exact typography, so image prompts reserve text-safe space instead of asking the image model to render final words."
  },
  {
    flowId: "card-image",
    label: "Card image",
    capability: "image-generation",
    defaultPrimaryAdapterId: "local-comfyui-api-image",
    defaultFallbackAdapterId: "cloudflare-workers-ai-image",
    allowedAdapterIds: imageProviderAdapterIds,
    liveDefault: true,
    queueDefault: true,
    fallbackQueueDefault: true,
    rateLimitPerMinute: 8,
    monthlyBudgetCents: 4000,
    perRequestBudgetCents: 1,
    maxRetries: 1,
    contextWindowTokens: 0,
    maxTokens: 0,
    temperature: 0,
    renderingMode: "final-text-composited",
    workflowId: "customcard-production-text-overlay",
    workflowPath: "comfyui-workflows/customcard-production-text-overlay.json",
    workflowInputsJson: benchmarkLocalComfyWorkflowInputsJson,
    promptInstructions:
      "Create one portrait 5x7 print panel at a time from the card-copy flow's literal image_prompt. Do not use internal form labels as art direction, do not make a collage or folded mockup, and reserve exact typography for the CustomCardTextComposer final text workflow."
  }
];

const placeholderValues = new Set([
  "",
  "changeme",
  "disabled",
  "disabled_until_certified",
  "dummy",
  "example",
  "example-secret",
  "fake",
  "not-set",
  "replace-me",
  "replace-me-do-not-commit-real-secret",
  "sample",
  "todo",
  "unset"
]);

export const aiProviderEnvRequirements = {
  "cloudflare-workers-ai-chat": [
    ...cloudflareTextRequiredCredentialGroups
  ],
  "cloudflare-workers-ai-image": [
    ["CLOUDFLARE_ACCOUNT_ID"],
    ["CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN", "CLOUDFLARE_API_TOKEN"]
  ],
  "openai-responses-chat": [["OPENAI_API_KEY"]],
  "openai-images": [["OPENAI_API_KEY"]],
  "anthropic-messages-chat": [["ANTHROPIC_API_KEY"]],
  "google-gemini-chat": [["GOOGLE_GENERATIVE_AI_API_KEY"]],
  "google-gemini-image": [["GOOGLE_GENERATIVE_AI_API_KEY"]],
  "deepai-text2img-image": [["DEEPAI_API_KEY"]],
  "huggingface-chat": [["HUGGINGFACE_API_TOKEN"]],
  "huggingface-image": [["HUGGINGFACE_API_TOKEN"]],
  "mistral-chat": [["MISTRAL_API_KEY"]],
  "groq-chat": [["GROQ_API_KEY"]],
  "together-chat": [["TOGETHER_API_KEY"]],
  "together-image": [["TOGETHER_API_KEY"]],
  "deepseek-chat": [["DEEPSEEK_API_KEY"]],
  "fireworks-chat": [["FIREWORKS_API_KEY"]],
  "perplexity-sonar-chat": [["PERPLEXITY_API_KEY"]],
  "xai-chat": [["XAI_API_KEY"]],
  "self-hosted-openai-compatible-chat": [["SELF_HOSTED_LLM_BASE_URL"], ["SELF_HOSTED_LLM_API_KEY"]],
  "local-openai-compatible-chat": [["CUSTOMCARD_LOCAL_LLM_BASE_URL", "LMSTUDIO_BASE_URL", "KOBOLDCPP_BASE_URL"]],
  "local-comfyui-api-image": [["CUSTOMCARD_COMFYUI_URL", "COMFYUI_URL"]],
  "stability-stable-image": [["STABILITY_API_KEY"]],
  "replicate-image": [["REPLICATE_API_TOKEN"]],
  "fal-image": [["FAL_KEY"]],
  "bfl-flux-image": [["BFL_API_KEY"]],
  "runcomfy-model-api-image": [["RUNCOMFY_API_TOKEN"]]
};

const defaultModelsByAdapter = {
  "cloudflare-workers-ai-chat": productionCardCopyModel,
  "cloudflare-workers-ai-image": "@cf/black-forest-labs/flux-1-schnell",
  "openai-responses-chat": "gpt-4o-mini",
  "openai-images": "gpt-image-2",
  "anthropic-messages-chat": "claude-3-5-haiku-latest",
  "google-gemini-chat": "gemini-1.5-flash",
  "google-gemini-image": "gemini-3.1-flash-image",
  "deepai-text2img-image": "text2img",
  "huggingface-chat": "Qwen/Qwen3-235B-A22B-Instruct-2507",
  "huggingface-image": "black-forest-labs/FLUX.1-schnell",
  "mistral-chat": "mistral-small-latest",
  "groq-chat": "llama-3.1-8b-instant",
  "together-chat": "meta-llama/Llama-3.2-3B-Instruct-Turbo",
  "together-image": "black-forest-labs/FLUX.1-schnell-Free",
  "deepseek-chat": "deepseek-chat",
  "fireworks-chat": "accounts/fireworks/models/llama-v3p1-8b-instruct",
  "perplexity-sonar-chat": "sonar",
  "xai-chat": "grok-3-mini",
  "self-hosted-openai-compatible-chat": "local-default",
  "local-openai-compatible-chat": "local-default",
  "local-comfyui-api-image": "DreamShaper_8_pruned.safetensors",
  "stability-stable-image": "stable-image-core",
  "replicate-image": "black-forest-labs/flux-schnell",
  "fal-image": "fal-ai/flux/schnell",
  "bfl-flux-image": "flux-pro",
  "runcomfy-model-api-image": "blackforestlabs/flux-2/dev/text-to-image"
};

export const aiProviderModelPresets = {
  "local-openai-compatible-chat": [
    { id: "local-default", label: "Local OpenAI-compatible server default" },
    { id: "qwen3-14b-instruct-q4", label: "Qwen3 14B Instruct Q4 local" },
    { id: "qwen3-8b-instruct-q4", label: "Qwen3 8B Instruct Q4 local" }
  ],
  "local-comfyui-api-image": [
    { id: "DreamShaper_8_pruned.safetensors", label: "Local ComfyUI DreamShaper 8" },
    {
      id: "sd_xl_turbo_1.0_fp16.safetensors",
      label: "SDXL Turbo production text composer proof",
      detail: "Older production text composer checkpoint; keep selectable for comparison runs."
    }
  ],
  "runcomfy-model-api-image": [
    {
      id: "blackforestlabs/flux-2/dev/text-to-image",
      label: "Flux 2 Dev Free",
      detail: "RunComfy limited-time free multi-image text-to-image model"
    }
  ],
  "deepai-text2img-image": [{ id: "text2img", label: "DeepAI text2img" }],
  "cloudflare-workers-ai-image": [
    { id: "@cf/black-forest-labs/flux-1-schnell", label: "Cloudflare FLUX.1 Schnell" },
    { id: "@cf/bytedance/stable-diffusion-xl-lightning", label: "Cloudflare SDXL Lightning" }
  ],
  "openai-images": [{ id: "gpt-image-2", label: "OpenAI gpt-image-2" }],
  "google-gemini-image": [{ id: "gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image" }],
  "huggingface-image": [
    { id: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 Schnell" },
    { id: "Qwen/Qwen-Image", label: "Qwen Image" },
    { id: "Qwen/Qwen-Image-2512", label: "Qwen Image 2512" },
    { id: "Tongyi-MAI/Z-Image-Turbo", label: "Z-Image Turbo" }
  ],
  "stability-stable-image": [{ id: "stable-image-core", label: "Stable Image Core" }],
  "replicate-image": [{ id: "black-forest-labs/flux-schnell", label: "Replicate FLUX Schnell" }],
  "fal-image": [{ id: "fal-ai/flux/schnell", label: "fal FLUX Schnell" }],
  "bfl-flux-image": [{ id: "flux-pro", label: "BFL FLUX Pro" }]
};

export function hasUsableAiEnvValue(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return Boolean(
    normalized &&
      !placeholderValues.has(normalized) &&
      !normalized.startsWith("test-") &&
      !normalized.startsWith("dummy-") &&
      !normalized.startsWith("fake-") &&
      !normalized.startsWith("sample-")
  );
}

export function adapterMissingEnv(adapterId, env = {}) {
  const groups = aiProviderEnvRequirements[adapterId] ?? [];
  return groups.flatMap((group) =>
    group.some((envKey) => hasUsableAiEnvValue(env[envKey])) ? [] : [group.join(" or ")]
  );
}

export function isAiAdapterConfigured(adapterId, env = {}) {
  return adapterMissingEnv(adapterId, env).length === 0;
}

export function modelForAiAdapter(adapterId, env = {}, overrideModel = "") {
  if (hasUsableAiEnvValue(overrideModel)) return String(overrideModel).trim();
  return defaultModelsByAdapter[adapterId] ?? "";
}

export function resolveAiFlowConfigs(env = {}, adminOverrides = []) {
  return aiFlowDefinitions.map((definition) => resolveAiFlowConfig(definition.flowId, env, adminOverrides));
}

export function resolveAiFlowConfig(flowId, env = {}, adminOverrides = []) {
  const definition = getAiFlowDefinition(flowId);
  const rawOverride = findFlowOverride(flowId, adminOverrides);
  const hasAdminOverride = Boolean(rawOverride && typeof rawOverride === "object");
  const override = normalizeAiFlowOverride(rawOverride, definition, env);
  const primaryAdapterId = override.primaryAdapterId || definition.defaultPrimaryAdapterId;
  const fallbackAdapterId =
    override.fallbackAdapterId || definition.defaultFallbackAdapterId;
  const promptInstructions = override.promptInstructions || definition.promptInstructions;
  const modelOverride = override.model;
  const model = modelForAiAdapter(
    primaryAdapterId,
    env,
    modelOverride
  );
  const rateLimitPerMinute = override.rateLimitPerMinute;
  const monthlyBudgetCents = override.monthlyBudgetCents;
  const perRequestBudgetCents = override.perRequestBudgetCents;
  const queueEnabled = override.queueEnabled;
  const fallbackQueueEnabled = override.fallbackQueueEnabled;
  const liveDefault =
    definition.liveDefault === "auto"
      ? true
      : Boolean(definition.liveDefault);
  const liveProviderCallsEnabled = hasAdminOverride ? Boolean(override.liveProviderCallsEnabled) : Boolean(liveDefault);
  const maxRetries = override.maxRetries;
  const contextWindowTokens = override.contextWindowTokens;
  const maxTokens = override.maxTokens;
  const temperature = override.temperature;
  const renderingMode = override.renderingMode;
  const workflowId = override.workflowId;
  const workflowPath = override.workflowPath;
  const workflowJson = override.workflowJson;
  const workflowInputsJson = override.workflowInputsJson;
  const configuredAdapterIds = definition.allowedAdapterIds.filter((adapterId) => isAiAdapterConfigured(adapterId, env));
  const primaryMissingEnv = adapterMissingEnv(primaryAdapterId, env);
  const blockedReasons = [
    ...(definition.allowedAdapterIds.includes(primaryAdapterId) ? [] : [`Adapter ${primaryAdapterId} is not allowed for ${flowId}.`]),
    ...(liveProviderCallsEnabled ? [] : [`Live provider calls disabled for ${flowId}.`]),
    ...primaryMissingEnv.map((missing) => `${primaryAdapterId} missing ${missing}.`),
    ...(rateLimitPerMinute > 0 ? [] : [`${flowId} rate limit must be greater than zero.`]),
    ...(perRequestBudgetCents >= 0 && monthlyBudgetCents >= 0 ? [] : [`${flowId} budget controls must be non-negative.`])
  ];

  return {
    flowId,
    label: definition.label,
    capability: definition.capability,
    primaryAdapterId,
    fallbackAdapterId,
    allowedAdapterIds: [...definition.allowedAdapterIds],
    configuredAdapterIds,
    model,
    promptInstructions,
    rateLimitPerMinute,
    monthlyBudgetCents,
    perRequestBudgetCents,
    queueEnabled,
    fallbackQueueEnabled,
    liveProviderCallsEnabled,
    maxRetries,
    contextWindowTokens,
    maxTokens,
    temperature,
    renderingMode,
    workflowId,
    workflowPath,
    workflowJson,
    workflowInputsJson,
    blockedReasons,
    readyForLiveCalls: blockedReasons.length === 0
  };
}

export function summarizeAiFlowConfigs(env = {}, adminOverrides = []) {
  const flows = resolveAiFlowConfigs(env, adminOverrides);
  return {
    total: flows.length,
    liveEnabled: flows.filter((flow) => flow.liveProviderCallsEnabled).length,
    readyForLiveCalls: flows.filter((flow) => flow.readyForLiveCalls).length,
    queued: flows.filter((flow) => flow.queueEnabled).length,
    fallbackQueued: flows.filter((flow) => flow.fallbackQueueEnabled).length,
    blocked: flows.filter((flow) => flow.blockedReasons.length > 0).length,
    configuredProviders: Array.from(new Set(flows.flatMap((flow) => flow.configuredAdapterIds))).sort(),
    flows
  };
}

export function summarizeBenchmarkBestAiWorkflowParity(adminOverrides = [], env = {}) {
  const configs = normalizeAiFlowAdminConfigs(adminOverrides, env);
  const rows = benchmarkBestAiWorkflow.flowExpectations.map((expectation) => {
    const config = configs.find((candidate) => candidate.flowId === expectation.flowId);
    const definition = getAiFlowDefinition(expectation.flowId);
    const checks = benchmarkParityChecks(expectation, config);
    const missing = checks.flatMap((check) => (check.matched ? [] : [check.label]));
    return {
      flowId: expectation.flowId,
      label: definition.label,
      matched: missing.length === 0,
      missing,
      checks,
      evidenceLabel: expectation.evidenceLabel
    };
  });

  return {
    workflowId: benchmarkBestAiWorkflow.id,
    label: benchmarkBestAiWorkflow.label,
    status: rows.every((row) => row.matched) ? "matched" : "drift",
    matched: rows.filter((row) => row.matched).length,
    total: rows.length,
    evidencePath: benchmarkBestAiWorkflow.evidencePath,
    summaryPath: benchmarkBestAiWorkflow.summaryPath,
    rationale: benchmarkBestAiWorkflow.rationale,
    blockers: [...benchmarkBestAiWorkflow.blockers],
    rows
  };
}

export function normalizeAiFlowAdminConfigs(input, env = {}) {
  const overrides = Array.isArray(input) ? input : [];
  return aiFlowDefinitions.map((definition) => normalizeAiFlowOverride(findFlowOverride(definition.flowId, overrides), definition, env));
}

export function buildDefaultAiFlowAdminConfigs(env = {}) {
  return aiFlowDefinitions.map((definition) => {
    const resolved = resolveAiFlowConfig(definition.flowId, env, []);
    return {
      flowId: definition.flowId,
      primaryAdapterId: resolved.primaryAdapterId,
      fallbackAdapterId: resolved.fallbackAdapterId,
      model: resolved.model,
      promptInstructions: resolved.promptInstructions,
      rateLimitPerMinute: resolved.rateLimitPerMinute,
      monthlyBudgetCents: resolved.monthlyBudgetCents,
      perRequestBudgetCents: resolved.perRequestBudgetCents,
      queueEnabled: resolved.queueEnabled,
      fallbackQueueEnabled: resolved.fallbackQueueEnabled,
      liveProviderCallsEnabled: resolved.liveProviderCallsEnabled,
      maxRetries: resolved.maxRetries,
      contextWindowTokens: resolved.contextWindowTokens,
      maxTokens: resolved.maxTokens,
      temperature: resolved.temperature,
      renderingMode: resolved.renderingMode,
      workflowId: resolved.workflowId,
      workflowPath: resolved.workflowPath,
      workflowJson: resolved.workflowJson,
      workflowInputsJson: resolved.workflowInputsJson
    };
  });
}

export function getAiFlowDefinition(flowId) {
  const definition = aiFlowDefinitions.find((flow) => flow.flowId === flowId);
  if (!definition) throw new Error(`Unknown AI flow: ${flowId}`);
  return definition;
}

export function flowEnvKey(flowId) {
  return String(flowId).replace(/[^a-z0-9]+/gi, "_").toUpperCase();
}

function findFlowOverride(flowId, adminOverrides) {
  return Array.isArray(adminOverrides)
    ? adminOverrides.find((override) => override && override.flowId === flowId)
    : undefined;
}

function normalizeAiFlowOverride(input, definition, env) {
  const fallback = buildFallbackOverride(definition, env);
  if (!input || typeof input !== "object") return fallback;
  const primaryAdapterId = normalizeAdapter(input.primaryAdapterId, definition.allowedAdapterIds, fallback.primaryAdapterId);
  const fallbackAdapterId = normalizeAdapter(input.fallbackAdapterId, definition.allowedAdapterIds, fallback.fallbackAdapterId);
  const supportsLocalWorkflow =
    definition.capability === "image-generation" && primaryAdapterId === "local-comfyui-api-image";
  const supportsImageInputs = definition.capability === "image-generation";
  const workflowInputsFallback = primaryAdapterId === fallback.primaryAdapterId ? fallback.workflowInputsJson : "";
  const renderingMode = supportsLocalWorkflow
    ? normalizeRenderingMode(input.renderingMode, fallback.renderingMode)
    : "";

  return {
    flowId: definition.flowId,
    primaryAdapterId,
    fallbackAdapterId,
    model: normalizeString(input.model, modelForAiAdapter(primaryAdapterId, env), 120),
    promptInstructions: normalizeString(input.promptInstructions, fallback.promptInstructions, 2000),
    rateLimitPerMinute: normalizeNumber(input.rateLimitPerMinute, fallback.rateLimitPerMinute, 1, 120),
    monthlyBudgetCents: normalizeNumber(input.monthlyBudgetCents, fallback.monthlyBudgetCents, 0, 500_000),
    perRequestBudgetCents: normalizeNumber(input.perRequestBudgetCents, fallback.perRequestBudgetCents, 0, 10_000),
    queueEnabled: normalizeBoolean(input.queueEnabled, fallback.queueEnabled),
    fallbackQueueEnabled: normalizeBoolean(input.fallbackQueueEnabled, fallback.fallbackQueueEnabled),
    liveProviderCallsEnabled: normalizeBoolean(input.liveProviderCallsEnabled, fallback.liveProviderCallsEnabled),
    maxRetries: normalizeNumber(input.maxRetries, fallback.maxRetries, 0, 3),
    contextWindowTokens: normalizeNumber(input.contextWindowTokens, fallback.contextWindowTokens, 0, 1_000_000),
    maxTokens: normalizeNumber(input.maxTokens, fallback.maxTokens, 0, 4000),
    temperature: normalizeNumber(input.temperature, fallback.temperature, 0, 2),
    renderingMode,
    workflowId: supportsLocalWorkflow ? normalizeOptionalString(input.workflowId, fallback.workflowId, 160) : "",
    workflowPath: supportsLocalWorkflow ? normalizeOptionalString(input.workflowPath, fallback.workflowPath, 500) : "",
    workflowJson: supportsLocalWorkflow ? normalizeOptionalString(input.workflowJson, fallback.workflowJson, 100_000) : "",
    workflowInputsJson: supportsImageInputs ? normalizeOptionalString(input.workflowInputsJson, workflowInputsFallback, 50_000) : ""
  };
}

function buildFallbackOverride(definition, env) {
  const primaryAdapterId = definition.defaultPrimaryAdapterId;
  return {
    flowId: definition.flowId,
    primaryAdapterId,
    fallbackAdapterId: definition.defaultFallbackAdapterId,
    model: modelForAiAdapter(primaryAdapterId, env),
    promptInstructions: definition.promptInstructions,
    rateLimitPerMinute: definition.rateLimitPerMinute,
    monthlyBudgetCents: definition.monthlyBudgetCents,
    perRequestBudgetCents: definition.perRequestBudgetCents,
    queueEnabled: definition.queueDefault,
    fallbackQueueEnabled: definition.fallbackQueueDefault,
    liveProviderCallsEnabled: definition.liveDefault === "auto" ? true : Boolean(definition.liveDefault),
    maxRetries: definition.maxRetries,
    contextWindowTokens: definition.contextWindowTokens,
    maxTokens: definition.maxTokens,
    temperature: definition.temperature,
    renderingMode: definition.renderingMode ?? "",
    workflowId: definition.workflowId ?? "",
    workflowPath: definition.workflowPath ?? "",
    workflowJson: definition.workflowJson ?? "",
    workflowInputsJson: definition.workflowInputsJson ?? ""
  };
}

function benchmarkParityChecks(expectation, config) {
  if (!config) return [{ label: `${expectation.flowId} config missing`, matched: false }];
  const checks = [
    parityCheck("Provider", config.primaryAdapterId, expectation.primaryAdapterId),
    parityCheck("Model", config.model, expectation.model),
    parityCheck("Fallback", config.fallbackAdapterId, expectation.fallbackAdapterId),
    parityCheck("Context", config.contextWindowTokens, expectation.contextWindowTokens),
    parityCheck("Max output", config.maxTokens, expectation.maxTokens),
    parityCheck("Temperature", config.temperature, expectation.temperature),
    parityCheck("Rendering", config.renderingMode, expectation.renderingMode),
    parityCheck("Workflow ID", config.workflowId, expectation.workflowId),
    parityCheck("Workflow path", config.workflowPath, expectation.workflowPath)
  ];
  return checks.filter((check) => check.expected !== undefined && check.expected !== "");
}

function parityCheck(label, actual, expected) {
  return {
    label,
    actual: actual ?? "",
    expected,
    matched: expected === undefined || expected === "" || actual === expected
  };
}

function normalizeAdapter(adapterId, allowedAdapterIds, fallback) {
  return typeof adapterId === "string" && allowedAdapterIds.includes(adapterId) ? adapterId : fallback;
}

function normalizeString(value, fallback, maxLength) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
}

function normalizeOptionalString(value, fallback, maxLength) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : "";
}

function normalizeNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on", "enabled"].includes(normalized)) return true;
    if (["0", "false", "no", "off", "disabled"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeRenderingMode(value, fallback) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (["", "final-text-composited"].includes(normalized)) return normalized;
  return fallback || "";
}
