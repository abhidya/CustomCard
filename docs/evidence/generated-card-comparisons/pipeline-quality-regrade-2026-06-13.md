# Pipeline Quality Regrade: sympathy-quiet-support

Date: 2026-06-13

Benchmark input was deterministic and ran through the full `createAiCardGenerationService().generateCard()` path via `scripts/model-benchmark-loop.mjs --phase pipeline-quality`.

## Verdict

| Text route | Image route | Product score | Contract score | Tier | Evidence |
| --- | --- | ---: | ---: | --- | --- |
| `text-hf-qwen3-235b-a22b` | `image-deepai-text2img` | 53 | 48 | D route reliability; C- fallback rough draft | [manual grade](./pipeline-quality-sympathy-2026-06-13/pipeline-quality/sympathy-quiet-support__text-hf-qwen3-235b-a22b__image-deepai-text2img/manual-grade.md) |
| `text-cloudflare-baseline` | `image-deepai-text2img` | 55 | 70 | C rough draft only | [manual grade](./pipeline-quality-sympathy-cloudflare-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md) |
| `text-cloudflare-baseline` improved prompts v6 | `image-deepai-text2img` | 45 | 86 | D visible product; contract improved | [manual grade](./pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md) |
| `text-cloudflare-baseline` improved route v4 | `image-browser-svg-renderer` | 88 | 96 | A- prior best; not 100 | [manual grade](./pipeline-quality-sympathy-svg-v4-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-browser-svg-renderer/manual-grade.md) |
| `text-cloudflare-baseline` improved route v10 | `image-browser-svg-renderer` | 91 | 97 | A- latest best; still not 100 | [manual grade](./pipeline-quality-sympathy-svg-v10-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-browser-svg-renderer/manual-grade.md) |

## Findings

- Previous typography v5 `89/100` remains only a prompt-contract/composition grade, not a customer-card grade.
- Cloudflare route is latest live winner only because Qwen/Hugging Face returned 402. It is not production-candidate.
- Baseline rendered cards missed required literal terms: `father`, `meals`, `rides`.
- DeepAI panels stayed card-shaped, but baseline typography/layout failed: tiny/light interior text, generic empty panels, and fake/stray text risk.
- V6 now preserves required facts and avoids bad sympathy language, but the visible product remains low quality: mostly blank/template-like panels, weak cover, and tiny body copy. Next improvement should target concrete sympathy artwork composition or image-provider replacement, not more copy repair.
- The original v6 product grade of 79 was too generous because it over-weighted contract success. Re-audit caps the product score at 45.
- SVG v4 is the current best route. It reaches customer-usable quality (`88/100`) by using deterministic vector artwork, readable overlay typography, richer sympathy motifs, and no image-model fake text/mockup risk. It still does not reach 100 because the art remains somewhat template-like and the back panel is plain.
- SVG v10 is the latest best route at product `91/100`, contract `97/100`. It improves v4/v8 with richer deterministic edge artwork, larger readable back layout, fixed front headline zone, and clean exact-fact coverage. It still does not reach 100 because the rendered card remains close to premium stationery templates rather than a highly bespoke art direction.

## Improvement Loop

| Iteration | Result | Lesson |
| --- | --- | --- |
| Baseline Qwen/HF + DeepAI | Hugging Face 402; deterministic fallback; product 53, contract 48 | Grade selected model-route reliability separately from fallback output quality. |
| Baseline Cloudflare + DeepAI | Live route completed; product 55, contract 70 | Cloudflare schema compliance was not enough; copy dropped exact customer facts and rendered text too small/light. |
| Improved v2 | Required terms landed; interior text contrast improved; back still weak/light | Exact fact preservation helped, but layout repair needed panel-specific sympathy rules. |
| Improved v3 | Back readability improved; front picked up a blank label/text-box artifact | Ban app-copy leakage and label/text-box language in image prompts. |
| Improved v4 | Cleaner image prompts; still generic sympathy headlines and missing recipient-specific front | Headline repair must enforce recipient/sender usage, not only body facts. |
| Improved v5 | First live attempt hit DeepAI 400; retry succeeded but back copy became generic memorial thanks | Treat provider 400 as route instability; back-copy repair needs practical-support constraints. |
| Improved v6 | Product 45, contract 86 | Contract improved, but visible card is still not customer-facing: mostly blank stationery, weak front, tiny body copy. Keep content fixes; drop current image result. |
| SVG v1 | Better controllability than DeepAI but still dashed empty boxes and tiny body copy | Browser SVG route is viable but needed actual visual design work. |
| SVG v2/v3 | Richer sympathy vector motifs and readable text; lingering back/body crowding and transactional headline | Deterministic vector route can improve quickly with visible-artifact review. |
| SVG v4 | Product 88, contract 96 | Current best. Keep as route winner; still below 100 due originality/back-cover polish. |
| Cloudflare FLUX image v1 | Contract passed, visible product failed: physical mockup/paper sheet, line through headline, back text collision | Do not promote Cloudflare image for this sympathy route without stronger no-mockup and text-safe enforcement. |
| SVG v8 | Product-quality candidate with fixed headings and exact support facts; still slightly plain in visible review | Good contract is not enough for 100; front/back need stronger visual craft. |
| SVG v9 | Auto checks passed, but live text chose `headline_zone: top`, making cover feel high/empty | Repair should force sympathy front headline zone, not accept provider layout choice. |
| SVG v10 | Product 91, contract 97 | Latest best. Sendable/proofable, but grade stays below 100 because art still reads as restrained stationery template. |

## Prompt/Skill Changes Applied

- Added `pipeline-quality` as the product-grade benchmark phase using the full card generation pipeline.
- Tightened deterministic `sympathy-quiet-support` benchmark inputs and must-include terms.
- Added copy prompt instructions to preserve exact concrete facts from `personal_note` and `memory_notes`.
- Added sympathy repair rules for literal father/practical-support copy, recipient/sender headlines, dark readable layouts, back-copy constraints, and image-prompt leakage.
- Added regression coverage for the sympathy repair path in `src/aiCardGenerator.test.ts`.
- Added deterministic browser SVG as an explicit `pipeline-quality` image candidate and included Cloudflare FLUX in route comparison.
- Added richer sympathy vector artwork for the browser SVG route and enlarged benchmark contact sheets for visual review.
- Forced sympathy front headline layout away from `top`, enlarged back layout for contact-sheet readability, and enriched deterministic SVG front/back motifs.
- Updated benchmark skill/lesson guidance to require latest/baseline/in-between evidence and to keep caveman-style concise reporting.

## Commands

```bash
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-2026-06-13 --phase-dir pipeline-quality --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --text text-cloudflare-baseline --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-2026-06-13 --phase-dir pipeline-quality --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-deepai-text2img --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v4-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-cloudflare-flux-schnell --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-image-v1-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v8-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v10-2026-06-13 --live true
```
