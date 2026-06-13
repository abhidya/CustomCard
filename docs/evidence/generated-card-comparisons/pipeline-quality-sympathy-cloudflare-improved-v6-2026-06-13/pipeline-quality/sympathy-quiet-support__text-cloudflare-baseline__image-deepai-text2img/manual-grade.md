# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (`@cf/meta/llama-3.1-8b-instruct-fast`)
- Image: DeepAI text2img (`text2img`)
- Pipeline: full card generation service (`pipeline-quality`)
- User story: returning consumer; sympathy/support; medium memory load
- Contact sheet: [open](./contact-sheet.png)

## Scores

- Product quality score /100: 45
- Prompt/pipeline contract score /100: 86
- Tier: D
- Raw dimension sum before hard caps: 51

## Dimension Scores

- Prompt adherence and panel contract /15: 13
- Occasion and user-story fit /15: 9
- Copy quality and emotional calibration /15: 8
- Visual composition and print readiness /15: 2
- Theme coherence across panels /10: 3
- Text/name fidelity strategy /10: 7
- Domain/cultural sensitivity /10: 8
- Commercial usefulness /5: 1
- Originality and taste /5: 0

## Evidence

- Auto-checks passed: four panels, no provider failure, required terms covered, avoided failures clean.
- Live providers used successfully: Cloudflare card-copy succeeded; DeepAI generated 4 image panels; no fallback queue.
- Required facts preserved in rendered copy: Eli, father, Jordan, meals, rides, calls, silence, grief/practical help.
- Safety improved: no religious claims, no platitudes like "thoughts and prayers", no fake text in artwork, no app-copy prompt leakage.

## Judgment

- Best panel: inside-right. The message includes the requested practical support, but the visual panel is still weak and text-heavy.
- Worst panel: front. It has almost no visual hook, reads like placeholder stationery, and would not sell as a sympathy card.
- Hard failure caps triggered: cap at 45 for two or more mostly blank/template-like panels; cap at 50 for front cover lacking a commercial visual hook; cap at 55 for body text that is too small at contact-sheet scale.
- Blocking failures: visible product quality is low. The card needs a full visual hierarchy/art redo before customer-facing use.
- Smallest next fix: force concrete sympathy visual motifs and larger readable copy blocks, or swap away from DeepAI for this product route.
- Prompt-side or model-capability-side: mixed, leaning model-capability for image quality. Prompt repair fixed content and contract issues, but DeepAI produced low-effort border/blank stationery.
- Estimated cost per 4-panel card: 9 cents reserved by the cost gate for this route; actual recorded spend remains 0 in local telemetry.
