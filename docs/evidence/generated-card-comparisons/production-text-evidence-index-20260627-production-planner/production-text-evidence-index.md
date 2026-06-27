# Production Text Evidence Index

Created: 2026-06-27T01:08:17.004Z
Status: blocked
Promotion ready: no

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest planner preflight passed with koboldcpp/gemma-4-31B-it-Q4_K_M.
- Installed production planner candidates found locally: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Installed production planner candidates still need local production-text evaluation: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Recommended production planner candidates still missing locally: qwen3-14b-instruct.
- Planner/theme adherence is still failing required terms: Nina, birthday, aquarium, Uncle Ken, koi, encouragement.
- Latest aggregate is blocked: best score 38 across 3 run(s).
- Latest manual grade checklist is blocked: 0/0 generated run(s) graded, 0 failed before image generation.

## Next Steps

- Run production-text planner preflight and benchmark evidence against installed production planner candidate(s): gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Resolve local model pull queue if the installed planner is too slow: qwen3-14b-instruct.
- Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.
- Manually grade every production-text run and aggregate only after all candidates pass.
- Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.

## Latest Evidence

| Type | Path | Status | Key result |
| --- | --- | --- | --- |
| Rerun Plan | [open](../production-text-rerun-plan-20260627-production-planner/production-text-rerun-plan.json) | rerun-required | 6 failed requirement(s); commands=10 |
| Planner | [open](../production-text-planner-preflight-20260627-production-planner/production-text-planner-preflight.json) | promotion-ready | production-suitable; model=koboldcpp/gemma-4-31B-it-Q4_K_M; context=8192 |
| Readiness | [open](../production-text-readiness-20260627-production-planner/production-text-readiness.json) | blocked | 1 blocker(s); planner=koboldcpp/gemma-4-31B-it-Q4_K_M |
| Model Coverage | [open](../local-model-coverage-20260627-current/local-model-coverage.json) | action-needed | 9 recommended installed; unevaluated production planners=gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash |
| Preflight | [open](../production-text-preflight-20260627-production-planner/production-text-preflight.json) | promotion-ready | comfy=yes node=yes |
| Manual Grades | [open](../production-text-manual-grade-checklist-20260627-production-planner/production-text-manual-grade-checklist.json) | blocked | 0/0 generated graded; manual-grades=0; missing=0; failed-before-image=0 |
| Aggregate | [open](../benchmark-aggregate-20260627-production-text-production-planner/benchmark-aggregate.json) | blocked | 2 run(s); best=73; ready=no |
| Benchmark | [open](../production-text-workflow-20260627-production-planner/production-text-workflow-summary.json) | blocked | 0/2 completed; failed=0 |

## Aggregates

| Created | Runs | Best score | Statuses | Text models | Path |
| --- | ---:| ---:| --- | --- | --- |
| 2026-06-27T01:07:42.369Z | 2 | 73 | {"status-502":2} | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../benchmark-aggregate-20260627-production-text-production-planner/benchmark-aggregate.json) |
| 2026-06-26T04:36:01.116Z | 3 | 38 | {"blocked":2,"failed":1} | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json) |
| 2026-06-26T02:56:40.724Z | 6 | 72 | {"blocked":6} | n/a | [open](../benchmark-aggregate-2026-06-26-production-text-candidates/benchmark-aggregate.json) |
| 2026-06-26T01:38:49.778Z | 1 | 47 | {"blocked":1} | n/a | [open](../benchmark-aggregate-2026-06-26-production-text/benchmark-aggregate.json) |

## Benchmark Summaries

| Created | Runs | Completed | Failed | Fixtures | Text models | Path |
| --- | ---:| ---:| ---:| --- | --- | --- |
| 2026-06-27T00:49:34.101Z | 2 | 0 | 0 | aquarium-lover-birthday, koi-fish-lover-encouragement | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner/production-text-workflow-summary.json) |
| 2026-06-26T04:21:27.749Z | 3 | 2 | 1 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T02:50:06.234Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2/production-text-workflow-summary.json) |
| 2026-06-26T02:27:14.553Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-soft-fields/production-text-workflow-summary.json) |
| 2026-06-26T02:05:28.762Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields/production-text-workflow-summary.json) |
| 2026-06-26T01:53:56.476Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T01:43:59.340Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo/production-text-workflow-summary.json) |
| 2026-06-26T01:25:39.502Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-live-node/production-text-workflow-summary.json) |
