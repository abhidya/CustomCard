# Pricing Table

| Provider/model | Current source used | Benchmark estimate | Notes |
| --- | --- | --- | --- |
| Cloudflare Workers AI text/images | [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) | Flux estimate about $0.001/image or $0.004/4-panel card from 512-tile + step formula; text priced by model/Neurons. | Run hit 429s, so production needs rate/backoff. |
| DeepAI HD | [DeepAI pricing](https://deepai.org/pricing), [DeepAI text2img docs](https://deepai.org/docs) | $0.01/HD image; $0.04/4-panel card. | Pro includes monthly HD allowance; HD wired with 832x1216 request. |
| Hugging Face text router | [HF Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing) | Exact per-run text cost not in local response metadata; HF passes through provider pricing with no markup. | Pin/record routed provider before exact cost ranking. |
| OpenAI image | [OpenAI API pricing](https://openai.com/api/pricing/) | Not executable locally: OPENAI_API_KEY missing. | Generator supports openai-images. |
| Gemini image | [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) | Not executable locally: GOOGLE_GENERATIVE_AI_API_KEY missing. | Generator supports google-gemini-image. |
| Together image/text reference | [Together pricing](https://www.together.ai/pricing) | Not executable locally for image: TOGETHER_API_KEY missing and image adapter not implemented. | Useful pricing reference for Qwen/FLUX if routed through Together later. |
