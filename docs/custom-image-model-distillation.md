# CustomCard Local Model Improvement And Distillation Design

## Goal

Run the card-generation improvement loop without model network calls:

1. Generate four-panel card copy and image prompts with a local OpenAI-compatible LLM server.
2. Render image candidates with local ComfyUI.
3. Render exact typography deterministically. The benchmark fallback may use the
   app renderer, but the production Comfy path should use deterministic Comfy
   text nodes rather than asking the image model to draw copy.
4. Score every candidate against deterministic gates, optional local visual judges, and human review.
5. Promote prompt templates, ComfyUI workflows, LoRAs, or checkpoints only when aggregate rankings improve without fixture regressions.

## Local Runtime Stack

Required local services:

- LM Studio or KoboldCPP exposing an OpenAI-compatible localhost API for `card-copy`.
- ComfyUI exposing `http://127.0.0.1:8188` for `card-image`.
- Node benchmark scripts in this repo for orchestration, artifact capture, and rankings.

Implemented repo routes:

- Text adapter: `local-openai-compatible-chat`
- Image adapter: `local-comfyui-api-image`
- Local benchmark script: `npm run card:benchmark:local`
- Aggregate rankings: `npm run card:benchmark:aggregate`

The local benchmark phase enables a localhost-only network guard. Provider calls to remote origins fail before the request is made.

Local model root on this workstation:

- `D:\models\`
- KoboldCPP binary: `D:\models\koboldcpp.exe`
- LM Studio community downloads: `D:\models\lmstudio-community\`

Use LM Studio when testing structured JSON behavior. Use KoboldCPP when a single GGUF file needs to be served directly with a small runtime surface.

## Model Requirements

### Copy And Prompt Planner

Use one local instruction model with strong JSON obedience. The card-copy contract is harder than casual chat because it must produce exactly four panels, layout metadata, safe image prompts, and negative prompts.

Installed candidates, in suggested benchmark order:

- `D:\models\Qwen3-4B-Instruct-2507-Q4_K_S.gguf` for fast schema and prompt-loop iteration.
- `D:\models\gemma-4-31B-it-Q4_K_M.gguf` or `D:\models\lmstudio-community\gemma-4-31B-it-QAT-GGUF\gemma-4-31B-it-QAT-Q4_0.gguf` for higher-quality copy comparison.
- `D:\models\lmstudio-community\Magistral-Small-2509-GGUF\Magistral-Small-2509-Q4_K_M.gguf` as a second-family long-form/copywriting comparison.
- `D:\models\DeepSeekV4-Flash-158B-Q4_K_M.gguf` only if local runtime and memory tests show it is practical for repeated benchmark runs.

LM Studio is preferred for schema/JSON experiments because it exposes OpenAI-compatible endpoints and structured-output support. KoboldCPP is useful for lightweight GGUF serving; keep JSON enforcement in prompt/post-parse repair if the server does not support JSON schema.

### Image Renderer

Current installed baseline:

- `DreamShaper_8_pruned.safetensors`

Checked-in Comfy workflow pack:

- `comfyui-workflows/customcard-sdxl-checkpoint.json` for SDXL base and SDXL Turbo checkpoint benchmarking.
- `comfyui-workflows/customcard-sdxl-lightning-lora.json` for SDXL Lightning over SDXL base.
- `comfyui-workflows/customcard-z-image-turbo.json` for the Z-Image Turbo research branch.
- `comfyui-workflows/customcard-flux2-klein-4b.json` for the permissive FLUX.2 Klein 4B quality target on 16GB+ GPU or a cloud ComfyUI runner.
- `comfyui-workflows/customcard-flux1-schnell.json` for the gated but Apache-2.0 FLUX.1 Schnell target after accepting Hugging Face terms.
- `comfyui-workflows/customcard-qwen-image-research.json` for Qwen Image prompt-adherence research only. Qwen Image Edit 2511 assets are optional in the setup manifest, but edit workflows stay manual/cloud until the product worker has a source-image edit input contract.

Model hydration:

- Run `npm run comfy:models:setup` to place the practical SDXL, Z-Image, and FLUX.2 Klein split files under the ComfyUI `models/` folder.
- Run `npm run comfy:models:setup -- --include-qwen` only when staging the research branch on a machine that can handle Qwen Image and Qwen Image Edit assets.
- Run `npm run comfy:models:setup -- --include-gated` only after accepting the FLUX.1 Schnell terms and setting `HF_TOKEN`.

Use the image model only for background/stationery composition. CustomCard must
render exact text through deterministic typography, either in the benchmark
renderer or inside Comfy with a text compositor node. Models with strong text
rendering are not promoted for body-copy typography alone.

Production text workflow tracking:

- Research and decision record:
  `docs/comfyui-production-text-workflow.md`
- Benchmark fallback workflow:
  `comfyui-workflows/customcard-hybrid-reserved-layout.json`
- Production Comfy-side text candidate:
  `comfyui-workflows/customcard-production-text-overlay.json`
- Production Comfy custom text node:
  `comfyui-custom-nodes/CustomCardTextComposer`
- Production preflight:
  `scripts/comfyui-production-text-preflight.mjs`
- Production benchmark wrapper:
  `tools/run-production-text-benchmark.ps1`
- Live node/preflight evidence:
  `docs/evidence/generated-card-comparisons/production-text-preflight-20260626-live-node`
- Live benchmark evidence:
  `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-live-node`
- Production-text aggregate:
  `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-candidates`
- Current production-text recommendation:
  keep the Comfy-side deterministic text composer with soft text-hug safe-field
  backgrounds and broader deterministic artwork guards, but do not promote yet.
  The best local candidate is SDXL Turbo CFG 1.5 with rounded text-hug fields
  and artwork guards at 72/100, still blocked because the art layer needs a
  heavy front guard, over-softens the interiors, and fails the sparse back-mark
  contract.

Installed research candidates under `D:\models\`:

- `D:\models\z_image_turbo-Q4_0.gguf`
- `D:\models\jayn7\Z-Image-Turbo-GGUF\z_image_turbo-Q4_K_S.gguf`
- `D:\models\unsloth\Qwen-Image-Edit-2511-GGUF\qwen-image-edit-2511-Q4_K_S.gguf`

Keep GGUF image candidates as research candidates until there is a checked-in ComfyUI workflow that can load them repeatably through the product benchmark loop. The production path should stay on ComfyUI checkpoints, LoRAs, split-file diffusion models, and workflow JSON that are already available through the local ComfyUI install.

### Local Visual Judge

Optional, not required for the first local-only loop:

- `D:\models\Qwen3VL-8B-Instruct-Q4_K_M.gguf` plus `D:\models\mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf` for local image critique.
- `D:\models\lmstudio-community\Qwen3-VL-8B-Instruct-GGUF\Qwen3-VL-8B-Instruct-Q4_K_M.gguf` plus its `mmproj` for the LM Studio route.
- `D:\models\lmstudio-community\Qwen3-VL-30B-A3B-Instruct-GGUF\Qwen3-VL-30B-A3B-Instruct-Q4_K_M.gguf` only if latency is acceptable.
- `D:\models\bge-m3-q8_0.gguf` for text embedding, retrieval, duplicate clustering, and benchmark search.
- OCR for text-leak detection in generated artwork layers.

Local visual quality gate:

- Safe default backend: isolated local OpenAI-compatible vision server such as KoboldCPP or LM Studio.
- Automated default: `npm run card:quality:auto -- --server koboldcpp --input <benchmark-output-dir> --advisory`. This starts a dedicated KoboldCPP vision reviewer on port `5002` when needed, waits for `/v1/models` to report the Qwen3VL model, then runs the local gate.
- Experimental Comfy backend: workflow `comfyui-workflows/customcard-local-visual-quality-gate.json` using `AILab_QwenVL_GGUF_Advanced`.
- Current test status on this hardware: JSON/workflow validation and artifact discovery dry run pass, but real Comfy QwenVL review attempts with Qwen3VL 8B GPU and Qwen3VL 4B GGUF reset/crashed the local ComfyUI server. Do not use the Comfy reviewer as a blocking gate on this box until a stable smaller reviewer or separate reviewer runtime is verified.
- KoboldCPP reviewer target on this workstation: `D:\models\Qwen3VL-8B-Instruct-Q4_K_M.gguf` plus `D:\models\mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf`.
- LM Studio path: LM Studio must already be running, the Local Server must be enabled, and the vision model must be loaded into memory before the gate can call it. `card:quality:auto -- --server lmstudio` now preflights `/v1/models` and fails with the loaded model ids when that is not true.
- Run after local model benchmarks with `npm run card:quality:local -- --input <benchmark-output-dir>`.
- The gate grades `contact-sheet.png` or `preview-*.png` artifacts for print readiness, overlay readability, fake text/logos, safe margins, composition, and theme coherence.
- It exits nonzero when any reviewed run blocks unless `--advisory` is passed.
- Calibrate it with human grades before using it for production promotion decisions.

## Improvement Loop

1. Build a candidate matrix:
   - text model
   - prompt profile
   - Comfy checkpoint
   - LoRA set
   - workflow id
   - sampler, steps, CFG, seed strategy
   - typography overlay strategy

2. Run fixtures:
   - small business thank-you
   - medical graduation
   - dad repair card
   - botanical birthday
   - sympathy/quiet support
   - B2B CTA card

3. Record artifacts:
   - request JSON
   - effective prompts
   - provider HTTP log
   - Comfy workflow JSON
   - provider image
   - app-composited preview
   - contact sheet
   - deterministic QA scorecard
   - optional visual-judge score
   - human grade

4. Aggregate and rank:
   - pass/fail
   - score
   - manual visual grade when present
   - critical failures
   - provider/model/workflow hashes
   - cost or GPU seconds
   - latency
   - fixture regressions

5. Promote only if:
   - no critical failures
   - aggregate score beats current champion
   - no fixture drops below its pass score
   - human review approves taste and print readiness
   - for production text workflows, the aggregate score includes a passing
     manual or local-vision visual grade, not only structural auto-checks

## Aggregate Schema

Every run should eventually record:

- `run_id`
- `created_at`
- `git_commit`
- `git_dirty`
- `benchmark_suite_version`
- `fixture_id`
- `request_hash`
- `text_adapter_id`
- `text_model`
- `image_adapter_id`
- `image_model`
- `checkpoint_hash`
- `lora_hashes`
- `workflow_hash`
- `prompt_profile_id`
- `prompt_hash`
- `negative_prompt_hash`
- `sampler`
- `scheduler`
- `steps`
- `cfg`
- `seed`
- `dimensions`
- `panel_id`
- `artifact_hash`
- `score`
- `critical_failures`
- `human_score`
- `vision_judge_score`
- `ocr_text_leak_score`
- `safe_zone_score`
- `duration_ms`
- `gpu_seconds`
- `vram_peak`

## Custom Model Strategy

Start with LoRAs. Do not train separate full checkpoints until there is clear benchmark evidence.

Recommended progression:

1. Prompt/template improvement.
2. Workflow improvement with masks/control layouts.
3. Category LoRAs:
   - botanical stationery
   - medical graduation
   - workshop/tools
   - sympathy/quiet support
   - small-business editorial
4. Layout LoRAs:
   - front cover hero
   - interior quiet field
   - back cover mark
5. Optional merged checkpoint only after LoRAs stabilize.
6. Optional distilled base model only after hundreds or thousands of high-scoring, rights-clean examples exist.

Separate full models per page do not make sense initially. Use one shared image model plus panel conditioning:

- `panel_id=front`
- `panel_id=inside-left`
- `panel_id=inside-right`
- `panel_id=back`
- layout mask/control image
- optional panel-role LoRA

This keeps the dataset bigger, reduces deployment complexity, and lets the benchmark compare panel-specific behavior without multiplying model maintenance.

## Dataset Policy

Use only rights-clean training examples:

- generated outputs you own and choose to keep
- app-rendered previews
- public-domain or licensed stationery references
- synthetic layout masks
- human grade metadata

Exclude:

- competitor card art
- customer-private notes unless explicitly approved for training
- images with readable generated text artifacts
- failed outputs except as negative examples for classifiers

## Production Promotion

Promotion should be a registry update, not an ad hoc file swap.

Champion record:

- model id
- checkpoint path
- checkpoint hash
- LoRA paths and hashes
- workflow hash
- prompt profile id
- benchmark aggregate id
- human approval id
- rollback target

Rollback is mandatory: if a newly promoted model regresses live QA or operator review, route back to the prior champion immediately.
