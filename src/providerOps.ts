import { adapterMissingEnv, type AiFlowConfigSummary } from "./aiFlowConfig";
import {
  capabilityLabels,
  providerCatalog,
  type AdminPanelModel,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderStatus
} from "./providerCatalog";
import type { ProviderGovernancePolicy, ProviderGovernanceSummary } from "./providerGovernance";
import type { RuntimeReadiness } from "./providerRuntime";
import type { ReadinessSummary } from "./readinessSummary";

export type ProviderOpsAvailability = "ready-local" | "env-configured" | "env-missing" | "contract-only" | "blocked";
export type ProviderOpsLiveGate = "local-ready" | "live-ready" | "feature-gated" | "env-missing" | "contract-only" | "blocked";

export interface ProviderOpsProvider {
  adapterId: string;
  label: string;
  provider: string;
  capability: ProviderCapability;
  capabilityLabel: string;
  status: ProviderStatus;
  availability: ProviderOpsAvailability;
  liveGate: ProviderOpsLiveGate;
  selectedForFlow: boolean;
  missingEnv: string[];
  blockedReasons: string[];
  fallbackAdapterId: string;
  queueRequired: boolean;
  rateLimitPerMinute: number;
  monthlyBudgetCents: number;
  perRequestBudgetCents: number;
  latencyGateRequired: boolean;
  latencyGateSatisfied: boolean;
}

export interface ProviderOpsEnvSummary {
  configuredProviders: string[];
  selectedProviders: string[];
  requiredForSelectedProviders: string[];
  missingForSelectedProviders: string[];
}

export interface ProviderOpsFallbackQueue {
  id: string;
  label: string;
  primaryAdapterId: string;
  fallbackAdapterId: string;
  queueEnabled: boolean;
  fallbackQueueEnabled: boolean;
  readyForLiveCalls: boolean;
  blockedReasons: string[];
}

export interface ProviderOpsLimitsSummary {
  budgetCapped: number;
  rateLimited: number;
  queueRequired: number;
  monthlyBudgetCents: number;
  maxPerRequestBudgetCents: number;
  maxRateLimitPerMinute: number;
}

export interface ProviderOpsOrrSummary {
  latencyGateRequired: number;
  latencyGateSatisfied: number;
  alertRoutesRequired: number;
  unsampledCriticalEvents: number;
  maxRetentionDays: number;
  liveIngestionEnabled: number;
  productionAlertsEnabled: number;
}

export interface ProviderOpsUserSummary {
  adminTokenProofs: number;
  customerTokenProofs: number;
  hostedSeedProofs: number;
  optInGates: number;
  liveMessagesEnabled: number;
  crmWritesEnabled: number;
  userManagementRequiredEnv: string[];
}

export interface ProviderOpsSummary {
  totalProviders: number;
  availableProviders: number;
  envConfiguredProviders: number;
  selectedProviders: number;
  readyForLiveCalls: number;
  liveReadyProviders: number;
  liveGatedProviders: number;
  fallbackQueues: number;
  missingSelectedEnv: number;
}

export interface ProviderOpsModel {
  summary: ProviderOpsSummary;
  providers: ProviderOpsProvider[];
  availableProviders: ProviderOpsProvider[];
  selectedProviders: ProviderOpsProvider[];
  fallbackQueues: ProviderOpsFallbackQueue[];
  env: ProviderOpsEnvSummary;
  limits: ProviderOpsLimitsSummary;
  orr: ProviderOpsOrrSummary;
  users: ProviderOpsUserSummary;
  blockers: string[];
}

export interface ProviderOpsModelInput {
  model: AdminPanelModel;
  providerGovernance: ProviderGovernanceSummary;
  runtimeReadiness: Map<string, RuntimeReadiness>;
  aiFlowSummary: AiFlowConfigSummary;
  readiness: ReadinessSummary;
  adapters?: ProviderAdapter[];
  env?: Record<string, string | undefined>;
}

export function buildProviderOpsModel(input: ProviderOpsModelInput): ProviderOpsModel {
  const adapters = input.adapters ?? providerCatalog;
  const selectedAdapterIds = selectedProviderAdapterIds(input.aiFlowSummary);
  const policyByAdapter = new Map(input.providerGovernance.policies.map((policy) => [policy.adapterId, policy]));
  const aiConfiguredProviderIds = new Set(input.aiFlowSummary.configuredProviders);
  const providers = adapters.map((adapter) =>
    buildProviderOpsProvider({
      adapter,
      policy: policyByAdapter.get(adapter.id),
      readiness: input.runtimeReadiness.get(adapter.id),
      selectedForFlow: selectedAdapterIds.has(adapter.id),
      aiConfigured: aiConfiguredProviderIds.has(adapter.id),
      aiMissingEnv: adapterMissingEnv(adapter.id, input.env ?? {})
    })
  );
  const availableProviders = providers.filter((provider) =>
    provider.availability === "ready-local" || provider.availability === "env-configured"
  );
  const selectedProviders = providers.filter((provider) => provider.selectedForFlow);
  const fallbackQueues = input.aiFlowSummary.flows.map((flow) => ({
    id: flow.flowId,
    label: flow.label,
    primaryAdapterId: flow.primaryAdapterId,
    fallbackAdapterId: flow.fallbackAdapterId,
    queueEnabled: flow.queueEnabled,
    fallbackQueueEnabled: flow.fallbackQueueEnabled,
    readyForLiveCalls: flow.readyForLiveCalls,
    blockedReasons: flow.blockedReasons
  }));
  const env = buildProviderOpsEnvSummary(selectedProviders, availableProviders, fallbackQueues);
  const model: ProviderOpsModel = {
    summary: {
      totalProviders: providers.length,
      availableProviders: availableProviders.length,
      envConfiguredProviders: providers.filter((provider) => provider.availability === "env-configured").length,
      selectedProviders: selectedProviders.length,
      readyForLiveCalls: input.aiFlowSummary.readyForLiveCalls,
      liveReadyProviders: providers.filter((provider) => provider.liveGate === "live-ready").length,
      liveGatedProviders: providers.filter((provider) => provider.liveGate === "feature-gated").length,
      fallbackQueues: fallbackQueues.filter((queue) => queue.fallbackQueueEnabled).length,
      missingSelectedEnv: env.missingForSelectedProviders.length
    },
    providers,
    availableProviders,
    selectedProviders,
    fallbackQueues,
    env,
    limits: {
      budgetCapped: input.providerGovernance.budgetCapped,
      rateLimited: input.providerGovernance.rateLimited,
      queueRequired: input.providerGovernance.queueRequired,
      monthlyBudgetCents: input.providerGovernance.monthlyBudgetCents,
      maxPerRequestBudgetCents: input.providerGovernance.maxPerRequestBudgetCents,
      maxRateLimitPerMinute: Math.max(...input.providerGovernance.policies.map((policy) => policy.rateLimitPerMinute), 0)
    },
    orr: {
      latencyGateRequired: providers.filter((provider) => provider.latencyGateRequired).length,
      latencyGateSatisfied: providers.filter((provider) => provider.latencyGateSatisfied).length,
      alertRoutesRequired: input.readiness.observability.summary.alertRoutesRequired,
      unsampledCriticalEvents: input.readiness.observability.summary.unsampledCriticalEvents,
      maxRetentionDays: input.readiness.observability.summary.maxRetentionDays,
      liveIngestionEnabled: input.readiness.observability.summary.liveIngestionEnabled,
      productionAlertsEnabled: input.readiness.observability.summary.productionAlertsEnabled
    },
    users: {
      adminTokenProofs: input.readiness.hostedApi.summary.hostedTokenVerificationProofs,
      customerTokenProofs: input.readiness.reviewerDbSeed.summary.hostedTokenProbeProofs,
      hostedSeedProofs: input.readiness.reviewerDbSeed.summary.hostedSeedProofs,
      optInGates: input.readiness.businessEngagement.summary.optInRequired,
      liveMessagesEnabled: input.readiness.businessEngagement.summary.liveMessagesEnabled,
      crmWritesEnabled: input.readiness.businessEngagement.summary.crmWritesEnabled,
      userManagementRequiredEnv: buildUserManagementRequiredEnv(input.model)
    },
    blockers: []
  };

  return { ...model, blockers: validateProviderOpsModel(model) };
}

export function validateProviderOpsModel(model: ProviderOpsModel): string[] {
  const issues: string[] = [];
  const providerById = new Map(model.providers.map((provider) => [provider.adapterId, provider]));

  for (const provider of model.providers) {
    if (provider.liveGate === "live-ready" && (provider.missingEnv.length > 0 || provider.blockedReasons.length > 0)) {
      issues.push(`Provider ${provider.adapterId} cannot be live-ready with missing env or blockers.`);
    }
    if (provider.availability !== "blocked" && !provider.fallbackAdapterId) {
      issues.push(`Provider ${provider.adapterId} must name a fallback adapter.`);
    }
    if (provider.fallbackAdapterId && !providerById.has(provider.fallbackAdapterId)) {
      issues.push(`Provider ${provider.adapterId} references unknown fallback ${provider.fallbackAdapterId}.`);
    }
  }

  for (const queue of model.fallbackQueues) {
    if (!providerById.has(queue.primaryAdapterId)) {
      issues.push(`Provider ops queue ${queue.id} references unknown primary adapter ${queue.primaryAdapterId}.`);
    }
    if (!providerById.has(queue.fallbackAdapterId)) {
      issues.push(`Provider ops queue ${queue.id} references unknown fallback adapter ${queue.fallbackAdapterId}.`);
    }
  }

  if (model.summary.missingSelectedEnv !== model.env.missingForSelectedProviders.length) {
    issues.push("Provider ops missing-env summary is out of sync.");
  }

  return issues;
}

function buildProviderOpsProvider({
  adapter,
  policy,
  readiness,
  selectedForFlow,
  aiConfigured,
  aiMissingEnv
}: {
  adapter: ProviderAdapter;
  policy: ProviderGovernancePolicy | undefined;
  readiness: RuntimeReadiness | undefined;
  selectedForFlow: boolean;
  aiConfigured: boolean;
  aiMissingEnv: string[];
}): ProviderOpsProvider {
  const missingEnv = aiConfigured ? [] : readiness?.missingCredentials ?? adapter.credentials;
  const blockedReasons = readiness?.blockedReasons ?? [`Runtime readiness missing for ${adapter.id}.`];
  const availability = providerOpsAvailability(adapter, missingEnv, aiConfigured);
  const liveGate = providerOpsLiveGate(adapter, availability, blockedReasons);
  const latencyGateRequired = adapter.safetyGates.some((gate) => gate.includes("Latency budget"));

  return {
    adapterId: adapter.id,
    label: adapter.label,
    provider: adapter.provider,
    capability: adapter.capability,
    capabilityLabel: capabilityLabels[adapter.capability],
    status: adapter.status,
    availability,
    liveGate,
    selectedForFlow,
    missingEnv: selectedForFlow && aiMissingEnv.length > 0 ? uniqueSorted(aiMissingEnv) : uniqueSorted(missingEnv),
    blockedReasons,
    fallbackAdapterId: policy?.fallbackAdapterId ?? "",
    queueRequired: Boolean(policy?.queueRequired),
    rateLimitPerMinute: policy?.rateLimitPerMinute ?? 0,
    monthlyBudgetCents: policy?.monthlyBudgetCents ?? 0,
    perRequestBudgetCents: policy?.perRequestBudgetCents ?? 0,
    latencyGateRequired,
    latencyGateSatisfied: latencyGateRequired && Boolean(readiness?.satisfiedGates.some((gate) => gate.includes("Latency budget")))
  };
}

function providerOpsAvailability(
  adapter: ProviderAdapter,
  missingEnv: string[],
  aiConfigured: boolean
): ProviderOpsAvailability {
  if (adapter.status === "ready-local") return "ready-local";
  if (adapter.status === "blocked") return "blocked";
  if (adapter.status === "contract-only") return "contract-only";
  return aiConfigured || missingEnv.length === 0 ? "env-configured" : "env-missing";
}

function providerOpsLiveGate(
  adapter: ProviderAdapter,
  availability: ProviderOpsAvailability,
  blockedReasons: string[]
): ProviderOpsLiveGate {
  if (availability === "ready-local") return "local-ready";
  if (availability === "blocked") return "blocked";
  if (availability === "contract-only") return "contract-only";
  if (availability === "env-missing") return "env-missing";
  return blockedReasons.length === 0 ? "live-ready" : "feature-gated";
}

function selectedProviderAdapterIds(aiFlowSummary: AiFlowConfigSummary): Set<string> {
  return new Set(aiFlowSummary.flows.flatMap((flow) => [flow.primaryAdapterId, flow.fallbackAdapterId]));
}

function buildProviderOpsEnvSummary(
  selectedProviders: ProviderOpsProvider[],
  availableProviders: ProviderOpsProvider[],
  fallbackQueues: ProviderOpsFallbackQueue[]
): ProviderOpsEnvSummary {
  const selectedAdapterIds = new Set(fallbackQueues.flatMap((queue) => [queue.primaryAdapterId, queue.fallbackAdapterId]));
  const selectedRows = selectedProviders.filter((provider) => selectedAdapterIds.has(provider.adapterId));

  return {
    configuredProviders: uniqueSorted(
      availableProviders
        .filter((provider) => provider.availability === "env-configured")
        .map((provider) => provider.adapterId)
    ),
    selectedProviders: uniqueSorted(selectedRows.map((provider) => provider.adapterId)),
    requiredForSelectedProviders: uniqueSorted(selectedRows.flatMap((provider) => provider.missingEnv)),
    missingForSelectedProviders: uniqueSorted(selectedRows.flatMap((provider) => provider.missingEnv))
  };
}

function buildUserManagementRequiredEnv(model: AdminPanelModel): string[] {
  return uniqueSorted([
    "VITE_CUSTOMCARD_ADMIN_EMAIL",
    "VITE_CUSTOMCARD_ADMIN_EMAILS",
    ...model.coverage.requiredEnv.filter((envVar) => /CLERK|AUTH_SESSION|CUSTOMCARD_(ADMIN|CUSTOMER)_SESSION/.test(envVar))
  ]);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}
