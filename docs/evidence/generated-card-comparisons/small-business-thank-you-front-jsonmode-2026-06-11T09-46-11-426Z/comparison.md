# Small Business Thank-You Front Benchmark

Run: `small-business-thank-you-front-jsonmode-2026-06-11T09-46-11-426Z`

## Competitor

- Competitor: Adobe Express
- Source: https://www.adobe.com/express/create/ai/card
- Touted prompt: `thanks for supporting our small business`

![Adobe Express small business thank-you](../../competitor-card-examples/adobe-express-small-business-thanks.png)

## CustomCard Output

- Text provider routed to: `cloudflare-workers-ai-chat` using model `@cf/meta/llama-3.1-8b-instruct-fast`
- Text response mode: Cloudflare JSON Mode `response_format: json_schema`
- Image provider routed to: `cloudflare-workers-ai-image` using model `@cf/bytedance/stable-diffusion-xl-lightning`
- Image scope for this run: `front panel only`
- Persistence status: `stored`

![CustomCard generated front](./customcard-small-business-thanks-front-preview.png)

SVG source: [./customcard-small-business-thanks-front.svg](./customcard-small-business-thanks-front.svg)

Provider image artifact: [./customcard-provider-front-art.jpg](./customcard-provider-front-art.jpg)

## Prompt Shape

The CustomCard prompt is structured around our UI/UX instead of a single text box: occasion, recipient relationship, tone, style, approved memory notes, four editable copy panels, print-safe margins, deterministic typography, and human review before external sharing. The image spend was intentionally limited to the front-cover panel for this benchmark.

See `effective-prompt.json` for the full prompt and `debug-log.json` for redacted provider/persistence logs.
