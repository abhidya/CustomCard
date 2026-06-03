# Handoff Notes

## Current State

CustomCard is now a reviewable free local MVP for an event-aware personal
greeting-card CRM and fulfillment product, plus a contract-first service
skeleton for the production path. It includes:

- A runnable Vite/React/TypeScript app with local demo auth, manual/ICS import,
  opportunity approval, card studio, memory review, SVG export, manual vendor
  handoff, local SVG/PDF print package export, customer panel, admin panel, and
  adapter readiness.
- A tested provider catalog covering local/free fallbacks plus credential-gated
  OpenAI, Anthropic, Google, Microsoft Graph, Hugging Face, Stability, Replicate,
  notification, vendor, and cloud-runtime adapters.
- Review-only public printer pricing research for Walgreens, CVS, and FedEx,
  kept separate from live quote/order claims.
- Local print package export with four SVG upload artifacts, a combined 5x7 PDF
  proof, and a checksum manifest for manual printer handoff.
- Render-packet artifact handoff contracts with HMAC-signed URLs, artifact
  manifests, expiry checks, and object-store signing env gates.
- A tested customer mobile shell contract that mirrors the web customer panel at
  the product boundary.
- Typed storyboard, architecture, agent, print-adapter, and risk contracts.
- Executable service-kernel contracts for provider import, approved memory,
  card-project creation, print validation, order recovery, and regional policy.
- Postgres migration for users, providers, events, opportunities, memories,
  projects, render packets, orders, consent, data requests, auth sessions,
  idempotency keys, API jobs, and audit logs.
- Docker, Docker Compose, Kubernetes, runtime doctor, worker, migration,
  API/static server with contract/memory runtime validation, and mobile-shell
  scaffolding plus mobile contract validation.
- GitHub Actions verification workflow for the local repository gates.
- Tests that prove the current skeleton does not fake weak input, live ordering,
  raw-content import, or unsafe order-state transitions.
- Chrome smoke tests that exercise the local auth -> import -> studio -> handoff
  workflow, customer/admin panels, adapter readiness, and mobile overflow
  behavior.

## What Is Deliberately Not Done

- No production user auth or account recovery.
- No real email/calendar OAuth flow.
- No live Postgres API integration test or production account auth flow.
- No live AI text/image generation.
- No live object-storage upload or cloud object-store integration for exported
  artifacts; signed URL contracts and schema gates are covered.
- No live Walgreens/CVS/FedEx/Shutterfly/vendor quote or order API.
- No live tax, coupon, stock, or pickup-window verification for public printer
  prices.
- No payment, refund, cancellation, or external order-confirmation integration.
- No React Native render test, emulator run, native build, or signed mobile
  artifact.
- No physical print certification.
- No legal or security review.
- No deployment has been performed in this pass.
- Hosted GitHub Actions verification exists for main pushes; no production
  deployment has been performed.

## Reviewer Path

1. Read `README.md`.
2. Read `docs/brief-context.md` to understand the recovered prompt.
3. Read `docs/requirements-traceability.md` to see what is covered and open.
4. Run `npm run check`.
5. Run `npm run api:doctor`.
6. Run `npm run api:doctor:memory`.
7. Run `npm run persistence:doctor`.
8. Run the worker and mobile doctor commands in `docs/verification.md`.
9. Inspect the app with `npm run dev`.
10. In the app, start a local workspace, scan the sample invite, generate a card,
   prepare handoff, inspect the customer panel, inspect the admin panel, and
   inspect adapter readiness.

## Suggested Submission Note

CustomCard started from a last-minute physical wedding-card workflow and expanded
into a free local MVP plus a contract-first production skeleton for an event-aware
card concierge. The current repo does not claim live production fulfillment. It
proves the product workflow, customer/admin/API/persistence surfaces, memory
auth/idempotency runtime behavior, public printer pricing research, local
SVG/PDF print package export, provider-adapter readiness, domain boundaries,
signed artifact handoff contracts, print contracts, order lifecycle,
deployment shape, and safety gates with executable TypeScript, browser smoke
tests, visual evidence, and infrastructure tests. Real external AI, OAuth, and
ordering remain disabled until production credentials, consent flows, vendor
terms, sandbox/live quote behavior, physical print certification, and
security/legal review are complete.

## Next Build Slice

The highest-leverage next slice is turning the memory/Postgres API runtime and
persistence schema into live Postgres-backed authenticated handlers:

- Production user auth and authenticated card-project routes.
- Persistent event/opportunity/memory/order repositories.
- Live render-packet artifact writing to object storage using the signed handoff
  contract.
- Seed/demo reset workflow for reviewers.
- Remote CI evidence collection and CI-friendly Chrome smoke hardening.
