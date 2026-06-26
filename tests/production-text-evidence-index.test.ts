import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductionTextEvidenceIndex } from "../scripts/production-text-evidence-index.mjs";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("production text evidence index", () => {
  it("aggregates production-text evidence and keeps small planner runs blocked", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-evidence-index-"));
    const outputDir = join(root, "index");

    writeJson(join(root, "production-text-readiness.json"), {
      createdAtIso: "2026-06-26T05:00:00.000Z",
      status: "blocked",
      promotionReady: false,
      comfy: { reachable: true, hasTextComposer: true },
      activePlannerEndpoints: [
        {
          baseUrl: "http://127.0.0.1:5001/v1",
          reachable: true,
          activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          smallPlanner: true,
          productionSuitable: false
        }
      ],
      blockers: [{ name: "configured production planner endpoint is production-suitable" }]
    });
    writeJson(join(root, "production-text-planner-preflight.json"), {
      createdAtIso: "2026-06-26T05:05:00.000Z",
      status: "blocked",
      promotionReady: false,
      runAllowed: false,
      reachable: true,
      baseUrl: "http://127.0.0.1:5001/v1",
      activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
      classification: {
        classification: "smoke-only",
        smallPlanner: true,
        qualityPlanner: false,
        productionSuitable: false,
        minContextTokens: 8192,
        reportedContextTokens: 4096,
        minOutputTokens: 2200,
        maxOutputTokens: 3200
      },
      blockers: ["Planner model is smoke-only.", "Planner context 4096 is below the production minimum 8192."]
    });
    writeJson(join(root, "production-text-rerun-plan.json"), {
      createdAtIso: "2026-06-26T05:10:00.000Z",
      status: "rerun-required",
      promotionReady: false,
      currentEvidence: {
        plannerModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
        plannerClassification: "smoke-only"
      },
      failedRequirements: [
        { name: "planner preflight is production-ready" },
        { name: "manual aggregate is promotion-ready" }
      ],
      rerunPaths: {
        benchmarkOutput: "docs/evidence/generated-card-comparisons/production-text-workflow-20260626-production-planner"
      },
      commands: [{ step: 1 }, { step: 2 }]
    });
    writeJson(join(root, "production-text-preflight.json"), {
      createdAtIso: "2026-06-26T04:00:00.000Z",
      status: "promotion-ready",
      promotionReady: true,
      liveComfyReachable: true,
      liveNodeAvailable: true
    });
    writeJson(join(root, "production-text-manual-grade-checklist.json"), {
      createdAtIso: "2026-06-26T04:25:00.000Z",
      status: "blocked",
      promotionReady: false,
      benchmarkSummary: "docs/evidence/generated-card-comparisons/production-text-workflow-20260626-llm-planner-live-sdxl-turbo-cfg15/production-text-workflow-summary.json",
      summary: {
        totalRuns: 3,
        gradableRuns: 2,
        gradedGeneratedRuns: 2,
        gradedRuns: 3,
        missingGrades: 0,
        invalidGrades: 0,
        blockedGrades: 3,
        failedBeforeImageGeneration: 1
      },
      blockers: ["3 manual grade(s) are blocked or failed.", "1 run(s) failed before image generation."],
      nextSteps: ["Rerun failed stories only after the planner preflight proves a production-floor model and output budget."]
    });
    writeJson(join(root, "benchmark-aggregate.json"), {
      createdAtIso: "2026-06-26T04:30:00.000Z",
      totalRuns: 2,
      ranked: [
        {
          fixtureId: "aquarium-lover-birthday",
          status: "blocked",
          score: 38,
          textModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          manualVisualGrade: {
            score: 38,
            status: "blocked",
            passed: false,
            blockingFailures: ["Planner missed required recipient/name/theme terms."]
          }
        },
        {
          fixtureId: "koi-fish-lover-encouragement",
          status: "failed",
          score: 0,
          textModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          manualVisualGrade: {
            score: 0,
            status: "failed",
            passed: false,
            blockingFailures: ["Local Qwen3-4B planner returned invalid JSON."]
          }
        }
      ]
    });
    writeJson(join(root, "production-text-workflow-summary.json"), {
      createdAtIso: "2026-06-26T04:15:00.000Z",
      phase: "local-production-text",
      plannedRuns: [
        { storyId: "aquarium-lover-birthday", textModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S" },
        { storyId: "koi-fish-lover-encouragement", textModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S" }
      ],
      runs: [
        {
          storyId: "aquarium-lover-birthday",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          statusCode: 200,
          panelCount: 4,
          typographyModeId: "customcard-production-text-composer",
          autoChecks: {
            missingMustInclude: ["Nina", "aquarium"],
            checks: { finalImagesRenderedByComfy: true }
          }
        },
        {
          storyId: "koi-fish-lover-encouragement",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
          status: "failed",
          error: "invalid JSON"
        }
      ]
    });

    const ignoredByDefault = buildProductionTextEvidenceIndex({ input: root, "output-dir": join(root, "tracked-only") });
    expect(ignoredByDefault.readinessReports).toHaveLength(0);

    const report = buildProductionTextEvidenceIndex({
      input: root,
      "output-dir": outputDir,
      "include-untracked": true
    });

    expect(report.status).toBe("blocked");
    expect(report.promotionReady).toBe(false);
    expect(report.rerunPlans).toHaveLength(1);
    expect(report.plannerPreflights).toHaveLength(1);
    expect(report.readinessReports).toHaveLength(1);
    expect(report.manualGradeChecklists).toHaveLength(1);
    expect(report.plannerPreflights[0]).toMatchObject({
      activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
      classification: "smoke-only",
      promotionReady: false,
      reportedContextTokens: 4096
    });
    expect(report.rerunPlans[0]).toMatchObject({
      status: "rerun-required",
      failedRequirements: ["planner preflight is production-ready", "manual aggregate is promotion-ready"],
      commandCount: 2
    });
    expect(report.aggregates[0]).toMatchObject({
      totalRuns: 2,
      bestScore: 38,
      promotionReady: false
    });
    expect(report.manualGradeChecklists[0]).toMatchObject({
      totalRuns: 3,
      gradableRuns: 2,
      gradedGeneratedRuns: 2,
      gradedRuns: 3,
      failedBeforeImageGeneration: 1,
      promotionReady: false
    });
    expect(report.benchmarkSummaries[0]).toMatchObject({
      totalRuns: 2,
      completedRuns: 1,
      failedRuns: 1,
      smallPlannerUsed: true,
      missingMustInclude: ["Nina", "aquarium"]
    });
    expect(report.findings.join("\n")).toContain("known-small smoke model");
    expect(report.findings.join("\n")).toContain("Latest planner preflight is blocked");
    expect(report.findings.join("\n")).toContain("Latest manual grade checklist is blocked");
    expect(report.nextSteps.join("\n")).toContain("production-suitable planner endpoint");
    expect(report.nextSteps.join("\n")).toContain("planner preflight");
    expect(report.nextSteps.join("\n")).toContain("manual grade checklist blockers");
  });
});
