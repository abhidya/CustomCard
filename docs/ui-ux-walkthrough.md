# Frontend UI/UX walkthrough

- Status: Active
- Date: 2026-06-11
- Scope: customer web app (`src/App.tsx`, `src/customerWebExperience.ts`, `src/appStateOrchestrator.ts`, `src/freeMvp.ts`)
- Companion: `DESIGN.md` (brand, tokens, IA), this doc (surface-by-surface walkthrough and demo-debt audit)

## The core problem

The product goal (DESIGN.md) is: sign in, import calendar/email signals, find card-worthy events,
generate a card, pick the cheapest shipped or fastest nearby pickup path.

The app implements that flow, but the customer seam shipped full of *reviewer demo state*:
prefilled identities, a frozen clock, scripted chat transcripts, and synthesized "events" that
exist before the customer has done anything. A first-time visitor could not tell which content
was theirs and which was canned, so nothing felt actionable. That is what made it "unusable":
not missing features, but demo state occupying every empty state.

## Walkthrough, surface by surface

### 1. Your cards (home, first run)
**Should be:** one clear job — start a private workspace and add a first event. Everything else
(fulfillment, chat, language) is preview, clearly subordinate, never pretending to be live data.

Demo debt found and fixed in this pass:
- Name/email form arrived prefilled with `Abdul / abdul@customcard.local`. A real visitor saw
  someone else's identity in their "private" workspace. → Form now starts empty; the primary
  action stays disabled (with inline hint) until a name is typed.
- The event card showed a synthesized opportunity titled "Card card for Someone important"
  (a string-building bug on the empty import signal). → Grammar fixed in `buildOpportunity`,
  and the home event card now shows a true empty state ("No event yet") with an
  "Add your event" action instead of a fake event.
- The chat console opened with a scripted multi-bubble transcript about a recipient the customer
  never named. → Chat now starts empty with a single prompt bubble; the deterministic assistant
  still replies locally when the customer writes.
- "Language readiness" (admin jargon) headed a customer control. → Now "Language" with the
  existing "Card language" selector.

### 2. Events (import)
**Should be:** the second nav item, because importing an event *is* the product's core loop.
Paste anything (ICS, invite email, short note) → parsed occasion, recipient, date, with honest
warnings when confidence is low.

Fixed in this pass:
- The view existed but was gated behind the operator nav (`?ops=1`), so customers could reach it
  only through a home-card button and then stood in a view with no nav anchor. → "Events" moved
  back into the customer nav (matches the IA in DESIGN.md).
- The import textarea gave no hint about what it accepts. → Placeholder added with concrete
  examples (invite email, calendar export, plain note).
- Urgency was computed against a hardcoded reference date (2026-06-03), so every real event's
  pickup/ship recommendation was wrong relative to today. → The app now uses the real current
  date; the frozen date remains only as a deterministic fixture for tests.

### 3. Card studio
**Should be:** the customer's words in, a print-safe proof out. Form fields belong to the
customer; the template fallback copy is the generator's job, not the form's.

Fixed in this pass:
- "Personal note" arrived prefilled with demo prose ("Mention their shared patience, humor…"),
  which read as the customer's own saved input. → Starts empty with a placeholder suggesting
  what to write; the deterministic template still supplies a graceful fallback line.

Still good as-is: tone/style segmented controls, 4-panel 5x7 preview, validation checklist with
plain-language checks, AI generation gated behind an explicitly-disabled button when no
generation service is configured.

### 4. Memory
Already honest: starts empty, explains why a memory improves the card, approval is explicit,
deletion is always visible. No changes needed beyond what shipped earlier.

### 5. Print options (handoff)
**Should be:** compare public price observations, download the print package, finish at the
print shop. The disclaimers ("estimate only", "checkout happens outside CustomCard") are the
right trust posture — keep them.

No changes this pass. Known future work: vendor segment labels derive from ids
(`office-depot` → "Office Depot" via `formatOption`) — fine; the pricing "observations" wording
should eventually show observation dates per row.

### 6. Operator surfaces (Mobile preview, Operations, Connections)
Correctly gated behind `?ops=1`. The readiness registers are operator material and must never
leak into the customer seam — the `customerVisibleImplementationTermPattern` guard plus smoke
tests enforce this; keep extending that pattern when new jargon appears.

## Interaction principles confirmed by this audit

1. **Empty states teach; they never impersonate data.** Every surface needs a real empty state
   (home event card, chat, memory list all have one now). Sample data may exist only behind an
   explicit "try an example" action, never preloaded.
2. **One primary action per stage.** `customerWebExperience` already enforces exactly one
   primary action — preserved; the disabled-until-named state keeps that contract.
3. **Real clock, real identity.** Deterministic fixtures (`reviewerReferenceDate`, seeded
   transcripts) live in tests and contracts only.
4. **Customer vocabulary only.** Sign in, import, event, card, pickup, shipped, estimate.
   Readiness/adapter/provider language stays in `?ops=1` surfaces.

## Verification

- `npm run check` (unit + coverage + build + audit) passes: 542 tests, 0 vulnerabilities.
- Browser smoke tests (`tests/app-smoke.test.ts`) updated for the new first-run flow
  (type a name before "Create local workspace"; chat starts unseeded) — they require headless
  Chrome and run in CI.

## Prioritized backlog

Shipped 2026-06-11 (production build-out pass):
- **Occasion-first hub** — "Who is the card for?" chips on the home view jump straight into the
  Studio with the occasion prefilled; invite paste remains one tap away.
- **Persisted event queue** — events can be saved from the Events view; the home queue shows
  them sorted by date with days-until labels, snooze, dismiss, and "Make card".
- **Card history** — exported print packages are recorded and listed under "Recent cards".
- **Bottom tab bar** — customer nav becomes a fixed bottom bar under 640px.
- **PWA installability** — manifest, icons, and an offline-capable service worker
  (production builds only).

Still open:
1. **Onboarding moment after workspace creation** — route the customer straight to Events with
   a one-line "what happens next" banner instead of returning to the home grid.
2. **Price observation freshness** — show the observed-at date next to each estimate row.
3. **Proof approval as an explicit action** — "proof approved" is currently inferred from
   validation passing; an explicit "Looks good" tap would make the fulfillment unlock feel earned.
4. **Photo upload on cards** — see `docs/frontend-replatform-plan.md`.
5. **Occasion/template gallery pages** — the SEO surface from the replatform plan.
