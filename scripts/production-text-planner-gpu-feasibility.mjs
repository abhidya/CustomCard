import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultModelRoot = process.env.CUSTOMCARD_LOCAL_MODEL_ROOT || "D:\\models";

const productionPlannerCandidates = [
  {
    id: "gemma-4-31b-it",
    model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
    patterns: ["gemma-4-31b-it"],
    note: "Quality local planner candidate, but only valid for GPU-only promotion if the selected GGUF fits the assigned GPU."
  },
  {
    id: "magistral-small-2509",
    model: "koboldcpp/Magistral-Small-2509-Q4_K_M",
    patterns: ["magistral-small-2509"],
    note: "Current GPU-backed runtime candidate; file size must fit the assigned GPU to avoid partial CPU offload."
  },
  {
    id: "deepseek-v4-flash",
    model: "koboldcpp/DeepSeekV4-Flash-158B-Q4_K_M",
    patterns: ["deepseekv4-flash"],
    note: "Heavyweight local planner candidate; treat as hardware-blocked unless a full-GPU fit is proven."
  },
  {
    id: "qwen3-14b-instruct",
    model: "koboldcpp/Qwen3-14B-Q4_K_M",
    patterns: ["qwen3-14b"],
    note: "Minimum production-floor fallback if a rights-clean 14B GGUF is installed and fits VRAM."
  }
];

if (isMainModule()) {
  const result = runProductionTextPlannerGpuFeasibility(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    gpuOnlyReady: result.gpuOnlyReady,
    baseUrl: result.baseUrl,
    activeModel: result.activePlanner.model || "",
    activeProcessPid: result.activePlanner.pid || null,
    blockers: result.blockers.length,
    reportDir: result.reportDir
  }, null, 2));
  if (!result.advisory && !result.gpuOnlyReady) process.exitCode = 1;
}

export function runProductionTextPlannerGpuFeasibility(args = {}, options = {}) {
  const advisory = Boolean(args.advisory);
  const outputRoot = resolve(String(args["output-root"] || defaultEvidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-planner-gpu-feasibility-${timestamp()}`));
  const modelRoot = resolve(String(args["model-root"] || defaultModelRoot));
  const baseUrl = firstUsableValue(args["base-url"], process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL, process.env.LMSTUDIO_BASE_URL, process.env.KOBOLDCPP_BASE_URL);
  const requestedModel = firstUsableValue(args.model);
  const explicitModelPath = firstUsableValue(args["model-path"], process.env.CUSTOMCARD_PRODUCTION_PLANNER_MODEL_PATH);
  const overheadMiB = boundedInteger(args["overhead-mib"], 0, 16_384, 1024);
  const endpoint = baseUrl ? localEndpoint(baseUrl) : { local: false, port: 0, baseUrl: "", error: "Planner base URL is missing." };
  const gpus = options.gpus || listNvidiaGpus();
  const nvidiaProcessIds = options.nvidiaProcessIds || listNvidiaProcessIds();
  const processes = options.processes || listKoboldProcesses();
  const inventory = (options.inventory || collectProductionPlannerInventory(modelRoot)).filter(isPlannerModelFile);
  const activeProcess = endpoint.local
    ? processes.find((processInfo) => processInfo.port === endpoint.port)
    : undefined;
  const activeModelPath = explicitModelPath || activeProcess?.modelPath || pathForRequestedModel(requestedModel, inventory);
  const activeModelFile = activeModelPath ? fileInfoFromInventoryOrDisk(activeModelPath, inventory) : undefined;
  const activeAssignedGpuIds = uniqueNumbers([
    ...gpuIdsFromProcess(activeProcess),
    ...gpuIdsFromArgs(args)
  ]);
  const activeEvaluation = activeModelFile
    ? evaluateGpuFit(activeModelFile, gpus, {
        assignedGpuIds: activeAssignedGpuIds,
        overheadMiB
      })
    : missingEvaluation(activeModelPath || "");
  const activePlanner = {
    baseUrl: endpoint.baseUrl || "",
    endpointLocal: Boolean(endpoint.local),
    endpointPort: endpoint.port || null,
    requestedModel,
    model: requestedModel || modelFromPath(activeModelPath),
    modelPath: activeModelPath || "",
    modelSizeMiB: activeModelFile?.sizeMiB ?? null,
    pid: activeProcess?.pid ?? null,
    commandLine: activeProcess?.commandLine || "",
    assignedGpuIds: activeAssignedGpuIds,
    gpuPidListed: activeProcess ? nvidiaProcessIds.includes(Number(activeProcess.pid)) : false,
    gpuFit: activeEvaluation
  };
  const candidateEvaluations = productionPlannerCandidates.map((candidate) => {
    const files = inventory.filter((item) =>
      candidate.patterns.some((pattern) => item.normalizedName.includes(normalizeModelKey(pattern)))
    );
    const evaluatedFiles = files.map((file) => ({
      ...file,
      gpuFit: evaluateGpuFit(file, gpus, { overheadMiB })
    }));
    const bestFile = bestCandidateFile(evaluatedFiles);
    return {
      id: candidate.id,
      model: candidate.model,
      note: candidate.note,
      installed: files.length > 0,
      installedFiles: evaluatedFiles,
      bestFile: bestFile ? {
        path: bestFile.path,
        sizeMiB: bestFile.sizeMiB,
        sizeGiB: bestFile.sizeGiB,
        gpuFit: bestFile.gpuFit
      } : null,
      gpuOnlyCandidate: Boolean(bestFile?.gpuFit?.singleGpuModelFits && bestFile?.gpuFit?.singleGpuEstimatedFits),
      hardwareBlocked: files.length > 0 && !evaluatedFiles.some((file) => file.gpuFit.singleGpuModelFits)
    };
  });
  const activeBlockers = buildActiveBlockers({
    endpoint,
    activeProcess,
    activePlanner,
    activeEvaluation
  });
  const gpuOnlyReady = activeBlockers.length === 0;
  const result = {
    createdAtIso: new Date().toISOString(),
    status: gpuOnlyReady ? "gpu-only-ready" : "blocked",
    gpuOnlyReady,
    promotionReady: false,
    advisory,
    baseUrl: endpoint.baseUrl || "",
    requestedModel,
    modelRoot,
    overheadMiB,
    gpus,
    nvidiaProcessIds,
    activePlanner,
    candidates: candidateEvaluations,
    gpuOnlyCandidateIds: candidateEvaluations.filter((item) => item.gpuOnlyCandidate).map((item) => item.id),
    hardwareBlockedCandidateIds: candidateEvaluations.filter((item) => item.hardwareBlocked).map((item) => item.id),
    blockers: activeBlockers,
    nextSteps: buildNextSteps({ activeBlockers, candidateEvaluations })
  };
  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-planner-gpu-feasibility.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-planner-gpu-feasibility.md"), buildMarkdown(result));
  return result;
}

function buildActiveBlockers({ endpoint, activeProcess, activePlanner, activeEvaluation }) {
  const blockers = [];
  if (endpoint.error) blockers.push(endpoint.error);
  if (endpoint.local && !activeProcess) blockers.push(`No local KoboldCPP process was found for planner port ${endpoint.port}.`);
  if (activeProcess && !activePlanner.gpuPidListed) blockers.push(`Local KoboldCPP PID ${activeProcess.pid} is not listed by nvidia-smi.`);
  if (activeProcess && !activePlanner.assignedGpuIds.length) blockers.push("Local KoboldCPP process does not declare an assigned CUDA GPU id.");
  if (activeProcess && !activePlanner.modelPath) blockers.push("Local KoboldCPP process did not expose a model path.");
  if (activePlanner.modelPath && !activeEvaluation.fileExists) blockers.push(`Planner model file was not found: ${activePlanner.modelPath}`);
  if (activeEvaluation.fileExists && !activeEvaluation.assignedGpuModelFits) {
    blockers.push(
      `Planner model alone is ${activeEvaluation.modelSizeMiB} MiB, larger than assigned GPU capacity ${activeEvaluation.assignedGpuTotalMiB || 0} MiB; this implies partial CPU offload under the current local runtime.`
    );
  } else if (activeEvaluation.fileExists && !activeEvaluation.assignedGpuEstimatedFits) {
    blockers.push(
      `Planner estimated VRAM need is ${activeEvaluation.estimatedRequiredMiB} MiB, above assigned GPU capacity ${activeEvaluation.assignedGpuTotalMiB || 0} MiB.`
    );
  }
  return unique(blockers);
}

function buildNextSteps({ activeBlockers, candidateEvaluations }) {
  if (!activeBlockers.length) return ["Run the planner throughput probe, then the full production-text benchmark with this exact endpoint/model."];
  const steps = [];
  if (activeBlockers.some((item) => /larger than assigned GPU|estimated VRAM/i.test(item))) {
    steps.push("Use a hosted/self-hosted production planner or a production-floor local model that fully fits a single assigned GPU; do not collect promotion evidence from partial CPU offload.");
  }
  if (activeBlockers.some((item) => /No local KoboldCPP process|not listed by nvidia-smi|assigned CUDA/i.test(item))) {
    steps.push("Restart the planner with CUDA GPU offload and verify the serving PID appears in nvidia-smi before any benchmark run.");
  }
  const candidates = candidateEvaluations.filter((item) => item.gpuOnlyCandidate).map((item) => item.id);
  if (candidates.length) {
    steps.push(`Try GPU-only feasible installed candidate(s) first: ${candidates.join(", ")}.`);
  }
  if (!steps.length) steps.push("Fix planner GPU feasibility blockers before running preflight, throughput, or benchmark evidence.");
  return unique(steps);
}

function evaluateGpuFit(file, gpus, { assignedGpuIds = [], overheadMiB = 1024 } = {}) {
  const modelSizeMiB = file.sizeMiB;
  const estimatedRequiredMiB = Math.ceil(modelSizeMiB + overheadMiB);
  const allGpuTotals = gpus.map((gpu) => Number(gpu.memoryTotalMiB)).filter(Number.isFinite);
  const assignedGpus = assignedGpuIds.length
    ? gpus.filter((gpu) => assignedGpuIds.includes(Number(gpu.index)))
    : gpus;
  const assignedTotals = assignedGpus.map((gpu) => Number(gpu.memoryTotalMiB)).filter(Number.isFinite);
  const maxSingleGpuTotalMiB = Math.max(0, ...allGpuTotals);
  const assignedGpuTotalMiB = Math.max(0, ...assignedTotals);
  const currentFreeMiB = Math.max(
    0,
    ...assignedGpus.map((gpu) => Number(gpu.memoryTotalMiB) - Number(gpu.memoryUsedMiB)).filter(Number.isFinite)
  );
  return {
    fileExists: true,
    modelSizeMiB,
    modelSizeGiB: file.sizeGiB,
    overheadMiB,
    estimatedRequiredMiB,
    maxSingleGpuTotalMiB,
    assignedGpuIds,
    assignedGpuTotalMiB,
    currentFreeMiB,
    singleGpuModelFits: modelSizeMiB <= maxSingleGpuTotalMiB,
    singleGpuEstimatedFits: estimatedRequiredMiB <= maxSingleGpuTotalMiB,
    assignedGpuModelFits: assignedGpuTotalMiB > 0 && modelSizeMiB <= assignedGpuTotalMiB,
    assignedGpuEstimatedFits: assignedGpuTotalMiB > 0 && estimatedRequiredMiB <= assignedGpuTotalMiB,
    currentlyStartableOnAssignedGpu: assignedGpuTotalMiB > 0 && estimatedRequiredMiB <= currentFreeMiB
  };
}

function missingEvaluation(path) {
  return {
    fileExists: false,
    path,
    modelSizeMiB: null,
    modelSizeGiB: null,
    overheadMiB: null,
    estimatedRequiredMiB: null,
    maxSingleGpuTotalMiB: 0,
    assignedGpuIds: [],
    assignedGpuTotalMiB: 0,
    currentFreeMiB: 0,
    singleGpuModelFits: false,
    singleGpuEstimatedFits: false,
    assignedGpuModelFits: false,
    assignedGpuEstimatedFits: false,
    currentlyStartableOnAssignedGpu: false
  };
}

function bestCandidateFile(files) {
  return [...files].sort((a, b) => {
    const aScore = (a.gpuFit.singleGpuEstimatedFits ? 3 : a.gpuFit.singleGpuModelFits ? 2 : 1);
    const bScore = (b.gpuFit.singleGpuEstimatedFits ? 3 : b.gpuFit.singleGpuModelFits ? 2 : 1);
    if (aScore !== bScore) return bScore - aScore;
    return a.sizeMiB - b.sizeMiB;
  })[0];
}

function collectProductionPlannerInventory(root) {
  if (!existsSync(root)) return [];
  const results = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".gguf") continue;
      if (!isPlannerModelFile({ name: entry.name, path: fullPath })) continue;
      const normalizedName = normalizeModelKey(basename(entry.name, extname(entry.name)));
      if (!productionPlannerCandidates.some((candidate) =>
        candidate.patterns.some((pattern) => normalizedName.includes(normalizeModelKey(pattern)))
      )) {
        continue;
      }
      results.push(fileInfo(fullPath));
    }
  }
  return results.filter(Boolean).sort((a, b) => a.path.localeCompare(b.path));
}

function isPlannerModelFile(item) {
  const name = String(item.name || basename(item.path || "")).toLowerCase();
  return !/^mmproj[-_]/i.test(name);
}

function fileInfo(path) {
  if (!path || !existsSync(path)) return undefined;
  const stats = statSync(path);
  const sizeMiB = Math.ceil(stats.size / 1024 ** 2);
  return {
    path,
    name: basename(path),
    normalizedName: normalizeModelKey(basename(path, extname(path))),
    sizeBytes: stats.size,
    sizeMiB,
    sizeGiB: Number((stats.size / 1024 ** 3).toFixed(2))
  };
}

function fileInfoFromInventoryOrDisk(path, inventory) {
  return inventory.find((item) => resolve(item.path) === resolve(path)) || fileInfo(path);
}

function pathForRequestedModel(model, inventory) {
  const requested = normalizeModelKey(model);
  if (!requested) return "";
  return inventory.find((item) =>
    requested.includes(item.normalizedName) || item.normalizedName.includes(requested)
  )?.path || "";
}

function listKoboldProcesses() {
  if (process.platform !== "win32") return [];
  const output = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-CimInstance Win32_Process -Filter \"Name='koboldcpp.exe'\" | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Depth 3"
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return (Array.isArray(parsed) ? parsed : [parsed]).map((item) => normalizeProcess(item)).filter(Boolean);
}

function normalizeProcess(item) {
  const commandLine = String(item.CommandLine || item.commandLine || "");
  const pid = Number(item.ProcessId || item.pid);
  if (!Number.isFinite(pid)) return undefined;
  return {
    pid,
    name: String(item.Name || item.name || "koboldcpp.exe"),
    commandLine,
    modelPath: commandArg(commandLine, "model"),
    port: Number(commandArg(commandLine, "port") || 0),
    usecuda: Number(commandArg(commandLine, "usecuda")),
    maingpu: Number(commandArg(commandLine, "maingpu")),
    gpulayers: Number(commandArg(commandLine, "gpulayers"))
  };
}

function listNvidiaGpus() {
  const output = execFileSync(
    "nvidia-smi",
    ["--query-gpu=index,name,memory.total,memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  return output.split(/\r?\n/).map((line) => {
    const [index, name, total, used, utilization] = line.split(",").map((item) => item?.trim());
    if (index === undefined || !index.length) return undefined;
    return {
      index: Number(index),
      name,
      memoryTotalMiB: Number(total),
      memoryUsedMiB: Number(used),
      utilizationGpuPercent: Number(utilization)
    };
  }).filter((item) => item && Number.isFinite(item.index));
}

function listNvidiaProcessIds() {
  try {
    const output = execFileSync(
      "nvidia-smi",
      ["--query-compute-apps=pid", "--format=csv,noheader,nounits"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return output.split(/\r?\n/).map((line) => Number(line.trim())).filter(Number.isFinite);
  } catch {
    return [];
  }
}

function commandArg(commandLine, name) {
  const pattern = new RegExp(`(?:^|\\s)--${escapeRegExp(name)}\\s+(?:"([^"]+)"|(\\S+))`, "i");
  const match = String(commandLine || "").match(pattern);
  return match ? (match[1] || match[2] || "") : "";
}

function gpuIdsFromProcess(processInfo) {
  if (!processInfo) return [];
  return uniqueNumbers([processInfo.usecuda, processInfo.maingpu]);
}

function gpuIdsFromArgs(args) {
  return uniqueNumbers([args["gpu-id"], args["planner-gpu-id"]]);
}

function localEndpoint(baseUrl) {
  try {
    const parsed = new URL(String(baseUrl));
    const local = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname.toLowerCase());
    return {
      baseUrl: parsed.toString().replace(/\/$/, ""),
      local,
      port: Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80)),
      error: local || parsed.protocol === "https:" ? "" : `Planner URL must be HTTPS unless it is localhost HTTP: ${baseUrl}`
    };
  } catch {
    return { baseUrl: String(baseUrl || ""), local: false, port: 0, error: "Planner base URL is invalid." };
  }
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Planner GPU Feasibility",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `GPU-only ready: ${result.gpuOnlyReady ? "yes" : "no"}`,
    `Base URL: ${result.baseUrl || "n/a"}`,
    `Requested model: ${result.requestedModel || "n/a"}`,
    "",
    "## Active Planner",
    "",
    `- PID: ${result.activePlanner.pid ?? "n/a"}`,
    `- Model path: ${result.activePlanner.modelPath || "n/a"}`,
    `- Model size: ${result.activePlanner.modelSizeMiB ?? "n/a"} MiB`,
    `- Assigned GPU ids: ${result.activePlanner.assignedGpuIds.join(", ") || "none"}`,
    `- PID listed by nvidia-smi: ${result.activePlanner.gpuPidListed ? "yes" : "no"}`,
    `- Assigned GPU model fit: ${result.activePlanner.gpuFit.assignedGpuModelFits ? "yes" : "no"}`,
    `- Assigned GPU estimated fit: ${result.activePlanner.gpuFit.assignedGpuEstimatedFits ? "yes" : "no"}`,
    "",
    "## GPUs",
    "",
    "| GPU | Name | Used MiB | Total MiB | Utilization |",
    "| ---:| --- | ---:| ---:| ---:|"
  ];
  for (const gpu of result.gpus) {
    lines.push(`| ${gpu.index} | ${markdownCell(gpu.name)} | ${gpu.memoryUsedMiB} | ${gpu.memoryTotalMiB} | ${gpu.utilizationGpuPercent}% |`);
  }
  lines.push("", "## Production Planner Candidates", "");
  lines.push("| Candidate | Installed | GPU-only candidate | Hardware blocked | Best file | Fit |");
  lines.push("| --- | ---:| ---:| ---:| --- | --- |");
  for (const candidate of result.candidates) {
    const fit = candidate.bestFile?.gpuFit;
    lines.push([
      candidate.id,
      candidate.installed ? "yes" : "no",
      candidate.gpuOnlyCandidate ? "yes" : "no",
      candidate.hardwareBlocked ? "yes" : "no",
      candidate.bestFile?.path ? `\`${candidate.bestFile.path}\`` : "n/a",
      fit ? `${fit.modelSizeMiB}/${fit.maxSingleGpuTotalMiB} MiB model/gpu` : "n/a"
    ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("", "## Blockers", "");
  if (result.blockers.length) {
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push("- none");
  }
  lines.push("", "## Next Steps", "");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  return `${lines.join("\n")}\n`;
}

function modelFromPath(path) {
  return path ? `koboldcpp/${basename(path, extname(path))}` : "";
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function firstUsableValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && !["__UNSET__", "placeholder", "changeme"].includes(text)) return text;
  }
  return "";
}

function normalizeModelKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^koboldcpp\//, "")
    .replace(/\.(gguf|bin|safetensors|ckpt)$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function uniqueNumbers(values) {
  return Array.from(new Set(values.map(Number).filter(Number.isFinite)));
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else if (values[index + 1] && !values[index + 1].startsWith("--")) {
      parsed[key] = values[index + 1];
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
}
