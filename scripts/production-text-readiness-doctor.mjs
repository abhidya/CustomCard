import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import {
  classifyProductionTextPlanner,
  isQualityPlanner,
  isSmallPlanner,
  productionTextPlannerPolicy
} from "./production-text-planner-policy.mjs";
import { inspectLocalKoboldGpuResidency } from "./local-kobold-gpu-residency.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultOutputRoot = evidenceRoot;
const defaultWorkflowPath = resolve(repoRoot, "comfyui-workflows/customcard-production-text-overlay.json");
const defaultNodeSource = resolve(repoRoot, "comfyui-custom-nodes/CustomCardTextComposer");
const defaultAggregatePath = resolve(
  evidenceRoot,
  "benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json"
);
const defaultModelRoot = process.env.CUSTOMCARD_LOCAL_MODEL_ROOT || "D:\\models";
const defaultComfyUrl = process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || "http://127.0.0.1:8188";
const commonPlannerUrls = ["http://127.0.0.1:5001/v1", "http://127.0.0.1:5003/v1"];

if (isMainModule()) {
  const result = await runDoctor(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    blockers: result.blockers.length,
    advisory: result.advisory
  }, null, 2));
  if (!result.advisory && !result.promotionReady) process.exitCode = 1;
}

export async function runDoctor(args = {}, options = {}) {
  const advisory = Boolean(args.advisory);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const outputRoot = resolve(String(args["output-root"] || defaultOutputRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-readiness-${timestamp()}`));
  const workflowPath = resolve(String(args["workflow-path"] || defaultWorkflowPath));
  const nodeSource = resolve(String(args["node-source"] || defaultNodeSource));
  const aggregatePath = resolve(String(args.aggregate || defaultAggregatePath));
  const modelRoot = resolve(String(args["model-root"] || defaultModelRoot));
  const comfyUrl = normalizeRootUrl(String(args["comfy-url"] || defaultComfyUrl));
  const configuredPlannerUrls = unique([
    args["local-llm-base-url"],
    process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL,
    process.env.LMSTUDIO_BASE_URL,
    process.env.KOBOLDCPP_BASE_URL
  ].filter(Boolean).map(normalizeOpenAiBaseUrl));
  const plannerApiKey = firstUsableValue(
    args["local-llm-api-key"],
    args["api-key"],
    process.env.CUSTOMCARD_LOCAL_LLM_API_KEY,
    process.env.LMSTUDIO_API_KEY,
    process.env.KOBOLDCPP_API_KEY
  );
  const plannerUrls = unique([
    ...configuredPlannerUrls,
    ...commonPlannerUrls
  ].filter(Boolean).map(normalizeOpenAiBaseUrl));
  const timeoutMs = boundedInteger(args["timeout-ms"], 500, 30_000, 3_000);
  const plannerRuntimeBudget = {
    reportedContextTokens: boundedInteger(args["planner-context-tokens"] || args["reported-context-tokens"], 1, 1_000_000, 0),
    maxOutputTokens: boundedInteger(args["planner-max-output-tokens"] || args["max-output-tokens"], 1, 1_000_000, 0)
  };

  const workflowExists = existsSync(workflowPath);
  const nodeSourceExists = existsSync(nodeSource) &&
    existsSync(resolve(nodeSource, "__init__.py")) &&
    existsSync(resolve(nodeSource, "nodes.py"));
  const aggregate = readJson(aggregatePath);
  const aggregateSummary = summarizeAggregate(aggregate, aggregatePath);
  const modelInventory = summarizeModelInventory(modelRoot);
  const plannerEndpoints = await Promise.all(plannerUrls.map((url) => probePlanner(url, timeoutMs, plannerRuntimeBudget, {
    ...options,
    apiKey: plannerApiKey,
    fetchImpl
  })));
  const activePlannerEndpoints = selectActivePlannerEndpoints(plannerEndpoints, configuredPlannerUrls);
  const comfy = await probeComfy(comfyUrl, timeoutMs, { fetchImpl });

  const checks = [
    check("production workflow file exists", workflowExists, true, { workflowPath: relativePath(workflowPath) }),
    check("CustomCardTextComposer source exists", nodeSourceExists, true, { nodeSource: relativePath(nodeSource) }),
    check("live ComfyUI reachable", comfy.reachable, true, { comfyUrl, error: comfy.error }),
    check("live ComfyUI exposes CustomCardTextComposer", comfy.hasTextComposer, true, {
      comfyUrl,
      objectInfoKeys: comfy.objectInfoKeyCount
    }),
    check("latest LLM-planned aggregate exists", Boolean(aggregate), false, { aggregatePath: relativePath(aggregatePath) }),
    check("latest LLM-planned aggregate covers three customer requests", aggregateSummary.totalRuns >= 3, false, aggregateSummary),
    check("latest LLM-planned aggregate is passing", aggregateSummary.promotionReady, false, aggregateSummary),
    check("higher-quality local planner model is installed", modelInventory.qualityPlannerInstalled, true, {
      modelRoot,
      installedQualityPlanners: modelInventory.installedQualityPlanners
    }),
    check("configured production planner endpoint is reachable", activePlannerEndpoints.some((endpoint) => endpoint.reachable), true, {
      configuredPlannerUrls,
      discoveryMode: configuredPlannerUrls.length === 0,
      activePlannerEndpoints
    }),
    check("configured production planner endpoint is production-suitable", activePlannerEndpoints.some((endpoint) => endpoint.reachable && endpoint.productionSuitable), true, {
      configuredPlannerUrls,
      discoveryMode: configuredPlannerUrls.length === 0,
      activePlannerEndpoints
    }),
    check("configured local planner runtime is GPU-backed", localPlannerGpuOk(activePlannerEndpoints), true, {
      configuredPlannerUrls,
      discoveryMode: configuredPlannerUrls.length === 0,
      activePlannerEndpoints
    }),
    check("configured production planner is not a small smoke model", !activePlannerEndpoints.some((endpoint) => endpoint.reachable && endpoint.smallPlanner), true, {
      configuredPlannerUrls,
      discoveryMode: configuredPlannerUrls.length === 0,
      activePlannerEndpoints
    })
  ];

  const blockers = checks.filter((item) => item.required && !item.ok);
  const promotionReady = blockers.length === 0;
  const result = {
    createdAtIso: new Date().toISOString(),
    status: promotionReady ? "promotion-ready" : "blocked",
    advisory,
    promotionReady,
    aggregatePromotionReady: aggregateSummary.promotionReady,
    workflowPath: relativePath(workflowPath),
    nodeSource: relativePath(nodeSource),
    aggregatePath: relativePath(aggregatePath),
    modelRoot,
    comfy,
    configuredPlannerUrls,
    plannerApiKeyProvided: Boolean(plannerApiKey),
    activePlannerEndpoints,
    plannerEndpoints,
    aggregateSummary,
    modelInventory,
    plannerRuntimeBudget,
    checks,
    blockers,
    nextSteps: buildNextSteps({ blockers, modelInventory, plannerEndpoints, comfy, aggregateSummary })
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-readiness.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-readiness.md"), buildMarkdown(result));
  return result;
}

function summarizeAggregate(aggregate, aggregatePath) {
  const ranked = Array.isArray(aggregate?.ranked) ? aggregate.ranked : [];
  const statuses = countBy(ranked.map((entry) => entry.status || "unknown"));
  const blockedRuns = ranked.filter((entry) => !entry.manualVisualGrade?.passed || entry.status !== "pass");
  const blockingFailures = unique(blockedRuns.flatMap((entry) => entry.manualVisualGrade?.blockingFailures || []));
  return {
    aggregatePath: relativePath(aggregatePath),
    exists: Boolean(aggregate),
    totalRuns: Number(aggregate?.totalRuns ?? ranked.length ?? 0),
    statuses,
    bestScore: ranked[0]?.score ?? null,
    bestRun: ranked[0]?.fixtureId || ranked[0]?.runId || "",
    textModels: unique(ranked.map((entry) => entry.textModel).filter(Boolean)),
    promotionReady: ranked.length >= 3 && ranked.every((entry) => entry.status === "pass" && entry.manualVisualGrade?.passed),
    blockingFailures
  };
}

function summarizeModelInventory(modelRoot) {
  const files = collectModelFiles(modelRoot);
  const textModels = files.filter((file) => file.extension === ".gguf");
  const plannerModels = textModels.filter(isPlannerModelFile);
  const installedQualityPlanners = plannerModels
    .filter((file) => isQualityPlanner(file.name))
    .map((file) => file.path);
  const installedSmallPlanners = plannerModels
    .filter((file) => isSmallPlanner(file.name))
    .map((file) => file.path);
  const missingMidTierPlanner = !plannerModels.some((file) => /qwen3.*14b|magistral-small/i.test(file.name));
  return {
    modelRoot,
    fileCount: files.length,
    textModelCount: textModels.length,
    plannerModelCount: plannerModels.length,
    qualityPlannerInstalled: installedQualityPlanners.length > 0,
    installedQualityPlanners,
    installedSmallPlanners,
    missingMidTierPlanner,
    recommendedNextPull: missingMidTierPlanner
      ? "Pull one production-floor planner such as Qwen3 14B or Magistral Small for routine loops if Gemma 31B remains too slow; Qwen3 8B remains smoke-only."
      : ""
  };
}

function collectModelFiles(root) {
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
      if (!entry.isFile()) continue;
      const extension = extname(entry.name).toLowerCase();
      if (![".gguf", ".bin", ".safetensors", ".ckpt", ".exe"].includes(extension)) continue;
      const stats = statSync(fullPath);
      results.push({
        path: fullPath,
        name: basename(fullPath),
        extension,
        sizeGb: Number((stats.size / 1024 ** 3).toFixed(2)),
        modifiedAtIso: stats.mtime.toISOString()
      });
    }
  }
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

async function probePlanner(baseUrl, timeoutMs, runtimeBudget = {}, options = {}) {
  const modelsUrl = `${baseUrl.replace(/\/$/, "")}/models`;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const headers = options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {};
  try {
    const response = await fetchWithTimeout(fetchImpl, modelsUrl, { headers }, timeoutMs);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    const models = (body?.data || []).map((item) => String(item?.id || "")).filter(Boolean);
    const activeModel = models[0] || "";
    const plannerClass = classifyProductionTextPlanner(activeModel, {
      reportedContextTokens: runtimeBudget.reportedContextTokens,
      maxOutputTokens: runtimeBudget.maxOutputTokens,
      requireRuntimeBudget: true
    });
    const localGpuResidency = inspectLocalKoboldGpuResidency(baseUrl, { probe: options.gpuResidencyProbe });
    return {
      baseUrl,
      reachable: true,
      activeModel,
      models,
      localGpuResidency,
      reportedContextTokens: plannerClass.reportedContextTokens,
      maxOutputTokens: plannerClass.maxOutputTokens,
      smallPlanner: plannerClass.smallPlanner,
      productionSuitable: plannerClass.productionSuitable,
      plannerClass: plannerClass.classification,
      plannerPolicy: {
        minContextTokens: plannerClass.minContextTokens,
        minOutputTokens: plannerClass.minOutputTokens,
        recommendedOutputTokens: plannerClass.recommendedOutputTokens,
        blockers: plannerClass.blockers,
        warnings: plannerClass.warnings
      }
    };
  } catch (error) {
    return {
      baseUrl,
      reachable: false,
      activeModel: "",
      models: [],
      smallPlanner: false,
      productionSuitable: false,
      error: errorMessage(error)
    };
  }
}

function localPlannerGpuOk(activePlannerEndpoints) {
  const reachableLocal = activePlannerEndpoints.filter((endpoint) =>
    endpoint.reachable && endpoint.localGpuResidency?.required
  );
  if (!reachableLocal.length) return true;
  return reachableLocal.some((endpoint) => endpoint.localGpuResidency?.ok);
}

async function probeComfy(comfyUrl, timeoutMs, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  try {
    const response = await fetchWithTimeout(fetchImpl, `${comfyUrl.replace(/\/$/, "")}/object_info`, {}, timeoutMs);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const objectInfo = await response.json();
    return {
      comfyUrl,
      reachable: true,
      hasTextComposer: Boolean(objectInfo?.CustomCardTextComposer),
      objectInfoKeyCount: Object.keys(objectInfo || {}).length
    };
  } catch (error) {
    return {
      comfyUrl,
      reachable: false,
      hasTextComposer: false,
      objectInfoKeyCount: 0,
      error: errorMessage(error)
    };
  }
}

function selectActivePlannerEndpoints(plannerEndpoints, configuredPlannerUrls) {
  if (configuredPlannerUrls.length) {
    return plannerEndpoints.filter((endpoint) => configuredPlannerUrls.includes(endpoint.baseUrl));
  }
  const productionCandidates = plannerEndpoints.filter((endpoint) => endpoint.reachable && endpoint.productionSuitable);
  return productionCandidates.length ? productionCandidates : plannerEndpoints;
}

function buildNextSteps({ blockers, modelInventory, plannerEndpoints, comfy, aggregateSummary }) {
  const steps = [];
  const blockerNames = new Set(blockers.map((item) => item.name));
  if (blockerNames.has("live ComfyUI reachable")) {
    steps.push("Start the target ComfyUI server on the configured URL.");
  }
  if (blockerNames.has("live ComfyUI exposes CustomCardTextComposer")) {
    steps.push("Install/link comfyui-custom-nodes/CustomCardTextComposer into ComfyUI/custom_nodes and restart ComfyUI.");
  }
  if (blockerNames.has("configured production planner endpoint is reachable")) {
    steps.push("Start the configured local/hosted OpenAI-compatible planner endpoint before running promotion evidence.");
  }
  if (blockerNames.has("configured production planner endpoint is production-suitable")) {
    steps.push(`Run tools/start-local-card-planner.ps1 with ${productionTextPlannerPolicy.minContextTokens}+ context and ${productionTextPlannerPolicy.recommendedOutputTokens} output tokens, use a hosted/self-hosted production planner, or point -LocalLlmBaseUrl at that endpoint.`);
  }
  if (blockerNames.has("configured production planner is not a small smoke model")) {
    steps.push("Switch the production planner URL away from Qwen3-4B/8B and other small smoke models; keep -AllowSmallPlanner only for exploratory failure evidence, not promotion.");
  }
  if (blockerNames.has("configured local planner runtime is GPU-backed")) {
    steps.push("Restart the local KoboldCPP planner through tools/start-local-card-planner.ps1 with -GpuId and -GpuLayers so the planner PID appears in nvidia-smi.");
  }
  if (modelInventory.missingMidTierPlanner) {
    steps.push(modelInventory.recommendedNextPull);
  }
  if (!aggregateSummary.promotionReady) {
    steps.push("Promotion gate still needs a passing full LLM-planned matrix, manual grades, and aggregate; readiness only proves the runtime can run it.");
  }
  if (!comfy.hasTextComposer && !steps.length) {
    steps.push("Refresh live Comfy /object_info evidence.");
  }
  if (!plannerEndpoints.some((endpoint) => endpoint.reachable) && !steps.length) {
    steps.push("Start a local or self-hosted OpenAI-compatible planner endpoint.");
  }
  return unique(steps.filter(Boolean));
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Readiness",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    "",
    "## Checks",
    "",
    "| Check | Required | Status | Details |",
    "| --- | --- | --- | --- |"
  ];
  for (const item of result.checks) {
    lines.push(`| ${item.name} | ${item.required ? "yes" : "no"} | ${item.ok ? "ok" : "fail"} | ${markdownCell(JSON.stringify(item.details))} |`);
  }
  lines.push("");
  lines.push("## Planner Endpoints");
  lines.push("");
  lines.push("| Endpoint | Reachable | Active model | Context | Output cap | GPU | Production suitable |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const endpoint of result.plannerEndpoints) {
    const gpu = endpoint.localGpuResidency?.required
      ? endpoint.localGpuResidency.ok ? "yes" : "no"
      : "n/a";
    lines.push(`| ${markdownCell(endpoint.baseUrl)} | ${endpoint.reachable ? "yes" : "no"} | ${markdownCell(endpoint.activeModel || endpoint.error || "n/a")} | ${endpoint.reportedContextTokens ?? "n/a"} | ${endpoint.maxOutputTokens ?? "n/a"} | ${gpu} | ${endpoint.productionSuitable ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push("## Aggregate Summary");
  lines.push("");
  lines.push(`- Runs: ${result.aggregateSummary.totalRuns}`);
  lines.push(`- Best score: ${result.aggregateSummary.bestScore ?? "n/a"}`);
  lines.push(`- Best run: ${result.aggregateSummary.bestRun || "n/a"}`);
  lines.push(`- Text models: ${result.aggregateSummary.textModels.join(", ") || "n/a"}`);
  lines.push(`- Blocking failures: ${result.aggregateSummary.blockingFailures.length}`);
  for (const failure of result.aggregateSummary.blockingFailures) {
    lines.push(`  - ${failure}`);
  }
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  return `${lines.join("\n")}\n`;
}

function check(name, ok, required, details = {}) {
  return { name, ok: Boolean(ok), required: Boolean(required), details };
}

function isPlannerModelFile(file) {
  return !/mmproj|vision|qwen3[-_]?vl|[-_/]vl[-_/]|textencoders?|image|flux|vae|clip/i.test(`${file.path} ${file.name}`);
}

function normalizeOpenAiBaseUrl(value) {
  const parsed = new URL(String(value));
  let path = parsed.pathname.replace(/\/+$/, "");
  if (path.endsWith("/chat/completions")) path = path.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  if (!path.endsWith("/v1")) path = `${path}/v1`;
  parsed.pathname = path.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function normalizeRootUrl(value) {
  const parsed = new URL(String(value));
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function firstUsableValue(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text && !["__UNSET__", "placeholder", "changeme"].includes(text)) return text;
  }
  return "";
}

async function fetchWithTimeout(fetchImpl, url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
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

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function relativePath(filePath) {
  return filePath.replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "unknown error");
}

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
}
