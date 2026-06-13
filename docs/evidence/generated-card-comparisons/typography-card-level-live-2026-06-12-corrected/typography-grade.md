# Corrected Typography Benchmark Grade

Created: 2026-06-12T17:14:21.050Z

Command:

```bash
node scripts/model-benchmark-loop.mjs --phase typography --live true --output-dir docs/evidence/generated-card-comparisons/typography-card-level-live-2026-06-12-corrected --phase-dir typography
```

## Contract Checks

- Runs: 3 modes
- Panels per run: 4
- Copy-bearing panels: front, inside-left, inside-right
- No-copy panel: back
- Mode A and Mode C keep exact copy out of the image prompt and render typography deterministically.
- Mode B sends exact copy to the image model for the copy-bearing panels.
- All modes prompt inside-left and inside-right as a cohesive opened spread.
- All modes prompt the back as no-text.

## Ranking

| Rank | Mode | Score | Tier | Verdict |
| --- | --- | ---: | --- | --- |
| 1 | Mode C - hybrid reserved layout | 72 | B | Best corrected result. Exact text is preserved and inside-right is the strongest usable panel, but the image model still places dominant sunburst detail under copy areas. |
| 2 | Mode A - current overlay | 64 | C+ | Exact deterministic text, clean back, but the art regularly competes with the overlay and the inside spread feels more like repeated covers than an interior. |
| 3 | Mode B - full AI typography | 45 | D | Visually integrated, but fails the core test: cropped front headline and heavily misspelled/mutated interior copy. Hard-capped by text fidelity. |

## Mode A - Current Overlay

- Score: 64/100
- Four-panel contract: 10/10
- Front exact text and typography: 12/20
- Inside-left/right exact text and readability: 11/20
- Inside spread cohesion: 8/15
- Back no-text discipline: 9/10
- Folded-card theme coherence: 7/10
- Print readiness and margins: 7/15
- Best panel: back, because it stays text-free and coordinates with the gold/charcoal system.
- Worst panel: inside-right, because headline scale and overlay box placement feel unresolved, and body contrast is weak.
- Blocking failure: deterministic copy is correct, but the generated art does not reliably reserve a quiet enough type field.

## Mode B - Full AI Typography

- Score: 45/100
- Four-panel contract: 10/10
- Front exact text and typography: 5/20
- Inside-left/right exact text and readability: 1/20
- Inside spread cohesion: 10/15
- Back no-text discipline: 9/10
- Folded-card theme coherence: 8/10
- Print readiness and margins: 2/15
- Best panel: back, because it is restrained and clean.
- Worst panel: inside-right, because the requested text is materially misspelled and mutated.
- Blocking failure: the image model cannot be trusted with exact greeting-card typography in this run.

## Mode C - Hybrid Reserved Layout

- Score: 72/100
- Four-panel contract: 10/10
- Front exact text and typography: 15/20
- Inside-left/right exact text and readability: 14/20
- Inside spread cohesion: 10/15
- Back no-text discipline: 9/10
- Folded-card theme coherence: 7/10
- Print readiness and margins: 7/15
- Best panel: inside-right, because deterministic copy is exact and the generated artwork gives the text the most usable central field of the run.
- Worst panel: inside-left, because the body crosses a bright sun disk and the panel is too visually dense for an interior message.
- Blocking failure: not a spelling failure; it is a text-safe-area and motif-density failure.

## Decision

Mode C remains the right production direction, but this DeepAI run shows that prose-only "reserve hierarchy" instructions are not strong enough. The next benchmark lever should be a stricter structured layout/mask: keep motifs outside the text bounding boxes, reduce motif density in copy-bearing panels, and make the back a coordinated no-text mark.

