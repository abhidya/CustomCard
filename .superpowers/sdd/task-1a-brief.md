## Task 1a: Route Activation Module And Unit Tests

Implement the module foundation for Task 1 without integrating generator or provider worker yet.

Requirements:

- Add `src/aiRouteActivation.mjs` and `src/aiRouteActivation.d.mts`.
- The module must centralize runtime AI flow config loading/merging and flow route activation for `card-copy`, `card-image`, and `customer-chat`.
- The module must own parsing of `CUSTOMCARD_AI_FLOW_CONFIG_JSON` and `CUSTOMCARD_AI_FLOW_ADMIN_CONFIG_JSON`, request-scoped config trust, service config, loaded admin config, and merge order.
- The merge order must match the current generator behavior: service config, server-scoped env config, loaded admin config, request-context config, trusted request-body config.
- The module must expose route activation metadata that can identify the selected flow, selected adapter id, model, readiness, blocked reasons, configured env keys, and associated control-plane route policy id when one exists.
- Use existing `src/aiFlowConfigData.mjs` functions for normalization and resolution; do not fork adapter/model defaults.
- Use existing `src/aiProviderControlPlane.ts` route policy data or a minimal import path that avoids duplicating policy ids.
- Preserve current adapter ids and default card-copy behavior: Cloudflare Workers AI primary, Qwen3 30B model default, Hugging Face fallback.
- Add `src/aiRouteActivation.test.ts` proving:
  - env model override `CUSTOMCARD_AI_CARD_COPY_MODEL` still wins for card copy;
  - request-scoped AI flow config is ignored unless `trustRequestAiFlowConfig` is true;
  - request-scoped AI flow config is merged when trusted;
  - server-scoped env JSON is parsed once through the shared module;
  - route activation metadata includes `card-copy-route-v1` for `card-copy` and `card-image-route-v1` for `card-image`.
- Do not edit `scripts/ai-card-generator.mjs` or `scripts/provider-http-worker.mjs` in this slice.

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiFlowConfig.test.ts`
