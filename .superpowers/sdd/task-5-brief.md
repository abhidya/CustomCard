## Task 5: Final Integration Verification

Run the focused verification set for all configure/setup changes and fix integration fallout.

Requirements:

- Run the focused tests introduced or touched by Tasks 1-4.
- Run any existing focused suites that cover AI flow config, provider runtime, hosted env, provider worker, Comfy production text, and card generation.
- Fix only issues caused by the scoped implementation.
- Produce a final report listing commands run, pass/fail status, and any residual risks such as live Comfy or live Cloudflare checks that were not run.

Focused test command:

`rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/npm.ps1 run test -- --run src/aiRouteActivation.test.ts src/aiProviderSetupProfile.test.ts src/aiFlowConfig.test.ts src/providerRuntime.test.ts src/aiCardGenerator.test.ts tests/provider-http-worker.test.mjs tests/hosted-vercel-env-inventory.test.ts tests/hosted-vercel-env-repair.test.ts tests/production-text-readiness-doctor.test.ts src/localComfyProductionText.test.ts`
