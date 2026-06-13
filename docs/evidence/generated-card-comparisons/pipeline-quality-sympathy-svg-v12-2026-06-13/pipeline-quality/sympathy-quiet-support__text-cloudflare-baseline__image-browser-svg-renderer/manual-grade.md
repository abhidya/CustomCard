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

- Product quality score /100: 5
- Prompt/pipeline contract score /100: 98
- Tier: F visible product; A- contract only
- Dimension scores:
  - Prompt adherence and panel contract /15: 13
  - Occasion and user-story fit /15: 7
  - Copy quality and emotional calibration /15: 8
  - Visual composition and print readiness /15: 1
  - Theme coherence across panels /10: 2
  - Text/name fidelity strategy /10: 8
  - Domain/cultural sensitivity /10: 8
  - Commercial usefulness /5: 0
  - Originality and taste /5: 0
- Panel product ratings:
  - Front /100: 6
  - Inside-left /100: 4
  - Inside-right /100: 4
  - Back /100: 5
- Hard failure caps triggered: user-visible rejection; visually reads as low-effort template stationery despite correct text/facts.
- Best panel: front; it is readable and least empty, but still not a premium sympathy card.
- Worst panel: inside-left and inside-right; both look like generic bordered note templates with decorative leaves added after the fact.
- Blocking failures: paying customer would likely reject the exact visible card; art has no bespoke concept, no premium finish, weak emotional design, and a generic template feel.
- Smallest prompt/config fix: stop treating deterministic SVG stationery as a product-quality winner; route needs a fundamentally better visual generator or a custom art system with genuinely designed card compositions.
- Prompt-side or model-capability-side: visual generation/art-system capability; contract success hid product failure.
- Estimated cost per 4-panel card: one Cloudflare text call plus deterministic SVG rendering; no paid image-provider call for artwork panels.

## Notes

V12 improves V10/V11 by forcing a cleaner sympathy cover headline, adding pressed-leaf/thread composition on front/back, and adding coordinated interior spread marks. That is a contract/layout improvement, not a customer-visible product win. The full card covers Eli, father, meals, rides, calls, and silence; avoids religious claims and platitudes; and stays readable in the contact sheet.

User calibration on 2026-06-13: these rendered cards should be rated around `5/100`, not `94/100`. Re-audit accepts that product score because the visible artifact still looks like low-effort generic stationery. The requested `109` cannot be honestly reached under the active 0-100 rubric, and this visual route should not be promoted as the winner without a complete art-system replacement.
