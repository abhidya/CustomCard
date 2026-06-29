# Building installable apps (APK / iOS)

This app uses Expo's managed workflow (Continuous Native Generation), so the
native `android/` and `ios/` projects are **generated from config**, not stored
in git. There are two ways to produce an installable build.

## Prerequisites

- **EAS path (recommended, no local SDK needed):** an Expo account + `eas-cli`
  (`npm i -g eas-cli`), then `eas login` and `eas init` once.
- **Local Gradle path:** JDK 17+ and the Android SDK (platform-tools,
  build-tools, a platform such as android-35) with `ANDROID_HOME` set. This
  sandbox blocks the Google SDK download, so local builds must run on a machine
  with the SDK installed.

Provide non-secret config via env / EAS environment variables:
`CUSTOMCARD_APP_ENV=qa|production`, `CUSTOMCARD_QA_API_BASE_URL` (https),
`CUSTOMCARD_PRODUCTION_API_BASE_URL` (https), optional matching
`CUSTOMCARD_API_BASE_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback`, and
the disabled order safety state.

## Android APK

### A. EAS cloud build (produces a downloadable .apk)

```sh
cd apps/mobile
npm run build:android:apk          # profile "apk": release-style standalone APK
# or, for an internal test build:
npm run build:android:apk:preview  # profile "preview": internal-distribution APK
```

Both `apk` and `preview` profiles set `android.buildType: "apk"` in `eas.json`,
so EAS returns an installable `.apk` (not an `.aab`). EAS prints a download URL
and a QR code when the build finishes.

### B. Local Gradle build (machine with the Android SDK)

```sh
cd apps/mobile
export CUSTOMCARD_QA_API_BASE_URL=https://your-qa-api.example
export CUSTOMCARD_PRODUCTION_API_BASE_URL=https://your-prod-api.example
export EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
export CUSTOMCARD_OAUTH_REDIRECT_URL=customcard://sso-callback
export CUSTOMCARD_APP_ENV=qa
npm run build:android:apk:gradle
# -> apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

`build:android:apk:gradle` runs `expo prebuild --platform android --clean`
(generates the native project, verified working in this repo) then
`./gradlew assembleRelease`. A debug APK (`./gradlew assembleDebug`) is also
installable and is signed with the Android debug keystore.

> Signing: the generated `release` build type is debug-signed by default. For a
> store/production APK, supply a real upload keystore — let EAS manage it
> (recommended) or configure `android/app` signing per the React Native
> "Generating a signed APK" guide. Never commit a keystore.

## iOS equivalent

iOS has no "APK"; the analogous artifacts are a simulator `.app` or a signed
`.ipa`:

```sh
eas build --platform ios --profile preview      # simulator-runnable build
eas build --platform ios --profile production    # signed .ipa for TestFlight/App Store
```

`eas.json`'s `preview` profile sets `ios.simulator: true`. A signed device build
requires an Apple Developer account and EAS-managed credentials.

## Notes

- The native projects are gitignored on purpose; regenerate with
  `npm run prebuild:android` (or `expo prebuild`). Prebuild was verified to
  generate a clean Android Gradle project for `com.customcard.app`.
- See `STORE_RELEASE_CHECKLIST.md` for the full submission flow and
  `SECURITY.md` for the keystore/secret handling rules.
