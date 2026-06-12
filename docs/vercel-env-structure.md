# Vercel Environment Structure

Last verified: 2026-06-12.

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
- `CUSTOMCARD_ADMIN_SESSION_TOKEN`
- `CUSTOMCARD_CUSTOMER_SESSION_TOKEN`
- `VITE_CLERK_PUBLISHABLE_KEY`

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
- `CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED`

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
- Use `vercel env pull <tmpfile> --environment=production` only for local
  migration/doctor runs, then delete the temp file immediately.
- Keep real env files in ignored locations: `.env.local`, `infra/env/.env`, or
  `/tmp`.
