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
- **Auth is Clerk JWT based.** The API accepts
  `Authorization: Bearer <token>`. In production the token is a Clerk session
  JWT that the backend verifies offline against `CLERK_JWT_KEY`,
  `CLERK_AUTHORIZED_PARTIES`, `CLERK_ISSUER`, and `CLERK_AUDIENCE`. The app
  uses Clerk's hosted identity (`@clerk/clerk-expo`) and sends the verified
  Clerk JWT as the bearer.
- **Configured QA Clerk instance:** `model-bluejay-21`. The publishable key
  (`pk_test_…`, public) is wired via `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` so the
  app performs real Clerk sign-in. The native OAuth callback is
  `customcard://sso-callback` and must be allowlisted in Clerk. The instance's
  JWKS PEM and issuer are backend deployment config; the Clerk secret key is
  never used by or stored in the mobile app.
- **Sign-in method:** Google and Apple OAuth use Clerk's SSO flow with
  Authorization Code + PKCE. Email one-time-code (`email_code`) remains as the
  fallback account path, with automatic fall-through to sign-up when the email
  is unknown — one form covers both. No password is collected on device.
- **No local token sign-in:** mobile builds require a Clerk publishable key and
  use Clerk OAuth/email-code auth in QA and production. Local memory-runtime
  bearer tokens remain backend test fixtures only; they are not accepted through
  the app UI.

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

- **Expo SDK 55 / React Native 0.83.6 / React 19.2.0.** React packages
  (`react`, `react-dom`, `react-test-renderer`) are pinned to `19.2.0` to match
  Expo Go's native runtime; a mismatch otherwise breaks simulator launch. See
  `package.json` `overrides`.
- **App icon and splash are deterministic brand assets** (solid brand field with
  a centered card-and-heart mark) produced by `scripts/generate-brand-assets.mjs`.
  They are valid no-alpha PNGs sized for iOS, Android adaptive icon, and splash
  usage.
- **Device E2E automation is unavailable in this environment.** The "main user
  workflow" is covered two ways: a fully mocked client test
  (`src/lib/api/__tests__/workflow.test.ts`) and a real, un-mocked **live API
  contract test** (`src/lib/api/__tests__/liveApi.test.ts`) that runs the typed
  client against a running backend (executed in CI against the in-memory
  runtime), plus component/navigation tests. A manual on-device smoke test is
  documented in `STORE_RELEASE_CHECKLIST.md`.
