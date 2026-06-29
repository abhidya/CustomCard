import {
  aiFlowDefinitions,
  aiProviderEnvRequirements,
  hasUsableAiEnvValue,
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig
} from "./aiFlowConfigData.mjs";
import { aiRoutePolicyIdsByFlowId } from "./aiRoutePolicyIds.mjs";

export function createAiRouteActivationContext({
  env = process.env,
  body = {},
  requestContext = {},
  serviceAiFlowAdminConfig = [],
  loadedAiFlowAdminConfig = []
} = {}) {
  const mergedAiFlowAdminConfig = mergeAiFlowAdminConfigs(
    normalizeOptionalAiFlowAdminConfigs(serviceAiFlowAdminConfig, env),
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
    controlPlaneRoutePolicyId: aiRoutePolicyIdsByFlowId[flowId] ?? ""
  };
}

export function resolveAiRouteActivations(input = {}) {
  const context = isAiRouteActivationContext(input) ? input : createAiRouteActivationContext(input);
  return aiFlowDefinitions.map((definition) => resolveAiRouteActivation(definition.flowId, context));
}

export function mergeAiFlowAdminConfigs(...groups) {
  const byFlowId = new Map();
  for (const group of groups) {
    for (const entry of normalizedMergeEntries(group)) {
      if (!entry?.flowId || !entry?.config) continue;
      const existing = byFlowId.get(entry.flowId);
      if (!existing) {
        byFlowId.set(entry.flowId, { ...entry.config });
        continue;
      }

      const merged = { ...existing };
      for (const key of entry.explicitKeys) {
        if (key === "flowId") continue;
        merged[key] = entry.config[key];
      }
      byFlowId.set(entry.flowId, merged);
    }
  }
  if (byFlowId.size === 0) return [];
  return Array.from(byFlowId.values());
}

export function serverScopedAiFlowConfig(env = process.env) {
  return [];
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
  return (
    input?.configs ??
    input?.aiFlowConfigs ??
    input?.ai_flow_configs ??
    input?.aiFlowConfig ??
    input?.ai_flow_config ??
    input?.flows ??
    input ??
    []
  );
}

function normalizedAiFlowAdminConfigs(input) {
  return Array.isArray(input)
    ? input.filter((config) => config && typeof config === "object" && typeof config.flowId === "string")
    : [];
}

function normalizeOptionalAiFlowAdminConfigs(input, env) {
  const explicitConfigs = explicitAiFlowAdminConfigs(input);
  if (explicitConfigs.length === 0) return [];

  const normalizedByFlowId = new Map(
    normalizeAiFlowAdminConfigs(explicitConfigs.map(({ rawConfig }) => rawConfig), env).map((config) => [config.flowId, config])
  );

  return explicitConfigs.flatMap(({ flowId, explicitKeys }) => {
    const config = normalizedByFlowId.get(flowId);
    return config ? [{ flowId, config, explicitKeys }] : [];
  });
}

function trustedRequestScopedAiFlowConfig(body, env, requestContext = {}) {
  if (requestContext?.trustRequestAiFlowConfig !== true) return [];
  return normalizeOptionalAiFlowAdminConfigs(extractLoadedAiFlowAdminConfigs(body), env);
}

function normalizedMergeEntries(input) {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    if (entry.config && typeof entry.config === "object" && typeof entry.flowId === "string") {
      return [{
        flowId: entry.flowId,
        config: entry.config,
        explicitKeys: new Set(entry.explicitKeys ?? Object.keys(entry.config).filter((key) => key !== "flowId"))
      }];
    }

    if (typeof entry.flowId !== "string") return [];
    return [{
      flowId: entry.flowId,
      config: entry,
      explicitKeys: new Set(Object.keys(entry).filter((key) => key !== "flowId"))
    }];
  });
}

function explicitAiFlowAdminConfigs(input) {
  return normalizedAiFlowAdminConfigs(input).map((rawConfig) => ({
    flowId: rawConfig.flowId,
    rawConfig,
    explicitKeys: Object.keys(rawConfig).filter((key) => key !== "flowId")
  }));
}

function configuredEnvKeysForFlow(flow, env = {}) {
  const adapterKeys = (aiProviderEnvRequirements[flow.primaryAdapterId] ?? []).flat();

  return Array.from(new Set(adapterKeys)).filter((envKey) =>
    hasConfiguredEnvValue(env[envKey])
  );
}

function hasConfiguredEnvValue(value) {
  if (typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string" && value.trim()) return true;
  return hasUsableAiEnvValue(value);
}
