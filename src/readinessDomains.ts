import { aiProviderReadinessItems, summarizeAiProviderReadiness, validateAiProviderReadiness, type AiProviderReadinessItem, type AiProviderReadinessSummary } from "./aiProviderReadiness";
import { businessEngagementReadinessItems, summarizeBusinessEngagementReadiness, validateBusinessEngagementReadiness, type BusinessEngagementReadinessItem, type BusinessEngagementReadinessSummary } from "./businessEngagementReadiness";
import { capacityProfiles, summarizeCapacityPlan, validateCapacityProfiles, type CapacityPlanSummary, type CapacityProfile } from "./capacityPlan";
import { cloudArtifactProofReadinessItems, summarizeCloudArtifactProofReadiness, validateCloudArtifactProofReadiness, type CloudArtifactProofReadinessItem, type CloudArtifactProofReadinessSummary } from "./cloudArtifactProofReadiness";
import { e2eCoverageItems, summarizeE2eCoverage, validateE2eCoverage, type E2eCoverageItem, type E2eCoverageSummary } from "./e2eCoverage";
import { externalAuditReadinessItems, summarizeExternalAuditReadiness, validateExternalAuditReadiness, type ExternalAuditReadinessItem, type ExternalAuditReadinessSummary } from "./externalAuditReadiness";
import { hostedApiReadinessItems, summarizeHostedApiReadiness, validateHostedApiReadiness, type HostedApiReadinessItem, type HostedApiReadinessSummary } from "./hostedApiReadiness";
import { mobileRenderReadinessItems, summarizeMobileRenderReadiness, validateMobileRenderReadiness, type MobileRenderReadinessItem, type MobileRenderReadinessSummary } from "./mobileRenderReadiness";
import { observabilityReadinessItems, summarizeObservabilityReadiness, validateObservabilityReadiness, type ObservabilityReadinessItem, type ObservabilityReadinessSummary } from "./observabilityReadiness";
import { paymentReadinessItems, summarizePaymentReadiness, validatePaymentReadiness, type PaymentReadinessItem, type PaymentReadinessSummary } from "./paymentReadiness";
import { retailFulfillmentReadinessItems, summarizeRetailFulfillmentReadiness, validateRetailFulfillmentReadiness, type RetailFulfillmentReadinessItem, type RetailFulfillmentReadinessSummary } from "./retailFulfillmentReadiness";
import { reviewerDbSeedReadinessItems, summarizeReviewerDbSeedReadiness, validateReviewerDbSeedReadiness, type ReviewerDbSeedReadinessItem, type ReviewerDbSeedReadinessSummary } from "./reviewerDbSeedReadiness";

export type { AiProviderReadinessItem, AiProviderReadinessSummary } from "./aiProviderReadiness";
export type { BusinessEngagementReadinessItem, BusinessEngagementReadinessSummary } from "./businessEngagementReadiness";
export type { CapacityPlanSummary, CapacityProfile } from "./capacityPlan";
export type { CloudArtifactProofReadinessItem, CloudArtifactProofReadinessSummary } from "./cloudArtifactProofReadiness";
export type { E2eCoverageItem, E2eCoverageSummary } from "./e2eCoverage";
export type { ExternalAuditReadinessItem, ExternalAuditReadinessSummary } from "./externalAuditReadiness";
export type { HostedApiReadinessItem, HostedApiReadinessSummary } from "./hostedApiReadiness";
export type { MobileRenderReadinessItem, MobileRenderReadinessSummary } from "./mobileRenderReadiness";
export type { ObservabilityReadinessItem, ObservabilityReadinessSummary } from "./observabilityReadiness";
export type { PaymentReadinessItem, PaymentReadinessSummary } from "./paymentReadiness";
export type { RetailFulfillmentReadinessItem, RetailFulfillmentReadinessSummary } from "./retailFulfillmentReadiness";
export type { ReviewerDbSeedReadinessItem, ReviewerDbSeedReadinessSummary } from "./reviewerDbSeedReadiness";

type ReadinessPayloadKey = "items" | "profiles";

export interface ReadinessDomain<TItem, TSummary> {
  items: TItem[];
  summary: TSummary;
}

export interface CapacityReadinessDomain {
  profiles: CapacityProfile[];
  summary: CapacityPlanSummary;
}

export interface ReadinessSummary {
  aiProvider: ReadinessDomain<AiProviderReadinessItem, AiProviderReadinessSummary>;
  businessEngagement: ReadinessDomain<BusinessEngagementReadinessItem, BusinessEngagementReadinessSummary>;
  capacity: CapacityReadinessDomain;
  cloudArtifactProof: ReadinessDomain<CloudArtifactProofReadinessItem, CloudArtifactProofReadinessSummary>;
  e2eCoverage: ReadinessDomain<E2eCoverageItem, E2eCoverageSummary>;
  externalAudit: ReadinessDomain<ExternalAuditReadinessItem, ExternalAuditReadinessSummary>;
  hostedApi: ReadinessDomain<HostedApiReadinessItem, HostedApiReadinessSummary>;
  mobileRender: ReadinessDomain<MobileRenderReadinessItem, MobileRenderReadinessSummary>;
  observability: ReadinessDomain<ObservabilityReadinessItem, ObservabilityReadinessSummary>;
  payment: ReadinessDomain<PaymentReadinessItem, PaymentReadinessSummary>;
  retailFulfillment: ReadinessDomain<RetailFulfillmentReadinessItem, RetailFulfillmentReadinessSummary>;
  reviewerDbSeed: ReadinessDomain<ReviewerDbSeedReadinessItem, ReviewerDbSeedReadinessSummary>;
}

interface ReadinessDomainDefinition<TId extends keyof ReadinessSummary, TPayloadKey extends ReadinessPayloadKey, TPayload extends unknown[], TSummary> {
  id: TId;
  label: string;
  payloadKey: TPayloadKey;
  payload: TPayload;
  summarize: () => TSummary;
  validate: () => string[];
}

function defineReadinessDomain<TId extends keyof ReadinessSummary, TPayloadKey extends ReadinessPayloadKey, TPayload extends unknown[], TSummary>(
  definition: ReadinessDomainDefinition<TId, TPayloadKey, TPayload, TSummary>
): ReadinessDomainDefinition<TId, TPayloadKey, TPayload, TSummary> {
  return definition;
}

export const readinessDomainDefinitions = [
  defineReadinessDomain({
    id: "aiProvider",
    label: "AI provider readiness",
    payloadKey: "items",
    payload: aiProviderReadinessItems,
    summarize: () => summarizeAiProviderReadiness(),
    validate: () => validateAiProviderReadiness()
  }),
  defineReadinessDomain({
    id: "businessEngagement",
    label: "Business engagement readiness",
    payloadKey: "items",
    payload: businessEngagementReadinessItems,
    summarize: () => summarizeBusinessEngagementReadiness(),
    validate: () => validateBusinessEngagementReadiness()
  }),
  defineReadinessDomain({
    id: "capacity",
    label: "Capacity plan",
    payloadKey: "profiles",
    payload: capacityProfiles,
    summarize: () => summarizeCapacityPlan(),
    validate: () => validateCapacityProfiles()
  }),
  defineReadinessDomain({
    id: "cloudArtifactProof",
    label: "Cloud artifact proof readiness",
    payloadKey: "items",
    payload: cloudArtifactProofReadinessItems,
    summarize: () => summarizeCloudArtifactProofReadiness(),
    validate: () => validateCloudArtifactProofReadiness()
  }),
  defineReadinessDomain({
    id: "e2eCoverage",
    label: "E2E coverage",
    payloadKey: "items",
    payload: e2eCoverageItems,
    summarize: () => summarizeE2eCoverage(),
    validate: () => validateE2eCoverage()
  }),
  defineReadinessDomain({
    id: "externalAudit",
    label: "External audit readiness",
    payloadKey: "items",
    payload: externalAuditReadinessItems,
    summarize: () => summarizeExternalAuditReadiness(),
    validate: () => validateExternalAuditReadiness()
  }),
  defineReadinessDomain({
    id: "hostedApi",
    label: "Hosted API readiness",
    payloadKey: "items",
    payload: hostedApiReadinessItems,
    summarize: () => summarizeHostedApiReadiness(),
    validate: () => validateHostedApiReadiness()
  }),
  defineReadinessDomain({
    id: "mobileRender",
    label: "Mobile render readiness",
    payloadKey: "items",
    payload: mobileRenderReadinessItems,
    summarize: () => summarizeMobileRenderReadiness(),
    validate: () => validateMobileRenderReadiness()
  }),
  defineReadinessDomain({
    id: "observability",
    label: "Observability readiness",
    payloadKey: "items",
    payload: observabilityReadinessItems,
    summarize: () => summarizeObservabilityReadiness(),
    validate: () => validateObservabilityReadiness()
  }),
  defineReadinessDomain({
    id: "payment",
    label: "Payment readiness",
    payloadKey: "items",
    payload: paymentReadinessItems,
    summarize: () => summarizePaymentReadiness(),
    validate: () => validatePaymentReadiness()
  }),
  defineReadinessDomain({
    id: "retailFulfillment",
    label: "Retail fulfillment readiness",
    payloadKey: "items",
    payload: retailFulfillmentReadinessItems,
    summarize: () => summarizeRetailFulfillmentReadiness(),
    validate: () => validateRetailFulfillmentReadiness()
  }),
  defineReadinessDomain({
    id: "reviewerDbSeed",
    label: "Reviewer DB seed readiness",
    payloadKey: "items",
    payload: reviewerDbSeedReadinessItems,
    summarize: () => summarizeReviewerDbSeedReadiness(),
    validate: () => validateReviewerDbSeedReadiness()
  })
] as const;

export type ReadinessDomainId = (typeof readinessDomainDefinitions)[number]["id"];

export const readinessDomainIds: ReadinessDomainId[] = readinessDomainDefinitions.map((domain) => domain.id);

export function buildReadinessSummary(): ReadinessSummary {
  return Object.fromEntries(
    readinessDomainDefinitions.map((domain) => [
      domain.id,
      {
        [domain.payloadKey]: domain.payload,
        summary: domain.summarize()
      }
    ])
  ) as unknown as ReadinessSummary;
}

export function validateReadinessDomains(): string[] {
  return readinessDomainDefinitions.flatMap((domain) => domain.validate());
}
