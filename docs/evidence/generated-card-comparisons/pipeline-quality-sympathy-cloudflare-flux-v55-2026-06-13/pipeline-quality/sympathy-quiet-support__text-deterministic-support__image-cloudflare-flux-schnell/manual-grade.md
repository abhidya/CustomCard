# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare FLUX.1 Schnell -> fallback SVG after provider failure
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: [open](./contact-sheet.png)

## Score

- Product quality score /100: 8
- Prompt/pipeline contract score /100: 58
- Tier: F route failure.
- Panel scores:
  - front: 8/100; plain gold/black template with no practical-care concept.
  - inside-left: 8/100; readable fallback-style template only.
  - inside-right: 8/100; readable fallback-style template only.
  - back: 8/100; empty dark template.
- Dimension scores:
  - Prompt adherence and panel contract /15: 12
  - Occasion and user-story fit /15: 5
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 2
  - Theme coherence across panels /10: 4
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 7
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Raw dimension sum: 54/100
- Product judgment adjustment: capped to 8 because the image route failed and the visible output is template-like fallback, not a customer card.
- Hard failure caps triggered: provider failure; front cover lacks commercial hook; major art/layout redo required.
- Best panel: inside-right; copy is readable.
- Worst panel: front/back; no meaningful art.
- Blocking failures:
  - Cloudflare FLUX returned provider 400 on the second panel and did not complete native four-panel generation.
  - Fallback output is generic template art.
  - No practical-care object system appears.
- Smallest next fix: reduce prompt length/repetition before another provider attempt; current prompt is too long and brittle.

## Notes

V55 proves FLUX route still cannot be promoted under current prompt shape. It rendered at most one native panel, then fell back.
