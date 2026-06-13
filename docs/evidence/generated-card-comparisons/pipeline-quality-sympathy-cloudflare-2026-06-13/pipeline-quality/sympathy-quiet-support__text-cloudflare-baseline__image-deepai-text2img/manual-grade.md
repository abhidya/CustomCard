# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (@cf/meta/llama-3.1-8b-instruct-fast)
- Image: DeepAI text2img (text2img)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Scores

- Product quality score /100: 55
- Prompt/pipeline contract score /100: 70
- Tier: C (rough draft only; not customer-facing)
- Hard failure caps triggered: cap 55 risk, prominent app-rendered interior text is effectively illegible at contact-sheet scale; cap 70, cannot print without major deterministic layout repair.

## Dimension Scores

- Prompt adherence and panel contract /15: 12
- Occasion and user-story fit /15: 7
- Copy quality and emotional calibration /15: 9
- Visual composition and print readiness /15: 6
- Theme coherence across panels /10: 6
- Text/name fidelity strategy /10: 4
- Domain/cultural sensitivity /10: 8
- Commercial usefulness /5: 2
- Originality and taste /5: 3

## Evidence

- Auto-checks: four panels true, no provider failure true, must-include covered false.
- Missing required terms: father, meals, rides.
- Copy gets Eli, Jordan, sympathy, silence, and no religious claims. It loses specific practical-support promise.
- Visuals are quiet and mostly safe, but front is sparse, inside body text is too small/light, and back is generic.
- Theme guide leaked invalid tokens into palette/motifs (`palette`, `style`), so schema quality is not clean even though output rendered.

## Panel Notes

- Best panel: front. It is calm, simple, and avoids bad imagery.
- Worst panel: inside-right. Main message sits too low and too tiny/light to read.
- Blocking failures: misses father/meals/rides, inside text illegible, product feels generic, not shippable.
- Smallest prompt/config fix: require literal `must_include` terms in final copy text, add minimum overlay font/contrast checks, and reject schema arrays that echo field names as values.
- Prompt-side or model-capability-side: mixed. Literal-term loss and schema pollution are text-model/prompt issues; tiny overlay is deterministic layout policy issue.
- Estimated cost per 4-panel card: cost gate reserved 9 cents; reported actual spend 0 cents in local benchmark accounting.

