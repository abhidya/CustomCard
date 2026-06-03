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
  placeholder-secret rejection, redacted chat/image request contracts,
  metadata-only import contracts, free local fallbacks, and hard-blocked live
  vendor ordering.
- Provider adapter coverage currently includes 42 adapters: 10 ready-local, 21
  credential-gated, 8 contract-only, and 3 blocked.
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
  404/405 behavior, and the no-live-call/no-real-order posture.
- Deployment readiness is checked by `npm run deployment:doctor`, which emits a
  JSON report for local-dev, cheap-droplet, cloud-native, runtime, and data
  lanes.
- Coverage is measured for core, API, orchestration, and mobile contract modules
  with V8 thresholds enforced by `npm run check`: 90% statements, 80% branches,
  90% functions, and 90% lines.
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
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

## Latest Result

Last run: 2026-06-03.

```text
npm run check
```

Result: passed.

- Vitest: 11 test files passed, 74 tests passed.
- Coverage: 9 core/API/infra/mobile test files passed, 68 tests passed; V8 report measured
  91.33% statements, 84.73% branches, 95.65% functions, and 94.03% lines across
  `apps/mobile/src/customerExperience.ts`, `src/agentContracts.ts`,
  `src/apiContracts.ts`, `src/domain.ts`, `src/freeMvp.ts`,
  `src/providerCatalog.ts`, `src/providerRuntime.ts`, and
  `src/serviceKernel.ts`.
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

Result: passed. API doctor reported 11 routes, 5 idempotent mutation contracts,
42 providers, no live external calls, no real vendor orders, no raw content
storage, and no blockers.

```text
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp REAL_ORDER_KILL_SWITCH=disabled npm run worker
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
After the provider expansion pass the catalog contains 10 ready-local, 21
credential-gated, 8 contract-only, and 3 blocked adapters. The web mobile
customer panel appears before the navigation rail with zero horizontal overflow
at 1440px desktop and 390px mobile widths.

```text
Final package audit
```

Result: passed. `docs/final-package.md` was added from the
`deliver-ambiguous-brief` final package template, README links it, and stale
documentation claims found during the audit were corrected.

## Known Verification Gaps

- No live OAuth integration test.
- No real database migration run against Postgres in this pass.
- No live object store, queue, droplet, cloud cluster, or vendor sandbox test.
- No DB-backed authenticated API integration test; API server coverage remains a
  contract/static bootstrap boundary.
- No live AI text-chat or image-generation provider test; provider runtime
  coverage stops at redacted no-network request contracts.
- No physical print certification.
- No React Native render test, mobile emulator run, mobile native build, or
  signed iOS/Android artifact.
- Provider docs were checked at the contract/link level only; no vendor sandbox
  credentials or market/commercial terms were verified.
- Browser UI smoke tests are not included in the V8 unit coverage percentages;
  they remain covered by Chrome smoke assertions and visual evidence.
- GitHub Actions workflow definition is contract-tested locally, but no remote
  hosted CI run is claimed in this pass.
