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
- `buildImagePromptPlan` now carries `headline`, `body`, and normalized
  `text_layout` into image-provider execution as `panel_copy`.
- `executeLocalComfyUiImage` now exposes text/layout variables to Comfy workflow
  templates:
  - `headline_text`, `body_text`
  - font, size, fill, stroke, alignment, line spacing
  - explicit headline/body safe boxes with x, y, width, and height
  - panel/workflow metadata for evidence

## Research Summary

### Deterministic Comfy Text Compositing

The production path is now a checked-in custom node:

- `comfyui-custom-nodes/CustomCardTextComposer`
- class type: `CustomCardTextComposer`
- workflow: `comfyui-workflows/customcard-production-text-overlay.json`

The node draws exact headline and body copy into explicit pixel safe boxes. It
wraps text, shrinks font size down to a configured floor, uses pinned fonts from
the node `fonts/` directory or system fonts, and returns the final Comfy image.

Why this is the production path:

- The final artifact comes from Comfy, so downstream workers can treat Comfy as
  the image producer.
- Text is deterministic and supplied as exact app copy.
- Layout is a software contract: explicit safe boxes beat coarse global
  alignment shifts.
- The node is repo-owned, so agents do not need to guess which public custom
  text node happens to be installed.

Remaining risks:

- Production still needs a visual/text QA gate for overflow, fake text leakage
  in the artwork layer, and low contrast.
- The first version has fixed box heuristics derived from `text_layout`; it does
  not yet score alternative placements.

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
- `{{body_box_x}}`, `{{body_box_y}}`
- `{{body_box_width}}`, `{{body_box_height}}`
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
  - Uses benchmark phase `local`, not `local-typography`, so `panel_copy`
    reaches the Comfy adapter.

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

## Open Engineering Work

- Add a live benchmark proof after the target Comfy runtime is restarted with
  `CustomCardTextComposer` available in `/object_info`.
- Add per-panel seed offsets when `CUSTOMCARD_COMFYUI_SEED` is set.
- Make benchmark output directories timestamped by default.
- Add OCR or local vision-review evidence to catch pseudo-text and object-scene
  failures automatically.
