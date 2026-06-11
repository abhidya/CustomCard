import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  validateAiProviderReadiness
} from "./aiProviderReadinessData.mjs";
import {
  businessEngagementReadinessItems,
  summarizeBusinessEngagementReadiness,
  validateBusinessEngagementReadiness
} from "./businessEngagementReadinessData.mjs";
import {
  capacityEvidenceThresholds,
  capacityProfiles,
  summarizeCapacityPlan,
  validateCapacityEvidenceThresholds,
  validateCapacityProfiles
} from "./capacityPlanData.mjs";
import {
  cloudArtifactProofReadinessItems,
  summarizeCloudArtifactProofReadiness,
  validateCloudArtifactProofReadiness
} from "./cloudArtifactProofReadinessData.mjs";
import { e2eCoverageItems, summarizeE2eCoverage, validateE2eCoverage } from "./e2eCoverageData.mjs";
import {
  externalAuditReadinessItems,
  summarizeExternalAuditReadiness,
  validateExternalAuditReadiness
} from "./externalAuditReadinessData.mjs";
import { hostedApiReadinessItems, summarizeHostedApiReadiness, validateHostedApiReadiness } from "./hostedApiReadinessData.mjs";
import {
  mobileRenderReadinessItems,
  summarizeMobileRenderReadiness,
  validateMobileRenderReadiness
} from "./mobileRenderReadinessData.mjs";
import {
  observabilityReadinessItems,
  summarizeObservabilityReadiness,
  validateObservabilityReadiness
} from "./observabilityReadinessData.mjs";
import { paymentReadinessItems, summarizePaymentReadiness, validatePaymentReadiness } from "./paymentReadinessData.mjs";
import {
  retailFulfillmentReadinessItems,
  summarizeRetailFulfillmentReadiness,
  validateRetailFulfillmentReadiness
} from "./retailFulfillmentReadinessData.mjs";
import {
  reviewerDbSeedReadinessItems,
  summarizeReviewerDbSeedReadiness,
  validateReviewerDbSeedReadiness
} from "./reviewerDbSeedReadinessData.mjs";

function domain({ id, label, payloadKey = "items", payload, summarize, validate }) {
  return { id, label, payloadKey, payload, summarize, validate };
}

export const readinessDomainDefinitions = [
  domain({
    id: "aiProvider",
    label: "AI provider readiness",
    payload: aiProviderReadinessItems,
    summarize: summarizeAiProviderReadiness,
    validate: validateAiProviderReadiness
  }),
  domain({
    id: "businessEngagement",
    label: "Business engagement readiness",
    payload: businessEngagementReadinessItems,
    summarize: summarizeBusinessEngagementReadiness,
    validate: validateBusinessEngagementReadiness
  }),
  domain({
    id: "capacity",
    label: "Capacity plan",
    payloadKey: "profiles",
    payload: capacityProfiles,
    summarize: summarizeCapacityPlan,
    validate: (profiles) => [
      ...validateCapacityProfiles(profiles),
      ...validateCapacityEvidenceThresholds(capacityEvidenceThresholds, profiles)
    ]
  }),
  domain({
    id: "cloudArtifactProof",
    label: "Cloud artifact proof readiness",
    payload: cloudArtifactProofReadinessItems,
    summarize: summarizeCloudArtifactProofReadiness,
    validate: validateCloudArtifactProofReadiness
  }),
  domain({
    id: "e2eCoverage",
    label: "E2E coverage",
    payload: e2eCoverageItems,
    summarize: summarizeE2eCoverage,
    validate: validateE2eCoverage
  }),
  domain({
    id: "externalAudit",
    label: "External audit readiness",
    payload: externalAuditReadinessItems,
    summarize: summarizeExternalAuditReadiness,
    validate: validateExternalAuditReadiness
  }),
  domain({
    id: "hostedApi",
    label: "Hosted API readiness",
    payload: hostedApiReadinessItems,
    summarize: summarizeHostedApiReadiness,
    validate: validateHostedApiReadiness
  }),
  domain({
    id: "mobileRender",
    label: "Mobile render readiness",
    payload: mobileRenderReadinessItems,
    summarize: summarizeMobileRenderReadiness,
    validate: validateMobileRenderReadiness
  }),
  domain({
    id: "observability",
    label: "Observability readiness",
    payload: observabilityReadinessItems,
    summarize: summarizeObservabilityReadiness,
    validate: validateObservabilityReadiness
  }),
  domain({
    id: "payment",
    label: "Payment readiness",
    payload: paymentReadinessItems,
    summarize: summarizePaymentReadiness,
    validate: validatePaymentReadiness
  }),
  domain({
    id: "retailFulfillment",
    label: "Retail fulfillment readiness",
    payload: retailFulfillmentReadinessItems,
    summarize: summarizeRetailFulfillmentReadiness,
    validate: validateRetailFulfillmentReadiness
  }),
  domain({
    id: "reviewerDbSeed",
    label: "Reviewer DB seed readiness",
    payload: reviewerDbSeedReadinessItems,
    summarize: summarizeReviewerDbSeedReadiness,
    validate: validateReviewerDbSeedReadiness
  })
];

export const readinessDomainIds = readinessDomainDefinitions.map((definition) => definition.id);

export function buildReadinessSummary() {
  return Object.fromEntries(
    readinessDomainDefinitions.map((definition) => [
      definition.id,
      {
        [definition.payloadKey]: definition.payload,
        summary: definition.summarize(definition.payload)
      }
    ])
  );
}

export function validateReadinessDomains() {
  return readinessDomainDefinitions.flatMap((definition) => definition.validate(definition.payload));
}
