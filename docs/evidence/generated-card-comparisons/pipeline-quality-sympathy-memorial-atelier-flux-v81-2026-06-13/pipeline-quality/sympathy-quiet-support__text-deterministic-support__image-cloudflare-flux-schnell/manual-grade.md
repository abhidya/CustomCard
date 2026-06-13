# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare FLUX.1 Schnell (@cf/black-forest-labs/flux-1-schnell)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 3
- Prompt/pipeline contract score /100: 74
- Tier: D
- Dimension raw sum before visible-artifact cap: 44/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 6
  - Occasion and user-story fit /15: 3
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 7
  - Theme coherence across panels /10: 4
  - Text/name fidelity strategy /10: 7
  - Domain/cultural sensitivity /10: 3
  - Commercial usefulness /5: 0
  - Originality and taste /5: 1
- Hard failure caps triggered: user-calibrated visible rejection near 5/100; open-book mockup; landscape/grassland output; full art redo required.
- Best panel: front; has a usable gradient but reads as yellow grassland, not sympathy.
- Worst panel: inside-right; clear open-book/page mockup with page seam.
- Blocking failures: grassland and physical book artifacts; bright green back; no practical support mood; prompt ban on landscape/book ignored.
- Smallest prompt/config fix: avoid `field`, `cover`, and `interior` words, and shorten negative prompt to avoid false positives.
- Prompt-side or model-capability-side: provider prompt sensitivity and weak instruction following.
- Estimated cost per 4-panel card: 4 Cloudflare FLUX calls; exact account cost not computed in this run.

## Notes

This run proves removing `paper-cut` is not enough; terms like `field`, `interior`, and `cover` still push FLUX toward landscape/book artifacts. It is below 5/100 because it adds grassland/book failures on top of generic layout.
