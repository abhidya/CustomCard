# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (@cf/meta/llama-3.1-8b-instruct-fast)
- Image: DeepAI text2img (text2img)
- Pipeline: full card generation service (pipeline-quality)
- Contact sheet: ./contact-sheet.png
- Change: v3 removed arc/path/fold language from the compact DeepAI prompt.

## Scores

- Product quality score /100: 44
- Prompt/pipeline contract score /100: 78
- Tier: D, regression
- Raw dimension sum /100: 57
- Applied cap: 55 cap for sun/book/flower artifacts and visible text collision on the cover; lowered for off-tone scenery.

## Dimension Scores

- Prompt adherence and panel contract /15: 11
- Occasion and user-story fit /15: 6
- Copy quality and emotional calibration /15: 13
- Visual composition and print readiness /15: 7
- Theme coherence across panels /10: 6
- Text/name fidelity strategy /10: 6
- Domain/cultural sensitivity /10: 6
- Commercial usefulness /5: 0
- Originality and taste /5: 2

## Panel Notes

- Best panel: inside-left. It is plain and readable, though visually sparse.
- Worst panel: front. A bright sun-like disk collides with the headline and the lower area includes open-book/page imagery.
- Blocking failures: bright sun disks, flowers/grass, open-book imagery, and cover text collision. The v3 wording is worse than v2 and should be dropped.

## Delta

- Baseline: product 48, contract 84.
- V2: product 52, contract 84.
- V3: product 44, contract 78.
- Keep/drop: drop v3 wording and keep v2 as the current best prompt-only improvement.
