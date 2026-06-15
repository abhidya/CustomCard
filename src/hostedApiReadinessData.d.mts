export type HostedApiReadinessStatus =
  | "repo-local-ready"
  | "evidence-missing"
  | "protection-blocked"
  | "live-proof-attached"
  | "partial-live-proof";
export type HostedApiReadinessProofScope =
  | "repo-local-contract"
  | "live-hosted-required"
  | "protection-blocked"
  | "live-hosted-attached"
  | "partial-live-hosted";
export type HostedApiReadinessLane =
  | "deployment-evidence"
  | "serverless-api"
  | "deployment-protection"
  | "environment-sync"
  | "database-connectivity"
  | "public-route-proof"
  | "hosted-auth-proof"
  | "backup-policy";

export interface HostedApiReadinessItem {
  id: string;
  label: string;
  lane: HostedApiReadinessLane;
  status: HostedApiReadinessStatus;
  proofScope: HostedApiReadinessProofScope;
  routeIds: string[];
  envVarNames: string[];
  evidenceArtifactRefs: string[];
  requiredSourceSignals: string[];
  requiresHostedDb: boolean;
  requiresPublicRouteProof: boolean;
  requiresHostedTokenVerification: boolean;
  requiresBackupPolicy: boolean;
  liveProofClaimed: boolean;
  environmentSynced: boolean;
  hostedDbConnected: boolean;
  publicRouteProofAttached: boolean;
  hostedTokenVerificationAttached: false;
  backupPolicyAttached: false;
  deploymentProtectionBypassed: boolean;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveProviderCalls: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface HostedApiReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  liveProofAttached: number;
  partialLiveProof: number;
  protectionBlocked: number;
  hostedDbRequired: number;
  publicRouteProofRequired: number;
  hostedTokenVerificationRequired: number;
  backupPolicyRequired: number;
  repoLocalContractProofs: number;
  liveHostedProofRequired: number;
  protectionBlockedProofs: number;
  routeContracts: number;
  requiredEnvVars: number;
  sourceSignals: number;
  liveHostedProofAttached: number;
  partialLiveHostedProofs: number;
  envSyncProofs: number;
  hostedDbProofs: number;
  publicRouteProofs: number;
  hostedTokenVerificationProofs: number;
  backupPolicies: number;
  deploymentProtectionBypasses: number;
  externalNetworkCalls: number;
  realOrdersEnabled: number;
  liveProviderCalls: number;
  evidenceArtifacts: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const hostedApiReadinessItems: HostedApiReadinessItem[];
export function summarizeHostedApiReadiness(items?: HostedApiReadinessItem[]): HostedApiReadinessSummary;
export function validateHostedApiReadiness(items?: HostedApiReadinessItem[]): string[];
