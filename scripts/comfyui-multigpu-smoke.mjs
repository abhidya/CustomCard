import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { interpolateLocalComfyTemplate } from "./local-comfy-production-text.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultWorkflowPath = resolve(repoRoot, "comfyui-workflows/customcard-sdxl-checkpoint-multigpu.json");
const defaultOutputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");

if (isMainModule()) {
  const result = await runSmoke(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

export async function runSmoke(args = {}) {
  const comfyUrl = trimTrailingSlash(String(args["comfy-url"] || process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || "http://127.0.0.1:8188"));
  const workflowPath = resolve(String(args["workflow-path"] || defaultWorkflowPath));
  const outputDir = resolve(String(args["output-dir"] || `${defaultOutputRoot}/comfyui-multigpu-smoke-${timestamp()}`));
  const timeoutMs = boundedInteger(args["timeout-ms"] || 300_000, 10_000, 900_000, 300_000);
  const pollMs = boundedInteger(args["poll-ms"] || 1500, 250, 30_000, 1500);
  const variables = {
    cfg: Number(args.cfg || 1),
    checkpoint: String(args.checkpoint || "sd_xl_turbo_1.0_fp16.safetensors"),
    height: boundedInteger(args.height || 256, 256, 2048, 256),
    negativePrompt: String(args["negative-prompt"] || "text, watermark, blurry"),
    panelId: "multigpu-smoke",
    prompt: String(args.prompt || "a clean colorful greeting card illustration, simple flowers, soft studio lighting"),
    sampler: String(args.sampler || "euler_ancestral"),
    scheduler: String(args.scheduler || "sgm_uniform"),
    seed: boundedInteger(args.seed || 424242, 0, 2 ** 32 - 1, 424242),
    steps: boundedInteger(args.steps || 1, 1, 80, 1),
    width: boundedInteger(args.width || 256, 256, 2048, 256),
    workflowId: "customcard-sdxl-checkpoint-multigpu-smoke"
  };

  if (!existsSync(workflowPath)) throw new Error(`Workflow not found: ${workflowPath}`);
  const workflow = interpolateLocalComfyTemplate(JSON.parse(readFileSync(workflowPath, "utf8")), variables);
  const promptResponse = await postJson(`${comfyUrl}/prompt`, {
    prompt: workflow,
    client_id: "customcard-multigpu-smoke",
    extra_data: {
      customcard: {
        workflow_id: variables.workflowId,
        panel_id: variables.panelId,
        seed: variables.seed,
        inputs: variables
      }
    }
  });
  const promptId = String(promptResponse.prompt_id || "").trim();
  if (!promptId) throw new Error("ComfyUI did not return a prompt_id.");

  const history = await waitForHistory({ comfyUrl, promptId, pollMs, timeoutMs });
  const status = history?.status || {};
  const outputs = collectOutputs(history);
  const ok = Boolean(status.completed) && outputs.length > 0;
  const result = {
    ok,
    status: ok ? "ready" : "failed",
    createdAtIso: new Date().toISOString(),
    comfyUrl,
    workflowPath: relativePath(workflowPath),
    promptId,
    variables,
    comfyStatus: status,
    outputs,
    blockers: ok ? [] : [`ComfyUI smoke prompt did not complete with image output. Status: ${JSON.stringify(status)}`]
  };

  mkdirSync(outputDir, { recursive: true });
  result.reportDir = relativePath(outputDir);
  writeFileSync(resolve(outputDir, "comfyui-multigpu-smoke.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

async function waitForHistory({ comfyUrl, promptId, pollMs, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${comfyUrl}/history/${encodeURIComponent(promptId)}`);
    if (response.ok) {
      const history = await response.json();
      if (history?.[promptId]?.status?.completed || history?.[promptId]?.status?.status_str === "error") {
        return history[promptId];
      }
    }
    await delay(pollMs);
  }
  throw new Error(`Timed out waiting for ComfyUI prompt ${promptId}.`);
}

function collectOutputs(history) {
  return Object.values(history?.outputs || {})
    .flatMap((nodeOutput) => nodeOutput?.images || [])
    .map((image) => ({
      filename: image.filename || "",
      subfolder: image.subfolder || "",
      type: image.type || ""
    }))
    .filter((image) => image.filename);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { text };
  }
  if (!response.ok) throw new Error(`POST ${url} failed with ${response.status}: ${text.slice(0, 1000)}`);
  return data;
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
