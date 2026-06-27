import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductionTextEvidenceIndex } from "../scripts/production-text-evidence-index.mjs";

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
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
        minOutputTokens: 3200,
        maxOutputTokens: 3200
      },
      blockers: ["Planner model is smoke-only.", "Planner context 4096 is below the production minimum 8192."]
    });
    writeJson(join(root, "production-text-planner-throughput.json"), {
      createdAtIso: "2026-06-26T05:06:00.000Z",
      status: "blocked",
      throughputReady: false,
      baseUrl: "http://127.0.0.1:5001/v1",
      model: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
      fixtureId: "aquarium-lover-birthday",
      requestTimeoutMs: 300000,
      reportedContextTokens: 4096,
      maxOutputTokens: 3200,
      durationMs: 300000,
      finishReason: "length",
      jsonParseOk: false,
      schemaOk: false,
      missingMustInclude: ["Nina", "birthday", "aquarium"],
      mustAvoidFailures: [],
      localGpuResidency: {
        required: true,
        ok: true,
        status: "gpu-backed",
        pids: [1234],
        nvidiaProcessIds: [1234]
      },
      blockers: ["Planner stopped with finish_reason=length before completing the full card-copy JSON."]
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
    writeJson(join(root, "local-model-coverage.json"), {
      createdAtIso: "2026-06-26T05:12:00.000Z",
      localModelRoot: "D:\\models",
      comfyModelsRoot: "D:\\ComfyUI\\models",
      totals: {
        installedModelFiles: 47,
        recommendedInstalled: 9,
        recommendedEvaluated: 3,
        recommendedMissing: 1
      },
      recommendedCoverage: [
        {
          id: "qwen3-4b-instruct",
          role: "fast local card-copy planner",
          installed: true,
          evaluated: true
        },
        {
          id: "gemma-4-31b-it",
          role: "higher-quality local card-copy planner",
          installed: true,
          evaluated: false
        },
        {
          id: "magistral-small-2509",
          role: "alternate local copy/planning family",
          installed: true,
          evaluated: false
        },
        {
          id: "qwen3-14b-instruct",
          role: "minimum local production-floor planner beneath Gemma 31B quality",
          installed: false,
          evaluated: false
        }
      ],
      pullQueue: [
        {
          id: "qwen3-14b-instruct",
          pull: "Qwen/Qwen3-14B-GGUF, Q4_K_M",
          nextAction: "Pull only if Gemma 31B is too slow."
        }
      ]
    });
    writeJson(join(root, "production-text-preflight.json"), {
      createdAtIso: "2026-06-26T04:00:00.000Z",
      status: "promotion-ready",
      promotionReady: true,
      liveComfyReachable: true,
      liveNodeAvailable: true
    });
    writeJson(join(root, "production-text-workflow-dry-run.json"), {
      createdAtIso: "2026-06-26T05:20:00.000Z",
      phase: "local-production-text",
      phaseDir: "production-text-workflow",
      dryRun: true,
      liveProviderCallsEnabled: false,
      productionTextPlannerRuntime: {
        model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
        contextTokens: 8192,
        maxOutputTokens: 3200,
        requestTimeoutMs: 1200000,
        classification: "production-suitable",
        productionSuitable: true,
        runAllowed: true,
        blockers: [],
        warnings: [],
        creativeContract: "full-production-card-copy-json"
      },
      plannedRuns: [
        {
          storyId: "aquarium-lover-birthday",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          imageModel: "sd_xl_turbo_1.0_fp16.safetensors"
        },
        {
          storyId: "koi-fish-lover-encouragement",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          imageModel: "sd_xl_turbo_1.0_fp16.safetensors"
        },
        {
          storyId: "dog-lover-thank-you",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          imageModel: "sd_xl_turbo_1.0_fp16.safetensors"
        }
      ]
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
      envRouting: {
        productionTextPlannerRuntime: {
          baseUrl: "http://127.0.0.1:5002/v1",
          model: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S"
        }
      },
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
          statusCode: 502,
          panelCount: 0,
          providerFailures: {
            text: "read ECONNRESET"
          }
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
    expect(report.plannerThroughputProbes).toHaveLength(1);
    expect(report.readinessReports).toHaveLength(1);
    expect(report.modelCoverageReports).toHaveLength(1);
    expect(report.dryRunReports).toHaveLength(1);
    expect(report.manualGradeChecklists).toHaveLength(1);
    expect(report.plannerPreflights[0]).toMatchObject({
      activeModel: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
      classification: "smoke-only",
      promotionReady: false,
      reportedContextTokens: 4096
    });
    expect(report.plannerThroughputProbes[0]).toMatchObject({
      status: "blocked",
      throughputReady: false,
      model: "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S",
      fixtureId: "aquarium-lover-birthday",
      finishReason: "length",
      gpuResidencyProven: true
    });
    expect(report.rerunPlans[0]).toMatchObject({
      status: "rerun-required",
      failedRequirements: ["planner preflight is production-ready", "manual aggregate is promotion-ready"],
      commandCount: 2
    });
    expect(report.modelCoverageReports[0]).toMatchObject({
      status: "action-needed",
      installedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      unevaluatedProductionPlanners: ["gemma-4-31b-it", "magistral-small-2509"],
      missingProductionPlanners: ["qwen3-14b-instruct"]
    });
    expect(report.dryRunReports[0]).toMatchObject({
      status: "planning-proof",
      promotionReady: false,
      plannedRunCount: 3,
      plannerModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
      plannerClassification: "production-suitable",
      contextTokens: 8192,
      maxOutputTokens: 3200,
      requestTimeoutMs: 1200000,
      creativeContract: "full-production-card-copy-json",
      storyIds: ["aquarium-lover-birthday", "koi-fish-lover-encouragement", "dog-lover-thank-you"]
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
      failedBeforeImageGeneration: 1,
      failedFixtures: ["koi-fish-lover-encouragement"],
      providerFailures: ["koi-fish-lover-encouragement: text provider read ECONNRESET"],
      plannerBaseUrls: ["http://127.0.0.1:5002/v1"],
      smallPlannerUsed: true,
      missingMustInclude: ["Nina", "aquarium"],
      finalImagesRenderedByComfy: true,
      deterministicTextComposerUsed: true
    });
    expect(report.plannerEvidenceAlignment).toMatchObject({
      checked: true,
      ok: false,
      preflight: {
        baseUrl: "http://127.0.0.1:5001/v1"
      },
      benchmark: {
        plannerBaseUrls: ["http://127.0.0.1:5002/v1"]
      }
    });
    expect(report.findings.join("\n")).toContain("preflight and benchmark runtime evidence do not align");
    expect(report.findings.join("\n")).toContain("known-small smoke model");
    expect(report.findings.join("\n")).toContain("Latest dry-run planning proof keeps the full production card-copy JSON contract");
    expect(report.findings.join("\n")).toContain("Latest planner preflight is blocked");
    expect(report.findings.join("\n")).toContain("Latest planner throughput probe is blocked");
    expect(report.findings.join("\n")).toContain("Installed production planner candidates found locally");
    expect(report.findings.join("\n")).toContain("Installed production planner candidates still need local production-text evaluation");
    expect(report.findings.join("\n")).toContain("Latest manual grade checklist is blocked");
    expect(report.findings.join("\n")).toContain("failed runtime run");
    expect(report.findings.join("\n")).toContain("read ECONNRESET");
    expect(report.nextSteps.join("\n")).toContain("production-suitable planner endpoint");
    expect(report.nextSteps.join("\n")).toContain("installed production planner candidate");
    expect(report.nextSteps.join("\n")).toContain("local model pull queue");
    expect(report.nextSteps.join("\n")).toContain("planner preflight");
    expect(report.nextSteps.join("\n")).toContain("planner throughput probe");
    expect(report.nextSteps.join("\n")).toContain("exact endpoint/model used by the latest benchmark");
    expect(report.nextSteps.join("\n")).toContain("manual grade checklist blockers");
  });

  it("does not credit Comfy final images when every benchmark run fails before image generation", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-evidence-index-all-failed-"));
    const outputDir = join(root, "index");

    writeJson(join(root, "production-text-workflow-summary.json"), {
      createdAtIso: "2026-06-26T04:15:00.000Z",
      phase: "local-production-text",
      plannedRuns: [
        { storyId: "aquarium-lover-birthday", textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M" },
        { storyId: "koi-fish-lover-encouragement", textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M" }
      ],
      runs: [
        {
          storyId: "aquarium-lover-birthday",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          status: "failed",
          statusCode: 502,
          panelCount: 0,
          typographyModeId: "customcard-production-text-composer",
          providerFailures: { text: "read ECONNRESET" },
          autoChecks: { checks: { finalImagesRenderedByComfy: true } }
        },
        {
          storyId: "koi-fish-lover-encouragement",
          productionTextMode: "llm-generated-copy",
          textModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          status: "failed",
          statusCode: 502,
          panelCount: 0,
          typographyModeId: "customcard-production-text-composer",
          providerFailures: { text: "HTTP 502" },
          autoChecks: { checks: { finalImagesRenderedByComfy: true } }
        }
      ]
    });

    const report = buildProductionTextEvidenceIndex({
      input: root,
      "output-dir": outputDir,
      "include-untracked": true
    });

    expect(report.benchmarkSummaries[0]).toMatchObject({
      totalRuns: 2,
      completedRuns: 0,
      failedRuns: 2,
      failedBeforeImageGeneration: 2,
      finalImagesRenderedByComfy: false,
      deterministicTextComposerUsed: false
    });
  });

  it("treats production-suitable local-production-text aggregates as LLM-planned evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-evidence-index-production-aggregate-"));
    const outputDir = join(root, "index");

    writeJson(join(root, "old-small", "benchmark-aggregate.json"), {
      createdAtIso: "2026-06-26T04:30:00.000Z",
      totalRuns: 3,
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
            blockingFailures: ["Small planner evidence is smoke-only."]
          }
        }
      ]
    });
    writeJson(join(root, "new-gpu-production", "benchmark-aggregate.json"), {
      createdAtIso: "2026-06-27T04:30:00.000Z",
      phaseFilter: ["local-production-text"],
      totalRuns: 3,
      ranked: [
        {
          fixtureId: "dog-lover-thank-you",
          phase: "local-production-text",
          status: "failed",
          score: 73,
          textModel: "koboldcpp/Magistral-Small-2509-Q4_K_M",
          manualVisualGrade: {
            score: 73,
            status: "failed",
            passed: false,
            blockingFailures: ["Planner timed out before image generation."]
          }
        }
      ]
    });

    const report = buildProductionTextEvidenceIndex({
      input: root,
      "output-dir": outputDir,
      "include-untracked": true
    });

    expect(report.aggregates[0]).toMatchObject({
      kind: "llm-planned",
      phases: ["local-production-text"],
      textModels: ["koboldcpp/Magistral-Small-2509-Q4_K_M"]
    });
    expect(report.latest.aggregate).toContain("new-gpu-production");
    expect(report.findings.join("\n")).toContain("best score 73");
  });

  it("treats legacy aggregate-only readiness blockers as non-runtime evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-evidence-index-readiness-runtime-"));
    const outputDir = join(root, "index");

    writeJson(join(root, "production-text-readiness.json"), {
      createdAtIso: "2026-06-26T05:00:00.000Z",
      status: "blocked",
      promotionReady: false,
      comfy: { reachable: true, hasTextComposer: true },
      activePlannerEndpoints: [
        {
          baseUrl: "http://127.0.0.1:5013/v1",
          reachable: true,
          activeModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          smallPlanner: false,
          productionSuitable: true
        }
      ],
      blockers: [{ name: "latest LLM-planned aggregate is passing" }],
      aggregateSummary: { promotionReady: false }
    });

    const report = buildProductionTextEvidenceIndex({
      input: root,
      "output-dir": outputDir,
      "include-untracked": true
    });

    expect(report.readinessReports[0]).toMatchObject({
      status: "promotion-ready",
      promotionReady: true,
      aggregatePromotionReady: false,
      blockerCount: 0,
      blockers: [],
      aggregateCheckBlockers: ["latest LLM-planned aggregate is passing"],
      productionSuitablePlannerReachable: true
    });
  });
});
