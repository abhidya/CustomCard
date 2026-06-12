# QA Scorecard: medical-graduation

- Status: pass
- Score: 100/100
- Checks: 42/42
- Pass score: 86
- Critical failures: none
- Reference bar: Reference medical cards: deep navy/soft gold, one cinematic white-coat hero or sparse ECG line, ivory note-sheet interiors, no scattered icon wallpaper, and direct family-pride copy.

| Result | Gate | Category | Check | Evidence |
|---|---|---|---|---|
| Pass | Critical | render | All four folded-card panels rendered. | 4/4 panels |
| Pass | Critical | copy | front has headline and body copy. | From Dream to Doctor / For every late night, long shift, and quiet sacrifice that brought you here. |
| Pass | Critical | prompt | front has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep a clean text-safe area, … |
| Pass | Critical | copy | inside-left has headline and body copy. | Years In The Making / You kept going through exams, late nights, long shifts, and the sacrifices most people never saw. Today honors the discipline behind the wh… |
| Pass | Critical | prompt | inside-left has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet bla… |
| Pass | Critical | copy | inside-right has headline and body copy. | With So Much Pride / We are proud not only of the doctor you are becoming, but of the patience, heart, and dedication that brought you here. This moment belongs… |
| Pass | Critical | prompt | inside-right has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs,… |
| Pass | Critical | copy | back has headline and body copy. | From Dream to Doctor / With pride, love, and deep respect for the doctor you worked so hard to become. |
| Pass | Critical | prompt | back has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo. Elegant medical-scho… |
| Pass | Standard | copy | At least 3 distinct panel headlines. | 3 distinct headlines |
| Pass | Critical | copy | front copy includes target-specific anchors. | matched: Dream, Doctor |
| Pass | Critical | copy | inside-left copy includes target-specific anchors. | matched: You, late nights, sacrifices |
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
| Pass | Critical | prompt | Image prompts include target term: text-safe | found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | Critical | prompt | Image prompts avoid forbidden pattern: foreground | not found |
| Pass | Critical | visual | front SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | front SVG uses target theme marker. | medical |
| Pass | Critical | visual | front SVG uses target hero/composition marker. | medical-front |
| Pass | Critical | visual | inside-left SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | inside-left SVG uses target theme marker. | medical |
| Pass | Critical | visual | inside-left SVG uses target hero/composition marker. | medical-interior |
| Pass | Critical | visual | inside-right SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | inside-right SVG uses target theme marker. | medical |
| Pass | Critical | visual | inside-right SVG uses target hero/composition marker. | medical-interior |
| Pass | Critical | visual | back SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | Critical | visual | back SVG uses target theme marker. | medical |
| Pass | Critical | visual | back SVG uses target hero/composition marker. | medical-back |
