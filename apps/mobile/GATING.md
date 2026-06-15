# Feature gating: what's live vs. server-gated

The app is **not** a mockup — every screen calls the real CustomCard API and
renders whatever the server returns. Several capabilities look "demo-like"
because the **backend** intentionally gates them behind credentials and a
safety kill switch, and the app honestly reflects that server state instead of
faking success. This doc traces each gated capability to its backend gate and
what flips it on.

The app never decides these gates itself; it reads them from API responses
(`realOrdersEnabled`, route `status`, `ai_flow.*.live_provider_calls_enabled`,
`enabled`, `blockers`).

| Capability | App behaviour today | Backend gate / runtime | What turns it on |
| --- | --- | --- | --- |
| **Sign-in** | ✅ Live. Real Clerk Google/Apple OAuth plus email-code auth. | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CUSTOMCARD_OAUTH_REDIRECT_URL` (app) and `CLERK_JWT_KEY`/`CLERK_ISSUER` (API). | Configure Clerk providers and allowlist `customcard://sso-callback` for the QA/prod instance. |
| **Import / events / memories / drafts / projects / render packets** | ✅ Live against the API (durable in Postgres runtime; in-memory locally). | Always on; `customer-session` auth. | Already live. |
| **AI card copy & artwork** | Deterministic fallback (`browser-svg-renderer` / `deterministic-customer-chat`). Real copy structure, no paid model call. | Server `aiFlowConfig` live gate: `CUSTOMCARD_AI_CARD_COPY_LIVE_ENABLED`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKERS_AI_*` tokens, plus rate-limit + budget + fallback gates. Response field `ai_flow.card_copy.live_provider_calls_enabled`. | Set the Cloudflare Workers AI creds + enable flags in the API env; the gate flips and the same screen shows live output. |
| **Live retail price quotes** | Estimate-only; `retail-printers/operations/start` returns `status: "blocked"`, `liveQuoteEnabled: false`. | `REAL_ORDER_KILL_SWITCH` + provider certification gates server-side. | Provider cert + flip the kill switch (release owner). |
| **Automatic retail orders** | Off. App hands off manually; no order is placed. | `REAL_ORDER_KILL_SWITCH=disabled` (mirrored in app config + EAS profiles). `realOrdersEnabled: false` on every route. | Release owner enables the kill switch after certification. |
| **Walgreens hosted checkout** | `walgreens/checkout/status` → `enabled: false` until configured; app shows "not available, finish manually". | `WALGREENS_VENDOR_MODE=production` + `WALGREENS_API_KEY` + `WALGREENS_AFF_ID` (API env). | Set those in the API deployment; status flips to `enabled` and the checkout form appears. |
| **Google Calendar connect** | `calendar/connections/start` → `status: "blocked"`, `credential-gated`; app opens the consent URL only if the server returns one. | `GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI/STATE_SECRET/TOKEN_ENCRYPTION_KEY` (API env). | Set Google OAuth creds in the API; the start packet returns a live consent URL. |
| **Featured cards** | ✅ Live public route. | none. | Already live. |

## How to see it switch on locally

Point the app at an API deployment that has the relevant env set (see the repo
root `.env.example` and `SETUP.md`). Nothing in the app changes — the gated
sections simply start returning `enabled: true` / live output, because the app
renders server state.

## Why it's built this way

The kill switch and credential gates are deliberate safety boundaries from the
backend so the app can ship and be reviewed without risking real charges, real
orders, or paid AI spend. The mobile client's job is to surface that state
truthfully (including disabled/locked states and "confirm on the print shop's
site" notices), which it does — see `SECURITY.md` and the proof-first flow in
`PrintScreen`.
