import Constants from "expo-constants";

export type AppEnv = "qa" | "production";

export interface AppConfig {
  apiBaseUrl: string;
  appEnv: AppEnv;
  clerkPublishableKey: string;
  oauthRedirectUrl: string;
  realOrderKillSwitch: "disabled" | "enabled";
}

interface RawExtra {
  apiBaseUrl?: unknown;
  appEnv?: unknown;
  clerkPublishableKey?: unknown;
  oauthRedirectUrl?: unknown;
  realOrderKillSwitch?: unknown;
}

type ExpoManifestExtra = RawExtra & {
  expoClient?: {
    extra?: RawExtra;
  };
};

interface ExpoRuntimeConstants {
  expoConfig?: {
    extra?: RawExtra;
  } | null;
  manifest?: {
    extra?: ExpoManifestExtra;
  } | null;
  manifest2?: {
    extra?: {
      expoClient?: {
        extra?: RawExtra;
      };
    };
  } | null;
}

export class ConfigError extends Error {}

export function resolveAppConfig(
  extra: RawExtra | undefined = resolveExpoConfigExtra(),
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
  const oauthRedirectUrl = String(extra?.oauthRedirectUrl ?? "").trim();
  if (!oauthRedirectUrl) {
    throw new ConfigError("CUSTOMCARD_OAUTH_REDIRECT_URL is required for mobile OAuth.");
  }
  if (!/^customcard:\/\/sso-callback\/?$/.test(oauthRedirectUrl)) {
    throw new ConfigError("CUSTOMCARD_OAUTH_REDIRECT_URL must be customcard://sso-callback.");
  }

  return {
    apiBaseUrl,
    appEnv,
    clerkPublishableKey,
    oauthRedirectUrl,
    realOrderKillSwitch: extra?.realOrderKillSwitch === "enabled" ? "enabled" : "disabled"
  };
}

export function resolveExpoConfigExtra(
  constants: ExpoRuntimeConstants = Constants as ExpoRuntimeConstants
): RawExtra | undefined {
  const extras = [
    constants.expoConfig?.extra,
    constants.manifest?.extra,
    constants.manifest?.extra?.expoClient?.extra,
    constants.manifest2?.extra?.expoClient?.extra
  ].filter(isRawExtra);

  if (extras.length === 0) return undefined;
  return Object.assign({}, ...extras);
}

function isRawExtra(value: unknown): value is RawExtra {
  return Boolean(value && typeof value === "object");
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
