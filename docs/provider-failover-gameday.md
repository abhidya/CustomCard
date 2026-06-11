# Provider failover game day

CustomCard keeps live provider traffic disabled by default, but production readiness still needs a rehearsed fallback path for AI text, AI image generation, observability, payments, notifications, and fulfillment providers. This runbook defines the repo-local game day that proves provider routing can fail closed, fall back, and leave an audit trail before any external provider key is allowed in production.

## Operating contract

- `src/providerOperations.ts` owns the deterministic provider failover decision.
- `provider_call_events` is the append-only spend and fallback ledger.
- `src/providerGovernance.ts` remains the source for monthly budget, per-request budget, queue, rate-limit, and ready-local fallback policy.
- `src/providerRuntime.ts` remains the no-network request contract builder; no operation may bypass `noNetwork: true` until a later launch gate explicitly replaces the contract executor.
- `npm run provider:operations:doctor` is the CI gate for this runbook.

## Required monitoring signals

- `provider.request.reserved`: emitted before a paid or credential-gated provider request would be attempted; reserves estimated budget.
- `provider.request.blocked`: emitted when a provider is skipped for missing credentials, safety gates, budget, rate limit, circuit state, or status.
- `provider.fallback.selected`: emitted when the system selects the ready-local fallback such as `browser-svg-renderer`.
- `provider.spend.budget_near_limit`: emitted by the monitoring layer when tenant or adapter spend reaches the warning threshold.
- `provider.spend.budget_exhausted`: emitted when the router returns `monthly-budget-exceeded`.
- `provider.rate_limited`: emitted when the router returns `rate-limit-exceeded`.
- `provider.circuit_open`: emitted when the router returns `circuit-open`.

All monitoring payloads must be metadata-only: adapter id, capability, tenant id, route id, status, fallback reason, request units, cost cents, month bucket, and idempotency key reference. Do not store prompts, generated images, raw customer text, provider tokens, or card payloads in monitoring events.

## Audit evidence

For each provider-affecting route, the reviewer should be able to join:

- API mutation idempotency record: `idempotency_keys`.
- Provider operation record: `provider_call_events`.
- Route audit record: `audit_log`.
- Queue record when applicable: `api_jobs`.
- Render or fulfillment artifact record when applicable: `render_packets`, `orders`, or `order_events`.

The provider ledger must keep `pii_free = TRUE` and `live_network_call = FALSE` until launch approval adds a separate live executor gate.

## Game-day scenarios

1. Missing provider key:
   - Remove `OPENAI_API_KEY`.
   - Run an image-generation plan with `openai-images` preferred.
   - Expected: router records `missing-credentials` and selects `browser-svg-renderer`.

2. Monthly budget exhausted:
   - Seed prior `provider_call_events` for the same tenant, adapter, and month until `openai-images` has only less than one panel request left.
   - Run a four-panel render plan.
   - Expected: router returns `monthly-budget-exceeded`, skips OpenAI, and either selects the next configured provider or local fallback.

3. Rate window exceeded:
   - Seed six recent one-unit events for an image provider with a `6/min` policy.
   - Run one more image request.
   - Expected: router returns `rate-limit-exceeded` and selects the next provider or local fallback.

4. Circuit opened:
   - Mark the primary adapter in `circuitOpenAdapterIds`.
   - Run a provider plan.
   - Expected: router returns `circuit-open` and does not produce a live request for the primary.

5. Idempotency replay:
   - Submit the same `render-packets` mutation twice with the same idempotency key.
   - Expected: second call replays the response and does not insert another `provider_call_events` row.

6. Appsec review:
   - Inspect event metadata and exported doctor output.
   - Expected: no secrets, prompts, generated image bytes, raw contact data, or payment/card data appear in the provider ledger or monitoring payloads.

## Stop conditions

- Any provider operation with `liveNetworkCall: true` or `live_network_call = TRUE` before launch approval is a blocker.
- Any provider operation without an idempotency or audit path is a blocker.
- Any spend event without `tenantId`, `monthBucket`, `adapterId`, and `estimatedCostCents` is a blocker.
- Any fallback event that stores raw prompt or generated image content is a blocker.
- Any failed game-day scenario must leave real provider calls disabled and route to the ready-local fallback.
