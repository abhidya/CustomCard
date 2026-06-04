export type ReviewerDbSeedReadinessStatus = "repo-local-ready" | "evidence-missing";
export type ReviewerDbSeedReadinessLane =
  | "seed-plan"
  | "session-tokens"
  | "sql-preview"
  | "hosted-db"
  | "hosted-seed"
  | "hosted-token-probe"
  | "vercel-env"
  | "rollback";

export interface ReviewerDbSeedReadinessItem {
  id: string;
  label: string;
  lane: ReviewerDbSeedReadinessLane;
  status: ReviewerDbSeedReadinessStatus;
  tableNames: string[];
  envVarNames: string[];
  routeIds: string[];
  requiredSourceSignals: string[];
  requiresHostedDatabase: boolean;
  requiresHostedSeedExecution: boolean;
  requiresHostedTokenProbe: boolean;
  requiresVercelEnvSync: boolean;
  rollbackRequired: boolean;
  sqlPreviewOnly: boolean;
  hostedSeedExecuted: false;
  hostedTokenProbeAttached: false;
  vercelEnvSynced: false;
  destructiveLiveMutation: false;
  externalNetworkCalls: false;
  liveProviderCalls: false;
  realOrdersEnabled: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface ReviewerDbSeedReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  hostedDatabaseRequired: number;
  hostedSeedExecutionRequired: number;
  hostedTokenProbeRequired: number;
  vercelEnvSyncRequired: number;
  rollbackRequired: number;
  sqlPreviewOnly: number;
  tableContracts: number;
  routeContracts: number;
  requiredEnvVars: number;
  hostedSeedProofs: number;
  hostedTokenProbeProofs: number;
  vercelEnvSyncProofs: number;
  destructiveLiveMutations: number;
  externalNetworkCalls: number;
  liveProviderCalls: number;
  realOrdersEnabled: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const reviewerDbSeedReadinessItems: ReviewerDbSeedReadinessItem[];
export function summarizeReviewerDbSeedReadiness(items?: ReviewerDbSeedReadinessItem[]): ReviewerDbSeedReadinessSummary;
export function validateReviewerDbSeedReadiness(items?: ReviewerDbSeedReadinessItem[]): string[];
