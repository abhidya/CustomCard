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

- Product quality score /100: 94
- Prompt/pipeline contract score /100: 98
- Tier: A
- Dimension scores:
  - Prompt adherence and panel contract /15: 15
  - Occasion and user-story fit /15: 15
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 14
  - Theme coherence across panels /10: 10
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 10
  - Commercial usefulness /5: 3
  - Originality and taste /5: 3
- Hard failure caps triggered: none
- Best panel: front; cleaner `For Eli` headline, readable body, stronger pressed-leaf motion, and no fake text or mockup artifacts.
- Worst panel: inside-left; now coordinated and readable, but still a restrained note-sheet composition rather than a fully bespoke art panel.
- Blocking failures: none for proofed production use; still not a 95-100 artifact because the art remains deterministic stationery, not exceptional bespoke illustration.
- Smallest prompt/config fix: either add a higher-end executable image provider with reliable text-safe flat artwork, or make the deterministic renderer support richer story-specific art systems beyond framed stationery.
- Prompt-side or model-capability-side: renderer/art-system capability; copy and contract are no longer primary blockers.
- Estimated cost per 4-panel card: one Cloudflare text call plus deterministic SVG rendering; no paid image-provider call for artwork panels.

## Notes

V12 improves V10/V11 by forcing a cleaner sympathy cover headline, adding pressed-leaf/thread composition on front/back, and adding coordinated interior spread marks. The full card covers Eli, father, meals, rides, calls, and silence; avoids religious claims and platitudes; and stays readable in the contact sheet.

The requested `109` cannot be honestly reached under the active 0-100 rubric. This run is progress toward the top of the rubric, not completion of that numeric objective.
