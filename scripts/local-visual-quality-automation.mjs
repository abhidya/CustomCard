import { existsSync, mkdirSync, openSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultKoboldBinary = String.raw`D:\models\koboldcpp.exe`;
const defaultKoboldModelPath = String.raw`D:\models\Qwen3VL-8B-Instruct-Q4_K_M.gguf`;
const defaultKoboldMmprojPath = String.raw`D:\models\mmproj-Qwen3VL-8B-Instruct-Q8_0.gguf`;
const defaultLmStudioBaseUrl = "http://127.0.0.1:1234/v1";
const defaultKoboldPort = 5002;

if (isMainModule()) {
  await main().catch((error) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = String(args.server || process.env.CUSTOMCARD_LOCAL_REVIEWER_SERVER || "koboldcpp").toLowerCase();
  const inputDir = resolve(args.input || defaultEvidenceRoot);
  const apiKey = args["api-key"] || process.env.CUSTOMCARD_LOCAL_VISION_API_KEY || "local";
  const dryRun = args["dry-run"] === true || args["dry-run"] === "true";

  if (server === "koboldcpp" || server === "kobold" || server === "kobold-cpp") {
    const port = boundedInteger(args.port || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_PORT, 1, 65535, defaultKoboldPort);
    const baseUrl = normalizeBaseUrl(args["base-url"] || process.env.CUSTOMCARD_LOCAL_VISION_BASE_URL || `http://127.0.0.1:${port}/v1`);
    const modelPath = resolve(args["kobold-model-path"] || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_MODEL_PATH || defaultKoboldModelPath);
    const mmprojPath = resolve(args["kobold-mmproj-path"] || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_MMPROJ_PATH || defaultKoboldMmprojPath);
    const model = args.model || process.env.CUSTOMCARD_LOCAL_VISION_MODEL || basename(modelPath);
    let launch;
    if (!dryRun) {
      launch = await ensureKoboldReviewer({ args, apiKey, baseUrl, model, modelPath, mmprojPath, port });
    }
    try {
      await runQualityGate({ args, inputDir, backend: "koboldcpp", baseUrl, model, apiKey });
    } finally {
      if (launch?.pid && (args["stop-after"] === true || args["stop-after"] === "true")) {
        stopProcess(launch.pid);
      }
    }
    return;
  }

  if (server === "lmstudio" || server === "lm-studio" || server === "lm_studio") {
    const baseUrl = normalizeBaseUrl(args["base-url"] || process.env.CUSTOMCARD_LOCAL_VISION_BASE_URL || defaultLmStudioBaseUrl);
    const model = args.model || process.env.CUSTOMCARD_LOCAL_VISION_MODEL || process.env.LMSTUDIO_VISION_MODEL || "Qwen3VL-4B-Instruct-Q4_K_M.gguf";
    if (!dryRun) await ensureLmStudioReviewer({ args, apiKey, baseUrl, model });
    await runQualityGate({ args, inputDir, backend: "lmstudio", baseUrl, model, apiKey });
    return;
  }

  if (server === "openai" || server === "openai-compatible" || server === "local") {
    const baseUrl = normalizeBaseUrl(args["base-url"] || process.env.CUSTOMCARD_LOCAL_VISION_BASE_URL || defaultLmStudioBaseUrl);
    const model = args.model || process.env.CUSTOMCARD_LOCAL_VISION_MODEL || "Qwen3VL-4B-Instruct-Q4_K_M.gguf";
    await runQualityGate({ args, inputDir, backend: "openai", baseUrl, model, apiKey });
    return;
  }

  if (server === "comfy" || server === "comfyui") {
    await runQualityGate({ args, inputDir, backend: "comfy", apiKey });
    return;
  }

  throw new Error(`Unsupported reviewer automation server: ${server}`);
}

async function ensureKoboldReviewer({ args, apiKey, baseUrl, model, modelPath, mmprojPath, port }) {
  if (!existsSync(modelPath)) throw new Error(`KoboldCPP reviewer model not found: ${modelPath}`);
  if (!existsSync(mmprojPath)) throw new Error(`KoboldCPP reviewer mmproj not found: ${mmprojPath}`);

  const existing = await probeReviewer(baseUrl, apiKey, model);
  if (existing.ready) return undefined;
  if (existing.reachable) {
    throw new Error(
      [
        `${redactLocalUrl(baseUrl)} is already serving a different local model.`,
        `Loaded model(s): ${existing.loadedModels.join(", ") || "none"}.`,
        `The vision reviewer needs ${model}. Use --port ${port + 1}, stop the other server, or pass --base-url for a ready vision endpoint.`
      ].join(" ")
    );
  }

  if (args["no-start"] === true || args["start"] === "false") {
    throw new Error(`${redactLocalUrl(baseUrl)} is not reachable and --no-start/--start false was requested.`);
  }

  const launch = launchKoboldCpp({ args, modelPath, mmprojPath, port });
  console.log(`Started KoboldCPP reviewer pid ${launch.pid}; log: ${relativePath(launch.logPath)}`);
  await waitForReviewerReady({
    apiKey,
    baseUrl,
    model,
    timeoutMs: boundedInteger(args["startup-timeout-ms"], 30_000, 1_800_000, 900_000)
  });
  return launch;
}

async function ensureLmStudioReviewer({ args, apiKey, baseUrl, model }) {
  const startCommand = args["lmstudio-start-command"] || process.env.CUSTOMCARD_LMSTUDIO_START_COMMAND;
  if (startCommand) {
    launchCommand(startCommand, "lmstudio-start");
    await sleep(3000);
  }
  const probe = await probeReviewer(baseUrl, apiKey, model);
  if (probe.ready) return;
  if (!probe.reachable) {
    throw new Error(
      [
        `LM Studio is not reachable at ${redactLocalUrl(baseUrl)}.`,
        "Start LM Studio, enable the Local Server, and load a vision model into memory before running this automation.",
        "You can also set CUSTOMCARD_LMSTUDIO_START_COMMAND if you have a local launch command."
      ].join(" ")
    );
  }
  throw new Error(
    [
      `LM Studio is reachable, but ${model} is not loaded.`,
      `Loaded model(s): ${probe.loadedModels.join(", ") || "none"}.`,
      "Load the vision model in LM Studio, then rerun the automation."
    ].join(" ")
  );
}

function launchKoboldCpp({ args, modelPath, mmprojPath, port }) {
  const koboldBinary = resolve(args["kobold-bin"] || process.env.CUSTOMCARD_KOBOLDCPP_BIN || defaultKoboldBinary);
  if (!existsSync(koboldBinary)) throw new Error(`KoboldCPP binary not found: ${koboldBinary}`);
  const logDir = resolve(repoRoot, ".tmp/local-reviewer");
  mkdirSync(logDir, { recursive: true });
  const logPath = resolve(logDir, `koboldcpp-reviewer-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
  const logFd = openSync(logPath, "a");
  const gpuLayers = boundedInteger(args["gpu-layers"] || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_GPU_LAYERS, 0, 999, 33);
  const contextSize = boundedInteger(args["context-size"] || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_CONTEXT_SIZE, 512, 262144, 4096);
  const visionMaxTokens = boundedInteger(args["vision-max-tokens"] || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_VISION_MAX_TOKENS, 128, 16384, 2048);
  const maxRequestSize = boundedInteger(args["max-request-size"] || process.env.CUSTOMCARD_KOBOLDCPP_REVIEW_MAX_REQUEST_MB, 4, 512, 96);
  const koboldArgs = [
    "--model",
    modelPath,
    "--mmproj",
    mmprojPath,
    "--port",
    String(port),
    "--host",
    "127.0.0.1",
    "--skiplauncher",
    "--contextsize",
    String(contextSize),
    "--visionmaxtokens",
    String(visionMaxTokens),
    "--maxrequestsize",
    String(maxRequestSize),
    "--lowvram",
    "--quiet"
  ];
  if (gpuLayers > 0) {
    koboldArgs.push("--usecuda", "0", "--gpulayers", String(gpuLayers), "--mmprojcpu");
  } else {
    koboldArgs.push("--usecpu", "--mmprojcpu");
  }
  const child = spawn(koboldBinary, koboldArgs, {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true
  });
  child.unref();
  return { pid: child.pid, logPath };
}

function launchCommand(command, logName) {
  const logDir = resolve(repoRoot, ".tmp/local-reviewer");
  mkdirSync(logDir, { recursive: true });
  const logPath = resolve(logDir, `${logName}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
  const logFd = openSync(logPath, "a");
  const child = spawn(command, {
    shell: true,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true
  });
  child.unref();
  console.log(`Started custom reviewer command pid ${child.pid}; log: ${relativePath(logPath)}`);
}

async function waitForReviewerReady({ apiKey, baseUrl, model, timeoutMs }) {
  const startedAt = Date.now();
  let lastStatus = "not checked";
  while (Date.now() - startedAt < timeoutMs) {
    const probe = await probeReviewer(baseUrl, apiKey, model);
    if (probe.ready) return;
    lastStatus = probe.reachable
      ? `loaded model(s): ${probe.loadedModels.join(", ") || "none"}`
      : probe.error || "not reachable";
    await sleep(3000);
  }
  throw new Error(`Reviewer did not become ready at ${redactLocalUrl(baseUrl)} within ${timeoutMs}ms; last status: ${lastStatus}`);
}

async function probeReviewer(baseUrl, apiKey, model) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/models`, {
      headers: { authorization: `Bearer ${apiKey}` }
    }, 5000);
    const text = await response.text();
    if (!response.ok) {
      return { reachable: true, ready: false, loadedModels: [], error: `${response.status}: ${text.slice(0, 300)}` };
    }
    const loadedModels = normalizeLoadedModelIds(parseJson(text));
    const matchingModels = loadedModels.filter((loadedModel) => modelIdsMatch(loadedModel, model));
    const ready = matchingModels.some(looksVisionCapableModelId);
    return { reachable: true, ready, loadedModels, matchingModels };
  } catch (error) {
    return { reachable: false, ready: false, loadedModels: [], error: errorMessage(error) };
  }
}

async function runQualityGate({ args, inputDir, backend, baseUrl, model, apiKey }) {
  const gateArgs = [
    resolve(repoRoot, "scripts/local-visual-quality-gate.mjs"),
    "--backend",
    backend,
    "--input",
    inputDir
  ];
  if (baseUrl) gateArgs.push("--base-url", baseUrl);
  if (model) gateArgs.push("--model", model);
  if (apiKey) gateArgs.push("--api-key", apiKey);
  copyArg(args, gateArgs, "output-dir");
  copyArg(args, gateArgs, "limit");
  copyArg(args, gateArgs, "min-score");
  copyArg(args, gateArgs, "comfy-url");
  copyArg(args, gateArgs, "comfy-output-root");
  copyArg(args, gateArgs, "comfy-workflow-path");
  copyFlag(args, gateArgs, "advisory");
  copyFlag(args, gateArgs, "dry-run");
  copyFlag(args, gateArgs, "include-panels");
  copyFlag(args, gateArgs, "preflight-only");
  copyFlag(args, gateArgs, "allow-loaded-model");
  copyFlag(args, gateArgs, "allow-nonvision-model");

  const child = spawn(process.execPath, gateArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      CUSTOMCARD_LOCAL_QUALITY_BACKEND: backend,
      CUSTOMCARD_LOCAL_VISION_BASE_URL: baseUrl || process.env.CUSTOMCARD_LOCAL_VISION_BASE_URL || "",
      CUSTOMCARD_LOCAL_VISION_MODEL: model || process.env.CUSTOMCARD_LOCAL_VISION_MODEL || ""
    },
    stdio: "inherit",
    windowsHide: true
  });
  const code = await waitForChild(child);
  if (code !== 0) process.exitCode = code;
}

function copyArg(source, target, name) {
  if (source[name] === undefined || source[name] === true) return;
  target.push(`--${name}`, String(source[name]));
}

function copyFlag(source, target, name) {
  if (source[name] === true || source[name] === "true") target.push(`--${name}`);
}

function waitForChild(child) {
  return new Promise((resolveWait, rejectWait) => {
    child.on("error", rejectWait);
    child.on("exit", (code) => resolveWait(code ?? 1));
  });
}

function stopProcess(pid) {
  try {
    process.kill(pid);
    console.log(`Stopped KoboldCPP reviewer pid ${pid}`);
  } catch (error) {
    console.warn(`Could not stop KoboldCPP reviewer pid ${pid}: ${errorMessage(error)}`);
  }
}

function normalizeBaseUrl(value) {
  const url = new URL(String(value));
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("Local reviewer automation must use a localhost URL.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname.endsWith("/v1")) url.pathname = `${url.pathname}/v1`.replace(/\/+/g, "/");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeLoadedModelIds(payload) {
  const values = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.models)
      ? payload.models
      : Array.isArray(payload)
        ? payload
        : [];
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      return value?.id || value?.name || value?.model || value?.path || "";
    })
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function modelIdsMatch(loadedModel, requestedModel) {
  const loaded = normalizeModelIdForCompare(loadedModel);
  const requested = normalizeModelIdForCompare(requestedModel);
  return loaded === requested || loaded.includes(requested) || requested.includes(loaded);
}

function normalizeModelIdForCompare(value) {
  return basename(String(value || ""))
    .toLowerCase()
    .replace(/\.(gguf|safetensors|bin)$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function looksVisionCapableModelId(value) {
  return /(vl|vision|visual|llava|moondream|pixtral|internvl|minicpm|qwen2\.?5-vl|qwen3.?vl)/i.test(String(value || ""));
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const [key, inlineValue] = value.slice(2).split("=");
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

function parseJson(value) {
  try {
    return JSON.parse(String(value));
  } catch {
    return undefined;
  }
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function relativePath(filePath) {
  return relative(repoRoot, resolve(filePath)).replaceAll("\\", "/");
}

function redactLocalUrl(value) {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  return url.toString();
}

function errorMessage(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? `: ${error.cause.message}` : "";
  return `${error.message}${cause}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
}
