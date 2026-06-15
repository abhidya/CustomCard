import { readFileSync } from "node:fs";
import { checkAbsent, checkExact, checkIncludes, checkMinimum } from "./doctor-harness.mjs";

const files = {
  pricing: "src/printerPricing.ts",
  pricingTest: "src/printerPricing.test.ts",
  app: "src/App.tsx",
  webappPrint: "webapp/views/PrintView.tsx",
  apiServer: "scripts/api-server.mjs",
  apiRouteFamilies: "scripts/api-route-families.mjs",
  apiRuntime: "scripts/api-runtime.mjs",
  couponCollector: "scripts/printer-coupon-collector.mjs",
  couponProviderFeeds: "src/printerCouponProviderFeeds.ts",
  couponPortalEvidence: "src/printerCouponPortalEvidence.ts",
  couponPortalEvidenceData: "src/retailPrinterCouponPortalEvidenceData.mjs",
  retailOperationStartData: "src/retailPrinterOperationStartData.mjs",
  couponBrowserEvidence: "src/printerCouponBrowserEvidence.ts",
  couponBrowserEvidenceTest: "src/printerCouponBrowserEvidence.test.ts",
  apiContracts: "src/apiContracts.ts",
  browserEvidence: "docs/printer-coupon-browser-evidence.json",
  docs: "docs/printer-pricing-research.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const catalogBlock = contents.pricing.match(/export const printerPriceCatalog: PrinterPriceObservation\[] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
const collectionRulesBlock =
  contents.pricing.match(/export const printerPricingCollectionRules: PrinterPricingCollectionRule\[] = \[([\s\S]*?)\n\];/)?.[1] ??
  "";
const observationCount = countMatches(catalogBlock, /\n\s+id: "/g);
const ruleCount = countMatches(collectionRulesBlock, /noNetworkRuntime: true/g);
const manualConfirmationCount = countMatches(catalogBlock, /requiresManualConfirmation: true/g);
const liveQuoteFalseCount = countMatches(catalogBlock, /liveQuote: false/g);
const officialSourceCount = countMatches(contents.pricing, /url: "https:\/\//g);

const checks = [
  checkExact("catalog", "current-observation-count", observationCount, 12),
  checkMinimum("catalog", "official-source-count", officialSourceCount, 9),
  checkIncludes("catalog", "refreshed-official-price-signals", contents.pricing, [
    'observedAtIso = "2026-06-07T12:00:00.000Z"',
    'id: "walgreens-5x7-folded-card"',
    "unitPriceCents: 349",
    'id: "cvs-5x7-folded-card"',
    "unitPriceCents: 898",
    'id: "walmart-5x7-same-day-folded-card"',
    "unitPriceCents: 56",
    'id: "fedex-quick-5x7-single-sided-card"',
    "startingPackagePriceCents: 1399",
    'id: "staples-5x7-same-day-card-bundle"',
    "startingPackagePriceCents: 4999"
  ]),
  checkExact("safety", "manual-confirmation-count", manualConfirmationCount, observationCount),
  checkExact("safety", "live-quote-disabled-signals", liveQuoteFalseCount, observationCount),
  checkIncludes("safety", "coupon-policy-portal-signals", contents.pricing, [
    "printerCouponPolicy",
    "couponProviderFeedAllowed: true",
    "retailerCouponScrapeAllowed: true",
    "providerPortalApplicationRequired: true",
    "couponsAppliedToBestPrice: true",
    '"only-after-provider-portal-application"',
    "provider portal checkout subtotal after coupon application",
    "structured provider portal application evidence",
    "same product, quantity, fulfillment mode, and account state",
    "official coupon-validation API or provider portal cart proof for exact product details",
    "printerCouponValidationProviders",
    "walgreens-native-photo-coupon-validation",
    "https://services.walgreens.com/api/photo/order/coupon/v3"
  ]),
  checkMinimum("collection", "no-network-collection-rules", ruleCount, 8),
  checkIncludes("collection", "blocked-live-quote-fields-and-coupon-sources", `${contents.pricing}\n${contents.couponProviderFeeds}`, [
    '"tax"',
    '"coupon portal proof"',
    '"store stock"',
    '"pickup window"',
    '"live order placement"',
    "buildPrinterPricingRefreshReport",
    "canShowComparison",
    "printerCouponSources",
    "printerCouponOffers",
    "printerCouponCollectionTargets",
    "buildPrinterCouponCollectionPlan",
    "PrinterCouponCollectionPlan",
    "bestPriceRequiresProviderPortalEvidence",
    "canAffectBestPriceBeforePortalEvidence",
    "fmtcProviderFeed",
    "rakutenCouponFeed",
    "walgreens-photo-card-design-entrypoint",
    "cvs-photo-card-design-entrypoint",
    "server-fetch-html",
    "rendered-browser-read",
    "provider-api-feed",
    "staticHtmlSignalAllowed",
    "browserRenderProofRequired",
    "expectedOfferCodes",
    "legalReviewRequired",
    "sourceTargetIds",
    "buildPrinterCouponApplication",
    "PrinterCouponPortalApplicationEvidence",
    "PrinterCouponPortalApplicationPacket",
    "buildPrinterCouponPortalApplicationPackets",
    "validatePrinterCouponPortalApplicationPackets",
    "hasMatchingProviderPortalCouponEvidence",
    "validatePrinterCouponPortalApplicationEvidence"
  ]),
  checkIncludes("tests", "pricing-refresh-tests", contents.pricingTest, [
    "cvs-5x7-photo-card",
    "fedex-quick-5x7-single-sided-card",
    "subtotalCents: 4999",
    "extractPrinterCouponOffers",
    "GRADUATION",
    "expect(cvsOffer?.code).not.toBe(\"GRADUATION\")",
    "marks stale public printer pricing before showing it as current"
  ]),
  checkIncludes("surfaces", "customer-pricing-surfaces", `${contents.app}\n${contents.webappPrint}\n${contents.apiServer}\n${contents.apiRouteFamilies}`, [
    "Estimated price",
    "confirms the final total",
    "knownPriceCount: 12",
    "sourceCount: 8",
    "couponSourceCount: 4",
    "couponCollectionTargetCount: 6",
    "couponProviderTargetCount: 2",
    "retailerCouponCollectionTargetCount: 4",
    "couponOfferCount: 2",
    "activeCouponOfferCount: 2",
    "portalAppliedCouponOfferCount: 0",
    "couponPortalApplicationPacketCount: 2",
    "couponPortalApplicationTargetCount: 5",
    "providerPortalApplicationRequired: true",
    "bestAvailablePriceRequiresCouponPortalEvidence: true",
    "rankedKnownPrices",
    "liveQuote: false"
  ]),
  checkIncludes("surfaces", "server-owned-coupon-portal-evidence-api", `${contents.apiServer}\n${contents.apiRouteFamilies}\n${contents.apiRuntime}\n${contents.apiContracts}\n${contents.couponPortalEvidenceData}\n${contents.retailOperationStartData}`, [
    "retail-printer-coupon-portal-evidence",
    "/api/retail-printers/coupon-portal-evidence",
    "buildRetailPrinterCouponPortalEvidenceResponse",
    "missingRetailPrinterCouponPortalEvidenceFields",
    "buildRetailPrinterOperationStartPackets",
    "same provider portal cart",
    "clientMaySubmitCouponEvidence: false",
    "clientMayPrepareProviderRequest: false",
    "providerRequestPrepared: false",
    "networkRequestPrepared: false",
    "externalNetworkCalls: false",
    "realOrdersEnabled: false",
    "bestPriceDiscountingAllowed"
  ]),
  checkIncludes("docs", "pricing-research-docs-current", contents.docs, [
    "Observed on: June 7, 2026.",
    "5x7 folded card upload your design",
    "$0.56 each",
    "5x7 folded greeting card design detail",
    "$8.98 each",
    "$13.99 for 10",
    "Coupon Treatment",
    "server-fetch-html",
    "rendered-browser-read",
    "CRISPCARD",
    "JUNESW",
    "5x7 folded card design-detail print link",
    "5x7 folded greeting card design-detail print link",
    "FMTC Deal Feed",
    "Rakuten Advertising Coupon Feed API",
    "provider-api-feed",
    "buildPrinterCouponCollectionPlan",
    "provider portal",
    "navigation/category heading",
    "Coupon discounts",
    "are applied only after",
    "$49.99 pre-tax base",
    "coupon candidates require provider-portal application proof",
    "/api/retail-printers/coupon-portal-evidence",
    "admin-only coupon evidence intake",
    "Clients do not choose coupon sources"
  ]),
  checkIncludes("collection", "operator-coupon-collector", `${contents.couponCollector}\n${contents.couponProviderFeeds}\n${contents.couponPortalEvidence}\n${contents.couponPortalEvidenceData}\n${contents.couponBrowserEvidence}\n${contents.packageJson}`, [
    "printer-coupon-collector",
    "extractPrinterCouponOffers",
    "printEntrypointChecks",
    "renderedBrowserReadRequired",
    "browserRenderProofRequired",
    "staticHtmlEvidenceStatus",
    "staticHtmlExpectedCodeVisible",
    "renderedBrowserCollector",
    "CUSTOMCARD_COUPON_RENDER_PRINT_LINKS",
    "CUSTOMCARD_COUPON_RENDER_EVIDENCE_OUT",
    "validatePrinterCouponBrowserEvidenceArtifact",
    "summarizePrinterCouponBrowserEvidence",
    "getPrinterCouponRenderedEvidenceStatus",
    "operatorBrowserEvidenceValidation",
    "renderedBrowserEvidenceOutputPath",
    "operatorBrowserEvidenceLoaded",
    "operatorBrowserEvidenceAttachedCount",
    "CUSTOMCARD_COUPON_BROWSER_EVIDENCE",
    "CUSTOMCARD_COUPON_PORTAL_EVIDENCE",
    "importPrinterCouponPortalEvidenceArtifact",
    "validatePrinterCouponPortalEvidenceArtifact",
    "providerPortalEvidenceImport",
    "buildRetailPrinterCouponPortalEvidenceResponse",
    "validateRetailPrinterCouponPortalEvidenceArtifact",
    "retailPrinterCouponPortalEvidenceRoute",
    "operatorPortalEvidenceLoaded",
    "acceptedEvidenceCount",
    "rejectedEvidenceCount",
    "operator-chromium-rendered-read",
    "operator-browser-proof-attached",
    "operator-browser-verification-signals-missing",
    "operator-browser-html-signal-attached-visible-proof-still-required",
    "matchedExpectedCodes",
    "matchedVerificationSignals",
    "missingVerificationSignals",
    "allVerificationSignalsMatched",
    "renderedBrowserEvidenceStatus",
    "collectionMethods",
    "credentialGatedProviderTargetCount",
    "providerFeedTargets",
    "FMTC_API_TOKEN",
    "RAKUTEN_ADVERTISING_API_TOKEN",
    "codesonly",
    "collectRakutenCouponFeedTarget",
    "couponProviderCollectionPriority",
    "couponProviderCandidateCount",
    "tokenRedacted",
    "providerPortalCartTermsEvidenceRequired: true",
    "official coupon-validation API or provider portal cart proof",
    "providerPortalApplicationPacketCount",
    "providerPortalApplicationTargetCount",
    "providerPortalApplicationPackets",
    "activeAtCollection",
    "bestPriceEligibleAtCollection",
    "bestPriceBlocker",
    "provider-portal application evidence required",
    "coupon expired before provider-portal application",
    "same product, quantity, fulfillment mode, account state, and subtotal math",
    "bestPriceDiscountingAllowed: false",
    '"printer:coupons:collect": "node scripts/printer-coupon-collector.mjs"'
  ]),
  checkIncludes("tests", "browser-evidence-tests", contents.couponBrowserEvidenceTest, [
    "distinguishes visible print-link coupon proof from HTML-only coupon signals",
    "operator-browser-proof-attached",
    "operator-browser-verification-signals-missing",
    "operator-browser-html-signal-attached-visible-proof-still-required",
    "operator-browser-proof-invalid",
    "allVerificationSignalsMatched",
    "must prove no upload action"
  ]),
  checkIncludes("collection", "operator-browser-evidence-artifact", contents.browserEvidence, [
    "customcard-printer-coupon-browser-evidence",
    "operator-chromium-rendered-read",
    "walgreens-photo-card-design-entrypoint",
    "cvs-photo-card-design-entrypoint",
    "finalUrl",
    "expectedOfferCodes",
    "visibleTextSignals",
    "pageHtmlSignals",
    "CRISPCARD",
    "JUNESW",
    "noCheckoutAction",
    "noUploadAction",
    "noOrderPlaced"
  ]),
  checkIncludes("ci", "pricing-doctor-is-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"printer:pricing:doctor": "node scripts/printer-pricing-doctor.mjs"',
    "Validate printer pricing research",
    "npm run printer:pricing:doctor"
  ]),
  checkAbsent("safety", "no-live-pricing-claims", `${contents.pricing}\n${contents.apiServer}\n${contents.docs}`, [
    "liveQuote: true",
    "real orders enabled",
    "live vendor quote is connected"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "repo-consistent" : "contract-drift"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-printer-pricing-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      observationCount,
      officialSourceCount,
      collectionRuleCount: ruleCount,
      manualConfirmationCount,
      liveQuote: false,
      liveOrdersEnabled: false,
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}
