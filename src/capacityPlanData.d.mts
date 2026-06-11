export type CapacityProfileId = "local-dev" | "cheap-droplet" | "cloud-native" | "saas-scale";
export type CapacityLane = "local" | "single-host" | "managed-cloud" | "multi-tenant";
export type CapacityDatabaseMode =
  | "local-postgres"
  | "self-hosted-postgres"
  | "managed-postgres"
  | "managed-postgres-pooled";
export type CapacityQueueMode =
  | "none"
  | "local-redis"
  | "self-hosted-redis"
  | "managed-redis"
  | "managed-queue-sharded";
export type CapacityObjectStoreMode =
  | "browser-local"
  | "local-minio"
  | "filesystem-mounted"
  | "managed-s3-compatible";

export interface CapacityProfile {
  id: CapacityProfileId;
  label: string;
  lane: CapacityLane;
  targetUse: string;
  runtimeShape: string;
  dailyCardCapacity: number;
  dailyImageGenerationBudget: number;
  webReplicas: number;
  workerReplicas: number;
  databaseMode: CapacityDatabaseMode;
  queueMode: CapacityQueueMode;
  objectStoreMode: CapacityObjectStoreMode;
  providerPolicy: string;
  realOrdersEnabled: false;
  liveProviderCalls: false;
  costGuardrails: string[];
  requiredEvidence: string[];
  scalingSignals: string[];
  tradeoffs: string[];
}

export interface CapacityEvidenceThreshold {
  id: string;
  label: string;
  metric: string;
  profiles: CapacityProfileId[];
  measuredBy: string;
  warnAt: number;
  blockAt: number;
  requiredEvidence: string;
}

export interface CapacityPlanSummary {
  total: number;
  localProfiles: number;
  cloudProfiles: number;
  maxDailyCards: number;
  maxDailyImageGenerations: number;
  queueBackedProfiles: number;
  objectStoreBackedProfiles: number;
  realOrdersEnabled: number;
  liveProviderCalls: number;
  requiredEvidenceCount: number;
  sloThresholds: number;
  workerBackedThresholds: number;
  databaseThresholds: number;
  artifactThresholds: number;
  providerSpendThresholds: number;
  measuredEvidenceRequired: number;
  blockers: string[];
}

export const capacityEvidenceThresholds: CapacityEvidenceThreshold[];
export const capacityProfiles: CapacityProfile[];
export function summarizeCapacityPlan(profiles?: CapacityProfile[]): CapacityPlanSummary;
export function validateCapacityEvidenceThresholds(
  thresholds?: CapacityEvidenceThreshold[],
  profiles?: CapacityProfile[]
): string[];
export function validateCapacityProfiles(profiles?: CapacityProfile[]): string[];
