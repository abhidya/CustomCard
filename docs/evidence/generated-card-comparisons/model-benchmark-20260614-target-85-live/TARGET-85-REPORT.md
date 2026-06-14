# Target 85 Product Score Report

Date: 2026-06-14

## Goal

Increase the visible `pipeline-quality` product score for `sympathy-quiet-support` to at least 85/100.

Target was not reached. Best retained live evidence remains 52/100 from the prior DeepAI V2 shaper:

- Evidence: `../model-benchmark-20260614-score-increase-v2/pipeline-quality-cloudflare-deepai-prompt-v2-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md`
- Text: `text-cloudflare-baseline` / `@cf/meta/llama-3.1-8b-instruct-fast`
- Image: `image-deepai-text2img` / `text2img`
- Product score: 52/100
- Contract score: 84/100
- Status: kept in source as the best prompt-only live-provider improvement.

## Target Attempts

| Attempt | Evidence | Product | Contract | Keep/Drop | Reason |
| --- | --- | ---: | ---: | --- | --- |
| DeepAI current prompt | `pipeline-quality-cloudflare-deepai-target85-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/contact-sheet.png` | 38/100 | 76/100 | drop as target route | Native four-panel run, but visible output regressed into yellow sun, hills/landscape, open-book artifact, and fake cropped text. |
| Cloudflare SDXL | `pipeline-quality-cloudflare-sdxl-target85-live/sympathy-quiet-support__text-cloudflare-baseline__image-cloudflare-sdxl-lightning/contact-sheet.png` | 18/100 | 56/100 | drop | Rendered physical open books, ornate frames, fake text, mountain scenes, and app-copy collisions. Hard-capped by panel-contract failure. |
| Cloudflare FLUX | `pipeline-quality-cloudflare-flux-target85-live/sympathy-quiet-support__text-cloudflare-baseline__image-cloudflare-flux-schnell/contact-sheet.png` | 30/100 | 68/100 | drop | Cleaner palette than SDXL, but still blank-template-like with open-book/page artifacts and weak practical-care concept. |
| Hugging Face Qwen Image 2512 | `pipeline-quality-cloudflare-hf-qwen2512-target85-live-summary.json` | 0/100 | 20/100 | unavailable | Provider returned 402 monthly-credit depletion before image generation; zero panels. |
| FLUX prompt hardening experiment | `pipeline-quality-cloudflare-flux-v2-target85-live/sympathy-quiet-support__text-cloudflare-baseline__image-cloudflare-flux-schnell/contact-sheet.png` | 32/100 | 70/100 | reverted | Practical-care objects improved, but the provider still rendered physical open-book/mockup panels across the card. |
| DeepAI prompt hardening experiment | `pipeline-quality-cloudflare-deepai-v2-target85-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/contact-sheet.png` | 10/100 | 52/100 | reverted | Worse than retained V2: sun/landscape, open-book/page artifacts, fake text, and a religious-symbol-looking back mark. |

## Scoring Notes

- Scores are visible-product grades from contact sheets, not JSON/schema grades.
- Hard caps applied where panels were physical mockups/open books instead of flat card panels, contained fake text, or required a full art/layout redo.
- Auto checks passed on several runs, but the rubric does not let auto checks lift weak visible artifacts.
- Prompt hardening was tested and then reverted because it did not beat the retained V2 DeepAI prompt.

## Blocker

The available live image routes cannot currently produce an 85/100 visible product for this story:

- DeepAI ignores key anti-sun/anti-landscape/anti-book constraints.
- Cloudflare SDXL and FLUX repeatedly render physical book/mockup/page compositions.
- Hugging Face premium image routes are configured but credit-blocked with 402.
- OpenAI and Gemini image routes are catalogued but not executable because usable API keys are missing from benchmark availability.

## Next High-Leverage Route

Do not spend more loops on tiny DeepAI/Cloudflare wording for this target. To plausibly clear 85, add one of:

- a usable stronger image-provider credential for the existing `image-openai-gpt-image-2` or `image-gemini-supported` adapters, then rerun `pipeline-quality`;
- restored Hugging Face paid/prepaid capacity for Qwen Image / Z Image / FLUX complete four-panel runs;
- a new approved premium artwork source that goes through the full `createAiCardGenerationService().generateCard()` path, not retired local/SVG fallback scoring.

## Verification

- Catalog: `candidate-catalog.md`
- Dry run: `pipeline-quality-target-85-dry-run-dry-run.json`
- Live runs:
  - `pipeline-quality-cloudflare-deepai-target85-live-summary.json`
  - `pipeline-quality-cloudflare-sdxl-target85-live-summary.json`
  - `pipeline-quality-cloudflare-flux-target85-live-summary.json`
  - `pipeline-quality-cloudflare-hf-qwen2512-target85-live-summary.json`
  - `pipeline-quality-cloudflare-flux-v2-target85-live-summary.json`
  - `pipeline-quality-cloudflare-deepai-v2-target85-live-summary.json`
- Test: `npm run test -- tests/ai-card-generator-prompt.test.ts --run`
