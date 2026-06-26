# Production Text Workflow Preflight

Created: 2026-06-26T01:14:13.097Z

- Workflow: `comfyui-workflows/customcard-production-text-overlay.json`
- Custom node source: `comfyui-custom-nodes/CustomCardTextComposer`
- Required Comfy class: `CustomCardTextComposer`
- Live Comfy reachable: yes
- Live node available: no
- Cached node available: no
- Promotion ready: no

## Checks

| Check | Required | Status | Details |
| --- | --- | --- | --- |
| workflow file exists | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| workflow JSON parses | yes | ok | {"workflowPath":"comfyui-workflows/customcard-production-text-overlay.json"} |
| workflow contains CustomCardTextComposer | yes | ok | {"requiredNodeClass":"CustomCardTextComposer","classTypes":["CLIPTextEncode","CheckpointLoaderSimple","CustomCardTextComposer","EmptyLatentImage","KSampler","SaveImage","VAEDecode"]} |
| custom node source exists | yes | ok | {"nodeSource":"D:\\manny\\Documents\\CustomCard\\comfyui-custom-nodes\\CustomCardTextComposer"} |
| custom node module files exist | yes | ok | {"files":["__init__.py","nodes.py"]} |
| live ComfyUI reachable | no | ok | {"comfyUrl":"http://127.0.0.1:8188","requireLive":false} |
| live ComfyUI has CustomCardTextComposer | no | fail | {"comfyUrl":"http://127.0.0.1:8188","requiredNodeClass":"CustomCardTextComposer","liveComfyReachable":true} |

## Next Steps

- Link comfyui-custom-nodes/CustomCardTextComposer into ComfyUI/custom_nodes and restart ComfyUI.
- After restart, refresh /object_info evidence so CustomCardTextComposer is visible to future agents.
- Use --require-live true in CI or promotion gates so missing live Comfy nodes fail the command.
