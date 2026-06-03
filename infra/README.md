# CustomCard Infrastructure

This directory is the deployable service skeleton for the production path.

- `docker-compose.dev.yml` runs app, worker, Postgres, Redis, and MinIO for local development.
- `docker-compose.droplet.yml` is the cheap single-host deployment shape for a small DigitalOcean droplet.
- `k8s/app.yaml` is the cloud-native starting point for web and worker deployments.
- `migrations/001_initial_schema.sql` defines the durable service data model.
- `env/.env.example` lists required secrets and kill switches.
- `../scripts/api-server.mjs` serves `/api/health`, API bootstrap/readiness
  contracts, explicit contract/memory/Postgres runtime modes, and the built web
  app from `dist`.
- `../src/artifactHandoff.ts` defines the render-packet artifact manifest and
  HMAC-signed URL contract used by the API/schema gates.
- `../scripts/persistence-doctor.mjs` validates auth-session, idempotency, queue
  job, and audit persistence signals.
- `../scripts/demo-reset.mjs` validates the reviewer demo reset contract before
  anyone attempts to run seed data against a database.
- `../scripts/deployment-readiness.mjs` emits the local deployment readiness
  report used by `npm run deployment:doctor`.

For the droplet deployment, provide `POSTGRES_PASSWORD` from a real secret source
or local deployment `.env` that is never committed. The compose file uses
`${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}` so the service fails closed instead
of starting with an empty database password.

For Kubernetes, apply the `customcard-migrate` Job successfully before rolling
the web and worker Deployments. The deployment manifest keeps the live-order kill
switch explicit and uses probes so bad pods fail visibly.

Run the local IaC readiness check before treating the manifests as reviewable:

```sh
npm run deployment:doctor
npm run api:doctor
npm run api:doctor:memory
npm run persistence:doctor
npm run demo:doctor
```

The report checks the local-dev, cheap-droplet, cloud-native, runtime, and data
lanes. Passing this check means the committed deployment contracts are internally
consistent; it does not mean a real droplet or Kubernetes cluster has been
provisioned.

The Kubernetes web deployment probes `/api/health`, and the production Docker
image starts `scripts/api-server.mjs` so the same container can serve the static
web bundle and the contract-first API endpoints.

The API runtime defaults to `CUSTOMCARD_API_RUNTIME=contract` for reviewer/static
serving. `npm run api:doctor:memory` sets test customer/admin session tokens and
validates Bearer auth plus `X-Idempotency-Key` replay without a live database.
`CUSTOMCARD_API_RUNTIME=postgres` is reserved for live database integration
testing and requires `DATABASE_URL`.

The persistence boundary requires auth-session storage, idempotency replay,
queue job envelopes, render-packet artifact manifests, signed URL expiry, and
append-only audit signals in the migration before production Postgres handlers
are claimed.

The Kubernetes `Secret` in `k8s/app.yaml` is intentionally empty and annotated as
pre-created by a secret manager. Production clusters should source the required
keys from the platform secret manager, External Secrets, Sealed Secrets, or an
equivalent operator-approved mechanism. The `runtime:doctor` check rejects empty
values, known placeholders, and any live-order kill switch value other than
`disabled`.

Signed artifact handoff requires `OBJECT_STORE_SIGNING_SECRET` to be present and
at least 32 characters. The committed manifests also keep
`ARTIFACT_SIGNED_URL_TTL_MINUTES=15` explicit so download links remain
short-lived.

Real external ordering stays disabled with `REAL_ORDER_KILL_SWITCH=disabled` until vendor sandbox tests and physical print certification are recorded.

## Provider Adapter Secrets

`env/.env.example` names the credential-gated adapters represented in
`src/providerCatalog.ts`:

- Google OAuth: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.
- Microsoft Graph: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
  `MICROSOFT_TENANT_ID`.
- Hosted identity providers: `CUSTOMCARD_AUTH_CALLBACK_URL`, `AUTH0_DOMAIN`,
  `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_AUDIENCE`,
  `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`,
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_SERVICE_ACCOUNT_JSON`, `COGNITO_DOMAIN`,
  `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`.
- Contact import providers: `CARDDAV_BASE_URL`, `CARDDAV_USERNAME`,
  `CARDDAV_APP_PASSWORD`, `CARDDAV_ADDRESSBOOK_PATH`.
- Text and image AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
  `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_IMAGE_DEPLOYMENT`,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`,
  `BEDROCK_TEXT_MODEL_ID`, `BEDROCK_IMAGE_MODEL_ID`,
  `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY`,
  `PERPLEXITY_API_KEY`, `XAI_API_KEY`, `TOGETHER_API_KEY`, `GROQ_API_KEY`,
  `DEEPSEEK_API_KEY`, `FIREWORKS_API_KEY`, `STABILITY_API_KEY`,
  `HUGGINGFACE_API_TOKEN`, `REPLICATE_API_TOKEN`, `IDEOGRAM_API_KEY`,
  `LEONARDO_API_KEY`, `FAL_KEY`, `BFL_API_KEY`.
- Self-hosted model fallback: `SELF_HOSTED_LLM_BASE_URL`,
  `SELF_HOSTED_LLM_API_KEY`.
- Notification providers: `RESEND_API_KEY`, `SENDGRID_API_KEY`,
  `POSTMARK_SERVER_TOKEN`, `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_MESSAGING_SERVICE_SID`, `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `EXPO_ACCESS_TOKEN`,
  `TRANSACTIONAL_EMAIL_API_KEY`, `TRANSACTIONAL_EMAIL_FROM`.
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
- Object-store artifact signer: `OBJECT_STORE_SIGNING_SECRET`.
- Live vendor adapters: `WALGREENS_VENDOR_MODE`, `CVS_VENDOR_MODE`,
  `FEDEX_VENDOR_MODE`, `WALMART_VENDOR_MODE`, `STAPLES_VENDOR_MODE`,
  `OFFICE_DEPOT_VENDOR_MODE`.
- Persistence controls: `CUSTOMCARD_API_RUNTIME`, `AUTH_SESSION_SECRET`,
  `CUSTOMCARD_CUSTOMER_SESSION_TOKEN`, `CUSTOMCARD_ADMIN_SESSION_TOKEN`,
  `IDEMPOTENCY_KEY_TTL_HOURS`.

These keys are documented for deployment readiness only. The current repo state
does not make live provider calls, and vendor modes remain
`disabled_until_certified` while `REAL_ORDER_KILL_SWITCH=disabled`.
