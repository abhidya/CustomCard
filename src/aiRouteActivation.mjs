import {
  aiFlowDefinitions,
  aiProviderEnvRequirements,
  flowEnvKey,
  hasUsableAiEnvValue,
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig
} from "./aiFlowConfigData.mjs";
import { aiRoutePolicies } from "./aiProviderControlPlane.ts";

const serverScopedAiFlowConfigCache = new WeakMap();
const controlPlaneRoutePolicyIdsByFlowId = new Map(
  aiRoutePolicies.map((policy) => [policy.flowId, policy.id])
);

export function createAiRouteActivationContext({
  env = process.env,
  body = {},
  requestContext = {},
  serviceAiFlowAdminConfig = [],
  loadedAiFlowAdminConfig = []
} = {}) {
  const mergedAiFlowAdminConfig = mergeAiFlowAdminConfigs(
    normalizeOptionalAiFlowAdminConfigs(serviceAiFlowAdminConfig, env),
    serverScopedAiFlowConfig(env),
    normalizeOptionalAiFlowAdminConfigs(extractLoadedAiFlowAdminConfigs(loadedAiFlowAdminConfig), env),
    normalizeOptionalAiFlowAdminConfigs(requestContext?.aiFlowAdminConfig, env),
    trustedRequestScopedAiFlowConfig(body, env, requestContext)
  );

  return {
    env,
    body,
    requestContext,
    mergedAiFlowAdminConfig
  };
}

export async function loadAiRouteActivationContext({
  env = process.env,
  body = {},
  requestContext = {},
  serviceAiFlowAdminConfig = [],
  loadAiFlowAdminConfig
} = {}) {
  const loadedAiFlowAdminConfig = await readLoadedAiFlowAdminConfig(loadAiFlowAdminConfig);
  return createAiRouteActivationContext({
    env,
    body,
    requestContext,
    serviceAiFlowAdminConfig,
    loadedAiFlowAdminConfig
  });
}

export function resolveAiRouteActivation(flowId, input = {}) {
  const context = isAiRouteActivationContext(input) ? input : createAiRouteActivationContext(input);
  const flow = resolveAiFlowConfig(flowId, context.env, context.mergedAiFlowAdminConfig);

  return {
    flowId,
    flow,
    selectedAdapterId: flow.primaryAdapterId,
    model: flow.model,
    readyForLiveCalls: flow.readyForLiveCalls,
    blockedReasons: [...flow.blockedReasons],
    configuredEnvKeys: configuredEnvKeysForFlow(flow, context.env),
    controlPlaneRoutePolicyId: controlPlaneRoutePolicyIdsByFlowId.get(flowId) ?? ""
  };
}

export function resolveAiRouteActivations(input = {}) {
  const context = isAiRouteActivationContext(input) ? input : createAiRouteActivationContext(input);
  return aiFlowDefinitions.map((definition) => resolveAiRouteActivation(definition.flowId, context));
}

export function mergeAiFlowAdminConfigs(...groups) {
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

export function serverScopedAiFlowConfig(env = process.env) {
  if (!env || typeof env !== "object") return [];
  if (serverScopedAiFlowConfigCache.has(env)) return serverScopedAiFlowConfigCache.get(env);

  const raw = env.CUSTOMCARD_AI_FLOW_CONFIG_JSON ?? env.CUSTOMCARD_AI_FLOW_ADMIN_CONFIG_JSON ?? "";
  let normalized = [];
  if (raw) {
    try {
      const parsed = JSON.parse(String(raw));
      normalized = normalizeAiFlowAdminConfigs(
        Array.isArray(parsed) ? parsed : parsed.flows ?? parsed.aiFlowConfig ?? parsed.ai_flow_config ?? [],
        env
      );
    } catch {
      normalized = [];
    }
  }

  serverScopedAiFlowConfigCache.set(env, normalized);
  return normalized;
}

function isAiRouteActivationContext(input) {
  return Boolean(input && typeof input === "object" && Array.isArray(input.mergedAiFlowAdminConfig) && input.env);
}

async function readLoadedAiFlowAdminConfig(loadAiFlowAdminConfig) {
  if (typeof loadAiFlowAdminConfig !== "function") return [];
  try {
    return extractLoadedAiFlowAdminConfigs(await loadAiFlowAdminConfig());
  } catch {
    return [];
  }
}

function extractLoadedAiFlowAdminConfigs(input) {
  return input?.configs ?? input?.aiFlowConfigs ?? input?.flows ?? input ?? [];
}

function normalizeOptionalAiFlowAdminConfigs(input, env) {
  return Array.isArray(input) && input.length > 0 ? normalizeAiFlowAdminConfigs(input, env) : [];
}

function trustedRequestScopedAiFlowConfig(body, env, requestContext = {}) {
  if (requestContext?.trustRequestAiFlowConfig !== true) return [];
  return normalizeAiFlowAdminConfigs(body?.aiFlowConfig ?? body?.ai_flow_config ?? [], env);
}

function configuredEnvKeysForFlow(flow, env = {}) {
  const key = flowEnvKey(flow.flowId);
  const flowScopedKeys = [
    `CUSTOMCARD_AI_${key}_ADAPTER_ID`,
    `CUSTOMCARD_AI_${key}_PROVIDER`,
    `CUSTOMCARD_AI_${key}_FALLBACK_ADAPTER_ID`,
    `CUSTOMCARD_AI_${key}_MODEL`,
    `CUSTOMCARD_AI_${key}_PROMPT_INSTRUCTIONS`,
    `CUSTOMCARD_AI_${key}_RATE_LIMIT_PER_MINUTE`,
    `CUSTOMCARD_AI_${key}_MONTHLY_BUDGET_CENTS`,
    `CUSTOMCARD_AI_${key}_PER_REQUEST_BUDGET_CENTS`,
    `CUSTOMCARD_AI_${key}_QUEUE_ENABLED`,
    `CUSTOMCARD_AI_${key}_FALLBACK_QUEUE_ENABLED`,
    `CUSTOMCARD_AI_${key}_MAX_RETRIES`,
    `CUSTOMCARD_AI_${key}_MAX_TOKENS`,
    `CUSTOMCARD_AI_${key}_TEMPERATURE`
  ];
  const adapterKeys = (aiProviderEnvRequirements[flow.primaryAdapterId] ?? []).flat();
  const matchingModelKeys = Object.keys(env).filter(
    (envKey) =>
      /(?:MODEL|CHECKPOINT)$/.test(envKey) &&
      hasConfiguredEnvValue(env[envKey]) &&
      String(env[envKey]).trim() === flow.model
  );

  return Array.from(new Set([...flowScopedKeys, ...adapterKeys, ...matchingModelKeys])).filter((envKey) =>
    hasConfiguredEnvValue(env[envKey])
  );
}

function hasConfiguredEnvValue(value) {
  if (typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string" && value.trim()) return true;
  return hasUsableAiEnvValue(value);
}
