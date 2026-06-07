export type CustomerAccessibilityEvidenceStatus = "repo-local-ready" | "external-evidence-missing";
export type CustomerAccessibilityEvidenceLane =
  | "landmarks"
  | "forms"
  | "actions"
  | "responsive"
  | "mobile-preview"
  | "external-audit";
export type CustomerAccessibilityEvidenceSurface = "web-customer" | "mobile-preview";

export interface CustomerAccessibilityEvidenceItem {
  id: string;
  label: string;
  lane: CustomerAccessibilityEvidenceLane;
  status: CustomerAccessibilityEvidenceStatus;
  surface: CustomerAccessibilityEvidenceSurface;
  sourceSignals: string[];
  currentEvidence: string[];
  requiredEvidence: string[];
  customerVisible: boolean;
  externalAuditRequired: true;
  externalAuditAttached: false;
  manualScreenReaderProofAttached: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveProviderCalls: false;
  blocker: string;
}

export interface CustomerAccessibilityEvidenceSummary {
  total: number;
  repoLocalReady: number;
  externalEvidenceMissing: number;
  customerVisibleItems: number;
  externalAuditRequired: number;
  externalAuditAttached: number;
  manualScreenReaderProofAttached: number;
  sourceSignals: string[];
  currentEvidence: string[];
  requiredEvidence: string[];
  externalNetworkCalls: number;
  realOrdersEnabled: number;
  liveProviderCalls: number;
  blockers: string[];
}

export const customerAccessibilityEvidenceItems: CustomerAccessibilityEvidenceItem[];
export function summarizeCustomerAccessibilityEvidence(
  items?: CustomerAccessibilityEvidenceItem[]
): CustomerAccessibilityEvidenceSummary;
export function validateCustomerAccessibilityEvidence(items?: CustomerAccessibilityEvidenceItem[]): string[];
