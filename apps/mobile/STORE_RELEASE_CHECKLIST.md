# Store Release Checklist

Steps to take the CustomCard mobile app from this repo to the App Store and
Google Play. Items marked **(placeholder)** must be replaced with real assets or
account-specific values before submission.

## 0. Pre-flight

- [ ] `npm run verify` passes (typecheck, lint, format, tests).
- [ ] `npm run release:doctor` reports `status: ready`, `blockers: 0`.
- [ ] Real brand **icon and splash** replace the generated placeholders in
      `assets/` **(placeholder)**. Required: `icon.png` (1024×1024, no alpha for
      iOS), `adaptive-icon.png` (1024×1024 foreground), `splash-icon.png`.
- [ ] Confirm store identifiers in `app.config.js`: iOS
      `ios.bundleIdentifier` and Android `android.package` (currently
      `com.customcard.app`) **(placeholder — confirm ownership)**.
- [ ] Bump `expo.version` and let EAS auto-increment build numbers
      (`autoIncrement: true` in the production profile).

## 1. Accounts & credentials

- [ ] Apple Developer Program membership; App Store Connect app record created.
- [ ] Google Play Console developer account; app created.
- [ ] `eas login` and `eas init` (sets `EAS_PROJECT_ID`).
- [ ] iOS signing: let EAS manage credentials, or supply distribution
      certificate + provisioning profile.
- [ ] Android signing: let EAS manage the upload keystore, or supply your own.
- [ ] Google Play service account JSON configured for `eas submit`
      **(stored as an EAS secret, never committed)**.

## 2. Environment configuration (no secrets in the repo)

Provide via EAS environment variables / build profile `env`:

- [ ] `CUSTOMCARD_API_BASE_URL` = the production **https** API URL.
- [ ] `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` = production Clerk publishable key
      (`pk_live_…`).
- [ ] `CUSTOMCARD_APP_ENV=production`.
- [ ] `REAL_ORDER_KILL_SWITCH=disabled` (already enforced in `eas.json`).
- [ ] Clerk dashboard: production instance, allowed origins, and the mobile app
      added; backend has the matching `CLERK_JWT_KEY` / authorized parties.

## 3. Build & submit (EAS)

```sh
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

- [ ] Verify the production build points at the https API and that the
      kill switch is disabled.

## 4. Apple App Privacy ("nutrition label")

Derived from `SECURITY.md`. Configure in App Store Connect → App Privacy:

- [ ] **Contact Info → Email Address**: Collected. Linked to identity. Purpose:
      App Functionality (authentication). Not used for tracking.
- [ ] **User Content** (event metadata, memory notes, card content): Collected.
      Linked to identity. Purpose: App Functionality. Not used for tracking.
- [ ] **Contact Info → Name / Phone** (checkout pre-fill): Collected, **not**
      stored by the app; disclosed as shared with the print provider when the
      user proceeds.
- [ ] Identifiers / Location / Contacts / Usage Data / Diagnostics:
      **Not Collected**.
- [ ] Tracking: **No** (no ATT prompt; no third-party tracking SDKs).
- [ ] `ITSAppUsesNonExemptEncryption=false` is set in `app.config.js`
      (standard TLS only).

## 5. Google Play Data safety

- [ ] **Personal info → Email address**: Collected, encrypted in transit,
      purpose App functionality / Account management. Not shared for ads.
- [ ] **App activity / User content** (events, memories, cards): Collected,
      encrypted in transit, App functionality.
- [ ] **Name / Phone** for checkout: collected transiently, shared with the
      print provider (Walgreens) when the user proceeds.
- [ ] Location / Contacts / Financial info / Device IDs: **Not collected** by the
      app (payment handled on the print shop's hosted page).
- [ ] Data deletion: link the in-app Privacy → "Request deletion" flow
      (`/api/data-requests`) and/or a web deletion URL.
- [ ] Declare encryption in transit = Yes.

## 6. Store listing metadata (placeholder)

- [ ] App name: **CustomCard** — subtitle/short description.
- [ ] Full description, keywords, support URL, marketing URL.
- [ ] Privacy policy URL **(placeholder)** and terms URL **(placeholder)**.
- [ ] Category: e.g. Lifestyle / Productivity.
- [ ] Age rating questionnaire completed.
- [ ] Screenshots **(placeholder)**: iPhone 6.7" & 6.5", iPad if supported;
      Android phone + tablet. Capture the Home, Card studio, Proof & print, and
      Checkout screens.
- [ ] App icon uploaded (matches `assets/icon.png`).

## 7. Manual on-device smoke test

Device E2E automation is not available in this repo; run this manual pass on at
least one iOS and one Android device/simulator before release:

1. [ ] Launch → sign in (Clerk email code on a real build; dev token locally).
2. [ ] Home loads today's card, the queue, and the "confirm before checkout"
       banner; pull-to-refresh works.
3. [ ] Events → Import an event: paste an invite, see a card opportunity.
4. [ ] Card studio: fill sender/recipient/relationship, draft a card, see the
       panel preview; reopen the app and confirm the draft resumed.
5. [ ] Memories: approve and forget a note.
6. [ ] Proof & print: create project → build proof → review checks → approve;
       confirm print options and checkout are locked until approval.
7. [ ] Print options: estimates shown with "confirm on the shop's site" notice.
8. [ ] Checkout: readiness shown; on an enabled deployment, contact form opens
       the Walgreens hosted page in the browser.
9. [ ] Settings → Privacy: submit an export request; sign out and confirm you
       return to the sign-in screen with no cached data.
10. [ ] Toggle airplane mode: the offline banner appears and cached screens
        still render.

## 8. Post-submit

- [ ] Monitor EAS build/submit status and store review feedback.
- [ ] Keep `react`/`react-dom`/`react-test-renderer` pinned to match the
      React Native renderer when upgrading Expo (see `package.json` overrides).
