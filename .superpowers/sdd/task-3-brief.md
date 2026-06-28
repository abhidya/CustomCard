## Task 3: Comfy Production Text Setup Module

Create a deeper module for production-text Comfy setup facts and integrate preflight/readiness/worker paths.

Requirements:

- Add a module under `scripts/` that owns production-text Comfy setup facts:
  - default workflow path `comfyui-workflows/customcard-production-text-overlay.json`;
  - default custom node source `comfyui-custom-nodes/CustomCardTextComposer`;
  - required node class `CustomCardTextComposer`;
  - required compositor inputs currently duplicated by preflight;
  - default Comfy URL resolution from `CUSTOMCARD_COMFYUI_URL`, `COMFYUI_URL`, then `http://127.0.0.1:8188`;
  - setup instructions for linking/restarting the custom node.
- Integrate `scripts/comfyui-production-text-preflight.mjs` and `scripts/production-text-readiness-doctor.mjs` with the setup module so workflow/node/default URL facts have one home.
- Integrate `scripts/local-comfy-worker.mjs` where it reports or resolves production-text workflow setup metadata.
- Preserve the existing local Comfy adapter behavior and production-text workflow JSON.
- Add or adjust focused tests proving:
  - preflight uses the shared required node class and input list;
  - readiness doctor uses the shared workflow path, node source, and Comfy URL defaults;
  - local worker describes the resolved production-text workflow setup when configured;
  - missing `CustomCardTextComposer` remains a blocking/promotion-failing condition.

Suggested files:

- `scripts/comfy-production-text-setup.mjs`
- `scripts/comfyui-production-text-preflight.mjs`
- `scripts/production-text-readiness-doctor.mjs`
- `scripts/local-comfy-worker.mjs`
- Existing production-text tests.

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run tests/production-text-readiness-doctor.test.ts src/localComfyProductionText.test.ts`
