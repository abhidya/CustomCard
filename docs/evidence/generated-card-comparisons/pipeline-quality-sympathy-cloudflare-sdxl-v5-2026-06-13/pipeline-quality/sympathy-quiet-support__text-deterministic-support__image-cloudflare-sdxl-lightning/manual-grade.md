# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare SDXL Lightning (@cf/bytedance/stable-diffusion-xl-lightning)
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: [open](./contact-sheet.png)

## Score

- Product quality score /100: 55
- Prompt/pipeline contract score /100: 88
- Tier: C-/D+ rough draft; readable, not saleable
- Panel scores:
  - front: 50/100; dramatic cover, but the empty dark plate and stock wheat-field/sunset art make it look unfinished.
  - inside-left: 58/100; readable message, but scenic bands and sun/grass imagery ignore the quiet support-object concept.
  - inside-right: 58/100; readable and cleaner than v1, but still generic landscape stationery.
  - back: 54/100; readable, coherent, and not cluttered, but still generic scenic art behind a dark block.
- Dimension scores:
  - Prompt adherence and panel contract /15: 11
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 12
  - Visual composition and print readiness /15: 8
  - Theme coherence across panels /10: 7
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 7
  - Commercial usefulness /5: 2
  - Originality and taste /5: 2
- Raw dimension sum: 64/100
- Hard failure caps triggered: cap at 60 because the visible product needs a major art-direction repair; final score lowered to 55 for the empty front text plate and generic stock landscape feel.
- Best panel: inside-right; copy is readable and the text field is stable.
- Worst panel: front; headline floats above an empty dark block, and the scene is generic.
- Blocking failures:
  - SDXL keeps producing scenic wheat/sunset landscapes instead of support-object art.
  - Deterministic text fields improve readability but look like mockup boxes, not final premium typography.
  - Front cover has an empty plate because this story uses headline-only cover copy.
- Smallest next fix: make the front field conditional on body text and switch away from SDXL for this story; prompt-only SDXL tuning is not reaching premium quality.

## Notes

V5 is readable and complete, but worse than v2 and no better than prior DeepAI rough drafts. Do not promote it.
