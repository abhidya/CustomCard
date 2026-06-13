# Manual grade

- `product_quality_score`: 40/100
- `prompt_pipeline_contract_score`: 68/100
- `tier`: D+ fallback route
- `graded_by`: Codex manual visual review
- `graded_at`: 2026-06-13

## Visible product judgment

Cloudflare FLUX did not render native panels. The provider returned 429 daily allocation exhaustion twice, then the pipeline fell back to the local browser SVG asset route. The visible artifact matches the v102 fallback quality: clear practical-care cues and readable deterministic copy, but still procedural and not premium.

Do not grade this as FLUX visual quality. It is provider-gate evidence plus fallback-completeness evidence.

## Dimension notes

- Prompt adherence and panel contract: 10/15
- Occasion and user-story fit: 11/15
- Copy quality and emotional calibration: 14/15
- Visual composition and print readiness: 9/15
- Theme coherence: 8/10
- Text/name fidelity strategy: 10/10
- Domain/cultural sensitivity: 10/10
- Commercial usefulness: 3/5
- Originality and taste: 2/5
- Raw dimension total: 77/100
- Hard cap applied: 40 product because selected image route failed and visible output is fallback local art.

## Provider evidence

- Provider: `image-cloudflare-flux-schnell`
- Model: `@cf/black-forest-labs/flux-1-schnell`
- Failure: HTTP 429, Cloudflare code `4006`, daily free allocation exhausted
- Provider calls: 2
- Native panels: 0
- Fallback panels: 4

## Keep/drop

- Keep as evidence that Cloudflare is still quota-blocked.
- Drop as product-quality route until paid quota/reset is available.
