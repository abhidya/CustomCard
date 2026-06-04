export type RetailFulfillmentReadinessStatus = "repo-local-ready" | "evidence-missing" | "certification-blocked";
export type RetailFulfillmentReadinessLane =
  | "manual-handoff"
  | "pricing-research"
  | "quote-freshness"
  | "vendor-certification"
  | "order-safety"
  | "recovery"
  | "payment-boundary"
  | "physical-qa";

export interface RetailFulfillmentReadinessItem {
  id: string;
  label: string;
  lane: RetailFulfillmentReadinessLane;
  status: RetailFulfillmentReadinessStatus;
  vendorAdapterIds: string[];
  fallbackAdapterIds: string[];
  recoveryEventNames: string[];
  manualConfirmationRequired: boolean;
  humanApprovalRequired: boolean;
  liveQuoteEnabled: false;
  directOrderEnabled: false;
  externalNetworkCalls: false;
  realPaymentsEnabled: false;
  physicalCertificationAttached: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface RetailFulfillmentReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  certificationBlocked: number;
  liveVendorAdapterContracts: number;
  manualFallbacks: number;
  recoveryDrillEvents: number;
  manualConfirmationRequired: number;
  humanApprovalRequired: number;
  liveQuoteEnabled: number;
  directOrderEnabled: number;
  externalNetworkCalls: number;
  realPaymentsEnabled: number;
  physicalCertificationAttached: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const retailFulfillmentReadinessItems: RetailFulfillmentReadinessItem[];
export function summarizeRetailFulfillmentReadiness(
  items?: RetailFulfillmentReadinessItem[]
): RetailFulfillmentReadinessSummary;
export function validateRetailFulfillmentReadiness(items?: RetailFulfillmentReadinessItem[]): string[];
