# Platform Expansion Design

Date: 2026-06-03

## Objective

Expand the free CustomCard MVP toward the requested end state: broad provider
adapter coverage, customer and admin panels, multi-language/regional readiness,
a customer mobile app surface, tested UI/UX, and cheap cloud-deployment
readiness. This pass keeps the free local path runnable while making
credential-gated provider work explicit and testable.

## Design Before Build

The system remains adapter-first:

- Customer UX is outcome-first: sign in to the local workspace, paste an invite
  or ICS as the ready import path, treat Google Calendar as OAuth-gated and
  Apple/iCloud as manual ICS export-ready, review card-worthy events, approve a
  card, and choose between cheapest known public price, fastest pickup
  candidate, and cheapest shipped option. Customer screens must not expose
  adapter inventory, credential gates, or provider runtime jargon.
- Customer surfaces consume capability groups: event import, text chat,
  image/render, memory, localization, and handoff.
- Admin surfaces consume the same adapter catalog to see readiness, required
  environment variables, safety gates, blocked live-order providers, and cloud
  runtime shape.
- Capacity profiles consume the deployment contract so reviewers can inspect the
  local, cheap-droplet, cloud-native, and SaaS-scale tradeoffs as executable
  data.
- Provider adapters are data contracts first. Live network calls are not enabled
  until credentials, consent, logging, cost controls, and external security
  review exist.
- Each capability must have at least one free local fallback so review, tests,
  and demos do not require paid APIs.

## Provider Coverage

The canonical list lives in `src/providerCatalog.ts`. It covers:

- Auth: local workspace auth, hosted email-password contract, and credential-gated
  Auth0, Clerk, Supabase Auth, Firebase Auth, and Amazon Cognito contracts.
- Event import: ICS/manual note, Gmail, Google Calendar, Microsoft Graph mail,
  Microsoft Graph calendar, and iCloud ICS fallback.
- Contact import: local vCard/CSV parsing, Google People contacts, Microsoft
  Graph contacts, generic CardDAV address books, and iCloud vCard manual
  fallback.
- Business CRM integration: admin-only CRM CSV lifecycle import plus gated
  Salesforce, HubSpot, Zoho CRM, Pipedrive, Dynamics 365 Sales, Shopify,
  Klaviyo, Mailchimp, ActiveCampaign, BigCommerce, WooCommerce, Square, and
  Intercom customer lifecycle contracts for birthday, purchase-anniversary, and
  warranty-anniversary campaigns.
- Business engagement readiness: `src/businessEngagementReadiness.ts` and
  `src/businessEngagementReadinessData.mjs` track CRM lifecycle source,
  trigger normalization, card-opportunity review, workflow payload, customer
  message channel, consent/suppression, and feedback-loop gates. Run `npm run
  business:engagement:doctor`. This is not live CRM OAuth, customer messaging, CRM writeback, or production campaign analytics proof.
- Reviewer DB seed readiness: `src/reviewerDbSeedReadiness.ts` and
  `src/reviewerDbSeedReadinessData.mjs` track deterministic reviewer seed
  plans, customer/admin session-token contracts, SQL preview safety, Vercel env
  sync, hosted migration, hosted seed execution, hosted token probes, and
  rollback drills. Run `npm run reviewer:db:seed:doctor`. This is not hosted reviewer DB mutation or hosted account-token proof.
- Cloud artifact proof readiness: `src/cloudArtifactProofReadiness.ts` and
  `src/cloudArtifactProofReadinessData.mjs` track Terraform artifact-store
  source coverage, plan review, applied bucket ARN proof, IAM policy output
  proof, signed URL cloud probes, access-log proof, secret-manager env sync,
  and retention/restore drills. Run `npm run cloud:artifact:proof:doctor`. This
  is not live-applied cloud bucket/IAM proof.
- Text chat: sendable deterministic local chat session in `src/customerChat.ts`
  plus OpenAI Responses, Anthropic Messages, Azure OpenAI, Amazon Bedrock
  Converse, Google Gemini, Hugging Face, Mistral, Cohere, Perplexity Sonar,
  xAI, Together, Groq, DeepSeek, Fireworks, and self-hosted OpenAI-compatible
  endpoints. Customer UI gets the local no-network session; admin/API surfaces
  keep the gated provider inventory visible.
- Image generation/rendering: browser SVG renderer plus OpenAI Images, Google
  Gemini image generation, Azure OpenAI, Amazon Bedrock, Stability AI, Hugging
  Face, Replicate, Together, Ideogram, Leonardo, fal, Black Forest Labs, Adobe
  Firefly, Recraft, Luma, local print package export, local filesystem
  object-store render-packet writes, and injected plus live MinIO/S3-compatible
  render-packet write/read contracts.
- Memory: local relationship memory plus Postgres memory contract.
- Vendor handoff: manual upload ready; Walgreens, CVS, FedEx, Walmart, Staples,
  and Office Depot live ordering blocked.
- Printer pricing: public Walgreens/CVS/FedEx/Walmart/Staples/Office Depot 5x7
  card observations ready for manual comparison, with official-source collection
  rules, coupon source collection, provider-portal coupon proof requirements,
  and 30-day freshness reporting; live quotes, taxes, stock, and pickup windows
  remain manual-confirmation work.
- Customer fulfillment recommendation: the web customer panel uses the public
  pricing comparison to show cheapest known price, fastest pickup candidate, and
  cheapest shipped option without surfacing retail-printer adapter internals.
  Closest-store ETA, live tax, stock, delivery fee, payment, and direct order
  submission remain gated behind live quote/order/payment adapters.
- Retail fulfillment readiness: `src/retailFulfillmentReadiness.ts` and
  `src/retailFulfillmentReadinessData.mjs` track manual handoff, public
  pricing, live quote contracts, vendor certification, order kill switch,
  pickup/cancel recovery, payment/refund boundary, and physical print QA. Run
  `npm run retail:doctor`; this is not live retail ordering.
- Notifications: local UI status ready; credential-gated Resend, SendGrid,
  Postmark, Mailgun, Twilio SMS, WhatsApp Cloud API, Expo Push, Firebase Cloud
  Messaging, Customer.io, Braze, OneSignal, Courier, Knock, and Novu contracts;
  generic transactional email contract gated.
- Payments: local no-payment gate ready; credential-gated Stripe Checkout,
  PayPal Orders, Square Payments, and Adyen Checkout sandbox contracts. Live
  charges, captures, refunds, disputes, taxes, and settlement remain unverified.
- Payment readiness: `src/paymentReadiness.ts` and
  `src/paymentReadinessData.mjs` track no-payment fallback, sandbox payment
  contracts, idempotent checkout, no-card-data storage, webhook signatures,
  live charge/capture approval, refund/dispute drills, and settlement
  reconciliation. Run `npm run payment:doctor`; this is not live payment
  processing.
- Observability: local health/audit telemetry ready; credential-gated Sentry,
  PostHog, OpenTelemetry OTLP, Grafana Cloud, Datadog Logs, and Better Stack
  Logs contracts. Live telemetry ingestion, alert routing, retention enforcement,
  and incident response remain unverified.
- Cloud runtime: local Docker Compose ready; droplet Compose and Kubernetes
  manifests contract-ready.

## Localization Readiness

`src/localization.ts` is the launch-locale readiness contract. It exposes
English (US), Spanish (US), Urdu, and Arabic with customer/admin visibility,
card-language mapping, number/date format hints, complete shell message bundles,
and explicit writing direction.

This is readiness, not a live translation system:

- `en-US` is the default ready locale.
- `es-US`, `ur-PK`, and `ar-EG` require human copy review.
- `ur-PK` and `ar-EG` require RTL layout validation.
- `liveTranslationProvider` remains `false`.
- Unsafe claims such as live translation, active payments, or real orders are
  blocked by validation.

The web customer panel shows language readiness and maps the selected locale to
the card-language control. The admin panel reports supported locales, RTL
review, copy-review, bundle completeness, and live-translation posture. API
bootstrap/readiness payloads expose the same summary, and the Expo shell mirrors
the launch locale options so mobile cannot drift from web/API readiness.

`src/providerRuntime.ts` turns the catalog into executable dry-run contracts.
It can evaluate readiness for every adapter, reject placeholder credentials,
build redacted no-network request shapes for credential-gated text, image,
event, contact, CRM lifecycle, workflow integration, hosted-auth, notification,
payment, and observability providers, and keep live vendor adapters blocked even if test
credentials and approval gates are present. These contracts intentionally stop
before `fetch` or any SDK call.

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
- Adobe Firefly Services API: https://developer.adobe.com/firefly-services/docs/firefly-api/api/
- Recraft API endpoints: https://www.recraft.ai/docs/api-reference/endpoints
- Luma image generation API: https://docs.lumalabs.ai/docs/image-generation
- Gmail API guides: https://developers.google.com/gmail/api/guides
- Google Calendar API overview: https://developers.google.com/calendar/api/guides/overview
- Microsoft Graph Outlook mail: https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview
- Microsoft Graph Outlook calendar: https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview
- Salesforce REST query resource: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
- HubSpot CRM search: https://developers.hubspot.com/docs/api-reference/latest/crm/search-the-crm
- Zoho CRM records API: https://www.zoho.com/crm/developer/docs/api/v6/get-records.html
- Pipedrive Persons API: https://developers.pipedrive.com/docs/api/v1/Persons
- Microsoft Dataverse Web API query: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/overview
- Shopify Admin GraphQL customers: https://shopify.dev/docs/api/admin-graphql/latest/queries/customers
- Klaviyo profiles API: https://developers.klaviyo.com/en/reference/get_profiles
- Mailchimp list members API: https://mailchimp.com/developer/marketing/api/list-members/list-members-info/
- ActiveCampaign contacts API: https://developers.activecampaign.com/reference/list-all-contacts
- BigCommerce customers API: https://docs.bigcommerce.com/developer/api-reference/rest/admin/management/customers/v3/get-customers
- WooCommerce customers API: https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-customers
- Square customers search API: https://developer.squareup.com/reference/square/customers-api/search-customers
- Intercom contacts search API: https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/searchcontacts
- Zapier Webhooks trigger: https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks
- Make webhooks: https://help.make.com/webhooks
- Slack chat.postMessage: https://docs.slack.dev/reference/methods/chat.postMessage/
- Microsoft Teams incoming webhooks: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Notion create page: https://developers.notion.com/reference/post-page
- Airtable create records: https://airtable.com/developers/web/api/create-records
- Google Sheets append values: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append
- n8n webhook node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- Workato webhooks: https://docs.workato.com/connectors/workato_app/workato-webhooks.html
- Pipedream workflow triggers: https://pipedream.com/docs/workflows/steps/triggers/
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
- Customer.io transactional API examples: https://docs.customer.io/journeys/transactional-api-examples/
- Braze send messages API: https://www.braze.com/docs/api/endpoints/messaging/send_messages/post_send_messages/
- OneSignal create message API: https://documentation.onesignal.com/reference/create-message
- Courier Send API: https://www.courier.com/docs/reference/send
- Knock workflow trigger API: https://docs.knock.app/send-notifications/triggering-workflows/api
- Novu trigger event API: https://docs.novu.co/api-reference/events/trigger-event
- Stripe Checkout Session creation: https://docs.stripe.com/api/checkout/sessions/create
- PayPal Orders API create order: https://developer.paypal.com/docs/api/orders/v2/#orders_create
- Square Payments API overview: https://developer.squareup.com/docs/payments-api/take-payments
- Adyen Checkout payments API: https://docs.adyen.com/api-explorer/Checkout/latest/post/payments
- Sentry envelopes: https://develop.sentry.dev/sdk/foundations/transport/envelopes/
- PostHog capture API: https://posthog.com/docs/api/capture
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Grafana Cloud OTLP: https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/
- Datadog Logs API: https://docs.datadoghq.com/api/latest/logs/
- Better Stack HTTP log source: https://betterstack.com/docs/logs/ingesting-data/http/logs/

## Customer Panel

The customer panel is the first web surface. It shows the current card
opportunity, local workspace state, panel count, handoff vendor, quick actions
for the free workflow, a deterministic customer chat session, image/render
choices, locale readiness, and ready local fallbacks.

The customer path stays cheap:

- No live AI chat call.
- No live image-generation call.
- No provider OAuth required.
- No real vendor order.
- No live printer quote; public pricing research remains review-only.
- No live translation provider; non-English and RTL copy remains review-gated.
- SVG export, local PDF proof/manifest package export, and manual handoff remain
  the working path.

## Admin Panel

The admin panel turns the adapter catalog into an operations surface:

- Total adapters and capability count.
- Ready, credential-gated, contract-only, and blocked counts.
- Per-capability local fallback coverage.
- Required env vars for provider and deployment readiness.
- Provider cost governance: zero-platform-spend, budget-capped, and
  blocked-zero-spend counts, monthly/per-request budget ceilings, rate-limited
  adapter counts, queue-required counts, and ready fallback coverage.
- Capacity profile readiness: local-dev, cheap-droplet, cloud-native, and
  SaaS-scale profile counts, max daily card/image-generation planning limits,
  queue/object-store posture, and live-call/real-order disabled counts.
- No-network runtime readiness counts: local-ready, request-ready, blocked, and
  missing credential references.
- Gated provider queue.
- Cloud runtime adapters.
- Blocked live-order vendors.
- Public printer pricing research for manual Walgreens/CVS/FedEx/Walmart/
  Staples/Office Depot comparison, including 12 official-source observations,
  8 persisted source links, source-count, and freshness state.
- Localization readiness for 4 launch locales, 2 RTL layout-review locales, 3
  human-copy-review locales, complete bundles, and live translation disabled.
- Production launch gates for production auth, live OAuth, AI generation, vendor
  quotes, live payments/refunds, direct retail orders, telemetry, applied
  bucket/IAM proof, deployed Postgres API, Vercel DB access, signed native
  mobile proof, external audits, and physical print certification.
- Retail fulfillment readiness for six blocked live vendor adapter contracts,
  two manual fallbacks, recovery drills, quote/order/payment/certification
  evidence gaps, and zero direct-order enablement.
- Payment readiness for four sandbox payment provider contracts, one no-payment
  fallback, webhook/refund/settlement evidence gaps, and zero live charges,
  refunds, captures, card-data storage, or PCI approval claims.
- Local print package export readiness for source SVGs, a combined PDF proof,
  and checksum manifest.

The adapter matrix also shows each dry-run state and the first missing
credential references. This is intentionally not a settings page that pretends
credentials are present. It is a readiness console for what must be connected,
reviewed, and certified.

Provider governance keeps the cheap path explicit: every usage-based,
free-tier, or self-hosted adapter receives a finite budget and rate limit; every
paid/gated path maps back to a ready local fallback; blocked live vendor
adapters remain zero-spend with real orders disabled.

## Mobile Customer App

`apps/mobile/src/customerExperience.ts` is the tested mobile customer contract
and render snapshot seam. `apps/mobile/src/App.tsx` renders the
`mobileRenderSnapshot` as the Expo customer surface instead of importing raw
contract arrays or exposing proof diagnostics. It mirrors the web customer panel
with card queue items, a next-action summary, approval controls, memory review
items, print-proof checks, local scripted chat, image/render status, review-only
printer pricing previews, offline idempotent API sync, manual handoff, and a
real-order-disabled banner. The mobile contract also carries the same 4 launch
locale options, including copy-review and RTL posture.

The mobile doctor validates environment resolution, the contract source, and the
repo-local real-order kill switch. Mobile render readiness in
`src/mobileRenderReadiness.ts` and `src/mobileRenderReadinessData.mjs` tracks
native shell source rendering, customer-flow screen state, print-proof render
rows, responsive viewport constraints, RTL render review, Expo preview profile
readiness, emulator render proof, and signed native artifact proof. Run
`npm run mobile:render:doctor`; this is not an emulator render proof or signed
native build. Actual emulator runs, native screenshots, EAS artifacts, and
platform signing remain outside the repo-local verification loop.

## API Boundary

`src/apiContracts.ts` defines the hosted API contract surface for customer,
admin, and mobile clients. It covers health, route catalog, customer bootstrap,
mobile bootstrap, admin readiness, provider catalog, admin demo reset, import
preview, card project creation, render packets, manual vendor handoff, and data
requests. Customer, admin, and mobile bootstrap payloads include localization
readiness so clients can render the same launch-locale state. The mobile
bootstrap also exposes the same customer app contract used by Expo: Google/Apple
entry points, calendar/email/invite import actions, next-action summary, queue
items, approval actions, memory review items, card proof path, best available
fulfillment recommendations, print-proof checks, checkout confirmation steps,
and offline idempotent sync state.

Hosted API proof readiness in `src/hostedApiReadiness.ts` and
`src/hostedApiReadinessData.mjs` tracks the Vercel project link, serverless API
route contract, deployment-protection boundary, hosted env sync, hosted Postgres
connectivity, public DB-backed route proof, hosted account-token verification,
and backup policy. Run `npm run hosted:api:doctor`. This is not public DB-backed Vercel proof, hosted account-token verification, or hosted database backup evidence.

`scripts/api-server.mjs` is the deployable no-dependency Node wrapper for those
contracts, backed by `scripts/api-runtime.mjs`. It serves `/api/health`,
`/api/routes`, `/api/customer/bootstrap`, `/api/mobile/bootstrap`,
`/api/admin/readiness`, and `/api/admin/provider-catalog`, exposes
`/api/admin/persistence-readiness`, keeps live external calls disabled, and also
serves the built web app from `dist`.

`vercel.json` and `api/[...path].mjs` add a Vercel deployment seam for the same
runtime. Vercel serves the built Vite app from `dist` and routes `/api/*` to the
serverless `handleApiRequest` Module. In contract mode it stays database-free;
in Postgres mode it requires `CUSTOMCARD_API_RUNTIME=postgres`, `DATABASE_URL`,
and customer/admin session tokens in Vercel environment variables.
The current protected Vercel deployment evidence is recorded in
`docs/deployment-evidence.md`; hosted DB env vars and public route proof remain
open launch-gate evidence.

The server now has explicit runtime modes:

- `contract`: default reviewer/static mode; routes remain available without
  session storage and mutations report contract-only acceptance.
- `memory`: executable local runtime; non-public routes require Bearer sessions,
  mutations require `X-Idempotency-Key`, same-key replay returns the stored
  response, and same-key/different-body conflicts return `409`.
- `postgres`: parameterized Postgres runtime path for auth sessions,
  idempotency records, relationship-memory repository writes, render-packet
  repository writes, import-preview provider/event/opportunity writes,
  card-project repository writes, manual vendor handoff order/consent/event
  writes, data-request privacy/consent writes, queue jobs, and audit rows.
  `npm run api:doctor:postgres` exercises this path with an injected fake `pg`
  pool, including wrong-role blocking, replay, conflict, render-packet insert,
  import-preview insert, relationship-memory insert, card-project insert, manual
  handoff insert, data-request insert, audit, and queue-job inserts. The live
  doctor runs the same shape against an isolated Postgres database, and the HTTP
  doctor starts the actual API server against that migrated Postgres shape to
  verify Bearer auth, idempotency, repository mutations, audit rows, and queue
  jobs over HTTP; deployed production Postgres traffic is still not claimed.

## Persistence Boundary

`src/persistenceContracts.ts` maps every API route to the Postgres tables it
needs before live authenticated handlers are implemented. The current migration
includes 18 durable tables, including `auth_sessions`, `idempotency_keys`,
`provider_connections`, `imported_events`, `card_opportunities`,
`card_projects`, `api_jobs`, and append-only audit/order event tables. This
proves the schema shape for production auth sessions, idempotency replay,
repository-backed relationship-memory, render-packet, import-preview,
card-project, manual vendor handoff, and data-request mutations, queue-backed
rendering and handoff jobs, consent/data requests, and operational audit without
claiming that deployed production DB handlers are serving traffic.
Render packets also carry artifact manifests, storage-provider metadata, signed
URL expiry, and external-share approval gates.

## Cheap Cloud Deployment Shape

The low-cost path remains:

1. Local development with Docker Compose, Postgres, Redis, and MinIO.
2. Small droplet Compose deployment for early hosted validation.
3. Kubernetes web and worker manifests when the app needs cloud-native scaling.

## Capacity profiles

`src/capacityPlan.ts` is the typed interface for the capacity/cost planning
contract, backed by shared executable data in `src/capacityPlanData.mjs` so the
web app, API server, and capacity doctor consume the same source. It defines
four finite profiles: local dev, cheap droplet, cloud native, and SaaS scale.
Each profile names daily card capacity, image-generation budget, web and worker
replica counts, database/queue/object-store mode, cost guardrails, required
evidence, scaling signals, and tradeoffs while keeping `liveProviderCalls=false`
and `realOrdersEnabled=false`.

`npm run capacity:doctor` verifies that the profiles, tests, admin/API
surfaces, docs, CI wiring, and safety posture remain aligned. These are planning
contracts and not measured production benchmarks. A real droplet benchmark,
cloud autoscaler report, hosted database throughput test, or provider spend
report still has to be attached before any production capacity claim is made.

The runtime remains fail-closed:

- `REAL_ORDER_KILL_SWITCH=disabled` keeps live orders off.
- Provider keys are named in `infra/env/.env.example` but not committed.
- `npm run deployment:doctor` verifies the committed local-dev, cheap-droplet,
  cloud-native, runtime, and data lanes and fails if required deployment signals
  disappear.
- `npm run capacity:doctor` verifies Capacity profiles in
  `src/capacityPlan.ts`, admin/API exposure, CI wiring, and the "not measured
  production benchmarks" disclaimer while keeping live traffic disabled.
- `npm run external:audit:doctor` verifies External audit readiness in
  `src/externalAuditReadiness.ts`, production-launch-gate mappings, admin/API
  exposure, CI wiring, and the "not an external audit report" disclaimer while
  keeping public production claims and attached external artifact counts at zero.
- `npm run e2e:coverage:doctor` verifies End-to-end coverage in
  `src/e2eCoverage.ts`, the 29-item repo-local end-to-end coverage matrix,
  admin/API exposure, backing browser/API/mobile/infra tests, CI wiring, and the
  "not live production proof" disclaimer while keeping live production proofs,
  real orders, and live external network requirements at zero.
- `npm run cloud:artifact:proof:doctor` verifies Cloud artifact proof readiness
  in `src/cloudArtifactProofReadiness.ts`, Terraform artifact-store source and
  runtime env-output coverage, applied bucket ARN/IAM policy/signed URL/access
  log/secret-sync/restore-drill evidence requirements, admin/API exposure, CI
  wiring, and the "not live-applied cloud bucket/IAM proof" disclaimer while
  keeping Terraform apply, applied bucket proof, IAM proof, signed URL proof,
  access-log proof, secret-sync proof, restore-drill proof, live external
  network calls, live provider calls, and real orders at zero.
- `npm run reviewer:db:seed:doctor` verifies Reviewer DB seed readiness in
  `src/reviewerDbSeedReadiness.ts`, deterministic seed-plan and SQL-preview
  contracts, customer/admin session-token requirements, hosted migration/env
  proof gaps, admin/API exposure, CI wiring, and the "not hosted reviewer DB
  mutation or hosted account-token proof" disclaimer while keeping hosted seed
  proof, hosted token proof, Vercel env proof, destructive live mutations, live
  external network calls, live provider calls, and real orders at zero.
- `npm run business:engagement:doctor` verifies Business engagement readiness in
  `src/businessEngagementReadiness.ts`, CRM/workflow/notification adapter
  coverage, provider runtime no-network contracts, admin/API exposure, CI
  wiring, and the "not live CRM OAuth, customer messaging, CRM writeback, or
  production campaign analytics proof" disclaimer while keeping live customer
  sends, CRM writes, live external network calls, and real orders at zero.
- `npm run ai:doctor` verifies AI provider readiness in
  `src/aiProviderReadiness.ts`, the text/image adapter inventory, model
  allowlist gates, prompt and brand-safety review evidence, PII/memory
  minimization, image print QA, spend controls, evaluation fixtures, admin/API
  exposure, CI wiring, and the "not live AI generation" disclaimer while keeping
  live provider calls, production AI traffic, and live external network
  requirements at zero.
- `npm run observability:doctor` verifies Observability readiness in
  `src/observabilityReadiness.ts`, telemetry schema, PII redaction, sampling,
  retention, alert-route drill tracking, observability provider request
  contracts, admin/API exposure, CI wiring, and the "not live telemetry ingestion"
  disclaimer while keeping live ingestion, production alerts, and live external
  network requirements at zero. This is not live telemetry ingestion evidence.
- `npm run payment:doctor` verifies Payment readiness in
  `src/paymentReadiness.ts`, sandbox payment provider contracts, no-payment
  fallback, idempotency, webhook, refund, settlement, admin/API exposure, CI
  wiring, and the "not live payment processing" disclaimer while keeping live
  charges, refunds, captures, card-data storage, PCI approval claims, and live
  external network requirements at zero.
- `npm run api:doctor` verifies the API/static server route map, provider
  summary, contract runtime, idempotent mutation contracts, and no-live-call
  posture.
- `npm run localization:doctor` verifies launch locales, RTL/copy-review gates,
  web/API/mobile surfaces, coverage/CI wiring, no live translation provider, and
  no real orders.
- `npm run api:doctor:memory` verifies Bearer session and idempotency enforcement
  in the executable memory runtime.
- `npm run persistence:doctor` verifies auth-session schema, idempotency replay,
  relationship-memory repository signals, render-packet repository signals,
  import-preview repository signals, card-project repository signals, manual
  vendor handoff order/consent/event repository signals, data-request
  privacy/consent repository signals, queue jobs, append-only audit coverage, and
  13 schema-backed API route mappings.
- Production Kubernetes secrets are annotated for pre-created secret-manager
  provisioning.
- Backups, live observability provider verification, and managed secrets remain
  required before production traffic.

## Verification Strategy

Implemented checks:

- `src/providerCatalog.test.ts` validates catalog coverage, local fallbacks,
  external provider docs/env gates, admin model, customer model, and blocked
  vendor status.
- `src/providerGovernance.test.ts` and `npm run provider:governance:doctor`
  validate provider budget ceilings, per-request caps, rate limits, queue
  posture, ready local fallbacks, blocked live-vendor zero-spend posture, admin
  visibility, API visibility, and CI wiring.
- `src/providerRuntime.test.ts` validates executable readiness for every
  catalog adapter, redacted no-network request contracts for chat/image/
  notification/payment/observability providers, metadata-only import, CRM
  lifecycle and workflow integration contracts, placeholder-secret rejection,
  free local fallbacks, and hard-blocked live vendor order adapters.
- `src/productionReadiness.test.ts` validates the 13 production launch gates and
  keeps live production components disabled until external evidence is attached.
- `src/printerPricing.test.ts` and `npm run printer:pricing:doctor` validate
  source-backed public price observations, collection rules, freshness blocking,
  minimum-quantity totals, manual-confirmation requirements, UI/API exposure, CI
  wiring, and the no-live-quote boundary.
- `src/retailFulfillmentReadiness.test.ts` and `npm run retail:doctor` validate
  Retail fulfillment readiness for six blocked retail-printer adapter contracts,
  manual handoff and review-only pricing fallbacks, live quote and order
  certification gaps, pickup/cancel/recovery drills, payment/refund boundaries,
  physical print QA requirements, admin/API surfaces, CI wiring, and zero live
  quotes, direct orders, real payments, external network calls, or physical
  certification claims. This is not live retail ordering.
- `src/paymentReadiness.test.ts` and `npm run payment:doctor` validate Payment
  readiness for the no-payment fallback, four sandbox payment provider
  contracts, idempotent checkout session requirements, no-card-data storage,
  webhook signature verification, live charge/capture approval, refund/void/
  dispute drills, settlement reconciliation, admin/API surfaces, CI wiring, and
  zero live charges, refunds, captures, external network calls, stored card
  data, or PCI approval claims. This is not live payment processing.
- `src/localization.test.ts` and `npm run localization:doctor` validate the 4
  launch locales, complete message bundles, RTL layout-review gates, human
  copy-review gates, web/API/mobile parity, CI wiring, no live translation
  provider, and no real orders.
- `src/capacityPlan.test.ts` and `npm run capacity:doctor` validate Capacity
  profiles for local-dev, cheap-droplet, cloud-native, and SaaS-scale planning;
  queue/object-store posture; cost guardrails; admin/API visibility; CI wiring;
  and the no-live-provider/no-real-order safety contract.
- `src/externalAuditReadiness.test.ts` and `npm run external:audit:doctor`
  validate the External audit readiness register for 15 missing proof items:
  legal, security, privacy, accessibility, hosted auth, OAuth, AI quality,
  vendor quotes, payment/PCI/refunds, telemetry alerting, applied cloud IAM,
  public hosted Postgres/Vercel DB proof, signed native mobile artifact, retail
  partner certification, and physical print certification. This register is not
  an external audit report; it is a launch evidence contract with every item
  blocking production and `publicClaimAllowed=false`.
- `src/e2eCoverage.test.ts` and `npm run e2e:coverage:doctor` validate the
  End-to-end coverage matrix for customer workspace/handoff, customer panel,
  admin panel, adapter matrix, API contracts, memory runtime, Postgres runtime,
  Postgres HTTP integration, account-auth storage/recovery, mobile shell, native
  release profiles, artifact handoff, deployment IaC, cloud artifact proof
  readiness, security/privacy/
  accessibility, external audit readiness, AI provider readiness,
  observability/alerting readiness, retail fulfillment readiness, payment/refund
  readiness, capacity/cost, localization/RTL, printer pricing, demo reset, and
  worker readiness. The
  matrix reports 100% repo-local coverage only; it is not live production proof.
- `src/cloudArtifactProofReadiness.test.ts` and
  `npm run cloud:artifact:proof:doctor` validate static artifact IaC, Terraform
  plan review, applied bucket ARN proof, IAM policy output proof, signed URL
  cloud probe, access-log proof, secret-manager env sync, and retention/restore
  drill requirements while keeping all applied-cloud proof claims at zero.
- `src/businessEngagementReadiness.test.ts` and
  `npm run business:engagement:doctor` validate CRM lifecycle source,
  popular-CRM OAuth contracts, trigger normalization, card-opportunity review,
  workflow payload contracts, customer message channel contracts,
  consent/suppression privacy gates, campaign feedback evidence, and zero live
  customer sends or CRM writes.
- `src/reviewerDbSeedReadiness.test.ts` and
  `npm run reviewer:db:seed:doctor` validate reviewer seed table coverage,
  customer/admin session-token requirements, SQL preview safety, hosted seed
  proof gaps, hosted token probe gaps, Vercel env proof gaps, rollback
  requirements, and zero destructive live mutations.
- `src/printExport.test.ts` validates source SVG artifacts, the combined 5x7
  PDF proof, checksum manifest validation, preflight failures, and no-order
  export summaries.
- `src/artifactHandoff.test.ts` validates HMAC-signed artifact URLs,
  object-store URI construction, tamper detection, expiry policy, and unsafe
  config failures.
- `src/artifactStore.test.ts` and `npm run artifact:doctor` validate local
  filesystem object-store writes, injected S3-compatible client writes, readback
  verification, checksum/byte-length matching, stored handoff manifests, no
  network calls, and no real orders.
- `CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled npm run artifact:doctor:s3:live`
  validates live S3-compatible object-store writes against MinIO or another
  compatible endpoint using path-style SigV4 requests, isolated buckets,
  readback verification, manifest storage, cleanup, no external vendor calls,
  and no real orders.
- `npm run api:doctor:postgres` validates Postgres API runtime SQL behavior,
  including repository-backed relationship-memory, render-packet, import-preview,
  card-project, manual vendor handoff, and data-request mutation persistence,
  through an injected fake pool without requiring external database credentials.
- `CUSTOMCARD_POSTGRES_INTEGRATION_DOCTOR=enabled npm run api:doctor:postgres:live`
  validates route-scoped customer/admin auth, idempotency,
  relationship-memory, render-packet, import-preview, card-project,
  manual-handoff, data-request, audit, and queue paths against an isolated live
  Postgres database after applying the committed migration.
- `CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled npm run api:doctor:postgres:http`
  starts `scripts/api-server.mjs` in Postgres mode against an isolated migrated
  database and validates public health/routes, admin/customer Bearer auth,
  missing/wrong-role auth blocks, missing idempotency blocking, all 6
  repository-backed customer HTTP mutations, replay/conflict, audit rows, queue
  jobs, and repository table counts.
- `CUSTOMCARD_ACCOUNT_AUTH_DOCTOR=enabled npm run account:doctor:live` validates
  hosted account identity storage, hashed recovery challenges, durable sessions,
  uniqueness, and audit logging against an isolated live Postgres database.
- UI smoke tests cover customer/admin panels, runtime dry-run readiness, the
  core local workflow, mobile overflow, and adapter matrix visibility.
- Infra tests require provider env vars and mobile customer contract evidence.
- Mobile contract tests validate the customer app sections, local/gated
  chat-render-handoff posture, locale options, and doctor kill-switch behavior.
- Agent contract tests validate the typed orchestration surface and fail-closed
  default policy.
- API contract and server tests validate customer/admin/mobile API bootstrap,
  provider readiness, idempotent mutation contracts, `/api/health`,
  repository-backed relationship-memory, render-packet, import-preview,
  card-project, manual-vendor-handoff, and data-request mutations, and
  memory-runtime auth/idempotency behavior.
- Persistence contract tests validate 18 table contracts, 13 schema-backed API
  routes, account identity/recovery storage, idempotency replay, queue-backed
  routes, and migration signals.
- `scripts/deployment-readiness.mjs` emits a JSON readiness report and is tested
  by `tests/infra-contract.test.ts`.
- `.github/workflows/verify.yml` runs install, full checks, deployment doctor,
  contract API doctor, memory API doctor, Postgres runtime contract doctor, live
  Postgres integration doctor, Postgres API HTTP doctor, account-auth doctor,
  cloud artifact IaC doctor, cloud artifact proof readiness doctor,
  localization doctor, artifact-store doctor, live
  MinIO/S3-compatible artifact doctor, persistence doctor, demo reset doctor,
  worker readiness, mobile doctor, mobile render readiness doctor, hosted API
  proof readiness doctor, business engagement readiness doctor, and mobile
  release doctor for pushes to `main` and pull requests.
- `npm run test:coverage` enforces V8 coverage thresholds for core, API,
  artifact handoff/store, cloud artifact proof readiness, mobile render
  readiness, hosted API proof readiness,
  localization, pricing, print-export, persistence, orchestration, and mobile
  contract modules: 90%
  statements, 80% branches, 90% functions, and 90% lines.

Remaining high-risk work:

- No live OAuth flow.
- AI provider readiness is covered as repo-local text/image adapter inventory,
  model allowlist, prompt safety, privacy, print QA, spend, evaluation, and
  rollout gates; no live AI/image provider call, model output QA run, or
  production AI traffic is claimed.
- No live payment charge/refund, live quote, or live order adapter.
- Observability readiness is covered as repo-local telemetry schema, redaction,
  sampling, retention, provider-contract, alert-route, and incident-review
  gates; no live observability ingestion, alert delivery, retention enforcement,
  or incident-response drill is claimed.
- No live printer tax, stock, or pickup-window integration; coupon discounts
  require provider-portal application proof before they affect best-price
  ranking.
- No professional translation QA, live translation provider, or native RTL
  render proof.
- Live-applied production cloud object-store bucket policy/IAM verification is
  still not attached; Cloud artifact proof readiness explicitly tracks the applied bucket ARN, IAM
  policy output, signed URL probe, access-log, secret-manager sync, and
  restore-drill evidence requirements, while signed render-packet URL contracts,
  static AWS artifact-store IaC, temporary filesystem write/read verification,
  injected S3-compatible write/read contract verification, and live CI/local
  MinIO/S3-compatible write/read doctor coverage are covered.
- No deployed production Postgres API integration or production hosted
  account-token verification; isolated live Postgres route-auth/migration/runtime
  integration, process-level API HTTP verification, and account identity/recovery
  storage are covered by doctors.
- No React Native renderer-package output, emulator proof, or actual native
  iOS/Android build artifact; render snapshot validation, EAS profiles, and
  release doctor are covered.
- No cloud deployment proof against a real cluster.
- Hosted GitHub Actions verification exists for main pushes, but there is still
  no live deployment proof against a real cluster.
- No external legal/security/privacy/accessibility audit; the repo-local
  baseline doctor verifies deploy headers, raw-content blocks, artifact-share
  controls, container hardening, and app-shell accessibility signals.
