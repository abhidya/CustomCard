import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");

if (isMainModule()) {
  const result = buildProductionTextEvidenceIndex(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    readinessReports: result.readinessReports.length,
    benchmarkSummaries: result.benchmarkSummaries.length,
    aggregates: result.aggregates.length
  }, null, 2));
}

export function buildProductionTextEvidenceIndex(args = {}) {
  const evidenceRoot = resolve(String(args.input || args["evidence-root"] || defaultEvidenceRoot));
  const outputRoot = resolve(String(args["output-root"] || evidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-evidence-index-${timestamp()}`));
  const includeUntracked = Boolean(args["include-untracked"]);
  const scanMode = includeUntracked ? "filesystem" : "git-tracked";
  const files = collectCandidateFiles(evidenceRoot, { includeUntracked });

  const readinessReports = files
    .filter((file) => basename(file) === "production-text-readiness.json")
    .map(readinessEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const preflights = files
    .filter((file) => basename(file) === "production-text-preflight.json")
    .map(preflightEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const aggregates = files
    .filter((file) => basename(file) === "benchmark-aggregate.json")
    .filter((file) => relativePath(file).includes("production-text"))
    .map(aggregateEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const benchmarkSummaries = files
    .filter((file) => basename(file).endsWith("-summary.json"))
    .filter((file) => relativePath(file).includes("production-text"))
    .map(benchmarkSummaryEntry)
    .filter(Boolean)
    .filter((entry) => entry.phase === "local-production-text")
    .sort(newestFirst);

  const latestReadiness = readinessReports[0];
  const latestAggregate = aggregates.find((entry) => entry.kind === "llm-planned") || aggregates[0];
  const latestBenchmark = benchmarkSummaries.find((entry) => entry.llmGeneratedRuns > 0) || benchmarkSummaries[0];
  const latestPreflight = preflights[0];
  const promotionReady = Boolean(
    latestReadiness?.promotionReady &&
    latestAggregate?.promotionReady &&
    latestBenchmark?.failedRuns === 0 &&
    latestBenchmark?.completedRuns >= 3
  );
  const status = promotionReady ? "promotion-ready" : "blocked";
  const findings = buildFindings({ latestReadiness, latestAggregate, latestBenchmark, latestPreflight });
  const nextSteps = buildNextSteps({ latestReadiness, latestAggregate, latestBenchmark, latestPreflight });
  const result = {
    createdAtIso: new Date().toISOString(),
    status,
    promotionReady,
    evidenceRoot: relativePath(evidenceRoot),
    includeUntracked,
    scanMode,
    latest: {
      readiness: latestReadiness?.path || "",
      preflight: latestPreflight?.path || "",
      aggregate: latestAggregate?.path || "",
      benchmark: latestBenchmark?.path || ""
    },
    findings,
    nextSteps,
    readinessReports,
    preflights,
    aggregates,
    benchmarkSummaries
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-evidence-index.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-evidence-index.md"), buildMarkdown(result));
  return result;
}

function collectCandidateFiles(root, options = {}) {
  if (!existsSync(root)) return [];
  if (!options.includeUntracked) {
    const tracked = collectTrackedFiles(root);
    return tracked.filter(isEvidenceCandidate).sort((a, b) => a.localeCompare(b));
  }
  const results = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const fullPath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      if (isEvidenceCandidate(fullPath)) results.push(fullPath);
    }
  }
  return results.sort((a, b) => a.localeCompare(b));
}

function collectTrackedFiles(root) {
  const relativeRoot = relativePath(root);
  for (const command of ["git", "git.exe", "C:\\Program Files\\Git\\cmd\\git.exe", "C:\\Program Files\\Git\\bin\\git.exe"]) {
    if (command.includes("\\") && !existsSync(command)) continue;
    try {
      const output = execFileSync(command, ["ls-files", "-z", relativeRoot], {
        cwd: repoRoot,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"]
      });
      return output
        .split("\0")
        .filter(Boolean)
        .map((filePath) => resolve(repoRoot, filePath));
    } catch {
      // Try the next executable name; the caller intentionally does not fall back to untracked files.
    }
  }
  return [];
}

function isEvidenceCandidate(filePath) {
  const name = basename(filePath);
  const rel = relativePath(filePath);
  return name === "production-text-readiness.json" ||
    name === "production-text-preflight.json" ||
    (name === "benchmark-aggregate.json" && rel.includes("production-text")) ||
    (name.endsWith("-summary.json") && rel.includes("production-text"));
}

function readinessEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: payload.status || "unknown",
    promotionReady: Boolean(payload.promotionReady),
    blockerCount: Array.isArray(payload.blockers) ? payload.blockers.length : 0,
    blockers: (payload.blockers || []).map((item) => item.name || String(item)).filter(Boolean),
    comfyReachable: Boolean(payload.comfy?.reachable),
    hasTextComposer: Boolean(payload.comfy?.hasTextComposer),
    activePlannerModels: unique((payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .filter((endpoint) => endpoint.reachable)
      .map((endpoint) => endpoint.activeModel || endpoint.baseUrl)),
    productionSuitablePlannerReachable: (payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .some((endpoint) => endpoint.reachable && endpoint.productionSuitable),
    smallPlannerActive: (payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .some((endpoint) => endpoint.reachable && endpoint.smallPlanner),
    nextSteps: payload.nextSteps || []
  };
}

function preflightEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: payload.status || (payload.ok ? "ok" : "blocked"),
    promotionReady: Boolean(payload.promotionReady),
    liveComfyReachable: Boolean(payload.liveComfyReachable),
    liveNodeAvailable: Boolean(payload.liveNodeAvailable),
    workflowPath: payload.workflowPath || "",
    nextSteps: payload.nextSteps || []
  };
}

function aggregateEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  const ranked = Array.isArray(payload.ranked) ? payload.ranked : [];
  const textModels = unique(ranked.map((entry) => entry.textModel).filter(Boolean));
  const statuses = countBy(ranked.map((entry) => entry.status || "unknown"));
  const manualGrades = ranked
    .map((entry) => ({
      fixtureId: entry.fixtureId || "",
      score: finiteNumber(entry.manualVisualGrade?.score ?? entry.score),
      status: entry.manualVisualGrade?.status || entry.status || "unknown",
      passed: entry.manualVisualGrade?.passed,
      recommendation: entry.manualVisualGrade?.recommendation || "",
      blockingFailures: entry.manualVisualGrade?.blockingFailures || [],
      path: entry.manualVisualGrade?.path || ""
    }))
    .filter((entry) => entry.fixtureId || entry.path);
  const promotionReady = ranked.length > 0 &&
    ranked.every((entry) => entry.status === "pass" && entry.manualVisualGrade?.passed);
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    kind: textModels.some(isSmallPlanner) ? "llm-planned" : "production-text-candidate",
    totalRuns: Number(payload.totalRuns ?? ranked.length ?? 0),
    statuses,
    promotionReady,
    bestScore: finiteNumber(ranked[0]?.score),
    bestRun: ranked[0]?.fixtureId || ranked[0]?.runId || "",
    textModels,
    imageModels: unique(ranked.map((entry) => entry.imageModel).filter(Boolean)),
    manualGrades,
    blockingFailures: unique(manualGrades.flatMap((entry) => entry.blockingFailures || []))
  };
}

function benchmarkSummaryEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload || !Array.isArray(payload.runs)) return undefined;
  const runs = payload.runs;
  const plannedRuns = Array.isArray(payload.plannedRuns) ? payload.plannedRuns : [];
  const completedRuns = runs.filter((run) => run.statusCode === 200 || run.panelCount > 0).length;
  const failedRuns = runs.filter((run) => run.status === "failed" || run.error).length;
  const missingMustInclude = unique(runs.flatMap((run) => run.autoChecks?.missingMustInclude || []));
  const mustAvoidFailures = unique(runs.flatMap((run) => run.autoChecks?.avoidedFailures || []));
  const textModels = unique([
    ...plannedRuns.map((run) => run.textModel),
    ...runs.map((run) => run.textModel || run.cardCopyModel)
  ].filter(Boolean));
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    phase: payload.phase || "",
    totalPlannedRuns: plannedRuns.length,
    totalRuns: runs.length,
    completedRuns,
    failedRuns,
    llmGeneratedRuns: runs.filter((run) => run.productionTextMode === "llm-generated-copy").length,
    fixtureRuns: runs.filter((run) => run.textAdapterId === "fixture").length,
    fixtures: unique(runs.map((run) => run.storyId).filter(Boolean)),
    textModels,
    smallPlannerUsed: textModels.some(isSmallPlanner),
    imageModels: unique(runs.map((run) => run.imageModel).filter(Boolean)),
    missingMustInclude,
    mustAvoidFailures,
    finalImagesRenderedByComfy: runs.every((run) => run.status === "failed" || run.autoChecks?.checks?.finalImagesRenderedByComfy === true),
    deterministicTextComposerUsed: runs.some((run) => run.typographyModeId === "customcard-production-text-composer")
  };
}

function buildFindings({ latestReadiness, latestAggregate, latestBenchmark, latestPreflight }) {
  const findings = [];
  if (latestPreflight?.liveComfyReachable && latestPreflight?.liveNodeAvailable) {
    findings.push("Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.");
  }
  if (latestReadiness?.smallPlannerActive) {
    findings.push("The currently reachable planner is a known-small smoke model, so current evidence must not be promoted.");
  }
  if (latestReadiness && !latestReadiness.productionSuitablePlannerReachable) {
    findings.push("No production-suitable planner endpoint is reachable/configured in the latest readiness report.");
  }
  if (latestBenchmark?.totalRuns >= 3) {
    findings.push(`The latest LLM-planned benchmark covers ${latestBenchmark.totalRuns} customer request runs.`);
  }
  if (latestBenchmark?.missingMustInclude?.length) {
    findings.push(`Planner/theme adherence is still failing required terms: ${latestBenchmark.missingMustInclude.join(", ")}.`);
  }
  if (latestAggregate && !latestAggregate.promotionReady) {
    findings.push(`Latest aggregate is blocked: best score ${latestAggregate.bestScore ?? "n/a"} across ${latestAggregate.totalRuns} run(s).`);
  }
  if (!findings.length) findings.push("No production-text evidence was found.");
  return findings;
}

function buildNextSteps({ latestReadiness, latestAggregate, latestBenchmark, latestPreflight }) {
  const steps = [];
  if (!latestPreflight?.liveComfyReachable || !latestPreflight?.liveNodeAvailable) {
    steps.push("Run production-text preflight with live Comfy and CustomCardTextComposer loaded.");
  }
  if (!latestReadiness?.productionSuitablePlannerReachable) {
    steps.push("Start or configure a production-suitable planner endpoint before collecting promotion evidence.");
  }
  if (latestReadiness?.smallPlannerActive || latestBenchmark?.smallPlannerUsed) {
    steps.push("Keep Qwen3-4B/small planner runs as smoke or failure evidence only.");
  }
  if (!latestBenchmark || latestBenchmark.completedRuns < 3 || latestBenchmark.failedRuns > 0) {
    steps.push("Run the full aquarium/koi/dog LLM-planned production-text matrix with the stronger planner.");
  }
  if (!latestAggregate?.promotionReady) {
    steps.push("Manually grade every production-text run and aggregate only after all candidates pass.");
  }
  return unique(steps);
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Evidence Index",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    "",
    "## Findings",
    ""
  ];
  for (const finding of result.findings) lines.push(`- ${finding}`);
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  lines.push("");
  lines.push("## Latest Evidence");
  lines.push("");
  lines.push("| Type | Path | Status | Key result |");
  lines.push("| --- | --- | --- | --- |");
  lines.push(latestRow("Readiness", result.readinessReports[0], readinessSummary));
  lines.push(latestRow("Preflight", result.preflights[0], preflightSummary));
  lines.push(latestRow("Aggregate", result.aggregates[0], aggregateSummary));
  lines.push(latestRow("Benchmark", result.benchmarkSummaries[0], benchmarkSummary));
  lines.push("");
  lines.push("## Aggregates");
  lines.push("");
  lines.push("| Created | Runs | Best score | Statuses | Text models | Path |");
  lines.push("| --- | ---:| ---:| --- | --- | --- |");
  for (const entry of result.aggregates.slice(0, 10)) {
    lines.push(`| ${entry.createdAtIso} | ${entry.totalRuns} | ${entry.bestScore ?? "n/a"} | ${markdownCell(JSON.stringify(entry.statuses))} | ${markdownCell(entry.textModels.join(", ") || "n/a")} | ${link(entry.path)} |`);
  }
  lines.push("");
  lines.push("## Benchmark Summaries");
  lines.push("");
  lines.push("| Created | Runs | Completed | Failed | Fixtures | Text models | Path |");
  lines.push("| --- | ---:| ---:| ---:| --- | --- | --- |");
  for (const entry of result.benchmarkSummaries.slice(0, 10)) {
    lines.push(`| ${entry.createdAtIso} | ${entry.totalRuns} | ${entry.completedRuns} | ${entry.failedRuns} | ${markdownCell(entry.fixtures.join(", ") || "n/a")} | ${markdownCell(entry.textModels.join(", ") || "n/a")} | ${link(entry.path)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function latestRow(label, entry, summarize) {
  if (!entry) return `| ${label} | n/a | missing | n/a |`;
  return `| ${label} | ${link(entry.path)} | ${markdownCell(entry.status || (entry.promotionReady ? "ready" : "blocked"))} | ${markdownCell(summarize(entry))} |`;
}

function readinessSummary(entry) {
  return `${entry.blockerCount} blocker(s); planner=${entry.activePlannerModels.join(", ") || "none"}`;
}

function preflightSummary(entry) {
  return `comfy=${entry.liveComfyReachable ? "yes" : "no"} node=${entry.liveNodeAvailable ? "yes" : "no"}`;
}

function aggregateSummary(entry) {
  return `${entry.totalRuns} run(s); best=${entry.bestScore ?? "n/a"}; ready=${entry.promotionReady ? "yes" : "no"}`;
}

function benchmarkSummary(entry) {
  return `${entry.completedRuns}/${entry.totalRuns} completed; failed=${entry.failedRuns}`;
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

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function isSmallPlanner(value) {
  return /(^|[-_/])(?:1\.5b|3b|4b|7b)([-_/]|$)/i.test(String(value || ""));
}

function newestFirst(a, b) {
  return String(b.createdAtIso || "").localeCompare(String(a.createdAtIso || ""));
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function link(filePath) {
  return `[open](${filePath.replace(/^docs\/evidence\/generated-card-comparisons\//, "../")})`;
}

function fileMtime(filePath) {
  try {
    return statSync(filePath).mtime.toISOString();
  } catch {
    return "";
  }
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
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

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
}
