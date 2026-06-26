import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultIndexReport = resolve(
  evidenceRoot,
  "production-text-evidence-index-20260626-current/production-text-evidence-index.json"
);
const defaultGateReport = resolve(
  evidenceRoot,
  "production-text-promotion-gate-20260626-current/production-text-promotion-gate.json"
);
const defaultRerunPlan = resolve(
  evidenceRoot,
  "production-text-rerun-plan-20260626-current/production-text-rerun-plan.json"
);

if (isMainModule()) {
  const result = buildProductionTextResearchRollup(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    outputDir: result.reportDir,
    failedRequirements: result.promotionGate.failedRequirements.length,
    findings: result.findings.length,
    nextCommands: result.nextCommands.length
  }, null, 2));
}

export function buildProductionTextResearchRollup(args = {}) {
  const reportDate = String(args.date || yyyymmdd()).replace(/[^0-9]/g, "") || yyyymmdd();
  const outputRoot = resolve(String(args["output-root"] || evidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-research-rollup-${reportDate}-current`));
  const indexPath = resolve(String(args.index || args["evidence-index"] || defaultIndexReport));
  const gatePath = resolve(String(args.gate || args["gate-report"] || defaultGateReport));
  const rerunPath = resolve(String(args.rerun || args["rerun-plan"] || defaultRerunPlan));
  const index = readJson(indexPath) || {};
  const gate = readJson(gatePath) || {};
  const rerun = readJson(rerunPath) || {};
  const latest = index.latest || {};
  const latestPlanner = first(index.plannerPreflights);
  const latestReadiness = first(index.readinessReports);
  const latestModelCoverage = first(index.modelCoverageReports);
  const latestPreflight = first(index.preflights);
  const latestBenchmark = first(index.benchmarkSummaries);
  const latestManualChecklist = first(index.manualGradeChecklists);
  const latestAggregate = (index.aggregates || []).find((entry) => entry.kind === "llm-planned") || first(index.aggregates);
  const requirements = Array.isArray(gate.requirements) ? gate.requirements : [];
  const failedRequirements = requirements.filter((item) => !item.ok).map(requirementSummary);
  const passedRequirements = requirements.filter((item) => item.ok).map(requirementSummary);
  const status = gate.status || index.status || "unknown";
  const promotionReady = Boolean(gate.promotionReady && index.promotionReady);
  const nextCommands = Array.isArray(rerun.commands)
    ? rerun.commands.map((item) => ({
        step: item.step,
        title: item.title || "",
        command: item.command || "",
        why: item.why || ""
      }))
    : [];
  const result = {
    createdAtIso: new Date().toISOString(),
    status: promotionReady ? "promotion-ready" : status,
    promotionReady,
    reportDir: relativePath(reportDir),
    sourceReports: {
      evidenceIndex: relativePath(indexPath),
      promotionGate: relativePath(gatePath),
      rerunPlan: relativePath(rerunPath)
    },
    latest,
    evidenceSummary: {
      liveComfyTextComposerProof: {
        path: latestPreflight?.path || "",
        promotionReady: Boolean(latestPreflight?.promotionReady),
        liveComfyReachable: Boolean(latestPreflight?.liveComfyReachable),
        liveNodeAvailable: Boolean(latestPreflight?.liveNodeAvailable)
      },
      planner: {
        path: latestPlanner?.path || "",
        status: latestPlanner?.status || "missing",
        activeModel: latestPlanner?.activeModel || "",
        classification: latestPlanner?.classification || "",
        promotionReady: Boolean(latestPlanner?.promotionReady),
        reachable: Boolean(latestPlanner?.reachable),
        reportedContextTokens: latestPlanner?.reportedContextTokens ?? null,
        maxOutputTokens: latestPlanner?.maxOutputTokens ?? null,
        blockers: latestPlanner?.blockers || []
      },
      readiness: {
        path: latestReadiness?.path || "",
        status: latestReadiness?.status || "missing",
        promotionReady: Boolean(latestReadiness?.promotionReady),
        productionSuitablePlannerReachable: Boolean(latestReadiness?.productionSuitablePlannerReachable),
        comfyReachable: Boolean(latestReadiness?.comfyReachable),
        hasTextComposer: Boolean(latestReadiness?.hasTextComposer),
        blockers: latestReadiness?.blockers || []
      },
      modelCoverage: {
        path: latestModelCoverage?.path || "",
        status: latestModelCoverage?.status || "missing",
        installedModelFiles: latestModelCoverage?.installedModelFiles ?? 0,
        recommendedInstalled: latestModelCoverage?.recommendedInstalled ?? 0,
        recommendedEvaluated: latestModelCoverage?.recommendedEvaluated ?? 0,
        recommendedMissing: latestModelCoverage?.recommendedMissing ?? 0,
        installedProductionPlanners: latestModelCoverage?.installedProductionPlanners || [],
        evaluatedProductionPlanners: latestModelCoverage?.evaluatedProductionPlanners || [],
        unevaluatedProductionPlanners: latestModelCoverage?.unevaluatedProductionPlanners || [],
        missingProductionPlanners: latestModelCoverage?.missingProductionPlanners || [],
        pullQueue: latestModelCoverage?.pullQueue || []
      },
      benchmark: {
        path: latestBenchmark?.path || "",
        totalRuns: latestBenchmark?.totalRuns ?? 0,
        completedRuns: latestBenchmark?.completedRuns ?? 0,
        failedRuns: latestBenchmark?.failedRuns ?? 0,
        fixtures: latestBenchmark?.fixtures || [],
        smallPlannerUsed: Boolean(latestBenchmark?.smallPlannerUsed),
        missingMustInclude: latestBenchmark?.missingMustInclude || [],
        mustAvoidFailures: latestBenchmark?.mustAvoidFailures || [],
        finalImagesRenderedByComfy: Boolean(latestBenchmark?.finalImagesRenderedByComfy),
        deterministicTextComposerUsed: Boolean(latestBenchmark?.deterministicTextComposerUsed)
      },
      manualGrades: {
        path: latestManualChecklist?.path || "",
        status: latestManualChecklist?.status || "missing",
        promotionReady: Boolean(latestManualChecklist?.promotionReady),
        gradedGeneratedRuns: latestManualChecklist?.gradedGeneratedRuns ?? 0,
        gradableRuns: latestManualChecklist?.gradableRuns ?? 0,
        failedBeforeImageGeneration: latestManualChecklist?.failedBeforeImageGeneration ?? 0,
        blockedGrades: latestManualChecklist?.blockedGrades ?? 0,
        blockers: latestManualChecklist?.blockers || []
      },
      aggregate: {
        path: latestAggregate?.path || "",
        kind: latestAggregate?.kind || "",
        promotionReady: Boolean(latestAggregate?.promotionReady),
        totalRuns: latestAggregate?.totalRuns ?? 0,
        bestScore: latestAggregate?.bestScore ?? null,
        bestRun: latestAggregate?.bestRun || "",
        statuses: latestAggregate?.statuses || {},
        textModels: latestAggregate?.textModels || [],
        blockingFailures: latestAggregate?.blockingFailures || []
      }
    },
    promotionGate: {
      path: relativePath(gatePath),
      status: gate.status || "unknown",
      promotionReady: Boolean(gate.promotionReady),
      failedRequirements,
      passedRequirements
    },
    rerunPlan: {
      path: relativePath(rerunPath),
      status: rerun.status || "unknown",
      commandCount: nextCommands.length,
      productionPlannerContract: rerun.productionPlannerContract || {},
      currentEvidence: rerun.currentEvidence || {},
      rerunPaths: rerun.rerunPaths || {}
    },
    findings: buildFindings({
      index,
      latestPlanner,
      latestReadiness,
      latestModelCoverage,
      latestBenchmark,
      latestManualChecklist,
      latestAggregate,
      failedRequirements,
      productionPlannerContract: rerun.productionPlannerContract || {}
    }),
    nextSteps: unique([...(index.nextSteps || []), ...(gate.nextSteps || [])]),
    nextCommands
  };

  mkdirSync(reportDir, { recursive: true });
  writeJson(resolve(reportDir, "production-text-research-rollup.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-research-rollup.md"), buildMarkdown(result));
  return result;
}

function buildFindings({
  index,
  latestPlanner,
  latestReadiness,
  latestModelCoverage,
  latestBenchmark,
  latestManualChecklist,
  latestAggregate,
  failedRequirements,
  productionPlannerContract
}) {
  const findings = [...(Array.isArray(index.findings) ? index.findings : [])];
  if (productionPlannerContract?.summary) {
    findings.push(`Production planner contract: ${productionPlannerContract.summary}`);
  }
  if ((productionPlannerContract?.disallowedForPromotion || []).some((item) => /reduced creative prompt/i.test(item))) {
    findings.push("Reduced creative prompt contracts are disallowed for promotion evidence; fix finish_reason=length by using the correct planner runtime.");
  }
  if (latestPlanner && !latestPlanner.promotionReady) {
    findings.push(`Planner evidence is not promotable: ${latestPlanner.activeModel || "unknown model"} is ${latestPlanner.classification || "blocked"}.`);
  }
  if (latestReadiness && !latestReadiness.productionSuitablePlannerReachable) {
    findings.push("A production-suitable planner endpoint is not currently reachable.");
  }
  if (latestModelCoverage?.unevaluatedProductionPlanners?.length) {
    findings.push(`Production planner files are installed but not yet evaluated in local production-text evidence: ${latestModelCoverage.unevaluatedProductionPlanners.join(", ")}.`);
  }
  if (latestModelCoverage?.missingProductionPlanners?.length) {
    findings.push(`Optional production planner pull queue remains: ${latestModelCoverage.missingProductionPlanners.join(", ")}.`);
  }
  if (latestBenchmark?.smallPlannerUsed) {
    findings.push("The latest LLM-planned matrix is smoke/failure evidence because it used a known-small planner.");
  }
  if (latestBenchmark?.missingMustInclude?.length) {
    findings.push(`Required customer terms still missing: ${latestBenchmark.missingMustInclude.join(", ")}.`);
  }
  if (latestManualChecklist && !latestManualChecklist.promotionReady) {
    findings.push(`Manual grade readiness is blocked: ${latestManualChecklist.blockedGrades} blocked grade(s), ${latestManualChecklist.failedBeforeImageGeneration} run(s) failed before image generation.`);
  }
  if (latestAggregate && !latestAggregate.promotionReady) {
    findings.push(`Best current LLM-planned score is ${latestAggregate.bestScore ?? "n/a"}/100 and remains blocked.`);
  }
  if (failedRequirements.length) {
    findings.push(`Promotion gate currently fails ${failedRequirements.length} requirement(s): ${failedRequirements.map((item) => item.name).join(", ")}.`);
  }
  return unique(findings);
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Research Rollup",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    "",
    "## Source Reports",
    "",
    `- Evidence index: ${link(result.sourceReports.evidenceIndex)}`,
    `- Promotion gate: ${link(result.sourceReports.promotionGate)}`,
    `- Rerun plan: ${link(result.sourceReports.rerunPlan)}`,
    "",
    "## Findings",
    ""
  ];
  for (const finding of result.findings) lines.push(`- ${finding}`);
  lines.push("");
  lines.push("## Evidence Summary");
  lines.push("");
  lines.push("| Area | Status | Key result | Path |");
  lines.push("| --- | --- | --- | --- |");
  lines.push(evidenceRow("Comfy text composer", result.evidenceSummary.liveComfyTextComposerProof, (item) => `comfy=${yesNo(item.liveComfyReachable)} node=${yesNo(item.liveNodeAvailable)}`));
  lines.push(evidenceRow("Planner", result.evidenceSummary.planner, (item) => `${item.classification || "n/a"} ${item.activeModel || "n/a"}; context=${item.reportedContextTokens ?? "n/a"}; max=${item.maxOutputTokens ?? "n/a"}`));
  lines.push(evidenceRow("Readiness", result.evidenceSummary.readiness, (item) => `production planner reachable=${yesNo(item.productionSuitablePlannerReachable)}; blockers=${item.blockers.length}`));
  lines.push(evidenceRow("Model coverage", result.evidenceSummary.modelCoverage, (item) => `${item.recommendedInstalled} recommended installed; unevaluated planners=${item.unevaluatedProductionPlanners.join(", ") || "none"}`));
  lines.push(evidenceRow("Benchmark", result.evidenceSummary.benchmark, (item) => `${item.completedRuns}/${item.totalRuns} completed; failed=${item.failedRuns}; missing=${item.missingMustInclude.join(", ") || "none"}`));
  lines.push(evidenceRow("Manual grades", result.evidenceSummary.manualGrades, (item) => `${item.gradedGeneratedRuns}/${item.gradableRuns} generated graded; blocked=${item.blockedGrades}; failed-before-image=${item.failedBeforeImageGeneration}`));
  lines.push(evidenceRow("Aggregate", result.evidenceSummary.aggregate, (item) => `${item.totalRuns} run(s); best=${item.bestScore ?? "n/a"}; statuses=${JSON.stringify(item.statuses)}`));
  lines.push("");
  lines.push("## Promotion Gate");
  lines.push("");
  if (result.promotionGate.failedRequirements.length) {
    lines.push("Failed requirements:");
    for (const requirement of result.promotionGate.failedRequirements) {
      lines.push(`- ${requirement.name}`);
    }
  } else {
    lines.push("Failed requirements: none");
  }
  lines.push("");
  lines.push("Passed requirements:");
  if (result.promotionGate.passedRequirements.length) {
    for (const requirement of result.promotionGate.passedRequirements) {
      lines.push(`- ${requirement.name}`);
    }
  } else {
    lines.push("- none");
  }
  lines.push("");
  lines.push("## Next Commands");
  lines.push("");
  if (result.nextCommands.length) {
    for (const item of result.nextCommands) {
      lines.push(`### ${item.step}. ${item.title}`);
      lines.push("");
      lines.push("```powershell");
      lines.push(item.command);
      lines.push("```");
      if (item.why) {
        lines.push("");
        lines.push(item.why);
      }
      lines.push("");
    }
  } else {
    lines.push("- none");
  }
  lines.push("## Next Steps");
  lines.push("");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  return `${lines.join("\n")}\n`;
}

function evidenceRow(label, item, summarize) {
  const status = item.promotionReady ? "promotion-ready" : item.status || "blocked";
  return `| ${label} | ${markdownCell(status)} | ${markdownCell(summarize(item))} | ${item.path ? link(item.path) : "n/a"} |`;
}

function requirementSummary(item) {
  return {
    name: item.name || "",
    details: item.details || {}
  };
}

function first(values) {
  return Array.isArray(values) && values.length ? values[0] : undefined;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function readJson(filePath) {
  if (!existsSync(filePath)) return undefined;
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

function link(filePath) {
  return `[open](${filePath.replace(/^docs\/evidence\/generated-card-comparisons\//, "../")})`;
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function yyyymmdd() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
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
