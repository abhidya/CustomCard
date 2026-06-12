const localAdapterIds = new Set(["browser-svg-renderer", "deterministic-customer-chat"]);
const defaultTenantId = "anonymous";
const defaultRouteId = "ai-flow";
const defaultRateKey = "unknown";

export function createAiFlowCostGate({ store = createMemoryAiFlowCostStore(), now = () => new Date() } = {}) {
  return {
    reserve(input) {
      const reservation = buildReservation(input, now());
      const blockedReason = firstBlockedReason(store, reservation, now());
      if (blockedReason) {
        const event = buildProviderCallEvent({
          reservation,
          status: "blocked",
          fallbackReason: blockedReason.reason,
          metadata: {
            ...reservation.metadata,
            costGateBlocked: true,
            costGateReason: blockedReason.detail
          }
        });
        store.appendEvent(event);
        return {
          ok: false,
          reservation,
          event,
          statusCode: blockedReason.statusCode,
          fallbackReason: blockedReason.reason,
          providerFailure: blockedReason.detail,
          payload: blockedPayload(reservation, blockedReason.detail)
        };
      }

      store.reserve(reservation);
      const event = buildProviderCallEvent({ reservation, status: "reserved" });
      store.appendEvent(event);
      return {
        ok: true,
        reservation,
        event
      };
    },

    settle(reservation, result = {}) {
      const status = normalizeStatus(result.status);
      const event = buildProviderCallEvent({
        reservation,
        status,
        actualCostCents: result.actualCostCents,
        fallbackReason: result.fallbackReason,
        errorClass: result.errorClass,
        metadata: result.metadata
      });
      store.appendEvent(event);
      return event;
    },

    snapshot(input = {}) {
      return store.snapshot({
        flowId: input.flow?.flowId ?? input.flowId,
        tenantId: input.tenantId ?? defaultTenantId,
        monthBucket: monthBucket(now())
      });
    },

    events() {
      return store.events();
    }
  };
}

export function createMemoryAiFlowCostStore({ now = () => new Date() } = {}) {
  const rateBuckets = new Map();
  const monthlyReservedCents = new Map();
  const providerEvents = [];

  return {
    rateUsage(reservation, currentTime = now()) {
      const key = rateBucketKey(reservation);
      return freshRateBucket(rateBuckets.get(key) ?? [], currentTime).length;
    },

    monthlyReservedCents(reservation) {
      return monthlyReservedCents.get(monthlyKey(reservation)) ?? 0;
    },

    reserve(reservation) {
      const currentTime = now();
      const key = rateBucketKey(reservation);
      const fresh = freshRateBucket(rateBuckets.get(key) ?? [], currentTime);
      for (let index = 0; index < reservation.requestUnits; index += 1) {
        fresh.push(currentTime.getTime());
      }
      if (rateBuckets.size > 10_000) rateBuckets.clear();
      rateBuckets.set(key, fresh);

      monthlyReservedCents.set(
        monthlyKey(reservation),
        (monthlyReservedCents.get(monthlyKey(reservation)) ?? 0) + reservation.estimatedCostCents
      );
    },

    appendEvent(event) {
      providerEvents.push(event);
      if (providerEvents.length > 10_000) providerEvents.splice(0, providerEvents.length - 10_000);
    },

    snapshot({ flowId, tenantId = defaultTenantId, monthBucket: month = monthBucket(now()) } = {}) {
      const monthlyReservations = Array.from(monthlyReservedCents.entries())
        .filter(([key]) => (!flowId || key.includes(`:${flowId}:`)) && key.startsWith(`${tenantId}:`))
        .filter(([key]) => key.endsWith(`:${month}`))
        .reduce((total, [, cents]) => total + cents, 0);
      return {
        monthBucket: month,
        monthlyReservedCents: monthlyReservations,
        eventCount: providerEvents.length
      };
    },

    events() {
      return providerEvents.slice();
    }
  };
}

function firstBlockedReason(store, reservation, nowDate) {
  if (!reservation.readyForLiveCalls) {
    return {
      reason: "provider-blocked",
      statusCode: 200,
      detail: reservation.blockedReasons[0] ?? `Live provider calls disabled for ${reservation.flowId}.`
    };
  }
  if (reservation.unitCostCents > reservation.perRequestBudgetCents) {
    return {
      reason: "per-request-budget-exceeded",
      statusCode: 200,
      detail: `${reservation.flowId} estimated unit cost ${reservation.unitCostCents}c exceeds per-request budget ${reservation.perRequestBudgetCents}c.`
    };
  }
  const projectedMonthlyCents = store.monthlyReservedCents(reservation) + reservation.estimatedCostCents;
  if (projectedMonthlyCents > reservation.monthlyBudgetCents) {
    return {
      reason: "monthly-budget-exceeded",
      statusCode: 200,
      detail: `${reservation.flowId} projected monthly spend ${projectedMonthlyCents}c exceeds monthly budget ${reservation.monthlyBudgetCents}c.`
    };
  }
  const projectedRate = store.rateUsage(reservation, nowDate) + reservation.requestUnits;
  if (projectedRate > reservation.rateLimitPerMinute) {
    return {
      reason: "rate-limit-exceeded",
      statusCode: 429,
      detail: `${reservation.flowId} rate limit ${reservation.rateLimitPerMinute}/minute would be exceeded by ${reservation.requestUnits} provider unit(s).`
    };
  }
  return undefined;
}

function buildReservation(input, nowDate) {
  const flow = input.flow ?? {};
  const adapterId = input.adapterId ?? flow.primaryAdapterId ?? "unknown-adapter";
  const requestUnits = Math.max(1, safeInteger(input.requestUnits, 1));
  const localAdapter = localAdapterIds.has(adapterId);
  const unitCostCents = localAdapter ? 0 : Math.max(0, safeInteger(input.unitCostCents, flow.perRequestBudgetCents ?? 0));
  const estimatedCostCents = unitCostCents * requestUnits;
  const month = input.monthBucket ?? monthBucket(nowDate);
  const tenantId = cleanKey(input.tenantId ?? input.authContext?.userId ?? input.rateKey ?? defaultTenantId);
  const rateKey = cleanKey(input.rateKey ?? tenantId ?? defaultRateKey);
  const routeId = cleanKey(input.routeId ?? defaultRouteId);
  const flowId = cleanKey(flow.flowId ?? input.flowId ?? "unknown-flow");
  const idempotencyKey = cleanKey(input.idempotencyKey ?? `${flowId}-${rateKey}-${nowDate.getTime()}`);

  return {
    id: stableEventId("ai-reservation", tenantId, routeId, flowId, idempotencyKey, String(input.sequence ?? 0), String(requestUnits)),
    tenantId,
    userId: cleanKey(input.authContext?.userId ?? input.userId ?? tenantId),
    routeId,
    idempotencyKey,
    flowId,
    adapterId,
    provider: providerForAdapter(adapterId),
    capability: flow.capability ?? input.capability ?? "text-chat",
    requestUnits,
    rateKey,
    rateLimitPerMinute: Math.max(1, safeInteger(flow.rateLimitPerMinute, 1)),
    monthlyBudgetCents: Math.max(0, safeInteger(flow.monthlyBudgetCents, 0)),
    perRequestBudgetCents: Math.max(0, safeInteger(flow.perRequestBudgetCents, 0)),
    unitCostCents,
    estimatedCostCents,
    actualCostCents: input.actualCostCents,
    monthBucket: month,
    rateLimitWindowStartIso: minuteIso(nowDate),
    readyForLiveCalls: Boolean(flow.readyForLiveCalls),
    blockedReasons: Array.isArray(flow.blockedReasons) ? flow.blockedReasons.slice() : [],
    fallbackFromAdapterId: input.fallbackFromAdapterId,
    metadata: {
      ...(input.metadata ?? {}),
      flowLabel: flow.label,
      primaryAdapterId: flow.primaryAdapterId,
      fallbackAdapterId: flow.fallbackAdapterId,
      localAdapter
    }
  };
}

function buildProviderCallEvent({ reservation, status, actualCostCents, fallbackReason, errorClass, metadata = {} }) {
  return {
    id: stableEventId("provider-call", reservation.id, status, fallbackReason ?? ""),
    tenantId: reservation.tenantId,
    userId: reservation.userId,
    routeId: reservation.routeId,
    idempotencyKey: reservation.idempotencyKey,
    flowId: reservation.flowId,
    adapterId: reservation.adapterId,
    provider: reservation.provider,
    capability: reservation.capability,
    status,
    fallbackFromAdapterId: reservation.fallbackFromAdapterId ?? null,
    fallbackReason: fallbackReason ?? null,
    monthBucket: reservation.monthBucket,
    requestUnits: reservation.requestUnits,
    estimatedCostCents: reservation.estimatedCostCents,
    actualCostCents: Number.isFinite(actualCostCents) ? Math.max(0, Math.round(actualCostCents)) : null,
    rateLimitWindowStartIso: reservation.rateLimitWindowStartIso,
    latencyMs: null,
    errorClass: errorClass ?? null,
    piiFree: true,
    liveNetworkCall: !reservation.metadata.localAdapter,
    metadata: {
      ...reservation.metadata,
      costGateEvent: true,
      ...(metadata ?? {})
    }
  };
}

function blockedPayload(reservation, detail) {
  return {
    status: "cost-gate-blocked",
    retry_after_seconds: reservation.rateLimitPerMinute > 0 ? 60 : undefined,
    ai_flow: {
      [reservation.flowId.replace(/-/g, "_")]: {
        flow_id: reservation.flowId,
        adapter_id: reservation.adapterId,
        rate_limit_per_minute: reservation.rateLimitPerMinute,
        monthly_budget_cents: reservation.monthlyBudgetCents,
        per_request_budget_cents: reservation.perRequestBudgetCents,
        request_units: reservation.requestUnits,
        estimated_cost_cents: reservation.estimatedCostCents,
        provider_failure: detail
      }
    }
  };
}

function normalizeStatus(status) {
  if (["reserved", "succeeded", "failed", "blocked", "fallback-selected"].includes(status)) return status;
  return status === "success" ? "succeeded" : "failed";
}

function providerForAdapter(adapterId) {
  if (adapterId.startsWith("cloudflare-")) return "Cloudflare";
  if (adapterId.startsWith("openai-")) return "OpenAI";
  if (adapterId.startsWith("anthropic-")) return "Anthropic";
  if (adapterId.startsWith("google-")) return "Google";
  if (adapterId === "browser-svg-renderer") return "CustomCard renderer";
  if (adapterId === "deterministic-customer-chat") return "CustomCard deterministic";
  if (adapterId.includes("huggingface")) return "Hugging Face";
  if (adapterId.includes("mistral")) return "Mistral";
  if (adapterId.includes("groq")) return "Groq";
  if (adapterId.includes("together")) return "Together";
  if (adapterId.includes("deepseek")) return "DeepSeek";
  if (adapterId.includes("fireworks")) return "Fireworks";
  if (adapterId.includes("perplexity")) return "Perplexity";
  if (adapterId.includes("xai")) return "xAI";
  return "AI provider";
}

function rateBucketKey(reservation) {
  return `${reservation.flowId}:${reservation.rateKey}`;
}

function monthlyKey(reservation) {
  return `${reservation.tenantId}:${reservation.flowId}:${reservation.monthBucket}`;
}

function freshRateBucket(bucket, nowDate) {
  const nowMs = nowDate.getTime();
  return bucket.filter((timestamp) => nowMs - timestamp < 60_000);
}

function monthBucket(date) {
  return date.toISOString().slice(0, 7);
}

function minuteIso(date) {
  const copy = new Date(date);
  copy.setUTCSeconds(0, 0);
  return copy.toISOString();
}

function safeInteger(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function cleanKey(value) {
  return String(value ?? "").trim() || "unknown";
}

function stableEventId(...parts) {
  let seed = 2166136261;
  for (const char of parts.join("\n")) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return `${parts[0]}-${(seed >>> 0).toString(16).padStart(8, "0")}`;
}
