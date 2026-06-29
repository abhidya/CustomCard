# iOS Release Simulator Home Render

Captured: 2026-06-15

## Command

```sh
CUSTOMCARD_APP_ENV=qa \
CUSTOMCARD_QA_API_BASE_URL=https://api.qa.customcard.test \
CUSTOMCARD_PRODUCTION_API_BASE_URL=https://api.customcard.test \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback \
npm exec expo run:ios -- --configuration Release --device "iPhone 17 Pro"
```

After the native build installed `com.customcard.app`, the simulator was rebooted
to clear the stale Expo Go handoff prompt, then the installed app was launched
directly:

```sh
xcrun simctl boot C07F77FA-8696-4316-95B5-DEAFEC459AE0
xcrun simctl launch C07F77FA-8696-4316-95B5-DEAFEC459AE0 com.customcard.app
xcrun simctl io C07F77FA-8696-4316-95B5-DEAFEC459AE0 screenshot \
  docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.png
```

## Device And Build

- Simulator: iPhone 17 Pro, iOS 26.4
- App bundle id: `com.customcard.app`
- Build configuration: `Release-iphonesimulator`
- Xcode result: `Build Succeeded`
- Screenshot: `docs/evidence/mobile-render/2026-06-15-ios-release-simulator-home.png`
- Screenshot dimensions: 1206 x 2622
- Screenshot SHA-256: `4b87b8abe32fbe99b0e024c9972bbde881e5644b357dcd4586fcc424652f407e`

## Observed

- The installed CustomCard app launches without the Expo Go Tools overlay.
- The signed-out customer shell opens on the product-first `Create` tab.
- The session-token gate is not shown.
- The primary CTA, invite/calendar CTA, example-card link, and bottom tabs render.
- Bottom tabs are `Create`, `My cards`, `People`, and `Settings`.

## Boundary

This is a tooling-free iOS release-simulator home-screen proof for the installed
native app. It is not the full mobile render proof matrix: small-phone,
large-phone, tablet, print-proof, RTL, signed iOS/Android artifact, store
review, and live retail-order evidence remain required before mobile can be
called production/live ready.
