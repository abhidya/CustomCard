# Production Text Manual Grade Checklist

Created: 2026-06-26T23:09:16.511Z
Status: blocked
Promotion ready: no
Benchmark summary: [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json)

## Summary

- Total runs: 3
- Gradable generated runs: 2
- Graded generated runs: 2
- Manual grades present: 3
- Missing grades: 0
- Invalid grades: 0
- Failed before image generation: 1

## Blockers

- 3 manual grade(s) are blocked or failed.
- 1 run(s) failed before image generation.
- Automated must_include checks failed for: Nina, aquarium, Morgan, dog.
- Automated must_avoid checks failed for: mockup.

## Next Steps

- Rerun failed stories only after the planner preflight proves a production-floor model and output budget.
- Fix planner contract adherence before spending more Comfy image work.

## Runs

| Story | Run state | Visuals | Grade | Score | Recommendation | Contact sheet | Blockers |
| --- | --- | --- | --- | ---:| --- | --- | --- |
| aquarium-lover-birthday | status-200 | yes | [blocked](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/aquarium-lover-birthday__text-local-openai-compatible__image-local-comfyui/manual-visual-grade.json) | 38 | do-not-promote | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/aquarium-lover-birthday__text-local-openai-compatible__image-local-comfyui/contact-sheet.png) | Planner missed required recipient/name/theme terms: Nina and aquarium are absent.; Artwork and copy drifted into botanical birthday stationery instead of aquarium-lover stationery.; Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover. |
| koi-fish-lover-encouragement | failed-before-image-generation | no | [failed](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/koi-fish-lover-encouragement__text-local-openai-compatible__image-local-comfyui/manual-visual-grade.json) | 0 | do-not-promote | n/a | Local Qwen3-4B planner returned invalid JSON.; The LLM response hit the 2200-token completion cap with finish_reason length.; No image panels were generated for the koi encouragement request. |
| dog-lover-thank-you | status-200 | yes | [blocked](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/dog-lover-thank-you__text-local-openai-compatible__image-local-comfyui/manual-visual-grade.json) | 34 | do-not-promote | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/dog-lover-thank-you__text-local-openai-compatible__image-local-comfyui/contact-sheet.png) | Planner missed required recipient/name/theme terms: Morgan and dog are absent.; Copy invents plant-watering context and says the plants are grateful, which contradicts the dog-lover thank-you request.; Back panel is too dark, contains visible text, and does not behave as a sparse no-copy back cover. |
