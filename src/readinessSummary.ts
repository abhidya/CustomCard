import { aiProviderReadinessItems, summarizeAiProviderReadiness, type AiProviderReadinessItem, type AiProviderReadinessSummary } from "./aiProviderReadiness";
import { businessEngagementReadinessItems, summarizeBusinessEngagementReadiness, type BusinessEngagementReadinessItem, type BusinessEngagementReadinessSummary } from "./businessEngagementReadiness";
import { capacityProfiles, summarizeCapacityPlan, type CapacityPlanSummary, type CapacityProfile } from "./capacityPlan";
import { cloudArtifactProofReadinessItems, summarizeCloudArtifactProofReadiness, type CloudArtifactProofReadinessItem, type CloudArtifactProofReadinessSummary } from "./cloudArtifactProofReadiness";
import { e2eCoverageItems, summarizeE2eCoverage, type E2eCoverageItem, type E2eCoverageSummary } from "./e2eCoverage";
import { externalAuditReadinessItems, summarizeExternalAuditReadiness, type ExternalAuditReadinessItem, type ExternalAuditReadinessSummary } from "./externalAuditReadiness";
import { hostedApiReadinessItems, summarizeHostedApiReadiness, type HostedApiReadinessItem, type HostedApiReadinessSummary } from "./hostedApiReadiness";
import { mobileRenderReadinessItems, summarizeMobileRenderReadiness, type MobileRenderReadinessItem, type MobileRenderReadinessSummary } from "./mobileRenderReadiness";
import { observabilityReadinessItems, summarizeObservabilityReadiness, type ObservabilityReadinessItem, type ObservabilityReadinessSummary } from "./observabilityReadiness";
import { paymentReadinessItems, summarizePaymentReadiness, type PaymentReadinessItem, type PaymentReadinessSummary } from "./paymentReadiness";
import { retailFulfillmentReadinessItems, summarizeRetailFulfillmentReadiness, type RetailFulfillmentReadinessItem, type RetailFulfillmentReadinessSummary } from "./retailFulfillmentReadiness";
import { reviewerDbSeedReadinessItems, summarizeReviewerDbSeedReadiness, type ReviewerDbSeedReadinessItem, type ReviewerDbSeedReadinessSummary } from "./reviewerDbSeedReadiness";

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

export interface ReadinessDomain<TItem, TSummary> {
  items: TItem[];
  summary: TSummary;
}

export interface ReadinessSummary {
  aiProvider: ReadinessDomain<AiProviderReadinessItem, AiProviderReadinessSummary>;
  businessEngagement: ReadinessDomain<BusinessEngagementReadinessItem, BusinessEngagementReadinessSummary>;
  capacity: { profiles: CapacityProfile[]; summary: CapacityPlanSummary };
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

export function buildReadinessSummary(): ReadinessSummary {
  return {
    aiProvider: { items: aiProviderReadinessItems, summary: summarizeAiProviderReadiness() },
    businessEngagement: { items: businessEngagementReadinessItems, summary: summarizeBusinessEngagementReadiness() },
    capacity: { profiles: capacityProfiles, summary: summarizeCapacityPlan() },
    cloudArtifactProof: { items: cloudArtifactProofReadinessItems, summary: summarizeCloudArtifactProofReadiness() },
    e2eCoverage: { items: e2eCoverageItems, summary: summarizeE2eCoverage() },
    externalAudit: { items: externalAuditReadinessItems, summary: summarizeExternalAuditReadiness() },
    hostedApi: { items: hostedApiReadinessItems, summary: summarizeHostedApiReadiness() },
    mobileRender: { items: mobileRenderReadinessItems, summary: summarizeMobileRenderReadiness() },
    observability: { items: observabilityReadinessItems, summary: summarizeObservabilityReadiness() },
    payment: { items: paymentReadinessItems, summary: summarizePaymentReadiness() },
    retailFulfillment: { items: retailFulfillmentReadinessItems, summary: summarizeRetailFulfillmentReadiness() },
    reviewerDbSeed: { items: reviewerDbSeedReadinessItems, summary: summarizeReviewerDbSeedReadiness() }
  };
}
