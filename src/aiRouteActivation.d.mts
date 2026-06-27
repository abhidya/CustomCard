import type { AiFlowAdminConfig, AiFlowId, ResolvedAiFlowConfig } from "./aiFlowConfigData.mjs";
import type { AiRoutePolicyId } from "./aiRoutePolicyIds.mjs";

export interface AiRouteActivationRequestContext {
  aiFlowAdminConfig?: Partial<AiFlowAdminConfig>[] | null;
  trustRequestAiFlowConfig?: boolean;
}

export interface AiRouteActivationContextInput {
  env?: Record<string, string | undefined>;
  body?: {
    aiFlowConfig?: unknown;
    ai_flow_config?: unknown;
  };
  requestContext?: AiRouteActivationRequestContext;
  serviceAiFlowAdminConfig?: Partial<AiFlowAdminConfig>[];
  loadedAiFlowAdminConfig?: unknown;
}

export interface LoadAiRouteActivationContextInput
  extends Omit<AiRouteActivationContextInput, "loadedAiFlowAdminConfig"> {
  loadAiFlowAdminConfig?: (() => unknown | Promise<unknown>) | undefined;
}

export interface AiRouteActivationContext {
  env: Record<string, string | undefined>;
  body: {
    aiFlowConfig?: unknown;
    ai_flow_config?: unknown;
  };
  requestContext: AiRouteActivationRequestContext;
  mergedAiFlowAdminConfig: AiFlowAdminConfig[];
}

export interface AiRouteActivation {
  flowId: AiFlowId;
  flow: ResolvedAiFlowConfig;
  selectedAdapterId: string;
  model: string;
  readyForLiveCalls: boolean;
  blockedReasons: string[];
  configuredEnvKeys: string[];
  controlPlaneRoutePolicyId: AiRoutePolicyId | "";
}

export function createAiRouteActivationContext(input?: AiRouteActivationContextInput): AiRouteActivationContext;
export function loadAiRouteActivationContext(input?: LoadAiRouteActivationContextInput): Promise<AiRouteActivationContext>;
export function resolveAiRouteActivation(
  flowId: AiFlowId,
  input?: AiRouteActivationContext | AiRouteActivationContextInput
): AiRouteActivation;
export function resolveAiRouteActivations(
  input?: AiRouteActivationContext | AiRouteActivationContextInput
): AiRouteActivation[];
export function mergeAiFlowAdminConfigs(...groups: unknown[]): AiFlowAdminConfig[];
export function serverScopedAiFlowConfig(env?: Record<string, string | undefined>): Partial<AiFlowAdminConfig>[];
