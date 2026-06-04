export type HostedApiReadinessStatus = "repo-local-ready" | "evidence-missing" | "protection-blocked";
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
  routeIds: string[];
  envVarNames: string[];
  requiredSourceSignals: string[];
  requiresHostedDb: boolean;
  requiresPublicRouteProof: boolean;
  requiresHostedTokenVerification: boolean;
  requiresBackupPolicy: boolean;
  environmentSynced: false;
  hostedDbConnected: false;
  publicRouteProofAttached: false;
  hostedTokenVerificationAttached: false;
  backupPolicyAttached: false;
  deploymentProtectionBypassed: false;
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
  protectionBlocked: number;
  hostedDbRequired: number;
  publicRouteProofRequired: number;
  hostedTokenVerificationRequired: number;
  backupPolicyRequired: number;
  routeContracts: number;
  requiredEnvVars: number;
  sourceSignals: number;
  envSyncProofs: number;
  hostedDbProofs: number;
  publicRouteProofs: number;
  hostedTokenVerificationProofs: number;
  backupPolicies: number;
  deploymentProtectionBypasses: number;
  externalNetworkCalls: number;
  realOrdersEnabled: number;
  liveProviderCalls: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const hostedApiReadinessItems: HostedApiReadinessItem[];
export function summarizeHostedApiReadiness(items?: HostedApiReadinessItem[]): HostedApiReadinessSummary;
export function validateHostedApiReadiness(items?: HostedApiReadinessItem[]): string[];
