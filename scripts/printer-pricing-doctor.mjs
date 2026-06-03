import { readFileSync } from "node:fs";

const files = {
  pricing: "src/printerPricing.ts",
  pricingTest: "src/printerPricing.test.ts",
  app: "src/App.tsx",
  apiServer: "scripts/api-server.mjs",
  docs: "docs/printer-pricing-research.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const catalogBlock = contents.pricing.match(/export const printerPriceCatalog: PrinterPriceObservation\[] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
const observationCount = countMatches(catalogBlock, /\n\s+id: "/g);
const ruleCount = countMatches(contents.pricing, /noNetworkRuntime: true/g);
const manualConfirmationCount = countMatches(catalogBlock, /requiresManualConfirmation: true/g);
const liveQuoteFalseCount = countMatches(catalogBlock, /liveQuote: false/g);
const officialSourceCount = countMatches(contents.pricing, /url: "https:\/\//g);

const checks = [
  checkExact("catalog", "current-observation-count", observationCount, 12),
  checkMinimum("catalog", "official-source-count", officialSourceCount, 9),
  checkIncludes("catalog", "refreshed-official-price-signals", contents.pricing, [
    'observedAtIso = "2026-06-03T12:00:00.000Z"',
    'id: "walgreens-5x7-folded-card"',
    "unitPriceCents: 299",
    'id: "cvs-5x7-photo-card"',
    "unitPriceCents: 109",
    'id: "fedex-quick-5x7-single-sided-card"',
    "startingPackagePriceCents: 1399",
    'id: "staples-5x7-same-day-card-bundle"',
    "startingPackagePriceCents: 4999"
  ]),
  checkExact("safety", "manual-confirmation-count", manualConfirmationCount, observationCount),
  checkExact("safety", "live-quote-disabled-signals", liveQuoteFalseCount, observationCount),
  checkMinimum("collection", "no-network-collection-rules", ruleCount, 8),
  checkIncludes("collection", "blocked-live-quote-fields", contents.pricing, [
    '"tax"',
    '"coupon"',
    '"store stock"',
    '"pickup window"',
    '"live order placement"',
    "buildPrinterPricingRefreshReport",
    "canShowComparison"
  ]),
  checkIncludes("tests", "pricing-refresh-tests", contents.pricingTest, [
    "cvs-5x7-photo-card",
    "fedex-quick-5x7-single-sided-card",
    "subtotalCents: 4999",
    "marks stale public printer pricing before showing it as current"
  ]),
  checkIncludes("surfaces", "customer-pricing-surfaces", `${contents.app}\n${contents.apiServer}`, [
    "review-only public pricing",
    "knownPriceCount: 12",
    "refreshReport.totalObservations",
    "liveQuote: false"
  ]),
  checkIncludes("docs", "pricing-research-docs-current", contents.docs, [
    "Observed on: June 3, 2026.",
    "5x7 photo card",
    "$1.09 each",
    "Quick 5x7 single-sided greeting card",
    "$13.99 for 10",
    "$49.99 pre-tax base",
    "coupon prices excluded"
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
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-printer-pricing-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      observationCount,
      officialSourceCount,
      collectionRuleCount: ruleCount,
      manualConfirmationCount,
      liveQuote: false,
      liveOrdersEnabled: false,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function checkMinimum(lane, id, actual, minimum) {
  return {
    id,
    lane,
    passed: actual >= minimum,
    detail: actual >= minimum ? `${actual} is at least ${minimum}.` : `${actual} is below required minimum ${minimum}.`
  };
}

function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail: missing.length === 0 ? `Found ${required.length} required pricing signals.` : `Missing pricing signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? "No forbidden live pricing claims found." : `Forbidden live pricing claims present: ${present.join(", ")}`
  };
}
