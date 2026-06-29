# CustomCard Infrastructure

This directory is the deployable service skeleton for the production path.

- `docker-compose.dev.yml` runs app, worker, Postgres, Redis, and MinIO for local development.
- `docker-compose.droplet.yml` is the cheap single-host deployment shape for a small DigitalOcean droplet.
- `k8s/app.yaml` is the cloud-native starting point for web and worker deployments.
- `aws/artifact-store/` is the Terraform contract for a private, encrypted,
  versioned production artifact bucket and prefix-scoped app/worker IAM policy.
- `migrations/001_initial_schema.sql` defines the durable service data model.
- `env/.env.example` lists required secrets and kill switches.
- `../scripts/api-server.mjs` serves `/api/health`, API bootstrap/readiness
  contracts, explicit contract/memory/Postgres runtime modes, and the built web
  app from `dist`.
- `../src/artifactHandoff.ts` defines the render-packet artifact manifest and
  HMAC-signed URL contract used by the API/schema gates.
- `../src/artifactStore.ts` writes render-packet artifacts to a temporary local
  filesystem object-store path and an injected S3-compatible client contract,
  then verifies readback without network calls.
- `../scripts/persistence-doctor.mjs` validates auth-session, idempotency, queue
  job, and audit persistence signals.
- `../scripts/demo-reset.mjs` validates the reviewer demo reset contract before
  anyone attempts to run seed data against a database.
- `../scripts/deployment-readiness.mjs` emits the local deployment readiness
  report used by `npm run deployment:doctor`.
- `../src/capacityPlan.ts` and `../src/capacityPlanData.mjs` define executable
  local-dev, cheap-droplet, cloud-native, and SaaS-scale capacity profiles used
  by `npm run capacity:doctor`.

For the droplet deployment, provide `POSTGRES_PASSWORD`, `CADDY_DOMAIN`,
`CADDY_ACME_EMAIL`, and `OBJECT_STORE_*` values from a real secret/config source
or local deployment `.env` that is never committed. The compose file exposes the
app only behind Caddy on ports 80/443; Caddy obtains TLS, redirects HTTP to
HTTPS, and sends `Strict-Transport-Security`. `OBJECT_STORE_URL` must be an
HTTPS S3-compatible endpoint in production so signed storage requests do not
cross the network in plaintext.

For Kubernetes, apply the `customcard-migrate` Job successfully before rolling
the web and worker Deployments. The deployment manifest keeps the live-order kill
switch explicit and uses probes so bad pods fail visibly.

Run the local IaC readiness check before treating the manifests as reviewable:

```sh
npm run deployment:doctor
npm run capacity:doctor
npm run cloud:doctor
npm run api:doctor
npm run api:doctor:memory
npm run api:doctor:postgres
DATABASE_URL=postgres://... npm run api:doctor:postgres:live
DATABASE_URL=postgres://... npm run api:doctor:postgres:http
DATABASE_URL=postgres://... npm run account:doctor:live
npm run artifact:doctor
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run r2:bucket:create:prod
CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm run r2:bucket:list
OBJECT_STORE_URL=http://127.0.0.1:9000 OBJECT_STORE_BUCKET=customcard-ci-artifacts OBJECT_STORE_ACCESS_KEY_ID=customcard OBJECT_STORE_SECRET_ACCESS_KEY=customcard-dev-only OBJECT_STORE_REGION=us-east-1 OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run artifact:doctor:s3:live
OBJECT_STORE_URL=https://<account-id>.r2.cloudflarestorage.com OBJECT_STORE_BUCKET=customcard-prod OBJECT_STORE_REGION=auto OBJECT_STORE_SIGNING_SECRET=test-object-store-signing-secret-32 npm run artifact:doctor:s3:live -- --bucket-mode existing
npm run persistence:doctor
npm run demo:doctor
```

The report checks the local-dev, cheap-droplet, cloud-native, runtime, and data
lanes, including cloud-storage checks for the AWS artifact-store module. Passing
this check means the committed deployment contracts are internally consistent;
it does not mean a real droplet, AWS account, or Kubernetes cluster has been
provisioned.

`npm run capacity:doctor` verifies the profile contract, tests, admin/API
surfaces, documentation, CI wiring, and no-live-traffic posture. The profiles are
planning data only; measured production benchmarks, provider spend reports, and
autoscaler evidence remain separate launch evidence.

The Kubernetes web deployment probes `/api/health`, and the production Docker
image starts `scripts/api-server.mjs` so the same container can serve the static
web bundle and the contract-first API endpoints.

The API runtime defaults to `CUSTOMCARD_API_RUNTIME=contract` only for local
reviewer/static serving. Production-shaped environments must set
`CUSTOMCARD_API_RUNTIME=postgres`; `runtime:doctor` rejects contract or memory
there so auth sessions and idempotency records are durable. `npm run
api:doctor:memory` passes `--local-auth-fallbacks` with test customer/admin
session tokens and validates Bearer auth plus `X-Idempotency-Key` replay without
a live database.
`npm run api:doctor:postgres` injects a fake Postgres pool into the same runtime
path and validates session lookup, wrong-role blocking, idempotency replay,
conflict handling, repository-backed relationship-memory inserts,
repository-backed render-packet inserts, repository-backed import-preview
inserts, repository-backed card-project inserts, manual handoff
order/consent/event inserts, data-request privacy/consent inserts, audit inserts,
and queue-job inserts without external credentials.
`npm run
api:doctor:postgres:live` creates an isolated temporary database on the configured
Postgres server, applies the committed migration, seeds customer/admin sessions,
verifies all repository-backed customer routes plus admin readiness through the
real `pg` runtime, exercises relationship-memory, render-packet, import-preview,
card-project, manual handoff, and data-request persistence, and drops the
temporary database before exiting.
`npm run
api:doctor:postgres:http` starts `scripts/api-server.mjs` against the same
isolated migrated database shape and verifies public health/routes,
admin/customer Bearer auth, missing/wrong-role auth blocking, missing
idempotency blocking, all 6 repository-backed customer HTTP mutations,
idempotency replay/conflict, audit rows, queue jobs, and repository table counts
before shutting the server down and dropping the temporary database.
CI runs both live Postgres doctors against a Postgres service; deployed
production account auth remains unclaimed.

`npm run account:doctor:live` uses the
same isolated-database pattern to verify hosted account identity rows,
provider-subject uniqueness, hashed recovery challenges, durable sessions, and
account-recovery audit rows. CI runs it against the Postgres service; live hosted
token verification remains unclaimed.

`npm run artifact:doctor` writes the sample render packet package to a
temporary local filesystem object-store path and an injected S3-compatible client
contract, reads every artifact back, verifies checksums and byte lengths, stores
both handoff manifests, and keeps network calls plus real orders disabled.
`npm run artifact:doctor:s3:live` writes
the same package to a live S3-compatible endpoint such as MinIO using path-style
SigV4 requests, reads every object back, verifies checksums and byte lengths,
stores the handoff manifest, reports `cloudWritesVerified: true`, cleans up the
isolated bucket, and keeps external vendor calls plus real orders disabled. A
production cloud bucket policy/IAM contract is now represented by
`infra/aws/artifact-store` and checked by `npm run cloud:doctor`; live AWS apply,
Access Analyzer review, and account-specific IAM validation remain separate from
this repo-local proof.

The hosted API can persist render-packet image artifacts through
`scripts/object-store-runtime.mjs` when object-store credentials are configured
and `CUSTOMCARD_API_RUNTIME` is `memory` or `postgres`. For Cloudflare R2, set
`OBJECT_STORE_URL` to the account S3 endpoint, `OBJECT_STORE_BUCKET` to the R2
bucket, `OBJECT_STORE_REGION=auto`, `OBJECT_STORE_PUBLIC_BASE_URL` to the hosted
`/api/artifacts` route, and mirror the write-capable S3 credentials into
`OBJECT_STORE_ACCESS_KEY_ID` / `OBJECT_STORE_SECRET_ACCESS_KEY`. Optional
read-only R2 credentials can be supplied through
`OBJECT_STORE_READ_ACCESS_KEY_ID` / `OBJECT_STORE_READ_SECRET_ACCESS_KEY` for
future download-only lanes while signed API URLs continue to use
`OBJECT_STORE_SIGNING_SECRET`. The bucket must already exist; object-scoped R2
tokens are enough for artifact writes and reads, but they do not create buckets.
Run `npm run r2:bucket:create:prod` or `npm run r2:bucket:create --
<bucket-name>` with a short-lived Cloudflare R2 account token when the bucket
needs to be provisioned through [Wrangler](https://developers.cloudflare.com/r2/buckets/create-buckets/).
For live R2 verification with object-scoped S3 credentials, set
`--bucket-mode existing` so the doctor writes under
a temporary project prefix inside the configured bucket and only deletes the
objects it created.

The AWS artifact-store module provisions only the artifact storage boundary:
public access block, bucket-owner-enforced ownership, versioning, AES256
server-side encryption, lifecycle cleanup under `projects/`, an HTTPS-only and
encrypted-upload bucket policy, and a least-privilege writer policy scoped to
`projects/*`. Existing app and worker IAM roles can be attached by passing
`app_role_name` and `worker_role_name`. Runtime outputs name the required
`OBJECT_STORE_*` values that still need to be mirrored into the platform secret
or config manager.

The persistence boundary requires auth-session storage, account identity storage,
hashed recovery challenges, idempotency replay, queue job envelopes,
relationship-memory repository writes, render-packet repository writes,
render-packet artifact manifests, signed URL expiry, and append-only audit
signals in the migration before production Postgres handlers are claimed.

The Kubernetes `Secret` in `k8s/app.yaml` is intentionally empty and annotated as
pre-created by a secret manager. Production clusters should source the required
keys from the platform secret manager, External Secrets, Sealed Secrets, or an
equivalent operator-approved mechanism. The `runtime:doctor` check rejects empty
values, known placeholders, short auth/signing secrets, non-Postgres production
API runtimes, and any live-order kill switch value other than `disabled`.

Signed artifact handoff requires `OBJECT_STORE_SIGNING_SECRET` to be present and
at least 32 characters. The committed manifests also keep
`ARTIFACT_SIGNED_URL_TTL_MINUTES=15` explicit so download links remain
short-lived.

Real external ordering stays disabled by admin safety controls until vendor sandbox tests and physical print certification are recorded.

## Provider Adapter Secrets

`env/.env.example` names the credential-gated adapters represented in
`src/providerCatalog.ts`:

- Google OAuth: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`, `GOOGLE_OAUTH_STATE_SECRET`.
- Microsoft Graph: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
  `MICROSOFT_TENANT_ID`.
- Event platforms: `EVENTBRITE_CLIENT_ID`, `EVENTBRITE_CLIENT_SECRET`,
  `LUMA_API_KEY`, `MEETUP_CLIENT_ID`, and `MEETUP_CLIENT_SECRET`. Partiful is a
  contract-only/manual path until an official API exists.
- Hosted identity providers: `CUSTOMCARD_AUTH_CALLBACK_URL`, `AUTH0_DOMAIN`,
  `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`,
  `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`,
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `COGNITO_DOMAIN`,
  `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`.
- Contact import providers: `CARDDAV_BASE_URL`, `CARDDAV_USERNAME`,
  `CARDDAV_APP_PASSWORD`, `CARDDAV_ADDRESSBOOK_PATH`.
- CRM/customer lifecycle providers: Salesforce, HubSpot, Zoho, Pipedrive,
  Dynamics, Shopify, Klaviyo, Mailchimp, ActiveCampaign, BigCommerce,
  WooCommerce, Square, Intercom, Monday.com, Amazon Selling Partner API, and
  Etsy keys listed in `env/.env.example`.
- Text and image AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
  `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_IMAGE_DEPLOYMENT`,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN`,
  `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`,
  `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY`,
  `PERPLEXITY_API_KEY`, `XAI_API_KEY`, `TOGETHER_API_KEY`, `GROQ_API_KEY`,
  `DEEPSEEK_API_KEY`, `FIREWORKS_API_KEY`, `STABILITY_API_KEY`,
  `HUGGINGFACE_API_TOKEN`, `DEEPAI_API_KEY`, `REPLICATE_API_TOKEN`, `IDEOGRAM_API_KEY`,
  `LEONARDO_API_KEY`, `FAL_KEY`, `BFL_API_KEY`.
- Self-hosted model fallback: `SELF_HOSTED_LLM_BASE_URL`,
  `SELF_HOSTED_LLM_API_KEY`.

Cloudflare Workers AI can use one shared `CLOUDFLARE_API_TOKEN` for both
chat and image generation, or separate lane-specific tokens through
`CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN` and
`CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`. Set provider, model, budget, queue, and
workflow policy in Admin Providers. Use
`@cf/bytedance/stable-diffusion-xl-lightning` as the current Cloudflare image
default, and keep `@cf/black-forest-labs/flux-1-schnell` as the higher-quality
image fallback when prompt adherence matters more than the absolute lowest cost.
The production-text local Comfy path does not require hosted Cloudflare image
tokens; those hosted image keys are only needed when you intend to validate the
live Cloudflare image lane.
- Notification providers: `RESEND_API_KEY`, `SENDGRID_API_KEY`,
  `POSTMARK_SERVER_TOKEN`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_MESSAGING_SERVICE_SID`, `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `EXPO_ACCESS_TOKEN`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `CUSTOMERIO_APP_API_KEY`,
  `CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID`, `BRAZE_REST_ENDPOINT`,
  `BRAZE_REST_API_KEY`, `BRAZE_CANVAS_ID`, `ONESIGNAL_APP_ID`,
  `ONESIGNAL_REST_API_KEY`, `COURIER_AUTH_TOKEN`, `COURIER_TEMPLATE_ID`,
  `KNOCK_API_KEY`, `KNOCK_WORKFLOW_KEY`, `NOVU_API_KEY`, `NOVU_WORKFLOW_ID`,
  `TRANSACTIONAL_EMAIL_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`.
- Workflow providers: Zapier, Make, Slack, Microsoft Teams, Notion, Airtable,
  Google Sheets, n8n, Workato, and Pipedream keys listed in
  `env/.env.example`.
- Payment sandbox providers: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `CUSTOMCARD_PAYMENT_SUCCESS_URL`, `CUSTOMCARD_PAYMENT_CANCEL_URL`,
  `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`,
  `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`,
  `SQUARE_WEBHOOK_SIGNATURE_KEY`, `ADYEN_API_KEY`,
  `ADYEN_MERCHANT_ACCOUNT`, `ADYEN_HMAC_KEY`.
- Observability providers: `SENTRY_DSN`, `SENTRY_PROJECT_ID`,
  `SENTRY_ENVIRONMENT`, `POSTHOG_PROJECT_API_KEY`, `POSTHOG_HOST`,
  `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS`,
  `GRAFANA_OTLP_ENDPOINT`, `GRAFANA_OTLP_INSTANCE_ID`,
  `GRAFANA_OTLP_API_KEY`, `DATADOG_API_KEY`, `DATADOG_SITE`,
  `BETTERSTACK_SOURCE_TOKEN`, `BETTERSTACK_INGESTING_HOST`.
- Object-store artifact signer and live S3-compatible doctor:
  `OBJECT_STORE_URL`,
  `OBJECT_STORE_BUCKET`, `OBJECT_STORE_ACCESS_KEY_ID`,
  `OBJECT_STORE_SECRET_ACCESS_KEY`, `OBJECT_STORE_READ_ACCESS_KEY_ID`,
  `OBJECT_STORE_READ_SECRET_ACCESS_KEY`, `OBJECT_STORE_REGION`,
  `OBJECT_STORE_PUBLIC_BASE_URL`, `OBJECT_STORE_SIGNING_SECRET`,
  `ARTIFACT_SIGNED_URL_TTL_MINUTES`. Bucket-admin setup also uses
  `CLOUDFLARE_ACCOUNT_ID` and a short-lived `CLOUDFLARE_API_TOKEN`.
- Live vendor adapters: mode and kill-switch state are persisted through admin
  safety controls, not environment variables.
- Persistence controls: `CUSTOMCARD_API_RUNTIME`, `AUTH_SESSION_SECRET`,
  `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_ISSUER`,
  `CLERK_AUDIENCE`, `CUSTOMCARD_CUSTOMER_SESSION_TOKEN`,
  `CUSTOMCARD_ADMIN_SESSION_TOKEN`, `IDEMPOTENCY_KEY_TTL_HOURS`.

These keys are documented for deployment readiness only. The current repo state
does not make live provider calls, and admin safety controls keep live orders
closed until certification is recorded.
