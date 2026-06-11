# CustomCard — Setup Guide

Three environments: local dev, QA, production. Start with local dev — it needs
zero credentials for the free local workflow.

---

## 1. Local development (no keys required)

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | [nodejs.org](https://nodejs.org/) or `brew install node` |
| npm | 10+ | Bundled with Node |
| Git | any | `brew install git` |

Optional for AI card generation:

| Tool | Version | Install |
|---|---|---|
| Python | 3.12.x | [python.org](https://www.python.org/) or `brew install python@3.12` |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |

### Clone and install

```bash
git clone https://github.com/abhidya/CustomCard.git
cd CustomCard
npm install
```

Create `.env.local` from `.env.example` and keep the Clerk React key:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_with_clerk_publishable_key
```

Clerk React setup follows the current quickstart:
https://clerk.com/docs/react/getting-started/quickstart.

### Run the app

```bash
npm run dev
# → http://127.0.0.1:5173
```

The core card workflow runs locally; Clerk auth uses the configured Clerk
publishable key:
- Card studio, memory, print export, fulfillment estimates — all local.
- All live integration gates are `false` by default (safe to explore freely).

### Run tests

```bash
npm test                     # 530 tests, ~25 s
npm run check                # tests + coverage + build + audit (CI gate)
```

### Optional: AI card generation sidecar

When you want the "Generate with AI" button to work:

```bash
# Terminal 1 — sidecar
cd card_gen
ANTHROPIC_API_KEY=sk-ant-... CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL=true \
  CARD_GEN_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 \
  uv run uvicorn card_gen.app:app --reload --port 8001

# Terminal 2 — app with sidecar URL
VITE_CARD_GEN_URL=http://localhost:8001 npm run dev
```

Image generation (optional, requires OpenAI key):

```bash
ANTHROPIC_API_KEY=sk-ant-... CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL=true \
  OPENAI_API_KEY=sk-... CARD_IMAGE_ENABLED=true \
  uv run uvicorn card_gen.app:app --reload --port 8001
```

Sidecar health check: `curl http://localhost:8001/health` → `{"status":"ok","image_gen":"enabled"}`

### Mobile web preview

```bash
npm run mobile:web:preview
# → http://127.0.0.1:5173/?view=mobile
```

---

## 2. QA environment

A QA environment is a Vercel preview deployment wired to a Postgres database.
No live vendor APIs or real orders — gates stay `false`.

### 2a. Provision a QA database

Use [Neon](https://neon.tech/) (free tier) or any Postgres 15+ host.

```bash
# Neon — create project at https://console.neon.tech/
# Copy the connection string: postgres://user:pass@host/dbname?sslmode=require
```

Run migrations:

```bash
DATABASE_URL="postgres://..." npm run migrate
```

### 2b. Configure Vercel preview environment

```bash
npm install -g vercel   # one-time
vercel link             # links this directory to your Vercel project

# Set QA env vars (preview scope only)
vercel env add VITE_CLERK_PUBLISHABLE_KEY preview # value: pk_test_replace_with_clerk_publishable_key
vercel env add DATABASE_URL preview          # paste your Neon connection string
vercel env add CUSTOMCARD_API_RUNTIME preview   # value: postgres
vercel env add NODE_ENV preview              # value: production
```

Optional — AI sidecar on QA. Deploy the sidecar to [Railway](https://railway.app/) or [Render](https://render.com/):

```bash
# On Railway: add a new service, point to card_gen/, set:
#   ANTHROPIC_API_KEY=sk-ant-...
#   CARD_GEN_API_TOKEN=<32+ char secret>
#   CARD_GEN_ALLOWED_ORIGINS=https://your-preview.vercel.app
#   PORT=8001
# Add VITE_CARD_GEN_URL only when requests go through a trusted backend/proxy
# that attaches Authorization: Bearer $CARD_GEN_API_TOKEN.
```

### 2c. Deploy to QA

```bash
git push origin main    # triggers automatic Vercel preview deployment
# OR
vercel deploy           # manual preview deploy
```

Preview URL format: `https://customcard-<hash>-world-prize-s-projects.vercel.app`

### 2d. Verify QA

```bash
# API health
curl https://customcard-<hash>.vercel.app/api/health

# Doctor checks (run locally against QA DB)
DATABASE_URL="postgres://..." node scripts/demo-reset.mjs
```

---

## 3. Production deployment

### 3a. Prerequisites

| Service | Purpose | Sign-up |
|---|---|---|
| Vercel | Hosting | [vercel.com](https://vercel.com/) |
| Neon / Supabase / Railway Postgres | Database | [neon.tech](https://neon.tech/) |
| Anthropic API | AI card generation | [console.anthropic.com](https://console.anthropic.com/) |

Live vendor APIs (unlock when gates are ready — see §4):

| Service | Gate | Sign-up |
|---|---|---|
| Google Cloud Console | `liveOAuthEnabled` | [console.cloud.google.com](https://console.cloud.google.com/) |
| Microsoft Entra | `liveOAuthEnabled` (Outlook) | [portal.azure.com](https://portal.azure.com/) |
| OpenAI | `liveProviderCallsEnabled` (images) | [platform.openai.com](https://platform.openai.com/) |

### 3b. Provision the production database

```bash
# Create a production Postgres instance on Neon:
# https://console.neon.tech/ → New project → Copy connection string

# Run migrations against production DB:
DATABASE_URL="postgres://..." npm run migrate
```

### 3c. Set Vercel production env vars

```bash
vercel env add VITE_CLERK_PUBLISHABLE_KEY production # value: pk_test_replace_with_clerk_publishable_key
vercel env add DATABASE_URL production           # Neon production connection string
vercel env add CUSTOMCARD_API_RUNTIME production # value: postgres
vercel env add NODE_ENV production               # value: production
vercel env add VITE_CARD_GEN_URL production      # optional: https://your-sidecar.railway.app
```

### 3d. Deploy to production

```bash
git push origin main    # auto-deploys via Vercel GitHub integration
# OR
vercel --prod           # manual production deploy
```

Production URL: `https://customcard-three.vercel.app`

### 3e. Verify production

```bash
# Health
curl https://customcard-three.vercel.app/api/health

# Verify deployment protection is off (or set up bypass token in Vercel dashboard)
# Dashboard: Settings → Deployment Protection → Disable or add bypass token
```

### 3f. Deploy the AI sidecar (optional)

```bash
# Railway (recommended — zero-config Python deployment)
# 1. railway.app → New project → Deploy from GitHub → select CustomCard → root: card_gen/
# 2. Set env vars in Railway dashboard:
#    ANTHROPIC_API_KEY=sk-ant-...
#    CARD_GEN_API_TOKEN=<32+ char secret>
#    CARD_GEN_ALLOWED_ORIGINS=https://customcard-three.vercel.app
#    OPENAI_API_KEY=sk-...       (optional, for image gen)
#    CARD_IMAGE_ENABLED=true     (optional)
# 3. Keep VITE_CARD_GEN_URL unset in production until a trusted backend/proxy
#    can attach Authorization: Bearer $CARD_GEN_API_TOKEN.
```

---

## 4. Unlock live integration gates

All gates are `false` by default. Flip them one at a time after the required evidence is in place.

### Gate: AI card generation (`liveProviderCallsEnabled`)

**Easiest gate — unlockable today.**

```bash
# Locally:
VITE_CARD_GEN_URL=http://localhost:8001 npm run dev

# On Vercel (production):
# keep VITE_CARD_GEN_URL unset until the sidecar is called through a trusted backend/proxy
```

The sidecar requires `Authorization: Bearer $CARD_GEN_API_TOKEN` outside the
explicit localhost-only development opt-in, so do not point browser builds
directly at a hosted sidecar without a trusted proxy.

Required: `ANTHROPIC_API_KEY` on the sidecar server only. It never touches the browser.

---

### Gate: OAuth calendar/Gmail (`liveOAuthEnabled`)

**Requires Google Cloud Console app registration.**

1. Create project at [console.cloud.google.com](https://console.cloud.google.com/)
2. Enable APIs: **Google Calendar API** and/or **Gmail API**
3. OAuth consent screen → External → add scopes:
   - Calendar: `https://www.googleapis.com/auth/calendar.events.readonly`
   - Gmail: `https://www.googleapis.com/auth/gmail.metadata` (metadata only — no message bodies)
4. Create OAuth 2.0 credentials → Web application
5. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `http://127.0.0.1:5173`
   - `https://customcard-three.vercel.app`
6. Add authorized redirect URIs:
   - `http://localhost:5173/oauth/callback`
   - `http://127.0.0.1:5173/oauth/callback`
   - `https://customcard-three.vercel.app/oauth/callback`

Current Google OAuth client:

- Client ID: `604984591268-dujee5ri2ff87sqe3iv3m58nj2e2mibc.apps.googleusercontent.com`
- Created: June 11, 2026 at 2:41:55 AM GMT-4
- Status: Enabled
- Publishing state: limited to OAuth consent-screen test users until published

```bash
vercel env add GOOGLE_OAUTH_CLIENT_ID production      # from Google Console
vercel env add GOOGLE_OAUTH_CLIENT_SECRET production  # kept server-side only
vercel env add GOOGLE_OAUTH_REDIRECT_URI production   # https://customcard-three.vercel.app/oauth/callback
vercel env add GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY production
vercel env add GOOGLE_OAUTH_STATE_SECRET production
```

The calendar connection flow is env-gated. When `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` are present, `/api/calendar/connections/start` returns a server-generated Google consent URL. The `/oauth/callback` route exchanges the code server-side, stores only an encrypted refresh token when Google returns one, imports metadata-only events from `calendar.events.readonly`, and redirects back with a connection status. Do not expose the client secret or token encryption key through any `VITE_` variable.

For Outlook: register at [portal.azure.com](https://portal.azure.com/) → App registrations → add `Calendars.Read` delegated permission → set `VITE_MICROSOFT_CLIENT_ID` and `MICROSOFT_TENANT_ID`.

---

### Event platform integrations (credential-gated, no live import yet)

Eventbrite, Luma, and Meetup are credential-gated Provider Adapters in
`providerCatalog.ts`; Partiful remains manual/contract-only until an official
API exists. Credentials can be added at any time, but the provider runtime still
produces no-network request contracts until a future live import gate is opened.

#### Eventbrite

- Register app: https://www.eventbrite.com/account-settings/apps
- Auth: OAuth 2.0 · scope `event:read`
- Endpoint: `GET https://www.eventbriteapi.com/v3/users/me/events/`
- Rate limit: 1,000 req/hour per token

```bash
vercel env add EVENTBRITE_CLIENT_ID preview
vercel env add EVENTBRITE_CLIENT_SECRET preview
```

#### Luma (lu.ma)

- Requires Luma Plus subscription on the connected calendar
- Get API key: Luma Settings → Developer → API Keys
- Endpoint: `GET https://public-api.luma.com/v1/calendar/list-events`
- Rate limit: 200 req/min per calendar key

```bash
vercel env add LUMA_API_KEY preview
```

#### Meetup

- Requires Meetup Pro to register an OAuth consumer
- Register at: https://secure.meetup.com/meetup_api/oauth_consumers/
- Endpoint: GraphQL `POST https://api.meetup.com/gql` · query `self { upcomingEvents }`
- Rate limit: 500 points/60s

```bash
vercel env add MEETUP_CLIENT_ID preview
vercel env add MEETUP_CLIENT_SECRET preview
```

#### Partiful

No official API as of 2026. Adapter is `contract-only` / `status: manual`. Deferred until Partiful launches a developer program. Customer can paste event link or ICS in the meantime.

---

### Gate: Live model chat (`liveModelCallsEnabled`)

Requires: prompt audit, spend limits, PII redaction pipeline in production.

The `liveChatContract.ts` defines the allowed providers and models. Set the API key:

```bash
vercel env add ANTHROPIC_API_KEY production   # server-side only
```

Then update `CustomerChatSession` in `customerChat.ts` to accept `liveModelCallsEnabled: true` once the prompt audit and brand safety review are complete (see `aiProviderReadinessData.mjs` checklist items `prompt-brand-safety-review` and `evaluation-fixtures`).

---

### Gate: Live price quotes (`liveQuoteEnabled`)

Requires: vendor API access or certified browser session contract.

See `retailQuoteContract.ts` → `retailQuoteEnablementChecklists` for per-vendor required evidence. No env var shortcut — this gate requires vendor accounts and legal review before any code change.

#### Walgreens Native Photo Prints API

API credentials are available. Sandbox is ready to test against.

```bash
# Vercel — set for Preview first, then Production once certified
vercel env add WALGREENS_API_KEY preview
vercel env add WALGREENS_AFF_ID preview
vercel env add WALGREENS_VENDOR_MODE preview
vercel env add PUBLIC_APP_ORIGIN preview
# Optional: revenue share
vercel env add WALGREENS_PUBLISHER_ID preview
```

Local (Vite or Docker):
```
# in .env.local or infra/env/.env  (both gitignored)
WALGREENS_VENDOR_MODE=sandbox
WALGREENS_API_KEY=<your-key>
WALGREENS_AFF_ID=<your-aff-id>
PUBLIC_APP_ORIGIN=http://127.0.0.1:5173
```

`WALGREENS_AFF_ID` is separate from the API key and is required by Walgreens
when fetching upload credentials. Keep real API keys and AffiliateIDs only in
`.env.local`, `infra/env/.env`, or Vercel environment variables; never commit
them to `.env.example`.

For PhotoPrints approval emails, Walgreens may list the AffiliateID as
`photoapi`. If `/api/photo/creds/v3` returns Walgreens error `659`, the key is
present but Walgreens has not matched that API key/AffiliateID pair to a
PhotoPrints vendor configuration yet; ask Walgreens Developer Support to confirm
PhotoPrints vendor setup for the app.

Sandbox base URL: `https://services-qa.walgreens.com/api/photo`  
Production base URL: `https://services.walgreens.com/api/photo`

Endpoints used by the adapter:
| Endpoint | Path | Rate limit |
|---|---|---|
| Fetch upload credentials | `/creds/v3` | 300/min |
| Product details + pricing | `/products/v3` | 300/min |
| Validate coupon | `/order/coupon/v3` | 100/min |
| Store search | `/store/v3` | 300/min |
| Order submit | `/order/submit/v3` | 300/min |
| Order status | `/order/status/v3` | 300/min |

Image upload goes directly to Azure Blob Storage via a SAS token returned by `/creds/v3` — not through the Walgreens API server.

Flip `WALGREENS_VENDOR_MODE=sandbox` to enable sandbox calls. Keep `REAL_ORDER_KILL_SWITCH=disabled` until Walgreens approves your production launch.

---

### Gate: Real orders (`realOrdersEnabled` / `directOrderEnabled`)

Highest risk gate. See `orderPlacementContract.ts` → `orderEnablementChecklists`.

Required before any code change:
- Vendor API sandbox credentials
- Real-order kill-switch infrastructure (ability to halt orders within 1 second)
- Customer approval record design reviewed
- Legal review of vendor terms
- Physical print certification

---

## 5. Doctor scripts

The repo ships a suite of domain doctors. Run them to check readiness:

```bash
node scripts/demo-reset.mjs                    # reset demo workspace
node scripts/ai-provider-readiness-doctor.mjs  # AI provider gates
node scripts/hosted-api-readiness-doctor.mjs   # API server readiness
node scripts/deployment-readiness.mjs          # deployment gates
node scripts/artifact-store-doctor.mjs         # print artifact storage
node scripts/e2e-coverage-doctor.mjs           # end-to-end coverage gaps
```

Run all with a live database:

```bash
DATABASE_URL="postgres://..." node scripts/hosted-api-readiness-doctor.mjs
```

---

## 6. Environment variable reference

| Variable | Where set | Required | Purpose |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel / `.env.local` | Yes | Clerk React publishable key |
| `VITE_CARD_GEN_URL` | Vercel / `.env.local` | No | AI sidecar URL — enables Generate with AI button |
| `DATABASE_URL` | Vercel / shell | For API | Postgres connection string |
| `CUSTOMCARD_API_RUNTIME` | Vercel / shell | For API | `postgres` in production; `contract`/`memory` only for local reviewer checks |
| `CUSTOMCARD_AI_ALLOW_REQUEST_CONFIG` | Server env only | No | Defaults to `false`; set `true` only for trusted admin/operator flows that may override server AI provider config |
| `CUSTOMCARD_TRUST_PROXY_HEADERS` | Server env only | No | Defaults to `false`; set `true` only behind a trusted proxy before using `X-Forwarded-For` for rate limits |
| `CLOUDFLARE_ACCOUNT_ID` | Server env only | For live AI route | Cloudflare account for Workers AI text/image routes |
| `CLOUDFLARE_API_TOKEN` | Server env only | For live AI route | Shared Workers AI API token if lane-specific tokens are unset |
| `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN` | Server env only | No | Optional text-lane Workers AI token |
| `CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN` | Server env only | No | Optional image-lane Workers AI token |
| `CLOUDFLARE_WORKERS_AI_TEXT_MODEL` | Server env only | No | Defaults to `@cf/meta/llama-3.1-8b-instruct-fast` |
| `CLOUDFLARE_WORKERS_AI_IMAGE_MODEL` | Server env only | No | Defaults to `@cf/bytedance/stable-diffusion-xl-lightning` |
| `CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED` | Server env only | No | Enables server-owned live card-copy calls when provider env and gates are ready |
| `CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED` | Server env only | No | Enables server-owned live panel image calls when provider env and gates are ready |
| `ANTHROPIC_API_KEY` | Sidecar server only | For AI gen | Text generation model — never in browser |
| `CARD_GEN_API_TOKEN` | Sidecar server only | For AI gen | Bearer token required by `/generate` outside local dev |
| `CARD_GEN_ALLOWED_ORIGINS` | Sidecar server only | For AI gen | Comma-separated CORS origins |
| `CARD_GEN_ALLOW_UNAUTHENTICATED_LOCAL` | Local sidecar only | No | `true` enables unauthenticated `/generate` only from localhost |
| `OPENAI_API_KEY` | Sidecar server only | For image gen | Image generation — never in browser |
| `CARD_IMAGE_ENABLED` | Sidecar server only | No | `true` to enable image generation |
| `CARD_TEXT_MODEL` | Sidecar server only | No | Defaults to `claude-sonnet-4-6` |
| `CARD_IMAGE_MODEL` | Sidecar server only | No | Defaults to `dall-e-3` |
| `GOOGLE_OAUTH_CLIENT_ID` | Vercel / ignored env files | For OAuth | Google OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Vercel / ignored env files | For OAuth | Google OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Vercel / ignored env files | For Google Calendar OAuth | Authorized redirect URI, for example `https://customcard-three.vercel.app/oauth/callback` |
| `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY` | Vercel / ignored env files | For Google Calendar OAuth | Random server-side key for refresh-token encryption |
| `GOOGLE_OAUTH_STATE_SECRET` | Vercel / ignored env files | For Google Calendar OAuth | Random server-side key for signed OAuth state |
| `GOOGLE_CALENDAR_IMPORT_MAX_RESULTS` | Vercel / ignored env files | No | Max events imported on callback, defaults to `10` |
| `EVENTBRITE_CLIENT_ID` / `EVENTBRITE_CLIENT_SECRET` | Vercel / ignored env files | For event import contract | Eventbrite OAuth app credentials; live import remains gated |
| `LUMA_API_KEY` | Vercel / ignored env files | For event import contract | Luma calendar API key; live import remains gated |
| `MEETUP_CLIENT_ID` / `MEETUP_CLIENT_SECRET` | Vercel / ignored env files | For event import contract | Meetup OAuth app credentials; live import remains gated |
| `VITE_MICROSOFT_CLIENT_ID` | Vercel / `.env.local` | For Outlook OAuth | Microsoft Entra client ID |
| `MICROSOFT_TENANT_ID` | Vercel (server only) | For Outlook OAuth | Microsoft tenant ID |

`.env.local` template is in `.env.example`.

---

## 7. Tech stack quick reference

| Layer | Technology | Docs |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | [vitejs.dev](https://vitejs.dev/) |
| Styling | Plain CSS (`src/styles.css`) | — |
| Icons | [Lucide React](https://lucide.dev/) | lucide.dev |
| Tests | [Vitest](https://vitest.dev/) | vitest.dev |
| API server | Node.js + Postgres (`scripts/api-server.mjs`) | — |
| AI sidecar | FastAPI + PydanticAI (`card_gen/`) | [ai.pydantic.dev](https://ai.pydantic.dev/) |
| Mobile shell | Expo (`apps/mobile/`) | [expo.dev](https://expo.dev/) |
| Hosting | Vercel | [vercel.com/docs](https://vercel.com/docs) |
| Database | Postgres 15 (Neon recommended) | [neon.tech/docs](https://neon.tech/docs) |
| Object store | S3-compatible / Cloudflare R2 (`scripts/object-store-runtime.mjs`) | [Cloudflare R2](https://developers.cloudflare.com/r2/) |
| R2 bucket admin | Wrangler CLI (`npm run r2:bucket:*`) | [Wrangler R2 commands](https://developers.cloudflare.com/r2/reference/wrangler-commands/) |

---

## 8. What's complete vs. gated

| Feature | Status | Gate |
|---|---|---|
| Card studio (templates) | ✅ Local, no keys | — |
| Memory (add/remove) | ✅ Local, no keys | — |
| Print export (SVG + PDF) | ✅ Local, no keys | — |
| Render artifact persistence | 🔑 Needs `OBJECT_STORE_*` + `CUSTOMCARD_API_RUNTIME=memory` or `postgres` | `CUSTOMCARD_ARTIFACT_PERSISTENCE` |
| Fulfillment estimates | ✅ Public prices, local | — |
| Manual vendor handoff | ✅ Link + checklist | — |
| AI card generation | 🔑 Needs `VITE_CARD_GEN_URL` + sidecar | `liveProviderCallsEnabled` |
| AI image generation | 🔑 Needs `OPENAI_API_KEY` on sidecar | `liveProviderCallsEnabled` |
| Google Calendar/Gmail OAuth | 🔑 Needs Google Cloud app | `liveOAuthEnabled` |
| Outlook OAuth | 🔑 Needs Azure app | `liveOAuthEnabled` |
| Live model chat | 🔑 Needs prompt audit + API key | `liveModelCallsEnabled` |
| Live price quotes | 🔑 Needs vendor API access | `liveQuoteEnabled` |
| Real order placement | 🔒 Needs vendor cert + kill-switch | `realOrdersEnabled` |
| Walgreens sandbox calls | 🔑 `WALGREENS_VENDOR_MODE=sandbox` + API key | `WALGREENS_VENDOR_MODE` |
