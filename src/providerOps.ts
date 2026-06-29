import { adapterMissingEnv, aiProviderEnvRequirements, type AiFlowConfigSummary } from "./aiFlowConfig";
import {
  capabilityLabels,
  providerCatalog,
  type AdminPanelModel,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderStatus
} from "./providerCatalog";
import type { ProviderGovernancePolicy, ProviderGovernanceSummary } from "./providerGovernance";
import { summarizeProviderUsage, type ProviderCallEvent } from "./providerOperations";
import type { RuntimeReadiness } from "./providerRuntime";
import type { ReadinessSummary } from "./readinessSummary";

export type ProviderOpsAvailability = "ready-local" | "credential-configured" | "credentials-missing" | "contract-only" | "blocked";
export type ProviderOpsLiveGate = "local-ready" | "live-ready" | "admin-gated" | "credentials-missing" | "contract-only" | "blocked";
export type ProviderOpsMetricSourceKind = "provider-api" | "provider-dashboard" | "response-metadata" | "local-ledger";

export interface ProviderOpsMetricSource {
  label: string;
  detail: string;
  kind: ProviderOpsMetricSourceKind;
  usageUnit: string;
  docsUrl: string;
  providerSourced: boolean;
}

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
  metricSource: ProviderOpsMetricSource;
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

export interface ProviderOpsUsageCostSummary {
  configuredProviders: number;
  configuredFlows: number;
  liveEnabledConfiguredFlows: number;
  monthlyBudgetCents: number;
  maxPerRequestBudgetCents: number;
  estimatedMonthlyRequestsAtBudget: number;
  reservedOrSpentCents: number;
  actualSpendCents: number;
  ledgerEvents: number;
  fallbackEvents: number;
  overBudgetBlocks: number;
  rateLimitBlocks: number;
  providerSourcedMetricAdapters: number;
  localLedgerMetricAdapters: number;
  monthBucket: string;
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
  usage: ProviderOpsUsageCostSummary;
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
  usageEvents?: ProviderCallEvent[];
  tenantId?: string;
  nowIso?: string;
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
    provider.availability === "ready-local" || provider.availability === "credential-configured"
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
  const usage = buildProviderOpsUsageCostSummary(input);
  const model: ProviderOpsModel = {
    summary: {
      totalProviders: providers.length,
      availableProviders: availableProviders.length,
      envConfiguredProviders: providers.filter((provider) => provider.availability === "credential-configured").length,
      selectedProviders: selectedProviders.length,
      readyForLiveCalls: input.aiFlowSummary.readyForLiveCalls,
      liveReadyProviders: providers.filter((provider) => provider.liveGate === "live-ready").length,
      liveGatedProviders: providers.filter((provider) => provider.liveGate === "admin-gated").length,
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
    usage,
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
  const fallbackOptionalCapabilities = new Set<ProviderCapability>(["text-chat", "image-generation"]);

  for (const provider of model.providers) {
    if (provider.liveGate === "live-ready" && (provider.missingEnv.length > 0 || provider.blockedReasons.length > 0)) {
      issues.push(`Provider ${provider.adapterId} cannot be live-ready with missing env or blockers.`);
    }
    if (provider.availability !== "blocked" && !provider.fallbackAdapterId && !fallbackOptionalCapabilities.has(provider.capability)) {
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
    if (queue.fallbackAdapterId && !providerById.has(queue.fallbackAdapterId)) {
      issues.push(`Provider ops queue ${queue.id} references unknown fallback adapter ${queue.fallbackAdapterId}.`);
    }
  }

  if (model.summary.missingSelectedEnv !== model.env.missingForSelectedProviders.length) {
    issues.push("Provider ops missing-env summary is out of sync.");
  }

  return issues;
}

export function providerOpsMetricSourceForAdapter(adapterId: string): ProviderOpsMetricSource {
  if (adapterId.startsWith("cloudflare-workers-ai-")) {
    return {
      label: "Cloudflare Workers AI",
      detail: "Provider dashboard reports Neuron usage; model pricing maps tokens to Neurons.",
      kind: "provider-dashboard",
      usageUnit: "tokens / Neurons",
      docsUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
      providerSourced: true
    };
  }
  if (adapterId.startsWith("openai-") || adapterId === "self-hosted-openai-compatible-chat") {
    return {
      label: adapterId === "self-hosted-openai-compatible-chat" ? "OpenAI-compatible gateway" : "OpenAI Admin Usage",
      detail: "Admin usage endpoints and response usage metadata can be reconciled into the provider ledger.",
      kind: adapterId === "self-hosted-openai-compatible-chat" ? "local-ledger" : "provider-api",
      usageUnit: "requests / tokens / project usage",
      docsUrl: "https://developers.openai.com/api/reference/overview/",
      providerSourced: adapterId !== "self-hosted-openai-compatible-chat"
    };
  }
  if (adapterId.startsWith("anthropic-")) {
    return {
      label: "Anthropic Usage and Cost API",
      detail: "Admin API usage/cost reports and rate-limit headers can be reconciled into the provider ledger.",
      kind: "provider-api",
      usageUnit: "tokens / cost / rate limits",
      docsUrl: "https://platform.claude.com/docs/en/manage-claude/admin-api",
      providerSourced: true
    };
  }
  if (adapterId.startsWith("google-gemini-")) {
    return {
      label: "Gemini usage metadata",
      detail: "GenerateContent responses expose token usage metadata for request-level accounting.",
      kind: "response-metadata",
      usageUnit: "input / output / total tokens",
      docsUrl: "https://ai.google.dev/gemini-api/docs/tokens",
      providerSourced: true
    };
  }
  if (adapterId === "deepai-text2img-image") {
    return {
      label: "DeepAI Pro dashboard",
      detail: "DeepAI API image calls draw from Pro monthly allowances or wallet balance; CustomCard reconciles panel calls, failures, and fallbacks in provider_call_events.",
      kind: "provider-dashboard",
      usageUnit: "images / wallet credits / provider_call_events",
      docsUrl: "https://deepai.org/pricing",
      providerSourced: true
    };
  }
  return {
    label: "CustomCard provider ledger",
    detail: "CustomCard records reserved, actual, blocked, and fallback events in provider_call_events.",
    kind: "local-ledger",
    usageUnit: "events / cents / fallbacks",
    docsUrl: "src/providerOperations.ts",
    providerSourced: false
  };
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
    latencyGateSatisfied: latencyGateRequired && Boolean(readiness?.satisfiedGates.some((gate) => gate.includes("Latency budget"))),
    metricSource: providerOpsMetricSourceForAdapter(adapter.id)
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
  return aiConfigured || missingEnv.length === 0 ? "credential-configured" : "credentials-missing";
}

function providerOpsLiveGate(
  adapter: ProviderAdapter,
  availability: ProviderOpsAvailability,
  blockedReasons: string[]
): ProviderOpsLiveGate {
  if (availability === "ready-local") return "local-ready";
  if (availability === "blocked") return "blocked";
  if (availability === "contract-only") return "contract-only";
  if (availability === "credentials-missing") return "credentials-missing";
  return blockedReasons.length === 0 ? "live-ready" : "admin-gated";
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
        .filter((provider) => provider.availability === "credential-configured")
        .map((provider) => provider.adapterId)
    ),
    selectedProviders: uniqueSorted(selectedRows.map((provider) => provider.adapterId)),
    requiredForSelectedProviders: uniqueSorted(selectedRows.flatMap((provider) => provider.missingEnv)),
    missingForSelectedProviders: uniqueSorted(selectedRows.flatMap((provider) => provider.missingEnv))
  };
}

function buildUserManagementRequiredEnv(model: AdminPanelModel): string[] {
  return uniqueSorted(
    model.coverage.requiredEnv.filter((envVar) => /CLERK|AUTH_SESSION|CUSTOMCARD_(ADMIN|CUSTOMER)_SESSION/.test(envVar))
  );
}

function buildProviderOpsUsageCostSummary(input: ProviderOpsModelInput): ProviderOpsUsageCostSummary {
  const configuredProviderIds = new Set(
    input.aiFlowSummary.configuredProviders.filter((adapterId) => (aiProviderEnvRequirements[adapterId]?.length ?? 0) > 0)
  );
  const configuredFlows = input.aiFlowSummary.flows.filter((flow) => configuredProviderIds.has(flow.primaryAdapterId));
  const configuredMetricSources = Array.from(configuredProviderIds).map(providerOpsMetricSourceForAdapter);
  const ledger = summarizeProviderUsage(input.usageEvents ?? [], {
    tenantId: input.tenantId,
    nowIso: input.nowIso
  });

  return {
    configuredProviders: configuredProviderIds.size,
    configuredFlows: configuredFlows.length,
    liveEnabledConfiguredFlows: configuredFlows.filter((flow) => flow.liveProviderCallsEnabled).length,
    monthlyBudgetCents: configuredFlows.reduce((sum, flow) => sum + flow.monthlyBudgetCents, 0),
    maxPerRequestBudgetCents: Math.max(...configuredFlows.map((flow) => flow.perRequestBudgetCents), 0),
    estimatedMonthlyRequestsAtBudget: configuredFlows.reduce((sum, flow) => {
      if (flow.perRequestBudgetCents <= 0) return sum;
      return sum + Math.floor(flow.monthlyBudgetCents / flow.perRequestBudgetCents);
    }, 0),
    reservedOrSpentCents: ledger.reservedOrSpentCents,
    actualSpendCents: ledger.actualSpendCents,
    ledgerEvents: ledger.events,
    fallbackEvents: ledger.fallbackEvents,
    overBudgetBlocks: ledger.overBudgetBlocks,
    rateLimitBlocks: ledger.rateLimitBlocks,
    providerSourcedMetricAdapters: configuredMetricSources.filter((source) => source.providerSourced).length,
    localLedgerMetricAdapters: configuredMetricSources.filter((source) => !source.providerSourced).length,
    monthBucket: ledger.monthBucket
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}
