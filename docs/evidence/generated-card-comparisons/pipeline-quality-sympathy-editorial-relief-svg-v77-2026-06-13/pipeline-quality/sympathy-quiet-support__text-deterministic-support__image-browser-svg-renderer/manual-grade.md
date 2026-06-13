# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Deterministic browser SVG renderer (deterministic-svg)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 5
- Prompt/pipeline contract score /100: 78
- Tier: D
- Dimension raw sum before visible-artifact cap: 49/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 10
  - Occasion and user-story fit /15: 3
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 7
  - Theme coherence across panels /10: 5
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 3
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Hard failure caps triggered: user-visible generic-template rejection cap; front cover routed to bold editorial/poster style instead of sympathy; complete art/layout redo needed.
- Best panel: inside-right; readable, exact practical-support copy.
- Worst panel: front; mustard/black poster-like cover is tonally wrong for condolence and looks like a routing bug.
- Blocking failures: `editorial relief` keyword triggered bold-type visual/layout fallback; sympathy mood absent from cover; design is not customer-sendable.
- Smallest prompt/config fix: exclude sympathy/loss sources from broad `editorial` bold-type routing.
- Prompt-side or model-capability-side: prompt/router bug.
- Estimated cost per 4-panel card: local renderer only; negligible runtime cost.

## Notes

This run is useful regression evidence. Passing four panels and exact copy does not matter when theme router produces wrong occasion style.
