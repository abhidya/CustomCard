import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildProductionTextEvidenceIndex } from "./production-text-evidence-index.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");

if (isMainModule()) {
  const args = parseArgs(process.argv.slice(2));
  const result = runProductionTextPromotionGate(args);
  console.log(JSON.stringify({
    status: result.status,
    promotionReady: result.promotionReady,
    reportDir: result.reportDir,
    failedRequirements: result.requirements.filter((item) => !item.ok).length,
    advisory: result.advisory
  }, null, 2));
  if (!result.advisory && !result.promotionReady) process.exitCode = 1;
}

export function runProductionTextPromotionGate(args = {}) {
  const advisory = Boolean(args.advisory);
  const outputRoot = resolve(String(args["output-root"] || evidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-promotion-gate-${timestamp()}`));
  const indexReportDir = resolve(reportDir, "evidence-index");
  const index = buildProductionTextEvidenceIndex({
    input: args.input || args["evidence-root"] || evidenceRoot,
    "output-dir": args["index-output-dir"] || indexReportDir,
    "include-untracked": args["include-untracked"]
  });
  const latestPlannerPreflight = index.plannerPreflights[0];
  const latestReadiness = index.readinessReports[0];
  const latestModelCoverage = index.modelCoverageReports[0];
  const latestPreflight = index.preflights[0];
  const latestAggregate = index.aggregates.find((entry) => entry.kind === "llm-planned") || index.aggregates[0];
  const latestBenchmark = index.benchmarkSummaries.find((entry) => entry.llmGeneratedRuns > 0) || index.benchmarkSummaries[0];
  const latestManualGradeChecklist = index.manualGradeChecklists[0];
  const plannerEvidenceAlignment = index.plannerEvidenceAlignment || {};
  const requiredFixtures = parseList(args.fixtures || "aquarium-lover-birthday,koi-fish-lover-encouragement,dog-lover-thank-you");
  const liveComfyProofCurrent = isLiveComfyProofCurrent(latestPreflight, latestReadiness);
  const requirements = [
    requirement("live ComfyUI preflight passed", latestPreflight?.liveComfyReachable && latestPreflight?.liveNodeAvailable, {
      preflight: latestPreflight?.path || "",
      preflightCreatedAtIso: latestPreflight?.createdAtIso || "",
      liveComfyReachable: latestPreflight?.liveComfyReachable,
      liveNodeAvailable: latestPreflight?.liveNodeAvailable
    }),
    requirement("live ComfyUI proof is current", liveComfyProofCurrent.ok, {
      preflight: latestPreflight?.path || "",
      preflightCreatedAtIso: latestPreflight?.createdAtIso || "",
      readiness: latestReadiness?.path || "",
      readinessCreatedAtIso: latestReadiness?.createdAtIso || "",
      preflightLiveComfyReachable: latestPreflight?.liveComfyReachable,
      preflightLiveNodeAvailable: latestPreflight?.liveNodeAvailable,
      readinessComfyReachable: latestReadiness?.comfyReachable,
      readinessHasTextComposer: latestReadiness?.hasTextComposer,
      staleReason: liveComfyProofCurrent.reason
    }),
    requirement("planner preflight is production-ready", latestPlannerPreflight?.promotionReady, {
      plannerPreflight: latestPlannerPreflight?.path || "",
      activeModel: latestPlannerPreflight?.activeModel || "",
      classification: latestPlannerPreflight?.classification || "",
      reportedContextTokens: latestPlannerPreflight?.reportedContextTokens,
      maxOutputTokens: latestPlannerPreflight?.maxOutputTokens,
      blockers: latestPlannerPreflight?.blockers || []
    }),
    requirement("planner preflight matches benchmark runtime", !plannerEvidenceAlignment.checked || plannerEvidenceAlignment.ok, {
      preflight: plannerEvidenceAlignment.preflight || {},
      benchmark: plannerEvidenceAlignment.benchmark || {},
      blockers: plannerEvidenceAlignment.blockers || []
    }),
    requirement("readiness doctor is promotion-ready", latestReadiness?.promotionReady, {
      readiness: latestReadiness?.path || "",
      blockers: latestReadiness?.blockers || []
    }),
    requirement("local model coverage is tracked", Boolean(latestModelCoverage), {
      modelCoverage: latestModelCoverage?.path || "",
      installedModelFiles: latestModelCoverage?.installedModelFiles ?? 0,
      recommendedInstalled: latestModelCoverage?.recommendedInstalled ?? 0,
      recommendedEvaluated: latestModelCoverage?.recommendedEvaluated ?? 0,
      recommendedMissing: latestModelCoverage?.recommendedMissing ?? 0
    }),
    requirement("production planner candidate is available", Boolean(
      latestReadiness?.productionSuitablePlannerReachable ||
      latestModelCoverage?.installedProductionPlanners?.length
    ), {
      modelCoverage: latestModelCoverage?.path || "",
      readiness: latestReadiness?.path || "",
      productionSuitablePlannerReachable: latestReadiness?.productionSuitablePlannerReachable,
      installedProductionPlanners: latestModelCoverage?.installedProductionPlanners || [],
      unevaluatedProductionPlanners: latestModelCoverage?.unevaluatedProductionPlanners || [],
      missingProductionPlanners: latestModelCoverage?.missingProductionPlanners || []
    }),
    requirement("production-suitable planner endpoint is reachable", latestReadiness?.productionSuitablePlannerReachable, {
      readiness: latestReadiness?.path || "",
      activePlannerModels: latestReadiness?.activePlannerModels || []
    }),
    requirement("no small smoke planner is active or used", !latestReadiness?.smallPlannerActive && !latestBenchmark?.smallPlannerUsed, {
      readinessSmallPlannerActive: latestReadiness?.smallPlannerActive,
      benchmarkSmallPlannerUsed: latestBenchmark?.smallPlannerUsed,
      textModels: latestBenchmark?.textModels || []
    }),
    requirement("LLM-planned customer request matrix completed", Boolean(
      latestBenchmark &&
      latestBenchmark.llmGeneratedRuns >= requiredFixtures.length &&
      latestBenchmark.completedRuns >= requiredFixtures.length &&
      latestBenchmark.failedRuns === 0 &&
      requiredFixtures.every((fixture) => latestBenchmark.fixtures.includes(fixture))
    ), {
      benchmark: latestBenchmark?.path || "",
      requiredFixtures,
      fixtures: latestBenchmark?.fixtures || [],
      completedRuns: latestBenchmark?.completedRuns ?? 0,
      failedRuns: latestBenchmark?.failedRuns ?? 0
    }),
    requirement("final images came from Comfy text composer", latestBenchmark?.finalImagesRenderedByComfy && latestBenchmark?.deterministicTextComposerUsed, {
      benchmark: latestBenchmark?.path || "",
      finalImagesRenderedByComfy: latestBenchmark?.finalImagesRenderedByComfy,
      deterministicTextComposerUsed: latestBenchmark?.deterministicTextComposerUsed
    }),
    requirement("planner preserved required terms and avoided forbidden terms", !latestBenchmark?.missingMustInclude?.length && !latestBenchmark?.mustAvoidFailures?.length, {
      benchmark: latestBenchmark?.path || "",
      missingMustInclude: latestBenchmark?.missingMustInclude || [],
      mustAvoidFailures: latestBenchmark?.mustAvoidFailures || []
    }),
    requirement("manual grade checklist is promotion-ready", latestManualGradeChecklist?.promotionReady, {
      manualGradeChecklist: latestManualGradeChecklist?.path || "",
      totalRuns: latestManualGradeChecklist?.totalRuns ?? 0,
      gradableRuns: latestManualGradeChecklist?.gradableRuns ?? 0,
      gradedGeneratedRuns: latestManualGradeChecklist?.gradedGeneratedRuns ?? 0,
      missingGrades: latestManualGradeChecklist?.missingGrades ?? 0,
      invalidGrades: latestManualGradeChecklist?.invalidGrades ?? 0,
      failedBeforeImageGeneration: latestManualGradeChecklist?.failedBeforeImageGeneration ?? 0,
      blockers: latestManualGradeChecklist?.blockers || []
    }),
    requirement("manual aggregate is promotion-ready", latestAggregate?.promotionReady && latestAggregate?.totalRuns >= requiredFixtures.length, {
      aggregate: latestAggregate?.path || "",
      totalRuns: latestAggregate?.totalRuns ?? 0,
      statuses: latestAggregate?.statuses || {},
      bestScore: latestAggregate?.bestScore,
      blockingFailures: latestAggregate?.blockingFailures || []
    })
  ];
  const promotionReady = requirements.every((item) => item.ok);
  const result = {
    createdAtIso: new Date().toISOString(),
    status: promotionReady ? "promotion-ready" : "blocked",
    promotionReady,
    advisory,
    requiredFixtures,
    evidenceIndex: index.reportDir,
    latest: index.latest,
    requirements,
    nextSteps: buildNextSteps(requirements, index.nextSteps)
  };

  mkdirSync(reportDir, { recursive: true });
  result.reportDir = relativePath(reportDir);
  writeJson(resolve(reportDir, "production-text-promotion-gate.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-promotion-gate.md"), buildMarkdown(result));
  return result;
}

function requirement(name, ok, details = {}) {
  return { name, ok: Boolean(ok), details };
}

function isLiveComfyProofCurrent(latestPreflight, latestReadiness) {
  const liveProofPassed = Boolean(latestPreflight?.liveComfyReachable && latestPreflight?.liveNodeAvailable);
  if (!liveProofPassed) return { ok: false, reason: "latest live Comfy preflight did not pass" };
  if (!latestReadiness) return { ok: true, reason: "" };
  const preflightTime = Date.parse(latestPreflight.createdAtIso || "");
  const readinessTime = Date.parse(latestReadiness.createdAtIso || "");
  const readinessIsNewer = Number.isFinite(preflightTime) &&
    Number.isFinite(readinessTime) &&
    readinessTime > preflightTime;
  if (!readinessIsNewer) return { ok: true, reason: "" };
  if (latestReadiness.comfyReachable && latestReadiness.hasTextComposer) return { ok: true, reason: "" };
  return {
    ok: false,
    reason: "newer readiness evidence reports live ComfyUI or CustomCardTextComposer unavailable"
  };
}

function buildNextSteps(requirements, indexedNextSteps) {
  const steps = [];
  const failed = new Set(requirements.filter((item) => !item.ok).map((item) => item.name));
  if (failed.has("live ComfyUI preflight passed")) {
    steps.push("Run production-text live preflight with ComfyUI and CustomCardTextComposer loaded.");
  }
  if (failed.has("live ComfyUI proof is current")) {
    steps.push("Refresh live ComfyUI preflight after the current readiness probe, with CustomCardTextComposer loaded.");
  }
  if (failed.has("planner preflight is production-ready")) {
    steps.push("Run production-text planner preflight with a production-suitable model, 8192+ context, and the full output budget.");
  }
  if (failed.has("planner preflight matches benchmark runtime")) {
    steps.push("Refresh planner preflight against the exact endpoint/model used by the latest benchmark before treating planner evidence as current.");
  }
  if (failed.has("readiness doctor is promotion-ready") || failed.has("production-suitable planner endpoint is reachable")) {
    steps.push("Run the planner preflight and readiness doctor after starting a production-suitable planner endpoint with 8192+ context.");
  }
  if (failed.has("local model coverage is tracked")) {
    steps.push("Refresh and commit local model coverage before running the final production-text promotion gate.");
  }
  if (failed.has("production planner candidate is available")) {
    steps.push("Install a production-suitable local planner such as Gemma 31B, Magistral Small, or Qwen3 14B+, or configure a hosted/self-hosted production planner endpoint.");
  }
  if (failed.has("no small smoke planner is active or used")) {
    steps.push("Use Qwen3-4B/8B only for smoke/failure evidence; run promotion evidence with Gemma 31B, Magistral Small, Qwen3-14B+, or a hosted/self-hosted production planner.");
  }
  if (failed.has("LLM-planned customer request matrix completed")) {
    steps.push("Run the full aquarium/koi/dog production-text matrix to completion.");
  }
  if (failed.has("planner preserved required terms and avoided forbidden terms")) {
    steps.push("Keep the full prompt and correct planner runtime; retry/repair planner output until must_include and must_avoid checks pass before Comfy work.");
  }
  if (failed.has("manual grade checklist is promotion-ready")) {
    steps.push("Run the manual grade checklist after grading every generated run, then resolve missing/invalid/blocked grades before aggregation.");
  }
  if (failed.has("manual aggregate is promotion-ready")) {
    steps.push("Manually grade every run and regenerate the aggregate only after all candidates pass.");
  }
  return unique(steps.length ? steps : indexedNextSteps);
}

function buildMarkdown(result) {
  const lines = [
    "# Production Text Promotion Gate",
    "",
    `Created: ${result.createdAtIso}`,
    `Status: ${result.status}`,
    `Promotion ready: ${result.promotionReady ? "yes" : "no"}`,
    `Evidence index: ${result.evidenceIndex}`,
    "",
    "## Requirements",
    "",
    "| Requirement | Status | Details |",
    "| --- | --- | --- |"
  ];
  for (const item of result.requirements) {
    lines.push(`| ${item.name} | ${item.ok ? "ok" : "fail"} | ${markdownCell(JSON.stringify(item.details))} |`);
  }
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  for (const step of result.nextSteps) lines.push(`- ${step}`);
  return `${lines.join("\n")}\n`;
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
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

function parseList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function relativePath(filePath) {
  return resolve(filePath).replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function isMainModule() {
  return process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href;
}
