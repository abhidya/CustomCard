# Production Text Research Rollup

Created: 2026-06-27T05:45:07.234Z
Status: blocked
Promotion ready: no

## Source Reports

- Evidence index: [open](../production-text-evidence-index-20260627-gpu-proof/production-text-evidence-index.json)
- Promotion gate: [open](../production-text-promotion-gate-20260627-gpu-proof/production-text-promotion-gate.json)
- Rerun plan: [open](../production-text-rerun-plan-20260627-gpu-proof/production-text-rerun-plan.json)

## Findings

- Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.
- Latest dry-run planning proof keeps the full production card-copy JSON contract on koboldcpp/gemma-4-31B-it-Q4_K_M with 8192+ context, 3200 output tokens, and 1200000ms timeout across aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you.
- Latest planner preflight passed with koboldcpp/Magistral-Small-2509-Q4_K_M.
- Latest planner throughput probe is blocked for koboldcpp/Magistral-Small-2509-Q4_K_M: Planner throughput request timed out after 300000ms.
- Installed production planner candidates found locally: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Installed production planner candidates still need local production-text evaluation: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Recommended production planner candidates still missing locally: qwen3-14b-instruct.
- The latest LLM-planned benchmark covers 3 customer request runs.
- Latest LLM-planned benchmark has 3 failed runtime run(s), including 3 before image generation. Latest provider failure(s): aquarium-lover-birthday: text provider Local LLM chat completion request timed out after 1200000ms.; koi-fish-lover-encouragement: text provider Local LLM chat completion request timed out after 1200000ms.; dog-lover-thank-you: text provider Local LLM chat completion request timed out after 1200000ms..
- Planner/theme adherence is still failing required terms: Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog.
- Latest aggregate is blocked: best score 73 across 3 run(s).
- Latest manual grade checklist is blocked: 0/0 generated run(s) graded, 0 failed before image generation.
- Production planner contract: Keep the full creative planner prompt and switch the runtime, not the prompt quality.
- Reduced creative prompt contracts are disallowed for promotion evidence; fix finish_reason=length by using the correct planner runtime.
- Planner throughput probe is blocked for koboldcpp/Magistral-Small-2509-Q4_K_M: Planner throughput request timed out after 300000ms.
- Dry-run planning proof records the full-quality production planner path: koboldcpp/gemma-4-31B-it-Q4_K_M with 8192+ context, 3200 output tokens, 1200000ms timeout, and aquarium-lover-birthday, koi-fish-lover-encouragement, dog-lover-thank-you planned.
- Production planner files are installed but not yet evaluated in local production-text evidence: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Optional production planner pull queue remains: qwen3-14b-instruct.
- Required customer terms still missing: Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog.
- Manual grade readiness is blocked: 0 blocked grade(s), 0 run(s) failed before image generation.
- Best current LLM-planned score is 73/100 and remains blocked.
- Promotion gate currently fails 5 requirement(s): LLM-planned customer request matrix completed, final images came from Comfy text composer, planner preserved required terms and avoided forbidden terms, manual grade checklist is promotion-ready, manual aggregate is promotion-ready.

## Evidence Summary

| Area | Status | Key result | Path |
| --- | --- | --- | --- |
| Comfy text composer | promotion-ready | comfy=yes node=yes | [open](../production-text-preflight-20260627T040924Z/production-text-preflight.json) |
| Planner | promotion-ready | production-suitable koboldcpp/Magistral-Small-2509-Q4_K_M; context=8192; max=3200 | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-planner-preflight.json) |
| Planner throughput | blocked | blocked koboldcpp/Magistral-Small-2509-Q4_K_M; fixture=aquarium-lover-birthday; duration=300056ms; failure=Planner throughput request timed out after 300000ms. | [open](../production-text-planner-throughput-20260627-magistral-5013-5min/production-text-planner-throughput.json) |
| Planner/runtime alignment | promotion-ready | checked=yes ok=yes; preflight=http://127.0.0.1:5013/v1; benchmark=http://127.0.0.1:5013/v1; blockers=0 | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-workflow-summary.json) |
| Readiness | promotion-ready | production planner reachable=yes; blockers=0 | [open](../production-text-readiness-20260627-gpu-proof-magistral-5013/production-text-readiness.json) |
| Dry run | planning-proof | 3 planned; production-suitable koboldcpp/gemma-4-31B-it-Q4_K_M; context=8192; max=3200 | [open](../production-text-dry-run-20260627-production-planner/production-text-workflow-dry-run.json) |
| Model coverage | action-needed | 9 recommended installed; unevaluated planners=gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash | [open](../local-model-coverage-20260627-current/local-model-coverage.json) |
| Benchmark | blocked | 0/3 completed; failed=3; failed-before-image=3; provider=aquarium-lover-birthday: text provider Local LLM chat completion request timed out after 1200000ms.; koi-fish-lover-encouragement: text provider Local LLM chat completion request timed out after 1200000ms.; missing=Nina, birthday, aquarium, Uncle Ken, koi, encouragement, Morgan, thank, dog | [open](../production-text-workflow-20260627-gpu-proof-magistral-5013-rerun/production-text-workflow-summary.json) |
| Manual grades | blocked | 0/0 generated graded; blocked=0; failed-before-image=0 | [open](../production-text-manual-grade-checklist-20260627-gpu-proof-magistral-5013-rerun/production-text-manual-grade-checklist.json) |
| Aggregate | blocked | 3 run(s); best=73; statuses={"status-502":3} | [open](../benchmark-aggregate-20260627-production-text-gpu-proof-magistral-5013-rerun/benchmark-aggregate.json) |

## Promotion Gate

Failed requirements:
- LLM-planned customer request matrix completed
- final images came from Comfy text composer
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready

Passed requirements:
- live ComfyUI preflight passed
- live ComfyUI proof is current
- planner preflight is production-ready
- local planner GPU residency is proven
- planner preflight matches benchmark runtime
- readiness doctor is promotion-ready
- local model coverage is tracked
- production planner candidate is available
- production-suitable planner endpoint is reachable
- no small smoke planner is active or used

## Next Commands

### 1. Start or configure production planner

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -ModelPath D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf -Port 5013 -ContextSize 8192 -GpuId 1 -GpuLayers 999
```

Starts a production-suitable local planner with GPU offload. Use an equivalent hosted/self-hosted HTTPS OpenAI-compatible endpoint if local VRAM cannot run the planner.

### 2. Write planner preflight evidence

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5013/v1 --model koboldcpp/Magistral-Small-2509-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-production-planner
```

Proves the planner model, context budget, and output cap before image work starts.

### 3. Probe planner throughput

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-throughput-probe.mjs --base-url http://127.0.0.1:5013/v1 --model koboldcpp/Magistral-Small-2509-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200 --request-timeout-ms 1200000 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-throughput-20260627-production-planner
```

Uses the full card-copy prompt to prove the planner can finish valid JSON before spending Comfy image work.

### 4. Refresh live Comfy preflight

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true --report-dir docs/evidence/generated-card-comparisons/production-text-preflight-20260627-production-planner
```

Proves the current ComfyUI runtime is reachable and has CustomCardTextComposer loaded before readiness or image work rely on it.

### 5. Refresh readiness

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url http://127.0.0.1:5013/v1 --planner-context-tokens 8192 --planner-max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-readiness-20260627-production-planner
```

Confirms Comfy, the custom text node, aggregate state, model inventory, and the configured planner endpoint with the production context/output budget.

### 6. Run full production-text matrix

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5013/v1 -LocalLlmModel koboldcpp/Magistral-Small-2509-Q4_K_M -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192 -PlannerRequestTimeoutMs 1200000 -PlannerGpuId 1 -PlannerGpuLayers 999 -ProductionPlannerModelPath D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf
```

Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout; when the dedicated local planner port is missing, the wrapper starts the configured GPU-backed planner before the live run.

### 7. Manually grade every run

```powershell
docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner/production-text-workflow/*/manual-grade-template.md
```

Fill each template and save manual-visual-grade.json before aggregating promotion evidence.

### 8. Write manual grade checklist

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-manual-grade-checklist.mjs --advisory --input docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner --output-dir docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-20260627-production-planner
```

Summarizes generated runs, missing/invalid manual grades, blocked grades, and failed-before-image stories before aggregation.

### 9. Aggregate production-text results

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/model-benchmark-aggregate.mjs --input docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner --output-dir docs/evidence/generated-card-comparisons/benchmark-aggregate-20260627-production-text-production-planner --phase local-production-text
```

Builds the ranked aggregate used by the promotion gate.

### 10. Refresh tracked evidence index

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner
```

Aggregates tracked planner/readiness/preflight/benchmark/aggregate evidence after the rerun artifacts are committed.

### 11. Run final promotion gate

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-production-planner --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner
```

Shows whether every production-text requirement now passes. Remove --advisory only when a pass is expected.

## Next Steps

- Run the production-text planner throughput probe before spending another full Comfy image benchmark on a local planner candidate.
- Run production-text planner preflight and benchmark evidence against installed production planner candidate(s): gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.
- Resolve local model pull queue if the installed planner is too slow: qwen3-14b-instruct.
- Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.
- Manually grade every production-text run and aggregate only after all candidates pass.
- Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.
- Run the full aquarium/koi/dog production-text matrix to completion.
- Keep the full prompt and correct planner runtime; retry/repair planner output until must_include and must_avoid checks pass before Comfy work.
- Run the manual grade checklist after grading every generated run, then resolve missing/invalid/blocked grades before aggregation.
- Manually grade every run and regenerate the aggregate only after all candidates pass.
