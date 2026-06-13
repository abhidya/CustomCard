# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (@cf/meta/llama-3.1-8b-instruct-fast)
- Image: Deterministic browser SVG renderer (deterministic-svg)
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

- Product quality score /100: 91
- Prompt/pipeline contract score /100: 97
- Tier: A-
- Dimension scores:
  - Prompt adherence and panel contract /15: 15
  - Occasion and user-story fit /15: 14
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 13
  - Theme coherence across panels /10: 9
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 10
  - Commercial usefulness /5: 3
  - Originality and taste /5: 3
- Hard failure caps triggered: none
- Best panel: front; readable, emotionally direct, safe margins, restrained branch/pressed-leaf motif gives a real cover.
- Worst panel: back; improved readability, but still mostly a simple coordinating mark and feels close to a template.
- Blocking failures: none for a proofed production candidate; not a 100 because the art system is still restrained stationery, not a highly bespoke premium illustration.
- Smallest prompt/config fix: keep deterministic SVG route for sensitive stationery, but add more per-story bespoke motif logic and force front headline zone away from `top`.
- Prompt-side or model-capability-side: prompt/layout policy plus deterministic renderer capability; image-model route is not the blocker here.
- Estimated cost per 4-panel card: one Cloudflare text call plus deterministic SVG rendering; no paid image-provider call for the artwork panels.

## Notes

V10 fixes the previous user-visible grade concern: product score comes from the rendered contact sheet. The card now covers Eli, father, meals, rides, calls, and silence; avoids religious claims and platitudes; uses deterministic app typography; and has no fake text or mockup artifacts.

It still should not be called 100. The cover and interiors are polished and sendable, but they remain close to premium stationery templates. A 100 would need a more bespoke, memorable art direction without harming sympathy tone or text safety.
