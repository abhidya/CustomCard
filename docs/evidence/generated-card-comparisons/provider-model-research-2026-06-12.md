# Provider and Prompt Research - 2026-06-12

## Repo-local evidence

- Latest reviewed run: `card-gen-benchmark-2026-06-11T13-38-50-913Z`.
- The benchmark harness generates four panels per fixture through `npm run card:benchmark -- --live`, stores effective prompts, provider HTTP payloads, previews, and comparison notes.
- The card-copy flow was already using Cloudflare Workers AI JSON Mode for a four-panel schema. The image flow could execute Cloudflare Workers AI or the deterministic browser SVG renderer; OpenAI and Gemini image adapters existed in the catalog/runtime contract but were not executable in `scripts/ai-card-generator.mjs`.
- The strongest prompt issue was not only unsafe subjects. Some LLM image prompts leaked app-overlay copy concepts such as "recipient's name" and "message" or stayed generic with phrases such as "simple border style" and "mix of natural motifs". Those prompts need repair into concrete visual motifs before any image provider sees them.

## Upstream findings

- Cloudflare Workers AI REST calls execute models under `/accounts/{ACCOUNT_ID}/ai/run/{model}` with bearer auth, matching the existing Cloudflare execution path. Cloudflare JSON Mode uses `response_format.type = "json_schema"` and a `json_schema` object, but Cloudflare notes schema compliance can still fail and must be handled.
- OpenAI's current image generation guide uses the Images API with `gpt-image-2`. OpenAI structured outputs for Responses use a `text.format` JSON Schema shape with `strict: true`.
- Gemini structured output REST requests use `generationConfig.responseFormat.text.mimeType = "application/json"` plus a schema. Gemini image generation docs list `gemini-3.1-flash-image`, `responseModalities: ["Image"]`, and optional image response formatting such as `aspectRatio` and `imageSize`.
- fal's own docs recommend asynchronous queue inference for model APIs such as FLUX because it exposes queue position, status URLs, retries, and result retrieval. That makes fal a good benchmark candidate for high-quality image lanes, but it should stay behind queue/governance rather than becoming the default synchronous card path.

## Changes made from this loop

- Keep Cloudflare Workers AI as the default card-copy path because the repo already has JSON Mode tests and live benchmark evidence around it.
- Add executable OpenAI image generation support and default the optional OpenAI image adapter to `gpt-image-2`.
- Add executable Gemini image generation support and default the optional Gemini image adapter to `gemini-3.1-flash-image`, requesting portrait-ish `3:4` 2K output for 5x7 card panels.
- Extend structured card-copy schemas beyond Cloudflare so OpenAI Responses and Gemini chat can return the same four-panel contract.
- Repair image prompts when they leak overlay-copy language or are too generic for the target occasion/panel.
- Make deterministic SVG motif placement respect panel text-safe zones so local debug runs do not paint decorative motifs through the message area.

## Verification runs

- `card-gen-benchmark-2026-06-12T01-39-15-536Z`: live card-copy plus deterministic SVG image run for the default three fixtures. Prompt repair produced concrete visual briefs for small-business, medical-graduation, and dad-fix-anything. Visual review found remaining motif overlap on text panels.
- `card-gen-benchmark-2026-06-12T01-43-44-899Z`: focused medical-graduation rerun after the SVG text-safe-zone fix. Interior panels kept motifs around the edges and left the central text panels clean.

## Next benchmark matrix

Run the same four fixtures, then compare visual quality, prompt adherence, text artifacts, latency, and cost:

1. `cloudflare-workers-ai-chat` + `cloudflare-workers-ai-image` for current default/provider continuity.
2. `cloudflare-workers-ai-chat` + `openai-images` using `gpt-image-2` for quality baseline.
3. `google-gemini-chat` + `google-gemini-image` using `gemini-3.1-flash-image` for a second multimodal baseline.
4. `cloudflare-workers-ai-chat` + `browser-svg-renderer` for deterministic layout/prompt debugging.
5. Future candidate: `fal-image` with FLUX through the existing governance path, ideally using queue semantics before any live customer route.

## Sources

- Cloudflare Workers AI REST API: https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- Cloudflare Workers AI JSON Mode: https://developers.cloudflare.com/workers-ai/features/json-mode/
- OpenAI image generation guide: https://platform.openai.com/docs/guides/image-generation
- OpenAI structured outputs guide: https://platform.openai.com/docs/guides/structured-outputs
- Gemini image generation guide: https://ai.google.dev/gemini-api/docs/image-generation
- Gemini structured output guide: https://ai.google.dev/gemini-api/docs/structured-output
- fal asynchronous inference guide: https://fal.ai/docs/documentation/model-apis/inference/queue
