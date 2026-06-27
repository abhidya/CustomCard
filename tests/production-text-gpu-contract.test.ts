import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectLocalKoboldGpuResidency } from "../scripts/local-kobold-gpu-residency.mjs";

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

  it("proves local Kobold residency only when the matching planner PID is in nvidia-smi", () => {
    const processes = [
      {
        pid: 111,
        name: "koboldcpp.exe",
        commandLine:
          '"D:\\models\\koboldcpp.exe" --model D:\\models\\gemma.gguf --port 5013 --usecuda 0 --maingpu 0 --gpulayers 999'
      },
      {
        pid: 222,
        name: "koboldcpp.exe",
        commandLine:
          '"D:\\models\\koboldcpp.exe" --model D:\\models\\qwen.gguf --port 5003 --usecuda 0 --maingpu 0 --gpulayers 999'
      }
    ];

    expect(inspectLocalKoboldGpuResidency("http://127.0.0.1:5013/v1", {
      processes,
      nvidiaProcessIds: [111]
    })).toMatchObject({
      required: true,
      ok: true,
      status: "gpu-backed",
      pids: [111]
    });

    expect(inspectLocalKoboldGpuResidency("http://127.0.0.1:5013/v1", {
      processes,
      nvidiaProcessIds: [222]
    })).toMatchObject({
      required: true,
      ok: false,
      status: "blocked"
    });
  });
});
