import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceDir = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultOutputDir = resolve(defaultEvidenceDir, "local-model-coverage");
const defaultLocalModelRoot = process.env.CUSTOMCARD_LOCAL_MODEL_ROOT || "D:\\models";
const defaultComfyModelsRoot =
  process.env.CUSTOMCARD_COMFYUI_MODELS_ROOT ||
  "D:\\ComfyUI-Easy-Install\\ComfyUI-Easy-Install\\ComfyUI\\models";

const modelExtensions = new Set([".gguf", ".bin", ".safetensors", ".ckpt"]);

const recommendedCoverage = [
  {
    id: "qwen3-4b-instruct",
    role: "fast local card-copy planner",
    patterns: ["qwen3-4b-instruct-2507"],
    pull: "none",
    nextAction: "Keep as smoke-test planner; do not treat as quality champion."
  },
  {
    id: "gemma-4-31b-it",
    role: "higher-quality local card-copy planner",
    patterns: ["gemma-4-31b-it"],
    pull: "none",
    nextAction: "Run local benchmark through LM Studio or KoboldCPP and compare JSON adherence."
  },
  {
    id: "magistral-small-2509",
    role: "alternate local copy/planning family",
    patterns: ["magistral-small-2509"],
    pull: "none",
    nextAction: "Run after Gemma to see if its prose improves card warmth without schema drift."
  },
  {
    id: "deepseek-v4-flash",
    role: "heavyweight local planner candidate",
    patterns: ["deepseekv4-flash"],
    pull: "none",
    nextAction: "Only benchmark if load time and memory are acceptable."
  },
  {
    id: "qwen3-vl-8b",
    role: "local visual judge",
    patterns: ["qwen3vl-8b", "qwen3-vl-8b"],
    pull: "none",
    nextAction: "Wire into a visual QA pass for fake text, faces, clutter, and safe-zone violations."
  },
  {
    id: "bge-m3",
    role: "embedding and duplicate-clustering model",
    patterns: ["bge-m3"],
    pull: "none",
    nextAction: "Use for prompt/output retrieval and near-duplicate detection; not a card generator."
  },
  {
    id: "dreamshaper-8",
    role: "current local ComfyUI image baseline",
    patterns: ["dreamshaper_8_pruned"],
    pull: "none",
    nextAction: "Keep as baseline, but current live run shows it needs visual QA gates."
  },
  {
    id: "qwen3-14b-instruct",
    role: "minimum local production-floor planner beneath Gemma 31B quality",
    patterns: ["qwen3-14b"],
    pull: "Qwen/Qwen3-14B-GGUF, Q4_K_M",
    nextAction: "Pull Qwen3 14B if Gemma 31B is too slow for routine benchmark loops; keep Qwen3 8B as smoke-only evidence."
  },
  {
    id: "sdxl-base-or-card-checkpoint",
    role: "production-oriented ComfyUI image comparison baseline",
    patterns: ["stable-diffusion-xl-base", "sdxl", "juggernaut", "dreamshaperxl"],
    pull: "SDXL base 1.0 or a rights-clean SDXL card/stationery checkpoint",
    nextAction: "Pull if DreamShaper keeps creating faces, fake text, or physical-card artifacts."
  },
  {
    id: "flux-schnell",
    role: "higher-quality local ComfyUI image research candidate",
    patterns: ["flux.1-schnell", "flux-1-schnell"],
    pull: "ComfyUI-compatible FLUX.1 Schnell model stack",
    nextAction: "Optional after SDXL baseline; verify VRAM fit before making it benchmark-critical."
  }
];

if (isMainModule()) {
  main();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const evidenceDir = resolve(args.input || defaultEvidenceDir);
  const outputDir = resolve(args["output-dir"] || defaultOutputDir);
  const localModelRoot = resolve(args["model-root"] || defaultLocalModelRoot);
  const comfyModelsRoot = resolve(args["comfy-root"] || defaultComfyModelsRoot);
  const inventory = [
    ...collectModelFiles(localModelRoot, "local-model-root"),
    ...collectModelFiles(comfyModelsRoot, "comfyui-models-root")
  ];
  const benchmarkEntries = collectBenchmarkEntries(evidenceDir);
  const localBenchmarkEntries = benchmarkEntries.filter((entry) => entry.local);
  const evaluatedTextModels = unique(benchmarkEntries.map((entry) => entry.textModel).filter(Boolean));
  const evaluatedImageModels = unique(benchmarkEntries.map((entry) => entry.imageModel).filter(Boolean));
  const evaluatedModels = unique([...evaluatedTextModels, ...evaluatedImageModels]);
  const locallyEvaluatedTextModels = unique(localBenchmarkEntries.map((entry) => entry.textModel).filter(Boolean));
  const locallyEvaluatedImageModels = unique(localBenchmarkEntries.map((entry) => entry.imageModel).filter(Boolean));
  const locallyEvaluatedModels = unique([...locallyEvaluatedTextModels, ...locallyEvaluatedImageModels]);
  const evaluatedKeys = evaluatedModels.map(normalizeModelKey);
  const inventoryWithCoverage = inventory.map((item) => {
    const matchedModels = locallyEvaluatedModels.filter((model) => modelMatchesFile(model, item));
    return {
      ...item,
      benchmarked: matchedModels.length > 0,
      matchedBenchmarkModels: matchedModels,
      recommendation: recommendationForFile(item)
    };
  });
  const coverageMatrix = recommendedCoverage.map((item) => {
    const installedMatches = inventoryWithCoverage.filter((model) =>
      item.patterns.some((pattern) => model.normalizedName.includes(normalizeModelKey(pattern)))
    );
    const localEvaluatedMatches = locallyEvaluatedModels.filter((model) =>
      item.patterns.some((pattern) => normalizeModelKey(model).includes(normalizeModelKey(pattern)))
    );
    const remoteEvaluatedMatches = evaluatedModels.filter((model) =>
      item.patterns.some((pattern) => normalizeModelKey(model).includes(normalizeModelKey(pattern)))
    ).filter((model) => !localEvaluatedMatches.includes(model));
    const installedEvaluatedMatches = installedMatches.flatMap((model) => model.matchedBenchmarkModels);
    const evaluatedAs = unique([...localEvaluatedMatches, ...installedEvaluatedMatches]);
    const remotelyEvaluatedAs = unique(remoteEvaluatedMatches);
    const localEvaluated = evaluatedAs.length > 0 || installedMatches.some((model) => model.benchmarked);
    return {
      ...item,
      installed: installedMatches.length > 0,
      evaluated: localEvaluated,
      evaluatedRemoteOnly: remotelyEvaluatedAs.length > 0 && !localEvaluated,
      installedFiles: installedMatches.map((model) => model.path),
      evaluatedAs,
      remotelyEvaluatedAs
    };
  });
  const aggregate = {
    createdAtIso: new Date().toISOString(),
    evidenceDir: relativePath(evidenceDir),
    outputDir: relativePath(outputDir),
    localModelRoot,
    comfyModelsRoot,
    totals: {
      installedModelFiles: inventoryWithCoverage.length,
      benchmarkEntries: benchmarkEntries.length,
      localBenchmarkEntries: localBenchmarkEntries.length,
      evaluatedTextModels: evaluatedTextModels.length,
      evaluatedImageModels: evaluatedImageModels.length,
      locallyEvaluatedTextModels: locallyEvaluatedTextModels.length,
      locallyEvaluatedImageModels: locallyEvaluatedImageModels.length,
      benchmarkedInstalledFiles: inventoryWithCoverage.filter((item) => item.benchmarked).length,
      recommendedInstalled: coverageMatrix.filter((item) => item.installed).length,
      recommendedEvaluated: coverageMatrix.filter((item) => item.evaluated).length,
      recommendedMissing: coverageMatrix.filter((item) => !item.installed).length
    },
    evaluatedModels: {
      text: evaluatedTextModels,
      image: evaluatedImageModels,
      all: evaluatedModels,
      normalized: evaluatedKeys,
      localText: locallyEvaluatedTextModels,
      localImage: locallyEvaluatedImageModels,
      localAll: locallyEvaluatedModels
    },
    recommendedCoverage: coverageMatrix,
    inventory: inventoryWithCoverage,
    pullQueue: coverageMatrix.filter((item) => !item.installed).map(({ id, role, pull, nextAction }) => ({
      id,
      role,
      pull,
      nextAction
    }))
  };
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, "local-model-coverage.json"), aggregate);
  writeMarkdown(resolve(outputDir, "local-model-coverage.md"), buildCoverageMarkdown(aggregate));
  console.log(JSON.stringify({
    outputDir: relativePath(outputDir),
    installedModelFiles: aggregate.totals.installedModelFiles,
    benchmarkEntries: aggregate.totals.benchmarkEntries,
    localBenchmarkEntries: aggregate.totals.localBenchmarkEntries,
    recommendedInstalled: aggregate.totals.recommendedInstalled,
    recommendedEvaluated: aggregate.totals.recommendedEvaluated,
    recommendedMissing: aggregate.totals.recommendedMissing
  }, null, 2));
}

function collectModelFiles(root, source) {
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
      const isRuntime = entry.name.toLowerCase() === "koboldcpp.exe";
      if (!modelExtensions.has(extension) && !isRuntime) continue;
      const stats = statSync(fullPath);
      const name = basename(fullPath, extension);
      results.push({
        source,
        path: fullPath,
        relativePath: relative(root, fullPath).replaceAll("\\", "/"),
        name: basename(fullPath),
        modelName: name,
        normalizedName: normalizeModelKey(name),
        extension: isRuntime ? ".exe" : extension,
        sizeBytes: stats.size,
        sizeGb: Number((stats.size / 1024 ** 3).toFixed(2)),
        modifiedAtIso: stats.mtime.toISOString(),
        role: inferModelRole(fullPath, isRuntime),
        fingerprint: `${name}:${stats.size}:${Math.round(stats.mtimeMs)}`
      });
    }
  }
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

function collectBenchmarkEntries(evidenceDir) {
  const files = collectJsonFiles(evidenceDir);
  return [
    ...files.filter((file) => basename(file) === "debug-log.json").flatMap(readLocalComfyDebugLog),
    ...files.filter((file) => basename(file).endsWith("-summary.json")).flatMap(readModelBenchmarkSummary)
  ].filter(Boolean);
}

function collectJsonFiles(root) {
  if (!existsSync(root)) return [];
  const results = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function readLocalComfyDebugLog(filePath) {
  const payload = readJson(filePath);
  if (!payload || payload.mode !== "local-comfyui") return [];
  return (payload.fixtures || []).map((fixture) => ({
    sourceFile: relativePath(filePath),
    runId: payload.runId,
    createdAtIso: payload.createdAtIso,
    fixtureId: fixture.id,
    textModel: "fixture-specific-local-copy",
    imageModel: payload.checkpoint,
    provider: "local-comfyui",
    local: true,
    score: fixture.quality?.score
  }));
}

function readModelBenchmarkSummary(filePath) {
  const payload = readJson(filePath);
  if (!payload?.runs || !Array.isArray(payload.runs)) return [];
  return payload.runs.map((run) => {
    const local =
      payload.localOnlyNetworkGuard === true ||
      run.textAdapterId === "local-openai-compatible-chat" ||
      run.imageAdapterId === "local-comfyui-api-image" ||
      run.imageAdapterId === "local-comfyui-api";
    return {
      sourceFile: relativePath(filePath),
      runId: `${payload.phaseDir || payload.phase}:${run.storyId || "story"}:${run.textCandidateId || run.textAdapterId}:${run.imageCandidateId || run.imageAdapterId}`,
      createdAtIso: run.finishedAt || payload.createdAtIso,
      fixtureId: run.storyId,
      textModel: run.cardCopyModel || run.textModel,
      imageModel: run.imageModel,
      provider: run.imageAdapterId,
      local,
      score: run.autoChecks ? scoreAutoChecks(run.autoChecks).score : undefined
    };
  });
}

function scoreAutoChecks(autoChecks) {
  const checks = autoChecks?.checks || {};
  const booleans = Object.values(checks).filter((value) => typeof value === "boolean");
  const passed = booleans.filter(Boolean).length;
  return {
    score: booleans.length ? Math.round((passed / booleans.length) * 100) : undefined
  };
}

function inferModelRole(filePath, isRuntime) {
  const lowerPath = filePath.toLowerCase();
  const lowerName = basename(filePath).toLowerCase();
  if (isRuntime) return "runtime";
  if (lowerName.includes("mmproj")) return "multimodal-projector";
  if (lowerName.includes("bge") || lowerPath.includes("embedding")) return "embedding";
  if (lowerName.includes("whisper")) return "speech-to-text";
  if (lowerName.includes("kokoro")) return "text-to-speech";
  if (lowerPath.includes("/checkpoints/") || lowerPath.includes("\\checkpoints\\")) return "image-generation-checkpoint";
  if (lowerPath.includes("/vae/") || lowerPath.includes("\\vae\\")) return "image-vae";
  if (lowerPath.includes("/loras/") || lowerPath.includes("\\loras\\")) return "image-lora";
  if (lowerPath.includes("/text_encoders/") || lowerPath.includes("\\text_encoders\\")) return "image-text-encoder";
  if (/(z[_-]?image|qwen[_-]?image|flux|wan2?|sdxl|stable[_-]?diffusion)/i.test(lowerName)) return "image-generation-research";
  if (/(vl|vision|omni)/i.test(lowerName)) return "vision-language";
  return "text-generation";
}

function recommendationForFile(item) {
  const name = item.normalizedName;
  if (name.includes("qwen34binstruct2507")) return "Evaluated smoke planner; useful for fast local loop checks.";
  if (name.includes("gemma431bit")) return "Installed quality planner candidate; benchmark next.";
  if (name.includes("magistralsmall2509")) return "Installed alternate planner; benchmark after Gemma.";
  if (name.includes("deepseekv4flash")) return "Installed heavyweight planner; benchmark only after load/memory test.";
  if (name.includes("qwen3vl8b") || name.includes("qwen3vl8binstruct")) return "Installed visual judge candidate; not yet wired into benchmark scoring.";
  if (name.includes("qwen3vl30b") || name.includes("qwen3vl30ba3b")) return "Installed high-quality visual judge candidate; likely slower.";
  if (name.includes("bgem3")) return "Installed embedding model for retrieval/duplicate checks.";
  if (name.includes("dreamshaper8pruned")) return "Evaluated local image baseline; keep but gate fake text/faces.";
  if (item.role.includes("image-generation")) return "Installed image research candidate; needs a repeatable ComfyUI workflow before benchmark promotion.";
  return "";
}

function modelMatchesFile(model, item) {
  if (["image-text-encoder", "image-vae", "image-lora", "multimodal-projector", "runtime"].includes(item.role)) {
    return false;
  }
  const modelKey = normalizeModelKey(model);
  return modelKey === item.normalizedName || modelKey.includes(item.normalizedName) || item.normalizedName.includes(modelKey);
}

function normalizeModelKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^koboldcpp\//, "")
    .replace(/^hf\.co\//, "")
    .replace(/\.(gguf|safetensors|ckpt|bin)$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function buildCoverageMarkdown(aggregate) {
  const lines = [
    "# Local Model Coverage",
    "",
    `Created: ${aggregate.createdAtIso}`,
    `Local model root: \`${aggregate.localModelRoot}\``,
    `ComfyUI model root: \`${aggregate.comfyModelsRoot}\``,
    "",
    "## Summary",
    "",
    `- Installed model/runtime files: ${aggregate.totals.installedModelFiles}`,
    `- Benchmark entries scanned: ${aggregate.totals.benchmarkEntries}`,
    `- Local benchmark entries scanned: ${aggregate.totals.localBenchmarkEntries}`,
    `- Evaluated text model ids: ${aggregate.totals.evaluatedTextModels}`,
    `- Evaluated image model ids: ${aggregate.totals.evaluatedImageModels}`,
    `- Locally evaluated text model ids: ${aggregate.totals.locallyEvaluatedTextModels}`,
    `- Locally evaluated image model ids: ${aggregate.totals.locallyEvaluatedImageModels}`,
    `- Installed files matched to local benchmark results: ${aggregate.totals.benchmarkedInstalledFiles}`,
    `- Recommended models installed: ${aggregate.totals.recommendedInstalled}`,
    `- Recommended models locally evaluated: ${aggregate.totals.recommendedEvaluated}`,
    `- Recommended models missing: ${aggregate.totals.recommendedMissing}`,
    "",
    "## Recommended Coverage",
    "",
    "| Model | Role | Installed | Local evaluated | Remote evaluated | Pull | Next action |",
    "|---|---|---:|---:|---:|---|---|"
  ];
  for (const item of aggregate.recommendedCoverage) {
    lines.push([
      item.id,
      item.role,
      item.installed ? "yes" : "no",
      item.evaluated ? "yes" : "no",
      item.evaluatedRemoteOnly || item.remotelyEvaluatedAs?.length ? "yes" : "no",
      item.pull,
      item.nextAction
    ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  lines.push("## Evaluated Models");
  lines.push("");
  lines.push("Local text:");
  for (const model of aggregate.evaluatedModels.localText) lines.push(`- \`${model}\``);
  lines.push("");
  lines.push("Local image:");
  for (const model of aggregate.evaluatedModels.localImage) lines.push(`- \`${model}\``);
  lines.push("");
  lines.push("All text, including remote providers:");
  for (const model of aggregate.evaluatedModels.text) lines.push(`- \`${model}\``);
  lines.push("");
  lines.push("All image, including remote providers:");
  for (const model of aggregate.evaluatedModels.image) lines.push(`- \`${model}\``);
  lines.push("");
  lines.push("## Pull Queue");
  lines.push("");
  if (!aggregate.pullQueue.length) {
    lines.push("No recommended models are missing.");
  } else {
    for (const item of aggregate.pullQueue) {
      lines.push(`- \`${item.id}\`: ${item.pull}. ${item.nextAction}`);
    }
  }
  lines.push("");
  lines.push("## Installed Inventory");
  lines.push("");
  lines.push("| Local benchmarked | Role | Size GB | File | Recommendation |");
  lines.push("|---:|---|---:|---|---|");
  for (const item of aggregate.inventory) {
    lines.push([
      item.benchmarked ? "yes" : "no",
      item.role,
      item.sizeGb,
      `\`${item.path}\``,
      item.recommendation
    ].map(markdownCell).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  return `${lines.join("\n")}\n`;
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
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

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
}
