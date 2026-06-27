# Production Text Research Rollup

Created: 2026-06-27T02:58:59.050Z
Status: blocked
Promotion ready: no

## Source Reports

- Evidence index: [open](../production-text-evidence-index-20260627-production-planner/production-text-evidence-index.json)
- Promotion gate: [open](../production-text-promotion-gate-20260627-production-planner/production-text-promotion-gate.json)
- Rerun plan: [open](../production-text-rerun-plan-20260627-production-planner/production-text-rerun-plan.json)

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest dry-run planning proof keeps the full production card-copy JSON contract on koboldcpp/gemma-4-31B-it-Q4_K_M with 8192+ context, 3200 output tokens, and 1200000ms timeout across aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you.
- Latest planner preflight passed with koboldcpp/gemma-4-31B-it-Q4_K_M.
- Installed production planner candidates found locally: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Installed production planner candidates still need local production-text evaluation: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Recommended production planner candidates still missing locally: qwen3-14b-instruct.
- The latest LLM-planned benchmark covers 3 customer request runs.
- Planner/theme adherence is still failing required terms: Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog.
- Latest aggregate is blocked: best score 38 across 3 run(s).
- Latest manual grade checklist is blocked: 0/0 generated run(s) graded, 0 failed before image generation.
- Production planner contract: Keep the full creative planner prompt and switch the runtime, not the prompt quality.
- Reduced creative prompt contracts are disallowed for promotion evidence; fix finish_reason=length by using the correct planner runtime.
- Dry-run planning proof records the full-quality production planner path: koboldcpp/gemma-4-31B-it-Q4_K_M with 8192+ context, 3200 output tokens, 1200000ms timeout, and aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you planned.
- Production planner files are installed but not yet evaluated in local production-text evidence: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Optional production planner pull queue remains: qwen3-14b-instruct.
- Required customer terms still missing: Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog.
- Manual grade readiness is blocked: 0 blocked grade(s), 0 run(s) failed before image generation.
- Best current LLM-planned score is 38/100 and remains blocked.
- Promotion gate currently fails 5 requirement(s): readiness doctor is promotion-ready, LLM-planned customer request matrix completed, planner preserved required terms and avoided forbidden terms, manual grade checklist is promotion-ready, manual aggregate is promotion-ready.

## Evidence Summary

| Area | Status | Key result | Path |
| --- | --- | --- | --- |
| Comfy text composer | promotion-ready | comfy=yes node=yes | [open](../production-text-preflight-20260627-production-planner/production-text-preflight.json) |
| Planner | promotion-ready | production-suitable koboldcpp/gemma-4-31B-it-Q4_K_M; context=8192; max=3200 | [open](../production-text-planner-preflight-20260627-production-planner/production-text-planner-preflight.json) |
| Readiness | blocked | production planner reachable=yes; blockers=1 | [open](../production-text-readiness-20260627-production-planner/production-text-readiness.json) |
| Dry run | planning-proof | 3 planned; production-suitable koboldcpp/gemma-4-31B-it-Q4_K_M; context=8192; max=3200 | [open](../production-text-dry-run-20260627-production-planner/production-text-workflow-dry-run.json) |
| Model coverage | action-needed | 9 recommended installed; unevaluated planners=gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash | [open](../local-model-coverage-20260627-current/local-model-coverage.json) |
| Benchmark | blocked | 0/3 completed; failed=0; missing=Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog | [open](../production-text-workflow-20260627-production-planner/production-text-workflow-summary.json) |
| Manual grades | blocked | 0/0 generated graded; blocked=0; failed-before-image=0 | [open](../production-text-manual-grade-checklist-20260627-production-planner/production-text-manual-grade-checklist.json) |
| Aggregate | blocked | 3 run(s); best=38; statuses={"blocked":2,"failed":1} | [open](../benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json) |

## Promotion Gate

Failed requirements:
- readiness doctor is promotion-ready
- LLM-planned customer request matrix completed
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready

Passed requirements:
- live ComfyUI preflight passed
- live ComfyUI proof is current
- planner preflight is production-ready
- local model coverage is tracked
- production planner candidate is available
- production-suitable planner endpoint is reachable
- no small smoke planner is active or used
- final images came from Comfy text composer

## Next Commands

### 1. Start or configure production planner

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -ModelPath D:\models\gemma-4-31B-it-Q4_K_M.gguf -Port 5013 -ContextSize 8192 -GpuId 0 -GpuLayers 999
```

Starts a production-suitable local planner with GPU offload. Use an equivalent hosted/self-hosted HTTPS OpenAI-compatible endpoint if local VRAM cannot run the planner.

### 2. Write planner preflight evidence

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5013/v1 --model koboldcpp/gemma-4-31B-it-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-production-planner
```

Proves the planner model, context budget, and output cap before image work starts.

### 3. Refresh live Comfy preflight

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true --report-dir docs/evidence/generated-card-comparisons/production-text-preflight-20260627-production-planner
```

Proves the current ComfyUI runtime is reachable and has CustomCardTextComposer loaded before readiness or image work rely on it.

### 4. Refresh readiness

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url http://127.0.0.1:5013/v1 --planner-context-tokens 8192 --planner-max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-readiness-20260627-production-planner
```

Confirms Comfy, the custom text node, aggregate state, model inventory, and the configured planner endpoint with the production context/output budget.

### 5. Run full production-text matrix

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5013/v1 -LocalLlmModel koboldcpp/gemma-4-31B-it-Q4_K_M -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192 -PlannerRequestTimeoutMs 1200000 -PlannerGpuId 0 -PlannerGpuLayers 999
```

Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout.

### 6. Manually grade every run

```powershell
docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner/production-text-workflow/*/manual-grade-template.md
```

Fill each template and save manual-visual-grade.json before aggregating promotion evidence.

### 7. Write manual grade checklist

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-manual-grade-checklist.mjs --advisory --input docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner --output-dir docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-20260627-production-planner
```

Summarizes generated runs, missing/invalid manual grades, blocked grades, and failed-before-image stories before aggregation.

### 8. Aggregate production-text results

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/model-benchmark-aggregate.mjs --input docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner --output-dir docs/evidence/generated-card-comparisons/benchmark-aggregate-20260627-production-text-production-planner --phase local-production-text
```

Builds the ranked aggregate used by the promotion gate.

### 9. Refresh tracked evidence index

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner
```

Aggregates tracked planner/readiness/preflight/benchmark/aggregate evidence after the rerun artifacts are committed.

### 10. Run final promotion gate

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-production-planner --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner
```

Shows whether every production-text requirement now passes. Remove --advisory only when a pass is expected.

## Next Steps

- Run production-text planner preflight and benchmark evidence against installed production planner candidate(s): gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Resolve local model pull queue if the installed planner is too slow: qwen3-14b-instruct.
- Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.
- Manually grade every production-text run and aggregate only after all candidates pass.
- Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.
- Run the planner preflight and readiness doctor after starting a production-suitable planner endpoint with 8192+ context.
- Run the full aquarium/koi/dog production-text matrix to completion.
- Keep the full prompt and correct planner runtime; retry/repair planner output until must_include and must_avoid checks pass before Comfy work.
- Run the manual grade checklist after grading every generated run, then resolve missing/invalid/blocked grades before aggregation.
- Manually grade every run and regenerate the aggregate only after all candidates pass.
