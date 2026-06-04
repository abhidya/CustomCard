# CustomCard Mobile Shell

This is the iOS/Android customer app boundary. The current app shell mirrors the
web customer panel and adds a mobile-specific workflow contract: Google/Apple
entry points, calendar/email/invite import actions, card queue items, customer
approval controls, approved memory review, local scripted chat, card proof path,
best available pickup/shipped fulfillment recommendations, offline idempotent
sync, locale readiness, and checkout confirmation. The customer state lives in
`src/customerExperience.ts`, a pure contract module tested by the root Vitest
suite and inspected by the mobile doctor.

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

Repo-local validation:

```sh
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
npm run mobile:release:doctor
```
