const localAdapterIds = new Set(["browser-svg-renderer", "deterministic-customer-chat"]);
const defaultTenantId = "anonymous";
const defaultRouteId = "ai-flow";
const defaultRateKey = "unknown";

export function createAiFlowCostGate({ store = createMemoryAiFlowCostStore(), now = () => new Date() } = {}) {
  return {
    async reserve(input) {
      const reservation = buildReservation(input, now());
      let outcome;
      try {
        outcome = await store.reserveWithChecks(reservation, {
          evaluate: (usage) => firstBlockedReason(reservation, usage),
          buildEvent: (blockedReason) =>
            blockedReason
              ? buildProviderCallEvent({
                  reservation,
                  status: "blocked",
                  fallbackReason: blockedReason.reason,
                  metadata: {
                    ...reservation.metadata,
                    costGateBlocked: true,
                    costGateReason: blockedReason.detail
                  }
                })
              : buildProviderCallEvent({ reservation, status: "reserved" })
        });
      } catch {
        // Fail closed: if the durable spend ledger is unreachable we refuse the
        // live call instead of allowing unaccounted provider spend.
        const blockedReason = {
          reason: "provider-unavailable",
          statusCode: 200,
          detail: `${reservation.flowId} cost ledger is unavailable; live provider call refused to keep spend accounted.`
        };
        outcome = {
          blockedReason,
          event: buildProviderCallEvent({
            reservation,
            status: "blocked",
            fallbackReason: blockedReason.reason,
            metadata: { ...reservation.metadata, costGateBlocked: true, costGateReason: blockedReason.detail }
          })
        };
      }

      if (outcome.blockedReason) {
        return {
          ok: false,
          reservation,
          event: outcome.event,
          statusCode: outcome.blockedReason.statusCode,
          fallbackReason: outcome.blockedReason.reason,
          providerFailure: outcome.blockedReason.detail,
          payload: blockedPayload(reservation, outcome.blockedReason.detail)
        };
      }

      return {
        ok: true,
        reservation,
        event: outcome.event
      };
    },

    async settle(reservation, result = {}) {
      const status = normalizeStatus(result.status);
      const event = buildProviderCallEvent({
        reservation,
        status,
        actualCostCents: result.actualCostCents,
        fallbackReason: result.fallbackReason,
        errorClass: result.errorClass,
        metadata: result.metadata
      });
      try {
        await store.appendEvent(event, reservation);
      } catch {
        // Settlement is bookkeeping after the spend decision; losing one event
        // must not fail the customer response.
      }
      return event;
    },

    async snapshot(input = {}) {
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

    /**
     * Check-and-reserve in one step. Synchronous JS makes this atomic per
     * process; the Postgres store provides the cross-instance equivalent.
     */
    reserveWithChecks(reservation, { evaluate, buildEvent }) {
      const usage = {
        monthlyReservedCents: this.monthlyReservedCents(reservation),
        rateUnitsInWindow: this.rateUsage(reservation, now())
      };
      const blockedReason = evaluate(usage);
      if (!blockedReason) this.reserve(reservation);
      const event = buildEvent(blockedReason);
      this.appendEvent(event);
      return { blockedReason, event };
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

/**
 * Durable cross-instance cost store backed by the provider_call_events table.
 *
 * Serverless deployments run one in-memory gate per instance, which caps
 * nothing platform-wide. This store makes reserve a single transaction —
 * advisory lock on (tenant, flow, month), sum reserved spend and the rolling
 * one-minute rate window, then insert the reserved/blocked event — so budgets
 * and rate limits hold across every instance that shares the database.
 */
export function createPostgresAiFlowCostStore({ getPool, now = () => new Date() } = {}) {
  if (typeof getPool !== "function") throw new Error("createPostgresAiFlowCostStore requires a getPool function.");

  async function insertEvent(executor, event, reservation) {
    await executor.query(
      `INSERT INTO provider_call_events (
         id, tenant_id, user_id, route_id, adapter_id, provider, capability, status,
         fallback_from_adapter_id, fallback_reason, month_bucket, request_units,
         estimated_cost_cents, actual_cost_cents, rate_limit_window_start,
         latency_ms, error_class, pii_free, live_network_call, metadata
       ) VALUES (
         $1, $2, (SELECT id FROM users WHERE id = $3), $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14, $15, $16, $17, TRUE, $18, $19::jsonb
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.tenantId,
        event.userId,
        event.routeId,
        event.adapterId,
        event.provider,
        event.capability,
        event.status,
        event.fallbackFromAdapterId,
        event.fallbackReason,
        event.monthBucket,
        event.requestUnits,
        event.estimatedCostCents,
        event.actualCostCents,
        event.rateLimitWindowStartIso,
        event.latencyMs,
        event.errorClass,
        event.liveNetworkCall,
        JSON.stringify({
          ...event.metadata,
          flowId: event.flowId,
          idempotencyKey: event.idempotencyKey,
          rateBucketKey: reservation ? rateBucketKey(reservation) : undefined
        })
      ]
    );
  }

  return {
    async reserveWithChecks(reservation, { evaluate, buildEvent }) {
      const pool = await getPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [monthlyKey(reservation)]);
        const monthly = await client.query(
          `SELECT COALESCE(SUM(estimated_cost_cents), 0)::int AS reserved_cents
             FROM provider_call_events
            WHERE tenant_id = $1 AND month_bucket = $2 AND status = 'reserved' AND metadata->>'flowId' = $3`,
          [reservation.tenantId, reservation.monthBucket, reservation.flowId]
        );
        const rate = await client.query(
          `SELECT COALESCE(SUM(request_units), 0)::int AS units
             FROM provider_call_events
            WHERE status = 'reserved' AND metadata->>'rateBucketKey' = $1
              AND created_at > NOW() - INTERVAL '60 seconds'`,
          [rateBucketKey(reservation)]
        );
        const usage = {
          monthlyReservedCents: monthly.rows[0]?.reserved_cents ?? 0,
          rateUnitsInWindow: rate.rows[0]?.units ?? 0
        };
        const blockedReason = evaluate(usage);
        const event = buildEvent(blockedReason);
        await insertEvent(client, event, reservation);
        await client.query("COMMIT");
        return { blockedReason, event };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },

    async appendEvent(event, reservation) {
      const pool = await getPool();
      await insertEvent(pool, event, reservation);
    },

    async snapshot({ flowId, tenantId = defaultTenantId, monthBucket: month = monthBucket(now()) } = {}) {
      const pool = await getPool();
      const result = await pool.query(
        `SELECT COALESCE(SUM(estimated_cost_cents), 0)::int AS reserved_cents, COUNT(*)::int AS event_count
           FROM provider_call_events
          WHERE tenant_id = $1 AND month_bucket = $2 AND status = 'reserved'
            AND ($3::text IS NULL OR metadata->>'flowId' = $3)`,
        [tenantId, month, flowId ?? null]
      );
      return {
        monthBucket: month,
        monthlyReservedCents: result.rows[0]?.reserved_cents ?? 0,
        eventCount: result.rows[0]?.event_count ?? 0
      };
    },

    events() {
      // The durable ledger lives in provider_call_events; per-request payloads
      // carry their own events, so there is no in-process backlog to expose.
      return [];
    }
  };
}

function firstBlockedReason(reservation, usage) {
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
  const projectedMonthlyCents = usage.monthlyReservedCents + reservation.estimatedCostCents;
  if (projectedMonthlyCents > reservation.monthlyBudgetCents) {
    return {
      reason: "monthly-budget-exceeded",
      statusCode: 200,
      detail: `${reservation.flowId} projected monthly spend ${projectedMonthlyCents}c exceeds monthly budget ${reservation.monthlyBudgetCents}c.`
    };
  }
  const projectedRate = usage.rateUnitsInWindow + reservation.requestUnits;
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
