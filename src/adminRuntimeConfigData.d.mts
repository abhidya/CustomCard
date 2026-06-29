import type { AiFlowAdminConfig, AiFlowConfigSummary } from "./aiFlowConfigData.mjs";

export declare const adminAiFlowConfigsRoute: string;
export declare const adminWorkerConfigRoute: string;
export declare const adminRuntimeConfigKeys: Readonly<{
  aiFlowConfigs: "ai-flow-configs";
  safetyControls: "safety-controls";
  workerConfig: "worker-config";
}>;

export interface AdminWorkerQueueConfig {
  batchSize: number;
  leaseSeconds: number;
  retryBackoffSeconds: number;
  pollIntervalMs: number;
}

export interface AdminProviderWorkerQueueConfig extends AdminWorkerQueueConfig {
  routeIds: string[];
}

export interface AdminWorkerConfig {
  worker: AdminWorkerQueueConfig;
  providerWorker: AdminProviderWorkerQueueConfig;
}

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
  aiFlowDefaultsVersion: string;
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

export interface AdminWorkerConfigPayload {
  service: "customcard-admin-worker-config";
  status: "ready" | "blocked";
  serverOwned: true;
  clientMaySubmitWorkerConfig: false;
  version: number;
  updatedAtIso: string | null;
  updatedBy: string | null;
  worker: AdminWorkerQueueConfig;
  providerWorker: AdminProviderWorkerQueueConfig;
  workerConfig: AdminWorkerConfig;
  runtimeMode: string;
  repository: {
    table: "admin_runtime_configs";
    key: "worker-config";
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
  migrateLegacyDefaults?: boolean;
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
  env?: Record<string, string | undefined>,
  options?: { migrateLegacyDefaults?: boolean }
): AiFlowAdminConfig[];

export declare function buildAdminWorkerConfigPayload(options?: {
  input?: unknown;
  runtimeMode?: string;
  version?: number;
  updatedAtIso?: string | null;
  updatedBy?: string | null;
}): AdminWorkerConfigPayload;

export declare function buildUpdatedAdminWorkerConfigPayload(options: {
  body?: unknown;
  authContext?: { userId?: string };
  current?: { version?: number; updatedBy?: string | null };
  runtimeMode?: string;
  now?: () => Date;
}): AdminWorkerConfigPayload;

export declare function normalizeAdminWorkerConfigInput(input: unknown): AdminWorkerConfig;

export declare function migrateLegacyBenchmarkAiFlowDefaults(input: unknown): unknown;

export declare function adminAiFlowConfigReadUnavailablePayload(options?: {
  env?: Record<string, string | undefined>;
  runtimeMode?: string;
  error?: unknown;
}): AdminAiFlowConfigPayload;
