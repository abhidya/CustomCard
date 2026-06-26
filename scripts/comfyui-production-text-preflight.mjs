import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultWorkflowPath = resolve(repoRoot, "comfyui-workflows/customcard-production-text-overlay.json");
const defaultNodeSource = resolve(repoRoot, "comfyui-custom-nodes/CustomCardTextComposer");
const defaultOutputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const requiredNodeClass = "CustomCardTextComposer";
const requiredSoftFieldInputs = [
  "headline_box_background_radius",
  "headline_box_background_opacity",
  "headline_box_background_style",
  "body_box_background_radius",
  "body_box_background_opacity",
  "body_box_background_style"
];

if (isMainModule()) {
  const result = await runPreflight(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    ok: result.ok,
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    liveComfyReachable: result.liveComfyReachable,
    liveNodeAvailable: result.liveNodeAvailable
  }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

export async function runPreflight(args = {}) {
  const comfyUrl = normalizeComfyUrl(args["comfy-url"] || process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || "http://127.0.0.1:8188");
  const workflowPath = resolve(String(args["workflow-path"] || process.env.CUSTOMCARD_COMFYUI_WORKFLOW_PATH || defaultWorkflowPath));
  const nodeSource = resolve(String(args["node-source"] || defaultNodeSource));
  const outputRoot = resolve(String(args["output-root"] || defaultOutputRoot));
  const reportDir = resolve(String(args["report-dir"] || `${outputRoot}/production-text-preflight-${timestamp()}`));
  const requireLive = args["require-live"] === true || args["require-live"] === "true";
  const timeoutMs = boundedInteger(args["timeout-ms"] || process.env.CUSTOMCARD_COMFYUI_PREFLIGHT_TIMEOUT_MS, 500, 60_000, 5_000);

  const checks = [];
  const workflow = readWorkflow(workflowPath, checks);
  const classTypes = workflow ? collectClassTypes(workflow) : [];
  checks.push(check("workflow contains CustomCardTextComposer", classTypes.includes(requiredNodeClass), {
    requiredNodeClass,
    classTypes: classTypes.filter((value, index) => classTypes.indexOf(value) === index).sort()
  }));
  const workflowNodeInputs = collectWorkflowNodeInputs(workflow, requiredNodeClass);
  const missingWorkflowSoftFieldInputs = requiredSoftFieldInputs.filter((input) => !workflowNodeInputs.includes(input));
  checks.push(check("workflow maps soft safe-field inputs", missingWorkflowSoftFieldInputs.length === 0, {
    requiredInputs: requiredSoftFieldInputs,
    missingInputs: missingWorkflowSoftFieldInputs
  }));
  checks.push(check("custom node source exists", existsSync(nodeSource), { nodeSource }));
  checks.push(check("custom node module files exist", existsSync(resolve(nodeSource, "__init__.py")) && existsSync(resolve(nodeSource, "nodes.py")), {
    files: ["__init__.py", "nodes.py"]
  }));

  const live = await readLiveObjectInfo(comfyUrl, timeoutMs);
  const liveComfyReachable = Boolean(live.objectInfo);
  const liveNodeAvailable = Boolean(live.objectInfo?.[requiredNodeClass]);
  checks.push(check("live ComfyUI reachable", liveComfyReachable || !requireLive, {
    comfyUrl,
    requireLive,
    error: live.error
  }, { required: requireLive }));
  checks.push(check("live ComfyUI has CustomCardTextComposer", liveNodeAvailable, {
    comfyUrl,
    requiredNodeClass,
    liveComfyReachable
  }, { required: requireLive, advisory: !requireLive }));
  const liveNodeInputs = collectLiveNodeInputs(live.objectInfo?.[requiredNodeClass]);
  const missingLiveSoftFieldInputs = requiredSoftFieldInputs.filter((input) => !liveNodeInputs.includes(input));
  checks.push(check("live ComfyUI exposes soft safe-field inputs", liveComfyReachable && liveNodeAvailable && missingLiveSoftFieldInputs.length === 0, {
    requiredInputs: requiredSoftFieldInputs,
    missingInputs: missingLiveSoftFieldInputs,
    liveInputCount: liveNodeInputs.length
  }, { required: requireLive, advisory: !requireLive }));

  const cachedObjectInfoPath = resolve(repoRoot, ".codex/comfyui/object_info.json");
  const cachedObjectInfo = readCachedObjectInfo(cachedObjectInfoPath);
  const cachedNodeAvailable = Boolean(cachedObjectInfo?.[requiredNodeClass]);

  const ok = checks.filter((item) => item.required).every((item) => item.ok);
  const promotionReady = liveComfyReachable && liveNodeAvailable && checks.filter((item) => item.required).every((item) => item.ok);
  const result = {
    ok,
    promotionReady,
    status: ok ? (promotionReady ? "promotion-ready" : "repo-ok-runtime-not-ready") : "failed",
    createdAtIso: new Date().toISOString(),
    comfyUrl,
    workflowPath: relativePath(workflowPath),
    nodeSource: relativePath(nodeSource),
    requiredNodeClass,
    liveComfyReachable,
    liveNodeAvailable,
    cachedObjectInfoPath: existsSync(cachedObjectInfoPath) ? relativePath(cachedObjectInfoPath) : null,
    cachedNodeAvailable,
    checks,
    nextSteps: buildNextSteps({ requireLive, liveComfyReachable, liveNodeAvailable, cachedNodeAvailable })
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-preflight.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-preflight.md"), buildMarkdown(result));
  return result;
}

function readWorkflow(workflowPath, checks) {
  if (!existsSync(workflowPath)) {
    checks.push(check("workflow file exists", false, { workflowPath }));
    return null;
  }
  checks.push(check("workflow file exists", true, { workflowPath: relativePath(workflowPath) }));
  try {
    const workflow = JSON.parse(readFileSync(workflowPath, "utf8"));
    checks.push(check("workflow JSON parses", true, { workflowPath: relativePath(workflowPath) }));
    return workflow;
  } catch (error) {
    checks.push(check("workflow JSON parses", false, { error: errorMessage(error) }));
    return null;
  }
}

async function readLiveObjectInfo(comfyUrl, timeoutMs) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${comfyUrl}/object_info`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return { objectInfo: await response.json() };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function readCachedObjectInfo(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function collectClassTypes(workflow) {
  return Object.values(workflow || {})
    .map((node) => node?.class_type)
    .filter(Boolean)
    .map(String);
}

function collectWorkflowNodeInputs(workflow, classType) {
  return Object.values(workflow || {})
    .filter((node) => node?.class_type === classType)
    .flatMap((node) => Object.keys(node?.inputs || {}))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

function collectLiveNodeInputs(nodeInfo) {
  const inputGroups = nodeInfo?.input || {};
  return Object.values(inputGroups)
    .filter((value) => value && typeof value === "object")
    .flatMap((group) => Object.keys(group))
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

function check(name, ok, details = {}, options = {}) {
  return {
    name,
    ok: Boolean(ok),
    required: options.required !== false && !options.advisory,
    advisory: Boolean(options.advisory),
    details
  };
}

function buildNextSteps({ requireLive, liveComfyReachable, liveNodeAvailable, cachedNodeAvailable }) {
  const steps = [];
  if (!liveComfyReachable) {
    steps.push("Start or restart the target ComfyUI server, then rerun this preflight with --require-live true.");
  }
  if (liveComfyReachable && !liveNodeAvailable) {
    steps.push("Link comfyui-custom-nodes/CustomCardTextComposer into ComfyUI/custom_nodes and restart ComfyUI.");
  }
  if (!cachedNodeAvailable && !liveNodeAvailable) {
    steps.push("After restart, refresh /object_info evidence so CustomCardTextComposer is visible to future agents.");
  }
  if (!requireLive) {
    steps.push("Use --require-live true in CI or promotion gates so missing live Comfy nodes fail the command.");
  }
  if (steps.length === 0) {
    steps.push("Run tools/run-production-text-benchmark.ps1 to produce four-panel production workflow evidence.");
  }
  return steps;
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Workflow Preflight",
    "",
    `Created: ${result.createdAtIso}`,
    "",
    `- Workflow: \`${result.workflowPath}\``,
    `- Custom node source: \`${result.nodeSource}\``,
    `- Required Comfy class: \`${result.requiredNodeClass}\``,
    `- Live Comfy reachable: ${result.liveComfyReachable ? "yes" : "no"}`,
    `- Live node available: ${result.liveNodeAvailable ? "yes" : "no"}`,
    `- Cached node available: ${result.cachedNodeAvailable ? "yes" : "no"}`,
    `- Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    "",
    "## Checks",
    "",
    "| Check | Required | Status | Details |",
    "| --- | --- | --- | --- |"
  ];
  for (const item of result.checks) {
    lines.push(`| ${item.name} | ${item.required ? "yes" : "no"} | ${item.ok ? "ok" : "fail"} | ${escapeMarkdownTable(JSON.stringify(item.details))} |`);
  }
  lines.push("", "## Next Steps", "");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  lines.push("");
  return lines.join("\n");
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeMarkdown(filePath, value) {
  writeFileSync(filePath, value, "utf8");
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

function normalizeComfyUrl(value) {
  const parsed = new URL(String(value || "http://127.0.0.1:8188"));
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/+$/, "");
}

function boundedInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function relativePath(filePath) {
  return resolve(filePath).replace(repoRoot, "").replace(/^[/\\]/, "").replaceAll("\\", "/") || basename(filePath);
}

function escapeMarkdownTable(value) {
  return String(value || "").replaceAll("|", "\\|");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
}
