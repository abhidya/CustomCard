export type AiProviderReadinessStatus = "repo-local-ready" | "evidence-missing";
export type AiProviderReadinessLane =
  | "adapter-inventory"
  | "model-allowlist"
  | "prompt-safety"
  | "privacy"
  | "image-print-qa"
  | "cost-control"
  | "quality-evaluation"
  | "release-operations";

export interface AiProviderReadinessItem {
  id: string;
  label: string;
  lane: AiProviderReadinessLane;
  status: AiProviderReadinessStatus;
  textAdapterIds: string[];
  imageAdapterIds: string[];
  localFallbackAdapterIds: string[];
  modelFamilies: string[];
  promptAuditRequired: boolean;
  humanReviewRequired: boolean;
  liveProviderCallsEnabled: false;
  externalNetworkCalls: false;
  productionTrafficEnabled: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface AiProviderReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  textProviderContracts: number;
  imageProviderContracts: number;
  localFallbacks: number;
  promptAuditRequired: number;
  humanReviewRequired: number;
  liveProviderCallsEnabled: number;
  externalNetworkCalls: number;
  productionTrafficEnabled: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const aiProviderReadinessItems: AiProviderReadinessItem[];
export function summarizeAiProviderReadiness(items?: AiProviderReadinessItem[]): AiProviderReadinessSummary;
export function validateAiProviderReadiness(items?: AiProviderReadinessItem[]): string[];
