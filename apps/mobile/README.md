# CustomCard Mobile Shell

This is the iOS/Android customer app boundary. The current shell mirrors the web
customer panel: card queue, approved memory review, local scripted chat, free SVG
render path, and manual vendor handoff. The customer state lives in
`src/customerExperience.ts`, a pure contract module tested by the root Vitest
suite and inspected by the mobile doctor.

It uses static demo state because the repo-local verification loop does not run a
hosted API server, native emulator, or signed platform build.

`eas.json` defines development, preview, and production native build profiles
for iOS and Android. The release doctor checks that the app config resolves
`CUSTOMCARD_API_BASE_URL` from the environment instead of hardcoding production,
keeps the shared kill switch disabled, and exposes bundle/package identifiers.
Running an EAS build and platform signing still requires Expo/React Native
tooling and credentials outside this repo-local Vite verification loop. Real
ordering remains disabled, and AI/provider adapters remain admin
credential-gated.

Repo-local validation:

```sh
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
npm run mobile:release:doctor
```
