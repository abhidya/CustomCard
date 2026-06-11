export type SharedPrinterCouponCollectionPriorityStep = Record<string, unknown> & {
  id: string;
  collectionMethod: string;
};

export type SharedPrinterCouponCollectionTarget = Record<string, unknown> & {
  id: string;
  vendorIds: string[];
  role: string;
  collectionMethod: string;
  credentialEnvKeys: string[];
};

export type SharedPrinterCouponPortalApplicationPacket = Record<string, unknown> & {
  id: string;
  vendorId: string;
  canAffectBestPrice: false;
};

export interface SharedPrinterCouponCollectionPlan {
  vendorId: string;
  quantity: number;
  collectionPriority: SharedPrinterCouponCollectionPriorityStep[];
  collectionTargetIds: string[];
  providerFeedTargetIds: string[];
  retailerCouponTargetIds: string[];
  printEntrypointTargetIds: string[];
  credentialEnvKeys: string[];
  candidateOfferCodes: string[];
  portalApplicationPacketIds: string[];
  providerFeedTargets: SharedPrinterCouponCollectionTarget[];
  retailerCouponTargets: SharedPrinterCouponCollectionTarget[];
  printEntrypointTargets: SharedPrinterCouponCollectionTarget[];
  portalApplicationPackets: SharedPrinterCouponPortalApplicationPacket[];
  couponPolicy: Record<string, unknown> & { providerPortalApplicationRequired: true };
  couponProviderFeedPreferred: true;
  retailerScrapeFallbackAllowed: true;
  printLinkRenderFallbackAllowed: true;
  providerPortalApplicationRequired: true;
  bestPriceRequiresProviderPortalEvidence: true;
  canAffectBestPriceBeforePortalEvidence: false;
  noNetworkRuntime: true;
  operatorSteps: string[];
}

export const printerCouponCollectionPriority: SharedPrinterCouponCollectionPriorityStep[];
export const printerCouponProviderFeedTargets: SharedPrinterCouponCollectionTarget[];
export const printerCouponCollectionTargets: SharedPrinterCouponCollectionTarget[];
export const printerCouponCollectionContracts: Record<
  string,
  {
    retailerCouponTargets: SharedPrinterCouponCollectionTarget[];
    printEntrypointTargets: SharedPrinterCouponCollectionTarget[];
    candidateOfferCodes: string[];
    portalApplicationPackets: SharedPrinterCouponPortalApplicationPacket[];
  }
>;

export function getPrinterCouponCollectionContract(
  vendorId: string
): (typeof printerCouponCollectionContracts)[string] | undefined;

export function buildSharedPrinterCouponCollectionPlan(
  productLinkOrVendorId: string | Record<string, unknown>,
  options?: { quantity?: number }
): SharedPrinterCouponCollectionPlan;
