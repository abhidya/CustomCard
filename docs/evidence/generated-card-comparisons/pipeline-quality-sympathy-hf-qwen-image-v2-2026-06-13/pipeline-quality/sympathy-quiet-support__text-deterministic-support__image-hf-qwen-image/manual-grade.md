# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Hugging Face Qwen Image via Inference Providers, fallback to deterministic browser SVG after provider 402
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

- Product quality score /100: 8
- Prompt/pipeline contract score /100: 72
- Tier: F visible product; D route reliability
- Dimension scores:
  - Prompt adherence and panel contract /15: 10
  - Occasion and user-story fit /15: 11
  - Copy quality and emotional calibration /15: 13
  - Visual composition and print readiness /15: 2
  - Theme coherence across panels /10: 3
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 10
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Raw dimension sum before cap: 59
- Hard failure caps triggered: cap at 10 because the visible artifact supports the user-calibrated rejection band: generic low-effort stationery, crude SVG objects, no premium concept, and a full art-system replacement needed before sale.
- Panel ratings: front 12/100, inside-left 4/100, inside-right 5/100, back 7/100; whole card 8/100.
- Best panel: front; readable dark cover and correct recipient, but still tool-made.
- Worst panel: inside-left; placeholder stationery with small decorative marks.
- Blocking failures: selected HF Qwen image route returned 402 before rendering; fallback prevented zero-panel output but visible product is the same weak deterministic SVG branch.
- Smallest prompt/config fix: no prompt fix. Need funded/available higher-quality image provider or a bespoke art system.
- Prompt-side or model-capability-side: provider availability plus art-system capability.
- Estimated cost per 4-panel card: reserved 4 cents; actual spend 0 cents after provider 402 per run payload.

## Notes

- This run proves the new Hugging Face image adapter is wired and token-redacted, but the account has no remaining Inference Providers credits.
- Fallback repair is useful pipeline behavior: a provider outage now returns four fallback panels instead of zero panels.
- Do not promote this as a Qwen Image visual result; no Qwen-generated image reached the contact sheet.
