# Typography Benchmark Grade

Created: 2026-06-12T16:58:18.917Z

Image provider: DeepAI text2img (`image-deepai-text2img`)

## Results

| Mode | Score | Tier | Recommendation |
| --- | ---: | --- | --- |
| Mode A - current overlay | 72/100 | usable with fixes | Keep as control; improve text-safe art and inside spread prompting. |
| Mode B - full AI typography | 65/100 | not production-safe | Do not use for production text; useful only for design exploration. |
| Mode C - hybrid reserved layout | 74/100 | best of run | Best current direction; still needs stronger inside spread constraints. |

## Mode A - Current Overlay

- Front prompt adherence and panel contract: 12/15
- Front copy/text spelling fidelity: 10/10
- Front typography hierarchy/readability: 10/15
- Back no-text discipline and coordinating mark: 14/15
- Inside-left/right visual cohesion as an opened spread: 5/15
- Overall folded-card theme coherence: 10/15
- Print readiness and margins: 11/15

Notes: The deterministic overlay preserved exact copy. The front art is attractive but competes with the text, and the body is too small. Back is clean and text-free. Inside-left and inside-right do not read as one spread: one is dark with a white circle, the other is ivory with a high-contrast sunburst.

## Mode B - Full AI Typography

- Front prompt adherence and panel contract: 8/15
- Front copy/text spelling fidelity: 2/10
- Front typography hierarchy/readability: 13/15
- Back no-text discipline and coordinating mark: 14/15
- Inside-left/right visual cohesion as an opened spread: 7/15
- Overall folded-card theme coherence: 11/15
- Print readiness and margins: 10/15

Notes: The front is the most visually integrated design, but it fails the production text requirement. The headline changes casing ("matter" instead of "Matter"), and the body mutates the supplied sentence. This confirms full AI typography is not safe for production even when the visual result is attractive. Back is clean. Interior cohesion is only partial.

## Mode C - Hybrid Reserved Layout

- Front prompt adherence and panel contract: 13/15
- Front copy/text spelling fidelity: 10/10
- Front typography hierarchy/readability: 12/15
- Back no-text discipline and coordinating mark: 13/15
- Inside-left/right visual cohesion as an opened spread: 6/15
- Overall folded-card theme coherence: 10/15
- Print readiness and margins: 10/15

Notes: This is the strongest production direction in this run. Exact text is preserved, the front has the clearest readable composition, and the back stays text-free. The weakness is still spread-level coordination: inside-left and inside-right are not designed as a single opened interior system.

## Verdict

Mode C wins narrowly. Mode B produced the most polished front-cover typography composition, but it changed the words, which is a hard production failure. The next benchmark should keep Mode C and strengthen explicit inside-spread constraints: same background family, mirrored border geometry, compatible motif scale, and no oversized central sunburst on one side only.
