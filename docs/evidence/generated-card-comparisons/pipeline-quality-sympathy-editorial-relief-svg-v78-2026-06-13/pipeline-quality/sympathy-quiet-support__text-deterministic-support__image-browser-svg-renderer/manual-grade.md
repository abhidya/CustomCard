# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Deterministic browser SVG renderer (deterministic-svg)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 8
- Prompt/pipeline contract score /100: 98
- Tier: D
- Dimension raw sum before visible-artifact cap: 66/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 15
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 10
  - Theme coherence across panels /10: 9
  - Text/name fidelity strategy /10: 9
  - Domain/cultural sensitivity /10: 3
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Hard failure caps triggered: user-visible generic-template rejection cap; complete art-system replacement needed before customer use.
- Best panel: back; coherent dark field and readable closing copy.
- Worst panel: inside-left; huge empty stationery field with faint abstract marks, no premium sympathy art.
- Blocking failures: still reads as generic local SVG stationery; abstract lower relief is not meaningful practical support; interiors feel sparse/placeholder-like; no premium visual hook.
- Smallest prompt/config fix: stop tuning local SVG wording; try restored real image provider or a materially different bespoke art system.
- Prompt-side or model-capability-side: local renderer/art-system ceiling.
- Estimated cost per 4-panel card: local renderer only; negligible runtime cost.

## Notes

Route bug fixed: front/back SVGs use `data-customcard-theme="sympathy-premium-still-life"`. Product remains rejected by visible artifact despite high prompt/pipeline contract score.
