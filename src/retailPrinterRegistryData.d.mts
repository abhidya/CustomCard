export type RetailPrinterRegistryVendorId = "walmart" | "fedex" | "cvs" | "walgreens";
export type RetailPrinterRegistryOperationKind = "fetch-price" | "upload-image" | "place-order";
export type RetailPrinterRegistryFulfillmentMode = "pickup" | "shipping";
export type RetailPrinterRegistryProviderAccountMode =
  | "customer-account-required"
  | "guest-or-customer-account"
  | "operator-reviewed-provider-session";
export type RetailPrinterRegistryUploadArtifactKind = "combined-pdf-proof" | "svg-panel-set" | "print-ready-image-files";

export interface RetailPrinterRegistryOperationEvidence {
  observedAtIso: string;
  sourceTitle: string;
  pageSignals: string[];
  requiredOperatorProof: string[];
}

export interface RetailPrinterRegistryProductLink {
  vendorId: RetailPrinterRegistryVendorId;
  providerAdapterId: string;
  vendorName: string;
  productName: string;
  productSku: string;
  productUrl: string;
  pricingObservationId: string;
  requiredUrlTokens: string[];
  operationEvidence: Record<RetailPrinterRegistryOperationKind, RetailPrinterRegistryOperationEvidence>;
  portalHost: string;
  minimumQuantity: number;
  quantityIncrement: number;
  supportedFulfillmentModes: RetailPrinterRegistryFulfillmentMode[];
  providerAccountMode: RetailPrinterRegistryProviderAccountMode;
  acceptedArtifactKinds: RetailPrinterRegistryUploadArtifactKind[];
  uploadPreflightChecks: string[];
  candidateOfferCodes: string[];
  portalApplicationPacketIds: string[];
}

export const retailPrinterRegistryLinkObservedAtIso: "2026-06-07T12:00:00.000Z";
export const retailPrinterRegistryRequiredVendorIds: RetailPrinterRegistryVendorId[];
export const retailPrinterRegistryOperationKinds: RetailPrinterRegistryOperationKind[];
export const retailPrinterRegistryProductLinks: Record<RetailPrinterRegistryVendorId, RetailPrinterRegistryProductLink>;
