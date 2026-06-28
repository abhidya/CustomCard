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
