export type CloudArtifactProofReadinessStatus = "repo-local-ready" | "evidence-missing";
export type CloudArtifactProofReadinessLane =
  | "terraform-source"
  | "terraform-plan"
  | "bucket-proof"
  | "iam-proof"
  | "signed-url-probe"
  | "audit-log-proof"
  | "secret-sync"
  | "retention-restore";

export interface CloudArtifactProofReadinessItem {
  id: string;
  label: string;
  lane: CloudArtifactProofReadinessLane;
  status: CloudArtifactProofReadinessStatus;
  terraformFiles: string[];
  envOutputNames: string[];
  requiredSourceSignals: string[];
  requiresAppliedCloud: boolean;
  requiresBucketArnProof: boolean;
  requiresIamPolicyProof: boolean;
  requiresSignedUrlProbe: boolean;
  requiresAccessLogProof: boolean;
  requiresSecretSync: boolean;
  requiresRestoreDrill: boolean;
  terraformApplyExecuted: false;
  appliedBucketArnAttached: false;
  iamPolicyOutputAttached: false;
  signedUrlProbeAttached: false;
  accessLogAttached: false;
  secretSyncAttached: false;
  restoreDrillAttached: false;
  externalNetworkCalls: false;
  liveProviderCalls: false;
  realOrdersEnabled: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface CloudArtifactProofReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  appliedCloudRequired: number;
  bucketArnProofRequired: number;
  iamPolicyProofRequired: number;
  signedUrlProbeRequired: number;
  accessLogProofRequired: number;
  secretSyncRequired: number;
  restoreDrillRequired: number;
  terraformFileContracts: number;
  envOutputContracts: number;
  terraformApplyExecutions: number;
  appliedBucketArnProofs: number;
  iamPolicyOutputProofs: number;
  signedUrlProbeProofs: number;
  accessLogProofs: number;
  secretSyncProofs: number;
  restoreDrillProofs: number;
  externalNetworkCalls: number;
  liveProviderCalls: number;
  realOrdersEnabled: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const cloudArtifactProofReadinessItems: CloudArtifactProofReadinessItem[];
export function summarizeCloudArtifactProofReadiness(items?: CloudArtifactProofReadinessItem[]): CloudArtifactProofReadinessSummary;
export function validateCloudArtifactProofReadiness(items?: CloudArtifactProofReadinessItem[]): string[];
