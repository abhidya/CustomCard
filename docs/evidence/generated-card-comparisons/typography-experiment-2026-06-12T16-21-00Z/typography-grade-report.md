# Typography Experiment Grade Report

Run: `typography-experiment-2026-06-12T16-21-00Z`

Provider: `image-deepai-text2img` / `text2img`

Required copy:

- Headline: `For Moments That Matter`
- Body: `Wishing you strength and peace on your day.`

## Ranking

| Rank | Mode | Score | Tier | Decision |
| --- | --- | ---: | --- | --- |
| 1 | Mode C - hybrid reserved layout | 91 | A | Production-candidate with human proofing |
| 2 | Mode A - current overlay | 82 | B | Usable only after fake-text screening |
| 3 | Mode B - full AI typography | 55 | D | Reject for production exact-copy panels |

## Findings

Mode C is the best path. The image model reserved usable central space and the deterministic renderer kept the headline/body exact. This should become the default card-panel generation strategy where customer copy, names, dates, or CTAs must be reliable.

Mode A proves deterministic overlay helps, but it is not enough by itself. DeepAI added fake lettering in the background, visible as `LAVE` under the overlay, so the final card would still need retouching or an automated fake-text screen.

Mode B reproduced the core typography problem. The card shape and theme were coherent, but the generated text was materially wrong: the headline and body were visibly misspelled. Under the grading rubric this is capped at 55.

## Smallest Loop Fixes

- Add a typography phase that runs the same provider through Mode A, Mode B, and Mode C.
- Preserve exact text only in Mode B prompts; keep exact copy out of artwork-only and hybrid image prompts.
- For Modes A and C, make deterministic app rendering own final text.
- Extend the harness to the folded-card contract with front, inside-left, inside-right, and back panels.
- Report typography runs as `ok` when a panel was produced and no error/status failure exists.
- Generate evidence links relative to the output root.
- Redact only secret-shaped environment values, so prompt words such as `production-ready` are not scrubbed.

## Harness Verification

After the one-panel visual grading above, the harness was upgraded and smoke-tested as a four-panel folded-card experiment.

- Command: `node scripts/model-benchmark-loop.mjs --phase typography --live --output-dir /tmp/customcard-typography-live-four-panel-smoke`
- Result: `runCount: 3`
- Generated rows: Mode A, Mode B, and Mode C each reported `ok` with `4` panels.
- Mode C artifacts included `preview-front.png`, `preview-inside-left.png`, `preview-inside-right.png`, and `preview-back.png`.
- The generated summary preserved `production-ready` prompt text and redacted API keys only.

## Production Call

Use Mode C as the benchmark winner. Keep full AI typography out of customer-facing card generation until a model passes exact text fidelity under the same rubric.
