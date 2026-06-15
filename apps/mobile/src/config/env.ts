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
  qaApiBaseUrl?: unknown;
  productionApiBaseUrl?: unknown;
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
  const appEnv = normalizeEnv(String(extra?.appEnv ?? ""));
  const { apiBaseUrl, sourceName } = resolveEnvironmentApiBaseUrl(extra, appEnv);

  if (!apiBaseUrl) {
    throw new ConfigError(`${sourceName} is required for the mobile app shell.`);
  }
  if (!apiBaseUrl.startsWith("https://")) {
    throw new ConfigError(`${sourceName} must be an https:// API base URL.`);
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
  if (appEnv === "qa" && !clerkPublishableKey.startsWith("pk_test_")) {
    throw new ConfigError("QA mobile builds require a Clerk test publishable key.");
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

function resolveEnvironmentApiBaseUrl(extra: RawExtra | undefined, appEnv: AppEnv | null) {
  const explicit = normalizeBaseUrl(String(extra?.apiBaseUrl ?? ""));
  const qa = normalizeBaseUrl(String(extra?.qaApiBaseUrl ?? ""));
  const production = normalizeBaseUrl(String(extra?.productionApiBaseUrl ?? ""));
  const envSpecific = appEnv === "production" ? production : appEnv === "qa" ? qa : "";
  const sourceName =
    appEnv === "production"
      ? "CUSTOMCARD_PRODUCTION_API_BASE_URL or CUSTOMCARD_API_BASE_URL"
      : appEnv === "qa"
        ? "CUSTOMCARD_QA_API_BASE_URL or CUSTOMCARD_API_BASE_URL"
        : "CUSTOMCARD_API_BASE_URL";

  if (explicit && envSpecific && explicit !== envSpecific) {
    throw new ConfigError(`${sourceName} must not conflict with CUSTOMCARD_API_BASE_URL.`);
  }

  return { apiBaseUrl: envSpecific || explicit, sourceName };
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
