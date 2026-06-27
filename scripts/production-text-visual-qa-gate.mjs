import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultRequiredFixtures = [
  "aquarium-lover-birthday",
  "koi-fish-lover-encouragement",
  "dog-lover-thank-you"
];

const qaChecks = [
  {
    key: "allPanelsRendered",
    expected: true,
    label: "all panels rendered",
    aliases: []
  },
  {
    key: "textMissing",
    expected: false,
    label: "no text missing",
    aliases: ["missingText"]
  },
  {
    key: "textOverflow",
    expected: false,
    label: "no text overflow",
    aliases: ["overflow"]
  },
  {
    key: "fakeTextOrGlyphsInArtwork",
    expected: false,
    label: "no fake/pseudo text in artwork",
    aliases: ["fakeTextInArtwork", "pseudoTextInArtwork", "fakeTextOrGlyphs"]
  },
  {
    key: "mockupOrObjectSceneLeakage",
    expected: false,
    label: "no mockup/object-scene leakage",
    aliases: ["objectSceneLeakage", "mockupArtifact", "mockupOrSceneLeakage"]
  },
  {
    key: "lowContrast",
    expected: false,
    label: "text contrast meets print threshold",
    aliases: ["lowTextContrast"]
  },
  {
    key: "peopleHandsOrFaces",
    expected: false,
    label: "no people, hands, or faces",
    aliases: ["peopleOrHands", "peopleOrFaces", "peopleHandsFaces"]
  }
];

if (isMainModule()) {
  const result = buildProductionTextVisualQaGate(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    totalRuns: result.summary.totalRuns,
    qaPassingRuns: result.summary.qaPassingRuns,
    blockers: result.blockers.length,
    advisory: result.advisory
  }, null, 2));
  if (!result.advisory && !result.promotionReady) process.exitCode = 1;
}

export function buildProductionTextVisualQaGate(args = {}) {
  const input = resolve(String(args.input || args.benchmark || defaultEvidenceRoot));
  const outputRoot = resolve(String(args["output-root"] || defaultEvidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-visual-qa-${timestamp()}`));
  const advisory = Boolean(args.advisory);
  const requiredFixtures = parseList(args.fixtures).length ? parseList(args.fixtures) : defaultRequiredFixtures;
  const summaryPath = findSummaryPath({ input, explicitSummary: args.summary });
  const payload = readJson(summaryPath);
  if (!payload?.runs || !Array.isArray(payload.runs)) {
    throw new Error(`Production-text benchmark summary is missing runs: ${summaryPath}`);
  }

  const runs = payload.runs.map((run) => visualQaRunEntry(run));
  const summary = summarizeRuns(runs, requiredFixtures);
  const blockers = buildBlockers(summary, runs, requiredFixtures);
  const promotionReady = blockers.length === 0 &&
    requiredFixtures.length > 0 &&
    requiredFixtures.every((fixture) => runs.some((run) => run.storyId === fixture && run.qaPassed));
  const result = {
    createdAtIso: new Date().toISOString(),
    status: promotionReady ? "promotion-ready" : "blocked",
    promotionReady,
    advisory,
    benchmarkSummary: relativePath(summaryPath),
    benchmarkCreatedAtIso: payload.createdAtIso || fileMtime(summaryPath),
    phase: payload.phase || "",
    phaseDir: payload.phaseDir || "",
    requiredFixtures,
    qaContract: {
      field: "productionTextQa",
      requiredChecks: qaChecks.map((check) => ({
        key: check.key,
        expected: check.expected,
        label: check.label
      }))
    },
    summary,
    blockers,
    runs,
    nextSteps: buildNextSteps(summary, blockers)
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-visual-qa-gate.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-visual-qa-gate.md"), buildMarkdown(result, reportDir));
  return result;
}

function visualQaRunEntry(run) {
  const runDir = resolveRunDir(run.runDir);
  const gradePath = runDir ? resolve(runDir, "manual-visual-grade.json") : "";
  const grade = readJson(gradePath);
  const qa = normalizeProductionTextQa(grade);
  const generatedVisuals = isCompletedBenchmarkRun(run);
  const failedBeforeImageGeneration = isFailedBenchmarkRun(run) && !generatedVisuals;
  const finalImagesRenderedByComfy = Boolean(run.autoChecks?.checks?.finalImagesRenderedByComfy);
  const deterministicTextComposerUsed = run.typographyModeId === "customcard-production-text-composer";
  const manualGradePresent = Boolean(grade);
  const qaExpected = generatedVisuals;
  const qaResult = evaluateQaChecks({ run, qa, qaExpected, finalImagesRenderedByComfy, deterministicTextComposerUsed });
  return {
    storyId: run.storyId || "",
    textModel: run.textModel || run.cardCopyModel || "",
    imageModel: run.imageModel || "",
    runDir: runDir ? relativePath(runDir) : "",
    panelCount: Number(run.panelCount || 0),
    status: run.status || "",
    statusCode: run.statusCode ?? null,
    generatedVisuals,
    failedBeforeImageGeneration,
    contactSheet: run.contactSheet ? relativePath(resolveRunPath(run.contactSheet)) : "",
    manualGradePath: manualGradePresent ? relativePath(gradePath) : "",
    manualGradePresent,
    manualGradePassed: grade?.passed === true,
    manualGradeStatus: grade?.status || "",
    manualBlockingFailures: Array.isArray(grade?.blockingFailures) ? grade.blockingFailures : [],
    qaExpected,
    qaPresent: Boolean(qa),
    qaPassed: qaResult.passed,
    qaChecks: qaResult.checks,
    qaFailures: qaResult.failures,
    finalImagesRenderedByComfy,
    deterministicTextComposerUsed
  };
}

function normalizeProductionTextQa(grade) {
  const qa = grade?.productionTextQa || grade?.production_text_qa || grade?.visualQa || grade?.visual_qa;
  if (!qa || typeof qa !== "object" || Array.isArray(qa)) return undefined;
  const normalized = {};
  for (const check of qaChecks) {
    normalized[check.key] = firstDefined([qa[check.key], ...check.aliases.map((alias) => qa[alias])]);
  }
  return normalized;
}

function evaluateQaChecks({ run, qa, qaExpected, finalImagesRenderedByComfy, deterministicTextComposerUsed }) {
  const checks = [];
  const failures = [];
  if (!qaExpected) {
    return { passed: false, checks, failures };
  }
  if (!qa) {
    return {
      passed: false,
      checks,
      failures: ["structured productionTextQa is missing from manual-visual-grade.json"]
    };
  }
  for (const check of qaChecks) {
    const actual = qa[check.key];
    const present = typeof actual === "boolean";
    const ok = present && actual === check.expected;
    checks.push({
      key: check.key,
      label: check.label,
      expected: check.expected,
      actual: present ? actual : null,
      ok
    });
    if (!present) failures.push(`${check.key} must be a boolean`);
    else if (!ok) failures.push(`${check.label} failed`);
  }
  if (Number(run.panelCount || 0) < 4) failures.push(`expected 4 rendered panels, got ${Number(run.panelCount || 0)}`);
  if (!finalImagesRenderedByComfy) failures.push("final images were not proven to come from Comfy text composer");
  if (!deterministicTextComposerUsed) failures.push("CustomCardTextComposer typography mode was not used");
  return {
    passed: failures.length === 0,
    checks,
    failures
  };
}

function summarizeRuns(runs, requiredFixtures) {
  const requiredPassingFixtures = requiredFixtures.filter((fixture) =>
    runs.some((run) => run.storyId === fixture && run.qaPassed)
  );
  return {
    totalRuns: runs.length,
    requiredFixtures: requiredFixtures.length,
    requiredPassingFixtures: requiredPassingFixtures.length,
    missingRequiredFixtures: requiredFixtures.filter((fixture) => !runs.some((run) => run.storyId === fixture)),
    generatedRuns: runs.filter((run) => run.generatedVisuals).length,
    completedPanelRuns: runs.filter((run) => run.generatedVisuals && run.panelCount >= 4).length,
    failedBeforeImageGeneration: runs.filter((run) => run.failedBeforeImageGeneration).length,
    qaExpectedRuns: runs.filter((run) => run.qaExpected).length,
    qaCheckedRuns: runs.filter((run) => run.qaExpected && run.qaPresent).length,
    qaPassingRuns: runs.filter((run) => run.qaPassed).length,
    missingManualGrades: runs.filter((run) => run.qaExpected && !run.manualGradePresent).length,
    missingStructuredQa: runs.filter((run) => run.qaExpected && run.manualGradePresent && !run.qaPresent).length,
    failingQaRuns: runs.filter((run) => run.qaExpected && run.qaPresent && !run.qaPassed).length,
    finalComfyRuns: runs.filter((run) => run.generatedVisuals && run.finalImagesRenderedByComfy).length,
    deterministicTextComposerRuns: runs.filter((run) => run.generatedVisuals && run.deterministicTextComposerUsed).length
  };
}

function buildBlockers(summary, runs, requiredFixtures) {
  const blockers = [];
  if (summary.missingRequiredFixtures.length) {
    blockers.push(`Missing required fixture(s): ${summary.missingRequiredFixtures.join(", ")}.`);
  }
  if (summary.requiredPassingFixtures < requiredFixtures.length) {
    blockers.push(`${summary.requiredPassingFixtures}/${requiredFixtures.length} required fixture(s) have passing production visual QA.`);
  }
  if (summary.failedBeforeImageGeneration > 0) {
    blockers.push(`${summary.failedBeforeImageGeneration} run(s) failed before image generation.`);
  }
  if (summary.missingManualGrades > 0) {
    blockers.push(`${summary.missingManualGrades} generated run(s) are missing manual-visual-grade.json.`);
  }
  if (summary.missingStructuredQa > 0) {
    blockers.push(`${summary.missingStructuredQa} generated run(s) are missing structured productionTextQa.`);
  }
  if (summary.failingQaRuns > 0) {
    const details = runs
      .filter((run) => run.qaExpected && run.qaPresent && !run.qaPassed)
      .flatMap((run) => run.qaFailures.map((failure) => `${run.storyId}: ${failure}`));
    blockers.push(`Production visual QA failed: ${details.join("; ")}.`);
  }
  const generatedButNotComfy = runs.filter((run) => run.generatedVisuals && !run.finalImagesRenderedByComfy);
  if (generatedButNotComfy.length) {
    blockers.push(`${generatedButNotComfy.length} generated run(s) do not prove final images came from Comfy text composer.`);
  }
  const generatedButNoComposer = runs.filter((run) => run.generatedVisuals && !run.deterministicTextComposerUsed);
  if (generatedButNoComposer.length) {
    blockers.push(`${generatedButNoComposer.length} generated run(s) do not prove CustomCardTextComposer typography mode.`);
  }
  return blockers;
}

function buildNextSteps(summary, blockers) {
  const steps = [];
  if (summary.failedBeforeImageGeneration > 0) {
    steps.push("Rerun failed stories with a production-class planner before visual QA can pass.");
  }
  if (summary.missingManualGrades > 0 || summary.missingStructuredQa > 0) {
    steps.push("Fill manual-visual-grade.json with a productionTextQa object for every generated production-text run.");
  }
  if (blockers.some((item) => /visual QA failed/i.test(item))) {
    steps.push("Fix or reject runs with text overflow, missing text, fake text, mockup/object leakage, people/hands/faces, or low contrast before aggregation.");
  }
  if (!steps.length) steps.push("Refresh the evidence index and promotion gate with this visual QA report tracked.");
  return unique(steps);
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
    "# Production Text Visual QA Gate",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    `Benchmark summary: ${linkFrom(reportDir, result.benchmarkSummary)}`,
    "",
    "## Summary",
    "",
    `- Required fixtures passing QA: ${result.summary.requiredPassingFixtures}/${result.summary.requiredFixtures}`,
    `- Generated runs: ${result.summary.generatedRuns}`,
    `- QA checked runs: ${result.summary.qaCheckedRuns}/${result.summary.qaExpectedRuns}`,
    `- QA passing runs: ${result.summary.qaPassingRuns}`,
    `- Missing manual grades: ${result.summary.missingManualGrades}`,
    `- Missing structured QA: ${result.summary.missingStructuredQa}`,
    `- Failed before image generation: ${result.summary.failedBeforeImageGeneration}`,
    "",
    "## Required Checks",
    ""
  ];
  for (const check of result.qaContract.requiredChecks) {
    lines.push(`- ${check.key}: expected ${check.expected}`);
  }
  lines.push("", "## Blockers", "");
  if (result.blockers.length) {
    for (const blocker of result.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push("- none");
  }
  lines.push("", "## Next Steps", "");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  lines.push("", "## Runs", "");
  lines.push("| Story | Visuals | Panels | Grade | QA | Failures | Contact sheet |");
  lines.push("| --- | --- | ---:| --- | --- | --- | --- |");
  for (const run of result.runs) {
    lines.push([
      run.storyId || "n/a",
      run.generatedVisuals ? "yes" : "no",
      run.panelCount,
      run.manualGradePath ? linkFrom(reportDir, run.manualGradePath, run.manualGradeStatus || "grade") : run.qaExpected ? "missing" : "not required",
      run.qaPassed ? "pass" : run.qaExpected ? "blocked" : "not required",
      markdownCell(run.qaFailures.join("; ") || "none"),
      run.contactSheet ? linkFrom(reportDir, run.contactSheet) : "n/a"
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  return `${lines.join("\n")}\n`;
}

function isCompletedBenchmarkRun(run) {
  return Number(run?.statusCode || 0) === 200 || Number(run?.panelCount || 0) > 0 || Boolean(run?.contactSheet);
}

function isFailedBenchmarkRun(run) {
  return run?.status === "failed" ||
    Boolean(run?.error) ||
    Number(run?.statusCode || 0) >= 400 ||
    Object.keys(run?.providerFailures || {}).length > 0;
}

function firstDefined(values) {
  return values.find((value) => value !== undefined);
}

function resolveRunDir(value) {
  return value ? resolve(repoRoot, String(value)) : "";
}

function resolveRunPath(value) {
  return value ? resolve(repoRoot, String(value)) : "";
}

function readJson(filePath) {
  if (!filePath) return undefined;
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function parseList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
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
