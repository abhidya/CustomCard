# Website Asset Generation Runbook

## Goal

Generate a first useful batch of assets for CustomCard:

- Marketing hero and handoff images
- Distinct theme inventory card backgrounds
- Finished public proof examples
- Source frames for a future card-morphing video

The batch manifest is `docs/website-asset-generation-batch.json`.

## Generator Split

Use built-in image generation for:

- One-off photoreal marketing shots
- Website hero concepts
- Product desk scenes
- Small visual explorations

Use ComfyUI for:

- Bulk card background inventory
- Repeatable theme variants
- Benchmarkable card panels
- Production text-overlay experiments

Use CustomCard rendering after image generation for:

- Any readable proof text
- Featured examples with exact copy
- Contact sheets and final proof assets

## Current Local Capabilities

Checked-in Comfy workflows:

- `comfyui-workflows/customcard-sdxl-checkpoint.json`
- `comfyui-workflows/customcard-sdxl-lightning-lora.json`
- `comfyui-workflows/customcard-hybrid-reserved-layout.json`
- `comfyui-workflows/customcard-production-text-overlay.json`
- `comfyui-workflows/customcard-flux1-schnell.json`
- `comfyui-workflows/customcard-flux2-klein-4b.json`
- `comfyui-workflows/customcard-z-image-turbo.json`
- `comfyui-workflows/customcard-qwen-image-research.json`

Important constraint: `customcard-production-text-overlay.json` can render exact copy with the checked-in `CustomCardTextComposer` node, but current research says it is not yet promoted as the default production path. Use it for controlled evidence and marketing candidates, then manually grade outputs.

## Safe Prompt Contract

For card backgrounds:

```text
Portrait 5:7 greeting-card background art. Keep a generous clean text-safe area for app-rendered copy. Premium print-ready stationery, strong occasion signal, disciplined negative space, subtle paper texture. No readable text, no letters, no numbers, no logos, no people, no watermark.
```

Global negative prompt:

```text
readable text, letters, words, numbers, fake calligraphy, signature, logo, watermark, QR code, barcode, caption plaque, text box, brand mark, product label, dense wallpaper, low contrast text-safe zone, people, faces, hands, cropped bodies, distorted anatomy
```

## Useful Commands

Preflight the production text workflow without requiring live Comfy:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs
```

Start local ComfyUI:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-comfyui.ps1
```

Preflight live Comfy with the production text workflow:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true
```

Run a local typography benchmark:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-local-typography-benchmark.ps1
```

Run the production text benchmark:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1
```

Dry-run the local AI queue plan:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/local-ai-job-queue.mjs --dry-run true --stories botanical-birthday
```

Generate one fixed-prompt website asset from the manifest through Comfy:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/generate-website-assets-from-manifest.mjs --asset birthday-candle-table --checkpoint sd_xl_turbo_1.0_fp16.safetensors --steps 2 --cfg 1.5
```

Generate the first theme inventory pass:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/generate-website-assets-from-manifest.mjs --batch theme-inventory-fronts --checkpoint sd_xl_turbo_1.0_fp16.safetensors --steps 2 --cfg 1.5
```

Preview the selected assets without queueing Comfy:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/generate-website-assets-from-manifest.mjs --batch theme-inventory-fronts --dry-run true
```

## Recommended First Pass

1. Generate the four `marketing-core` stills.
2. Generate the twelve `theme-inventory-fronts` backgrounds with Comfy, two seeds each.
3. Pick the best background per occasion.
4. Composite the six `finished-proof-examples` with exact text.
5. Use the finished proof fronts as source frames for a morph-reel prototype.

## Video Path

There is no checked-in morph/video workflow yet. Best route:

1. Generate stable proof keyframes in the same 5:7 card framing.
2. Add or import a Comfy image-to-video/interpolation workflow.
3. Render a 6-8 second loop from the keyframes.
4. Keep readable text either static, crossfaded, or composited after the video render.

Do not rely on a video diffusion model to preserve exact text.
