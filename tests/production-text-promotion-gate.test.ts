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
      minOutputTokens: 2200,
      maxOutputTokens: 3200
    },
    blockers: options.ready ? [] : ["Planner model is smoke-only."]
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
      "manual aggregate is promotion-ready"
    ]);
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
  });
});
