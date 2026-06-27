import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildProductionTextVisualQaGate } from "../scripts/production-text-visual-qa-gate.mjs";

const fixtures = [
  "aquarium-lover-birthday",
  "koi-fish-lover-encouragement",
  "dog-lover-thank-you"
];

const passingQa = {
  allPanelsRendered: true,
  textMissing: false,
  textOverflow: false,
  fakeTextOrGlyphsInArtwork: false,
  mockupOrObjectSceneLeakage: false,
  lowContrast: false,
  peopleHandsOrFaces: false
};

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function makeRun(root: string, storyId: string) {
  const runDir = join(root, "production-text-workflow", storyId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "contact-sheet.png"), "fake image marker");
  return runDir;
}

function writeGrade(runDir: string, value: Record<string, unknown>) {
  writeJson(join(runDir, "manual-visual-grade.json"), {
    score: 90,
    status: "pass",
    passed: true,
    productionRecommendation: "promote",
    blockingFailures: [],
    ...value
  });
}

describe("production text visual QA gate", () => {
  it("blocks generated runs with missing or failing structured productionTextQa", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-visual-qa-blocked-"));
    const aquariumDir = makeRun(root, "aquarium-lover-birthday");
    const koiDir = makeRun(root, "koi-fish-lover-encouragement");
    const dogDir = makeRun(root, "dog-lover-thank-you");
    writeGrade(aquariumDir, {});
    writeGrade(koiDir, {
      productionTextQa: {
        ...passingQa,
        lowContrast: true
      }
    });

    const summaryPath = join(root, "production-text-workflow-summary.json");
    writeJson(summaryPath, {
      phase: "local-production-text",
      phaseDir: "production-text-workflow",
      runs: [
        productionRun("aquarium-lover-birthday", aquariumDir),
        productionRun("koi-fish-lover-encouragement", koiDir),
        {
          ...productionRun("dog-lover-thank-you", dogDir),
          status: "failed",
          statusCode: 502,
          panelCount: 0,
          contactSheet: undefined,
          providerFailures: { text: "timeout" }
        }
      ]
    });

    const report = buildProductionTextVisualQaGate({
      summary: summaryPath,
      "output-dir": join(root, "visual-qa")
    });

    expect(report.status).toBe("blocked");
    expect(report.promotionReady).toBe(false);
    expect(report.summary).toMatchObject({
      totalRuns: 3,
      requiredPassingFixtures: 0,
      failedBeforeImageGeneration: 1,
      missingStructuredQa: 1,
      failingQaRuns: 1
    });
    expect(report.blockers.join("\n")).toContain("missing structured productionTextQa");
    expect(report.blockers.join("\n")).toContain("text contrast meets print threshold failed");
    expect(report.blockers.join("\n")).toContain("failed before image generation");
    expect(report.runs.find((run) => run.storyId === "aquarium-lover-birthday")?.qaFailures).toContain(
      "structured productionTextQa is missing from manual-visual-grade.json"
    );
  });

  it("passes only when every required fixture has generated panels and passing structured QA", () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-visual-qa-ready-"));
    const runs = fixtures.map((fixture) => {
      const runDir = makeRun(root, fixture);
      writeGrade(runDir, { productionTextQa: passingQa });
      return productionRun(fixture, runDir);
    });
    const summaryPath = join(root, "production-text-workflow-summary.json");
    writeJson(summaryPath, {
      phase: "local-production-text",
      phaseDir: "production-text-workflow",
      runs
    });

    const report = buildProductionTextVisualQaGate({
      input: summaryPath,
      "output-dir": join(root, "visual-qa")
    });

    expect(report.status).toBe("promotion-ready");
    expect(report.promotionReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.summary).toMatchObject({
      requiredPassingFixtures: 3,
      qaExpectedRuns: 3,
      qaCheckedRuns: 3,
      qaPassingRuns: 3,
      missingStructuredQa: 0
    });
    expect(report.runs.every((run) => run.qaPassed)).toBe(true);
  });
});

function productionRun(storyId: string, runDir: string) {
  return {
    storyId,
    productionTextMode: "llm-generated-copy",
    textModel: "hosted/production-planner",
    imageModel: "sd_xl_turbo_1.0_fp16.safetensors",
    statusCode: 200,
    panelCount: 4,
    runDir,
    contactSheet: join(runDir, "contact-sheet.png"),
    typographyModeId: "customcard-production-text-composer",
    autoChecks: {
      missingMustInclude: [],
      avoidedFailures: [],
      checks: {
        finalImagesRenderedByComfy: true
      }
    }
  };
}
