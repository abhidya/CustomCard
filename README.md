# CustomCard

CustomCard is an AI-powered personal greeting-card CRM and print-production
engine.

The product is intended to watch for meaningful events from connected email and
calendar sources, help the user generate a relationship-aware card, produce
print-ready 5x7 assets, and route fulfillment through vendor-neutral handoff
layers.

## Core Thesis

This is not just AI greeting cards. The defensible product is:

1. Knowing when a card is needed.
2. Knowing what relationship context is safe and useful.
3. Producing deterministic print-ready panels once renderer validation exists.
4. Routing the card through vendor adapters without risking a bad physical print.

## Current Stage

This repo contains a runnable Vite, React, and TypeScript service console plus a
repo-local production skeleton. The UI turns the pasted founder brief into
storyboards, user paths, system architecture, certification gates, and
implementation milestones. The service kernel now executes the critical backend
contracts in code: metadata-only provider import, approved relationship memory,
layout-safe 5x7 rendering, explicit order lifecycle transitions, recovery paths,
regional/vendor-share policy, and runtime readiness checks.

Real ordering is deliberately disabled. The
`WalgreensFiveBySevenDoubleSidedCardAdapter` is represented as a hard-gated
contract: 1500 x 2100 px, 300 DPI, four panels, live-quote inputs, and no external
order until physical print certification exists.

The repo also includes a Postgres migration, worker and migration runners,
dev/droplet/cloud deployment manifests, a static production server, and a thin
Expo iOS/Android app-shell boundary that resolves its API URL from environment
configuration instead of static placeholders.

## Run

```sh
npm install
npm run dev
```

Open the Vite URL printed by the dev server. The app is a service console, not a
marketing landing page.

## Environment

The local web console does not need provider or vendor credentials. Runtime
scripts and deployment manifests require explicit environment variables so they
fail closed instead of silently using placeholders.

Core runtime variables:

```sh
CUSTOMCARD_ENV=dev
DATABASE_URL=postgres://customcard:customcard@postgres:5432/customcard_dev
QUEUE_URL=redis://redis:6379/0
OBJECT_STORE_URL=http://minio:9000
REAL_ORDER_KILL_SWITCH=disabled
```

Mobile shell variable:

```sh
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173
```

Provider credentials such as `GOOGLE_OAUTH_CLIENT_ID` and
`GOOGLE_OAUTH_CLIENT_SECRET` are documented in `infra/env/.env.example`, but live
OAuth is not implemented in this repo state.

## Architecture

```text
React service console
  -> typed domain contracts
  -> executable service kernel
  -> Postgres migration model
  -> worker/migration/runtime scripts
  -> Docker Compose or Kubernetes manifests
  -> thin Expo mobile shell boundary
```

The service kernel models the critical backend contracts without pretending they
are deployed integrations: metadata-only provider import, approved relationship
memory, deterministic 5x7 render validation, explicit order lifecycle recovery,
regional/vendor-share controls, and readiness checks.

Verification:

```sh
npm run check
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

## Project Docs

- [Brief context](docs/brief-context.md)
- [Product brief](docs/product-brief.md)
- [Requirements and traceability](docs/requirements-traceability.md)
- [Decisions](docs/decisions.md)
- [Delivery process](docs/delivery-process.md)
- [Verification](docs/verification.md)
- [Completion audit](docs/completion-audit.md)
- [Handoff notes](docs/handoff-notes.md)
- [System design prompt](docs/system-design-prompt.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Infrastructure](infra/README.md)

## Honest Gaps

The repo does not include live OAuth, live AI generation, live vendor quotes,
payment handling, direct Walgreens/CVS ordering, deployment evidence, or physical
print certification. Those paths are represented as contracts and hard gates so
reviewers can inspect the system shape without mistaking it for a certified
production fulfillment service.
