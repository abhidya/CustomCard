# CustomCard

CustomCard is an AI-powered personal greeting-card CRM and print-production
engine.

The product is intended to watch for meaningful events from connected email and
calendar sources, help the user generate a relationship-aware card, produce
print-ready 5x7 assets, and recommend the cheapest shipped or fastest pickup
fulfillment path before checkout confirmation.

## Core Thesis

This is not just AI greeting cards. The defensible product is:

1. Knowing when a card is needed.
2. Knowing what relationship context is safe and useful.
3. Producing deterministic print-ready panels once renderer validation exists.
4. Routing the card through vendor adapters without risking a bad physical print.

## Current Stage

This repo now contains a runnable Vite, React, and TypeScript free local MVP plus
a repo-local production skeleton. The web app opens on the actual reviewer
workflow: local workspace auth, manual/ICS event import, opportunity approval,
relationship memory review, deterministic card generation, 5x7 SVG panel export,
local SVG/PDF print package export, customer/admin panels, customer-facing
fulfillment recommendations, a browser-inspectable mobile app preview, and
catalog-driven adapter readiness.

The service kernel still executes the critical backend contracts in code:
metadata-only provider import, approved relationship memory, layout-safe 5x7
rendering, explicit order lifecycle transitions, recovery paths,
regional/vendor-share policy, and runtime readiness checks.
Render-packet artifact handoff is modeled with checksum manifests,
HMAC-signed URL contracts, local filesystem write/read verification, and an
injected S3-compatible client contract, plus a guarded live MinIO/S3-compatible
write/read doctor for CI and local credentialed checks.

Real ordering is deliberately disabled. The
`WalgreensFiveBySevenDoubleSidedCardAdapter` is represented as a hard-gated
contract: 1500 x 2100 px, 300 DPI, four panels, live-quote inputs, and no external
order until physical print certification exists.

The repo also includes a Postgres migration, worker and migration runners,
dev/droplet/cloud deployment manifests, a static/API production server, and an
Expo iOS/Android customer shell contract that resolves its API URL from
environment configuration instead of static placeholders.

## Free MVP Capabilities

- Local workspace auth using browser storage only.
- Manual invite text and `.ics` paste import.
- Local vCard and CSV contact/address import.
- Admin-only business CRM CSV lifecycle import plus gated Salesforce, HubSpot,
  Zoho CRM, Pipedrive, Dynamics 365 Sales, Shopify, Klaviyo, Mailchimp,
  ActiveCampaign, BigCommerce, WooCommerce, Square, and Intercom customer
  lifecycle sync contracts for birthday, purchase-anniversary, and
  warranty-anniversary card campaigns.
- Business engagement readiness register in `src/businessEngagementReadiness.ts`
  and `src/businessEngagementReadinessData.mjs` for CRM lifecycle sources,
  trigger normalization, card-opportunity review, workflow payloads, customer
  message channels, consent/suppression gates, and campaign feedback while
  keeping live CRM OAuth, customer messaging, CRM writeback, production
  analytics, external network calls, and real orders at zero. Run `npm run
  business:engagement:doctor`; it is not live CRM OAuth, customer messaging,
  CRM writeback, or production campaign analytics proof.
- Deterministic opportunity detection and user approve/snooze/dismiss states.
- User-approved relationship memories with add/delete controls.
- Deterministic card copy and visual directions with no paid AI calls.
- Four 1500 x 2100 SVG panels for front, inside-left, inside-right, and back.
- Local print package export with the four SVG panels, a combined 5x7 PDF proof,
  and a checksum manifest.
- Checkout confirmation checklist for Walgreens, CVS, FedEx Office, Walmart,
  Staples, Office Depot, or a local printer when automatic ordering is disabled.
- Review-only public printer pricing comparison for Walgreens, CVS, FedEx,
  Walmart, Staples, and Office Depot manual handoff, with 12 official-source
  observations across 8 persisted source links, freshness checks, and checkout
  confirmation still required. Coupons are collected from provider feeds or
  retailer coupon pages, CVS print entrypoints are checked for visible weekly
  codes, and discounts apply to best-price ranking only after provider portal
  checkout evidence proves the code worked for the same cart context.
- Localization readiness for English (US), Spanish (US), Urdu, and Arabic
  across customer, admin, API, and mobile surfaces, with RTL layout review and
  human copy-review gates before non-English or RTL copy can be marked ready.
- Customer panel with a staged local workspace, ready `Paste invite or ICS`
  onboarding, Google Calendar as OAuth-gated readiness, Apple Calendar as
  manual ICS export, event review, next-card opportunities, a sendable
  deterministic local chat session with no live model call, card proof path,
  and customer fulfillment recommendations for cheapest known price, fastest
  pickup, and cheapest shipped option.
- Admin panel with provider coverage, env gates, provider cost/rate governance,
  CRM and workflow integration readiness, production launch gates, capacity
  profiles, external audit readiness, AI provider readiness, observability
  readiness, retail fulfillment readiness, payment readiness, mobile render
  readiness, hosted API proof readiness, business engagement readiness, cloud
  artifact proof readiness, cloud runtime readiness, and blocked live-vendor
  adapters.
- External audit evidence register in `src/externalAuditReadiness.ts` and
  `src/externalAuditReadinessData.mjs` for legal, security, privacy,
  accessibility, hosted auth, OAuth, AI QA, payments, telemetry, hosted DB,
  cloud IAM, signed mobile artifact, retail certification, and physical print
  certification gaps. `publicClaimAllowed` and attached external artifacts stay
  at zero until real reports or certifications are attached.
- AI provider readiness register in `src/aiProviderReadiness.ts` and
  `src/aiProviderReadinessData.mjs` for text/image adapter inventory, model
  allowlists, prompt and brand-safety review, PII minimization, image print QA,
  spend controls, evaluation fixtures, and rollout evidence while keeping live
  model calls and production AI traffic disabled.
- Observability readiness register in `src/observabilityReadiness.ts` and
  `src/observabilityReadinessData.mjs` for telemetry schema, PII redaction,
  sampling, retention, alert-route drill, provider request contracts, and
  incident-review evidence while keeping live ingestion and production alerts
  disabled.
- Retail fulfillment readiness register in
  `src/retailFulfillmentReadiness.ts` and
  `src/retailFulfillmentReadinessData.mjs` for manual handoff, public pricing,
  live quote contracts, vendor certification, order kill switch, pickup/cancel
  recovery, payment/refund boundary, and physical print QA while keeping live
  quotes, direct retail orders, real payments, and physical certification
  claims disabled. Run `npm run retail:doctor`; it is not live retail ordering.
- Payment readiness register in `src/paymentReadiness.ts` and
  `src/paymentReadinessData.mjs` for no-payment fallback, sandbox provider
  contracts, idempotent checkout, no-card-data storage, webhook signatures,
  live charge/capture approval, refund/dispute drills, and settlement
  reconciliation while keeping live charges, refunds, captures, card storage,
  PCI approval claims, and live external network requirements disabled. Run
  `npm run payment:doctor`; it is not live payment processing.
- Mobile render readiness register in `src/mobileRenderReadiness.ts` and
  `src/mobileRenderReadinessData.mjs` for native shell source rendering,
  customer-flow screen state, print-proof rows, viewport constraints, RTL render
  review, Expo preview profile readiness, emulator proof, and signed native
  artifact proof while keeping emulator proofs, signed artifacts, live provider
  calls, external network calls, and real orders at zero. Run `npm run
  mobile:render:doctor`; it is not an emulator render proof or signed native
  build.
- Hosted API proof readiness register in `src/hostedApiReadiness.ts` and
  `src/hostedApiReadinessData.mjs` for Vercel deployment evidence, serverless
  route contracts, deployment-protection boundary, hosted env sync, hosted
  Postgres connectivity, public DB-backed route proof, hosted account-token
  verification, and backup policy while keeping env sync, hosted DB proof,
  public route proof, hosted token verification, backup policy, deployment
  protection bypass, live provider calls, external network calls, and real
  orders at zero. Run `npm run hosted:api:doctor`; it is not public DB-backed
  Vercel proof.
- Reviewer DB seed readiness register in `src/reviewerDbSeedReadiness.ts` and
  `src/reviewerDbSeedReadinessData.mjs` for deterministic reviewer seed plans,
  customer/admin session-token contracts, SQL preview safety, hosted migration
  prerequisites, Vercel env sync, hosted seed execution proof, hosted token
  probes, and rollback drills while keeping hosted seed proof, hosted token
  proof, Vercel env proof, destructive live mutations, live provider calls,
  external network calls, and real orders at zero. Run `npm run
  reviewer:db:seed:doctor`; it is not hosted reviewer DB mutation or hosted
  account-token proof.
- Cloud artifact proof readiness register in
  `src/cloudArtifactProofReadiness.ts` and
  `src/cloudArtifactProofReadinessData.mjs` for Terraform artifact-store source
  coverage, plan review, applied bucket ARN proof, IAM policy output proof,
  signed URL cloud probes, access-log proof, secret-manager env sync, and
  retention/restore drills while keeping Terraform apply execution, applied
  bucket proof, IAM proof, signed URL proof, access-log proof, secret-sync
  proof, restore-drill proof, live provider calls, external network calls, and
  real orders at zero. Run `npm run cloud:artifact:proof:doctor`; it is not
  live-applied cloud bucket/IAM proof.
- End-to-end coverage matrix in `src/e2eCoverage.ts` and
  `src/e2eCoverageData.mjs` that maps 29 repo-local reviewer journeys across
  customer web, admin web, adapters, API, identity, mobile, infra, and
  governance to browser smoke tests, contract tests, doctors, and CI gates.
  This is repo-local coverage; live production proofs remain at zero.
- Capacity profile planning for local-dev, cheap-droplet, cloud-native, and
  SaaS-scale runtime shapes through `src/capacityPlan.ts` and the shared
  executable data in `src/capacityPlanData.mjs`, with queue/object-store posture,
  cost guardrails, required evidence, and `liveProviderCalls` plus
  `realOrdersEnabled` held at zero. These are not measured production benchmarks.
- Adapter catalog covering free local paths plus gated Auth0, Clerk, Supabase
  Auth, Firebase Auth, Amazon Cognito, OpenAI, Anthropic, Azure OpenAI, Amazon
  Bedrock, Google, Google People, Microsoft Graph, CardDAV, Mistral, Cohere,
  Perplexity, xAI, Together, Groq, DeepSeek, Fireworks, Hugging Face, Stability,
  Replicate, Ideogram, Leonardo, fal, Black Forest Labs, Adobe Firefly, Recraft,
  Luma, Resend, SendGrid, Postmark, Mailgun, Twilio SMS, WhatsApp Cloud API,
  Expo Push, Firebase Cloud Messaging, Customer.io, Braze, OneSignal, Courier,
  Knock, Novu, Stripe Checkout, PayPal Orders, Square Payments, Adyen Checkout,
  Sentry, PostHog, OpenTelemetry OTLP, Grafana Cloud, Datadog Logs, Better
  Stack Logs, Salesforce, HubSpot, Zoho CRM, Pipedrive, Dynamics 365 Sales,
  Shopify Admin, Klaviyo, Mailchimp, ActiveCampaign, BigCommerce, WooCommerce,
  Square Customers, Intercom, Zapier, Make, Slack, Microsoft Teams, Notion,
  Airtable, Google Sheets, n8n, Workato, Pipedream, and vendor contracts.
- Executable adapter dry runs that validate readiness, reject placeholder
  secrets, redact provider-bound text, prepare no-network request contracts, and
  keep live vendor ordering blocked.
- Provider governance contracts that cap every paid/gated adapter with monthly
  and per-request budget ceilings, rate limits, queue posture, and ready local
  fallbacks before any live network provider can be enabled.
- API contract/server boundary with `/api/health`, customer/admin bootstrap,
  mobile bootstrap with sign-in/import, next-action, queue, memory-review,
  print-proof, fulfillment recommendation, and offline-sync state, provider
  readiness, explicit contract/memory/Postgres
  runtime modes, tested memory-mode auth/idempotency replay, fake-pool and
  isolated live Postgres route-scoped auth/idempotency/audit/queue runtime
  checks, process-level Postgres HTTP auth/idempotency/repository smoke,
  repository-backed relationship-memory, render-packet, import-preview,
  card-project, manual vendor handoff, data-request mutation coverage, admin
  demo reset, localization readiness payloads, and no live external calls.
- Persistence contract/migration boundary for auth sessions, hosted account
  identities, hashed recovery challenges, idempotency replay, import-preview
  event/opportunity writes, relationship-memory repository writes, card-project
  repository writes, render-packet repository writes, manual handoff
  order/consent/event writes, data-request privacy/consent writes, queue jobs,
  audit logs, and 13 schema-backed API routes.
- Tested Expo customer app contract for the next-action summary, card queue,
  approval controls, memory review, print-proof checks, local chat, render
  choices, review-only pricing previews, offline idempotent API sync, locale
  readiness, manual handoff, real-order kill-switch posture, and a Vite browser
  preview powered by the same mobile customer contract.
- Tested Expo/EAS native release contract for development, preview, and
  production iOS/Android build profiles with API URL supplied by environment
  and real orders disabled.
- Tested AWS artifact-store IaC contract for an encrypted, versioned,
  private-by-default S3 bucket, prefix-scoped app/worker IAM policy, lifecycle
  cleanup, and runtime env outputs.
- Tested repo-local security/privacy/accessibility baseline for HTTP security
  headers, raw-content storage blocks, signed-artifact share controls,
  non-root/container-hardened deployment manifests, and app-shell landmarks.

## Run

```sh
npm ci
npm run dev
```

Open the Vite URL printed by the dev server. The app opens directly into the
free local MVP workflow and does not require paid AI, payment, retail, email,
CRM, or cloud credentials.

## Reviewer Demo Path

1. Run `npm ci` and `npm run dev`.
2. Use the local workspace auth controls to enter the customer workspace.
3. Paste an invite or `.ics` event, approve the detected opportunity, and review
   the relationship memory before generation.
4. Generate the deterministic 5x7 card panels, export the local print package,
   and review the checksum manifest/manual vendor handoff checklist.
5. Open the admin panel to inspect provider gates, launch-readiness doctors, and
   blocked live-order/payment/vendor statuses.
6. Open the Mobile app tab to inspect the browser preview of the shared Expo
   customer contract; use Expo Go or a simulator for native rendering.

For a no-server verification pass, run `npm run test -- --run` or the broader
`npm run check` when audit/network policy checks are acceptable in the current
environment.

## Vercel Deployment Contract

`vercel.json` builds the Vite app into `dist` and routes `/api/*` to the
serverless handler in `api/[...path].mjs`, which reuses the same
`handleApiRequest` Module as the local API/static server. Static hosting works
without database credentials; DB-backed API access requires Vercel environment
variables such as:

```sh
CUSTOMCARD_API_RUNTIME=postgres
DATABASE_URL=postgres://...
CUSTOMCARD_CUSTOMER_SESSION_TOKEN=...
CUSTOMCARD_ADMIN_SESSION_TOKEN=...
```

The deployment launch gate remains evidence-missing until DB env vars are
synced, deployment protection is bypassed or disabled for verification, and the
hosted DB doctor is captured. Current Vercel evidence is recorded in
`docs/deployment-evidence.md`.

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
OBJECT_STORE_BUCKET=customcard-dev
OBJECT_STORE_ACCESS_KEY_ID=replace-me-do-not-commit-real-secret
OBJECT_STORE_SECRET_ACCESS_KEY=replace-me-do-not-commit-real-secret
OBJECT_STORE_REGION=us-east-1
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
`BFL_API_KEY`, `ADOBE_FIREFLY_API_KEY`, `RECRAFT_API_KEY`, `LUMA_API_KEY`,
`RESEND_API_KEY`, `SENDGRID_API_KEY`,
`POSTMARK_SERVER_TOKEN`, `MAILGUN_API_KEY`, `TWILIO_ACCOUNT_SID`,
`WHATSAPP_ACCESS_TOKEN`, `EXPO_ACCESS_TOKEN`, `CUSTOMERIO_APP_API_KEY`,
`BRAZE_REST_API_KEY`, `ONESIGNAL_REST_API_KEY`, `COURIER_AUTH_TOKEN`,
`KNOCK_API_KEY`, `NOVU_API_KEY`, `STRIPE_SECRET_KEY`,
`PAYPAL_CLIENT_ID`, `SQUARE_ACCESS_TOKEN`, `ADYEN_API_KEY`, `SENTRY_DSN`,
`POSTHOG_PROJECT_API_KEY`, `OTEL_EXPORTER_OTLP_ENDPOINT`,
`GRAFANA_OTLP_API_KEY`, `DATADOG_API_KEY`, `BETTERSTACK_SOURCE_TOKEN`,
Salesforce, HubSpot, Zoho, Pipedrive, Dynamics, Shopify, Klaviyo, Mailchimp,
ActiveCampaign, BigCommerce, WooCommerce, Square, Intercom, and Microsoft Graph
keys, plus Zapier, Make, Slack, Teams, Notion, Airtable, Google Sheets, n8n,
Workato, and Pipedream workflow keys are documented in `infra/env/.env.example`, but live OAuth,
AI/image calls, notification sends, payment charges/refunds, telemetry
ingestion, CRM sync, workflow sends, live retail quotes, and direct vendor
ordering are not implemented in this repo state.

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
  -> Vite mobile preview + Expo customer mobile app contract
```

The service kernel models the critical backend contracts without pretending they
are deployed integrations: metadata-only provider import, approved relationship
memory, deterministic 5x7 render validation, explicit order lifecycle recovery,
regional/vendor-share controls, and readiness checks.

The provider runtime adds a no-network execution boundary for the adapter
catalog: future OAuth, text-chat, image-generation, CRM, workflow integration,
notification, payment, observability, and vendor paths can be reviewed as
redacted request contracts without placing API calls, charges, telemetry events,
workflow sends, or orders.

Verification:

```sh
npm run check
npm run deployment:doctor
npm run cloud:doctor
npm run cloud:artifact:proof:doctor
npm run api:doctor
npm run security:doctor
npm run external:audit:doctor
npm run e2e:coverage:doctor
npm run payment:doctor
npm run mobile:render:doctor
npm run hosted:api:doctor
npm run reviewer:db:seed:doctor
npm run business:engagement:doctor
npm run provider:governance:doctor
npm run capacity:doctor
npm run printer:pricing:doctor
npm run localization:doctor
npm run api:doctor:memory
npm run api:doctor:postgres
CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:live
CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled DATABASE_URL=postgres://... npm run api:doctor:postgres:http
CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled DATABASE_URL=postgres://... npm run account:doctor:live
npm run artifact:doctor
CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled OBJECT_STORE_URL=http://127.0.0.1:9000 OBJECT_STORE_BUCKET=customcard-ci-artifacts OBJECT_STORE_ACCESS_KEY_ID=customcard OBJECT_STORE_SECRET_ACCESS_KEY=customcard-dev-only OBJECT_STORE_REGION=us-east-1 OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run artifact:doctor:s3:live
npm run persistence:doctor
npm run demo:doctor
CUSTOMCARD_ENV=dev DATABASE_URL=postgres://x QUEUE_URL=redis://x OBJECT_STORE_URL=file:///tmp OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 REAL_ORDER_KILL_SWITCH=disabled npm run worker
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
npm run mobile:release:doctor
```

`npm run check` now runs the full test suite, contract coverage thresholds, the
production build, and a high-severity dependency audit. The V8 coverage gate
applies to `apps/mobile/src/customerExperience.ts`, `src/accountAuth.ts`,
`src/agentContracts.ts`, `src/apiContracts.ts`, `src/artifactHandoff.ts`,
`src/artifactStore.ts`, `src/businessEngagementReadiness.ts`,
`src/businessEngagementReadinessData.mjs`, `src/capacityPlan.ts`, `src/capacityPlanData.mjs`,
`src/cloudArtifactProofReadiness.ts`,
`src/cloudArtifactProofReadinessData.mjs`,
`src/customerChat.ts`, `src/domain.ts`, `src/e2eCoverage.ts`, `src/e2eCoverageData.mjs`,
`src/externalAuditReadiness.ts`,
`src/externalAuditReadinessData.mjs`, `src/freeMvp.ts`,
`src/localization.ts`, `src/paymentReadiness.ts`,
`src/paymentReadinessData.mjs`, `src/mobileRenderReadiness.ts`,
`src/mobileRenderReadinessData.mjs`, `src/reviewerDbSeedReadiness.ts`,
`src/reviewerDbSeedReadinessData.mjs`, `src/persistenceContracts.ts`, `src/printerPricing.ts`,
`src/printExport.ts`, `src/providerCatalog.ts`, `src/providerGovernance.ts`,
`src/providerRuntime.ts`, and `src/serviceKernel.ts`; browser UI behavior is
verified through Chrome smoke tests.

`npm run deployment:doctor` emits a JSON readiness report for the local-dev,
cheap-droplet, cloud-native, Vercel, cloud-storage, runtime, and data lanes.
`npm run cloud:doctor` focuses on `infra/aws/artifact-store` and statically
verifies the production artifact bucket/IAM contract. These checks validate
committed IaC shape only; they do not prove a real cloud cluster, AWS account,
or droplet deployment.
`npm run cloud:artifact:proof:doctor` verifies the committed Cloud artifact
proof readiness register, Terraform source/env-output coverage, applied bucket
ARN and IAM policy proof requirements, signed URL/access-log/secret-sync/
restore-drill evidence requirements, admin/API surfaces, documentation, CI
wiring, and the zero Terraform-apply/applied-bucket/IAM/signed-URL/access-log/
secret-sync/restore-drill proof boundary. It is not live-applied cloud
bucket/IAM proof.
`npm run capacity:doctor` verifies the committed capacity profiles, admin/API
surfaces, documentation, and CI wiring while keeping live provider calls and
real orders disabled.
`npm run external:audit:doctor` verifies the committed external audit readiness
register, production-gate mappings, admin/API surfaces, documentation, CI
wiring, and the no-public-claim/no-attached-external-artifact boundary. It is
not an external audit report.
`npm run e2e:coverage:doctor` verifies the committed end-to-end coverage
matrix, admin/API surfaces, backing test files, documentation, CI wiring, and
the no-live-production-proof/no-real-order/no-live-network boundary.
`npm run ai:doctor` verifies the committed text/image AI provider readiness
register, provider runtime contracts, admin/API surfaces, documentation, and CI
wiring. It is not live AI generation or model-provider traffic proof.
`npm run observability:doctor` verifies the committed telemetry and alerting
readiness register, provider runtime contracts, admin/API surfaces,
documentation, and CI wiring. It is not live telemetry ingestion or alert
delivery proof.
`npm run payment:doctor` verifies the committed payment readiness register,
payment sandbox provider contracts, no-payment fallback, admin/API surfaces,
documentation, CI wiring, and the zero live charge/refund/capture, zero card
storage, zero PCI-approval-claim boundary. It is not live payment processing.
`npm run mobile:render:doctor` verifies the committed mobile render readiness
register, Expo customer app source, native build profile signals, admin/API
surfaces, documentation, CI wiring, and the zero emulator-proof/signed-artifact
boundary. It is not an emulator render proof or signed native build.
`npm run hosted:api:doctor` verifies the committed hosted API proof readiness
register, Vercel/serverless source contracts, hosted env/DB/token proof gaps,
deployment evidence boundary, admin/API surfaces, documentation, CI wiring, and
the zero public-route-proof/hosted-DB-proof/env-sync-proof boundary. It is not
public DB-backed Vercel proof.
`npm run reviewer:db:seed:doctor` verifies the committed Reviewer DB seed
readiness register, deterministic seed plan, SQL preview, customer/admin
session-token contract, hosted migration/env/probe proof gaps, rollback drill
requirements, admin/API surfaces, documentation, CI wiring, and the zero
hosted-seed-proof/hosted-token-proof/Vercel-env-proof boundary. It is not
hosted reviewer DB mutation or hosted account-token proof.
`npm run business:engagement:doctor` verifies the committed Business
engagement readiness register, CRM/workflow/notification adapter coverage,
provider runtime no-network contracts, admin/API surfaces, documentation, CI
wiring, and the zero live-message/CRM-write/live-network/real-order boundary.
It is not live CRM OAuth, customer messaging, CRM writeback, or production
campaign analytics proof.

`.github/workflows/verify.yml` runs the same repository check, deployment
doctor, cloud artifact IaC doctor, cloud artifact proof readiness doctor,
contract API doctor, security/privacy/
accessibility baseline doctor, external audit readiness doctor, provider cost
governance doctor, end-to-end coverage doctor, AI provider readiness doctor,
observability readiness doctor, payment readiness doctor, mobile render
readiness doctor, hosted API proof readiness doctor,
capacity profile doctor, printer pricing research doctor,
localization readiness doctor,
memory-runtime API doctor,
Postgres runtime contract doctor, live Postgres integration doctor, Postgres API
HTTP doctor, account-auth storage/recovery doctor, artifact-store filesystem
plus S3-compatible contract doctor, live MinIO/S3-compatible artifact doctor,
persistence doctor, demo reset doctor, worker readiness, mobile doctor, and
mobile native release doctor on pushes to `main` and pull requests.

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
- [Deployment evidence](docs/deployment-evidence.md)
- [Completion audit](docs/completion-audit.md)
- [Final package](docs/final-package.md)
- [Handoff notes](docs/handoff-notes.md)
- [System design prompt](docs/system-design-prompt.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Infrastructure](infra/README.md)

## Honest Gaps

The repo does not include live production user auth, live OAuth, live AI/image
generation, live vendor quotes, live payment charges/refunds, direct
retail-printer ordering, live telemetry ingestion/alerting, live-applied cloud
bucket/IAM proof beyond the static AWS IaC contract, CI/local MinIO doctor, and
repo-local Cloud artifact proof readiness gate,
deployed production Postgres API integration, production hosted account-token
verification outside the isolated live Postgres doctors, professional
translation QA or live translation providers, actual emulator/native screenshot
evidence, a produced/signed native mobile artifact, public Vercel DB-backed route proof, external
legal/security/privacy/accessibility audit, or physical print certification.
Those paths are represented in `src/productionReadiness.ts` as admin-visible
contracts and in `src/externalAuditReadiness.ts` as explicit evidence-register
items so reviewers can inspect the system shape without mistaking the free local
MVP for a certified production fulfillment service.
