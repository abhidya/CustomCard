import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const required = ["CUSTOMCARD_API_BASE_URL"];
const missing = required.filter((key) => !process.env[key]);
const sourceIssues = inspectMobileSources();

if (missing.length > 0 || sourceIssues.length > 0) {
  if (missing.length > 0) {
    console.error(`Mobile shell missing env: ${missing.join(", ")}`);
  }
  for (const issue of sourceIssues) {
    console.error(issue);
  }
  process.exitCode = 1;
} else {
  const appConfigModule = await import("../app.config.js");
  const configFactory = appConfigModule.default;
  const config = configFactory();

  if (config.expo.extra.apiBaseUrl.includes("${")) {
    console.error("Mobile shell resolved a literal environment placeholder.");
    process.exitCode = 1;
  } else if (config.expo.extra.realOrderKillSwitch !== "disabled") {
    console.error("Mobile shell real order kill switch must resolve to disabled for repo-local validation.");
    process.exitCode = 1;
  } else {
    console.log("CustomCard mobile shell configuration and customer experience contract are present.");
  }
}

function inspectMobileSources() {
  const checks = [
    {
      path: "src/customerExperience.ts",
      patterns: [
        "requiredMobileCapabilities",
        "mobileAccountOptions",
        "mobileImportActions",
        "mobileExperienceSections",
        "mobileCardQueueItems",
        "mobileApprovalActions",
        "mobileChatTranscript",
        "mobileRenderChoices",
        "mobilePricingPreviews",
        "mobileFulfillmentRecommendations",
        "mobileHandoffSteps",
        "mobileLocaleOptions",
        "mobileSyncState",
        "validateMobileExperience",
        "Confirm before checkout",
        "Continue with Google",
        "Continue with Apple",
        "Import calendar",
        "Scan email receipts",
        "Cheapest shipped option",
        "Live AI and automatic orders stay off",
        "review-only-public-price",
        "customer-session",
        "ar-EG",
        "ur-PK"
      ]
    },
    {
      path: "src/App.tsx",
      patterns: [
        "mobileExperienceSections",
        "mobileAccountOptions",
        "mobileImportActions",
        "mobileCardQueueItems",
        "mobileApprovalActions",
        "mobileChatTranscript",
        "mobileRenderChoices",
        "mobileFulfillmentRecommendations",
        "mobileHandoffSteps",
        "mobileLocaleOptions",
        "mobileSyncState",
        "Card queue",
        "Approval controls",
        "Sign in and import",
        "Best available options",
        "Offline sync",
        "Locale readiness",
        "summarizeMobileExperience"
      ]
    }
  ];
  const issues = [];

  for (const check of checks) {
    const source = readFileSync(resolve(mobileRoot, check.path), "utf8");
    for (const pattern of check.patterns) {
      if (!source.includes(pattern)) {
        issues.push(`Mobile shell missing source signal ${pattern} in ${check.path}`);
      }
    }
  }

  return issues;
}
