export const retailPrinterCouponPortalEvidenceRoute: "/api/retail-printers/coupon-portal-evidence";
export const retailPrinterCouponPortalEvidenceRouteId: "retail-printer-coupon-portal-evidence";

export interface RetailPrinterCouponPortalEvidencePayload {
  evidenceArtifact?: unknown;
  portalEvidenceArtifact?: unknown;
}

export interface RetailPrinterCouponPortalEvidenceResponse {
  service: "customcard-api";
  status: "accepted" | "rejected";
  route: "retail-printer-coupon-portal-evidence";
  serverOwned: true;
  clientMayPrepareProviderRequest: false;
  providerRequestPrepared: false;
  networkRequestPrepared: false;
  requestPrepared: false;
  networkAttempted: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  rawContentStored: false;
  providerPayloadPrepared: false;
  providerPortalEvidenceImport: {
    status: "accepted" | "rejected";
    generatedAtIso?: string;
    totalEvidenceRecords: number;
    acceptedEvidenceCount: number;
    rejectedEvidenceCount: number;
    providerPortalApplicationProof: boolean;
    bestPriceDiscountingAllowed: boolean;
    blockedFields: string[];
  };
  acceptedEvidence: Array<Record<string, unknown>>;
  rejectedEvidence: Array<Record<string, unknown>>;
  pricingImpact: Record<string, unknown> | null;
  rankedPricingImpacts: Array<Record<string, unknown>>;
  bestPriceDiscountingAllowed: boolean;
  blockedFields: string[];
  repository: {
    tables: ["auth_sessions", "idempotency_keys", "audit_log"];
    runtimeMode: "contract";
    persisted: false;
    providerPayloadPrepared: false;
    realOrdersEnabled: false;
  };
}

export function buildSampleRetailPrinterCouponPortalEvidencePayload(): RetailPrinterCouponPortalEvidencePayload;
export function missingRetailPrinterCouponPortalEvidenceFields(body?: RetailPrinterCouponPortalEvidencePayload): string[];
export function buildRetailPrinterCouponPortalEvidenceResponse(
  body?: RetailPrinterCouponPortalEvidencePayload
): RetailPrinterCouponPortalEvidenceResponse;
export function validateRetailPrinterCouponPortalEvidenceArtifact(artifact: unknown): string[];
