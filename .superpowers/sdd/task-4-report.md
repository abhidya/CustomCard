# Task 4 Report: Drift Guards And Documentation Contract

## Scope

Implemented only Task 4 drift guards and documentation contract updates for the
new hosted card-copy and local Comfy production-text setup split. No live
network tests were added.

## Changes

### Drift guards

- Added `src/aiProviderSetupProfile.test.ts` to pin the shared Cloudflare
  card-copy contract across:
  - `src/aiProviderSetupProfile.mjs`
  - `src/aiFlowConfigData.mjs`
  - `src/providerRuntime.ts`
  - `src/aiProviderControlPlane.ts`
  - `docs/cloudflare-workers-ai-setup.md`
  - `infra/env/.env.example`
- Added a hosted env doc-contract test to
  `tests/hosted-vercel-env-inventory.test.ts` to keep:
  - redacted inventory/repair reporting language present
  - local Comfy guidance free of required Cloudflare image keys
- Added a production-text doc-contract test to
  `tests/production-text-readiness-doctor.test.ts` to keep:
  - `docs/comfyui-production-text-workflow.md` aligned with
    `scripts/comfy-production-text-setup.mjs`
  - the shared workflow path, node source, and `CustomCardTextComposer`
    requirement explicitly documented

### Documentation contract

- Updated `docs/cloudflare-workers-ai-setup.md` to separate:
  - required hosted Cloudflare text/card-copy setup
  - optional live Cloudflare image-lane setup
- Updated `docs/comfyui-production-text-workflow.md` to explicitly document
  `scripts/comfy-production-text-setup.mjs` as the shared setup facts module for
  workflow path, node source, required class, default Comfy URL, and setup
  instructions.
- Updated `docs/vercel-env-structure.md` to state:
  - hosted card-copy uses Cloudflare text/account keys
  - local production-text Comfy does not require Cloudflare image keys
  - hosted env inventory/repair artifacts stay redacted and must not store
    secret values
- Updated `infra/env/.env.example` comments to keep the same hosted text vs
  local Comfy image-key split visible in the tracked env example.

## Verification

Focused test command from the brief passed:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiProviderSetupProfile.test.ts src/aiRouteActivation.test.ts tests/hosted-vercel-env-inventory.test.ts tests/production-text-readiness-doctor.test.ts
```

- Result: `4` test files passed, `23` tests passed, `0` failures (`2.08s`).

Result:

- `4` test files passed
- `23` tests passed
- `0` failures

## Files changed

- `src/aiProviderSetupProfile.test.ts`
- `tests/hosted-vercel-env-inventory.test.ts`
- `tests/production-text-readiness-doctor.test.ts`
- `docs/cloudflare-workers-ai-setup.md`
- `docs/comfyui-production-text-workflow.md`
- `docs/vercel-env-structure.md`
- `infra/env/.env.example`

## Commit

- `d3e4c86848def4d7b98d73c1194d9bf2a60f107c` - `Add Task 4 drift guards and setup docs contract`

## Concerns

- The new source-level drift test in `src/aiProviderSetupProfile.test.ts` reads
  a few code files as text. That is intentional for this task because the brief
  asked for lightweight static guards, but it does mean future refactors to
  formatting or string layout may require updating the assertions even when the
  runtime behavior stays equivalent.

## Review Fix Notes

- Addressed the critical review finding in `src/aiProviderSetupProfile.test.ts`.
- Replaced the loose `aiProviderControlPlane.ts` source-text co-occurrence check
  with a direct object-level assertion over exported control-plane data.
- The drift guard now resolves the `card-copy-route-v1` policy through
  `aiRoutePolicyIdsByFlowId`, finds its `primaryModelIds`, and asserts they
  still point to the single catalog entry whose adapter is
  `cloudflare-workers-ai-chat` and whose model is
  `@cf/qwen/qwen3-30b-a3b-fp8`.
- The same test also confirms the active `card-copy` prompt profile still binds
  that provider/model contract, so route policy and prompt profile cannot drift
  independently without failing the test.

## Review Fix Verification

- Re-ran the required focused suite on June 27, 2026:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiProviderSetupProfile.test.ts src/aiRouteActivation.test.ts tests/hosted-vercel-env-inventory.test.ts tests/production-text-readiness-doctor.test.ts
```

- Result: `4` test files passed, `23` tests passed, `0` failures.

## Re-review Fix Notes

- Addressed the remaining Important re-review finding in the three drift-guard
  tests the reviewer called out:
  - `src/aiProviderSetupProfile.test.ts`
  - `tests/hosted-vercel-env-inventory.test.ts`
  - `tests/production-text-readiness-doctor.test.ts`
- Replaced hardcoded `D:/manny/Documents/CustomCard` file-read paths with
  portable repo-relative resolution derived from `import.meta.url`,
  `fileURLToPath`, and `resolve`.
- Kept the strengthened `card-copy-route-v1` route-policy guard intact and did
  not add any live-network coverage.

## Re-review Verification

- Re-ran the required focused suite on June 27, 2026:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiProviderSetupProfile.test.ts src/aiRouteActivation.test.ts tests/hosted-vercel-env-inventory.test.ts tests/production-text-readiness-doctor.test.ts
```
