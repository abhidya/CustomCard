# Task 2 Report: Hosted AI Setup Manifest And Provider Setup Profile

## Summary

Implemented Task 2 on branch `codex/config-setup-architecture` and committed the scoped code/docs/test changes in `59e10f2c` (`Add hosted AI setup profile reporting`).

This change adds a shared hosted AI setup profile for Cloudflare production card-copy, uses it to remove Qwen3 30B drift across runtime/config/docs, and extends hosted Vercel env inventory/repair reporting with redacted AI card-copy setup status.

## What changed

### 1. Added a shared hosted AI setup profile

Created `src/aiProviderSetupProfile.mjs` as the single source for:

- production card-copy provider: `cloudflare-workers-ai-chat`
- production card-copy model: `@cf/qwen/qwen3-30b-a3b-fp8`
- Cloudflare text setup keys:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN` or `CLOUDFLARE_API_TOKEN`
  - `CUSTOMCARD_AI_CARD_COPY_MODEL`
  - `CUSTOMCARD_CLOUDFLARE_TEXT_MODEL`
  - `CLOUDFLARE_WORKERS_AI_TEXT_MODEL`
- local production-text Comfy guidance: hosted image keys are not required

### 2. Reused that profile in config/runtime code

Updated:

- `src/aiFlowConfigData.mjs`
- `src/providerRuntime.ts`

So both now consume the same Cloudflare text model facts rather than keeping separate hardcoded values.

Specific effects:

- card-copy default model remains Qwen3 30B from one shared source
- card-copy model env lookup now includes `CUSTOMCARD_AI_CARD_COPY_MODEL`
- Cloudflare text request contracts can reference the route-specific card-copy model pin

### 3. Extended hosted Vercel env reporting

Updated:

- `scripts/hosted-vercel-env-inventory.mjs`
- `scripts/hosted-vercel-env-repair.mjs`

Inventory now reports a redacted `aiCardCopySetup` section with:

- provider and default model
- setup key presence only
- whether `CUSTOMCARD_AI_CARD_COPY_MODEL` is present
- whether local production-text Comfy requires hosted image keys (`false`)

Inventory readiness now includes an explicit `ai-card-copy-setup` check and blocks when the hosted card-copy route is not explicitly pinned with `CUSTOMCARD_AI_CARD_COPY_MODEL`.

Repair reporting now carries the same redacted AI setup snapshot forward without adding any new mutation behavior.

No unguarded production mutations were added.

### 4. Updated docs and env examples

Updated:

- `infra/env/.env.example`
- `infra/README.md`
- `docs/cloudflare-workers-ai-setup.md`

These now consistently describe Qwen3 30B as the production card-copy default and document that hosted Cloudflare image keys are not required for the local production-text Comfy path.

## Tests

Adjusted focused tests in:

- `src/aiFlowConfig.test.ts`
- `src/providerRuntime.test.ts`
- `tests/hosted-vercel-env-inventory.test.ts`
- `tests/hosted-vercel-env-repair.test.ts`

Added coverage for:

- shared setup profile defaulting to Qwen3 30B
- route-specific card-copy model pin via `CUSTOMCARD_AI_CARD_COPY_MODEL`
- hosted inventory AI card-copy setup reporting with values redacted
- repair reporting keeping AI setup redacted
- docs/env examples staying aligned with the shared setup profile

Focused test command run:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiFlowConfig.test.ts src/providerRuntime.test.ts tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts`

Result: 4 test files passed, 50 tests passed.

## Files included in commit

- `src/aiProviderSetupProfile.mjs`
- `src/aiFlowConfigData.mjs`
- `src/providerRuntime.ts`
- `scripts/hosted-vercel-env-inventory.mjs`
- `scripts/hosted-vercel-env-repair.mjs`
- `infra/env/.env.example`
- `infra/README.md`
- `docs/cloudflare-workers-ai-setup.md`
- `src/aiFlowConfig.test.ts`
- `src/providerRuntime.test.ts`
- `tests/hosted-vercel-env-inventory.test.ts`
- `tests/hosted-vercel-env-repair.test.ts`

## Notes / concerns

- Hosted inventory currently proves the production card-copy pin by presence of `CUSTOMCARD_AI_CARD_COPY_MODEL`; it does not inspect and compare the deployed value contents against Qwen3 30B.
- Existing unrelated dirty worktree changes remain untouched and unstaged by this task.
