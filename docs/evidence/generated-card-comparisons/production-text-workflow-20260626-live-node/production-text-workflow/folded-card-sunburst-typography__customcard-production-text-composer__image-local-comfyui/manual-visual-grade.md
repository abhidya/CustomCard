# Manual Visual Grade: CustomCard Production Text Composer

Created: 2026-06-26T01:45:00.000Z

- Contact sheet: [open](./contact-sheet.png)
- Score: 47/100
- Status: blocked
- Production recommendation: do not promote

## Finding

The production Comfy workflow proves the deterministic text-composition path:
all four panels rendered, the final images came from Comfy, the app overlay was
bypassed, and exact copy was passed to `CustomCardTextComposer`.

The visual output is not production-ready. The DreamShaper run drifted into
object/mockup-like scenes, especially on the front and interior panels. The
inside-left and inside-right panels place text over busy generated imagery
instead of plain safe fields, and the body copy is too low-readability for a
production card.

## Rubric

| Category | Score |
| --- | ---: |
| Four-panel prompt adherence and panel contract | 4/10 |
| Front exact text and typography | 13/20 |
| Inside-left/right exact text and readability | 8/20 |
| Inside-left/right visual cohesion as an opened spread | 4/15 |
| Back no-text discipline and coordinating mark | 8/10 |
| Overall folded-card theme coherence | 5/10 |
| Print readiness and margins | 5/15 |

## Blocking Failures

- Generated artwork violates the flat 2D greeting-card panel contract with object/mockup-like scenes.
- Inside-left and inside-right text sits over busy generated imagery instead of plain safe fields.
- Interior body copy has low readability at contact-sheet scale and needs a stronger contrast/layout gate.
- Preflight and structural auto-checks prove the Comfy text composer path, but they do not prove production visual quality.

## Next Fix

Keep `CustomCardTextComposer` as the text path, but test a flatter
illustration/stationery checkpoint or stricter workflow before promotion. Add
OCR/local vision review for object-scene leakage, fake text, and low contrast.
