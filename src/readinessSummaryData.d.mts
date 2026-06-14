import type { AiProviderReadinessItem, AiProviderReadinessSummary } from "./aiProviderReadinessData.mjs";
import type { AiQueueOperationsItem, AiQueueOperationsSummary } from "./aiQueueOperationsData.mjs";
import type {
  BusinessEngagementReadinessItem,
  BusinessEngagementReadinessSummary
} from "./businessEngagementReadinessData.mjs";
import type { CapacityPlanSummary, CapacityProfile } from "./capacityPlanData.mjs";
import type {
  CloudArtifactProofReadinessItem,
  CloudArtifactProofReadinessSummary
} from "./cloudArtifactProofReadinessData.mjs";
import type { E2eCoverageItem, E2eCoverageSummary } from "./e2eCoverageData.mjs";
import type { ExternalAuditReadinessItem, ExternalAuditReadinessSummary } from "./externalAuditReadinessData.mjs";
import type { HostedApiReadinessItem, HostedApiReadinessSummary } from "./hostedApiReadinessData.mjs";
import type { LegalComplianceItem, LegalComplianceSummary } from "./legalComplianceData.mjs";
import type { MobileRenderReadinessItem, MobileRenderReadinessSummary } from "./mobileRenderReadinessData.mjs";
import type { ObservabilityReadinessItem, ObservabilityReadinessSummary } from "./observabilityReadinessData.mjs";
import type { PaymentReadinessItem, PaymentReadinessSummary } from "./paymentReadinessData.mjs";
import type {
  RetailFulfillmentReadinessItem,
  RetailFulfillmentReadinessSummary
} from "./retailFulfillmentReadinessData.mjs";
import type {
  ReviewerDbSeedReadinessItem,
  ReviewerDbSeedReadinessSummary
} from "./reviewerDbSeedReadinessData.mjs";

export type ReadinessPayloadKey = "items" | "profiles";

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
  aiQueueOperations: ReadinessDomain<AiQueueOperationsItem, AiQueueOperationsSummary>;
  businessEngagement: ReadinessDomain<BusinessEngagementReadinessItem, BusinessEngagementReadinessSummary>;
  capacity: CapacityReadinessDomain;
  cloudArtifactProof: ReadinessDomain<CloudArtifactProofReadinessItem, CloudArtifactProofReadinessSummary>;
  e2eCoverage: ReadinessDomain<E2eCoverageItem, E2eCoverageSummary>;
  externalAudit: ReadinessDomain<ExternalAuditReadinessItem, ExternalAuditReadinessSummary>;
  hostedApi: ReadinessDomain<HostedApiReadinessItem, HostedApiReadinessSummary>;
  legalCompliance: ReadinessDomain<LegalComplianceItem, LegalComplianceSummary>;
  mobileRender: ReadinessDomain<MobileRenderReadinessItem, MobileRenderReadinessSummary>;
  observability: ReadinessDomain<ObservabilityReadinessItem, ObservabilityReadinessSummary>;
  payment: ReadinessDomain<PaymentReadinessItem, PaymentReadinessSummary>;
  retailFulfillment: ReadinessDomain<RetailFulfillmentReadinessItem, RetailFulfillmentReadinessSummary>;
  reviewerDbSeed: ReadinessDomain<ReviewerDbSeedReadinessItem, ReviewerDbSeedReadinessSummary>;
}

export type ReadinessDomainId = keyof ReadinessSummary;

export type ReadinessPayloadById = {
  aiProvider: AiProviderReadinessItem[];
  aiQueueOperations: AiQueueOperationsItem[];
  businessEngagement: BusinessEngagementReadinessItem[];
  capacity: CapacityProfile[];
  cloudArtifactProof: CloudArtifactProofReadinessItem[];
  e2eCoverage: E2eCoverageItem[];
  externalAudit: ExternalAuditReadinessItem[];
  hostedApi: HostedApiReadinessItem[];
  legalCompliance: LegalComplianceItem[];
  mobileRender: MobileRenderReadinessItem[];
  observability: ObservabilityReadinessItem[];
  payment: PaymentReadinessItem[];
  retailFulfillment: RetailFulfillmentReadinessItem[];
  reviewerDbSeed: ReviewerDbSeedReadinessItem[];
};

export interface ReadinessDomainDefinition<TId extends ReadinessDomainId = ReadinessDomainId> {
  id: TId;
  label: string;
  payloadKey: TId extends "capacity" ? "profiles" : "items";
  payload: ReadinessPayloadById[TId];
  summarize: (payload?: ReadinessPayloadById[TId]) => ReadinessSummary[TId]["summary"];
  validate: (payload?: ReadinessPayloadById[TId]) => string[];
  validateSummary: (summary: ReadinessSummary[TId]["summary"]) => string[];
}

export const readinessDomainDefinitions: readonly ReadinessDomainDefinition[];
export const readinessDomainIds: ReadinessDomainId[];
export function buildReadinessSummary(): ReadinessSummary;
export function validateReadinessDomains(): string[];
export function validateReadinessSummary(summary?: ReadinessSummary): string[];
