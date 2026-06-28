# Task 1a Report: Route Activation Module And Unit Tests

## Scope completed

Implemented only the Task 1a module and test foundation. I did not integrate `scripts/ai-card-generator.mjs` or `scripts/provider-http-worker.mjs` in this slice.

## Files added

- `src/aiRouteActivation.mjs`
- `src/aiRouteActivation.d.mts`
- `src/aiRouteActivation.test.ts`

## What the new module does

`src/aiRouteActivation.mjs` now centralizes runtime AI flow activation inputs and merge behavior for:

- `card-copy`
- `card-image`
- `customer-chat`

It owns:

- parsing `CUSTOMCARD_AI_FLOW_CONFIG_JSON`
- parsing `CUSTOMCARD_AI_FLOW_ADMIN_CONFIG_JSON`
- request-body trust gating through `trustRequestAiFlowConfig`
- request-context admin config input
- loaded admin config input normalization
- service-level config input normalization
- merge order matching current generator behavior:
  1. service config
  2. server-scoped env config
  3. loaded admin config
  4. request-context config
  5. trusted request-body config

It resolves route activation metadata with:

- selected flow config
- selected adapter id
- selected model
- readiness
- blocked reasons
- configured env keys
- associated control-plane route policy id when present

The module reuses existing `src/aiFlowConfigData.mjs` normalization and resolution behavior, including current defaults:

- `card-copy` primary adapter remains `cloudflare-workers-ai-chat`
- production `card-copy` default model remains `@cf/qwen/qwen3-30b-a3b-fp8`
- `card-copy` fallback remains `huggingface-chat`

For route policy ids, the module reads existing `aiRoutePolicies` from `src/aiProviderControlPlane.ts` instead of duplicating policy ids.

## Tests added

`src/aiRouteActivation.test.ts` proves:

- `CUSTOMCARD_AI_CARD_COPY_MODEL` still overrides stale admin/provider defaults for `card-copy`
- request-scoped config is ignored unless `trustRequestAiFlowConfig === true`
- trusted request-scoped config merges and wins at the end of the merge chain
- server-scoped env JSON is parsed once through the shared route-activation context
- route activation metadata includes:
  - `card-copy-route-v1`
  - `card-image-route-v1`

## Focused verification

Command run:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts`

Result:

- 2 test files passed
- 17 tests passed
- 0 failures

## Commit

- `aaaac80b` `Add AI route activation module foundation`

## Notes / concerns

- The new module currently imports `src/aiProviderControlPlane.ts` to source route policy ids. That keeps ids canonical for now, but when Task 1 later wires this into Node-executed `.mjs` runtime code, we may want a tiny shared policy-id module if direct `.ts` imports become awkward in that execution path.
- I intentionally did not modify generator or worker integration points in this slice.

## Post-review fix notes

- Fixed the critical cross-flow merge bug in `mergeAiFlowAdminConfigs`. The merge now preserves sparse per-source semantics by merging only the explicitly provided flow ids and fields from each source before one final normalization pass. This keeps the required precedence order intact across service config, server env config, loaded admin config, request-context config, and trusted request-body config.
- Preserved accepted loaded/admin-like config shapes by continuing to read `configs`, `aiFlowConfigs`, `aiFlowConfig`, `flows`, and now also `ai_flow_configs` and `ai_flow_config`.
- Removed the unsafe runtime `.mjs` import of `./aiProviderControlPlane.ts`. Route policy ids now come from a tiny shared runtime-safe module, and `src/aiProviderControlPlane.ts` reads the same ids so they stay canonical instead of drifting.
- Added a cross-flow merge regression test proving a later sparse override for `card-copy` does not reset the earlier `card-image` configuration.
- Tightened the `controlPlaneRoutePolicyId` declaration to `AiRoutePolicyId | ""`.

## Post-review test results

Command run:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts`

Result:

- 2 test files passed
- 18 tests passed
- 0 failures

## Re-review fix notes

- Fixed the remaining env-aware sparse override regression in `src/aiRouteActivation.mjs`. Route activation now normalizes each config source with the active `env` before merge, matching the current generator behavior for service config, server-scoped env JSON, loaded admin config, request-context config, and trusted request-body config.
- Preserved the accepted cross-flow merge behavior by continuing to merge per-flow configs without dropping unrelated flows.
- Added a regression test proving a sparse `card-copy` override under a non-default configured env (`HUGGINGFACE_API_TOKEN` only) resolves the same adapter/model semantics as generator-style source normalization.
- Updated the cross-flow sparse override assertion to reflect the intended generator semantics under a Cloudflare-configured env.

## Re-review test results

Command run:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts`

Result:

- 2 test files passed
- 19 tests passed
- 0 failures

## Final re-review fix notes

- Removed the module-level `WeakMap` cache from `src/aiRouteActivation.mjs` so server-scoped AI flow config is reparsed from the current env JSON on each fresh activation/context build.
- Preserved the existing per-context behavior where one created activation context still shares a single parsed server-scoped config across multiple flow resolutions in that context.
- Added a regression test proving that mutating `CUSTOMCARD_AI_FLOW_CONFIG_JSON` on the same env object changes the later resolved `card-copy` model on a subsequent activation/context call.

## Final re-review test results

Command run:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts`

Result:

- 2 test files passed
- 20 tests passed
- 0 failures

## Final re-review follow-up fix notes

- Fixed the remaining sparse cross-flow overwrite in `src/aiRouteActivation.mjs`. Each config source is still normalized with the active `env`, but `normalizeOptionalAiFlowAdminConfigs` now filters the normalized result back down to only the flow ids explicitly present in that source before merge.
- Updated `mergeAiFlowAdminConfigs` to return the merged explicit per-flow config list directly instead of running a final `normalizeAiFlowAdminConfigs(...)` pass that would densify sparse sources again.
- Strengthened the unrelated-flow preservation regression in `src/aiRouteActivation.test.ts` by giving `card-image` a non-default `promptInstructions` value and asserting it survives a later sparse `card-copy` override loaded through `ai_flow_configs`.

## Final re-review follow-up test results

Command run:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts`

Result:

- 2 test files passed
- 20 tests passed
- 0 failures
