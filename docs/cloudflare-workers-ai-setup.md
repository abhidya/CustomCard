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

Use `@cf/bytedance/stable-diffusion-xl-lightning` as the default image model.
It is the cheapest practical image default on Cloudflare Workers AI and is fast
enough for iterative card drafts.

Use `@cf/black-forest-labs/flux-1-schnell` as the image quality fallback when
prompt adherence matters more than the absolute lowest cost. Use
`@cf/runwayml/stable-diffusion-v1-5-inpainting` only when an edit or mask-based
inpainting workflow is explicitly needed.

## Fallback Order

1. Cloudflare LLM JSON Mode default: `@cf/meta/llama-3.1-8b-instruct-fast`.
2. Cloudflare LLM quality fallback: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
3. Cloudflare image default: `@cf/bytedance/stable-diffusion-xl-lightning`.
4. Cloudflare image quality fallback: `@cf/black-forest-labs/flux-1-schnell`.
5. Hugging Face specialty image fallback for non-commercial typography/layout experiments, especially Ideogram 4.
6. DeepAI `text2img` as a simple last-resort image API fallback.

## Prompt Contracts

The live `/api/ai/card/generate` text path uses Cloudflare's OpenAI-compatible
chat endpoint. For `card-copy`, the request includes `response_format:
{ type: "json_schema", json_schema: ... }` with exactly four required panel
objects: `front`, `inside-left`, `inside-right`, and `back`.

The live image path generates one provider request per card panel. Each request
targets a single portrait 5x7 panel, carries `folded-card-four-panel-v1`
metadata, and avoids collage/folded mockup prompts. Cloudflare SDXL Lightning is
asked for a 5:7-safe `1464 x 2048` image because Workers AI image dimensions cap
at 2048 px on the long edge and SDXL dimensions must be divisible by 8; the
renderer/export contract still treats the final panel as `1500 x 2100` at 300 DPI.

## Deployment

Set the same Cloudflare env vars in Vercel for Production, Preview, and
Development before promoting a live AI path. Do not commit `.env`, `.env.local`,
or copied Cloudflare API tokens.
