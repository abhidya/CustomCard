export interface LocalComfyPanelCopy {
  headline?: string;
  body?: string;
  text_layout?: Record<string, unknown>;
  textLayout?: Record<string, unknown>;
}

export function localComfyTypographyVariables(args: {
  panelId: string;
  panelCopy?: LocalComfyPanelCopy;
  width?: number;
  height?: number;
}): Record<string, unknown>;

export function localComfyWorkflowInputSummary(variables: Record<string, unknown>): Record<string, unknown>;

export function localComfyWorkflowInputsForMetadata(
  env: Record<string, string | undefined>,
  variables: Record<string, unknown>,
  configuredInputsJson?: string
): Record<string, unknown>;

export function localComfyConfiguredWorkflowInputs(
  env: Record<string, string | undefined>,
  variables: Record<string, unknown>,
  configuredInputsJson?: string
): Record<string, unknown> | undefined;

export function interpolateLocalComfyTemplate<T>(value: T, variables: Record<string, unknown>): T;

export function localComfyTemplateVariable(key: string, variables: Record<string, unknown>): unknown;

export function localComfySafeArtworkGuard(variables?: Record<string, unknown>): {
  x: number;
  y: number;
  width: number;
  height: number;
  color: unknown;
  opacity: number;
  radius: number;
  style: unknown;
};
