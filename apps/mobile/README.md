# CustomCard Mobile

Native iOS/Android customer app for CustomCard, built with Expo (React Native)
and TypeScript. It talks to the shared CustomCard API (the same routes the web
app uses) and walks a customer through the full card workflow: import an event →
draft a card → review approved memories → approve the print proof → compare
print options → finish at a print shop. The app never places an order itself —
every purchase is confirmed by the customer on the print shop's own site.

> Stack decision: Expo React Native + TypeScript + React Navigation + TanStack
> Query, with Clerk for hosted authentication and Expo SecureStore for token
> storage. This is the default stack from the brief; no backend/product
> constraint required deviating from it. See `ASSUMPTIONS.md`.

## Requirements

- Node 20+ and npm
- For device/simulator runs: the Expo tooling (installed as a dev dependency)
  plus Xcode (iOS) and/or Android Studio (Android)
- A running QA or production CustomCard API over HTTPS

## Setup

```sh
cd apps/mobile
npm install
cp .env.example .env        # then edit values (see below)
npm run assets:brand        # regenerate branded icon/splash PNGs
```

### Environment variables

All mobile config is **non-secret public config** only. Secrets (Clerk secret
key, provider credentials, database URLs) belong to the API deployment and must
never be added here. Values are read at build time through `app.config.js` and
surfaced to the app via `expo-constants`.

| Variable                            | Required          | Purpose                                                            |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------ |
| `CUSTOMCARD_APP_ENV`                | yes               | `qa` \| `production` (`staging`/`preview` aliases normalize to `qa`). |
| `CUSTOMCARD_QA_API_BASE_URL`        | QA builds         | HTTPS API base URL for QA.                                         |
| `CUSTOMCARD_PRODUCTION_API_BASE_URL` | prod builds       | HTTPS API base URL for production.                                 |
| `CUSTOMCARD_API_BASE_URL`           | optional override | Explicit HTTPS API URL; must match the selected env-specific URL if both are set. |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes               | Clerk **publishable** key (`pk_test_` for QA, `pk_live_` for prod). |
| `CUSTOMCARD_OAUTH_REDIRECT_URL`     | yes               | Native Clerk SSO callback. Must be `customcard://sso-callback`.     |
| `REAL_ORDER_KILL_SWITCH`            | no                | Mirrors the backend safety gate; keep `disabled`.                  |
| `EAS_PROJECT_ID`                    | for EAS builds    | Set by `eas init`, or via EAS environment variables.               |

The mobile app uses Clerk for Google/Apple OAuth and email-code auth. It does
not expose a local session-token sign-in path. Production builds require a
`pk_live_` Clerk publishable key and a Clerk Redirect URL allowlist entry for
`customcard://sso-callback`.

#### Configured Clerk instance

This project's QA Clerk instance is `model-bluejay-21`. The **publishable key**
(public by design) enables real Clerk sign-in in QA builds:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bW9kZWwtYmx1ZWpheS0yMS5jbGVyay5hY2NvdW50cy5kZXYk
CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback
```

The matching **backend** values are deployment config for the CustomCard API
(not the mobile app): `CLERK_ISSUER=https://model-bluejay-21.clerk.accounts.dev`
and `CLERK_JWT_KEY` set to the instance's JWKS public PEM (public verification
material). The Clerk **secret key** (`sk_...`) is a true secret — it is never
needed by this mobile app, must never be committed, and belongs only in the
API's server-side environment. Production uses its own separate Clerk instance
and keys.

## Run

Point the app at a QA or production HTTPS API, then launch it:

```sh
cd apps/mobile
CUSTOMCARD_APP_ENV=qa \
CUSTOMCARD_QA_API_BASE_URL=https://api.qa.customcard.test \
CUSTOMCARD_PRODUCTION_API_BASE_URL=https://api.customcard.test \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback \
REAL_ORDER_KILL_SWITCH=disabled npm run start
# or: npm run ios   /   npm run android
```

For Codex/local simulator review, prefer the review scripts:

```sh
CUSTOMCARD_APP_ENV=qa \
CUSTOMCARD_QA_API_BASE_URL=https://api.qa.customcard.test \
CUSTOMCARD_PRODUCTION_API_BASE_URL=https://api.customcard.test \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback \
REAL_ORDER_KILL_SWITCH=disabled npm run ios:review
```

The review scripts run Expo with `EXPO_UNSTABLE_HEADLESS=1` on localhost. Expo
uses that mode to keep the standalone React Native DevTools shell from
auto-installing/opening; the app UI, Metro bundle, and simulator runtime are
unchanged.

In Expo Go or a simulator, sign in with Clerk Google/Apple OAuth or an email
code. Local memory-runtime session tokens are only for backend contract tests,
not for app sign-in.

> Note: a desktop browser pointed at the Expo dev server shows a JSON manifest —
> that is Expo metadata, not the app UI. Use Expo Go or a simulator.

## Verify

```sh
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm run format:check   # prettier --check
npm run test           # jest (unit + component + navigation + workflow)
npm run doctor         # repo-local config + customer-contract checks
npm run release:doctor # native build-profile / release-readiness checks
npm run verify         # typecheck + lint + format:check + test in one shot
```

### Live API contract test

A real, un-mocked test runs the typed client against a running CustomCard API to
prove the request/response models match the server. It is skipped unless
`CUSTOMCARD_LIVE_API_URL` is set:

```sh
# terminal 1 (repo root): start a test API with backend-only bearer fixtures
CUSTOMCARD_API_RUNTIME=memory AUTH_SESSION_SECRET=test-auth-session-secret-32-chars \
CUSTOMCARD_CUSTOMER_SESSION_TOKEN=<backend-test-token> \
CUSTOMCARD_ADMIN_SESSION_TOKEN=<backend-admin-token> PORT=8787 node scripts/api-server.mjs

# terminal 2 (apps/mobile): run it against the live server
CUSTOMCARD_LIVE_API_URL=http://127.0.0.1:8787 \
CUSTOMCARD_LIVE_API_TOKEN=<backend-test-token> npx jest liveApi
```

### Repo-root checks

The repo root additionally validates the mobile boundary:

```sh
# from repo root
npx vitest run tests/mobile-contract.test.ts src/mobileRenderReadiness.test.ts
npm run mobile:render:doctor
npm run mobile:release:doctor
npm run localization:doctor
```

### Continuous integration

`.github/workflows/mobile.yml` runs typecheck, lint, format check, the Jest
suite, the config/release doctors, `expo config` resolution, and the live API
contract test (against the in-memory runtime) on every change under
`apps/mobile/`.

## Build & submit (EAS)

`eas.json` defines `development`, `qa`, `preview`, and `production` profiles.
The development and preview profiles both target the QA app environment. Set
`CUSTOMCARD_QA_API_BASE_URL` and `CUSTOMCARD_PRODUCTION_API_BASE_URL` in EAS or
CI; the build selects from `CUSTOMCARD_APP_ENV` and fails if a generic
`CUSTOMCARD_API_BASE_URL` override conflicts. Build and submit require an Expo
account, EAS CLI, and platform signing credentials configured outside this repo.

```sh
npm install -g eas-cli
eas login
eas init                     # sets the EAS project id
# Provide non-secret config and platform secrets via EAS environment variables.
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

For installable **APK** builds (EAS cloud or local Gradle) and the iOS
equivalent, see `BUILD_ANDROID.md`. Quick start:

```sh
npm run build:android:apk          # EAS: release-style standalone .apk
npm run build:android:apk:preview  # EAS: internal-distribution .apk
npm run build:android:apk:gradle   # local: prebuild + ./gradlew assembleRelease (needs Android SDK)
```

See `STORE_RELEASE_CHECKLIST.md` for the full Apple/Google checklist, privacy
labels, and required assets.

## Architecture

```
apps/mobile/
├─ App.tsx                      # Expo root, re-exports src/App
├─ app.config.js                # build-time public config (no secrets)
├─ eas.json                     # EAS build/submit profiles
├─ assets/                      # branded icon/splash PNGs
└─ src/
   ├─ App.tsx                   # providers + RootNavigator; offline workflow guide
   ├─ config/env.ts             # config resolution + HTTPS/secret guards
   ├─ theme/                    # design tokens (color, spacing, type)
   ├─ components/               # Screen scaffold + shared UI (buttons, fields, states)
   ├─ forms/validation.ts       # dependency-free form validators
   ├─ navigation/               # product-first stack + bottom tabs
   ├─ lib/
   │  ├─ api/                   # typed client, endpoints, errors, redaction
   │  ├─ auth/                  # Clerk + SecureStore token cache + session provider
   │  ├─ offline/               # network status hook
   │  └─ query/                 # TanStack Query client
   ├─ screens/                  # auth, home, create, events, memories, print, settings
   └─ customerExperience.ts     # deterministic customer snapshot (shared contract)
```

- **Auth/session**: `AuthProvider` wraps Clerk for every build. Tokens live only
  in `expo-secure-store` (Keychain/Keystore). A 401 from the API clears cached
  data and signs the user out.
- **API client**: `createHttpClient` injects the bearer token, adds an
  `X-Idempotency-Key` to every mutation, applies a request timeout, classifies
  errors, and redacts sensitive data from logs/error messages. `endpoints.ts`
  is the typed facade over every customer route.
- **Navigation model**: signed-out users can browse the product shell and start
  a card. Sign-in is required only when the app needs an account-backed action
  such as AI drafting, saving cards, reviewing people, privacy requests, or
  checkout.
- **Proof-first print**: print options and checkout stay locked until the
  customer approves the rendered proof.
- **Honest gating**: capabilities like live AI, retail orders, and hosted
  checkout are gated by the **backend** (credentials + kill switch); the app
  renders real server state rather than faking it. See `GATING.md` for the
  per-feature trace and how to flip each.
- **Resilience**: a top-level `ErrorBoundary` catches render errors and shows a
  recovery screen (error detail redacted, never displayed). Misconfiguration
  (missing/invalid API URL) fails closed with a clear message.

## Reviewer browser lane

The repo's web app can render the mobile customer workflow as HTML for quick
desktop inspection without a simulator (from repo root):

```sh
npm run mobile:web:preview   # opens /?view=mobile
```

This uses the same `apps/mobile/src/customerExperience.ts` contract as the Expo
shell. The deterministic snapshot also renders in-app as the offline "How it
works" guide (Settings → How CustomCard works).
