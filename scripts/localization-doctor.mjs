import { readFileSync } from "node:fs";
import { checkAbsent, checkExact, checkIncludes, checkMinimum } from "./doctor-harness.mjs";

const files = {
  localization: "src/localization.ts",
  localizationTest: "src/localization.test.ts",
  app: "src/App.tsx",
  webappStudio: "webapp/views/StudioView.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  apiRouteFamilies: "scripts/api-route-families.mjs",
  mobileExperience: "apps/mobile/src/customerExperience.ts",
  mobileApp: "apps/mobile/src/App.tsx",
  mobileDoctor: "apps/mobile/scripts/doctor.mjs",
  packageJson: "package.json",
  viteConfig: "vite.config.ts",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const localeCount = countMatches(contents.localization, /\n\s+locale: "/g);
const rtlCount = countMatches(contents.localization, /writingDirection: "rtl"/g);
const reviewRequiredCount = countMatches(contents.localization, /reviewState: "human-review-required"/g);
const mobileLocaleBlock = contents.mobileExperience.match(/export const mobileLocaleOptions: MobileLocaleOption\[] = \[([\s\S]*?)\n\];/)?.[1] ?? "";
const mobileLocaleCount = countMatches(mobileLocaleBlock, /\n\s+locale: "/g);

const checks = [
  checkExact("catalog", "launch-locale-count", localeCount, 4),
  checkExact("catalog", "rtl-locale-count", rtlCount, 2),
  checkMinimum("catalog", "copy-review-required-locales", reviewRequiredCount, 3),
  checkIncludes("catalog", "required-locale-codes", contents.localization, [
    'defaultLocale: SupportedLocaleCode = "en-US"',
    'locale: "en-US"',
    'locale: "es-US"',
    'locale: "ur-PK"',
    'locale: "ar-EG"',
    "summarizeLocalizationReadiness",
    "validateLocalizationReadiness",
    "liveTranslationProvider: false"
  ]),
  checkIncludes("tests", "localization-contract-tests", contents.localizationTest, [
    "covers launch locales",
    "translates shell labels",
    "reports missing bundles",
    "Unsafe localization claim"
  ]),
  checkIncludes("surfaces", "web-and-api-localization-surfaces", `${contents.app}\n${contents.webappStudio}\n${contents.apiContracts}\n${contents.apiServer}\n${contents.apiRouteFamilies}`, [
    "safeContractLanguage",
    "Locale readiness",
    "summarizeLocalizationReadiness",
    "localization: readiness.localization",
    "Localization cannot require a live translation provider"
  ]),
  checkExact("mobile", "mobile-locale-count", mobileLocaleCount, 4),
  checkIncludes("mobile", "mobile-localization-parity", `${contents.mobileExperience}\n${contents.mobileApp}\n${contents.mobileDoctor}`, [
    "mobileLocaleOptions",
    "cardLanguage",
    "copyReviewRequired",
    "writingDirection",
    "Missing mobile locale option",
    "RTL mobile locale options must require copy review",
    "ar-EG",
    "ur-PK"
  ]),
  checkIncludes("ci", "localization-doctor-is-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}\n${contents.viteConfig}`, [
    '"localization:doctor": "node scripts/localization-doctor.mjs"',
    "Validate localization readiness",
    "npm run localization:doctor",
    "src/localization.ts"
  ]),
  checkAbsent("safety", "no-live-localization-provider", `${contents.localization}\n${contents.apiServer}\n${contents.apiRouteFamilies}\n${contents.mobileExperience}`, [
    "liveTranslationProvider: true"
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
      service: "customcard-localization-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      localeCount,
      rtlCount,
      reviewRequiredCount,
      mobileLocaleCount,
      liveTranslationProvider: false,
      realOrdersEnabled: false,
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
