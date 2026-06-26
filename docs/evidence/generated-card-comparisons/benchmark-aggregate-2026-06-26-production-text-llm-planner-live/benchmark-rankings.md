# Benchmark Aggregate Rankings

Created: 2026-06-26T04:36:01.116Z
Runs: 3
Phase filter: local-production-text

| Rank | Score | Status | Visual grade | Fixture | Text model | Image model | Provider | Technique | Contact sheet |
|---:|---:|---|---|---|---|---|---|---|---|
| 1 | 38 | blocked | [38 / do-not-promote](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/aquarium-lover-birthday__text-local-openai-compatible__image-local-comfyui/manual-visual-grade.md) | aquarium-lover-birthday | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | sd_xl_turbo_1.0_fp16.safetensors | local-comfyui-api-image | llm-planned-copy-comfy-deterministic-text | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/aquarium-lover-birthday__text-local-openai-compatible__image-local-comfyui/contact-sheet.png) |
| 2 | 34 | blocked | [34 / do-not-promote](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/dog-lover-thank-you__text-local-openai-compatible__image-local-comfyui/manual-visual-grade.md) | dog-lover-thank-you | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | sd_xl_turbo_1.0_fp16.safetensors | local-comfyui-api-image | llm-planned-copy-comfy-deterministic-text | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/dog-lover-thank-you__text-local-openai-compatible__image-local-comfyui/contact-sheet.png) |
| 3 | 0 | failed | [0 / do-not-promote](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow/koi-fish-lover-encouragement__text-local-openai-compatible__image-local-comfyui/manual-visual-grade.md) | koi-fish-lover-encouragement | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | sd_xl_turbo_1.0_fp16.safetensors | local-comfyui-api-image | llm-planned-copy-comfy-deterministic-text | n/a |

Scores prefer manual visual grades when present, then deterministic QA scorecards, then advisory benchmark-loop auto-check booleans. Human visual grades should be added before production promotion.
