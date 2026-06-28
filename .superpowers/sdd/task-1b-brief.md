## Task 1b: Integrate Route Activation With Generator And Provider Worker

Use the approved Task 1a route activation module from runtime callers.

Requirements:

- Integrate `scripts/ai-card-generator.mjs` so `generateCard` and `respondChat` use `loadAiRouteActivationContext` / `resolveAiRouteActivation` from `src/aiRouteActivation.mjs` rather than local helper copies for runtime config merging.
- Remove or stop using the local generator helpers that duplicate the module behavior:
  - `runtimeAiFlowConfig`;
  - `loadedAiFlowAdminConfig`;
  - `normalizeOptionalAiFlowAdminConfigs`;
  - `serverScopedAiFlowConfig`;
  - `mergeAiFlowAdminConfigs`;
  - `requestScopedAiFlowConfig`.
- Preserve existing generated card/chat response JSON shapes.
- Preserve all existing route behavior, including:
  - service config, server env config, loaded admin config, request context config, trusted request-body config merge order;
  - request body config ignored unless `trustRequestAiFlowConfig === true`;
  - Cloudflare Workers AI primary and Qwen3 30B default for `card-copy`.
- Integrate `scripts/provider-http-worker.mjs` so provider AI flow readiness uses the shared module for server-scoped env JSON parsing and route resolution instead of local duplicate parsing.
- Add or adjust focused tests proving:
  - generator route resolution still honors trusted/untrusted request config;
  - provider worker readiness and generator route resolution use the same parsed server-scoped config;
  - no raw Node `.mjs` path imports TypeScript-only control-plane data.

Suggested files:

- `scripts/ai-card-generator.mjs`
- `scripts/provider-http-worker.mjs`
- `src/aiRouteActivation.test.ts`
- `src/aiCardGenerator.test.ts`
- `tests/provider-http-worker.test.mjs`

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs`
