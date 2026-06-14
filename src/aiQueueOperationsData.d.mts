export type AiQueueOperationsLane = "api" | "worker" | "privacy" | "observability" | "alerting" | "human-ops";
export type AiQueueOperationsStatus = "repo-local-ready";

export interface AiQueueOperationMetric {
  id: string;
  metric: string;
  source: string;
  owner: string;
  piiFree: true;
  warnAt: number;
  pageAt: number;
  runbookAction: string;
}

export interface AiQueueOperationsItem {
  id: string;
  label: string;
  lane: AiQueueOperationsLane;
  status: AiQueueOperationsStatus;
  currentEvidence: string[];
  requiredEvidence: string[];
  metrics: string[];
  alertIds: string[];
  humanOwner: string;
  externalNetworkCalls: false;
  liveProviderCalls: false;
  productionReady: true;
}

export interface AiQueueOperationsSummary {
  total: number;
  repoLocalReady: number;
  productionReadyControls: number;
  metricsTracked: number;
  alertThresholds: number;
  alertRoutesRequired: number;
  humanOwnedControls: number;
  deadLetterControls: number;
  piiFreeMetrics: number;
  externalNetworkCalls: number;
  liveProviderCalls: number;
  alertIds: string[];
  metrics: string[];
  registerIssues: string[];
  blockers: string[];
}

export const aiQueueOperationMetrics: AiQueueOperationMetric[];
export const aiQueueOperationsItems: AiQueueOperationsItem[];
export function summarizeAiQueueOperations(items?: AiQueueOperationsItem[]): AiQueueOperationsSummary;
export function validateAiQueueOperations(items?: AiQueueOperationsItem[]): string[];
