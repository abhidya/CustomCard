# Manual Visual Grade: aquarium-lover-birthday

- Text: Local KoboldCPP Qwen3-4B (`koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S`)
- Image: Local ComfyUI checkpoint (`sd_xl_turbo_1.0_fp16.safetensors`)
- Strategy: llm-planned-copy-comfy-deterministic-text
- Contact sheet: [open](./contact-sheet.png)
- Product quality score: 38/100
- Prompt/pipeline contract score: 72/100
- Status: blocked
- Production recommendation: do-not-promote

## Rubric

- Prompt adherence and panel contract: 3/15
- Occasion and user-story fit: 4/15
- Copy quality and emotional calibration: 8/15
- Visual composition and print readiness: 9/15
- Theme coherence across panels: 5/10
- Text/name fidelity strategy: 2/10
- Domain/cultural sensitivity: 8/10
- Commercial usefulness: 1/5
- Originality and taste: 4/5

## Notes

The production text architecture works: four panels rendered, exact generated
copy reached `CustomCardTextComposer`, and the old preview overlay was bypassed.

This is not a passing customer card. The request was for Nina, who loves
freshwater aquariums, but the result became botanical birthday stationery with
green trails, coffee, flowers, and no aquarium-specific concept. The auto-check
correctly flags missing `Nina` and `aquarium`. The back panel is also too dark
and includes visible copy, so it fails the sparse back-cover discipline.
