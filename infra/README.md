# CustomCard Infrastructure

This directory is the deployable service skeleton for the production path.

- `docker-compose.dev.yml` runs app, worker, Postgres, Redis, and MinIO for local development.
- `docker-compose.droplet.yml` is the cheap single-host deployment shape for a small DigitalOcean droplet.
- `k8s/app.yaml` is the cloud-native starting point for web and worker deployments.
- `migrations/001_initial_schema.sql` defines the durable service data model.
- `env/.env.example` lists required secrets and kill switches.
- `../scripts/api-server.mjs` serves `/api/health`, API bootstrap/readiness
  contracts, and the built web app from `dist`.
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
```

The report checks the local-dev, cheap-droplet, cloud-native, runtime, and data
lanes. Passing this check means the committed deployment contracts are internally
consistent; it does not mean a real droplet or Kubernetes cluster has been
provisioned.

The Kubernetes web deployment probes `/api/health`, and the production Docker
image starts `scripts/api-server.mjs` so the same container can serve the static
web bundle and the contract-first API endpoints.

The Kubernetes `Secret` in `k8s/app.yaml` is intentionally empty and annotated as
pre-created by a secret manager. Production clusters should source the required
keys from the platform secret manager, External Secrets, Sealed Secrets, or an
equivalent operator-approved mechanism. The `runtime:doctor` check rejects empty
values, known placeholders, and any live-order kill switch value other than
`disabled`.

Real external ordering stays disabled with `REAL_ORDER_KILL_SWITCH=disabled` until vendor sandbox tests and physical print certification are recorded.

## Provider Adapter Secrets

`env/.env.example` names the credential-gated adapters represented in
`src/providerCatalog.ts`:

- Google OAuth: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.
- Microsoft Graph: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
  `MICROSOFT_TENANT_ID`.
- Text and image AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY`,
  `PERPLEXITY_API_KEY`, `XAI_API_KEY`, `TOGETHER_API_KEY`,
  `STABILITY_API_KEY`, `HUGGINGFACE_API_TOKEN`, `REPLICATE_API_TOKEN`,
  `IDEOGRAM_API_KEY`, `LEONARDO_API_KEY`.
- Self-hosted model fallback: `SELF_HOSTED_LLM_BASE_URL`,
  `SELF_HOSTED_LLM_API_KEY`.
- Notification contract: `TRANSACTIONAL_EMAIL_API_KEY`,
  `TRANSACTIONAL_EMAIL_FROM`.
- Live vendor adapters: `WALGREENS_VENDOR_MODE`, `CVS_VENDOR_MODE`,
  `FEDEX_VENDOR_MODE`.

These keys are documented for deployment readiness only. The current repo state
does not make live provider calls, and vendor modes remain
`disabled_until_certified` while `REAL_ORDER_KILL_SWITCH=disabled`.
