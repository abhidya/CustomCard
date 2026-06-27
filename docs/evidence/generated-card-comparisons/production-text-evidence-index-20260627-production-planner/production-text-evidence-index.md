# Production Text Evidence Index

Created: 2026-06-27T03:11:28.157Z
Status: blocked
Promotion ready: no

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest dry-run planning proof keeps the full production card-copy JSON contract on koboldcpp/gemma-4-31B-it-Q4_K_M with 8192+ context, 3200 output tokens, and 1200000ms timeout across aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you.
- Latest planner preflight passed with koboldcpp/gemma-4-31B-it-Q4_K_M.
- Planner preflight and benchmark runtime evidence do not align: Planner preflight endpoint http://127.0.0.1:5003/v1 does not match benchmark planner endpoint(s): http://127.0.0.1:5013/v1.
- Installed production planner candidates found locally: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Installed production planner candidates still need local production-text evaluation: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Recommended production planner candidates still missing locally: qwen3-14b-instruct.
- The latest LLM-planned benchmark covers 3 customer request runs.
- Latest LLM-planned benchmark has 3 failed runtime run(s), including 3 before image generation. Latest provider failure(s): aquarium-lover-birthday: text provider read ECONNRESET; koi-fish-lover-encouragement: text provider connect ECONNREFUSED 127.0.0.1:5013; dog-lover-thank-you: text provider connect ECONNREFUSED 127.0.0.1:5013.
- Planner/theme adherence is still failing required terms: Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog.
- Latest aggregate is blocked: best score 38 across 3 run(s).
- Latest manual grade checklist is blocked: 0/0 generated run(s) graded, 0 failed before image generation.

## Next Steps

- Refresh planner preflight against the exact endpoint/model used by the latest benchmark before treating planner evidence as current.
- Run production-text planner preflight and benchmark evidence against installed production planner candidate(s): gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Resolve local model pull queue if the installed planner is too slow: qwen3-14b-instruct.
- Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.
- Manually grade every production-text run and aggregate only after all candidates pass.
- Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.

## Latest Evidence

| Type | Path | Status | Key result |
| --- | --- | --- | --- |
| Rerun Plan | [open](../production-text-rerun-plan-20260627-production-planner/production-text-rerun-plan.json) | rerun-required | 9 failed requirement(s); commands=10 |
| Planner | [open](../production-text-planner-preflight-20260627-production-planner/production-text-planner-preflight.json) | promotion-ready | production-suitable; model=koboldcpp/gemma-4-31B-it-Q4_K_M; context=8192 |
| Planner/Benchmark Alignment | [open](../production-text-workflow-20260627-production-planner-gpu-5013/production-text-workflow-summary.json) | blocked | preflight=http://127.0.0.1:5003/v1 koboldcpp/gemma-4-31B-it-Q4_K_M; benchmark=http://127.0.0.1:5013/v1 koboldcpp/gemma-4-31B-it-Q4_K_M; blockers=1 |
| Readiness | [open](../production-text-readiness-20260627-production-planner/production-text-readiness.json) | blocked | 1 blocker(s); planner=koboldcpp/gemma-4-31B-it-Q4_K_M |
| Model Coverage | [open](../local-model-coverage-20260627-current/local-model-coverage.json) | action-needed | 9 recommended installed; unevaluated production planners=gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash |
| Preflight | [open](../production-text-preflight-20260627-production-planner/production-text-preflight.json) | promotion-ready | comfy=yes node=yes |
| Dry Run | [open](../production-text-dry-run-20260627-production-planner/production-text-workflow-dry-run.json) | planning-proof | production-suitable koboldcpp/gemma-4-31B-it-Q4_K_M; planned=3; contract=full-production-card-copy-json |
| Manual Grades | [open](../production-text-manual-grade-checklist-20260627-production-planner/production-text-manual-grade-checklist.json) | blocked | 0/0 generated graded; manual-grades=0; missing=0; failed-before-image=0 |
| Aggregate | [open](../benchmark-aggregate-20260627-production-text-production-planner/benchmark-aggregate.json) | blocked | 2 run(s); best=73; ready=no |
| Benchmark | [open](../production-text-workflow-20260627-production-planner-gpu-5013/production-text-workflow-summary.json) | blocked | 0/3 completed; failed=3; failed-before-image=3 |

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
| 2026-06-27T02:19:19.090Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner-gpu-5013/production-text-workflow-summary.json) |
| 2026-06-27T02:02:58.139Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner-gpu/production-text-workflow-summary.json) |
| 2026-06-27T01:49:31.900Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner/production-text-workflow-summary.json) |
| 2026-06-26T04:21:27.749Z | 3 | 2 | 1 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T02:50:06.234Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2/production-text-workflow-summary.json) |
| 2026-06-26T02:27:14.553Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-soft-fields/production-text-workflow-summary.json) |
| 2026-06-26T02:05:28.762Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields/production-text-workflow-summary.json) |
| 2026-06-26T01:53:56.476Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T01:43:59.340Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo/production-text-workflow-summary.json) |
| 2026-06-26T01:25:39.502Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-live-node/production-text-workflow-summary.json) |

## Dry Runs

| Created | Planned | Planner | Context | Max output | Stories | Path |
| --- | ---:| --- | ---:| ---:| --- | --- |
| 2026-06-27T01:36:44.038Z | 3 | koboldcpp/gemma-4-31B-it-Q4_K_M | 8192 | 3200 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | [open](../production-text-dry-run-20260627-production-planner/production-text-workflow-dry-run.json) |
