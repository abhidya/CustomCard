import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import {
  describeProductionTextSetup,
  isProductionTextWorkflowConfigured,
  resolveProductionTextComfyUrl
} from "./comfy-production-text-setup.mjs";
import { createWorkerRuntime, describeWorkerReadiness } from "./worker-runtime.mjs";
import {
  modelForAiAdapter,
  normalizeAiFlowAdminConfigs,
  resolveAiFlowConfig
} from "../src/aiFlowConfigData.mjs";

const localComfyRoutes = [{ id: "ai-card-generate", runtimeMode: "queue-backed" }];

export function resolveLocalComfyWorkerEnv(env = process.env) {
  const resolved = { ...env };
  if (!resolved.CUSTOMCARD_COMFYUI_URL && !resolved.COMFYUI_URL) {
    resolved.CUSTOMCARD_COMFYUI_URL = resolveProductionTextComfyUrl({ env: resolved });
  }
  if (!resolved.CUSTOMCARD_WORKER_ID) {
    resolved.CUSTOMCARD_WORKER_ID = `local-comfy:${resolved.HOSTNAME ?? "machine"}:${process.pid}`;
  }
  return resolved;
}

export function buildLocalComfyWorkerAiFlowConfig(env = process.env) {
  const configs = normalizeAiFlowAdminConfigs([], env).map((config) => {
    if (config.flowId !== "card-image") return config;
    return {
      ...config,
      primaryAdapterId: "local-comfyui-api-image",
      fallbackAdapterId: "local-comfyui-api-image",
      model: modelForAiAdapter("local-comfyui-api-image", env),
      liveProviderCallsEnabled: true,
      queueEnabled: true,
      fallbackQueueEnabled: false
    };
  });
  return normalizeAiFlowAdminConfigs(configs, env);
}

export function createLocalComfyWorkerRuntime(options = {}) {
  const env = resolveLocalComfyWorkerEnv(options.env ?? process.env);
  const aiFlowAdminConfig = options.aiFlowAdminConfig ?? buildLocalComfyWorkerAiFlowConfig(env);
  return createWorkerRuntime({
    ...options,
    env,
    aiFlowAdminConfig,
    routes: options.routes ?? localComfyRoutes,
    workerId: options.workerId ?? env.CUSTOMCARD_WORKER_ID
  });
}

export function describeLocalComfyWorkerReadiness({ env = process.env, aiFlowAdminConfig } = {}) {
  const resolvedEnv = resolveLocalComfyWorkerEnv(env);
  const workerAiFlowAdminConfig = aiFlowAdminConfig ?? buildLocalComfyWorkerAiFlowConfig(resolvedEnv);
  const imageFlow = resolveAiFlowConfig("card-image", resolvedEnv, workerAiFlowAdminConfig);
  const workflowId = imageFlow.workflowId || null;
  const workflowPath = imageFlow.workflowPath || null;
  const productionTextSetup = isProductionTextWorkflowConfigured({ workflowId, workflowPath })
    ? describeProductionTextSetup({
        args: {
          "workflow-path": workflowPath || undefined,
          "comfy-url": resolvedEnv.CUSTOMCARD_COMFYUI_URL || resolvedEnv.COMFYUI_URL
        },
        env: resolvedEnv
      })
    : null;
  return {
    ...describeWorkerReadiness({ env: resolvedEnv, routes: localComfyRoutes, aiFlowAdminConfig: workerAiFlowAdminConfig }),
    routeScope: "ai-card-generate",
    imageAdapter: imageFlow.primaryAdapterId,
    comfyUrl: resolvedEnv.CUSTOMCARD_COMFYUI_URL || resolvedEnv.COMFYUI_URL,
    workflowId,
    workflowPath,
    productionTextSetup
  };
}

if (isCliEntrypoint()) {
  loadLocalAiEnvFiles();
  await runCli();
}

async function runCli() {
  const args = new Set(process.argv.slice(2));
  const describeOnly = args.has("--describe");
  const runOnce = args.has("--once");

  if (describeOnly) {
    const readiness = describeLocalComfyWorkerReadiness();
    console.log(JSON.stringify(readiness));
    if (readiness.status !== "ready") process.exitCode = 1;
    return;
  }

  const runtime = createLocalComfyWorkerRuntime();
  try {
    if (runOnce) {
      const report = await runtime.runOnce();
      console.log(JSON.stringify(report));
      if (report.status !== "ready" || report.blockers?.length > 0) process.exitCode = 1;
      return;
    }

    let stopping = false;
    const stop = () => {
      stopping = true;
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    const report = await runtime.runLoop({
      shouldContinue: () => !stopping,
      onReport(iteration) {
        console.log(JSON.stringify(iteration));
      }
    });
    if (report.status !== "ready" || report.blockers?.length > 0) process.exitCode = 1;
  } finally {
    await runtime.close();
  }
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}
