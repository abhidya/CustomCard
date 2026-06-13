# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare FLUX.1 Schnell (@cf/black-forest-labs/flux-1-schnell)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 4
- Prompt/pipeline contract score /100: 78
- Tier: D
- Dimension raw sum before visible-artifact cap: 48/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 8
  - Occasion and user-story fit /15: 4
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 9
  - Theme coherence across panels /10: 5
  - Text/name fidelity strategy /10: 7
  - Domain/cultural sensitivity /10: 2
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Hard failure caps triggered: user-calibrated visible rejection near 5/100; open-book/landscape artifacts; visible artifact still needs full art/layout redo.
- Best panel: front; cleanest flat background from the FLUX attempts.
- Worst panel: inside-left; obvious open-book object violates flat panel contract.
- Blocking failures: inside-left renders an open book, inside-right/back include grass or landscape texture, sympathy tone is weak, and practical-support concept is absent.
- Smallest prompt/config fix: FLUX needs a different control strategy or should be deprioritized for this story; prompt wording alone keeps producing book/nature artifacts.
- Prompt-side or model-capability-side: provider capability/control issue.
- Estimated cost per 4-panel card: 4 Cloudflare FLUX calls; exact account cost not computed.

## Notes

Simplified sanitizer avoided the v82 400 failure and fixed the front cover somewhat, but the full card is still a customer-visible rejection. Open-book and grass artifacts keep it in the 5/100 band.
