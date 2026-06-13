# Mode C Improvement Grade

Created: 2026-06-12T17:31:06.494Z

Baseline compared against:

- `docs/evidence/generated-card-comparisons/typography-card-level-live-2026-06-12-corrected`
- Prior Mode C score: 72/100

Command:

```bash
node scripts/model-benchmark-loop.mjs --phase typography --typography-mode mode-c-hybrid-reserved-layout --live true --output-dir docs/evidence/generated-card-comparisons/typography-mode-c-improvement-2026-06-12-v2 --phase-dir typography
```

## Contract Checks

- Runs: 1
- Mode: Mode C - hybrid reserved layout
- Panels: front, inside-left, inside-right, back
- Deterministic text panels: front, inside-left, inside-right
- Back panel: no text
- Exact copy appears only in deterministic overlay, not in artwork prompts
- Back prompt now explicitly requires 85% plain charcoal and one tiny gold sun mark

## Score

- Total: 82/100
- Tier: B+
- Delta from previous Mode C: +10

| Dimension | Score |
| --- | ---: |
| Four-panel prompt adherence and panel contract | 10/10 |
| Front exact text and typography | 18/20 |
| Inside-left/right exact text and readability | 17/20 |
| Inside-left/right visual cohesion as an opened spread | 11/15 |
| Back no-text discipline and coordinating mark | 10/10 |
| Overall folded-card theme coherence | 8/10 |
| Print readiness and margins | 8/15 |

## Visual Judgment

Best panel: back. The stricter prompt fixed the earlier full radial burst failure; it is now mostly deep charcoal with a small coordinating gold mark.

Strongest improvement: text fidelity and readability. Front, inside-left, and inside-right have exact deterministic copy and are readable at proof size.

Remaining weakness: the inside spread is still too cover-like. DeepAI continues to generate dense radial ornament behind the interior panels, so the deterministic ivory matte field is doing too much repair work. It is usable for proofing, but not yet an elegant production interior.

## Decision

Mode C improved materially and remains the right production direction. The next lever should not be more prose in the prompt. It should be a structured panel template or mask-driven renderer that treats text-safe regions and back marks as deterministic layout primitives, then lets the image model fill only the allowed ornament zones.

