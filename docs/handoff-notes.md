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
- Review-only public printer pricing research for Walgreens, CVS, FedEx,
  Walmart, Staples, and Office Depot, with official-source freshness reporting
  kept separate from live quote/order claims.
- Local print package export with four SVG upload artifacts, a combined 5x7 PDF
  proof, and a checksum manifest for manual printer handoff.
- Render-packet artifact handoff contracts with HMAC-signed URLs, artifact
  manifests, expiry checks, object-store signing env gates, local filesystem
  write/read verification, and injected S3-compatible write/read contract
  verification, plus a guarded live MinIO/S3-compatible write/read doctor.
- A tested customer mobile shell contract that mirrors the web customer panel at
  the product boundary.
- Typed storyboard, architecture, agent, print-adapter, and risk contracts.
- Executable service-kernel contracts for provider import, approved memory,
  card-project creation, print validation, order recovery, and regional policy.
- Postgres migration for users, hosted account identities, account recovery
  challenges, providers, events, opportunities, memories, projects, render
  packets, orders, consent, data requests, auth sessions, idempotency keys, API
  jobs, and audit logs.
- Docker, Docker Compose, Kubernetes, runtime doctor, worker, migration,
  API/static server with contract/memory/Postgres runtime validation,
  process-level Postgres API HTTP auth/idempotency/repository verification,
  repository-backed relationship-memory, render-packet, import-preview,
  card-project, manual-vendor-handoff, and data-request mutation paths, and
  mobile-shell scaffolding plus mobile contract validation.
- Admin-only demo reset contract and script doctor for deterministic reviewer
  data across users, sessions, events, memories, projects, render packets,
  orders, consent, data requests, and audit rows.
- GitHub Actions verification workflow for the local repository gates.
- Tests that prove the current skeleton does not fake weak input, live ordering,
  raw-content import, or unsafe order-state transitions.
- Chrome smoke tests that exercise the local auth -> import -> studio -> handoff
  workflow, customer/admin panels, adapter readiness, and mobile overflow
  behavior.

## What Is Deliberately Not Done

- No live production user auth or delivered account recovery flow; durable
  account identity and hashed recovery challenge storage are covered by doctor.
- No real email/calendar OAuth flow.
- No deployed production Postgres API integration or production hosted
  account-token verification outside the isolated live Postgres route-auth,
  Postgres API HTTP, and account-auth doctors.
- No live AI text/image generation.
- No live-applied production cloud object-store bucket is claimed outside the
  guarded CI/local MinIO doctor and static AWS artifact-store IaC contract;
  signed URL contracts, schema gates, temporary filesystem write/read
  verification, injected S3-compatible write/read contract verification, and
  live MinIO/S3-compatible doctor coverage are covered.
- No live retail-printer quote or order API.
- No live tax, coupon, stock, pickup-window, or checkout availability
  verification for public printer prices.
- No live payment charge/refund, cancellation, or external order-confirmation
  integration; payment provider coverage is sandbox-contract only.
- No live observability ingestion, alert routing, retention enforcement, or
  incident-response drill; observability provider coverage is contract-only.
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
7. Run `npm run api:doctor:postgres`.
8. Run `CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live`.
9. Run `CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:http`.
10. Run `CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live`.
11. Run `npm run cloud:doctor`.
12. Run `npm run artifact:doctor`.
13. Run `CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled OBJECT_STORE_URL=http://127.0.0.1:9000 ... npm run artifact:doctor:s3:live` against MinIO when Docker or a compatible endpoint is available.
14. Run `npm run persistence:doctor`.
15. Run `npm run demo:doctor`.
16. Run the worker and mobile doctor commands in `docs/verification.md`.
17. Inspect the app with `npm run dev`.
18. In the app, start a local workspace, scan the sample invite, generate a card,
   prepare handoff, inspect the customer panel, inspect the admin panel, and
   inspect adapter readiness.

## Suggested Submission Note

CustomCard started from a last-minute physical wedding-card workflow and expanded
into a free local MVP plus a contract-first production skeleton for an event-aware
card concierge. The current repo does not claim live production fulfillment. It
proves the product workflow, customer/admin/API/persistence surfaces, account
identity/recovery storage, memory and route-scoped Postgres auth/idempotency runtime behavior,
process-level Postgres HTTP auth/idempotency/repository behavior,
repository-backed relationship-memory, render-packet, import-preview,
card-project, manual-vendor-handoff, and data-request mutation coverage, public
printer pricing research, local SVG/PDF print package export, temporary
filesystem artifact-store write/read verification, injected S3-compatible
artifact-store contract verification, live MinIO/S3-compatible artifact-store
doctor coverage, provider-adapter readiness, domain boundaries, signed artifact
handoff contracts, print contracts, order lifecycle,
deployment shape, and safety gates with executable TypeScript, browser smoke
tests, visual evidence, and infrastructure tests.
Real external AI, OAuth, and ordering remain disabled until production
credentials, consent flows, vendor terms, sandbox/live quote behavior, physical
print certification, and security/legal review are complete.

## Next Build Slice

The highest-leverage next slice is broadening the remaining production-adjacent
edges now that the repository-backed Postgres HTTP path and live MinIO artifact
path are verified:

- Live seed execution against a deployed reviewer database.
- CI-friendly Chrome smoke hardening.
- Production cloud bucket policy/IAM verification outside the CI/local MinIO
  doctor.
