export const productionTextWorkflowId: "customcard-production-text-overlay";
export const productionTextWorkflowRelativePath: "comfyui-workflows/customcard-production-text-overlay.json";
export const productionTextNodeSourceRelativePath: "comfyui-custom-nodes/CustomCardTextComposer";
export const productionTextRequiredNodeClass: "CustomCardTextComposer";
export const productionTextRequiredCompositorInputs: readonly string[];
export const productionTextSetupInstructions: readonly string[];

export interface ProductionTextSetupArgs {
  [key: string]: string | undefined;
}

export interface ProductionTextSetupEnv {
  [key: string]: string | undefined;
}

export interface ProductionTextSetup {
  comfyUrl: string;
  workflowPath: string;
  nodeSource: string;
  workflowId: typeof productionTextWorkflowId;
  requiredNodeClass: typeof productionTextRequiredNodeClass;
  requiredComposerInputs: string[];
  setupInstructions: string[];
}

export interface ProductionTextSetupDescription extends ProductionTextSetup {
  workflowPathRelative: string;
  nodeSourceRelative: string;
}

export function defaultProductionTextWorkflowPath(root?: string): string;
export function defaultProductionTextNodeSource(root?: string): string;
export function resolveProductionTextComfyUrl(options?: {
  explicitValue?: string;
  env?: ProductionTextSetupEnv;
}): string;
export function resolveProductionTextSetup(options?: {
  args?: ProductionTextSetupArgs;
  env?: ProductionTextSetupEnv;
  root?: string;
}): ProductionTextSetup;
export function describeProductionTextSetup(options?: {
  args?: ProductionTextSetupArgs;
  env?: ProductionTextSetupEnv;
  root?: string;
}): ProductionTextSetupDescription;
export function isProductionTextWorkflowConfigured(options?: {
  workflowId?: string | null;
  workflowPath?: string | null;
  root?: string;
}): boolean;
export function relativePath(filePath: string, root?: string): string;
export function normalizeComfyUrl(value?: string): string;
