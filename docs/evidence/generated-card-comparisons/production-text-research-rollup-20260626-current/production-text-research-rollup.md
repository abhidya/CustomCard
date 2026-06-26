# Production Text Research Rollup

Created: 2026-06-26T23:48:16.731Z
Status: blocked
Promotion ready: no

## Source Reports

- Evidence index: [open](../production-text-evidence-index-20260626-current/production-text-evidence-index.json)
- Promotion gate: [open](../production-text-promotion-gate-20260626-current/production-text-promotion-gate.json)
- Rerun plan: [open](../production-text-rerun-plan-20260626-current/production-text-rerun-plan.json)

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest planner preflight is blocked: smoke-only model koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S.
- No production-suitable planner endpoint is reachable/configured in the latest readiness report.
- Installed production planner candidates found locally: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Installed production planner candidates still need local production-text evaluation: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Recommended production planner candidates still missing locally: qwen3-14b-instruct.
- The latest LLM-planned benchmark covers 3 customer request runs.
- Planner/theme adherence is still failing required terms: Nina, aquarium, Morgan, dog.
- Latest aggregate is blocked: best score 38 across 3 run(s).
- Latest manual grade checklist is blocked: 2/2 generated run(s) graded, 1 failed before image generation.
- Production planner contract: Keep the full creative planner prompt and switch the runtime, not the prompt quality.
- Reduced creative prompt contracts are disallowed for promotion evidence; fix finish_reason=length by using the correct planner runtime.
- Planner evidence is not promotable: koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S is smoke-only.
- A production-suitable planner endpoint is not currently reachable.
- Production planner files are installed but not yet evaluated in local production-text evidence: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Optional production planner pull queue remains: qwen3-14b-instruct.
- The latest LLM-planned matrix is smoke/failure evidence because it used a known-small planner.
- Required customer terms still missing: Nina, aquarium, Morgan, dog.
- Manual grade readiness is blocked: 3 blocked grade(s), 1 run(s) failed before image generation.
- Best current LLM-planned score is 38/100 and remains blocked.
- Promotion gate currently fails 8 requirement(s): planner preflight is production-ready, readiness doctor is promotion-ready, production-suitable planner endpoint is reachable, no small smoke planner is active or used, LLM-planned customer request matrix completed, planner preserved required terms and avoided forbidden terms, manual grade checklist is promotion-ready, manual aggregate is promotion-ready.

## Evidence Summary

| Area | Status | Key result | Path |
| --- | --- | --- | --- |
| Comfy text composer | promotion-ready | comfy=yes node=yes | [open](../production-text-preflight-20260626T042126Z/production-text-preflight.json) |
| Planner | blocked | smoke-only koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S; context=4096; max=3200 | [open](../production-text-planner-preflight-20260626-current/production-text-planner-preflight.json) |
| Readiness | blocked | production planner reachable=no; blockers=5 | [open](../production-text-readiness-20260626-current/production-text-readiness.json) |
| Model coverage | action-needed | 9 recommended installed; unevaluated planners=gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash | [open](../local-model-coverage-20260626-current/local-model-coverage.json) |
| Benchmark | blocked | 2/3 completed; failed=1; missing=Nina, aquarium, Morgan, dog | [open](../production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json) |
| Manual grades | blocked | 2/2 generated graded; blocked=3; failed-before-image=1 | [open](../production-text-manual-grade-checklist-20260626-current/production-text-manual-grade-checklist.json) |
| Aggregate | blocked | 3 run(s); best=38; statuses={"blocked":2,"failed":1} | [open](../benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json) |

## Promotion Gate

Failed requirements:
- planner preflight is production-ready
- readiness doctor is promotion-ready
- production-suitable planner endpoint is reachable
- no small smoke planner is active or used
- LLM-planned customer request matrix completed
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready

Passed requirements:
- live ComfyUI preflight passed
- local model coverage is tracked
- production planner candidate is available
- final images came from Comfy text composer

## Next Commands

### 1. Start or configure production planner

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -ModelPath D:\models\gemma-4-31B-it-Q4_K_M.gguf -Port 5003 -ContextSize 8192
```

Starts a production-suitable local planner when GPU/offload resources are available. Use an equivalent hosted/self-hosted HTTPS OpenAI-compatible endpoint if local CPU decoding is too slow.

### 2. Write planner preflight evidence

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5003/v1 --model koboldcpp/gemma-4-31B-it-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260626-production-planner
```

Proves the planner model, context budget, and output cap before image work starts.

### 3. Refresh readiness

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url http://127.0.0.1:5003/v1 --output-dir docs/evidence/generated-card-comparisons/production-text-readiness-20260626-production-planner
```

Confirms Comfy, the custom text node, aggregate state, model inventory, and configured planner endpoint.

### 4. Run full production-text matrix

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5003/v1 -LocalLlmModel koboldcpp/gemma-4-31B-it-Q4_K_M -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260626-production-planner -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192
```

Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout.

### 5. Manually grade every run

```powershell
docs/evidence/generated-card-comparisons/production-text-workflow-20260626-production-planner/production-text-workflow/*/manual-grade-template.md
```

Fill each template and save manual-visual-grade.json before aggregating promotion evidence.

### 6. Write manual grade checklist

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-manual-grade-checklist.mjs --advisory --input docs/evidence/generated-card-comparisons/production-text-workflow-20260626-production-planner --output-dir docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-20260626-production-planner
```

Summarizes generated runs, missing/invalid manual grades, blocked grades, and failed-before-image stories before aggregation.

### 7. Aggregate production-text results

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/model-benchmark-aggregate.mjs --input docs/evidence/generated-card-comparisons/production-text-workflow-20260626-production-planner --output-dir docs/evidence/generated-card-comparisons/benchmark-aggregate-20260626-production-text-production-planner --phase local-production-text
```

Builds the ranked aggregate used by the promotion gate.

### 8. Refresh tracked evidence index

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-production-planner
```

Aggregates tracked planner/readiness/preflight/benchmark/aggregate evidence after the rerun artifacts are committed.

### 9. Run final promotion gate

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-production-planner --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-production-planner
```

Shows whether every production-text requirement now passes. Remove --advisory only when a pass is expected.

## Next Steps

- Run production-text planner preflight with a production-suitable model, 8192+ context, and the full output budget.
- Run the planner preflight, then start or configure a production-suitable planner endpoint with 8192+ context before collecting promotion evidence.
- Run production-text planner preflight and benchmark evidence against installed production planner candidate(s): gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Resolve local model pull queue if the installed planner is too slow: qwen3-14b-instruct.
- Keep Qwen3-4B/8B and other small planner runs as smoke or failure evidence only.
- Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.
- Manually grade every production-text run and aggregate only after all candidates pass.
- Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.
- Run the planner preflight and readiness doctor after starting a production-suitable planner endpoint with 8192+ context.
- Use Qwen3-4B/8B only for smoke/failure evidence; run promotion evidence with Gemma 31B, Magistral Small, Qwen3-14B+, or a hosted/self-hosted production planner.
- Run the full aquarium/koi/dog production-text matrix to completion.
- Keep the full prompt and correct planner runtime; retry/repair planner output until must_include and must_avoid checks pass before Comfy work.
- Run the manual grade checklist after grading every generated run, then resolve missing/invalid/blocked grades before aggregation.
- Manually grade every run and regenerate the aggregate only after all candidates pass.
