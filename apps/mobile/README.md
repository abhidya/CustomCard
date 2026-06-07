# CustomCard Mobile Shell

This is the iOS/Android customer app boundary. The current app shell mirrors the
web customer panel and adds a mobile-specific workflow contract: Google/Apple
entry points, calendar/email/invite import actions, card queue items, customer
approval controls, approved memory review, local scripted chat, card proof path,
best available pickup/shipped fulfillment recommendations, offline idempotent
sync, locale readiness, and checkout confirmation. The customer state lives in
`src/customerExperience.ts`, a pure contract module tested by the root Vitest
suite and inspected by the mobile doctor. `App.tsx` is the Expo root entrypoint
and re-exports the native shell from `src/App.tsx`.

## Current proof boundary

The mobile proof is deterministic and repo-local. It proves that the native shell
source and customer contract align with the web customer flow stages:
account/import, event review, card approval, proof review, fulfillment review,
and checkout confirmation. The `mobileProofBoundary` contract intentionally
blocks native emulator render proof, signed native artifact proof, app-store
review proof, and live retail-order proof.

It uses static demo state because the repo-local verification loop does not run a
hosted API server, native emulator, or signed platform build.
The launch locale options mirror the web/API contract: English (US), Spanish
(US), Urdu, and Arabic, with RTL and non-English copy review still gated before
production use.

`eas.json` defines development, preview, and production native build profiles
for iOS and Android. The release doctor checks that the app config resolves
`CUSTOMCARD_API_BASE_URL` from the environment instead of hardcoding production,
keeps the shared kill switch disabled, and exposes bundle/package identifiers.
Running an EAS build and platform signing still requires Expo/React Native
tooling and credentials outside this repo-local Vite verification loop. Real
ordering, live quotes, live OAuth, and paid generation remain disabled until
their production evidence gates pass.

## Demo paths

Browser preview through the main Vite app:

```sh
npm run dev
```

Open the Vite URL and choose `Mobile app` in the left navigation. That preview
uses the same `apps/mobile/src/customerExperience.ts` contract as the Expo shell,
so it is useful for quick desktop inspection without a simulator.

Native Expo preview:

```sh
npm --prefix apps/mobile install
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run start
```

Open the QR code in Expo Go or launch the configured iOS/Android simulator from
the Expo terminal. A desktop browser pointed at the native Expo server can show a
JSON manifest; that is Expo metadata, not the app UI.

Repo-local validation:

```sh
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
npm test -- --run tests/mobile-contract.test.ts src/mobileRenderReadiness.test.ts
npm run mobile:render:doctor
npm run mobile:release:doctor
git diff --check
```

Live-proof blockers:

- Native emulator proof: requires iOS Simulator or Android Emulator boot logs,
  screenshots, and a native smoke transcript.
- Signed native artifact proof: requires EAS artifact URLs and signing evidence
  for iOS and Android.
- App-store proof: requires store-review submission evidence outside this
  repo-local loop.
- Live order proof: requires approved quote, payment, and retail-order mutation
  evidence with the kill switch intentionally changed by a release owner.
