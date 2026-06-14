# AI queue operations

Source of truth: `src/aiQueueOperationsData.mjs`. Gate: `npm run ai:queue:doctor`.

## Design contract

All customer-facing AI flows enter through the API, write a minimized job into `api_jobs`, and return `202 queued` with `job_id`, `job_status_url`, and `retry_after_seconds`. The request path does not call live AI providers. The worker leases jobs from Postgres with `FOR UPDATE SKIP LOCKED`, uses server-owned provider config, records provider spend events, and writes compact results back to `api_jobs.result`.

Security invariants:

- `X-Idempotency-Key` is required for AI POST routes.
- `api_jobs.payload` stores only sanitized card/chat fields.
- Client `aiFlowConfig`, credentials, raw provider content, and inline generated image bytes are not persisted.
- `/api/ai/jobs/status` is scoped by `user_id`; customers cannot read another customer's job.
- Dead-letter review must treat payload/result as customer data even after redaction.

Availability invariants:

- Provider failures, missing credentials, cost-gate blocks, and disabled live-provider flags use deterministic fallback where possible.
- Worker retries are bounded by `max_attempts`, then terminally move to `dead_lettered`.
- Expired running leases requeue unless attempts are exhausted.
- Real orders remain disabled; live provider calls are server-gated and budget-gated.

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
4. If provider/budget related, keep live provider flags disabled and let fallback continue.
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

Warn but do not page when deterministic fallback succeeds and customer keeps an editable draft.

## Operations commands

- `npm run ai:queue:doctor` validates this runbook, the source contract, API queue admission, worker retry/DLQ code, package script, and CI gate.
- `npm run worker` processes queued work with Postgres leases.
- `npm run api:doctor:postgres:live` verifies hosted Postgres migration/runtime integration when credentials are present.
- `npm run test -- --run src/aiQueueOperations.test.ts tests/worker-runtime.test.ts tests/api-server.test.ts` verifies queue contract behavior.

## Rollback

Fastest safe rollback is config-only:

1. Set live AI provider flags to false.
2. Keep API queue admission enabled so customers get queued acknowledgements and editable fallback drafts.
3. Stop worker replicas if provider calls are causing spend or outage.
4. Leave `/api/ai/jobs/status` available for existing job visibility.
5. Re-enable workers after doctor/test pass and alert owner confirms queue age is falling.
