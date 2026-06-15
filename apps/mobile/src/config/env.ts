import Constants from "expo-constants";

export type AppEnv = "qa" | "production";

export interface AppConfig {
  apiBaseUrl: string;
  appEnv: AppEnv;
  clerkPublishableKey: string;
  realOrderKillSwitch: "disabled" | "enabled";
}

interface RawExtra {
  apiBaseUrl?: unknown;
  appEnv?: unknown;
  clerkPublishableKey?: unknown;
  realOrderKillSwitch?: unknown;
}

export class ConfigError extends Error {}

export function resolveAppConfig(
  extra: RawExtra | undefined = Constants.expoConfig?.extra as RawExtra | undefined,
  _isDevBuild: boolean = __DEV__
): AppConfig {
  const apiBaseUrl = normalizeBaseUrl(String(extra?.apiBaseUrl ?? ""));
  const appEnv = normalizeEnv(String(extra?.appEnv ?? ""));

  if (!apiBaseUrl) {
    throw new ConfigError("CUSTOMCARD_API_BASE_URL is required for the mobile app shell.");
  }
  if (!apiBaseUrl.startsWith("https://")) {
    throw new ConfigError("CUSTOMCARD_API_BASE_URL must be an https:// API base URL.");
  }
  if (!appEnv) {
    throw new ConfigError("CUSTOMCARD_APP_ENV must be qa or production.");
  }

  const clerkPublishableKey = String(extra?.clerkPublishableKey ?? "").trim();
  if (!/^pk_(test|live)_/.test(clerkPublishableKey)) {
    throw new ConfigError("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key.");
  }
  if (appEnv === "production" && !clerkPublishableKey.startsWith("pk_live_")) {
    throw new ConfigError("Production mobile builds require a Clerk live publishable key.");
  }

  return {
    apiBaseUrl,
    appEnv,
    clerkPublishableKey,
    realOrderKillSwitch: extra?.realOrderKillSwitch === "enabled" ? "enabled" : "disabled"
  };
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizeEnv(value: string): AppEnv | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "qa" || normalized === "staging" || normalized === "preview") return "qa";
  if (normalized === "production" || normalized === "prod") return "production";
  return null;
}

let cached: AppConfig | null = null;

export function appConfig(): AppConfig {
  if (!cached) cached = resolveAppConfig();
  return cached;
}
