import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultInputDir = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultOutputDir = resolve(defaultInputDir, "benchmark-aggregate");

if (isMainModule()) {
  await main();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = resolve(args.input || defaultInputDir);
  const outputDir = resolve(args["output-dir"] || defaultOutputDir);
  const files = collectJsonFiles(inputDir);
  const phaseFilter = parseListArg(args.phase);
  const entries = [
    ...files.filter((file) => basename(file) === "debug-log.json").flatMap(readLocalComfyDebugLog),
    ...files.filter((file) => basename(file).endsWith("-summary.json")).flatMap(readModelBenchmarkSummary)
  ].filter(Boolean).filter((entry) => !phaseFilter.length || phaseFilter.includes(entry.phase || entry.settings?.phase));
  const ranked = rankEntries(entries);
  const aggregate = {
    createdAtIso: new Date().toISOString(),
    inputDir: relativePath(inputDir),
    outputDir: relativePath(outputDir),
    phaseFilter,
    totalRuns: entries.length,
    ranked
  };
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, "benchmark-aggregate.json"), aggregate);
  writeMarkdown(resolve(outputDir, "benchmark-rankings.md"), buildRankingsMarkdown(aggregate));
  console.log(JSON.stringify({
    outputDir: relativePath(outputDir),
    totalRuns: entries.length,
    topRun: ranked[0]?.runId || ranked[0]?.sourceFile || ""
  }, null, 2));
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
    benchmarkKind: "local-comfyui",
      sourceFile: relativePath(filePath),
      runId: payload.runId,
      phase: payload.phase,
      createdAtIso: payload.createdAtIso,
    fixtureId: fixture.id,
    textAdapterId: "deterministic-local-copy",
    textModel: "fixture-specific-local-copy",
    imageAdapterId: "local-comfyui-api",
    imageModel: payload.checkpoint,
    provider: "local-comfyui",
    technique: "txt2img-plus-app-text-overlay",
    score: fixture.quality?.score,
    status: fixture.quality?.status,
    passed: fixture.quality?.passed,
    total: fixture.quality?.total,
    panelCount: fixture.panelCount,
    contactSheet: fixture.contactSheet,
    settings: {
      dimensions: payload.dimensions,
      steps: payload.steps,
      cfg: payload.cfg,
      sampler: payload.sampler,
      scheduler: payload.scheduler,
      device: payload.systemStats?.devices?.[0]?.name
    }
  }));
}

function readModelBenchmarkSummary(filePath) {
  const payload = readJson(filePath);
  if (!payload?.runs || !Array.isArray(payload.runs)) return [];
  return payload.runs.map((run) => {
    const autoScore = scoreAutoChecks(run.autoChecks);
    const manualVisualGrade = readManualVisualGrade(run);
    return {
      benchmarkKind: "model-benchmark-loop",
      sourceFile: relativePath(filePath),
      runId: `${payload.phaseDir || payload.phase}:${run.storyId || "story"}:${run.textCandidateId || run.textAdapterId}:${run.imageCandidateId || run.imageAdapterId}`,
      phase: payload.phase,
      createdAtIso: run.finishedAt || payload.createdAtIso,
      fixtureId: run.storyId,
      textAdapterId: run.textAdapterId,
      textModel: run.cardCopyModel || run.textModel,
      imageAdapterId: run.imageAdapterId,
      imageModel: run.imageModel,
      provider: run.imageAdapterId,
      technique: run.typographyStrategy || run.focus || payload.phase,
      score: manualVisualGrade?.score ?? autoScore.score,
      status: manualVisualGrade?.status || run.status || (run.statusCode === 200 ? "pass" : run.statusCode ? `status-${run.statusCode}` : "unknown"),
      passed: autoScore.passed,
      total: autoScore.total,
      autoScore: autoScore.score,
      manualVisualGrade,
      panelCount: run.panelCount,
      providerCallCount: run.providerCallCount,
      contactSheet: run.contactSheet ? relativePath(run.contactSheet) : undefined,
      settings: {
        phase: payload.phase,
        phaseDir: payload.phaseDir,
        localOnlyNetworkGuard: payload.localOnlyNetworkGuard
      }
    };
  });
}

function readManualVisualGrade(run) {
  if (!run?.runDir) return undefined;
  const gradePath = resolve(repoRoot, run.runDir, "manual-visual-grade.json");
  const grade = readJson(gradePath);
  if (!grade) return undefined;
  const score = Number(grade.totalScore ?? grade.score);
  return {
    path: relativePath(gradePath),
    score: Number.isFinite(score) ? score : undefined,
    status: grade.status || (grade.passed === true ? "pass" : grade.passed === false ? "blocked" : undefined),
    passed: grade.passed,
    recommendation: grade.productionRecommendation,
    blockingFailures: Array.isArray(grade.blockingFailures) ? grade.blockingFailures : []
  };
}

function scoreAutoChecks(autoChecks) {
  const checks = autoChecks?.checks || {};
  const booleans = Object.values(checks).filter((value) => typeof value === "boolean");
  const passed = booleans.filter(Boolean).length;
  const total = booleans.length;
  return {
    score: total ? Math.round((passed / total) * 100) : undefined,
    passed,
    total
  };
}

function rankEntries(entries) {
  return entries
    .map((entry) => ({
      ...entry,
      score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : undefined
    }))
    .sort((a, b) => {
      const scoreDelta = (b.score ?? -1) - (a.score ?? -1);
      if (scoreDelta !== 0) return scoreDelta;
      return String(b.createdAtIso || "").localeCompare(String(a.createdAtIso || ""));
    })
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

function buildRankingsMarkdown(aggregate) {
  const lines = [
    "# Benchmark Aggregate Rankings",
    "",
    `Created: ${aggregate.createdAtIso}`,
    `Runs: ${aggregate.totalRuns}`,
    aggregate.phaseFilter?.length ? `Phase filter: ${aggregate.phaseFilter.join(", ")}` : "",
    "",
    "| Rank | Score | Status | Visual grade | Fixture | Text model | Image model | Provider | Technique | Contact sheet |",
    "|---:|---:|---|---|---|---|---|---|---|---|"
  ];
  for (const entry of aggregate.ranked) {
    lines.push([
      entry.rank,
      entry.score ?? "n/a",
      entry.status || "unknown",
      visualGradeCell(entry.manualVisualGrade),
      entry.fixtureId || "n/a",
      markdownCell(entry.textModel || entry.textAdapterId || "n/a"),
      markdownCell(entry.imageModel || entry.imageAdapterId || "n/a"),
      markdownCell(entry.provider || "n/a"),
      markdownCell(entry.technique || "n/a"),
      entry.contactSheet ? `[open](../${entry.contactSheet.replace(/^docs\/evidence\/generated-card-comparisons\//, "")})` : "n/a"
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("");
  lines.push("Scores prefer manual visual grades when present, then deterministic QA scorecards, then advisory benchmark-loop auto-check booleans. Human visual grades should be added before production promotion.");
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

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function visualGradeCell(grade) {
  if (!grade) return "n/a";
  const label = [grade.score ?? "n/a", grade.recommendation].filter(Boolean).join(" / ");
  const displayPath = grade.path?.replace(/\.json$/, ".md");
  return displayPath ? `[${markdownCell(label || "open")}](../${displayPath.replace(/^docs\/evidence\/generated-card-comparisons\//, "")})` : markdownCell(label || "manual");
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

function parseListArg(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function isMainModule() {
  return process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
}
