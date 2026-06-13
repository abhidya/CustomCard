# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Browser SVG renderer with WebP asset attempt
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 5
- Prompt/pipeline contract score /100: 98
- Tier: D
- Dimension raw sum before visible-artifact cap: 66/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 15
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 10
  - Theme coherence across panels /10: 8
  - Text/name fidelity strategy /10: 9
  - Domain/cultural sensitivity /10: 4
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Hard failure caps triggered: user-calibrated visible rejection near 5/100; embedded WebP asset did not visibly render through Sharp SVG conversion; complete art-system replacement still needed.
- Best panel: inside-left; clean readable copy field.
- Worst panel: front; nearly blank gray-green field with only faint linework, no product-quality hook.
- Blocking failures: intended raster asset invisible; output remains generic low-effort abstract stationery.
- Smallest prompt/config fix: convert embedded asset to PNG or use direct raster composition before SVG preview rendering.
- Prompt-side or model-capability-side: local rendering/asset encoding issue.
- Estimated cost per 4-panel card: local renderer only; negligible runtime cost.

## Notes

This is a failed asset-embedding attempt. WebP-in-SVG was not a useful path for this benchmark renderer.
