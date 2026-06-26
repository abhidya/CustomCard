import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductionTextManualGradeChecklist } from "../scripts/production-text-manual-grade-checklist.mjs";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRunDir(root: string, name: string) {
  const runDir = join(root, "production-text-workflow", name);
  mkdirSync(runDir, { recursive: true });
  return runDir;
}

describe("production text manual grade checklist", () => {
  it("summarizes passing, missing, and failed-before-image-generation grades", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-manual-grades-"));
    const passDir = makeRunDir(root, "aquarium");
    const missingDir = makeRunDir(root, "dog");
    const failedDir = makeRunDir(root, "koi");
    writeFileSync(join(passDir, "manual-grade-template.md"), "# grade\n");
    writeFileSync(join(missingDir, "manual-grade-template.md"), "# grade\n");
    writeJson(join(passDir, "manual-visual-grade.json"), {
      totalScore: 94,
      productScore: 94,
      contractScore: 96,
      status: "pass",
      passed: true,
      productionRecommendation: "promote",
      blockingFailures: []
    });
    writeJson(join(failedDir, "manual-visual-grade.json"), {
      totalScore: 0,
      status: "failed",
      passed: false,
      productionRecommendation: "do-not-promote",
      blockingFailures: ["Planner returned invalid JSON."]
    });
    const summaryPath = join(root, "production-text-workflow-summary.json");
    writeJson(summaryPath, {
      phase: "local-production-text",
      phaseDir: "production-text-workflow",
      createdAtIso: "2026-06-26T04:21:27.749Z",
      runs: [
        { storyId: "aquarium-lover-birthday", runDir: passDir, statusCode: 200, panelCount: 4, contactSheet: join(passDir, "contact-sheet.png") },
        { storyId: "dog-lover-thank-you", runDir: missingDir, statusCode: 200, panelCount: 4, contactSheet: join(missingDir, "contact-sheet.png") },
        { storyId: "koi-fish-lover-encouragement", runDir: failedDir, status: "failed", error: "invalid JSON", providerCallCount: 1 }
      ]
    });

    const report = buildProductionTextManualGradeChecklist({
      summary: summaryPath,
      "output-dir": join(root, "manual-grade-checklist")
    });

    expect(report.status).toBe("blocked");
    expect(report.promotionReady).toBe(false);
    expect(report.summary).toMatchObject({
      totalRuns: 3,
      gradableRuns: 2,
      gradedGeneratedRuns: 1,
      gradedRuns: 2,
      missingGrades: 1,
      failedBeforeImageGeneration: 1,
      passingGrades: 1,
      blockedGrades: 1
    });
    expect(report.blockers.join("\n")).toContain("missing manual-visual-grade.json");
    expect(report.blockers.join("\n")).toContain("failed before image generation");
    expect(report.runs.find((run) => run.storyId === "koi-fish-lover-encouragement")?.gradeExpected).toBe(false);
  });

  it("is promotion-ready only when every generated run has a valid passing grade", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-manual-grades-ready-"));
    const runDir = makeRunDir(root, "dog");
    writeJson(join(runDir, "manual-visual-grade.json"), {
      score: 91,
      status: "pass",
      passed: true,
      productionRecommendation: "promote",
      blockingFailures: []
    });
    const summaryPath = join(root, "production-text-workflow-summary.json");
    writeJson(summaryPath, {
      phase: "local-production-text",
      phaseDir: "production-text-workflow",
      runs: [
        { storyId: "dog-lover-thank-you", runDir, statusCode: 200, panelCount: 4, contactSheet: join(runDir, "contact-sheet.png") }
      ]
    });

    const report = buildProductionTextManualGradeChecklist({
      input: summaryPath,
      "output-dir": join(root, "manual-grade-checklist")
    });

    expect(report.status).toBe("promotion-ready");
    expect(report.promotionReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.summary.validGrades).toBe(1);
    expect(report.summary.gradedGeneratedRuns).toBe(1);
  });
});
