# Deployment Evidence

Date: 2026-06-03.

## Vercel

The repository was linked and deployed with the authenticated Vercel CLI account
`abhidya`.

Deployment:

- Project: `world-prize-s-projects/customcard`
- Deployment ID: `dpl_Gh1VhQEDsYh5wf7o3Pz27vJHFwy4`
- Deployment URL: `https://customcard-r7y10p8k9-world-prize-s-projects.vercel.app`
- Aliases:
  - `https://customcard-three.vercel.app`
  - `https://customcard-world-prize-s-projects.vercel.app`
  - `https://customcard-abhidya-world-prize-s-projects.vercel.app`
- Status from `vercel inspect`: `Ready`
- Target from `vercel inspect`: `production`
- Serverless function from `vercel inspect`: `api/[...path]`

Verification:

- Vercel build ran `npm run build` successfully.
- Public `GET /` returned HTTP 401 from Vercel deployment protection.
- Public `GET /api/health` returned HTTP 401 from Vercel deployment protection.
- Original `vercel env ls` reported no environment variables for the project.
- On 2026-06-11, `VITE_CLERK_PUBLISHABLE_KEY` was added to Production,
  Preview, and Development scopes for Clerk React auth.
- On 2026-06-12, `CLERK_JWT_KEY` and `CLERK_AUTHORIZED_PARTIES` were added to
  Production, Preview, and Development scopes for server-side Clerk session JWT
  verification. Real values are stored only in Vercel env / ignored local env,
  not in tracked docs.
- On 2026-06-11, Cloudflare Workers AI env vars were added to Production,
  Preview, and Development scopes: `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN`,
  `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`,
  `CLOUDFLARE_WORKERS_AI_TEXT_MODEL`, and
  `CLOUDFLARE_WORKERS_AI_IMAGE_MODEL`.
- Local live Cloudflare smoke checks using ignored `.env.local` returned HTTP
  200 for `@cf/meta/llama-3.2-3b-instruct` chat completions and HTTP 200 with a
  512x512 JPEG response for
  `@cf/bytedance/stable-diffusion-xl-lightning` image generation.
  This is historical smoke evidence; the current documented default text model
  is `@cf/meta/llama-3.1-8b-instruct-fast` because the live card-copy path uses
  JSON Schema response format support.

Conclusion:

The Vercel static/serverless deployment exists, but public route proof and
DB-backed API access are not yet complete. The production launch gate remains
evidence-missing until Vercel env vars include `CUSTOMCARD_API_RUNTIME=postgres`,
`DATABASE_URL`, customer/admin session tokens, deployment protection is bypassed
or disabled for verification, and a hosted DB doctor run is captured.

### 2026-06-11 Vercel + Neon Update

Deployment:

- Project: `world-prize-s-projects/customcard`
- Deployment ID: `dpl_HpqfqeQPNsm8XzVhschj9GfU3PhZ`
- Deployment URL:
  `https://customcard-jnz0dzq8b-world-prize-s-projects.vercel.app`
- Aliases:
  - `https://customcard-three.vercel.app`
  - `https://customcard-world-prize-s-projects.vercel.app`
  - `https://customcard-abhidya-world-prize-s-projects.vercel.app`
- Status from `vercel inspect`: `Ready`
- Target from `vercel inspect`: `production`
- Serverless functions from `vercel inspect`: `api/[...path]`,
  `api/admin/artifacts/bucket`, `api/admin/persistence-readiness`, and sibling
  nested API wrappers.

Environment:

- Vercel Marketplace Neon Free resource `customcard-postgres` was connected to
  the `customcard` project for Production.
- Production scope now includes `DATABASE_URL`, `POSTGRES_URL`,
  `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED`,
  and companion `PG*`/`POSTGRES_*` keys.
- Production scope now includes `CUSTOMCARD_API_RUNTIME`.
- Scoped key inventory is recorded in `docs/vercel-env-structure.md`.

Verification:

- Pulled Production env into `/tmp/customcard-vercel-production.env`, ran
  `CUSTOMCARD_ENV=production npm run migrate`, and deleted the temp env file.
- Migration runner applied `001_initial_schema.sql`; the repeat run returned
  `"applied":[]`.
- Public `GET /` returned HTTP 200.
- Public `GET /api/health` returned HTTP 200 with `runtime.mode=postgres`,
  `postgresConfigured=true`, `authEnforced=true`, `idempotencyEnforced=true`,
  object store configured, and no blockers.
- Public unauthenticated `GET /api/admin/artifacts/bucket` returned HTTP 401
  `auth-required`, proving the route now reaches the app runtime instead of a
  Vercel-level 404.
- Public unauthenticated `POST /api/calendar/connections/start` returned HTTP
  401 `auth-required`, proving the route now reaches the app runtime instead of
  the prior runtime-invalid 503.

Remaining boundary:

- Legacy Vercel bearer env tokens are not persisted as rows in the Postgres
  `auth_sessions` table. Authenticated admin/customer smoke probes still require
  real hosted sessions or an explicit reviewer-session seed flow.

## Cloud Artifact Handoff Proof

Date: 2026-06-07.

Repo-local proof captured in `stream/cloud-artifact-proof`:

- `npm test -- --run src/artifactStore.test.ts src/artifactHandoff.test.ts src/cloudArtifactProofReadiness.test.ts` passed with 13 focused tests.
- `npm run artifact:doctor` verifies local filesystem write/readback plus injected S3-compatible client semantics with `noNetwork: true`, `cloudWritesVerified: false`, and `liveProviderCalls: false`.
- `npm run cloud:doctor` verifies the static Terraform artifact-store contract for encrypted/versioned/private S3 storage, lifecycle retention, prefix-scoped writer IAM, and runtime env output shape.
- `npm run cloud:artifact:proof:doctor` verifies the executable readiness register still distinguishes repo-local source/readback proof from applied cloud evidence.

Boundaries:

- Local filesystem readback and injected S3-compatible readback prove artifact object keys, manifest storage, content hashes, signed handoff URLs, and real-order kill-switch preservation.
- These checks are not live-applied cloud bucket, IAM, signed URL GET, access-log, secret-manager sync, or restore-drill proof.
- `cloudWritesVerified` remains false for local and injected-client proof. It may only be claimed by an explicitly enabled live S3-compatible doctor run against real endpoint credentials.

Live-proof blockers:

- No `OBJECT_STORE_URL`, `OBJECT_STORE_BUCKET`, `OBJECT_STORE_REGION`, `OBJECT_STORE_ACCESS_KEY_ID`/`AWS_ACCESS_KEY_ID`, `OBJECT_STORE_SECRET_ACCESS_KEY`/`AWS_SECRET_ACCESS_KEY`, and production-grade `OBJECT_STORE_SIGNING_SECRET` evidence was attached in this worktree.
- No `terraform init`, reviewed `terraform plan`, `terraform apply`, `terraform output artifact_bucket_arn`, or `terraform output artifact_writer_policy_arn` transcript was attached.
- No production signed URL GET probe, expired URL rejection probe, bucket access log sample, denied insecure/unencrypted upload event, secret-manager env sync proof, or retention restore drill transcript was attached.
- `npm run artifact:doctor:s3:live` was intentionally not run unless live/local endpoint credentials were already present.
