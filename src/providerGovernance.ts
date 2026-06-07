import {
  capabilityLabels,
  providerCatalog,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderCost,
  type ProviderStatus
} from "./providerCatalog.ts";

export type GovernanceSpendTier = "zero-platform-spend" | "budget-capped" | "blocked-zero-spend";

export interface ProviderGovernancePolicy {
  adapterId: string;
  label: string;
  capability: ProviderCapability;
  status: ProviderStatus;
  cost: ProviderCost;
  spendTier: GovernanceSpendTier;
  monthlyBudgetCents: number;
  perRequestBudgetCents: number;
  rateLimitPerMinute: number;
  burstLimit: number;
  queueRequired: boolean;
  cacheTtlSeconds: number;
  fallbackAdapterId: string;
  humanApprovalRequired: boolean;
  liveNetworkDefault: false;
  realOrdersEnabled: false;
}

export interface ProviderGovernanceControls {
  fallbackAdapterId: string;
  monthlyBudgetCents: number;
  perRequestBudgetCents: number;
  rateLimitPerMinute: number;
  cacheTtlSeconds: number;
  queueRequired: boolean;
  humanApprovalRequired: boolean;
}

export interface ProviderGovernanceSeam {
  capability: ProviderCapability;
  fallbackAdapterId: string;
  liveNetworkDefault: false;
  realOrdersEnabled: false;
  controls: ProviderGovernanceControls;
}

export interface ProviderGovernanceSummary {
  total: number;
  zeroPlatformSpend: number;
  budgetCapped: number;
  blockedZeroSpend: number;
  monthlyBudgetCents: number;
  maxPerRequestBudgetCents: number;
  rateLimited: number;
  queueRequired: number;
  fallbackCovered: number;
  liveNetworkDefault: false;
  realOrdersEnabled: false;
  policies: ProviderGovernancePolicy[];
  blockers: string[];
}

const fallbackByCapability: Record<ProviderCapability, string> = {
  auth: "local-workspace-auth",
  "event-import": "ics-paste-import",
  "contact-import": "vcard-contact-import",
  "crm-integration": "crm-csv-lifecycle-import",
  "workflow-integration": "local-workflow-payload-export",
  "text-chat": "deterministic-customer-chat",
  "image-generation": "browser-svg-renderer",
  "render-export": "local-print-package-export",
  memory: "local-relationship-memory",
  "vendor-handoff": "manual-vendor-handoff",
  "cloud-runtime": "docker-compose-dev",
  notification: "browser-download-notification",
  payment: "no-payment-checkout-gate",
  observability: "local-health-audit-observability"
};

const monthlyBudgetCentsByCapability: Record<ProviderCapability, number> = {
  auth: 500,
  "event-import": 500,
  "contact-import": 500,
  "crm-integration": 800,
  "workflow-integration": 600,
  "text-chat": 2500,
  "image-generation": 3000,
  "render-export": 800,
  memory: 1000,
  "vendor-handoff": 0,
  "cloud-runtime": 2500,
  notification: 1000,
  payment: 0,
  observability: 1000
};

const perRequestBudgetCentsByCapability: Record<ProviderCapability, number> = {
  auth: 1,
  "event-import": 1,
  "contact-import": 1,
  "crm-integration": 1,
  "workflow-integration": 1,
  "text-chat": 10,
  "image-generation": 75,
  "render-export": 2,
  memory: 1,
  "vendor-handoff": 0,
  "cloud-runtime": 0,
  notification: 2,
  payment: 0,
  observability: 1
};

const rateLimitPerMinuteByCapability: Record<ProviderCapability, number> = {
  auth: 30,
  "event-import": 20,
  "contact-import": 20,
  "crm-integration": 20,
  "workflow-integration": 20,
  "text-chat": 12,
  "image-generation": 6,
  "render-export": 20,
  memory: 60,
  "vendor-handoff": 4,
  "cloud-runtime": 4,
  notification: 20,
  payment: 10,
  observability: 120
};

const cacheTtlSecondsByCapability: Record<ProviderCapability, number> = {
  auth: 0,
  "event-import": 300,
  "contact-import": 900,
  "crm-integration": 900,
  "workflow-integration": 900,
  "text-chat": 0,
  "image-generation": 0,
  "render-export": 3600,
  memory: 0,
  "vendor-handoff": 900,
  "cloud-runtime": 3600,
  notification: 0,
  payment: 0,
  observability: 60
};

const queuedCapabilities = new Set<ProviderCapability>([
  "image-generation",
  "render-export",
  "vendor-handoff",
  "workflow-integration",
  "notification",
  "payment",
  "cloud-runtime"
]);

export const providerGovernanceSeams: ProviderGovernanceSeam[] = (Object.keys(fallbackByCapability) as ProviderCapability[]).map(
  (capability) => ({
    capability,
    fallbackAdapterId: fallbackByCapability[capability],
    liveNetworkDefault: false,
    realOrdersEnabled: false,
    controls: buildProviderGovernanceControls(capability)
  })
);

export function buildProviderGovernanceControls(capability: ProviderCapability): ProviderGovernanceControls {
  return {
    fallbackAdapterId: fallbackByCapability[capability],
    monthlyBudgetCents: monthlyBudgetCentsByCapability[capability],
    perRequestBudgetCents: perRequestBudgetCentsByCapability[capability],
    rateLimitPerMinute: rateLimitPerMinuteByCapability[capability],
    cacheTtlSeconds: cacheTtlSecondsByCapability[capability],
    queueRequired: queuedCapabilities.has(capability),
    humanApprovalRequired: capability === "image-generation" || capability === "vendor-handoff" || capability === "payment"
  };
}

export function buildProviderGovernancePolicy(adapter: ProviderAdapter): ProviderGovernancePolicy {
  const controls = buildProviderGovernanceControls(adapter.capability);
  const blocked = adapter.status === "blocked";
  const zeroPlatformSpend = adapter.status === "ready-local" || adapter.cost === "free-local" || adapter.cost === "manual";
  const spendTier: GovernanceSpendTier = blocked
    ? "blocked-zero-spend"
    : zeroPlatformSpend
      ? "zero-platform-spend"
      : "budget-capped";
  const monthlyBudgetCents = spendTier === "budget-capped" ? controls.monthlyBudgetCents : 0;
  const perRequestBudgetCents = spendTier === "budget-capped" ? controls.perRequestBudgetCents : 0;
  const rateLimitPerMinute = blocked ? 0 : controls.rateLimitPerMinute;

  return {
    adapterId: adapter.id,
    label: adapter.label,
    capability: adapter.capability,
    status: adapter.status,
    cost: adapter.cost,
    spendTier,
    monthlyBudgetCents,
    perRequestBudgetCents,
    rateLimitPerMinute,
    burstLimit: Math.max(rateLimitPerMinute * 2, rateLimitPerMinute),
    queueRequired: blocked || controls.queueRequired || adapter.cost === "usage-based",
    cacheTtlSeconds: controls.cacheTtlSeconds,
    fallbackAdapterId: controls.fallbackAdapterId,
    humanApprovalRequired: controls.humanApprovalRequired,
    liveNetworkDefault: false,
    realOrdersEnabled: false
  };
}

export function summarizeProviderGovernance(adapters: ProviderAdapter[] = providerCatalog): ProviderGovernanceSummary {
  const policies = adapters.map((adapter) => buildProviderGovernancePolicy(adapter));
  const blockers = validateProviderGovernance(adapters, policies);

  return {
    total: policies.length,
    zeroPlatformSpend: policies.filter((policy) => policy.spendTier === "zero-platform-spend").length,
    budgetCapped: policies.filter((policy) => policy.spendTier === "budget-capped").length,
    blockedZeroSpend: policies.filter((policy) => policy.spendTier === "blocked-zero-spend").length,
    monthlyBudgetCents: policies.reduce((sum, policy) => sum + policy.monthlyBudgetCents, 0),
    maxPerRequestBudgetCents: Math.max(...policies.map((policy) => policy.perRequestBudgetCents), 0),
    rateLimited: policies.filter((policy) => policy.rateLimitPerMinute > 0).length,
    queueRequired: policies.filter((policy) => policy.queueRequired).length,
    fallbackCovered: policies.filter((policy) => fallbackIsReadyLocal(policy, adapters)).length,
    liveNetworkDefault: false,
    realOrdersEnabled: false,
    policies,
    blockers
  };
}

export function validateProviderGovernance(
  adapters: ProviderAdapter[] = providerCatalog,
  policies: ProviderGovernancePolicy[] = adapters.map((adapter) => buildProviderGovernancePolicy(adapter))
): string[] {
  const errors: string[] = [];
  const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));
  const policyById = new Map(policies.map((policy) => [policy.adapterId, policy]));

  for (const adapter of adapters) {
    const policy = policyById.get(adapter.id);
    if (!policy) {
      errors.push(`Missing governance policy for ${adapter.id}.`);
      continue;
    }

    if (policy.liveNetworkDefault || policy.realOrdersEnabled) {
      errors.push(`Governance policy for ${adapter.id} must default to no live network and no real orders.`);
    }
    if (!Number.isFinite(policy.monthlyBudgetCents) || policy.monthlyBudgetCents < 0) {
      errors.push(`Governance policy for ${adapter.id} must use a finite monthly budget.`);
    }
    if (!Number.isFinite(policy.perRequestBudgetCents) || policy.perRequestBudgetCents < 0) {
      errors.push(`Governance policy for ${adapter.id} must use a finite per-request budget.`);
    }
    if (adapter.status === "blocked" && (policy.monthlyBudgetCents !== 0 || policy.perRequestBudgetCents !== 0 || policy.rateLimitPerMinute !== 0)) {
      errors.push(`Blocked adapter ${adapter.id} must have zero spend and zero runtime rate.`);
    }
    if (adapter.status !== "blocked" && policy.rateLimitPerMinute <= 0) {
      errors.push(`Non-blocked adapter ${adapter.id} must have a rate limit.`);
    }
    if (policy.spendTier === "budget-capped" && adapter.cost === "usage-based" && !policy.queueRequired) {
      errors.push(`Usage-based adapter ${adapter.id} must run through a queue or explicit throttle.`);
    }
    if (!fallbackIsReadyLocal(policy, adapters)) {
      errors.push(`Adapter ${adapter.id} must map to a ready-local ${capabilityLabels[adapter.capability]} fallback.`);
    }
  }

  for (const [capability, fallbackAdapterId] of Object.entries(fallbackByCapability) as Array<[ProviderCapability, string]>) {
    const fallback = adapterById.get(fallbackAdapterId);
    if (!fallback) {
      errors.push(`Missing governance fallback adapter for ${capability}: ${fallbackAdapterId}.`);
    } else if (fallback.capability !== capability || fallback.status !== "ready-local") {
      errors.push(`Governance fallback ${fallbackAdapterId} must be ready-local for ${capability}.`);
    }
  }

  return errors;
}

function fallbackIsReadyLocal(policy: ProviderGovernancePolicy, adapters: ProviderAdapter[]): boolean {
  const fallback = adapters.find((adapter) => adapter.id === policy.fallbackAdapterId);
  return Boolean(fallback && fallback.capability === policy.capability && fallback.status === "ready-local");
}
