import {
  aiFlowAdminConfigStorageKey,
  buildDefaultAiFlowAdminConfigs,
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig,
  resolveAiFlowConfigs,
  summarizeAiFlowConfigs,
  type AiFlowAdminConfig,
  type AiFlowConfigSummary,
  type AiFlowDefinition,
  type AiFlowId,
  type ResolvedAiFlowConfig
} from "./aiFlowConfigData.mjs";

export {
  adapterMissingEnv,
  aiFlowAdminConfigStorageKey,
  aiFlowDefinitions,
  aiProviderEnvRequirements,
  buildDefaultAiFlowAdminConfigs,
  flowEnvKey,
  getAiFlowDefinition,
  hasUsableAiEnvValue,
  isAiAdapterConfigured,
  modelForAiAdapter,
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig,
  resolveAiFlowConfigs,
  summarizeAiFlowConfigs
} from "./aiFlowConfigData.mjs";

export type {
  AiFlowAdminConfig,
  AiFlowCapability,
  AiFlowConfigSummary,
  AiFlowDefinition,
  AiFlowId,
  ResolvedAiFlowConfig
} from "./aiFlowConfigData.mjs";

export function loadBrowserAiFlowAdminConfigs(): AiFlowAdminConfig[] {
  if (typeof window === "undefined") return buildDefaultAiFlowAdminConfigs();
  try {
    const raw = window.localStorage.getItem(aiFlowAdminConfigStorageKey);
    return normalizeAiFlowAdminConfigs(raw ? JSON.parse(raw) : undefined);
  } catch {
    return buildDefaultAiFlowAdminConfigs();
  }
}

export function saveBrowserAiFlowAdminConfigs(configs: AiFlowAdminConfig[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(aiFlowAdminConfigStorageKey, JSON.stringify(normalizeAiFlowAdminConfigs(configs)));
}

export function resetBrowserAiFlowAdminConfigs(): AiFlowAdminConfig[] {
  const defaults = buildDefaultAiFlowAdminConfigs();
  saveBrowserAiFlowAdminConfigs(defaults);
  return defaults;
}

export function buildBrowserAiFlowSummary(configs: AiFlowAdminConfig[]): AiFlowConfigSummary {
  return summarizeAiFlowConfigs({}, configs);
}

export function updateAiFlowAdminConfig(
  configs: AiFlowAdminConfig[],
  flowId: AiFlowId,
  patch: Partial<AiFlowAdminConfig>
): AiFlowAdminConfig[] {
  return normalizeAiFlowAdminConfigs(
    configs.map((config) => (config.flowId === flowId ? { ...config, ...patch, flowId } : config))
  );
}

export function getResolvedBrowserAiFlowConfig(
  flowId: AiFlowId,
  configs: AiFlowAdminConfig[]
): ResolvedAiFlowConfig {
  return resolveAiFlowConfig(flowId, {}, configs);
}

export function getResolvedBrowserAiFlowConfigs(configs: AiFlowAdminConfig[]): ResolvedAiFlowConfig[] {
  return resolveAiFlowConfigs({}, configs);
}

export function getAiFlowLabel(flowId: AiFlowId, definitions: AiFlowDefinition[] = []): string {
  return definitions.find((definition) => definition.flowId === flowId)?.label ?? flowId;
}
