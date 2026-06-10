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
  validatePrinterCouponPortalEvidenceArtifact,
  type PrinterCouponPortalEvidenceArtifact,
  type PrinterCouponPortalEvidenceImportResult
} from "./printerCouponPortalEvidence";
import {
  validatePrinterCouponBrowserEvidenceArtifact,
  type PrinterCouponBrowserEvidenceArtifact
} from "./printerCouponBrowserEvidence";

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

// --- Doctor ---

export type CouponEvidenceVerdict = "ready" | "blocked";

export interface CouponEvidenceReport {
  verdict: CouponEvidenceVerdict;
  artifactErrors: string[];
  browserErrors: string[];
  portalResult: PrinterCouponPortalEvidenceImportResult | null;
  blockers: string[];
}

/**
 * Orchestrates the full coupon evidence lifecycle: validate artifact structure,
 * import portal evidence against the live catalog, validate browser evidence.
 * Returns a ready/blocked verdict — the single entry point for coupon proof workflows.
 *
 * Interface is the test surface: callers inject artifacts; this module owns
 * the collect → validate → accept sequence.
 */
export function runCouponEvidenceDoctor(
  portalArtifact: PrinterCouponPortalEvidenceArtifact | null | undefined,
  browserArtifact?: PrinterCouponBrowserEvidenceArtifact | null,
  options: { now?: Date } = {}
): CouponEvidenceReport {
  const blockers: string[] = [];

  const artifactErrors = portalArtifact ? validatePrinterCouponPortalEvidenceArtifact(portalArtifact) : [];
  artifactErrors.forEach((e) => blockers.push(e));

  const portalResult = importCatalogBackedCouponPortalEvidence(portalArtifact, options);
  if (portalResult.status !== "accepted") {
    portalResult.rejectedEvidence.forEach((r) => blockers.push(...r.reasons));
  }

  const browserErrors = browserArtifact ? validatePrinterCouponBrowserEvidenceArtifact(browserArtifact) : [];
  browserErrors.forEach((e) => blockers.push(e));

  return {
    verdict: blockers.length === 0 ? "ready" : "blocked",
    artifactErrors,
    browserErrors,
    portalResult,
    blockers
  };
}
