# Manual Visual Grade: CustomCard production text composer + artwork guards

- Image: Local ComfyUI checkpoint (`sd_xl_turbo_1.0_fp16.safetensors`)
- Strategy: comfy-deterministic-text-composer
- Contact sheet: [open](./contact-sheet.png)
- Total score: 72/100
- Status: blocked
- Production recommendation: do-not-promote-yet

## Rubric

- Four-panel prompt adherence and panel contract: 7/10
- Front exact text and typography: 17/20
- Inside-left/right exact text and readability: 18/20
- Inside-left/right visual cohesion as an opened spread: 11/15
- Back no-text discipline and coordinating mark: 4/10
- Overall folded-card theme coherence: 8/10
- Print readiness and margins: 7/15

## Notes

Artwork guards are the strongest production-text candidate so far. The exact
copy is preserved, the text-bearing panels are readable, and the back is much
quieter than the unguarded runs.

This still cannot be promoted. The compositor is visibly rescuing dense
artwork instead of receiving artwork that was designed around quiet text-safe
areas. The next fix should keep this compositor path but constrain or replace
the artwork layer so the front and interiors have naturally plain centers and
the back is mostly negative space with one small coordinating mark.
