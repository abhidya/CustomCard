# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Deterministic browser SVG renderer with photo-composite local assets (deterministic-svg)
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

- Product quality score /100: 43
- Prompt/pipeline contract score /100: 90
- Tier: D+ rough draft only
- Dimension scores:
  - Prompt adherence and panel contract /15: 13
  - Occasion and user-story fit /15: 10
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 6
  - Theme coherence across panels /10: 6
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 8
  - Commercial usefulness /5: 2
  - Originality and taste /5: 2
- Raw dimension sum /100: 71
- Hard failure caps triggered: cap at 60 because the visible card still needs a major art/layout redo before a customer could send it; final score reduced to 43 after visible-product judgment.
- Best panel: back. The dark rose photo gives a stronger real-material hook than the procedural v104 tableau.
- Worst panel: inside-left. The lower food photo block shows a knife and reads like pasted stock photography, not a premium sympathy support motif.
- Blocking failures: front and interiors use hard-edged stock-photo blocks; practical-care concept is clearer than v104 but still not bespoke; generated local asset contradicts parts of the image prompt by using photos, flowers, and visible food; lower blocks feel like a collage rather than integrated card art.
- Smallest prompt/config fix: do not fix with more prompt text. Either use a higher-quality provider capable of flat premium panels, or replace the local asset set with a coherent commissioned/licensed four-panel artwork set.
- Prompt-side or model-capability-side: art-source/pipeline asset quality side. Copy and deterministic typography are not the blocker.
- Estimated cost per 4-panel card: $0 provider cost for this local route; quality gain does not justify promoting it.

## Notes

V106 improves visible source realism over v104 by using real CC0/PD photo material in the generated local PNG panels. It does not solve the user-calibrated product-quality blocker because the output still looks like stock-photo stationery assembled from separate blocks.
