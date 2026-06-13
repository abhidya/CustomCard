# Manual Grade: sympathy-quiet-support

- Text: Hugging Face Qwen3 235B A22B Instruct 2507 (Qwen/Qwen3-235B-A22B-Instruct-2507)
- Image: DeepAI text2img (text2img)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)

## Scores

- Product quality score /100: 53
- Prompt/pipeline contract score /100: 48
- Tier: D for model route reliability; C- if judging only fallback-rendered card as rough draft.
- Hard failure caps triggered: cap 55, back panel has stray/fake text artifact and output is not print-ready; cap 70, needs major deterministic layout repair.

## Dimension Scores

- Prompt adherence and panel contract /15: 11
- Occasion and user-story fit /15: 7
- Copy quality and emotional calibration /15: 9
- Visual composition and print readiness /15: 7
- Theme coherence across panels /10: 7
- Text/name fidelity strategy /10: 4
- Domain/cultural sensitivity /10: 8
- Commercial usefulness /5: 2
- Originality and taste /5: 3

## Evidence

- Auto-checks: four panels true, no provider failure false, must-include covered false.
- Text route failed: Hugging Face returned 402; deterministic fallback copy rendered.
- Missing required terms: father, meals, rides.
- Copy is safe but too generic. It says practical things and silence, but avoids concrete promised help.
- Visuals are more coherent than the Cloudflare contact sheet, but the back panel shows stray fake text near the lower edge.

## Panel Notes

- Best panel: inside-left. Quiet frame, readable message, suitable sympathy tone.
- Worst panel: back. Stray fake text/artifact makes it non-shippable.
- Blocking failures: provider 402, fallback selected, missing father/meals/rides, back fake text, not valid evidence of Qwen copy quality.
- Smallest prompt/config fix: skip or demote Hugging Face route when credits return 402; rerun only after key/account readiness is proven; keep fallback output labeled separately.
- Prompt-side or model-capability-side: provider/reliability first. Product defects remain prompt/layout issues, but this run cannot grade Qwen text quality because Qwen did not answer.
- Estimated cost per 4-panel card: cost gate reserved 9 cents; reported actual spend 0 cents in local benchmark accounting.

