import type { ProductionTextSetupDescription, ProductionTextSetupEnv } from "./comfy-production-text-setup.mjs";
import type { AiFlowAdminConfig } from "../src/aiFlowConfigData.mjs";

export interface LocalComfyWorkerReadiness {
  status: string;
  blockers?: string[];
  routeScope: "ai-card-generate";
  imageAdapter: string;
  comfyUrl?: string;
  workflowId?: string | null;
  workflowPath?: string | null;
  productionTextSetup: ProductionTextSetupDescription | null;
  [key: string]: unknown;
}

export function resolveLocalComfyWorkerEnv(env?: ProductionTextSetupEnv): ProductionTextSetupEnv;
export function createLocalComfyWorkerRuntime(options?: Record<string, unknown>): unknown;
export function describeLocalComfyWorkerReadiness(options?: {
  env?: ProductionTextSetupEnv;
  aiFlowAdminConfig?: Partial<AiFlowAdminConfig>[] | null;
}): LocalComfyWorkerReadiness;
