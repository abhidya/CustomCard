# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare FLUX.1 Schnell selected, deterministic SVG fallback rendered
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 4
- Prompt/pipeline contract score /100: 72
- Tier: D
- Dimension raw sum before route-failure/user-visible cap: 63/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 11
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 9
  - Theme coherence across panels /10: 8
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 4
  - Commercial usefulness /5: 0
  - Originality and taste /5: 3
- Hard failure caps triggered: user-calibrated visible rejection near 5/100; image provider failure; user-visible generic-template rejection; no complete FLUX card.
- Best panel: front fallback; same local memorial-atelier control as v79.
- Worst panel: back fallback; still generic dark stationery.
- Blocking failures: Cloudflare returned 400 NSFW false positive on one panel; benchmark degraded to local SVG fallback; not valid FLUX visual quality.
- Smallest prompt/config fix: reduce long negative lists in Cloudflare FLUX sanitizer.
- Prompt-side or model-capability-side: provider safety/prompt wording.
- Estimated cost per 4-panel card: at least partial Cloudflare provider calls; exact account cost not computed.

## Notes

Do not rank this as a native FLUX output. The visible contact sheet is fallback SVG after route failure, so product score is lower than v79 despite similar artwork.
