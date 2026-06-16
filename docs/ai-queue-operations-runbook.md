# AI queue operations

Source of truth: `src/aiQueueOperationsData.mjs`. Gate: `npm run ai:queue:doctor`.

## Design contract

All customer-facing AI flows enter through the API, write a minimized job into `api_jobs`, and return `202 queued` with `job_id`, `job_status_url`, and `retry_after_seconds`. The request path does not call live AI providers. The worker runs as a polling process with `npm run worker`, leases jobs from Postgres with `FOR UPDATE SKIP LOCKED`, uses server-owned provider config, records provider spend events, and writes compact results back to `api_jobs.result`.

Security invariants:

- `X-Idempotency-Key` is required for AI POST routes.
- `api_jobs.payload` stores only sanitized card/chat fields.
- Client `aiFlowConfig`, credentials, raw provider content, and inline generated image bytes are not persisted.
- `/api/ai/jobs/status` is scoped by `user_id`; customers cannot read another customer's job.
- Dead-letter review must treat payload/result as customer data even after redaction.

Availability invariants:

- Provider failures, missing credentials, cost-gate blocks, and disabled live-provider flags never synthesize local card/chat copy.
- When card-copy cannot be produced by a live provider, the result is `generated_by: user-content-only`: only sanitized user-entered fields may appear in card text fields, chat text is blank, and image generation is skipped.
- Worker retries are bounded by `max_attempts`, then terminally move to `dead_lettered`.
- Expired running leases requeue unless attempts are exhausted.
- Real orders remain disabled; live provider calls are server-gated and budget-gated.

## Worker pickup configuration

Run modes:

- `npm run worker` starts the long-running polling worker.
- `node scripts/worker.mjs --once` leases and processes one batch, then exits.
- `node scripts/worker.mjs --describe` prints readiness and exits without leasing work.

Environment:

- `CUSTOMCARD_API_RUNTIME=postgres` is required for execution.
- `DATABASE_URL` points at the durable Postgres database containing `api_jobs`.
- `CUSTOMCARD_WORKER_BATCH_SIZE` controls jobs leased per iteration; default `5`, range `1..25`.
- `CUSTOMCARD_WORKER_LEASE_SECONDS` controls stale-running requeue time; default `300`, range `30..3600`.
- `CUSTOMCARD_WORKER_RETRY_BACKOFF_SECONDS` controls retry delay after failure; default `60`, range `5..3600`.
- `CUSTOMCARD_WORKER_POLL_INTERVAL_MS` controls idle poll interval; default `5000`, range `250..60000`.
- `CUSTOMCARD_WORKER_ID` may pin a stable worker name; otherwise host and process id are used.

Provider fallback configuration:

- Flow config lives in `src/aiFlowConfigData.mjs` and is resolved server-side from provider credentials plus trusted Admin provider controls.
- Live calls require an Admin-enabled flow, allowed adapter, required credentials, positive rate limit, and non-negative budget.
- If card-copy provider config is missing, disabled, rate-limited, over budget, or fails during execution, the service returns user-content-only card fields and no images.
- If card-image provider config is missing, disabled, rate-limited, over budget, or fails after provider copy succeeds, the service returns provider-generated text-only card output with no local image substitute.
- If customer-chat provider config is missing, disabled, rate-limited, over budget, or fails, the service returns blank `assistant_message` with provider evidence.
- Fallback responses preserve `provider_failure`, `provider_call_events`, and `ai_cost_gate.blocked_reasons`; they do not silently hide provider failure evidence or invent local content.

Provider control plane:

- Runtime provider models, prompt profiles, route policies, benchmark runs, and benchmark grades are defined by `src/aiProviderControlPlane.ts` and persisted by `infra/migrations/005_ai_provider_control_plane.sql`.
- Workers must resolve route policy at lease time, not at customer request time, so admins can change provider/model/prompt settings without redeploying web code.
- `ai_route_policies.customer_error_policy` must remain `generic-status-only`; provider messages stay in admin evidence and never become customer-facing failure copy.
- `ai_route_policies.queue_required` must remain true for image-generation policies.
- `ai_benchmark_grades` is the promotion source of truth. DeepAI `text2img` standard currently has 66/100 product and 94/100 contract evidence, so it remains below the customer promotion gate even though the provider request contract is fixed.
- Run `npm run ai:control-plane:doctor` after provider catalog, prompt profile, route policy, benchmark grade, or promotion-gate edits.

## Metrics

| Metric | Source | Warn | Page | Owner |
| --- | --- | ---: | ---: | --- |
| `api_jobs_queued_total` | `api_jobs WHERE status='queued'` | 50 | 200 | operations |
| `api_jobs_oldest_queued_age_seconds` | oldest queued `created_at` age | 300 | 900 | operations |
| `api_jobs_stale_running_total` | running jobs older than worker lease | 1 | 3 | operations |
| `api_jobs_dead_lettered_total` | `api_jobs WHERE status='dead_lettered'` | 1 | 5 | human-ops |
| `provider_spend_budget_percent` | `provider_call_events` monthly ledger | 80 | 100 | finance-ops |

Alert payloads must include metric, threshold, route id if known, tenant/user hash if needed, and runbook link. They must not include prompt text, memory notes, provider credentials, generated image bytes, or raw provider responses.

## Human management

Dead-letter owner: support lead. Backup owner: worker on-call.

Dead-letter triage:

1. Confirm job belongs to requesting customer before discussing it.
2. Read `last_error`, `route_id`, `attempt_count`, and compact `result`; do not paste customer text into chat or tickets.
3. Classify root cause: provider outage, budget gate, payload validation, worker bug, or object-store persistence blocker.
4. If provider/budget related, keep live provider flags disabled and let user-content-only fallback continue.
5. Replay only after code/config fix and only with same idempotency context. Otherwise create a new customer-safe job.
6. Record audit note with job id, route id, root cause, action, owner, and retest command.

Customer support script:

> Your AI card request is safely queued. If it cannot finish, we keep your editable draft and route the job to support without exposing your private notes outside the service.

## Tracking and alerting

Track every incident with:

- job id
- route id
- status transition
- first detection metric
- owner
- customer impact
- mitigation
- replay decision
- follow-up issue

Page immediately when:

- oldest queued age reaches 900 seconds
- dead-letter count reaches 5
- stale running count reaches 3
- provider spend reaches 100 percent
- status endpoint leaks or returns another user's job

Warn but do not page when user-content-only fallback succeeds and customer keeps an editable draft.

## Operations commands

- `npm run ai:queue:doctor` validates this runbook, the source contract, API queue admission, worker retry/DLQ code, package script, and CI gate.
- `npm run worker` processes queued work with Postgres leases.
- `npm run api:doctor:postgres:live` verifies hosted Postgres migration/runtime integration when credentials are present.
- `npm run test -- --run src/aiQueueOperations.test.ts tests/worker-runtime.test.ts tests/api-server.test.ts` verifies queue contract behavior.

## Rollback

Fastest safe rollback is config-only:

1. Set live AI provider flags to false.
2. Keep API queue admission enabled so customers get queued acknowledgements and user-content-only fallback drafts.
3. Stop worker replicas if provider calls are causing spend or outage.
4. Leave `/api/ai/jobs/status` available for existing job visibility.
5. Re-enable workers after doctor/test pass and alert owner confirms queue age is falling.
