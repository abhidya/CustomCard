# Security

Security posture for the CustomCard mobile app, aligned with OWASP MASVS basics.

## Token & session storage

- Authentication tokens are stored **only** in OS-backed secure storage
  (`expo-secure-store`, i.e. iOS Keychain / Android Keystore) via
  `src/lib/auth/secureTokenCache.ts`, used as Clerk's `tokenCache`.
- Tokens are **never** written to AsyncStorage, Redux/MMKV persistence, plain
  files, logs, URLs, deep links, analytics, or crash reports.
- Secure-storage failures fail closed: a read error returns "no token"
  (treated as signed out) rather than falling back to insecure storage.
- **Logout** (`SettingsScreen`) clears the TanStack Query cache (all cached
  customer data) and then ends the session, so no user data survives in memory.
- **Session expiry**: any `401` from the API triggers `onUnauthorized`, which
  clears the cache and signs the user out. Clerk session tokens carry their own
  expiry; the backend rejects expired tokens.

## Authentication

- Production auth uses **Clerk** hosted identity. Google/Apple OAuth use Clerk
  SSO with **Authorization Code + PKCE** and the native callback
  `customcard://sso-callback`; email one-time-code remains available as the
  account fallback. No password is handled on device.
- The app holds only the Clerk **publishable** key (public by design). The Clerk
  secret key and JWKS verification material live server-side only.
- The app has no local bearer-token sign-in path; customer session tokens used
  by backend tests are not accepted through the mobile UI.
- No custom cryptography is implemented anywhere in the app.

## Network security

- **HTTPS only.** `src/config/env.ts` rejects every non-`https://` API base URL.
  Mobile builds are configured for QA or production API deployments, not local
  cleartext API traffic.
- Android cleartext traffic is disabled (`android.usesCleartextTraffic: false`
  in `app.config.js`); iOS ATS is left at its secure default.
- Every request carries a 20s timeout (`AbortController`) and the API base URL
  is normalized (trailing slashes stripped) to avoid ambiguous endpoints.
- All mutating requests include a unique `X-Idempotency-Key` so retries (e.g.
  after a network blip) cannot double-apply.

## Logging & error redaction

- `src/lib/api/redact.ts` redacts bearer tokens, JWT-shaped strings, and any
  field whose key matches `token|secret|password|authorization|cookie|session|`
  `credential|api[-_]?key|email|phone|imageBase64` before anything is logged.
- `ApiError` messages are passed through redaction, so error text shown in the
  UI or captured by any reporter never contains a token or raw payload.
- `devLog` is a no-op in release builds (`__DEV__` guard); production builds emit
  no payload logging.
- The top-level `ErrorBoundary` logs caught errors only through the redacting
  `devLog` and never renders the raw error message to the user, so a thrown
  error carrying sensitive text cannot leak to the screen or to logs.

## Platform permissions

- The app requests **no** runtime permissions. The Android `permissions` array
  is empty (only the implicit `INTERNET` permission is used). No camera,
  location, contacts, photos, notifications, or calendar permissions are
  requested. Calendar data is imported by pasting invite/ICS text or via the
  server-owned Google OAuth flow opened in the system browser — never via native
  calendar access.

## Minimal data collection

- The app collects only what a card workflow needs: account email (via Clerk),
  event metadata the user pastes/types, memory notes the user explicitly
  approves, and card draft content. It does not collect device identifiers,
  location, contacts, or advertising data, and does not embed third-party
  analytics or ad SDKs.
- Raw calendar/invite content is parsed and discarded by the backend, never
  stored. Payment details are entered on the print shop's hosted page, never in
  the app.

## Privacy data handling (for store labels)

| Data | Collected | Stored on device | Purpose | Shared |
| --- | --- | --- | --- | --- |
| Email address | Yes (via Clerk) | Token only, in Keychain/Keystore | Authentication | Clerk (auth processor) |
| Event metadata (title, recipient, date) | Yes | No (server-side) | Create card opportunities | No |
| Approved memory notes | Yes | No (server-side) | Personalize cards | No |
| Card drafts / projects / print files | Yes | No (server-side) | Produce the card | Print shop only on explicit handoff |
| Contact info for checkout (name/email/phone) | Transient | No | Pre-fill Walgreens hosted checkout | Walgreens (only when the user proceeds) |
| Device identifiers / location / contacts | No | — | — | — |

See `STORE_RELEASE_CHECKLIST.md` for the exact Apple App Privacy and Google Play
Data safety entries derived from this table.

## MASVS quick checklist

- [x] **Storage**: secrets only in Keychain/Keystore; nothing sensitive in
      logs, files, or insecure stores.
- [x] **Crypto**: no custom crypto; relies on platform TLS and Clerk.
- [x] **Auth/session**: hosted identity, PKCE for OAuth, server-verified token
      expiry, secure logout, 401-driven sign-out.
- [x] **Network**: HTTPS-enforced, cleartext disabled, request timeouts,
      idempotent mutations.
- [x] **Platform**: no unnecessary permissions; deep links carry only the Clerk
      OAuth callback response and never app-issued bearer tokens.
- [x] **Privacy**: minimal collection; redaction of sensitive data; documented
      data inventory.
- [ ] **Pinning**: TLS certificate pinning is not implemented (relies on
      platform trust store). Add if the threat model requires it.

## Reporting

Report suspected vulnerabilities to the CustomCard maintainers; do not file
sensitive details in public issues.
