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

- Primary run: `docs/evidence/generated-card-comparisons/model-benchmark-20260616-runcomfy-flux2/pipeline-quality-runcomfy-flux2-summary.json`
- Primary status: 502 from the card generation service.
- RunComfy submit: 200 OK with a request id.
- RunComfy polling: reached `completed`.
- RunComfy result: `failed` with provider error code 3043 and no output image URL.
- Low-step retry: `docs/evidence/generated-card-comparisons/model-benchmark-20260616-runcomfy-flux2-retry-steps4/pipeline-quality-runcomfy-flux2-steps4-summary.json`, same failure.
- Direct simple smoke prompt: submit 200 OK, poll completed, result failed with no output keys.

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

RunComfy is configured and reachable, but this model is not usable for the current card-generation route today. The API token works, the configured admin model id routes to the documented endpoint, and the async queue flow returns request ids and status responses. The provider fails at result time before producing a panel image, so there is no customer-visible card to grade beyond a hard failure.

The failure is provider/model reliability rather than prompt wording: the same result failure occurred on the full benchmark prompt, a low-step retry, and a direct simple smoke prompt.

## Smallest Next Fix

Use the admin model picker to try another RunComfy model id, or wait and retry this free Flux 2 Dev endpoint after RunComfy resolves the result-side internal error. Keep `RUNCOMFY_API_TOKEN` in env only; keep model ids in admin provider config.
