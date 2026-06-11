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
  return buildDefaultAiFlowAdminConfigs();
}

export function saveBrowserAiFlowAdminConfigs(configs: AiFlowAdminConfig[]): void {
  normalizeAiFlowAdminConfigs(configs);
}

export function resetBrowserAiFlowAdminConfigs(): AiFlowAdminConfig[] {
  return buildDefaultAiFlowAdminConfigs();
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
