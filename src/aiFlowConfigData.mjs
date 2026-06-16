export const aiFlowAdminConfigStorageKey = "customcard-ai-flow-admin-config-v1";

const textProviderAdapterIds = [
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
    maxTokens: 700,
    temperature: 0.4,
    promptInstructions:
      "You are CustomCard's private card concierge. Answer briefly, use only customer-approved memories, do not claim orders were placed, and keep checkout/payment instructions human-reviewed."
  },
  {
    flowId: "card-copy",
    label: "Card copy",
    capability: "text-chat",
    defaultPrimaryAdapterId: "huggingface-chat",
    defaultFallbackAdapterId: "cloudflare-workers-ai-chat",
    allowedAdapterIds: textProviderAdapterIds,
    liveDefault: "auto",
    queueDefault: false,
    fallbackQueueDefault: true,
    rateLimitPerMinute: 4,
    monthlyBudgetCents: 5000,
    perRequestBudgetCents: 5,
    maxRetries: 1,
    maxTokens: 2200,
    temperature: 0.62,
    promptInstructions:
      "Create a cohesive folded 5x7 greeting-card theme, layout, and copy plan, panel-specific visual cues, and safe text-layout plan. Return only JSON with exactly four panels: front, inside-left, inside-right, back. Use approved memories only, avoid private claims, and make the card feel finished rather than terse. Each panel needs purposeful copy, art_direction layout notes, visual_cue composition notes, text_layout enum choices, and a literal one-panel image_prompt. The app overlays exact typography, so image prompts reserve text-safe space instead of asking the image model to render final words."
  },
  {
    flowId: "card-image",
    label: "Card image",
    capability: "image-generation",
    defaultPrimaryAdapterId: "runcomfy-model-api-image",
    defaultFallbackAdapterId: "cloudflare-workers-ai-image",
    allowedAdapterIds: imageProviderAdapterIds,
    liveDefault: true,
    queueDefault: true,
    fallbackQueueDefault: true,
    rateLimitPerMinute: 8,
    monthlyBudgetCents: 4000,
    perRequestBudgetCents: 1,
    maxRetries: 1,
    maxTokens: 0,
    temperature: 0,
    promptInstructions:
      "Create one portrait 5x7 print panel at a time from the card-copy flow's literal image_prompt. Do not use internal form labels as art direction, do not make a collage or folded mockup, and reserve exact typography for app-rendered overlays."
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
    ["CLOUDFLARE_ACCOUNT_ID"],
    ["CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", "CLOUDFLARE_API_TOKEN"],
    ["CLOUDFLARE_WORKERS_AI_TEXT_MODEL"]
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
  "stability-stable-image": [["STABILITY_API_KEY"]],
  "replicate-image": [["REPLICATE_API_TOKEN"]],
  "fal-image": [["FAL_KEY"]],
  "bfl-flux-image": [["BFL_API_KEY"]],
  "runcomfy-model-api-image": [["RUNCOMFY_API_TOKEN"]]
};

const aiProviderModelEnvKeys = {
  "cloudflare-workers-ai-chat": ["CUSTOMCARD_CLOUDFLARE_TEXT_MODEL", "CLOUDFLARE_WORKERS_AI_TEXT_MODEL"],
  "cloudflare-workers-ai-image": ["CUSTOMCARD_CLOUDFLARE_IMAGE_MODEL", "CLOUDFLARE_WORKERS_AI_IMAGE_MODEL"],
  "openai-responses-chat": ["CUSTOMCARD_OPENAI_TEXT_MODEL", "OPENAI_TEXT_MODEL", "CARD_TEXT_MODEL"],
  "openai-images": ["CUSTOMCARD_OPENAI_IMAGE_MODEL", "OPENAI_IMAGE_MODEL", "CARD_IMAGE_MODEL"],
  "anthropic-messages-chat": ["CUSTOMCARD_ANTHROPIC_TEXT_MODEL", "ANTHROPIC_MODEL", "CARD_TEXT_MODEL"],
  "google-gemini-chat": ["CUSTOMCARD_GEMINI_TEXT_MODEL", "GEMINI_TEXT_MODEL", "GOOGLE_GENERATIVE_AI_MODEL"],
  "google-gemini-image": ["CUSTOMCARD_GEMINI_IMAGE_MODEL", "GEMINI_IMAGE_MODEL", "CARD_IMAGE_MODEL"],
  "deepai-text2img-image": ["CUSTOMCARD_DEEPAI_IMAGE_MODEL", "DEEPAI_IMAGE_MODEL"],
  "huggingface-chat": ["CUSTOMCARD_HUGGINGFACE_TEXT_MODEL", "HUGGINGFACE_TEXT_MODEL"],
  "huggingface-image": ["CUSTOMCARD_HUGGINGFACE_IMAGE_MODEL", "HUGGINGFACE_IMAGE_MODEL"],
  "mistral-chat": ["CUSTOMCARD_MISTRAL_TEXT_MODEL", "MISTRAL_MODEL"],
  "groq-chat": ["CUSTOMCARD_GROQ_TEXT_MODEL", "GROQ_MODEL"],
  "together-chat": ["CUSTOMCARD_TOGETHER_TEXT_MODEL", "TOGETHER_TEXT_MODEL"],
  "together-image": ["CUSTOMCARD_TOGETHER_IMAGE_MODEL", "TOGETHER_IMAGE_MODEL"],
  "deepseek-chat": ["CUSTOMCARD_DEEPSEEK_TEXT_MODEL", "DEEPSEEK_MODEL"],
  "fireworks-chat": ["CUSTOMCARD_FIREWORKS_TEXT_MODEL", "FIREWORKS_TEXT_MODEL"],
  "perplexity-sonar-chat": ["CUSTOMCARD_PERPLEXITY_TEXT_MODEL", "PERPLEXITY_MODEL"],
  "xai-chat": ["CUSTOMCARD_XAI_TEXT_MODEL", "XAI_MODEL"],
  "self-hosted-openai-compatible-chat": ["CUSTOMCARD_SELF_HOSTED_TEXT_MODEL", "SELF_HOSTED_LLM_MODEL"],
  "stability-stable-image": ["CUSTOMCARD_STABILITY_IMAGE_MODEL", "STABILITY_IMAGE_MODEL"],
  "replicate-image": ["CUSTOMCARD_REPLICATE_IMAGE_MODEL", "REPLICATE_IMAGE_MODEL"],
  "fal-image": ["CUSTOMCARD_FAL_IMAGE_MODEL", "FAL_IMAGE_MODEL"],
  "bfl-flux-image": ["CUSTOMCARD_BFL_IMAGE_MODEL", "BFL_IMAGE_MODEL"],
  "runcomfy-model-api-image": []
};

const defaultModelsByAdapter = {
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
  "stability-stable-image": "stable-image-core",
  "replicate-image": "black-forest-labs/flux-schnell",
  "fal-image": "fal-ai/flux/schnell",
  "bfl-flux-image": "flux-pro",
  "runcomfy-model-api-image": "blackforestlabs/flux-2/dev/text-to-image"
};

export const aiProviderModelPresets = {
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
  for (const envKey of aiProviderModelEnvKeys[adapterId] ?? []) {
    if (hasUsableAiEnvValue(env[envKey])) return String(env[envKey]).trim();
  }
  return defaultModelsByAdapter[adapterId] ?? "";
}

export function resolveAiFlowConfigs(env = {}, adminOverrides = []) {
  return aiFlowDefinitions.map((definition) => resolveAiFlowConfig(definition.flowId, env, adminOverrides));
}

export function resolveAiFlowConfig(flowId, env = {}, adminOverrides = []) {
  const definition = getAiFlowDefinition(flowId);
  const override = normalizeAiFlowOverride(findFlowOverride(flowId, adminOverrides), definition, env);
  const key = flowEnvKey(flowId);
  const primaryAdapterId =
    readEnvString(env, `CUSTOMCARD_AI_${key}_ADAPTER_ID`) ||
    readEnvString(env, `CUSTOMCARD_AI_${key}_PROVIDER`) ||
    override.primaryAdapterId ||
    pickConfiguredAiAdapter(definition, env) ||
    definition.defaultPrimaryAdapterId;
  const fallbackAdapterId =
    readEnvString(env, `CUSTOMCARD_AI_${key}_FALLBACK_ADAPTER_ID`) ||
    override.fallbackAdapterId ||
    definition.defaultFallbackAdapterId;
  const promptInstructions =
    readEnvString(env, `CUSTOMCARD_AI_${key}_PROMPT_INSTRUCTIONS`) ||
    override.promptInstructions ||
    definition.promptInstructions;
  const model = modelForAiAdapter(
    primaryAdapterId,
    env,
    readEnvString(env, `CUSTOMCARD_AI_${key}_MODEL`) || override.model
  );
  const rateLimitPerMinute = readEnvNumber(
    env,
    `CUSTOMCARD_AI_${key}_RATE_LIMIT_PER_MINUTE`,
    override.rateLimitPerMinute ?? definition.rateLimitPerMinute
  );
  const monthlyBudgetCents = readEnvNumber(
    env,
    `CUSTOMCARD_AI_${key}_MONTHLY_BUDGET_CENTS`,
    override.monthlyBudgetCents ?? definition.monthlyBudgetCents
  );
  const perRequestBudgetCents = readEnvNumber(
    env,
    `CUSTOMCARD_AI_${key}_PER_REQUEST_BUDGET_CENTS`,
    override.perRequestBudgetCents ?? definition.perRequestBudgetCents
  );
  const queueEnabled = readEnvBoolean(
    env,
    `CUSTOMCARD_AI_${key}_QUEUE_ENABLED`,
    override.queueEnabled ?? definition.queueDefault
  );
  const fallbackQueueEnabled = readEnvBoolean(
    env,
    `CUSTOMCARD_AI_${key}_FALLBACK_QUEUE_ENABLED`,
    override.fallbackQueueEnabled ?? definition.fallbackQueueDefault
  );
  const liveDefault =
    definition.liveDefault === "auto"
      ? isAiAdapterConfigured(primaryAdapterId, env)
      : Boolean(definition.liveDefault);
  const liveProviderCallsEnabled = Boolean(override.liveProviderCallsEnabled ?? liveDefault);
  const maxRetries = readEnvNumber(env, `CUSTOMCARD_AI_${key}_MAX_RETRIES`, override.maxRetries ?? definition.maxRetries);
  const maxTokens = readEnvNumber(env, `CUSTOMCARD_AI_${key}_MAX_TOKENS`, override.maxTokens ?? definition.maxTokens);
  const temperature = readEnvNumber(
    env,
    `CUSTOMCARD_AI_${key}_TEMPERATURE`,
    override.temperature ?? definition.temperature
  );
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
    maxTokens,
    temperature,
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
      maxTokens: resolved.maxTokens,
      temperature: resolved.temperature
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

  return {
    flowId: definition.flowId,
    primaryAdapterId,
    fallbackAdapterId,
    model: normalizeString(input.model, fallback.model, 120),
    promptInstructions: normalizeString(input.promptInstructions, fallback.promptInstructions, 2000),
    rateLimitPerMinute: normalizeNumber(input.rateLimitPerMinute, fallback.rateLimitPerMinute, 1, 120),
    monthlyBudgetCents: normalizeNumber(input.monthlyBudgetCents, fallback.monthlyBudgetCents, 0, 500_000),
    perRequestBudgetCents: normalizeNumber(input.perRequestBudgetCents, fallback.perRequestBudgetCents, 0, 10_000),
    queueEnabled: normalizeBoolean(input.queueEnabled, fallback.queueEnabled),
    fallbackQueueEnabled: normalizeBoolean(input.fallbackQueueEnabled, fallback.fallbackQueueEnabled),
    liveProviderCallsEnabled: normalizeBoolean(input.liveProviderCallsEnabled, fallback.liveProviderCallsEnabled),
    maxRetries: normalizeNumber(input.maxRetries, fallback.maxRetries, 0, 3),
    maxTokens: normalizeNumber(input.maxTokens, fallback.maxTokens, 0, 4000),
    temperature: normalizeNumber(input.temperature, fallback.temperature, 0, 2)
  };
}

function buildFallbackOverride(definition, env) {
  const primaryAdapterId = pickConfiguredAiAdapter(definition, env) || definition.defaultPrimaryAdapterId;
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
    maxTokens: definition.maxTokens,
    temperature: definition.temperature
  };
}

function pickConfiguredAiAdapter(definition, env) {
  if (isAiAdapterConfigured(definition.defaultPrimaryAdapterId, env)) return definition.defaultPrimaryAdapterId;
  const configuredAdapterIds = definition.allowedAdapterIds.filter((adapterId) => isAiAdapterConfigured(adapterId, env));
  return configuredAdapterIds.find((adapterId) => adapterId !== definition.defaultFallbackAdapterId) ?? configuredAdapterIds[0];
}

function normalizeAdapter(adapterId, allowedAdapterIds, fallback) {
  return typeof adapterId === "string" && allowedAdapterIds.includes(adapterId) ? adapterId : fallback;
}

function normalizeString(value, fallback, maxLength) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : fallback;
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

function readEnvString(env, key) {
  return hasUsableAiEnvValue(env[key]) ? String(env[key]).trim() : "";
}

function readEnvBoolean(env, key, fallback) {
  return normalizeBoolean(env[key], fallback);
}

function readEnvNumber(env, key, fallback) {
  return normalizeNumber(env[key], fallback, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}
