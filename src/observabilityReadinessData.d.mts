export type ObservabilityReadinessStatus = "repo-local-ready" | "evidence-missing";
export type ObservabilityLane =
  | "event-schema"
  | "privacy"
  | "cost"
  | "retention"
  | "alerting"
  | "provider-contracts"
  | "incident-review";

export interface ObservabilityReadinessItem {
  id: string;
  label: string;
  lane: ObservabilityLane;
  status: ObservabilityReadinessStatus;
  providerAdapterIds: string[];
  eventNames: string[];
  piiRedacted: boolean;
  samplingPolicy: string;
  retentionDays: number;
  alertRouteRequired: boolean;
  liveIngestionEnabled: false;
  externalNetworkCalls: false;
  productionAlertEnabled: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface ObservabilityReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  alertRoutesRequired: number;
  piiRedacted: number;
  providerContracts: number;
  unsampledCriticalEvents: number;
  maxRetentionDays: number;
  liveIngestionEnabled: number;
  externalNetworkCalls: number;
  productionAlertsEnabled: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const observabilityReadinessItems: ObservabilityReadinessItem[];
export function summarizeObservabilityReadiness(items?: ObservabilityReadinessItem[]): ObservabilityReadinessSummary;
export function validateObservabilityReadiness(items?: ObservabilityReadinessItem[]): string[];
