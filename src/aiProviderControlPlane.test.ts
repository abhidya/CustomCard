import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  aiProviderModelCatalog,
  aiRoutePolicies,
  buildAiProviderControlPlaneModel,
  validateAiProviderControlPlaneModel,
  type AiCustomerErrorPolicy
} from "./aiProviderControlPlane";
import type { BenchmarkResultRecord } from "./benchmarkResults";

describe("AI provider control plane", () => {
  it("models DeepAI text2img variants from provider docs and keeps request defaults configurable", () => {
    const deepAiVariants = aiProviderModelCatalog.filter((entry) => entry.adapterId === "deepai-text2img-image");

    expect(deepAiVariants.map((entry) => entry.modelId)).toEqual([
      "text2img:standard",
      "text2img:hd",
      "text2img:genius",
      "text2img:super_genius"
    ]);
    expect(deepAiVariants.map((entry) => entry.requestDefaults.imageGeneratorVersion)).toEqual([
      "standard",
      "hd",
      "genius",
      "super_genius"
    ]);
    expect(deepAiVariants.map((entry) => entry.cost.imageUsdPerUnit)).toEqual([0.01, 0.01, 0.08, 0.25]);
    expect(deepAiVariants[0].requestDefaults).toMatchObject({
      width: "768",
      height: "1024",
      negativePrompt: expect.stringContaining("watermark")
    });
  });

  it("keeps route policy, prompt profile, and benchmark promotion as separate admin-owned objects", () => {
    const model = buildAiProviderControlPlaneModel();
    const cardImagePolicy = model.routePolicies.find((policy) => policy.flowId === "card-image");
    const cardImagePrompt = model.promptProfiles.find((profile) => profile.id === "card-image-deepai-standard-v1");

    expect(model.contractIssues).toEqual([]);
    expect(cardImagePolicy).toMatchObject({
      queueRequired: true,
      customerErrorPolicy: "generic-status-only",
      adminChangeMode: "runtime-config",
      primaryModelIds: ["deepai-text2img-standard"]
    });
    expect(cardImagePrompt).toMatchObject({
      adapterId: "deepai-text2img-image",
      modelId: "text2img:standard",
      schemaContract: "single-panel-image-url"
    });
    expect(cardImagePolicy?.primaryModelIds).not.toContain(cardImagePrompt?.id);
  });

  it("turns persisted benchmark records into scorecards without promoting DeepAI below the product gate", () => {
    const model = buildAiProviderControlPlaneModel();
    const deepAiStandard = model.scorecards.find((scorecard) => scorecard.catalogEntryId === "deepai-text2img-standard");
    const imageRoute = model.routeRecommendations.find((recommendation) => recommendation.flowId === "card-image");

    expect(deepAiStandard).toMatchObject({
      bestProductScore: 66,
      bestContractScore: 94,
      adminStatus: "needs-product-work"
    });
    expect(deepAiStandard?.latestEvidencePath).toContain("manual-grade.md");
    expect(imageRoute?.status).toBe("benchmark-required");
    expect(model.benchmarkRecommendation).toMatchObject({
      status: "blocked",
      productScore: 66,
      contractScore: 94
    });
    expect(model.blockers.join(" ")).toContain("visible product");
  });

  it("can promote a route only after grades clear product, contract, and reliability gates", () => {
    const promotedRecord: BenchmarkResultRecord = {
      id: "deepai-promoted-test",
      runId: "deepai-promoted-test",
      createdAtIso: "2026-06-15T12:00:00.000Z",
      phase: "pipeline-quality",
      storyId: "sympathy-quiet-support",
      status: "succeeded",
      statusCode: 200,
      textCandidateId: "text-cloudflare-baseline",
      textProvider: "cloudflare-workers-ai-chat",
      textModel: "@cf/meta/llama-3.1-8b-instruct-fast",
      imageCandidateId: "image-deepai-text2img",
      imageProvider: "deepai-text2img-image",
      imageModel: "text2img",
      panelCount: 4,
      providerCallCount: 4,
      nativePanelCount: 4,
      productScore: 91,
      contractScore: 96,
      tier: "A",
      gradeStatus: "manual",
      aiNotes: [],
      humanNotes: ["Synthetic high-quality promotion fixture."],
      blockers: [],
      evidence: {
        outputDir: "docs/evidence/generated-card-comparisons/deepai-promoted-test",
        summaryPath: "docs/evidence/generated-card-comparisons/deepai-promoted-test/summary.json",
        manualGradePath: "docs/evidence/generated-card-comparisons/deepai-promoted-test/manual-grade.md",
        previewPaths: [],
        promptPaths: [],
        payloadPaths: [],
        failurePaths: []
      }
    };
    const catalog = aiProviderModelCatalog.filter((entry) => entry.id === "deepai-text2img-standard");
    const routePolicies = aiRoutePolicies
      .filter((policy) => policy.flowId === "card-image")
      .map((policy) => ({ ...policy, fallbackModelIds: [] }));
    const model = buildAiProviderControlPlaneModel({
      benchmarkRecords: [promotedRecord],
      catalog,
      promptProfiles: [
        {
          id: "card-image-deepai-standard-v1",
          flowId: "card-image",
          adapterId: "deepai-text2img-image",
          modelId: "text2img:standard",
          promptVersion: "card-image-deepai-standard-v1",
          status: "active",
          promptPurpose: "Fixture",
          systemPromptSummary: "Fixture",
          requestDefaults: {},
          schemaContract: "single-panel-image-url"
        }
      ],
      routePolicies
    });

    expect(model.scorecards[0]).toMatchObject({ adminStatus: "promotable", routeReliabilityScore: 100 });
    expect(model.routeRecommendations[0]).toMatchObject({
      status: "promotable",
      selectedModelIds: ["deepai-text2img-standard"]
    });
  });

  it("requires grade persistence and generic customer error policy", () => {
    const model = buildAiProviderControlPlaneModel({
      routePolicies: [
        {
          ...aiRoutePolicies[0],
          customerErrorPolicy: "provider-message" as AiCustomerErrorPolicy
        }
      ],
      persistence: {
        migrationFile: "infra/migrations/005_ai_provider_control_plane.sql",
        tables: []
      }
    });

    expect(validateAiProviderControlPlaneModel(model)).toEqual(
      expect.arrayContaining([
        "Route policy card-copy-route-v1 must not surface provider-specific errors to customers.",
        "Benchmark persistence contract missing ai_benchmark_runs.",
        "Benchmark persistence contract missing ai_benchmark_grades.",
        "ai_benchmark_grades must include product_score."
      ])
    );
  });

  it("ships a migration for provider catalog imports, route policies, and benchmark grades", () => {
    const migration = readFileSync("infra/migrations/005_ai_provider_control_plane.sql", "utf8");

    for (const table of [
      "ai_provider_models",
      "ai_route_policies",
      "ai_prompt_profiles",
      "ai_benchmark_runs",
      "ai_benchmark_grades"
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(migration).toContain("customer_error_policy TEXT NOT NULL CHECK (customer_error_policy = 'generic-status-only')");
    expect(migration).toContain("product_score INTEGER CHECK");
    expect(migration).toContain("route_reliability_score INTEGER CHECK");
    expect(migration).toContain("raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE)");
  });
});
