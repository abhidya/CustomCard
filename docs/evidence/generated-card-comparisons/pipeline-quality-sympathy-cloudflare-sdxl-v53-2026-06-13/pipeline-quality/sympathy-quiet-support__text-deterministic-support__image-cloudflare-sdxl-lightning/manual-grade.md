# Manual Grade: sympathy-quiet-support

- Text: Deterministic support copy baseline (deterministic-support-copy)
- Image: Cloudflare SDXL Lightning
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: [open](./contact-sheet.png)

## Score

- Product quality score /100: 20
- Prompt/pipeline contract score /100: 86
- Tier: D/F raster prompt regression.
- Panel scores:
  - front: 18/100; busy fruit/table spread with bottles and fake note-like marks, wrong for quiet practical support.
  - inside-left: 22/100; readable deterministic copy, but ornate frame/blank-template look returns.
  - inside-right: 22/100; ornate key/frame/fake-script artifacts, not practical support.
  - back: 18/100; black-and-white clutter with table/food objects under dark text plate.
- Dimension scores:
  - Prompt adherence and panel contract /15: 13
  - Occasion and user-story fit /15: 4
  - Copy quality and emotional calibration /15: 14
  - Visual composition and print readiness /15: 4
  - Theme coherence across panels /10: 4
  - Text/name fidelity strategy /10: 10
  - Domain/cultural sensitivity /10: 7
  - Commercial usefulness /5: 1
  - Originality and taste /5: 1
- Raw dimension sum: 58/100
- Product judgment adjustment: capped to 20 because the generated art violates the requested practical-support concept and would need a complete visual redo.
- Hard failure caps triggered: front cover lacks usable commercial hook for this story; generated fake-text/table artifacts; major art/layout redo required.
- Best panel: inside-left; copy remains legible.
- Worst panel: front; it becomes a fruit/table setting instead of sympathy support.
- Blocking failures:
  - `still-life` plus `covered meal dish` caused SDXL to render visible food/fruit/tableware.
  - Ornate frames and fake script returned.
  - Back panel is cluttered and incoherent.
- Smallest next fix: remove `still-life`, `meal dish`, and visible-food language from the positive prompt; use `sealed meal container` / `care package` object language and rely on negative prompt for forbidden food/table/scenery.

## Notes

V53 proves object-first prompting can regress badly when SDXL maps meal/still-life terms to food spreads. It is not a product improvement over v52 or v47.
