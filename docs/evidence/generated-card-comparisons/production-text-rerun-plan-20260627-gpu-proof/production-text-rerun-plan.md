# Production Text Rerun Plan

Created: 2026-06-27T06:00:44.370Z
Status: rerun-required
Gate: docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-gpu-proof/production-text-promotion-gate.json
Evidence index: docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-gpu-proof/production-text-evidence-index.json

## Current Blockers

- local planner GPU-only fit is proven
- LLM-planned customer request matrix completed
- final images came from Comfy text composer
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready

## Planner Contract

- Keep the full creative planner prompt and switch the runtime, not the prompt quality.
- Minimum planner class: 14B+ dense/open-weight planner or stronger hosted model
- Minimum context tokens: 8192
- Recommended output tokens: 3200
- Recommended local request timeout: 1200000ms
- Required local GPU: device 1, gpulayers 999
- Recommended models: koboldcpp/gemma-4-31B-it-Q4_K_M, koboldcpp/Magistral-Small-2509-Q4_K_M, koboldcpp/Qwen3-14B-Q4_K_M, hosted/self-hosted GPT, Claude, Gemini, DeepSeek, Mistral, or Qwen 14B+ endpoint

Do not use for promotion:
- Qwen3-4B/8B and other 1.5B/3B/4B/7B/8B local planners
- 4096-context planner runs
- Reduced creative prompt contracts used only to fit small local models
- CPU-only KoboldCPP planner runs or --gpulayers 0
- -AllowSmallPlanner except when collecting explicit smoke/failure evidence

## Local Model Coverage

- Coverage report: docs/evidence/generated-card-comparisons/local-model-coverage-20260627-current/local-model-coverage.json
- Installed production planners: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Installed but not evaluated: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Missing production planner fallbacks: qwen3-14b-instruct

## Commands

### 1. Start or configure production planner

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -ModelPath D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf -Port 5013 -ContextSize 8192 -GpuId 1 -GpuLayers 999
```

Starts a production-suitable local planner with GPU offload. Use an equivalent hosted/self-hosted HTTPS OpenAI-compatible endpoint if local VRAM cannot run the planner.

### 2. Check planner GPU-only fit

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-gpu-feasibility.mjs --base-url http://127.0.0.1:5013/v1 --model koboldcpp/Magistral-Small-2509-Q4_K_M --model-path D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf --gpu-id 1 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-gpu-feasibility-20260627-production-planner
```

Blocks partial CPU-offload evidence by checking the active planner model size against the assigned GPU before planner preflight or throughput work.

### 3. Write planner preflight evidence

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5013/v1 --model koboldcpp/Magistral-Small-2509-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-production-planner
```

Proves the planner model, context budget, and output cap before image work starts.

### 4. Probe planner throughput

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-throughput-probe.mjs --base-url http://127.0.0.1:5013/v1 --model koboldcpp/Magistral-Small-2509-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200 --request-timeout-ms 1200000 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-throughput-20260627-production-planner
```

Uses the full card-copy prompt to prove the planner can finish valid JSON before spending Comfy image work.

### 5. Refresh live Comfy preflight

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true --report-dir docs/evidence/generated-card-comparisons/production-text-preflight-20260627-production-planner
```

Proves the current ComfyUI runtime is reachable and has CustomCardTextComposer loaded before readiness or image work rely on it.

### 6. Refresh readiness

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url http://127.0.0.1:5013/v1 --planner-context-tokens 8192 --planner-max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-readiness-20260627-production-planner
```

Confirms Comfy, the custom text node, aggregate state, model inventory, and the configured planner endpoint with the production context/output budget.

### 7. Run full production-text matrix

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5013/v1 -LocalLlmModel koboldcpp/Magistral-Small-2509-Q4_K_M -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192 -PlannerRequestTimeoutMs 1200000 -PlannerGpuId 1 -PlannerGpuLayers 999 -ProductionPlannerModelPath D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf
```

Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout; when the dedicated local planner port is missing, the wrapper starts the configured GPU-backed planner before the live run.

### 8. Manually grade every run

```powershell
docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner/production-text-workflow/*/manual-grade-template.md
```

Fill each template and save manual-visual-grade.json before aggregating promotion evidence.

### 9. Write manual grade checklist

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-manual-grade-checklist.mjs --advisory --input docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner --output-dir docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-20260627-production-planner
```

Summarizes generated runs, missing/invalid manual grades, blocked grades, and failed-before-image stories before aggregation.

### 10. Aggregate production-text results

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/model-benchmark-aggregate.mjs --input docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner --output-dir docs/evidence/generated-card-comparisons/benchmark-aggregate-20260627-production-text-production-planner --phase local-production-text
```

Builds the ranked aggregate used by the promotion gate.

### 11. Refresh tracked evidence index

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner
```

Aggregates tracked planner/readiness/preflight/benchmark/aggregate evidence after the rerun artifacts are committed.

### 12. Run final promotion gate

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-production-planner --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner
```

Shows whether every production-text requirement now passes. Remove --advisory only when a pass is expected.

## Acceptance Checks

- planner preflight is production-ready
- local planner GPU-only fit is proven
- planner throughput probe completes the full JSON contract
- planner preflight matches benchmark runtime
- live ComfyUI proof is current
- readiness doctor is promotion-ready
- production-suitable planner endpoint is reachable
- no small smoke planner is active or used
- LLM-planned customer request matrix completed
- final images came from Comfy text composer
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready
