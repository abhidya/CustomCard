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
  aiProviderModelPresets,
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
  AiProviderModelPreset,
  ResolvedAiFlowConfig
} from "./aiFlowConfigData.mjs";

export function loadBrowserAiFlowAdminConfigs(): AiFlowAdminConfig[] {
  const stored = readBrowserAiFlowAdminConfigDraft();
  return stored.length > 0 ? stored : buildDefaultAiFlowAdminConfigs();
}

export function saveBrowserAiFlowAdminConfigs(configs: AiFlowAdminConfig[]): void {
  const normalized = normalizeAiFlowAdminConfigs(configs);
  try {
    browserSessionStorage()?.setItem(aiFlowAdminConfigStorageKey, JSON.stringify(normalized));
  } catch {
    /* Admin profile drafts are optional; the server-owned admin profile remains authoritative. */
  }
}

export function resetBrowserAiFlowAdminConfigs(): AiFlowAdminConfig[] {
  try {
    browserSessionStorage()?.removeItem(aiFlowAdminConfigStorageKey);
  } catch {
    /* Optional browser draft cleanup. */
  }
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

function readBrowserAiFlowAdminConfigDraft(): AiFlowAdminConfig[] {
  try {
    const raw = browserSessionStorage()?.getItem(aiFlowAdminConfigStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeAiFlowAdminConfigs(parsed);
  } catch {
    return [];
  }
}

function browserSessionStorage(): Storage | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const storage = (globalThis as typeof globalThis & { sessionStorage?: Storage }).sessionStorage;
  return storage;
}

export function getAiFlowLabel(flowId: AiFlowId, definitions: AiFlowDefinition[] = []): string {
  return definitions.find((definition) => definition.flowId === flowId)?.label ?? flowId;
}
