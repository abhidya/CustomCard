import { describe, expect, it } from "vitest";
import {
  businessEngagementReadinessItems,
  summarizeBusinessEngagementReadiness,
  validateBusinessEngagementReadiness,
  type BusinessEngagementReadinessItem
} from "./businessEngagementReadiness";

describe("business engagement readiness", () => {
  it("tracks CRM lifecycle campaigns through customer outreach without claiming live sends", () => {
    const summary = summarizeBusinessEngagementReadiness();

    expect(validateBusinessEngagementReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 4,
      evidenceMissing: 3,
      approvalBlocked: 1,
      crmAdapterContracts: 7,
      workflowAdapterContracts: 8,
      notificationAdapterContracts: 10,
      lifecycleTriggerKinds: 3,
      liveOAuthRequired: 1,
      optInRequired: 8,
      suppressionReviewRequired: 8,
      humanReviewRequired: 8,
      liveSendProofRequired: 3,
      liveMessagesEnabled: 0,
      crmWritesEnabled: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Provider OAuth approval",
        "Marketing opt-in sample",
        "Template approval",
        "Delivered-message event sample"
      ])
    );
  });

  it("covers popular CRM, workflow, notification, and lifecycle trigger contracts explicitly", () => {
    const crmContracts = businessEngagementReadinessItems.find((item) => item.id === "popular-crm-oauth-contracts");
    const workflowContracts = businessEngagementReadinessItems.find((item) => item.id === "workflow-payload-contracts");
    const channelContracts = businessEngagementReadinessItems.find((item) => item.id === "customer-message-channel-contracts");
    const consentGate = businessEngagementReadinessItems.find((item) => item.id === "consent-suppression-privacy-gate");

    expect(crmContracts?.crmAdapterIds).toEqual(
      expect.arrayContaining([
        "salesforce-crm-lifecycle",
        "hubspot-crm-lifecycle",
        "zoho-crm-lifecycle",
        "pipedrive-crm-lifecycle",
        "dynamics-crm-lifecycle",
        "shopify-crm-lifecycle"
      ])
    );
    expect(workflowContracts?.workflowAdapterIds).toEqual(
      expect.arrayContaining([
        "zapier-webhook-workflow",
        "make-webhook-workflow",
        "slack-workflow-notification",
        "teams-workflow-notification",
        "notion-customer-database-sync",
        "airtable-customer-base-sync",
        "google-sheets-lifecycle-sync"
      ])
    );
    expect(channelContracts?.notificationAdapterIds).toEqual(
      expect.arrayContaining([
        "resend-email-notification",
        "sendgrid-email-notification",
        "twilio-sms-notification",
        "whatsapp-cloud-notification",
        "expo-push-notification",
        "firebase-cloud-messaging"
      ])
    );
    expect(consentGate).toMatchObject({
      status: "approval-blocked",
      lifecycleTriggers: expect.arrayContaining(["birthday", "purchase-anniversary", "warranty-anniversary"]),
      liveMessagesEnabled: false,
      crmWritesEnabled: false
    });
  });

  it("flags unsafe business engagement claims before admin or API readiness can expose them", () => {
    const unsafeItems: BusinessEngagementReadinessItem[] = [
      {
        ...businessEngagementReadinessItems[0],
        requiresCustomerOptIn: false,
        requiresSuppressionReview: false,
        requiresHumanReview: false,
        liveMessagesEnabled: true,
        crmWritesEnabled: true,
        externalNetworkCalls: true,
        realOrdersEnabled: true,
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as BusinessEngagementReadinessItem,
      {
        ...businessEngagementReadinessItems[0]
      }
    ];

    expect(validateBusinessEngagementReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate business engagement readiness item: crm-csv-lifecycle-source.",
        "Business engagement readiness item crm-csv-lifecycle-source must list current repo-local evidence.",
        "Business engagement readiness item crm-csv-lifecycle-source must list required production evidence.",
        "Business engagement readiness item crm-csv-lifecycle-source must explain its blocker.",
        "Business engagement readiness item crm-csv-lifecycle-source must require customer opt-in.",
        "Business engagement readiness item crm-csv-lifecycle-source must require suppression review.",
        "Business engagement readiness item crm-csv-lifecycle-source must require human review.",
        "Business engagement readiness item crm-csv-lifecycle-source must not enable live customer messages.",
        "Business engagement readiness item crm-csv-lifecycle-source must not enable CRM writes.",
        "Business engagement readiness item crm-csv-lifecycle-source must not require live external network calls.",
        "Business engagement readiness item crm-csv-lifecycle-source must keep realOrdersEnabled=false.",
        "Missing business engagement readiness item: customer-message-channel-contracts."
      ])
    );

    expect(
      validateBusinessEngagementReadiness([
        {
          ...businessEngagementReadinessItems.find((item) => item.id === "popular-crm-oauth-contracts")!,
          crmAdapterIds: ["salesforce-crm-lifecycle"],
          requiresLiveOAuth: false
        },
        {
          ...businessEngagementReadinessItems.find((item) => item.id === "workflow-payload-contracts")!,
          workflowAdapterIds: ["local-workflow-payload-export"]
        },
        {
          ...businessEngagementReadinessItems.find((item) => item.id === "customer-message-channel-contracts")!,
          notificationAdapterIds: ["browser-download-notification"],
          requiresLiveSendProof: false
        },
        {
          ...businessEngagementReadinessItems.find((item) => item.id === "consent-suppression-privacy-gate")!,
          status: "evidence-missing",
          crmAdapterIds: ["crm-csv-lifecycle-import"],
          workflowAdapterIds: ["local-workflow-payload-export"],
          notificationAdapterIds: ["browser-download-notification"]
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Popular CRM OAuth contracts must include adapter: hubspot-crm-lifecycle.",
        "Popular CRM OAuth contracts must require live OAuth evidence.",
        "Workflow payload contracts must include adapter: zapier-webhook-workflow.",
        "Customer message channel contracts must include adapter: resend-email-notification.",
        "Customer message channel contracts must require live send proof without claiming it.",
        "Consent suppression privacy gate must remain approval-blocked.",
        "Consent suppression privacy gate must include CRM adapter: salesforce-crm-lifecycle.",
        "Consent suppression privacy gate must include workflow adapter: zapier-webhook-workflow.",
        "Consent suppression privacy gate must include notification adapter: resend-email-notification."
      ])
    );
  });
});
