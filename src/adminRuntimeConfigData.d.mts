import type { AiFlowAdminConfig, AiFlowConfigSummary } from "./aiFlowConfigData.mjs";

export declare const adminAiFlowConfigsRoute: string;
export declare const adminRuntimeConfigKeys: Readonly<{
  aiFlowConfigs: "ai-flow-configs";
  safetyControls: "safety-controls";
}>;

export interface AdminAiFlowProviderReadiness {
  adapterId: string;
  configured: boolean;
  credentialConfigured: boolean;
  missingEnv: string[];
  credentialsExposed: false;
}

export interface AdminAiFlowConfigPayload {
  service: "customcard-admin-ai-flow-configs";
  status: "ready" | "blocked";
  serverOwned: true;
  clientMaySubmitAiFlowConfig: false;
  version: number;
  updatedAtIso: string | null;
  updatedBy: string | null;
  configs: AiFlowAdminConfig[];
  aiFlowConfigs: AiFlowAdminConfig[];
  summary: AiFlowConfigSummary;
  providerReadiness: Record<string, AdminAiFlowProviderReadiness>;
  runtimeMode: string;
  repository: {
    table: "admin_runtime_configs";
    key: "ai-flow-configs";
    persisted: boolean;
    rawCustomerContentStored: false;
    credentialsStored: false;
    status?: string;
  };
  blockers: string[];
}

export declare function buildAdminAiFlowConfigPayload(options?: {
  input?: unknown;
  env?: Record<string, string | undefined>;
  runtimeMode?: string;
  version?: number;
  updatedAtIso?: string | null;
  updatedBy?: string | null;
}): AdminAiFlowConfigPayload;

export declare function buildUpdatedAdminAiFlowConfigPayload(options: {
  body?: unknown;
  env?: Record<string, string | undefined>;
  authContext?: { userId?: string };
  current?: { version?: number; updatedBy?: string | null };
  runtimeMode?: string;
  now?: () => Date;
}): AdminAiFlowConfigPayload;

export declare function normalizeAdminAiFlowConfigInput(
  input: unknown,
  env?: Record<string, string | undefined>
): AiFlowAdminConfig[];

export declare function adminAiFlowConfigReadUnavailablePayload(options?: {
  env?: Record<string, string | undefined>;
  runtimeMode?: string;
  error?: unknown;
}): AdminAiFlowConfigPayload;
