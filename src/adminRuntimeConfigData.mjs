import {
  adapterMissingEnv,
  benchmarkBestAiWorkflow,
  buildDefaultAiFlowAdminConfigs,
  normalizeAiFlowAdminConfigs,
  summarizeAiFlowConfigs
} from "./aiFlowConfigData.mjs";

export const adminAiFlowConfigsRoute = "/api/admin/ai-flow-configs";
export const adminWorkerConfigRoute = "/api/admin/worker-config";
export const adminRuntimeConfigKeys = Object.freeze({
  aiFlowConfigs: "ai-flow-configs",
  safetyControls: "safety-controls",
  workerConfig: "worker-config"
});

const defaultWorkerConfig = Object.freeze({
  batchSize: 5,
  leaseSeconds: 300,
  retryBackoffSeconds: 60,
  pollIntervalMs: 5000
});

const defaultProviderWorkerConfig = Object.freeze({
  routeIds: ["ai-card-generate"],
  batchSize: 1,
  leaseSeconds: 3600,
  retryBackoffSeconds: 60,
  pollIntervalMs: 5000
});

export function buildAdminAiFlowConfigPayload({
  input,
  env = {},
  runtimeMode = "contract",
  version = 0,
  updatedAtIso = null,
  updatedBy = null,
  migrateLegacyDefaults = false
} = {}) {
  const configs = normalizeAdminAiFlowConfigInput(input, env, { migrateLegacyDefaults });
  const summary = summarizeAiFlowConfigs(env, configs);
  const providerReadiness = buildSelectedProviderReadiness(summary, env);
  const blockers = summary.flows.flatMap((flow) => flow.blockedReasons.map((reason) => `${flow.flowId}: ${reason}`));

  return {
    service: "customcard-admin-ai-flow-configs",
    status: blockers.length === 0 ? "ready" : "blocked",
    serverOwned: true,
    clientMaySubmitAiFlowConfig: false,
    aiFlowDefaultsVersion: benchmarkBestAiWorkflow.id,
    version: safeVersion(version),
    updatedAtIso: safeIso(updatedAtIso),
    updatedBy: safeActor(updatedBy),
    configs,
    aiFlowConfigs: configs,
    summary,
    providerReadiness,
    runtimeMode,
    repository: {
      table: "admin_runtime_configs",
      key: adminRuntimeConfigKeys.aiFlowConfigs,
      persisted: version > 0,
      rawCustomerContentStored: false,
      credentialsStored: false
    },
    blockers
  };
}

export function buildUpdatedAdminAiFlowConfigPayload({ body, env = {}, authContext, current, runtimeMode = "memory", now = () => new Date() }) {
  const currentVersion = safeVersion(current?.version);
  return buildAdminAiFlowConfigPayload({
    input: body,
    env,
    runtimeMode,
    version: currentVersion + 1,
    updatedAtIso: now().toISOString(),
    updatedBy: authContext?.userId ?? current?.updatedBy ?? null
  });
}

export function buildAdminWorkerConfigPayload({
  input,
  runtimeMode = "contract",
  version = 0,
  updatedAtIso = null,
  updatedBy = null
} = {}) {
  const config = normalizeAdminWorkerConfigInput(input);

  return {
    service: "customcard-admin-worker-config",
    status: "ready",
    serverOwned: true,
    clientMaySubmitWorkerConfig: false,
    version: safeVersion(version),
    updatedAtIso: safeIso(updatedAtIso),
    updatedBy: safeActor(updatedBy),
    worker: config.worker,
    providerWorker: config.providerWorker,
    workerConfig: config,
    runtimeMode,
    repository: {
      table: "admin_runtime_configs",
      key: adminRuntimeConfigKeys.workerConfig,
      persisted: version > 0,
      rawCustomerContentStored: false,
      credentialsStored: false
    },
    blockers: []
  };
}

export function buildUpdatedAdminWorkerConfigPayload({ body, authContext, current, runtimeMode = "memory", now = () => new Date() }) {
  const currentVersion = safeVersion(current?.version);
  return buildAdminWorkerConfigPayload({
    input: body,
    runtimeMode,
    version: currentVersion + 1,
    updatedAtIso: now().toISOString(),
    updatedBy: authContext?.userId ?? current?.updatedBy ?? null
  });
}

export function normalizeAdminAiFlowConfigInput(input, env = {}, options = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const candidate = Array.isArray(input)
    ? input
    : source.configs ?? source.aiFlowConfigs ?? source.flows ?? source.ai_flow_configs ?? [];
  const rawConfigs = Array.isArray(candidate) ? candidate : [];
  const migratedConfigs = options.migrateLegacyDefaults && source.aiFlowDefaultsVersion !== benchmarkBestAiWorkflow.id
    ? migrateLegacyBenchmarkAiFlowDefaults(rawConfigs)
    : rawConfigs;
  const configs = normalizeAiFlowAdminConfigs(migratedConfigs, env);
  return configs.length > 0 ? configs : buildDefaultAiFlowAdminConfigs(env);
}

export function normalizeAdminWorkerConfigInput(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const candidate = source.workerConfig && typeof source.workerConfig === "object" ? source.workerConfig : source;
  const workerSource = candidate.worker && typeof candidate.worker === "object" ? candidate.worker : {};
  const providerWorkerSource = candidate.providerWorker && typeof candidate.providerWorker === "object"
    ? candidate.providerWorker
    : {};

  return {
    worker: {
      batchSize: safeInteger(workerSource.batchSize, defaultWorkerConfig.batchSize, 1, 25),
      leaseSeconds: safeInteger(workerSource.leaseSeconds, defaultWorkerConfig.leaseSeconds, 30, 3600),
      retryBackoffSeconds: safeInteger(workerSource.retryBackoffSeconds, defaultWorkerConfig.retryBackoffSeconds, 5, 3600),
      pollIntervalMs: safeInteger(workerSource.pollIntervalMs, defaultWorkerConfig.pollIntervalMs, 250, 60000)
    },
    providerWorker: {
      routeIds: safeRouteIds(providerWorkerSource.routeIds, defaultProviderWorkerConfig.routeIds),
      batchSize: safeInteger(providerWorkerSource.batchSize, defaultProviderWorkerConfig.batchSize, 1, 5),
      leaseSeconds: safeInteger(providerWorkerSource.leaseSeconds, defaultProviderWorkerConfig.leaseSeconds, 30, 3600),
      retryBackoffSeconds: safeInteger(providerWorkerSource.retryBackoffSeconds, defaultProviderWorkerConfig.retryBackoffSeconds, 5, 3600),
      pollIntervalMs: safeInteger(providerWorkerSource.pollIntervalMs, defaultProviderWorkerConfig.pollIntervalMs, 250, 60000)
    }
  };
}

export function migrateLegacyBenchmarkAiFlowDefaults(configs) {
  if (!Array.isArray(configs)) return configs;
  return configs.map((config) => {
    if (!config || typeof config !== "object") return config;
    if (config.flowId === "card-copy" && isLegacyCardCopyDefault(config)) {
      return { ...config, maxTokens: benchmarkFlowExpectation("card-copy")?.maxTokens ?? 4096 };
    }
    if (config.flowId === "card-image" && isLegacyRunComfyImageDefault(config)) {
      const expectation = benchmarkFlowExpectation("card-image");
      return {
        ...config,
        primaryAdapterId: expectation?.primaryAdapterId ?? "local-comfyui-api-image",
        fallbackAdapterId: expectation?.fallbackAdapterId ?? "cloudflare-workers-ai-image",
        model: expectation?.model ?? "flux-2-klein-4b.safetensors",
        renderingMode: expectation?.renderingMode ?? "final-text-composited",
        workflowId: expectation?.workflowId ?? "customcard-flux2-klein-production-text-overlay",
        workflowPath: expectation?.workflowPath ?? "comfyui-workflows/customcard-flux2-klein-production-text-overlay.json",
        workflowJson: "",
        workflowInputsJson: expectation?.workflowInputsJson ?? ""
      };
    }
    if (config.flowId === "card-image" && isLegacyLocalComfyProductionTextDefault(config)) {
      const expectation = benchmarkFlowExpectation("card-image");
      return {
        ...config,
        primaryAdapterId: expectation?.primaryAdapterId ?? "local-comfyui-api-image",
        fallbackAdapterId: expectation?.fallbackAdapterId ?? "cloudflare-workers-ai-image",
        model: expectation?.model ?? "flux-2-klein-4b.safetensors",
        renderingMode: expectation?.renderingMode ?? "final-text-composited",
        workflowId: expectation?.workflowId ?? "customcard-flux2-klein-production-text-overlay",
        workflowPath: expectation?.workflowPath ?? "comfyui-workflows/customcard-flux2-klein-production-text-overlay.json",
        workflowJson: "",
        workflowInputsJson: expectation?.workflowInputsJson ?? ""
      };
    }
    return config;
  });
}

export function adminAiFlowConfigReadUnavailablePayload({ env = {}, runtimeMode = "postgres", error } = {}) {
  const payload = buildAdminAiFlowConfigPayload({ env, runtimeMode });
  return {
    ...payload,
    status: "blocked",
    repository: {
      ...payload.repository,
      persisted: false,
      status: "read-unavailable"
    },
    blockers: [
      ...payload.blockers,
      error instanceof Error ? `Admin AI flow config store unavailable: ${error.message}` : "Admin AI flow config store unavailable."
    ]
  };
}

function buildSelectedProviderReadiness(summary, env) {
  const adapterIds = Array.from(
    new Set(
      summary.flows
        .flatMap((flow) => [flow.primaryAdapterId, flow.fallbackAdapterId])
        .filter(Boolean)
    )
  ).sort();

  return Object.fromEntries(
    adapterIds.map((adapterId) => {
      const missingEnv = adapterMissingEnv(adapterId, env);
      return [
        adapterId,
        {
          adapterId,
          configured: missingEnv.length === 0,
          credentialConfigured: missingEnv.length === 0,
          missingEnv,
          credentialsExposed: false
        }
      ];
    })
  );
}

function benchmarkFlowExpectation(flowId) {
  return benchmarkBestAiWorkflow.flowExpectations.find((expectation) => expectation.flowId === flowId);
}

function isLegacyCardCopyDefault(config) {
  const expectation = benchmarkFlowExpectation("card-copy");
  return (
    matchesOptional(config.primaryAdapterId, expectation?.primaryAdapterId) &&
    matchesOptional(config.fallbackAdapterId, "huggingface-chat") &&
    matchesOptional(config.model, expectation?.model) &&
    numberMatches(config.contextWindowTokens, expectation?.contextWindowTokens) &&
    numberMatches(config.maxTokens, 2200) &&
    numberMatches(config.temperature, expectation?.temperature)
  );
}

function isLegacyRunComfyImageDefault(config) {
  return (
    matchesOptional(config.primaryAdapterId, "runcomfy-model-api-image") &&
    matchesOptional(config.fallbackAdapterId, "cloudflare-workers-ai-image") &&
    matchesOptional(config.model, "blackforestlabs/flux-2/dev/text-to-image") &&
    numberMatches(config.rateLimitPerMinute, 8) &&
    numberMatches(config.monthlyBudgetCents, 4000) &&
    numberMatches(config.perRequestBudgetCents, 1) &&
    numberMatches(config.maxRetries, 1) &&
    blankOptional(config.renderingMode) &&
    blankOptional(config.workflowId) &&
    blankOptional(config.workflowPath) &&
    blankOptional(config.workflowJson) &&
    blankOptional(config.workflowInputsJson)
  );
}

function isLegacyLocalComfyProductionTextDefault(config) {
  const inputs = parseWorkflowInputs(config.workflowInputsJson);
  const legacyKnownCanvas =
    blankOptional(config.workflowInputsJson) ||
    (Number(inputs.width) === 512 && Number(inputs.height) === 704) ||
    (
      Number(inputs.width) === 960 &&
      Number(inputs.height) === 1344 &&
      numberMatches(inputs.steps, 18) &&
      numberMatches(inputs.cfg, 6.5)
    );
  return (
    matchesOptional(config.primaryAdapterId, "local-comfyui-api-image") &&
    matchesOptional(config.fallbackAdapterId, "cloudflare-workers-ai-image") &&
    (
      matchesOptional(config.model, "sd_xl_turbo_1.0_fp16.safetensors") ||
      matchesOptional(config.model, "DreamShaper_8_pruned.safetensors")
    ) &&
    matchesOptional(config.renderingMode, "final-text-composited") &&
    matchesOptional(config.workflowId, "customcard-production-text-overlay") &&
    matchesOptional(config.workflowPath, "comfyui-workflows/customcard-production-text-overlay.json") &&
    blankOptional(config.workflowJson) &&
    legacyKnownCanvas
  );
}

function parseWorkflowInputs(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function matchesOptional(value, expected) {
  return value === undefined || String(value).trim() === String(expected ?? "").trim();
}

function numberMatches(value, expected) {
  if (value === undefined) return true;
  const actualNumber = Number(value);
  const expectedNumber = Number(expected);
  return Number.isFinite(actualNumber) && Number.isFinite(expectedNumber) && actualNumber === expectedNumber;
}

function blankOptional(value) {
  return value === undefined || String(value).trim() === "";
}

function safeVersion(value) {
  const number = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function safeActor(value) {
  const text = String(value ?? "").trim();
  return text.replace(/[^a-zA-Z0-9@._:-]/g, "").slice(0, 120) || null;
}

function safeIso(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function safeRouteIds(value, fallback) {
  const candidate = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\s]+/)
      : [];
  const normalized = candidate
    .map((routeId) => String(routeId ?? "").trim().replace(/[^a-zA-Z0-9._:-]/g, ""))
    .filter(Boolean);
  return Array.from(new Set(normalized.length > 0 ? normalized : fallback));
}
