import {
  hasStrongEnvSecret,
  isProductionRuntimeEnv,
  runtimeModes,
  validateDurableRuntimeEnv
} from "./runtime-env-contract.mjs";

export const authSessionSecretMessage = "Postgres API runtime requires AUTH_SESSION_SECRET to be at least 32 characters.";
export const productionRuntimeModeMessage =
  "Production API runtime requires CUSTOMCARD_API_RUNTIME=postgres. Contract and memory runtimes are reviewer-only and do not provide durable production auth/idempotency.";

export function describeApiRuntimeModeAdapters() {
  return [...runtimeModes];
}

export function resolveApiRuntimeModeAdapter({ env = process.env, factories }) {
  const configuredMode = String(env.CUSTOMCARD_API_RUNTIME ?? "").trim();
  const requestedMode = configuredMode || "contract";

  if (!runtimeModes.includes(requestedMode)) {
    return invalidRuntimeModeAdapter({
      requestedMode,
      blockers: [`Unsupported CUSTOMCARD_API_RUNTIME: ${requestedMode}. Expected contract, memory, or postgres.`]
    });
  }

  if (isProductionRuntimeEnv(env) && requestedMode !== "postgres") {
    return invalidRuntimeModeAdapter({
      requestedMode: configuredMode || "(missing)",
      blockers: [productionRuntimeModeMessage]
    });
  }

  if (isProductionRuntimeEnv(env)) {
    const blockers = durableRuntimeValidationMessages(validateDurableRuntimeEnv(env));
    if (blockers.length > 0) {
      return invalidRuntimeModeAdapter({ requestedMode, blockers });
    }
  }

  if (requestedMode === "postgres" && !hasStrongEnvSecret(env, "AUTH_SESSION_SECRET")) {
    return invalidRuntimeModeAdapter({ requestedMode, blockers: [authSessionSecretMessage] });
  }

  return {
    mode: requestedMode,
    requestedMode,
    create: factories[requestedMode]
  };
}

export function durableRuntimeValidationMessages(report) {
  return [
    ...report.missing.map((key) => `CustomCard runtime missing env: ${key}`),
    ...report.placeholders.map((key) => `CustomCard runtime has placeholder env: ${key}`),
    ...report.blockers
  ];
}

function invalidRuntimeModeAdapter({ requestedMode, blockers }) {
  return {
    mode: "invalid",
    requestedMode,
    blockers,
    create: undefined
  };
}
