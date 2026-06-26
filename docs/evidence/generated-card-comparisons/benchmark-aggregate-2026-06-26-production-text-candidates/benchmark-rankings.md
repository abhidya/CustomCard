# Benchmark Aggregate Rankings

Created: 2026-06-26T02:10:33.944Z
Runs: 4
Phase filter: local-production-text

| Rank | Score | Status | Visual grade | Fixture | Text model | Image model | Provider | Technique | Contact sheet |
|---:|---:|---|---|---|---|---|---|---|---|
| 1 | 65 | blocked | [65 / do-not-promote-yet](../production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/manual-visual-grade.md) | folded-card-sunburst-typography | fixture | sd_xl_turbo_1.0_fp16.safetensors | local-comfyui-api-image | comfy-deterministic-text-composer | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/contact-sheet.png) |
| 2 | 47 | blocked | [47 / do-not-promote](../production-text-workflow-20260626-live-node/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/manual-visual-grade.md) | folded-card-sunburst-typography | fixture | DreamShaper_8_pruned.safetensors | local-comfyui-api-image | comfy-deterministic-text-composer | [open](../production-text-workflow-20260626-live-node/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/contact-sheet.png) |
| 3 | 43 | blocked | [43 / do-not-promote](../production-text-workflow-20260626-sdxl-turbo-cfg15/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/manual-visual-grade.md) | folded-card-sunburst-typography | fixture | sd_xl_turbo_1.0_fp16.safetensors | local-comfyui-api-image | comfy-deterministic-text-composer | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/contact-sheet.png) |
| 4 | 22 | blocked | [22 / do-not-promote](../production-text-workflow-20260626-sdxl-turbo/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/manual-visual-grade.md) | folded-card-sunburst-typography | fixture | sd_xl_turbo_1.0_fp16.safetensors | local-comfyui-api-image | comfy-deterministic-text-composer | [open](../production-text-workflow-20260626-sdxl-turbo/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/contact-sheet.png) |

Scores prefer manual visual grades when present, then deterministic QA scorecards, then advisory benchmark-loop auto-check booleans. Human visual grades should be added before production promotion.
