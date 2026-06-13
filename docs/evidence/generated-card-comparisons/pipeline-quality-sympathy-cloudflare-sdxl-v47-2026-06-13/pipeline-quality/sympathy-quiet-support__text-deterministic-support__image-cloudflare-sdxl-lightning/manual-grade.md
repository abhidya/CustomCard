# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare SDXL Lightning
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: [open](./contact-sheet.png)

## Score

- Product quality score /100: 60
- Prompt/pipeline contract score /100: 90
- Tier: C rough raster draft; real provider success, wrong concept.
- Panel scores:
  - front: 62/100; attractive wheat/landscape cover, but generic sympathy postcard and not practical support.
  - inside-left: 58/100; readable deterministic text plate, but art ignores requested quiet-support objects.
  - inside-right: 58/100; same readability gain, same generic field/landscape mismatch.
  - back: 60/100; polished enough as a rough draft, but not story-specific.
- Dimension scores:
  - Prompt adherence and panel contract /15: 13
  - Occasion and user-story fit /15: 8
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 12
  - Theme coherence across panels /10: 8
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 9
  - Commercial usefulness /5: 2
  - Originality and taste /5: 3
- Raw dimension sum: 79/100
- Product judgment adjustment: capped at 60 because auto-checks pass but the visible product would need major art/concept redo before a customer could send it for this story.
- Hard failure caps triggered: cap at 60 for major art/layout redo despite passing contract.
- Best panel: front; strongest raster polish and thumbnail hook.
- Worst panel: inside-right; readable, but generic landscape fights the practical-support brief.
- Blocking failures:
  - Renders wheat/field/sunset-style landscape despite negative prompt.
  - Does not show meals, rides, calls, silence, doorstep care, or practical support.
  - Looks like generic pastoral sympathy art, not customer-specific quiet support.
- Smallest next fix: do not keep tuning this SDXL prompt; use a provider/art system that can follow object-level practical-care composition.

## Notes

V47 proves Cloudflare SDXL can return four real panels with deterministic text plates. It does not prove product quality for this story.
