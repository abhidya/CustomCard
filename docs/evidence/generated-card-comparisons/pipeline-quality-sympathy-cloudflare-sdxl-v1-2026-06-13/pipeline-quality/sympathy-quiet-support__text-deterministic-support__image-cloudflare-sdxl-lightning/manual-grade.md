# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Current Cloudflare SDXL Lightning baseline (@cf/bytedance/stable-diffusion-xl-lightning)
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

- Product quality score /100: 30
- Prompt/pipeline contract score /100: 86
- Tier: D visible rejection; real image route, not customer-sendable
- Panel scores:
  - front: 55/100; attractive enough at thumbnail and `For Eli` is readable, but it is ornate generic window/table art rather than quiet practical support.
  - inside-left: 22/100; body copy is mostly unreadable over fruit/table clutter and the scene ignores the requested open text field.
  - inside-right: 20/100; floral still life is visually richer, but the message sits inside busy flowers and fails readability.
  - back: 15/100; black line-art clutter and urn-like vessels make the small copy hard to read and too stock-funeral.
- Dimension scores:
  - Prompt adherence and panel contract /15: 13
  - Occasion and user-story fit /15: 5
  - Copy quality and emotional calibration /15: 11
  - Visual composition and print readiness /15: 2
  - Theme coherence across panels /10: 4
  - Text/name fidelity strategy /10: 2
  - Domain/cultural sensitivity /10: 6
  - Commercial usefulness /5: 1
  - Originality and taste /5: 2
- Raw dimension sum: 46/100
- Hard failure caps triggered: cap at 55 for unreadable app-rendered body text; cap at 60 for major art/layout redo. Final product grade lowered to 30 by the customer-visible product gate because three of four panels fail sendability.
- Best panel: front; readable title and strongest image craft.
- Worst panel: back; cluttered line art and tiny copy fail at contact-sheet size.
- Blocking failures:
  - Text-safe field failed on inside-left, inside-right, and back.
  - Generated still-life content ignores the requested low-clutter support objects and creates generic fruit/flower/table scenes.
  - Back panel reads as stock funeral art instead of quiet practical support.
  - Full card would need a layout/art redo before sale.
- Smallest prompt/config fix: shorten the image prompt, put `empty plain center, no objects behind text, lower-edge art only` first, and add a deterministic opaque text plate for long body copy if using SDXL.
- Prompt-side or model-capability-side: mixed. SDXL can render nicer raster art than deterministic SVG, but it did not obey text-safe composition; prompt must become shorter and more positional before judging model ceiling.
- Estimated cost per 4-panel card: Cloudflare Workers AI SDXL Lightning configured at per-request budget 1 cent; live run made 4 image calls.

## Notes

This is an improvement over the 5-10/100 deterministic SVG controls as raw raster art, but not a product win. Provider success and richer imagery do not matter if the customer cannot read the sympathy message.
