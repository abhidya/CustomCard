# Verification

This file captures the verification evidence for the current repo state. Update
it after each meaningful implementation pass.

## Verified Claims

- The web app builds with TypeScript and Vite.
- Domain tests cover storyboard coverage, weak extraction blocking, adapter
  gating, and architecture milestones.
- Service-kernel tests cover metadata-only imports, approved memory, card-project
  creation, print validation, order lifecycle transitions, regional policy, and
  runtime config.
- UI smoke tests exercise mobile horizontal overflow, the local auth -> import ->
  studio -> handoff workflow, customer/admin panels, no-network runtime
  readiness, adapter readiness, and the direct `/?view=mobile` browser route
  rendering the shared mobile customer snapshot instead of JSON, Expo manifest,
  or visible contract/debug panels when Chrome is available.
- Provider-catalog tests cover adapter capability breadth, explicit local adapters,
  external provider docs/env gates, admin/customer panel models, deterministic
  local chat, and blocked live-vendor status.
- Provider-runtime tests cover every catalog adapter with no-network dry runs,
  placeholder-secret rejection, redacted chat/image/notification/payment/
  observability request contracts, metadata-only event/contact import contracts,
  metadata-only CRM lifecycle and workflow-integration contracts, free local
  adapters, missing-source blocking for local import/export paths, and
  hard-blocked live vendor ordering.
- AI provider readiness tests and `npm run ai:doctor` cover text/image adapter
  inventory, local chat/render fallbacks, model allowlist gates, prompt and
  brand-safety review evidence, PII/memory minimization, image print QA, spend
  controls, evaluation fixtures, admin/API exposure, docs, CI wiring, and live
  provider calls plus production AI traffic held at zero.
- Observability readiness tests and `npm run observability:doctor` cover
  telemetry schema, PII redaction, sampling, retention, alert-route drill
  tracking, provider request contracts, admin/API exposure, docs, CI wiring,
  and live ingestion plus production alerts held at zero.
- Payment readiness tests and `npm run payment:doctor` cover the no-payment
  fallback, Stripe/PayPal/Square/Adyen sandbox provider contracts, idempotent
  checkout sessions, no-card-data storage, webhook signature verification, live
  charge/capture approval requirements, refund/void/dispute drills, settlement
  reconciliation, admin/API exposure, docs, CI wiring, and live charges,
  refunds, captures, external network calls, card data storage, and PCI approval
  claims held at zero.
- Printer-pricing tests and `npm run printer:pricing:doctor` cover 12
  review-only public Walgreens/CVS/FedEx/Walmart/Staples/Office Depot price
  observations, collection rules, 30-day freshness blocking, minimum quantity
  math, source URLs, coupon-provider feed adapters, rendered Walgreens/CVS
  print-link browser evidence, provider-portal proof import, manual
  confirmation, customer/API exposure, CI wiring, and `liveQuote: false`.
- Localization tests and `npm run localization:doctor` cover English (US),
  Spanish (US), Urdu, and Arabic customer/admin/API/mobile readiness, complete
  message bundles, RTL layout-review gates, human copy-review gates, CI wiring,
  and `liveTranslationProvider: false`.
- Capacity profile tests and `npm run capacity:doctor` cover local-dev,
  cheap-droplet, cloud-native, and SaaS-scale planning profiles, queue and
  object-store posture, the shared executable data in `src/capacityPlanData.mjs`,
  admin/API visibility, docs, CI wiring, and disabled live provider calls plus
  real orders. The profile numbers are planning limits, not measured production
  benchmarks.
- Print-export tests cover local source SVG files, a combined 5x7 PDF proof,
  checksum manifest validation, preflight failure paths, and no-network/no-order
  summary behavior.
- Artifact-handoff tests cover HMAC-signed URLs, object-store URI construction,
  config validation, expiry limits, and tamper detection.
- Artifact-store tests and `npm run artifact:doctor` write every render-packet
  artifact to a temporary local filesystem object-store path and an injected
  S3-compatible client contract, read the files back, verify byte lengths and
  content hashes, store the handoff manifests, and keep network calls plus real
  orders disabled.
- `npm run artifact:doctor:s3:live` writes the same render-packet package to a
  live S3-compatible endpoint such as MinIO with path-style SigV4 requests,
  reads every object back, verifies checksums, writes the manifest, cleans up the
  isolated bucket, and keeps external vendor calls plus real orders disabled.
- Provider adapter coverage currently includes 130 adapters: 16 ready-local, 98
  credential-gated, 10 contract-only, and 6 blocked.
- Production readiness tests cover 13 launch gates for live auth, OAuth,
  AI/image generation, vendor quotes, payments/refunds, direct retail ordering,
  telemetry, applied bucket/IAM proof, deployed Postgres API, Vercel DB access,
  signed native mobile proof, external audits, and physical print
  certification; `liveEnabled` remains 0.
- Domain and service tests exercise source extraction, weak-input blocking, raw
  content rejection, and unsafe lifecycle rejection.
- Infra contract tests inspect database migration, Docker Compose, Kubernetes,
  env examples, runtime checks, CI workflow gates, coverage scope, and the
  mobile shell/customer contract boundary.
- Mobile contract tests cover the Expo customer experience model: Google/Apple
  entry points, calendar/email/invite import actions, next-action summary, card
  queue items, approval controls, memory review items, print-proof checks,
  local chat, card proof path, best available fulfillment recommendations,
  offline idempotent sync, locale readiness, checkout confirmation, and
  real-order kill-switch doctor behavior.
- Agent-contract tests cover the typed orchestration surface and fail-closed
  default policy.
- API-contract and API-server tests cover `/api/health`, customer/admin
  bootstrap, mobile bootstrap with next-action, queue, memory-review,
  print-proof, pricing, and offline-sync state,
  provider readiness, idempotent mutation contracts,
  explicit contract/memory runtime modes, memory-mode Bearer session gates,
  repository-backed `/api/memories/review`, `/api/render-packets`,
  `/api/import-preview`, server-owned `/api/calendar/connections/start`, and
  `/api/card-projects` mutation behavior, including
  fail-closed `/api/import-preview` validation for explicit `sourceKind` plus
  either metadata-only event fields (`metadataOnlyPayload.title`,
  `metadataOnlyPayload.recipientName`, and `metadataOnlyPayload.startsAt`) or
  server-parsed raw invite/ICS text (`rawImportText`, `rawInviteText`,
  `rawIcsText`, or `rawCalendarText`), plus fail-closed required-field
  validation for non-import repository routes: render packets require `projectId`, card
  projects require `opportunityId` and `recipientName`, memory review requires
  `recipientName`, reviewed text, and an explicit decision, manual printer
  handoff requires project/render/store/approval fields, and data requests
  require request type, region, and customer confirmation. Tests also cover
  customer pricing preview, `X-Idempotency-Key` replay/conflict behavior,
  404/405 behavior, and the no-live-call/no-real-order posture.
- `npm run api:doctor:postgres:live` covers route-scoped Postgres session
  verification for all 6 repository-backed customer routes, admin readiness
  authorization, wrong-role blocking, and the same idempotency/repository
  mutation paths against an isolated real `pg` database.
- `npm run api:doctor:postgres:http` starts the real API server in Postgres
  mode against an isolated migrated database, verifies public health/routes,
  admin/customer Bearer auth, wrong-role and missing-auth blocks, missing
  idempotency blocking, all 6 repository-backed customer HTTP mutations,
  idempotency replay/conflict behavior, audit rows, queue jobs, and repository
  table counts.
- Account-auth tests and `npm run account:doctor:live` cover hosted auth adapter
  requirements, durable account identity storage, no raw provider profiles,
  provider-subject uniqueness, hashed expiring recovery challenges, durable
  sessions, and recovery audit rows.
- Persistence-contract tests and `npm run persistence:doctor` cover auth-session
  schema, account identity/recovery schema, idempotency replay state, queue job
  envelopes, relationship-memory repository signals, render-packet repository
  signals, import-preview event/opportunity repository signals, card-project
  repository signals, append-only audit contracts, demo reset mappings,
  server-backed draft-state routes, and 14 idempotent API mutation mappings.
- Provider-governance tests and `npm run provider:governance:doctor` cover
  adapter budget ceilings, per-request caps, rate limits, queue posture, ready
  local fallback coverage, blocked live-vendor zero-spend posture, admin/API
  surfaces, CI wiring, and no live network or real-order defaults.
- Demo seed tests and `npm run demo:doctor` cover deterministic reviewer reset
  fixtures, SQL preview, signed artifact handoff references, and no-live-call
  safety gates.
- Deployment readiness is checked by `npm run deployment:doctor`, which emits a
  JSON report for local-dev, cheap-droplet, cloud-native, cloud-storage,
  Vercel, runtime, and data lanes.
- Vercel deployment evidence exists for project
  `world-prize-s-projects/customcard`, deployment
  `dpl_Gh1VhQEDsYh5wf7o3Pz27vJHFwy4`, and serverless function
  `api/[...path]`. On 2026-06-11, Vercel + Neon production evidence showed
  public `/` and `/api/health` returning HTTP 200, `/api/health` reporting
  `runtime.mode=postgres`, and protected admin routes reaching app-level
  `401 auth-required` responses. On 2026-06-15, public probes against
  `https://customcard-three.vercel.app` reconfirmed those public route and
  hosted Postgres runtime boundaries in
  `docs/evidence/hosted-api/2026-06-15-public-route-probes.md`.
- Hosted API proof readiness is checked by `npm run hosted:api:doctor`, which
  verifies the 8-item Vercel/hosted DB proof register, serverless source
  contract, hosted env requirements, the guarded `npm run hosted:env:inventory`
  QA/production redacted Vercel env inventory command, the guarded `npm run
  hosted:clerk:public-config` public bundle probe, the guarded `npm run
  hosted:clerk:repair` redacted Clerk config repair plan/apply command, the
  guarded `npm run hosted:auth:probe` QA/production Clerk route-probe command, deployment
  evidence boundary, admin/API surfaces, docs, CI wiring, 2 attached live
  public/hosted-DB proof items, hosted Postgres runtime proof is attached, 2
  partial live proof items, and a redacted Vercel production env inventory that
  proves `CLERK_ISSUER`, `CLERK_AUDIENCE`, and `IDEMPOTENCY_KEY_TTL_HOURS` are
  missing. A redacted `hosted:env:repair` plan is attached and confirms those
  three values were not supplied in plan mode. A guarded partial repair then
  applied `IDEMPOTENCY_KEY_TTL_HOURS`; follow-up redacted inventory confirms
  that key is now present and only `CLERK_ISSUER` plus `CLERK_AUDIENCE` remain
  missing. Guarded public Clerk config evidence confirms the production public
  bundle currently ships a redacted Clerk `pk_test` publishable key, no
  `pk_live` publishable key, and issuer candidate
  `https://model-bluejay-21.clerk.accounts.dev`. Hosted env sync, production
  public Clerk config, and hosted Clerk JWT verification remain unclaimed. The
  guarded `hosted:clerk:repair` plan evidence confirms no local `pk_live`
  publishable key or `CLERK_AUDIENCE` value is available, and the repair path is
  to replace `VITE_CLERK_PUBLISHABLE_KEY`, add the derived `CLERK_ISSUER`, add
  `CLERK_AUDIENCE`, redeploy, and re-probe.
  The guarded `npm run hosted:mutation:probe` command is also scripted for
  hosted render-packet mutation, idempotency replay/conflict, and audit-counter
  proof, but not yet executed against QA/production. The guarded
  `npm run hosted:rollback:plan:doctor` command validates the attached
  forward-only migration and restore-switch rollback plan without claiming live
  rollback execution. The guarded `npm run
  hosted:db:restore:drill` command is scripted for restored-clone schema,
  index, table-read, retention, RPO, and RTO proof. Guarded blocked
  restore-drill plan evidence is attached at
  `docs/evidence/hosted-api/2026-06-15-db-restore-drill-plan.json`; it records
  restore source, restore point, retention, RPO, RTO, and no live mutations,
  while remaining blocked on `CUSTOMCARD_RESTORE_DATABASE_URL`.
  Backup policy proof, live provider calls, and real-order claims also remain
  zero.
- Reviewer DB seed readiness is checked by `npm run reviewer:db:seed:doctor`,
  which verifies the 8-item reviewer seed proof register, deterministic seed
  plan, 14-table fixture coverage, customer/admin local static-token contract, SQL
  preview safety, hosted migration/env/probe evidence gaps, rollback drill
  requirements, admin/API surfaces, docs, CI wiring, and zero hosted seed proof,
  hosted static-token proof, Vercel env proof, destructive live mutations, live
  provider calls, live external network calls, or real orders.
  It is not hosted reviewer DB mutation or hosted Clerk JWT proof.
- Business engagement readiness is checked by `npm run business:engagement:doctor`,
  which verifies the 8-item CRM lifecycle engagement register, CSV plus popular
  CRM contracts, workflow payload contracts, customer message channel contracts,
  lifecycle trigger coverage, admin/API surfaces, docs, CI wiring, and zero live
  customer messages, CRM writes, live external network calls, or real orders.
  It is not live CRM OAuth, customer messaging, CRM writeback, or production
  campaign analytics proof.
- Admin operations workflow is checked by `npm run admin:operations:doctor`,
  which verifies owner-lane coverage for identity/access, provider
  integrations, commerce/fulfillment, platform infrastructure, and
  observability/audit; credential-vault evidence; hosted Clerk token proof;
  alert-route drill; incident-review runbook; admin UI exposure; docs; CI
  wiring; and zero live production enablement. It is not a deployed admin
  account workflow, credential vault execution, or live launch approval.
- Cloud artifact IaC is checked by `npm run cloud:doctor`, which statically
  verifies `infra/aws/artifact-store` for private S3 bucket posture, encryption,
  versioning, lifecycle cleanup, HTTPS/encrypted-upload bucket policy, scoped
  app/worker writer IAM, safe defaults, and runtime env outputs without live
  cloud calls.
- Cloud artifact proof readiness is checked by
  `npm run cloud:artifact:proof:doctor`, which verifies the 8-item applied cloud
  artifact proof register, Terraform artifact-store source coverage, runtime
  env-output coverage, applied bucket ARN/IAM policy/signed URL/access-log/
  secret-sync/restore-drill evidence requirements, admin/API surfaces, docs, CI
  wiring, and zero Terraform apply, applied bucket proof, IAM proof, signed URL
  proof, access-log proof, secret-sync proof, restore-drill proof, live provider
  calls, live external network calls, or real orders. It is not live-applied
  cloud bucket/IAM proof.
- Security/privacy/accessibility baseline is checked by `npm run
  security:doctor`, which statically verifies API security headers, CSP
  no-frame/no-plugin/no-eval posture, non-root/container-hardened deployment
  manifests, raw-content storage blocks, signed-artifact share controls, and
  app-shell landmarks/skip-link behavior while reporting that no external audit
  or legal review is claimed.
- Same-origin AI chat/card generation routes are customer-session API routes,
  not public provider relays. Tests cover missing/wrong-role auth blocking,
  server-owned AI flow configuration by default, and live-provider opt-in only
  through explicit server configuration.
- External audit readiness is checked by `npm run external:audit:doctor`, which
  verifies the 15-item launch evidence register, production-gate mappings,
  admin/API surfaces, CI wiring, no public production claims, and no attached
  external audit artifacts. It is not an external audit report.
- End-to-end coverage readiness is checked by `npm run e2e:coverage:doctor`,
  which verifies the 29-item repo-local matrix, backing browser/API/mobile/infra
  tests, admin/API surfaces, CI wiring, 100% repo-local coverage, and zero live
  production proofs, real orders, or live external network requirements.
- AI provider readiness is checked by `npm run ai:doctor`, which verifies the
  8-item text/image provider readiness register, 16 text provider contracts, 18
  image provider contracts, 0 local fallbacks, prompt/human-review gates,
  admin/API surfaces, docs, CI wiring, and zero live provider calls, production
  AI traffic, or live external network requirements.
- Observability readiness is checked by `npm run observability:doctor`, which
  verifies the 7-item telemetry and alerting readiness register, provider
  runtime contracts, admin/API surfaces, docs, CI wiring, and zero live
  ingestion, production alerts, or live external network requirements.
- Payment readiness is checked by `npm run payment:doctor`, which verifies the
  8-item payment readiness register, 4 sandbox payment provider contracts,
  1 no-payment fallback, 23 ledger events, admin/API surfaces, docs, CI wiring,
  and zero live charges, refunds, captures, external network calls, stored card
  data, or PCI approval claims.
- Mobile render readiness is checked by `npm run mobile:render:doctor`, which
  verifies the 8-item mobile render readiness register, 21 screen sections, 4
  viewport profiles, 3 native build profiles, 11 evidence artifacts including a
  tooling-free iOS Release simulator home screenshot plus compact, standard,
  large, and tablet Release viewport screenshots plus a guarded stale
  native-install proof and a fresh exported iOS JS bundle proof, admin/API
  surfaces, docs, CI wiring, and zero full emulator render proof claims, signed
  artifact claims, live provider calls, external network calls, or real orders.
  It is not a full emulator render proof matrix or signed native build.
- `npm run mobile:release:doctor` covers the Expo/EAS native release contract:
  iOS/Android identifiers, development/preview/production build profiles,
  environment-sourced API URL, disabled real-order kill switch, and no hardcoded
  production API endpoint.
- Coverage is measured for core, API, artifact handoff/store, payment readiness,
  cloud artifact proof readiness, mobile render readiness, hosted API proof
  readiness, localization, pricing, print export, persistence, orchestration,
  and mobile contract modules with V8 thresholds enforced by `npm run check`: 90%
  statements, 80% branches, 90% functions, and 90% lines.
- CI verification is defined in `.github/workflows/verify.yml` for pushes to
  `main` and pull requests.
- Runtime doctor fails closed on missing or placeholder required environment
  variables.
- Real ordering remains disabled.
- Free local MVP workflow renders in desktop and mobile visual checks.
- Customer/admin panels render without horizontal overflow in desktop and mobile
  visual checks.

## Fresh Commands To Run

```sh
npm run check
npm run deployment:doctor
npm run cloud:doctor
npm run cloud:artifact:proof:doctor
npm run api:doctor
npm run security:doctor
npm run external:audit:doctor
npm run e2e:coverage:doctor
npm run payment:doctor
npm run mobile:render:doctor
npm run hosted:api:doctor
npm run hosted:rollback:plan:doctor
CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:env:inventory -- --confirm-hosted-env-inventory
CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:env:repair -- --confirm-hosted-env-repair
CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:clerk:public-config -- --confirm-hosted-clerk-public-config-probe
CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:clerk:repair -- --confirm-hosted-clerk-config-repair
CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app CUSTOMCARD_HOSTED_CUSTOMER_JWT=... CUSTOMCARD_HOSTED_ADMIN_JWT=... npm run hosted:auth:probe -- --confirm-hosted-auth-probe
CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app CUSTOMCARD_HOSTED_CUSTOMER_JWT=... CUSTOMCARD_HOSTED_ADMIN_JWT=... npm run hosted:mutation:probe -- --confirm-hosted-mutation-probe --acknowledge-live-writes
CUSTOMCARD_RESTORE_DATABASE_URL=postgres://... CUSTOMCARD_RESTORE_SOURCE=neon-branch CUSTOMCARD_RESTORE_POINT_IN_TIME=2026-06-15T14:00:00.000Z CUSTOMCARD_BACKUP_RETENTION_DAYS=14 CUSTOMCARD_BACKUP_RPO_MINUTES=15 CUSTOMCARD_BACKUP_RTO_MINUTES=60 npm run hosted:db:restore:drill -- --confirm-hosted-db-restore-drill
npm run reviewer:db:seed:doctor
npm run business:engagement:doctor
npm run admin:operations:doctor
npm run provider:governance:doctor
npm run capacity:doctor
npm run printer:pricing:doctor
npm run localization:doctor
npm run api:doctor:memory
npm run api:doctor:postgres
DATABASE_URL=postgres://... npm run api:doctor:postgres:live
DATABASE_URL=postgres://... npm run api:doctor:postgres:http
DATABASE_URL=postgres://... npm run account:doctor:live
npm run artifact:doctor
OBJECT_STORE_URL=http://127.0.0.1:9000 OBJECT_STORE_BUCKET=customcard-ci-artifacts OBJECT_STORE_ACCESS_KEY_ID=customcard OBJECT_STORE_SECRET_ACCESS_KEY=customcard-dev-only OBJECT_STORE_REGION=us-east-1 OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run artifact:doctor:s3:live
npm run persistence:doctor
npm run demo:doctor
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 npm --prefix apps/mobile run doctor
npm run mobile:release:doctor
```

## Latest Result

Last run: 2026-06-04.

```text
npm run check
```

Result: passed.

- Vitest: 35 test files passed, 199 tests passed.
- Coverage: 33 core/API/persistence/infra/mobile test files passed, 190 tests passed; V8 report measured
  92.73% statements, 86.97% branches, 98% functions, and 95.7% lines across
  `apps/mobile/src/customerExperience.ts`, `src/accountAuth.ts`, `src/agentContracts.ts`,
`src/aiProviderReadiness.ts`, `src/aiProviderReadinessData.mjs`,
`src/apiContracts.ts`, `src/artifactHandoff.ts`, `src/artifactStore.ts`,
  `src/businessEngagementReadiness.ts`, `src/businessEngagementReadinessData.mjs`,
  `src/capacityPlan.ts`, `src/capacityPlanData.mjs`,
  `src/cloudArtifactProofReadiness.ts`,
  `src/cloudArtifactProofReadinessData.mjs`, `src/customerChat.ts`, `src/domain.ts`,
  `src/e2eCoverage.ts`, `src/e2eCoverageData.mjs`,
  `src/externalAuditReadiness.ts`, `src/externalAuditReadinessData.mjs`,
  `src/freeMvp.ts`, `src/localization.ts`, `src/observabilityReadiness.ts`,
  `src/observabilityReadinessData.mjs`, `src/paymentReadiness.ts`,
  `src/paymentReadinessData.mjs`, `src/mobileRenderReadiness.ts`,
  `src/mobileRenderReadinessData.mjs`, `src/hostedApiReadiness.ts`,
  `src/hostedApiReadinessData.mjs`, `src/reviewerDbSeedReadiness.ts`,
  `src/reviewerDbSeedReadinessData.mjs`, `src/retailFulfillmentReadiness.ts`,
  `src/retailFulfillmentReadinessData.mjs`,
  `src/persistenceContracts.ts`, `src/printerPricing.ts`, `src/printExport.ts`,
  `src/providerCatalog.ts`, `src/providerGovernance.ts`,
  `src/providerRuntime.ts`, and `src/serviceKernel.ts`.
- Build: `tsc -b && vite build` passed.
- Audit: `npm audit --audit-level=high` found 0 vulnerabilities.

```text
npm run deployment:doctor
```

Result: passed. The JSON report marked local-dev, cheap-droplet, cloud-native,
cloud-storage, runtime, and data lanes `ready` with 22 deployment checks passed
and no blockers.

```text
npm run cloud:doctor
```

Result: passed. The JSON report marked bucket, policy, IAM, inputs, outputs,
and safety lanes `ready`; it verified the static AWS artifact-store module
without live cloud calls or real orders.

```text
npm run cloud:artifact:proof:doctor
```

Result: passed. The JSON report marked register, tests, Terraform,
object-store, surfaces, E2E, docs, CI, coverage, and evidence lanes `ready`; it
verified 8 cloud artifact proof readiness items, 2 repo-local-ready contracts,
6 applied-cloud evidence gaps, 3 Terraform file contracts, 6 runtime env-output
contracts, zero Terraform apply executions, zero applied bucket ARN proofs, zero
IAM policy output proofs, zero signed URL probe proofs, zero access-log proofs,
zero secret-sync proofs, zero restore-drill proofs, zero live provider calls,
zero live external network calls, and zero real orders. It is not live-applied
cloud bucket/IAM proof.

```text
npm run security:doctor
```

Result: passed. The JSON report marked security, privacy, accessibility, and CI
lanes `ready`; it verified the API security header/CSP baseline,
non-root/container-hardened deployment manifests, raw-content storage blocks,
signed-artifact share controls, app-shell landmarks, skip-link focus behavior,
and no live provider calls or real orders. It explicitly reported no external
audit or legal review claim.

```text
npm run external:audit:doctor
```

Result: passed. The JSON report marked register, launch-gates, tests, surfaces,
docs, CI, and safety lanes `ready`; it verified 15 external evidence items,
15 production-blocking gaps, zero public production claims, zero attached
external audit artifacts, admin/API surfaces, documentation signals, CI wiring,
and the explicit "not an external audit report" boundary.

```text
npm run e2e:coverage:doctor
```

Result: passed. The JSON report marked matrix, surfaces, tests, docs, CI, and
safety lanes `ready`; it verified 29 repo-local journeys, 100% repo-local
coverage, 29 CI-gated coverage items, admin/API surfaces, backing browser/API/
mobile/infra test files, documentation signals, zero live production proofs,
zero real orders, and zero live external network requirements.

```text
npm run ai:doctor
```

Result: passed. The JSON report marked register, provider-contracts, surfaces,
docs, CI, and evidence lanes `ready`; it verified 8 AI readiness items, 16 text
provider contracts, 18 image provider contracts, 0 local fallbacks, 6 prompt
audit gates, 5 human-review gates, zero live provider calls, zero production AI
traffic, and zero live external network requirements.

```text
npm run observability:doctor
```

Result: passed. The JSON report marked register, provider-runtime, surfaces,
docs, CI, and evidence lanes `ready`; it verified 7 telemetry/alerting readiness
items, 6 observability provider contracts, 4 alert-route-required controls, zero
live ingestion, zero production alerts, and zero live external network
requirements.

```text
npm run payment:doctor
```

Result: passed. The JSON report marked register, provider-contracts, surfaces,
docs, CI, and evidence lanes `ready`; it verified 8 payment readiness items, 4
sandbox payment provider contracts, 1 no-payment fallback, 23 ledger events,
zero live charges, zero live refunds, zero live captures, zero external network
calls, zero stored card data, and zero PCI approval claims.

```text
npm run mobile:render:doctor
```

Result: passed. The JSON report marked register, tests, mobile-source,
native-profiles, surfaces, docs, CI, and evidence lanes `ready`; it verified 8
mobile render readiness items, 21 screen sections, 4 viewport profiles, 3 native
build profiles, 11 evidence artifacts, zero full emulator render proof claims,
zero signed artifact claims, zero live provider calls, zero external network
calls, and zero real orders.

```text
npm run hosted:api:doctor
```

Result: passed. The JSON report marked register, tests, vercel-source,
hosted-env, hosted-auth, hosted-mutation, backup-policy, surfaces, deployment-evidence, docs, CI, and evidence lanes
`ready`; it verified 8 hosted API proof readiness items, 5 hosted-DB-required
items, 5 route contracts, 13 required hosted env vars, 2 live proof-attached
items, 2 partial live proof items, 2 hosted evidence gaps, 10 hosted evidence
artifact refs, 2 hosted DB proof claims, 2 public route proof claims, 1
deployment-protection bypass/public probe claim, redacted Vercel production env
inventory evidence showing `CLERK_ISSUER`, `CLERK_AUDIENCE`, and
`IDEMPOTENCY_KEY_TTL_HOURS` missing, redacted Vercel env repair-plan evidence
showing no values supplied and no apply performed, guarded partial repair
evidence showing `IDEMPOTENCY_KEY_TTL_HOURS` applied, follow-up redacted
inventory showing only `CLERK_ISSUER` and `CLERK_AUDIENCE` missing, guarded
public Clerk config evidence showing the production public bundle ships a
redacted `pk_test` key and no `pk_live` key, guarded restore-drill plan
evidence showing retention/RPO/RTO metadata and the missing restored clone URL
input, the guarded
`hosted:env:inventory` script for redacted QA/production Vercel env key
inventory, the guarded `hosted:env:repair` plan/apply script, the guarded
`hosted:clerk:public-config` script for redacted QA/production public Clerk
publishable-key proof, the guarded `hosted:clerk:repair` script for redacted
Clerk public/server config repair planning and apply, the guarded
`hosted:auth:probe` script for QA or
production Clerk JWT route proof, the
guarded `hosted:mutation:probe` script for hosted mutation/audit/idempotency
proof, the guarded `hosted:db:restore:drill` script for restored-clone schema,
index, table-read, retention, RPO, and RTO proof, and the guarded
`hosted:rollback:plan:doctor` script for the attached forward-only migration
rollback plan, zero env sync proof claims, zero executed hosted Clerk JWT
verification proof claims, zero executed hosted mutation/audit proof claims,
zero executed hosted restore-drill or rollback drill proof claims, zero backup
policy claims, zero live provider calls, zero external network calls, and zero
real orders.

```text
npm run hosted:rollback:plan:doctor
```

Result: passed. The JSON report marked plan, migration-runner, restore-drill,
env-inventory, readiness, and schema lanes `repo-consistent`; it verified the
attached hosted migration rollback plan, transactional forward-only migration
runner, restored-clone guardrails, redacted env inventory guardrails,
rollback-evidence requirements without backup-policy proof claims, audit/privacy/
idempotency schema retention, zero hosted rollback execution, zero restored-clone
switch execution, zero destructive live mutations, zero live provider calls, and
zero real orders.

```text
npm run reviewer:db:seed:doctor
```

Result: passed. The JSON report marked register, tests, seed-contract,
token-contract, hosted-proof-boundary, surfaces, e2e, docs, CI, coverage, and
evidence lanes `ready`; it verified 8 reviewer DB seed readiness items, 14 seed
table contracts, 5 route contracts, 7 required reviewer seed env vars, 3 hosted seed
execution requirements, 4 hosted token probe requirements, 5 Vercel env sync
requirements, zero hosted seed proofs, zero hosted token probe proofs, zero
Vercel env sync proofs, zero destructive live mutations, zero live provider
calls, zero live external network calls, and zero real orders. It is not hosted
reviewer DB mutation or hosted Clerk JWT proof.

```text
npm run business:engagement:doctor
```

Result: passed. The JSON report marked register, tests, provider-catalog,
provider-runtime, surfaces, e2e, docs, CI, and evidence lanes `ready`; it
verified 8 business engagement readiness items, 14 CRM adapter contracts, 11
workflow adapter contracts, 16 notification adapter contracts, 3 lifecycle
trigger kinds, zero live customer messages, zero CRM writes, zero live external
network calls, and zero real orders. It is not live CRM OAuth, customer
messaging, CRM writeback, or production campaign analytics proof.

```text
npm run retail:doctor
```

Result: passed. The JSON report marked register, provider-contracts, surfaces,
docs, CI, and evidence lanes `ready`; it verified 8 retail fulfillment
readiness items, 6 blocked retail-printer adapter contracts, 2 manual fallbacks,
21 recovery events, zero live quotes, zero direct orders, zero real payments,
zero physical certification claims, and zero live external network
requirements.

```text
npm run provider:governance:doctor
```

Result: passed. The JSON report marked catalog, governance, tests, surfaces,
CI, and safety lanes `ready`; it verified 130 adapter-id signals, 63 usage-based markers,
6 blocked live vendor adapters, budget/rate/fallback policy signals, admin/API
governance surfaces, CI wiring, and no live provider calls or real orders.

```text
npm run capacity:doctor
```

Result: passed. The JSON report marked profiles, tests, surfaces, docs, CI, and
safety lanes `ready`; it verified 4 capacity profiles, max daily planning limits
of 12000 cards and 1000 image generations, `src/capacityPlan.ts`,
`src/capacityPlanData.mjs`, admin/API surfaces, CI wiring, documentation
signals, no live provider calls, no real orders, and no measured production
benchmark claim.

```text
npm run printer:pricing:doctor
```

Result: passed. The JSON report marked catalog, safety, collection, tests,
surfaces, docs, and CI lanes `ready`; it verified 12 official-source printer
price observations across 8 persisted source links, 9 collection rules, manual
confirmation on every observation, provider-feed collection seams, rendered
print-link browser-evidence validation, same-cart provider-portal proof gating,
UI/API exposure, CI wiring, and no live quote or real-order claims.

```text
npm run localization:doctor
```

Result: passed. The JSON report marked catalog, tests, surfaces, mobile, CI, and
safety lanes `ready`; it verified 4 launch locales, 2 RTL locales, 3
human-copy-review locales, 4 mobile locale options, web/API/mobile parity, no
live translation provider, no real orders, and no blockers.

```text
npm run api:doctor
```

Result: passed. API service readiness reported `ready`, 32 routes, 16
mutations, 14 idempotent mutation contracts, 130 API-summary providers, provider
governance for those 130 adapters, 21 persistence tables, 24 schema-backed
routes, 28 stateful routes, contract runtime mode, no live external calls, no
real vendor orders, no raw content storage, and no blockers. The local
persistence audit now reports account-scoped API routes for customer data and no
browser-local customer data requirements.

```text
npm run api:doctor:memory
```

Result: passed. Memory runtime doctor reported Bearer auth and idempotency
enforced, 2 configured sessions, 25 routes, 15 idempotent mutation contracts,
124 API-summary providers, 20 API-readiness persistence tables,
relationship-memory repository readiness, render-packet artifact manifests,
signed artifact URL contracts, no live external calls, no real vendor orders,
and no blockers.

```text
npm run api:doctor:postgres
```

Result: passed. Postgres runtime doctor used an injected fake `pg` pool to
exercise auth-session lookup, wrong-role blocking, idempotent mutation insert,
repository-backed render-packet insert, repository-backed import-preview insert,
server-parsed raw ICS import-preview insert without raw DESCRIPTION echo,
fail-closed import-preview rejection when required metadata or raw invite/ICS
text is missing,
fail-closed rejection for non-import mutations missing required fields before
idempotency or repository writes,
repository-backed card-project insert, repository-backed relationship-memory
insert, repository-backed manual vendor handoff order/consent/event insert,
repository-backed data-request privacy/consent insert, same-key replay,
same-key/different-body conflict, audit-log insert, and queue-job insert. It
reported 6 idempotency records, 6 audit records, 2 queued jobs, 1 provider
connection, 1 imported event, 1 card opportunity, 1 relationship memory, 1 card
project, 1 render packet, 1 order, 1 order event, 2 consent records, 1 data
request, and no blockers.

```text
DATABASE_URL=postgres://... npm run api:doctor:postgres:live
```

Result: passed. Live Postgres integration doctor created an isolated temporary
database, applied `infra/migrations/001_initial_schema.sql`, seeded customer and
admin auth sessions, authorized all 6 repository-backed customer routes through
the real `pg` runtime, authorized the admin readiness route, blocked a wrong-role
admin request, persisted an idempotent queue-backed render-packet mutation,
persisted repository-backed import-preview, relationship-memory, and
card-project mutations, persisted a repository-backed manual vendor handoff
order/consent/event trail, persisted a repository-backed data-request
privacy/consent trail, replayed the same idempotency key, rejected a changed-body
conflict, and verified 6 idempotency records, 6 audit records, 2 queued jobs, 1
provider connection, 1 imported event, 1 card opportunity, 1 relationship memory,
1 card project, 1 render packet, 1 order, 1 order event, 2 consent records, and
1 data request before dropping the temporary database.

```text
DATABASE_URL=postgres://... npm run api:doctor:postgres:http
```

Result: passed. Postgres API HTTP doctor created an isolated temporary database,
applied `infra/migrations/001_initial_schema.sql`, seeded customer and admin
auth sessions, started `scripts/api-server.mjs` in Postgres mode, verified
public health and route catalog responses, blocked missing and wrong-role auth,
authorized admin readiness and customer bootstrap through Bearer headers,
blocked a missing `X-Idempotency-Key`, persisted all 6 repository-backed
customer HTTP mutations, replayed the render-packet idempotency key, rejected a
changed-body conflict, and verified 6 idempotency records, 6 audit records, 2
queued jobs, 1 provider connection, 1 imported event, 1 card opportunity, 1
relationship memory, 1 card project, 1 render packet, 1 order, 1 order event, 2
consent records, and 1 data request before shutting down the server and dropping
the temporary database.

```text
DATABASE_URL=postgres://... npm run account:doctor:live
```

Result: passed. Account auth doctor created an isolated temporary database,
applied `infra/migrations/001_initial_schema.sql`, stored a hosted account
identity without raw provider profile data, enforced provider-subject uniqueness,
created a hashed expiring recovery challenge, created a durable customer session,
marked the recovery challenge used, appended an audit row, and dropped the
temporary database.

```text
npm run artifact:doctor
```

Result: passed. Artifact store doctor wrote all 6 render-packet artifacts to a
temporary filesystem object-store path and all 6 artifacts through the
S3-compatible injected-client contract, read them back, verified all checksums
and byte lengths, stored both handoff manifests, made no network calls, and kept
real orders disabled. The S3-compatible path recorded 7 put-object operations
including the manifest and reported `cloudWritesVerified: false`.

```text
OBJECT_STORE_URL=http://127.0.0.1:9000 ... npm run artifact:doctor:s3:live
```

Result: passed in CI against a MinIO service. Live S3-compatible artifact doctor
started from the signed render-packet handoff, created an isolated bucket, used
path-style SigV4 requests, wrote 6 print artifacts and 1 manifest, read all 7
objects back, verified artifact checksums and byte lengths through the existing
artifact-store contract, reported `cloudWritesVerified: true`, kept
`externalVendorCalls: false` and `realOrdersEnabled: false`, then deleted the
objects and bucket.

```text
npm run persistence:doctor
```

Result: passed. Persistence doctor reported 20 table contracts, auth-session
persistence, account identity and recovery challenge persistence, idempotency
replay, relationship-memory repository readiness, render-packet repository
readiness, import-preview repository readiness, card-project repository
readiness, manual vendor handoff order/consent/event readiness, data-request
privacy/consent readiness, queue jobs, render-packet artifact manifest signals,
provider usage ledger, append-only audit coverage, 26 stateful API routes, 14
idempotent mutations, 6 local persistence audit items, 0 DB-required
browser-local data groups, 0 object-store-required browser-local artifact
groups, 0 browser-only customer data keys, server-backed draft-state routes, and
no blockers.

```text
npm run demo:doctor
```

Result: passed. Demo reset doctor reported an admin-only contract preview for
14 reviewer fixture tables and 17 rows, with idempotency required, signed
artifact URLs present, no raw content storage, no live external calls, and no
real orders.

```text
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run worker
```

Result: passed. Worker reported queue readiness for `provider-sync`,
`render-review`, `artifact-signing`, and `vendor-handoff`, with idempotency
required.

```text
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 npm --prefix apps/mobile run doctor
```

Result: passed. Mobile shell configuration resolved from environment and the
customer experience contract was present, including next-action, memory-review,
and print-proof workflow state.

```text
npm run mobile:release:doctor
```

Result: passed. Mobile release doctor reported iOS and Android platforms,
development/preview/production native build profiles, environment-sourced API
URL handling, disabled order safety, no live provider calls, no real
orders, and no signed artifact built.

```text
Current customer UI evidence
```

Result: passed with focused tests and live DOM inspection on 2026-06-14.

- `npm run test -- --run tests/frontend-architecture.test.ts tests/customer-shell-ssr.test.tsx tests/app-smoke.test.ts`
  passed with 51 tests.
- Live browser DOM checks found the current landing, Studio setup, Studio
  template-review, and Print surfaces have zero horizontal overflow and do not
  expose the "Someone important" sentinel in customer-visible copy.
- Studio setup has no fixed dock, no premature proof CTA, and no panel editor
  before generation or explicit template review.
- Print handoff has no global fixed `ctadock`; proof approval unlocks the
  in-page `Continue to Walgreens` action without a competing floating
  `Save print package` CTA.

Current screenshot evidence was recaptured on 2026-06-14 against production at
`https://customcard-three.vercel.app/` with isolated headless Chrome. The
capture pass validated zero horizontal overflow and no visible "Someone
important" sentinel before writing each file. A production `HEAD` request
returned HTTP 200 from Vercel before capture.

- Desktop landing: `docs/evidence/customcard-desktop.png` at 1440x1000.
- Mobile landing: `docs/evidence/customcard-mobile.png` at 390x900.
- Studio template-review state: `docs/evidence/customcard-studio.png` at
  1440x1000.
- Print handoff: `docs/evidence/customcard-handoff.png` at 1440x1000.
- My cards desktop: `docs/evidence/customcard-customer-panel.png` at 1440x1000.
- My cards mobile: `docs/evidence/customcard-customer-mobile-panel.png` at
  390x900.
- Admin access gate: `docs/evidence/customcard-admin-panel.png` at 1440x1000.

```text
Final package audit
```

Result: passed. `docs/final-package.md` was added from the
`deliver-ambiguous-brief` final package template, README links it, and stale
documentation claims found during the audit were corrected.

## Known Verification Gaps

- No completed OAuth callback/token exchange/import integration test; the
  Google connection-start route only prepares an env-gated authorization URL.
- No production/deployed Postgres migration run in this pass; isolated live
  Postgres migration/runtime integration is covered by doctor.
- No live external queue, droplet, cloud cluster, or vendor sandbox test.
- Local SVG/PDF/manifest print package export, signed artifact handoff contracts,
  temporary filesystem object-store write/read verification, and injected
  S3-compatible write/read contract verification are covered. Live
  S3-compatible writes are covered against CI/local MinIO, but no production
  cloud bucket outside that doctor is claimed.
- Public printer pricing is review-only and source-backed with freshness gates;
  no live quote, tax, stock, pickup-window, or checkout test is claimed. Coupon
  source collection is modeled, and discounts are applied only with
  provider-portal application proof for the same cart context.
- Payment providers are sandbox-contract only; no live charge, capture, refund,
  dispute, tax, settlement, or payment-webhook test is claimed.
- Observability providers are contract-only; no live telemetry ingestion, alert,
  retention, dashboard, or incident-response drill is claimed.
- Redacted production hosted env inventory is attached. Initial inventory showed
  `CLERK_ISSUER`, `CLERK_AUDIENCE`, and `IDEMPOTENCY_KEY_TTL_HOURS` missing;
  guarded partial repair applied `IDEMPOTENCY_KEY_TTL_HOURS`; follow-up
  inventory confirms only `CLERK_ISSUER` and `CLERK_AUDIENCE` remain missing, so
  hosted env sync remains incomplete. Guarded public Clerk config evidence shows
  the deployed production public app bundle currently contains a redacted Clerk
  `pk_test` publishable key, contains no `pk_live` publishable key, and decodes
  to issuer candidate `https://model-bluejay-21.clerk.accounts.dev`; production
  OAuth remains unclaimed until `VITE_CLERK_PUBLISHABLE_KEY` is replaced with a
  live key and redeployed. Guarded `hosted:clerk:repair` evidence adds the
  redacted repair plan and confirms no local `pk_live` or `CLERK_AUDIENCE` value
  is available to apply yet. No executed production Clerk JWT verification exists;
  `npm run hosted:env:repair` is scripted to apply the remaining server verifier
  keys only when values plus production apply/acknowledge guards are supplied.
  `npm run hosted:clerk:public-config` is scripted for redacted public
  publishable-key proof, `npm run hosted:clerk:repair` is scripted to replace the
  public key, derive/apply `CLERK_ISSUER`, apply `CLERK_AUDIENCE`, and require a
  redeploy/re-probe, and `npm run hosted:auth:probe` is scripted for
  read-only QA/production customer/admin route proof with real Clerk JWTs. `npm
  run hosted:mutation:probe` is scripted for guarded hosted render-packet
  mutation, idempotency replay/conflict, and audit-counter proof, but it writes
  a harmless live probe row and has not been executed with production JWTs. `npm
  run hosted:rollback:plan:doctor` validates the attached rollback plan, and
  `npm run hosted:db:restore:drill` is scripted for restored-clone schema,
  index, table-read, retention, RPO, and RTO proof. Blocked restore-drill plan
  evidence is attached, but no restored-clone or executed rollback evidence has
  been attached. Local/CI isolated Postgres
  route-auth integration and account-auth storage/recovery integration are
  covered by doctors.
- AI provider readiness is covered as repo-local text/image adapter inventory,
  model allowlist, prompt safety, privacy, print QA, spend, evaluation, and
  rollout gates; no live AI text-chat, image-generation provider call, model
  output QA run, or production AI traffic is claimed.
- No physical print certification.
- No external legal/security/privacy/accessibility audit.
- Tooling-free iOS Release simulator home, compact-phone, standard-phone,
  large-phone, and tablet screenshots are attached, and a guarded native-install
  proof blocks stale simulator bundles from counting as current release
  evidence. A fresh exported iOS JS bundle now proves current print-shop copy can
  be embedded, but no print/RTL render matrix, current installed native app, EAS
  cloud artifact, or signed iOS/Android artifact is attached; mobile render
  readiness, EAS profile, and release-doctor contracts are covered.
- Provider docs were checked at the contract/link level only; no vendor sandbox
  credentials or market/commercial terms were verified.
- Browser UI smoke tests are not included in the V8 unit coverage percentages;
  they remain covered by Chrome smoke assertions and visual evidence.
- Hosted GitHub Actions verification exists for main pushes; no production
  deployment evidence is claimed.
