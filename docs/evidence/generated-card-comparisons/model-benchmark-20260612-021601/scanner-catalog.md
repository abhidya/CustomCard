# CustomCard Model Catalog

Repo: `/Users/abdulrehmanbhidya/Documents/CodexCustomCard`

## Executable adapters in ai-card-generator

- `anthropic-messages-chat`
- `browser-svg-renderer`
- `cloudflare-workers-ai-chat`
- `cloudflare-workers-ai-image`
- `deepai-text2img-image`
- `deepseek-chat`
- `deterministic-customer-chat`
- `fireworks-chat`
- `google-gemini-chat`
- `google-gemini-image`
- `groq-chat`
- `huggingface-chat`
- `mistral-chat`
- `openai-images`
- `openai-responses-chat`
- `perplexity-sonar-chat`
- `self-hosted-openai-compatible-chat`
- `together-chat`
- `xai-chat`

## Configured adapters

| Adapter | Default model | Env | Executable |
| --- | --- | --- | --- |
| `anthropic-messages-chat` | `claude-3-5-haiku-latest` | ANTHROPIC_API_KEY:missing | yes |
| `bfl-flux-image` | `flux-pro` | BFL_API_KEY:missing | no |
| `browser-svg-renderer` | `` | none | yes |
| `cloudflare-workers-ai-chat` | `` | CLOUDFLARE_ACCOUNT_ID:set, CLOUDFLARE_API_TOKEN:set, CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN:set, CLOUDFLARE_WORKERS_AI_TEXT_MODEL:set | yes |
| `cloudflare-workers-ai-image` | `` | CLOUDFLARE_ACCOUNT_ID:set, CLOUDFLARE_API_TOKEN:set, CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN:set, CLOUDFLARE_WORKERS_AI_IMAGE_MODEL:set | yes |
| `deepai-text2img-image` | `hd` | DEEPAI_API_KEY:set | yes |
| `deepseek-chat` | `deepseek-chat` | DEEPSEEK_API_KEY:missing | yes |
| `deterministic-customer-chat` | `` | none | yes |
| `fal-image` | `fal-ai/flux/schnell` | FAL_KEY:missing | no |
| `fireworks-chat` | `accounts/fireworks/models/llama-v3p1-8b-instruct` | FIREWORKS_API_KEY:missing | yes |
| `google-gemini-chat` | `gemini-1.5-flash` | GOOGLE_GENERATIVE_AI_API_KEY:missing | yes |
| `google-gemini-image` | `gemini-3.1-flash-image` | GOOGLE_GENERATIVE_AI_API_KEY:missing | yes |
| `groq-chat` | `llama-3.1-8b-instant` | GROQ_API_KEY:missing | yes |
| `huggingface-chat` | `meta-llama/Llama-3.2-3B-Instruct` | HUGGINGFACE_API_TOKEN:set | yes |
| `huggingface-image` | `black-forest-labs/FLUX.1-schnell` | HUGGINGFACE_API_TOKEN:set | no |
| `mistral-chat` | `mistral-small-latest` | MISTRAL_API_KEY:missing | yes |
| `openai-images` | `gpt-image-2` | OPENAI_API_KEY:missing | yes |
| `openai-responses-chat` | `gpt-4o-mini` | OPENAI_API_KEY:missing | yes |
| `perplexity-sonar-chat` | `sonar` | PERPLEXITY_API_KEY:missing | yes |
| `replicate-image` | `black-forest-labs/flux-schnell` | REPLICATE_API_TOKEN:missing | no |
| `self-hosted-openai-compatible-chat` | `local-default` | SELF_HOSTED_LLM_API_KEY:missing, SELF_HOSTED_LLM_BASE_URL:missing | yes |
| `stability-stable-image` | `stable-image-core` | STABILITY_API_KEY:missing | no |
| `together-chat` | `meta-llama/Llama-3.2-3B-Instruct-Turbo` | TOGETHER_API_KEY:missing | yes |
| `together-image` | `black-forest-labs/FLUX.1-schnell-Free` | TOGETHER_API_KEY:missing | no |
| `xai-chat` | `grok-3-mini` | XAI_API_KEY:missing | yes |
