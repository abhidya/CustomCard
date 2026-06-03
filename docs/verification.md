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
  studio -> handoff workflow, and adapter readiness when Chrome is available.
- Domain and service tests exercise source extraction, weak-input blocking, raw
  content rejection, and unsafe lifecycle rejection.
- Infra contract tests inspect database migration, Docker Compose, Kubernetes,
  env examples, runtime checks, and the mobile shell.
- Runtime doctor fails closed on missing or placeholder required environment
  variables.
- Real ordering remains disabled.
- Free local MVP workflow renders in desktop and mobile visual checks.

## Fresh Commands To Run

```sh
npm run check
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

## Latest Result

Last run: 2026-06-03.

```text
npm run check
```

Result: passed.

- Vitest: 5 test files passed, 40 tests passed.
- Build: `tsc -b && vite build` passed.
- Audit: `npm audit --audit-level=high` found 0 vulnerabilities.

```text
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp REAL_ORDER_KILL_SWITCH=disabled npm run worker
```

Result: passed. Worker reported queue readiness for `provider-sync`,
`render-review`, and `vendor-handoff`, with idempotency required.

```text
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

Result: passed. Mobile shell configuration resolved from environment.

```text
Visual inspection
```

Result: passed with local rendered screenshots.

- Desktop opportunity screen: `docs/evidence/customcard-desktop.png`.
- Mobile opportunity screen after responsive fix: `docs/evidence/customcard-mobile.png`.
- Desktop card studio screen: `docs/evidence/customcard-studio.png`.
- Desktop manual handoff screen: `docs/evidence/customcard-handoff.png`.

The visual pass caught and fixed two layout issues: mobile status-chip clipping
and cramped four-across panel previews.

```text
Final package audit
```

Result: passed. `docs/final-package.md` was added from the
`deliver-ambiguous-brief` final package template, README links it, and stale
documentation claims found during the audit were corrected.

## Known Verification Gaps

- No live OAuth integration test.
- No real database migration run against Postgres in this pass.
- No live object store, queue, or vendor sandbox test.
- No physical print certification.
- No mobile native build or signed iOS/Android artifact.
- No current market or vendor API research verification.
- No coverage threshold or coverage report.
