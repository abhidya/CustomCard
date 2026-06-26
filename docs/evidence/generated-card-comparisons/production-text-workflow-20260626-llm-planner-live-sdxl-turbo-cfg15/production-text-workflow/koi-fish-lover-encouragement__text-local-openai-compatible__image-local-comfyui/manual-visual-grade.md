# Manual Visual Grade: koi-fish-lover-encouragement

- Text: Local KoboldCPP Qwen3-4B (`koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S`)
- Image: Local ComfyUI checkpoint (`sd_xl_turbo_1.0_fp16.safetensors`)
- Strategy: llm-planned-copy-comfy-deterministic-text
- Product quality score: 0/100
- Prompt/pipeline contract score: 15/100
- Status: failed
- Production recommendation: do-not-promote

## Notes

This run failed before image generation. The local planner response stopped at
the `2200` token completion cap with `finish_reason: length`, then JSON parsing
failed with `Expected ',' or '}' after property value in JSON at position 5353`.

The failure is useful production evidence: the live matrix can now reach the
local LLM and Comfy runtime, but Qwen3-4B is not yet reliable enough for the full
card planning contract under the current prompt and token budget.
