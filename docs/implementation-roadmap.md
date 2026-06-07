# Implementation Roadmap

## Working Assumptions

1. Build a web app first.
2. Start with Gmail and Google Calendar only.
3. Require explicit user approval before generating final assets or sharing data
   with any vendor.
4. Use manual download or deep-link vendor handoff in v1.
5. Store structured relationship and card history first; add vector memory only
   after the structured model is useful.
6. Treat emails and calendar invites as untrusted content.

## Milestone 0: Context and Design Baseline

Goal: Preserve the product idea and turn it into an implementation-ready plan.

Deliverables:
1. Product brief.
2. System design prompt.
3. Roadmap.
4. Initial technical architecture decision record.
5. MVP acceptance criteria.

Acceptance criteria:
1. A new contributor can understand the product without external chat history.
2. The v1 scope is explicit.
3. Major privacy, safety, and fulfillment risks are named.

## Milestone 1: MVP App Skeleton

Goal: Create the first runnable web app.

Recommended shape:
1. Web app. This repo currently uses Vite/React for the free local MVP; a later
   Next.js or Remix move is optional only if server-rendered routes become useful.
2. PostgreSQL for core relational data.
3. Object storage for generated assets.
4. Job queue for ingestion, extraction, asset generation, and notifications.
5. AI gateway module to isolate model calls and logging.

Initial screens:
1. Dashboard of detected card opportunities.
2. Card project detail page.
3. Guided questionnaire.
4. Four-panel preview.
5. Export/download page.
6. Memory and privacy settings page.

Acceptance criteria:
1. App runs locally.
2. Local workspace auth/user model exists.
3. User can create a manual card project without email integration.

## Milestone 2: Manual Card Project Flow

Goal: Prove the core card creation loop without OAuth complexity.

Components:
1. Card project model.
2. Questionnaire model.
3. Copy generation prompt.
4. Visual design prompt generator.
5. Print layout renderer for 5x7 panels.
6. Preview UI.
7. Export pipeline.

Acceptance criteria:
1. User can enter event and recipient details.
2. System generates message variants.
3. User can select a tone and edit text.
4. System exports four print-ready panels.
5. Exported panels pass dimension and safe-zone checks.

Current status: covered for the free local MVP with manual/ICS import,
deterministic card templates, four SVG panels, and manual vendor handoff.
Persistent server-side projects and production export packaging remain future
work.

## Milestone 3: Gmail and Calendar Ingestion

Goal: Detect candidate events from connected Google accounts.

Current planning contract: `src/onboardingCalendar.ts` and
`docs/onboarding-calendar-plan.md` define the user stories, onboarding stages,
Google Calendar OAuth-readiness gates, and iCloud manual ICS export fallback.
This is not live OAuth or background sync.

Components:
1. Google OAuth with minimal scopes.
2. ConnectedAccount model.
3. Calendar event sync.
4. Email search/query sync for likely invitation sources.
5. Event extraction worker.
6. Opportunity ranking.

Acceptance criteria:
1. User can connect Google.
2. System detects candidate events.
3. System shows evidence snippets and confidence.
4. User can dismiss, edit, or convert an opportunity into a card project.

Contract acceptance before implementation:
1. Calendar source selection names the exact data boundary before import.
2. Google Calendar uses only `calendar.events.readonly` for event metadata.
3. iCloud users can continue with manual ICS export without storing Apple
   credentials.
4. Import preview precedes card project creation, memory creation, vendor
   sharing, payment, or ordering.
5. Revocation, retention, and raw-content rejection gates are tested before live
   provider calls are enabled.
6. `/api/calendar/connections/start` remains the server-owned start contract;
   clients must not prepare Google OAuth URLs, Apple credentials, provider
   callbacks, or background sync locally.

## Milestone 4: Relationship Memory

Goal: Make the system remember useful context without becoming invasive.

Components:
1. Contact model.
2. Relationship model.
3. MemoryRecord model.
4. Card history view.
5. User-controlled memory edit/delete/suppress controls.

Acceptance criteria:
1. Approved card projects create proposed memories, not hidden memories.
2. User can inspect and edit relationship context.
3. Generation prompts cite memory records by ID internally.
4. Sensitive memories require explicit user confirmation.

## Milestone 5: Fulfillment Handoff

Goal: Help users get cards printed without needing direct retail APIs.

Components:
1. VendorOption model.
2. Manual vendor comparison page.
3. Asset package builder.
4. Instructions/deep links for CVS, Walgreens, FedEx Office, Walmart, Staples,
   Office Depot, and generic print.
5. Pickup urgency scoring.

Acceptance criteria:
1. User can download a vendor-ready asset package.
2. System can compare manually configured vendor options.
3. System clearly labels when ordering is user-assisted.

## Milestone 6: Production Hardening

Goal: Make the system safe enough for private beta.

Components:
1. Prompt injection defenses.
2. Audit logs.
3. Retention controls.
4. Background job observability.
5. Layout regression tests.
6. Multilingual text rendering tests.
7. Human approval gates.

Acceptance criteria:
1. No card can be ordered or externally shared without approval.
2. All model outputs used for user-facing cards are stored with provenance.
3. Users can delete accounts and associated data.
4. Layout tests validate DPI, bleed, trim, safe zones, and text bounds.

## Candidate Architecture

```text
Web App
  -> API routes
  -> PostgreSQL
  -> Object storage
  -> Job queue

Workers
  -> Email/calendar ingestion
  -> Event extraction
  -> Relationship context assembly
  -> Copy generation
  -> Visual prompt generation
  -> Image/layout generation
  -> QA validation
  -> Notification scheduling

AI Gateway
  -> Text generation models
  -> Image generation models
  -> Moderation/validation helpers

Vendor Layer
  -> Manual export package
  -> Deep-link handoff
  -> Future direct APIs
```

## Provider Seam Boundary

Provider ownership is split across three deterministic seams:

1. `src/providerCatalog.ts` owns the provider registry: adapter identity,
   capability grouping, role surface, credential names, docs URLs, and
   ready-local fallback discovery. Clients should read adapters through this
   registry instead of duplicating provider lists.
2. `src/providerRuntime.ts` owns dry-run runtime contracts: capability-level
   dispatch, local fallbacks, request-shape builders, redaction, credential
   placeholders, and `noNetwork: true` prepared requests. It does not execute
   provider calls.
3. `src/providerGovernance.ts` owns production controls: fallback mapping,
   budget ceilings, rate limits, queue requirements, human-approval flags, and
   the invariant that live network and real orders default to `false`.

Remaining production/live-proof blockers:

1. Replace contract-only prepared requests with credential-vaulted server
   adapters behind explicit integration-owner approval.
2. Add live-provider doctors that prove OAuth/session revocation, webhook
   signatures, rate-limit handling, and tenant review before enabling network
   execution.
3. Add payment and retail kill-switch enforcement outside the provider seam
   before any real charge, live quote, file upload, or vendor order is possible.
4. Wire UI/API clients to the provider registry/runtime/governance seams without
   duplicating capability or fallback logic in shared surfaces.

## First Build Recommendation

Start with the manual card project flow before email/calendar ingestion. It proves
the highest-value experience and gives us layout, prompt, preview, and export
infrastructure that the proactive CRM flow can reuse later.
