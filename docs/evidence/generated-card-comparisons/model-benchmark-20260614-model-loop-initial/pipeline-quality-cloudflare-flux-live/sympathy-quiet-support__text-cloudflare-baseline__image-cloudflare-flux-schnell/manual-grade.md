# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (@cf/meta/llama-3.1-8b-instruct-fast)
- Image: Cloudflare FLUX.1 Schnell (@cf/black-forest-labs/flux-1-schnell)
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: ./contact-sheet.png

## Scores

- Product quality score /100: 32
- Prompt/pipeline contract score /100: 68
- Tier: D, route available but not customer-facing
- Raw dimension sum /100: 52
- Applied cap: 40 cap for repeated physical open-book/mockup output instead of flat card panels.

## Dimension Scores

- Prompt adherence and panel contract /15: 7
- Occasion and user-story fit /15: 6
- Copy quality and emotional calibration /15: 9
- Visual composition and print readiness /15: 6
- Theme coherence across panels /10: 7
- Text/name fidelity strategy /10: 7
- Domain/cultural sensitivity /10: 7
- Commercial usefulness /5: 0
- Originality and taste /5: 3

## Panel Notes

- Best panel: back. It is the cleanest and most readable panel, though it still shows book/box props instead of a flat card design.
- Worst panel: front. It renders a physical open-book scene with phone/blank card/cloth props and a bright landscape mood, which breaks the flat-card contract and the quiet sympathy tone.
- Blocking failures: repeated open-book/tabletop mockups; bright scenery; literal phone/box props; generic practical-help imagery; inside-right copy uses "please don't hesitate to reach out", which conflicts with the user's "No cliches" request.

## Next Change

- Smallest prompt/config fix: for FLUX, move "flat 2D card panel, no book, no tabletop, no page, no device, no product mockup" to the first prompt line and remove object terms that invite literal phone/book/table scenes.
- Prompt-side or model-capability-side: mixed, leaning model-capability/control. The route can render coherent images, but it ignores no-mockup constraints under this story.
- Estimated cost per 4-panel card: internal cost gate reserved 9 cents for this benchmark request; provider-reported actual spend was 0 cents in the local payload accounting.
