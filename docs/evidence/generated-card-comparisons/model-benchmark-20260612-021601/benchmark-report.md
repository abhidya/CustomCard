# CustomCard Model Benchmark Report

Run folder: `docs/evidence/generated-card-comparisons/model-benchmark-20260612-021601`

## What Ran

- Smoke: 7 corrected smoke runs in `smoke-fixed/`; earlier `smoke/` and `smoke-deepai-retry/` are retained as evidence of the first prompt-wording issue and the DeepAI hosted-image logging fix.
- Full: 30 cards across 5 required stories, 3 text candidates, and 2 image candidates.
- Tests after wiring: `src/aiFlowConfig.test.ts`, `src/providerRuntime.test.ts`, `src/aiCardGenerator.test.ts`, `src/providerOps.test.ts`, `src/aiProviderReadiness.test.ts` all passed (62 tests).

## Catalog Summary

See `scanner-catalog.md` and `candidate-catalog.md`. DeepAI HD is now listed as configured and executable. OpenAI/Gemini/Claude are supported in code but not executable locally because keys are missing. Hugging Face image candidates are catalogued but not executable because the generator has no `huggingface-image` executor.

## Result Summary

| Area | Winner | Evidence | Caveat |
| --- | --- | --- | --- |
| Text quality/reliability | Hugging Face Qwen/Qwen3-235B-A22B-Instruct-2507 | 10/10 text success; best birthday/get-well copy. | Exact HF routed-provider cost not exposed in local metadata. |
| Text runner-up | Cloudflare baseline | Current baseline, usable for simple birthday. | 429s late in full run; B2B/generic repair issues. |
| Text eliminated | DeepSeek V4 Flash, gpt-oss-20b | DeepSeek failed 9/10 full text parses; gpt-oss failed smoke extraction. | Needs model-specific JSON extraction/repair before retest. |
| Image visual upside | Cloudflare FLUX.1 Schnell | Best clean birthday stationery. | 6/15 full image failures from 429; generated fake text on get-well/B2B. |
| Image availability | DeepAI HD | 14/15 full image success after wiring; $0.04/card image cost. | Frequently renders unwanted text/calligraphy; one 400 on get-well baseline. |
| Image eliminated | Cloudflare SDXL Lightning | Smoke showed dense ornament, fake text, poor overlay safety. | Keep only as legacy baseline, not top candidate. |

No tested combo reached A-tier across all five stories. Best current iteration combo is Qwen text + DeepAI HD when availability matters, and Qwen text + Cloudflare Flux when visual upside matters after adding queue/backoff.

## Rankings

Text ranking:

1. `text-hf-qwen3-235b-a22b` - best copy and 10/10 parse success.
2. `text-cloudflare-baseline` - cheaper/current baseline, but generic and rate-limited in full sweep.
3. `text-hf-deepseek-v4-flash` - not acceptable until JSON output is repaired.
4. `text-hf-gpt-oss-20b` - smoke failure: no extractable text.

Image ranking:

1. `image-deepai-hd` - most available in this full run, but prompt must forbid all typography more strongly.
2. `image-cloudflare-flux-schnell` - best visual style when successful, but needs rate limiting/backoff and no-text prompt repair.
3. `image-cloudflare-sdxl-lightning` - eliminated after smoke due fake text/crowding.

## Prompt/Config Changes

1. Replace hardcoded `buildCopyRepairPlan` fallback buckets with request-derived repair plans. Add a dedicated B2B warranty-renewal repair path; current purchase/customer terms trigger small-business copy.
2. Strengthen image prompt policy: art-only blank panel backgrounds, no words, no letters, no calligraphy, no signage, no labels, no text-like marks; all typography is app overlay.
3. Move recipient names and exact CTA/date text into deterministic overlays, not image prompts. Qwen+DeepAI wedding/medical missed visible names.
4. Add provider queue/backoff for Cloudflare image/text before benchmarks or production. The full sweep hit 429s after repeated live calls.
5. Add model-specific JSON repair/extraction for Hugging Face models or restrict to Qwen. DeepSeek/gpt-oss should be blocked until they return parseable structured card JSON.
6. Track DeepAI actual image count and cost in provider_call_events at $0.01/HD image, with admin ORR showing DeepAI Pro dashboard plus local ledger reconciliation.

## Blocked Providers

- OpenAI text/image: missing `OPENAI_API_KEY`; code executor exists.
- Gemini text/image: missing `GOOGLE_GENERATIVE_AI_API_KEY`; code executor exists.
- Claude text: missing `ANTHROPIC_API_KEY`; code executor exists.
- Hugging Face image models: credentials exist but `scripts/ai-card-generator.mjs` has no `huggingface-image` executor.
- fal/Together/Replicate image: missing credentials and no generator image executor.

## Next Loop

Run a smaller retest after prompt/config fixes: Qwen text only, Cloudflare Flux vs DeepAI HD, stories `first-time-user-birthday`, `b2b-crm-warranty-renewal`, and `medical-school-graduation`, with provider concurrency 1 and a delay/backoff between cards. Retest DeepAI `hd` against `genius` only if budget allows.

Supporting files: `benchmark-matrix.md`, `manual-grades.json`, `pricing-table.md`, `rankings.json`, `full-summary.json`, and all per-card payloads/contact sheets under `full/`.
