# Second Final Review Fix Report

## Scope

Fixed the two remaining Important findings from the second final whole-branch review for the configure/setup implementation on `codex/config-setup-architecture`.

## Fixes applied

### 1. Cloudflare card-copy readiness no longer treats model env keys as required blockers

- Updated `src/aiProviderSetupProfile.mjs` to separate:
  - required Cloudflare text credentials for hosted readiness;
  - optional/reporting-only Cloudflare model keys and card-copy pin keys.
- Updated `src/aiFlowConfigData.mjs` so `cloudflare-workers-ai-chat` runtime readiness requires only:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN` or `CLOUDFLARE_API_TOKEN`
- Kept model env keys reportable through the setup profile and hosted inventory, but no longer blocking when the default hosted card-copy model is sufficient.
- Updated `scripts/hosted-vercel-env-inventory.mjs` so hosted card-copy setup is ready with account + token only, while still reporting:
  - whether any model env key is present;
  - whether `CUSTOMCARD_AI_CARD_COPY_MODEL` is explicitly pinned.

### 2. Sparse same-flow route overrides no longer erase earlier explicit selections

- Updated `src/aiRouteActivation.mjs` so each source is still env-normalized before merge, but later sparse configs now override only the keys explicitly present in that source.
- Preserved the existing behavior where a brand-new flow can initialize from env-normalized defaults for that source.
- Prevented later sparse sources like `{ flowId: "card-copy", liveProviderCallsEnabled: false }` from resetting earlier explicit adapter/model/prompt/budget selections back to env/default values.

## Tests added or adjusted

- `src/aiFlowConfig.test.ts`
  - Proves Cloudflare `card-copy` is live-ready with account + token only.
  - Proves the default hosted model remains `@cf/qwen/qwen3-30b-a3b-fp8`.
- `src/aiProviderSetupProfile.test.ts`
  - Proves required Cloudflare text credential groups exclude model env keys.
- `src/aiRouteActivation.test.ts`
  - Adds a same-flow sparse merge regression where an earlier source selects `openai-responses-chat` + `gpt-4.1-mini` and a later sparse source only flips `liveProviderCallsEnabled`; adapter/model/prompt/budget survive.
  - Updates sparse-merge assertions to reflect preserved earlier `card-copy` selections.
- `tests/hosted-vercel-env-inventory.test.ts`
  - Proves hosted inventory does not block solely because model env keys are absent.
  - Proves required hosted card-copy setup keys are account + token fallback only.

## Commands run

1. Narrow suite:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiProviderSetupProfile.test.ts src/aiFlowConfig.test.ts src/providerRuntime.test.ts tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts`

Result: passed, 6 files / 65 tests.

2. Full Task 5 focused suite:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiProviderSetupProfile.test.ts src/aiFlowConfig.test.ts src/providerRuntime.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts tests/production-text-readiness-doctor.test.ts src/localComfyProductionText.test.ts`

Result: passed, 10 files / 128 tests.

## Residual concerns

- I did not run live Cloudflare or live Vercel commands; validation here is the focused automated suite only.
- The working tree contains many unrelated dirty files outside this scope. I left them untouched and excluded them from the scoped commit.
