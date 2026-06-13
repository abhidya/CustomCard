# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: DeepAI text2img (text2img)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 18
- Prompt/pipeline contract score /100: 82
- Tier: D
- Dimension raw sum before visible-artifact cap: 58/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 12
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 8
  - Theme coherence across panels /10: 6
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 4
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Hard failure caps triggered: visible-product rejection; two or more panels look like generic unfinished stationery/open-book templates; back panel contains a photoreal phone object despite flat-panel prompt.
- Best panel: front; at least has a visible support-note/meal-like object and readable cover text.
- Worst panel: back; green texture plus tilted phone photo looks like stock imagery, not premium sympathy stationery.
- Blocking failures: fake/blank note-card object, open-book/page artifacts on interiors, weak panel cohesion, no premium card-art feel, and practical support still reads as generic stock symbols.
- Smallest prompt/config fix: DeepAI needs stronger no-book/no-photo enforcement and simpler per-panel object specs, but model quality looks low-leverage compared with using a stronger image provider.
- Prompt-side or model-capability-side: mixed; prompt repair improved native completion, but model output quality remains low.
- Estimated cost per 4-panel card: 4 DeepAI text2img generations plus 4 image downloads; exact account cost not computed.

## Notes

This is real native raster evidence and beats local fallback only slightly. It is not customer-ready.
