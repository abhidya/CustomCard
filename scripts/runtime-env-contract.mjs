export const runtimeModes = Object.freeze(["contract", "memory", "postgres"]);
export const productionEnvNames = Object.freeze(["prod", "production"]);
export const mobileAppEnvNames = Object.freeze(["qa", "production"]);

export const durableRuntimeRequiredEnv = Object.freeze([
  "CUSTOMCARD_ENV",
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "OBJECT_STORE_URL",
  "OBJECT_STORE_SIGNING_SECRET",
  "AUTH_SESSION_SECRET",
  "CLERK_JWT_KEY",
  "CLERK_AUTHORIZED_PARTIES",
  "CLERK_ISSUER",
  "CLERK_AUDIENCE"
]);

export const workerRequiredEnv = durableRuntimeRequiredEnv;

export const mobileRequiredEnv = Object.freeze([
  "CUSTOMCARD_APP_ENV",
  "CUSTOMCARD_OAUTH_REDIRECT_URL",
  "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"
]);

export const mobileApiBaseUrlEnv = Object.freeze([
  "CUSTOMCARD_API_BASE_URL",
  "CUSTOMCARD_QA_API_BASE_URL",
  "CUSTOMCARD_PRODUCTION_API_BASE_URL"
]);

export const runtimePlaceholderPattern = /replace-me|placeholder|changeme|__set_|example/i;

export function runtimeMode(env = process.env) {
  return String(env.CUSTOMCARD_API_RUNTIME ?? "").trim();
}

export function isProductionRuntimeEnv(env = process.env) {
  const customCardEnv = String(env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV ?? "").trim().toLowerCase();
  return productionEnvNames.includes(customCardEnv) || nodeEnv === "production";
}

export function missingEnv(env, keys) {
  return keys.filter((key) => !env[key]);
}

export function placeholderEnv(env, keys) {
  return keys.filter((key) => runtimePlaceholderPattern.test(env[key] ?? ""));
}

export function hasStrongEnvSecret(env, key, minLength = 32) {
  return String(env[key] ?? "").length >= minLength;
}

export function validateDurableRuntimeEnv(env = process.env) {
  const missing = missingEnv(env, durableRuntimeRequiredEnv);
  const placeholders = placeholderEnv(env, durableRuntimeRequiredEnv);
  const mode = runtimeMode(env);
  const blockers = [];

  if (!runtimeModes.includes(mode)) {
    blockers.push(`CustomCard runtime requires CUSTOMCARD_API_RUNTIME to be one of: ${runtimeModes.join(", ")}.`);
  }
  if (isProductionRuntimeEnv(env) && mode !== "postgres") {
    blockers.push("CustomCard production runtime requires CUSTOMCARD_API_RUNTIME=postgres.");
  }
  if (!hasStrongEnvSecret(env, "AUTH_SESSION_SECRET")) {
    blockers.push("CustomCard runtime requires AUTH_SESSION_SECRET to be at least 32 characters.");
  }
  if (!hasStrongEnvSecret(env, "OBJECT_STORE_SIGNING_SECRET")) {
    blockers.push("CustomCard runtime requires OBJECT_STORE_SIGNING_SECRET to be at least 32 characters.");
  }

  return { missing, placeholders, blockers, runtimeMode: mode };
}

export function validateWorkerRuntimeEnv(env = process.env, { requirePostgres = false } = {}) {
  const blockers = [
    ...missingEnv(env, workerRequiredEnv).map((key) => `CustomCard worker missing env: ${key}`),
    ...placeholderEnv(env, workerRequiredEnv).map((key) => `CustomCard worker has placeholder env: ${key}`)
  ];
  const mode = runtimeMode(env);

  if (!runtimeModes.includes(mode)) {
    blockers.push(`CustomCard worker requires CUSTOMCARD_API_RUNTIME to be one of: ${runtimeModes.join(", ")}.`);
  }
  if ((isProductionRuntimeEnv(env) || requirePostgres) && mode !== "postgres") {
    blockers.push("CustomCard worker execution requires CUSTOMCARD_API_RUNTIME=postgres.");
  }
  if (!hasStrongEnvSecret(env, "AUTH_SESSION_SECRET")) {
    blockers.push("CustomCard worker requires AUTH_SESSION_SECRET to be at least 32 characters.");
  }
  if (!hasStrongEnvSecret(env, "OBJECT_STORE_SIGNING_SECRET")) {
    blockers.push("CustomCard worker requires OBJECT_STORE_SIGNING_SECRET to be at least 32 characters.");
  }

  return blockers;
}

export function validateMobileRuntimeEnv(env = process.env) {
  const blockers = [
    ...missingEnv(env, mobileRequiredEnv).map((key) => `Mobile shell missing env: ${key}`),
    ...placeholderEnv(env, mobileRequiredEnv).map((key) => `Mobile shell has placeholder env: ${key}`)
  ];
  const appEnv = normalizeMobileAppEnv(env.CUSTOMCARD_APP_ENV);
  const { apiBaseUrl, selectedApiBaseUrlKey, apiBaseUrlSourceName, conflict } =
    resolveMobileApiBaseUrl(env, appEnv);
  const oauthRedirectUrl = String(env.CUSTOMCARD_OAUTH_REDIRECT_URL ?? "").trim();
  const clerkPublishableKey = String(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
  const apiPlaceholderKey = selectedApiBaseUrlKey
    ? placeholderEnv(env, [selectedApiBaseUrlKey])[0]
    : "";

  if (env.CUSTOMCARD_APP_ENV && !appEnv) {
    blockers.push("Mobile shell CUSTOMCARD_APP_ENV must be qa or production.");
  }
  if (!apiBaseUrl) {
    blockers.push(`Mobile shell missing env: ${apiBaseUrlSourceName}`);
  }
  if (apiPlaceholderKey) {
    blockers.push(`Mobile shell has placeholder env: ${apiPlaceholderKey}`);
  }
  if (conflict) {
    blockers.push(`Mobile shell ${apiBaseUrlSourceName} must not conflict with CUSTOMCARD_API_BASE_URL.`);
  }
  if (apiBaseUrl && !apiBaseUrl.startsWith("https://")) {
    blockers.push(`Mobile shell ${apiBaseUrlSourceName} must be an https:// URL.`);
  }
  if (oauthRedirectUrl && !/^customcard:\/\/sso-callback\/?$/.test(oauthRedirectUrl)) {
    blockers.push("Mobile shell CUSTOMCARD_OAUTH_REDIRECT_URL must be customcard://sso-callback.");
  }
  if (clerkPublishableKey && !/^pk_(test|live)_/.test(clerkPublishableKey)) {
    blockers.push("Mobile shell EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a Clerk publishable key.");
  }
  if (appEnv === "production" && clerkPublishableKey && !clerkPublishableKey.startsWith("pk_live_")) {
    blockers.push("Mobile production shell requires a Clerk live publishable key.");
  }
  if (appEnv === "qa" && clerkPublishableKey && !clerkPublishableKey.startsWith("pk_test_")) {
    blockers.push("Mobile QA shell requires a Clerk test publishable key.");
  }

  return blockers;
}

export function resolveMobileApiBaseUrl(env = process.env, appEnv = normalizeMobileAppEnv(env.CUSTOMCARD_APP_ENV)) {
  const explicit = normalizeMobileUrl(env.CUSTOMCARD_API_BASE_URL);
  const qa = normalizeMobileUrl(env.CUSTOMCARD_QA_API_BASE_URL);
  const production = normalizeMobileUrl(env.CUSTOMCARD_PRODUCTION_API_BASE_URL);
  const selectedApiBaseUrlKey =
    appEnv === "production" && production
      ? "CUSTOMCARD_PRODUCTION_API_BASE_URL"
      : appEnv === "qa" && qa
        ? "CUSTOMCARD_QA_API_BASE_URL"
        : explicit
          ? "CUSTOMCARD_API_BASE_URL"
          : "";
  const apiBaseUrl =
    appEnv === "production" ? production || explicit : appEnv === "qa" ? qa || explicit : explicit;
  const apiBaseUrlSourceName =
    appEnv === "production"
      ? "CUSTOMCARD_PRODUCTION_API_BASE_URL or CUSTOMCARD_API_BASE_URL"
      : appEnv === "qa"
        ? "CUSTOMCARD_QA_API_BASE_URL or CUSTOMCARD_API_BASE_URL"
        : "CUSTOMCARD_API_BASE_URL";

  const conflict =
    explicit &&
    ((appEnv === "production" && production && explicit !== production) ||
      (appEnv === "qa" && qa && explicit !== qa));

  return {
    apiBaseUrl,
    selectedApiBaseUrlKey,
    apiBaseUrlSourceName,
    conflict
  };
}

export function normalizeMobileAppEnv(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "qa" || normalized === "staging" || normalized === "preview") return "qa";
  if (normalized === "production" || normalized === "prod") return "production";
  return "";
}

function normalizeMobileUrl(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}
