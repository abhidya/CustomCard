# Assumptions

Decisions made while building the mobile app where the brief left a choice
open. Each is the safest reasonable default for the existing backend.

## Backend / API

- **No OpenAPI document exists.** The API surface was derived from the route
  contracts in `src/apiRouteContractsData.mjs` (repo root) and confirmed against
  live responses from the in-memory API runtime (`scripts/api-server.mjs`).
  Typed request/response models live in `src/lib/api/types.ts`. Fields the app
  does not consume are intentionally omitted; payloads are treated as open
  records so extra backend fields never break the client.
- **Auth is session-token based via Clerk.** The API accepts
  `Authorization: Bearer <token>`. In production the token is a Clerk session
  JWT (the backend verifies it offline against `CLERK_JWT_KEY` and bridges it to
  a durable `auth_sessions` row). The app therefore uses Clerk's hosted identity
  (`@clerk/clerk-expo`) and sends the Clerk session token as the bearer.
- **Sign-in method:** email one-time-code (`email_code`) via Clerk, with
  automatic fall-through to sign-up when the email is unknown — one form covers
  both. No password is collected on device. OAuth/OIDC social providers can be
  added through the Clerk dashboard without app changes; when used, Clerk
  performs Authorization Code + PKCE.
- **Local development sign-in:** when no Clerk publishable key is configured and
  the build is a development build in the `development` environment, the app
  accepts the local API's `CUSTOMCARD_CUSTOMER_SESSION_TOKEN` directly. This
  path is compiled out of release builds by the `devSessionSignInAllowed` guard.

## Workflow mapping

- **Mobile bootstrap** (`GET /api/mobile/bootstrap`) drives Home, print proof
  checks, pricing previews, fulfillment recommendations, locale options, and the
  safety banner.
- **Events**: `GET /api/customer/connections` lists imported opportunities and
  provider connections; `POST /api/import-preview` ingests pasted invite/ICS
  text (metadata only) or typed event details.
- **Calendar connect**: `POST /api/calendar/connections/start` is treated as
  server-owned. The app only opens the returned Google consent URL (if the
  deployment configured OAuth) in a secure browser session; it never holds
  provider credentials. The valid choice id is `google-calendar-events`; Apple
  is manual ICS export.
- **Card studio**: `POST /api/ai/card/generate` drafts copy/artwork;
  `GET/POST /api/customer/draft-state` resumes and autosaves the draft so the
  client stays stateless. The studio assumes the deterministic
  `browser-svg-renderer` fallback is active (live AI stays server-gated).
- **Memories**: `POST /api/memories/review` with `decision: approve | forget`.
- **Print**: `POST /api/card-projects` → `POST /api/render-packets` →
  `POST /api/vendor-handoff/manual`. The retail price-check operation id is
  `fetch-price`; live quotes/orders remain disabled server-side.
- **Checkout**: Walgreens hosted checkout
  (`/api/walgreens/checkout/status|upload|session`). The app only checks
  readiness, sends contact details once to pre-fill the hosted page, and opens
  it in the browser. Payment/ordering happen on Walgreens' site.
- **Privacy**: `POST /api/data-requests` for export/delete with explicit
  consent and region.

## Product / UX

- **Proof-first ordering.** Print options, manual handoff, and checkout are
  locked until the customer approves the rendered proof, matching the backend
  `proofBoundary` contract and the "confirm before checkout" safety banner.
- **No automatic orders.** Mirroring `REAL_ORDER_KILL_SWITCH=disabled`, the app
  never finalizes a purchase; it hands off to the print shop.
- **Card languages** offered: English (US), Spanish (US), Urdu, Arabic — the
  same set the API/web contract exposes. RTL copy review remains gated; the app
  surfaces the language choice and review-required flag but does not claim
  production-ready RTL typesetting.
- **Estimated bundle id / package**: `com.customcard.app` (pre-existing in
  `app.config.js`). Replace with the real store identifiers before submission if
  different.

## Tooling

- **Expo SDK 55 / React Native 0.84 / React 19.2.** React packages
  (`react`, `react-dom`, `react-test-renderer`) are pinned to `19.2.3` to match
  the renderer bundled with React Native 0.84.1; a mismatch otherwise breaks the
  test renderer. See `package.json` `overrides`.
- **App icon and splash are generated placeholders** (solid brand color with a
  centered mark) produced by `scripts/generate-placeholder-assets.mjs`. They are
  valid PNGs so builds succeed, but must be replaced with real brand artwork
  before store submission.
- **Device E2E automation is unavailable in this environment.** The "main user
  workflow" is covered by an API-client-level end-to-end test
  (`src/lib/api/__tests__/workflow.test.ts`) plus component/navigation tests. A
  manual on-device smoke test is documented in `STORE_RELEASE_CHECKLIST.md`.
