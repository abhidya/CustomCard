import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyProductionTextPlanner } from "../scripts/production-text-planner-policy.mjs";
import { runProductionTextPlannerPreflight } from "../scripts/production-text-planner-preflight.mjs";

function modelsResponse(model: string) {
  return new Response(JSON.stringify({ data: [{ id: model }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("production text planner preflight", () => {
  it("classifies 4096-context Qwen as smoke-only rather than production", async () => {
    const fetchImpl = async () => modelsResponse("koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S");
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-preflight-qwen-"));

    const report = await runProductionTextPlannerPreflight(
      {
        "base-url": "http://127.0.0.1:5001/v1",
        "reported-context-tokens": "4096",
        "max-output-tokens": "3200",
        "output-dir": root
      },
      { fetchImpl }
    );

    expect(report.reportDir).toContain("production-text-planner-preflight-qwen-");
    expect(report.runAllowed).toBe(false);
    expect(report.promotionReady).toBe(false);
    expect(report.classification.classification).toBe("smoke-only");
    expect(report.blockers.join("\n")).toContain("smoke-only");
    expect(report.blockers.join("\n")).toContain("4096");
  });

  it("allows small planners only as explicit smoke evidence", async () => {
    const fetchImpl = async () => modelsResponse("koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S");
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-preflight-smoke-"));

    const report = await runProductionTextPlannerPreflight(
      {
        "base-url": "http://127.0.0.1:5001/v1",
        "reported-context-tokens": "4096",
        "max-output-tokens": "1800",
        "allow-small": true,
        "output-dir": root
      },
      { fetchImpl }
    );

    expect(report.runAllowed).toBe(true);
    expect(report.promotionReady).toBe(false);
    expect(report.classification.classification).toBe("smoke-only");
    expect(report.warnings.join("\n")).toContain("smoke/failure evidence only");
  });

  it("blocks Qwen3 8B as reduced-quality smoke evidence for the production prompt", async () => {
    const fetchImpl = async () => modelsResponse("koboldcpp/Qwen3-8B-Q4_K_M");
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-preflight-qwen8b-"));

    const report = await runProductionTextPlannerPreflight(
      {
        "base-url": "http://127.0.0.1:5002/v1",
        "reported-context-tokens": "8192",
        "max-output-tokens": "3200",
        "output-dir": root
      },
      { fetchImpl }
    );

    expect(report.runAllowed).toBe(false);
    expect(report.promotionReady).toBe(false);
    expect(report.classification.classification).toBe("smoke-only");
    expect(report.blockers.join("\n")).toContain("Qwen3 14B+");
  });

  it("blocks stale planner endpoints when the loaded model does not match the requested production model", async () => {
    const fetchImpl = async () => modelsResponse("koboldcpp/Qwen3-4B-Instruct-2507-Q4_K_S");
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-preflight-mismatch-"));

    const report = await runProductionTextPlannerPreflight(
      {
        "base-url": "http://127.0.0.1:5003/v1",
        model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
        "reported-context-tokens": "8192",
        "max-output-tokens": "3200",
        "output-dir": root
      },
      { fetchImpl }
    );

    expect(report.runAllowed).toBe(false);
    expect(report.promotionReady).toBe(false);
    expect(report.requestedModel).toBe("koboldcpp/gemma-4-31B-it-Q4_K_M");
    expect(report.blockers.join("\n")).toContain("did not report the requested model");
    expect(report.blockers.join("\n")).toContain("Qwen3-4B");
  });

  it("accepts a production planner with enough context and output budget", async () => {
    const fetchImpl = async () => modelsResponse("koboldcpp/gemma-4-31B-it-Q4_K_M");
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-preflight-ready-"));

    const report = await runProductionTextPlannerPreflight(
      {
        "base-url": "http://127.0.0.1:5003/v1",
        "reported-context-tokens": "8192",
        "max-output-tokens": "3200",
        "output-dir": root
      },
      { fetchImpl }
    );

    expect(report.runAllowed).toBe(true);
    expect(report.promotionReady).toBe(true);
    expect(report.classification.classification).toBe("production-suitable");
    expect(report.classification.minimumOpenWeightPlannerClass).toContain("14B+");
    expect(report.blockers).toEqual([]);
  });

  it("keeps the policy helper strict about reduced output caps", () => {
    const result = classifyProductionTextPlanner("koboldcpp/gemma-4-31B-it-Q4_K_M", {
      reportedContextTokens: 8192,
      maxOutputTokens: 1800,
      requireRuntimeBudget: true
    });

    expect(result.productionSuitable).toBe(false);
    expect(result.blockers.join("\n")).toContain("PlannerMaxTokens 1800");
  });
});
