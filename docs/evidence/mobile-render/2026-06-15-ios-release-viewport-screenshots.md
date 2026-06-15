# iOS Release Viewport Screenshots

Captured: 2026-06-15

## Command

The React Native DevTools bundle was not required for this proof. The app was
built as a native Release simulator app, installed with `xcrun simctl install`,
launched directly with `xcrun simctl launch`, and captured with
`xcrun simctl io screenshot`.

```sh
CUSTOMCARD_APP_ENV=qa \
CUSTOMCARD_QA_API_BASE_URL=https://api.qa.customcard.test \
CUSTOMCARD_PRODUCTION_API_BASE_URL=https://api.customcard.test \
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... \
CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback \
REAL_ORDER_KILL_SWITCH=disabled \
xcodebuild -workspace ios/CustomCard.xcworkspace \
  -scheme CustomCard \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "id=C07F77FA-8696-4316-95B5-DEAFEC459AE0" \
  ONLY_ACTIVE_ARCH=YES \
  ARCHS=x86_64 \
  build
```

## Device And Build

- App bundle id: `com.customcard.app`
- Build configuration: `Release-iphonesimulator`
- Xcode result: `Build Succeeded`
- App binary architecture: `x86_64`
- `UIDeviceFamily`: `[1, 2]`

## Verified Screenshots

| Viewport | Simulator | Screenshot | Dimensions | SHA-256 |
| --- | --- | --- | --- | --- |
| Compact phone | CustomCard iPhone SE Proof, iOS 26.4 | `docs/evidence/mobile-render/2026-06-15-ios-release-iphone-se.png` | 750 x 1334 | `41a941275607acbd3decaf3a56582623f2f08a7256cb81f7b1fb3898ac42d831` |
| Standard phone | iPhone 17 Pro, iOS 26.4 | `docs/evidence/mobile-render/2026-06-15-ios-release-standard-phone.png` | 1206 x 2622 | `1059d60b985e978f02a7a9c0ff094a302d7f58563b4c64e5bab123fe83d99fe6` |
| Large phone | iPhone 17 Pro Max, iOS 26.4 | `docs/evidence/mobile-render/2026-06-15-ios-release-large-phone.png` | 1320 x 2868 | `77fa4dfb91304732d81086bc3e202c2f84a1f117cb312215be21ed0482d1726c` |
| Tablet portrait | iPad (A16), iOS 26.4 | `docs/evidence/mobile-render/2026-06-15-ios-release-tablet-portrait.png` | 1640 x 2360 | `977134e91b271b8ec2ec29e9a0aec1d55cd85b9eea8566c1b1ab7e79fbe8fd81` |

## Observed

- The installed Release app launches directly without React Native DevTools,
  Expo Go, or a local Metro server.
- The session-token gate is not shown.
- The product-first `Create` tab renders with the card hero, primary CTA,
  invite/calendar CTA on the standard and large phone viewports, and bottom
  tabs.
- The tablet viewport renders the same product-first shell with the bottom tab
  bar and without a local session-token prompt.
- The compact phone viewport keeps the primary content and tab bar visible
  without horizontal overflow.

## Boundary

This is compact-phone, standard-phone, large-phone, and tablet Release simulator
evidence for the installed native app home screen. It is not the full mobile render proof matrix:
print-proof, RTL, signed iOS/Android artifact, store review, and live
retail-order evidence remain required before mobile can be called
production/live ready.
