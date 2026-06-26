# Production Text Rerun Plan

Created: 2026-06-26T23:48:03.335Z
Status: rerun-required
Gate: docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current/production-text-promotion-gate.json
Evidence index: docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current/production-text-evidence-index.json

## Current Blockers

- planner preflight is production-ready
- readiness doctor is promotion-ready
- production-suitable planner endpoint is reachable
- no small smoke planner is active or used
- LLM-planned customer request matrix completed
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready

## Planner Contract

- Keep the full creative planner prompt and switch the runtime, not the prompt quality.
- Minimum planner class: 14B+ dense/open-weight planner or stronger hosted model
- Minimum context tokens: 8192
- Recommended output tokens: 3200
- Recommended models: koboldcpp/gemma-4-31B-it-Q4_K_M, koboldcpp/Magistral-Small-2509-Q4_K_M, koboldcpp/Qwen3-14B-Q4_K_M, hosted/self-hosted GPT, Claude, Gemini, DeepSeek, Mistral, or Qwen 14B+ endpoint

Do not use for promotion:
- Qwen3-4B/8B and other 1.5B/3B/4B/7B/8B local planners
- 4096-context planner runs
- Reduced creative prompt contracts used only to fit small local models
- -AllowSmallPlanner except when collecting explicit smoke/failure evidence

## Local Model Coverage

- Coverage report: docs/evidence/generated-card-comparisons/local-model-coverage-20260626-current/local-model-coverage.json
- Installed production planners: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Installed but not evaluated: gemma-4-31b-it, magistral-small-2509, deepseek-v4-flash
- Missing production planner fallbacks: qwen3-14b-instruct

## Commands

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

## Acceptance Checks

- planner preflight is production-ready
- readiness doctor is promotion-ready
- production-suitable planner endpoint is reachable
- no small smoke planner is active or used
- LLM-planned customer request matrix completed
- planner preserved required terms and avoided forbidden terms
- manual grade checklist is promotion-ready
- manual aggregate is promotion-ready
