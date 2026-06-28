# Configure And Setup Path Implementation Plan

## Global Constraints

- Preserve existing JSON response shapes and persisted schema shapes unless a task explicitly says otherwise.
- Keep the LLM as the card theme/layout planner; keep image generation separate from exact typography.
- Use local resources for image generation setup paths, especially local Comfy for production text artwork.
- Use Cloudflare Workers AI for hosted/text card-copy setup paths; production card copy defaults to `@cf/qwen/qwen3-30b-a3b-fp8`.
- Do not promote CPU/offload Kobold evidence as production proof.
- Do not split Provider Runtime and Provider Catalog into separate plugin/runtime packages; D010 defers that larger split.
- Implement deeper module interfaces that improve locality and leverage while preserving current adapter ids and public admin/runtime shapes.
- Preserve unrelated dirty worktree changes. Stage and commit only files explicitly scoped to each task.
- Use the repo's Windows command wrappers: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run ...` for tests.

## Task 1: Card Draft Route Activation Module

Create a deeper module interface for card draft AI route activation and use it from the request path and provider worker.

Requirements:

- Add a module under `src/` that centralizes runtime AI flow config loading/merging and flow route activation for `card-copy`, `card-image`, and `customer-chat`.
- The module must own parsing of `CUSTOMCARD_AI_FLOW_CONFIG_JSON` and `CUSTOMCARD_AI_FLOW_ADMIN_CONFIG_JSON`, request-scoped config trust, service config, loaded admin config, and merge order.
- The module must expose route activation metadata that can identify the selected flow, selected adapter id, model, readiness, blocked reasons, configured env keys, and associated control-plane route policy id when one exists.
- Integrate `scripts/ai-card-generator.mjs` so `generateCard` and `respondChat` use the new module rather than local helper copies for runtime config merging.
- Integrate `scripts/provider-http-worker.mjs` so provider AI flow readiness uses the same module rather than local helper copies for env JSON parsing.
- Preserve existing generated response JSON shapes and public admin config shapes.
- Keep current adapter ids and default card-copy behavior: Cloudflare Workers AI primary, Qwen3 30B model default, Hugging Face fallback.
- Add or adjust focused tests proving:
  - env model override `CUSTOMCARD_AI_CARD_COPY_MODEL` still wins for card copy;
  - request-scoped AI flow config is ignored unless `trustRequestAiFlowConfig` is true;
  - request-scoped AI flow config is merged when trusted;
  - provider worker readiness and generator route resolution use the same parsed server-scoped config;
  - route activation metadata includes `card-copy-route-v1` for `card-copy` and `card-image-route-v1` for `card-image`.

Suggested files:

- `src/aiRouteActivation.mjs`
- `src/aiRouteActivation.d.mts`
- `src/aiRouteActivation.test.ts`
- `scripts/ai-card-generator.mjs`
- `scripts/provider-http-worker.mjs`
- Existing focused tests if better placed.

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs`

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

## Task 4: Drift Guards And Documentation Contract

Add lightweight guards that keep the new route/setup modules from drifting after this change.

Requirements:

- Add focused tests or doctors that assert:
  - card-copy route policy, flow defaults, provider runtime default, provider setup profile, Cloudflare setup docs, and infra env example all agree on `@cf/qwen/qwen3-30b-a3b-fp8`;
  - hosted/text setup guidance does not require Cloudflare image keys for the local Comfy production-text path;
  - production-text Comfy setup docs mention the shared setup module or shared setup facts, and still require `CustomCardTextComposer`.
- Update relevant documentation so future operators have one clear configure/setup path:
  - Cloudflare for text/card-copy;
  - local Comfy for production-text image/artwork;
  - Vercel hosted env inventory/repair reports setup without leaking secrets.
- Do not add broad, slow, live-network tests. Use static/unit tests unless a current test already mocks network calls.

Suggested files:

- `src/aiProviderSetupProfile.test.ts`
- `tests/production-text-readiness-doctor.test.ts`
- `tests/hosted-vercel-env-inventory.test.ts`
- `docs/cloudflare-workers-ai-setup.md`
- `docs/comfyui-production-text-workflow.md`
- `docs/vercel-env-structure.md`

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiProviderSetupProfile.test.ts src/aiRouteActivation.test.ts tests/hosted-vercel-env-inventory.test.ts tests/production-text-readiness-doctor.test.ts`

## Task 5: Final Integration Verification

Run the focused verification set for all configure/setup changes and fix integration fallout.

Requirements:

- Run the focused tests introduced or touched by Tasks 1-4.
- Run any existing focused suites that cover AI flow config, provider runtime, hosted env, provider worker, Comfy production text, and card generation.
- Fix only issues caused by the scoped implementation.
- Produce a final report listing commands run, pass/fail status, and any residual risks such as live Comfy or live Cloudflare checks that were not run.

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiProviderSetupProfile.test.ts src/aiFlowConfig.test.ts src/providerRuntime.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts tests/production-text-readiness-doctor.test.ts src/localComfyProductionText.test.ts`
