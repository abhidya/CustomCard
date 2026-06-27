# ComfyUI Production Text Workflow

## Decision

Use ComfyUI for the production image artifact, but keep greeting-card copy
deterministic. The diffusion model should generate text-safe artwork; exact
headline and body copy should be composited by a deterministic Comfy text node.

This is different from asking Qwen, SDXL, FLUX, or another image model to draw
the words. AI-rendered text is useful for research and short decorative cover
experiments, but production greeting cards need exact copy, stable wrapping, and
repeatable print output.

## Current Repo State

- `customcard-hybrid-reserved-layout.json` is a benchmark workflow. It renders
  text-safe artwork in Comfy, then the benchmark script flattens text with
  Sharp/SVG outside Comfy.
- `customcard-production-text-overlay.json` is the production candidate. It adds
  the repo-owned `CustomCardTextComposer` node after `VAEDecode` and before
  `SaveImage`.
- `local-production-text` is the benchmark phase for this candidate. With a
  configured local LLM, it runs fixed customer request fixtures through the real
  card-copy planner, then treats Comfy output as the final text-composited panel
  and bypasses the benchmark preview overlay. The lower-level phase still has a
  one-run sunburst compositor calibration fixture, but the tracked wrapper only
  allows that path when `-AllowCompositorFixtureFallback` is passed explicitly.
- `buildImagePromptPlan` now carries `headline`, `body`, and normalized
  `text_layout` into image-provider execution as `panel_copy`.
- `scripts/local-comfy-production-text.mjs` is the shared production text
  contract used by both the app generator and benchmark loop. Put template
  variables, safe-field geometry, artwork guards, and workflow-input metadata
  there first so the two execution paths do not drift.
- `local-production-text` now plans request fixtures for aquarium lover, koi
  fish lover, and dog lover scenarios. These are intentionally user inputs only:
  the LLM decides the creative theme, palette, motifs, copy, text layout, and
  panel-specific artwork prompts. The benchmark no longer hardcodes finished
  panel copy or final themed artwork specs for those customer-interest cases.
- `executeLocalComfyUiImage` now exposes text/layout variables to Comfy workflow
  templates:
  - `headline_text`, `body_text`
  - font, size, fill, stroke, alignment, line spacing
  - explicit headline/body safe boxes with x, y, width, and height
  - deterministic safe-field background colors, padding, radius, opacity, and
    style
  - deterministic artwork guard boxes, color, radius, opacity, and style
  - panel/workflow metadata for evidence

## Latest Evidence

Structural workflow proof exists, but production promotion is blocked by visual
quality.

- Live Comfy preflight:
  `docs/evidence/generated-card-comparisons/production-text-preflight-20260626-live-node`
  - `CustomCardTextComposer` was visible in live `/object_info`.
  - Status: `promotion-ready` for workflow/node availability only.
- Live production benchmark:
  `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-live-node`
  - Phase: `local-production-text`.
  - Four panels rendered.
  - Final images were rendered by Comfy with `CustomCardTextComposer`.
  - App overlay was bypassed.
  - Exact headline/body metadata and safe boxes were present.
- Manual visual grade:
  `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-live-node/production-text-workflow/folded-card-sunburst-typography__customcard-production-text-composer__image-local-comfyui/manual-visual-grade.md`
  - Score: 47/100.
  - Status: blocked.
  - Recommendation: do not promote.
- Aggregate report:
  `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-candidates/benchmark-rankings.md`
  - Manual visual grade is preferred over the structural auto-check score.
- Artwork-guard proof:
  `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2`
  - `CustomCardTextComposer` rendered exact copy plus soft text-hug safe fields
    and broader deterministic artwork guards.
  - Auto-checks prove exact copy, safe boxes, safe-field backgrounds,
    soft-field metadata, and artwork-guard metadata reached live Comfy.
  - Manual visual grade: 72/100, blocked, `do-not-promote-yet`.
- LLM-planner research ledger:
  `docs/evidence/generated-card-comparisons/production-text-research-findings-2026-06-26.md`
  - Current code now treats aquarium/koi/dog as fixed customer requests, not
    hardcoded finished themes.
  - Live run with KoboldCPP Qwen3-4B on `127.0.0.1:5001` and local Comfy
    scheduled the full aquarium/koi/dog matrix.
  - Manual grades block promotion: aquarium 38/100, dog 34/100, koi 0/100.
    The architecture ran, but Qwen3-4B missed customer themes and failed JSON
    once at the current prompt/token budget.
  - Follow-up code keeps the full planner prompt, passes benchmark
    `must_include`/`must_avoid` terms into card-copy input, validates and
    retries card-copy output before Comfy, preserves useful loose LLM JSON
    shapes, gives aquarium/koi/dog fallback theme/copy/cue/visual-brief repair their own
    request-aware branches, and blocks known-small planners such as Qwen3-4B/8B
    for production evidence unless `-AllowSmallPlanner` is explicit.
  - `tools/start-local-card-planner.ps1` starts the installed Gemma 31B
    KoboldCPP planner with 8k context and GPU offload by default
    (`-GpuId 0 -GpuLayers 999`). CPU-only KoboldCPP runs and `--gpulayers 0`
    are invalid for promotion evidence; `tools/run-production-text-benchmark.ps1`
    refuses a local KoboldCPP planner when it can see those CPU-only flags or
    when the matching KoboldCPP PID is not listed by `nvidia-smi`.
  - Aggregate:
    `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-rankings.md`
- Soft safe-field proof:
  `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-soft-fields`
  - `CustomCardTextComposer` rendered exact copy plus text-hug rounded
    safe-field backgrounds.
  - Auto-checks prove exact copy, safe boxes, safe-field background metadata,
    and soft-field style/radius/opacity metadata reached live Comfy.
- Safe-field proof:
  `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-safe-fields`
  - `CustomCardTextComposer` rendered exact copy plus deterministic safe-field
    backgrounds.
  - Auto-checks prove exact copy, safe boxes, and safe-field background metadata
    reached live Comfy.

The current best run proves the Comfy text architecture and improves visual
polish with soft text-hug safe fields plus deterministic artwork guards, but it
still does not prove production card quality. The live LLM-planned matrix proves
the runtime can reach local text plus local Comfy, but it exposes planner
blockers: missing required customer-theme terms, invented unrelated plant motifs,
one invalid JSON response, and back panels that still carry visible copy. The
code now catches missing required terms and forbidden terms before Comfy work,
and the generic plant/botanical repair fallbacks no longer hijack aquarium,
koi, or dog customer-interest requests across theme, copy, visual cue, or
visual brief. The node update proves a stronger
architecture: Comfy can own deterministic text and deterministic readability
fields, while the image model only supplies surrounding art. The remaining proof
needs a fresh run with the correct planner/runtime.

## Research Summary

### Deterministic Comfy Text Compositing

The production path is now a checked-in custom node:

- `comfyui-custom-nodes/CustomCardTextComposer`
- class type: `CustomCardTextComposer`
- workflow: `comfyui-workflows/customcard-production-text-overlay.json`

The node draws exact headline and body copy into explicit pixel safe boxes. It
can draw deterministic safe-field backgrounds behind text, including rounded
text-hug fields with opacity, wraps text, shrinks font size down to a configured
floor, draws broader artwork guards before typography when the art layer needs
calming, uses pinned fonts from the node `fonts/` directory or system fonts, and
returns the final Comfy image.

Why this is the production path:

- The final artifact comes from Comfy, so downstream workers can treat Comfy as
  the image producer.
- Text is deterministic and supplied as exact app copy.
- Layout is a software contract: explicit safe boxes beat coarse global
  alignment shifts.
- Readability is not left entirely to the image model: the node can draw solid
  or soft text-hug safe fields behind text inside Comfy before writing exact
  copy.
- Broader per-panel artwork guards can calm the generated layer before the
  smaller text-hug fields and exact copy are drawn.
- The node is repo-owned, so agents do not need to guess which public custom
  text node happens to be installed.

Remaining risks:

- Production still needs a visual/text QA gate for overflow, fake text leakage
  in the artwork layer, and low contrast.
- The first version has fixed box heuristics derived from `text_layout`; it does
  not yet score alternative placements.
- The current local checkpoint can ignore the flat stationery prompt contract
  and produce object scenes even when text compositing succeeds.

### Third-Party Overlay Reference

Munkyfoot `ComfyUI-TextOverlay` provides a `Text Overlay` custom node. Its
README says it overlays text on images and supports font size, font, text and
stroke colors, alignment, position shifts, line spacing, custom fonts, and batch
processing. The node class mapping is `"Text Overlay"`, so API workflow JSON can
reference that `class_type`.

Source:
https://github.com/Munkyfoot/ComfyUI-TextOverlay

Why it is not the default production dependency:

- The public node wraps text by width but does not expose card-specific overflow
  scoring or zone bounding boxes.
- Its `x_shift` and `y_shift` controls are coarse compared with a real print
  layout engine.
- Depending on a floating public custom node makes agent setup harder.

### Comfy Custom Node Installation

Official ComfyUI docs recommend installing custom nodes through ComfyUI Manager
when possible, with Git/manual installation as fallback. Missing nodes can be
detected through the Manager after loading a workflow.

Source:
https://docs.comfy.org/development/core-concepts/custom-nodes

Production implication:

- `customcard-production-text-overlay.json` should not be the default workflow
  until the target Comfy runtime includes `CustomCardTextComposer` and the
  pinned fonts.
- Use `tools/install-comfy-customcard-text-node.ps1` to link the checked-in node
  into the target ComfyUI `custom_nodes` directory.
- The worker should fail fast when `CustomCardTextComposer` is missing instead
  of silently falling back to a no-text artifact.

### Qwen Image Text Rendering

Official ComfyUI Qwen Image docs describe Qwen-Image as strong at multilingual
text rendering and layout consistency. The Qwen-Image-2512 docs say the December
update improves text rendering and supports useful 5x7-ish portrait ratios such
as `3:4` and `2:3`.

Sources:
https://docs.comfy.org/tutorials/image/qwen/qwen-image
https://docs.comfy.org/tutorials/image/qwen/qwen-image-2512

Production implication:

- Qwen is a research branch for short decorative text, prompt adherence, and
  text-edit experiments.
- It is not the safest production renderer for greeting-card body copy because
  exact spelling, wrapping, and overflow must be guaranteed.

## Production Workflow Contract

Image provider input must include:

```json
{
  "panel_id": "inside-right",
  "prompt": "text-safe artwork prompt",
  "negative_prompt": "readable text, fake text, ...",
  "panel_copy": {
    "id": "inside-right",
    "headline": "With Respect and Warmth",
    "body": "For the moments that ask for courage...",
    "text_layout": {
      "headline_zone": "upper",
      "body_zone": "center",
      "alignment": "center",
      "font_pairing": "soft-serif",
      "color_mode": "dark-ink",
      "scale": "standard"
    }
  }
}
```

Comfy template variables exposed by the local adapter include:

- `{{headline_text}}`, `{{body_text}}`
- `{{headline_font}}`, `{{body_font}}`
- `{{headline_font_size}}`, `{{body_font_size}}`
- `{{headline_fill_color}}`, `{{body_fill_color}}`
- `{{headline_stroke_color}}`, `{{body_stroke_color}}`
- `{{headline_stroke_width}}`, `{{body_stroke_width}}`
- `{{text_alignment}}`
- `{{headline_vertical_alignment}}`, `{{body_vertical_alignment}}`
- `{{headline_box_x}}`, `{{headline_box_y}}`
- `{{headline_box_width}}`, `{{headline_box_height}}`
- `{{headline_box_background_color}}`, `{{headline_box_background_padding}}`
- `{{headline_box_background_radius}}`, `{{headline_box_background_opacity}}`
- `{{headline_box_background_style}}`
- `{{body_box_x}}`, `{{body_box_y}}`
- `{{body_box_width}}`, `{{body_box_height}}`
- `{{body_box_background_color}}`, `{{body_box_background_padding}}`
- `{{body_box_background_radius}}`, `{{body_box_background_opacity}}`
- `{{body_box_background_style}}`
- `{{artwork_guard_x}}`, `{{artwork_guard_y}}`
- `{{artwork_guard_width}}`, `{{artwork_guard_height}}`
- `{{artwork_guard_color}}`, `{{artwork_guard_opacity}}`
- `{{artwork_guard_radius}}`, `{{artwork_guard_style}}`
- `{{min_font_size}}`

## Workflow Files

- `comfyui-workflows/customcard-hybrid-reserved-layout.json`
  - Benchmark fallback.
  - Comfy creates artwork only.
  - Benchmark compositor creates final previews outside Comfy.
- `comfyui-workflows/customcard-production-text-overlay.json`
  - Production candidate.
  - Requires checked-in `CustomCardTextComposer`.
  - Comfy returns the final panel image with exact copy rendered.
- `scripts/comfyui-production-text-preflight.mjs`
  - Offline/live preflight.
  - Verifies workflow JSON, node source, and live `/object_info` when requested.
- `scripts/production-text-readiness-doctor.mjs`
  - Advisory or blocking readiness check for promotion attempts.
  - Aggregates workflow/node availability, live Comfy status, latest aggregate
    quality, local model inventory, and active planner endpoint suitability.
  - Treats known-small planners such as Qwen3-4B/8B as smoke/failure evidence,
    not production evidence.
- `scripts/production-text-planner-preflight.mjs`
  - Checks the active OpenAI-compatible planner before benchmark work.
  - Verifies `/v1/models` reports the requested planner model, so a stale
    small-model endpoint cannot be relabeled as Gemma or another production
    planner by config alone.
  - Requires a production-suitable model class, a full output budget, and an
    8192+ intended context budget for promotion evidence.
  - Allows Qwen3-4B/8B and 4096-context runs only when `--allow-small` is
    explicit, and still reports them as smoke/failure evidence instead of
    production-ready.
- `scripts/production-text-rerun-plan.mjs`
  - Reads the current promotion gate and evidence index.
  - Writes JSON/Markdown with failed gate requirements, the full planner
    contract, exact rerun commands, and acceptance checks.
  - Keeps the recovery path aligned with production-suitable planner evidence
    instead of reduced prompt quality.
- `scripts/local-model-coverage.mjs`
  - Scans local model/runtime files, Comfy model files, and benchmark evidence.
  - For production text, refresh it before the evidence index so installed but
    unevaluated planner candidates such as Gemma 31B, Magistral Small, and
    DeepSeek V4 Flash are tracked separately from live endpoint readiness.
- `scripts/production-text-planner-gpu-feasibility.mjs`
  - Checks the active local KoboldCPP planner, assigned GPU id, model file size,
    GPU inventory, and installed production planner candidates.
  - This is stricter than PID residency in `nvidia-smi`: a local planner is not
    GPU-only promotion evidence when the selected GGUF is larger than the
    assigned GPU and therefore implies partial CPU offload.
- `scripts/production-text-evidence-index.mjs`
  - Read-only evidence index for the production-text workflow.
  - Scans tracked rerun plan, planner preflight, readiness, local model
    coverage, Comfy preflight, benchmark, aggregate, and manual-grade evidence
    and writes one current JSON/Markdown summary.
  - Use `--include-untracked` only when intentionally reviewing local scratch
    evidence that should not be cited as committed promotion proof.
- `scripts/production-text-research-rollup.mjs`
  - Reads the current evidence index, promotion gate, and rerun plan, then
    writes one reproducible JSON/Markdown research rollup.
  - Use it after refreshing gate/evidence so findings, failed requirements,
    current model state, manual grade readiness, and next commands are tracked
    without hand-reconciling multiple artifacts.
- `scripts/production-text-manual-grade-checklist.mjs`
  - Writes JSON/Markdown after a benchmark to show which generated runs have
    valid `manual-visual-grade.json`, which generated runs still need grades,
    and which stories failed before image generation.
  - Use this before refreshing aggregate/gate evidence so blocked visual grades
    and planner failures are visible without opening every run directory.
- `scripts/production-text-promotion-gate.mjs`
  - Blocking promotion gate over the indexed production-text evidence.
  - Requires live Comfy/text-node proof, a production-ready planner preflight, a
    promotion-ready readiness report, tracked local model coverage, an available
    production planner candidate, a production-suitable planner endpoint,
    planner preflight endpoint/model alignment with the benchmark runtime, a
    completed aquarium/koi/dog matrix, no small smoke planner evidence,
    preserved required terms, and passing manual aggregate grades.
- `scripts/local-comfy-production-text.mjs`
  - Shared adapter contract for Comfy template variables, deterministic
    typography boxes, soft safe fields, artwork guards, and metadata summaries.
- `tools/run-production-text-benchmark.ps1`
  - Full-card benchmark wrapper for the production workflow.
  - Uses benchmark phase `local-production-text`, not `local-typography`, so `panel_copy`
    reaches the Comfy adapter.
  - Accepts `-LocalLlmBaseUrl`, `-LocalLlmModel`, and `-LocalLlmApiKey` so the
    LLM-planned customer request matrix can be run without brittle shell env
    setup.
  - Auto-starts the default Gemma 31B planner on dedicated port `5013` when no planner URL
    is configured and the local model files exist; pass `-NoAutoStartPlanner`
    when a hosted/self-hosted endpoint should be used instead.
  - Also auto-starts that configured production planner when `-LocalLlmBaseUrl`
    points at the dedicated local planner port but no KoboldCPP process is
    listening there, so a stale environment variable cannot silently redirect a
    production benchmark away from the GPU-backed runtime.
  - Accepts either a root planner URL such as `http://127.0.0.1:5013` or a `/v1`
    URL such as `http://127.0.0.1:5013/v1`, then runs the production planner
    preflight before live runs. The preflight JSON/MD is written into the same
    benchmark output directory as the workflow summary so the evidence index can
    prove endpoint/model alignment without chasing timestamped side folders.
  - The preflight must see the requested `-LocalLlmModel` in `/v1/models`;
    mismatched stale servers are blocked instead of trusted.
  - The underlying Node benchmark loop also rejects direct live
    `local-production-text` runs when a local KoboldCPP planner cannot prove GPU
    residency through `nvidia-smi`, so future agents cannot bypass the wrapper
    and accidentally create CPU benchmark evidence.
  - Accepts `-PlannerMaxTokens` and `-PlannerContextSize` while keeping the full
    planner prompt. Do not shrink the creative contract to fit a 4096-context
    local model.
  - Accepts `-PlannerRequestTimeoutMs` and exports
    `CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS`; the default is `1200000` so a
    production-size local planner can finish the full JSON contract instead of
    hitting Node's five-minute response-header ceiling.
  - Rejects known-small local planners such as Qwen3-4B/8B for production
    evidence. Use `-AllowSmallPlanner` only for exploratory failure evidence.
  - Fails fast when no production planner is available. Use
    `-AllowCompositorFixtureFallback` only for the one-run structural
    compositor fixture.
  - Defaults to a timestamped evidence directory and accepts checkpoint/sampler
    overrides for quick candidate comparisons.

## Production Benchmark Inputs

The production-text phase uses fixed customer requests so model/workflow changes
can be compared against stable user intent while still testing the real LLM
planner:

- `aquarium-lover-birthday`: a birthday request for Nina, who loves the calm
  ritual of tending a freshwater aquarium.
- `koi-fish-lover-encouragement`: an encouragement request for Uncle Ken, who
  finds patience in his backyard koi pond.
- `dog-lover-thank-you`: a thank-you request for Morgan, a dog-loving neighbor
  who helped while Avery was away.

These fixtures do not define final palette, motifs, panel copy, or per-panel
composition. The LLM must decide those. The image prompt remains artwork-only,
and `panel_copy` carries the exact generated headline/body/text layout into
Comfy for deterministic rendering.

The wrapper requires a local LLM for the customer-request matrix and otherwise
fails fast. `local-production-text` can still run `folded-card-sunburst-typography`
as a compositor calibration fixture when `-AllowCompositorFixtureFallback` is
passed explicitly. That fixture is for node/runtime validation, not
customer-theme quality.

## Gates Before Production Default

1. Install `CustomCardTextComposer` into the target Comfy runtime with
   `tools/install-comfy-customcard-text-node.ps1`.
2. Put approved font files in the node `fonts/` directory and document their
   names.
3. Start the local Comfy runtime with `tools/start-local-comfyui.ps1`, then run
   preflight with `--require-live true` and confirm `CustomCardTextComposer` is
   present in live `/object_info`.
4. Run `npm run comfy:production-text:planner -- --base-url ... --model ... --reported-context-tokens 8192 --max-output-tokens 3200`
   and confirm the active planner is production-suitable. Qwen3-4B/8B and
   4096-context planners should be run only with `--allow-small` for failure
   evidence.
5. Run `npm run comfy:production-text:doctor -- --advisory --local-llm-base-url ... --planner-context-tokens 8192 --planner-max-output-tokens 3200`
   and confirm the configured planner endpoint is reachable and
   production-suitable with the declared runtime budget. The doctor should not
   be satisfied by Qwen3-4B/8B smoke planners or by a model name without
   context/output proof.
6. Run `npm run comfy:production-text:rerun-plan -- --output-dir docs/evidence/generated-card-comparisons/production-text-rerun-plan-YYYYMMDD-current`
   to write the exact command chain for the next production-suitable rerun.
7. Run `npm run comfy:production-text:model-coverage -- --output-dir docs/evidence/generated-card-comparisons/local-model-coverage-YYYYMMDD-current`
   to refresh installed/evaluated planner and Comfy model coverage. Commit or
   stage this artifact before the tracked evidence index if it should count.
8. Run `npm run comfy:production-text:evidence -- --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-YYYYMMDD-current`
   to refresh the tracked evidence index before deciding what to run next.
9. Run `npm run comfy:production-text:gate -- --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-YYYYMMDD-current`
   and confirm every requirement passes before promoting.
10. Run the production overlay workflow against the LLM-planned customer request
   matrix through `tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl ...`
   and manually grade every run. Use `-AllowCompositorFixtureFallback` only for
   compositor/node smoke evidence.
10. Run `npm run comfy:production-text:manual-grades -- --advisory --input <benchmark-output-dir> --output-dir docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-YYYYMMDD-current`
   and confirm generated runs have valid manual grades while failed-before-image
   stories are tracked separately.
11. Add an overflow/contrast QA gate. Minimum acceptable gate:
   - all panels rendered
   - no text missing
   - no fake text in artwork-only areas
   - no people/mockup/object-scene leakage
   - text contrast meets print/readability threshold
12. Promote only after aggregate benchmark evidence beats the current
   app-compositor baseline.

Current status: the 2026-06-27 GPU-backed evidence proves the correct runtime
path but still blocks promotion on planner GPU-only fit and throughput. The current planner
preflight is
`docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260627-gpu-proof-magistral-5013`:
Magistral Small is promotion-ready with 8192 context, 3200 output tokens, and
local GPU residency proven for the KoboldCPP PID on GPU 1. The matching
readiness report is
`docs/evidence/generated-card-comparisons/production-text-readiness-20260627-gpu-proof-magistral-5013`:
local Comfy, `CustomCardTextComposer`, and the production-suitable planner
endpoint are reachable. CPU-only local planners, `--gpulayers 0`, stale model
endpoints, and Qwen3-4B/8B smoke planners are rejected before promotion
evidence can run.

The stricter GPU-only feasibility report is
`docs/evidence/generated-card-comparisons/production-text-planner-gpu-feasibility-20260627-magistral-5013`.
It proves the active Magistral PID is listed by `nvidia-smi`, but blocks
promotion because `Magistral-Small-2509-Q4_K_M.gguf` is `13670 MiB` while the
assigned GPU 1 has `8192 MiB`. The same report marks installed Gemma 31B,
Magistral Small, and DeepSeek V4 Flash GGUF planners as single-GPU
hardware-blocked on the current 11GB/8GB local GPUs. Treat that as partial
CPU-offload risk, not valid local GPU-only promotion evidence.

The full GPU-backed matrix attempt is
`docs/evidence/generated-card-comparisons/production-text-workflow-20260627-gpu-proof-magistral-5013-rerun`.
It ran aquarium, koi, and dog customer requests against
`http://127.0.0.1:5013/v1` with `koboldcpp/Magistral-Small-2509-Q4_K_M`, the
full production card-copy JSON contract, 8192 context, 3200 output tokens, and
a 1200000ms request timeout. All three runs failed before image generation
because the local LLM chat completion timed out after 1200000ms. This is not a
CPU fallback, not a small-model benchmark, and not a reduced-prompt run. It is
evidence that the current local Magistral runtime is too slow for the full
contract on this hardware.

The planner throughput probe
`docs/evidence/generated-card-comparisons/production-text-planner-throughput-20260627-magistral-5013-5min`
uses the same full card-copy prompt before spending Comfy image work. It proved
local GPU residency for PID `46488` and then timed out after `300000ms`, so the
correct next step is a faster production-class planner endpoint, not a reduced
prompt or CPU fallback.

The current evidence index, promotion gate, rerun plan, and research rollup are:

- `docs/evidence/generated-card-comparisons/production-text-evidence-index-20260627-gpu-proof`
- `docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260627-gpu-proof`
- `docs/evidence/generated-card-comparisons/production-text-rerun-plan-20260627-gpu-proof`
- `docs/evidence/generated-card-comparisons/production-text-research-rollup-20260627-gpu-proof`

The gate now fails 6 requirements: local planner GPU-only fit is not proven,
the LLM-planned matrix did not complete, final images were not generated by the
Comfy text composer, required customer terms were not preserved in generated
output because no output completed, the manual grade checklist is blocked, and
the manual aggregate is blocked. The
aggregate selection is current:
`docs/evidence/generated-card-comparisons/benchmark-aggregate-20260627-production-text-gpu-proof-magistral-5013-rerun`.
The rerun plan records the exact Magistral GGUF path and GPU flags so another
agent does not accidentally run CPU or guess a flat `D:\models` filename. The
next production attempt should use a hosted/self-hosted stronger planner or a
rights-clean production-floor local planner that fully fits a single assigned
GPU while keeping the full creative contract intact.

## Open Engineering Work

- Keep soft text-hug safe fields and artwork guards, but tune per-panel
  typography scale and field merging so body copy stays readable without
  looking pasted on.
- Use a correct planner runtime for the full contract: keep theme/palette/motif
  and panel-layout decisions with the LLM, keep the full prompt quality rather
  than shrinking the creative brief for a small model, and run promotion
  evidence only through a GPU-only local planner or hosted production-class
  planner. The latest Magistral Small run proves endpoint/runtime correctness
  but is not GPU-only on this hardware and times out on the full JSON contract,
  so the next candidate should improve hardware fit and throughput rather than
  lower quality. Use Qwen3-4B/8B only for smoke/failure evidence with
  `-AllowSmallPlanner`.
- Prove the tightened planner output handling in a fresh run: preserve
  `must_include` terms in copy/theme/prompt output, reject or retry
  `must_avoid` violations before Comfy image generation, preserve useful loose
  JSON shapes instead of falling back to generic themes, and keep JSON repair
  only as a post-response guard.
- Test a flatter illustration/stationery checkpoint, masks, or stricter workflow
  controls so the surrounding artwork stays restrained instead of dense
  ornamental fill or object/mockup scenes.
- Add per-panel seed offsets when `CUSTOMCARD_COMFYUI_SEED` is set.
- Add OCR or local vision-review evidence to catch pseudo-text and object-scene
  failures automatically.
- Promote only after a benchmark aggregate includes a passing manual or local
  vision visual grade for every production-text candidate run.
