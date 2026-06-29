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
  contextWindowTokens: number;
  maxTokens: number;
  temperature: number;
  renderingMode?: "" | "final-text-composited";
  workflowId?: string;
  workflowPath?: string;
  workflowJson?: string;
  workflowInputsJson?: string;
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
  contextWindowTokens: number;
  maxTokens: number;
  temperature: number;
  renderingMode: "" | "final-text-composited";
  workflowId: string;
  workflowPath: string;
  workflowJson: string;
  workflowInputsJson: string;
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

export interface BenchmarkBestAiWorkflowExpectation {
  flowId: AiFlowId;
  primaryAdapterId: string;
  fallbackAdapterId?: string;
  model?: string;
  contextWindowTokens?: number;
  maxTokens?: number;
  temperature?: number;
  renderingMode?: "" | "final-text-composited";
  workflowId?: string;
  workflowPath?: string;
  workflowInputsJson?: string;
  evidenceLabel: string;
}

export interface BenchmarkBestAiWorkflow {
  id: string;
  label: string;
  status: string;
  evidencePath: string;
  summaryPath: string;
  rationale: string;
  blockers: string[];
  flowExpectations: BenchmarkBestAiWorkflowExpectation[];
}

export interface AiFlowBenchmarkParityCheck {
  label: string;
  actual: string | number | boolean;
  expected: string | number | boolean | undefined;
  matched: boolean;
}

export interface AiFlowBenchmarkParityRow {
  flowId: AiFlowId;
  label: string;
  matched: boolean;
  missing: string[];
  checks: AiFlowBenchmarkParityCheck[];
  evidenceLabel: string;
}

export interface AiFlowBenchmarkParitySummary {
  workflowId: string;
  label: string;
  status: "matched" | "drift";
  matched: number;
  total: number;
  evidencePath: string;
  summaryPath: string;
  rationale: string;
  blockers: string[];
  rows: AiFlowBenchmarkParityRow[];
}

export const aiFlowAdminConfigStorageKey: string;
export const benchmarkLocalComfyWorkflowInputsJson: string;
export const benchmarkBestAiWorkflow: BenchmarkBestAiWorkflow;
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
export function summarizeBenchmarkBestAiWorkflowParity(
  adminOverrides?: Partial<AiFlowAdminConfig>[],
  env?: Record<string, string | undefined>
): AiFlowBenchmarkParitySummary;
export function normalizeAiFlowAdminConfigs(
  input: unknown,
  env?: Record<string, string | undefined>
): AiFlowAdminConfig[];
export function buildDefaultAiFlowAdminConfigs(env?: Record<string, string | undefined>): AiFlowAdminConfig[];
export function getAiFlowDefinition(flowId: AiFlowId): AiFlowDefinition;
export function flowEnvKey(flowId: AiFlowId): string;
