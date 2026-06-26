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
    shapes, and blocks known-small planners such as Qwen3-4B for production
    evidence unless `-AllowSmallPlanner` is explicit.
  - `tools/start-local-card-planner.ps1` starts the installed Gemma 31B
    KoboldCPP planner with 8k context. It loaded on this machine, but CPU
    decoding did not finish the first benchmark planner response in a practical
    window; promotion evidence needs GPU/offload or a hosted/self-hosted larger
    planner.
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
node update proves a stronger architecture: Comfy can own deterministic text and
deterministic readability fields, while the image model only supplies
surrounding art. The planner contract now needs the next repair.

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
  - Treats known-small planners such as Qwen3-4B as smoke/failure evidence, not
    production evidence.
- `scripts/production-text-evidence-index.mjs`
  - Read-only evidence index for the production-text workflow.
  - Scans tracked readiness, preflight, benchmark, aggregate, and manual-grade
    evidence and writes one current JSON/Markdown summary.
  - Use `--include-untracked` only when intentionally reviewing local scratch
    evidence that should not be cited as committed promotion proof.
- `scripts/production-text-promotion-gate.mjs`
  - Blocking promotion gate over the indexed production-text evidence.
  - Requires live Comfy/text-node proof, a promotion-ready readiness report, a
    production-suitable planner endpoint, a completed aquarium/koi/dog matrix,
    no small smoke planner evidence, preserved required terms, and passing
    manual aggregate grades.
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
  - Accepts either a root local LLM URL such as `http://127.0.0.1:5001` or a
    `/v1` URL such as `http://127.0.0.1:5001/v1`, then probes `/v1/models`
    before live runs.
  - Accepts `-PlannerMaxTokens` for the completion cap while keeping the full
    planner prompt. Use lower caps only to bound slow local decoding, not to
    shrink the creative contract.
  - Rejects known-small local planners such as Qwen3-4B for production
    evidence. Use `-AllowSmallPlanner` only for exploratory failure evidence.
  - Fails fast when no local LLM is configured. Use
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
3. Run preflight with `--require-live true` and confirm
   `CustomCardTextComposer` is present in live `/object_info`.
4. Run `npm run comfy:production-text:doctor -- --advisory` and confirm the
   configured planner endpoint is reachable and production-suitable. The doctor
   should not be satisfied by the Qwen3-4B smoke planner.
5. Run `npm run comfy:production-text:evidence -- --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-YYYYMMDD-current`
   to refresh the tracked evidence index before deciding what to run next.
6. Run `npm run comfy:production-text:gate -- --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-YYYYMMDD-current`
   and confirm every requirement passes before promoting.
7. Run the production overlay workflow against the LLM-planned customer request
   matrix through `tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl ...`
   and manually grade every run. Use `-AllowCompositorFixtureFallback` only for
   compositor/node smoke evidence.
8. Add an overflow/contrast QA gate. Minimum acceptable gate:
   - all panels rendered
   - no text missing
   - no fake text in artwork-only areas
   - no people/mockup/object-scene leakage
   - text contrast meets print/readability threshold
9. Promote only after aggregate benchmark evidence beats the current
   app-compositor baseline.

Current status: gates 1, 3, and the readiness portion of 4 have current local
evidence for the 2026-06-26 runtime. The current readiness report is
`docs/evidence/generated-card-comparisons/production-text-readiness-20260626-current`:
ComfyUI and `CustomCardTextComposer` are live, higher-quality planner files are
installed locally, but the reachable planner endpoint is still Qwen3-4B and no
production-suitable planner endpoint is running. The current evidence index is
`docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current`;
it aggregates the tracked readiness, preflight, benchmark, and manual-grade
evidence and keeps promotion blocked for the same planner/model reasons. The
current promotion gate is
`docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current`;
it passes live Comfy/text-composer and final-Comfy-image requirements, but fails
readiness, production-suitable planner, no-small-planner, full matrix
completion, must-include adherence, and manual aggregate requirements. Gate 7's
live LLM-planned
matrix ran through KoboldCPP
Qwen3-4B and local Comfy, then failed quality review: aquarium scored 38/100,
dog scored 34/100, and koi failed before image generation because the local LLM
returned truncated invalid JSON. The code now keeps full prompt quality and
requires a stronger planner plus validated card-copy output before spending
Comfy image work. Gate 8 still blocks promotion, and gate 9 is
not satisfied because both the production-text candidate aggregate and the new
LLM-planner aggregate rank every candidate as blocked after applying manual
visual grades. The best structural compositor grade remains 72/100, but the
customer-request matrix shows the planner/model contract is weaker than the
text compositor.

## Open Engineering Work

- Keep soft text-hug safe fields and artwork guards, but tune per-panel
  typography scale and field merging so body copy stays readable without
  looking pasted on.
- Use a correct planner runtime for the full contract: keep theme/palette/motif
  and panel-layout decisions with the LLM, keep the full prompt quality rather
  than shrinking the creative brief for a small model, run promotion evidence
  through Gemma 31B with GPU/offload or a hosted larger planner, and use Qwen3-4B
  only for smoke/failure evidence with `-AllowSmallPlanner`.
- Continue tightening planner output handling: preserve `must_include` terms in
  copy/theme/prompt output, reject or retry omissions before Comfy image
  generation, preserve useful loose JSON shapes instead of falling back to
  generic themes, and add JSON repair only as a post-response guard.
- Test a flatter illustration/stationery checkpoint, masks, or stricter workflow
  controls so the surrounding artwork stays restrained instead of dense
  ornamental fill or object/mockup scenes.
- Add per-panel seed offsets when `CUSTOMCARD_COMFYUI_SEED` is set.
- Add OCR or local vision-review evidence to catch pseudo-text and object-scene
  failures automatically.
- Promote only after a benchmark aggregate includes a passing manual or local
  vision visual grade for every production-text candidate run.
