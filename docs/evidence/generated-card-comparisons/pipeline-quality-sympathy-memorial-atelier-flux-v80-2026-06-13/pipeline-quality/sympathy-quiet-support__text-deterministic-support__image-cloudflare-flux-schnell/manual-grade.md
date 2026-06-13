# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare FLUX.1 Schnell (@cf/black-forest-labs/flux-1-schnell)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Product quality score /100: 6
- Prompt/pipeline contract score /100: 76
- Tier: D
- Dimension raw sum before hard caps: 56/100
- Dimension scores:
  - Prompt adherence and panel contract /15: 7
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 9
  - Theme coherence across panels /10: 7
  - Text/name fidelity strategy /10: 7
  - Domain/cultural sensitivity /10: 4
  - Commercial usefulness /5: 0
  - Originality and taste /5: 2
- Hard failure caps triggered: user-calibrated visible rejection near 5/100; physical card/open-book mockup despite explicit no-mockup prompt; needs major art/layout redo.
- Best panel: front; more polished than local SVG and has a real thumbnail hook.
- Worst panel: inside-right; rendered as an open book/page object instead of a flat card panel.
- Blocking failures: physical open-book/page seam on interiors and back; app text sits over fake paper object; back panel becomes an open-book scene.
- Smallest prompt/config fix: remove `paper-cut` and card-object wording from Cloudflare FLUX sanitizer, or stop using FLUX for this story.
- Prompt-side or model-capability-side: provider/prompt mismatch.
- Estimated cost per 4-panel card: 4 Cloudflare FLUX calls; exact account cost not computed in this run.

## Notes

This is comparison evidence only. Provider succeeded, but it ignored the strongest no-mockup constraints. Front has slightly more polish than local SVG, but full card is still not sellable.
