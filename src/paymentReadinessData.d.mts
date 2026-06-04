export type PaymentReadinessStatus = "repo-local-ready" | "evidence-missing" | "certification-blocked";
export type PaymentReadinessLane =
  | "local-fallback"
  | "provider-contracts"
  | "idempotency"
  | "pci-boundary"
  | "webhooks"
  | "processor-approval"
  | "refunds-disputes"
  | "reconciliation";

export interface PaymentReadinessItem {
  id: string;
  label: string;
  lane: PaymentReadinessLane;
  status: PaymentReadinessStatus;
  paymentAdapterIds: string[];
  fallbackAdapterIds: string[];
  ledgerEventNames: string[];
  idempotencyRequired: boolean;
  webhookSignatureRequired: boolean;
  processorApprovalRequired: boolean;
  liveChargesEnabled: false;
  liveRefundsEnabled: false;
  liveCaptureEnabled: false;
  externalNetworkCalls: false;
  cardDataStored: false;
  pciScopeApproved: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface PaymentReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  certificationBlocked: number;
  paymentProviderContracts: number;
  localFallbacks: number;
  ledgerEvents: number;
  idempotencyRequired: number;
  webhookSignatureRequired: number;
  processorApprovalRequired: number;
  liveChargesEnabled: number;
  liveRefundsEnabled: number;
  liveCaptureEnabled: number;
  externalNetworkCalls: number;
  cardDataStored: number;
  pciScopeApproved: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const paymentReadinessItems: PaymentReadinessItem[];
export function summarizePaymentReadiness(items?: PaymentReadinessItem[]): PaymentReadinessSummary;
export function validatePaymentReadiness(items?: PaymentReadinessItem[]): string[];
