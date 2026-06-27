# Production Text Workflow Preflight

Created: 2026-06-27T00:13:50.740Z

- Workflow: `comfyui-workflows/customcard-production-text-overlay.json`
- Custom node source: `comfyui-custom-nodes/CustomCardTextComposer`
- Required Comfy class: `CustomCardTextComposer`
- Live Comfy reachable: no
- Live node available: no
- Cached node available: no
- Promotion ready: no

## Checks

| Check | Required | Status | Details |
| --- | --- | --- | --- |
| workflow file exists | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| workflow JSON parses | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| workflow contains CustomCardTextComposer | yes | ok | {"requiredNodeClass":"CustomCardTextComposer","classTypes":["CLIPTextEncode","CheckpointLoaderSimple","CustomCardTextComposer","EmptyLatentImage","KSampler","SaveImage","VAEDecode"]} |
| workflow maps production text compositor inputs | yes | ok | {"requiredInputs":["artwork_guard_x","artwork_guard_y","artwork_guard_width","artwork_guard_height","artwork_guard_color","artwork_guard_opacity","artwork_guard_radius","artwork_guard_style","headline_box_background_radius","headline_box_background_opacity","headline_box_background_style","body_box_background_radius","body_box_background_opacity","body_box_background_style"],"missingInputs":[]} |
| custom node source exists | yes | ok | {"nodeSource":"D:\\manny\\Documents\\CustomCard\\comfyui-custom-nodes\\CustomCardTextComposer"} |
| custom node module files exist | yes | ok | {"files":["__init__.py","nodes.py"]} |
| live ComfyUI reachable | yes | fail | {"comfyUrl":"http://127.0.0.1:8188","requireLive":true,"error":"fetch failed"} |
| live ComfyUI has CustomCardTextComposer | yes | fail | {"comfyUrl":"http://127.0.0.1:8188","requiredNodeClass":"CustomCardTextComposer","liveComfyReachable":false} |
| live ComfyUI exposes production text compositor inputs | yes | fail | {"requiredInputs":["artwork_guard_x","artwork_guard_y","artwork_guard_width","artwork_guard_height","artwork_guard_color","artwork_guard_opacity","artwork_guard_radius","artwork_guard_style","headline_box_background_radius","headline_box_background_opacity","headline_box_background_style","body_box_background_radius","body_box_background_opacity","body_box_background_style"],"missingInputs":["artwork_guard_x","artwork_guard_y","artwork_guard_width","artwork_guard_height","artwork_guard_color","artwork_guard_opacity","artwork_guard_radius","artwork_guard_style","headline_box_background_radius","headline_box_background_opacity","headline_box_background_style","body_box_background_radius","body_box_background_opacity","body_box_background_style"],"liveInputCount":0} |

## Next Steps

- Start or restart the target ComfyUI server, then rerun this preflight with --require-live true.
- After restart, refresh /object_info evidence so CustomCardTextComposer is visible to future agents.
