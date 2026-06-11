# Production UI audit — Phase 0 + completion pass

Status: Active · Updated: 2026-06-11 · Scope: consumer web shell (`webapp/`), backed by `src/apiRouteContractsData.mjs`

This audit maps every production UI surface to repo evidence. Updated after the focused UI/UX completion pass; earlier
stale rows (proof approval "missing", checkout validation "missing") are corrected below.

## Corrections confirmed against the current route contract

| Earlier assumption | Current repo truth | Evidence |
| --- | --- | --- |
| Walgreens upload/session may be anonymous | Both require `customer-session` auth; only the callback is public | `apiRouteContractsData.mjs` `walgreens-checkout-upload`/`-session` (`auth: "customer-session"`), `-callback` (`auth: "none"`) |
| Manual handoff body: renderPacketId, vendorId, externalShareApproval | Requires `projectId`, `renderPacketId`, `storeId`, `externalShareApproval` | `mutationBodyContractSpecs["manual-vendor-handoff"]` |
| Card project body: opportunityId, approvedMemoryIds, locale | Requires `opportunityId` **and `recipientName`** | `mutationBodyContractSpecs["card-projects"]` |
| Data request body: action, region | Requires `requestType`, `region`, `consentGranted` | `mutationBodyContractSpecs["data-requests"]` |
| Import preview accepts generic paste | Requires explicit metadata fields or server-parsed raw invite/ICS text | `mutationBodyContractSpecs["import-preview"]` |

## Owner checklist by area

### 1. Landing
- [x] Hero: "Never miss the card-worthy moment." + Walgreens subcopy (`webapp/views/HomeView.tsx`)
- [x] CTA hierarchy: Create a card / Find moments from email or calendar / See examples
- [x] Occasion chips, real rendered example cards (six occasions), how-it-works (5 steps)
- [x] Walgreens/free section + privacy/trust section (account-for-AI, optional connections, review-every-word)
- [x] No testimonials invented
- [x] Final CTA

### 2. Create / generate
- [x] Anonymous-first studio; required fields editable before signup
- [x] Account gate copy: "Create a free account to generate your card" + progress-preserved + email/calendar separation note
- [x] Tone set expanded: warm, funny, elegant, simple, reverent, sentimental (`Tone` union, `cardDraft.ts`, server `safeTone`)
- [x] Sensitive occasions (sympathy/grief/illness/apology…) hide the funny tone and show the review banner (`isSensitiveOccasion`)
- [ ] Message length control — **gap**: not yet in `CardDraftInput`; needs model + autosave schema touch
- [ ] Artwork mode picker — **gap**: backend exposes text/image generation only as one flow

### 3. Generation states
- [x] Staged client-side states: Drafting message → Preparing panels → Checking print fit → Ready for review (`generationStages`)
- [x] Per-panel labels: Creating artwork… / Artwork ready / Template / Needs review
- [x] Stale-after-edit: edits no longer silently reset the AI draft; banner offers Keep current artwork / Regenerate affected panels (`aiStale`, `keepAiArtwork` in `appStateOrchestrator.ts`)
- [ ] Durable job IDs / per-panel retry routes — **backend gap**: `/api/ai/card/generate` is single-shot; no job routes exist. UI stays honest (no fake job state).

### 4. Card visualization
- [x] 2D proof is canonical (panel tabs, 1500×2100 @300 DPI)
- [x] CSS-3D folded preview (front/open/back) with "Folded preview. Use the proof view for exact print review." label, reduced-motion safe, no new dependency (`FoldedCardPreview` in `webapp/ui.tsx`)

### 5. Proof / editor
- [x] Explicit approval checklist (names, occasion/details, spelling, tone, approve) — `webapp/proofApproval.ts`
- [x] Editing the card resets approval (proof signature effect in `PrintView`)
- [x] Text-overflow warning blocks approval; missing-panel blocks approval
- [x] RTL review warning
- [ ] Per-panel in-place copy editing on the proof page — **partial**: editing routes back through the studio

### 6. Walgreens checkout
- [x] "Continue to Walgreens" is the primary CTA, gated on print checks + proof approval
- [x] Inline field validation (first/last/email/10-digit phone) before submit (`validateCheckoutCustomer`)
- [x] Manual upload/download moved under "Having trouble? More options" (details element)
- [x] Popup-blocked fallback (location redirect + reopen link); status copy never claims order completion
- [x] Upload/session require customer session (route contract) and errors surface friendly copy + fallback
- [ ] Environment-aware enabled/disabled banner — **gap**: no client-readable Walgreens-enablement flag; copy stays neutral

### 7. My Cards
- [x] Card-focused hub: current draft with status (Draft / In progress / Ready to review), history entries (Downloaded), thumbnails, Continue / Review proof / Make another for this person
- [x] Empty state: "No cards yet. Start with a card, an invite, or a saved person."
- [ ] Needs review / Walgreens checkout started / Returned from Walgreens / Printed / Archived — **backend gap**: no persisted card-status model or checkout-return tracking; statuses limited to what local state proves

### 8. People / memory
- [x] Separate People surface (`webapp/views/PeopleView.tsx`): person profiles, saved notes with delete, card counts, "Make a card"
- [x] Use once vs Save for future: switch defaults to use once; only "save" posts to `/api/memories/review` (approve); local-only otherwise
- [ ] Sensitivity labels per note — **gap**: memory model has no sensitivity field; default-use-once covers the safety intent

### 9. Moments
- [x] Paste invite/ICS → reviewable opportunity with urgency/needs-date/evidence; Google Calendar primary (sign-in gated), Apple footnote
- [ ] Snooze / duplicate detection / belated handling / ranked inbox — **gap**: `SavedEvent` supports snoozed/dismissed but the inbox UI for multiple events is not built

### 10. Settings / privacy / sad paths / tests
- [x] Settings: account, connections honesty, privacy requests (export/delete via `/api/data-requests` with requestType/region/consentGranted), AI disclosure, Walgreens payment disclosure, legal links
- [x] Sad paths covered: signed-out AI gate, AI failure copy, checkout field issues, upload/session failure → fallback, popup blocked, overflow blocks approval
- [x] Tests: SSR shell tests cover landing, account gate, proof checklist, people use-once, settings, copy-safety term scan across all customer views; architecture tests cover nav/policy/proof/checkout validation; Chrome smoke updated
- [ ] OAuth-denied/token-expired UI tests — **partial**: adapter handles status copy; no dedicated tests

## Decisions
- No new dependencies; repo-local CSS tokens extended (`webapp/styles.css`).
- Customer copy passes the blocked-term patterns (`customerWebExperience.ts`).
- The user approves the 2D proof, never the 3D preview.
