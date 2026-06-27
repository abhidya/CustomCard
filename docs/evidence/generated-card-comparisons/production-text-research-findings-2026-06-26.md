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
| Card-copy contract follow-up | Implemented | The generator keeps the full planner prompt, passes benchmark `must_include`/`must_avoid` into the request, validates and retries missing required or forbidden terms before Comfy, preserves useful loose LLM JSON shapes, and gives aquarium/koi/dog fallback theme/copy/cue/visual-brief repair request-aware branches instead of generic botanical or plant-watering fallbacks. |
| `tools/run-production-text-benchmark.ps1` small-planner guard | Implemented | Production evidence now rejects known-small planners such as Qwen3-4B/8B unless `-AllowSmallPlanner` is explicit. The 4B/8B path remains useful for smoke/failure evidence, not promotion. |
| `scripts/production-text-planner-preflight.mjs` | Implemented | Planner preflight now rejects Qwen3-4B/8B, 4096-context, and reduced output caps for production evidence. It allows small planners only as explicit smoke/failure evidence and keeps the full creative contract. |
| `docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260626-current` | Blocked | The 2026-06-26 `5001` `/models` probe was not reachable, and the explicit Qwen3-4B/4096-context planner was smoke-only. Promotion evidence must use a production-suitable planner with 8192+ context and the full output budget. |
| `docs/evidence/generated-card-comparisons/local-model-coverage-20260626-current` | Action needed | Local coverage now records installed production planner candidates: Gemma 31B, Magistral Small, and DeepSeek V4 Flash are present but not yet evaluated in local production-text evidence; Qwen3 14B remains an optional missing fallback if installed planners are too slow. |
| `docs/evidence/generated-card-comparisons/production-text-rerun-plan-20260626-current` | Rerun required | Converts the 9 failed promotion-gate requirements into 10 ordered commands: production planner start/configuration, planner preflight, live Comfy preflight, readiness, aquarium/koi/dog benchmark, manual grading, manual grade checklist, aggregate, evidence index, and final gate. It also records local model coverage so agents can see installed-but-unevaluated planner candidates. |
| `tools/start-local-card-planner.ps1` Gemma 31B attempt | Operationally blocked | Gemma 31B loaded at `http://127.0.0.1:5003/v1`, but CPU decoding did not finish the first benchmark planner response in a practical window. Do not reduce prompt quality for promotion; use GPU/offload or a hosted/self-hosted larger planner with the full output budget. |
| `docs/evidence/generated-card-comparisons/production-text-readiness-20260626-current` | Blocked | Previous live preflight proved `CustomCardTextComposer` worked, but the 2026-06-26 readiness probe found local Comfy and planner endpoints offline. Higher-quality planner files were installed, but no production-suitable endpoint was reachable/configured. |
| `docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-20260626-current` | Blocked | Manual grade checklist records 3 valid manual grades, 2 generated gradable runs, and 1 koi run that failed before image generation. All grades remain blocked or failed; the historical aquarium/dog run still misses required customer terms and needs replacement evidence from the hardened planner contract. |
| `docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current` | Blocked | The 2026-06-26 evidence index aggregated the tracked rerun plan, planner preflight, readiness, local model coverage, Comfy preflight, benchmark, aggregate, and manual-grade reports. It excluded untracked scratch by default and kept promotion blocked by the planner preflight, missing live production endpoint, installed-but-unevaluated planner candidates, and failed LLM-planned aggregate. |
| `docs/evidence/generated-card-comparisons/production-text-research-rollup-20260626-current` | Blocked | Generated rollup derived the 2026-06-26 findings, failed gate requirements, model coverage summary, evidence summary, and 10 rerun commands from the tracked evidence index, promotion gate, and rerun plan. |
| `docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current` | Blocked | Promotion gate verified tracked local model coverage, production-planner-candidate availability, and then-current live Comfy proof. It passed historical live Comfy/text-composer preflight plus final-Comfy-image requirements, but still failed 9 requirements: then-current live Comfy proof, planner preflight, readiness, production-suitable endpoint, no-small-planner, full matrix completion, must-include adherence, manual grade checklist, and manual aggregate. |
| `docs/evidence/generated-card-comparisons/production-text-preflight-20260627-current` | Failed | Fresh live Comfy preflight now reports `liveComfyReachable=false` and `liveNodeAvailable=false`; promotion no longer relies on the older 2026-06-26 live proof. |
| `docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-current` | Blocked | Gemma 31B is selected with 8192 context and 3200 output tokens and is classified as production-suitable, but the `http://127.0.0.1:5003/v1/models` probe is not reachable. |
| `docs/evidence/generated-card-comparisons/production-text-readiness-20260627-current` | Blocked | Current readiness has 5 blockers: live Comfy is offline, `CustomCardTextComposer` is not proven loaded, the latest LLM aggregate remains blocked, and the configured production planner endpoint is unreachable/not production-ready at runtime. |
| `docs/evidence/generated-card-comparisons/local-model-coverage-20260627-current` | Action needed | Fresh local model coverage still finds installed production planner candidates Gemma 31B, Magistral Small, and DeepSeek V4 Flash, all unevaluated in local production-text evidence; Qwen3 14B remains an optional missing fallback. |
| `docs/evidence/generated-card-comparisons/production-text-rerun-plan-20260627-current` | Rerun required | Converts the 10 failed promotion-gate requirements into 10 ordered commands: start/configure production planner, planner preflight, live Comfy preflight, readiness, aquarium/koi/dog benchmark, manual grading, manual checklist, aggregate, evidence index, and final gate. |
| `docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-current` | Blocked | Fresh tracked index points at the 2026-06-27 Comfy/planner/readiness/model-coverage/rerun evidence and keeps the older Qwen3-4B benchmark only as blocked smoke/failure evidence. |
| `docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-current` | Blocked | Current gate fails 10 requirements: live Comfy preflight, current live Comfy proof, planner preflight, readiness, production-suitable endpoint, no-small-planner replacement evidence, matrix completion, must-include/must-avoid adherence, manual grade checklist, and manual aggregate. |
| `docs/evidence/generated-card-comparisons/production-text-research-rollup-20260627-current` | Blocked | Generated rollup derives 20 findings and 10 next commands from the current index/gate/rerun artifacts; it correctly identifies the production planner blocker as an unreachable endpoint for a production-suitable Gemma 31B target. |
| `docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-production-planner` | Promotion-ready | Fresh `/v1/models` proof reports `koboldcpp/gemma-4-31B-it-Q4_K_M` live on `5003`; planner preflight passes with 8192 context and 3200 output tokens. |
| `docs/evidence/generated-card-comparisons/production-text-preflight-20260627-production-planner` | Promotion-ready | Fresh live Comfy proof reports the target ComfyUI server reachable and `CustomCardTextComposer` loaded. |
| `docs/evidence/generated-card-comparisons/production-text-readiness-20260627-production-planner` | Blocked | Runtime setup is now proven: live Comfy, text node, and production planner endpoint pass. Readiness has 1 remaining blocker, the stale failed Qwen3-4B LLM-planned aggregate. |
| `docs/evidence/generated-card-comparisons/production-text-runtime-attempt-20260627-production-planner` | Throughput blocked | Full matrix command passed live Comfy and Gemma planner preflights, wrote partial benchmark evidence for aquarium and koi, and both completed records failed before image generation with text provider `fetch failed`; dog had started but did not finish before the run was stopped. The local CPU-only Gemma worker reached about 27 GB resident memory and kept consuming CPU after the client stopped; next attempt should use GPU/offload or a hosted/self-hosted production planner, not a reduced prompt. |
| `docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner` | Blocked | Tracked index now includes the live Gemma planner preflight, live Comfy preflight, and one-blocker readiness report, while retaining the older Qwen3-4B matrix as failed smoke evidence until the full production-planner matrix is run. |
| `docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-production-planner` | Blocked | Gate now passes live Comfy proof, current Comfy proof, planner preflight, production-suitable endpoint, no-small-planner evidence, local model coverage, production planner candidate availability, and final-Comfy-image evidence. It fails 5 remaining requirements: readiness, matrix completion, must-include/must-avoid adherence, manual grade checklist, and manual aggregate. |
| `docs/evidence/generated-card-comparisons/production-text-rerun-plan-20260627-production-planner` | Rerun required | Converts the 5 remaining gate failures into the next command chain for the full aquarium/koi/dog production-planner matrix, manual grading, checklist, aggregate, evidence index, and final gate. |
| `docs/evidence/generated-card-comparisons/production-text-research-rollup-20260627-production-planner` | Blocked | Generated rollup derives 16 findings and 10 next commands from the updated production-planner index/gate/rerun artifacts; the remaining work is now benchmark and grading evidence, not runtime reachability. |
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
Qwen3-4B/8B by default for live production evidence because the run proved the
small-planner path can miss required customer terms and truncate JSON. Use
`-AllowSmallPlanner` only when intentionally collecting exploratory failure
evidence.

For the installed higher-quality local planner:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -Port 5003 -ContextSize 8192
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5003/v1 --model koboldcpp/gemma-4-31B-it-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5003/v1 -LocalLlmModel koboldcpp/gemma-4-31B-it-Q4_K_M -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192
```

Gemma 31B loaded successfully on this machine but was too slow on CPU-only
settings for a practical benchmark pass. The next promotion attempt should run
the same full-quality prompt and 3200-token output budget through GPU/offload or
a hosted/self-hosted larger planner.

The wrapper accepts either a root local URL such as `http://127.0.0.1:5001` or
a `/v1` URL such as `http://127.0.0.1:5001/v1`, then probes `/v1/models` before
live provider calls. Use `-DryRun` to inspect planned aquarium/koi/dog runs
without spending Comfy image work.

Run `npm run comfy:production-text:doctor -- --advisory --local-llm-base-url ... --planner-context-tokens 8192 --planner-max-output-tokens 3200`
before collecting new promotion evidence. It aggregates workflow/node
availability, local model inventory, planner endpoint suitability, declared
runtime budget, and the latest manual aggregate so the run does not
accidentally use a reduced-quality smoke planner or an unproven context window.

Run `npm run comfy:production-text:model-coverage -- --output-dir docs/evidence/generated-card-comparisons/local-model-coverage-YYYYMMDD-current`
before refreshing the tracked evidence index. Stage or commit the coverage
artifact first if installed/evaluated planner inventory should count in current
findings.

Run `npm run comfy:production-text:evidence -- --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner`
to refresh the tracked production-text evidence index. Add `--include-untracked`
only when intentionally reviewing local scratch runs that should not be treated
as promotion proof.

Run `npm run comfy:production-text:manual-grades -- --advisory --input <benchmark-output-dir> --output-dir docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-YYYYMMDD-current`
after every production-text benchmark and before aggregate/gate refresh. The
report separates generated runs that need visual grades from stories that
failed before image generation.

Run `npm run comfy:production-text:planner -- --base-url ... --model ... --reported-context-tokens 8192 --max-output-tokens 3200`
before any live production benchmark. This is the fast check that prevents a
4096-context local model from turning the koi case into truncated JSON again.

Run `npm run comfy:production-text:gate -- --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-production-planner --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-production-planner`
as the final promotion contract. Remove `--advisory` only when the current
planner/runtime and aggregate evidence are expected to pass.

Run `npm run comfy:production-text:research -- --output-dir docs/evidence/generated-card-comparisons/production-text-research-rollup-YYYYMMDD-current`
after refreshing the index, gate, and rerun plan. This regenerates the
findings, failed requirements, evidence summary, and next command list from the
tracked artifacts.

Use `-AllowCompositorFixtureFallback` only when intentionally collecting a
single-run structural compositor smoke test.

## Next Gate

Promotion remains blocked. The next gate is no longer runtime reachability; it
is full production-planner matrix execution plus planner-output validation:

- Keep full prompt quality and keep the live Gemma 31B or an equivalent
  production-suitable planner/runtime on the full creative contract.
- Run the readiness doctor before promotion attempts and point
  `-LocalLlmBaseUrl` at a production-suitable planner, not the Qwen3-4B smoke
  endpoint.
- Preserve `must_include` terms in generated copy/theme metadata and reject or
  retry card plans that omit them or contain `must_avoid` terms before Comfy
  image generation.
- Preserve useful loose JSON shapes and add post-response JSON repair where
  needed; do not shrink the creative prompt to fit an underpowered model.
- Keep aquarium/koi/dog fallback theme, copy, visual-cue, and visual-brief
  repair tied to the customer request facts; do not let generic botanical or
  plant-watering repairs rewrite recipient-interest cards.
- Keep the deterministic Comfy text compositor path; the live failure is mostly
  planner/theme adherence, with remaining back-panel discipline issues.
