# Cloudflare Workers AI Setup

Cloudflare Workers AI is the preferred low-cost AI provider for this app's
first live hosted model path. Keep real values in ignored local env files and in
Vercel's encrypted environment store; tracked files should only contain
placeholders.

## Environment

Required hosted Cloudflare credentials:

```bash
CLOUDFLARE_ACCOUNT_ID=replace-me
CLOUDFLARE_API_TOKEN=replace-me
```

Optional split-token overrides:

```bash
CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN=replace-me
CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN=replace-me
```

The runtime uses `CLOUDFLARE_API_TOKEN` unless a lane-specific token is set. Use
split tokens when Cloudflare issues separate Workers AI tokens for LLM and image
generation.

For the production-text local Comfy path, hosted Cloudflare image keys are not
required. Keep the Cloudflare text/account setup for card copy, but only add
`CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN` when you are explicitly validating the live
Cloudflare image adapter instead of the local Comfy workflow.

Optional live Cloudflare image lane configuration:

```bash
CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN=replace-me
```

## Recommended Models

Use `@cf/qwen/qwen3-30b-a3b-fp8` as the default LLM for production card copy.
It is the current Cloudflare text model for the full card-copy JSON contract,
and card-copy requests send a JSON Schema through `response_format` so panel
copy is not prompt-only JSON. Configure that model in Admin Providers, not env.

Use `local-comfyui-api-image` as the benchmark-backed card-image default when the
production text workflow is available. The current best structural evidence is
Cloudflare Qwen3 30B card copy plus local ComfyUI image generation with
`CustomCardTextComposer` final text composition. Cloudflare image generation
stays available in Admin Providers as the hosted image fallback and experiment
lane, not as an env-selected feature flag.

Use `@cf/bytedance/stable-diffusion-xl-lightning` as the current Cloudflare image
default. It is the cheapest practical image default on Cloudflare Workers AI and
is fast enough for iteration; keep deterministic typography in app overlays and
review generated images for fake lettering or physical mockup artifacts.

Use `@cf/black-forest-labs/flux-1-schnell` as the image quality fallback when
prompt adherence matters more than the absolute lowest cost. Use
`@cf/runwayml/stable-diffusion-v1-5-inpainting` only when an edit or mask-based
inpainting workflow is explicitly needed.

Configure provider, model, workflow, budget, queue, and live-call behavior in
Admin Providers. Use `cloudflare-workers-ai-image` there when validating the
hosted Cloudflare image lane; keep `local-comfyui-api-image` with
`customcard-flux2-klein-production-text-overlay` for the benchmark-backed production text
workflow.

## Fallback Order

1. Cloudflare LLM JSON Mode default: `@cf/qwen/qwen3-30b-a3b-fp8`.
2. Cloudflare LLM low-cost fallback: `@cf/meta/llama-3.1-8b-instruct-fast`.
3. Benchmark-backed image/default composition lane: `local-comfyui-api-image` with `customcard-flux2-klein-production-text-overlay` in Admin Providers.
4. Hosted image fallback: `cloudflare-workers-ai-image` in Admin Providers.
5. Cloudflare image quality experiment: `@cf/black-forest-labs/flux-1-schnell`.
6. Hugging Face specialty image fallback for non-commercial typography/layout experiments, especially Ideogram 4.
7. DeepAI `text2img` as a simple last-resort image API fallback.

## Prompt Contracts

The live `/api/ai/card/generate` text path uses Cloudflare's OpenAI-compatible
chat endpoint. For `card-copy`, the request includes `response_format:
{ type: "json_schema", json_schema: ... }` with exactly four required panel
objects: `front`, `inside-left`, `inside-right`, and `back`. Each panel includes
editable copy fields plus `image_prompt` and `image_negative_prompt`. The
`image_prompt` is the literal prompt sent to the image model; it should read like
an art director's visual request, for example "A premium 5x7 vertical greeting
card front design..." with specific motifs, palette, composition, and
print-quality constraints.

The live image path generates one image per card panel. With the production text
Comfy workflow, the image adapter renders the final panel artifact through
`CustomCardTextComposer` so exact panel copy reaches the output image instead of
being left to the diffusion model. With `cloudflare-workers-ai-image`, each
request targets a single portrait 5x7 panel, carries `folded-card-four-panel-v1`
metadata, and avoids runtime prompt boilerplate such as `Recipient:`,
`Relationship:`, `Panel headline:`, or `Panel body:`. Cloudflare SDXL Lightning
is asked for a 5:7-safe `1464 x 2048` image because Workers AI image dimensions
cap at 2048 px on the long edge and SDXL dimensions must be divisible by 8; the
renderer/export contract still treats the final panel as `1500 x 2100` at
300 DPI.

## Benchmarking

Run the live comparison benchmark only when provider calls and R2 writes are
intended:

```bash
npm run comfy:production-text:doctor -- --advisory
npm run card:benchmark -- --live --phase local-production-text --fixtures small-business-thank-you,medical-graduation,dad-fix-anything,botanical-birthday
```

Use `--image-adapter cloudflare-workers-ai-image` when validating the hosted
Cloudflare image fallback path.

Benchmark logs redact authorization headers, Cloudflare account IDs, object
store credentials, signed URLs, and data URLs. Keep
`src/cardGenerationBenchmarkRedaction.test.ts` passing before committing new
evidence.

## Deployment

Set the same Cloudflare secret env vars in Vercel for Production, Preview, and
Development before promoting a live AI path. For the benchmark-backed card-image
route, set `local-comfyui-api-image`, `flux-2-klein-4b.safetensors`,
`customcard-flux2-klein-production-text-overlay`, and workflow inputs for `960x1344`
panels with the distilled 4-step Flux2 Klein preset
in Admin Providers, then enable the card-image flow from the Admin provider
controls. Do not commit `.env`, `.env.local`, or copied Cloudflare API tokens.
