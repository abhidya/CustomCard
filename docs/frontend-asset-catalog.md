# Frontend Asset Catalog And Website Asset Roadmap

## Scope

Reviewed the React/Vite customer website and asset folders:

- Public brand and PWA assets in `public/`
- Marketing, product, and template assets in `public/generated/`
- Mobile app icon assets in `apps/mobile/assets/`
- Current visual evidence screenshots in `docs/evidence/`
- Frontend usage in `webapp/App.tsx`, `webapp/views/*`, `webapp/cardTemplates.ts`, `webapp/ui.tsx`, and `webapp/styles.css`

The current brand direction is clear: warm, careful, private, tactile stationery with software discipline underneath. The main weakness is range. Many assets feel like the same cream-paper, botanical, terracotta/sage world, so the website proves taste but not breadth.

## Current Asset Catalog

### Brand And App Icons

| Asset | Size | Current use | Notes |
| --- | ---: | --- | --- |
| `public/icon.svg` | 0.6 KB | README, vector source | Small, useful source mark. |
| `public/icon-192.png` | 192 x 192, 37.2 KB | Wordmark glyph, manifest | Looks polished and recognizable. |
| `public/icon-512.png` | 512 x 512, 245.2 KB | PWA maskable icon | Large for a flat-ish icon; consider recompressing. |
| `public/apple-touch-icon.png` | 180 x 180, 32.9 KB | iOS icon | Fine. |
| `public/customcard-ai-button-logo.png` | 128 x 128, 17.5 KB | AI CTA logo in Studio | Same mark, useful but a little redundant with app icon. |
| `public/customcard-oauth-logo.png` | 120 x 120, 15.4 KB | OAuth/provider identity | Same mark, fine. |
| `apps/mobile/assets/icon.png` | 13.9 KB | Mobile app icon | Lightweight. |
| `apps/mobile/assets/adaptive-icon.png` | 12.4 KB | Android adaptive icon | Lightweight. |
| `apps/mobile/assets/splash-icon.png` | 4.6 KB | Splash | Lightweight. |

### Fonts

| Asset | Size | Current use | Notes |
| --- | ---: | --- | --- |
| `public/fonts/fraunces-latin-var.woff2` | 65.8 KB | Display type | Good for stationery warmth, but current CSS overrides display to Instrument Sans in all themes. |
| `public/fonts/instrument-sans-latin-var.woff2` | 29.2 KB | Body and display in active themes | Clean and practical. Could use more contrast with a restrained display role. |

### Customer Website Product Assets

| Asset | Size | Current use | Notes |
| --- | ---: | --- | --- |
| `public/generated/landing-hero-product.webp` | 1586 x 992, 31.6 KB | Home hero, Studio setup | Strongly compressed and tasteful, but the blank card does not prove CustomCard output. It reads premium, not specific. |
| `public/generated/print-handoff-fulfillment.webp` | 1448 x 1086, 104.9 KB | Print handoff page | Good context shot, but still generic stationery. Phone UI is intentionally abstract. |
| `public/generated/b2b-lifecycle-workflow.webp` | 1568 x 1003, 98.9 KB | Available but not wired into `BusinessLandingView` | Best candidate for B2B narrative, but current B2B hero uses an in-code queue/proof mockup instead. |
| `public/generated/admin-gallery-empty.webp` | 1254 x 1254, 178.3 KB | Admin card gallery empty state | On-brand and clear. Could be smaller for an empty-state illustration. |

### Template And Example Card Assets

| Asset | Size | Current use | Notes |
| --- | ---: | --- | --- |
| `public/generated/card-birthday.jpg` | 1024 x 1408, 41.0 KB | Home examples, Studio template, hero peek | Light and efficient, but very sparse. More "background" than memorable card. |
| `public/generated/card-graduation.jpg` | 1024 x 1408, 72.5 KB | Home examples, Studio template | Nice color contrast, but abstract enough that graduation reads mostly from the label. |
| `public/generated/card-wedding-anniversary.jpg` | 1024 x 1408, 134.5 KB | Home examples, category fallback | Polished, but wedding and anniversary currently share this one asset. |
| `public/generated/card-thank-you.jpg` | 1024 x 1408, 95.6 KB | Home examples, Studio template | Strongest simple card asset: citrus is distinct and easy to recognize. |
| `public/generated/card-sympathy.jpg` | 1024 x 1408, 32.8 KB | Home examples, Studio template | Tasteful but almost too blank at thumbnail size. |
| `public/generated/card-friendship.jpg` | 1024 x 1408, 79.2 KB | Home examples, Studio template | Pretty, but blue ribbon/star language feels closer to celebration than friendship. |
| `public/generated/card-default-botanical.webp` | 946 x 1662, 119.1 KB | Custom fallback, B2B warranty moment | On-brand fallback. It reinforces the same botanical lane. |
| `public/generated/card-photo-milestone.webp` | 1062 x 1481, 97.1 KB | Studio photo milestone template | Useful template type, but too ornate and template-like compared with the calm product UI. |

### Legacy Or Heavy Print Panel Assets

| Asset | Size | Current use | Notes |
| --- | ---: | --- | --- |
| `public/generated/sympathy-practical-care-front.png` | 1500 x 2100, 1995.7 KB | Not found in current webapp usage | Full print-resolution panel; too heavy to ship unless intentionally linked. |
| `public/generated/sympathy-practical-care-inside-left.png` | 1500 x 2100, 2604.6 KB | Not found in current webapp usage | Same. |
| `public/generated/sympathy-practical-care-inside-right.png` | 1500 x 2100, 2869.1 KB | Not found in current webapp usage | Same. |
| `public/generated/sympathy-practical-care-back.png` | 1500 x 2100, 1832.4 KB | Not found in current webapp usage | Same. |

These four PNGs are print-quality artifacts, not web marketing assets. If they need to remain publicly fetchable, add a reason in the file name or documentation. Otherwise move them out of the shipped public catalog or create compressed web previews.

### Evidence Screenshots

| Asset | Size | Purpose |
| --- | ---: | --- |
| `docs/evidence/customcard-desktop.png` | 495.8 KB | Current desktop landing evidence |
| `docs/evidence/customcard-mobile.png` | 198.7 KB | Current mobile landing evidence |
| `docs/evidence/customcard-studio.png` | 520.2 KB | Studio evidence |
| `docs/evidence/customcard-handoff.png` | 532.5 KB | Print handoff evidence |
| `docs/evidence/customcard-customer-panel.png` | 251.8 KB | Customer panel evidence |
| `docs/evidence/customcard-customer-mobile-panel.png` | 100.5 KB | Mobile customer panel evidence |
| `docs/evidence/customcard-admin-panel.png` | 242.6 KB | Admin panel evidence |

These are useful for documentation, not production UI. Keep them out of runtime imports.

## Current Usage Map

- Home hero: `landing-hero-product.webp` plus `card-birthday.jpg` as a partially hidden peek.
- Home examples: six built-in category cards from `cardImageByCategory`, or admin-featured cards from `/api/public/featured-cards`.
- Studio template picker: six templates from `webapp/cardTemplates.ts`, plus the photo milestone template.
- Studio setup/product context: `landing-hero-product.webp`.
- Print handoff: `print-handoff-fulfillment.webp`.
- B2B landing: currently uses an in-code lifecycle queue and `PanelArt`; the standalone `b2b-lifecycle-workflow.webp` is not currently referenced by the frontend.
- Admin gallery empty state: `admin-gallery-empty.webp`.
- Brand: `icon-192.png` in the app wordmark; related PNG marks in AI and OAuth surfaces.

## Visual Diagnosis

### What Is Working

- The product feels calm, private, and premium.
- The icon is ownable enough to anchor the app.
- The homepage first viewport has real product imagery instead of generic UI illustration.
- The print handoff asset supports the current proof-before-checkout story.
- Generated card backgrounds are mostly text-safe and avoid fake lettering.
- The code has a real asset path for admin-featured public examples, so the site can grow beyond the built-in examples.

### What Is Holding The Website Back

- The gallery is too visually repetitive. Birthday, thank-you, sympathy, wedding, and default fallback all live in a similar soft botanical/cream paper universe.
- The hero product image is beautiful but blank. It sells stationery taste more than CustomCard's actual promise: relationship-aware words plus editable print proof.
- Occasion coverage is too thin. Wedding and anniversary share one asset, and there is no dedicated get-well, condolence, baby, Mother's/Father's Day, apology, congratulations, or business/customer-retention visual.
- The B2B asset exists but the page still relies on mostly UI-shaped cards. The better B2B idea is a credible workflow visual that shows import, review, approval, and print proof in one glance.
- Several template assets look like background art rather than finished cards. That is good for text overlays, but the marketing gallery needs some finished example fronts with deterministic app text rendered into the proof.
- The active visual system risks beige/cream monotony. The current theme has green, terracotta, navy, and blue, but the first impression remains mostly cream.
- Heavy print PNGs live in `public/generated/`, where they can accidentally count as shipped web assets.

## Recommended Website Asset Direction

Make the website prove three things in the first 30 seconds:

1. CustomCard can make a tasteful card.
2. CustomCard can make a specific card for a real relationship.
3. CustomCard has a practical print/review workflow, not just pretty stationery.

The strongest next visual direction is "proofs with memory." Keep the warm stationery desk, but show actual 5 x 7 proofs with short, deterministic, readable app text layered by the product. Generated background art should remain text-free; the website mockups can show app-rendered text.

## Custom Art Card Contract

The previous "theme inventory" direction was too category-first. More occasions did not make the product feel more custom; it made it feel like a template aisle with nicer paper. A great CustomCard front should pass this contract before it is allowed into the website:

| Contract field | What it must do | Reject when |
| --- | --- | --- |
| Relationship | Names who the card is really for, not just the occasion. | It could be sent to any coworker, parent, friend, or customer. |
| Remembered object | Gives the art one concrete anchor: tomato twine, blue pencil marks, basil, foil casserole, coffee rings, sample swatches. | The only idea is balloons, hearts, caps, rings, flowers, stars, or confetti. |
| Emotional job | Says what the card is trying to do: pride, comfort, gratitude, repair, encouragement, celebration. | It only says "warm," "premium," or "heartfelt." |
| Art move | Chooses a material and composition: letterpress trellis, editorial still life, paper collage, margin annotations, low-saturation care package. | It reads like stock greeting-card background art. |
| Copy zone | Protects a deliberate area for app-rendered text. | The image model is asked to render words or the art crowds the message area. |
| Forbidden cliches | Lists what the card refuses to use. | The prompt has no negative taste boundary. |

Good examples to generate next:

- Dad's tomato garden birthday: tomato vines, twine, seed packet dates; avoid balloons and cake clipart.
- Maya's blue-pencil thesis: abstract annotations, library receipt, coffee ring; avoid caps as the whole concept.
- Lena watered the basil: windowsill basil, chipped watering can, one orange; avoid generic thank-you script.
- Foil-covered casserole sympathy: practical care still life; avoid lilies, crosses, sunset silhouettes.
- Two coffee rings apart: long-distance friendship through table marks and transit-line motion; avoid best-friend slogans.
- Client sample swatches: business anniversary with tactile account memory; avoid handshake icons and CRM dashboards.

## Better Asset Ideas To Add

### Priority 1 - Replace The Hero With A CustomCard-Specific Proof

Create a hero asset that shows a finished front proof, an inside panel edge, and an envelope. The front should include app-rendered text, not AI-raster text.

Brief:

> Photoreal editorial product shot of one premium folded 5 x 7 greeting card and matching envelope on a calm stationery desk. The card front shows a CustomCard-rendered proof with crisp readable overlay text, subtle botanical or ribbon artwork, visible paper grain, no brand logos, no hands, warm natural light, horizontal 16:10, with negative space for homepage copy.

Needed exports:

- `public/generated/hero-proof-desk.webp` - 1600 x 1000
- `public/generated/hero-proof-desk-mobile.webp` - 900 x 1100 crop
- Optional transparent card-only PNG/WebP for layered CSS motion.

### Priority 2 - Build A Distinct Occasion Shelf

Add one strong, clearly different asset per occasion. These should be 5 x 7 portrait, text-safe, and thumbnail-readable.

Needed assets:

| Occasion | Asset idea |
| --- | --- |
| Birthday | Not ribbons only. Try candle-light table, confetti edge, or illustrated cake slice with a quiet text field. |
| Graduation | Make the cap/diploma signal clearer without school logos. Navy/gold is good; add one recognizable graduation object. |
| Wedding | Separate from anniversary. Use formal florals, vellum, and subtle gold, with space for names. |
| Anniversary | Use rings? Avoid cliche if possible. Better: two interlocking paper ribbons or a shared-date keepsake motif. |
| Thank you | Keep citrus, but add a small-business/customer thank-you variant. |
| Sympathy | Keep minimal, but make it readable at thumbnail size with a gentle branch or soft gray-blue wash. |
| Friendship | Replace the blue ribbon with a more everyday signal: coffee mugs, long-distance map line, small stars, or two small notes. |
| Get well | Soft care package, tea, blanket texture, or sunlight by a window. |
| New baby | Gentle pattern, no faces. Use blanket fold, moon, tiny socks, or nursery shapes. |
| Apology / belated | Time motif, open note, or "late but sincere" visual without fake lettering. |
| Business thank-you | Cleaner, less sentimental: paper note, product memory token, package insert, or receipt-free customer appreciation card. |

### Priority 3 - Add Finished Example Cards, Not Only Backgrounds

The examples section should show a mix:

- Background-only templates for "start from this design."
- Finished proof examples for "this is what CustomCard makes."

Add 6 permission-safe demo cards with deterministic text and no private data:

1. Birthday for a project teammate.
2. Thank-you for a neighbor.
3. Graduation for a sibling.
4. Sympathy for practical support.
5. Anniversary for close friends.
6. Customer anniversary for a small business.

Each should export:

- Front proof image, 5 x 7 ratio, web preview around 1024 x 1434.
- Four-panel contact sheet for the detail view.
- Category metadata, public caption, and alt text.

### Priority 4 - Use The B2B Workflow Asset Or Replace It With A Product-Led One

The existing `b2b-lifecycle-workflow.webp` is good but decorative. The B2B landing would be stronger with a more product-specific workflow image:

- CSV/contact source on the left.
- Review queue in the center.
- Selected 5 x 7 proof on the right.
- Visible approval gate, suppression check, and print package status.
- No real customer data and no CRM logos.

Needed export:

- `public/generated/business-lifecycle-proof-flow.webp` - 1600 x 1000
- Optional mobile crop - 900 x 1100

### Priority 5 - Create A Small Product UI Screenshot Set

The current evidence screenshots are documentation-scale. Create production website assets that are composed for marketing use:

- Studio crop: details form plus proof preview.
- Print handoff crop: proof checks plus printer details.
- My cards crop: saved cards gallery with privacy-safe demo cards.
- Admin gallery crop: curation workflow, for operator/admin pages only.

These should be refreshed from the real app, not manually recreated.

### Priority 6 - Add Texture And Material Assets

The site could use a few small repeating or layered textures to make paper feel intentional without relying on beige blocks:

- Fine paper grain tile, transparent WebP or AVIF under 20 KB.
- Subtle deboss/letterpress shadow overlay for card previews.
- Edge/crop/safe-zone overlay asset or CSS treatment for proof education.
- Optional foil accent texture for premium template previews.

## Asset QA Rules

- Generated panel art must contain no readable text, letters, logos, QR codes, signatures, or fake labels.
- Marketing mockups may show readable text only when it is rendered by the app/export pipeline, not baked into generated artwork.
- Every card preview needs a 5 x 7 aspect ratio and a preserved text-safe zone.
- Use WebP or AVIF for marketing assets; reserve PNG for transparency or exact print artifacts.
- Keep homepage-critical assets under 150 KB each where possible.
- Use separate desktop and mobile crops for hero assets rather than relying on object-position hacks.
- Add alt text that explains the card or workflow, not just "image."
- Keep competitor images in `docs/evidence/competitor-card-examples/` as research-only references.

## Cleanup Opportunities

- Recompress `public/icon-512.png`; 245 KB is high for an app icon.
- Move or document the four `sympathy-practical-care-*.png` print artifacts if they are not intentionally public web assets.
- Prefer one format per card asset in active code. Today there are `.jpg`, `.webp`, and some `.png` variants for the same concepts.
- Wire `b2b-lifecycle-workflow.webp` into the B2B page only if it beats the current in-code queue/proof visual in a screenshot review. Otherwise replace it with the product-led flow asset above.
- Give wedding and anniversary separate images.

## Suggested Next Implementation Order

1. Generate or commission the new hero proof asset and mobile crop.
2. Create 8 to 12 distinct occasion template backgrounds.
3. Produce 6 finished public demo proof cards from the real render pipeline.
4. Update `webapp/cardTemplates.ts` and the Home examples data to separate templates from finished examples.
5. Replace or wire the B2B workflow asset.
6. Recompress or relocate heavy public PNGs.
7. Recapture `docs/evidence/customcard-*.png` after the frontend changes.
