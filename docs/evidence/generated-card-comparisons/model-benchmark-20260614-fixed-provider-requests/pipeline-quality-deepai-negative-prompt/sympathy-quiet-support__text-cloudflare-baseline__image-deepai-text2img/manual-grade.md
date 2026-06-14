# Manual Grade: sympathy-quiet-support

- Text: Current Cloudflare text baseline (@cf/meta/llama-3.1-8b-instruct-fast)
- Image: DeepAI text2img (text2img)
- Pipeline: full card generation service (pipeline-quality)
- User story: returning consumer; sympathy/support; memory load medium
- Contact sheet: [open](./contact-sheet.png)
- Effective provider requests: [open](./effective-provider-requests.json)

## Scores

- Product quality score /100: 66
- Prompt/pipeline contract score /100: 94
- Tier: C+ / rough proof, not customer-ready

## Dimension Scores

- Prompt adherence and panel contract /15: 14
- Occasion and user-story fit /15: 12
- Copy quality and emotional calibration /15: 11
- Visual composition and print readiness /15: 8
- Theme coherence across panels /10: 7
- Text/name fidelity strategy /10: 8
- Domain/cultural sensitivity /10: 9
- Commercial usefulness /5: 3
- Originality and taste /5: 2
- Raw dimension sum /100: 74

## Judgment

- Hard failure caps triggered: capped at 66 by visible-product quality; no schema/provider cap.
- Best panel: inside-left. Cleanest text field and strongest sympathy tone.
- Worst panel: inside-right. Tree overlaps the heading area and the composition feels like generic sympathy stationery.
- Blocking failures: generic landscape/card-template feel, weak front/back text contrast, uneven motif language, limited practical-care specificity in the artwork.
- Smallest prompt/config fix: keep the native `negative_prompt` path, but strengthen text-safe-zone placement and require practical-care motifs to stay outside deterministic overlay areas.
- Prompt-side or model-capability-side: mixed. DeepAI followed the new request structure, but visible art quality still looks model-limited for premium customer output.
- Estimated cost per 4-panel card: not recalculated in this run.

## Request-Capture Evidence

- DeepAI POST count: 4
- Each POST captured as `body_type: form-data`
- Each POST has native `negative_prompt`
- Each POST has `width: "768"`, `height: "1024"`, `image_generator_version: "standard"`
- No provider `text` field contains `Avoid:`
- Provider statuses: 200, 200, 200, 200
