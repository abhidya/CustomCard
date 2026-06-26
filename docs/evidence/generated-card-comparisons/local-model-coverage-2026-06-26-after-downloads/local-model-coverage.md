# Local Model Coverage

Created: 2026-06-26T00:25:32.964Z
Local model root: `D:\models`
ComfyUI model root: `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models`

## Summary

- Installed model/runtime files: 41
- Benchmark entries scanned: 227
- Local benchmark entries scanned: 3
- Evaluated text model ids: 9
- Evaluated image model ids: 12
- Locally evaluated text model ids: 2
- Locally evaluated image model ids: 1
- Installed files matched to local benchmark results: 2
- Recommended models installed: 10
- Recommended models locally evaluated: 2
- Recommended models missing: 0

## Recommended Coverage

| Model | Role | Installed | Local evaluated | Remote evaluated | Pull | Next action |
|---|---|---:|---:|---:|---|---|
| qwen3-4b-instruct | fast local card-copy planner | yes | yes | no | none | Keep as smoke-test planner; do not treat as quality champion. |
| gemma-4-31b-it | higher-quality local card-copy planner | yes | no | no | none | Run local benchmark through LM Studio or KoboldCPP and compare JSON adherence. |
| magistral-small-2509 | alternate local copy/planning family | yes | no | no | none | Run after Gemma to see if its prose improves card warmth without schema drift. |
| deepseek-v4-flash | heavyweight local planner candidate | yes | no | yes | none | Only benchmark if load time and memory are acceptable. |
| qwen3-vl-8b | local visual judge | yes | no | no | none | Wire into a visual QA pass for fake text, faces, clutter, and safe-zone violations. |
| bge-m3 | embedding and duplicate-clustering model | yes | no | no | none | Use for prompt/output retrieval and near-duplicate detection; not a card generator. |
| dreamshaper-8 | current local ComfyUI image baseline | yes | yes | no | none | Keep as baseline, but current live run shows it needs visual QA gates. |
| qwen3-8b-or-14b-instruct | missing mid-tier planner between 4B speed and 31B quality | yes | no | no | Qwen/Qwen3-8B-GGUF or Qwen/Qwen3-14B-GGUF, Q4_K_M | Pull one mid-tier Qwen if Gemma 31B is too slow for routine benchmark loops. |
| sdxl-base-or-card-checkpoint | production-oriented ComfyUI image comparison baseline | yes | no | no | SDXL base 1.0 or a rights-clean SDXL card/stationery checkpoint | Pull if DreamShaper keeps creating faces, fake text, or physical-card artifacts. |
| flux-schnell | higher-quality local ComfyUI image research candidate | yes | no | yes | ComfyUI-compatible FLUX.1 Schnell model stack | Optional after SDXL baseline; verify VRAM fit before making it benchmark-critical. |

## Evaluated Models

Local text:
- `fixture-specific-local-copy`
- `koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S`

Local image:
- `DreamShaper_8_pruned.safetensors`

All text, including remote providers:
- `[redacted]`
- `@cf/meta/llama-3.1-8b-instruct-fast`
- `deepseek-ai/DeepSeek-V4-Flash`
- `deterministic-support-copy`
- `fixture-specific-local-copy`
- `gpt-4o-mini`
- `koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S`
- `openai/gpt-oss-20b`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`

All image, including remote providers:
- `[redacted]`
- `@cf/black-forest-labs/flux-1-schnell`
- `@cf/bytedance/stable-diffusion-xl-lightning`
- `black-forest-labs/FLUX.1-schnell`
- `blackforestlabs/flux-2/dev/text-to-image`
- `deterministic-svg`
- `DreamShaper_8_pruned.safetensors`
- `hd`
- `Qwen/Qwen-Image`
- `Qwen/Qwen-Image-2512`
- `text2img`
- `Tongyi-MAI/Z-Image-Turbo`

## Pull Queue

No recommended models are missing.

## Installed Inventory

| Local benchmarked | Role | Size GB | File | Recommendation |
|---:|---|---:|---|---|
| no | embedding | 0.59 | `D:\models\bge-m3-q8_0.gguf` | Installed embedding model for retrieval/duplicate checks. |
| no | text-generation | 13.93 | `D:\models\DeepSeekV4-Flash-158B-Q4_K_M.gguf` | Installed heavyweight planner; benchmark only after load/memory test. |
| no | text-generation | 17.07 | `D:\models\gemma-4-31B-it-Q4_K_M.gguf` | Installed quality planner candidate; benchmark next. |
| no | image-generation-research | 4.34 | `D:\models\jayn7\Z-Image-Turbo-GGUF\z_image_turbo-Q4_K_S.gguf` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | text-generation | 3.99 | `D:\models\jjbRs\rs-imagen-models\josiefied-qwen3-4b-abliterated-v2-q8_0.gguf` |  |
| no | runtime | 0.58 | `D:\models\koboldcpp.exe` |  |
| no | text-to-speech | 0.18 | `D:\models\Kokoro_no_espeak_Q4.gguf` |  |
| no | text-generation | 16.44 | `D:\models\lmstudio-community\gemma-4-31B-it-QAT-GGUF\gemma-4-31B-it-QAT-Q4_0.gguf` | Installed quality planner candidate; benchmark next. |
| no | multimodal-projector | 1.12 | `D:\models\lmstudio-community\gemma-4-31B-it-QAT-GGUF\mmproj-gemma-4-31B-it-QAT-BF16.gguf` | Installed quality planner candidate; benchmark next. |
| no | text-generation | 13.35 | `D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf` | Installed alternate planner; benchmark after Gemma. |
| no | multimodal-projector | 0.82 | `D:\models\lmstudio-community\Magistral-Small-2509-GGUF\mmproj-Magistral-Small-2509-F16.gguf` | Installed alternate planner; benchmark after Gemma. |
| no | multimodal-projector | 1.48 | `D:\models\lmstudio-community\nemotron-3-nano-omni-30b-a3b-reasoning-gguf\mmproj-Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16.gguf` |  |
| no | vision-language | 22.83 | `D:\models\lmstudio-community\nemotron-3-nano-omni-30b-a3b-reasoning-gguf\Nemotron-3-Nano-Omni-30B-A3B-Reasoning-Q4_K_M.gguf` |  |
| no | multimodal-projector | 1.01 | `D:\models\lmstudio-community\Qwen3-VL-30B-A3B-Instruct-GGUF\mmproj-Qwen3-VL-30B-A3B-Instruct-F16.gguf` | Installed high-quality visual judge candidate; likely slower. |
| no | vision-language | 17.28 | `D:\models\lmstudio-community\Qwen3-VL-30B-A3B-Instruct-GGUF\Qwen3-VL-30B-A3B-Instruct-Q4_K_M.gguf` | Installed high-quality visual judge candidate; likely slower. |
| no | multimodal-projector | 1.08 | `D:\models\lmstudio-community\Qwen3-VL-8B-Instruct-GGUF\mmproj-Qwen3-VL-8B-Instruct-F16.gguf` | Installed visual judge candidate; not yet wired into benchmark scoring. |
| no | vision-language | 4.68 | `D:\models\lmstudio-community\Qwen3-VL-8B-Instruct-GGUF\Qwen3-VL-8B-Instruct-Q4_K_M.gguf` | Installed visual judge candidate; not yet wired into benchmark scoring. |
| no | image-generation-research | 3.99 | `D:\models\LuffyTheFox\Qwen3-Uncensored-TextEncoders-FLUX-Klein-Z-Image-Turbo-GGUF\Qwen3-4b-Uncensored-Z-Image-Engineer-V4-Q8_0.gguf` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | multimodal-projector | 0.7 | `D:\models\mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf` | Installed visual judge candidate; not yet wired into benchmark scoring. |
| no | text-generation | 12.16 | `D:\models\Novice25\Qwen-Image-Edit-Rapid-AIO-GGUF\Qwen-Rapid-AIO-NSFW-v11.1_Q4_K_M.gguf` |  |
| no | text-generation | 4.68 | `D:\models\Qwen\Qwen3-8B-GGUF\Qwen3-8B-Q4_K_M.gguf` |  |
| yes | text-generation | 2.22 | `D:\models\Qwen3-4B-Instruct-2507-Q4_K_S.gguf` | Evaluated smoke planner; useful for fast local loop checks. |
| no | vision-language | 4.68 | `D:\models\Qwen3VL-8B-Instruct-Q4_K_M.gguf` | Installed visual judge candidate; not yet wired into benchmark scoring. |
| no | image-generation-research | 11.56 | `D:\models\unsloth\Qwen-Image-Edit-2511-GGUF\qwen-image-edit-2511-Q4_K_S.gguf` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | speech-to-text | 0.06 | `D:\models\whisper-base.en-q5_1.bin` |  |
| no | image-generation-research | 3.43 | `D:\models\z_image_turbo-Q4_0.gguf` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| yes | image-generation-checkpoint | 1.99 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\checkpoints\DreamShaper_8_pruned.safetensors` | Evaluated local image baseline; keep but gate fake text/faces. |
| no | image-generation-checkpoint | 16.05 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\checkpoints\flux1-schnell-fp8.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-generation-checkpoint | 6.46 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\checkpoints\sd_xl_base_1.0.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-generation-checkpoint | 6.46 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\checkpoints\sd_xl_turbo_1.0_fp16.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-generation-research | 7.22 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\diffusion_models\flux-2-klein-4b.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-generation-research | 13.31 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\diffusion_models\wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-generation-research | 13.31 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\diffusion_models\wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-generation-research | 11.46 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\diffusion_models\z_image_turbo_bf16.safetensors` | Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion. |
| no | image-lora | 0.37 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\loras\sdxl_lightning_4step_lora.safetensors` |  |
| no | image-lora | 0.57 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\loras\Wan2.2-Lightning_I2V-A14B-4steps-lora_HIGH_fp16.safetensors` |  |
| no | image-lora | 0.57 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\loras\Wan2.2-Lightning_I2V-A14B-4steps-lora_LOW_fp16.safetensors` |  |
| no | image-text-encoder | 7.49 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\text_encoders\qwen_3_4b.safetensors` |  |
| no | image-text-encoder | 6.27 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\text_encoders\umt5_xxl_fp8_e4m3fn_scaled.safetensors` |  |
| no | image-vae | 0.31 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\vae\ae.safetensors` |  |
| no | image-vae | 0.24 | `D:\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models\vae\wan_2.1_vae.safetensors` |  |
