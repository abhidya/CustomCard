# QA Scorecard: medical-graduation

- Status: pass
- Score: 95/100
- Checks: 40/42
- Pass score: 86
- Reference bar: Reference medical cards: deep navy/soft gold, one cinematic white-coat hero or sparse ECG line, ivory note-sheet interiors, no scattered icon wallpaper, and direct family-pride copy.

| Result | Category | Check | Evidence |
|---|---|---|---|
| Pass | render | All four folded-card panels rendered. | 4/4 panels |
| Pass | copy | front has headline and body copy. | From Dream to Doctor / For every late night, long shift, and quiet sacrifice that brought you here. |
| Pass | prompt | front has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for the front of a premium vertical 5x7 print panel; choose one dominant hero visual or sparse line-art composition, keep a clean text-safe area, … |
| Pass | copy | inside-left has headline and body copy. | Your Journey to Success / With every late night, every long shift, and every sacrifice, you've proven your dedication and heart. We're so proud of you! |
| Pass | prompt | inside-left has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-left print panel; border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs, quiet bla… |
| Pass | copy | inside-right has headline and body copy. | With So Much Pride / You've made it, brother! We're so proud of your discipline, patience, and heart. Enjoy this moment and know that we're here to support you … |
| Pass | prompt | inside-right has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a vertical 5x7 inside-right print panel; matching border-first stationery layout, thin refined frame, sparse edge/corner or lower-edge motifs,… |
| Pass | copy | back has headline and body copy. | From Dream to Doctor / With pride, love, and deep respect for the doctor you worked so hard to become. |
| Pass | prompt | back has an image prompt and generated asset. | Full-bleed flat 2D artwork layer for a minimal vertical 5x7 back print panel; use mostly negative space with one small coordinating lower mark or border echo. Elegant medical-scho… |
| Pass | copy | At least 3 distinct panel headlines. | 3 distinct headlines |
| Pass | copy | front copy includes target-specific anchors. | matched: Dream, Doctor |
| Fail | copy | inside-left copy includes target-specific anchors. | missing: late nights, sacrifices |
| Fail | copy | inside-right copy includes target-specific anchors. | missing: dedication |
| Pass | copy | back copy includes target-specific anchors. | matched: Dream, Doctor |
| Pass | copy | Copy avoids forbidden pattern: Congratulations, Doctor | not found |
| Pass | copy | Copy avoids forbidden pattern: \bHe pushed\b | not found |
| Pass | copy | Copy avoids forbidden pattern: \bHis dedication\b | not found |
| Pass | copy | Copy avoids forbidden pattern: doctor he has become | not found |
| Pass | copy | Copy avoids forbidden pattern: you are now a doctor | not found |
| Pass | copy | Copy avoids forbidden pattern: as you begin this new chapter | not found |
| Pass | copy | Copy avoids forbidden pattern: lifetime of healing | not found |
| Pass | prompt | Image prompts include target term: one white coat | found |
| Pass | prompt | Image prompts include target term: graduation cap | found |
| Pass | prompt | Image prompts include target term: stethoscope | found |
| Pass | prompt | Image prompts include target term: ivory note-sheet | found |
| Pass | prompt | Image prompts include target term: never dense repeated medical icons | found |
| Pass | prompt | Image prompts include target term: text-safe | found |
| Pass | prompt | Image prompts avoid forbidden pattern: recipient['’]?s? name | not found |
| Pass | prompt | Image prompts avoid forbidden pattern: main message | not found |
| Pass | prompt | Image prompts avoid forbidden pattern: foreground | not found |
| Pass | visual | front SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | visual | front SVG uses target theme marker. | medical |
| Pass | visual | front SVG uses target hero/composition marker. | medical-front |
| Pass | visual | inside-left SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | visual | inside-left SVG uses target theme marker. | medical |
| Pass | visual | inside-left SVG uses target hero/composition marker. | medical-interior |
| Pass | visual | inside-right SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | visual | inside-right SVG uses target theme marker. | medical |
| Pass | visual | inside-right SVG uses target hero/composition marker. | medical-interior |
| Pass | visual | back SVG artwork layer contains no rendered text nodes. | no <text> |
| Pass | visual | back SVG uses target theme marker. | medical |
| Pass | visual | back SVG uses target hero/composition marker. | medical-back |
