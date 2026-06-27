import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runProductionTextPromotionGate } from "../scripts/production-text-promotion-gate.mjs";

const fixtures = [
  "aquarium-lover-birthday",
  "koi-fish-lover-encouragement",
  "dog-lover-thank-you"
];

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeBaseEvidence(root: string, options: { ready: boolean }) {
  const textModel = options.ready ? "koboldcpp/gemma-4-31B-it-Q4_K_M" : "koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S";
  writeJson(join(root, "production-text-preflight.json"), {
    createdAtIso: "2026-06-26T04:00:00.000Z",
    status: "promotion-ready",
    promotionReady: true,
    liveComfyReachable: true,
    liveNodeAvailable: true
  });
  writeJson(join(root, "production-text-readiness.json"), {
    createdAtIso: "2026-06-26T05:00:00.000Z",
    status: options.ready ? "promotion-ready" : "blocked",
    promotionReady: options.ready,
    comfy: { reachable: true, hasTextComposer: true },
    activePlannerEndpoints: [
      {
        reachable: true,
        activeModel: textModel,
        smallPlanner: !options.ready,
        productionSuitable: options.ready
      }
    ],
    blockers: options.ready ? [] : [{ name: "configured production planner endpoint is production-suitable" }]
  });
  writeJson(join(root, "production-text-planner-preflight.json"), {
    createdAtIso: "2026-06-26T05:05:00.000Z",
    status: options.ready ? "promotion-ready" : "blocked",
    promotionReady: options.ready,
    runAllowed: options.ready,
    reachable: true,
    baseUrl: options.ready ? "http://127.0.0.1:5003/v1" : "http://127.0.0.1:5001/v1",
    activeModel: textModel,
    classification: {
      classification: options.ready ? "production-suitable" : "smoke-only",
      smallPlanner: !options.ready,
      qualityPlanner: options.ready,
      productionSuitable: options.ready,
      minContextTokens: 8192,
      reportedContextTokens: options.ready ? 8192 : 4096,
      minOutputTokens: 3200,
      maxOutputTokens: 3200
    },
    blockers: options.ready ? [] : ["Planner model is smoke-only."]
  });
  writeJson(join(root, "local-model-coverage.json"), {
    createdAtIso: "2026-06-26T05:07:00.000Z",
    status: "action-needed",
    installedModelFiles: 47,
    recommendedInstalled: 9,
    recommendedEvaluated: options.ready ? 4 : 3,
    recommendedMissing: 1,
    recommendedCoverage: [
      {
        id: "gemma-4-31b-it",
        role: "higher-quality local card-copy planner",
        installed: true,
        evaluated: options.ready
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
    ]
  });
  writeJson(join(root, "benchmark-aggregate.json"), {
    createdAtIso: "2026-06-26T04:30:00.000Z",
    totalRuns: fixtures.length,
    ranked: fixtures.map((fixtureId, index) => ({
      fixtureId,
      status: options.ready ? "pass" : index === 1 ? "failed" : "blocked",
      score: options.ready ? 91 - index : index === 1 ? 0 : 38,
      textModel,
      manualVisualGrade: {
        score: options.ready ? 91 - index : index === 1 ? 0 : 38,
        status: options.ready ? "pass" : index === 1 ? "failed" : "blocked",
        passed: options.ready,
        blockingFailures: options.ready ? [] : ["Planner/model evidence is not production-ready."]
      }
    }))
  });
  writeJson(join(root, "production-text-manual-grade-checklist.json"), {
    createdAtIso: "2026-06-26T04:32:00.000Z",
    status: options.ready ? "promotion-ready" : "blocked",
    promotionReady: options.ready,
    summary: {
      totalRuns: fixtures.length,
      gradableRuns: options.ready ? fixtures.length : 2,
      gradedGeneratedRuns: options.ready ? fixtures.length : 2,
      gradedRuns: fixtures.length,
      missingGrades: 0,
      invalidGrades: 0,
      blockedGrades: options.ready ? 0 : 3,
      failedBeforeImageGeneration: options.ready ? 0 : 1
    },
    blockers: options.ready ? [] : ["3 manual grade(s) are blocked or failed.", "1 run(s) failed before image generation."]
  });
  writeJson(join(root, "production-text-workflow-summary.json"), {
    createdAtIso: "2026-06-26T04:15:00.000Z",
    phase: "local-production-text",
    plannedRuns: fixtures.map((storyId) => ({ storyId, textModel })),
    runs: fixtures.map((storyId, index) => ({
      storyId,
      productionTextMode: "llm-generated-copy",
      textModel,
      statusCode: options.ready || index !== 1 ? 200 : undefined,
      status: options.ready || index !== 1 ? undefined : "failed",
      error: options.ready || index !== 1 ? undefined : "invalid JSON",
      panelCount: options.ready || index !== 1 ? 4 : undefined,
      typographyModeId: "customcard-production-text-composer",
      autoChecks: {
        missingMustInclude: options.ready ? [] : index === 0 ? ["Nina", "aquarium"] : [],
        avoidedFailures: [],
        checks: { finalImagesRenderedByComfy: true }
      }
    }))
  });
}

describe("production text promotion gate", () => {
  it("blocks small-planner and failed aggregate evidence", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-promotion-gate-blocked-"));
    writeBaseEvidence(root, { ready: false });

    const report = runProductionTextPromotionGate({
      input: root,
      "output-dir": join(root, "gate"),
      "include-untracked": true,
      advisory: true
    });

    expect(report.status).toBe("blocked");
    expect(report.promotionReady).toBe(false);
    expect(report.requirements.filter((item) => !item.ok).map((item) => item.name)).toEqual([
      "planner preflight is production-ready",
      "readiness doctor is promotion-ready",
      "production-suitable planner endpoint is reachable",
      "no small smoke planner is active or used",
      "LLM-planned customer request matrix completed",
      "planner preserved required terms and avoided forbidden terms",
      "manual grade checklist is promotion-ready",
      "manual aggregate is promotion-ready"
    ]);
    expect(report.requirements.find((item) => item.name === "local model coverage is tracked")?.ok).toBe(true);
    expect(report.requirements.find((item) => item.name === "production planner candidate is available")?.ok).toBe(true);
  });

  it("blocks stale live Comfy proof when newer readiness contradicts it", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-promotion-gate-stale-comfy-"));
    writeBaseEvidence(root, { ready: false });
    writeJson(join(root, "production-text-readiness.json"), {
      createdAtIso: "2026-06-26T06:00:00.000Z",
      status: "blocked",
      promotionReady: false,
      comfy: { reachable: false, hasTextComposer: false },
      activePlannerEndpoints: [],
      blockers: [
        { name: "live ComfyUI reachable" },
        { name: "live ComfyUI exposes CustomCardTextComposer" },
        { name: "configured production planner endpoint is reachable" }
      ]
    });

    const report = runProductionTextPromotionGate({
      input: root,
      "output-dir": join(root, "gate"),
      "include-untracked": true,
      advisory: true
    });

    const currentProof = report.requirements.find((item) => item.name === "live ComfyUI proof is current");
    expect(currentProof?.ok).toBe(false);
    expect(JSON.stringify(currentProof?.details)).toContain("newer readiness evidence");
    expect(report.nextSteps.join("\n")).toContain("Refresh live ComfyUI preflight");
  });

  it("passes only when planner, matrix, and manual aggregate evidence all pass", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-promotion-gate-ready-"));
    writeBaseEvidence(root, { ready: true });

    const report = runProductionTextPromotionGate({
      input: root,
      "output-dir": join(root, "gate"),
      "include-untracked": true
    });

    expect(report.status).toBe("promotion-ready");
    expect(report.promotionReady).toBe(true);
    expect(report.requirements.every((item) => item.ok)).toBe(true);
    expect(report.requirements.map((item) => item.name)).toContain("local model coverage is tracked");
    expect(report.requirements.map((item) => item.name)).toContain("production planner candidate is available");
    expect(report.requirements.map((item) => item.name)).toContain("manual grade checklist is promotion-ready");
  });

  it("blocks when planner preflight and benchmark runtime use different endpoints", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-promotion-gate-runtime-mismatch-"));
    writeBaseEvidence(root, { ready: true });
    const textModel = "koboldcpp/gemma-4-31B-it-Q4_K_M";
    writeJson(join(root, "production-text-workflow-summary.json"), {
      createdAtIso: "2026-06-26T04:15:00.000Z",
      phase: "local-production-text",
      envRouting: {
        productionTextPlannerRuntime: {
          baseUrl: "http://127.0.0.1:5013/v1",
          model: textModel
        }
      },
      plannedRuns: fixtures.map((storyId) => ({ storyId, textModel })),
      runs: fixtures.map((storyId) => ({
        storyId,
        productionTextMode: "llm-generated-copy",
        textModel,
        statusCode: 200,
        panelCount: 4,
        typographyModeId: "customcard-production-text-composer",
        autoChecks: {
          missingMustInclude: [],
          avoidedFailures: [],
          checks: { finalImagesRenderedByComfy: true }
        }
      }))
    });

    const report = runProductionTextPromotionGate({
      input: root,
      "output-dir": join(root, "gate"),
      "include-untracked": true,
      advisory: true
    });

    const alignment = report.requirements.find((item) => item.name === "planner preflight matches benchmark runtime");
    expect(report.status).toBe("blocked");
    expect(alignment?.ok).toBe(false);
    expect(JSON.stringify(alignment?.details)).toContain("5003");
    expect(JSON.stringify(alignment?.details)).toContain("5013");
    expect(report.nextSteps.join("\n")).toContain("exact endpoint/model used by the latest benchmark");
  });

  it("blocks final Comfy image proof when all benchmark runs fail before image generation", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-promotion-gate-no-generated-panels-"));
    writeBaseEvidence(root, { ready: true });
    const textModel = "koboldcpp/gemma-4-31B-it-Q4_K_M";
    writeJson(join(root, "production-text-workflow-summary.json"), {
      createdAtIso: "2026-06-26T04:15:00.000Z",
      phase: "local-production-text",
      envRouting: {
        productionTextPlannerRuntime: {
          baseUrl: "http://127.0.0.1:5003/v1",
          model: textModel
        }
      },
      plannedRuns: fixtures.map((storyId) => ({ storyId, textModel })),
      runs: fixtures.map((storyId) => ({
        storyId,
        productionTextMode: "llm-generated-copy",
        textModel,
        status: "failed",
        statusCode: 502,
        panelCount: 0,
        typographyModeId: "customcard-production-text-composer",
        providerFailures: { text: "read ECONNRESET" },
        autoChecks: {
          missingMustInclude: [],
          avoidedFailures: [],
          checks: { finalImagesRenderedByComfy: true }
        }
      }))
    });

    const report = runProductionTextPromotionGate({
      input: root,
      "output-dir": join(root, "gate"),
      "include-untracked": true,
      advisory: true
    });

    const finalImageProof = report.requirements.find((item) => item.name === "final images came from Comfy text composer");
    expect(report.status).toBe("blocked");
    expect(finalImageProof?.ok).toBe(false);
    expect(finalImageProof?.details).toMatchObject({
      completedRuns: 0,
      failedRuns: fixtures.length,
      failedBeforeImageGeneration: fixtures.length,
      finalImagesRenderedByComfy: false,
      deterministicTextComposerUsed: false
    });
  });
});
