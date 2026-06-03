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
  readiness, and adapter readiness when Chrome is available.
- Provider-catalog tests cover adapter capability breadth, free local fallbacks,
  external provider docs/env gates, admin/customer panel models, deterministic
  local chat, and blocked live-vendor status.
- Provider-runtime tests cover every catalog adapter with no-network dry runs,
  placeholder-secret rejection, redacted chat/image/notification/payment/
  observability request contracts, metadata-only event/contact import contracts,
  free local fallbacks, and hard-blocked live vendor ordering.
- Printer-pricing tests cover review-only public Walgreens/CVS/FedEx/Walmart/
  Staples/Office Depot price observations, collection rules, 30-day freshness
  blocking, minimum quantity math, source URLs, manual confirmation, and
  `liveQuote: false`.
- Print-export tests cover local source SVG files, a combined 5x7 PDF proof,
  checksum manifest validation, preflight failure paths, and no-network/no-order
  summary behavior.
- Artifact-handoff tests cover HMAC-signed URLs, object-store URI construction,
  config validation, expiry limits, and tamper detection.
- Provider adapter coverage currently includes 87 adapters: 16 ready-local, 56
  credential-gated, 9 contract-only, and 6 blocked.
- Domain and service tests exercise source extraction, weak-input blocking, raw
  content rejection, and unsafe lifecycle rejection.
- Infra contract tests inspect database migration, Docker Compose, Kubernetes,
  env examples, runtime checks, CI workflow gates, coverage scope, and the
  mobile shell/customer contract boundary.
- Mobile contract tests cover the Expo customer experience model: card queue,
  memory review, local chat, render choices, manual handoff, and real-order
  kill-switch doctor behavior.
- Agent-contract tests cover the typed orchestration surface and fail-closed
  default policy.
- API-contract and API-server tests cover `/api/health`, customer/admin
  bootstrap, mobile bootstrap, provider readiness, idempotent mutation contracts,
  explicit contract/memory runtime modes, memory-mode Bearer session gates,
  customer pricing preview, `X-Idempotency-Key` replay/conflict behavior,
  404/405 behavior, and the no-live-call/no-real-order posture.
- Account-auth tests and `npm run account:doctor:live` cover hosted auth adapter
  requirements, durable account identity storage, no raw provider profiles,
  provider-subject uniqueness, hashed expiring recovery challenges, durable
  sessions, and recovery audit rows.
- Persistence-contract tests and `npm run persistence:doctor` cover auth-session
  schema, account identity/recovery schema, idempotency replay state, queue job
  envelopes, append-only audit contracts, demo reset mappings, and 11
  schema-backed API route mappings.
- Demo seed tests and `npm run demo:doctor` cover deterministic reviewer reset
  fixtures, SQL preview, signed artifact handoff references, and no-live-call
  safety gates.
- Deployment readiness is checked by `npm run deployment:doctor`, which emits a
  JSON report for local-dev, cheap-droplet, cloud-native, runtime, and data
  lanes.
- Coverage is measured for core, API, artifact handoff, pricing, print export, persistence, orchestration, and mobile
  contract modules with V8 thresholds enforced by `npm run check`: 90%
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
npm run api:doctor
npm run api:doctor:memory
npm run api:doctor:postgres
CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live
CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live
npm run persistence:doctor
npm run demo:doctor
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

## Latest Result

Last run: 2026-06-03.

```text
npm run check
```

Result: passed.

- Vitest: 17 test files passed, 117 tests passed.
- Coverage: 15 core/API/persistence/infra/mobile test files passed, 109 tests passed; V8 report measured
  91.44% statements, 84.49% branches, 97.01% functions, and 95.25% lines across
  `apps/mobile/src/customerExperience.ts`, `src/accountAuth.ts`, `src/agentContracts.ts`,
  `src/apiContracts.ts`, `src/artifactHandoff.ts`, `src/domain.ts`, `src/freeMvp.ts`,
  `src/persistenceContracts.ts`, `src/printerPricing.ts`, `src/printExport.ts`,
  `src/providerCatalog.ts`, `src/providerRuntime.ts`, and `src/serviceKernel.ts`.
- Build: `tsc -b && vite build` passed.
- Audit: `npm audit --audit-level=high` found 0 vulnerabilities.

```text
npm run deployment:doctor
```

Result: passed. The JSON report marked local-dev, cheap-droplet, cloud-native,
runtime, and data lanes `ready` with 18 deployment checks passed and no blockers.

```text
npm run api:doctor
```

Result: passed. API doctor reported 13 routes, 6 idempotent mutation contracts,
87 providers, 18 persistence tables, render-packet artifact manifests, signed
artifact URL contracts, contract runtime mode, no live external calls, no real
vendor orders, no raw content storage, and no blockers.

```text
npm run api:doctor:memory
```

Result: passed. Memory runtime doctor reported Bearer auth and idempotency
enforced, 2 configured sessions, 13 routes, 6 idempotent mutation contracts, 87
providers, 18 persistence tables, render-packet artifact manifests, signed
artifact URL contracts, no live external calls, no real vendor orders, and no
blockers.

```text
npm run api:doctor:postgres
```

Result: passed. Postgres runtime doctor used an injected fake `pg` pool to
exercise auth-session lookup, wrong-role blocking, idempotent mutation insert,
same-key replay, same-key/different-body conflict, audit-log insert, and
queue-job insert. It reported 1 idempotency record, 1 audit record, 1 queued job,
and no blockers.

```text
CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live
```

Result: passed. Live Postgres integration doctor created an isolated temporary
database, applied `infra/migrations/001_initial_schema.sql`, seeded customer and
admin auth sessions, authorized the customer through the real `pg` runtime,
blocked a wrong-role admin request, persisted an idempotent queue-backed
mutation, replayed the same idempotency key, rejected a changed-body conflict,
and verified 1 idempotency record, 1 audit record, and 1 queued job before
dropping the temporary database.

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
npm run persistence:doctor
```

Result: passed. Persistence doctor reported 18 required tables, auth-session
persistence, account identity and recovery challenge persistence, idempotency
replay, queue jobs, render-packet artifact manifest signals, Postgres runtime
SQL/doctor/integration signals, account-auth contract/doctor signals,
append-only audit coverage, 11 schema-backed API routes, and no blockers.

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
`render-review`, and `vendor-handoff`, with idempotency required.

```text
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

Result: passed. Mobile shell configuration resolved from environment and the
customer experience contract was present.

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
hosted-auth, contact-import, notification, payment, and observability catalog
passes the catalog contains 16 ready-local, 56 credential-gated, 9
contract-only, and 6 blocked adapters. The web mobile customer panel appears
before the navigation rail with zero horizontal overflow at 1440px desktop and
390px mobile widths.

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
- No live object store, queue, droplet, cloud cluster, or vendor sandbox test.
- Local SVG/PDF/manifest print package export and signed artifact handoff
  contracts are covered, but no live object-store upload is claimed.
- Public printer pricing is review-only and source-backed with freshness gates;
  no live quote, tax, coupon, stock, pickup-window, or checkout test is claimed.
- Payment providers are sandbox-contract only; no live charge, capture, refund,
  dispute, tax, settlement, or payment-webhook test is claimed.
- Observability providers are contract-only; no live telemetry ingestion, alert,
  retention, dashboard, or incident-response drill is claimed.
- No deployed production Postgres API integration or live hosted account-token
  verification; local/CI isolated Postgres and account-auth storage/recovery
  integration are covered by doctors.
- No live AI text-chat or image-generation provider test; provider runtime
  coverage stops at redacted no-network request contracts.
- No physical print certification.
- No React Native render test, mobile emulator run, mobile native build, or
  signed iOS/Android artifact.
- Provider docs were checked at the contract/link level only; no vendor sandbox
  credentials or market/commercial terms were verified.
- Browser UI smoke tests are not included in the V8 unit coverage percentages;
  they remain covered by Chrome smoke assertions and visual evidence.
- Hosted GitHub Actions verification exists for main pushes; no production
  deployment evidence is claimed.
