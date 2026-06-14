# QA Scorecard: small-business-thank-you

- Status: needs-improvement
- Score: 47/100
- Checks: 17/36
- Pass score: 82
- Critical failures: panels.count, panel.front.copy-present, panel.front.prompt-present, panel.inside-left.copy-present, panel.inside-left.prompt-present, panel.inside-right.copy-present, panel.inside-right.prompt-present, panel.back.copy-present, panel.back.prompt-present, copy.front.required-terms, copy.inside-left.required-terms, copy.inside-right.required-terms, copy.back.required-terms, prompt.required.controlled-citrus-and-leaf-corner, prompt.required.editorial-negative-space, prompt.required.not-busy-repeated-fruit, prompt.required.no-text-box, prompt.required.text-safe
- Reference bar: Premium editorial thank-you stationery: restrained citrus corner hierarchy, large calm text fields, specific customer gratitude, and no promotional filler.

| Result | Gate | Category | Check | Evidence |
|---|---|---|---|---|
| Fail | Critical | render | All four folded-card panels rendered. | 0/4 panels |
| Fail | Critical | copy | front has headline and body copy. | missing panel copy |
| Fail | Critical | prompt | front has an image prompt and generated asset. | missing image prompt |
| Fail | Critical | copy | inside-left has headline and body copy. | missing panel copy |
| Fail | Critical | prompt | inside-left has an image prompt and generated asset. | missing image prompt |
| Fail | Critical | copy | inside-right has headline and body copy. | missing panel copy |
| Fail | Critical | prompt | inside-right has an image prompt and generated asset. | missing image prompt |
| Fail | Critical | copy | back has headline and body copy. | missing panel copy |
| Fail | Critical | prompt | back has an image prompt and generated asset. | missing image prompt |
| Fail | Standard | copy | At least 3 distinct panel headlines. | 0 distinct headlines |
| Fail | Critical | copy | front copy includes target-specific anchors. | missing: support, independent |
| Fail | Critical | copy | inside-left copy includes target-specific anchors. | missing: independent, choice |
| Fail | Critical | copy | inside-right copy includes target-specific anchors. | missing: community, trust |
| Fail | Critical | copy | back copy includes target-specific anchors. | missing: gratitude, choose small |
| Pass | Critical | copy | Copy avoids forbidden pattern: \bfor you\b | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: you'?re the best | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: thanks again | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: The CustomCard Team | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: continued success | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: all your endeavors | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: loyalty means the world | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: opportunity to serve | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: customers like you | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: thank you for supporting our small business | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: CustomCard needs | not found |
| Fail | Critical | prompt | Image prompts include target term: controlled citrus-and-leaf corner | missing |
| Fail | Critical | prompt | Image prompts include target term: editorial negative space | missing |
| Fail | Critical | prompt | Image prompts include target term: not busy repeated fruit | missing |
| Fail | Critical | prompt | Image prompts include target term: no text box | missing |
| Fail | Critical | prompt | Image prompts include target term: text-safe | missing |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: thank[- ]you note | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: hand-drawn thank-you note | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: owner holding | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: customers | not found |
