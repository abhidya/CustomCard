import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import {
  describeProductionTextSetup,
  isProductionTextWorkflowConfigured,
  resolveProductionTextComfyUrl
} from "./comfy-production-text-setup.mjs";
import { createWorkerRuntime, describeWorkerReadiness } from "./worker-runtime.mjs";

const localComfyRoutes = [{ id: "ai-card-generate", runtimeMode: "queue-backed" }];

export function resolveLocalComfyWorkerEnv(env = process.env) {
  const resolved = { ...env };
  resolved.CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID = "local-comfyui-api-image";
  if (resolved.CUSTOMCARD_LOCAL_COMFY_WORKER_ALLOW_IMAGE_FALLBACK !== "true") {
    resolved.CUSTOMCARD_AI_CARD_IMAGE_FALLBACK_ADAPTER_ID = "local-comfyui-api-image";
  }
  if (!resolved.CUSTOMCARD_COMFYUI_URL && !resolved.COMFYUI_URL) {
    resolved.CUSTOMCARD_COMFYUI_URL = resolveProductionTextComfyUrl({ env: resolved });
  }
  if (
    !resolved.CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID &&
    (resolved.CUSTOMCARD_LOCAL_LLM_BASE_URL || resolved.LMSTUDIO_BASE_URL || resolved.KOBOLDCPP_BASE_URL)
  ) {
    resolved.CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID = "local-openai-compatible-chat";
  }
  if (
    resolved.CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID === "local-openai-compatible-chat" &&
    resolved.CUSTOMCARD_LOCAL_COMFY_WORKER_ALLOW_TEXT_FALLBACK !== "true" &&
    !resolved.CUSTOMCARD_AI_CARD_COPY_FALLBACK_ADAPTER_ID
  ) {
    resolved.CUSTOMCARD_AI_CARD_COPY_FALLBACK_ADAPTER_ID = "local-openai-compatible-chat";
  }
  if (!resolved.CUSTOMCARD_WORKER_ID) {
    resolved.CUSTOMCARD_WORKER_ID = `local-comfy:${resolved.HOSTNAME ?? "machine"}:${process.pid}`;
  }
  return resolved;
}

export function createLocalComfyWorkerRuntime(options = {}) {
  const env = resolveLocalComfyWorkerEnv(options.env ?? process.env);
  return createWorkerRuntime({
    ...options,
    env,
    routes: options.routes ?? localComfyRoutes,
    workerId: options.workerId ?? env.CUSTOMCARD_WORKER_ID
  });
}

export function describeLocalComfyWorkerReadiness({ env = process.env } = {}) {
  const resolvedEnv = resolveLocalComfyWorkerEnv(env);
  const workflowId = resolvedEnv.CUSTOMCARD_COMFYUI_WORKFLOW_ID || resolvedEnv.COMFYUI_WORKFLOW_ID || null;
  const workflowPath = resolvedEnv.CUSTOMCARD_COMFYUI_WORKFLOW_PATH || resolvedEnv.COMFYUI_WORKFLOW_PATH || null;
  const productionTextSetup = isProductionTextWorkflowConfigured({ workflowId, workflowPath })
    ? describeProductionTextSetup({ env: resolvedEnv })
    : null;
  return {
    ...describeWorkerReadiness({ env: resolvedEnv, routes: localComfyRoutes }),
    routeScope: "ai-card-generate",
    imageAdapter: resolvedEnv.CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID,
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
  const runOnce = args.has("--once") || process.env.CUSTOMCARD_WORKER_PROCESS_ON_START === "true";

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
