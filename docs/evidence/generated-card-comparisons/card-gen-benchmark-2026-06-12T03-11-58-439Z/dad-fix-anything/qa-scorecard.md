# QA Scorecard: dad-fix-anything

- Status: needs-improvement
- Score: 92/100
- Checks: 36/39
- Pass score: 82
- Critical failures: copy.front.required-terms, copy.inside-left.required-terms, copy.forbidden.amazing-dad
- Reference bar: Warm workshop stationery: blueprint field, a few organized tool marks, calm message panels, and specific practical-love copy without generic best-dad slogans.

| Result | Gate | Category | Check | Evidence |
|---|---|---|---|---|
| Pass | Critical | render | All four folded-card panels rendered. | 4/4 panels |
| Pass | Critical | copy | front has headline and body copy. | Fixing Everything with Love / Happy Father's Day to the best handyman in the world! |
| Pass | Critical | prompt | front has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep a clean text-safe area, … |
| Pass | Critical | copy | inside-left has headline and body copy. | A Handy Dad's Love / You're the one who keeps our home running smoothly, Dad. Your steady presence and practical love mean the world to me. |
| Pass | Critical | prompt | inside-left has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet bla… |
| Pass | Critical | copy | inside-right has headline and body copy. | Love from the Heart / This Father's Day, I wanted you to know those quiet repairs never went unnoticed. They added up to something bigger: steadiness, care, and … |
| Pass | Critical | prompt | inside-right has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs,… |
| Pass | Critical | copy | back has headline and body copy. | To an Amazing Dad / For the dad who fixes the small things and makes them mean everything. |
| Pass | Critical | prompt | back has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo. Warm Father's Day pr… |
| Pass | Standard | copy | At least 3 distinct panel headlines. | 4 distinct headlines |
| Fail | Critical | copy | front copy includes target-specific anchors. | missing: quiet fix, small rescue |
| Fail | Critical | copy | inside-left copy includes target-specific anchors. | missing: tightened screw, fixed hinge |
| Pass | Critical | copy | inside-right copy includes target-specific anchors. | matched: quiet repairs, looked after |
| Pass | Critical | copy | back copy includes target-specific anchors. | matched: fixes, small things |
| Pass | Critical | copy | Copy avoids forbidden pattern: best dad | not found |
| Fail | Critical | copy | Copy avoids forbidden pattern: amazing dad | Amazing Dad |
| Pass | Critical | copy | Copy avoids forbidden pattern: glue that holds | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: thanks for being a rock | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: love is in the details | not found |
| Pass | Critical | prompt | Image prompts include target term: blueprint | found |
| Pass | Critical | prompt | Image prompts include target term: lower-corner tool cluster | found |
| Pass | Critical | prompt | Image prompts include target term: measured pencil lines | found |
| Pass | Critical | prompt | Image prompts include target term: sparse enough | found |
| Pass | Critical | prompt | Image prompts include target term: text-safe | found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: hardware-store | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: cluttered | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | Critical | visual | front SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | front SVG uses target theme marker. | tools |
| Pass | Critical | visual | front SVG uses target hero/composition marker. | tools |
| Pass | Critical | visual | inside-left SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | inside-left SVG uses target theme marker. | tools |
| Pass | Critical | visual | inside-left SVG uses target hero/composition marker. | tools |
| Pass | Critical | visual | inside-right SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | inside-right SVG uses target theme marker. | tools |
| Pass | Critical | visual | inside-right SVG uses target hero/composition marker. | tools |
| Pass | Critical | visual | back SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | back SVG uses target theme marker. | tools |
| Pass | Critical | visual | back SVG uses target hero/composition marker. | tools |
