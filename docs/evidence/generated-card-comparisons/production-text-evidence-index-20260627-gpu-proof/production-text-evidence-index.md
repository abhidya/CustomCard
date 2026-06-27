# Production Text Evidence Index

Created: 2026-06-27T05:19:49.000Z
Status: blocked
Promotion ready: no

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest dry-run planning proof keeps the full production card-copy JSON contract on koboldcpp/gemma-4-31B-it-Q4_K_M with 8192+ context, 3200 output tokens, and 1200000ms timeout across aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you.
- Latest planner preflight passed with koboldcpp/Magistral-Small-2509-Q4_K_M.
- Installed production planner candidates found locally: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Installed production planner candidates still need local production-text evaluation: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Recommended production planner candidates still missing locally: qwen3-14b-instruct.
- The latest LLM-planned benchmark covers 3 customer request runs.
- Latest LLM-planned benchmark has 3 failed runtime run(s), including 3 before image generation. Latest provider failure(s): aquarium-lover-birthday: text provider Local LLM chat completion request timed out after 1200000ms.; koi-fish-lover-encouragement: text provider Local LLM chat completion request timed out after 1200000ms.; dog-lover-thank-you: text provider Local LLM chat completion request timed out after 1200000ms..
- Planner/theme adherence is still failing required terms: Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog.
- Latest aggregate is blocked: best score 73 across 3 run(s).
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
| Rerun Plan | [open](../production-text-rerun-plan-20260627-gpu-proof/production-text-rerun-plan.json) | rerun-required | 5 failed requirement(s); commands=10 |
| Planner | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-planner-preflight.json) | promotion-ready | production-suitable; model=koboldcpp/Magistral-Small-2509-Q4_K_M; context=8192; gpu=yes |
| Planner/Benchmark Alignment | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-workflow-summary.json) | aligned | preflight=http://127.0.0.1:5013/v1 koboldcpp/Magistral-Small-2509-Q4_K_M; benchmark=http://127.0.0.1:5013/v1 koboldcpp/Magistral-Small-2509-Q4_K_M; blockers=0 |
| Readiness | [open](../production-text-readiness-20260627-gpu-proof-magistral-5013/production-text-readiness.json) | promotion-ready | 0 blocker(s); planner=koboldcpp/Magistral-Small-2509-Q4_K_M |
| Model Coverage | [open](../local-model-coverage-20260627-current/local-model-coverage.json) | action-needed | 9 recommended installed; unevaluated production planners=gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash |
| Preflight | [open](../production-text-preflight-20260627T040924Z/production-text-preflight.json) | promotion-ready | comfy=yes node=yes |
| Dry Run | [open](../production-text-dry-run-20260627-production-planner/production-text-workflow-dry-run.json) | planning-proof | production-suitable koboldcpp/gemma-4-31B-it-Q4_K_M; planned=3; contract=full-production-card-copy-json |
| Manual Grades | [open](../production-text-manual-grade-checklist-20260627-gpu-proof-magistral-5013-rerun/production-text-manual-grade-checklist.json) | blocked | 0/0 generated graded; manual-grades=0; missing=0; failed-before-image=0 |
| Aggregate | [open](../benchmark-aggregate-20260627-production-text-gpu-proof-magistral-5013-rerun/benchmark-aggregate.json) | blocked | 3 run(s); best=73; ready=no |
| Benchmark | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-workflow-summary.json) | blocked | 0/3 completed; failed=3; failed-before-image=3 |

## Aggregates

| Created | Runs | Best score | Statuses | Text models | Path |
| --- | ---:| ---:| --- | --- | --- |
| 2026-06-27T05:10:03.478Z | 3 | 73 | {"status-502":3} | koboldcpp/Magistral-Small-2509-Q4_K_M | [open](../benchmark-aggregate-20260627-production-text-gpu-proof-magistral-5013-rerun/benchmark-aggregate.json) |
| 2026-06-27T01:07:42.369Z | 2 | 73 | {"status-502":2} | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../benchmark-aggregate-20260627-production-text-production-planner/benchmark-aggregate.json) |
| 2026-06-26T04:36:01.116Z | 3 | 38 | {"blocked":2,"failed":1} | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json) |
| 2026-06-26T02:56:40.724Z | 6 | 72 | {"blocked":6} | n/a | [open](../benchmark-aggregate-2026-06-26-production-text-candidates/benchmark-aggregate.json) |
| 2026-06-26T01:38:49.778Z | 1 | 47 | {"blocked":1} | n/a | [open](../benchmark-aggregate-2026-06-26-production-text/benchmark-aggregate.json) |

## Benchmark Summaries

| Created | Runs | Completed | Failed | Fixtures | Text models | Path |
| --- | ---:| ---:| ---:| --- | --- | --- |
| 2026-06-27T04:09:27.438Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/Magistral-Small-2509-Q4_K_M | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-workflow-summary.json) |
| 2026-06-27T02:30:07.686Z | 1 | 0 | 1 | aquarium-lover-birthday | koboldcpp/Magistral-Small-2509-Q4_K_M | [open](../production-text-workflow-20260627-production-planner-magistral-gpu-5013/production-text-workflow-summary.json) |
| 2026-06-27T02:19:19.090Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner-gpu-5013/production-text-workflow-summary.json) |
| 2026-06-27T02:02:58.139Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner-gpu/production-text-workflow-summary.json) |
| 2026-06-27T01:49:31.900Z | 3 | 0 | 3 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/gemma-4-31B-it-Q4_K_M | [open](../production-text-workflow-20260627-production-planner/production-text-workflow-summary.json) |
| 2026-06-26T04:21:27.749Z | 3 | 2 | 1 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| 2026-06-26T02:50:06.234Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2/production-text-workflow-summary.json) |
| 2026-06-26T02:27:14.553Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-soft-fields/production-text-workflow-summary.json) |
| 2026-06-26T02:05:28.762Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields/production-text-workflow-summary.json) |
| 2026-06-26T01:53:56.476Z | 1 | 1 | 0 | folded-card-sunburst-typography | n/a | [open](../production-text-workflow-20260626-sdxl-turbo-cfg15/production-text-workflow-summary.json) |

## Dry Runs

| Created | Planned | Planner | Context | Max output | Stories | Path |
| --- | ---:| --- | ---:| ---:| --- | --- |
| 2026-06-27T01:36:44.038Z | 3 | koboldcpp/gemma-4-31B-it-Q4_K_M | 8192 | 3200 | aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you | [open](../production-text-dry-run-20260627-production-planner/production-text-workflow-dry-run.json) |
