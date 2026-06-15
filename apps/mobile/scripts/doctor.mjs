import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateMobileRuntimeEnv } from "../../../scripts/runtime-env-contract.mjs";

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envIssues = validateMobileRuntimeEnv(process.env);
const sourceIssues = inspectMobileSources();

if (envIssues.length > 0 || sourceIssues.length > 0) {
  for (const issue of envIssues) {
    console.error(issue);
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
      path: "App.tsx",
      patterns: ['export { default } from "./src/App";']
    },
    {
      path: "src/customerExperience.ts",
      patterns: [
        "requiredMobileCapabilities",
        "mobileAccountOptions",
        "mobileImportActions",
        "mobileExperienceSections",
        "mobileProofBoundary",
        "mobileCardQueueItems",
        "mobileApprovalActions",
        "mobileChatTranscript",
        "mobileRenderChoices",
        "mobilePricingPreviews",
        "mobileFulfillmentRecommendations",
        "mobileHandoffSteps",
        "mobileLocaleOptions",
        "mobileSyncState",
        "mobileRenderSnapshot",
        "MobileRenderAction",
        "buildMobileRenderSnapshot",
        "validateMobileRenderSnapshot",
        "summarizeMobileRenderSnapshot",
        "secondaryActions",
        "tappableActionCount",
        "disabledActionCount",
        "presentation",
        "disabled",
        "collectMobileCustomerCopy",
        "validateMobileExperience",
        "Confirm before checkout",
        "Cards to review",
        "Card actions",
        "Start with an event",
        "Card assistant",
        "Printing options",
        "Saved offline",
        "Finish at a print shop",
        "repo-local-contract",
        "native-emulator-render",
        "signed-native-artifact",
        "app-store-review",
        "live-retail-order",
        "secure Google Calendar connection is still pending",
        "Apple Calendar ICS export",
        "Review calendar options",
        "Email receipts later",
        "Import an invite",
        "Download print package",
        "Cheapest shipped option",
        "automatic orders stay off",
        "review-only-public-price",
        "customer-session",
        "ar-EG",
        "ur-PK"
      ]
    },
    {
      path: "src/App.tsx",
      patterns: [
        "mobileRenderSnapshot",
        "MobileRenderSection",
        "MobileRenderRow",
        "ActionSurface",
        "Pressable",
        "accessibilityRole",
        "NextActionSection",
        "StandardSection",
        "SectionRow",
        "footerSafetyMessages"
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
