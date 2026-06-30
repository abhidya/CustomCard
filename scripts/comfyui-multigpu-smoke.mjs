import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { interpolateLocalComfyTemplate } from "./local-comfy-production-text.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultWorkflowPath = resolve(repoRoot, "comfyui-workflows/customcard-sdxl-checkpoint-multigpu.json");
const defaultOutputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const execFileAsync = promisify(execFile);

if (isMainModule()) {
  const result = await runSmoke(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

export async function runSmoke(args = {}) {
  const fetchImpl = args.fetchImpl || globalThis.fetch;
  const readGpuTelemetry = args.readGpuTelemetry || readNvidiaGpuTelemetry;
  const comfyUrl = trimTrailingSlash(String(args["comfy-url"] || process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || "http://127.0.0.1:8188"));
  const workflowPath = resolve(String(args["workflow-path"] || defaultWorkflowPath));
  const outputDir = resolve(String(args["output-dir"] || `${defaultOutputRoot}/comfyui-multigpu-smoke-${timestamp()}`));
  const timeoutMs = boundedInteger(args["timeout-ms"] || 300_000, 10_000, 900_000, 300_000);
  const pollMs = boundedInteger(args["poll-ms"] || 1500, 250, 30_000, 1500);
  const requireGpuTelemetry = truthy(args["require-gpu-telemetry"] ?? process.env.CUSTOMCARD_COMFYUI_REQUIRE_GPU_TELEMETRY);
  const requiredGpuIndexes = parseGpuIndexes(args["require-gpu-indexes"] || process.env.CUSTOMCARD_COMFYUI_REQUIRED_GPU_INDEXES || "0,1");
  const minGpuMemoryMiB = boundedInteger(args["min-gpu-memory-mib"] || process.env.CUSTOMCARD_COMFYUI_MIN_GPU_MEMORY_MIB || 128, 1, 64_000, 128);
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
  const gpuSamples = [];
  gpuSamples.push(await sampleGpuTelemetry(readGpuTelemetry, "before"));
  const workflow = interpolateLocalComfyTemplate(JSON.parse(readFileSync(workflowPath, "utf8")), variables);
  const promptResponse = await postJson(fetchImpl, `${comfyUrl}/prompt`, {
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

  const history = await waitForHistory({ comfyUrl, fetchImpl, promptId, pollMs, readGpuTelemetry, timeoutMs, gpuSamples });
  gpuSamples.push(await sampleGpuTelemetry(readGpuTelemetry, "after"));
  const status = history?.status || {};
  const outputs = collectOutputs(history);
  const gpuProof = buildGpuProof(gpuSamples, { requiredGpuIndexes, minGpuMemoryMiB });
  const ok = Boolean(status.completed) && outputs.length > 0 && (!requireGpuTelemetry || gpuProof.ok);
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
    gpuTelemetry: {
      required: requireGpuTelemetry,
      requiredGpuIndexes,
      minGpuMemoryMiB,
      proof: gpuProof,
      samples: gpuSamples
    },
    blockers: smokeBlockers({ ok, status, outputs, requireGpuTelemetry, gpuProof })
  };

  mkdirSync(outputDir, { recursive: true });
  result.reportDir = relativePath(outputDir);
  writeFileSync(resolve(outputDir, "comfyui-multigpu-smoke.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeFileSync(resolve(outputDir, "comfyui-multigpu-smoke.md"), markdownReport(result), "utf8");
  return result;
}

async function waitForHistory({ comfyUrl, fetchImpl, promptId, pollMs, readGpuTelemetry, timeoutMs, gpuSamples }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    gpuSamples.push(await sampleGpuTelemetry(readGpuTelemetry, "poll"));
    const response = await fetchImpl(`${comfyUrl}/history/${encodeURIComponent(promptId)}`);
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

async function postJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, {
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

async function sampleGpuTelemetry(readGpuTelemetry, label) {
  try {
    const sample = await readGpuTelemetry();
    return {
      label,
      sampledAtIso: new Date().toISOString(),
      status: sample.status || "unknown",
      detail: sample.detail || "",
      gpus: Array.isArray(sample.gpus) ? sample.gpus.map(compactGpuSample) : []
    };
  } catch (error) {
    return {
      label,
      sampledAtIso: new Date().toISOString(),
      status: "error",
      detail: errorMessage(error),
      gpus: []
    };
  }
}

async function readNvidiaGpuTelemetry() {
  const command = process.env.NVIDIA_SMI_PATH || "nvidia-smi";
  try {
    const [gpuResult, appResult] = await Promise.all([
      execFileAsync(
        command,
        [
          "--query-gpu=index,uuid,name,utilization.gpu,utilization.memory,memory.used,memory.total",
          "--format=csv,noheader,nounits"
        ],
        { encoding: "utf8", maxBuffer: 128_000, windowsHide: true, signal: AbortSignal.timeout(1800) }
      ),
      execFileAsync(
        command,
        [
          "--query-compute-apps=gpu_uuid,pid,process_name,used_memory",
          "--format=csv,noheader,nounits"
        ],
        { encoding: "utf8", maxBuffer: 128_000, windowsHide: true, signal: AbortSignal.timeout(1800) }
      ).catch((error) => ({ stdout: "", stderr: errorMessage(error) }))
    ]);
    const apps = parseNvidiaSmiComputeAppsCsv(appResult.stdout);
    const gpus = parseNvidiaSmiGpuCsv(gpuResult.stdout)
      .map((gpu) => ({
        ...gpu,
        computeApps: apps.filter((app) => app.gpuUuid === gpu.uuid)
      }));
    return {
      status: gpus.length ? "ready" : "empty",
      detail: appResult.stderr ? sanitizeDiagnosticText(appResult.stderr) : "",
      gpus
    };
  } catch (error) {
    return {
      status: "missing",
      detail: errorMessage(error),
      gpus: []
    };
  }
}

function parseNvidiaSmiGpuCsv(stdout) {
  return String(stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [index, uuid, name, gpuUtilization, memoryUtilization, memoryUsed, memoryTotal] = line.split(",").map((item) => item.trim());
      const memoryUsedMiB = nullableNumber(memoryUsed);
      const memoryTotalMiB = nullableNumber(memoryTotal);
      return {
        index: nullableNumber(index),
        uuid: safeText(uuid, ""),
        name: safeText(name, "GPU"),
        utilizationGpuPercent: nullableNumber(gpuUtilization),
        utilizationMemoryPercent: nullableNumber(memoryUtilization),
        memoryUsedMiB,
        memoryTotalMiB,
        memoryUsedPercent: percentOf(memoryUsedMiB, memoryTotalMiB)
      };
    })
    .filter((gpu) => Number.isFinite(gpu.index));
}

function parseNvidiaSmiComputeAppsCsv(stdout) {
  return String(stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [gpuUuid, pid, processName, usedMemory] = line.split(",").map((item) => item.trim());
      return {
        gpuUuid: safeText(gpuUuid, ""),
        pid: nullableNumber(pid),
        processName: safeText(processName, ""),
        usedMemoryMiB: nullableNumber(usedMemory)
      };
    })
    .filter((app) => app.gpuUuid && Number.isFinite(app.pid));
}

function compactGpuSample(gpu) {
  const computeApps = Array.isArray(gpu.computeApps) ? gpu.computeApps : [];
  return {
    index: gpu.index,
    uuid: gpu.uuid || "",
    name: gpu.name || "GPU",
    utilizationGpuPercent: gpu.utilizationGpuPercent,
    utilizationMemoryPercent: gpu.utilizationMemoryPercent,
    memoryUsedMiB: gpu.memoryUsedMiB,
    memoryTotalMiB: gpu.memoryTotalMiB,
    memoryUsedPercent: gpu.memoryUsedPercent,
    computeApps: computeApps
      .map((app) => ({
        pid: app.pid,
        processName: app.processName,
        usedMemoryMiB: app.usedMemoryMiB
      }))
      .filter((app) => Number.isFinite(app.pid))
      .slice(0, 12)
  };
}

function buildGpuProof(samples, { requiredGpuIndexes, minGpuMemoryMiB }) {
  const byIndex = new Map();
  for (const sample of samples) {
    for (const gpu of sample.gpus || []) {
      if (!Number.isFinite(gpu.index)) continue;
      const existing = byIndex.get(gpu.index) || {
        index: gpu.index,
        name: gpu.name || "GPU",
        maxUtilizationGpuPercent: null,
        maxMemoryUsedMiB: null,
        maxComputeAppMemoryMiB: null,
        sampleCount: 0,
        seenComputeApps: []
      };
      existing.sampleCount += 1;
      existing.maxUtilizationGpuPercent = maxNullable(existing.maxUtilizationGpuPercent, gpu.utilizationGpuPercent);
      existing.maxMemoryUsedMiB = maxNullable(existing.maxMemoryUsedMiB, gpu.memoryUsedMiB);
      const appMemory = Math.max(0, ...(gpu.computeApps || []).map((app) => Number(app.usedMemoryMiB) || 0));
      existing.maxComputeAppMemoryMiB = maxNullable(existing.maxComputeAppMemoryMiB, appMemory);
      existing.seenComputeApps = mergeComputeApps(existing.seenComputeApps, gpu.computeApps || []);
      byIndex.set(gpu.index, existing);
    }
  }
  const gpuSummaries = Array.from(byIndex.values()).sort((left, right) => left.index - right.index);
  const missingIndexes = requiredGpuIndexes.filter((index) => !byIndex.has(index));
  const insufficientIndexes = requiredGpuIndexes.filter((index) => {
    const gpu = byIndex.get(index);
    if (!gpu) return false;
    return Math.max(gpu.maxMemoryUsedMiB || 0, gpu.maxComputeAppMemoryMiB || 0) < minGpuMemoryMiB;
  });
  return {
    ok: missingIndexes.length === 0 && insufficientIndexes.length === 0,
    status: missingIndexes.length === 0 && insufficientIndexes.length === 0 ? "ready" : "insufficient",
    missingIndexes,
    insufficientIndexes,
    gpuSummaries
  };
}

function mergeComputeApps(existing, next) {
  const byKey = new Map(existing.map((app) => [`${app.pid}:${app.processName}`, app]));
  for (const app of next) {
    if (!Number.isFinite(app.pid)) continue;
    const key = `${app.pid}:${app.processName}`;
    const current = byKey.get(key);
    byKey.set(key, {
      pid: app.pid,
      processName: app.processName,
      maxUsedMemoryMiB: Math.max(current?.maxUsedMemoryMiB || 0, Number(app.usedMemoryMiB) || 0)
    });
  }
  return Array.from(byKey.values()).sort((left, right) => (right.maxUsedMemoryMiB - left.maxUsedMemoryMiB) || left.pid - right.pid).slice(0, 12);
}

function smokeBlockers({ ok, status, outputs, requireGpuTelemetry, gpuProof }) {
  if (ok) return [];
  const blockers = [];
  if (!status.completed || outputs.length === 0) {
    blockers.push(`ComfyUI smoke prompt did not complete with image output. Status: ${JSON.stringify(status)}`);
  }
  if (requireGpuTelemetry && !gpuProof.ok) {
    blockers.push(`Required GPU telemetry was not proven. Missing indexes: ${gpuProof.missingIndexes.join(",") || "none"}; insufficient memory indexes: ${gpuProof.insufficientIndexes.join(",") || "none"}.`);
  }
  return blockers;
}

function markdownReport(result) {
  const lines = [
    "# ComfyUI MultiGPU Smoke",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Comfy URL: ${result.comfyUrl}`,
    `Workflow: \`${result.workflowPath}\``,
    `Prompt ID: \`${result.promptId}\``,
    "",
    "## GPU Proof",
    "",
    `- Required: ${result.gpuTelemetry.required ? "yes" : "no"}`,
    `- Required GPU indexes: ${result.gpuTelemetry.requiredGpuIndexes.join(", ") || "none"}`,
    `- Minimum observed memory: ${result.gpuTelemetry.minGpuMemoryMiB} MiB`,
    `- Proof status: ${result.gpuTelemetry.proof.status}`,
    `- Missing indexes: ${result.gpuTelemetry.proof.missingIndexes.join(", ") || "none"}`,
    `- Insufficient indexes: ${result.gpuTelemetry.proof.insufficientIndexes.join(", ") || "none"}`,
    "",
    "| GPU | Max util | Max memory | Max app memory | Apps |",
    "| --- | ---: | ---: | ---: | --- |"
  ];
  for (const gpu of result.gpuTelemetry.proof.gpuSummaries) {
    const apps = gpu.seenComputeApps.map((app) => `${app.processName || "process"}:${app.pid} ${app.maxUsedMemoryMiB}MiB`).join(", ");
    lines.push(`| ${gpu.index} ${gpu.name} | ${gpu.maxUtilizationGpuPercent ?? "n/a"}% | ${gpu.maxMemoryUsedMiB ?? "n/a"} MiB | ${gpu.maxComputeAppMemoryMiB ?? "n/a"} MiB | ${escapeMarkdownTable(apps || "none")} |`);
  }
  lines.push("", "## Outputs", "");
  for (const output of result.outputs) lines.push(`- ${output.filename}`);
  if (result.blockers.length > 0) {
    lines.push("", "## Blockers", "");
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  }
  lines.push("");
  return lines.join("\n");
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

function parseGpuIndexes(value) {
  return String(value || "")
    .split(/[,\s;]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item, index, values) => Number.isFinite(item) && values.indexOf(item) === index)
    .sort((left, right) => left - right);
}

function truthy(value) {
  return /^(1|true|yes|on|required|enabled)$/i.test(String(value || "").trim());
}

function nullableNumber(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || /^N\/A$/i.test(normalized)) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function maxNullable(left, right) {
  const numbers = [left, right].filter((value) => Number.isFinite(value));
  return numbers.length ? Math.max(...numbers) : null;
}

function percentOf(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((value / total) * 1000) / 10;
}

function safeText(value, fallback = "") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function sanitizeDiagnosticText(value) {
  return safeText(value, "").replace(/[A-Za-z]:\\[^"'<>]+/g, "<path>").slice(0, 240);
}

function escapeMarkdownTable(value) {
  return String(value || "").replaceAll("|", "\\|");
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
