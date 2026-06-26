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

## Next Gate

Run the live LLM-planned production matrix only after a local OpenAI-compatible
text server is available. The wrapper accepts the local LLM settings directly:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:1234/v1 -LocalLlmModel local-qwen-card-copy -OutputDir docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live
```

Use `-AllowCompositorFixtureFallback` only when intentionally collecting a
single-run structural compositor smoke test.

Promotion remains blocked until the LLM-planned matrix has manual grades that
beat the existing app-compositor baseline and resolves the dense-art/back-panel
failures.
