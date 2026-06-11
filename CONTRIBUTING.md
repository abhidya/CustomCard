# Contributing to CustomCard

Thanks for helping make CustomCard easier to review, safer to extend, and more
credible as a production-shaped product skeleton.

## Project posture

CustomCard is currently a free local MVP plus contract-first production
skeleton. The local workflow must stay usable without paid AI, payment, retail,
CRM, email, cloud, or production auth credentials.

Do not enable live provider calls, live retail ordering, live payments, telemetry
ingestion, CRM sync, customer messaging, or production claims unless the matching
readiness register, tests, documentation, and evidence artifacts are updated in
the same change.

## Local setup

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The Vite URL opens the local customer workflow. For the mobile browser preview:

```sh
npm run mobile:web:preview
```

## Before changing code

Read the relevant source-of-truth docs:

- `README.md` for repo overview and current proof boundaries.
- `CONTEXT.md` for domain vocabulary.
- `DESIGN.md` for product, UI, and content direction.
- `docs/decisions.md` for standing architecture decisions.
- `docs/verification.md` for verification expectations.

## Development rules

- Prefer existing patterns, modules, contracts, and doctors before adding new structure.
- Keep changes small, reviewable, and reversible.
- Add or update focused tests when behavior changes.
- Keep customer-facing copy clear and confidence-bounded.
- Keep admin/provider/readiness terms out of customer surfaces unless explicitly required.
- Never commit secrets, private customer content, live checkout evidence with personal data, or real provider tokens.
- Preserve `REAL_ORDER_KILL_SWITCH=disabled` unless a release owner intentionally changes it with certification proof.

## Verification

Run the smallest check that proves your claim, then broaden when the change has
cross-module impact.

Common checks:

```sh
npm run test -- --run
npm run check
npm run security:doctor
npm run e2e:coverage:doctor
git diff --check
```

Useful focused checks:

```sh
npm run api:doctor
npm run payment:doctor
npm run retail:doctor
npm run mobile:render:doctor
npm run hosted:api:doctor
npm run provider:governance:doctor
npm run persistence:doctor
```

Credentialed doctors are opt-in and should only be run with safe local or CI
credentials designed for that check.

## Pull request checklist

- The change states what user or reviewer problem it solves.
- Tests or doctors prove the changed behavior.
- Documentation is updated when contracts, commands, env vars, or proof
  boundaries change.
- No live provider call, order, charge, message send, telemetry ingest, or public
  certification claim is introduced without matching evidence.
- Screenshots are updated when visible UI behavior changes materially.

