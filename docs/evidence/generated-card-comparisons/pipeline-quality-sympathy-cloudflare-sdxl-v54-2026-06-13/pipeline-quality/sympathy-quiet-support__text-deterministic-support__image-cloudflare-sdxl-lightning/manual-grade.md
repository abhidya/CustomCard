# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare SDXL Lightning
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: [open](./contact-sheet.png)

## Score

- Product quality score /100: 15
- Prompt/pipeline contract score /100: 80
- Tier: F/D raster regression.
- Panel scores:
  - front: 12/100; box/carton clutter with fake labels and tiny pseudo-text, not a sympathy card cover.
  - inside-left: 22/100; readable copy, but visible fake text and textured clutter remain.
  - inside-right: 18/100; ornate frame and door/card-like rectangle return.
  - back: 10/100; chaotic boxed clutter and dark overlay collision.
- Dimension scores:
  - Prompt adherence and panel contract /15: 12
  - Occasion and user-story fit /15: 3
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 3
  - Theme coherence across panels /10: 4
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 7
  - Commercial usefulness /5: 0
  - Originality and taste /5: 1
- Raw dimension sum: 52/100
- Product judgment adjustment: capped to 15 because visible product is cluttered, fake-text-heavy, and needs full art replacement.
- Hard failure caps triggered: generated fake text/labels; front cover has no usable commercial visual hook; major art/layout redo required.
- Best panel: inside-left; app copy remains readable.
- Worst panel: back; clutter and overlay collide.
- Blocking failures:
  - `sealed meal container` shifted SDXL to cartons/cans with fake labels.
  - Front/back are cluttered box scenes.
  - Fake text appears prominently in generated art.
- Smallest next fix: do not keep tuning SDXL object wording; try a different image model/provider or non-SDXL art system.

## Notes

V54 is worse than v53 and v47. The SDXL route is not reliable for this sympathy story under current prompt constraints.
