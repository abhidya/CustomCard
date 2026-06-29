# Frontend replatform plan: stack, landing page, hub, mobile, and unlock map

- Status: Proposal
- Date: 2026-06-11
- Inputs: `DESIGN.md`, `docs/ui-ux-walkthrough.md`, provider catalog/runtime audit, card_gen
  sidecar, external research on landing-page and card-product onboarding patterns

## 1. Stack: rebuilding the UI on top of the existing backend

### What the backend actually gives us
The real asset is not the current React shell — it is the deterministic TypeScript domain layer
(`freeMvp`, `customerWebExperience`, `printerPricing`, `fulfillmentRecommendation`,
`printExport`, `localization`, …). It is framework-agnostic, contract-tested, and already
shared with the Expo app (`apps/mobile/src/customerExperience`). Any UI rebuild should treat
that layer as a package and rebuild only the view seam.

### Recommended target

| Layer | Choice | Why |
| --- | --- | --- |
| Workspace | npm workspaces monorepo: `packages/domain`, `apps/web`, `apps/landing`, `apps/mobile`, `services/card-gen` | The domain layer is already shared informally; make the boundary explicit so web/mobile/landing can't drift |
| App framework | Next.js (App Router) on Vercel | Already deploying to Vercel; one framework serves the SEO landing pages (static), the app (client components), and replaces the hand-rolled `api/[...path].mjs` catch-all with typed route handlers |
| Styling | Tailwind CSS v4 + shadcn/ui primitives | shadcn copies components into the repo — consistent with the "repo-local CSS, no design-system dependency" rule in DESIGN.md, while ending the 3,200-line hand-maintained `styles.css` |
| Server state | TanStack Query | The moment live providers unlock (auth, calendar import, AI gen), every surface needs caching/retry/optimistic states; the current ad-hoc `fetch` in `appStateOrchestrator` won't scale |
| Validation | Zod at every network boundary | Matches the existing contract-first culture; the API contracts in `apiContracts.ts` translate naturally |
| Local-first state | Keep a local draft/cache interface, but treat `src/localPersistenceAudit.ts` as the source of truth for what must sync to Postgres/object storage | The privacy posture ("cards stay in this browser") is useful for the free path, but hosted identity, approved memories, event queue decisions, and card history/render metadata need durable storage |

**Cheaper alternative (also valid):** stay on Vite, add TanStack Router + Tailwind, and build
the landing page as a separate static site. Choose this if SEO pages can live on a subdomain
and you want zero migration risk. Choose Next.js if occasion/template landing pages (Section 2)
are part of the growth plan — they need SSG and per-page metadata, which a Vite SPA can't do well.

**Future-proofing rules regardless of framework:**
1. Views never import provider adapters — only domain functions (already mostly true; keep it).
2. Every customer-visible string flows through a copy module testable against
   `customerVisibleImplementationTermPattern` (exists — extend it).
3. One `ViewId`-style route registry typed end-to-end, so mobile/web/deep links stay in sync.
4. Feature gates read from one `runtimeReadiness` source; UI renders "coming soon" states from
   it instead of hardcoding (the adapter readiness model already supports this).

## 2. Landing page (the selling site)

Research synthesis (2026 conversion data): outcome-first H1 under ~8 words; subheadline names
the mechanism; product shown in action within the first viewport; **one** primary CTA; social
proof in the first scroll; ~83% of landing visits are mobile; every second of load time costs
~7% conversion. Median landing conversion is ~4%, top quartile >11%.

### Page structure

1. **Hero** — H1 outcome: *"Never miss a card-worthy moment."* Subhead mechanism: *"CustomCard
   watches your calendar, writes a heartfelt draft, and finds the cheapest print or fastest
   pickup near you."* Visual: a live 4-panel card assembling itself from a pasted invite
   (animate the actual product, not a stock illustration). Primary CTA: **"Make your first
   card — free"** (drops into the app with no signup — our genuinely rare advantage). Secondary:
   "See how it works."
2. **Trust strip** — privacy is the differentiator, state it as proof: "No account required ·
   Cards stay in your browser · No automatic charges." Add real testimonials/review counts once
   they exist; do not fake them (specificity is what makes social proof work; anonymous star
   ratings do nothing).
3. **How it works, 3 steps** — Import an event → Approve the draft → Print or pick up. Each step
   is a real screenshot, captioned in customer vocabulary.
4. **Occasion gallery** — grid of occasion tiles (Birthday, Anniversary, Thank you, Eid,
   Sympathy, …). Each tile links to a static occasion page (`/cards/birthday`…) with example
   panels and an occasion-prefilled CTA. This is the SEO engine — it is how Canva, Greetings
   Island, and Adobe Express capture "birthday card maker" queries.
5. **Comparison block** — "Estimate before you commit": show the pickup/ship/cheapest
   comparison UI. No competitor leads with print-price honesty; we should.
6. **FAQ + final CTA** — repeat the hero offer verbatim.

Build as static/SSG, target <2s LCP on mobile, one primary CTA per page.

## 3. The hub (what people land in)

Pattern research from card products (Moonpig, Canva, Greetings Island): every successful flow
is **occasion-first, not account-first** — pick who/what it's for, see templates immediately,
edit inline, and only then deal with identity/delivery. Moonpig's flow: occasion → browse
gallery → personalize editor → delivery options. Canva: template gallery with occasion filters
before any commitment.

CustomCard's current hub is workspace-first ("create a workspace" before anything happens).
Invert it:

1. **Above the fold: "Who's the card for?"** — occasion chips (Birthday, Anniversary, Thanks,
   …) + the paste-an-invite box. Tapping a chip jumps straight into the Studio with occasion
   prefilled; the workspace is created lazily the first time something needs saving (the
   `createLocalWorkspace` fallback already supports this).
2. **Upcoming events rail** — once events exist, the hub is a dated queue ("Sara & Ahmed's
   anniversary — 31 days — draft ready"), the product's core promise made visible. Requires
   persisting the event queue (top backlog item in `docs/ui-ux-walkthrough.md`).
3. **Resume strip** — drafts in progress and past cards ("Your cards" currently shows neither).
4. **Connect prompt, soft** — one quiet row: "Connect Google Calendar to find moments
   automatically — coming soon" driven by `runtimeReadiness`, never a blocking modal.

## 4. Mobile-optimized website

Yes — and most of the hard part is done: smoke tests already enforce zero horizontal overflow
at 320–390px and ≥40px touch targets. To make it genuinely mobile-first:

1. **Bottom tab bar** at <640px (Your cards / Events / Studio / Print) replacing the side rail.
2. **PWA**: manifest + service worker. The app is already deterministic and offline-capable by
   design (localStorage, no network dependencies) — installability is nearly free and makes
   "private, on your device" tangible.
3. **Editor ergonomics**: panel preview as swipeable carousel; form controls in a bottom sheet.
4. Keep the separate Expo app for push notifications and native share targets later; the PWA
   covers everything else until the `native-mobile-artifact` gate has signing evidence.

## 5. Unlock map: what needs API keys, what's blocked, what's underbuilt

### Ready to unlock with one key each (code exists, evidence missing)

| Feature | What it needs | State |
| --- | --- | --- |
| **AI card text** | `ANTHROPIC_API_KEY` on the deployed `card_gen` FastAPI sidecar + `VITE_CARD_GEN_URL` in the web env | Sidecar is fully built (PydanticAI); the Studio button is wired and currently disabled. **Highest-leverage unlock in the repo.** |
| **AI card images** | `OPENAI_API_KEY` on the same sidecar (optional flag) | Built; panel `imageUrl` rendering already handled |
| **Durable storage** | `DATABASE_URL` (hosted Postgres) | Postgres runtime, migrations, and doctors all exist; needs a hosted instance + seed proof |
| **Artifact handoff** | AWS keys + bucket (`OBJECT_STORE_SIGNING_SECRET`, S3 env) | Store + signed-URL code and IaC docs exist; cloud proof missing |
| **Transactional email** | `RESEND_API_KEY` (or SendGrid/Postmark/Mailgun) | Contracts exist; no sender wired into a customer flow yet |

### Gated behind OAuth app registration (more setup than a key)

| Feature | Needs | Notes |
| --- | --- | --- |
| **Sign-in (Google/Apple/etc.)** | Auth0/Clerk/Supabase/Firebase/Cognito credentials + `AUTH_SESSION_SECRET`, callback URLs | `production-user-auth` gate: evidence-missing. DESIGN.md open question — recommend Clerk or Auth0 to get Google+Apple in one integration |
| **Calendar/email import** | Google OAuth client (Calendar/Gmail metadata), Microsoft Graph app | The core product promise ("watches your calendar"). Consent + data-boundary copy already designed in `onboardingCalendar.ts` |
| **CRM lifecycle (business persona)** | Per-CRM keys (Salesforce, HubSpot, Shopify, …) | ~20 contract-only adapters; defer until consumer loop is proven |
| **Live AI chat** | Any one chat-provider key (Anthropic/OpenAI/…) | Deterministic local chat works today; live chat is polish, not a blocker |

### Hard-blocked (no key will fix; needs partnerships)

- **Direct retail ordering** (Walgreens/CVS/FedEx/Walmart/Staples/Office Depot) — no certified
  public APIs; status `blocked`. The manual handoff + deep-link flow is the right design and
  should stay.
- **Live vendor quotes** — same partnerships; public price observations with disclaimers remain
  the honest substitute.
- **Physical print certification** — requires real print runs and color-proof evidence.
- **Payments** (Stripe etc.) — keys are obtainable, but charging is correctly kept off until
  ordering exists; admin safety controls already keep live orders closed.

### Underbuilt vs. best practice (no keys required — just building)

1. **Event queue persistence** — one ephemeral opportunity at a time today; the hub vision needs
   a stored, dated queue with snooze/dismiss history.
2. **Occasion/template gallery** — every competitor's entry point; we have 4 styles × 4 tones
   but no browsable gallery surface.
3. **Photo upload on cards** — table stakes for Moonpig/Canva-class products; current renderer
   is SVG-template-only. Needs an upload → crop → panel placement flow (local-first: object
   URLs now, artifact store later).
4. **Card history** — finished cards vanish after export.
5. **Explicit proof approval** — fulfillment unlock is inferred from validation; make it a tap.
6. **PWA manifest/service worker** — see Section 4.
7. **SEO surface** — the SPA has zero indexable pages; occasion pages are the growth engine.
8. **Real telemetry** — Datadog/BetterStack contracts exist; before launch, even minimal
   privacy-safe analytics (page → CTA → first card funnel) is needed to act on the landing page.

## Suggested sequence

1. **Now (no keys):** occasion-first hub + persisted event queue + bottom tab bar + PWA manifest.
2. **One key:** deploy card_gen with `ANTHROPIC_API_KEY`, set `VITE_CARD_GEN_URL` → "AI-drafted
   in seconds" becomes true and the landing page hero is honest.
3. **Landing site:** static occasion pages + hero per Section 2 (decide Next.js migration here).
4. **Hosted Postgres + auth broker** → cross-device sync becomes the upgrade moment.
5. **Google Calendar OAuth** → the full product promise; everything before it still works without.
