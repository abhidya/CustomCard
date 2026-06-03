export type ExternalAuditStatus = "internal-baseline-ready" | "external-evidence-missing" | "certification-blocked";
export type ExternalAuditCategory =
  | "identity"
  | "provider"
  | "ai"
  | "commerce"
  | "operations"
  | "cloud"
  | "mobile"
  | "external-review"
  | "print";

export interface ExternalAuditReadinessItem {
  id: string;
  label: string;
  category: ExternalAuditCategory;
  status: ExternalAuditStatus;
  relatedProductionGateIds: string[];
  requiredEvidence: string[];
  currentEvidence: string[];
  evidenceArtifactRefs: string[];
  reviewer: string;
  cadence: string;
  externalReviewerRequired: true;
  blocksProduction: true;
  publicClaimAllowed: false;
  blocker: string;
}

export interface ExternalAuditReadinessSummary {
  total: number;
  internalBaselineReady: number;
  externalEvidenceMissing: number;
  certificationBlocked: number;
  productionBlocked: number;
  publicClaimsAllowed: number;
  externalArtifactsAttached: number;
  externalReviewerRequired: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const externalAuditReadinessItems: ExternalAuditReadinessItem[];
export function summarizeExternalAuditReadiness(items?: ExternalAuditReadinessItem[]): ExternalAuditReadinessSummary;
export function validateExternalAuditReadiness(items?: ExternalAuditReadinessItem[]): string[];
