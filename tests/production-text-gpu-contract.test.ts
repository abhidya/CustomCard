import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("production text GPU runtime contract", () => {
  it("requires nvidia-smi process evidence for local Kobold planners", () => {
    const benchmarkWrapper = readFileSync("tools/run-production-text-benchmark.ps1", "utf8");
    const plannerWrapper = readFileSync("tools/start-local-card-planner.ps1", "utf8");

    for (const source of [benchmarkWrapper, plannerWrapper]) {
      expect(source).toContain("Get-NvidiaSmiProcessIds");
      expect(source).toContain("--query-compute-apps=pid");
      expect(source).toContain("nvidia-smi");
      expect(source).toContain("GPU flags");
      expect(source).toContain("matching PID");
    }

    expect(benchmarkWrapper).toContain("Refusing to run production-text benchmark");
    expect(plannerWrapper).toContain("GPU planner:");
  });
});
