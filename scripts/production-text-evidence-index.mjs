import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { missingLocalGpuResidencyEvidence } from "./local-kobold-gpu-residency.mjs";
import { isSmallPlanner } from "./production-text-planner-policy.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultEvidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");

if (isMainModule()) {
  const result = buildProductionTextEvidenceIndex(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    rerunPlans: result.rerunPlans.length,
    plannerPreflights: result.plannerPreflights.length,
    readinessReports: result.readinessReports.length,
    modelCoverageReports: result.modelCoverageReports.length,
    dryRunReports: result.dryRunReports.length,
    manualGradeChecklists: result.manualGradeChecklists.length,
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

  const rerunPlans = files
    .filter((file) => basename(file) === "production-text-rerun-plan.json")
    .map(rerunPlanEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const plannerPreflights = files
    .filter((file) => basename(file) === "production-text-planner-preflight.json")
    .map(plannerPreflightEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const readinessReports = files
    .filter((file) => basename(file) === "production-text-readiness.json")
    .map(readinessEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const modelCoverageReports = files
    .filter((file) => basename(file) === "local-model-coverage.json")
    .map(modelCoverageEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const preflights = files
    .filter((file) => basename(file) === "production-text-preflight.json")
    .map(preflightEntry)
    .filter(Boolean)
    .sort(newestFirst);
  const dryRunReports = files
    .filter((file) => basename(file).endsWith("-dry-run.json"))
    .filter((file) => relativePath(file).includes("production-text"))
    .map(dryRunEntry)
    .filter(Boolean)
    .filter((entry) => entry.phase === "local-production-text")
    .sort(newestFirst);
  const manualGradeChecklists = files
    .filter((file) => basename(file) === "production-text-manual-grade-checklist.json")
    .map(manualGradeChecklistEntry)
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

  const latestRerunPlan = rerunPlans[0];
  const latestPlannerPreflight = plannerPreflights[0];
  const latestReadiness = readinessReports[0];
  const latestModelCoverage = modelCoverageReports[0];
  const latestAggregate = aggregates.find((entry) => entry.kind === "llm-planned") || aggregates[0];
  const latestBenchmark = benchmarkSummaries.find((entry) => entry.llmGeneratedRuns > 0) || benchmarkSummaries[0];
  const latestPreflight = preflights[0];
  const latestDryRun = dryRunReports[0];
  const latestManualGradeChecklist = manualGradeChecklists[0];
  const plannerEvidenceAlignment = comparePlannerEvidence(latestPlannerPreflight, latestBenchmark);
  const promotionReady = Boolean(
    latestReadiness?.promotionReady &&
    latestPlannerPreflight?.promotionReady &&
    plannerEvidenceAlignment.ok &&
    latestManualGradeChecklist?.promotionReady &&
    latestAggregate?.promotionReady &&
    latestBenchmark?.failedRuns === 0 &&
    latestBenchmark?.completedRuns >= 3
  );
  const status = promotionReady ? "promotion-ready" : "blocked";
  const findings = buildFindings({
    latestPlannerPreflight,
    latestReadiness,
    latestModelCoverage,
    latestAggregate,
    latestBenchmark,
    latestPreflight,
    latestDryRun,
    latestManualGradeChecklist,
    plannerEvidenceAlignment
  });
  const nextSteps = buildNextSteps({
    latestPlannerPreflight,
    latestReadiness,
    latestModelCoverage,
    latestAggregate,
    latestBenchmark,
    latestPreflight,
    latestDryRun,
    latestManualGradeChecklist,
    plannerEvidenceAlignment
  });
  const result = {
    createdAtIso: new Date().toISOString(),
    status,
    promotionReady,
    evidenceRoot: relativePath(evidenceRoot),
    includeUntracked,
    scanMode,
    latest: {
      readiness: latestReadiness?.path || "",
      modelCoverage: latestModelCoverage?.path || "",
      rerunPlan: latestRerunPlan?.path || "",
      plannerPreflight: latestPlannerPreflight?.path || "",
      preflight: latestPreflight?.path || "",
      dryRun: latestDryRun?.path || "",
      manualGradeChecklist: latestManualGradeChecklist?.path || "",
      aggregate: latestAggregate?.path || "",
      benchmark: latestBenchmark?.path || ""
    },
    findings,
    nextSteps,
    plannerEvidenceAlignment,
    rerunPlans,
    plannerPreflights,
    readinessReports,
    modelCoverageReports,
    preflights,
    dryRunReports,
    manualGradeChecklists,
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
  return name === "production-text-rerun-plan.json" ||
    name === "local-model-coverage.json" ||
    name === "production-text-readiness.json" ||
    name === "production-text-planner-preflight.json" ||
    name === "production-text-preflight.json" ||
    (name.endsWith("-dry-run.json") && rel.includes("production-text")) ||
    name === "production-text-manual-grade-checklist.json" ||
    (name === "benchmark-aggregate.json" && rel.includes("production-text")) ||
    (name.endsWith("-summary.json") && rel.includes("production-text"));
}

function rerunPlanEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: payload.status || "unknown",
    promotionReady: Boolean(payload.promotionReady),
    failedRequirements: (payload.failedRequirements || []).map((item) => item.name || String(item)).filter(Boolean),
    commandCount: Array.isArray(payload.commands) ? payload.commands.length : 0,
    plannerModel: payload.currentEvidence?.plannerModel || "",
    plannerClassification: payload.currentEvidence?.plannerClassification || "",
    nextBenchmarkOutput: payload.rerunPaths?.benchmarkOutput || ""
  };
}

function plannerPreflightEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  const localGpuResidency = payload.localGpuResidency || missingLocalGpuResidencyEvidence(payload.baseUrl);
  const blockers = [
    ...(payload.blockers || []),
    ...(localGpuResidency.required && !localGpuResidency.ok ? [localGpuResidency.blocker] : [])
  ];
  const promotionReady = Boolean(payload.promotionReady) && (!localGpuResidency.required || localGpuResidency.ok);
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: payload.status || "unknown",
    promotionReady,
    runAllowed: Boolean(payload.runAllowed),
    reachable: Boolean(payload.reachable),
    baseUrl: payload.baseUrl || "",
    activeModel: payload.activeModel || "",
    classification: payload.classification?.classification || "unknown",
    smallPlanner: Boolean(payload.classification?.smallPlanner),
    qualityPlanner: Boolean(payload.classification?.qualityPlanner),
    productionSuitable: Boolean(payload.classification?.productionSuitable),
    minContextTokens: payload.classification?.minContextTokens,
    reportedContextTokens: payload.classification?.reportedContextTokens,
    minOutputTokens: payload.classification?.minOutputTokens,
    maxOutputTokens: payload.classification?.maxOutputTokens,
    localGpuResidency,
    gpuResidencyProven: !localGpuResidency.required || localGpuResidency.ok,
    blockerCount: blockers.length,
    blockers,
    warnings: payload.warnings || [],
    nextSteps: payload.nextSteps || []
  };
}

function readinessEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  const blockerNames = (payload.blockers || []).map((item) => item.name || String(item)).filter(Boolean);
  const runtimeBlockers = blockerNames.filter((name) => !isAggregateReadinessCheck(name));
  const promotionReady = payload.aggregatePromotionReady === undefined && Array.isArray(payload.blockers)
    ? runtimeBlockers.length === 0
    : Boolean(payload.promotionReady);
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: promotionReady ? "promotion-ready" : payload.status || "unknown",
    promotionReady,
    aggregatePromotionReady: Boolean(payload.aggregatePromotionReady ?? payload.aggregateSummary?.promotionReady),
    blockerCount: runtimeBlockers.length,
    blockers: runtimeBlockers,
    aggregateCheckBlockers: blockerNames.filter(isAggregateReadinessCheck),
    comfyReachable: Boolean(payload.comfy?.reachable),
    hasTextComposer: Boolean(payload.comfy?.hasTextComposer),
    activePlannerModels: unique((payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .filter((endpoint) => endpoint.reachable)
      .map((endpoint) => endpoint.activeModel || endpoint.baseUrl)),
    productionSuitablePlannerReachable: (payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .some((endpoint) => endpoint.reachable && endpoint.productionSuitable),
    gpuBackedLocalPlannerReachable: (payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .some((endpoint) => endpoint.reachable && endpoint.localGpuResidency?.required && endpoint.localGpuResidency?.ok),
    smallPlannerActive: (payload.activePlannerEndpoints || payload.plannerEndpoints || [])
      .some((endpoint) => endpoint.reachable && endpoint.smallPlanner),
    nextSteps: payload.nextSteps || []
  };
}

function isAggregateReadinessCheck(name) {
  return /^latest LLM-planned aggregate\b/.test(String(name || ""));
}

function modelCoverageEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  const recommended = Array.isArray(payload.recommendedCoverage) ? payload.recommendedCoverage : [];
  const productionPlannerCandidates = recommended.filter((item) =>
    /planner|planning/i.test(`${item.id || ""} ${item.role || ""}`) && !/qwen3-4b|smoke/i.test(String(item.id || ""))
  );
  const installedProductionPlanners = productionPlannerCandidates.filter((item) => item.installed).map((item) => item.id);
  const evaluatedProductionPlanners = productionPlannerCandidates.filter((item) => item.evaluated).map((item) => item.id);
  const unevaluatedProductionPlanners = productionPlannerCandidates
    .filter((item) => item.installed && !item.evaluated)
    .map((item) => item.id);
  const missingProductionPlanners = productionPlannerCandidates.filter((item) => !item.installed).map((item) => item.id);
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: unevaluatedProductionPlanners.length || missingProductionPlanners.length ? "action-needed" : "covered",
    promotionReady: false,
    localModelRoot: payload.localModelRoot || "",
    comfyModelsRoot: payload.comfyModelsRoot || "",
    installedModelFiles: Number(payload.totals?.installedModelFiles || 0),
    recommendedInstalled: Number(payload.totals?.recommendedInstalled || 0),
    recommendedEvaluated: Number(payload.totals?.recommendedEvaluated || 0),
    recommendedMissing: Number(payload.totals?.recommendedMissing || 0),
    installedProductionPlanners,
    evaluatedProductionPlanners,
    unevaluatedProductionPlanners,
    missingProductionPlanners,
    pullQueue: (payload.pullQueue || []).map((item) => ({
      id: item.id || "",
      pull: item.pull || "",
      nextAction: item.nextAction || ""
    })).filter((item) => item.id)
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

function dryRunEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload || payload.dryRun !== true) return undefined;
  const plannedRuns = Array.isArray(payload.plannedRuns) ? payload.plannedRuns : [];
  const runtime = payload.productionTextPlannerRuntime || {};
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: runtime.productionSuitable ? "planning-proof" : "blocked",
    promotionReady: false,
    dryRun: true,
    phase: payload.phase || "",
    phaseDir: payload.phaseDir || "",
    liveProviderCallsEnabled: Boolean(payload.liveProviderCallsEnabled),
    plannedRunCount: plannedRuns.length,
    storyIds: unique(plannedRuns.map((run) => run.storyId).filter(Boolean)),
    textModels: unique(plannedRuns.map((run) => run.textModel).filter(Boolean)),
    imageModels: unique(plannedRuns.map((run) => run.imageModel).filter(Boolean)),
    productionTextModes: unique(plannedRuns.map((run) => run.productionTextMode).filter(Boolean)),
    plannerModel: runtime.model || "",
    plannerClassification: runtime.classification || "",
    productionSuitable: Boolean(runtime.productionSuitable),
    runAllowed: Boolean(runtime.runAllowed),
    contextTokens: runtime.contextTokens ?? null,
    maxOutputTokens: runtime.maxOutputTokens ?? null,
    requestTimeoutMs: runtime.requestTimeoutMs ?? null,
    creativeContract: runtime.creativeContract || "",
    blockers: runtime.blockers || [],
    warnings: runtime.warnings || []
  };
}

function manualGradeChecklistEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    status: payload.status || "unknown",
    promotionReady: Boolean(payload.promotionReady),
    benchmarkSummary: payload.benchmarkSummary || "",
    totalRuns: Number(payload.summary?.totalRuns || 0),
    gradableRuns: Number(payload.summary?.gradableRuns || 0),
    gradedGeneratedRuns: Number(payload.summary?.gradedGeneratedRuns ?? payload.summary?.gradedRuns ?? 0),
    gradedRuns: Number(payload.summary?.gradedRuns || 0),
    missingGrades: Number(payload.summary?.missingGrades || 0),
    invalidGrades: Number(payload.summary?.invalidGrades || 0),
    failedBeforeImageGeneration: Number(payload.summary?.failedBeforeImageGeneration || 0),
    blockedGrades: Number(payload.summary?.blockedGrades || 0),
    blockers: payload.blockers || [],
    nextSteps: payload.nextSteps || []
  };
}

function aggregateEntry(filePath) {
  const payload = readJson(filePath);
  if (!payload) return undefined;
  const ranked = Array.isArray(payload.ranked) ? payload.ranked : [];
  const phaseFilter = Array.isArray(payload.phaseFilter) ? payload.phaseFilter : [];
  const phases = unique([
    ...phaseFilter,
    ...ranked.map((entry) => entry.phase)
  ].filter(Boolean));
  const textModels = unique(ranked.map((entry) => entry.textModel).filter(Boolean));
  const statuses = countBy(ranked.map((entry) => entry.status || "unknown"));
  const isLocalProductionTextAggregate = phases.includes("local-production-text");
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
    kind: isLocalProductionTextAggregate || textModels.some(isSmallPlanner) ? "llm-planned" : "production-text-candidate",
    phaseFilter,
    phases,
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
  const completedRunEntries = runs.filter(isCompletedBenchmarkRun);
  const completedRuns = completedRunEntries.length;
  const failedRunEntries = runs.filter(isFailedBenchmarkRun);
  const failedRuns = failedRunEntries.length;
  const missingMustInclude = unique(runs.flatMap((run) => run.autoChecks?.missingMustInclude || []));
  const mustAvoidFailures = unique(runs.flatMap((run) => run.autoChecks?.avoidedFailures || []));
  const textModels = unique([
    ...plannedRuns.map((run) => run.textModel),
    ...runs.map((run) => run.textModel || run.cardCopyModel)
  ].filter(Boolean));
  const providerFailures = unique(failedRunEntries.flatMap(benchmarkRunFailureMessages));
  return {
    path: relativePath(filePath),
    createdAtIso: payload.createdAtIso || fileMtime(filePath),
    phase: payload.phase || "",
    totalPlannedRuns: plannedRuns.length,
    totalRuns: runs.length,
    completedRuns,
    failedRuns,
    failedBeforeImageGeneration: failedRunEntries.filter((run) => Number(run.panelCount || 0) <= 0).length,
    failedFixtures: unique(failedRunEntries.map((run) => run.storyId).filter(Boolean)),
    providerFailures,
    plannerBaseUrls: plannerBaseUrlsFromSummary(payload),
    llmGeneratedRuns: runs.filter((run) => run.productionTextMode === "llm-generated-copy").length,
    fixtureRuns: runs.filter((run) => run.textAdapterId === "fixture").length,
    fixtures: unique(runs.map((run) => run.storyId).filter(Boolean)),
    textModels,
    smallPlannerUsed: textModels.some(isSmallPlanner),
    imageModels: unique(runs.map((run) => run.imageModel).filter(Boolean)),
    missingMustInclude,
    mustAvoidFailures,
    finalImagesRenderedByComfy: completedRunEntries.length > 0 &&
      completedRunEntries.every((run) => run.autoChecks?.checks?.finalImagesRenderedByComfy === true),
    deterministicTextComposerUsed: completedRunEntries.some((run) => run.typographyModeId === "customcard-production-text-composer")
  };
}

function isCompletedBenchmarkRun(run) {
  return Number(run?.statusCode || 0) === 200 || Number(run?.panelCount || 0) > 0;
}

function isFailedBenchmarkRun(run) {
  return run?.status === "failed" ||
    Boolean(run?.error) ||
    Number(run?.statusCode || 0) >= 400 ||
    Object.keys(run?.providerFailures || {}).length > 0;
}

function benchmarkRunFailureMessages(run) {
  const prefix = run?.storyId ? `${run.storyId}: ` : "";
  const messages = [];
  for (const [provider, error] of Object.entries(run?.providerFailures || {})) {
    if (error) messages.push(`${prefix}${provider} provider ${error}`);
  }
  if (run?.error) messages.push(`${prefix}${run.error}`);
  if (Number(run?.statusCode || 0) >= 400 && !messages.length) {
    messages.push(`${prefix}HTTP ${run.statusCode}`);
  }
  return messages;
}

function plannerBaseUrlsFromSummary(payload) {
  return unique([
    payload.envRouting?.productionTextPlannerRuntime?.baseUrl,
    ...(Array.isArray(payload.providerHttp) ? payload.providerHttp.map((entry) => openAiBaseUrl(entry.url)) : [])
  ].filter(Boolean));
}

function openAiBaseUrl(value) {
  try {
    const url = new URL(value);
    const marker = "/v1/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return `${url.origin}${url.pathname.slice(0, markerIndex + 3)}`;
    }
    if (url.pathname === "/v1" || url.pathname.endsWith("/v1")) {
      return `${url.origin}${url.pathname}`;
    }
    return "";
  } catch {
    return "";
  }
}

function comparePlannerEvidence(latestPlannerPreflight, latestBenchmark) {
  const preflightBaseUrl = normalizeBaseUrl(latestPlannerPreflight?.baseUrl || "");
  const preflightModel = latestPlannerPreflight?.activeModel || "";
  const benchmarkBaseUrls = unique((latestBenchmark?.plannerBaseUrls || []).map(normalizeBaseUrl));
  const benchmarkModels = latestBenchmark?.textModels || [];
  const checked = Boolean(latestPlannerPreflight && latestBenchmark?.llmGeneratedRuns > 0);
  const baseUrlMatches = !checked || !preflightBaseUrl || !benchmarkBaseUrls.length || benchmarkBaseUrls.includes(preflightBaseUrl);
  const modelMatches = !checked || !preflightModel || !benchmarkModels.length || benchmarkModels.includes(preflightModel);
  const blockers = [];
  if (!baseUrlMatches) {
    blockers.push(`Planner preflight endpoint ${preflightBaseUrl} does not match benchmark planner endpoint(s): ${benchmarkBaseUrls.join(", ")}.`);
  }
  if (!modelMatches) {
    blockers.push(`Planner preflight model ${preflightModel} does not match benchmark text model(s): ${benchmarkModels.join(", ")}.`);
  }
  return {
    path: latestBenchmark?.path || latestPlannerPreflight?.path || "",
    status: blockers.length ? "blocked" : checked ? "aligned" : "not-checked",
    promotionReady: !blockers.length,
    checked,
    ok: !blockers.length,
    preflight: {
      path: latestPlannerPreflight?.path || "",
      baseUrl: preflightBaseUrl,
      model: preflightModel
    },
    benchmark: {
      path: latestBenchmark?.path || "",
      plannerBaseUrls: benchmarkBaseUrls,
      textModels: benchmarkModels
    },
    blockers
  };
}

function normalizeBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function buildFindings({
  latestPlannerPreflight,
  latestReadiness,
  latestModelCoverage,
  latestAggregate,
  latestBenchmark,
  latestPreflight,
  latestDryRun,
  latestManualGradeChecklist,
  plannerEvidenceAlignment
}) {
  const findings = [];
  if (latestPreflight?.liveComfyReachable && latestPreflight?.liveNodeAvailable) {
    findings.push("Live ComfyUI and CustomCardTextComposer are proven available in the latest preflight.");
  }
  if (latestDryRun?.productionSuitable && latestDryRun.plannedRunCount >= 3) {
    findings.push(
      `Latest dry-run planning proof keeps the full production card-copy JSON contract on ${latestDryRun.plannerModel} with ${latestDryRun.contextTokens}+ context, ${latestDryRun.maxOutputTokens} output tokens, and ${latestDryRun.requestTimeoutMs}ms timeout across ${latestDryRun.storyIds.join(", ")}.`
    );
  }
  if (latestDryRun && !latestDryRun.productionSuitable) {
    findings.push(`Latest dry-run planning proof is blocked: ${latestDryRun.plannerClassification || "unknown"} planner ${latestDryRun.plannerModel || "n/a"}.`);
  }
  if (latestPlannerPreflight?.promotionReady) {
    findings.push(`Latest planner preflight passed with ${latestPlannerPreflight.activeModel}.`);
  }
  if (latestPlannerPreflight && !latestPlannerPreflight.promotionReady) {
    findings.push(`Latest planner preflight is blocked: ${latestPlannerPreflight.classification} model ${latestPlannerPreflight.activeModel || "n/a"}.`);
  }
  if (latestPlannerPreflight?.localGpuResidency?.required && !latestPlannerPreflight.localGpuResidency.ok) {
    findings.push("Latest local planner preflight does not prove GPU residency.");
  }
  if (plannerEvidenceAlignment?.checked && !plannerEvidenceAlignment.ok) {
    findings.push(`Planner preflight and benchmark runtime evidence do not align: ${plannerEvidenceAlignment.blockers.join(" ")}`);
  }
  if (latestReadiness?.smallPlannerActive) {
    findings.push("The currently reachable planner is a known-small smoke model, so current evidence must not be promoted.");
  }
  if (latestReadiness && !latestReadiness.productionSuitablePlannerReachable) {
    findings.push("No production-suitable planner endpoint is reachable/configured in the latest readiness report.");
  }
  if (latestModelCoverage?.installedProductionPlanners?.length) {
    findings.push(`Installed production planner candidates found locally: ${latestModelCoverage.installedProductionPlanners.join(", ")}.`);
  }
  if (latestModelCoverage?.unevaluatedProductionPlanners?.length) {
    findings.push(`Installed production planner candidates still need local production-text evaluation: ${latestModelCoverage.unevaluatedProductionPlanners.join(", ")}.`);
  }
  if (latestModelCoverage?.missingProductionPlanners?.length) {
    findings.push(`Recommended production planner candidates still missing locally: ${latestModelCoverage.missingProductionPlanners.join(", ")}.`);
  }
  if (latestBenchmark?.totalRuns >= 3) {
    findings.push(`The latest LLM-planned benchmark covers ${latestBenchmark.totalRuns} customer request runs.`);
  }
  if (latestBenchmark?.failedRuns > 0) {
    const failures = latestBenchmark.providerFailures?.length
      ? ` Latest provider failure(s): ${latestBenchmark.providerFailures.slice(0, 3).join("; ")}.`
      : "";
    findings.push(`Latest LLM-planned benchmark has ${latestBenchmark.failedRuns} failed runtime run(s), including ${latestBenchmark.failedBeforeImageGeneration || 0} before image generation.${failures}`);
  }
  if (latestBenchmark?.missingMustInclude?.length) {
    findings.push(`Planner/theme adherence is still failing required terms: ${latestBenchmark.missingMustInclude.join(", ")}.`);
  }
  if (latestAggregate && !latestAggregate.promotionReady) {
    findings.push(`Latest aggregate is blocked: best score ${latestAggregate.bestScore ?? "n/a"} across ${latestAggregate.totalRuns} run(s).`);
  }
  if (latestManualGradeChecklist && !latestManualGradeChecklist.promotionReady) {
    findings.push(
      `Latest manual grade checklist is blocked: ${latestManualGradeChecklist.gradedGeneratedRuns}/${latestManualGradeChecklist.gradableRuns} generated run(s) graded, ${latestManualGradeChecklist.failedBeforeImageGeneration} failed before image generation.`
    );
  }
  if (!findings.length) findings.push("No production-text evidence was found.");
  return findings;
}

function buildNextSteps({
  latestPlannerPreflight,
  latestReadiness,
  latestModelCoverage,
  latestAggregate,
  latestBenchmark,
  latestPreflight,
  latestDryRun,
  latestManualGradeChecklist,
  plannerEvidenceAlignment
}) {
  const steps = [];
  if (!latestPreflight?.liveComfyReachable || !latestPreflight?.liveNodeAvailable) {
    steps.push("Run production-text preflight with live Comfy and CustomCardTextComposer loaded.");
  }
  if (!latestPlannerPreflight?.promotionReady) {
    steps.push("Run production-text planner preflight with a production-suitable GPU-backed model, 8192+ context, and the full output budget.");
  }
  if (plannerEvidenceAlignment?.checked && !plannerEvidenceAlignment.ok) {
    steps.push("Refresh planner preflight against the exact endpoint/model used by the latest benchmark before treating planner evidence as current.");
  }
  if (!latestReadiness?.productionSuitablePlannerReachable) {
    steps.push("Run the planner preflight, then start or configure a production-suitable planner endpoint with 8192+ context before collecting promotion evidence.");
  }
  if (latestModelCoverage?.unevaluatedProductionPlanners?.length) {
    steps.push(`Run production-text planner preflight and benchmark evidence against installed production planner candidate(s): ${latestModelCoverage.unevaluatedProductionPlanners.join(", ")}.`);
  }
  if (latestModelCoverage?.pullQueue?.length) {
    steps.push(`Resolve local model pull queue if the installed planner is too slow: ${latestModelCoverage.pullQueue.map((item) => item.id).join(", ")}.`);
  }
  if (latestDryRun && !latestDryRun.productionSuitable) {
    steps.push("Refresh the production-text dry-run with a production-suitable planner before live benchmark work.");
  }
  if (latestReadiness?.smallPlannerActive || latestBenchmark?.smallPlannerUsed) {
    steps.push("Keep Qwen3-4B/8B and other small planner runs as smoke or failure evidence only.");
  }
  if (!latestBenchmark || latestBenchmark.completedRuns < 3 || latestBenchmark.failedRuns > 0) {
    steps.push("Run the full aquarium/koi/dog LLM-planned production-text matrix with the production-suitable planner, not a reduced prompt.");
  }
  if (!latestAggregate?.promotionReady) {
    steps.push("Manually grade every production-text run and aggregate only after all candidates pass.");
  }
  if (latestManualGradeChecklist && !latestManualGradeChecklist.promotionReady) {
    steps.push("Resolve the latest manual grade checklist blockers before treating the aggregate as promotion evidence.");
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
  lines.push(latestRow("Rerun Plan", result.rerunPlans[0], rerunPlanSummary));
  lines.push(latestRow("Planner", result.plannerPreflights[0], plannerSummary));
  lines.push(latestRow("Planner/Benchmark Alignment", result.plannerEvidenceAlignment, plannerEvidenceAlignmentSummary));
  lines.push(latestRow("Readiness", result.readinessReports[0], readinessSummary));
  lines.push(latestRow("Model Coverage", result.modelCoverageReports[0], modelCoverageSummary));
  lines.push(latestRow("Preflight", result.preflights[0], preflightSummary));
  lines.push(latestRow("Dry Run", result.dryRunReports[0], dryRunSummary));
  lines.push(latestRow("Manual Grades", result.manualGradeChecklists[0], manualGradeChecklistSummary));
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
  lines.push("");
  lines.push("## Dry Runs");
  lines.push("");
  lines.push("| Created | Planned | Planner | Context | Max output | Stories | Path |");
  lines.push("| --- | ---:| --- | ---:| ---:| --- | --- |");
  for (const entry of result.dryRunReports.slice(0, 10)) {
    lines.push(`| ${entry.createdAtIso} | ${entry.plannedRunCount} | ${markdownCell(entry.plannerModel || "n/a")} | ${entry.contextTokens ?? "n/a"} | ${entry.maxOutputTokens ?? "n/a"} | ${markdownCell(entry.storyIds.join(", ") || "n/a")} | ${link(entry.path)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function rerunPlanSummary(entry) {
  return `${entry.failedRequirements.length} failed requirement(s); commands=${entry.commandCount}`;
}

function plannerSummary(entry) {
  const gpu = entry.localGpuResidency?.required
    ? entry.localGpuResidency.ok ? "gpu=yes" : "gpu=no"
    : "gpu=n/a";
  return `${entry.classification}; model=${entry.activeModel || "none"}; context=${entry.reportedContextTokens ?? "n/a"}; ${gpu}`;
}

function plannerEvidenceAlignmentSummary(entry) {
  return `preflight=${entry.preflight?.baseUrl || "n/a"} ${entry.preflight?.model || "n/a"}; benchmark=${(entry.benchmark?.plannerBaseUrls || []).join(", ") || "n/a"} ${(entry.benchmark?.textModels || []).join(", ") || "n/a"}; blockers=${entry.blockers?.length || 0}`;
}

function latestRow(label, entry, summarize) {
  if (!entry) return `| ${label} | n/a | missing | n/a |`;
  return `| ${label} | ${link(entry.path)} | ${markdownCell(entry.status || (entry.promotionReady ? "ready" : "blocked"))} | ${markdownCell(summarize(entry))} |`;
}

function readinessSummary(entry) {
  return `${entry.blockerCount} blocker(s); planner=${entry.activePlannerModels.join(", ") || "none"}`;
}

function modelCoverageSummary(entry) {
  return `${entry.recommendedInstalled} recommended installed; unevaluated production planners=${entry.unevaluatedProductionPlanners.join(", ") || "none"}`;
}

function preflightSummary(entry) {
  return `comfy=${entry.liveComfyReachable ? "yes" : "no"} node=${entry.liveNodeAvailable ? "yes" : "no"}`;
}

function dryRunSummary(entry) {
  return `${entry.plannerClassification || "n/a"} ${entry.plannerModel || "n/a"}; planned=${entry.plannedRunCount}; contract=${entry.creativeContract || "n/a"}`;
}

function manualGradeChecklistSummary(entry) {
  return `${entry.gradedGeneratedRuns}/${entry.gradableRuns} generated graded; manual-grades=${entry.gradedRuns}; missing=${entry.missingGrades}; failed-before-image=${entry.failedBeforeImageGeneration}`;
}

function aggregateSummary(entry) {
  return `${entry.totalRuns} run(s); best=${entry.bestScore ?? "n/a"}; ready=${entry.promotionReady ? "yes" : "no"}`;
}

function benchmarkSummary(entry) {
  return `${entry.completedRuns}/${entry.totalRuns} completed; failed=${entry.failedRuns}; failed-before-image=${entry.failedBeforeImageGeneration || 0}`;
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
