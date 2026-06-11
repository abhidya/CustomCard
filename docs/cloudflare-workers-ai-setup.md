# Cloudflare Workers AI Setup

Cloudflare Workers AI is the preferred low-cost AI provider for this app's
first live hosted model path. Keep real values in ignored local env files and in
Vercel's encrypted environment store; tracked files should only contain
placeholders and model IDs.

## Environment

Required shared configuration:

```bash
CLOUDFLARE_ACCOUNT_ID=replace-me
CLOUDFLARE_API_TOKEN=replace-me
CLOUDFLARE_WORKERS_AI_TEXT_MODEL=@cf/meta/llama-3.1-8b-instruct-fast
CLOUDFLARE_WORKERS_AI_IMAGE_MODEL=@cf/bytedance/stable-diffusion-xl-lightning
```

Optional split-token overrides:

```bash
CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN=replace-me
CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN=replace-me
```

The runtime uses `CLOUDFLARE_API_TOKEN` unless a lane-specific token is set. Use
split tokens when Cloudflare issues separate Workers AI tokens for LLM and image
generation.

## Recommended Models

Use `@cf/meta/llama-3.1-8b-instruct-fast` as the default LLM for card copy,
metadata shaping, and lightweight customer-chat assistance. It is the cheapest
Cloudflare JSON Mode-capable default in this repo's live path, and card-copy
requests send a JSON Schema through `response_format` so panel copy is not
prompt-only JSON.

Use `cloudflare-workers-ai-image` as the preferred live card-image adapter right
now. The app still keeps `browser-svg-renderer` as the deterministic fallback and
debug path for flat 1500 x 2100 artwork layers, but Cloudflare remains visible in
admin and is the primary live image route when credentials and live calls are
enabled.

Use `@cf/bytedance/stable-diffusion-xl-lightning` as the current Cloudflare image
default. It is the cheapest practical image default on Cloudflare Workers AI and
is fast enough for iteration; keep deterministic typography in app overlays and
review generated images for fake lettering or physical mockup artifacts.

Use `@cf/black-forest-labs/flux-1-schnell` as the image quality fallback when
prompt adherence matters more than the absolute lowest cost. Use
`@cf/runwayml/stable-diffusion-v1-5-inpainting` only when an edit or mask-based
inpainting workflow is explicitly needed.

Set `CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID=cloudflare-workers-ai-image` for the
preferred live image path. Set it to `browser-svg-renderer` for deterministic
RCA, no-network debugging, or a print-safe fallback when provider output needs a
pause.

## Fallback Order

1. Cloudflare LLM JSON Mode default: `@cf/meta/llama-3.1-8b-instruct-fast`.
2. Cloudflare LLM quality fallback: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
3. Preferred live image adapter: `CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID=cloudflare-workers-ai-image`.
4. Deterministic image fallback/debug adapter: `CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID=browser-svg-renderer`.
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

The live image path generates one image per card panel. With
`browser-svg-renderer`, those images are deterministic SVG artwork layers and no
image-provider network call is made. With `cloudflare-workers-ai-image`, each
request targets a single portrait 5x7 panel, carries
`folded-card-four-panel-v1` metadata, and avoids runtime prompt boilerplate such
as `Recipient:`, `Relationship:`, `Panel headline:`, or `Panel body:`. Exact
typography is reserved for deterministic app overlays, so generated image
prompts must avoid readable text, logos, and watermarks unless a future provider
has reliable text rendering. Cloudflare SDXL Lightning is asked for a 5:7-safe
`1464 x 2048` image because Workers AI image dimensions cap at 2048 px on the
long edge and SDXL dimensions must be divisible by 8; the renderer/export
contract still treats the final panel as `1500 x 2100` at 300 DPI.

## Benchmarking

Run the live comparison benchmark only when provider calls and R2 writes are
intended:

```bash
npm run card:benchmark -- --live --image-adapter browser-svg-renderer --fixtures small-business-thank-you,medical-graduation,dad-fix-anything,botanical-birthday
```

Use `--image-adapter cloudflare-workers-ai-image` when validating the preferred
live provider path.

Benchmark logs redact authorization headers, Cloudflare account IDs, object
store credentials, signed URLs, and data URLs. Keep
`src/cardGenerationBenchmarkRedaction.test.ts` passing before committing new
evidence.

## Deployment

Set the same Cloudflare env vars in Vercel for Production, Preview, and
Development before promoting a live AI path. For the preferred live card-image
route, set `CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID=cloudflare-workers-ai-image` and
`CUSTOMCARD_AI_CARD_IMAGE_LIVE_ENABLED=true`. Do not commit `.env`,
`.env.local`, or copied Cloudflare API tokens.
