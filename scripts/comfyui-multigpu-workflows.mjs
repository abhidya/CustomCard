import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultComfyUrl = "http://127.0.0.1:8188";
const defaultOutputRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");

const multiGpuSettings = {
  computeDevice: "cuda:0",
  donorDevice: "cuda:1",
  clipDevice: "cpu",
  vaeDevice: "cuda:1",
  virtualVramGb: 4.0,
  expertModeAllocations: ""
};

const workflowVariants = [
  ["customcard-production-text-overlay.json", "customcard-production-text-overlay-multigpu.json"],
  ["customcard-hybrid-reserved-layout.json", "customcard-hybrid-reserved-layout-multigpu.json"],
  ["customcard-sdxl-checkpoint.json", "customcard-sdxl-checkpoint-multigpu.json"],
  ["customcard-sdxl-lightning-lora.json", "customcard-sdxl-lightning-lora-multigpu.json"],
  ["customcard-flux1-schnell.json", "customcard-flux1-schnell-multigpu.json"],
  ["customcard-flux2-klein-4b.json", "customcard-flux2-klein-4b-multigpu.json"],
  ["customcard-z-image-turbo.json", "customcard-z-image-turbo-multigpu.json"],
  ["customcard-qwen-image-research.json", "customcard-qwen-image-research-multigpu.json"]
].map(([source, target]) => ({
  source: resolve(repoRoot, "comfyui-workflows", source),
  target: resolve(repoRoot, "comfyui-workflows", target)
}));

const multiGpuClassTypes = new Set([
  "CheckpointLoaderSimpleDisTorch2MultiGPU",
  "UNETLoaderDisTorch2MultiGPU",
  "CLIPLoaderMultiGPU",
  "DualCLIPLoaderMultiGPU",
  "VAELoaderMultiGPU"
]);

if (isMainModule()) {
  const args = parseArgs(process.argv.slice(2));
  const result = await runComfyMultiGpuWorkflowSetup(args);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

export async function runComfyMultiGpuWorkflowSetup(args = {}) {
  const write = args.write === true || args.write === "true";
  const check = write || args.check === true || args.check === "true";
  const requireLive = args["require-live"] === true || args["require-live"] === "true";
  const comfyUrl = trimTrailingSlash(String(args["comfy-url"] || process.env.CUSTOMCARD_COMFYUI_URL || process.env.COMFYUI_URL || defaultComfyUrl));
  const checks = [];
  const written = [];

  if (write) {
    for (const variant of workflowVariants) {
      const sourceWorkflow = readJson(variant.source);
      const transformed = transformWorkflow(sourceWorkflow);
      writeJson(variant.target, transformed);
      written.push(relativePath(variant.target));
      checks.push(checkItem(`${basename(variant.target)} written`, true, { source: relativePath(variant.source) }));
    }
  }

  if (check) {
    for (const variant of workflowVariants) {
      if (!existsSync(variant.target)) {
        checks.push(checkItem(`${basename(variant.target)} exists`, false, { target: relativePath(variant.target) }));
        continue;
      }
      const workflow = readJson(variant.target);
      const classTypes = collectClassTypes(workflow);
      const usedMultiGpuClassTypes = classTypes.filter((classType) => multiGpuClassTypes.has(classType));
      checks.push(checkItem(`${basename(variant.target)} uses MultiGPU loader`, usedMultiGpuClassTypes.length > 0, {
        target: relativePath(variant.target),
        usedMultiGpuClassTypes
      }));
      checks.push(checkItem(`${basename(variant.target)} has cuda:0/cuda:1 donor settings`, workflowHasExpectedPlacement(workflow), {
        computeDevice: multiGpuSettings.computeDevice,
        donorDevice: multiGpuSettings.donorDevice,
        virtualVramGb: multiGpuSettings.virtualVramGb
      }));
    }
  }

  let liveObjectInfo = null;
  let liveError = "";
  if (requireLive) {
    try {
      liveObjectInfo = await readLiveObjectInfo(comfyUrl);
    } catch (error) {
      liveError = errorMessage(error);
    }
    checks.push(checkItem("live ComfyUI reachable", Boolean(liveObjectInfo), { comfyUrl, error: liveError }));
    const requiredClasses = collectRequiredLiveClasses();
    const missingLiveClasses = requiredClasses.filter((classType) => !liveObjectInfo?.[classType]);
    checks.push(checkItem("live ComfyUI exposes MultiGPU classes", missingLiveClasses.length === 0, {
      comfyUrl,
      requiredClasses,
      missingLiveClasses
    }));
  }

  const ok = checks.every((item) => item.ok);
  const result = {
    ok,
    status: ok ? "ready" : "blocked",
    createdAtIso: new Date().toISOString(),
    comfyUrl,
    settings: multiGpuSettings,
    written,
    workflowVariants: workflowVariants.map((variant) => ({
      source: relativePath(variant.source),
      target: relativePath(variant.target)
    })),
    checks,
    nextSteps: nextSteps({ requireLive, liveObjectInfo, ok })
  };

  const outputDir = args["output-dir"] ? resolve(String(args["output-dir"])) : "";
  if (outputDir) {
    mkdirSync(outputDir, { recursive: true });
    writeJson(resolve(outputDir, "comfyui-multigpu-preflight.json"), result);
    writeFileSync(resolve(outputDir, "comfyui-multigpu-preflight.md"), markdownReport(result), "utf8");
    result.reportDir = relativePath(outputDir);
  }

  return result;
}

function transformWorkflow(workflow) {
  return Object.fromEntries(
    Object.entries(workflow).map(([id, node]) => [id, transformNode(node)])
  );
}

function transformNode(node) {
  const inputs = { ...(node.inputs || {}) };
  if (node.class_type === "CheckpointLoaderSimple") {
    return {
      ...node,
      class_type: "CheckpointLoaderSimpleDisTorch2MultiGPU",
      inputs: {
        ...inputs,
        compute_device: multiGpuSettings.computeDevice,
        virtual_vram_gb: multiGpuSettings.virtualVramGb,
        donor_device: multiGpuSettings.donorDevice,
        expert_mode_allocations: multiGpuSettings.expertModeAllocations,
        eject_models: true
      }
    };
  }
  if (node.class_type === "UNETLoader") {
    return {
      ...node,
      class_type: "UNETLoaderDisTorch2MultiGPU",
      inputs: {
        ...inputs,
        compute_device: multiGpuSettings.computeDevice,
        virtual_vram_gb: multiGpuSettings.virtualVramGb,
        donor_device: multiGpuSettings.donorDevice,
        expert_mode_allocations: multiGpuSettings.expertModeAllocations,
        eject_models: true
      }
    };
  }
  if (node.class_type === "CLIPLoader") {
    return {
      ...node,
      class_type: "CLIPLoaderMultiGPU",
      inputs: {
        ...inputs,
        device: multiGpuSettings.clipDevice
      }
    };
  }
  if (node.class_type === "DualCLIPLoader") {
    return {
      ...node,
      class_type: "DualCLIPLoaderMultiGPU",
      inputs: {
        ...inputs,
        device: multiGpuSettings.clipDevice
      }
    };
  }
  if (node.class_type === "VAELoader") {
    return {
      ...node,
      class_type: "VAELoaderMultiGPU",
      inputs: {
        ...inputs,
        device: multiGpuSettings.vaeDevice
      }
    };
  }
  return node;
}

function workflowHasExpectedPlacement(workflow) {
  return Object.values(workflow).some((node) => {
    const inputs = node?.inputs || {};
    return node?.class_type?.endsWith("DisTorch2MultiGPU") &&
      inputs.compute_device === multiGpuSettings.computeDevice &&
      inputs.donor_device === multiGpuSettings.donorDevice &&
      Number(inputs.virtual_vram_gb) === multiGpuSettings.virtualVramGb;
  });
}

function collectRequiredLiveClasses() {
  const required = new Set();
  for (const variant of workflowVariants) {
    if (!existsSync(variant.target)) continue;
    for (const classType of collectClassTypes(readJson(variant.target))) {
      if (multiGpuClassTypes.has(classType)) required.add(classType);
    }
  }
  return [...required].sort();
}

function collectClassTypes(workflow) {
  return Object.values(workflow)
    .map((node) => node?.class_type)
    .filter(Boolean)
    .map(String);
}

async function readLiveObjectInfo(comfyUrl) {
  const response = await fetch(`${comfyUrl}/object_info`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function checkItem(name, ok, details = {}) {
  return { name, ok: Boolean(ok), details };
}

function nextSteps({ requireLive, liveObjectInfo, ok }) {
  if (ok) return ["Run a MultiGPU workflow through the local worker or benchmark helper."];
  const steps = [];
  if (requireLive && !liveObjectInfo) steps.push("Start or restart ComfyUI, then rerun with --require-live true.");
  if (requireLive && liveObjectInfo) steps.push("Restart ComfyUI so it loads the installed ComfyUI-MultiGPU custom node.");
  steps.push("Regenerate the checked-in MultiGPU workflow variants with --write --check.");
  return steps;
}

function markdownReport(result) {
  const lines = [
    "# ComfyUI MultiGPU Preflight",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Comfy URL: ${result.comfyUrl}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Details |",
    "| --- | --- | --- |"
  ];
  for (const item of result.checks) {
    lines.push(`| ${item.name} | ${item.ok ? "ok" : "fail"} | ${escapeMarkdownTable(JSON.stringify(item.details))} |`);
  }
  lines.push("", "## Next Steps", "");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
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

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function escapeMarkdownTable(value) {
  return String(value || "").replaceAll("|", "\\|");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
