# Production Text Workflow Preflight

Created: 2026-06-26T02:33:34.908Z

- Workflow: `comfyui-workflows/customcard-production-text-overlay.json`
- Custom node source: `comfyui-custom-nodes/CustomCardTextComposer`
- Required Comfy class: `CustomCardTextComposer`
- Live Comfy reachable: yes
- Live node available: yes
- Cached node available: no
- Promotion ready: yes

## Checks

| Check | Required | Status | Details |
| --- | --- | --- | --- |
| workflow file exists | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| workflow JSON parses | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| workflow contains CustomCardTextComposer | yes | ok | {"requiredNodeClass":"CustomCardTextComposer","classTypes":["CLIPTextEncode","CheckpointLoaderSimple","CustomCardTextComposer","EmptyLatentImage","KSampler","SaveImage","VAEDecode"]} |
| workflow maps soft safe-field inputs | yes | ok | {"requiredInputs":["headline_box_background_radius","headline_box_background_opacity","headline_box_background_style","body_box_background_radius","body_box_background_opacity","body_box_background_style"],"missingInputs":[]} |
| custom node source exists | yes | ok | {"nodeSource":"D:\\manny\\Documents\\CustomCard\\comfyui-custom-nodes\\CustomCardTextComposer"} |
| custom node module files exist | yes | ok | {"files":["__init__.py","nodes.py"]} |
| live ComfyUI reachable | yes | ok | {"comfyUrl":"http://127.0.0.1:8188","requireLive":true} |
| live ComfyUI has CustomCardTextComposer | yes | ok | {"comfyUrl":"http://127.0.0.1:8188","requiredNodeClass":"CustomCardTextComposer","liveComfyReachable":true} |
| live ComfyUI exposes soft safe-field inputs | yes | ok | {"requiredInputs":["headline_box_background_radius","headline_box_background_opacity","headline_box_background_style","body_box_background_radius","body_box_background_opacity","body_box_background_style"],"missingInputs":[],"liveInputCount":38} |

## Next Steps

- Run tools/run-production-text-benchmark.ps1 to produce four-panel production workflow evidence.
