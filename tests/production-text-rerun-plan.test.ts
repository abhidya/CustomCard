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
    expect(plan.productionPlannerContract.minimumOpenWeightPlannerClass).toContain("14B+");
    expect(plan.productionPlannerContract.disallowedForPromotion.join("\n")).toContain("Qwen3-4B");
    expect(plan.productionPlannerContract.disallowedForPromotion.join("\n")).toContain("8B");
    expect(plan.currentEvidence).toMatchObject({
      localModelCoverage: "docs/evidence/generated-card-comparisons/local-model-coverage-20260626-current/local-model-coverage.json",
      installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      missingProductionPlanners: ["qwen3-14b-instruct"]
    });
    expect(plan.commands.map((item) => item.title)).toEqual([
      "Start or configure production planner",
      "Write planner preflight evidence",
      "Refresh live Comfy preflight",
      "Refresh readiness",
      "Run full production-text matrix",
      "Manually grade every run",
      "Write manual grade checklist",
      "Aggregate production-text results",
      "Refresh tracked evidence index",
      "Run final promotion gate"
    ]);
    expect(plan.commands[2].command).toContain("comfyui-production-text-preflight.mjs");
    expect(plan.commands[2].command).toContain("--require-live true");
    expect(plan.commands[4].command).toContain("-PlannerMaxTokens 3200");
    expect(plan.commands[4].command).not.toContain("-AllowSmallPlanner");
    expect(plan.commands[6].command).toContain("production-text-manual-grade-checklist.mjs");
    expect(plan.acceptanceChecks).toContain("planner preflight is production-ready");
    expect(plan.acceptanceChecks).toContain("live ComfyUI proof is current");
    expect(plan.acceptanceChecks).toContain("manual grade checklist is promotion-ready");
    expect(existsSync(join(outputDir, "production-text-rerun-plan.json"))).toBe(true);
    expect(existsSync(join(outputDir, "production-text-rerun-plan.md"))).toBe(true);
  });
});
