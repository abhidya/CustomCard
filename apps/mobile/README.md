# CustomCard Mobile Shell

This is the iOS/Android customer app boundary. The current shell mirrors the web
customer panel: card queue, approved memory review, local scripted chat, free SVG
render path, and manual vendor handoff. It uses static demo state because the
repo-local verification loop does not run a hosted API server or native build.

Native builds require Expo/React Native tooling and platform signing outside this
repo-local Vite verification loop. Real ordering remains disabled by the shared
kill switch, and AI/provider adapters remain admin credential-gated.
