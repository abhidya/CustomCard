import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  productionTextNodeSourceRelativePath,
  productionTextRequiredCompositorInputs,
  productionTextRequiredNodeClass,
  productionTextWorkflowRelativePath,
  resolveProductionTextComfyUrl
} from "../scripts/comfy-production-text-setup.mjs";
import { runPreflight } from "../scripts/comfyui-production-text-preflight.mjs";
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

function writeFailingAggregate(path: string) {
  writeJson(path, {
    totalRuns: 3,
    ranked: ["aquarium-lover-birthday", "koi-fish-lover-encouragement", "dog-lover-thank-you"].map((fixtureId) => ({
      fixtureId,
      status: "blocked",
      score: 38,
      manualVisualGrade: {
        passed: false,
        blockingFailures: ["visual grade failed"]
      }
    }))
  });
}

function gpuResidencyProbe() {
  return {
    required: true,
    ok: true,
    status: "gpu-backed",
    pids: [1234],
    nvidiaProcessIds: [1234]
  };
}

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("production text readiness doctor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the production-text doc pinned to the shared setup facts and required live node", () => {
    const workflowDoc = readFileSync(resolve(repoRoot, "docs/comfyui-production-text-workflow.md"), "utf8");

    expect(workflowDoc).toContain("scripts/comfy-production-text-setup.mjs");
    expect(workflowDoc).toContain(productionTextWorkflowRelativePath);
    expect(workflowDoc).toContain(productionTextNodeSourceRelativePath);
    expect(workflowDoc).toContain(productionTextRequiredNodeClass);
    expect(workflowDoc).toContain("shared setup facts");
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
    }, { gpuResidencyProbe });

    expect(report.promotionReady).toBe(false);
    expect(report.activePlannerEndpoints[0]).toMatchObject({
      activeModel: "koboldcpp/gemma-4-31B-it-Q4_K_M",
      productionSuitable: false
    });
    expect(report.activePlannerEndpoints[0].plannerPolicy.blockers.join("\n")).toContain("context was not reported");
    expect(report.blockers.map((item) => item.name)).toContain("configured production planner endpoint is production-suitable");
  });

  it("uses the shared workflow path, node source, and default Comfy URL facts", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-readiness-doctor-defaults-"));
    const modelRoot = join(root, "models");
    mkdirSync(modelRoot, { recursive: true });
    writeFileSync(join(modelRoot, "gemma-4-31B-it-Q4_K_M.gguf"), "fake model marker");
    const aggregatePath = join(root, "benchmark-aggregate.json");
    writePassingAggregate(aggregatePath);
    const defaultComfyUrl = resolveProductionTextComfyUrl({ env: {} });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const target = String(url);
      if (target === `${defaultComfyUrl}/object_info`) {
        return new Response(JSON.stringify({ [productionTextRequiredNodeClass]: {} }), {
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
      "planner-context-tokens": 8192,
      "planner-max-output-tokens": 3200,
      "output-dir": join(root, "readiness")
    }, { gpuResidencyProbe });

    expect(report.workflowPath).toBe(productionTextWorkflowRelativePath);
    expect(report.nodeSource).toBe(productionTextNodeSourceRelativePath);
    expect(report.comfy.comfyUrl).toBe(defaultComfyUrl);
  });

  it("uses the shared production text node contract in preflight and keeps missing live node blocking", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-preflight-"));
    const defaultComfyUrl = resolveProductionTextComfyUrl({ env: {} });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const target = String(url);
      if (target === `${defaultComfyUrl}/object_info`) {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("not found", { status: 404 });
    });

    const report = await runPreflight({
      "require-live": true,
      "output-root": root,
      "report-dir": join(root, "preflight")
    });

    expect(report.requiredNodeClass).toBe(productionTextRequiredNodeClass);
    expect(report.checks.find((item) => item.name === "workflow maps production text compositor inputs")?.details).toMatchObject({
      requiredInputs: productionTextRequiredCompositorInputs,
      missingInputs: []
    });
    expect(report.liveNodeAvailable).toBe(false);
    expect(report.promotionReady).toBe(false);
    expect(report.blockers?.map?.((item) => item.name)).toBeUndefined();
    expect(report.checks.find((item) => item.name === "live ComfyUI has CustomCardTextComposer")).toMatchObject({
      ok: false,
      required: true
    });
  });

  it("keeps aggregate failures informational instead of blocking runtime readiness", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-readiness-doctor-runtime-ready-"));
    const modelRoot = join(root, "models");
    mkdirSync(modelRoot, { recursive: true });
    writeFileSync(join(modelRoot, "gemma-4-31B-it-Q4_K_M.gguf"), "fake model marker");
    const aggregatePath = join(root, "benchmark-aggregate.json");
    writeFailingAggregate(aggregatePath);

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
      "planner-context-tokens": 8192,
      "planner-max-output-tokens": 3200,
      "output-dir": join(root, "readiness")
    }, { gpuResidencyProbe });

    expect(report.promotionReady).toBe(true);
    expect(report.aggregatePromotionReady).toBe(false);
    expect(report.blockers).toHaveLength(0);
    expect(report.checks.find((item) => item.name === "latest LLM-planned aggregate is passing")).toMatchObject({
      required: false,
      ok: false
    });
    expect(report.nextSteps.join("\n")).toContain("Promotion gate still needs");
  });

  it("blocks local production planner readiness when GPU residency is not proven", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-readiness-doctor-cpu-"));
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
      "planner-context-tokens": 8192,
      "planner-max-output-tokens": 3200,
      "output-dir": join(root, "readiness")
    }, {
      gpuResidencyProbe: () => ({
        required: true,
        ok: false,
        status: "blocked",
        blocker: "Local KoboldCPP planner has GPU flags but its PID is not listed by nvidia-smi."
      })
    });

    expect(report.promotionReady).toBe(false);
    expect(report.blockers.map((item) => item.name)).toContain("configured local planner runtime is GPU-backed");
    expect(report.activePlannerEndpoints[0].localGpuResidency).toMatchObject({
      required: true,
      ok: false
    });
    expect(report.nextSteps.join("\n")).toContain("nvidia-smi");
  });

  it("passes bearer auth to hosted planner readiness probes", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-readiness-doctor-hosted-"));
    const modelRoot = join(root, "models");
    mkdirSync(modelRoot, { recursive: true });
    writeFileSync(join(modelRoot, "gemma-4-31B-it-Q4_K_M.gguf"), "fake model marker");
    const aggregatePath = join(root, "benchmark-aggregate.json");
    writePassingAggregate(aggregatePath);
    const seenAuthHeaders: string[] = [];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      const target = String(url);
      const headers = new Headers(init?.headers);
      if (target.startsWith("https://planner.example") && target.endsWith("/models")) {
        seenAuthHeaders.push(headers.get("authorization") || "");
        return new Response(JSON.stringify({ data: [{ id: "gpt-production-planner" }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (target.endsWith("/object_info")) {
        return new Response(JSON.stringify({ CustomCardTextComposer: {} }), {
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
      "local-llm-base-url": "https://planner.example/v1",
      "local-llm-api-key": "test-hosted-key",
      "planner-context-tokens": 8192,
      "planner-max-output-tokens": 3200,
      "output-dir": join(root, "readiness")
    });

    expect(seenAuthHeaders).toEqual(["Bearer test-hosted-key"]);
    expect(report.plannerApiKeyProvided).toBe(true);
    expect(report.promotionReady).toBe(true);
    expect(report.activePlannerEndpoints[0]).toMatchObject({
      baseUrl: "https://planner.example/v1",
      activeModel: "gpt-production-planner",
      productionSuitable: true
    });
    expect(report.activePlannerEndpoints[0].localGpuResidency).toMatchObject({
      required: false,
      ok: true
    });
  });

  it("keeps missing CustomCardTextComposer promotion-failing in readiness", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-readiness-doctor-missing-node-"));
    const modelRoot = join(root, "models");
    mkdirSync(modelRoot, { recursive: true });
    writeFileSync(join(modelRoot, "gemma-4-31B-it-Q4_K_M.gguf"), "fake model marker");
    const aggregatePath = join(root, "benchmark-aggregate.json");
    writePassingAggregate(aggregatePath);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const target = String(url);
      if (target.endsWith("/object_info")) {
        return new Response(JSON.stringify({}), {
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
      "planner-context-tokens": 8192,
      "planner-max-output-tokens": 3200,
      "output-dir": join(root, "readiness")
    }, { gpuResidencyProbe });

    expect(report.promotionReady).toBe(false);
    expect(report.blockers.map((item) => item.name)).toContain("live ComfyUI exposes CustomCardTextComposer");
    expect(report.comfy.hasTextComposer).toBe(false);
  });
});
