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
CLOUDFLARE_WORKERS_AI_TEXT_MODEL=@cf/meta/llama-3.2-3b-instruct
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

Use `@cf/meta/llama-3.2-3b-instruct` as the default LLM for prompt expansion,
card copy, metadata shaping, and lightweight customer-chat assistance. It has a
large context window and a low token price, so it is the right first model for
routine app traffic.

Use `@cf/bytedance/stable-diffusion-xl-lightning` as the default image model.
It is the cheapest practical image default on Cloudflare Workers AI and is fast
enough for iterative card drafts.

Use `@cf/black-forest-labs/flux-1-schnell` as the image quality fallback when
prompt adherence matters more than the absolute lowest cost. Use
`@cf/runwayml/stable-diffusion-v1-5-inpainting` only when an edit or mask-based
inpainting workflow is explicitly needed.

## Fallback Order

1. Cloudflare LLM: `@cf/meta/llama-3.2-3b-instruct`.
2. Cloudflare LLM quality fallback: `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.
3. Cloudflare image default: `@cf/bytedance/stable-diffusion-xl-lightning`.
4. Cloudflare image quality fallback: `@cf/black-forest-labs/flux-1-schnell`.
5. Hugging Face specialty image fallback for non-commercial typography/layout experiments, especially Ideogram 4.
6. DeepAI `text2img` as a simple last-resort image API fallback.

## Deployment

Set the same Cloudflare env vars in Vercel for Production, Preview, and
Development before promoting a live AI path. Do not commit `.env`, `.env.local`,
or copied Cloudflare API tokens.
