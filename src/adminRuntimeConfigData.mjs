import {
  adapterMissingEnv,
  buildDefaultAiFlowAdminConfigs,
  normalizeAiFlowAdminConfigs,
  summarizeAiFlowConfigs
} from "./aiFlowConfigData.mjs";

export const adminAiFlowConfigsRoute = "/api/admin/ai-flow-configs";
export const adminRuntimeConfigKeys = Object.freeze({
  aiFlowConfigs: "ai-flow-configs",
  safetyControls: "safety-controls"
});

export function buildAdminAiFlowConfigPayload({
  input,
  env = {},
  runtimeMode = "contract",
  version = 0,
  updatedAtIso = null,
  updatedBy = null
} = {}) {
  const configs = normalizeAdminAiFlowConfigInput(input, env);
  const summary = summarizeAiFlowConfigs(env, configs);
  const providerReadiness = buildSelectedProviderReadiness(summary, env);
  const blockers = summary.flows.flatMap((flow) => flow.blockedReasons.map((reason) => `${flow.flowId}: ${reason}`));

  return {
    service: "customcard-admin-ai-flow-configs",
    status: blockers.length === 0 ? "ready" : "blocked",
    serverOwned: true,
    clientMaySubmitAiFlowConfig: false,
    version: safeVersion(version),
    updatedAtIso: safeIso(updatedAtIso),
    updatedBy: safeActor(updatedBy),
    configs,
    aiFlowConfigs: configs,
    summary,
    providerReadiness,
    runtimeMode,
    repository: {
      table: "admin_runtime_configs",
      key: adminRuntimeConfigKeys.aiFlowConfigs,
      persisted: version > 0,
      rawCustomerContentStored: false,
      credentialsStored: false
    },
    blockers
  };
}

export function buildUpdatedAdminAiFlowConfigPayload({ body, env = {}, authContext, current, runtimeMode = "memory", now = () => new Date() }) {
  const currentVersion = safeVersion(current?.version);
  return buildAdminAiFlowConfigPayload({
    input: body,
    env,
    runtimeMode,
    version: currentVersion + 1,
    updatedAtIso: now().toISOString(),
    updatedBy: authContext?.userId ?? current?.updatedBy ?? null
  });
}

export function normalizeAdminAiFlowConfigInput(input, env = {}) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const candidate = Array.isArray(input)
    ? input
    : source.configs ?? source.aiFlowConfigs ?? source.flows ?? source.ai_flow_configs ?? [];
  const configs = normalizeAiFlowAdminConfigs(candidate, env);
  return configs.length > 0 ? configs : buildDefaultAiFlowAdminConfigs(env);
}

export function adminAiFlowConfigReadUnavailablePayload({ env = {}, runtimeMode = "postgres", error } = {}) {
  const payload = buildAdminAiFlowConfigPayload({ env, runtimeMode });
  return {
    ...payload,
    status: "blocked",
    repository: {
      ...payload.repository,
      persisted: false,
      status: "read-unavailable"
    },
    blockers: [
      ...payload.blockers,
      error instanceof Error ? `Admin AI flow config store unavailable: ${error.message}` : "Admin AI flow config store unavailable."
    ]
  };
}

function buildSelectedProviderReadiness(summary, env) {
  const adapterIds = Array.from(
    new Set(
      summary.flows
        .flatMap((flow) => [flow.primaryAdapterId, flow.fallbackAdapterId])
        .filter(Boolean)
    )
  ).sort();

  return Object.fromEntries(
    adapterIds.map((adapterId) => {
      const missingEnv = adapterMissingEnv(adapterId, env);
      return [
        adapterId,
        {
          adapterId,
          configured: missingEnv.length === 0,
          credentialConfigured: missingEnv.length === 0,
          missingEnv,
          credentialsExposed: false
        }
      ];
    })
  );
}

function safeVersion(value) {
  const number = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function safeActor(value) {
  const text = String(value ?? "").trim();
  return text.replace(/[^a-zA-Z0-9@._:-]/g, "").slice(0, 120) || null;
}

function safeIso(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
