# Production Text Evidence Index

Created: 2026-06-26T23:14:22.703Z
Status: blocked
Promotion ready: no

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest planner preflight is blocked: smoke-only model koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S.
- No production-suitable planner endpoint is reachable/configured in the latest readiness report.
- The latest LLM-planned benchmark covers 3 customer request runs.
- Planner/theme adherence is still failing required terms: Nina, aquarium, Morgan, dog.
- Latest aggregate is blocked: best score 38 across 3 run(s).
- Latest manual grade checklist is blocked: 2/2 generated run(s) graded, 1 failed before image generation.

## Next Steps

- Run production-text planner preflight with a production-suitable model, 8192+ context, and the full output budget.
- Run the planner preflight, then start or configure a production-suitable planner endpoint with 8192+ context before collecting promotion evidence.
- Keep Qwen3-4B/8B and other small planner runs as smoke or failure evidence only.
- Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.
- Manually grade every production-text run and aggregate only after all candidates pass.
- Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.

## Latest Evidence

| Type | Path | Status | Key result |
| --- | --- | --- | --- |
| Rerun Plan | [open](../production-text-rerun-plan-20260626-current/production-text-rerun-plan.json) | rerun-required | 7 failed requirement(s); commands=9 |
| Planner | [open](../production-text-planner-preflight-20260626-current/production-text-planner-preflight.json) | blocked | smoke-only; model=koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S; context=4096 |
| Readiness | [open](../production-text-readiness-20260626-current/production-text-readiness.json) | blocked | 5 blocker(s); planner=none |
| Preflight | [open](../production-text-preflight-20260626T042126Z/production-text-preflight.json) | promotion-ready | comfy=yes node=yes |
| Manual Grades | [open](../production-text-manual-grade-checklist-20260626-current/production-text-manual-grade-checklist.json) | blocked | 2/2 generated graded; manual-grades=3; missing=0; failed-before-image=1 |
| Aggregate | [open](../benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json) | blocked | 3 run(s); best=38; ready=no |
| Benchmark | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json) | blocked | 2/3 completed; failed=1 |

## Aggregates

| Created | Runs | Best score | Statuses | Text models | Path |
| --- | ---:| ---:| --- | --- | --- |
| 2026-06-26T04:36:01.116Z | 3 | 38 | {"blocked":2,"failed":1} | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json) |
| 2026-06-26T02:56:40.724Z | 6 | 72 | {"blocked":6} | n/a | [open](../benchmark-aggregate-2026-06-26-production-text-candidates/benchmark-aggregate.json) |
| 2026-06-26T01:38:49.778Z | 1 | 47 | {"blocked":1} | n/a | [open](../benchmark-aggregate-2026-06-26-production-text/benchmark-aggregate.json) |

## Benchmark Summaries

| Created | Runs | Completed | Failed | Fixtures | Text models | Path |
| --- | ---:| ---:| ---:| --- | --- | --- |
| 2026-06-26T04:21:27.749Z | 3 | 2 | 1 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T02:50:06.234Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2/production-text-workflow-summary.json) |
| 2026-06-26T02:27:14.553Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-soft-fields/production-text-workflow-summary.json) |
| 2026-06-26T02:05:28.762Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields/production-text-workflow-summary.json) |
| 2026-06-26T01:53:56.476Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T01:43:59.340Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo/production-text-workflow-summary.json) |
| 2026-06-26T01:25:39.502Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-live-node/production-text-workflow-summary.json) |
