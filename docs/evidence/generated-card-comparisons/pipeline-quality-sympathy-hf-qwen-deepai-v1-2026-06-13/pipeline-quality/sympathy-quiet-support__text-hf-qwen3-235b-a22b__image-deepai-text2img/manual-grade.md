# Manual Grade: sympathy-quiet-support

- Text: Hugging Face Qwen3 235B A22B Instruct 2507 (Qwen/Qwen3-235B-A22B-Instruct-2507), selected route fell back after 402
- Image: DeepAI text2img (text2img)
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

- Product quality score /100: 58
- Prompt/pipeline contract score /100: 74
- Tier: C rough-draft candidate; not customer-ready
- Raw dimension sum /100: 66
- Visible-product cap applied: 58 because the card still needs a design pass before a paying customer should see it.
- Dimension scores:
  - Prompt adherence and panel contract /15: 12
  - Occasion and user-story fit /15: 10
  - Copy quality and emotional calibration /15: 11
  - Visual composition and print readiness /15: 8
  - Theme coherence across panels /10: 7
  - Text/name fidelity strategy /10: 7
  - Domain/cultural sensitivity /10: 8
  - Commercial usefulness /5: 0
  - Originality and taste /5: 3
- Panel product ratings:
  - Front /100: 58
  - Inside-left /100: 51
  - Inside-right /100: 64
  - Back /100: 66
- Hard failure caps triggered: selected text provider returned 402, so contract cannot be top-band; visible product capped below 60 for generic watercolor styling and branch/title collision on inside-left.
- Best panel: back; cleanest layout after moving back copy to the upper/center field.
- Worst panel: inside-left; branch artwork crowds the headline and makes the panel feel under-directed.
- Blocking failures: not premium enough for sale; generic landscape/branch art, weak personalization in visuals, and selected text model unavailable.
- Smallest prompt/config fix: keep gallery-art prompts, but force image art away from headline zones and use an available reliable text route or deterministic text for this benchmark slice.
- Prompt-side or model-capability-side: both; prompt/layout repair improved readability, but DeepAI still places branches near text and selected live text providers are currently unavailable.
- Estimated cost per 4-panel card: DeepAI image route reserved 4 image units; Qwen text route reserved 5 units but fell back after provider 402.

## Notes

This is the best visible result in the latest loop, but it is not close to 100. It improves on the user-rated `5/100` SVG stationery by replacing the bordered note-template look with watercolor landscape/branch panels and a cleaner back layout. It still fails premium product quality: the art is generic, inside-left has branch/title crowding, and the selected Qwen text provider returned 402 so the run used deterministic fallback copy.
