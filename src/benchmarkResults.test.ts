import { describe, expect, it } from "vitest";
import {
  buildBenchmarkResultsModel,
  filterBenchmarkResults,
  parseBenchmarkManualGrade,
  type BenchmarkResultRecord
} from "./benchmarkResults";
import { benchmarkResultRecords } from "./benchmarkResultsData";

const manualGrade = `
# Manual Grade

- Product quality score /100: 45
- Prompt/pipeline contract score /100: 86
- Tier: D

## Visible product judgment

The card passes contract checks but still looks like low-effort stationery.

- Blocking failures: front has no commercial hook; panels need a full visual redo.
- Hard failure caps triggered: cap at 45 for two mostly blank panels.
`;

describe("benchmark results model", () => {
  it("parses manual visual grade notes without treating auto-checks as product score", () => {
    const parsed = parseBenchmarkManualGrade(manualGrade);

    expect(parsed.productScore).toBe(45);
    expect(parsed.contractScore).toBe(86);
    expect(parsed.tier).toBe("D");
    expect(parsed.visibleJudgment).toContain("low-effort stationery");
    expect(parsed.blockers).toEqual(
      expect.arrayContaining([
        "front has no commercial hook; panels need a full visual redo.",
        "cap at 45 for two mostly blank panels."
      ])
    );
  });

  it("summarizes latest runs, failures, and the visible-quality recommendation gate", () => {
    const model = buildBenchmarkResultsModel(benchmarkResultRecords);

    expect(model.summary.totalRuns).toBeGreaterThanOrEqual(5);
    expect(model.latestRuns[0].runId).toBe("model-benchmark-20260614-fixed-provider-requests");
    expect(model.summary.gradedRuns).toBe(2);
    expect(model.summary.failedRuns).toBe(3);
    expect(model.summary.bestProductScore).toBe(66);
    expect(model.recommendation).toMatchObject({
      label: "No customer-quality recommendation",
      status: "blocked",
      productScore: 66,
      contractScore: 94
    });
    expect(model.remainingBlockers.join(" ")).toContain("Generic landscape");
  });

  it("filters benchmark history by provider, phase, score, status, and evidence text", () => {
    const model = buildBenchmarkResultsModel(benchmarkResultRecords);

    expect(filterBenchmarkResults(model.records, { provider: "openai-responses-chat" })).toHaveLength(1);
    expect(filterBenchmarkResults(model.records, { phase: "typography" })).toHaveLength(1);
    expect(filterBenchmarkResults(model.records, { minProductScore: 40 })).toHaveLength(2);
    expect(filterBenchmarkResults(model.records, { minProductScore: 80 })).toHaveLength(0);
    expect(filterBenchmarkResults(model.records, { status: "failed" })).toHaveLength(3);
    expect(filterBenchmarkResults(model.records, { query: "429" })).toHaveLength(1);
    expect(filterBenchmarkResults(model.records, { query: "contact-sheet" }).map((record) => record.id)).toEqual(
      expect.arrayContaining(["cloudflare-deepai-prompt-repair-v6-20260613"])
    );
  });

  it("allows a high-quality scored provider route to become the recommendation", () => {
    const baseline = benchmarkResultRecords.find((record) => record.id === "cloudflare-deepai-prompt-repair-v6-20260613");
    expect(baseline).toBeDefined();
    const promoted: BenchmarkResultRecord = {
      ...baseline!,
      id: "promoted-provider",
      productScore: 91,
      contractScore: 95,
      blockers: ["Human proofing still required."]
    };
    const model = buildBenchmarkResultsModel([promoted, ...benchmarkResultRecords]);

    expect(model.recommendation).toMatchObject({
      label: "cloudflare-workers-ai-chat + deepai-text2img-image",
      status: "candidate",
      productScore: 91,
      contractScore: 95
    });
  });
});
