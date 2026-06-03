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

This repo now contains a runnable Vite, React, and TypeScript free local MVP plus
a repo-local production skeleton. The web app opens on the actual reviewer
workflow: local demo auth, manual/ICS event import, opportunity approval,
relationship memory review, deterministic card generation, 5x7 SVG panel export,
local SVG/PDF print package export, manual vendor handoff, customer/admin
panels, and catalog-driven adapter readiness.

The service kernel still executes the critical backend contracts in code:
metadata-only provider import, approved relationship memory, layout-safe 5x7
rendering, explicit order lifecycle transitions, recovery paths,
regional/vendor-share policy, and runtime readiness checks.
Render-packet artifact handoff is modeled with checksum manifests,
HMAC-signed URL contracts, local filesystem write/read verification, and an
injected S3-compatible client contract, while live cloud S3/MinIO writes remain
credential-gated.

Real ordering is deliberately disabled. The
`WalgreensFiveBySevenDoubleSidedCardAdapter` is represented as a hard-gated
contract: 1500 x 2100 px, 300 DPI, four panels, live-quote inputs, and no external
order until physical print certification exists.

The repo also includes a Postgres migration, worker and migration runners,
dev/droplet/cloud deployment manifests, a static/API production server, and an
Expo iOS/Android customer shell contract that resolves its API URL from
environment configuration instead of static placeholders.

## Free MVP Capabilities

- Local demo workspace auth using browser storage only.
- Manual invite text and `.ics` paste import.
- Local vCard and CSV contact/address import.
- Deterministic opportunity detection and user approve/snooze/dismiss states.
- User-approved relationship memories with add/delete controls.
- Deterministic card copy and visual directions with no paid AI calls.
- Four 1500 x 2100 SVG panels for front, inside-left, inside-right, and back.
- Local print package export with the four SVG panels, a combined 5x7 PDF proof,
  and a checksum manifest.
- Manual handoff checklist for Walgreens, CVS, FedEx Office, Walmart, Staples,
  Office Depot, or a local printer.
- Review-only public printer pricing comparison for Walgreens, CVS, FedEx,
  Walmart, Staples, and Office Depot manual handoff, with official-source
  freshness checks and checkout confirmation still required.
- Customer panel with local chat transcript, next-card state, render choices,
  and free workflow actions.
- Admin panel with provider coverage, env gates, cloud runtime readiness, and
  blocked live-vendor adapters.
- Adapter catalog covering free local paths plus gated Auth0, Clerk, Supabase
  Auth, Firebase Auth, Amazon Cognito, OpenAI, Anthropic, Azure OpenAI, Amazon
  Bedrock, Google, Google People, Microsoft Graph, CardDAV, Mistral, Cohere,
  Perplexity, xAI, Together, Groq, DeepSeek, Fireworks, Hugging Face, Stability,
  Replicate, Ideogram, Leonardo, fal, Black Forest Labs, Resend, SendGrid,
  Postmark, Mailgun, Twilio SMS, WhatsApp Cloud API, Expo Push, Firebase Cloud
  Messaging, Stripe Checkout, PayPal Orders, Square Payments, Adyen Checkout,
  Sentry, PostHog, OpenTelemetry OTLP, Grafana Cloud, Datadog Logs, Better
  Stack Logs, and vendor contracts.
- Executable adapter dry runs that validate readiness, reject placeholder
  secrets, redact provider-bound text, prepare no-network request contracts, and
  keep live vendor ordering blocked.
- API contract/server boundary with `/api/health`, customer/admin bootstrap,
  mobile bootstrap, provider readiness, explicit contract/memory/Postgres
  runtime modes, tested memory-mode auth/idempotency replay, fake-pool and
  isolated live Postgres auth/idempotency/audit/queue runtime checks, admin demo
  reset, and no live external calls.
- Persistence contract/migration boundary for auth sessions, hosted account
  identities, hashed recovery challenges, idempotency replay, queue jobs, audit
  logs, and 11 schema-backed API routes.
- Tested Expo customer shell contract for card queue, memory review, local chat,
  render choices, manual handoff, and real-order kill-switch posture.

## Run

```sh
npm install
npm run dev
```

Open the Vite URL printed by the dev server. The app opens directly into the
free local workflow, not a marketing landing page.

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
OBJECT_STORE_SIGNING_SECRET=replace-me-do-not-commit-real-secret
ARTIFACT_SIGNED_URL_TTL_MINUTES=15
CUSTOMCARD_API_RUNTIME=contract
AUTH_SESSION_SECRET=replace-me-do-not-commit-real-secret
CUSTOMCARD_CUSTOMER_SESSION_TOKEN=replace-me-do-not-commit-real-secret
CUSTOMCARD_ADMIN_SESSION_TOKEN=replace-me-do-not-commit-real-secret
IDEMPOTENCY_KEY_TTL_HOURS=24
REAL_ORDER_KILL_SWITCH=disabled
```

Mobile shell variable:

```sh
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173
```

Provider credentials such as `AUTH0_DOMAIN`, `CLERK_SECRET_KEY`,
`SUPABASE_URL`, `FIREBASE_API_KEY`, `COGNITO_DOMAIN`,
`CARDDAV_BASE_URL`, `GOOGLE_OAUTH_CLIENT_ID`, `OPENAI_API_KEY`,
`AZURE_OPENAI_API_KEY`, `AWS_ACCESS_KEY_ID`, `ANTHROPIC_API_KEY`,
`MISTRAL_API_KEY`, `COHERE_API_KEY`, `PERPLEXITY_API_KEY`, `XAI_API_KEY`,
`TOGETHER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`,
`FIREWORKS_API_KEY`, `STABILITY_API_KEY`, `HUGGINGFACE_API_TOKEN`,
`REPLICATE_API_TOKEN`, `IDEOGRAM_API_KEY`, `LEONARDO_API_KEY`, `FAL_KEY`,
`BFL_API_KEY`, `RESEND_API_KEY`, `SENDGRID_API_KEY`,
`POSTMARK_SERVER_TOKEN`, `MAILGUN_API_KEY`, `TWILIO_ACCOUNT_SID`,
`WHATSAPP_ACCESS_TOKEN`, `EXPO_ACCESS_TOKEN`, `STRIPE_SECRET_KEY`,
`PAYPAL_CLIENT_ID`, `SQUARE_ACCESS_TOKEN`, `ADYEN_API_KEY`, `SENTRY_DSN`,
`POSTHOG_PROJECT_API_KEY`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
`GRAFANA_OTLP_API_KEY`, `DATADOG_API_KEY`, `BETTERSTACK_SOURCE_TOKEN`, and
Microsoft Graph keys are documented in `infra/env/.env.example`, but live OAuth,
AI/image calls, notification sends, payment charges/refunds, telemetry ingestion,
and vendor ordering are not implemented in this repo state.

## Architecture

```text
React free local MVP
  -> typed domain contracts
  -> executable service kernel
  -> API and persistence contracts
  -> Postgres migration model
  -> worker/migration/runtime scripts
  -> API/static production server
  -> Docker Compose or Kubernetes manifests
  -> Expo customer mobile shell contract
```

The service kernel models the critical backend contracts without pretending they
are deployed integrations: metadata-only provider import, approved relationship
memory, deterministic 5x7 render validation, explicit order lifecycle recovery,
regional/vendor-share controls, and readiness checks.

The provider runtime adds a no-network execution boundary for the adapter
catalog: future OAuth, text-chat, image-generation, notification, payment,
observability, and vendor paths can be reviewed as redacted request contracts
without placing API calls, charges, telemetry events, or orders.

Verification:

```sh
npm run check
npm run deployment:doctor
npm run api:doctor
npm run api:doctor:memory
npm run api:doctor:postgres
CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live
CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live
npm run artifact:doctor
npm run persistence:doctor
npm run demo:doctor
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```

`npm run check` now runs the full test suite, contract coverage thresholds, the
production build, and a high-severity dependency audit. The V8 coverage gate
applies to `apps/mobile/src/customerExperience.ts`, `src/accountAuth.ts`,
`src/agentContracts.ts`, `src/apiContracts.ts`, `src/artifactHandoff.ts`,
`src/artifactStore.ts`, `src/domain.ts`, `src/freeMvp.ts`,
`src/persistenceContracts.ts`, `src/printerPricing.ts`, `src/printExport.ts`,
`src/providerCatalog.ts`, `src/providerRuntime.ts`, and
`src/serviceKernel.ts`; browser UI behavior is verified through Chrome smoke
tests.

`npm run deployment:doctor` emits a JSON readiness report for the local-dev,
cheap-droplet, cloud-native, runtime, and data lanes. It validates committed IaC
shape only; it does not prove a real cloud cluster or droplet deployment.

`.github/workflows/verify.yml` runs the same repository check, deployment
doctor, contract API doctor, memory-runtime API doctor, Postgres runtime
contract doctor, live Postgres integration doctor, account-auth storage/recovery
doctor, artifact-store filesystem plus S3-compatible contract doctor,
persistence doctor, demo reset doctor, worker readiness, and mobile doctor on
pushes to `main` and pull requests.

## Project Docs

- [Brief context](docs/brief-context.md)
- [Product brief](docs/product-brief.md)
- [Free MVP plan](docs/free-mvp-plan.md)
- [Requirements and traceability](docs/requirements-traceability.md)
- [Decisions](docs/decisions.md)
- [Delivery process](docs/delivery-process.md)
- [Platform expansion design](docs/platform-expansion-design.md)
- [Printer pricing research](docs/printer-pricing-research.md)
- [Verification](docs/verification.md)
- [Completion audit](docs/completion-audit.md)
- [Final package](docs/final-package.md)
- [Handoff notes](docs/handoff-notes.md)
- [System design prompt](docs/system-design-prompt.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Infrastructure](infra/README.md)

## Honest Gaps

The repo does not include live production user auth, live OAuth, live AI/image
generation, live vendor quotes, live payment charges/refunds, direct
retail-printer ordering, live telemetry ingestion/alerting, live S3/MinIO cloud
object-store writes, deployed Postgres API integration, hosted account-token
verification,
native mobile builds, deployment evidence, legal/security review, or physical
print certification. Those paths are
represented as contracts and hard gates so reviewers can inspect the system
shape without mistaking the free local MVP for a certified production
fulfillment service.
