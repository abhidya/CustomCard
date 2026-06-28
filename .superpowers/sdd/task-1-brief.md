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
