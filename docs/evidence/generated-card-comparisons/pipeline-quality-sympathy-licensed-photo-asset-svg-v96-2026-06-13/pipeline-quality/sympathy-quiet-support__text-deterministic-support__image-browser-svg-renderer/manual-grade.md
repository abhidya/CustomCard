# Manual Grade: sympathy-quiet-support v96

- Text: Deterministic support copy baseline (`deterministic-support-copy`)
- Image: Browser SVG renderer (`deterministic-svg`)
- Pipeline: full card generation service (`pipeline-quality`)
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 22
- Prompt/pipeline contract score /100: 98
- Tier: D, rough proof only
- Raw dimension sum before visible-artifact cap: 68/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 15
  - Occasion and user-story fit /15: 8
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 7
  - Theme coherence across panels /10: 7
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 9
  - Commercial usefulness /5: 0
  - Originality and taste /5: 1
- Hard failure caps triggered: template-like repeated stock photo; front/back use hard split photo band; interiors mostly blank; visible art does not communicate practical care.
- Best panel: back, readable copy and coherent dark-photo palette.
- Worst panel: front, hard horizontal split makes it look like a template proof rather than a finished card.
- Blocking failures: repeated photo source, generic eucalyptus/note sympathy trope, no visible meals/rides/calls/silence concept, not premium enough for customer-facing card.
- Smallest prompt/config fix: use full-bleed photo on dark panels, avoid hard band split, keep interiors text-safe.
- Prompt-side or model-capability-side: local art-system/source-asset ceiling, not text-model issue.
- Estimated cost per 4-panel card: local renderer, no external provider call.

## Notes

V96 proves the Rawpixel CC0 PNG derivative renders correctly through Sharp/SVG and full pipeline. It should not be promoted: licensed source fixes blank rendering but not product quality.
