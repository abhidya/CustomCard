import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductionTextResearchRollup } from "../scripts/production-text-research-rollup.mjs";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("production text research rollup", () => {
  it("aggregates index, gate, and rerun plan into a reproducible research snapshot", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-research-rollup-"));
    const indexPath = join(root, "production-text-evidence-index.json");
    const gatePath = join(root, "production-text-promotion-gate.json");
    const rerunPath = join(root, "production-text-rerun-plan.json");
    const outputDir = join(root, "rollup");

    writeJson(indexPath, {
      createdAtIso: "2026-06-26T05:30:00.000Z",
      status: "blocked",
      promotionReady: false,
      latest: {
        plannerPreflight: "docs/evidence/generated-card-comparisons/production-text-planner-preflight-current/production-text-planner-preflight.json",
        manualGradeChecklist: "docs/evidence/generated-card-comparisons/production-text-manual-grade-current/production-text-manual-grade-checklist.json"
      },
      findings: [
        "Latest planner preflight is blocked: smoke-only model koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S.",
        "Latest aggregate is blocked: best score 38 across 3 run(s)."
      ],
      nextSteps: ["Run production-text planner preflight with a production-suitable model."],
      preflights: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-preflight-current/production-text-preflight.json",
          status: "promotion-ready",
          promotionReady: true,
          liveComfyReachable: true,
          liveNodeAvailable: true
        }
      ],
      plannerPreflights: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-planner-preflight-current/production-text-planner-preflight.json",
          status: "blocked",
          promotionReady: false,
          reachable: false,
          activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          classification: "smoke-only",
          reportedContextTokens: 4096,
          maxOutputTokens: 3200,
          blockers: ["Planner context 4096 is below the production minimum 8192."]
        }
      ],
      readinessReports: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-readiness-current/production-text-readiness.json",
          status: "blocked",
          promotionReady: false,
          productionSuitablePlannerReachable: false,
          comfyReachable: false,
          hasTextComposer: false,
          blockers: ["configured production planner endpoint is reachable"]
        }
      ],
      modelCoverageReports: [
        {
          path: "docs/evidence/generated-card-comparisons/local-model-coverage-current/local-model-coverage.json",
          status: "action-needed",
          installedModelFiles: 47,
          recommendedInstalled: 9,
          recommendedEvaluated: 3,
          recommendedMissing: 1,
          installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
          evaluatedProductionPlanners: [],
          unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
          missingProductionPlanners: ["qwen3-14b-instruct"],
          pullQueue: [{ id: "qwen3-14b-instruct" }]
        }
      ],
      benchmarkSummaries: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-workflow-current/production-text-workflow-summary.json",
          totalRuns: 3,
          completedRuns: 2,
          failedRuns: 1,
          fixtures: ["aquarium-lover-birthday", "koi-fish-lover-encouragement", "dog-lover-thank-you"],
          smallPlannerUsed: true,
          missingMustInclude: ["Nina", "aquarium", "Morgan", "dog"],
          mustAvoidFailures: ["mockup"],
          finalImagesRenderedByComfy: true,
          deterministicTextComposerUsed: true
        }
      ],
      manualGradeChecklists: [
        {
          path: "docs/evidence/generated-card-comparisons/production-text-manual-grade-current/production-text-manual-grade-checklist.json",
          status: "blocked",
          promotionReady: false,
          gradedGeneratedRuns: 2,
          gradableRuns: 2,
          failedBeforeImageGeneration: 1,
          blockedGrades: 3,
          blockers: ["3 manual grade(s) are blocked or failed."]
        }
      ],
      aggregates: [
        {
          path: "docs/evidence/generated-card-comparisons/benchmark-aggregate-current/benchmark-aggregate.json",
          kind: "llm-planned",
          promotionReady: false,
          totalRuns: 3,
          bestScore: 38,
          bestRun: "aquarium-lover-birthday",
          statuses: { blocked: 2, failed: 1 },
          textModels: ["koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"],
          blockingFailures: ["Local Qwen3-4B planner returned invalid JSON."]
        }
      ]
    });
    writeJson(gatePath, {
      status: "blocked",
      promotionReady: false,
      requirements: [
        { name: "live ComfyUI preflight passed", ok: true },
        { name: "planner preflight is production-ready", ok: false },
        { name: "manual grade checklist is promotion-ready", ok: false }
      ],
      nextSteps: ["Use Qwen3-4B/8B only for smoke/failure evidence."]
    });
    writeJson(rerunPath, {
      status: "rerun-required",
      currentEvidence: {
        plannerModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
        plannerClassification: "smoke-only"
      },
      productionPlannerContract: {
        summary: "Keep the full creative planner prompt and switch the runtime, not the prompt quality.",
        minimumOpenWeightPlannerClass: "14B+ dense/open-weight planner or stronger hosted model",
        disallowedForPromotion: [
          "Reduced creative prompt contracts used only to fit small local models"
        ]
      },
      commands: [
        {
          step: 1,
          title: "Start or configure production planner",
          command: "rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/start-local-card-planner.ps1 -ModelPath D:\\models\\gemma-4-31B-it-Q4_K_M.gguf -Port 5003 -ContextSize 8192",
          why: "Use the correct planner runtime."
        },
        {
          step: 2,
          title: "Write planner preflight evidence",
          command: "rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File tools/node.ps1 scripts/production-text-planner-preflight.mjs --base-url http://127.0.0.1:5003/v1 --model koboldcpp/gemma-4-31B-it-Q4_K_M --reported-context-tokens 8192 --max-output-tokens 3200",
          why: "Proves the loaded model and budget."
        }
      ]
    });

    const report = buildProductionTextResearchRollup({
      index: indexPath,
      gate: gatePath,
      rerun: rerunPath,
      "output-dir": outputDir,
      date: "20260626"
    });

    expect(report.status).toBe("blocked");
    expect(report.promotionReady).toBe(false);
    expect(report.promotionGate.failedRequirements.map((item) => item.name)).toEqual([
      "planner preflight is production-ready",
      "manual grade checklist is promotion-ready"
    ]);
    expect(report.evidenceSummary.planner).toMatchObject({
      activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
      classification: "smoke-only",
      reportedContextTokens: 4096
    });
    expect(report.evidenceSummary.manualGrades).toMatchObject({
      gradedGeneratedRuns: 2,
      gradableRuns: 2,
      failedBeforeImageGeneration: 1,
      blockedGrades: 3
    });
    expect(report.evidenceSummary.modelCoverage).toMatchObject({
      status: "action-needed",
      installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      missingProductionPlanners: ["qwen3-14b-instruct"]
    });
    expect(report.findings.join("\n")).toContain("known-small planner");
    expect(report.findings.join("\n")).toContain("switch the runtime, not the prompt quality");
    expect(report.findings.join("\n")).toContain("Reduced creative prompt contracts are disallowed");
    expect(report.findings.join("\n")).toContain("Production planner files are installed but not yet evaluated");
    expect(report.findings.join("\n")).toContain("Optional production planner pull queue remains");
    expect(report.findings.join("\n")).toContain("Promotion gate currently fails 2 requirement");
    expect(report.nextSteps).toEqual(
      expect.arrayContaining([
        "Run production-text planner preflight with a production-suitable model.",
        "Use Qwen3-4B/8B only for smoke/failure evidence."
      ])
    );
    expect(report.nextCommands.map((item) => item.title)).toEqual([
      "Start or configure production planner",
      "Write planner preflight evidence"
    ]);
    expect(existsSync(join(outputDir, "production-text-research-rollup.json"))).toBe(true);
    expect(existsSync(join(outputDir, "production-text-research-rollup.md"))).toBe(true);
  });
});
