const apiBaseUrl = process.env.CUSTOMCARD_API_BASE_URL;
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const oauthRedirectUrl = process.env.CUSTOMCARD_OAUTH_REDIRECT_URL;
const appEnv = normalizeAppEnv(process.env.CUSTOMCARD_APP_ENV);
const realOrderKillSwitch = process.env.REAL_ORDER_KILL_SWITCH ?? "disabled";

if (!apiBaseUrl) {
  throw new Error("CUSTOMCARD_API_BASE_URL is required for the mobile app shell.");
}
if (!apiBaseUrl.startsWith("https://")) {
  throw new Error("CUSTOMCARD_API_BASE_URL must be an https:// API base URL.");
}
if (!appEnv) {
  throw new Error("CUSTOMCARD_APP_ENV must be qa or production.");
}
if (!/^pk_(test|live)_/.test(clerkPublishableKey ?? "")) {
  throw new Error("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key.");
}
if (appEnv === "production" && !clerkPublishableKey.startsWith("pk_live_")) {
  throw new Error("Production mobile builds require a Clerk live publishable key.");
}
if (!oauthRedirectUrl) {
  throw new Error("CUSTOMCARD_OAUTH_REDIRECT_URL is required for mobile OAuth.");
}
if (!/^customcard:\/\/sso-callback\/?$/.test(oauthRedirectUrl)) {
  throw new Error("CUSTOMCARD_OAUTH_REDIRECT_URL must be customcard://sso-callback.");
}
if (realOrderKillSwitch !== "disabled") {
  throw new Error("REAL_ORDER_KILL_SWITCH must stay disabled until retail certification is recorded.");
}

// Non-secret, public client configuration only. Secrets (Clerk secret key,
// provider credentials, object-store keys) stay server-side and must never be
// referenced here.
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
      oauthRedirectUrl,
      realOrderKillSwitch,
      eas: easProjectId ? { projectId: easProjectId } : undefined
    }
  }
});

function normalizeAppEnv(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "qa" || normalized === "staging" || normalized === "preview") return "qa";
  if (normalized === "production" || normalized === "prod") return "production";
  return "";
}
