# QA Scorecard: medical-graduation

- Status: needs-improvement
- Score: 32/100
- Checks: 10/31
- Pass score: 86
- Critical failures: panels.count, panel.front.copy-present, panel.front.prompt-present, panel.inside-left.copy-present, panel.inside-left.prompt-present, panel.inside-right.copy-present, panel.inside-right.prompt-present, panel.back.copy-present, panel.back.prompt-present, copy.front.required-terms, copy.inside-left.required-terms, copy.inside-right.required-terms, copy.back.required-terms, prompt.required.one-white-coat, prompt.required.graduation-cap, prompt.required.stethoscope, prompt.required.ivory-note-sheet, prompt.required.never-dense-repeated-medical-icons, prompt.required.no-caption-plaque, prompt.required.text-safe
- Reference bar: Reference medical cards: deep navy/soft gold, one cinematic white-coat hero or sparse ECG line, ivory note-sheet interiors, no scattered icon wallpaper, and direct family-pride copy.

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
| Fail | Critical | copy | front copy includes target-specific anchors. | missing: Dream, Doctor |
| Fail | Critical | copy | inside-left copy includes target-specific anchors. | missing: You, late nights, sacrifices |
| Fail | Critical | copy | inside-right copy includes target-specific anchors. | missing: you, patience, heart, dedication |
| Fail | Critical | copy | back copy includes target-specific anchors. | missing: Dream, Doctor |
| Pass | Critical | copy | Copy avoids forbidden pattern: Congratulations, Doctor | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: \bHe pushed\b | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: \bHis dedication\b | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: doctor he has become | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: you are now a doctor | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: as you begin this new chapter | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: lifetime of healing | not found |
| Fail | Critical | prompt | Image prompts include target term: one white coat | missing |
| Fail | Critical | prompt | Image prompts include target term: graduation cap | missing |
| Fail | Critical | prompt | Image prompts include target term: stethoscope | missing |
| Fail | Critical | prompt | Image prompts include target term: ivory note-sheet | missing |
| Fail | Critical | prompt | Image prompts include target term: never dense repeated medical icons | missing |
| Fail | Critical | prompt | Image prompts include target term: no caption plaque | missing |
| Fail | Critical | prompt | Image prompts include target term: text-safe | missing |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: foreground | not found |
