import {
  businessEngagementReadinessItems,
  summarizeBusinessEngagementReadiness,
  validateBusinessEngagementReadiness
} from "../src/businessEngagementReadinessData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkItemsHaveKeys,
  checkNoBlockers,
  runDoctorReport
} from "./doctor-harness.mjs";
import {
  checkDoctorDocs,
  checkDoctorScriptedAndGated,
  checkDoctorSourceSignals,
  defineDoctorManifest,
  readDoctorManifestFiles
} from "./doctor-manifest.mjs";

const doctorManifest = defineDoctorManifest({
  id: "business-engagement",
  service: "customcard-business-engagement-readiness-doctor",
  npmScript: "business:engagement:doctor",
  scriptPath: "scripts/business-engagement-readiness-doctor.mjs",
  workflowLabel: "Validate business engagement readiness",
  docsTitle: "Business engagement readiness",
  readinessModule: "src/businessEngagementReadiness.ts",
  files: {
    readinessTest: "src/businessEngagementReadiness.test.ts",
    providerCatalog: "src/providerCatalog.ts",
    providerRuntime: "src/providerRuntime.ts",
    providerRuntimeTest: "src/providerRuntime.test.ts",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    adminApp: "src/App.tsx",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    e2eCoverage: "src/e2eCoverageData.mjs",
    readme: "README.md",
    platformDocs: "docs/platform-expansion-design.md",
    verificationDocs: "docs/verification.md"
  },
  docsKeys: ["readme", "platformDocs", "verificationDocs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

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
  checkItemsHaveKeys("register", "business-engagement-readiness-item-shape", businessEngagementReadinessItems, [
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
  ], {
    readyDetail: `Validated ${businessEngagementReadinessItems.length} executable business engagement readiness item shapes.`,
    missingPrefix: "Missing business engagement readiness fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "business-engagement-readiness-tests",
    sourceKeys: ["readinessTest"],
    signals: [
      "tracks CRM lifecycle campaigns through customer outreach without claiming live sends",
      "covers popular CRM, workflow, notification, and lifecycle trigger contracts explicitly",
      "flags unsafe business engagement claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "provider-catalog",
    id: "crm-workflow-notification-adapters",
    sourceKeys: ["providerCatalog"],
    signals: [
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
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "provider-runtime",
    id: "no-network-runtime-contracts",
    sourceKeys: ["providerRuntime", "providerRuntimeTest"],
    signals: [
      "buildCrmRuntime",
      "buildWorkflowIntegrationRuntime",
      "buildNotificationRuntime",
      "parseCrmLifecycleImport",
      "requires explicit source text for local import and workflow export adapters",
      "Missing required source text for local import/export.",
      "lifecycleTriggers",
      "live_workflow_send",
      "blocks CRM lifecycle sync when opt-in and review gates are absent",
      "builds redacted live-network notification request contracts"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-business-engagement-surfaces",
    sourceKeys: ["adminApp", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "Business engagement readiness",
      "summarizeBusinessEngagementReadiness",
      "businessEngagementReadiness",
      "liveMessagesEnabled",
      "crmWritesEnabled"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "e2e",
    id: "business-engagement-e2e-matrix",
    sourceKeys: ["e2eCoverage"],
    signals: [
      "business-engagement-readiness",
      "CRM lifecycle engagement readiness",
      "npm run business:engagement:doctor",
      "Live customer sends disabled"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, [
    "not live CRM OAuth, customer messaging, CRM writeback, or production campaign analytics proof"
  ], { id: "business-engagement-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "business-engagement-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Provider OAuth approval",
    "Marketing opt-in sample",
    "Template approval",
    "Delivered-message event sample"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
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
  realOrdersEnabled: summary.realOrdersEnabled
}, checks);
