# Onboarding And Calendar Integration Plan

This document defines the production-shaped onboarding journey, popular
calendar integration contracts, action packets, and server-owned connection
start packets for CustomCard. It does not claim live OAuth, Apple account
access, background sync, or provider network calls.

## User Stories

| ID | Persona | Story | Calendar path | Acceptance |
| --- | --- | --- | --- | --- |
| `story-google-calendar-proactive-card` | Busy family organizer | As a busy family organizer, I want CustomCard to find upcoming Google Calendar events so I can approve a thoughtful card before the week gets busy. | Google Calendar API | Google is credential-gated, imports metadata only, and creates no card project until the user approves a candidate. |
| `story-icloud-export-user` | iCloud-first user | As an iCloud Calendar user, I want a manual export path so I can use CustomCard without giving the app my Apple account credentials. | iCloud ICS export | iCloud stays manual-export only; no Apple ID, app-specific password, fake OAuth, or live CalDAV connector is claimed. |
| `story-last-minute-pickup` | Last-minute card buyer | As a last-minute card buyer, I want onboarding to show event urgency so I can prioritize a printable card and same-day print options. | Calendar-agnostic | Date confidence is visible, manual print options remain available, and real retail ordering remains disabled. |
| `story-privacy-first-onboarding` | Privacy-cautious user | As a privacy-cautious user, I want to see scopes, retention, and revocation before importing events so I can choose a manual path if needed. | Calendar-agnostic | Each provider names scopes or explains that none exist; raw event content is rejected; memory requires separate approval. |
| `story-recurring-memory` | Relationship-memory user | As a recurring card sender, I want approved relationship memories to improve later card interviews without hiding what the product remembers. | Calendar-agnostic | Memory records are proposed after card approval, remain editable/deletable, and are not created from provider data without consent. |

The typed source of truth is `src/onboardingCalendar.ts`, with targeted coverage
in `src/onboardingCalendar.test.ts`.

## Onboarding Process

1. **Create a private card workspace.** The reviewer can start locally without
   live auth. Production accounts remain blocked on hosted auth and recovery
   evidence.
2. **Choose calendar source.** The user picks Google Calendar, iCloud export,
   manual invite paste, or manual note. The UI must show the source's data
   boundary before import.
3. **Preview consent and scopes.** Google Calendar requires OAuth app setup,
   minimal `calendar.events.readonly` / `https://www.googleapis.com/auth/calendar.events.readonly`
   scope, revocation handling, and privacy copy. This repo does not generate
   live OAuth URLs. Clients call `/api/calendar/connections/start` for the
   server-owned start packet instead of preparing provider request URLs.
4. **Review imported event metadata.** Candidate events use metadata fields only:
   title, date range, location label, attendee labels, and evidence summary.
   `/api/import-preview` accepts either explicit metadata-only fields or pasted
   raw invite/ICS text, parses the raw text server-side, and returns only the
   derived metadata plus parser evidence. Raw calendar descriptions and full
   email bodies are never persisted or returned.
5. **Approve card opportunity.** The user explicitly generates, snoozes,
   dismisses, or edits a candidate. Importing a calendar never creates a card
   project by itself.
6. **Answer card interview.** The user supplies sender, relationship, tone,
   language, and style details. High-care situations remain review-gated.
7. **Approve relationship memory.** Proposed memories require visible consent,
   provenance, editing, suppression, and deletion controls.
8. **Review print options.** The user downloads assets or uses a local print
   package. Real ordering stays blocked until quote, approval, payment, retail
   certification, and physical print QA gates pass.

## Calendar Adapter Readiness

| Adapter | Status | Production contract | Live behavior blocked |
| --- | --- | --- | --- |
| `google-calendar-events` | Credential-gated | Requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `calendar.events.readonly` / `https://www.googleapis.com/auth/calendar.events.readonly`, metadata schema validation, revocation handling, and no raw content storage. | `/api/calendar/connections/start` can return a server-generated Google consent URL only when the required env vars exist; callback handling, token exchange, credential persistence, revocation, and background import remain blocked. |
| `icloud-ics-fallback` | Contract-only | Uses customer-provided ICS export/paste through the existing untrusted-input import path. Apple supports exporting calendar events to `.ics` on Mac and downloading an iCloud.com calendar copy after temporary public sharing; CustomCard stores no Apple account credentials. | No fake iCloud OAuth, app-specific password storage, live CalDAV, or native Apple Calendar sync is implemented. |

Google OAuth setup evidence:

- Client ID `604984591268-dujee5ri2ff87sqe3iv3m58nj2e2mibc.apps.googleusercontent.com` exists in Google Auth Platform.
- Authorized origins: `http://localhost:5173`, `http://127.0.0.1:5173`, and `https://customcard-three.vercel.app`.
- Authorized redirect URIs: `http://localhost:5173/oauth/callback`, `http://127.0.0.1:5173/oauth/callback`, and `https://customcard-three.vercel.app/oauth/callback`.
- The client secret belongs only in ignored local env files and Vercel secret storage.
- Live sync remains blocked until the callback, token exchange, encrypted token storage, disconnect/revocation, and metadata fixture proof are implemented.

Official source anchors:

- Google Calendar API scope selection:
  `https://developers.google.com/workspace/calendar/api/auth`
- Apple Calendar export on Mac:
  `https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac`
- Apple iCloud copy/download guidance:
  `https://support.apple.com/en-gb/108306`

## Calendar Action Packets

`buildCalendarOnboardingActionPackets()` is the typed source of truth for the
customer-visible action, the operator checklist, and the blocked provider
boundary. It fails fast when the Google or iCloud readiness contract is missing
instead of silently hiding the missing adapter behind an empty fallback.

| Packet | Customer action | Operator evidence | Blocked surface |
| --- | --- | --- | --- |
| `manual-invite-or-ics` | Paste invite text, selected event fields, or ICS text into the local import path; review detected metadata before creating a card. | `/api/import-preview` accepts `metadataOnlyPayload`, `rawImportText`, `rawInviteText`, `rawIcsText`, or `rawCalendarText`; parser tests, API tests, and Postgres runtime doctors prove raw content is not stored or echoed. | None; this is the ready local path. |
| `google-calendar-events` | Review the Google metadata-only scope and use manual paste while OAuth is not enabled. | OAuth app, redirect URI, consent screen, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, revocation handling, token storage boundary, and metadata schema fixture tests. | The base onboarding packet stays blocked; the API server wrapper can prepare an authorization URL only after env is present, and still stores no tokens or imported events. |
| `icloud-ics-fallback` | Export/download an ICS copy, then paste selected event data into the same local import preview. | Prove Apple credentials are not collected; manual ICS parser tests pass. | No Apple ID, app-specific password, CalDAV session, native sync, or provider credential storage. |

## Calendar Connection Start API

`buildCalendarConnectionStartPackets()` and
`buildCalendarConnectionStartResponse()` define the default API-owned
connection start contract used by `/api/calendar/connections/start`. The typed
onboarding module returns policy and evidence state only. The Node API server
adds a Google-specific wrapper: when `GOOGLE_OAUTH_CLIENT_ID`,
`GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` are set, the route
returns a server-generated Google authorization URL and an opaque state token.
It still does not exchange tokens, store credentials, start background sync,
create card opportunities, or import provider events.

| Choice | Start mode | Server response | Next safe route |
| --- | --- | --- | --- |
| `manual-invite-or-ics` | `metadata-import` | Ready local packet; no provider request URL and no credentials. | `/api/import-preview` |
| `google-calendar-events` | `oauth-evidence-required` or API-wrapper `oauth-provider-redirect` | Blocked packet with missing `google-scope-review`, OAuth env/redirect, revocation, and metadata-fixture evidence IDs; when env exists, the API wrapper returns `oauth-ready` with a Google consent URL, no credential storage, and no import side effects. | None until callback/token/import gates are implemented. |
| `icloud-ics-fallback` | `manual-export-guide` | Ready manual export packet with Apple credential collection explicitly forbidden. | `/api/import-preview` |

The API contract is listed in `src/apiContracts.ts`, validated in
`src/onboardingCalendar.test.ts` and `tests/api-server.test.ts`, and mapped to
idempotent customer-session persistence/audit guardrails in
`src/persistenceContracts.ts`. The customer web panel and mobile customer model
consume these same start packets for Google/Apple readiness display, so client
code cannot drift into preparing provider URLs or credentials locally.

## Evidence Requirements

Each action packet now carries `CalendarConnectionEvidenceRequirement[]`. This
keeps customer actions, operator setup, official source anchors, and launch
blockers together instead of scattering provider-specific rules through UI
copy. `summarizeCalendarOnboardingEvidence()` currently reports 10 evidence
requirements: 6 are repo-satisfied, 4 still block a live Google connection, and
3 cite official Google or Apple source anchors.

| Provider path | Repo-satisfied evidence | Blocking evidence still missing |
| --- | --- | --- |
| Manual invite or ICS | Metadata-only import preview; untrusted input parser guard. | None; this path remains ready without a provider connection. |
| Google Calendar | Manual invite/ICS fallback remains visible. | Scope review for `calendar.events.readonly`, OAuth app/redirect/token boundary, revocation proof, and recorded metadata-only Google event fixture. |
| Apple Calendar ICS export | Export instructions visible, no Apple credential collection, exported ICS uses the metadata-only import preview. | None for manual export; live CalDAV/native sync remains out of scope. |

## Customer UI Contract

The customer web panel and mobile app show the same readiness split:

| Choice | Customer state | Action |
| --- | --- | --- |
| Paste invite or ICS | Ready now | Use the local no-account import path; the server parses pasted invite/ICS text into metadata-only preview fields. |
| Google Calendar connection | Not connected yet | Tell the user Google requires connection setup; do not show a live sign-in CTA until OAuth app setup, consent copy, token storage, and revocation handling exist. |
| Apple Calendar ICS export | Manual ICS export | Ask the user to export/download ICS and paste selected event data; never ask for Apple ID, app-specific password, CalDAV, or native sync credentials in this repo state. |

Implementation rule: web and mobile clients may render `CalendarConnectionStartPacket`
fields, but provider start policy remains server-owned. Client code must keep
`clientMayPrepareProviderRequest`, `networkRequestPrepared`,
`credentialStorageEnabled`, and `providerRequestUrl` false/null.

## Guardrails

- No fake live OAuth callbacks, token exchange, credential storage, or provider
  import factories. Google authorization URLs are server-generated only when
  required env vars exist.
- Calendar import contracts are metadata-only: raw pasted invite/ICS text can be
  parsed by `/api/import-preview`, but raw email/calendar body storage and
  response echoing are forbidden.
- Calendar connection does not create card projects, relationship memories,
  vendor shares, payments, or orders without explicit user approval.
- Google Calendar is credential-gated; iCloud is manual-export contract-only
  until a real Apple calendar credential strategy exists.
- Manual invite and ICS paste remain the free fallback for every onboarding path.
