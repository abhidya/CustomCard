import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runSmoke } from "../scripts/comfyui-multigpu-smoke.mjs";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("ComfyUI MultiGPU smoke proof", () => {
  it("requires telemetry for both configured GPUs when requested", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "customcard-comfy-smoke-"));
    tempDirs.push(tempDir);
    const workflowPath = join(tempDir, "workflow.json");
    const outputDir = join(tempDir, "out");
    writeFileSync(
      workflowPath,
      JSON.stringify({
        "1": {
          class_type: "CheckpointLoaderSimpleDisTorch2MultiGPU",
          inputs: {
            ckpt_name: "{{checkpoint}}",
            compute_device: "cuda:0",
            donor_device: "cuda:1",
            virtual_vram_gb: 4
          }
        },
        "2": { class_type: "SaveImage", inputs: { images: ["1", 0] } }
      })
    );

    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith("/prompt")) {
        const body = JSON.parse(String(init?.body));
        expect(body.prompt["1"].inputs.compute_device).toBe("cuda:0");
        expect(body.prompt["1"].inputs.donor_device).toBe("cuda:1");
        return jsonResponse({ prompt_id: "multigpu-proof" });
      }
      if (requestUrl.endsWith("/history/multigpu-proof")) {
        return jsonResponse({
          "multigpu-proof": {
            status: { completed: true },
            outputs: {
              "2": { images: [{ filename: "proof.png", subfolder: "", type: "output" }] }
            }
          }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const readGpuTelemetry = vi.fn(async () => ({
      status: "ready",
      gpus: [
        {
          index: 0,
          uuid: "GPU-0",
          name: "GTX 1080 Ti",
          utilizationGpuPercent: 64,
          memoryUsedMiB: 2048,
          memoryTotalMiB: 11264,
          computeApps: [{ pid: 1234, processName: "python.exe", usedMemoryMiB: 2048 }]
        },
        {
          index: 1,
          uuid: "GPU-1",
          name: "GTX 1080",
          utilizationGpuPercent: 14,
          memoryUsedMiB: 768,
          memoryTotalMiB: 8192,
          computeApps: [{ pid: 1234, processName: "python.exe", usedMemoryMiB: 768 }]
        }
      ]
    }));

    const result = await runSmoke({
      "workflow-path": workflowPath,
      "output-dir": outputDir,
      "require-gpu-telemetry": true,
      "require-gpu-indexes": "0,1",
      "min-gpu-memory-mib": 128,
      fetchImpl,
      readGpuTelemetry
    });

    expect(result.ok).toBe(true);
    expect(result.gpuTelemetry.proof).toMatchObject({
      ok: true,
      missingIndexes: [],
      insufficientIndexes: []
    });
    expect(result.gpuTelemetry.proof.gpuSummaries).toHaveLength(2);
    expect(readGpuTelemetry).toHaveBeenCalled();
  });

  it("blocks required telemetry when the donor GPU is missing", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "customcard-comfy-smoke-missing-"));
    tempDirs.push(tempDir);
    const workflowPath = join(tempDir, "workflow.json");
    writeFileSync(workflowPath, JSON.stringify({ "1": { class_type: "SaveImage", inputs: {} } }));

    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith("/prompt")) return jsonResponse({ prompt_id: "missing-gpu" });
      if (requestUrl.endsWith("/history/missing-gpu")) {
        return jsonResponse({
          "missing-gpu": {
            status: { completed: true },
            outputs: { "1": { images: [{ filename: "proof.png", subfolder: "", type: "output" }] } }
          }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });

    const result = await runSmoke({
      "workflow-path": workflowPath,
      "output-dir": join(tempDir, "out"),
      "require-gpu-telemetry": true,
      "require-gpu-indexes": "0,1",
      fetchImpl,
      readGpuTelemetry: async () => ({
        status: "ready",
        gpus: [{ index: 0, name: "GTX 1080 Ti", memoryUsedMiB: 2048, computeApps: [] }]
      })
    });

    expect(result.ok).toBe(false);
    expect(result.gpuTelemetry.proof.missingIndexes).toEqual([1]);
    expect(result.blockers.join("\n")).toContain("Required GPU telemetry was not proven");
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}
