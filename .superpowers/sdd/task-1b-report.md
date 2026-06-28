# Task 1b Report: Integrate Route Activation With Generator And Provider Worker

## Scope

Implemented Task 1b narrowly in the generator and provider worker paths, using the approved Task 1a shared module at `src/aiRouteActivation.mjs`.

Touched code:

- `scripts/ai-card-generator.mjs`
- `scripts/provider-http-worker.mjs`
- `src/aiCardGenerator.test.ts`
- `tests/provider-http-worker.test.mjs`

Did not stage or plan to commit any `.superpowers/sdd` files or unrelated dirty files.

## What Changed

### 1. Generator now resolves route activation through the shared module

In `scripts/ai-card-generator.mjs`:

- `generateCard` now calls `loadAiRouteActivationContext(...)` and resolves:
  - `card-copy` via `resolveAiRouteActivation("card-copy", activationContext)`
  - `card-image` via `resolveAiRouteActivation("card-image", activationContext)`
- `respondChat` now calls the same shared context loader and resolves:
  - `customer-chat` via `resolveAiRouteActivation("customer-chat", activationContext)`

This preserves the existing merge order because the shared module was built for exactly that order:

1. service config
2. server env config
3. loaded admin config
4. request context config
5. trusted request body config

### 2. Removed generator-local duplicate merge helpers

Stopped using and removed the local generator copies of:

- `runtimeAiFlowConfig`
- `loadedAiFlowAdminConfig`
- `normalizeOptionalAiFlowAdminConfigs`
- `serverScopedAiFlowConfig`
- `mergeAiFlowAdminConfigs`
- `requestScopedAiFlowConfig`

The generator now relies on the Task 1a module for those semantics.

### 3. Provider worker readiness now uses the shared route activation module

In `scripts/provider-http-worker.mjs`:

- replaced duplicate env JSON parsing and route resolution with:
  - `createAiRouteActivationContext({ env })`
  - `resolveAiRouteActivation("card-copy", activationContext)`
  - `resolveAiRouteActivation("card-image", activationContext)`

Removed the worker-local `providerAiFlowAdminConfig` helper.

## Behavior Preservation

Confirmed and preserved:

- existing public JSON response shapes from generator and chat paths;
- trusted request-body config remains ignored unless `trustRequestAiFlowConfig === true`;
- route resolution still flows through the existing config model and env resolution;
- worker readiness and generator execution both resolve from the shared activation logic;
- no new raw `.mjs` runtime import depends on TypeScript-only control-plane modules.

## Tests Added / Adjusted

### `src/aiCardGenerator.test.ts`

Added:

- `only honors request aiFlowConfig overrides when the request context is trusted`

This proves generator route resolution still distinguishes trusted vs. untrusted request-body config.

### `tests/provider-http-worker.test.mjs`

Added:

- `uses the same server-scoped route config for readiness and leased generator execution`
- `keeps raw node mjs runtime files off TypeScript-only control-plane imports`

These prove:

- provider worker readiness and leased generator execution agree on server-scoped route config;
- the touched raw Node runtime files do not import `.ts` control-plane modules.

## Focused Test Run

Command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs`

Result:

- 3 test files passed
- 59 tests passed

## Commit Scope

Intended commit scope is limited to:

- `scripts/ai-card-generator.mjs`
- `scripts/provider-http-worker.mjs`
- `src/aiCardGenerator.test.ts`
- `tests/provider-http-worker.test.mjs`

## Concerns

No functional concerns from the focused scope after the passing test run.

## Review Fix Notes

Addressed follow-up review findings from `review-d773eb2..f816628.diff`:

- `scripts/provider-http-worker.mjs`
  - fixed `describe()` so `imageAdapter` now reports the shared `card-image` route activation result rather than the raw `CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID` env value;
  - preserved the existing public key names while making the value reflect shared readiness and server-scoped `CUSTOMCARD_AI_FLOW_CONFIG_JSON` overrides.
- `tests/provider-http-worker.test.mjs`
  - extended the readiness/execution parity coverage to assert `imageAdapter`, `imageModel`, `aiFlowReadiness.cardImage`, and final `payload.ai_flow.card_image` reporting alongside the existing copy-flow assertions.
- `scripts/ai-card-generator.mjs`
  - removed unused `normalizeAiFlowAdminConfigs` and `resolveAiFlowConfig` imports.

## Review Fix Test Results

Command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs`

Result:

- 3 test files passed
- 59 tests passed
