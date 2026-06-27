import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDoctor } from "../scripts/production-text-readiness-doctor.mjs";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writePassingAggregate(path: string) {
  writeJson(path, {
    totalRuns: 3,
    ranked: ["aquarium-lover-birthday", "koi-fish-lover-encouragement", "dog-lover-thank-you"].map((fixtureId, index) => ({
      fixtureId,
      status: "pass",
      score: 92 - index,
      manualVisualGrade: {
        passed: true,
        blockingFailures: []
      }
    }))
  });
}

describe("production text readiness doctor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not treat a model name as production-ready without reported runtime budget", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-readiness-doctor-"));
    const modelRoot = join(root, "models");
    mkdirSync(modelRoot, { recursive: true });
    writeFileSync(join(modelRoot, "gemma-4-31B-it-Q4_K_M.gguf"), "fake model marker");
    const aggregatePath = join(root, "benchmark-aggregate.json");
    writePassingAggregate(aggregatePath);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const target = String(url);
      if (target.endsWith("/object_info")) {
        return new Response(JSON.stringify({ CustomCardTextComposer: {} }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (target.endsWith("/models")) {
        return new Response(JSON.stringify({ data: [{ id: "koboldcpp/gemma-4-31B-it-Q4_K_M" }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("not found", { status: 404 });
    });

    const report = await runDoctor({
      advisory: true,
      aggregate: aggregatePath,
      "model-root": modelRoot,
      "local-llm-base-url": "http://127.0.0.1:5003/v1",
      "output-dir": join(root, "readiness")
    });

    expect(report.promotionReady).toBe(false);
    expect(report.activePlannerEndpoints[0]).toMatchObject({
      activeModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
      productionSuitable: false
    });
    expect(report.activePlannerEndpoints[0].plannerPolicy.blockers.join("\n")).toContain("context was not reported");
    expect(report.blockers.map((item) => item.name)).toContain("configured production planner endpoint is production-suitable");
  });
});
