import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductionTextRerunPlan } from "../scripts/production-text-rerun-plan.mjs";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("production text rerun plan", () => {
  it("turns blocked gate evidence into a production-planner command chain", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-rerun-plan-"));
    const gatePath = join(root, "production-text-promotion-gate.json");
    const indexPath = join(root, "production-text-evidence-index.json");
    const outputDir = join(root, "rerun-plan");

    writeJson(gatePath, {
      createdAtIso: "2026-06-26T22:42:03.546Z",
      status: "blocked",
      promotionReady: false,
      latest: {
        plannerPreflight: "docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260626-current/production-text-planner-preflight.json",
        benchmark: "docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json",
        aggregate: "docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json"
      },
      requirements: [
        { name: "live ComfyUI preflight passed", ok: true },
        { name: "planner preflight is production-ready", ok: false, details: { classification: "smoke-only" } },
        { name: "LLM-planned customer request matrix completed", ok: false },
        { name: "manual aggregate is promotion-ready", ok: false }
      ]
    });
    writeJson(indexPath, {
      plannerPreflights: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-planner-preflight-20260626-current/production-text-planner-preflight.json",
          classification: "smoke-only",
          activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          reportedContextTokens: 4096
        }
      ],
      benchmarkSummaries: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json"
        }
      ],
      modelCoverageReports: [
        {
          path: "docs/evidence/generated-card-comparisons/local-model-coverage-20260626-current/local-model-coverage.json",
          installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
          unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
          missingProductionPlanners: ["qwen3-14b-instruct"]
        }
      ],
      aggregates: [
        {
          kind: "llm-planned",
          path: "docs/evidence/generated-card-comparisons/benchmark-aggregate-2026-06-26-production-text-llm-planner-live/benchmark-aggregate.json",
          bestScore: 38
        }
      ]
    });

    const plan = buildProductionTextRerunPlan({
      gate: gatePath,
      index: indexPath,
      "output-dir": outputDir,
      date: "20260626"
    });

    expect(plan.status).toBe("rerun-required");
    expect(plan.failedRequirements.map((item) => item.name)).toEqual([
      "planner preflight is production-ready",
      "LLM-planned customer request matrix completed",
      "manual aggregate is promotion-ready"
    ]);
    expect(plan.productionPlannerContract.minContextTokens).toBe(8192);
    expect(plan.productionPlannerContract.recommendedRequestTimeoutMs).toBe(1200000);
    expect(plan.productionPlannerContract.requiredLocalGpu).toMatchObject({
      gpuId: 0,
      gpuLayers: 999
    });
    expect(plan.productionPlannerContract.minimumOpenWeightPlannerClass).toContain("14B+");
    expect(plan.productionPlannerContract.disallowedForPromotion.join("\n")).toContain("Qwen3-4B");
    expect(plan.productionPlannerContract.disallowedForPromotion.join("\n")).toContain("8B");
    expect(plan.productionPlannerContract.disallowedForPromotion.join("\n")).toContain("gpulayers 0");
    expect(plan.productionPlannerContract.requiredLocalGpu.note).toContain("auto-starts");
    expect(plan.currentEvidence).toMatchObject({
      localModelCoverage: "docs/evidence/generated-card-comparisons/local-model-coverage-20260626-current/local-model-coverage.json",
      installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      missingProductionPlanners: ["qwen3-14b-instruct"]
    });
    expect(plan.commands.map((item) => item.title)).toEqual([
      "Start or configure production planner",
      "Check planner GPU-only fit",
      "Write planner preflight evidence",
      "Probe planner throughput",
      "Refresh live Comfy preflight",
      "Refresh readiness",
      "Run full production-text matrix",
      "Manually grade every run",
      "Write manual grade checklist",
      "Run production visual QA gate",
      "Aggregate production-text results",
      "Refresh tracked evidence index",
      "Run final promotion gate"
    ]);
    expect(plan.commands[1].command).toContain("production-text-planner-gpu-feasibility.mjs");
    expect(plan.commands[1].command).toContain("--gpu-id 0");
    expect(plan.commands[2].command).toContain("production-text-planner-preflight.mjs");
    expect(plan.commands[3].command).toContain("production-text-planner-throughput-probe.mjs");
    expect(plan.commands[3].command).toContain("--request-timeout-ms 1200000");
    expect(plan.commands[4].command).toContain("comfyui-production-text-preflight.mjs");
    expect(plan.commands[4].command).toContain("--require-live true");
    expect(plan.commands[5].command).toContain("--planner-context-tokens 8192");
    expect(plan.commands[5].command).toContain("--planner-max-output-tokens 4096");
    expect(plan.commands[0].command).toContain("-GpuId 0");
    expect(plan.commands[0].command).toContain("-GpuLayers 999");
    expect(plan.commands[0].command).toContain("-Port 5013");
    expect(plan.commands[0].command).toContain("-ModelPath D:\\models\\gemma-4-31B-it-Q4_K_M.gguf");
    expect(plan.commands[6].command).toContain("-PlannerMaxTokens 4096");
    expect(plan.commands[6].command).toContain("-PlannerRequestTimeoutMs 1200000");
    expect(plan.commands[6].command).toContain("-PlannerGpuId 0");
    expect(plan.commands[6].command).toContain("-PlannerGpuLayers 999");
    expect(plan.commands[6].command).toContain("-ProductionPlannerModelPath D:\\models\\gemma-4-31B-it-Q4_K_M.gguf");
    expect(plan.commands[6].command).toContain("-Checkpoint flux-2-klein-4b.safetensors");
    expect(plan.commands[6].command).toContain("-Steps 4");
    expect(plan.commands[6].command).toContain("-Cfg 1");
    expect(plan.commands[6].command).toContain("-Sampler euler");
    expect(plan.commands[6].command).toContain("-Scheduler normal");
    expect(plan.commands[6].command).not.toContain("-AllowSmallPlanner");
    expect(plan.commands[8].command).toContain("production-text-manual-grade-checklist.mjs");
    expect(plan.commands[9].command).toContain("production-text-visual-qa-gate.mjs");
    expect(plan.commands[9].command).toContain("--input docs/evidence/generated-card-comparisons/production-text-workflow-20260626-production-planner");
    expect(plan.acceptanceChecks).toContain("planner preflight is production-ready");
    expect(plan.acceptanceChecks).toContain("planner runtime is hosted/self-hosted GPU capacity or local GPU-only fit is proven");
    expect(plan.acceptanceChecks).toContain("planner throughput probe completes the full JSON contract");
    expect(plan.acceptanceChecks).toContain("planner preflight matches benchmark runtime");
    expect(plan.acceptanceChecks).toContain("live ComfyUI proof is current");
    expect(plan.acceptanceChecks).toContain("final images came from Comfy text composer");
    expect(plan.acceptanceChecks).toContain("manual grade checklist is promotion-ready");
    expect(plan.acceptanceChecks).toContain("production visual QA gate is promotion-ready");
    expect(existsSync(join(outputDir, "production-text-rerun-plan.json"))).toBe(true);
    expect(existsSync(join(outputDir, "production-text-rerun-plan.md"))).toBe(true);
  });

  it("records exact local planner model paths for non-flat model directories", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-rerun-plan-model-path-"));
    const gatePath = join(root, "production-text-promotion-gate.json");
    const indexPath = join(root, "production-text-evidence-index.json");
    const outputDir = join(root, "rerun-plan");
    const modelPath = "D:\\models\\lmstudio-community\\Magistral-Small-2509-GGUF\\Magistral-Small-2509-Q4_K_M.gguf";

    writeJson(gatePath, {
      status: "blocked",
      promotionReady: false,
      requirements: [{ name: "LLM-planned customer request matrix completed", ok: false }]
    });
    writeJson(indexPath, {
      plannerPreflights: [],
      benchmarkSummaries: [],
      modelCoverageReports: [],
      aggregates: []
    });

    const plan = buildProductionTextRerunPlan({
      gate: gatePath,
      index: indexPath,
      "output-dir": outputDir,
      "planner-model": "koboldcpp/Magistral-Small-2509-Q4_K_M",
      "planner-model-path": modelPath,
      "gpu-id": 1
    });

    expect(plan.productionPlannerContract.requiredLocalGpu.gpuId).toBe(1);
    expect(plan.commands[0].command).toContain(`-ModelPath ${modelPath}`);
    expect(plan.commands[1].command).toContain(`--model-path ${modelPath}`);
    expect(plan.commands[1].command).toContain("--gpu-id 1");
    expect(plan.commands[6].command).toContain(`-ProductionPlannerModelPath ${modelPath}`);
    expect(plan.commands[6].command).toContain("-PlannerGpuId 1");
  });

  it("switches to a hosted planner path when local production candidates are GPU-blocked", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-rerun-plan-hosted-"));
    const gatePath = join(root, "production-text-promotion-gate.json");
    const indexPath = join(root, "production-text-evidence-index.json");
    const outputDir = join(root, "rerun-plan");

    writeJson(gatePath, {
      status: "blocked",
      promotionReady: false,
      requirements: [
        {
          name: "local planner GPU-only fit is proven",
          ok: false,
          details: {
            activeModel: "koboldcpp/Magistral-Small-2509-Q4_K_M"
          }
        },
        { name: "LLM-planned customer request matrix completed", ok: false }
      ]
    });
    writeJson(indexPath, {
      plannerPreflights: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-planner-preflight-current/production-text-planner-preflight.json",
          classification: "production-suitable",
          activeModel: "koboldcpp/Magistral-Small-2509-Q4_K_M",
          reportedContextTokens: 8192
        }
      ],
      plannerGpuFeasibilityReports: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-planner-gpu-feasibility-current/production-text-planner-gpu-feasibility.json",
          gpuOnlyReady: false,
          gpuOnlyCandidateIds: [],
          hardwareBlockedCandidateIds: ["gemma-4-31b-it", "magistral-small-2509", "deepseek-v4-flash"],
          blockers: [
            "Planner model alone is 13670 MiB, larger than assigned GPU capacity 8192 MiB."
          ]
        }
      ],
      benchmarkSummaries: [],
      modelCoverageReports: [
        {
          path: "docs/evidence/generated-card-comparisons/local-model-coverage-current/local-model-coverage.json",
          installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509", "deepseek-v4-flash"],
          unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509", "deepseek-v4-flash"],
          missingProductionPlanners: ["qwen3-14b-instruct"]
        }
      ],
      aggregates: []
    });

    const plan = buildProductionTextRerunPlan({
      gate: gatePath,
      index: indexPath,
      "output-dir": outputDir,
      date: "20260627"
    });

    expect(plan.productionPlannerContract.runtimeRecommendation).toMatchObject({
      mode: "hosted-required",
      localGpuRequired: false,
      hardwareBlockedCandidateIds: ["gemma-4-31b-it", "magistral-small-2509", "deepseek-v4-flash"]
    });
    expect(plan.currentEvidence).toMatchObject({
      gpuOnlyCandidateIds: [],
      hardwareBlockedCandidateIds: ["gemma-4-31b-it", "magistral-small-2509", "deepseek-v4-flash"]
    });
    expect(plan.commands.map((item) => item.title)).toEqual([
      "Configure hosted or self-hosted production planner",
      "Write planner preflight evidence",
      "Probe planner throughput",
      "Refresh live Comfy preflight",
      "Refresh readiness",
      "Run full production-text matrix",
      "Manually grade every run",
      "Write manual grade checklist",
      "Run production visual QA gate",
      "Aggregate production-text results",
      "Refresh tracked evidence index",
      "Run final promotion gate"
    ]);
    expect(plan.commands[0].command).toContain("CUSTOMCARD_LOCAL_LLM_BASE_URL");
    expect(plan.commands[0].why).toContain("hardware-blocked");
    expect(plan.commands[1].command).not.toContain("production-text-planner-gpu-feasibility.mjs");
    expect(plan.commands[5].command).toContain("-NoAutoStartPlanner");
    expect(plan.commands[5].command).toContain("-Checkpoint flux-2-klein-4b.safetensors");
    expect(plan.commands[5].command).toContain("-Steps 4");
    expect(plan.commands[5].command).toContain("-Cfg 1");
    expect(plan.commands[5].command).toContain("-Sampler euler");
    expect(plan.commands[5].command).toContain("-Scheduler normal");
    expect(plan.commands[5].command).not.toContain("-ProductionPlannerModelPath");
    expect(plan.commands[5].command).not.toContain("-PlannerGpuId");
    expect(plan.commands[5].command).not.toContain("-PlannerGpuLayers");
    expect(plan.acceptanceChecks).toContain("planner runtime is hosted/self-hosted GPU capacity or local GPU-only fit is proven");
  });
});
