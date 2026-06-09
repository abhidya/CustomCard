/**
 * Coordinator for the coupon evidence subsystem.
 *
 * Three evidence source modules orbit this seam:
 *   - printerCouponPortalEvidence  (operator attests coupon worked in retailer portal)
 *   - printerCouponBrowserEvidence (rendered-browser proof that coupon code is visible)
 *   - printerCouponProviderFeeds   (FMTC / Rakuten coupon-feed collection)
 *
 * Callers that need evidence handling import from here. The three source modules
 * remain importable independently for tests that inject custom offers/catalog data.
 */

export {
  combinePrinterCouponBrowserEvidence,
  findPrinterCouponBrowserEvidenceTarget,
  getPrinterCouponRenderedEvidenceStatus,
  normalizePrinterCouponSignalList,
  printerCouponBrowserEvidenceServiceName,
  summarizePrinterCouponBrowserEvidence,
  validatePrinterCouponBrowserEvidenceArtifact,
  validatePrinterCouponBrowserEvidenceTarget,
  type PrinterCouponBrowserEvidenceArtifact,
  type PrinterCouponBrowserEvidenceSummary,
  type PrinterCouponBrowserEvidenceTarget,
  type PrinterCouponRenderedEvidenceStatus
} from "./printerCouponBrowserEvidence";

export {
  importPrinterCouponPortalEvidenceArtifact,
  validatePrinterCouponPortalEvidenceArtifact,
  type AcceptedPrinterCouponPortalEvidence,
  type PrinterCouponPortalEvidenceArtifact,
  type PrinterCouponPortalEvidenceImportResult,
  type PrinterCouponPortalEvidenceRecord,
  type RejectedPrinterCouponPortalEvidence
} from "./printerCouponPortalEvidence";

export {
  buildCouponProviderBaseTarget,
  buildFmtcDealFeedRequest,
  buildRakutenCouponFeedRequest,
  collectFmtcProviderFeedTarget,
  collectRakutenCouponFeedTarget,
  extractRakutenRelevantDeals,
  parseFmtcDealFeed,
  summarizeFmtcRelevantDeals,
  type CouponProviderCollectorOptions,
  type CouponProviderDealSummary,
  type CouponProviderFeedBaseTarget,
  type CouponProviderFeedCollectionResult,
  type CouponProviderFetch,
  type CouponProviderFetchInit,
  type CouponProviderHttpResponse
} from "./printerCouponProviderFeeds";

import { printerCouponOffers, printerPriceCatalog } from "./printerPricing";
import {
  importPrinterCouponPortalEvidenceArtifact,
  type PrinterCouponPortalEvidenceArtifact,
  type PrinterCouponPortalEvidenceImportResult
} from "./printerCouponPortalEvidence";

/**
 * Portal evidence import wired to the live catalog.
 *
 * The source module (`importPrinterCouponPortalEvidenceArtifact`) accepts
 * offers/catalog as options so tests can inject custom data. This function
 * is the production entry point: it binds the live catalog automatically so
 * callers don't need to know where the catalog lives.
 */
export function importCatalogBackedCouponPortalEvidence(
  artifact: PrinterCouponPortalEvidenceArtifact | null | undefined,
  options: { now?: Date } = {}
): PrinterCouponPortalEvidenceImportResult {
  return importPrinterCouponPortalEvidenceArtifact(artifact, {
    ...options,
    offers: printerCouponOffers,
    catalog: printerPriceCatalog
  });
}
