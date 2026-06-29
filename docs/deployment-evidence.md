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
- On 2026-06-12, `CLERK_JWT_KEY` and `CLERK_AUTHORIZED_PARTIES` were confirmed
  for Production and Development scopes for server-side Clerk session JWT
  verification.
- On 2026-06-15, redacted `npm run hosted:env:inventory` evidence was attached
  at `docs/evidence/hosted-api/2026-06-15-vercel-env-inventory.json`. Production
  contains `CUSTOMCARD_API_RUNTIME`, `DATABASE_URL`, `AUTH_SESSION_SECRET`,
  `CLERK_JWT_KEY`, and `CLERK_AUTHORIZED_PARTIES`, but is missing required
  `CLERK_ISSUER`, `CLERK_AUDIENCE`, and `IDEMPOTENCY_KEY_TTL_HOURS`. Hosted env
  sync remained incomplete until those keys were added and re-captured. Preview
  still needs a branch-scoped Vercel env add; the CLI rejected the unscoped
  Preview add because it requires a non-production branch. Real values are
  stored only in Vercel env / ignored local env, not in tracked docs.
- On 2026-06-15, redacted `npm run hosted:env:repair` plan evidence was attached
  at `docs/evidence/hosted-api/2026-06-15-vercel-env-repair-plan.json`. It did
  not mutate Vercel because `--apply` was not passed and no operator-supplied
  values were present for the three missing
  keys.
- On 2026-06-15, guarded partial repair evidence was attached at
  `docs/evidence/hosted-api/2026-06-15-vercel-env-repair-partial-ttl.json`.
  It applied only `IDEMPOTENCY_KEY_TTL_HOURS` to Production with values
  redacted, then remained blocked on `CLERK_ISSUER` and `CLERK_AUDIENCE`.
  Follow-up redacted inventory at
  `docs/evidence/hosted-api/2026-06-15-vercel-env-inventory-after-ttl-repair.json`
  confirms `IDEMPOTENCY_KEY_TTL_HOURS` is now present in Production and hosted
  env sync remains incomplete only on the two Clerk verifier keys.
- On 2026-06-15, guarded public Clerk config evidence was attached at
  `docs/evidence/hosted-api/2026-06-15-clerk-public-config-probe.json`.
  It fetched the production public app shell and JavaScript assets with values
  redacted. The deployed bundle currently contains a Clerk `pk_test`
  publishable key, contains no `pk_live` publishable key, and decodes to issuer
  candidate `https://model-bluejay-21.clerk.accounts.dev`. Production OAuth is
  not claimable until `VITE_CLERK_PUBLISHABLE_KEY` is replaced with a live Clerk
  publishable key, the app is redeployed, and this probe passes.
- On 2026-06-15, guarded Clerk config repair-plan evidence was attached at
  `docs/evidence/hosted-api/2026-06-15-clerk-config-repair-plan.json`.
  It did not mutate Vercel because apply was not enabled. It confirmed no live
  Clerk publishable key or `CLERK_AUDIENCE` value is available in the local
  process env, the current production public bundle still ships `pk_test`, and
  the repair plan must replace `VITE_CLERK_PUBLISHABLE_KEY`, add the derived
  `CLERK_ISSUER`, add `CLERK_AUDIENCE`, redeploy, and re-run the public config
  probe before production OAuth can be claimed.
- On 2026-06-15, guarded hosted DB restore-drill plan evidence was attached at
  `docs/evidence/hosted-api/2026-06-15-db-restore-drill-plan.json`. It did not
  connect to a database because no restored clone URL is available locally. It
  confirms the restore source, restore point, 14-day retention, 15-minute RPO,
  60-minute RTO, no destructive live mutations, no real orders, and the single
  remaining restore-drill input blocker: `CUSTOMCARD_RESTORE_DATABASE_URL`.
- On 2026-06-11, Cloudflare Workers AI env vars were added to Production,
  Preview, and Development scopes: `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN`,
  and `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`. Model selection is now stored in
  Admin Providers configuration, not env.
- Local live Cloudflare smoke checks using ignored `.env.local` returned HTTP
  200 for `@cf/meta/llama-3.2-3b-instruct` chat completions and HTTP 200 with a
  512x512 JPEG response for
  `@cf/bytedance/stable-diffusion-xl-lightning` image generation.
  This is historical smoke evidence; the current documented default text model
  is `@cf/meta/llama-3.1-8b-instruct-fast` because the live card-copy path uses
  JSON Schema response format support.

Conclusion:

The Vercel static/serverless deployment exists. This 2026-06-03 section is
historical; later evidence below supersedes the original deployment-protection
401 boundary. Public Vercel route and hosted Postgres runtime proof are now
attached, while production launch remains evidence-missing for live Clerk public
config, hosted Clerk JWT verification, authenticated DB-backed mutation replay,
hosted audit-row proof, and executed backup/restore policy.

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
