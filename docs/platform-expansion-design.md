# Platform Expansion Design

Date: 2026-06-03

## Objective

Expand the free CustomCard MVP toward the requested end state: broad provider
adapter coverage, customer and admin panels, a customer mobile app surface,
tested UI/UX, and cheap cloud-deployment readiness. This pass keeps the free
local path runnable while making credential-gated provider work explicit and
testable.

## Design Before Build

The system remains adapter-first:

- Customer surfaces consume capability groups: event import, text chat,
  image/render, memory, and handoff.
- Admin surfaces consume the same adapter catalog to see readiness, required
  environment variables, safety gates, blocked live-order providers, and cloud
  runtime shape.
- Provider adapters are data contracts first. Live network calls are not enabled
  until credentials, consent, logging, cost controls, and security review exist.
- Each capability must have at least one free local fallback so review, tests,
  and demos do not require paid APIs.

## Provider Coverage

The canonical list lives in `src/providerCatalog.ts`. It covers:

- Auth: local demo auth, hosted email-password contract, and credential-gated
  Auth0, Clerk, Supabase Auth, Firebase Auth, and Amazon Cognito contracts.
- Event import: ICS/manual note, Gmail, Google Calendar, Microsoft Graph mail,
  Microsoft Graph calendar, and iCloud ICS fallback.
- Contact import: local vCard/CSV parsing, Google People contacts, Microsoft
  Graph contacts, generic CardDAV address books, and iCloud vCard manual
  fallback.
- Text chat: deterministic local chat plus OpenAI Responses, Anthropic
  Messages, Azure OpenAI, Amazon Bedrock Converse, Google Gemini, Hugging Face,
  Mistral, Cohere, Perplexity Sonar, xAI, Together, Groq, DeepSeek, Fireworks,
  and self-hosted OpenAI-compatible endpoints.
- Image generation/rendering: browser SVG renderer plus OpenAI Images, Google
  Gemini image generation, Azure OpenAI, Amazon Bedrock, Stability AI, Hugging
  Face, Replicate, Together, Ideogram, Leonardo, fal, Black Forest Labs, local
  print package export, and object-store render packets.
- Memory: local relationship memory plus Postgres memory contract.
- Vendor handoff: manual upload ready; Walgreens, CVS, FedEx, Walmart, Staples,
  and Office Depot live ordering blocked.
- Printer pricing: public Walgreens/CVS/FedEx/Walmart/Staples/Office Depot 5x7
  card observations ready for manual comparison; live quotes, taxes, coupons,
  stock, and pickup windows remain manual-confirmation work.
- Notifications: local UI status ready; credential-gated Resend, SendGrid,
  Postmark, Mailgun, Twilio SMS, WhatsApp Cloud API, Expo Push, and Firebase
  Cloud Messaging contracts; generic transactional email contract gated.
- Cloud runtime: local Docker Compose ready; droplet Compose and Kubernetes
  manifests contract-ready.

`src/providerRuntime.ts` turns the catalog into executable dry-run contracts.
It can evaluate readiness for every adapter, reject placeholder credentials,
build redacted no-network request shapes for credential-gated text, image,
event, contact, hosted-auth, and notification providers, and keep live vendor
adapters blocked even if test credentials and approval gates are present. These
contracts intentionally stop before `fetch` or any SDK call.

Official documentation anchors used for the adapter contracts:

- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- OpenAI Images API: https://platform.openai.com/docs/api-reference/images
- Auth0 OAuth: https://auth0.com/docs/authenticate/protocols/oauth
- Clerk token verification: https://clerk.com/docs/references/backend/verify-token
- Supabase Auth getUser: https://supabase.com/docs/reference/javascript/auth-getuser
- Firebase Auth REST API: https://firebase.google.com/docs/reference/rest/auth
- Amazon Cognito authorization endpoint: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html
- Google People connections: https://developers.google.com/people/api/rest/v1/people.connections/list
- Microsoft Graph contacts: https://learn.microsoft.com/en-us/graph/api/user-list-contacts
- CardDAV protocol: https://www.rfc-editor.org/rfc/rfc6352
- Apple iCloud contacts export: https://support.apple.com/en-kw/108306
- Azure OpenAI API reference: https://learn.microsoft.com/en-us/azure/foundry/openai/reference
- Amazon Bedrock Converse API: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html
- Amazon Bedrock InvokeModel API: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- Google Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Mistral chat API: https://docs.mistral.ai/api
- Cohere chat API: https://docs.cohere.com/v2/reference/chat
- Perplexity chat completions API: https://docs.perplexity.ai/api-reference/chat-completions
- xAI chat completions API: https://docs.x.ai/developers/rest-api-reference/inference/chat
- Together chat completions API: https://docs.together.ai/reference/chat-completions-1
- Together image API overview: https://docs.together.ai/docs/inference/images/overview
- Groq API reference: https://console.groq.com/docs/api-reference
- DeepSeek chat completion API: https://api-docs.deepseek.com/api/create-chat-completion
- Fireworks chat completions API: https://docs.fireworks.ai/api-reference/post-chatcompletions
- Ideogram image generation API: https://developer.ideogram.ai/api-reference/api-reference/generate-v3
- Leonardo image generation API: https://docs.leonardo.ai/reference/creategeneration
- fal queue endpoints: https://fal.ai/docs/documentation/model-apis/inference/queue
- Black Forest Labs image generation: https://docs.us.bfl.ai/quick_start/generating_images
- Gmail API guides: https://developers.google.com/gmail/api/guides
- Google Calendar API overview: https://developers.google.com/calendar/api/guides/overview
- Microsoft Graph Outlook mail: https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview
- Microsoft Graph Outlook calendar: https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview
- Hugging Face Inference Providers: https://huggingface.co/docs/inference-providers/index
- Stability image API: https://platform.stability.ai/docs/getting-started/stable-image
- Replicate HTTP API: https://replicate.com/docs/reference/http
- Resend send email API: https://resend.com/docs/api-reference/emails/send-email
- Twilio SendGrid mail send API: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- Postmark email API: https://postmarkapp.com/developer/api/email-api#send-a-single-email
- Mailgun messages API: https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages
- Twilio Messages API: https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource
- WhatsApp Cloud API message API: https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api
- Expo push notification sending: https://docs.expo.dev/push-notifications/sending-notifications/
- Firebase Cloud Messaging HTTP v1: https://firebase.google.com/docs/cloud-messaging/send/v1-api

## Customer Panel

The customer panel is the first web surface. It shows the current card
opportunity, local workspace state, panel count, handoff vendor, quick actions
for the free workflow, a deterministic customer chat transcript, image/render
choices, and ready local fallbacks.

The customer path stays cheap:

- No live AI chat call.
- No live image-generation call.
- No provider OAuth required.
- No real vendor order.
- No live printer quote; public pricing research remains review-only.
- SVG export, local PDF proof/manifest package export, and manual handoff remain
  the working path.

## Admin Panel

The admin panel turns the adapter catalog into an operations surface:

- Total adapters and capability count.
- Ready, credential-gated, contract-only, and blocked counts.
- Per-capability local fallback coverage.
- Required env vars for provider and deployment readiness.
- No-network runtime readiness counts: local-ready, request-ready, blocked, and
  missing credential references.
- Gated provider queue.
- Cloud runtime adapters.
- Blocked live-order vendors.
- Public printer pricing research for manual Walgreens/CVS/FedEx/Walmart/
  Staples/Office Depot comparison.
- Local print package export readiness for source SVGs, a combined PDF proof,
  and checksum manifest.

The adapter matrix also shows each dry-run state and the first missing
credential references. This is intentionally not a settings page that pretends
credentials are present. It is a readiness console for what must be connected,
reviewed, and certified.

## Mobile Customer App

`apps/mobile/src/customerExperience.ts` is the tested mobile customer contract.
`apps/mobile/src/App.tsx` renders that contract as the Expo customer surface
instead of a placeholder. It mirrors the web customer panel with card queue,
memory review, local scripted chat, image/render status, manual handoff, and a
real-order-disabled banner.

The mobile doctor validates environment resolution, the contract source, and the
repo-local real-order kill switch. Native rendering, emulator runs, builds, and
platform signing remain outside the repo-local verification loop.

## API Boundary

`src/apiContracts.ts` defines the hosted API contract surface for customer,
admin, and mobile clients. It covers health, route catalog, customer bootstrap,
mobile bootstrap, admin readiness, provider catalog, admin demo reset, import
preview, card project creation, render packets, manual vendor handoff, and data
requests.

`scripts/api-server.mjs` is the deployable no-dependency Node wrapper for those
contracts, backed by `scripts/api-runtime.mjs`. It serves `/api/health`,
`/api/routes`, `/api/customer/bootstrap`, `/api/mobile/bootstrap`,
`/api/admin/readiness`, and `/api/admin/provider-catalog`, exposes
`/api/admin/persistence-readiness`, keeps live external calls disabled, and also
serves the built web app from `dist`.

The server now has explicit runtime modes:

- `contract`: default reviewer/static mode; routes remain available without
  session storage and mutations report contract-only acceptance.
- `memory`: executable local runtime; non-public routes require Bearer sessions,
  mutations require `X-Idempotency-Key`, same-key replay returns the stored
  response, and same-key/different-body conflicts return `409`.
- `postgres`: parameterized Postgres runtime path for auth sessions,
  idempotency records, queue jobs, and audit rows. This path is not claimed as
  live until a real database integration test and migration run exist.

## Persistence Boundary

`src/persistenceContracts.ts` maps every API route to the Postgres tables it
needs before live authenticated handlers are implemented. The current migration
includes 16 durable tables, including `auth_sessions`, `idempotency_keys`,
`api_jobs`, and append-only audit/order event tables. This proves the schema
shape for production auth sessions, idempotency replay, queue-backed rendering
and handoff jobs, consent/data requests, and operational audit without claiming
that live DB handlers are running in the static server.
Render packets also carry artifact manifests, storage-provider metadata, signed
URL expiry, and external-share approval gates.

## Cheap Cloud Deployment Shape

The low-cost path remains:

1. Local development with Docker Compose, Postgres, Redis, and MinIO.
2. Small droplet Compose deployment for early hosted validation.
3. Kubernetes web and worker manifests when the app needs cloud-native scaling.

The runtime remains fail-closed:

- `REAL_ORDER_KILL_SWITCH=disabled` keeps live orders off.
- Provider keys are named in `infra/env/.env.example` but not committed.
- `npm run deployment:doctor` verifies the committed local-dev, cheap-droplet,
  cloud-native, runtime, and data lanes and fails if required deployment signals
  disappear.
- `npm run api:doctor` verifies the API/static server route map, provider
  summary, contract runtime, idempotent mutation contracts, and no-live-call
  posture.
- `npm run api:doctor:memory` verifies Bearer session and idempotency enforcement
  in the executable memory runtime.
- `npm run persistence:doctor` verifies auth-session schema, idempotency replay,
  queue jobs, append-only audit coverage, and 11 schema-backed API route
  mappings.
- Production Kubernetes secrets are annotated for pre-created secret-manager
  provisioning.
- Backups, observability, and managed secrets remain required before production
  traffic.

## Verification Strategy

Implemented checks:

- `src/providerCatalog.test.ts` validates catalog coverage, local fallbacks,
  external provider docs/env gates, admin model, customer model, and blocked
  vendor status.
- `src/providerRuntime.test.ts` validates executable readiness for every
  catalog adapter, redacted no-network request contracts for chat/image
  providers, metadata-only import contracts, placeholder-secret rejection, free
  local fallbacks, and hard-blocked live vendor order adapters.
- `src/printerPricing.test.ts` validates source-backed public price
  observations, minimum-quantity totals, manual-confirmation requirements, and
  the no-live-quote boundary.
- `src/printExport.test.ts` validates source SVG artifacts, the combined 5x7
  PDF proof, checksum manifest validation, preflight failures, and no-order
  export summaries.
- `src/artifactHandoff.test.ts` validates HMAC-signed artifact URLs,
  object-store URI construction, tamper detection, expiry policy, and unsafe
  config failures.
- UI smoke tests cover customer/admin panels, runtime dry-run readiness, the
  core local workflow, mobile overflow, and adapter matrix visibility.
- Infra tests require provider env vars and mobile customer contract evidence.
- Mobile contract tests validate the customer app sections, local/gated
  chat-render-handoff posture, and doctor kill-switch behavior.
- Agent contract tests validate the typed orchestration surface and fail-closed
  default policy.
- API contract and server tests validate customer/admin/mobile API bootstrap,
  provider readiness, idempotent mutation contracts, `/api/health`, and
  memory-runtime auth/idempotency behavior.
- Persistence contract tests validate 16 table contracts, 11 schema-backed API
  routes, idempotency replay, queue-backed routes, and migration signals.
- `scripts/deployment-readiness.mjs` emits a JSON readiness report and is tested
  by `tests/infra-contract.test.ts`.
- `.github/workflows/verify.yml` runs install, full checks, deployment doctor,
  contract API doctor, memory API doctor, persistence doctor, demo reset doctor,
  worker readiness, and mobile doctor for pushes to `main` and pull requests.
- `npm run test:coverage` enforces V8 coverage thresholds for core, API,
  artifact-handoff, pricing, print-export, persistence, orchestration, and mobile contract
  modules: 90% statements, 80% branches, 90% functions, and 90% lines.

Remaining high-risk work:

- No live OAuth flow.
- No live AI/image provider call.
- No payment, live quote, or live order adapter.
- No live printer tax, coupon, stock, or pickup-window integration.
- No live object-store upload or cloud object-store integration; signed
  render-packet URL contracts are covered.
- No live Postgres API integration test, production account auth flow, or account
  recovery.
- No React Native render/emulator proof or native iOS/Android build artifact.
- No cloud deployment proof against a real cluster.
- Hosted GitHub Actions verification exists for main pushes, but there is still
  no live deployment proof against a real cluster.
- No legal/security/privacy/accessibility audit.
