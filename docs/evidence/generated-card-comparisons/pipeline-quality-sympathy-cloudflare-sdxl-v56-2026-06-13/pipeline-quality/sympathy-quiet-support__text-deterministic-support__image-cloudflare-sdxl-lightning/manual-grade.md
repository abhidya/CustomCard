# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare SDXL Lightning
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: [open](./contact-sheet.png)

## Score

- Product quality score /100: 12
- Prompt/pipeline contract score /100: 78
- Tier: F raster regression.
- Panel scores:
  - front: 8/100; fake label grid and package pseudo-text, no usable sympathy cover.
  - inside-left: 18/100; copy readable, but cardboard/box scene and fake text remain.
  - inside-right: 14/100; landscape, houses, trees, and flowers returned, wrong concept.
  - back: 10/100; cluttered jars/cans with dark overlay collision.
- Dimension scores:
  - Prompt adherence and panel contract /15: 12
  - Occasion and user-story fit /15: 2
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 3
  - Theme coherence across panels /10: 3
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 6
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Raw dimension sum: 48/100
- Product judgment adjustment: capped to 12 because visible product is fake-text-heavy, incoherent, and needs full art replacement.
- Hard failure caps triggered: generated fake text/labels; no front-cover commercial hook; major art/layout redo required.
- Best panel: inside-left; app copy remains readable.
- Worst panel: front; fake labels dominate the thumbnail.
- Blocking failures:
  - Prompt compression did not fix SDXL object control.
  - Generated art still includes fake labels and pseudo-text.
  - Model replaced practical-support art with package grids, scenery, flowers, jars, and cans.
- Smallest next fix: revert this prompt patch; use another provider/art system or enforce a no-label object renderer before rerun.

## Notes

V56 proves shorter SDXL prompt text is not enough. The route still fails visible-product quality despite four live provider panels and readable deterministic overlay copy.
