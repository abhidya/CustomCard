# QA Scorecard: medical-graduation

- Status: needs-improvement
- Score: 97/100
- Checks: 30/31
- Pass score: 86
- Critical failures: copy.inside-left.required-terms
- Reference bar: Reference medical cards: deep navy/soft gold, one cinematic white-coat hero or sparse ECG line, ivory note-sheet interiors, no scattered icon wallpaper, and direct family-pride copy.

| Result | Gate | Category | Check | Evidence |
|---|---|---|---|---|
| Pass | Critical | render | All four folded-card panels rendered. | 4/4 panels |
| Pass | Critical | copy | front has headline and body copy. | From Dream to Doctor / For every late night, long shift, and quiet sacrifice that brought you here. |
| Pass | Critical | prompt | front has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep an integrated clean lowe… |
| Pass | Critical | copy | inside-left has headline and body copy. | Years In The Making / Years of dedication, countless sacrifices, and unwavering commitment have led you to this moment. We are proud of the discipline, patience,… |
| Pass | Critical | prompt | inside-left has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; light ivory or cream low-contrast note-sheet field, border-first stationery layout, thin refined frame… |
| Pass | Critical | copy | inside-right has headline and body copy. | With So Much Pride / We are proud not only of the doctor you are becoming, but of the patience, heart, and dedication that brought you here. This moment belongs… |
| Pass | Critical | prompt | inside-right has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching light ivory or cream low-contrast note-sheet field, border-first stationery layout, thin ref… |
| Pass | Critical | copy | back has headline and body copy. | From Dream to Doctor / With pride, love, and deep respect for the doctor you worked so hard to become. |
| Pass | Critical | prompt | back has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo, no caption plaque. E… |
| Pass | Standard | copy | At least 3 distinct panel headlines. | 3 distinct headlines |
| Pass | Critical | copy | front copy includes target-specific anchors. | matched: Dream, Doctor |
| Fail | Critical | copy | inside-left copy includes target-specific anchors. | missing: late nights |
| Pass | Critical | copy | inside-right copy includes target-specific anchors. | matched: you, patience, heart, dedication |
| Pass | Critical | copy | back copy includes target-specific anchors. | matched: Dream, Doctor |
| Pass | Critical | copy | Copy avoids forbidden pattern: Congratulations, Doctor | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: \bHe pushed\b | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: \bHis dedication\b | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: doctor he has become | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: you are now a doctor | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: as you begin this new chapter | not found |
| Pass | Critical | copy | Copy avoids forbidden pattern: lifetime of healing | not found |
| Pass | Critical | prompt | Image prompts include target term: one white coat | found |
| Pass | Critical | prompt | Image prompts include target term: graduation cap | found |
| Pass | Critical | prompt | Image prompts include target term: stethoscope | found |
| Pass | Critical | prompt | Image prompts include target term: ivory note-sheet | found |
| Pass | Critical | prompt | Image prompts include target term: never dense repeated medical icons | found |
| Pass | Critical | prompt | Image prompts include target term: no caption plaque | found |
| Pass | Critical | prompt | Image prompts include target term: text-safe | found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: foreground | not found |
