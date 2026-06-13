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
| `text-cloudflare-baseline` improved route v12 | `image-browser-svg-renderer` | 5 | 98 | F visible product; contract-only improvement | [manual grade](./pipeline-quality-sympathy-svg-v12-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-browser-svg-renderer/manual-grade.md) |
| `text-cloudflare-baseline` gallery SVG v17 | `image-browser-svg-renderer` | 43 | 72 | D/C- clean but generic gallery draft; text route 429 fallback | [contact sheet](./pipeline-quality-sympathy-svg-v17-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-browser-svg-renderer/contact-sheet.png) |
| `text-cloudflare-baseline` gallery DeepAI v10 | `image-deepai-text2img` | 52 | 74 | C- rough draft; text route 429 fallback | [contact sheet](./pipeline-quality-sympathy-deepai-v10-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/contact-sheet.png) |
| `text-hf-qwen3-235b-a22b` gallery DeepAI v1 | `image-deepai-text2img` | 58 | 74 | C rough-draft candidate; text route 402 fallback | [manual grade](./pipeline-quality-sympathy-hf-qwen-deepai-v1-2026-06-13/pipeline-quality/sympathy-quiet-support__text-hf-qwen3-235b-a22b__image-deepai-text2img/manual-grade.md) |
| `text-deterministic-support` support-object DeepAI v12 | `image-deepai-text2img` | 8 | 76 | F visible product; text/art collision | [manual grade](./pipeline-quality-sympathy-deterministic-deepai-v12-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-deepai-text2img/manual-grade.md) |
| `text-deterministic-support` support-object SVG v20 | `image-browser-svg-renderer` | 10 | 98 | F visible product; contract-only control | [manual grade](./pipeline-quality-sympathy-deterministic-svg-v20-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-browser-svg-renderer/manual-grade.md) |
| `text-deterministic-support` still-life SVG v22 | `image-browser-svg-renderer` | 32 | 98 | D visible product; stronger hook, still crude | [manual grade](./pipeline-quality-sympathy-still-life-svg-v22-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-browser-svg-renderer/manual-grade.md) |
| `text-deterministic-support` still-life SVG v24 | `image-browser-svg-renderer` | 40 | 98 | D+ visible product; cleaner cover, still not saleable | [manual grade](./pipeline-quality-sympathy-still-life-svg-v24-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-browser-svg-renderer/manual-grade.md) |
| `text-deterministic-support` still-life SVG v25 | `image-browser-svg-renderer` | 8 | 98 | F visible product; contract-only control | [manual grade](./pipeline-quality-sympathy-still-life-svg-v25-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-browser-svg-renderer/manual-grade.md) |
| `text-deterministic-support` HF Qwen Image v2 | `image-hf-qwen-image` -> fallback `browser-svg-renderer` | 8 | 72 | F visible product; HF route 402, fallback rendered four panels | [manual grade](./pipeline-quality-sympathy-hf-qwen-image-v2-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-hf-qwen-image/manual-grade.md) |
| `text-deterministic-support` Cloudflare SDXL v1 | `image-cloudflare-sdxl-lightning` | 30 | 86 | D visible rejection; real raster art but unreadable interiors/back | [manual grade](./pipeline-quality-sympathy-cloudflare-sdxl-v1-2026-06-13/pipeline-quality/sympathy-quiet-support__text-deterministic-support__image-cloudflare-sdxl-lightning/manual-grade.md) |

## Findings

- Previous typography v5 `89/100` remains only a prompt-contract/composition grade, not a customer-card grade.
- Cloudflare route is latest live winner only because Qwen/Hugging Face returned 402. It is not production-candidate.
- Baseline rendered cards missed required literal terms: `father`, `meals`, `rides`.
- DeepAI panels stayed card-shaped, but baseline typography/layout failed: tiny/light interior text, generic empty panels, and fake/stray text risk.
- V6 now preserves required facts and avoids bad sympathy language, but the visible product remains low quality: mostly blank/template-like panels, weak cover, and tiny body copy. Next improvement should target concrete sympathy artwork composition or image-provider replacement, not more copy repair.
- The original v6 product grade of 79 was too generous because it over-weighted contract success. Re-audit caps the product score at 45.
- SVG v4 is the current best route. It reaches customer-usable quality (`88/100`) by using deterministic vector artwork, readable overlay typography, richer sympathy motifs, and no image-model fake text/mockup risk. It still does not reach 100 because the art remains somewhat template-like and the back panel is plain.
- SVG v10 is the latest best route at product `91/100`, contract `97/100`. It improves v4/v8 with richer deterministic edge artwork, larger readable back layout, fixed front headline zone, and clean exact-fact coverage. It still does not reach 100 because the rendered card remains close to premium stationery templates rather than a highly bespoke art direction.
- SVG v12 was initially overgraded at product `94/100`. User calibration and visible re-audit correct the product score to `5/100` while keeping contract score `98/100`. It fixes the self-focused cover headline and required facts, but the rendered result still looks like low-effort generic stationery with leaf marks. This route is a contract-only improvement and should not be treated as a product winner.
- Gallery-art prompt repair improved the visible product from the user-calibrated `5/100` SVG stationery to `58/100` on the best latest DeepAI run. This is real progress, but still not customer-ready: watercolor branches are generic, one branch crowds the inside-left headline, and live text providers returned 429/402 so fallback copy was used.
- Deterministic support-copy controls isolate visual quality from failing live text routes. The v20 SVG control passes contract checks at `98/100`, but product score is only `10/100` because the visible card still looks like low-effort generic stationery. The v12 DeepAI support-object retry is worse at `8/100` because inside-left text collides with landscape art.
- Still-life SVG v22 improves the deterministic visual route to product `32/100`, contract `98/100`. The dark front/back and light typography create a real thumbnail hook and remove route-line/car-like ambiguity, but the interiors and vector objects remain crude, generic, and not saleable.
- Still-life SVG v24 improves the deterministic visual route to product `40/100`, contract `98/100` by making the sympathy cover headline-only and adding richer SVG shadows/scene layers. It remains a D+ product because interiors are generic and the vector object craft still looks tool-made.
- Still-life SVG v25 was overgraded at product `45/100`. User-visible re-audit corrects it to product `8/100`, contract `98/100`: stronger interior side-stem/leaf structure preserves clear text zones but reads as generic low-effort stationery, not a saleable sympathy card.
- Hugging Face image wiring is now executable, but not visually proven. HF Qwen via `fal-ai` returned 402 before rendering, and HF FLUX via `hf-inference` produced two JPEGs before credits depleted on panel three. The fallback repair now returns four deterministic SVG panels instead of a zero-panel payload, but product score remains `8/100` because no HF image reached the contact sheet.
- Cloudflare SDXL Lightning is executable in the full pipeline and returned four real PNG panels, but product score is only `30/100`. The front is a usable rough cover, while inside-left, inside-right, and back put small deterministic text over busy fruit/floral/line-art compositions. This proves richer raster art alone does not solve product quality; text-safe composition is the blocking issue.

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
| SVG v11 | Product-quality improvement over v10 with cleaner `For Eli` cover and richer front/back art | Cover/back became more bespoke; interiors still too plain for top-band grading. |
| SVG v12 | Product 5, contract 98 after re-audit | Contract improved, but user-visible product failed. Do not promote deterministic SVG stationery as a winner; replace the art system or provider. |
| Gallery SVG v13-v17 | Product 43, contract 72 | Removing stationery language and preview frames helped, but deterministic gallery SVG is still generic and not premium. |
| Cloudflare FLUX v2 | Product 0, contract 20 | Cloudflare image route returned 429 and produced no panels. Do not grade as visual product. |
| DeepAI gallery v7-v10 | Product up to 52 with Cloudflare fallback; product 58 with HF/Qwen fallback run | Gallery prompts beat bordered stationery, and upper/center back layout fixes back collision. DeepAI still ignores some text-safe intent and places branches near headlines. |
| HF/Qwen + DeepAI gallery v1 | Product 58, contract 74 | Best latest visible artifact. Text route still failed with 402 and fell back; product remains a rough draft, not near 100. |
| Deterministic support-copy SVG v18-v20 | Product 10, contract 98 on v20 | Deterministic text removes provider noise and proves copy/contract can be clean. Product still fails: concrete support objects are literal marks, not premium art direction. |
| Deterministic support-copy DeepAI v11-v12 | Product 8, contract 76 on v12 | Moving front body text upward helped the cover, but DeepAI still placed landscape art through inside text and produced generic bowl/branch imagery. |
| Still-life SVG v21-v22 | Product 32, contract 98 on v22 | A dark cover/back with light deterministic typography improves visual hook. Keep that direction, but crude SVG object craft and blank interiors still require a better art system. |
| Still-life SVG v23-v24 | Product 40, contract 98 on v24 | Larger scene layers and headline-only cover improve visible quality. Still capped: deterministic vector art is not premium enough and interiors remain mostly generic. |
| Still-life SVG v25 | Product 8, contract 98 | User-visible re-audit shows incremental SVG decoration did not improve product quality. It remains a contract-only control that needs real illustration assets/provider before promotion. |
| HF Qwen Image v1-v2 | v1 product 0/no panels; v2 product 8, contract 72 | Hugging Face image adapter is wired, but current account credits are depleted. Fallback repair prevents zero-panel outputs, but fallback SVG remains unsaleable. |
| Cloudflare SDXL v1 | Product 30, contract 86 | SDXL can render real raster art and completed all four provider calls, but ignored text-safe/minimal composition enough that three panels are not readable. Shorten prompts and enforce plain text fields before another SDXL grade. |

## Prompt/Skill Changes Applied

- Added `pipeline-quality` as the product-grade benchmark phase using the full card generation pipeline.
- Tightened deterministic `sympathy-quiet-support` benchmark inputs and must-include terms.
- Added copy prompt instructions to preserve exact concrete facts from `personal_note` and `memory_notes`.
- Added sympathy repair rules for literal father/practical-support copy, recipient/sender headlines, dark readable layouts, back-copy constraints, and image-prompt leakage.
- Added regression coverage for the sympathy repair path in `src/aiCardGenerator.test.ts`.
- Added deterministic browser SVG as an explicit `pipeline-quality` image candidate and included Cloudflare FLUX in route comparison.
- Added richer sympathy vector artwork for the browser SVG route and enlarged benchmark contact sheets for visual review.
- Forced sympathy front headline layout away from `top`, enlarged back layout for contact-sheet readability, and enriched deterministic SVG front/back motifs.
- Forced self-focused sympathy cover headlines such as `Eli, I'm here for you` to repair to `For Eli`; added pressed-leaf/thread SVG motifs to front, interiors, and back. Re-audit shows this was not enough: generic deterministic stationery remains a product failure.
- Replaced sympathy image prompt fallback from photo-note/note-sheet/stationery language to flat gallery artwork with warm ivory fields, branch silhouettes, horizon marks, and explicit anti-template constraints.
- Added prompt repair so weak sympathy image prompts containing photo-note/note-sheet/border-first/framed-page language are rebuilt from the stronger gallery-art fallback.
- Added `sympathy-gallery` deterministic SVG branch and changed benchmark preview composition so open-gallery panels are not wrapped in a false template frame.
- Added contrast stroke to benchmark overlay typography and moved sympathy back copy to upper/center fields to reduce art/text collisions.
- Updated benchmark skill/lesson guidance to require latest/baseline/in-between evidence and to keep caveman-style concise reporting.
- Added `text-deterministic-support` as a pipeline-quality text candidate so visual prompt work can be graded without live text-provider 429/402 noise.
- Changed sympathy gallery prompts and deterministic SVG motifs from branch-only stationery toward concrete support objects: quiet window light, meal bowl, route line, muted phone dot, key mark, and lower horizon.
- Moved sympathy front body text to an upper safe zone for the deterministic fallback layout.
- Recalibrated support-object SVG/DeepAI outputs to user-visible rejection scores instead of treating contract success as product quality.
- Replaced route-line/phone-dot support cues with still-life support objects to avoid car-like ambiguity: window light, meal bowl, folded cloth, muted phone, small key, and branch.
- Changed the deterministic sympathy SVG front/back to dark moss panels with light typography, while keeping interiors warm ivory.
- Added richer deterministic SVG shadows/scene layers and changed deterministic sympathy fallback copy to a headline-only cover.
- Added stronger interior side-stem/leaf illustration for the deterministic sympathy SVG route.
- Added a Hugging Face image adapter for Inference Providers, promoted HF FLUX/Qwen/Z-Image benchmark candidates, and repaired image-provider fallback so a live provider failure can still return four local fallback panels.
- Added Cloudflare SDXL Lightning to the full `pipeline-quality` image comparison list and raised normalized image prompt length to avoid cutting prompts mid-instruction. The first live SDXL grade shows prompt length alone is not enough; prompts need shorter, earlier text-safe constraints.

## Commands

```bash
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-2026-06-13 --phase-dir pipeline-quality --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --text text-cloudflare-baseline --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-2026-06-13 --phase-dir pipeline-quality --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-deepai-text2img --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v4-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-cloudflare-flux-schnell --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-image-v1-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v8-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v10-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v12-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-svg-v17-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-cloudflare-flux-schnell --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-image-v2-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-cloudflare-baseline --image image-deepai-text2img --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-deepai-v10-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-hf-qwen3-235b-a22b --image image-deepai-text2img --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-hf-qwen-deepai-v1-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-deterministic-svg-v20-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-deepai-text2img --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-deterministic-deepai-v12-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-still-life-svg-v21-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-still-life-svg-v22-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-still-life-svg-v23-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-still-life-svg-v24-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-browser-svg-renderer --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-still-life-svg-v25-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-hf-qwen-image --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-hf-qwen-image-v1-2026-06-13 --live true
CUSTOMCARD_HUGGINGFACE_IMAGE_PROVIDER=hf-inference rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-hf-flux-schnell --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-hf-flux-hfinference-v1-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-hf-qwen-image --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-hf-qwen-image-v2-2026-06-13 --live true
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-cloudflare-sdxl-lightning --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-sdxl-v1-dryrun-2026-06-13
rtk proxy node scripts/model-benchmark-loop.mjs --phase pipeline-quality --story sympathy-quiet-support --text text-deterministic-support --image image-cloudflare-sdxl-lightning --output-dir docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-sdxl-v1-2026-06-13 --live true
```
