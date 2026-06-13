import Constants from "expo-constants";

export type AppEnv = "development" | "staging" | "production";

export interface AppConfig {
  apiBaseUrl: string;
  appEnv: AppEnv;
  clerkPublishableKey: string;
  realOrderKillSwitch: "disabled" | "enabled";
  /** True when the dev-only local session-token sign-in may be offered. */
  devSessionSignInAllowed: boolean;
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
  isDevBuild: boolean = __DEV__
): AppConfig {
  const apiBaseUrl = normalizeBaseUrl(String(extra?.apiBaseUrl ?? ""));
  const appEnv = normalizeEnv(String(extra?.appEnv ?? "development"));

  if (!apiBaseUrl) {
    throw new ConfigError("CUSTOMCARD_API_BASE_URL is required for the mobile app shell.");
  }
  if (!/^https?:\/\//.test(apiBaseUrl)) {
    throw new ConfigError("API base URL must be an http(s) URL.");
  }
  // HTTPS only outside local development. Cleartext production API traffic is
  // never allowed (see SECURITY.md).
  if (apiBaseUrl.startsWith("http://") && !(isDevBuild && appEnv === "development")) {
    throw new ConfigError("Non-development builds require an https:// API base URL.");
  }

  const clerkPublishableKey = String(extra?.clerkPublishableKey ?? "").trim();
  return {
    apiBaseUrl,
    appEnv,
    clerkPublishableKey,
    realOrderKillSwitch: extra?.realOrderKillSwitch === "enabled" ? "enabled" : "disabled",
    devSessionSignInAllowed: isDevBuild && appEnv === "development"
  };
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function normalizeEnv(value: string): AppEnv {
  if (value === "production" || value === "staging") return value;
  return "development";
}

let cached: AppConfig | null = null;

export function appConfig(): AppConfig {
  if (!cached) cached = resolveAppConfig();
  return cached;
}
