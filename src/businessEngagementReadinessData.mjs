const requiredBusinessEngagementIds = [
  "crm-csv-lifecycle-source",
  "popular-crm-oauth-contracts",
  "lifecycle-trigger-normalization",
  "customer-card-opportunity-review",
  "workflow-payload-contracts",
  "customer-message-channel-contracts",
  "consent-suppression-privacy-gate",
  "campaign-analytics-feedback"
];

const requiredCrmAdapterIds = [
  "crm-csv-lifecycle-import",
  "salesforce-crm-lifecycle",
  "hubspot-crm-lifecycle",
  "zoho-crm-lifecycle",
  "pipedrive-crm-lifecycle",
  "dynamics-crm-lifecycle",
  "shopify-crm-lifecycle"
];

const requiredWorkflowAdapterIds = [
  "local-workflow-payload-export",
  "zapier-webhook-workflow",
  "make-webhook-workflow",
  "slack-workflow-notification",
  "teams-workflow-notification",
  "notion-customer-database-sync",
  "airtable-customer-base-sync",
  "google-sheets-lifecycle-sync"
];

const requiredNotificationAdapterIds = [
  "browser-download-notification",
  "resend-email-notification",
  "sendgrid-email-notification",
  "postmark-email-notification",
  "mailgun-email-notification",
  "twilio-sms-notification",
  "whatsapp-cloud-notification",
  "expo-push-notification",
  "firebase-cloud-messaging",
  "transactional-email-contract"
];

const requiredLifecycleTriggers = ["birthday", "purchase-anniversary", "warranty-anniversary"];
const allowedStatuses = new Set(["repo-local-ready", "evidence-missing", "approval-blocked"]);

export const businessEngagementReadinessItems = [
  {
    id: "crm-csv-lifecycle-source",
    label: "CRM CSV lifecycle source",
    lane: "crm-source",
    status: "repo-local-ready",
    crmAdapterIds: ["crm-csv-lifecycle-import"],
    workflowAdapterIds: [],
    notificationAdapterIds: [],
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: false,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Business CRM CSV lifecycle import", "CRM parser detects birthday, purchase, and warranty fields"],
    requiredEvidence: ["Admin-approved CRM export", "Suppression list review", "Marketing opt-in sample"],
    blocker: "CSV import is local-ready; production use still needs business data-owner approval and suppression review."
  },
  {
    id: "popular-crm-oauth-contracts",
    label: "Popular CRM OAuth contracts",
    lane: "crm-oauth",
    status: "evidence-missing",
    crmAdapterIds: requiredCrmAdapterIds.filter((adapterId) => adapterId !== "crm-csv-lifecycle-import"),
    workflowAdapterIds: [],
    notificationAdapterIds: [],
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: true,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: false,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Salesforce, HubSpot, Zoho, Pipedrive, Dynamics, and Shopify request contracts"],
    requiredEvidence: ["Provider OAuth approval", "Revocation drill", "Tenant data mapping review", "Least-privilege scope screenshot"],
    blocker: "Live CRM OAuth credentials, tenant approvals, and revocation evidence are not attached."
  },
  {
    id: "lifecycle-trigger-normalization",
    label: "Lifecycle trigger normalization",
    lane: "campaign-logic",
    status: "repo-local-ready",
    crmAdapterIds: ["crm-csv-lifecycle-import"],
    workflowAdapterIds: ["local-workflow-payload-export"],
    notificationAdapterIds: [],
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: false,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["providerRuntime CRM lifecycle parser", "providerRuntime workflow payload exporter"],
    requiredEvidence: ["Business-specific field mapping", "Timezone policy", "Lifecycle date edge-case review"],
    blocker: "Repo-local parser exists; business-specific CRM field mapping must be approved before production sync."
  },
  {
    id: "customer-card-opportunity-review",
    label: "Customer card opportunity review",
    lane: "approval-queue",
    status: "repo-local-ready",
    crmAdapterIds: ["crm-csv-lifecycle-import"],
    workflowAdapterIds: ["local-workflow-payload-export"],
    notificationAdapterIds: ["browser-download-notification"],
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: false,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Admin panel integration list", "Card project and render-packet API contracts", "Browser status notification"],
    requiredEvidence: ["Admin campaign approval transcript", "Customer copy approval transcript", "No-contact rejection sample"],
    blocker: "Review queue is repo-local; customer-facing sends and print orders remain blocked until approval evidence exists."
  },
  {
    id: "workflow-payload-contracts",
    label: "Workflow payload contracts",
    lane: "workflow-routing",
    status: "repo-local-ready",
    crmAdapterIds: ["crm-csv-lifecycle-import"],
    workflowAdapterIds: requiredWorkflowAdapterIds,
    notificationAdapterIds: [],
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: false,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Local workflow payload export", "Zapier, Make, Slack, Teams, Notion, Airtable, and Sheets contracts"],
    requiredEvidence: ["Workflow owner approval", "Webhook signature proof", "Rate-limit drill", "Destination retention policy"],
    blocker: "Workflow payloads are prepared but no live workflow send or webhook delivery proof is attached."
  },
  {
    id: "customer-message-channel-contracts",
    label: "Customer message channel contracts",
    lane: "outreach-channels",
    status: "evidence-missing",
    crmAdapterIds: [],
    workflowAdapterIds: ["local-workflow-payload-export"],
    notificationAdapterIds: requiredNotificationAdapterIds,
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: true,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Browser status notification", "Email, SMS, WhatsApp, and push request contracts"],
    requiredEvidence: ["Sender-domain verification", "Opt-in proof sample", "Suppression replay", "Template approval", "Live send dry-run transcript"],
    blocker: "Email, SMS, WhatsApp, and push providers are request contracts only; no live customer send proof is attached."
  },
  {
    id: "consent-suppression-privacy-gate",
    label: "Consent suppression privacy gate",
    lane: "compliance",
    status: "approval-blocked",
    crmAdapterIds: requiredCrmAdapterIds,
    workflowAdapterIds: requiredWorkflowAdapterIds,
    notificationAdapterIds: requiredNotificationAdapterIds,
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: true,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Opt-in and suppression gates in provider runtime", "No raw CRM notes storage", "Data-request privacy contract"],
    requiredEvidence: ["Legal review", "Suppression-list replay transcript", "Data deletion workflow review", "Consent language approval"],
    blocker: "Lifecycle campaigns remain approval-blocked until legal/privacy consent, suppression, and data-rights evidence is attached."
  },
  {
    id: "campaign-analytics-feedback",
    label: "Campaign analytics feedback",
    lane: "feedback-loop",
    status: "evidence-missing",
    crmAdapterIds: [],
    workflowAdapterIds: ["local-workflow-payload-export"],
    notificationAdapterIds: ["browser-download-notification"],
    lifecycleTriggers: requiredLifecycleTriggers,
    requiresLiveOAuth: false,
    requiresCustomerOptIn: true,
    requiresSuppressionReview: true,
    requiresHumanReview: true,
    requiresLiveSendProof: true,
    liveMessagesEnabled: false,
    crmWritesEnabled: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Observability readiness contract", "Append-only audit contract", "Workflow payload metadata"],
    requiredEvidence: ["Delivered-message event sample", "Customer engagement metric sample", "CRM writeback approval", "Retention approval"],
    blocker: "No live delivery, engagement metric, CRM writeback, or retention approval evidence is attached."
  }
];

export function summarizeBusinessEngagementReadiness(items = businessEngagementReadinessItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
    approvalBlocked: items.filter((item) => item.status === "approval-blocked").length,
    crmAdapterContracts: new Set(items.flatMap((item) => item.crmAdapterIds)).size,
    workflowAdapterContracts: new Set(items.flatMap((item) => item.workflowAdapterIds)).size,
    notificationAdapterContracts: new Set(items.flatMap((item) => item.notificationAdapterIds)).size,
    lifecycleTriggerKinds: new Set(items.flatMap((item) => item.lifecycleTriggers)).size,
    liveOAuthRequired: items.filter((item) => item.requiresLiveOAuth).length,
    optInRequired: items.filter((item) => item.requiresCustomerOptIn).length,
    suppressionReviewRequired: items.filter((item) => item.requiresSuppressionReview).length,
    humanReviewRequired: items.filter((item) => item.requiresHumanReview).length,
    liveSendProofRequired: items.filter((item) => item.requiresLiveSendProof).length,
    liveMessagesEnabled: items.filter((item) => item.liveMessagesEnabled).length,
    crmWritesEnabled: items.filter((item) => item.crmWritesEnabled).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
    requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort(),
    blockers: validateBusinessEngagementReadiness(items)
  };
}

export function validateBusinessEngagementReadiness(items = businessEngagementReadinessItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate business engagement readiness item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (!allowedStatuses.has(item.status)) issues.push(`Business engagement readiness item ${item.id} has unsupported status.`);
    if (item.currentEvidence.length < 1) {
      issues.push(`Business engagement readiness item ${item.id} must list current repo-local evidence.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`Business engagement readiness item ${item.id} must list required production evidence.`);
    }
    if (!item.blocker) issues.push(`Business engagement readiness item ${item.id} must explain its blocker.`);
    for (const trigger of item.lifecycleTriggers) {
      if (!requiredLifecycleTriggers.includes(trigger)) {
        issues.push(`Business engagement readiness item ${item.id} has unsupported lifecycle trigger: ${trigger}.`);
      }
    }
    if (item.requiresCustomerOptIn !== true) {
      issues.push(`Business engagement readiness item ${item.id} must require customer opt-in.`);
    }
    if (item.requiresSuppressionReview !== true) {
      issues.push(`Business engagement readiness item ${item.id} must require suppression review.`);
    }
    if (item.requiresHumanReview !== true) {
      issues.push(`Business engagement readiness item ${item.id} must require human review.`);
    }
    if (item.liveMessagesEnabled !== false) {
      issues.push(`Business engagement readiness item ${item.id} must not enable live customer messages.`);
    }
    if (item.crmWritesEnabled !== false) {
      issues.push(`Business engagement readiness item ${item.id} must not enable CRM writes.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`Business engagement readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.realOrdersEnabled !== false) {
      issues.push(`Business engagement readiness item ${item.id} must keep realOrdersEnabled=false.`);
    }
  }

  for (const requiredId of requiredBusinessEngagementIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing business engagement readiness item: ${requiredId}.`);
  }

  const csvSource = itemsById.get("crm-csv-lifecycle-source");
  if (csvSource) {
    assertCovers(csvSource.lifecycleTriggers, requiredLifecycleTriggers, issues, "CRM CSV lifecycle source must include trigger");
    if (csvSource.requiresLiveOAuth !== false) issues.push("CRM CSV lifecycle source must not require live OAuth.");
  }

  const crmContracts = itemsById.get("popular-crm-oauth-contracts");
  if (crmContracts) {
    assertCovers(crmContracts.crmAdapterIds, requiredCrmAdapterIds.filter((id) => id !== "crm-csv-lifecycle-import"), issues, "Popular CRM OAuth contracts must include adapter");
    if (crmContracts.requiresLiveOAuth !== true) issues.push("Popular CRM OAuth contracts must require live OAuth evidence.");
  }

  const workflow = itemsById.get("workflow-payload-contracts");
  if (workflow) {
    assertCovers(workflow.workflowAdapterIds, requiredWorkflowAdapterIds, issues, "Workflow payload contracts must include adapter");
  }

  const channels = itemsById.get("customer-message-channel-contracts");
  if (channels) {
    assertCovers(channels.notificationAdapterIds, requiredNotificationAdapterIds, issues, "Customer message channel contracts must include adapter");
    if (channels.requiresLiveSendProof !== true) {
      issues.push("Customer message channel contracts must require live send proof without claiming it.");
    }
  }

  const consent = itemsById.get("consent-suppression-privacy-gate");
  if (consent) {
    if (consent.status !== "approval-blocked") issues.push("Consent suppression privacy gate must remain approval-blocked.");
    assertCovers(consent.crmAdapterIds, requiredCrmAdapterIds, issues, "Consent suppression privacy gate must include CRM adapter");
    assertCovers(consent.workflowAdapterIds, requiredWorkflowAdapterIds, issues, "Consent suppression privacy gate must include workflow adapter");
    assertCovers(consent.notificationAdapterIds, requiredNotificationAdapterIds, issues, "Consent suppression privacy gate must include notification adapter");
  }

  return issues;
}

function assertCovers(values, requiredValues, issues, label) {
  for (const value of requiredValues) {
    if (!values.includes(value)) issues.push(`${label}: ${value}.`);
  }
}
