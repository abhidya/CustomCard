# Provider Worker HTTP Design

## Goal

The production host owns database credentials, object-store credentials, customer auth, and result serving. A machine-local provider worker owns local generation capability such as ComfyUI, but holds only a scoped provider token.

## Runtime Shape

```text
Customer browser
  -> POST /api/ai/card/generate

Production API
  -> validates customer session
  -> writes minimized job into api_jobs
  -> serves /api/ai/jobs/status
  -> persists generated artifacts to R2/object storage

Machine-local provider worker
  -> POST /api/provider/jobs/lease
  -> runs local ComfyUI/text provider
  -> POST /api/provider/jobs/:id/complete
```

The local worker does not need `DATABASE_URL`, `OBJECT_STORE_ACCESS_KEY_ID`, `OBJECT_STORE_SECRET_ACCESS_KEY`, or Clerk secrets.

## Packaging And Bootstrap

The provider client is intentionally separate from the Vercel production host.

Packaging:

- `npm run provider:setup` bootstraps this machine as a scoped provider.
- `npm run provider:status` prints local readiness plus side-effect-free queue metrics from prod.
- `npm run provider:doctor` prints the same checks and exits nonzero on blockers.
- `npm run provider:start` starts the long-running local provider worker.
- `npm run provider:once` leases at most one batch, processes it, and exits.
- `scripts/provider.ps1 status` is the Windows-friendly launcher; it falls back from npm to node and prints a clear Node/PATH blocker when neither is available.
- The low-level worker entrypoint remains `scripts/provider-http-worker.mjs` for debugging.

Bootstrap order:

1. Load local AI/provider env with `loadLocalAiEnvFiles()`.
2. Load provider-only env from `.env.provider.local`, `.env.local`, and `infra/env/.env`.
3. Resolve `CUSTOMCARD_PROVIDER_API_BASE_URL`.
4. Resolve local provider runtime, such as ComfyUI and local OpenAI-compatible LLM endpoints.
5. Validate the scoped provider token.
6. Check `/api/provider/jobs/status` without leasing work.
7. Poll `/api/provider/jobs/lease`.
8. Execute supported leased routes locally.
9. POST completion back to prod.

Recommended local env file:

```bash
# .env.provider.local
CUSTOMCARD_PROVIDER_API_BASE_URL=https://<your-production-vercel-domain>
CUSTOMCARD_PROVIDER_WORKER_TOKEN=<raw provider token>
CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS=ai-card-generate
CUSTOMCARD_WORKER_ID=manny-comfy-01
CUSTOMCARD_COMFYUI_URL=http://127.0.0.1:8188
```

For production operation on this computer, run `npm run provider:start` under a service manager such as Task Scheduler, NSSM, PM2, or a supervised PowerShell script. The process can be restarted safely because leases expire and stale running jobs are requeued by the API.

## Operator Commands

```bash
npm run provider:setup
npm run provider:doctor
npm run provider:status
npm run provider:start
```

`provider:setup` writes `.env.provider.local`, generates a raw local token if needed, stores only the SHA-256 token hash in Vercel when missing, and keeps the raw token local.

`provider:status` is safe to run repeatedly. It calls `GET /api/provider/jobs/status`, not the lease endpoint, so it does not accidentally claim work.

Available status metrics:

- `queued_total`
- `running_total`
- `stale_running_total`
- `succeeded_total`
- `dead_lettered_total`
- `oldest_queued_age_seconds`
- `max_active_attempt_count`
- `max_attempts`
- `last_succeeded_at`
- `last_dead_lettered_at`

## Auth Boundary

Provider routes use `Authorization: Bearer <provider-token>`.

Server env:

```bash
CUSTOMCARD_PROVIDER_WORKER_TOKEN_SHA256=<sha256 of local token>
CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS=ai-card-generate
CUSTOMCARD_PROVIDER_WORKER_LEASE_SECONDS=300
```

Local worker env:

```bash
CUSTOMCARD_PROVIDER_API_BASE_URL=https://<your-production-vercel-domain>
CUSTOMCARD_PROVIDER_WORKER_TOKEN=<raw provider token>
CUSTOMCARD_WORKER_ID=manny-comfy-01
```

`CUSTOMCARD_PROVIDER_WORKER_TOKEN` is also accepted on the server for simpler local drills, but the SHA-256 form is preferred for hosted production env.

## Lease Contract

`POST /api/provider/jobs/lease`

Request:

```json
{
  "worker_id": "manny-comfy-01",
  "routes": ["ai-card-generate"],
  "limit": 1
}
```

Behavior:

- Requeues expired running jobs using the provider lease TTL.
- Selects only queued jobs for allowed route ids.
- Uses `FOR UPDATE SKIP LOCKED`.
- Sets `status='running'`, `locked_by`, `locked_at`, and increments `attempt_count`.
- Returns a signed `lease_token` bound to job id, worker id, locked timestamp, and attempt count.

Response includes:

```json
{
  "leased": 1,
  "jobs": [
    {
      "job_id": "job-id",
      "route_id": "ai-card-generate",
      "payload": {},
      "lease_token": "hex-hmac",
      "lease_expires_at": "2030-01-01T00:05:00.000Z",
      "artifact_upload": {
        "mode": "api-complete-inline-data-url",
        "r2CredentialsExposed": false
      }
    }
  ]
}
```

The leased payload is the minimized queue payload. Customer auth session ids are scrubbed to `provider-lease`.

## Complete Contract

`POST /api/provider/jobs/:id/complete`

Success request:

```json
{
  "worker_id": "manny-comfy-01",
  "lease_token": "hex-hmac",
  "status": "succeeded",
  "result": {
    "status": "ai-result-ready",
    "routeId": "ai-card-generate",
    "httpStatusCode": 200,
    "payload": {
      "draft_id": "draft-id",
      "images": []
    }
  }
}
```

Failure request:

```json
{
  "worker_id": "manny-comfy-01",
  "lease_token": "hex-hmac",
  "status": "failed",
  "error": "ComfyUI unavailable"
}
```

Behavior:

- Verifies provider token route scope.
- Verifies the job is still running.
- Verifies `locked_by` matches `worker_id`.
- Verifies the signed `lease_token`.
- Rejects stale or mismatched leases.
- On success, prod persists generated image artifacts to R2/object storage and stores only compact result references in `api_jobs.result`.
- On failure, prod schedules retry or dead-letters based on `attempt_count` and `max_attempts`.

## R2 Upload Model

Current implementation: API-mediated persistence.

The worker returns generated image data in the completion result. The production API, which already has R2 credentials, persists those images via the existing object-store runtime. This keeps R2 credentials off the local machine.

Tradeoff: image bytes pass through the production API request body. This is acceptable for initial controlled ComfyUI runs, but it can hit serverless body limits with large or many images.

Next hardening step: direct signed R2 upload slots.

Target flow:

1. Worker leases a job.
2. Worker generates image metadata and asks complete for upload slots, or calls a future `/api/provider/jobs/:id/uploads` endpoint.
3. API returns short-lived signed `PUT` URLs scoped to object keys and content hashes.
4. Worker uploads bytes directly to R2.
5. Worker completes with object keys, byte lengths, MIME types, and content hashes.
6. API verifies object metadata and stores signed download references in the job result.

That future mode avoids DB credentials and R2 credentials on the local worker while keeping large image bytes off Vercel.

## Production Activation

On Vercel/prod:

```bash
CUSTOMCARD_PROVIDER_WORKER_TOKEN_SHA256=<sha256 token>
CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS=ai-card-generate
CUSTOMCARD_ARTIFACT_PERSISTENCE=enabled
OBJECT_STORE_URL=<r2 s3-compatible endpoint>
OBJECT_STORE_BUCKET=<bucket>
OBJECT_STORE_ACCESS_KEY_ID=<server-side writer key>
OBJECT_STORE_SECRET_ACCESS_KEY=<server-side writer secret>
OBJECT_STORE_PUBLIC_BASE_URL=<artifact public/read base>
OBJECT_STORE_SIGNING_SECRET=<32+ chars>
```

On this computer:

```bash
CUSTOMCARD_PROVIDER_API_BASE_URL=https://<your-production-vercel-domain>
CUSTOMCARD_PROVIDER_WORKER_TOKEN=<raw token>
CUSTOMCARD_WORKER_ID=manny-comfy-01
CUSTOMCARD_COMFYUI_URL=http://127.0.0.1:8188
CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID=local-openai-compatible-chat
CUSTOMCARD_LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1
npm run provider:start
```
