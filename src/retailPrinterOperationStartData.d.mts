export type RetailPrinterVendorId = "walmart" | "fedex" | "cvs" | "walgreens";
export type RetailPrinterOperationKind = "fetch-price" | "upload-image" | "place-order";

export interface RetailPrinterOperationStartPacket {
  id: string;
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  vendorName: string;
  productName: string;
  productSku: string;
  operation: RetailPrinterOperationKind;
  label: string;
  status: "blocked";
  apiRoute: typeof retailPrinterOperationStartRoute;
  serverOwned: true;
  customerVisible: true;
  productUrl: string;
  manualReviewUrl: string;
  providerPortalUrl: string;
  providerRequestUrl: null;
  clientMayPrepareProviderRequest: false;
  providerRequestPrepared: false;
  networkRequestPrepared: false;
  requestPrepared: false;
  networkAttempted: false;
  noNetwork: true;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  sourceLink: Record<string, unknown> & { purpose: RetailPrinterOperationKind; url: string };
  providerEntrypoint: Record<string, unknown> & { operation: RetailPrinterOperationKind; url: string };
  operationPolicy: Record<string, unknown> & { kind: RetailPrinterOperationKind };
  couponCollectionPlan: Record<string, unknown> & {
    collectionTargetIds: string[];
    providerFeedTargetIds: string[];
    retailerCouponTargetIds: string[];
    printEntrypointTargetIds: string[];
    candidateOfferCodes: string[];
    portalApplicationPacketIds: string[];
    providerFeedTargets: Array<Record<string, unknown> & { id: string; collectionMethod: string; role: string }>;
    retailerCouponTargets: Array<Record<string, unknown> & { id: string; url: string; collectionMethod: string; role: string }>;
    printEntrypointTargets: Array<
      Record<string, unknown> & { id: string; url: string; collectionMethod: "rendered-browser-read"; role: "print-entrypoint" }
    >;
    portalApplicationPackets: Array<Record<string, unknown> & { id: string; canAffectBestPrice: false }>;
    couponPolicy: Record<string, unknown> & { providerPortalApplicationRequired: true };
    bestPriceRequiresProviderPortalEvidence: true;
    canAffectBestPriceBeforePortalEvidence: false;
    operatorSteps: string[];
  };
  couponPortalApplicationRequired: true;
  bestPriceRequiresProviderPortalEvidence: true;
  canAffectBestPriceBeforePortalEvidence: false;
  expectedInputFields: string[];
  requiredInputFields: string[];
  optionalInputFields: string[];
  sourceBackedFields: string[];
  requiredEvidence: string[];
  requiredGateIds: string[];
  blockers: string[];
  forbiddenFields: string[];
  operatorSteps: string[];
  safetyChecks: string[];
  blockedReason: string;
}

export interface RetailPrinterOperationStartResponse {
  service: "customcard-retail-printer-operation-start";
  status: "blocked";
  requestedVendorId: RetailPrinterVendorId;
  requestedOperation: RetailPrinterOperationKind;
  startPacket: RetailPrinterOperationStartPacket;
  serverOwned: true;
  clientMayPrepareProviderRequest: false;
  providerPortalUrl: string;
  providerRequestUrl: null;
  providerRequestPrepared: false;
  networkRequestPrepared: false;
  requestPrepared: false;
  networkAttempted: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  blockers: string[];
}

export interface RetailPrinterOperationStartRequest {
  vendorId?: string;
  operation?: string;
}

export const retailPrinterOperationStartRoute: "/api/retail-printers/operations/start";
export const retailPrinterOperationKinds: RetailPrinterOperationKind[];
export const retailPrinterProductLinks: Record<RetailPrinterVendorId, Record<string, unknown> & {
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  productUrl: string;
}>;

export function buildRetailPrinterOperationStartPackets(_adapters?: unknown): RetailPrinterOperationStartPacket[];
export function buildRetailPrinterOperationStartResponse(
  request?: RetailPrinterOperationStartRequest
): RetailPrinterOperationStartResponse;
export function validateRetailPrinterOperationStartPackets(packets?: RetailPrinterOperationStartPacket[]): string[];
export function parseRetailPrinterVendorId(value: unknown): RetailPrinterVendorId | undefined;
export function parseRetailPrinterOperationKind(value: unknown): RetailPrinterOperationKind | undefined;
