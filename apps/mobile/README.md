# CustomCard Mobile Shell

This is the iOS/Android customer app boundary. The current shell mirrors the web
customer panel: card queue, approved memory review, local scripted chat, free SVG
render path, and manual vendor handoff. The customer state lives in
`src/customerExperience.ts`, a pure contract module tested by the root Vitest
suite and inspected by the mobile doctor.

It uses static demo state because the repo-local verification loop does not run a
hosted API server, native emulator, or platform build.

Native builds require Expo/React Native tooling and platform signing outside this
repo-local Vite verification loop. Real ordering remains disabled by the shared
kill switch, and AI/provider adapters remain admin credential-gated.

Repo-local validation:

```sh
CUSTOMCARD_API_BASE_URL=http://127.0.0.1:5173 REAL_ORDER_KILL_SWITCH=disabled npm --prefix apps/mobile run doctor
```
