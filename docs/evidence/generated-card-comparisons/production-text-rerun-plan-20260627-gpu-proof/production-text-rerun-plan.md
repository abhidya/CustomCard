# Production Text Rerun Plan

Created: 2026-06-27T06:12:32.447Z
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
- Runtime recommendation: hosted-required (Latest GPU feasibility evidence found no installed local production planner that fully fits a single assigned GPU.)
- Required local GPU when local: device 0, gpulayers 999
- Recommended models: koboldcpp/gemma-4-31B-it-Q4_K_M, koboldcpp/Magistral-Small-2509-Q4_K_M, koboldcpp/Qwen3-14B-Q4_K_M, hosted/self-hosted GPT, Claude, Gemini, DeepSeek, Mistral, or Qwen 14B+ endpoint
- Hardware-blocked local planners: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Runtime blocker: Planner model alone is 13670 MiB, larger than assigned GPU capacity 8192 MiB; this implies partial CPU offload under the current local runtime.

Do not use for promotion:
- Qwen3-4B/8B and other 1.5B/3B/4B/7B/8B local planners
- 4096-context planner runs
- Reduced creative prompt contracts used only to fit small local models
- CPU-only KoboldCPP planner runs or --gpulayers 0
- -AllowSmallPlanner except when collecting explicit smoke/failure evidence

## Local Model Coverage

- Coverage report: docs/evidence/generated-card-comparisons/local-model-coverage-20260627-current/local-model-coverage.json
- Installed production planners: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- GPU-only local candidates: none
- Hardware-blocked local candidates: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Installed but not evaluated: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Missing production planner fallbacks: qwen3-14b-instruct

## Commands

### 1. Configure hosted or self-hosted production planner

```powershell
$env:CUSTOMCARD_LOCAL_LLM_BASE_URL="https://YOUR_OPENAI_COMPATIBLE_ENDPOINT/v1"; $env:CUSTOMCARD_LOCAL_LLM_MODEL="YOUR_PRODUCTION_PLANNER_MODEL"; $env:CUSTOMCARD_LOCAL_LLM_API_KEY="<redacted>"
```

Configures a production-class OpenAI-compatible planner without using the local hardware-blocked KoboldCPP path. Keep these environment variables in the shell used for the remaining commands. Latest hardware-blocked local candidates: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash.

### 2. Write planner preflight evidence

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url $env:CUSTOMCARD_LOCAL_LLM_BASE_URL --model $env:CUSTOMCARD_LOCAL_LLM_MODEL --reported-context-tokens 8192 --max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-production-planner
```

Proves the hosted/self-hosted planner model, context budget, and output cap before image work starts.

### 3. Probe planner throughput

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-throughput-probe.mjs --base-url $env:CUSTOMCARD_LOCAL_LLM_BASE_URL --model $env:CUSTOMCARD_LOCAL_LLM_MODEL --reported-context-tokens 8192 --max-output-tokens 3200 --request-timeout-ms 1200000 --output-dir docs/evidence/generated-card-comparisons/production-text-planner-throughput-20260627-production-planner
```

Uses the full card-copy prompt to prove the planner can finish valid JSON before spending Comfy image work.

### 4. Refresh live Comfy preflight

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true --report-dir docs/evidence/generated-card-comparisons/production-text-preflight-20260627-production-planner
```

Proves the current ComfyUI runtime is reachable and has CustomCardTextComposer loaded before readiness or image work rely on it.

### 5. Refresh readiness

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url $env:CUSTOMCARD_LOCAL_LLM_BASE_URL --planner-context-tokens 8192 --planner-max-output-tokens 3200 --output-dir docs/evidence/generated-card-comparisons/production-text-readiness-20260627-production-planner
```

Confirms Comfy, the custom text node, aggregate state, model inventory, and the configured planner endpoint with the production context/output budget.

### 6. Run full production-text matrix

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl $env:CUSTOMCARD_LOCAL_LLM_BASE_URL -LocalLlmModel $env:CUSTOMCARD_LOCAL_LLM_MODEL -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192 -PlannerRequestTimeoutMs 1200000 -NoAutoStartPlanner
```

Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout, while preventing the wrapper from falling back to the known hardware-blocked local planner.

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

## Acceptance Checks

- planner preflight is production-ready
- planner runtime is hosted/self-hosted GPU capacity or local GPU-only fit is proven
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
