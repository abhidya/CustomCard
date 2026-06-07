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
- Provider adapter coverage currently includes 121 adapters: 18 ready-local, 88
  credential-gated, 9 contract-only, and 6 blocked.
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
  repository signals, append-only audit contracts, demo reset mappings, and 13
  schema-backed API route mappings.
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
  `api/[...path]`; public `/` and `/api/health` returned Vercel deployment
  protection 401 responses, and `vercel env ls` showed no project env vars.
- Hosted API proof readiness is checked by `npm run hosted:api:doctor`, which
  verifies the 8-item Vercel/hosted DB proof register, serverless source
  contract, hosted env requirements, deployment evidence boundary, admin/API
  surfaces, docs, CI wiring, and zero public DB-backed route proof, hosted DB
  connectivity proof, hosted token verification proof, backup policy proof, or
  deployment-protection bypass claims.
- Reviewer DB seed readiness is checked by `npm run reviewer:db:seed:doctor`,
  which verifies the 8-item reviewer seed proof register, deterministic seed
  plan, 14-table fixture coverage, customer/admin session-token contract, SQL
  preview safety, hosted migration/env/probe evidence gaps, rollback drill
  requirements, admin/API surfaces, docs, CI wiring, and zero hosted seed proof,
  hosted token proof, Vercel env proof, destructive live mutations, live
  provider calls, live external network calls, or real orders.
  It is not hosted reviewer DB mutation or hosted account-token proof.
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
  observability/audit; credential-vault evidence; hosted account-token proof;
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
- External audit readiness is checked by `npm run external:audit:doctor`, which
  verifies the 15-item launch evidence register, production-gate mappings,
  admin/API surfaces, CI wiring, no public production claims, and no attached
  external audit artifacts. It is not an external audit report.
- End-to-end coverage readiness is checked by `npm run e2e:coverage:doctor`,
  which verifies the 29-item repo-local matrix, backing browser/API/mobile/infra
  tests, admin/API surfaces, CI wiring, 100% repo-local coverage, and zero live
  production proofs, real orders, or live external network requirements.
- AI provider readiness is checked by `npm run ai:doctor`, which verifies the
  8-item text/image provider readiness register, 15 text provider contracts, 15
  image provider contracts, 2 local fallbacks, prompt/human-review gates,
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
  viewport profiles, 3 native build profiles, admin/API surfaces, docs, CI
  wiring, and zero emulator render proof claims, signed artifact claims, live
  provider calls, external network calls, or real orders. It is not an emulator
  render proof or signed native build.
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
npm run reviewer:db:seed:doctor
npm run business:engagement:doctor
npm run admin:operations:doctor
npm run provider:governance:doctor
npm run capacity:doctor
npm run printer:pricing:doctor
npm run localization:doctor
npm run api:doctor:memory
npm run api:doctor:postgres
CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live
CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:http
CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live
npm run artifact:doctor
CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled OBJECT_STORE_URL=http://127.0.0.1:9000 OBJECT_STORE_BUCKET=customcard-ci-artifacts OBJECT_STORE_ACCESS_KEY_ID=customcard OBJECT_STORE_SECRET_ACCESS_KEY=customcard-dev-only OBJECT_STORE_REGION=us-east-1 OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run artifact:doctor:s3:live
npm run persistence:doctor
npm run demo:doctor
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
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
docs, CI, and evidence lanes `ready`; it verified 8 AI readiness items, 15 text
provider contracts, 15 image provider contracts, 2 local fallbacks, 6 prompt
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
build profiles, zero emulator render proof claims, zero signed artifact claims,
zero live provider calls, zero external network calls, and zero real orders.

```text
npm run hosted:api:doctor
```

Result: passed. The JSON report marked register, tests, vercel-source,
hosted-env, surfaces, deployment-evidence, docs, CI, and evidence lanes
`ready`; it verified 8 hosted API proof readiness items, 5 hosted-DB-required
items, 5 route contracts, 6 required hosted env vars, zero env sync proof
claims, zero hosted DB proof claims, zero public DB-backed route proof claims,
zero hosted account-token verification proof claims, zero backup policy claims,
zero deployment-protection bypass claims, zero live provider calls, zero
external network calls, and zero real orders.

```text
npm run reviewer:db:seed:doctor
```

Result: passed. The JSON report marked register, tests, seed-contract,
token-contract, hosted-proof-boundary, surfaces, e2e, docs, CI, coverage, and
evidence lanes `ready`; it verified 8 reviewer DB seed readiness items, 14 seed
table contracts, 5 route contracts, 6 required hosted env vars, 3 hosted seed
execution requirements, 4 hosted token probe requirements, 5 Vercel env sync
requirements, zero hosted seed proofs, zero hosted token probe proofs, zero
Vercel env sync proofs, zero destructive live mutations, zero live provider
calls, zero live external network calls, and zero real orders. It is not hosted
reviewer DB mutation or hosted account-token proof.

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
CI, and safety lanes `ready`; it verified 121 adapters, 57 usage-based adapters,
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

Result: passed. API doctor reported 17 routes, 9 idempotent mutation contracts,
121 providers, provider governance for all 121 adapters, 15 schema-backed routes,
relationship-memory repository readiness, render-packet artifact manifests,
signed artifact URL contracts, contract runtime mode, no live external calls,
no real vendor orders, no raw content storage, 13 production launch gates with
`liveEnabled: 0`, and no blockers.

```text
npm run api:doctor:memory
```

Result: passed. Memory runtime doctor reported Bearer auth and idempotency
enforced, 2 configured sessions, 17 routes, 9 idempotent mutation contracts, 87
providers, 18 persistence tables, relationship-memory repository readiness,
render-packet artifact manifests, signed artifact URL contracts, no live external
calls, no real vendor orders, and no blockers.

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
CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live
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
CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:http
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
CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live
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
CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled OBJECT_STORE_URL=http://127.0.0.1:9000 ... npm run artifact:doctor:s3:live
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

Result: passed. Persistence doctor reported 18 required tables, auth-session
persistence, account identity and recovery challenge persistence, idempotency
replay, relationship-memory repository readiness, render-packet repository
readiness, import-preview repository readiness, card-project repository
readiness, retail operation start audit/idempotency readiness, manual vendor
handoff order/consent/event readiness, data-request privacy/consent readiness,
queue jobs, render-packet artifact manifest signals,
artifact-store write/read doctor signals, live S3-compatible artifact doctor
signals, Postgres runtime SQL/doctor/integration signals, Postgres API HTTP
doctor signals, account-auth contract/doctor signals, append-only audit
coverage, 15 schema-backed API routes, and no blockers.

```text
npm run demo:doctor
```

Result: passed. Demo reset doctor reported an admin-only contract preview for
14 reviewer fixture tables and 17 rows, with idempotency required, signed
artifact URLs present, no raw content storage, no live external calls, and no
real orders.

```text
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 REAL_ORDER_KILL_SWITCH=disabled npm run worker
```

Result: passed. Worker reported queue readiness for `provider-sync`,
`render-review`, `artifact-signing`, and `vendor-handoff`, with idempotency
required.

```text
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

Result: passed. Mobile shell configuration resolved from environment and the
customer experience contract was present, including next-action, memory-review,
and print-proof workflow state.

```text
npm run mobile:release:doctor
```

Result: passed. Mobile release doctor reported iOS and Android platforms,
development/preview/production native build profiles, environment-sourced API
URL handling, `REAL_ORDER_KILL_SWITCH=disabled`, no live provider calls, no real
orders, and no signed artifact built.

```text
Visual inspection
```

Result: passed with local rendered screenshots.

- Desktop opportunity screen: `docs/evidence/customcard-desktop.png`.
- Mobile opportunity screen after responsive fix: `docs/evidence/customcard-mobile.png`.
- Desktop card studio screen: `docs/evidence/customcard-studio.png`.
- Desktop manual handoff screen: `docs/evidence/customcard-handoff.png`.
- Desktop customer panel: `docs/evidence/customcard-customer-panel.png`.
- Desktop admin panel: `docs/evidence/customcard-admin-panel.png`.
- Mobile customer panel: `docs/evidence/customcard-customer-mobile-panel.png`.

The visual pass caught and fixed two layout issues: mobile status-chip clipping
and cramped four-across panel previews.

The latest visual pass additionally verified the customer panel appears before
workspace setup, the admin meters have accessible labels, the adapter matrix
separates ready-local, credential-gated, contract-only, and live-blocked rows.
After the provider expansion, pricing-research, print-package, AI-provider,
hosted-auth, contact-import, CRM, workflow-integration, notification, payment,
and observability catalog passes the catalog contains 18 ready-local, 69
credential-gated, 9 contract-only, and 6 blocked adapters. The web mobile
customer panel appears before the navigation rail with zero horizontal overflow
at 1440px desktop and 390px mobile widths. The mobile render readiness admin
card was also rendered at 1440x1000 and 390x900 with the emulator-proof-missing
state, signed-artifact gap, required proof rows, and zero horizontal overflow;
screenshots were saved to `/tmp/customcard-mobile-render-readiness-desktop.png`
and `/tmp/customcard-mobile-render-readiness-mobile.png`.

```text
Final package audit
```

Result: passed. `docs/final-package.md` was added from the
`deliver-ambiguous-brief` final package template, README links it, and stale
documentation claims found during the audit were corrected.

## Known Verification Gaps

- No live OAuth integration test.
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
- No deployed production Postgres API integration or production hosted
  account-token verification; local/CI isolated Postgres route-auth integration
  and account-auth storage/recovery integration are covered by doctors.
- AI provider readiness is covered as repo-local text/image adapter inventory,
  model allowlist, prompt safety, privacy, print QA, spend, evaluation, and
  rollout gates; no live AI text-chat, image-generation provider call, model
  output QA run, or production AI traffic is claimed.
- No physical print certification.
- No external legal/security/privacy/accessibility audit.
- No actual mobile emulator run, native screenshot, EAS/native build, or signed
  iOS/Android artifact; mobile render readiness, EAS profile, and release-doctor
  contracts are covered.
- Provider docs were checked at the contract/link level only; no vendor sandbox
  credentials or market/commercial terms were verified.
- Browser UI smoke tests are not included in the V8 unit coverage percentages;
  they remain covered by Chrome smoke assertions and visual evidence.
- Hosted GitHub Actions verification exists for main pushes; no production
  deployment evidence is claimed.
