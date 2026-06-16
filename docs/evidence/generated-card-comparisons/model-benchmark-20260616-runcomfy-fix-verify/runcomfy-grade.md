# RunComfy Flux 2 Dev Free Grade

- Date: 2026-06-16
- Phase: pipeline-quality
- Story: sympathy-quiet-support
- Text candidate: text-cloudflare-baseline
- Image candidate: image-runcomfy-flux-2-dev-free
- Model: blackforestlabs/flux-2/dev/text-to-image
- Contact sheet: missing

## Result

- Product quality score: 0/100
- Prompt/pipeline contract score: 35/100
- Tier: F
- Route reliability: failed

## Evidence

- Fresh verification run: `docs/evidence/generated-card-comparisons/model-benchmark-20260616-runcomfy-fix-verify/pipeline-quality-runcomfy-fix-verify-summary.json`
- Run status: 502 from the card generation service.
- RunComfy submit/auth path: request accepted and queued.
- RunComfy result path: `failed` with `AiError: Internal server error` and code `3043`.
- Panel count: 0

## Dimension Scores

- Prompt adherence and panel contract: 0/15
- Occasion and user-story fit: 8/15
- Copy quality and emotional calibration: 11/15
- Visual composition and print readiness: 0/15
- Theme coherence across panels: 0/10
- Text/name fidelity strategy: 0/10
- Domain/cultural sensitivity: 8/10
- Commercial usefulness: 0/5
- Originality and taste: 0/5
- Raw dimension sum: 27/100
- Applied cap: 0/100 because no visible card artifact or panels were produced.

## Judgment

RunComfy is configured, reachable, and using the documented model id from admin/provider config, but this Flux 2 Dev Free route is not usable for the card-generation benchmark today. The token and endpoint work; the provider fails after queue completion before returning any image URL.

This is a provider/model reliability failure, not a model-id-in-env issue and not a local auth mismatch.

## Smallest Next Fix

Try another RunComfy model id through the admin model picker, or retry this free endpoint after RunComfy resolves the result-side internal error. Keep only `RUNCOMFY_API_TOKEN` in env; keep model ids in admin provider config.
