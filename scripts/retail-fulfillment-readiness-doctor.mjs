import { readFileSync } from "node:fs";
import {
  retailFulfillmentReadinessItems,
  summarizeRetailFulfillmentReadiness,
  validateRetailFulfillmentReadiness
} from "../src/retailFulfillmentReadinessData.mjs";
import { checkArrayIncludes, checkExact, checkIncludes, checkMinimum, checkNoBlockers } from "./doctor-harness.mjs";

const files = {
  retailTest: "src/retailFulfillmentReadiness.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  readinessSummaryData: "src/readinessSummaryData.mjs",
  providerCatalog: "src/providerCatalog.ts",
  providerRuntime: "src/providerRuntime.ts",
  retailPrinterRegistry: "src/retailPrinterRegistryData.mjs",
  retailPrinterContracts: "src/retailPrinterContracts.ts",
  retailPrinterAdapters: "src/retailPrinterAdapters.ts",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md",
  pricingDocs: "docs/printer-pricing-research.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeRetailFulfillmentReadiness(retailFulfillmentReadinessItems);
const validationBlockers = validateRetailFulfillmentReadiness(retailFulfillmentReadinessItems);
const itemIds = retailFulfillmentReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "live-vendor-contracts", summary.liveVendorAdapterContracts, 6),
  checkExact("register", "manual-fallbacks", summary.manualFallbacks, 2),
  checkExact("register", "no-live-quotes", summary.liveQuoteEnabled, 0),
  checkExact("register", "no-direct-orders", summary.directOrderEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-real-payments", summary.realPaymentsEnabled, 0),
  checkExact("register", "no-physical-certification-claim", summary.physicalCertificationAttached, 0),
  checkMinimum("register", "recovery-drill-events", summary.recoveryDrillEvents, 12),
  checkMinimum("register", "human-approval-count", summary.humanApprovalRequired, 8),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-retail-readiness-ids", itemIds, [
    "manual-handoff-package",
    "review-only-pricing",
    "live-quote-contracts",
    "vendor-api-certification",
    "order-mutation-kill-switch",
    "pickup-cancel-recovery-drills",
    "payment-refund-boundary",
    "physical-print-qa"
  ]),
  checkItemsShape("register", "retail-readiness-item-shape", retailFulfillmentReadinessItems),
  checkIncludes("tests", "retail-readiness-tests", contents.retailTest, [
    "tracks direct retail-printer fulfillment readiness without live ordering claims",
    "covers live vendor adapters, manual fallbacks, and recovery drills explicitly",
    "flags unsafe retail launch claims"
  ]),
  checkIncludes("surfaces", "admin-api-retail-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}\n${contents.readinessSummaryData}`, [
    "Retail fulfillment readiness",
    "summarizeRetailFulfillmentReadiness",
    "retailFulfillment",
    "directOrderEnabled",
    "physicalCertificationAttached"
  ]),
  checkIncludes("provider-contracts", "retail-provider-contracts", `${contents.providerCatalog}\n${contents.providerRuntime}\n${contents.retailPrinterRegistry}\n${contents.retailPrinterContracts}\n${contents.retailPrinterAdapters}`, [
    "manual-vendor-handoff",
    "public-printer-pricing-research",
    "walgreens-live-order",
    "cvs-live-order",
    "fedex-live-print",
    "walmart-live-print",
    "staples-live-print",
    "office-depot-live-print",
    "RetailPrinterSourceLink",
    "sourceLinks",
    "retailPrinterRegistryProductLinks",
    "retailPrinterRegistryOperationKinds",
    "CRISPCARD",
    "JUNESW",
    "retailPrinterProductLinks",
    "getRetailPrinterProductLinkByProvider",
    "validateRetailPrinterProductUrl",
    "RetailPrinterVendorOperationPolicy",
    "retailPrinterVendorOperationPolicies",
    "getRetailPrinterOperationPolicy",
    "validateRetailPrinterOperationPolicy",
    "RetailPrinterProviderOperationEntrypoint",
    "providerEntrypoints",
    "providerEntrypoint",
    "validateRetailPrinterProviderEntrypoints",
    "RetailPrinterProviderOperationEvidence",
    "publicEvidence",
    "requiredOperatorProof",
    "couponCollectionPlan",
    "buildPrinterCouponCollectionPlan",
    "bestPriceRequiresProviderPortalEvidence",
    "public-product-price-review",
    "provider-project-preview-review",
    "provider-cart-final-review",
    "apply-during-price-collection",
    "final-cart-coupon-recheck",
    "RetailPrinterOperationRequestBlueprint",
    "createRetailPrinterOperationAdapter",
    "networkAttempted: false",
    "requestPrepared: false",
    "RetailPrinterOperationPacket",
    "operationPacket",
    "operationPolicy",
    "policyViolations",
    "RetailPrinterCertificationPacket",
    "certificationPacket",
    "buildRetailPrinterCertificationPackets",
    "certification-evidence-required",
    "canEnableLiveOperation: false",
    "operatorSteps",
    "safetyChecks",
    "sourceBackedFields",
    "missingInputFields",
    "future-certified-api-or-reviewed-browser-session",
    "raw relationship memories",
    "raw payment card data",
    "paymentAuthorizationReference",
    "Live vendor orders remain disabled"
  ]),
  checkIncludes("docs", "retail-readiness-docs", contents.docs, [
    "Retail fulfillment readiness",
    "`src/retailFulfillmentReadiness.ts`",
    "`npm run retail:doctor`",
    "not live retail ordering"
  ]),
  checkIncludes("docs", "retail-pricing-source-link-docs", contents.pricingDocs, [
    "Retail Adapter Source Links",
    "not the retail adapter source-link contract",
    "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
    "product=361-5x7-folded-card-blank-envelope",
    "selected_delivery_options=2",
    "https://www.office.fedex.com/default/greeting-cards-quick.html",
    "/default/greeting-cards-quick.html",
    "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery",
    "sku=CommerceProduct_26126",
    "designId=1f0682a2d34546bf86cbb799c3811d4e",
    "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery",
    "sku=CommerceProduct_33272",
    "designId=0c158c44e2f34d9fabc9e1b3ada2eaa6",
    "public page evidence",
    "required operator proof"
  ]),
  checkIncludes("ci", "retail-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"retail:doctor": "node scripts/retail-fulfillment-readiness-doctor.mjs"',
    "Validate retail fulfillment readiness",
    "npm run retail:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Retail partner certification",
    "Physical 5x7 sample set",
    "Wrong-store recovery drill",
    "Processor refund proof",
    "Sandbox live quote response"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-retail-fulfillment-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      liveVendorAdapterContracts: summary.liveVendorAdapterContracts,
      manualFallbacks: summary.manualFallbacks,
      recoveryDrillEvents: summary.recoveryDrillEvents,
      liveQuoteEnabled: summary.liveQuoteEnabled,
      directOrderEnabled: summary.directOrderEnabled,
      externalNetworkCalls: summary.externalNetworkCalls,
      realPaymentsEnabled: summary.realPaymentsEnabled,
      physicalCertificationAttached: summary.physicalCertificationAttached,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "vendorAdapterIds",
    "fallbackAdapterIds",
    "recoveryEventNames",
    "manualConfirmationRequired",
    "humanApprovalRequired",
    "liveQuoteEnabled",
    "directOrderEnabled",
    "externalNetworkCalls",
    "realPaymentsEnabled",
    "physicalCertificationAttached",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ];
  const missing = [];

  for (const item of items) {
    for (const key of requiredKeys) {
      if (!(key in item)) missing.push(`${item.id ?? "unknown"}.${key}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${items.length} executable retail fulfillment readiness item shapes.`
        : `Missing retail fulfillment readiness fields: ${missing.join(", ")}`
  };
}
