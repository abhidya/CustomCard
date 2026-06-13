# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Hugging Face Qwen Image 2512 via Inference Providers (Qwen/Qwen-Image-2512)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 8
- Prompt/pipeline contract score /100: 72
- Tier: D
- Dimension raw sum before visible-artifact cap: 63/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 12
  - Occasion and user-story fit /15: 8
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 8
  - Theme coherence across panels /10: 8
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 6
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Hard failure caps triggered: user-visible generic-template rejection cap; image provider route failure; fallback SVG only, no complete Qwen image card.
- Best panel: back; readable and quiet.
- Worst panel: front; generic dark stationery with abstract low-effort relief, not saleable sympathy artwork.
- Blocking failures: HF returned 402 monthly-credit depletion; visual product is local fallback, not Qwen output; artifact still needs full art-system replacement.
- Smallest prompt/config fix: restore HF billing/credits before grading Qwen; do not use fallback contact sheet as model-quality evidence.
- Prompt-side or model-capability-side: provider availability first, then art-source capability.
- Estimated cost per 4-panel card: not measurable from this failed route.

## Notes

Auto-checks passed most visible contract checks only because fallback completed four panels. Product score is capped by actual contact sheet and user calibration, not by clean copy.
