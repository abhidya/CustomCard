const apiBaseUrl = process.env.CUSTOMCARD_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("CUSTOMCARD_API_BASE_URL is required for the mobile app shell.");
}

// Non-secret, public client configuration only. Secrets (Clerk secret key,
// provider credentials, object-store keys) stay server-side and must never be
// referenced here.
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const appEnv = process.env.CUSTOMCARD_APP_ENV ?? "development";
const easProjectId = process.env.EAS_PROJECT_ID ?? "";

module.exports = () => ({
  expo: {
    name: "CustomCard",
    slug: "customcard",
    version: "0.1.0",
    platforms: ["ios", "android"],
    scheme: "customcard",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#172927"
    },
    ios: {
      bundleIdentifier: "com.customcard.app",
      supportsTablet: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.customcard.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#172927"
      },
      // Only the implicit INTERNET permission is needed; request nothing else.
      permissions: [],
      // HTTPS only. Never allow cleartext production traffic.
      usesCleartextTraffic: false
    },
    extra: {
      apiBaseUrl,
      appEnv,
      clerkPublishableKey,
      realOrderKillSwitch: process.env.REAL_ORDER_KILL_SWITCH ?? "disabled",
      eas: easProjectId ? { projectId: easProjectId } : undefined
    }
  }
});
