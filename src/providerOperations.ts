import {
  getAdaptersByCapability,
  getProviderAdapter,
  providerCatalog,
  type ProviderAdapter,
  type ProviderCapability
} from "./providerCatalog";
import { buildProviderGovernanceControls, buildProviderGovernancePolicy } from "./providerGovernance";
import { getProviderRuntimeReadiness, type ProviderGateState, type ProviderRuntimeEnv } from "./providerRuntime";

export type ProviderCallStatus = "reserved" | "succeeded" | "failed" | "blocked" | "fallback-selected";
export type ProviderOperationsMode = "prepared-request" | "local-fallback" | "blocked";
export type ProviderFallbackReason =
  | "missing-credentials"
  | "safety-gate"
  | "monthly-budget-exceeded"
  | "per-request-budget-exceeded"
  | "rate-limit-exceeded"
  | "provider-blocked"
  | "provider-unavailable"
  | "circuit-open"
  | "no-preferred-provider";

export interface ProviderCallEvent {
  id: string;
  tenantId: string;
  routeId: string;
  adapterId: string;
  capability: ProviderCapability;
  status: ProviderCallStatus;
  occurredAtIso: string;
  monthBucket: string;
  requestUnits: number;
  estimatedCostCents: number;
  actualCostCents?: number;
  rateLimitWindowStartIso: string;
  fallbackFromAdapterId?: string;
  fallbackReason?: ProviderFallbackReason;
  errorClass?: string;
  latencyMs?: number;
  piiFree: true;
  liveNetworkCall: false;
  auditEventName: string;
}

export interface ProviderOperationsInput {
  capability: ProviderCapability;
  routeId: string;
  tenantId?: string;
  preferredAdapterIds?: string[];
  env?: ProviderRuntimeEnv;
  gates?: ProviderGateState;
  usageEvents?: ProviderCallEvent[];
  nowIso?: string;
  requestUnits?: number;
  estimatedUnitCostCentsByAdapter?: Record<string, number>;
  circuitOpenAdapterIds?: string[];
}

export interface ProviderAttemptDecision {
  adapterId: string;
  capability: ProviderCapability;
  status: "ready" | "blocked";
  reason?: ProviderFallbackReason;
  blockedReasons: string[];
  monthlySpentCents: number;
  projectedMonthlySpendCents: number;
  monthlyBudgetCents: number;
  rateLimitCount: number;
  rateLimitPerMinute: number;
}

export interface ProviderFailoverPlan {
  capability: ProviderCapability;
  routeId: string;
  tenantId: string;
  mode: ProviderOperationsMode;
  selectedAdapterId?: string;
  fallbackAdapterId: string;
  requestUnits: number;
  attempts: ProviderAttemptDecision[];
  ledgerEvents: ProviderCallEvent[];
  blockers: string[];
  liveNetworkDefault: false;
  auditRequired: true;
}

export interface ProviderUsageSummary {
  tenantId: string;
  monthBucket: string;
  events: number;
  adapters: number;
  reservedOrSpentCents: number;
  actualSpendCents: number;
  blockedEvents: number;
  fallbackEvents: number;
  overBudgetBlocks: number;
  rateLimitBlocks: number;
  liveNetworkCalls: 0;
}

const billableStatuses = new Set<ProviderCallStatus>(["reserved", "succeeded", "failed"]);

export function buildProviderFailoverPlan(input: ProviderOperationsInput): ProviderFailoverPlan {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const tenantId = input.tenantId ?? "default";
  const requestUnits = Math.max(1, Math.floor(input.requestUnits ?? 1));
  const fallbackAdapterId = buildProviderGovernanceControls(input.capability).fallbackAdapterId;
  const preferredAdapters = resolvePreferredAdapters(input.capability, input.preferredAdapterIds, fallbackAdapterId);
  const attempts = preferredAdapters.map((adapter) =>
    evaluateProviderAttempt(adapter, {
      ...input,
      tenantId,
      nowIso,
      requestUnits
    })
  );
  const readyAttemptIndex = attempts.findIndex((attempt) => attempt.status === "ready");
  const readyAttempt = readyAttemptIndex >= 0 ? attempts[readyAttemptIndex] : undefined;
  const blockedLedgerEvents = buildBlockedProviderCallEvents({
    attempts: readyAttemptIndex >= 0 ? attempts.slice(0, readyAttemptIndex) : attempts,
    estimatedUnitCostCentsByAdapter: input.estimatedUnitCostCentsByAdapter,
    nowIso,
    requestUnits,
    routeId: input.routeId,
    tenantId
  });

  if (readyAttempt) {
    const adapter = requireProviderAdapter(readyAttempt.adapterId);
    const unitCost = estimateUnitCostCents(adapter, input.estimatedUnitCostCentsByAdapter);
    return {
      capability: input.capability,
      routeId: input.routeId,
      tenantId,
      mode: "prepared-request",
      selectedAdapterId: adapter.id,
      fallbackAdapterId,
      requestUnits,
      attempts,
      ledgerEvents: [
        ...blockedLedgerEvents,
        buildProviderCallEvent({
          adapter,
          tenantId,
          routeId: input.routeId,
          status: "reserved",
          nowIso,
          requestUnits,
          estimatedCostCents: unitCost * requestUnits
        })
      ],
      blockers: [],
      liveNetworkDefault: false,
      auditRequired: true
    };
  }

  const fallback = getProviderAdapter(fallbackAdapterId);
  if (!fallback || fallback.status !== "ready-local") {
    return {
      capability: input.capability,
      routeId: input.routeId,
      tenantId,
      mode: "blocked",
      fallbackAdapterId,
      requestUnits,
      attempts,
      ledgerEvents: blockedLedgerEvents,
      blockers: [`Missing ready-local fallback for ${input.capability}: ${fallbackAdapterId}.`],
      liveNetworkDefault: false,
      auditRequired: true
    };
  }

  const fallbackReason = attempts[0]?.reason ?? "no-preferred-provider";
  return {
    capability: input.capability,
    routeId: input.routeId,
    tenantId,
    mode: "local-fallback",
    selectedAdapterId: fallback.id,
    fallbackAdapterId,
    requestUnits,
    attempts,
    ledgerEvents: [
      ...blockedLedgerEvents,
      buildProviderCallEvent({
        adapter: fallback,
        tenantId,
        routeId: input.routeId,
        status: "fallback-selected",
        nowIso,
        requestUnits: 1,
        estimatedCostCents: 0,
        fallbackFromAdapterId: attempts[0]?.adapterId,
        fallbackReason
      })
    ],
    blockers: [],
    liveNetworkDefault: false,
    auditRequired: true
  };
}

export function evaluateProviderAttempt(
  adapter: ProviderAdapter,
  input: Required<Pick<ProviderOperationsInput, "capability" | "routeId">> &
    Pick<
      ProviderOperationsInput,
      "env" | "gates" | "usageEvents" | "estimatedUnitCostCentsByAdapter" | "circuitOpenAdapterIds"
    > & {
      tenantId: string;
      nowIso: string;
      requestUnits: number;
    }
): ProviderAttemptDecision {
  const policy = buildProviderGovernancePolicy(adapter);
  const readiness = getProviderRuntimeReadiness(adapter.id, input.env, input.gates);
  const unitCostCents = estimateUnitCostCents(adapter, input.estimatedUnitCostCentsByAdapter);
  const monthlySpentCents = providerMonthlySpendCents({
    events: input.usageEvents ?? [],
    adapterId: adapter.id,
    tenantId: input.tenantId,
    monthBucket: monthBucketFromIso(input.nowIso)
  });
  const rateLimitCount = providerRateWindowCount({
    events: input.usageEvents ?? [],
    adapterId: adapter.id,
    tenantId: input.tenantId,
    nowIso: input.nowIso
  });
  const projectedMonthlySpendCents = monthlySpentCents + unitCostCents * input.requestUnits;
  const circuitOpen = input.circuitOpenAdapterIds?.includes(adapter.id) ?? false;
  const blockedReasons = [...readiness.blockedReasons];
  let reason: ProviderFallbackReason | undefined;

  if (adapter.capability !== input.capability) {
    blockedReasons.push(`Adapter ${adapter.id} is ${adapter.capability}, not ${input.capability}.`);
    reason = "provider-unavailable";
  } else if (circuitOpen) {
    blockedReasons.push(`Circuit open for provider adapter: ${adapter.id}.`);
    reason = "circuit-open";
  } else if (readiness.missingCredentials.length > 0) {
    reason = "missing-credentials";
  } else if (readiness.blockedReasons.some((blockedReason) => blockedReason.includes("Missing safety gate"))) {
    reason = "safety-gate";
  } else if (adapter.status === "blocked" || readiness.mode === "blocked") {
    reason = "provider-blocked";
  }

  if (!reason && unitCostCents > policy.perRequestBudgetCents && policy.perRequestBudgetCents > 0) {
    blockedReasons.push(`Estimated unit cost ${unitCostCents}c exceeds per-request budget ${policy.perRequestBudgetCents}c.`);
    reason = "per-request-budget-exceeded";
  }
  if (!reason && policy.monthlyBudgetCents > 0 && projectedMonthlySpendCents > policy.monthlyBudgetCents) {
    blockedReasons.push(
      `Projected monthly spend ${projectedMonthlySpendCents}c exceeds monthly budget ${policy.monthlyBudgetCents}c.`
    );
    reason = "monthly-budget-exceeded";
  }
  if (!reason && policy.rateLimitPerMinute > 0 && rateLimitCount + input.requestUnits > policy.rateLimitPerMinute) {
    blockedReasons.push(
      `Projected rate window ${rateLimitCount + input.requestUnits} exceeds rate limit ${policy.rateLimitPerMinute}/minute.`
    );
    reason = "rate-limit-exceeded";
  }

  return {
    adapterId: adapter.id,
    capability: adapter.capability,
    status: reason ? "blocked" : "ready",
    reason,
    blockedReasons,
    monthlySpentCents,
    projectedMonthlySpendCents,
    monthlyBudgetCents: policy.monthlyBudgetCents,
    rateLimitCount,
    rateLimitPerMinute: policy.rateLimitPerMinute
  };
}

export function summarizeProviderUsage(
  events: ProviderCallEvent[],
  options: { tenantId?: string; nowIso?: string } = {}
): ProviderUsageSummary {
  const tenantId = options.tenantId ?? "default";
  const monthBucket = monthBucketFromIso(options.nowIso ?? new Date().toISOString());
  const scopedEvents = events.filter((event) => event.tenantId === tenantId && event.monthBucket === monthBucket);
  const billableEvents = scopedEvents.filter((event) => billableStatuses.has(event.status));

  return {
    tenantId,
    monthBucket,
    events: scopedEvents.length,
    adapters: new Set(scopedEvents.map((event) => event.adapterId)).size,
    reservedOrSpentCents: billableEvents.reduce((sum, event) => sum + event.estimatedCostCents, 0),
    actualSpendCents: billableEvents.reduce((sum, event) => sum + (event.actualCostCents ?? 0), 0),
    blockedEvents: scopedEvents.filter((event) => event.status === "blocked").length,
    fallbackEvents: scopedEvents.filter((event) => event.status === "fallback-selected").length,
    overBudgetBlocks: scopedEvents.filter((event) => event.fallbackReason === "monthly-budget-exceeded").length,
    rateLimitBlocks: scopedEvents.filter((event) => event.fallbackReason === "rate-limit-exceeded").length,
    liveNetworkCalls: 0
  };
}

export function buildProviderCallEvent(input: {
  adapter: ProviderAdapter;
  tenantId: string;
  routeId: string;
  status: ProviderCallStatus;
  nowIso: string;
  requestUnits: number;
  estimatedCostCents: number;
  actualCostCents?: number;
  fallbackFromAdapterId?: string;
  fallbackReason?: ProviderFallbackReason;
  errorClass?: string;
  latencyMs?: number;
}): ProviderCallEvent {
  return {
    id: stableProviderEventId(input),
    tenantId: input.tenantId,
    routeId: input.routeId,
    adapterId: input.adapter.id,
    capability: input.adapter.capability,
    status: input.status,
    occurredAtIso: input.nowIso,
    monthBucket: monthBucketFromIso(input.nowIso),
    requestUnits: Math.max(1, Math.floor(input.requestUnits)),
    estimatedCostCents: Math.max(0, Math.floor(input.estimatedCostCents)),
    actualCostCents: input.actualCostCents === undefined ? undefined : Math.max(0, Math.floor(input.actualCostCents)),
    rateLimitWindowStartIso: rateLimitWindowStartIso(input.nowIso),
    fallbackFromAdapterId: input.fallbackFromAdapterId,
    fallbackReason: input.fallbackReason,
    errorClass: input.errorClass,
    latencyMs: input.latencyMs,
    piiFree: true,
    liveNetworkCall: false,
    auditEventName: auditEventNameForStatus(input.status)
  };
}

export function providerMonthlySpendCents(input: {
  events: ProviderCallEvent[];
  adapterId: string;
  tenantId: string;
  monthBucket: string;
}): number {
  return input.events
    .filter(
      (event) =>
        event.adapterId === input.adapterId &&
        event.tenantId === input.tenantId &&
        event.monthBucket === input.monthBucket &&
        billableStatuses.has(event.status)
    )
    .reduce((sum, event) => sum + (event.actualCostCents ?? event.estimatedCostCents), 0);
}

export function providerRateWindowCount(input: {
  events: ProviderCallEvent[];
  adapterId: string;
  tenantId: string;
  nowIso: string;
}): number {
  const now = new Date(input.nowIso).getTime();
  const windowStart = now - 60_000;
  return input.events.reduce((count, event) => {
    const occurredAt = new Date(event.occurredAtIso).getTime();
    if (
      event.adapterId === input.adapterId &&
      event.tenantId === input.tenantId &&
      billableStatuses.has(event.status) &&
      occurredAt >= windowStart &&
      occurredAt <= now
    ) {
      return count + event.requestUnits;
    }
    return count;
  }, 0);
}

export function monthBucketFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function resolvePreferredAdapters(
  capability: ProviderCapability,
  preferredAdapterIds: string[] | undefined,
  fallbackAdapterId: string
): ProviderAdapter[] {
  const preferred = (preferredAdapterIds ?? [])
    .map((adapterId) => getProviderAdapter(adapterId))
    .filter((adapter): adapter is ProviderAdapter => Boolean(adapter))
    .filter((adapter) => adapter.id !== fallbackAdapterId);

  if (preferred.length > 0) return preferred;

  return getAdaptersByCapability(capability, providerCatalog).filter(
    (adapter) => adapter.id !== fallbackAdapterId && adapter.status !== "ready-local"
  );
}

function estimateUnitCostCents(adapter: ProviderAdapter, overrides: Record<string, number> | undefined): number {
  return Math.max(0, Math.floor(overrides?.[adapter.id] ?? buildProviderGovernancePolicy(adapter).perRequestBudgetCents));
}

function buildBlockedProviderCallEvents(input: {
  attempts: ProviderAttemptDecision[];
  estimatedUnitCostCentsByAdapter: Record<string, number> | undefined;
  nowIso: string;
  requestUnits: number;
  routeId: string;
  tenantId: string;
}): ProviderCallEvent[] {
  return input.attempts
    .filter((attempt) => attempt.status === "blocked")
    .map((attempt) => {
      const adapter = requireProviderAdapter(attempt.adapterId);
      const unitCost = estimateUnitCostCents(adapter, input.estimatedUnitCostCentsByAdapter);
      return buildProviderCallEvent({
        adapter,
        tenantId: input.tenantId,
        routeId: input.routeId,
        status: "blocked",
        nowIso: input.nowIso,
        requestUnits: input.requestUnits,
        estimatedCostCents: unitCost * input.requestUnits,
        fallbackReason: attempt.reason ?? "provider-unavailable",
        errorClass: attempt.reason
      });
    });
}

function requireProviderAdapter(adapterId: string): ProviderAdapter {
  const adapter = getProviderAdapter(adapterId);
  if (!adapter) throw new Error(`Unknown provider adapter: ${adapterId}`);
  return adapter;
}

function rateLimitWindowStartIso(iso: string): string {
  const date = new Date(iso);
  date.setSeconds(0, 0);
  return date.toISOString();
}

function auditEventNameForStatus(status: ProviderCallStatus): string {
  if (status === "reserved") return "provider.request.reserved";
  if (status === "succeeded") return "provider.request.succeeded";
  if (status === "failed") return "provider.request.failed";
  if (status === "blocked") return "provider.request.blocked";
  return "provider.fallback.selected";
}

function stableProviderEventId(input: {
  adapter: ProviderAdapter;
  tenantId: string;
  routeId: string;
  status: ProviderCallStatus;
  nowIso: string;
  requestUnits: number;
  estimatedCostCents: number;
  fallbackFromAdapterId?: string;
  fallbackReason?: ProviderFallbackReason;
}): string {
  const seed = [
    input.tenantId,
    input.routeId,
    input.adapter.id,
    input.status,
    input.nowIso,
    input.requestUnits,
    input.estimatedCostCents,
    input.fallbackFromAdapterId ?? "",
    input.fallbackReason ?? ""
  ].join(":");
  let hash = 0;
  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return `provider-call-${hash.toString(16).padStart(8, "0")}`;
}
