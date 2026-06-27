import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runProductionTextPlannerGpuFeasibility } from "../scripts/production-text-planner-gpu-feasibility.mjs";

const eightGbGpu = {
  index: 1,
  name: "NVIDIA GeForce GTX 1080",
  memoryTotalMiB: 8192,
  memoryUsedMiB: 2048,
  utilizationGpuPercent: 12
};

function inventoryFile(path: string, sizeMiB: number) {
  return {
    path,
    name: path.split("\\").pop() || path,
    normalizedName: path.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    sizeBytes: sizeMiB * 1024 * 1024,
    sizeMiB,
    sizeGiB: Number((sizeMiB / 1024).toFixed(2))
  };
}

describe("production text planner GPU feasibility", () => {
  it("blocks GPU-backed Kobold when the model cannot fully fit the assigned GPU", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "planner-gpu-feasibility-blocked-"));
    const modelPath = "D:\\models\\lmstudio-community\\Magistral-Small-2509-GGUF\\Magistral-Small-2509-Q4_K_M.gguf";

    const report = runProductionTextPlannerGpuFeasibility(
      {
        "base-url": "http://127.0.0.1:5013/v1",
        model: "koboldcpp/Magistral-Small-2509-Q4_K_M",
        "output-dir": outputDir
      },
      {
        gpus: [eightGbGpu],
        nvidiaProcessIds: [46488],
        processes: [
          {
            pid: 46488,
            commandLine: `"D:\\models\\koboldcpp.exe" --model ${modelPath} --port 5013 --usecuda 1 --maingpu 1 --gpulayers 999`,
            modelPath,
            port: 5013,
            usecuda: 1,
            maingpu: 1,
            gpulayers: 999
          }
        ],
        inventory: [
          inventoryFile(modelPath, 13670),
          inventoryFile("D:\\models\\lmstudio-community\\Magistral-Small-2509-GGUF\\mmproj-Magistral-Small-2509-F16.gguf", 838),
          inventoryFile("D:\\models\\DeepSeekV4-Flash-158B-Q4_K_M.gguf", 14264)
        ]
      }
    );

    expect(report.status).toBe("blocked");
    expect(report.gpuOnlyReady).toBe(false);
    expect(report.activePlanner.gpuPidListed).toBe(true);
    expect(report.activePlanner.gpuFit.assignedGpuModelFits).toBe(false);
    expect(report.blockers.join("\n")).toContain("partial CPU offload");
    expect(report.hardwareBlockedCandidateIds).toContain("magistral-small-2509");
    expect(report.hardwareBlockedCandidateIds).toContain("deepseek-v4-flash");
    expect(report.gpuOnlyCandidateIds).not.toContain("magistral-small-2509");
  });

  it("passes when the active model fits the assigned GPU and the PID is GPU resident", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "planner-gpu-feasibility-ready-"));
    const modelPath = "D:\\models\\Qwen3-14B-Q4_K_M.gguf";

    const report = runProductionTextPlannerGpuFeasibility(
      {
        "base-url": "http://127.0.0.1:5014/v1",
        model: "koboldcpp/Qwen3-14B-Q4_K_M",
        "output-dir": outputDir,
        "overhead-mib": "512"
      },
      {
        gpus: [{ ...eightGbGpu, index: 0, memoryTotalMiB: 16384, memoryUsedMiB: 1024 }],
        nvidiaProcessIds: [1111],
        processes: [
          {
            pid: 1111,
            commandLine: `"D:\\models\\koboldcpp.exe" --model ${modelPath} --port 5014 --usecuda 0 --maingpu 0 --gpulayers 999`,
            modelPath,
            port: 5014,
            usecuda: 0,
            maingpu: 0,
            gpulayers: 999
          }
        ],
        inventory: [inventoryFile(modelPath, 7000)]
      }
    );

    expect(report.status).toBe("gpu-only-ready");
    expect(report.gpuOnlyReady).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.activePlanner.gpuFit.assignedGpuEstimatedFits).toBe(true);
    expect(report.nextSteps.join("\n")).toContain("throughput probe");
  });
});
