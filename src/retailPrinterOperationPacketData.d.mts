export type RetailPrinterVendorId = "walmart" | "fedex" | "cvs" | "walgreens";
export type RetailPrinterOperationKind = "fetch-price" | "upload-image" | "place-order";
export type RetailPrinterEntrypointEvidenceMode =
  | "public-product-price-review"
  | "provider-project-preview-review"
  | "provider-cart-final-review";
export type RetailPrinterEntrypointCouponMode =
  | "apply-during-price-collection"
  | "preserve-price-collection-coupon-state"
  | "final-cart-coupon-recheck";

export interface RetailPrinterOperationProfile {
  label: string;
  requiredInputFields: string[];
  optionalInputFields: string[];
  sourceBackedFields: string[];
  evidenceMode: RetailPrinterEntrypointEvidenceMode;
  couponMode: string;
  providerEntrypointCouponMode: RetailPrinterEntrypointCouponMode;
  requiredEvidence: string[];
  adapterRequiredEvidence: string[];
  requiredGateIds: string[];
  adapterCertificationGateIds: string[];
  blockedReason: string;
  adapterBlockedReason: string;
}

export interface RetailPrinterProductLike {
  vendorId: RetailPrinterVendorId;
  vendorName: string;
  productName: string;
  productSku: string;
  productUrl: string;
  portalHost: string;
  requiredUrlTokens: string[];
  operationEvidence: Record<RetailPrinterOperationKind, RetailPrinterProviderOperationEvidence>;
  minimumQuantity: number;
  quantityIncrement: number;
  supportedFulfillmentModes: string[];
  providerAccountMode: string;
  acceptedArtifactKinds: string[];
  uploadPreflightChecks: string[];
}

export interface RetailPrinterProviderOperationEvidence {
  observedAtIso: string;
  sourceTitle: string;
  pageSignals: string[];
  requiredOperatorProof: string[];
}

export interface RetailPrinterProviderOperationEntrypoint {
  operation: RetailPrinterOperationKind;
  label: string;
  url: string;
  portalHost: string;
  productSku: string;
  productIdentityTokens: string[];
  publicEvidence: RetailPrinterProviderOperationEvidence;
  evidenceMode: RetailPrinterEntrypointEvidenceMode;
  couponMode: RetailPrinterEntrypointCouponMode;
  requiresCustomerApproval: true;
  noNetwork: true;
  requestPreparationBlocked: true;
  orderSubmissionBlocked: true;
}

export const retailPrinterSharedForbiddenFields: string[];
export const retailPrinterSharedGateIds: string[];
export const retailPrinterOperationProfiles: Record<RetailPrinterOperationKind, RetailPrinterOperationProfile>;

export function getRetailPrinterOperationProfile(operation: unknown): RetailPrinterOperationProfile;
export function buildRetailPrinterOperationExpectedInputFields(operation: unknown): string[];
export function buildRetailPrinterOperationPolicy(productLink: RetailPrinterProductLike, operation: unknown): Record<string, unknown>;
export function buildRetailPrinterOperationSourceLink(productLink: RetailPrinterProductLike, operation: RetailPrinterOperationKind): Record<string, unknown> & {
  purpose: RetailPrinterOperationKind;
  url: string;
};
export function buildRetailPrinterProviderOperationEntrypoint(
  productLink: RetailPrinterProductLike,
  operation: RetailPrinterOperationKind
): RetailPrinterProviderOperationEntrypoint;
export function buildRetailPrinterOperationBlockers(operation: unknown, requiredGateIds?: string[]): string[];
export function buildRetailPrinterOperationSafetyChecks(gateIds?: string[]): string[];
