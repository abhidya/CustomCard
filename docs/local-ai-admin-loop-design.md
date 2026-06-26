# Local AI Admin Loop Design

## Goal

Let an admin run the model-improvement loop from the admin surface while all model calls stay on this machine:

- text: LM Studio or KoboldCPP through the local OpenAI-compatible adapter
- images: local ComfyUI through the ComfyUI API adapter
- queue: `api_jobs`
- human review: admin must inspect results before benchmark promotion or model distillation

## UX Workflow

1. Admin opens the operational admin view.
2. Admin reviews local readiness: LLM URL/model, ComfyUI URL/checkpoint, queue backend, and human-review state.
3. Admin chooses a benchmark story.
4. Admin chooses one mode:
   - `Plan only`: create the exact queued payload and report files, no DB write.
   - `Queue`: insert sanitized jobs into `api_jobs` and write audit rows.
   - `Queue + run worker`: queue jobs, then run the local Comfy worker against those job IDs.
5. Admin inspects result paths, queued job IDs, worker results, generated artifacts, and benchmark aggregate.
6. Admin promotes only after manual review, aggregate score, copy fidelity, artifact quality, and rollback notes are attached.

## Route Contract

`POST /api/admin/local-ai-loop/run`

Required:

- `Authorization: Bearer <admin session>`
- `X-Idempotency-Key`
- body: `mode`, `stories`, optional `ensureUser`

Response includes:

- `localOnly`: local endpoint/model/checkpoint metadata
- `jobs`: summarized `api_jobs` insert plan with sanitized card body
- `queueResult`: dry-run/queued/blocked result
- `workerResult`: skipped/processed worker reports
- `report`: JSON and Markdown report paths
- `humanReview`: admin review next steps

## Safety Boundaries

- Rejects non-local LLM endpoints.
- Defaults ComfyUI to `http://127.0.0.1:8188`.
- Forces `local-openai-compatible-chat` and `local-comfyui-api-image`.
- Never accepts client AI provider credentials.
- Never accepts client `aiFlowConfig`.
- Queue payload is minimized and redacted.
- No real order or payment path is touched.
- Admin review is required before promotion.

## Data Written

Plan mode writes only evidence report files.

Queue modes can write:

- `users`: optional local admin-loop user when `ensureUser` is true
- `api_jobs`: queued `ai-card-generate` jobs
- `audit_log`: `local_ai_loop.job_queued`

Worker mode updates:

- `api_jobs.status`
- `api_jobs.result`
- `audit_log` job success/failure rows
- generated image artifacts through the existing worker persister when configured

## Benchmark Tracking

The report and queued metadata track:

- story ID and sanitized input body
- text adapter/model/base URL
- image adapter/checkpoint/workflow/Comfy URL
- run ID and code version
- technique list
- benchmark aggregate command
- model coverage command

## Productionization Gates

Before defaulting any model/checkpoint:

- run local benchmark aggregate
- attach manual grade
- attach artifact/contact-sheet proof
- inspect failure notes for text fidelity and image defects
- verify repeatability across more than one story
- document rollback to the previous default
- only distill from approved/licensed prompt-artifact pairs
