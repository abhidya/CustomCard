# Production Text Research Findings - 2026-06-26

## Current Contract

Production text should be planned by the card-copy LLM and rendered by ComfyUI:

- Fixed benchmark inputs are customer requests, not finished themes.
- The LLM decides `theme_guide`, panel copy, `text_layout`, and per-panel artwork prompts.
- Image prompts stay artwork-only and must not contain exact generated copy.
- `panel_copy` carries the exact generated headline/body/layout into `CustomCardTextComposer`.
- Panels returned from `customcard-production-text-overlay` are final text-composited images and must not receive the old SVG/app text overlay again.

## Evidence Snapshot

| Evidence | Result | Finding |
| --- | --- | --- |
| `docs/evidence/generated-card-comparisons/production-text-preflight-20260626-live-node` | Passed | Live ComfyUI could load `CustomCardTextComposer` and the production overlay workflow. |
| Live preflight rerun on 2026-06-26 04:03 UTC | Passed | Current local Comfy runtime is reachable at `http://127.0.0.1:8188` and exposes all production text compositor inputs. |
| `.codex/tmp/production-text-llm-check` dry run | No planned runs | The ambient shell did not provide `CUSTOMCARD_COMFYUI_URL` or a local LLM base URL, so benchmark discovery could not schedule live local production-text runs. |
| `.codex/tmp/production-text-llm-planner-dry-run` with local Comfy + local LLM env set | Planned 3 runs | The current contract schedules `aquarium-lover-birthday`, `koi-fish-lover-encouragement`, and `dog-lover-thank-you` as `llm-generated-copy` runs through local OpenAI-compatible text plus local Comfy image. |
| `tools/run-production-text-benchmark.ps1 -DryRun -SkipPreflight` without local LLM | Failed fast | The wrapper now refuses to silently run the compositor fixture when the LLM-planned matrix cannot be scheduled. |
| `.codex/tmp/production-text-wrapper-fixture` with `-AllowCompositorFixtureFallback` | Planned 1 run | Explicit fallback still schedules only `folded-card-sunburst-typography` as `compositor-fixture`. |
| `.codex/tmp/production-text-wrapper-llm` with `-LocalLlmBaseUrl` and `-LocalLlmModel` | Planned 3 runs | Wrapper parameters schedule the full `llm-generated-copy` aquarium/koi/dog matrix without manual env setup. |
| Live wrapper preflight on 2026-06-26 04:16 UTC | Blocked before image generation | Local ComfyUI passed live preflight, but the local LLM probe to `http://127.0.0.1:1234/v1/models` failed with connection refused. This is now a fast setup failure, not a late benchmark failure. |
| `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15` | Ran 3 planned runs | KoboldCPP Qwen3-4B on `http://127.0.0.1:5001/v1` plus local Comfy reached the full aquarium/koi/dog matrix. Aquarium and dog rendered four panels; koi failed before images due truncated invalid JSON. |
| `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live` | Blocked | Manual grades: aquarium 38/100, dog 34/100, koi 0/100. Promotion remains blocked by planner theme adherence and JSON reliability, not by Comfy text compositing. |
| Card-copy contract follow-up | Implemented | The generator keeps the full planner prompt, passes benchmark `must_include`/`must_avoid` into the request, validates and retries missing required terms before Comfy, and preserves useful loose LLM JSON shapes instead of falling back to generic themes. |
| `tools/run-production-text-benchmark.ps1` small-planner guard | Implemented | Production evidence now rejects known-small planners such as Qwen3-4B unless `-AllowSmallPlanner` is explicit. The 4B path remains useful for smoke/failure evidence, not promotion. |
| `tools/start-local-card-planner.ps1` Gemma 31B attempt | Operationally blocked | Gemma 31B loaded at `http://127.0.0.1:5003/v1`, but CPU decoding did not finish the first benchmark planner response in a practical window even with `-PlannerMaxTokens 1800`. Use GPU/offload or a hosted/self-hosted larger planner for promotion evidence. |
| `docs/evidence/generated-card-comparisons/production-text-readiness-20260626-current` | Blocked | Readiness doctor confirms ComfyUI and `CustomCardTextComposer` are live and higher-quality planner files are installed, but the discovered reachable planner is still Qwen3-4B on `5001` and no production-suitable endpoint is reachable/configured. |
| `docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current` | Blocked | Evidence index aggregates the tracked readiness, preflight, benchmark, aggregate, and manual-grade reports. It excludes untracked scratch by default and keeps promotion blocked by the small planner endpoint plus failed LLM-planned aggregate. |
| `docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current` | Blocked | Promotion gate passes live Comfy/text-composer and final-Comfy-image requirements, but fails readiness, production-suitable planner, no-small-planner, full matrix completion, must-include adherence, and manual aggregate requirements. |
| `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2` | 72/100, blocked | Deterministic Comfy text, soft text fields, and artwork guards work structurally, but artwork remains too dense for production. |
| `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-candidates` | Blocked | Aggregate evidence still says do not promote production Comfy text as the default path. |

## Local Scratch Findings

The local scratch run at
`docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-themed-fixtures`
was intentionally not committed because it contains generated image artifacts
from the now-superseded hardcoded theme-spec path. Its manual grades are still
useful as research notes:

| Run | Score | Status | Finding |
| --- | ---: | --- | --- |
| `folded-card-sunburst-typography` | 72/100 | blocked | Exact text and four-panel structure work, but the artwork guard is visibly rescuing dense art and the back is too patterned. |
| `aquarium-lover-birthday` | 62/100 | blocked | Theme is recognizable, but the model creates a full aquarium illustration instead of restrained stationery; interior texture reads close to pseudo text. |
| `koi-fish-lover-encouragement` | 66/100 | blocked | More coherent than aquarium, but still dense ornamental illustration; sparse back-cover contract fails. |
| `dog-lover-thank-you` | 58/100 | blocked | Weakest theme adherence; artwork reads generic and not dog-lover-specific. |

These scratch results support the architectural change made after the run:
customer-interest examples should be fixed user requests, while the LLM should
decide the final creative concept. Hardcoding finished palette/motif/copy in the
benchmark overconstrained the wrong layer and still did not fix artwork quality.

## Live LLM-Planned Matrix

The live LLM-planned production matrix ran against the local KoboldCPP Qwen3-4B
text server on port `5001`:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5001/v1 -LocalLlmModel koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15 -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform
```

That run is failure evidence, not promotion evidence. The wrapper now rejects
Qwen3-4B by default for live production evidence because the run proved it can
miss required customer terms and truncate JSON. Use `-AllowSmallPlanner` only
when intentionally collecting exploratory failure evidence.

For the installed higher-quality local planner:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -Port 5003 -ContextSize 8192
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5003/v1 -LocalLlmModel koboldcpp/gemma-4-31B-it-Q4_K_M -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 1800
```

Gemma 31B loaded successfully on this machine but was too slow on CPU-only
settings for a practical benchmark pass. The next promotion attempt should run
the same full-quality prompt through GPU/offload or a hosted/self-hosted larger
planner.

The wrapper accepts either a root local URL such as `http://127.0.0.1:5001` or
a `/v1` URL such as `http://127.0.0.1:5001/v1`, then probes `/v1/models` before
live provider calls. Use `-DryRun` to inspect planned aquarium/koi/dog runs
while the text server is offline.

Run `npm run comfy:production-text:doctor -- --advisory` before collecting new
promotion evidence. It aggregates workflow/node availability, local model
inventory, planner endpoint suitability, and the latest manual aggregate so the
run does not accidentally use a reduced-quality smoke planner.

Run `npm run comfy:production-text:evidence -- --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current`
to refresh the tracked production-text evidence index. Add `--include-untracked`
only when intentionally reviewing local scratch runs that should not be treated
as promotion proof.

Run `npm run comfy:production-text:gate -- --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current`
as the final promotion contract. Remove `--advisory` only when the current
planner/runtime and aggregate evidence are expected to pass.

Use `-AllowCompositorFixtureFallback` only when intentionally collecting a
single-run structural compositor smoke test.

## Next Gate

Promotion remains blocked. The next gate is no longer reachability; it is
correct planner runtime plus planner-output validation:

- Keep full prompt quality and use a planner/runtime large enough for the full
  creative contract.
- Run the readiness doctor before promotion attempts and point
  `-LocalLlmBaseUrl` at a production-suitable planner, not the Qwen3-4B smoke
  endpoint.
- Preserve `must_include` terms in generated copy/theme metadata and reject or
  retry card plans that omit them before Comfy image generation.
- Preserve useful loose JSON shapes and add post-response JSON repair where
  needed; do not shrink the creative prompt to fit an underpowered model.
- Keep the deterministic Comfy text compositor path; the live failure is mostly
  planner/theme adherence, with remaining back-panel discipline issues.
