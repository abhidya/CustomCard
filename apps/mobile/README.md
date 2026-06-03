# CustomCard Mobile Shell

This is the iOS/Android app shell boundary. It is intentionally thin: the web, iOS,
and Android clients must use the same API contracts for event import, memory
review, print approval, and order recovery.

Native builds require Expo/React Native tooling and platform signing outside this
repo-local Vite verification loop. Real ordering remains disabled by the shared
kill switch.
