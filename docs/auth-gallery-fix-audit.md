# Auth + Gallery Fix Audit (Phase 0)

Audited at HEAD `fadce0c` ("Include readiness summary data in readiness checks").

## 1. Current Clerk frontend auth flow

- `webapp/App.tsx` uses `useAuth()` / `useUser()` from `@clerk/react`. `getCustomerApiToken` (App.tsx ~149) simply calls Clerk `getToken()` and returns the **Clerk session JWT**.
- Every customer API call attaches that Clerk JWT as `Authorization: Bearer <token>`:
  - `webapp/calendarConnectionAdapter.ts:40` (`/api/calendar/connections/start`)
  - `webapp/customerShellCommands.ts:207` (`buildCustomerHeaders`, used by draft autosave, memories, data requests)
  - `src/appStateOrchestrator.ts:372` (`buildAiCardGenerationHeaders`)
  - Walgreens checkout adapter and admin view use the same pattern.

## 2. Current API auth flow

- Route contracts (`src/apiRouteContractsData.mjs`) mark customer routes `auth: "customer-session"`.
- `scripts/api-runtime.mjs`:
  - Postgres runtime hashes bearer tokens via `hashSessionToken(token, AUTH_SESSION_SECRET)`, looks them up in **`auth_sessions`**, and mints durable sessions after offline Clerk JWT verification.
  - Memory runtime accepts Clerk JWT verification config directly. Static `CUSTOMCARD_CUSTOMER_SESSION_TOKEN` / `CUSTOMCARD_ADMIN_SESSION_TOKEN` sessions are seeded only when the local server is started with `--local-auth-fallbacks`.

## 3. Previous Clerk 401 / invalid-session issue

Fixed in the API runtime: signed-in Clerk users now send the Clerk session JWT, the API verifies it offline using `CLERK_JWT_KEY` plus issuer/audience/authorized-party checks, then creates a runtime session. Local static reviewer tokens remain available only behind the explicit local fallback runtime switch and are not a production auth path.

## 4. Current Google Calendar connection flow

- `POST /api/calendar/connections/start` (contract `calendar-connection-start`) → `buildGoogleCalendarConnectionStart` (`scripts/api-server.mjs` ≈ 1318) builds the Google authorization URL with **`prompt=consent` unconditionally** (≈ line 1417), regardless of existing connection.
- `GET /oauth/callback` (`handleGoogleCalendarOAuthCallback` ≈ 1424) exchanges the code, fetches events, builds a metadata-only import record, persists via `apiRuntime.persistGoogleCalendarImport` (provider_connections + imported_events + card_opportunities, refresh token encrypted), then 303-redirects to `returnTo` with `calendarConnection`/`calendarImported` query params.
- `webapp/App.tsx` (≈ 286-307) reads those query params and injects **synthetic text** (`buildCalendarImportReviewText`) into the invite textarea. It never loads the persisted connection or imported opportunities.
- `webapp/views/EventsView.tsx` `ImportSection` renders "Connect Google Calendar" purely from Clerk `isSignedIn`. No connected/needs-reconnect state exists.

## 5. Is provider connection state exposed to the frontend?

No. `provider_connections` (`infra/migrations/001_initial_schema.sql:46`) stores status connected/revoked/unsupported plus `encrypted_refresh_token`, but no GET route returns it. There is no `/api/customer/connections` and `customer-bootstrap` does not include connections.

## 6. Current card storage / history model

- Local: `CardHistoryEntry` (`src/freeMvp.ts:43`) = id/title/recipient/occasion/exportedAtIso/frontSvg. No category, no featured, no status lifecycle.
- `recordCardExport` (`src/freeMvp.ts:467`) exists but is **never called from `webapp/App.tsx`** — downloads do not record history; `NotesView` ("Your cards") always shows an empty history.
- Durable: `card_projects` (migration line 108) = opportunity_id, recipient_name, locale, RTL, approved_memory_ids. `render_packets` stores artifacts. Neither has category/featured/public-gallery fields.

## 7. Current admin panel capabilities

- `webapp/AdminOperationalView.tsx` → `webapp/views/AdminView.tsx`, model in `src/adminPortal.ts` (sections: ops, orders, users, assets, providers, launch). Bucket object viewer + AI jobs exist. No card gallery/curation surface.
- Admin gating: Clerk `publicMetadata.role` / `publicMetadata.roles` grants browser admin access; any email allowlist stays server-only and is not bundled into the client (`webapp/App.tsx`, `useAdminAccess`).

## 8. Gaps for category/featured/social-proof carousel

- No `card_gallery_entries` table, no category normalization, no admin curation routes/UI, no public featured route. Landing examples are hardcoded `exampleInputs` in `webapp/views/HomeView.tsx:63`.

## Confirmed contract mismatches (Part 10)

| Route | Contract requestSchema | mutationBodyContractSpecs / frontend |
|---|---|---|
| `data-requests` | `["X-Idempotency-Key","action","region"]` | spec requires `requestType, region, consentGranted`; `SettingsView` sends `requestType` |
| `ai-card-generate` | omits `personal_note` | frontend sends `personal_note` (`appStateOrchestrator.ts:255`) |
| `card-projects` | `opportunityId, approvedMemoryIds, locale` | spec requires `opportunityId, recipientName`; DB column `recipient_name NOT NULL` |
| `manual-vendor-handoff` | `renderPacketId, vendorId, externalShareApproval` | spec requires `projectId, renderPacketId, storeId, externalShareApproval` |

## Copy contradictions (Part 8)

- `HomeView` trustPoints: "Account required for AI generation — designing and printing work without one." But Walgreens upload/session routes require `customer-session`.
- Hero CTA: "Find moments from email or calendar" — no email/Gmail sync exists (Google Calendar + manual paste/ICS only).

## Decision: auth fix approach

**Option A (chosen): verify Clerk JWTs directly in the API runtime.**
A new `scripts/clerk-session.mjs` verifies RS256 Clerk session JWTs offline using the `CLERK_JWT_KEY` PEM public key (azp checked against `CLERK_AUTHORIZED_PARTIES`, exp/nbf with skew). On first sight of a valid Clerk token, the runtime upserts `users` + `account_identities` (provider `clerk`) and inserts a matching `auth_sessions` row keyed by the token hash, so subsequent requests hit the fast session path. Role is `admin` only when the Clerk token carries `publicMetadata.role = admin` (via JWT template) or the email is in the `CUSTOMCARD_ADMIN_EMAILS` allowlist; otherwise `customer`.

Why not Option B (bridge endpoint): Option A requires no frontend changes, no second token to store in the browser, works for every existing Bearer call site at once, and keeps `auth_sessions` as the single durable session store (Clerk-minted sessions expire with the JWT `exp`).

## Files to modify (implementation map)

- New: `scripts/clerk-session.mjs`, `infra/migrations/002_card_gallery.sql`, `src/cardCategories.ts`, `webapp/views/FeaturedCardsSection.tsx` (landing), admin gallery panel, `tests/clerk-session.test.ts` + route tests.
- Edit: `scripts/api-runtime.mjs` (authorize bridge, connections read, gallery persistence), `scripts/api-server.mjs` (connections GET, featured GET, gallery admin routes, consent prompt logic, scan-again), `src/apiRouteContractsData.mjs` (new routes + contract fixes), `src/persistenceContracts.ts` (new table), `webapp/calendarConnectionAdapter.ts` (stale-session copy, connections fetch), `webapp/views/EventsView.tsx` (connection states + real moments inbox), `webapp/App.tsx` (callback loads real data; wire `recordCardExport`; statuses), `src/freeMvp.ts` (history status field), `webapp/views/NotesView.tsx` (status display), `webapp/views/HomeView.tsx` (copy + featured section), `src/appStateOrchestrator.ts` (no change to body; contract gains `personal_note`).
