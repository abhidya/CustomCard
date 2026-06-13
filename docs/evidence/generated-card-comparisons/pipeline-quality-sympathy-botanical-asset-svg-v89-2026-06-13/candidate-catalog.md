# Model Benchmark Candidate Catalog

## Text Candidates

| Candidate | Adapter | Model | Configured | Missing env |
| --- | --- | --- | --- | --- |
| `text-deterministic-support` | `deterministic-customer-chat` | `deterministic-support-copy` | yes | none |
| `text-cloudflare-baseline` | `cloudflare-workers-ai-chat` | `@cf/meta/llama-3.1-8b-instruct-fast` | yes | none |
| `text-hf-qwen3-235b-a22b` | `huggingface-chat` | `Qwen/Qwen3-235B-A22B-Instruct-2507` | yes | none |
| `text-hf-deepseek-v4-flash` | `huggingface-chat` | `deepseek-ai/DeepSeek-V4-Flash` | yes | none |
| `text-hf-gpt-oss-20b` | `huggingface-chat` | `openai/gpt-oss-20b` | yes | none |
| `text-openai-baseline` | `openai-responses-chat` | `gpt-4o-mini` | no | OPENAI_API_KEY |
| `text-gemini-baseline` | `google-gemini-chat` | `gemini-1.5-flash` | no | GOOGLE_GENERATIVE_AI_API_KEY |
| `text-claude-baseline` | `anthropic-messages-chat` | `claude-3-5-haiku-latest` | no | ANTHROPIC_API_KEY |

## Image Candidates

| Candidate | Adapter | Model | Configured | Missing env |
| --- | --- | --- | --- | --- |
| `image-cloudflare-sdxl-lightning` | `cloudflare-workers-ai-image` | `@cf/bytedance/stable-diffusion-xl-lightning` | yes | none |
| `image-cloudflare-flux-schnell` | `cloudflare-workers-ai-image` | `@cf/black-forest-labs/flux-1-schnell` | yes | none |
| `image-deepai-text2img` | `deepai-text2img-image` | `text2img` | yes | none |
| `image-openai-gpt-image-2` | `openai-images` | `gpt-image-2` | no | OPENAI_API_KEY |
| `image-gemini-supported` | `google-gemini-image` | `gemini-3.1-flash-image` | no | GOOGLE_GENERATIVE_AI_API_KEY |
| `image-hf-flux-schnell` | `huggingface-image` | `black-forest-labs/FLUX.1-schnell` | yes | none |
| `image-hf-qwen-image` | `huggingface-image` | `Qwen/Qwen-Image` | yes | none |
| `image-hf-qwen-image-2512` | `huggingface-image` | `Qwen/Qwen-Image-2512` | yes | none |
| `image-hf-z-image-turbo` | `huggingface-image` | `Tongyi-MAI/Z-Image-Turbo` | yes | none |
| `image-browser-svg-renderer` | `browser-svg-renderer` | `deterministic-svg` | yes | none |

## Blocked Image Candidates

| Candidate | Adapter | Model | Reason |
| --- | --- | --- | --- |
| `image-fal-flux` | `fal-image` | `fal-ai/flux/schnell` | FAL_KEY missing and generator has no fal-image executor. |
| `image-together-flux` | `together-image` | `black-forest-labs/FLUX.1-schnell-Free` | TOGETHER_API_KEY missing and generator has no together-image executor. |
| `image-replicate-flux` | `replicate-image` | `black-forest-labs/flux-schnell` | REPLICATE_API_TOKEN missing and generator has no replicate-image executor. |
