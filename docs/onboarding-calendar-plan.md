# Onboarding And Calendar Integration Plan

This document defines the production-shaped onboarding journey and popular
calendar integration contracts for CustomCard. It does not claim live OAuth,
Apple account access, background sync, or provider network calls.

## User Stories

| ID | Persona | Story | Calendar path | Acceptance |
| --- | --- | --- | --- | --- |
| `story-google-calendar-proactive-card` | Busy family organizer | As a busy family organizer, I want CustomCard to find upcoming Google Calendar events so I can approve a thoughtful card before the week gets busy. | Google Calendar API | Google is credential-gated, imports metadata only, and creates no card project until the user approves a candidate. |
| `story-icloud-export-user` | iCloud-first user | As an iCloud Calendar user, I want a manual export path so I can use CustomCard without giving the app my Apple account credentials. | iCloud ICS export | iCloud stays manual-export only; no Apple ID, app-specific password, fake OAuth, or live CalDAV connector is claimed. |
| `story-last-minute-pickup` | Last-minute card buyer | As a last-minute card buyer, I want onboarding to show event urgency so I can prioritize a printable card and same-day manual handoff. | Calendar-agnostic | Date confidence is visible, manual print handoff remains available, and real retail ordering remains disabled. |
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
   live OAuth URLs.
4. **Review imported event metadata.** Candidate events use metadata fields only:
   title, date range, location label, attendee labels, and evidence summary.
   Raw calendar descriptions and full email bodies are out of scope.
5. **Approve card opportunity.** The user explicitly generates, snoozes,
   dismisses, or edits a candidate. Importing a calendar never creates a card
   project by itself.
6. **Answer card interview.** The user supplies sender, relationship, tone,
   language, and style details. High-care situations remain review-gated.
7. **Approve relationship memory.** Proposed memories require visible consent,
   provenance, editing, suppression, and deletion controls.
8. **Prepare print handoff.** The user downloads or manually hands off assets.
   Real ordering stays blocked until quote, approval, payment, vendor
   certification, and physical print QA gates pass.

## Calendar Adapter Readiness

| Adapter | Status | Production contract | Live behavior blocked |
| --- | --- | --- | --- |
| `google-calendar-events` | Credential-gated | Requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `calendar.events.readonly` / `https://www.googleapis.com/auth/calendar.events.readonly`, metadata schema validation, revocation handling, and no raw content storage. | No live OAuth consent flow or provider callback exists in this repo state. |
| `icloud-ics-fallback` | Contract-only | Uses customer-provided ICS export/paste through the existing untrusted-input import path. Apple supports exporting calendar events to `.ics` on Mac and downloading an iCloud.com calendar copy after temporary public sharing; CustomCard stores no Apple account credentials. | No fake iCloud OAuth, app-specific password storage, live CalDAV, or native Apple Calendar sync is implemented. |

## Customer UI Contract

The customer web panel and mobile app show the same readiness split:

| Choice | Customer state | Action |
| --- | --- | --- |
| Paste invite or ICS | Ready now | Use the local no-account import path. |
| Google Calendar connection | OAuth gated | Do not show a live sign-in CTA until OAuth app setup, consent copy, token storage, and revocation handling exist. |
| Apple Calendar ICS export | Manual export | Ask the user to export/download ICS and paste selected event data; never ask for Apple ID, app-specific password, CalDAV, or native sync credentials in this repo state. |

## Guardrails

- No fake live OAuth URLs, callbacks, or provider request factories.
- Calendar import contracts are metadata-only and reject raw email/calendar body
  storage.
- Calendar connection does not create card projects, relationship memories,
  vendor shares, payments, or orders without explicit user approval.
- Google Calendar is credential-gated; iCloud is manual-export contract-only
  until a real Apple calendar credential strategy exists.
- Manual invite and ICS paste remain the free fallback for every onboarding path.
