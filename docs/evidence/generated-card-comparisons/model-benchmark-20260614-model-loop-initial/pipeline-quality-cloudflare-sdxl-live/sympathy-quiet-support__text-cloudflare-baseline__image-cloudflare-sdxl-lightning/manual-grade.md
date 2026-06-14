# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (@cf/meta/llama-3.1-8b-instruct-fast)
- Image: Current Cloudflare SDXL Lightning baseline (@cf/bytedance/stable-diffusion-xl-lightning)
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: ./contact-sheet.png

## Scores

- Product quality score /100: 42
- Prompt/pipeline contract score /100: 88
- Tier: D, rough internal draft only
- Raw dimension sum /100: 58
- Applied cap: 55 cap for body copy that is too small or low-contrast in visible previews; final score lowered further for inside-left unreadability and generic art-source fit.

## Dimension Scores

- Prompt adherence and panel contract /15: 14
- Occasion and user-story fit /15: 8
- Copy quality and emotional calibration /15: 13
- Visual composition and print readiness /15: 4
- Theme coherence across panels /10: 5
- Text/name fidelity strategy /10: 6
- Domain/cultural sensitivity /10: 8
- Commercial usefulness /5: 0
- Originality and taste /5: 0

## Panel Notes

- Best panel: front. It has a clear cover headline and a quiet monochrome mood, though it reads as generic mountain/landscape stationery rather than practical support for grief.
- Worst panel: inside-left. The artwork is visually chaotic, the text sits over busy black-and-white patterning, and the body is not comfortably readable.
- Blocking failures: inside-left unreadable; inside-right body copy is tiny and low-contrast; back body copy is small; visual theme is mostly generic mountains/ornament rather than meals/rides/calls/silence; no panel feels like a customer-ready premium sympathy card.

## Next Change

- Smallest prompt/config fix: put text-safe composition first for SDXL, require a plain opaque central body field before any art direction, and force practical-care objects to the lower edge only.
- Prompt-side or model-capability-side: mixed. The prompt can improve text-field placement, but SDXL is drifting to generic landscape/ornamental panels instead of the practical-care concept, so the image model remains a quality risk.
- Estimated cost per 4-panel card: internal cost gate reserved 9 cents for this benchmark request; provider-reported actual spend was 0 cents in the local payload accounting.
