# CustomCard ComfyUI Workflows

These files are API-format ComfyUI prompt graphs for `local-comfyui-api-image`.
Set `CUSTOMCARD_COMFYUI_WORKFLOW_PATH` to one of these JSON files before running
the local worker or benchmark loop.

## Local SDXL Candidates

- `customcard-production-text-overlay.json`
  - Production candidate for Comfy-side deterministic text compositing.
  - Requires the checked-in `CustomCardTextComposer` node from `comfyui-custom-nodes/CustomCardTextComposer`.
  - The diffusion model still generates artwork only; exact card copy, deterministic soft text-hug safe fields, and broader artwork guards are rendered before `SaveImage`.
  - Live local evidence on 2026-06-26 proves the text-composer path works. The best artwork-guard candidate is improved but still blocked for visual quality. Do not make this the production default until a manual/local-vision grade passes.
- `customcard-hybrid-reserved-layout.json`
  - Production-leaning benchmark workflow for four greeting-card panels.
  - The image model generates coordinated, text-safe artwork only; the model benchmark flattens exact greeting-card copy into the final `preview-*.png` panels with deterministic typography.
  - Recommended with `--phase local-typography --typography-mode mode-c-hybrid-reserved-layout`.
- `customcard-sdxl-checkpoint.json`
  - SDXL base: `CUSTOMCARD_COMFYUI_CHECKPOINT=sd_xl_base_1.0.safetensors`
  - SDXL Turbo: `CUSTOMCARD_COMFYUI_CHECKPOINT=sd_xl_turbo_1.0_fp16.safetensors`
- `customcard-sdxl-lightning-lora.json`
  - `CUSTOMCARD_COMFYUI_CHECKPOINT=sd_xl_base_1.0.safetensors`
  - Uses `sdxl_lightning_4step_lora.safetensors`.

Suggested benchmark settings:

- SDXL base: `CUSTOMCARD_COMFYUI_STEPS=25`, `CUSTOMCARD_COMFYUI_CFG=6`, `CUSTOMCARD_COMFYUI_SAMPLER=dpmpp_2m`, `CUSTOMCARD_COMFYUI_SCHEDULER=karras`
- SDXL Turbo: `CUSTOMCARD_COMFYUI_STEPS=2`, `CUSTOMCARD_COMFYUI_CFG=0`, `CUSTOMCARD_COMFYUI_SAMPLER=euler_ancestral`, `CUSTOMCARD_COMFYUI_SCHEDULER=sgm_uniform`
- SDXL Lightning LoRA: `CUSTOMCARD_COMFYUI_STEPS=4`, `CUSTOMCARD_COMFYUI_CFG=1`, `CUSTOMCARD_COMFYUI_SAMPLER=euler`, `CUSTOMCARD_COMFYUI_SCHEDULER=sgm_uniform`

## Permissive Quality Targets

- `customcard-flux1-schnell.json`
  - Gated Hugging Face download even though the model license is Apache 2.0.
  - Best benchmarked on 16GB+ VRAM or a cloud ComfyUI runner.
- `customcard-flux2-klein-4b.json`
  - Uses `flux-2-klein-4b.safetensors`, `qwen_3_4b.safetensors`, and `flux2-vae.safetensors`.
  - Best benchmarked on 16GB+ VRAM or a cloud ComfyUI runner.

Suggested FLUX settings:

- FLUX.1 Schnell: `CUSTOMCARD_COMFYUI_STEPS=4`, `CUSTOMCARD_COMFYUI_CFG=1`, `CUSTOMCARD_COMFYUI_SAMPLER=euler`, `CUSTOMCARD_COMFYUI_SCHEDULER=simple`
- FLUX.2 Klein 4B: `CUSTOMCARD_COMFYUI_STEPS=4`, `CUSTOMCARD_COMFYUI_CFG=1`, `CUSTOMCARD_COMFYUI_SAMPLER=euler`

## Research Branch

- `customcard-z-image-turbo.json`
  - Uses the already-present Comfy split files `z_image_turbo_bf16.safetensors`, `qwen_3_4b.safetensors`, and `ae.safetensors`.
  - Suggested settings: `CUSTOMCARD_COMFYUI_STEPS=8`, `CUSTOMCARD_COMFYUI_CFG=1`, `CUSTOMCARD_COMFYUI_SAMPLER=res_multistep`, `CUSTOMCARD_COMFYUI_SCHEDULER=simple`
- `customcard-qwen-image-research.json`
  - Uses Qwen Image distilled fp8 split files.
  - Keep this out of the production path. Our product overlays text outside the image model, so Qwen is only for prompt adherence/editing research.
  - Suggested settings: `CUSTOMCARD_COMFYUI_STEPS=15`, `CUSTOMCARD_COMFYUI_CFG=1`, `CUSTOMCARD_COMFYUI_SAMPLER=euler`, `CUSTOMCARD_COMFYUI_SCHEDULER=simple`
- Qwen Image Edit 2511
  - `npm run comfy:models:setup -- --include-qwen` also includes optional edit-model assets.
  - Use the official Comfy Qwen Image Edit template for manual/cloud edit tests because the current product worker graph does not pass source images into ComfyUI.

## Setup

Hydrate practical local/quality assets:

```powershell
npm run comfy:models:setup
```

Optional research-heavy Qwen files:

```powershell
npm run comfy:models:setup -- --include-qwen
```

Optional gated FLUX.1 Schnell files after accepting the Hugging Face terms:

```powershell
$env:HF_TOKEN = "hf_..."
npm run comfy:models:setup -- --include-gated
```

## Local Typography Benchmark

```powershell
$env:CUSTOMCARD_COMFYUI_URL = "http://127.0.0.1:8188"
$env:CUSTOMCARD_COMFYUI_WORKFLOW_PATH = "comfyui-workflows/customcard-hybrid-reserved-layout.json"
$env:CUSTOMCARD_COMFYUI_WORKFLOW_ID = "customcard-hybrid-reserved-layout"
$env:CUSTOMCARD_COMFYUI_IMAGE_WIDTH = "960"
$env:CUSTOMCARD_COMFYUI_IMAGE_HEIGHT = "1344"
npm run card:benchmark:local -- --phase local-typography --phase-dir local-typography-hybrid --output-dir docs/evidence/generated-card-comparisons/local-typography-hybrid
```

Agents can avoid PowerShell quoting issues by using the tracked helper:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-local-typography-benchmark.ps1
```

## Production Text Overlay Candidate

The production candidate keeps deterministic text inside Comfy instead of the
benchmark preview compositor:

```powershell
$env:CUSTOMCARD_COMFYUI_WORKFLOW_PATH = "comfyui-workflows/customcard-production-text-overlay.json"
$env:CUSTOMCARD_COMFYUI_WORKFLOW_ID = "customcard-production-text-overlay"
$env:CUSTOMCARD_COMFYUI_IMAGE_WIDTH = "960"
$env:CUSTOMCARD_COMFYUI_IMAGE_HEIGHT = "1344"
```

Prerequisites:

- Link the checked-in text composer into the ComfyUI `custom_nodes` directory:

  ```powershell
  rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/install-comfy-customcard-text-node.ps1 -ComfyRoot C:\path\to\ComfyUI
  ```

- Restart ComfyUI after installation.
- Pin production font file names to match the adapter variables
  (`georgia.ttf`, `arial.ttf`, `arialbd.ttf`) or update
  `localComfyFontForPairing` in `scripts/local-comfy-production-text.mjs`.
- Confirm `http://127.0.0.1:8188/object_info` contains
  `CustomCardTextComposer`, the soft safe-field inputs
  (`*_box_background_style`, `*_box_background_radius`,
  `*_box_background_opacity`), and the artwork-guard inputs
  (`artwork_guard_*`) before running the production workflow.

See `docs/comfyui-production-text-workflow.md` for research, production gates,
and the remaining QA work.

Preflight without requiring a live Comfy server:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs
```

Promotion preflight, which fails if Comfy is not reachable or the node is not
loaded:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true
```

Readiness doctor before collecting promotion evidence:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory
```

The doctor checks the production workflow, live Comfy node, latest aggregate,
local model inventory, and planner endpoint suitability. It should stay blocked
when the only reachable planner is a Qwen3-4B smoke model.

Planner runtime preflight:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5003/v1 --model koboldcpp/gemma-4-31B-it-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200
```

This checks the planner model class, output cap, and intended context budget.
Production evidence keeps the full creative contract and requires a
production-suitable planner. Qwen3-4B/4096-context runs are smoke/failure
evidence only.

Evidence index before deciding the next run:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current
```

The index scans tracked production-text readiness, preflight, benchmark,
aggregate, and manual-grade evidence. Pass `--include-untracked` only for local
scratch review.

Promotion gate before defaulting the workflow:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current --index-output-dir docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current
```

The gate is the final pass/fail contract for production-text promotion. It is
expected to stay blocked until the planner endpoint, LLM-planned matrix, term
adherence, and manual aggregate requirements all pass.

Run a full-card benchmark through the production workflow:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1
```

The `local-production-text` phase benchmarks fixed customer request inputs when
a local LLM and local ComfyUI are configured: aquarium lover birthday, koi fish
lover encouragement, and dog lover thank-you. The LLM decides the final theme,
copy, layout, and per-panel artwork prompts; Comfy renders the exact generated
copy with `CustomCardTextComposer`. The helper fails fast when no local LLM is
configured so agents do not accidentally benchmark only the structural fixture.
For live runs, it auto-starts the default Gemma 31B planner on port `5003` when
no planner URL is configured and the local model files exist. You can also pass
either a root URL such as `http://127.0.0.1:5003` or a `/v1` URL such as
`http://127.0.0.1:5003/v1` as `-LocalLlmBaseUrl`, plus `-LocalLlmModel`, for a
GPU/offloaded or hosted/self-hosted endpoint. Use `-DryRun` to inspect the
planned matrix without requiring a live text server. The helper rejects known
small planners such as Qwen3-4B for production evidence because they miss
customer terms and can truncate the full card-copy contract; pass
`-AllowSmallPlanner` only for exploratory failure evidence. To start the
installed local quality planner explicitly:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -Port 5003 -ContextSize 8192
```

Then run with `-LocalLlmBaseUrl http://127.0.0.1:5003/v1 -LocalLlmModel
koboldcpp/gemma-4-31B-it-Q4_K_M`. On this CPU-only attempt Gemma 31B loaded
successfully but did not finish the first planner response in a practical
benchmark window, so use a GPU/offloaded runtime or a hosted/self-hosted larger
planner for promotion evidence. Pass
`-AllowCompositorFixtureFallback` only when intentionally testing the single
sunburst compositor calibration fixture. By default the helper writes to a
timestamped
`docs/evidence/generated-card-comparisons/production-text-workflow-YYYYMMDD-HHMMSS`
directory. Pass `-OutputDir` only when you intentionally want a stable evidence
path.

Checkpoint comparison example:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl http://127.0.0.1:5003/v1 -LocalLlmModel koboldcpp/gemma-4-31B-it-Q4_K_M -Checkpoint sd_xl_turbo_1.0_fp16.safetensors -Steps 2 -Cfg 1.5 -Sampler euler_ancestral -Scheduler sgm_uniform -PlannerMaxTokens 3200 -PlannerContextSize 8192
```

This helper uses the benchmark `local-production-text` phase rather than
`local-typography`, because the full card-generation path is what lets the LLM
decide `card_copy`, then passes `panel_copy` and text safe-box variables into
`scripts/ai-card-generator.mjs`.

Latest live evidence:

- Preflight: `docs/evidence/generated-card-comparisons/production-text-preflight-20260626-live-node`
- Benchmark: `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-live-node`
- Aggregate: `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text`
- Candidate aggregate: `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-candidates`
- Soft-field benchmark: `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-soft-fields`
- Artwork-guard preflight: `docs/evidence/generated-card-comparisons/production-text-preflight-20260626-artwork-guard`
- Artwork-guard benchmark: `docs/evidence/generated-card-comparisons/production-text-workflow-20260626-sdxl-turbo-cfg15-artwork-guard-v2`
- Best current manual visual grade: 72/100, blocked, do not promote yet.
- Live LLM-planned matrix aggregate:
  `docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-rankings.md`
  - Best customer-request score: 38/100, blocked.
  - Main blocker: local Qwen3-4B planner misses customer themes/must-include
    terms and can emit truncated invalid JSON. Current code now passes
    `must_include`/`must_avoid` into the planner, retries invalid or incomplete
    card-copy output before Comfy, and refuses Qwen3-4B for production evidence
    unless `-AllowSmallPlanner` is explicit.
- Current readiness doctor:
  `docs/evidence/generated-card-comparisons/production-text-readiness-20260626-current`
  - ComfyUI and `CustomCardTextComposer` are live.
  - Higher-quality local planner files exist, but no production-suitable
    planner endpoint is reachable/configured yet.
- Current evidence index:
  `docs/evidence/generated-card-comparisons/production-text-evidence-index-20260626-current`
  - Tracks the current production-text evidence set and keeps promotion blocked
    until the planner endpoint and aggregate evidence pass.
- Current promotion gate:
  `docs/evidence/generated-card-comparisons/production-text-promotion-gate-20260626-current`
  - Passes live Comfy/text-composer proof and final-Comfy-image evidence.
  - Fails the planner, matrix completion, must-include, and manual aggregate
    requirements, so production promotion remains blocked.

## Local Visual Quality Gate

Use `customcard-local-visual-quality-gate.json` after a benchmark run to experiment
with reviewing output through a local Qwen-VL model inside ComfyUI. The gate reads
benchmark `contact-sheet.png` or `preview-*.png` artifacts and writes
JSON/Markdown pass/fail evidence.

Current test status on this 1080 Ti ComfyUI box:

- JSON/workflow validation: passes.
- Artifact discovery dry run: passes.
- Real Comfy QwenVL review: not stable yet. Qwen3VL 8B GPU and Qwen3VL 4B GGUF reviewer attempts reset/crashed the local ComfyUI server.
- Use the Comfy backend as experimental until a smaller reviewer model or separate reviewer server is stable.

Automated reviewer path:

```powershell
npm run card:quality:auto -- --server koboldcpp --input docs/evidence/generated-card-comparisons/local-all-YYYYMMDD-HHMMSS --advisory
```

This starts a dedicated KoboldCPP vision reviewer on port `5002` when needed,
waits until `/v1/models` reports the Qwen3VL model loaded, then runs
`card:quality:local`. It intentionally avoids port `5001` because that port is
often used by the local text-model KoboldCPP server.
Add `--preflight-only --stop-after` for a load/unload smoke test without scoring
images.

```powershell
$env:CUSTOMCARD_LOCAL_QUALITY_BACKEND = "comfy"
$env:CUSTOMCARD_COMFYUI_URL = "http://127.0.0.1:8188"
$env:CUSTOMCARD_COMFYUI_REVIEW_MODEL = "Qwen3VL-4B-Instruct-Q4_K_M.gguf"
npm run card:quality:local -- --input docs/evidence/generated-card-comparisons/local-all-YYYYMMDD-HHMMSS
```

Use `--advisory` while tuning if you want a report without a nonzero exit code.
The script default is `--backend openai` so the reviewer can run in an isolated
OpenAI-compatible local vision server such as KoboldCPP or LM Studio without
taking down ComfyUI image generation. Use `--backend comfy` only when testing
this workflow path, ideally against a separate review-only ComfyUI instance.
The checked-in Comfy reviewer workflow pins GGUF inference to CPU (`gpu_layers=0`)
because Qwen3VL 4B/8B GPU inference can destabilize this 1080 Ti Comfy process.
Use Qwen3VL 8B only on a reviewer box where it does not destabilize ComfyUI.

KoboldCPP/OpenAI-compatible review example:

```powershell
$env:CUSTOMCARD_LOCAL_QUALITY_BACKEND = "openai"
$env:CUSTOMCARD_LOCAL_VISION_BASE_URL = "http://127.0.0.1:5002/v1"
$env:CUSTOMCARD_LOCAL_VISION_MODEL = "Qwen3VL-8B-Instruct-Q4_K_M.gguf"
npm run card:quality:local -- --input docs/evidence/generated-card-comparisons/local-all-YYYYMMDD-HHMMSS --advisory
```

That assumes KoboldCPP is already running with the vision GGUF and matching
multimodal projector loaded, and that its OpenAI-compatible vision endpoint is
enabled.

LM Studio review example:

```powershell
npm run card:quality:auto -- --server lmstudio --model Qwen3VL-4B-Instruct-Q4_K_M.gguf --input docs/evidence/generated-card-comparisons/local-all-YYYYMMDD-HHMMSS --advisory
```

LM Studio must already be running, the Local Server must be enabled, and the
vision model must be loaded into memory. The automation preflights `/v1/models`
and fails fast with the loaded model ids if that is not true.
