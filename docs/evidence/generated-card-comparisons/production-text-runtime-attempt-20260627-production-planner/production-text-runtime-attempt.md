# Production Text Runtime Attempt

Created: 2026-06-27T00:59:00.000Z

Status: stopped-throughput-blocked

Planner: `koboldcpp/gemma-4-31B-it-Q4_K_M`

Runtime budget: 8192 context tokens, 3200 output tokens

Comfy: `http://127.0.0.1:8188`

## Command

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5003/v1 -LocalLlmModel koboldcpp/gemma-4-31B-it-Q4_K_M -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260627-production-planner -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192
```

## Observations

- Live Comfy preflight passed before the benchmark attempt.
- Gemma 31B planner preflight passed with 8192 context and 3200 output tokens before the benchmark attempt.
- The benchmark wrote partial evidence for `aquarium-lover-birthday` and
  `koi-fish-lover-encouragement`.
- Both completed run records failed before image generation with text provider
  failure: `fetch failed`.
- The `dog-lover-thank-you` run had started but did not finish before the run
  was stopped.
- The KoboldCPP worker reached about 27 GB resident memory and kept consuming CPU after the client was stopped, so the local CPU-only planner was stopped to release the machine.

## Next Action

Run the full aquarium/koi/dog production-text matrix with the same full prompt
contract on GPU/offload or a hosted/self-hosted production-suitable planner
endpoint. Do not reduce prompt quality to fit a slower local CPU path.
