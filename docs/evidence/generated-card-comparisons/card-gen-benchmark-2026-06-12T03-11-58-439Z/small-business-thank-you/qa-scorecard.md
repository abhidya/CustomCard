# QA Scorecard: small-business-thank-you

- Status: needs-improvement
- Score: 98/100
- Checks: 42/43
- Pass score: 82
- Critical failures: copy.inside-right.required-terms
- Reference bar: Premium editorial thank-you stationery: restrained citrus corner hierarchy, large calm text fields, specific customer gratitude, and no promotional filler.

| Result | Gate | Category | Check | Evidence |
|---|---|---|---|---|
| Pass | Critical | render | All four folded-card panels rendered. | 4/4 panels |
| Pass | Critical | copy | front has headline and body copy. | Thank you for supporting small businesses like mine / Your support keeps independent work personal, human, and close to home. |
| Pass | Critical | prompt | front has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep a clean text-safe area, … |
| Pass | Critical | copy | inside-left has headline and body copy. | Because You Chose Us / Your choice to shop with independent small businesses like mine makes a big difference in our community. |
| Pass | Critical | prompt | inside-left has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet bla… |
| Pass | Critical | copy | inside-right has headline and body copy. | With appreciation and gratitude / Thank you for being a valued customer and for helping to keep our community vibrant and unique. I'm grateful for your support and look forw… |
| Pass | Critical | prompt | inside-right has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs,… |
| Pass | Critical | copy | back has headline and body copy. | Wishing you continued joy and success / Made with gratitude for customers who choose small. |
| Pass | Critical | prompt | back has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo. Warm small-business … |
| Pass | Standard | copy | At least 3 distinct panel headlines. | 4 distinct headlines |
| Pass | Critical | copy | front copy includes target-specific anchors. | matched: support, independent |
| Pass | Critical | copy | inside-left copy includes target-specific anchors. | matched: independent, choice |
| Fail | Critical | copy | inside-right copy includes target-specific anchors. | missing: trust |
| Pass | Critical | copy | back copy includes target-specific anchors. | matched: gratitude, choose small |
| Pass | Critical | copy | Copy avoids forbidden pattern: \bfor you\b | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: continued success | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: all your endeavors | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: loyalty means the world | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: opportunity to serve | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: customers like you | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: thank you for supporting our small business | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: CustomCard needs | not found |
| Pass | Critical | prompt | Image prompts include target term: controlled citrus-and-leaf corner | found |
| Pass | Critical | prompt | Image prompts include target term: editorial negative space | found |
| Pass | Critical | prompt | Image prompts include target term: not busy repeated fruit | found |
| Pass | Critical | prompt | Image prompts include target term: text-safe | found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: hand-drawn thank-you note | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: owner holding | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: customers | not found |
| Pass | Critical | visual | front SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | front SVG uses target theme marker. | citrus |
| Pass | Critical | visual | front SVG uses target hero/composition marker. | citrus |
| Pass | Critical | visual | inside-left SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | inside-left SVG uses target theme marker. | citrus |
| Pass | Critical | visual | inside-left SVG uses target hero/composition marker. | citrus |
| Pass | Critical | visual | inside-right SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | inside-right SVG uses target theme marker. | citrus |
| Pass | Critical | visual | inside-right SVG uses target hero/composition marker. | citrus |
| Pass | Critical | visual | back SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | back SVG uses target theme marker. | citrus |
| Pass | Critical | visual | back SVG uses target hero/composition marker. | citrus |
