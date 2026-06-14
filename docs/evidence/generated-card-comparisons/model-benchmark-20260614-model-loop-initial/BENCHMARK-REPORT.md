# Model Benchmark Loop Report

Date: 2026-06-14

## Scope

- Repo: `/Users/abdulrehmanbhidya/Documents/CodexCustomCard`
- Skill: `model-benchmark-loop`
- Live product-quality story: `sympathy-quiet-support`
- Live pipeline: `createAiCardGenerationService().generateCard()` via `scripts/model-benchmark-loop.mjs --phase pipeline-quality`
- Broader batch manifest: `full-suite-dry-run-dry-run.json`, 72 planned full-suite runs across low-context birthday, high-memory personal cards, B2B CTA, family/wedding sensitivity, medical graduation, sympathy, and expanded coverage stories.

## Configuration Snapshot

- Executable/configured live text in this environment:
  - `cloudflare-workers-ai-chat` using `@cf/meta/llama-3.1-8b-instruct-fast`
  - `huggingface-chat` using `Qwen/Qwen3-235B-A22B-Instruct-2507`, `deepseek-ai/DeepSeek-V4-Flash`, and `openai/gpt-oss-20b`
- Executable/configured live image in this environment:
  - `cloudflare-workers-ai-image` using `@cf/bytedance/stable-diffusion-xl-lightning` and `@cf/black-forest-labs/flux-1-schnell`
  - `deepai-text2img-image` using `text2img`
  - `huggingface-image` candidates are configured but prior/current evidence shows account-credit failures.
- Missing-key/catalogued options:
  - OpenAI text/image, Gemini text/image, Anthropic text, and several image providers are catalogued but not executable here until keys are added.

## Live Results

| Rank | Route | Status | Product | Contract | Evidence | Decision |
| --- | --- | --- | ---: | ---: | --- | --- |
| 1 | Cloudflare text + DeepAI image | completed | 48 | 84 | `pipeline-quality-cloudflare-deepai-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md` | Best of this live slice, but still D+. Do not promote. |
| 2 | Cloudflare text + Cloudflare SDXL | completed | 42 | 88 | `pipeline-quality-cloudflare-sdxl-live/sympathy-quiet-support__text-cloudflare-baseline__image-cloudflare-sdxl-lightning/manual-grade.md` | Contract pass, visible product fail. |
| 3 | Cloudflare text + Cloudflare FLUX | completed | 32 | 68 | `pipeline-quality-cloudflare-flux-live/sympathy-quiet-support__text-cloudflare-baseline__image-cloudflare-flux-schnell/manual-grade.md` | Available today, but fails no-mockup/flat-panel contract. |
| n/a | HF Qwen text + DeepAI image | failed | 0 | 0 | `pipeline-quality-hf-qwen-deepai-live/sympathy-quiet-support__text-hf-qwen3-235b-a22b__image-deepai-text2img/manual-grade.md` | Route unavailable: HF returned HTTP 402 monthly-credit depletion. |

## Text-Copy Ranking

1. `cloudflare-workers-ai-chat` is the only currently usable live text route from this run. It produced grounded copy with required terms, but copy quality varied: the FLUX run regressed to "please don't hesitate to reach out", which conflicts with the no-cliches request.
2. `huggingface-chat` Qwen remains historically promising from older repo evidence, but current live status is unavailable due HTTP 402. Treat as catalogued/unavailable until credits are restored.
3. OpenAI/Gemini/Anthropic are catalogued but not executable in this environment due missing keys.

## Image-Art Ranking

1. `deepai-text2img-image`: most readable of the live image routes, but bright/yellow cover and literal phone/note props miss the grief tone. Product 48.
2. `cloudflare-workers-ai-image` SDXL: completed with no provider failure, but inside-left was unreadable and art drifted to generic mountains/ornament. Product 42.
3. `cloudflare-workers-ai-image` FLUX: completed with no provider failure, but repeatedly rendered physical open-book/tabletop mockups. Product 32.
4. Hugging Face image candidates: configured, but prior evidence and current HF text 402 indicate account-credit risk. Do not rank as quality until a native four-panel run completes.

## Pricing Research

Sources accessed on 2026-06-14:

- Cloudflare Workers AI pricing: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare Workers AI model catalog: https://developers.cloudflare.com/workers-ai/models/
- DeepAI pricing: https://deepai.org/pricing
- Hugging Face Inference Providers pricing: https://huggingface.co/docs/inference-providers/en/pricing
- OpenAI API pricing: https://openai.com/api/pricing/
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini image generation docs: https://ai.google.dev/gemini-api/docs/image-generation

Notes:

- Cloudflare Workers AI: current docs list 10,000 free neurons/day and paid usage at `$0.011 / 1,000 neurons`. The catalog marks `@cf/meta/llama-3.1-8b-instruct-fast` deprecated; the pricing table lists nearby/current Llama 3.1 rows such as `@cf/meta/llama-3.1-8b-instruct-fp8-fast` at `$0.045 / M input tokens` and `$0.384 / M output tokens`. Exact pricing for the configured deprecated `-fast` id should be treated as migration risk.
- Cloudflare FLUX: pricing table lists `@cf/black-forest-labs/flux-1-schnell` at `$0.0000528 per 512x512 tile` plus `$0.0001056 per step`. The benchmark used 8 steps.
- Cloudflare SDXL Lightning: current model catalog still lists `@cf/bytedance/stable-diffusion-xl-lightning` as beta; the current pricing page did not expose an exact row for that model id.
- DeepAI: current pricing lists HD images at `$1 per 100` additional images, or `$0.01 each`. A 4-panel card is roughly `$0.04` after included allowance.
- Hugging Face: Inference Providers route through HF with monthly credits, then pay-as-you-go; docs list `$0.10` monthly credits for Free users and `$2.00` for PRO users, and state HF passes provider costs through with no markup. Current run hit 402 credit depletion.
- OpenAI GPT-Image-2: catalogued but not executable here; current pricing page lists image input at `$8 / M tokens` and image output at `$30 / M tokens`.
- Gemini image generation: catalogued but not executable here; current Gemini docs list native image generation models including `gemini-3.1-flash-image`, and pricing docs list paid image-output units such as `$0.134` per 1K/2K image for Gemini 3 Pro Image.

## Recommendation

- Do not promote any tested live image route for customer-facing sympathy cards.
- Keep Cloudflare text as the current usable text baseline only because it is live and structured enough, not because it is the best possible copy model.
- For image quality, DeepAI is the best currently available route in this slice, but it remains below the visible product gate.
- Next high-leverage move: enable a stronger image provider key already represented in repo config, preferably Gemini or OpenAI, then run one `pipeline-quality` sympathy slice before widening the 72-run full-suite manifest.
- Prompt-only next move if no new key is available: test a single DeepAI prompt repair that hard-bans bright/yellow celebration palettes and literal phone/note props, with muted moss/ivory/charcoal and lower-edge nonliteral practical-care motifs.

## Verification

- Ran repo model catalog:
  - `python3 ~/.codex/skills/model-benchmark-loop/scripts/catalog_customcard_models.py /Users/abdulrehmanbhidya/Documents/CodexCustomCard --format markdown`
- Ran benchmark history summary:
  - `python3 ~/.codex/skills/model-benchmark-loop/scripts/summarize_customcard_benchmarks.py /Users/abdulrehmanbhidya/Documents/CodexCustomCard --format markdown`
- Ran dry-run manifests:
  - `node scripts/model-benchmark-loop.mjs --phase pipeline-quality --output-dir docs/evidence/generated-card-comparisons/model-benchmark-20260614-model-loop-initial`
  - `node scripts/model-benchmark-loop.mjs --phase full --output-dir docs/evidence/generated-card-comparisons/model-benchmark-20260614-model-loop-initial --phase-dir full-suite-dry-run`
- Ran live product-quality slices:
  - Cloudflare text + Cloudflare SDXL
  - Cloudflare text + DeepAI
  - HF Qwen text + DeepAI
  - Cloudflare text + Cloudflare FLUX
- Manually inspected contact sheets for all completed live runs and wrote `manual-grade.md` files.
