# Final Review Fix Report

## Scope

Fixed the two Important findings from the final whole-branch review for the configure/setup implementation on `codex/config-setup-architecture`.

## Fixes applied

### 1. Card-copy pin no longer leaks into generic Cloudflare text model selection

- Updated `src/aiProviderSetupProfile.mjs` so generic Cloudflare text model env keys are only:
  - `CUSTOMCARD_CLOUDFLARE_TEXT_MODEL`
  - `CLOUDFLARE_WORKERS_AI_TEXT_MODEL`
- Kept `CUSTOMCARD_AI_CARD_COPY_MODEL` as the card-copy-specific setup/reporting override key.
- Preserved card-copy override behavior through the existing flow-specific `CUSTOMCARD_AI_CARD_COPY_MODEL` path in `src/aiFlowConfigData.mjs`.
- Updated `src/providerRuntime.ts` so generic `cloudflare-workers-ai-chat` runtime contracts reference generic Cloudflare text model keys rather than the card-copy-only pin.

### 2. Hosted inventory no longer blocks solely on missing explicit card-copy pin

- Updated `scripts/hosted-vercel-env-inventory.mjs` so missing `CUSTOMCARD_AI_CARD_COPY_MODEL` is reported as `aiCardCopyProductionModelPinned: false` without becoming a blocker by itself.
- Preserved redacted reporting for whether the explicit card-copy pin is present.
- Kept hosted setup blocked only when truly required hosted env keys are missing.

## Tests added or adjusted

- `src/aiProviderSetupProfile.test.ts`
  - Proves generic Cloudflare text model env keys exclude `CUSTOMCARD_AI_CARD_COPY_MODEL`.
- `src/aiFlowConfig.test.ts`
  - Proves `CUSTOMCARD_AI_CARD_COPY_MODEL` does not affect `customer-chat`.
  - Proves `card-copy` still honors `CUSTOMCARD_AI_CARD_COPY_MODEL` as a flow-specific override.
- `src/providerRuntime.test.ts`
  - Proves generic `cloudflare-workers-ai-chat` runtime contracts do not use `CUSTOMCARD_AI_CARD_COPY_MODEL`.
- `tests/hosted-vercel-env-inventory.test.ts`
  - Proves hosted inventory reports `aiCardCopyProductionModelPinned: false` without blocking when the explicit pin is absent.
- `tests/hosted-vercel-env-repair.test.ts`
  - Updated fixture expectations to match non-blocking missing-pin inventory behavior.

## Commands run

1. Narrow suite:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiProviderSetupProfile.test.ts src/aiFlowConfig.test.ts src/providerRuntime.test.ts tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts`

Result: passed, 5 files / 55 tests.

2. Full Task 5 focused suite:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiProviderSetupProfile.test.ts src/aiFlowConfig.test.ts src/providerRuntime.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts tests/production-text-readiness-doctor.test.ts src/localComfyProductionText.test.ts`

Result: passed, 10 files / 126 tests.

## Residual concerns

- I did not run live Vercel inventory commands or live Cloudflare calls; validation here is the focused test suite only.
- The branch has unrelated dirty worktree changes outside this fix scope; they were left untouched and will not be included in the scoped commit.
