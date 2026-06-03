# Handoff Notes

## Current State

CustomCard is now a reviewable free local MVP for an event-aware personal
greeting-card CRM and fulfillment product, plus a contract-first service
skeleton for the production path. It includes:

- A runnable Vite/React/TypeScript app with local demo auth, manual/ICS import,
  opportunity approval, card studio, memory review, SVG export, manual vendor
  handoff, and adapter readiness.
- Typed storyboard, architecture, agent, print-adapter, and risk contracts.
- Executable service-kernel contracts for provider import, approved memory,
  card-project creation, print validation, order recovery, and regional policy.
- Postgres migration for users, providers, events, opportunities, memories,
  projects, render packets, orders, consent, data requests, and audit logs.
- Docker, Docker Compose, Kubernetes, runtime doctor, worker, migration, static
  server, and mobile-shell scaffolding.
- Tests that prove the current skeleton does not fake weak input, live ordering,
  raw-content import, or unsafe order-state transitions.
- Chrome smoke tests that exercise the local auth -> import -> studio -> handoff
  workflow and mobile overflow behavior.

## What Is Deliberately Not Done

- No production user auth or account recovery.
- No real email/calendar OAuth flow.
- No production API server with authenticated server-side sessions.
- No live AI text/image generation.
- No PNG/PDF export pipeline for physical production.
- No live Walgreens/CVS/FedEx/Shutterfly/vendor quote or order API.
- No payment, refund, cancellation, or external order-confirmation integration.
- No physical print certification.
- No legal or security review.
- No deployment has been performed in this pass.

## Reviewer Path

1. Read `README.md`.
2. Read `docs/brief-context.md` to understand the recovered prompt.
3. Read `docs/requirements-traceability.md` to see what is covered and open.
4. Run `npm run check`.
5. Run the worker and mobile doctor commands in `docs/verification.md`.
6. Inspect the app with `npm run dev`.
7. In the app, start a local workspace, scan the sample invite, generate a card,
   prepare handoff, and inspect adapter readiness.

## Suggested Submission Note

CustomCard started from a last-minute physical wedding-card workflow and expanded
into a free local MVP plus a contract-first production skeleton for an event-aware
card concierge. The current repo does not claim live production fulfillment. It
proves the product workflow, domain boundaries, print contracts, order lifecycle,
deployment shape, and safety gates with executable TypeScript, browser smoke
tests, and infrastructure tests. Real external ordering remains disabled until
production auth, OAuth, vendor terms, sandbox/live quote behavior, physical print
certification, and security/legal review are complete.

## Next Build Slice

The highest-leverage next slice is a persistent card project API plus
Postgres-backed authenticated service:

- Production user auth and authenticated card-project routes.
- Persistent event/opportunity/memory/order repositories.
- Render-packet artifact writing to object storage.
- Export package builder for manual vendor upload.
- Seed/demo reset workflow for reviewers.
- Coverage reporting and CI-friendly Chrome smoke configuration.
