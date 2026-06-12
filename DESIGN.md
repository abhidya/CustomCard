# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-12
- Primary product surfaces: customer landing/home, event import, card studio, people/notes, print handoff, business landing, admin operations, adapter readiness.
- Evidence reviewed: `webapp/App.tsx`, `webapp/views/HomeView.tsx`, `webapp/views/EventsView.tsx`, `webapp/views/StudioView.tsx`, `webapp/views/BusinessLandingView.tsx`, `webapp/routePolicy.ts`, `webapp/ui.tsx`, `webapp/panelMediaAdapter.ts`, `webapp/styles.css`, `src/styles.css`, `docs/ui-ux-walkthrough.md`, `docs/cloudflare-workers-ai-setup.md`, `docs/competitor-card-asset-categories.md`, `docs/evidence/*`, `docs/evidence/generated-card-comparisons/*`, live browser screenshots at `http://127.0.0.1:5173/` and `/?view=studio`, NN/g action/object proximity guidance, and Material Design 3 button hierarchy guidance.
- Verification evidence: `npm run test -- --run tests/frontend-architecture.test.ts tests/customer-shell-ssr.test.tsx tests/app-smoke.test.ts` passed on 2026-06-12 with 48 tests; `npm run build` passed with the existing Vite chunk-size warning. Browser DOM checks found the Studio setup state has no fixed proof dock, no proof CTA, and no panel editor before draft/review; template review reveals inline proof navigation plus four panel tabs; print handoff owns the fixed CTA; mobile Studio has no horizontal overflow at 390px.

## Brand
- Personality: warm, careful, private, useful, and tactile. The product should feel like a calm stationery desk with software discipline underneath.
- Trust signals: explicit review before checkout, no live-order claim without proof, privacy notes near account/calendar actions, clear print/export proof status, and honest Walgreens handoff wording.
- Avoid: placeholder recipient copy in polished marketing surfaces, fake sample data pretending to be user data, dense AI ornament, fake readable text inside generated images, stock-photo sentimentality, adapter/provider jargon in customer flows, and production claims without evidence.

## Product goals
- Goals: help a customer find or create a card-worthy moment, add relationship context, generate/edit a personal 5x7 folded card, review all panels, and export or continue to Walgreens with clear boundaries.
- Non-goals: live retail ordering, live payments, unreviewed outreach, opaque AI generation, hidden calendar ingestion, or claiming production integrations before gates are proven.
- Success signals: first screen explains value in under five seconds, user can start from occasion or invite, studio makes proof/edit/review obvious, print handoff separates CustomCard export from Walgreens checkout, and operator/admin surfaces stay gated.

## Personas and jobs
- Primary personas: consumer sending personal cards; returning customer managing card history and people notes; small business/operator reviewing lifecycle card opportunities; admin validating production readiness.
- User jobs: choose or import an event, personalize a card, generate/edit copy and art, approve a proof, save/export print files, compare print options, preserve useful people notes, review business lifecycle opportunities safely.
- Key contexts of use: mobile first-run creation, desktop studio review, local no-cost reviewer demo, B2B operator evaluation, admin readiness review.

## Information architecture
- Primary navigation: desktop top nav for Create, My cards, People, Settings; admin nav only for admin users; business landing through business route; print and event import are stages within Create.
- Core routes/screens: landing/home, invite/calendar import, card studio, people/notes, my cards/history, print handoff, settings/privacy, business landing, admin ops/adapters/legal.
- Content hierarchy: product value and card preview first; occasion/invite start second; examples/trust notes third; provider readiness and operational gates only in admin/business contexts.
- Current UX guardrail: small screens must keep a visible customer navigation recovery path while Studio setup stays focused on details first. Do not reintroduce a fixed proof CTA on Studio; the fixed dock belongs to print handoff after a proof exists.

## Design principles
- Product proof first: show a real card, proof, queue, or handoff state instead of generic marketing illustration.
- Empty states teach, never impersonate data: examples must be explicitly examples, not preloaded user identity or fake moments.
- Deterministic text, generated art: exact customer-visible wording belongs in app overlays/export SVG, not inside AI-generated raster art.
- One primary action per stage: landing starts card/import; studio reviews/generates; print exports/continues; admin rows ask for evidence.
- Evidence honesty: local/demo paths must say what is local, gated, estimated, or external.
- Mobile recovery: customer must always have an obvious way back to Create, My cards, People, and Settings on small screens.
- Action proximity: primary actions must stay near the object or stage they act on. Studio actions generate or reveal the draft near the details form; proof navigation appears inline only after AI generation starts or the user explicitly starts template review.
- Tradeoffs: current warm stationery brand gives strong emotional fit but can drift into beige monotony; keep accent contrast, proof states, and product imagery doing real work.

## UI/UX Review Findings
- Strength: current `webapp` landing is clearer than old sidebar evidence screenshots. First viewport now has brand, account actions, occasion/product value, two start actions, and an actual 5x7 card preview.
- Strength: studio view correctly leads with proof preview, panel tabs, account-gated AI generation, editable fields, and generation stages. This supports review-before-print.
- Strength: trust copy is specific: free to create, Walgreens handles payment/final checkout, calendar is optional, saved personal details are editable/deletable.
- Issue P1: hero/product examples still expose placeholder copy such as "Card for Someone important." Replace public-facing default cards with polished examples like "Birthday for Maya" or neutral copy like "Start with their moment."
- Issue P1: Studio previously showed "Continue to proof checks" in the fixed customer dock before any draft or review surface existed. Keep this fixed: no fixed Studio proof dock, no proof CTA before generation/review, and no live text placement preview while the user is still entering setup details.
- Issue P1: mobile navigation recovery must remain visible below 600px. The old `docs/evidence/customcard-mobile.png` shows an older nav pattern and should not be treated as current proof.
- Issue P1: current app screenshots in `docs/evidence/customcard-*.png` are stale and show the older sidebar/grid UI. Recapture current landing, studio, print, and mobile screens after image updates.
- Issue P2: example card gallery is useful but visually repetitive because fallback examples are generated from the same SVG motif system. Add distinct occasion art assets so the gallery proves range.
- Issue P2: generated provider contact sheets show fake lettering, over-busy borders, low-contrast interior text zones, and occasional people/faces. Tighten prompts and QA around text-free background art.
- Issue P2: B2B landing has good claim discipline but needs one stronger workflow/product visual that shows lifecycle queue plus proof review, not only a card preview.

## Visual language
- Color: warm paper base with terracotta primary, sage/green secondary, ink black, cream surfaces, and status accents. Avoid letting every section collapse into the same cream/tan weight; use product art, white space, and controlled status colors for contrast.
- Typography: serif display for emotional stationery moments; clean sans for controls, forms, proof labels, and admin surfaces. No hero-scale type inside compact panels.
- Spacing/layout rhythm: generous landing rhythm; dense but scannable studio/admin panels; stable 5x7 aspect ratio for card previews; no horizontal overflow.
- Shape/radius/elevation: existing webapp token system uses `--radius-s`, `--radius`, and `--radius-l`; keep cards soft but purposeful, and avoid nested decorative cards where a section layout is enough.
- Motion: small reveal/hover motion is acceptable; respect reduced-motion; no motion-critical interaction.
- Imagery/iconography: lucide icons for controls/status. Product imagery should be generated bitmap/card art or actual product/mockup photography. SVG `PanelArt` remains the export/proof source of truth; bitmap generation supplies background art and marketing assets.

## Components
- Existing components to reuse: `PanelArt`, `FoldedCardPreview`, `Chips`, `Field`, `Step`, `Toast`, `ImportSection`, `HomeView` occasion chips, `FeaturedCategoryCard`, `StudioView` proof/panel tabs, `PrintView` proof approval/handoff controls, admin readiness panels.
- New/changed components: Studio setup preview, gated inline Studio proof actions, mobile customer nav/menu, polished default example-card data, current screenshot/evidence capture set, product hero image slot, B2B workflow visual, generated-art QA badges for gallery/admin curation.
- Variants and states: signed out/signed in, local-only/live-gated, no invite/imported moment, account-required AI, AI loading/panel-ready/stale, proof not approved/approved, download ready, checkout gated, gallery candidate/draft/approved/featured.
- Token/component ownership: repo-local CSS in `webapp/styles.css` plus legacy `src/styles.css`; do not add a new design-system dependency unless the existing token contract cannot support the change.

## Image Needs and Prompts
- Prompt contract: generated card art is background/artwork only. CustomCard overlays exact headlines/body text with `buildPanelSvg` and export logic. Unless producing a product mockup, all panel-art prompts must ban readable text, letters, logos, watermarks, QR codes, caption plaques, and fake signatures.
- Global negative prompt for card-panel art: `readable text, letters, words, numbers, fake calligraphy, signature, logo, watermark, QR code, barcode, brand mark, caption plaque, text box, product photo, 3D mockup, busy wallpaper, dense repeated icons, faces, hands, photoreal people, cropped bodies, distorted anatomy, low contrast center, decorations crossing the central text-safe zone`.
- Landing hero product image: `Photoreal editorial product shot of one premium folded 5x7 greeting card standing on warm cream paper, soft natural window light, subtle terracotta and sage accents, visible paper grain, one matching envelope partly behind it, no readable text on the card, no brand logos, no hands, no clutter, shallow depth of field, calm modern stationery desk, horizontal 16:10 composition, leave left side negative space for headline overlay.`
- Default hero/card front art: `Portrait 5:7 flat greeting-card artwork layer, warm ivory paper, terracotta and sage botanical corner motif, one loose branch and two small blossoms wrapping the lower-right edge, large clean blank text-safe area in upper-left and center, subtle letterpress texture, premium modern stationery, no text, no letters, no logo, no people, no mockup.`
- Birthday gallery front: `Portrait 5:7 greeting-card background art, joyful but refined birthday design, warm yellow candle-glow dots and soft terracotta ribbon shapes around edges, cream center left open for app text, playful letterpress texture, sparse composition, no balloons crowding text area, no readable text, no people, no logos.`
- Thank-you / small-business front: `Portrait 5:7 premium thank-you card background, controlled citrus-and-leaf corner illustration, sage leaves, one warm yellow citrus slice, editorial negative space through center, subtle paper fiber, local-shop warmth without storefronts or people, no text box, no readable text, no logos, no dense fruit pattern.`
- Graduation / milestone front: `Portrait 5:7 graduation card background, deep navy and soft gold accents, one simple graduation cap silhouette and a clean arc of small celebratory marks near top edge, ivory central text-safe field, premium print texture, no school logo, no readable text, no faces, no crowd, no dense icon wallpaper.`
- Sympathy front: `Portrait 5:7 sympathy card background, quiet ivory paper, soft gray-green botanical line art, one delicate branch along lower edge, large calm blank center, low-saturation palette, gentle premium stationery, no text, no religious symbols unless user asks, no people, no heavy ornament.`
- Wedding/anniversary front: `Portrait 5:7 wedding or anniversary card background, elegant ivory paper, sage vines and small cream blossoms framing two opposite corners, faint gold line detail, generous blank center for names, refined modern stationery, no readable text, no rings, no couple, no fake script.`
- Photo-milestone template art: `Portrait 5:7 card layout background with one large blank photo frame and three small blank rounded photo placeholders, ivory paper, subtle navy and gold graduation accents, crop-safe masks, no actual faces or photos, no text, no logos, clean export-ready layout.`
- B2B lifecycle workflow visual: `Clean product UI illustration for a customer lifecycle card workflow, showing a review queue, approval checklist, and small 5x7 proof preview as abstract interface blocks, warm CustomCard paper palette with sage and terracotta accents, no readable text, no real customer data, no logos, no CRM brand marks, horizontal 16:10 composition.`
- Print handoff / fulfillment visual: `Photoreal product shot of printed 5x7 greeting-card panels, a tidy envelope, and a phone showing an abstract checkout-like screen with unreadable placeholder blocks, warm cream desk, no Walgreens logo, no payment details, no readable text, no hands, calm natural light, horizontal 4:3 composition.`
- Admin gallery curation empty state: `Small square illustration of three stacked card-front thumbnails with checkmarks and privacy shield motif, warm paper, sage/terracotta accents, no readable text, no logos, transparent or plain cream background, simple enough for a compact admin panel.`

## Accessibility
- Target standard: WCAG 2.1 AA intent for contrast, keyboard operation, labels, focus flow, and reduced-motion support.
- Keyboard/focus behavior: native buttons/inputs/selects remain reachable; skip link remains available; carousel/category controls must be manually controlled and labeled.
- Contrast/readability: protect small copy on warm cream backgrounds; generated art must not reduce contrast behind deterministic text overlays.
- Screen-reader semantics: section headings and button names are strong in current webapp; card images need useful alt text tied to panel labels, not visual-only labels when content matters.
- Reduced motion and sensory considerations: existing reveal/pulse states must respect `prefers-reduced-motion`; no auto-advancing galleries.

## Responsive behavior
- Supported breakpoints/devices: 320px mobile through wide desktop.
- Layout adaptations: landing hero stacks with card visual first on mobile; studio collapses to one column below 980px; forms collapse below 760px; topbar wraps below 760px.
- Touch/hover differences: touch targets should stay at least 40px high; hover-only card elevation cannot be the only affordance.
- Required fix: below 600px, restore customer navigation through bottom tabs or compact menu because `shouldRenderCustomerNav` currently removes it.

## Interaction states
- Loading: AI generation should show copy/art/proof stages and panel-level progress; import preview can debounce with a quiet checked/processing state. Do not switch Studio into proof navigation until generation has started or the user has explicitly chosen template review.
- Empty: landing can show polished examples; My cards/People should invite creation or notes without fake data; admin gallery should separate no candidates from no approved cards.
- Error: show sign-in required, calendar connection failure, provider gate, proof issue, checkout validation issue, or save failure in customer language.
- Success: show imported moment ready, AI artwork ready, proof approved, files downloaded, note saved, and gallery card featureable.
- Disabled: direct order/payment remains disabled or absent until evidence gates exist; AI generation account gate explains sign-in without implying calendar/email access. Disabled or premature proof CTAs should be absent rather than promoted as the main call to action.
- Offline/slow network: deterministic local card creation and print package export remain usable without live provider calls.

## Content voice
- Tone: plain, warm, confidence-bounded, and specific.
- Terminology: customer sees create, moment, invite, calendar, card, proof, print, Walgreens checkout, people notes, saved cards; admin sees adapters, readiness, gates, runtime, evidence.
- Microcopy rules: never say "vendor handoff" in customer flows; avoid "Someone important" in public-facing hero/example cards; avoid "AI magic" framing where proof/review matters.

## Implementation constraints
- Framework/styling system: React 19, Vite, TypeScript, Clerk, lucide-react, repo-local CSS.
- Design-token constraints: extend `webapp/styles.css` token contract before adding new systems; keep legacy `src/styles.css` compatibility in mind while admin code still uses it.
- Image-generation constraints: Cloudflare image default targets portrait panel art with long edge capped at 2048; final export remains 1500 x 2100. Prompts must preserve central text-safe zones and keep typography out of generated rasters.
- Performance constraints: landing and studio should stay fast in local/static reviewer mode; do not ship heavy third-party visual assets or provider SDKs into customer shell.
- Compatibility constraints: tests run with Vitest/headless browser flows; local demo must pass without credentials.
- Test/screenshot expectations: keep smoke/SSR tests passing; recapture desktop/mobile screenshots after nav/image changes; add a visual check for no text-safe-zone obstruction in generated gallery art.
- Admin cost metrics: derive from resolved AI/provider config, provider-sourced usage surfaces where available, and provider usage ledger contracts; show aggregate budgets/source labels without secret env values or live provider calls.

## Admin featured-card curation workflow
- User stories: admin can promote generated cards into public-safe examples; admin can edit or regenerate card-front copy; admin can edit public title/caption separately; admin can approve, feature, unfeature, or archive cards.
- Happy path: candidate -> gallery draft -> edit/regenerate card text -> update front preview -> review permission/privacy/text-fit/public copy -> approve -> feature on the public landing gallery.
- Sad paths: no candidates, missing gallery repository, missing front preview, stale preview after text edits, sensitive occasion review, text too long, missing permission/privacy/public-copy checks, save failure, permission revocation/unfeature.
- Publishing rule: a card is not featureable until it has a category, title, caption, front preview, text-fit check, privacy review, permission confirmation, and public-copy approval.
- Added image rule: public featured cards must use art assets that pass no-fake-text, no-logo, no-people-without-consent, and text-safe-zone checks.

## Open questions
- [ ] Gallery owner / impact: Which generated examples are approved for public landing use, and which are only internal benchmark evidence?
- [ ] Brand owner / impact: Should the landing hero use a photoreal product shot, current SVG proof preview, or both?
- [ ] Fulfillment owner / impact: How prominently can Walgreens appear before live checkout/certification evidence is attached?
- [ ] Auth owner / impact: Which production auth provider ships first: direct Google/Apple, Clerk, Auth0, or another broker?
