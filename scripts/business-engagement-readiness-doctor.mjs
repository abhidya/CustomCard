import { readFileSync } from "node:fs";
import {
  businessEngagementReadinessItems,
  summarizeBusinessEngagementReadiness,
  validateBusinessEngagementReadiness
} from "../src/businessEngagementReadinessData.mjs";

const files = {
  readinessTest: "src/businessEngagementReadiness.test.ts",
  providerCatalog: "src/providerCatalog.ts",
  providerRuntime: "src/providerRuntime.ts",
  providerRuntimeTest: "src/providerRuntime.test.ts",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  adminApp: "src/App.tsx",
  e2eCoverage: "src/e2eCoverageData.mjs",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  readme: "README.md",
  platformDocs: "docs/platform-expansion-design.md",
  verificationDocs: "docs/verification.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeBusinessEngagementReadiness(businessEngagementReadinessItems);
const validationBlockers = validateBusinessEngagementReadiness(businessEngagementReadinessItems);
const itemIds = businessEngagementReadinessItems.map((item) => item.id);
const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "repo-local-ready-count", summary.repoLocalReady, 4),
  checkExact("register", "evidence-missing-count", summary.evidenceMissing, 3),
  checkExact("register", "approval-blocked-count", summary.approvalBlocked, 1),
  checkExact("register", "crm-adapter-contract-count", summary.crmAdapterContracts, 14),
  checkExact("register", "workflow-adapter-contract-count", summary.workflowAdapterContracts, 11),
  checkExact("register", "notification-adapter-contract-count", summary.notificationAdapterContracts, 16),
  checkExact("register", "lifecycle-trigger-kind-count", summary.lifecycleTriggerKinds, 3),
  checkExact("register", "live-oauth-required-count", summary.liveOAuthRequired, 1),
  checkExact("register", "opt-in-required-count", summary.optInRequired, 8),
  checkExact("register", "suppression-review-required-count", summary.suppressionReviewRequired, 8),
  checkExact("register", "human-review-required-count", summary.humanReviewRequired, 8),
  checkExact("register", "live-send-proof-required-count", summary.liveSendProofRequired, 3),
  checkExact("register", "no-live-messages", summary.liveMessagesEnabled, 0),
  checkExact("register", "no-crm-writes", summary.crmWritesEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-real-orders", summary.realOrdersEnabled, 0),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-business-engagement-readiness-ids", itemIds, [
    "crm-csv-lifecycle-source",
    "popular-crm-oauth-contracts",
    "lifecycle-trigger-normalization",
    "customer-card-opportunity-review",
    "workflow-payload-contracts",
    "customer-message-channel-contracts",
    "consent-suppression-privacy-gate",
    "campaign-analytics-feedback"
  ]),
  checkItemsShape("register", "business-engagement-readiness-item-shape", businessEngagementReadinessItems),
  checkIncludes("tests", "business-engagement-readiness-tests", contents.readinessTest, [
    "tracks CRM lifecycle campaigns through customer outreach without claiming live sends",
    "covers popular CRM, workflow, notification, and lifecycle trigger contracts explicitly",
    "flags unsafe business engagement claims"
  ]),
  checkIncludes("provider-catalog", "crm-workflow-notification-adapters", contents.providerCatalog, [
    "Business CRM CSV lifecycle import",
    "Salesforce CRM lifecycle sync",
    "HubSpot CRM lifecycle sync",
    "Shopify customer lifecycle sync",
    "Klaviyo profile lifecycle sync",
    "Mailchimp audience lifecycle sync",
    "ActiveCampaign contact lifecycle sync",
    "BigCommerce customer lifecycle sync",
    "WooCommerce customer lifecycle sync",
    "Square customer lifecycle sync",
    "Intercom contact lifecycle sync",
    "Zapier webhook workflow",
    "Google Sheets lifecycle sync",
    "n8n webhook workflow",
    "Workato webhook workflow",
    "Pipedream workflow trigger",
    "Resend email notification",
    "Twilio SMS notification",
    "WhatsApp Cloud notification",
    "Firebase Cloud Messaging",
    "Customer.io transactional notification",
    "Braze Canvas notification",
    "OneSignal message notification",
    "Courier send notification",
    "Knock workflow notification",
    "Novu trigger notification"
  ]),
  checkIncludes("provider-runtime", "no-network-runtime-contracts", `${contents.providerRuntime}\n${contents.providerRuntimeTest}`, [
    "buildCrmRuntime",
    "buildWorkflowIntegrationRuntime",
    "buildNotificationRuntime",
    "parseCrmLifecycleImport",
    "lifecycleTriggers",
    "live_workflow_send",
    "blocks CRM lifecycle sync when opt-in and review gates are absent",
    "builds redacted no-network notification request contracts"
  ]),
  checkIncludes("surfaces", "admin-api-business-engagement-surfaces", `${contents.adminApp}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Business engagement readiness",
    "summarizeBusinessEngagementReadiness",
    "businessEngagementReadiness",
    "liveMessagesEnabled",
    "crmWritesEnabled"
  ]),
  checkIncludes("e2e", "business-engagement-e2e-matrix", contents.e2eCoverage, [
    "business-engagement-readiness",
    "CRM lifecycle engagement readiness",
    "npm run business:engagement:doctor",
    "Live customer sends disabled"
  ]),
  checkIncludes("docs", "business-engagement-docs", `${contents.readme}\n${contents.platformDocs}\n${contents.verificationDocs}`, [
    "Business engagement readiness",
    "`src/businessEngagementReadiness.ts`",
    "`npm run business:engagement:doctor`",
    "not live CRM OAuth, customer messaging, CRM writeback, or production campaign analytics proof"
  ]),
  checkIncludes("ci", "business-engagement-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"business:engagement:doctor": "node scripts/business-engagement-readiness-doctor.mjs"',
    "Validate business engagement readiness",
    "npm run business:engagement:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Provider OAuth approval",
    "Marketing opt-in sample",
    "Template approval",
    "Delivered-message event sample"
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
      service: "customcard-business-engagement-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      repoLocalReady: summary.repoLocalReady,
      evidenceMissing: summary.evidenceMissing,
      approvalBlocked: summary.approvalBlocked,
      crmAdapterContracts: summary.crmAdapterContracts,
      workflowAdapterContracts: summary.workflowAdapterContracts,
      notificationAdapterContracts: summary.notificationAdapterContracts,
      lifecycleTriggerKinds: summary.lifecycleTriggerKinds,
      liveOAuthRequired: summary.liveOAuthRequired,
      optInRequired: summary.optInRequired,
      suppressionReviewRequired: summary.suppressionReviewRequired,
      humanReviewRequired: summary.humanReviewRequired,
      liveSendProofRequired: summary.liveSendProofRequired,
      liveMessagesEnabled: summary.liveMessagesEnabled,
      crmWritesEnabled: summary.crmWritesEnabled,
      externalNetworkCalls: summary.externalNetworkCalls,
      realOrdersEnabled: summary.realOrdersEnabled,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

function checkNoBlockers(lane, id, blockers) {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Executable business engagement readiness contract has no blockers." : blockers.join(" ")
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "crmAdapterIds",
    "workflowAdapterIds",
    "notificationAdapterIds",
    "lifecycleTriggers",
    "requiresLiveOAuth",
    "requiresCustomerOptIn",
    "requiresSuppressionReview",
    "requiresHumanReview",
    "requiresLiveSendProof",
    "liveMessagesEnabled",
    "crmWritesEnabled",
    "externalNetworkCalls",
    "realOrdersEnabled",
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
        ? `Validated ${items.length} executable business engagement readiness item shapes.`
        : `Missing business engagement readiness fields: ${missing.join(", ")}`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required business engagement readiness signals.`
        : `Missing business engagement readiness signals: ${missing.join(", ")}`
  };
}

function checkArrayIncludes(lane, id, values, required) {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required business engagement readiness signals.`
        : `Missing business engagement readiness signals: ${missing.join(", ")}`
  };
}
