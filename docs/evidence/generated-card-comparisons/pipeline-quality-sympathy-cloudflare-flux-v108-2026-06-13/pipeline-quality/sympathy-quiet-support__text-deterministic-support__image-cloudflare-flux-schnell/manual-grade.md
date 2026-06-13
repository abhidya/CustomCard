# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare FLUX.1 Schnell (@cf/black-forest-labs/flux-1-schnell)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## User Input

- Sender: Jordan
- Recipient: Eli
- Relationship: friend
- Brief: A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.
- Must include: Eli, father, meals, rides, silence
- Must avoid: religious claims, platitudes, bright celebration, overdesigned ornament

## Rubric

- Product quality score /100: 46
- Prompt/pipeline contract score /100: 68
- Tier: D+ fallback-only route evidence
- Dimension scores:
  - Prompt adherence and panel contract /15: 13
  - Occasion and user-story fit /15: 11
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 7
  - Theme coherence across panels /10: 6
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 8
  - Commercial usefulness /5: 2
  - Originality and taste /5: 2
- Raw dimension sum /100: 73
- Hard failure caps triggered: provider-route failure cap; Cloudflare returned 429 and rendered local fallback only. Product score reflects the visible v107 fallback sheet, not native FLUX quality.
- Best panel: back. Dark fallback panel is readable and coherent.
- Worst panel: inside-left. Lower image band still reads like generic stock-photo/food-prep material.
- Blocking failures: Cloudflare `429` daily neuron allocation exhaustion; no native provider panels; fallback remains below customer-ready quality.
- Smallest prompt/config fix: none in prompt. Need paid Cloudflare capacity or different available image provider.
- Prompt-side or model-capability-side: provider access side.
- Estimated cost per 4-panel card: no successful paid native card; request blocked by free allocation.

## Notes

Provider HTTP log shows Cloudflare returned `AiError: you have used up your daily free allocation of 10,000 neurons`. Do not grade this as FLUX visual quality.
