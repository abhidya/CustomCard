export const runtimeModes = Object.freeze(["contract", "memory", "postgres"]);
export const productionEnvNames = Object.freeze(["prod", "production"]);

export const durableRuntimeRequiredEnv = Object.freeze([
  "CUSTOMCARD_ENV",
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "OBJECT_STORE_URL",
  "OBJECT_STORE_SIGNING_SECRET",
  "AUTH_SESSION_SECRET",
  "REAL_ORDER_KILL_SWITCH"
]);

export const workerRequiredEnv = durableRuntimeRequiredEnv;

export const mobileRequiredEnv = Object.freeze(["CUSTOMCARD_API_BASE_URL"]);

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
  if (env.REAL_ORDER_KILL_SWITCH !== "disabled") {
    blockers.push("CustomCard runtime requires REAL_ORDER_KILL_SWITCH=disabled until certification is recorded.");
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
  if (env.REAL_ORDER_KILL_SWITCH !== "disabled") {
    blockers.push("CustomCard worker requires REAL_ORDER_KILL_SWITCH=disabled until certification is recorded.");
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
  return [
    ...missingEnv(env, mobileRequiredEnv).map((key) => `Mobile shell missing env: ${key}`),
    ...placeholderEnv(env, mobileRequiredEnv).map((key) => `Mobile shell has placeholder env: ${key}`)
  ];
}
