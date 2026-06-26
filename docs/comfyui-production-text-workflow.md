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
- `local-production-text` is the benchmark phase for this candidate. It treats
  Comfy output as the final text-composited panel and bypasses the app overlay.
- `buildImagePromptPlan` now carries `headline`, `body`, and normalized
  `text_layout` into image-provider execution as `panel_copy`.
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
still does not prove production card quality. Visual blockers are dense
ornamental centers, a back panel that becomes a full dark pattern rather than a
small coordinating mark, and weak artwork-layer control. The node update proves
a stronger architecture: Comfy can own deterministic text and deterministic
readability fields, while the image model only supplies surrounding art.

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
- `tools/run-production-text-benchmark.ps1`
  - Full-card benchmark wrapper for the production workflow.
  - Uses benchmark phase `local-production-text`, not `local-typography`, so `panel_copy`
    reaches the Comfy adapter.
  - Defaults to a timestamped evidence directory and accepts checkpoint/sampler
    overrides for quick candidate comparisons.

## Gates Before Production Default

1. Install `CustomCardTextComposer` into the target Comfy runtime with
   `tools/install-comfy-customcard-text-node.ps1`.
2. Put approved font files in the node `fonts/` directory and document their
   names.
3. Run preflight with `--require-live true` and confirm
   `CustomCardTextComposer` is present in live `/object_info`.
4. Run the production overlay workflow against one full card-generation fixture
   through `tools/run-production-text-benchmark.ps1`.
5. Add an overflow/contrast QA gate. Minimum acceptable gate:
   - all panels rendered
   - no text missing
   - no fake text in artwork-only areas
   - no people/mockup/object-scene leakage
   - text contrast meets print/readability threshold
6. Promote only after aggregate benchmark evidence beats the current
   app-compositor baseline.

Current status: gates 1, 3, and 4 have passing evidence for the local Comfy
runtime used on 2026-06-26. Gate 5 still blocks promotion, but the best manual
grade moved from 47/100 to 65/100 after deterministic safe-field backgrounds
were added, then to 68/100 after rounded text-hug safe fields were added to
`CustomCardTextComposer`, then to 72/100 after deterministic artwork guards were
added. Gate 6 is not satisfied because the production-text aggregate still ranks
every candidate as blocked after applying manual visual grades.

## Open Engineering Work

- Keep soft text-hug safe fields and artwork guards, but tune per-panel
  typography scale and field merging so body copy stays readable without
  looking pasted on.
- Test a flatter illustration/stationery checkpoint, masks, or stricter workflow
  controls so the surrounding artwork stays restrained instead of dense
  ornamental fill or object/mockup scenes.
- Add per-panel seed offsets when `CUSTOMCARD_COMFYUI_SEED` is set.
- Add OCR or local vision-review evidence to catch pseudo-text and object-scene
  failures automatically.
- Promote only after a benchmark aggregate includes a passing manual or local
  vision visual grade for every production-text candidate run.
