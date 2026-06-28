## Task 2: Hosted AI Setup Manifest And Provider Setup Profile

Create a deeper setup/profile module for Cloudflare text setup and hosted Vercel env checks, then consume it from docs/tests/scripts.

Requirements:

- Add a module under `src/` or `scripts/` that owns hosted AI setup facts:
  - production card-copy provider: `cloudflare-workers-ai-chat`;
  - production card-copy model: `@cf/qwen/qwen3-30b-a3b-fp8`;
  - text env keys: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN` or `CLOUDFLARE_API_TOKEN`, and text model keys including `CUSTOMCARD_AI_CARD_COPY_MODEL`, `CUSTOMCARD_CLOUDFLARE_TEXT_MODEL`, `CLOUDFLARE_WORKERS_AI_TEXT_MODEL`;
  - local image guidance: do not require hosted image keys for the production-text local Comfy path.
- Use this setup module to prevent Cloudflare model drift between `src/aiFlowConfigData.mjs`, `src/providerRuntime.ts`, docs, and env examples wherever practical without broad Provider Runtime / Provider Catalog splitting.
- Update `infra/env/.env.example` and `infra/README.md` so Cloudflare text setup names Qwen3 30B as the production card-copy default, not the older Llama 8B baseline.
- Extend hosted Vercel env inventory/repair or a related setup doctor so it can report the AI card-copy setup keys and whether the 30B model override is present without exposing secret values.
- Keep repair mutations guarded by the existing hosted repair env acknowledgements; do not add unguarded production mutation behavior.
- Add or adjust focused tests proving:
  - the setup/profile module reports Qwen3 30B as production card-copy default;
  - hosted inventory/reporting can include AI card-copy setup status with values redacted;
  - repair/reporting does not expose token values;
  - docs/env example model defaults do not drift from the setup/profile module.

Suggested files:

- `src/aiProviderSetupProfile.mjs` or `scripts/ai-provider-setup-profile.mjs`
- `scripts/hosted-vercel-env-inventory.mjs`
- `scripts/hosted-vercel-env-repair.mjs` if repair reporting is needed
- `infra/env/.env.example`
- `infra/README.md`
- `docs/cloudflare-workers-ai-setup.md`
- Focused tests under `src/` or `tests/`.

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiFlowConfig.test.ts src/providerRuntime.test.ts tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts`
