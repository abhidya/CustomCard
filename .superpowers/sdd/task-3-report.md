# Task 3 Report: Comfy Production Text Setup Module

Date: 2026-06-27
Branch: `codex/config-setup-architecture`
Commit: `1ec1df6bd6f65b616029b0d0943178da5087a5ea`

## Scope Completed

Implemented Task 3 by centralizing production-text Comfy setup facts into a shared module and updating the existing consumers to read from it without changing the workflow JSON or local Comfy adapter behavior.

## Files Changed

- `scripts/comfy-production-text-setup.mjs`
- `scripts/comfyui-production-text-preflight.mjs`
- `scripts/production-text-readiness-doctor.mjs`
- `scripts/local-comfy-worker.mjs`
- `tests/production-text-readiness-doctor.test.ts`
- `src/localComfyProductionText.test.ts`

## What Changed

### 1. Added shared production-text setup module

Created `scripts/comfy-production-text-setup.mjs` as the single home for:

- default workflow path: `comfyui-workflows/customcard-production-text-overlay.json`
- default custom node source: `comfyui-custom-nodes/CustomCardTextComposer`
- workflow id: `customcard-production-text-overlay`
- required node class: `CustomCardTextComposer`
- required compositor input list used by production-text preflight
- default Comfy URL resolution order:
  1. `CUSTOMCARD_COMFYUI_URL`
  2. `COMFYUI_URL`
  3. `http://127.0.0.1:8188`
- setup instructions for linking and restarting the custom node

Also added helpers for:

- resolving production-text setup from args/env
- describing setup with repo-relative paths
- determining whether the local worker is configured for the production-text workflow

### 2. Integrated preflight with shared facts

Updated `scripts/comfyui-production-text-preflight.mjs` to consume the shared setup module for:

- default workflow path
- default node source
- required node class
- required compositor inputs
- default Comfy URL resolution
- repo-relative path formatting

The preflight still treats missing live `CustomCardTextComposer` as a blocking condition when `--require-live true` is used, and promotion readiness still fails when the node is missing.

### 3. Integrated readiness doctor with shared facts

Updated `scripts/production-text-readiness-doctor.mjs` to consume the shared setup module for:

- workflow path
- node source
- Comfy URL defaults
- required node class lookup in live `/object_info`

This preserves the existing blocking behavior: if live Comfy does not expose `CustomCardTextComposer`, readiness remains blocked and promotion-ready remains false.

### 4. Integrated local worker readiness description

Updated `scripts/local-comfy-worker.mjs` to:

- use the shared default Comfy URL resolution
- include a `productionTextSetup` payload in `describeLocalComfyWorkerReadiness(...)` when the worker is configured for the production-text workflow

This only changes readiness metadata/reporting. It does not alter local Comfy adapter execution behavior.

## Tests Added/Adjusted

Updated focused tests to prove:

- preflight uses the shared required node class and compositor input list
- readiness doctor uses the shared workflow path, node source, and default Comfy URL
- local worker readiness describes the resolved production-text setup when configured
- missing `CustomCardTextComposer` remains promotion-failing/blocking

Focused test command run:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run tests/production-text-readiness-doctor.test.ts src/localComfyProductionText.test.ts
```

Result:

- 2 test files passed
- 11 tests passed

## Notes / Constraints Honored

- Did not modify `comfyui-workflows/customcard-production-text-overlay.json`
- Did not change local Comfy adapter behavior beyond consuming shared setup/reporting facts
- Preserved `CustomCardTextComposer` as required and promotion-blocking when missing
- Did not stage or commit `.superpowers/sdd` files
- Did not touch unrelated dirty worktree changes

## Concerns

No open implementation concerns from Task 3 itself. The local worker now reports production-text setup metadata only when its workflow configuration matches the production-text workflow id or default workflow path, which keeps the new reporting scoped and avoids implying that arbitrary Comfy workflows use the production-text contract.
