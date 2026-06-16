export type AiFlowId = "customer-chat" | "card-copy" | "card-image";
export type AiFlowCapability = "text-chat" | "image-generation";
export type AiFlowLiveDefault = boolean | "auto";

export interface AiFlowDefinition {
  flowId: AiFlowId;
  label: string;
  capability: AiFlowCapability;
  defaultPrimaryAdapterId: string;
  defaultFallbackAdapterId: string;
  allowedAdapterIds: string[];
  liveDefault: AiFlowLiveDefault;
  queueDefault: boolean;
  fallbackQueueDefault: boolean;
  rateLimitPerMinute: number;
  monthlyBudgetCents: number;
  perRequestBudgetCents: number;
  maxRetries: number;
  maxTokens: number;
  temperature: number;
  promptInstructions: string;
}

export interface AiFlowAdminConfig {
  flowId: AiFlowId;
  primaryAdapterId: string;
  fallbackAdapterId: string;
  model: string;
  promptInstructions: string;
  rateLimitPerMinute: number;
  monthlyBudgetCents: number;
  perRequestBudgetCents: number;
  queueEnabled: boolean;
  fallbackQueueEnabled: boolean;
  liveProviderCallsEnabled: boolean;
  maxRetries: number;
  maxTokens: number;
  temperature: number;
}

export interface ResolvedAiFlowConfig extends AiFlowAdminConfig {
  label: string;
  capability: AiFlowCapability;
  allowedAdapterIds: string[];
  configuredAdapterIds: string[];
  blockedReasons: string[];
  readyForLiveCalls: boolean;
}

export interface AiFlowConfigSummary {
  total: number;
  liveEnabled: number;
  readyForLiveCalls: number;
  queued: number;
  fallbackQueued: number;
  blocked: number;
  configuredProviders: string[];
  flows: ResolvedAiFlowConfig[];
}

export interface AiProviderModelPreset {
  id: string;
  label: string;
  detail?: string;
}

export const aiFlowAdminConfigStorageKey: string;
export const aiFlowDefinitions: AiFlowDefinition[];
export const aiProviderEnvRequirements: Record<string, string[][]>;
export const aiProviderModelPresets: Record<string, AiProviderModelPreset[]>;

export function hasUsableAiEnvValue(value: unknown): boolean;
export function adapterMissingEnv(adapterId: string, env?: Record<string, string | undefined>): string[];
export function isAiAdapterConfigured(adapterId: string, env?: Record<string, string | undefined>): boolean;
export function modelForAiAdapter(adapterId: string, env?: Record<string, string | undefined>, overrideModel?: string): string;
export function resolveAiFlowConfigs(
  env?: Record<string, string | undefined>,
  adminOverrides?: Partial<AiFlowAdminConfig>[]
): ResolvedAiFlowConfig[];
export function resolveAiFlowConfig(
  flowId: AiFlowId,
  env?: Record<string, string | undefined>,
  adminOverrides?: Partial<AiFlowAdminConfig>[]
): ResolvedAiFlowConfig;
export function summarizeAiFlowConfigs(
  env?: Record<string, string | undefined>,
  adminOverrides?: Partial<AiFlowAdminConfig>[]
): AiFlowConfigSummary;
export function normalizeAiFlowAdminConfigs(
  input: unknown,
  env?: Record<string, string | undefined>
): AiFlowAdminConfig[];
export function buildDefaultAiFlowAdminConfigs(env?: Record<string, string | undefined>): AiFlowAdminConfig[];
export function getAiFlowDefinition(flowId: AiFlowId): AiFlowDefinition;
export function flowEnvKey(flowId: AiFlowId): string;
