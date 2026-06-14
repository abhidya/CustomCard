# Score Increase Report

Date: 2026-06-14

## Goal

Increase the visible product score for the current best live route:

- Story: `sympathy-quiet-support`
- Text: `text-cloudflare-baseline` / `@cf/meta/llama-3.1-8b-instruct-fast`
- Image: `image-deepai-text2img` / `text2img`
- Pipeline: `scripts/model-benchmark-loop.mjs --phase pipeline-quality`

## Baseline

- Evidence: `../model-benchmark-20260614-model-loop-initial/pipeline-quality-cloudflare-deepai-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md`
- Product score: 48/100
- Contract score: 84/100
- Main blockers: bright yellow/green cover, literal phone/note props, toy-like practical-care objects, generic visual system.

## Kept Change

- Code: `scripts/ai-card-generator.mjs`
- Test: `tests/ai-card-generator-prompt.test.ts`
- Change: DeepAI quiet-care prompts now route through a compact provider-specific shaper. The prompt bans bright/scenic/device artifacts early and replaces literal phone/note-card motifs with abstract practical-care relief.

## Live Attempt: V2

- Evidence: `pipeline-quality-cloudflare-deepai-prompt-v2-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md`
- Product score: 52/100
- Contract score: 84/100
- Delta: +4 product, no contract loss
- Keep/drop: keep
- Why it wins: it removed the worst literal device/note-card/grass-texture look and produced quieter front/back panels. It still has open-book/sun/horizon artifacts, so it remains a rough draft.

## Dropped Attempt: V3

- Evidence: `pipeline-quality-cloudflare-deepai-prompt-v3-live/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md`
- Product score: 44/100
- Contract score: 78/100
- Delta: -4 from baseline, -8 from V2
- Keep/drop: drop
- Why it lost: removing arc/path/fold language caused DeepAI to produce stronger sun/book/flower artifacts and cover text collision.

## Current Recommendation

- Keep the V2 DeepAI shaper as a small prompt-only improvement.
- Do not claim production readiness. The best live DeepAI score is now 52/100, still capped by visible-product quality.
- Next high-leverage score increase is not more tiny DeepAI wording; use a stronger configured image provider when credentials are available, or add a coherent premium artwork source.

## Verification

- `npm run test -- tests/ai-card-generator-prompt.test.ts --run`
- Dry-run manifest:
  - `pipeline-quality-cloudflare-deepai-prompt-v2-dry-run-dry-run.json`
- Live runs:
  - `pipeline-quality-cloudflare-deepai-prompt-v2-live-summary.json`
  - `pipeline-quality-cloudflare-deepai-prompt-v3-live-summary.json`
