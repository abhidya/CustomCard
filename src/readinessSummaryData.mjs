import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  validateAiProviderReadiness
} from "./aiProviderReadinessData.mjs";
import {
  aiQueueOperationsItems,
  summarizeAiQueueOperations,
  validateAiQueueOperations
} from "./aiQueueOperationsData.mjs";
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
import { legalComplianceItems, summarizeLegalComplianceReadiness, validateLegalComplianceReadiness } from "./legalComplianceData.mjs";
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

function domain({ id, label, payloadKey = "items", payload, summarize, validate, validateSummary = () => [] }) {
  return { id, label, payloadKey, payload, summarize, validate, validateSummary };
}

function minimum(summary, field, value, message) {
  return summary[field] < value ? [message] : [];
}

function zero(summary, field, message) {
  return summary[field] !== 0 ? [message] : [];
}

function equal(summary, field, value, message) {
  return summary[field] !== value ? [message] : [];
}

function noBlockers(summary, message) {
  return summary.blockers.length > 0 ? [message] : [];
}

export const readinessDomainDefinitions = [
  domain({
    id: "aiProvider",
    label: "AI provider readiness",
    payload: aiProviderReadinessItems,
    summarize: summarizeAiProviderReadiness,
    validate: validateAiProviderReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "AI provider readiness must track text/image launch evidence."),
      ...minimum(summary, "textProviderContracts", 16, "AI provider readiness must cover every text provider contract."),
      ...minimum(summary, "imageProviderContracts", 18, "AI provider readiness must cover every image provider contract."),
      ...equal(summary, "localFallbacks", 0, "AI provider readiness must not report fake local AI fallbacks."),
      ...minimum(summary, "promptAuditRequired", 6, "AI provider readiness must require prompt audits."),
      ...zero(summary, "liveProviderCallsEnabled", "AI provider readiness cannot enable live provider calls."),
      ...zero(summary, "externalNetworkCalls", "AI provider readiness cannot require live external network calls."),
      ...zero(summary, "productionTrafficEnabled", "AI provider readiness cannot enable production AI traffic."),
      ...noBlockers(summary, "AI provider readiness summary has blockers.")
    ]
  }),
  domain({
    id: "aiQueueOperations",
    label: "AI queue operations",
    payload: aiQueueOperationsItems,
    summarize: summarizeAiQueueOperations,
    validate: validateAiQueueOperations,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 7, "AI queue operations must track queue admission, worker, privacy, metrics, alerts, and human ops."),
      ...equal(summary, "repoLocalReady", summary.total, "Every AI queue operation control must be repo-local ready."),
      ...equal(summary, "productionReadyControls", summary.total, "Every AI queue operation control must be production ready."),
      ...minimum(summary, "metricsTracked", 5, "AI queue operations must track at least five production metrics."),
      ...minimum(summary, "alertThresholds", 5, "AI queue operations must define alert thresholds."),
      ...minimum(summary, "humanOwnedControls", 7, "AI queue operations must assign human owners."),
      ...minimum(summary, "deadLetterControls", 3, "AI queue operations must cover dead-letter management."),
      ...zero(summary, "externalNetworkCalls", "AI queue operations cannot require live external network calls."),
      ...zero(summary, "liveProviderCalls", "AI queue operations cannot enable live providers."),
      ...noBlockers(summary, "AI queue operations summary has blockers.")
    ]
  }),
  domain({
    id: "businessEngagement",
    label: "Business engagement readiness",
    payload: businessEngagementReadinessItems,
    summarize: summarizeBusinessEngagementReadiness,
    validate: validateBusinessEngagementReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Business engagement readiness must track CRM lifecycle campaign evidence."),
      ...minimum(summary, "crmAdapterContracts", 14, "Business engagement readiness must cover CSV plus popular CRM lifecycle adapters."),
      ...minimum(summary, "workflowAdapterContracts", 11, "Business engagement readiness must cover workflow payload adapters."),
      ...minimum(summary, "notificationAdapterContracts", 16, "Business engagement readiness must cover customer message channel adapters."),
      ...equal(summary, "lifecycleTriggerKinds", 3, "Business engagement readiness must cover birthday, purchase-anniversary, and warranty-anniversary triggers."),
      ...zero(summary, "liveMessagesEnabled", "Business engagement readiness cannot enable live customer messages."),
      ...zero(summary, "crmWritesEnabled", "Business engagement readiness cannot enable CRM writes."),
      ...zero(summary, "externalNetworkCalls", "Business engagement readiness cannot require live external network calls."),
      ...zero(summary, "realOrdersEnabled", "Business engagement readiness cannot enable real orders."),
      ...noBlockers(summary, "Business engagement readiness summary has blockers.")
    ]
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
    ],
    validateSummary: (summary) => [
      ...minimum(summary, "total", 4, "Capacity readiness must cover local, droplet, cloud-native, and SaaS profiles."),
      ...equal(summary, "localProfiles", 1, "Capacity readiness must keep exactly one local profile."),
      ...minimum(summary, "cloudProfiles", 3, "Capacity readiness must include cheap droplet, cloud-native, and SaaS profiles."),
      ...(summary.queueBackedProfiles !== summary.total ? ["Every capacity profile must be queue-backed."] : []),
      ...(summary.objectStoreBackedProfiles !== summary.total ? ["Every capacity profile must be object-store backed."] : []),
      ...zero(summary, "realOrdersEnabled", "Capacity readiness cannot enable real orders."),
      ...zero(summary, "liveProviderCalls", "Capacity readiness cannot enable live provider calls."),
      ...noBlockers(summary, "Capacity readiness summary has blockers.")
    ]
  }),
  domain({
    id: "cloudArtifactProof",
    label: "Cloud artifact proof readiness",
    payload: cloudArtifactProofReadinessItems,
    summarize: summarizeCloudArtifactProofReadiness,
    validate: validateCloudArtifactProofReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Cloud artifact proof readiness must track applied bucket and IAM proof evidence."),
      ...minimum(summary, "repoLocalReady", 2, "Cloud artifact proof readiness must keep static IaC and plan-review contracts ready."),
      ...minimum(summary, "appliedCloudRequired", 6, "Cloud artifact proof readiness must identify applied cloud proof requirements."),
      ...minimum(summary, "terraformFileContracts", 3, "Cloud artifact proof readiness must cover artifact-store Terraform files."),
      ...minimum(summary, "envOutputContracts", 6, "Cloud artifact proof readiness must track runtime object-store env outputs."),
      ...zero(summary, "terraformApplyExecutions", "Cloud artifact proof readiness cannot claim Terraform apply execution."),
      ...zero(summary, "appliedBucketArnProofs", "Cloud artifact proof readiness cannot claim applied bucket ARN proof."),
      ...zero(summary, "iamPolicyOutputProofs", "Cloud artifact proof readiness cannot claim IAM policy output proof."),
      ...zero(summary, "signedUrlProbeProofs", "Cloud artifact proof readiness cannot claim signed URL cloud probe proof."),
      ...zero(summary, "accessLogProofs", "Cloud artifact proof readiness cannot claim cloud access log proof."),
      ...zero(summary, "secretSyncProofs", "Cloud artifact proof readiness cannot claim secret manager sync proof."),
      ...zero(summary, "restoreDrillProofs", "Cloud artifact proof readiness cannot claim retention restore drill proof."),
      ...zero(summary, "externalNetworkCalls", "Cloud artifact proof readiness cannot require live external network calls."),
      ...zero(summary, "liveProviderCalls", "Cloud artifact proof readiness cannot enable live provider calls."),
      ...zero(summary, "realOrdersEnabled", "Cloud artifact proof readiness cannot enable real orders."),
      ...noBlockers(summary, "Cloud artifact proof readiness summary has blockers.")
    ]
  }),
  domain({
    id: "e2eCoverage",
    label: "E2E coverage",
    payload: e2eCoverageItems,
    summarize: summarizeE2eCoverage,
    validate: validateE2eCoverage,
    validateSummary: (summary) => [
      ...equal(summary, "repoLocalCoveragePercent", 100, "E2E coverage must cover every repo-local reviewer workflow."),
      ...(summary.ciGated !== summary.total ? ["Every E2E coverage item must be CI-gated."] : []),
      ...zero(summary, "liveProductionProofs", "E2E coverage cannot claim live production proof."),
      ...zero(summary, "realOrdersEnabled", "E2E coverage cannot enable real orders."),
      ...zero(summary, "externalNetworkCalls", "E2E coverage cannot require live external network calls."),
      ...noBlockers(summary, "E2E coverage summary has blockers.")
    ]
  }),
  domain({
    id: "externalAudit",
    label: "External audit readiness",
    payload: externalAuditReadinessItems,
    summarize: summarizeExternalAuditReadiness,
    validate: validateExternalAuditReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 15, "External audit readiness must track every external proof gap."),
      ...(summary.productionBlocked !== summary.total ? ["Every external audit readiness item must block production until evidence is attached."] : []),
      ...zero(summary, "publicClaimsAllowed", "External audit readiness cannot allow public production claims."),
      ...zero(summary, "externalArtifactsAttached", "External audit readiness cannot claim attached artifacts in the free local MVP."),
      ...(summary.blockers.length < summary.total ? ["External audit readiness must expose blockers for every evidence item."] : [])
    ]
  }),
  domain({
    id: "hostedApi",
    label: "Hosted API readiness",
    payload: hostedApiReadinessItems,
    summarize: summarizeHostedApiReadiness,
    validate: validateHostedApiReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Hosted API readiness must track Vercel and hosted DB proof evidence."),
      ...minimum(summary, "repoLocalReady", 2, "Hosted API readiness must keep deployment and serverless contracts ready."),
      ...minimum(summary, "hostedDbRequired", 5, "Hosted API readiness must identify hosted DB proof requirements."),
      ...minimum(summary, "publicRouteProofRequired", 3, "Hosted API readiness must identify public hosted route proof requirements."),
      ...minimum(summary, "requiredEnvVars", 6, "Hosted API readiness must track required hosted env vars."),
      ...minimum(summary, "liveProofAttached", 2, "Hosted API readiness must carry attached public Vercel and Postgres proof."),
      ...minimum(summary, "partialLiveProof", 1, "Hosted API readiness must expose partial public DB-backed route proof separately."),
      ...minimum(summary, "hostedDbProofs", 2, "Hosted API readiness must retain hosted Postgres proof evidence."),
      ...minimum(summary, "publicRouteProofs", 2, "Hosted API readiness must retain public route proof evidence."),
      ...minimum(summary, "deploymentProtectionBypasses", 1, "Hosted API readiness must retain deployment-protection public probe evidence."),
      ...zero(summary, "envSyncProofs", "Hosted API readiness cannot claim hosted env sync proof."),
      ...zero(summary, "hostedTokenVerificationProofs", "Hosted API readiness cannot claim hosted token verification proof."),
      ...zero(summary, "backupPolicies", "Hosted API readiness cannot claim hosted backup policy."),
      ...zero(summary, "externalNetworkCalls", "Hosted API readiness cannot require live external network calls."),
      ...zero(summary, "realOrdersEnabled", "Hosted API readiness cannot enable real orders."),
      ...zero(summary, "liveProviderCalls", "Hosted API readiness cannot enable live provider calls."),
      ...noBlockers(summary, "Hosted API readiness summary has blockers.")
    ]
  }),
  domain({
    id: "legalCompliance",
    label: "Legal compliance readiness",
    payload: legalComplianceItems,
    summarize: summarizeLegalComplianceReadiness,
    validate: validateLegalComplianceReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 12, "Legal compliance readiness must track EU and US launch requirements."),
      ...minimum(summary, "euRequirements", 6, "Legal compliance readiness must cover at least 6 EU requirements."),
      ...minimum(summary, "usRequirements", 6, "Legal compliance readiness must cover at least 6 US requirements."),
      ...(summary.externalReviewRequired !== summary.total ? ["Every legal compliance readiness item must require external review."] : []),
      ...(summary.launchBlocked !== summary.total ? ["Every legal compliance readiness item must block launch until evidence is attached."] : []),
      ...zero(summary, "publicClaimsAllowed", "Legal compliance readiness cannot allow public claims.")
    ]
  }),
  domain({
    id: "mobileRender",
    label: "Mobile render readiness",
    payload: mobileRenderReadinessItems,
    summarize: summarizeMobileRenderReadiness,
    validate: validateMobileRenderReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Mobile render readiness must track native render proof evidence."),
      ...minimum(summary, "repoLocalReady", 5, "Mobile render readiness must keep source-render contracts ready."),
      ...minimum(summary, "viewportProfiles", 4, "Mobile render readiness must cover small, standard, large, and tablet portrait viewports."),
      ...minimum(summary, "nativeBuildProfiles", 3, "Mobile render readiness must cover development, preview, and production native profiles."),
      ...minimum(summary, "emulatorSmokeEvidenceArtifacts", 9, "Mobile render readiness must retain the attached iOS simulator smoke, release, and viewport artifacts."),
      ...zero(summary, "emulatorRenderProofs", "Mobile render readiness cannot claim emulator render proof."),
      ...zero(summary, "signedArtifacts", "Mobile render readiness cannot claim signed native artifacts."),
      ...zero(summary, "externalNetworkCalls", "Mobile render readiness cannot require live external network calls."),
      ...zero(summary, "realOrdersEnabled", "Mobile render readiness cannot enable real orders."),
      ...zero(summary, "liveProviderCalls", "Mobile render readiness cannot enable live provider calls."),
      ...noBlockers(summary, "Mobile render readiness summary has blockers.")
    ]
  }),
  domain({
    id: "observability",
    label: "Observability readiness",
    payload: observabilityReadinessItems,
    summarize: summarizeObservabilityReadiness,
    validate: validateObservabilityReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 7, "Observability readiness must track telemetry and alerting evidence."),
      ...minimum(summary, "providerContracts", 6, "Observability readiness must cover all observability provider contracts."),
      ...minimum(summary, "alertRoutesRequired", 4, "Observability readiness must track alert route drills."),
      ...zero(summary, "liveIngestionEnabled", "Observability readiness cannot enable live ingestion."),
      ...zero(summary, "externalNetworkCalls", "Observability readiness cannot require live external network calls."),
      ...zero(summary, "productionAlertsEnabled", "Observability readiness cannot enable production alerts."),
      ...noBlockers(summary, "Observability readiness summary has blockers.")
    ]
  }),
  domain({
    id: "payment",
    label: "Payment readiness",
    payload: paymentReadinessItems,
    summarize: summarizePaymentReadiness,
    validate: validatePaymentReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Payment readiness must track live charge and refund launch evidence."),
      ...minimum(summary, "paymentProviderContracts", 4, "Payment readiness must cover every sandbox payment provider contract."),
      ...minimum(summary, "localFallbacks", 1, "Payment readiness must keep the no-payment fallback."),
      ...minimum(summary, "ledgerEvents", 20, "Payment readiness must track ledger, refund, webhook, and settlement events."),
      ...zero(summary, "liveChargesEnabled", "Payment readiness cannot enable live charges."),
      ...zero(summary, "liveRefundsEnabled", "Payment readiness cannot enable live refunds."),
      ...zero(summary, "liveCaptureEnabled", "Payment readiness cannot enable live captures."),
      ...zero(summary, "externalNetworkCalls", "Payment readiness cannot require live external network calls."),
      ...zero(summary, "cardDataStored", "Payment readiness cannot store card data."),
      ...zero(summary, "pciScopeApproved", "Payment readiness cannot claim PCI approval."),
      ...noBlockers(summary, "Payment readiness summary has blockers.")
    ]
  }),
  domain({
    id: "retailFulfillment",
    label: "Retail fulfillment readiness",
    payload: retailFulfillmentReadinessItems,
    summarize: summarizeRetailFulfillmentReadiness,
    validate: validateRetailFulfillmentReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Retail fulfillment readiness must track direct ordering launch evidence."),
      ...minimum(summary, "liveVendorAdapterContracts", 6, "Retail fulfillment readiness must cover every blocked live vendor adapter."),
      ...minimum(summary, "manualFallbacks", 2, "Retail fulfillment readiness must keep manual print and pricing fallbacks."),
      ...minimum(summary, "recoveryDrillEvents", 12, "Retail fulfillment readiness must track pickup, cancellation, refund, and print QA drills."),
      ...zero(summary, "liveQuoteEnabled", "Retail fulfillment readiness cannot enable live quotes."),
      ...zero(summary, "directOrderEnabled", "Retail fulfillment readiness cannot enable direct retail orders."),
      ...zero(summary, "externalNetworkCalls", "Retail fulfillment readiness cannot require live external network calls."),
      ...zero(summary, "realPaymentsEnabled", "Retail fulfillment readiness cannot enable real payment/refund traffic."),
      ...zero(summary, "physicalCertificationAttached", "Retail fulfillment readiness cannot claim physical print certification."),
      ...noBlockers(summary, "Retail fulfillment readiness summary has blockers.")
    ]
  }),
  domain({
    id: "reviewerDbSeed",
    label: "Reviewer DB seed readiness",
    payload: reviewerDbSeedReadinessItems,
    summarize: summarizeReviewerDbSeedReadiness,
    validate: validateReviewerDbSeedReadiness,
    validateSummary: (summary) => [
      ...minimum(summary, "total", 8, "Reviewer DB seed readiness must track hosted reviewer seed proof evidence."),
      ...minimum(summary, "repoLocalReady", 3, "Reviewer DB seed readiness must keep seed plan, token, and SQL preview contracts ready."),
      ...minimum(summary, "tableContracts", 14, "Reviewer DB seed readiness must cover all reviewer seed tables."),
      ...minimum(summary, "requiredEnvVars", 6, "Reviewer DB seed readiness must track required hosted env vars."),
      ...minimum(summary, "hostedDatabaseRequired", 5, "Reviewer DB seed readiness must identify hosted database proof requirements."),
      ...minimum(summary, "hostedSeedExecutionRequired", 3, "Reviewer DB seed readiness must identify hosted seed execution proof requirements."),
      ...minimum(summary, "hostedTokenProbeRequired", 4, "Reviewer DB seed readiness must identify hosted token probe requirements."),
      ...zero(summary, "hostedSeedProofs", "Reviewer DB seed readiness cannot claim hosted seed execution proof."),
      ...zero(summary, "hostedTokenProbeProofs", "Reviewer DB seed readiness cannot claim hosted token probe proof."),
      ...zero(summary, "vercelEnvSyncProofs", "Reviewer DB seed readiness cannot claim Vercel env sync proof."),
      ...zero(summary, "destructiveLiveMutations", "Reviewer DB seed readiness cannot enable destructive live mutations."),
      ...zero(summary, "externalNetworkCalls", "Reviewer DB seed readiness cannot require live external network calls."),
      ...zero(summary, "liveProviderCalls", "Reviewer DB seed readiness cannot enable live provider calls."),
      ...zero(summary, "realOrdersEnabled", "Reviewer DB seed readiness cannot enable real orders."),
      ...noBlockers(summary, "Reviewer DB seed readiness summary has blockers.")
    ]
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

export function validateReadinessSummary(summary = buildReadinessSummary()) {
  return readinessDomainDefinitions.flatMap((definition) => {
    const domainSummary = summary[definition.id]?.summary;
    if (!domainSummary) return [`Missing readiness summary domain: ${definition.id}.`];
    return definition.validateSummary(domainSummary);
  });
}
