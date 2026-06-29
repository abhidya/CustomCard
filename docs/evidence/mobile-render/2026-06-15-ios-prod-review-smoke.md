# iOS Production-Mode Review Smoke

Captured: 2026-06-15

## Command

```sh
CUSTOMCARD_APP_ENV=qa \
CUSTOMCARD_API_BASE_URL=https://api.qa.customcard.test \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback \
EXPO_UNSTABLE_HEADLESS=1 \
npm exec expo start -- --localhost --ios --no-dev --minify --port 8082 --clear
```

## Device And Bundle

- Simulator: iPhone 17 Pro, iOS 26.4
- Metro URL: `exp://127.0.0.1:8082`
- Bundle mode: Expo Go production JavaScript bundle, `--no-dev --minify`
- Bundle output: `iOS Bundled 20282ms node_modules/expo/AppEntry.js (1157 modules)`
- Screenshot: `docs/evidence/mobile-render/2026-06-15-ios-prod-review-smoke.png`
- Screenshot dimensions: 1206 x 2622
- Screenshot SHA-256: `bdd8b1541f6e5bdfdffef0a0d3e31c4ee233e3d799b08563588b4c0fc5f281e2`

## Observed

- The signed-out customer shell opens directly on the product-first `Create` tab.
- The session-token gate is not shown.
- Primary card-making CTA, invite/calendar CTA, example-card link, and bottom tabs render.
- The bottom tabs are `Create`, `My cards`, `People`, and `Settings`.
- No macOS "React Native DevTools is damaged" popup was required for this run because the review server used `EXPO_UNSTABLE_HEADLESS=1`.

## Boundary

This is an iOS Expo Go simulator smoke artifact. It is not a complete emulator render proof, not a tooling-free release screenshot, not a signed native artifact, not an App Store or Play Store review, and not live retail-order proof.

The screenshot still shows the Expo Go `Tools` bubble. A clean product screenshot still requires an EAS/development-client or Release simulator build that does not render Expo Go tooling chrome. The remaining native proof matrix also needs small-phone, large-phone, tablet, print-proof, RTL, and signed-artifact evidence before mobile can be called production/live ready.
