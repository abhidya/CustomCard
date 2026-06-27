# Manual Grade: CustomCard production text composer

- Image: Local ComfyUI checkpoint (sd_xl_turbo_1.0_fp16.safetensors)
- Strategy: comfy-deterministic-text-compositor-calibration
- Panels: 4
- Text rendered in app on: front, inside-left, inside-right
- Contact sheet: [open](./contact-sheet.png)

## Rubric

- Total score /100:
- Tier:
- Four-panel prompt adherence and panel contract /10:
- Front exact text and typography /20:
- Inside-left/right exact text and readability /20:
- Inside-left/right visual cohesion as an opened spread /15:
- Back no-text discipline and coordinating mark /10:
- Overall folded-card theme coherence /10:
- Print readiness and margins /15:
- Blocking failures:
- Smallest prompt/config fix:
- Production recommendation:

## productionTextQa JSON

Copy this object into manual-visual-grade.json and set each boolean from visual inspection:

```json
{
  "productionTextQa": {
    "allPanelsRendered": false,
    "textMissing": false,
    "textOverflow": false,
    "fakeTextOrGlyphsInArtwork": false,
    "mockupOrObjectSceneLeakage": false,
    "lowContrast": false,
    "peopleHandsOrFaces": false
  }
}
```

## Notes
