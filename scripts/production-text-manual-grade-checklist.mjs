import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");

if (isMainModule()) {
  const result = buildProductionTextManualGradeChecklist(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    totalRuns: result.summary.totalRuns,
    gradableRuns: result.summary.gradableRuns,
    gradedGeneratedRuns: result.summary.gradedGeneratedRuns,
    manualGradesPresent: result.summary.gradedRuns,
    missingGrades: result.summary.missingGrades,
    failedBeforeImageGeneration: result.summary.failedBeforeImageGeneration
  }, null, 2));
  if (!result.advisory && !result.promotionReady) process.exitCode = 1;
}

export function buildProductionTextManualGradeChecklist(args = {}) {
  const input = resolve(String(args.input || args.benchmark || defaultEvidenceRoot));
  const outputRoot = resolve(String(args["output-root"] || defaultEvidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-manual-grade-checklist-${timestamp()}`));
  const advisory = Boolean(args.advisory);
  const summaryPath = findSummaryPath({ input, explicitSummary: args.summary });
  const payload = readJson(summaryPath);
  if (!payload?.runs || !Array.isArray(payload.runs)) {
    throw new Error(`Production-text benchmark summary is missing runs: ${summaryPath}`);
  }

  const runs = payload.runs.map((run) => checklistRunEntry(run, payload));
  const summary = summarizeRuns(runs);
  const blockers = buildBlockers(summary, runs);
  const promotionReady = blockers.length === 0 && summary.totalRuns > 0 && summary.gradableRuns === summary.gradedGeneratedRuns;
  const result = {
    createdAtIso: new Date().toISOString(),
    status: promotionReady ? "promotion-ready" : "blocked",
    promotionReady,
    advisory,
    benchmarkSummary: relativePath(summaryPath),
    benchmarkCreatedAtIso: payload.createdAtIso || fileMtime(summaryPath),
    phase: payload.phase || "",
    phaseDir: payload.phaseDir || "",
    summary,
    blockers,
    runs,
    nextSteps: buildNextSteps(summary, blockers)
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-manual-grade-checklist.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-manual-grade-checklist.md"), buildMarkdown(result, reportDir));
  return result;
}

function checklistRunEntry(run, benchmark) {
  const runDir = resolveRunDir(run.runDir);
  const gradePath = resolve(runDir, "manual-visual-grade.json");
  const templatePath = resolve(runDir, "manual-grade-template.md");
  const grade = readJson(gradePath);
  const gradeValidation = validateManualGrade(grade);
  const generatedVisuals = Boolean(run.statusCode === 200 || Number(run.panelCount) > 0 || run.contactSheet);
  const failedBeforeImageGeneration = Boolean((run.status === "failed" || run.error) && !generatedVisuals);
  const gradeExpected = generatedVisuals;
  const gradePresent = Boolean(grade);
  const passed = grade?.passed === true;
  const gradeStatus = grade?.status || (grade?.passed === true ? "pass" : grade?.passed === false ? "blocked" : "");
  return {
    storyId: run.storyId || "",
    productionTextMode: run.productionTextMode || "",
    textModel: run.textModel || run.cardCopyModel || "",
    imageModel: run.imageModel || "",
    runDir: runDir ? relativePath(runDir) : "",
    generatedVisuals,
    failedBeforeImageGeneration,
    status: run.status || "",
    statusCode: run.statusCode ?? null,
    error: run.error || "",
    panelCount: Number(run.panelCount || 0),
    providerCallCount: Number(run.providerCallCount || 0),
    contactSheet: run.contactSheet ? relativePath(resolveRunPath(run.contactSheet)) : "",
    manualGradeTemplate: existsSync(templatePath) ? relativePath(templatePath) : "",
    manualGradePath: gradePresent ? relativePath(gradePath) : "",
    gradeExpected,
    gradePresent,
    gradeValid: gradePresent && gradeValidation.valid,
    gradeIssues: gradeValidation.issues,
    score: finiteNumber(grade?.totalScore ?? grade?.score),
    productScore: finiteNumber(grade?.productScore),
    contractScore: finiteNumber(grade?.contractScore),
    gradeStatus,
    passed,
    productionRecommendation: grade?.productionRecommendation || "",
    blockingFailures: Array.isArray(grade?.blockingFailures) ? grade.blockingFailures : [],
    notes: grade?.notes || "",
    missingMustInclude: run.autoChecks?.missingMustInclude || [],
    avoidedFailures: run.autoChecks?.avoidedFailures || [],
    benchmarkSummary: benchmark.createdAtIso || ""
  };
}

function summarizeRuns(runs) {
  const gradableRuns = runs.filter((run) => run.gradeExpected);
  const gradedRuns = runs.filter((run) => run.gradePresent);
  return {
    totalRuns: runs.length,
    gradableRuns: gradableRuns.length,
    generatedVisualRuns: runs.filter((run) => run.generatedVisuals).length,
    gradedGeneratedRuns: runs.filter((run) => run.gradeExpected && run.gradePresent).length,
    gradedRuns: gradedRuns.length,
    validGrades: runs.filter((run) => run.gradeValid).length,
    missingGrades: runs.filter((run) => run.gradeExpected && !run.gradePresent).length,
    invalidGrades: runs.filter((run) => run.gradePresent && !run.gradeValid).length,
    passingGrades: runs.filter((run) => run.gradeValid && run.passed).length,
    blockedGrades: runs.filter((run) => run.gradeValid && !run.passed).length,
    failedBeforeImageGeneration: runs.filter((run) => run.failedBeforeImageGeneration).length,
    failedRuns: runs.filter((run) => run.status === "failed" || run.error).length,
    stories: runs.map((run) => run.storyId).filter(Boolean)
  };
}

function buildBlockers(summary, runs) {
  const blockers = [];
  if (summary.missingGrades > 0) {
    blockers.push(`${summary.missingGrades} generated run(s) are missing manual-visual-grade.json.`);
  }
  if (summary.invalidGrades > 0) {
    blockers.push(`${summary.invalidGrades} manual grade file(s) are incomplete or invalid.`);
  }
  if (summary.blockedGrades > 0) {
    blockers.push(`${summary.blockedGrades} manual grade(s) are blocked or failed.`);
  }
  if (summary.failedBeforeImageGeneration > 0) {
    blockers.push(`${summary.failedBeforeImageGeneration} run(s) failed before image generation.`);
  }
  const missingTerms = unique(runs.flatMap((run) => run.missingMustInclude || []));
  if (missingTerms.length) {
    blockers.push(`Automated must_include checks failed for: ${missingTerms.join(", ")}.`);
  }
  const avoidedTerms = unique(runs.flatMap((run) => run.avoidedFailures || []));
  if (avoidedTerms.length) {
    blockers.push(`Automated must_avoid checks failed for: ${avoidedTerms.join(", ")}.`);
  }
  return blockers;
}

function buildNextSteps(summary, blockers) {
  const steps = [];
  if (summary.missingGrades > 0) steps.push("Grade every generated contact sheet and write manual-visual-grade.json next to the run-result.json.");
  if (summary.invalidGrades > 0) steps.push("Fix malformed manual grade files so each has numeric totalScore/score, status, passed, productionRecommendation, and blockingFailures.");
  if (summary.failedBeforeImageGeneration > 0) steps.push("Rerun failed stories only after the planner preflight proves a production-floor model and output budget.");
  if (blockers.some((item) => /must_include|must_avoid/i.test(item))) steps.push("Fix planner contract adherence before spending more Comfy image work.");
  if (!steps.length) steps.push("Run benchmark aggregate and promotion gate against the graded production-text evidence.");
  return unique(steps);
}

function validateManualGrade(grade) {
  if (!grade) return { valid: false, issues: ["manual-visual-grade.json is missing"] };
  const issues = [];
  if (!Number.isFinite(Number(grade.totalScore ?? grade.score))) issues.push("totalScore or score must be numeric");
  if (!String(grade.status || "").trim()) issues.push("status is missing");
  if (typeof grade.passed !== "boolean") issues.push("passed must be boolean");
  if (!String(grade.productionRecommendation || "").trim()) issues.push("productionRecommendation is missing");
  if (!Array.isArray(grade.blockingFailures)) issues.push("blockingFailures must be an array");
  return { valid: issues.length === 0, issues };
}

function findSummaryPath({ input, explicitSummary }) {
  if (explicitSummary) return resolve(String(explicitSummary));
  if (existsSync(input) && statSync(input).isFile()) return input;
  const summaries = collectJsonFiles(input)
    .filter((file) => basename(file).endsWith("-summary.json"))
    .map((file) => ({ file, payload: readJson(file) }))
    .filter((entry) => entry.payload?.phase === "local-production-text" && Array.isArray(entry.payload.runs))
    .sort((a, b) => String(b.payload.createdAtIso || fileMtime(b.file)).localeCompare(String(a.payload.createdAtIso || fileMtime(a.file))));
  if (!summaries.length) throw new Error(`No local-production-text benchmark summary found under ${input}`);
  return summaries[0].file;
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

function buildMarkdown(result, reportDir) {
  const lines = [
    "# Production Text Manual Grade Checklist",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    `Benchmark summary: ${linkFrom(reportDir, result.benchmarkSummary)}`,
    "",
    "## Summary",
    "",
    `- Total runs: ${result.summary.totalRuns}`,
    `- Gradable generated runs: ${result.summary.gradableRuns}`,
    `- Graded generated runs: ${result.summary.gradedGeneratedRuns}`,
    `- Manual grades present: ${result.summary.gradedRuns}`,
    `- Missing grades: ${result.summary.missingGrades}`,
    `- Invalid grades: ${result.summary.invalidGrades}`,
    `- Failed before image generation: ${result.summary.failedBeforeImageGeneration}`,
    "",
    "## Blockers",
    ""
  ];
  if (result.blockers.length) {
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push("- none");
  }
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  lines.push("");
  lines.push("## Runs");
  lines.push("");
  lines.push("| Story | Run state | Visuals | Grade | Score | Recommendation | Contact sheet | Blockers |");
  lines.push("| --- | --- | --- | --- | ---:| --- | --- | --- |");
  for (const run of result.runs) {
    lines.push([
      run.storyId || "n/a",
      runState(run),
      run.generatedVisuals ? "yes" : "no",
      gradeCell(run, reportDir),
      run.score ?? "n/a",
      markdownCell(run.productionRecommendation || "n/a"),
      run.contactSheet ? linkFrom(reportDir, run.contactSheet) : "n/a",
      markdownCell([...run.gradeIssues, ...run.blockingFailures].join("; ") || "none")
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  return `${lines.join("\n")}\n`;
}

function gradeCell(run, reportDir) {
  if (!run.gradePresent) return run.gradeExpected ? "missing" : "not required";
  const label = run.gradeValid ? run.gradeStatus || "open" : "invalid";
  return linkFrom(reportDir, run.manualGradePath, label);
}

function runState(run) {
  if (run.failedBeforeImageGeneration) return "failed-before-image-generation";
  if (run.status) return run.status;
  if (run.statusCode) return `status-${run.statusCode}`;
  return "unknown";
}

function resolveRunDir(value) {
  return value ? resolve(repoRoot, String(value)) : "";
}

function resolveRunPath(value) {
  return value ? resolve(repoRoot, String(value)) : "";
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function linkFrom(fromDir, targetPath, label = "open") {
  const target = resolve(repoRoot, targetPath);
  const rel = relative(fromDir, target).replaceAll("\\", "/");
  return `[${markdownCell(label)}](${rel})`;
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
  return process.argv[1] && resolve(process.argv[1]) === import.meta.filename;
}
