# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: DeepAI text2img selected, deterministic SVG fallback rendered
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 4
- Prompt/pipeline contract score /100: 72
- Tier: D
- Dimension raw sum before route-failure/user-visible cap: 63/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 11
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 9
  - Theme coherence across panels /10: 8
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 4
  - Commercial usefulness /5: 0
  - Originality and taste /5: 3
- Hard failure caps triggered: DeepAI provider failure; fallback SVG rendered; user-calibrated generic-template rejection.
- Best panel: inside-right; copy is specific and readable.
- Worst panel: front; same generic abstract stationery/card-within-card artifact as rejected memorial-atelier route.
- Blocking failures: DeepAI returned 400 unsafe-content error before completing all panels; visible output is fallback, not native DeepAI quality.
- Smallest prompt/config fix: do not keep this memorial-atelier prompt for DeepAI; provider sees sympathy/loss prompt as unsafe.
- Prompt-side or model-capability-side: provider safety/prompt mismatch plus fallback art-system ceiling.
- Estimated cost per 4-panel card: partial DeepAI calls plus local fallback; exact account cost not computed.

## Notes

Route-failure evidence only. Do not compare as DeepAI visual quality.
