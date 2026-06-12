# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-12
- Surface walkthrough and demo-debt audit: `docs/ui-ux-walkthrough.md`
- Primary product surfaces: customer web app, admin operations panel, adapter readiness panel, mobile customer shell.
- Evidence reviewed: `src/App.tsx`, `src/styles.css`, `src/providerCatalog.ts`, `src/providerOps.ts`, `src/providerOperations.ts`, `src/adminPortal.ts`, `src/printerPricing.ts`, `docs/platform-expansion-design.md`, `tests/app-smoke.test.ts`.

## Brand
- Personality: useful, calm, private, and practical.
- Trust signals: explicit confirmation before checkout, visible privacy boundaries, print-ready proof status, clear ETA/cost caveats.
- Avoid: adapter/vendor jargon in customer flows, production claims without live evidence, decorative marketing screens before the usable product.

## Product goals
- Goals: help a customer sign in, import calendar/email signals, find card-worthy events, generate a card, and pick the cheapest shipped or fastest nearby pickup path.
- Non-goals: claiming live OAuth, live AI generation, live vendor quotes, direct retail ordering, or payment processing before those adapters have credentials and proof.
- Success signals: customer can understand the next event, card state, fulfillment recommendation, and required confirmation without reading provider internals.

## Personas and jobs
- Primary personas: consumer sending personal cards; business operator sending lifecycle cards; admin/reviewer validating production readiness.
- User jobs: import events, review suggested cards, approve copy/art, compare delivery/pickup options, hand off or order safely.
- Key contexts of use: mobile-first personal workflow, desktop admin review, local no-cost reviewer demo.

## Information architecture
- Primary navigation: customer home, events, card studio, memories, fulfillment, admin, adapters.
- Core routes/screens: customer start/import screen, event opportunity queue, card editor, fulfillment recommendation, admin readiness, adapter inventory.
- Content hierarchy: customer intent first; event and fulfillment recommendations second; provider readiness only in admin/adapters.

## Design principles
- Customer abstraction first: customers see outcomes such as "fastest pickup" and "cheapest shipped", not provider adapters or credential gates.
- Evidence honesty: local/demo states must say when prices are public observations and not live quotes.
- Tradeoffs: keep local MVP free and testable while designing the production path as provider-gated contracts.

## Visual language
- Color: quiet neutral app chrome with restrained green, blue, amber, and red status accents.
- Typography: compact operational type; no hero-scale text inside panels.
- Spacing/layout rhythm: dense grids with stable min/max widths and no horizontal overflow at mobile sizes.
- Shape/radius/elevation: 7-8px controls and cards, low elevation, no nested decorative cards.
- Motion: minimal; state changes should be direct and not depend on animation.
- Imagery/iconography: lucide icons for actions and status; no SVG hero illustration for the app shell.

## Components
- Existing components to reuse: `StatusChip`, `Metric`, `SegmentedControl`, `AdapterMiniList`, panel previews, pricing option rows.
- New/changed components: customer start/import module, customer event queue, customer fulfillment recommendation cards, Studio AI card generation control, admin provider usage-cost metrics.
- Variants and states: signed out/signed in, event ready/needs detail, public-price/confirmation-required, local fallback/live gated.
- Token/component ownership: repo-local CSS in `src/styles.css`; no new design-system dependency.

## Accessibility
- Target standard: WCAG 2.1 AA intent for contrast, keyboard operation, labels, and focus flow.
- Keyboard/focus behavior: buttons and selects remain native; skip link remains available.
- Contrast/readability: dark customer chat and status colors require readable text contrast.
- Screen-reader semantics: sections use headings and labels; recommendation groups need clear names.
- Reduced motion and sensory considerations: no motion-critical interaction.

## Responsive behavior
- Supported breakpoints/devices: 320px mobile through desktop review screens.
- Layout adaptations: customer start, event, and fulfillment grids collapse to one column on mobile.
- Touch/hover differences: touch targets remain at least 40px high.

## Interaction states
- Loading: AI card generation shows copy and artwork progress for the four 5x7 panels; future live imports need loading rows.
- Empty: show import actions and sample/manual event path.
- Error: show missing detail, confirmation-required copy, or provider spend blocking reason instead of provider errors.
- Success: show event ready, print-safe card, panel-level artwork readiness, and recommended fulfillment option.
- Disabled: direct checkout/order buttons stay absent until live quote/payment/order gates exist.
- Offline/slow network: local demo path remains usable without network.

## Content voice
- Tone: plain, direct, and confidence-bounded.
- Terminology: customer sees sign in, import, event, card, AI card generation, artwork panels, pickup, shipped, ETA, total; admin sees adapters, env, gates, runtime.
- Microcopy rules: avoid "vendor handoff" and adapter names in the customer home unless explaining a confirmation requirement.

## Implementation constraints
- Framework/styling system: React, Vite, TypeScript, repo-local CSS.
- Design-token constraints: existing CSS variables are minimal; extend existing classes before adding broad abstractions.
- Performance constraints: keep startup local and static; no live provider SDK bundles in the customer shell.
- Compatibility constraints: tests run with headless Chrome and Vitest; local demo must pass without credentials.
- Test/screenshot expectations: smoke tests prove no horizontal overflow and customer-first text/actions.
- Admin cost metrics: derive from resolved AI/provider config, provider-sourced usage surfaces where available, and provider usage ledger contracts; show aggregate budgets, source labels, and estimates without secret env values or live provider calls.

## Open questions
- [ ] Which production auth provider should be first live: Google OAuth directly, Apple directly, or a broker such as Clerk/Auth0?
- [ ] What customer location source is allowed for closest pickup: browser geolocation, typed ZIP, account address, or calendar location inference?
- [ ] Which fulfillment partner can provide certified live quote/order APIs first?
