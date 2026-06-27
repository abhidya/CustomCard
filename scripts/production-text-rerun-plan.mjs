import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { productionTextPlannerPolicy } from "./production-text-planner-policy.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const defaultGateReport = resolve(
  evidenceRoot,
  "production-text-promotion-gate-20260626-current/production-text-promotion-gate.json"
);
const defaultIndexReport = resolve(
  evidenceRoot,
  "production-text-evidence-index-20260626-current/production-text-evidence-index.json"
);

if (isMainModule()) {
  const result = buildProductionTextRerunPlan(parseArgs(process.argv.slice(2)));
  console.log(JSON.stringify({
    status: result.status,
    outputDir: result.reportDir,
    failedRequirements: result.failedRequirements.length,
    commands: result.commands.length
  }, null, 2));
}

export function buildProductionTextRerunPlan(args = {}) {
  const reportDate = String(args.date || yyyymmdd()).replace(/[^0-9]/g, "") || yyyymmdd();
  const outputRoot = resolve(String(args["output-root"] || evidenceRoot));
  const reportDir = resolve(String(args["output-dir"] || `${outputRoot}/production-text-rerun-plan-${reportDate}-current`));
  const gatePath = resolve(String(args.gate || args["gate-report"] || defaultGateReport));
  const indexPath = resolve(String(args.index || args["evidence-index"] || defaultIndexReport));
  const gate = readJson(gatePath) || {};
  const index = readJson(indexPath) || {};
  const failedRequirements = (gate.requirements || [])
    .filter((item) => !item.ok)
    .map((item) => ({
      name: item.name,
      details: item.details || {}
    }));
  const latestPlanner = index.plannerPreflights?.[0] || {};
  const latestPlannerGpuFeasibility = index.plannerGpuFeasibilityReports?.[0] || {};
  const latestModelCoverage = index.modelCoverageReports?.[0] || {};
  const latestBenchmark = index.benchmarkSummaries?.[0] || {};
  const latestAggregate = (index.aggregates || []).find((entry) => entry.kind === "llm-planned") || index.aggregates?.[0] || {};
  const baseRecommended = {
    plannerBaseUrl: String(args["planner-base-url"] || "http://127.0.0.1:5013/v1"),
    plannerModel: String(args["planner-model"] || productionTextPlannerPolicy.recommendedModels[0]),
    plannerModelPath: String(args["planner-model-path"] || defaultPlannerModelPath(args["planner-model"] || productionTextPlannerPolicy.recommendedModels[0])),
    contextTokens: numberOr(args["context-tokens"], productionTextPlannerPolicy.minContextTokens),
    maxOutputTokens: numberOr(args["max-output-tokens"], productionTextPlannerPolicy.recommendedOutputTokens),
    requestTimeoutMs: numberOr(args["request-timeout-ms"], 1_200_000),
    gpuId: numberOr(args["gpu-id"], 0),
    gpuLayers: numberOr(args["gpu-layers"], 999),
    checkpoint: String(args.checkpoint || "sd_xl_turbo_1.0_fp16.safetensors"),
    steps: numberOr(args.steps, 2),
    cfg: numberOr(args.cfg, 1.5),
    sampler: String(args.sampler || "euler_ancestral"),
    scheduler: String(args.scheduler || "sgm_uniform")
  };
  const recommended = selectPlannerRuntimeRecommendation({ args, baseRecommended, latestPlannerGpuFeasibility });
  const paths = {
    plannerGpuFeasibilityOutput: `docs/evidence/generated-card-comparisons/production-text-planner-gpu-feasibility-${reportDate}-production-planner`,
    plannerPreflightOutput: `docs/evidence/generated-card-comparisons/production-text-planner-preflight-${reportDate}-production-planner`,
    plannerThroughputOutput: `docs/evidence/generated-card-comparisons/production-text-planner-throughput-${reportDate}-production-planner`,
    liveComfyPreflightOutput: `docs/evidence/generated-card-comparisons/production-text-preflight-${reportDate}-production-planner`,
    readinessOutput: `docs/evidence/generated-card-comparisons/production-text-readiness-${reportDate}-production-planner`,
    benchmarkOutput: `docs/evidence/generated-card-comparisons/production-text-workflow-${reportDate}-production-planner`,
    manualGradeChecklistOutput: `docs/evidence/generated-card-comparisons/production-text-manual-grade-checklist-${reportDate}-production-planner`,
    visualQaOutput: `docs/evidence/generated-card-comparisons/production-text-visual-qa-${reportDate}-production-planner`,
    aggregateOutput: `docs/evidence/generated-card-comparisons/benchmark-aggregate-${reportDate}-production-text-production-planner`,
    evidenceIndexOutput: `docs/evidence/generated-card-comparisons/production-text-evidence-index-${reportDate}-production-planner`,
    promotionGateOutput: `docs/evidence/generated-card-comparisons/production-text-promotion-gate-${reportDate}-production-planner`
  };
  const commands = buildCommands({ recommended, paths });
  const result = {
    createdAtIso: new Date().toISOString(),
    status: gate.promotionReady ? "promotion-ready" : "rerun-required",
    promotionReady: Boolean(gate.promotionReady),
    reportDir: relativePath(reportDir),
    inputs: {
      gateReport: relativePath(gatePath),
      evidenceIndex: relativePath(indexPath)
    },
    currentEvidence: {
      plannerPreflight: latestPlanner.path || gate.latest?.plannerPreflight || "",
      plannerClassification: latestPlanner.classification || "",
      plannerModel: latestPlanner.activeModel || "",
      plannerContextTokens: latestPlanner.reportedContextTokens ?? null,
      plannerGpuFeasibility: latestPlannerGpuFeasibility.path || "",
      gpuOnlyCandidateIds: latestPlannerGpuFeasibility.gpuOnlyCandidateIds || [],
      hardwareBlockedCandidateIds: latestPlannerGpuFeasibility.hardwareBlockedCandidateIds || [],
      localModelCoverage: latestModelCoverage.path || "",
      installedProductionPlanners: latestModelCoverage.installedProductionPlanners || [],
      unevaluatedProductionPlanners: latestModelCoverage.unevaluatedProductionPlanners || [],
      missingProductionPlanners: latestModelCoverage.missingProductionPlanners || [],
      latestBenchmark: latestBenchmark.path || gate.latest?.benchmark || "",
      latestAggregate: latestAggregate.path || gate.latest?.aggregate || "",
      bestScore: latestAggregate.bestScore ?? null
    },
    failedRequirements,
    productionPlannerContract: {
      summary: "Keep the full creative planner prompt and switch the runtime, not the prompt quality.",
      minimumOpenWeightPlannerClass: productionTextPlannerPolicy.minimumOpenWeightPlannerClass,
      minContextTokens: productionTextPlannerPolicy.minContextTokens,
      minOutputTokens: productionTextPlannerPolicy.minOutputTokens,
      recommendedOutputTokens: productionTextPlannerPolicy.recommendedOutputTokens,
      recommendedRequestTimeoutMs: recommended.requestTimeoutMs,
      runtimeRecommendation: {
        mode: recommended.runtimeMode,
        localGpuRequired: recommended.localGpuRequired,
        reason: recommended.runtimeReason,
        plannerBaseUrl: recommended.plannerBaseUrl,
        plannerModel: recommended.plannerModel,
        hardwareBlockedCandidateIds: recommended.hardwareBlockedCandidateIds || [],
        gpuOnlyCandidateIds: recommended.gpuOnlyCandidateIds || [],
        blockers: recommended.localGpuBlockers || []
      },
      requiredLocalGpu: {
        gpuId: recommended.gpuId,
        gpuLayers: recommended.gpuLayers,
        note: "Local KoboldCPP production planner commands must use CUDA/Vulkan/HIP with nonzero GPU offload. GpuLayers 999 requests full GPU offload and lets KoboldCPP cap at what the runtime can use. The benchmark wrapper auto-starts the configured local production planner when the dedicated planner port is requested but no KoboldCPP process is listening there."
      },
      recommendedModels: productionTextPlannerPolicy.recommendedModels,
      disallowedForPromotion: [
        "Qwen3-4B/8B and other 1.5B/3B/4B/7B/8B local planners",
        "4096-context planner runs",
        "Reduced creative prompt contracts used only to fit small local models",
        "CPU-only KoboldCPP planner runs or --gpulayers 0",
        "-AllowSmallPlanner except when collecting explicit smoke/failure evidence"
      ]
    },
    rerunPaths: paths,
    commands,
    acceptanceChecks: [
      "planner preflight is production-ready",
      "planner runtime is hosted/self-hosted GPU capacity or local GPU-only fit is proven",
      "planner throughput probe completes the full JSON contract",
      "planner preflight matches benchmark runtime",
      "live ComfyUI proof is current",
      "readiness doctor is promotion-ready",
      "production-suitable planner endpoint is reachable",
      "no small smoke planner is active or used",
      "LLM-planned customer request matrix completed",
      "final images came from Comfy text composer",
      "planner preserved required terms and avoided forbidden terms",
      "manual grade checklist is promotion-ready",
      "production visual QA gate is promotion-ready",
      "manual aggregate is promotion-ready"
    ]
  };

  mkdirSync(reportDir, { recursive: true });
  writeJson(resolve(reportDir, "production-text-rerun-plan.json"), result);
  writeMarkdown(resolve(reportDir, "production-text-rerun-plan.md"), buildMarkdown(result));
  return result;
}

function buildCommands({ recommended, paths }) {
  if (!recommended.localGpuRequired) {
    return buildHostedCommands({ recommended, paths });
  }
  return buildLocalCommands({ recommended, paths });
}

function buildLocalCommands({ recommended, paths }) {
  return [
    {
      step: 1,
      title: "Start or configure production planner",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -ModelPath ${recommended.plannerModelPath} -Port 5013 -ContextSize ${recommended.contextTokens} -GpuId ${recommended.gpuId} -GpuLayers ${recommended.gpuLayers}`,
      why: "Starts a production-suitable local planner with GPU offload. Use an equivalent hosted/self-hosted HTTPS OpenAI-compatible endpoint if local VRAM cannot run the planner."
    },
    {
      step: 2,
      title: "Check planner GPU-only fit",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-gpu-feasibility.mjs --base-url ${recommended.plannerBaseUrl} --model ${recommended.plannerModel} --model-path ${recommended.plannerModelPath} --gpu-id ${recommended.gpuId} --output-dir ${paths.plannerGpuFeasibilityOutput}`,
      why: "Blocks partial CPU-offload evidence by checking the active planner model size against the assigned GPU before planner preflight or throughput work."
    },
    {
      step: 3,
      title: "Write planner preflight evidence",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url ${recommended.plannerBaseUrl} --model ${recommended.plannerModel} --reported-context-tokens ${recommended.contextTokens} --max-output-tokens ${recommended.maxOutputTokens} --output-dir ${paths.plannerPreflightOutput}`,
      why: "Proves the planner model, context budget, and output cap before image work starts."
    },
    {
      step: 4,
      title: "Probe planner throughput",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-throughput-probe.mjs --base-url ${recommended.plannerBaseUrl} --model ${recommended.plannerModel} --reported-context-tokens ${recommended.contextTokens} --max-output-tokens ${recommended.maxOutputTokens} --request-timeout-ms ${recommended.requestTimeoutMs} --output-dir ${paths.plannerThroughputOutput}`,
      why: "Uses the full card-copy prompt to prove the planner can finish valid JSON before spending Comfy image work."
    },
    {
      step: 5,
      title: "Refresh live Comfy preflight",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true --report-dir ${paths.liveComfyPreflightOutput}`,
      why: "Proves the current ComfyUI runtime is reachable and has CustomCardTextComposer loaded before readiness or image work rely on it."
    },
    {
      step: 6,
      title: "Refresh readiness",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url ${recommended.plannerBaseUrl} --planner-context-tokens ${recommended.contextTokens} --planner-max-output-tokens ${recommended.maxOutputTokens} --output-dir ${paths.readinessOutput}`,
      why: "Confirms Comfy, the custom text node, aggregate state, model inventory, and the configured planner endpoint with the production context/output budget."
    },
    {
      step: 7,
      title: "Run full production-text matrix",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl ${recommended.plannerBaseUrl} -LocalLlmModel ${recommended.plannerModel} -OutputDir ${paths.benchmarkOutput} -Checkpoint ${recommended.checkpoint} -Steps ${recommended.steps} -Cfg ${recommended.cfg} -Sampler ${recommended.sampler} -Scheduler ${recommended.scheduler} -PlannerMaxTokens ${recommended.maxOutputTokens} -PlannerContextSize ${recommended.contextTokens} -PlannerRequestTimeoutMs ${recommended.requestTimeoutMs} -PlannerGpuId ${recommended.gpuId} -PlannerGpuLayers ${recommended.gpuLayers} -ProductionPlannerModelPath ${recommended.plannerModelPath}`,
      why: "Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout; when the dedicated local planner port is missing, the wrapper starts the configured GPU-backed planner before the live run."
    },
    {
      step: 8,
      title: "Manually grade every run",
      command: `${paths.benchmarkOutput}/production-text-workflow/*/manual-grade-template.md`,
      why: "Fill each template and save manual-visual-grade.json before aggregating promotion evidence."
    },
    {
      step: 9,
      title: "Write manual grade checklist",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-manual-grade-checklist.mjs --advisory --input ${paths.benchmarkOutput} --output-dir ${paths.manualGradeChecklistOutput}`,
      why: "Summarizes generated runs, missing/invalid manual grades, blocked grades, and failed-before-image stories before aggregation."
    },
    {
      step: 10,
      title: "Run production visual QA gate",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-visual-qa-gate.mjs --advisory --input ${paths.benchmarkOutput} --output-dir ${paths.visualQaOutput}`,
      why: "Requires structured productionTextQa checks for text overflow, missing text, fake/pseudo text, mockup/object leakage, people/hands/faces, low contrast, and Comfy text composer proof before aggregation."
    },
    {
      step: 11,
      title: "Aggregate production-text results",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/model-benchmark-aggregate.mjs --input ${paths.benchmarkOutput} --output-dir ${paths.aggregateOutput} --phase local-production-text`,
      why: "Builds the ranked aggregate used by the promotion gate."
    },
    {
      step: 12,
      title: "Refresh tracked evidence index",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir ${paths.evidenceIndexOutput}`,
      why: "Aggregates tracked planner/readiness/preflight/benchmark/aggregate evidence after the rerun artifacts are committed."
    },
    {
      step: 13,
      title: "Run final promotion gate",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir ${paths.promotionGateOutput} --index-output-dir ${paths.evidenceIndexOutput}`,
      why: "Shows whether every production-text requirement now passes. Remove --advisory only when a pass is expected."
    }
  ];
}

function buildHostedCommands({ recommended, paths }) {
  const hostedBaseUrl = "$env:CUSTOMCARD_LOCAL_LLM_BASE_URL";
  const hostedModel = "$env:CUSTOMCARD_LOCAL_LLM_MODEL";
  return [
    {
      step: 1,
      title: "Configure hosted or self-hosted production planner",
      command: `$env:CUSTOMCARD_LOCAL_LLM_BASE_URL="${recommended.plannerBaseUrl}"; $env:CUSTOMCARD_LOCAL_LLM_MODEL="${recommended.plannerModel}"; $env:CUSTOMCARD_LOCAL_LLM_API_KEY="<redacted>"`,
      why: hostedWhy(recommended)
    },
    {
      step: 2,
      title: "Write planner preflight evidence",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url ${hostedBaseUrl} --model ${hostedModel} --reported-context-tokens ${recommended.contextTokens} --max-output-tokens ${recommended.maxOutputTokens} --output-dir ${paths.plannerPreflightOutput}`,
      why: "Proves the hosted/self-hosted planner model, context budget, and output cap before image work starts."
    },
    {
      step: 3,
      title: "Probe planner throughput",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-throughput-probe.mjs --base-url ${hostedBaseUrl} --model ${hostedModel} --reported-context-tokens ${recommended.contextTokens} --max-output-tokens ${recommended.maxOutputTokens} --request-timeout-ms ${recommended.requestTimeoutMs} --output-dir ${paths.plannerThroughputOutput}`,
      why: "Uses the full card-copy prompt to prove the planner can finish valid JSON before spending Comfy image work."
    },
    {
      step: 4,
      title: "Refresh live Comfy preflight",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/comfyui-production-text-preflight.mjs --require-live true --report-dir ${paths.liveComfyPreflightOutput}`,
      why: "Proves the current ComfyUI runtime is reachable and has CustomCardTextComposer loaded before readiness or image work rely on it."
    },
    {
      step: 5,
      title: "Refresh readiness",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-readiness-doctor.mjs --advisory --local-llm-base-url ${hostedBaseUrl} --planner-context-tokens ${recommended.contextTokens} --planner-max-output-tokens ${recommended.maxOutputTokens} --output-dir ${paths.readinessOutput}`,
      why: "Confirms Comfy, the custom text node, aggregate state, model inventory, and the configured planner endpoint with the production context/output budget."
    },
    {
      step: 6,
      title: "Run full production-text matrix",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/run-production-text-benchmark.ps1 -LocalLlmBaseUrl ${hostedBaseUrl} -LocalLlmModel ${hostedModel} -OutputDir ${paths.benchmarkOutput} -Checkpoint ${recommended.checkpoint} -Steps ${recommended.steps} -Cfg ${recommended.cfg} -Sampler ${recommended.sampler} -Scheduler ${recommended.scheduler} -PlannerMaxTokens ${recommended.maxOutputTokens} -PlannerContextSize ${recommended.contextTokens} -PlannerRequestTimeoutMs ${recommended.requestTimeoutMs} -NoAutoStartPlanner`,
      why: "Runs aquarium/koi/dog customer requests through the production Comfy text workflow with LLM-owned theme/copy/layout, while preventing the wrapper from falling back to the known hardware-blocked local planner."
    },
    {
      step: 7,
      title: "Manually grade every run",
      command: `${paths.benchmarkOutput}/production-text-workflow/*/manual-grade-template.md`,
      why: "Fill each template and save manual-visual-grade.json before aggregating promotion evidence."
    },
    {
      step: 8,
      title: "Write manual grade checklist",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-manual-grade-checklist.mjs --advisory --input ${paths.benchmarkOutput} --output-dir ${paths.manualGradeChecklistOutput}`,
      why: "Summarizes generated runs, missing/invalid manual grades, blocked grades, and failed-before-image stories before aggregation."
    },
    {
      step: 9,
      title: "Run production visual QA gate",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-visual-qa-gate.mjs --advisory --input ${paths.benchmarkOutput} --output-dir ${paths.visualQaOutput}`,
      why: "Requires structured productionTextQa checks for text overflow, missing text, fake/pseudo text, mockup/object leakage, people/hands/faces, low contrast, and Comfy text composer proof before aggregation."
    },
    {
      step: 10,
      title: "Aggregate production-text results",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/model-benchmark-aggregate.mjs --input ${paths.benchmarkOutput} --output-dir ${paths.aggregateOutput} --phase local-production-text`,
      why: "Builds the ranked aggregate used by the promotion gate."
    },
    {
      step: 11,
      title: "Refresh tracked evidence index",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-evidence-index.mjs --output-dir ${paths.evidenceIndexOutput}`,
      why: "Aggregates tracked planner/readiness/preflight/benchmark/aggregate evidence after the rerun artifacts are committed."
    },
    {
      step: 12,
      title: "Run final promotion gate",
      command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-promotion-gate.mjs --advisory --output-dir ${paths.promotionGateOutput} --index-output-dir ${paths.evidenceIndexOutput}`,
      why: "Shows whether every production-text requirement now passes. Remove --advisory only when a pass is expected."
    }
  ];
}

function buildMarkdown(plan) {
  const lines = [
    "# Production Text Rerun Plan",
    "",
    `Created: ${plan.createdAtIso}`,
    `Status: ${plan.status}`,
    `Gate: ${plan.inputs.gateReport}`,
    `Evidence index: ${plan.inputs.evidenceIndex}`,
    "",
    "## Current Blockers",
    ""
  ];
  if (plan.failedRequirements.length) {
    for (const requirement of plan.failedRequirements) {
      lines.push(`- ${requirement.name}`);
    }
  } else {
    lines.push("- none");
  }
  lines.push("");
  lines.push("## Planner Contract");
  lines.push("");
  lines.push(`- ${plan.productionPlannerContract.summary}`);
  lines.push(`- Minimum planner class: ${plan.productionPlannerContract.minimumOpenWeightPlannerClass}`);
  lines.push(`- Minimum context tokens: ${plan.productionPlannerContract.minContextTokens}`);
  lines.push(`- Recommended output tokens: ${plan.productionPlannerContract.recommendedOutputTokens}`);
  lines.push(`- Recommended local request timeout: ${plan.productionPlannerContract.recommendedRequestTimeoutMs}ms`);
  lines.push(`- Runtime recommendation: ${plan.productionPlannerContract.runtimeRecommendation.mode} (${plan.productionPlannerContract.runtimeRecommendation.reason})`);
  lines.push(`- Required local GPU when local: device ${plan.productionPlannerContract.requiredLocalGpu.gpuId}, gpulayers ${plan.productionPlannerContract.requiredLocalGpu.gpuLayers}`);
  lines.push(`- Recommended models: ${plan.productionPlannerContract.recommendedModels.join(", ")}`);
  if (plan.productionPlannerContract.runtimeRecommendation.hardwareBlockedCandidateIds.length) {
    lines.push(`- Hardware-blocked local planners: ${plan.productionPlannerContract.runtimeRecommendation.hardwareBlockedCandidateIds.join(", ")}`);
  }
  if (plan.productionPlannerContract.runtimeRecommendation.blockers.length) {
    for (const blocker of plan.productionPlannerContract.runtimeRecommendation.blockers) {
      lines.push(`- Runtime blocker: ${blocker}`);
    }
  }
  lines.push("");
  lines.push("Do not use for promotion:");
  for (const item of plan.productionPlannerContract.disallowedForPromotion) {
    lines.push(`- ${item}`);
  }
  if (plan.currentEvidence.localModelCoverage) {
    lines.push("");
    lines.push("## Local Model Coverage");
    lines.push("");
    lines.push(`- Coverage report: ${plan.currentEvidence.localModelCoverage}`);
    lines.push(`- Installed production planners: ${plan.currentEvidence.installedProductionPlanners.join(", ") || "none"}`);
    lines.push(`- GPU-only local candidates: ${plan.currentEvidence.gpuOnlyCandidateIds.join(", ") || "none"}`);
    lines.push(`- Hardware-blocked local candidates: ${plan.currentEvidence.hardwareBlockedCandidateIds.join(", ") || "none"}`);
    lines.push(`- Installed but not evaluated: ${plan.currentEvidence.unevaluatedProductionPlanners.join(", ") || "none"}`);
    lines.push(`- Missing production planner fallbacks: ${plan.currentEvidence.missingProductionPlanners.join(", ") || "none"}`);
  }
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  for (const command of plan.commands) {
    lines.push(`### ${command.step}. ${command.title}`);
    lines.push("");
    lines.push("```powershell");
    lines.push(command.command);
    lines.push("```");
    lines.push("");
    lines.push(command.why);
    lines.push("");
  }
  lines.push("## Acceptance Checks");
  lines.push("");
  for (const check of plan.acceptanceChecks) {
    lines.push(`- ${check}`);
  }
  return `${lines.join("\n")}\n`;
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

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function selectPlannerRuntimeRecommendation({ args, baseRecommended, latestPlannerGpuFeasibility }) {
  const explicitPlannerRuntime = [
    "planner-base-url",
    "planner-model",
    "planner-model-path",
    "gpu-id",
    "gpu-layers"
  ].some((key) => Object.hasOwn(args, key));
  const hostedConfigured = !isLocalPlannerBaseUrl(baseRecommended.plannerBaseUrl);
  const localHardwareBlocked = latestFeasibilityBlocksLocalRuntime(latestPlannerGpuFeasibility);
  const localGpuBlockers = latestPlannerGpuFeasibility.blockers || [];
  const hardwareBlockedCandidateIds = latestPlannerGpuFeasibility.hardwareBlockedCandidateIds || [];
  const gpuOnlyCandidateIds = latestPlannerGpuFeasibility.gpuOnlyCandidateIds || [];

  if (hostedConfigured) {
    return {
      ...baseRecommended,
      runtimeMode: "hosted-configured",
      runtimeReason: "A non-local OpenAI-compatible planner endpoint was explicitly configured.",
      localGpuRequired: false,
      localGpuBlockers,
      hardwareBlockedCandidateIds,
      gpuOnlyCandidateIds
    };
  }

  if (localHardwareBlocked && !explicitPlannerRuntime) {
    return {
      ...baseRecommended,
      plannerBaseUrl: "https://YOUR_OPENAI_COMPATIBLE_ENDPOINT/v1",
      plannerModel: "YOUR_PRODUCTION_PLANNER_MODEL",
      plannerModelPath: "",
      runtimeMode: "hosted-required",
      runtimeReason: "Latest GPU feasibility evidence found no installed local production planner that fully fits a single assigned GPU.",
      localGpuRequired: false,
      localGpuBlockers,
      hardwareBlockedCandidateIds,
      gpuOnlyCandidateIds
    };
  }

  return {
    ...baseRecommended,
    runtimeMode: "local-gpu",
    runtimeReason: explicitPlannerRuntime
      ? "Local planner runtime was explicitly requested in rerun-plan arguments."
      : "No current evidence proves every local production planner candidate is hardware-blocked.",
    localGpuRequired: true,
    localGpuBlockers,
    hardwareBlockedCandidateIds,
    gpuOnlyCandidateIds
  };
}

function latestFeasibilityBlocksLocalRuntime(report) {
  return Boolean(
    report?.path &&
    report.gpuOnlyReady === false &&
    Array.isArray(report.gpuOnlyCandidateIds) &&
    report.gpuOnlyCandidateIds.length === 0 &&
    Array.isArray(report.hardwareBlockedCandidateIds) &&
    report.hardwareBlockedCandidateIds.length > 0
  );
}

function isLocalPlannerBaseUrl(value) {
  try {
    const parsed = new URL(String(value));
    return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function hostedWhy(recommended) {
  const hardwareBlocked = recommended.hardwareBlockedCandidateIds?.length
    ? ` Latest hardware-blocked local candidates: ${recommended.hardwareBlockedCandidateIds.join(", ")}.`
    : "";
  return `Configures a production-class OpenAI-compatible planner without using the local hardware-blocked KoboldCPP path. Keep these environment variables in the shell used for the remaining commands.${hardwareBlocked}`;
}

function defaultPlannerModelPath(modelName) {
  return `D:\\models\\${String(modelName || "").replace(/^koboldcpp\//, "")}.gguf`;
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
