# Vercel Environment Structure

Last verified: 2026-06-15.

This file records environment variable names and Vercel scopes only. Do not add
secret values here.

## Resource Links

- Project: `world-prize-s-projects/customcard`
- Production alias: `https://customcard-three.vercel.app`
- Postgres provider: Vercel Marketplace Neon resource `customcard-postgres`
- Postgres integration scope: `production`

## Production

Production is the only scope configured for durable Postgres. Do not copy
production database credentials into Preview or Development without creating a
separate database/resource for that scope.

### Runtime And Database

- `CUSTOMCARD_API_RUNTIME`
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `NEON_PROJECT_ID`
- `PGDATABASE`
- `PGHOST`
- `PGHOST_UNPOOLED`
- `PGPASSWORD`
- `PGUSER`
- `POSTGRES_DATABASE`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_USER`

### Auth And Sessions

- `AUTH_SESSION_SECRET`
- `CLERK_AUTHORIZED_PARTIES`
- `CLERK_JWT_KEY`
- `CLERK_SECRET_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`

`VITE_CLERK_PUBLISHABLE_KEY` is a public client key, not a server JWT verifier
secret, but Production still must use a Clerk `pk_live` value. Guarded public
bundle evidence in
`docs/evidence/hosted-api/2026-06-15-clerk-public-config-probe.json` currently
shows the deployed Production bundle contains a redacted `pk_test` key, contains
no `pk_live` key, and decodes to issuer candidate
`https://model-bluejay-21.clerk.accounts.dev`. Replace the Production key with a
live Clerk publishable key, redeploy, and rerun `npm run
hosted:clerk:public-config` before claiming Production OAuth readiness.
Use `npm run hosted:clerk:repair` to validate and apply the public/server Clerk
config together: it requires a `pk_live` publishable key for Production, derives
`CLERK_ISSUER` from that key, requires `CLERK_AUDIENCE`, and keeps reports
redacted.

### Missing Required Production Keys

Initial redacted `npm run hosted:env:inventory` evidence in
`docs/evidence/hosted-api/2026-06-15-vercel-env-inventory.json` showed these
required production keys were missing:

- `CLERK_AUDIENCE`
- `CLERK_ISSUER`
- `IDEMPOTENCY_KEY_TTL_HOURS`

Guarded partial repair evidence in
`docs/evidence/hosted-api/2026-06-15-vercel-env-repair-partial-ttl.json`
applied `IDEMPOTENCY_KEY_TTL_HOURS`. Follow-up redacted inventory in
`docs/evidence/hosted-api/2026-06-15-vercel-env-inventory-after-ttl-repair.json`
confirms `IDEMPOTENCY_KEY_TTL_HOURS` is now present. The remaining required
production keys are:

- `CLERK_AUDIENCE`
- `CLERK_ISSUER`

### Google Calendar OAuth

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `GOOGLE_OAUTH_STATE_SECRET`
- `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`

### AI Providers

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_IMAGE_MODEL`
- `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_TEXT_MODEL`

### Object Store

- `ARTIFACT_SIGNED_URL_TTL_MINUTES`
- `CUSTOMCARD_ARTIFACT_PERSISTENCE`
- `OBJECT_STORE_ACCESS_KEY_ID`
- `OBJECT_STORE_BUCKET`
- `OBJECT_STORE_PUBLIC_BASE_URL`
- `OBJECT_STORE_READ_ACCESS_KEY_ID`
- `OBJECT_STORE_READ_SECRET_ACCESS_KEY`
- `OBJECT_STORE_REGION`
- `OBJECT_STORE_SECRET_ACCESS_KEY`
- `OBJECT_STORE_SIGNING_SECRET`
- `OBJECT_STORE_URL`

### App And Retail

- `PUBLIC_APP_ORIGIN`
- `WALGREENS_AFF_ID`
- `WALGREENS_API_KEY`
- `WALGREENS_VENDOR_MODE`

## Preview

Preview currently has AI/provider-client bootstrap keys only. It does not have a
durable database resource. Add the Clerk session JWT verification config with a
non-production branch-scoped Vercel env command before relying on authenticated
Preview API routes.

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_IMAGE_MODEL`
- `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN`
- `VITE_CLERK_PUBLISHABLE_KEY`

## Development

Development has local/reviewer service keys, but no Vercel Marketplace Postgres
resource.

- `ARTIFACT_SIGNED_URL_TTL_MINUTES`
- `AUTH_SESSION_SECRET`
- `CLERK_AUTHORIZED_PARTIES`
- `CLERK_AUDIENCE`
- `CLERK_ISSUER`
- `CLERK_JWT_KEY`
- `CLERK_SECRET_KEY`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_IMAGE_MODEL`
- `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN`
- `CLOUDFLARE_WORKERS_AI_TEXT_MODEL`
- `CUSTOMCARD_ADMIN_SESSION_TOKEN`
- `CUSTOMCARD_API_RUNTIME`
- `CUSTOMCARD_ARTIFACT_PERSISTENCE`
- `CUSTOMCARD_CUSTOMER_SESSION_TOKEN`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `OBJECT_STORE_ACCESS_KEY_ID`
- `OBJECT_STORE_BUCKET`
- `OBJECT_STORE_READ_ACCESS_KEY_ID`
- `OBJECT_STORE_READ_SECRET_ACCESS_KEY`
- `OBJECT_STORE_REGION`
- `OBJECT_STORE_SECRET_ACCESS_KEY`
- `OBJECT_STORE_SIGNING_SECRET`
- `OBJECT_STORE_URL`
- `PUBLIC_APP_ORIGIN`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `WALGREENS_AFF_ID`
- `WALGREENS_API_KEY`
- `WALGREENS_VENDOR_MODE`

## Operational Rules

- Vercel env changes apply to new deployments. Redeploy after changing runtime
  or provider env.
- Use `vercel env ls --format=json` for scoped key inventory.
- Use `CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:env:inventory`
  to produce a redacted key-coverage report. The report must not include env
  values, only key names and target scopes.
- Use `CUSTOMCARD_HOSTED_ENV_REPAIR=enabled npm run hosted:env:repair` for a
  redacted repair plan. To apply missing production keys, also set
  `CUSTOMCARD_HOSTED_ENV_REPAIR_APPLY=enabled`,
  `CUSTOMCARD_HOSTED_ENV_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled`, and provide the
  remaining missing keys in the process env. Use
  `CUSTOMCARD_HOSTED_ENV_REPAIR_ALLOW_PARTIAL=enabled` only when intentionally
  applying a valid subset while keeping the report blocked on remaining keys.
  The repair report must not include the values.
- Use `CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:clerk:public-config`
  to fetch the deployed public app shell and JavaScript assets, redact Clerk
  publishable-key values, and fail Production when a `pk_test` key is present or
  no `pk_live` key is present.
- Use `CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app VITE_CLERK_PUBLISHABLE_KEY=pk_live_... CLERK_AUDIENCE=... npm run hosted:clerk:repair`
  to produce a redacted Clerk config repair plan. To apply the repair, also set
  `CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_APPLY=enabled`,
  `CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PRODUCTION=enabled`, and
  `CUSTOMCARD_HOSTED_CLERK_CONFIG_REPAIR_ACKNOWLEDGE_PUBLIC_KEY_REPLACE=enabled`.
  Redeploy after applying, then rerun `npm run hosted:clerk:public-config`.
- Use `vercel env pull <tmpfile> --environment=production` only for local
  migration/doctor runs, then delete the temp file immediately.
- Keep real env files in ignored locations: `.env.local`, `infra/env/.env`, or
  `/tmp`.
