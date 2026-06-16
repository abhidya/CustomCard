# Final Package

## Project State

- Project: CustomCard.
- Repository path: `/Users/abdulrehmanbhidya/Documents/CodexCustomCard`.
- Original prompt or recovered promise: turn a last-minute physical card idea into
  an event-aware personal greeting-card CRM and print-production product; see
  `docs/brief-context.md`.
- Current delivered outcome: a polished free local MVP plus customer/admin
  panels, a tested 130-adapter catalog and no-network runtime contracts, admin
  business CRM/workflow integration contracts, executable capacity profiles for
  local/cheap/cloud/SaaS planning, a tested payment readiness register, a
  tested mobile render readiness register, a tested cloud artifact proof
  readiness register, a tested production launch-gate registry, a tested
  localization readiness catalog, a tested customer mobile app
  contract, and a contract-first production skeleton with API/static server,
  account identity/recovery storage contracts, memory-mode auth/idempotency
  validation, fake-pool contract and isolated live Postgres
  route-auth/migration/runtime validation, Postgres API HTTP
  auth/idempotency/repository verification, and committed CI verification gates.
- Audience/reviewer: project reviewer, interview/client evaluator, or future
  implementer who needs to inspect the repo without reading chat history.

## Evidence vs Inference

- Explicitly known: the recovered CustomCard brief centers on event detection,
  relationship memory, 5x7 card panels, vendor-neutral print handoff, and
  blocked real ordering until certification.
- Inferred: free local substitutes are acceptable for the reviewable MVP because
  no production OAuth, vendor, payment, or print-certification access exists in
  this repo state.
- Unknown or unrecoverable: production provider credentials, vendor sandbox
  terms, payment processor decisions, hosted DB credentials, external
  legal/security review outcome, live AI/image-provider cost behavior, and
  physical print QA results. A protected Vercel deployment exists, but public
  DB-backed route proof is still missing.

## What Changed

- Product/workflow: the web app now opens on the usable workflow: local
  workspace auth, manual/ICS import, opportunity decision, card studio, memory review,
  SVG/PDF print package export, manual handoff, customer panel, admin panel,
  capacity profile readiness, and adapter readiness.
- UX/polish: redesigned the app shell, responsive navigation, status gates,
  card-studio preview, handoff checklist, adapter matrix, customer/admin
  operations surfaces, locale readiness controls, and mobile layout.
- Code/architecture: added `src/freeMvp.ts` for deterministic free-MVP auth,
  import, opportunity, card, SVG, memory, and handoff logic while preserving the
  existing domain and service-kernel contracts; added `src/providerCatalog.ts`
  for provider capability, readiness, env, safety-gate, and role-surface
  contracts; added `src/providerRuntime.ts` for executable no-network adapter
  dry runs.
- Tests/verification: added deterministic free-MVP and provider-catalog tests and
  provider-runtime tests, and updated Chrome smoke tests to exercise the real
  reviewer workflow plus customer/admin panels; coverage now includes
  orchestration and mobile contract modules, and CI runs the repository gates.
- Docs/handoff: added `docs/free-mvp-plan.md` and
  `docs/platform-expansion-design.md`, updated README, traceability, decisions,
  delivery process, verification, completion audit, handoff notes, and visual
  evidence under `docs/evidence/`.

## Current Capabilities

- Primary workflow: continue with Google or Apple/local workspace -> import calendar/email/invite signal -> generate card
  -> edit tone/style/language -> inspect four 5x7 SVG-ready panels -> prepare
  checkout confirmation package.
- Supporting workflows: add/delete approved memories, snooze/dismiss
  opportunities, choose retail-printer/local-printer handoff, copy checklist,
  compare review-only public printer prices, download the local print package,
  inspect free-ready,
  credential-gated, contract-only, and blocked production adapters.
- Customer panel: local workspace auth, Paste invite or ICS as the ready import
  path, Google Calendar OAuth-gated readiness, Apple/iCloud manual export
  readiness, next-card opportunities, sendable deterministic local chat session,
  card proof path, locale readiness, and fulfillment recommendations for
  the lowest current estimate, fastest pickup candidate, and cheapest shipped
  option, with estimate-only price proof until same-cart coupon proof exists.
- Admin panel: provider coverage metrics, no-network runtime readiness, required
  env vars, localization readiness, production launch gates, gated provider
  queue, cloud runtime adapters, capacity profiles, payment readiness, mobile
  render readiness, cloud artifact proof readiness, CRM lifecycle adapters,
  workflow integrations, and blocked live vendors.
- Provider runtime: readiness dry runs for all 130 catalog adapters; redacted
  no-network request contracts for gated chat, image, event, contact,
  CRM lifecycle, workflow integration, hosted-auth, notification, payment, and observability
  providers; hard
  block for live vendor order adapters; hosted auth request contracts for
  common identity providers; metadata-only contact/address-book import
  contracts; local public printer pricing research
  for Walgreens/CVS/FedEx/Walmart/Staples/Office Depot manual handoff; local
  print package export for source SVGs, a combined 5x7 PDF proof, and a checksum
  manifest; signed artifact handoff contracts and live MinIO/S3-compatible
  doctor coverage for render-packet artifacts.
- API boundary: tested `/api/health`, customer/admin/mobile bootstrap,
  mobile next-action, queue, memory-review, print-proof, pricing, and
  offline-sync payloads, provider-readiness, route
  catalog, admin demo reset, default contract mode,
  repository-backed relationship-memory, render-packet, import-preview,
  card-project, manual vendor handoff, data-request mutation handling,
  localization readiness payloads, and executable memory-mode Bearer auth plus
  `X-Idempotency-Key` replay/conflict behavior served by
  `scripts/api-server.mjs`. `api/[...path].js` exposes the same handler as a
  Vercel serverless route. Fake-pool and isolated live Postgres runtime coverage
  exercise auth-session lookup, idempotency replay/conflict, migration
  application, provider/event/opportunity inserts, card-project inserts,
  relationship-memory inserts, render-packet inserts, audit insert, and
  queue-job insert, with a process-level HTTP doctor proving the same
  repository-backed routes through `scripts/api-server.mjs`.
- Localization readiness: English (US), Spanish (US), Urdu, and Arabic are
  exposed across web customer/admin panels, API bootstrap/readiness payloads, and
  the mobile app contract with complete message bundles, RTL layout-review
  flags, human copy-review gates, and live translation disabled.
- Capacity planning: local-dev, cheap-droplet, cloud-native, and SaaS-scale
  profiles are represented as executable data in `src/capacityPlanData.mjs`,
  typed by `src/capacityPlan.ts`, surfaced in the admin panel/API readiness, and
  gated by `npm run capacity:doctor`. They are planning limits, not measured
  production benchmarks.
- Persistence boundary: tested auth-session, account identity, hashed recovery
  challenge, idempotency replay, relationship-memory repository, render-packet
  repository, import-preview repository, card-project repository, queue-job,
  schema-backed route, demo reset, and audit contracts served by
  `src/accountAuth.ts`, `src/persistenceContracts.ts`,
  `scripts/account-auth-doctor.mjs`, `scripts/postgres-runtime-doctor.mjs`,
  `scripts/postgres-integration-doctor.mjs`,
  `scripts/postgres-api-http-doctor.mjs`, and `scripts/persistence-doctor.mjs`.
- CI verification: `.github/workflows/verify.yml` runs install, `npm run check`,
  deployment doctor, contract API doctor, memory-runtime API doctor, Postgres
  runtime contract doctor, live Postgres integration doctor, Postgres API HTTP
  doctor, account-auth storage/recovery doctor, cloud artifact IaC doctor,
  cloud artifact proof readiness doctor,
  localization readiness doctor, artifact-store write/read doctor, live
  MinIO/S3-compatible artifact doctor, capacity plan doctor, persistence doctor,
  demo reset doctor, worker readiness, mobile doctor, mobile render readiness
  doctor, and mobile native release doctor on pushes to `main` and pull
  requests.
- Mobile customer app: tested Expo customer experience contract with
  next-action summary, card queue items, approval controls, memory review
  items, print-proof checks, local chat, image/render state, review-only printer
  pricing previews, offline idempotent API sync, locale readiness, manual
  handoff, and real-order kill-switch validation.
- Demo/seed data: sample anniversary `.ics` content, two approved local memory
  records in `src/freeMvp.ts`, plus an admin-only demo reset contract covering
  14 reviewer fixture tables and 17 rows.
- Config/env requirements: the local web MVP uses the public Clerk React
  `VITE_CLERK_PUBLISHABLE_KEY` and needs no provider or vendor credentials;
  worker/mobile/runtime checks require explicit env vars documented in README
  and `docs/verification.md`.

## Verification Evidence

| Check | Command or method | Result |
| --- | --- | --- |
| Install/setup | `npm install` expected from README; lockfile present. | Covered as setup path; no fresh reinstall was run in this pass. |
| Tests | `npm run check` | Passed on 2026-06-04: 35 test files, 199 tests. |
| Coverage | `npm run check` includes `npm run test:coverage`. | Passed contract thresholds: 92.73% statements, 86.97% branches, 98% functions, 95.7% lines across account auth, customer chat, core, API, artifact handoff/store, business engagement readiness, cloud artifact proof readiness, demo seed, E2E coverage, external audit readiness, AI provider readiness, observability readiness, retail fulfillment readiness, payment readiness, mobile render readiness, hosted API proof readiness, reviewer DB seed readiness, localization, pricing, print export, provider governance, persistence, orchestration, and mobile contract modules. |
| Build/typecheck/lint | `npm run check` includes `tsc -b && vite build` and `npm audit --audit-level=high`. | Passed; audit found 0 vulnerabilities. |
| Security remediation | `gitleaks detect --redact`, targeted API/AI tests, root/mobile/Python audits. | Current same-origin AI routes require customer-session auth, ignore request-scoped provider config unless the server explicitly opts in, and rate limits trust forwarded IP headers only when `CUSTOMCARD_TRUST_PROXY_HEADERS=true`; ignored local env files may contain operator secrets and remain intentionally untracked. |
| Smoke/browser | Chrome smoke tests plus rendered screenshots in `docs/evidence/`, `/tmp/customcard-payment-readiness-*.png`, and `/tmp/customcard-mobile-render-readiness-*.png`. | Passed; latest visual pass covered customer/admin panels, mobile render readiness admin panel content, and desktop/mobile viewports with zero horizontal overflow. |
| Deployment readiness | `npm run deployment:doctor` | Passed; local-dev, cheap-droplet, cloud-native, cloud-storage, runtime, and data lanes reported ready with no blockers. |
| Cloud artifact IaC | `npm run cloud:doctor` | Passed; statically verified `infra/aws/artifact-store` private S3 bucket posture, versioning, AES256 encryption, lifecycle cleanup, HTTPS/encrypted-upload bucket policy, `projects/*` writer IAM policy, app/worker role attachments, runtime env outputs, and no live cloud calls. |
| Cloud artifact proof readiness | `npm run cloud:artifact:proof:doctor` | Passed; verified 8 cloud artifact proof readiness items, 3 Terraform file contracts, 6 runtime env outputs, applied bucket ARN/IAM policy/signed URL/access-log/secret-sync/restore-drill evidence requirements, admin/API surfaces, docs, CI wiring, zero Terraform apply executions, zero applied bucket proof, zero IAM proof, zero signed URL probe proof, zero access-log proof, zero secret-sync proof, zero restore-drill proof, zero live provider calls, zero external network calls, and zero real orders. This is not live-applied cloud bucket/IAM proof. |
| Security/privacy/accessibility baseline | `npm run security:doctor` | Passed; statically verified API security headers and CSP posture, non-root/container-hardened deployment manifests, raw-content storage blocks, signed-artifact share controls, app-shell landmarks, skip-link behavior, and no live provider calls or real orders; external audit and legal review remain unclaimed. |
| External audit readiness | `npm run external:audit:doctor` | Passed; verified 15 production-blocking external evidence items, production-gate mappings, admin/API surfaces, CI wiring, documentation, zero public production claims, and zero attached external audit artifacts. |
| End-to-end coverage readiness | `npm run e2e:coverage:doctor` | Passed; verified 29 repo-local reviewer journeys, 100% repo-local coverage, 29 CI-gated coverage items, admin/API surfaces, backing browser/API/mobile/infra tests, zero live production proofs, zero real orders, and zero live external network requirements. |
| AI provider readiness | `npm run ai:doctor` | Passed; verified 8 AI readiness items, 16 text provider contracts, 18 image provider contracts, 0 local fallbacks, 6 prompt-audit gates, 5 human-review gates, admin/API surfaces, docs, CI wiring, zero live provider calls, zero production AI traffic, and zero live external network requirements. |
| Observability readiness | `npm run observability:doctor` | Passed; verified 7 telemetry/alerting readiness items, 6 observability provider contracts, 4 alert-route-required controls, admin/API surfaces, docs, CI wiring, zero live ingestion, zero production alerts, and zero live external network requirements. |
| Retail fulfillment readiness | `npm run retail:doctor` | Passed; verified 8 retail fulfillment readiness items, 6 blocked retail-printer adapter contracts, 2 manual fallbacks, 21 recovery events, admin/API surfaces, docs, CI wiring, zero live quotes, zero direct retail orders, zero real payments, zero external network calls, and zero physical certification claims. |
| Payment readiness | `npm run payment:doctor` | Passed; verified 8 payment readiness items, 4 sandbox payment provider contracts, 1 no-payment fallback, 23 ledger events, admin/API surfaces, docs, CI wiring, zero live charges, zero live refunds, zero live captures, zero external network calls, zero card data storage, and zero PCI approval claims. |
| Hosted API proof readiness | `npm run hosted:api:doctor` | Passed; verified 8 hosted API proof readiness items, 5 hosted-DB-required items, 5 route contracts, 13 required hosted env vars, Vercel/serverless source signals, deployment evidence boundary, guarded `hosted:env:inventory` redacted QA/production Vercel env inventory command, guarded `hosted:env:repair` redacted env repair plan/apply command, guarded `hosted:clerk:public-config` redacted public Clerk publishable-key command, guarded `hosted:clerk:repair` redacted Clerk public/server config repair command, guarded `hosted:auth:probe` QA/production Clerk route-probe command, guarded `hosted:mutation:probe` mutation/audit/idempotency command, guarded `hosted:rollback:plan:doctor` forward-only migration rollback-plan command, guarded `hosted:db:restore:drill` restored-clone backup drill command, admin/API surfaces, docs, CI wiring, 2 attached live public/hosted-DB proof items, 2 partial live proof items, 10 hosted evidence artifact refs, initial redacted production env inventory proof showing `CLERK_ISSUER`, `CLERK_AUDIENCE`, and `IDEMPOTENCY_KEY_TTL_HOURS` missing, redacted repair-plan proof showing no values supplied or applied, guarded partial repair proof showing `IDEMPOTENCY_KEY_TTL_HOURS` applied, follow-up inventory proof showing only `CLERK_ISSUER` and `CLERK_AUDIENCE` missing, public Clerk config proof showing the production bundle ships a redacted `pk_test` key and no `pk_live` key, Clerk config repair-plan proof showing no local `pk_live` or `CLERK_AUDIENCE` value is available to apply yet, restore-drill plan proof showing retention/RPO/RTO metadata and a single missing restored clone URL input, zero hosted env sync proof claims, zero executed hosted Clerk token verification proof claims, zero executed hosted mutation/audit proof claims, zero executed hosted restore-drill or rollback-drill proof claims, zero backup policy claims, zero live provider calls, and zero real orders. |
| Hosted migration rollback plan | `npm run hosted:rollback:plan:doctor` | Passed; verified the attached forward-only migration rollback plan, transaction-wrapped migration runner, restored-clone guardrails, redacted env inventory guardrails, rollback evidence requirements without live proof claims, audit/privacy/idempotency schema retention, zero hosted rollback execution, zero restored-clone switch execution, zero destructive live mutations, zero live provider calls, and zero real orders. |
| Reviewer DB seed readiness | `npm run reviewer:db:seed:doctor` | Passed; verified 8 reviewer DB seed readiness items, 14 seed table contracts, 5 route contracts, 7 required reviewer seed env vars, deterministic seed plan and SQL preview safety, customer/admin local static-token contracts behind explicit local auth fallback, hosted migration/env/local static-token proof gaps, rollback requirements, admin/API surfaces, docs, CI wiring, zero hosted seed proof claims, zero local static-token proof claims, zero Vercel env sync proof claims, zero destructive live mutations, zero live provider calls, and zero real orders. |
| Business engagement readiness | `npm run business:engagement:doctor` | Passed; verified 8 business engagement readiness items, 14 CRM adapter contracts, 11 workflow adapter contracts, 16 notification adapter contracts, 3 lifecycle trigger kinds, admin/API surfaces, docs, CI wiring, zero live customer messages, zero CRM writes, zero live external network calls, and zero real orders. |
| Provider cost governance | `npm run provider:governance:doctor` | Passed; verified 130 adapter-id signals, 63 usage-based markers, 6 blocked live vendor adapters, budget/rate/fallback policy signals, admin/API governance surfaces, CI wiring, and no live provider calls or real orders. |
| Capacity planning | `npm run capacity:doctor` | Passed; verified 4 local/cheap/cloud/SaaS profiles, finite daily card/image limits, admin/API surfaces, CI wiring, documentation, and no live provider calls or real orders. |
| Printer pricing research | `npm run printer:pricing:doctor` | Passed; verified 12 official-source public price observations across 8 persisted source links, 9 no-network collection rules, manual confirmation on every observation, customer/API exposure, CI wiring, and no live quote or real-order claims. |
| Localization readiness | `npm run localization:doctor` | Passed; verified 4 launch locales, 2 RTL locales, 3 human-copy-review locales, 4 mobile locale options, web/API/mobile surfaces, CI wiring, no live translation provider, and no real orders. |
| API readiness | `npm run api:doctor` | Passed; verified API readiness status `ready`, 32 routes, 16 mutations, 14 idempotent mutations, 130 providers, provider governance, 21 persistence tables, 24 schema-backed routes, 28 stateful routes, contract runtime mode, no live external calls, no real vendor orders, no raw content storage, and no blockers. |
| API memory runtime | `npm run api:doctor:memory` | Passed; Bearer auth and idempotency enforced with two configured test sessions, signed artifact contracts present, no live calls or real orders. |
| API Postgres runtime contract | `npm run api:doctor:postgres` | Passed; fake-pool runtime exercised auth-session lookup, wrong-role blocking, idempotency insert/replay/conflict, repository-backed render-packet insert, repository-backed import-preview insert, repository-backed relationship-memory insert, repository-backed card-project insert, manual handoff order/consent/event insert, data-request privacy/consent insert, audit insert, and queue-job insert without external DB credentials. |
| API live Postgres integration | `npm run api:doctor:postgres:live` | Passed against an isolated temporary database; migration applied, sessions seeded, real `pg` runtime authorized all 6 repository-backed customer routes, authorized the admin readiness route, blocked wrong-role access, persisted/replayed/conflicted idempotency, wrote one provider connection, imported event, card opportunity, relationship-memory row, card-project row, render-packet row, manual handoff order/consent/event row, data-request row, two consent rows, and audit plus queue rows. |
| API Postgres HTTP integration | `npm run api:doctor:postgres:http` | Passed against an isolated temporary database; started `scripts/api-server.mjs` in Postgres mode, verified public health/routes, admin/customer Bearer auth, missing/wrong-role auth blocking, missing idempotency blocking, all 6 repository-backed customer HTTP mutations, replay/conflict behavior, repository rows, audit rows, and queue jobs. |
| Account auth storage/recovery | `npm run account:doctor:live` | Passed against an isolated temporary database; migration applied, hosted identity stored without raw profile, provider-subject uniqueness enforced, hashed recovery challenge used, durable session created, and audit row appended. |
| Artifact object-store writes | `npm run artifact:doctor` | Passed; wrote all 6 render-packet artifacts to a temporary filesystem object-store path and all 6 artifacts through an injected S3-compatible client contract, read them back, verified checksums and byte lengths, stored both manifests, made no network calls, kept real orders disabled, and reported `cloudWritesVerified: false`. |
| Live S3-compatible artifact writes | `npm run artifact:doctor:s3:live` | Passed in CI against MinIO; created an isolated bucket, wrote 6 render-packet artifacts plus 1 manifest through path-style SigV4 requests, read all 7 objects back, verified checksum/byte-length evidence, reported `cloudWritesVerified: true`, kept external vendor calls and real orders disabled, and cleaned up the bucket. |
| Persistence readiness | `npm run persistence:doctor` | Passed; 20 table contracts, 26 stateful API routes, 14 idempotent mutations, server-backed draft-state routes, render-packet artifact storage, signed artifact URLs, append-only audit coverage, and no browser-local customer data requirements are tracked with no blockers. |
| Worker/runtime | `CUSTOMCARD_ENV=dev ... npm run worker` | Passed; worker reported queue and artifact-signing readiness. |
| Mobile app shell | `CUSTOMCARD_API_BASE_URL=... npm --prefix apps/mobile run doctor` | Passed; mobile app configuration and customer experience contract present, including local account import, Paste invite or ICS ready path, gated Google Calendar readiness, Apple/iCloud manual export readiness, next-action, memory-review, card assistant, best available fulfillment recommendations, and print-proof workflow state. |
| Mobile render readiness | `npm run mobile:render:doctor` | Passed; verified 8 mobile render readiness items, 21 screen sections, 4 viewport profiles, 3 native build profiles, 11 evidence artifacts including tooling-free iOS Release simulator home, compact-phone, standard-phone, large-phone, tablet screenshots, a guarded stale native-install proof, and a fresh exported iOS JS bundle proof, admin/API surfaces, docs, CI wiring, zero full emulator render proof claims, zero signed artifact claims, zero live provider calls, and zero real orders. |
| Mobile native release contract | `npm run mobile:release:doctor` | Passed; verified Expo/EAS development, preview, and production build profiles, iOS/Android identifiers, environment-sourced API URL, disabled real-order kill switch, no hardcoded production API endpoint, no live provider calls, and no signed artifact built. |
| Demo reset | `npm run demo:doctor` | Passed; admin reset contract covers 14 reviewer fixture tables and 17 rows without live calls or real orders. |
| CI workflow | `.github/workflows/verify.yml` inspected by `tests/infra-contract.test.ts`. | Covered; workflow runs check, deployment, cloud artifact IaC, cloud artifact proof readiness, contract API, localization readiness, capacity planning, memory API, Postgres contract API, live Postgres integration, Postgres API HTTP, account auth, artifact store, live MinIO/S3-compatible artifact writes, persistence, demo reset, worker, mobile, mobile render readiness, hosted API proof readiness, business engagement readiness, and mobile native release gates with safe repo-local env. |
| Docs/readme check | README, traceability, verification, handoff, completion audit reviewed. | Covered; stale claims found in this audit were corrected. |

## Requirement Coverage

| Requirement or promise | Evidence | Status |
| --- | --- | --- |
| Preserve original/recovered brief and constraints. | `docs/brief-context.md`, `docs/delivery-process.md`. | Covered |
| Convert ambiguity into requirements and acceptance criteria. | `docs/requirements-traceability.md`. | Covered |
| Record decisions and rejected alternatives. | `docs/decisions.md`, `docs/free-mvp-plan.md`. | Covered |
| Build the main free reviewer workflow. | `src/App.tsx`, `src/freeMvp.ts`, `tests/app-smoke.test.ts`. | Covered |
| Add customer/admin panels. | `CustomerPanelView`, `AdminPanelView`, runtime readiness UI, `tests/app-smoke.test.ts`, screenshots. | Covered |
| Catalog broad text, image, integration, vendor, pricing, print-export, and cloud adapters. | `src/providerCatalog.ts`, `src/providerRuntime.ts`, `src/printerPricing.ts`, `src/printExport.ts`, `src/artifactHandoff.ts`, `src/artifactStore.ts`, `scripts/artifact-store-s3-live-doctor.mjs`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `src/printerPricing.test.ts`, `src/printExport.test.ts`, `src/artifactHandoff.test.ts`, `src/artifactStore.test.ts`, `docs/platform-expansion-design.md`, `docs/printer-pricing-research.md`. | Covered as no-network contracts, review-only pricing observations with source freshness, local export packages, signed artifact handoff contracts, temporary filesystem object-store write/read verification, injected S3-compatible write/read contract verification, and live MinIO/S3-compatible write/read doctor coverage; production cloud calls gated |
| Add customer mobile app surface. | `apps/mobile/src/customerExperience.ts`, `apps/mobile/src/App.tsx`, `apps/mobile/eas.json`, `apps/mobile/scripts/release-doctor.mjs`, `src/mobileRenderReadiness.ts`, `src/mobileRenderReadinessData.mjs`, `scripts/mobile-render-readiness-doctor.mjs`, `apps/mobile/README.md`, `tests/infra-contract.test.ts`, `tests/mobile-contract.test.ts`, `src/mobileRenderReadiness.test.ts`. | Covered as tested customer app shell for sign-in/import, event queue, approval, memory review, card proof, fulfillment recommendations, checkout confirmation, offline sync, plus native render readiness and native release profile contracts; actual emulator render proof and signed native build artifact not covered |
| Add multi-language and regional readiness. | `src/localization.ts`, `src/localization.test.ts`, `scripts/localization-doctor.mjs`, `src/App.tsx`, `src/apiContracts.ts`, `scripts/api-server.mjs`, `apps/mobile/src/customerExperience.ts`, `apps/mobile/src/App.tsx`, `tests/mobile-contract.test.ts`, `tests/app-smoke.test.ts`, `docs/platform-expansion-design.md`. | Covered as customer/admin/API/mobile readiness for English (US), Spanish (US), Urdu, and Arabic with RTL layout-review and human copy-review gates; professional translation QA and live translation providers remain open |
| Keep generation and import deterministic/no paid services. | `src/freeMvp.ts`, `src/freeMvp.test.ts`. | Covered |
| Export four 5x7 card panels. | `buildPanelSvg`, `buildPrintExportPackage`, `validateCardDraft`, visual evidence. | Covered as SVG upload artifacts plus local PDF proof and manifest |
| Keep real orders disabled. | `buildVendorHandoff`, `walgreensAdapter`, README, tests. | Covered |
| Provide production-shaped skeleton for future auth/provider/vendor work. | `src/accountAuth.ts`, `src/serviceKernel.ts`, `src/apiContracts.ts`, `src/persistenceContracts.ts`, `src/demoSeed.ts`, `src/artifactStore.ts`, `src/cloudArtifactProofReadiness.ts`, `scripts/account-auth-doctor.mjs`, `scripts/artifact-store-doctor.mjs`, `scripts/artifact-store-s3-live-doctor.mjs`, `scripts/cloud-artifact-iac-doctor.mjs`, `scripts/cloud-artifact-proof-readiness-doctor.mjs`, `scripts/api-runtime.mjs`, `scripts/api-server.mjs`, `scripts/postgres-runtime-doctor.mjs`, `scripts/postgres-integration-doctor.mjs`, `scripts/postgres-api-http-doctor.mjs`, `scripts/demo-reset.mjs`, `scripts/persistence-doctor.mjs`, `infra/`, `scripts/deployment-readiness.mjs`, `apps/mobile/`, tests. | Partial; hosted account identity and recovery storage, filesystem and S3-compatible artifact write/read verification, live MinIO/S3-compatible artifact write/read verification, static AWS artifact-store bucket/IAM contract, applied bucket/IAM/signed-URL/access-log/secret-sync/restore-drill proof readiness, contract, memory, fake-pool Postgres, isolated live Postgres route auth plus process-level Postgres HTTP repository-backed relationship-memory/render-packet/import-preview/card-project/manual-vendor-handoff/data-request mutation coverage, demo reset, plus persistence boundaries exist; production hosted auth token verification and live-applied cloud IAM are not covered |
| Verify and document core workflows. | `docs/verification.md`, `docs/evidence/`, tests. | Covered |
| Enforce coverage as a quality gate. | `npm run test:coverage`, `npm run e2e:coverage:doctor`, `npm run payment:doctor`, `npm run mobile:render:doctor`, `npm run cloud:artifact:proof:doctor`, `npm run reviewer:db:seed:doctor`, `npm run business:engagement:doctor`, `vite.config.ts`, `src/e2eCoverage.test.ts`, `src/capacityPlan.test.ts`, `src/aiProviderReadiness.test.ts`, `src/observabilityReadiness.test.ts`, `src/paymentReadiness.test.ts`, `src/mobileRenderReadiness.test.ts`, `src/cloudArtifactProofReadiness.test.ts`, `src/reviewerDbSeedReadiness.test.ts`, `src/businessEngagementReadiness.test.ts`, `src/apiContracts.test.ts`, `src/persistenceContracts.test.ts`, `src/agentContracts.test.ts`, `tests/mobile-contract.test.ts`, `docs/verification.md`. | Covered for core, API, E2E matrix, capacity planning, AI provider readiness, observability readiness, payment readiness, mobile render readiness, cloud artifact proof readiness, reviewer DB seed readiness, business engagement readiness, persistence, orchestration, and mobile contracts; UI covered by smoke |
| Name gaps plainly. | README Honest Gaps, `docs/handoff-notes.md`, `docs/requirements-traceability.md`. | Covered |

## Reviewer Path

1. Read `README.md`, `docs/brief-context.md`, and `docs/free-mvp-plan.md`.
2. Run `npm install` if dependencies are not present, then `npm run dev`.
3. In the app, inspect the customer panel, start the local workspace, scan the
   sample invite, generate a card, prepare handoff, inspect the admin panel, and
   inspect adapter readiness.
4. Run `npm run check`.
5. Run `npm run deployment:doctor`.
6. Run `npm run cloud:doctor`.
7. Run `npm run cloud:artifact:proof:doctor`.
8. Run `npm run api:doctor`.
9. Run `npm run security:doctor`.
10. Run `npm run external:audit:doctor`.
11. Run `npm run e2e:coverage:doctor`.
12. Run `npm run payment:doctor`.
13. Run `npm run provider:governance:doctor`.
14. Run `npm run capacity:doctor`.
15. Run `npm run printer:pricing:doctor`.
16. Run `npm run localization:doctor`.
17. Run `npm run api:doctor:memory`.
18. Run `npm run api:doctor:postgres`.
19. Run `CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live`.
20. Run `CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:http`.
21. Run `CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live`.
22. Run `npm run artifact:doctor`.
23. Run `CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled OBJECT_STORE_URL=http://127.0.0.1:9000 ... npm run artifact:doctor:s3:live`.
24. Run `npm run persistence:doctor`.
25. Run `npm run demo:doctor`.
26. Run the worker and mobile doctor commands in `docs/verification.md`.
27. Run `npm run mobile:render:doctor`.
28. Run `npm run hosted:api:doctor`.
29. Run `npm run hosted:rollback:plan:doctor`.
30. With Vercel access, run `CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:env:inventory`.
31. After obtaining a production `pk_live` Clerk publishable key and `CLERK_AUDIENCE`, run the redacted repair plan: `CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app VITE_CLERK_PUBLISHABLE_KEY=pk_live_... CLERK_AUDIENCE=... npm run hosted:clerk:repair`.
32. To apply that Clerk config to Vercel, run `CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR=enabled CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_APPLY=enabled CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PUBLIC_KEY_REPLACE=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app VITE_CLERK_PUBLISHABLE_KEY=pk_live_... CLERK_AUDIENCE=... npm run hosted:clerk:repair`, redeploy, then run `CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:clerk:public-config`.
33. With the remaining Clerk verifier values present in the process env and production approval, run `CUSTOMCARD_HOSTED_ENV_REPAIR=enabled CUSTOMCARD_HOSTED_ENV_REPAIR_APPLY=enabled CUSTOMCARD_HOSTED_ENV_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app CLERK_ISSUER=... CLERK_AUDIENCE=... npm run hosted:env:repair`.
34. With real hosted Clerk JWTs, run `CUSTOMCARD_HOSTED_AUTH_PROBE=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app CUSTOMCARD_HOSTED_CUSTOMER_JWT=... CUSTOMCARD_HOSTED_ADMIN_JWT=... npm run hosted:auth:probe`.
35. With real hosted Clerk JWTs and approval for a harmless live render-packet probe row, run `CUSTOMCARD_HOSTED_MUTATION_PROBE=enabled CUSTOMCARD_HOSTED_MUTATION_PROBE_ACKNOWLEDGE_LIVE_WRITES=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app CUSTOMCARD_HOSTED_CUSTOMER_JWT=... CUSTOMCARD_HOSTED_ADMIN_JWT=... npm run hosted:mutation:probe`.
36. Against a restored hosted DB clone, run `CUSTOMCARD_HOSTED_DB_RESTORE_DRILL=enabled CUSTOMCARD_RESTORE_DATABASE_URL=postgres://... CUSTOMCARD_RESTORE_SOURCE=neon-branch CUSTOMCARD_RESTORE_POINT_IN_TIME=2026-06-15T14:00:00.000Z CUSTOMCARD_BACKUP_RETENTION_DAYS=14 CUSTOMCARD_BACKUP_RPO_MINUTES=15 CUSTOMCARD_BACKUP_RTO_MINUTES=60 npm run hosted:db:restore:drill`.
37. Run `npm run reviewer:db:seed:doctor`.
38. Run `npm run business:engagement:doctor`.
39. Run `npm run mobile:release:doctor`.
40. Inspect `.github/workflows/verify.yml`.
41. Inspect screenshots in `docs/evidence/` and known gaps in
   `docs/handoff-notes.md`.

## Known Gaps

- No live production user auth or delivered account recovery flow; durable
  account identity and hashed recovery challenge storage are covered by doctor.
- No completed Gmail, Google Calendar, Outlook, or iCloud OAuth callback, token
  exchange, credential persistence, revocation, or live import flow. Google
  connection start can only return an env-gated authorization URL.
- Production Vercel + Neon public route and hosted Postgres runtime proof is
  attached, including `/api/health` reporting `runtime.mode=postgres` and a
  protected admin route returning app-level `401 auth-required`. `npm run
  hosted:env:inventory` is available for redacted QA/production Vercel env key
  coverage. `npm run hosted:auth:probe` is available for read-only QA/production
  Clerk customer, admin, missing-auth, and wrong-role probes with
  operator-supplied JWTs. `npm run hosted:mutation:probe` is available for a
  guarded live render-packet mutation, idempotency replay/conflict, and
  audit-counter proof. `npm run hosted:rollback:plan:doctor` validates the
  attached forward-only migration rollback plan. `npm run
  hosted:db:restore:drill` is available for restored-clone schema, index,
  table-read, retention, RPO, and RTO proof. The redacted production env
  inventory is attached but incomplete: initial inventory showed `CLERK_ISSUER`,
  `CLERK_AUDIENCE`, and `IDEMPOTENCY_KEY_TTL_HOURS` missing; guarded partial
  repair applied `IDEMPOTENCY_KEY_TTL_HOURS`; follow-up inventory shows only
  `CLERK_ISSUER` and `CLERK_AUDIENCE` missing. Guarded public Clerk config
  evidence also shows the deployed production bundle currently ships a redacted
  Clerk `pk_test` publishable key and no `pk_live` key, so production OAuth
  remains unclaimed until the live publishable key is deployed and re-probed.
  Guarded Clerk config repair-plan evidence shows no local `pk_live` or
  `CLERK_AUDIENCE` value is available to apply yet, and records the apply path
  for replacing the public key, deriving/applying `CLERK_ISSUER`, applying
  `CLERK_AUDIENCE`, redeploying, and re-probing. No
  executed production Clerk JWT verification, authenticated DB-backed mutation
  replay, audit-row write, restored-clone switch, or backup/restore policy is
  claimed. Guarded restore-drill plan evidence is attached at
  `docs/evidence/hosted-api/2026-06-15-db-restore-drill-plan.json`; it records
  the restore source, restore point, 14-day retention, 15-minute RPO,
  60-minute RTO, and no live mutations, while remaining blocked on
  `CUSTOMCARD_RESTORE_DATABASE_URL`.
- AI provider readiness is covered as repo-local text/image adapter inventory,
  model allowlist, prompt safety, privacy, print QA, spend, evaluation, and
  rollout gates; no live AI text/image generation, model output QA run, or
  production AI traffic is claimed.
- Live-applied production cloud object-store bucket policy/IAM verification and
  physical printer certification are still not attached; Cloud artifact proof readiness tracks the
  applied bucket ARN, IAM policy output, signed URL probe, access-log,
  secret-manager sync, and restore-drill evidence requirements, while static
  AWS artifact-store IaC, local SVG/PDF/manifest package export, signed artifact
  handoff contracts, temporary filesystem object-store write/read verification,
  injected S3-compatible write/read contract verification, and live CI/local
  MinIO/S3-compatible write/read doctor coverage are covered.
- No live vendor quote, order, payment charge/refund, or cancellation
  integration; payment provider coverage is sandbox-contract only.
- Observability readiness is covered as repo-local telemetry schema, redaction,
  sampling, retention, provider-contract, alert-route, and incident-review
  gates; no live observability ingestion, alert delivery, retention enforcement,
  or incident-response drill is claimed.
- No measured production capacity benchmark, live autoscaler report, hosted
  database throughput proof, or provider spend report; capacity profiles remain
  planning contracts.
- Public printer pricing is observed research only; checkout confirmation,
  taxes, stock, pickup windows, and checkout availability are not live-verified.
  Coupon sources are collected, but coupon discounts affect best-price ranking
  only after provider-portal application proof for the same cart context. The
  current catalog has 12 official-source observations across 8 persisted source
  links and a no-network pricing doctor.
- Non-English and RTL localization is readiness-gated only; professional
  translation QA, native RTL render proof, and live translation providers are
  not covered.
- No real droplet or Kubernetes deployment execution evidence.
- Hosted GitHub Actions verification exists for main pushes, but no real droplet
  or Kubernetes deployment execution evidence is claimed.
- Tooling-free iOS Release simulator home, compact-phone, standard-phone,
  large-phone, and tablet screenshots are attached, and a guarded native-install
  proof now blocks stale simulator bundles from counting as current release
  evidence. A fresh exported iOS JS bundle now proves the current print-shop copy
  can be embedded, but no print/RTL render matrix, current installed native app,
  EAS cloud artifact, or signed mobile artifact is attached; mobile render
  readiness, native release profiles, and release doctors are covered as
  contracts.
- No physical print certification.
- No external legal/security/privacy/accessibility audit.
- No browser UI unit-coverage instrumentation; UI remains covered by smoke and
  visual checks.

## Final Claim

The repo is ready to be described as a polished, reviewable, free local
CustomCard MVP plus a tested adapter-readiness/admin/customer/localization
expansion slice, with deterministic demo workflows, documented production
boundaries, tests, visual evidence, and honest handoff notes.

Not ready to claim: production SaaS, live OAuth integration, live CRM customer
messaging or CRM writeback, paid AI generation, direct retail-printer ordering,
live charges/refunds, certified physical print quality, professional
translation QA, live observability operations, deployed service, native mobile
release, or externally audited legally/security-reviewed product.
