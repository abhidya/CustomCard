import {
  benchmarkResultsModel,
  type BenchmarkResultRecord,
  type BenchmarkResultsModel
} from "./benchmarkResults";
import { aiRoutePolicyIdsByFlowId } from "./aiRoutePolicyIds.mjs";
import { summarizeAiFlowConfigs, type AiFlowConfigSummary } from "./aiFlowConfig";
import type { ProviderCapability } from "./providerCatalog";
import type { ProviderCallEvent } from "./providerOperations";

export type AiProviderGenerationCapability = Extract<ProviderCapability, "text-chat" | "image-generation">;
export type AiProviderCatalogStatus = "candidate" | "active" | "blocked" | "deprecated";
export type AiPromptProfileStatus = "draft" | "active" | "retired";
export type AiRoutePolicyStatus = "draft" | "active" | "paused";
export type AiCustomerErrorPolicy = "generic-status-only";
export type AiModelAdminStatus = "promotable" | "needs-product-work" | "benchmark-required" | "blocked" | "review-required";
export type AiRouteRecommendationStatus = "promotable" | "blocked" | "benchmark-required";

export interface AiProviderCostModel {
  pricingSourceUrl: string;
  unitLabel: string;
  imageUsdPerUnit?: number;
  inputUsdPerMillionTokens?: number;
  outputUsdPerMillionTokens?: number;
  includedMonthlyUnits?: number;
  includedUnitLabel?: string;
  notes: string[];
}

export interface AiProviderRequestDefaults {
  width?: string;
  height?: string;
  imageGeneratorVersion?: "standard" | "hd" | "genius" | "super_genius";
  resolution?: "2k" | "4k";
  geniusPreference?: "anime" | "photography" | "graphic" | "cinematic";
  negativePrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiProviderQualityGate {
  productScore: number;
  contractScore: number;
  routeReliabilityScore: number;
}

export interface AiProviderCatalogEntry {
  id: string;
  adapterId: string;
  provider: string;
  capability: AiProviderGenerationCapability;
  modelId: string;
  label: string;
  status: AiProviderCatalogStatus;
  defaultPromptProfileId: string;
  docsUrl: string;
  sourceUrl: string;
  requestDefaults: AiProviderRequestDefaults;
  cost: AiProviderCostModel;
  qualityGate: AiProviderQualityGate;
  benchmarkModelAliases: string[];
  benchmarkCandidateAliases: string[];
  operatorNotes: string[];
}

export interface AiPromptProfile {
  id: string;
  flowId: string;
  adapterId: string;
  modelId: string;
  promptVersion: string;
  status: AiPromptProfileStatus;
  promptPurpose: string;
  systemPromptSummary: string;
  negativePrompt?: string;
  requestDefaults: AiProviderRequestDefaults;
  schemaContract: string;
}

export interface AiRoutePolicy {
  id: string;
  flowId: string;
  policyVersion: string;
  status: AiRoutePolicyStatus;
  capability: AiProviderGenerationCapability;
  primaryModelIds: string[];
  fallbackModelIds: string[];
  minProductScore: number;
  minContractScore: number;
  minRouteReliabilityScore: number;
  maxEstimatedCostCentsPerRequest: number;
  monthlyBudgetCents: number;
  rateLimitPerMinute: number;
  queueRequired: boolean;
  fallbackStrategy: "one-step-failover" | "manual-review";
  customerErrorPolicy: AiCustomerErrorPolicy;
  adminChangeMode: "runtime-config";
}

export interface AiBenchmarkPersistenceTable {
  name: string;
  requiredColumns: string[];
  piiFree: true;
  rawPromptStored: false;
}

export interface AiBenchmarkGradePersistenceContract {
  migrationFile: string;
  tables: AiBenchmarkPersistenceTable[];
}

export interface AiModelScorecard {
  modelId: string;
  catalogEntryId: string;
  adapterId: string;
  provider: string;
  capability: AiProviderGenerationCapability;
  status: AiProviderCatalogStatus;
  adminStatus: AiModelAdminStatus;
  benchmarkRuns: number;
  manualGrades: number;
  bestProductScore?: number;
  bestContractScore?: number;
  latestProductScore?: number;
  latestContractScore?: number;
  routeReliabilityScore?: number;
  providerFailureCount: number;
  latestEvidencePath?: string;
  blockers: string[];
}

export interface AiRouteRecommendation {
  policyId: string;
  flowId: string;
  status: AiRouteRecommendationStatus;
  selectedModelIds: string[];
  candidateModelIds: string[];
  fallbackModelIds: string[];
  rationale: string;
  blockers: string[];
}

export interface AiProviderControlPlaneSummary {
  catalogModels: number;
  routePolicies: number;
  promptProfiles: number;
  persistedBenchmarkTables: number;
  promotableModels: number;
  benchmarkRequiredModels: number;
  blockedModels: number;
  promotionBlockers: number;
}

export interface AiProviderControlPlaneModel {
  summary: AiProviderControlPlaneSummary;
  catalog: AiProviderCatalogEntry[];
  promptProfiles: AiPromptProfile[];
  routePolicies: AiRoutePolicy[];
  scorecards: AiModelScorecard[];
  routeRecommendations: AiRouteRecommendation[];
  persistence: AiBenchmarkGradePersistenceContract;
  benchmarkRecommendation: BenchmarkResultsModel["recommendation"];
  blockers: string[];
  contractIssues: string[];
}

export interface AiProviderControlPlaneInput {
  aiFlowSummary?: AiFlowConfigSummary;
  benchmarkModel?: BenchmarkResultsModel;
  benchmarkRecords?: BenchmarkResultRecord[];
  usageEvents?: ProviderCallEvent[];
  catalog?: AiProviderCatalogEntry[];
  promptProfiles?: AiPromptProfile[];
  routePolicies?: AiRoutePolicy[];
  persistence?: AiBenchmarkGradePersistenceContract;
  nowIso?: string;
}

const customerVisibleProductGate = 80;
const pipelineContractGate = 90;
const routeReliabilityGate = 90;

export const deepAiCardNegativePrompt =
  "text, watermark, signature, logo, low quality, blurry, cropped, deformed, disfigured, extra limbs, bad anatomy, jpeg artifacts";

export const aiProviderModelCatalog: AiProviderCatalogEntry[] = [
  {
    id: "hf-qwen3-235b-card-copy",
    adapterId: "huggingface-chat",
    provider: "Hugging Face Inference Providers",
    capability: "text-chat",
    modelId: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    label: "Qwen3 235B card-copy candidate",
    status: "blocked",
    defaultPromptProfileId: "card-copy-json-v1",
    docsUrl: "https://huggingface.co/docs/inference-providers/index",
    sourceUrl: "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live",
    requestDefaults: { maxTokens: 3200, temperature: 0.62 },
    cost: {
      pricingSourceUrl: "https://huggingface.co/docs/inference-providers/pricing",
      unitLabel: "tokens",
      notes: ["Current repo evidence shows the live route blocked by depleted credits before image generation."]
    },
    qualityGate: { productScore: customerVisibleProductGate, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["Qwen/Qwen3-235B-A22B-Instruct-2507"],
    benchmarkCandidateAliases: ["text-hf-qwen3-235b-a22b"],
    operatorNotes: ["Good text candidate remains a candidate only after budget and credit controls are restored."]
  },
  {
    id: "cloudflare-qwen3-30b-card-copy",
    adapterId: "cloudflare-workers-ai-chat",
    provider: "Cloudflare Workers AI",
    capability: "text-chat",
    modelId: "@cf/qwen/qwen3-30b-a3b-fp8",
    label: "Cloudflare Qwen3 30B card-copy candidate",
    status: "candidate",
    defaultPromptProfileId: "card-copy-json-v1",
    docsUrl: "https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/",
    sourceUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
    requestDefaults: { maxTokens: 3200, temperature: 0.62 },
    cost: {
      pricingSourceUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
      unitLabel: "input/output tokens",
      inputUsdPerMillionTokens: 0.051,
      outputUsdPerMillionTokens: 0.335,
      notes: ["Cloudflare prices Workers AI per model while billing Neurons internally."]
    },
    qualityGate: { productScore: customerVisibleProductGate, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["@cf/qwen/qwen3-30b-a3b-fp8"],
    benchmarkCandidateAliases: ["text-cloudflare-qwen3-30b-a3b-fp8"],
    operatorNotes: ["Use as the next low-cost Cloudflare text candidate once benchmarked on the card-copy JSON contract."]
  },
  {
    id: "cloudflare-llama31-card-copy-baseline",
    adapterId: "cloudflare-workers-ai-chat",
    provider: "Cloudflare Workers AI",
    capability: "text-chat",
    modelId: "@cf/meta/llama-3.1-8b-instruct-fast",
    label: "Cloudflare current text baseline",
    status: "active",
    defaultPromptProfileId: "card-copy-json-v1",
    docsUrl: "https://developers.cloudflare.com/workers-ai/models/",
    sourceUrl: "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests",
    requestDefaults: { maxTokens: 3200, temperature: 0.62 },
    cost: {
      pricingSourceUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
      unitLabel: "input/output tokens",
      notes: ["Current baseline is useful route evidence, but it has not cleared the visible product gate with DeepAI standard."]
    },
    qualityGate: { productScore: customerVisibleProductGate, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["@cf/meta/llama-3.1-8b-instruct-fast"],
    benchmarkCandidateAliases: ["text-cloudflare-baseline"],
    operatorNotes: ["Keep as a fallback candidate, not as proof that the full card route is customer-ready."]
  },
  {
    id: "deepai-text2img-standard",
    adapterId: "deepai-text2img-image",
    provider: "DeepAI",
    capability: "image-generation",
    modelId: "text2img:standard",
    label: "DeepAI text2img standard",
    status: "active",
    defaultPromptProfileId: "card-image-deepai-standard-v1",
    docsUrl: "https://deepai.org/docs",
    sourceUrl: "https://deepai.org/machine-learning-model/text2img",
    requestDefaults: {
      width: "768",
      height: "1024",
      imageGeneratorVersion: "standard",
      negativePrompt: deepAiCardNegativePrompt
    },
    cost: {
      pricingSourceUrl: "https://deepai.org/pricing",
      unitLabel: "image",
      imageUsdPerUnit: 0.01,
      includedMonthlyUnits: 500,
      includedUnitLabel: "standard or HD images under DeepAI Pro allowance",
      notes: ["DeepAI Pro includes a monthly image allowance; wallet overage pricing applies after allowance."]
    },
    qualityGate: { productScore: customerVisibleProductGate, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["text2img"],
    benchmarkCandidateAliases: ["image-deepai-text2img"],
    operatorNotes: ["Latest fixed-provider run is 66/94: contract improved, visible product remains below customer gate."]
  },
  {
    id: "deepai-text2img-hd",
    adapterId: "deepai-text2img-image",
    provider: "DeepAI",
    capability: "image-generation",
    modelId: "text2img:hd",
    label: "DeepAI text2img HD",
    status: "candidate",
    defaultPromptProfileId: "card-image-deepai-hd-v1",
    docsUrl: "https://deepai.org/docs",
    sourceUrl: "https://deepai.org/machine-learning-model/text2img",
    requestDefaults: {
      width: "896",
      height: "1152",
      imageGeneratorVersion: "hd",
      negativePrompt: deepAiCardNegativePrompt
    },
    cost: {
      pricingSourceUrl: "https://deepai.org/pricing",
      unitLabel: "image",
      imageUsdPerUnit: 0.01,
      includedMonthlyUnits: 500,
      includedUnitLabel: "standard or HD images under DeepAI Pro allowance",
      notes: ["HD should be benchmarked separately; do not infer quality from standard text2img runs."]
    },
    qualityGate: { productScore: customerVisibleProductGate, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["text2img:hd", "deepai-hd"],
    benchmarkCandidateAliases: ["image-deepai-hd"],
    operatorNotes: ["Candidate for a manual DeepAI quality bump if standard remains composition-limited."]
  },
  {
    id: "deepai-text2img-genius",
    adapterId: "deepai-text2img-image",
    provider: "DeepAI",
    capability: "image-generation",
    modelId: "text2img:genius",
    label: "DeepAI text2img Genius",
    status: "candidate",
    defaultPromptProfileId: "card-image-deepai-genius-v1",
    docsUrl: "https://deepai.org/docs",
    sourceUrl: "https://deepai.org/machine-learning-model/text2img",
    requestDefaults: {
      width: "832",
      height: "1216",
      imageGeneratorVersion: "genius",
      geniusPreference: "graphic",
      negativePrompt: deepAiCardNegativePrompt
    },
    cost: {
      pricingSourceUrl: "https://deepai.org/pricing",
      unitLabel: "image",
      imageUsdPerUnit: 0.08,
      includedMonthlyUnits: 60,
      includedUnitLabel: "Genius images under DeepAI Pro allowance",
      notes: ["Higher cost requires a separate route policy and review gate before promotion."]
    },
    qualityGate: { productScore: customerVisibleProductGate + 5, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["text2img:genius"],
    benchmarkCandidateAliases: ["image-deepai-genius"],
    operatorNotes: ["Benchmark only when standard/HD fail visible-product quality and budget allows spot checks."]
  },
  {
    id: "deepai-text2img-super-genius",
    adapterId: "deepai-text2img-image",
    provider: "DeepAI",
    capability: "image-generation",
    modelId: "text2img:super_genius",
    label: "DeepAI text2img Super Genius 2K",
    status: "candidate",
    defaultPromptProfileId: "card-image-deepai-super-genius-v1",
    docsUrl: "https://deepai.org/docs",
    sourceUrl: "https://deepai.org/machine-learning-model/text2img",
    requestDefaults: {
      imageGeneratorVersion: "super_genius",
      resolution: "2k",
      negativePrompt: deepAiCardNegativePrompt
    },
    cost: {
      pricingSourceUrl: "https://deepai.org/pricing",
      unitLabel: "image",
      imageUsdPerUnit: 0.25,
      includedMonthlyUnits: 10,
      includedUnitLabel: "Super Genius 2K images under DeepAI Pro allowance",
      notes: ["Too expensive for default four-panel generation without explicit admin budget policy."]
    },
    qualityGate: { productScore: customerVisibleProductGate + 5, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["text2img:super_genius"],
    benchmarkCandidateAliases: ["image-deepai-super-genius"],
    operatorNotes: ["Manual spot-check tier only until cost policy proves it can stay inside budget."]
  },
  {
    id: "cloudflare-flux-schnell-card-image",
    adapterId: "cloudflare-workers-ai-image",
    provider: "Cloudflare Workers AI",
    capability: "image-generation",
    modelId: "@cf/black-forest-labs/flux-1-schnell",
    label: "Cloudflare FLUX.1 Schnell image fallback",
    status: "candidate",
    defaultPromptProfileId: "card-image-flux-schnell-v1",
    docsUrl: "https://developers.cloudflare.com/workers-ai/models/",
    sourceUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
    requestDefaults: { width: "768", height: "1024" },
    cost: {
      pricingSourceUrl: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
      unitLabel: "512x512 tile / step",
      imageUsdPerUnit: 0.0000528,
      notes: ["Cloudflare image pricing is tile/step based; route policy should estimate a full portrait panel before promotion."]
    },
    qualityGate: { productScore: customerVisibleProductGate, contractScore: pipelineContractGate, routeReliabilityScore: routeReliabilityGate },
    benchmarkModelAliases: ["@cf/black-forest-labs/flux-1-schnell"],
    benchmarkCandidateAliases: ["image-cloudflare-flux-schnell"],
    operatorNotes: ["Candidate fallback where Cloudflare's dashboard and gateway controls are operationally preferable."]
  }
];

export const aiPromptProfiles: AiPromptProfile[] = [
  {
    id: "card-copy-json-v1",
    flowId: "card-copy",
    adapterId: "cloudflare-workers-ai-chat",
    modelId: "@cf/qwen/qwen3-30b-a3b-fp8",
    promptVersion: "card-copy-json-v1",
    status: "active",
    promptPurpose: "Turn sanitized customer story inputs into a four-panel greeting-card plan.",
    systemPromptSummary:
      "Return strict JSON for front, inside-left, inside-right, and back panels; use only approved memories; reserve final typography for app overlays.",
    requestDefaults: { maxTokens: 3200, temperature: 0.62 },
    schemaContract: "four-panel-card-copy-json"
  },
  {
    id: "card-image-deepai-standard-v1",
    flowId: "card-image",
    adapterId: "deepai-text2img-image",
    modelId: "text2img:standard",
    promptVersion: "card-image-deepai-standard-v1",
    status: "active",
    promptPurpose: "Generate one portrait 5x7-safe artwork panel from the card-copy image prompt.",
    systemPromptSummary:
      "Use form-data text plus native DeepAI negative_prompt; no final text rendering; keep safe-zone areas clear for deterministic overlays.",
    negativePrompt: deepAiCardNegativePrompt,
    requestDefaults: {
      width: "768",
      height: "1024",
      imageGeneratorVersion: "standard",
      negativePrompt: deepAiCardNegativePrompt
    },
    schemaContract: "single-panel-image-url"
  },
  {
    id: "card-image-deepai-hd-v1",
    flowId: "card-image",
    adapterId: "deepai-text2img-image",
    modelId: "text2img:hd",
    promptVersion: "card-image-deepai-hd-v1",
    status: "draft",
    promptPurpose: "Spot-check whether DeepAI HD improves visible product quality over standard.",
    systemPromptSummary: "Same card-image contract as standard, with HD portrait dimensions.",
    negativePrompt: deepAiCardNegativePrompt,
    requestDefaults: {
      width: "896",
      height: "1152",
      imageGeneratorVersion: "hd",
      negativePrompt: deepAiCardNegativePrompt
    },
    schemaContract: "single-panel-image-url"
  },
  {
    id: "card-image-deepai-genius-v1",
    flowId: "card-image",
    adapterId: "deepai-text2img-image",
    modelId: "text2img:genius",
    promptVersion: "card-image-deepai-genius-v1",
    status: "draft",
    promptPurpose: "Spot-check higher-cost DeepAI graphic mode against visible customer-quality gates.",
    systemPromptSummary: "Same card-image contract as standard, with genius graphic preference.",
    negativePrompt: deepAiCardNegativePrompt,
    requestDefaults: {
      width: "832",
      height: "1216",
      imageGeneratorVersion: "genius",
      geniusPreference: "graphic",
      negativePrompt: deepAiCardNegativePrompt
    },
    schemaContract: "single-panel-image-url"
  },
  {
    id: "card-image-deepai-super-genius-v1",
    flowId: "card-image",
    adapterId: "deepai-text2img-image",
    modelId: "text2img:super_genius",
    promptVersion: "card-image-deepai-super-genius-v1",
    status: "draft",
    promptPurpose: "Manual-only DeepAI 2K quality spot check with explicit budget approval.",
    systemPromptSummary: "Same card-image contract as standard, using super_genius 2K only for small admin batches.",
    negativePrompt: deepAiCardNegativePrompt,
    requestDefaults: {
      imageGeneratorVersion: "super_genius",
      resolution: "2k",
      negativePrompt: deepAiCardNegativePrompt
    },
    schemaContract: "single-panel-image-url"
  },
  {
    id: "card-image-flux-schnell-v1",
    flowId: "card-image",
    adapterId: "cloudflare-workers-ai-image",
    modelId: "@cf/black-forest-labs/flux-1-schnell",
    promptVersion: "card-image-flux-schnell-v1",
    status: "draft",
    promptPurpose: "Cloudflare image fallback benchmark profile for cost and gateway-control comparison.",
    systemPromptSummary: "Generate one artwork panel with app-rendered typography and evidence capture.",
    requestDefaults: { width: "768", height: "1024" },
    schemaContract: "single-panel-image-url"
  }
];

export const aiRoutePolicies: AiRoutePolicy[] = [
  {
    id: aiRoutePolicyIdsByFlowId["card-copy"] ?? "card-copy-route-v1",
    flowId: "card-copy",
    policyVersion: "2026-06-15",
    status: "active",
    capability: "text-chat",
    primaryModelIds: ["cloudflare-qwen3-30b-card-copy"],
    fallbackModelIds: ["cloudflare-llama31-card-copy-baseline", "hf-qwen3-235b-card-copy"],
    minProductScore: customerVisibleProductGate,
    minContractScore: pipelineContractGate,
    minRouteReliabilityScore: routeReliabilityGate,
    maxEstimatedCostCentsPerRequest: 5,
    monthlyBudgetCents: 5000,
    rateLimitPerMinute: 4,
    queueRequired: false,
    fallbackStrategy: "one-step-failover",
    customerErrorPolicy: "generic-status-only",
    adminChangeMode: "runtime-config"
  },
  {
    id: aiRoutePolicyIdsByFlowId["card-image"] ?? "card-image-route-v1",
    flowId: "card-image",
    policyVersion: "2026-06-15",
    status: "active",
    capability: "image-generation",
    primaryModelIds: ["deepai-text2img-standard"],
    fallbackModelIds: ["cloudflare-flux-schnell-card-image", "deepai-text2img-hd"],
    minProductScore: customerVisibleProductGate,
    minContractScore: pipelineContractGate,
    minRouteReliabilityScore: routeReliabilityGate,
    maxEstimatedCostCentsPerRequest: 4,
    monthlyBudgetCents: 4000,
    rateLimitPerMinute: 8,
    queueRequired: true,
    fallbackStrategy: "one-step-failover",
    customerErrorPolicy: "generic-status-only",
    adminChangeMode: "runtime-config"
  }
];

export const aiBenchmarkGradePersistenceContract: AiBenchmarkGradePersistenceContract = {
  migrationFile: "infra/migrations/005_ai_provider_control_plane.sql",
  tables: [
    {
      name: "ai_provider_models",
      requiredColumns: ["id", "adapter_id", "provider", "capability", "model_id", "status", "cost_policy", "quality_gate"],
      piiFree: true,
      rawPromptStored: false
    },
    {
      name: "ai_route_policies",
      requiredColumns: [
        "id",
        "flow_id",
        "policy_version",
        "candidate_model_ids",
        "fallback_model_ids",
        "customer_error_policy",
        "queue_required"
      ],
      piiFree: true,
      rawPromptStored: false
    },
    {
      name: "ai_prompt_profiles",
      requiredColumns: ["id", "flow_id", "adapter_id", "model_id", "prompt_version", "request_defaults", "schema_contract"],
      piiFree: true,
      rawPromptStored: false
    },
    {
      name: "ai_benchmark_runs",
      requiredColumns: ["id", "run_id", "flow_id", "story_id", "status", "evidence", "pii_free", "raw_prompt_stored"],
      piiFree: true,
      rawPromptStored: false
    },
    {
      name: "ai_benchmark_grades",
      requiredColumns: [
        "id",
        "benchmark_run_id",
        "reviewer_id",
        "product_score",
        "contract_score",
        "route_reliability_score",
        "grade_status"
      ],
      piiFree: true,
      rawPromptStored: false
    }
  ]
};

export const aiProviderControlPlaneModel = buildAiProviderControlPlaneModel();

export function buildAiProviderControlPlaneModel(input: AiProviderControlPlaneInput = {}): AiProviderControlPlaneModel {
  const aiFlowSummary = input.aiFlowSummary ?? summarizeAiFlowConfigs();
  const benchmarkModel = input.benchmarkModel ?? benchmarkResultsModel;
  const benchmarkRecords = input.benchmarkRecords ?? benchmarkModel.records;
  const catalog = input.catalog ?? aiProviderModelCatalog;
  const promptProfiles = input.promptProfiles ?? aiPromptProfiles;
  const routePolicies = input.routePolicies ?? aiRoutePolicies;
  const persistence = input.persistence ?? aiBenchmarkGradePersistenceContract;
  const scorecards = catalog.map((entry) =>
    buildAiModelScorecard(entry, {
      benchmarkRecords,
      usageEvents: input.usageEvents ?? []
    })
  );
  const routeRecommendations = routePolicies.map((policy) => buildRouteRecommendation(policy, scorecards));
  const blockers = buildPromotionBlockers(routeRecommendations, benchmarkModel);
  const contractIssues = validateAiProviderControlPlaneModel({
    summary: emptySummary(),
    catalog,
    promptProfiles,
    routePolicies,
    scorecards,
    routeRecommendations,
    persistence,
    benchmarkRecommendation: benchmarkModel.recommendation,
    blockers,
    contractIssues: []
  }, aiFlowSummary);

  return {
    summary: {
      catalogModels: catalog.length,
      routePolicies: routePolicies.length,
      promptProfiles: promptProfiles.length,
      persistedBenchmarkTables: persistence.tables.length,
      promotableModels: scorecards.filter((scorecard) => scorecard.adminStatus === "promotable").length,
      benchmarkRequiredModels: scorecards.filter((scorecard) => scorecard.adminStatus === "benchmark-required").length,
      blockedModels: scorecards.filter((scorecard) => scorecard.adminStatus === "blocked").length,
      promotionBlockers: blockers.length
    },
    catalog,
    promptProfiles,
    routePolicies,
    scorecards,
    routeRecommendations,
    persistence,
    benchmarkRecommendation: benchmarkModel.recommendation,
    blockers,
    contractIssues
  };
}

export function validateAiProviderControlPlaneModel(
  model: AiProviderControlPlaneModel,
  aiFlowSummary: AiFlowConfigSummary = summarizeAiFlowConfigs()
): string[] {
  const issues: string[] = [];
  const catalogById = new Map(model.catalog.map((entry) => [entry.id, entry]));
  const flowIds = new Set<string>(aiFlowSummary.flows.map((flow) => flow.flowId));
  const promptProfileIds = new Set(model.promptProfiles.map((profile) => profile.id));
  const tableNames = new Set(model.persistence.tables.map((table) => table.name));

  if (catalogById.size !== model.catalog.length) issues.push("AI provider model catalog ids must be unique.");

  for (const entry of model.catalog) {
    if (!promptProfileIds.has(entry.defaultPromptProfileId)) {
      issues.push(`Model ${entry.id} references missing prompt profile ${entry.defaultPromptProfileId}.`);
    }
    if (entry.qualityGate.productScore < 0 || entry.qualityGate.contractScore < 0 || entry.qualityGate.routeReliabilityScore < 0) {
      issues.push(`Model ${entry.id} quality gates must be non-negative.`);
    }
  }

  for (const profile of model.promptProfiles) {
    if (!flowIds.has(profile.flowId)) issues.push(`Prompt profile ${profile.id} references unknown AI flow ${profile.flowId}.`);
    const matchingEntry = model.catalog.find((entry) => entry.adapterId === profile.adapterId && entry.modelId === profile.modelId);
    if (!matchingEntry) issues.push(`Prompt profile ${profile.id} is not attached to a catalog model.`);
  }

  for (const policy of model.routePolicies) {
    if (!flowIds.has(policy.flowId)) issues.push(`Route policy ${policy.id} references unknown AI flow ${policy.flowId}.`);
    if (policy.customerErrorPolicy !== "generic-status-only") {
      issues.push(`Route policy ${policy.id} must not surface provider-specific errors to customers.`);
    }
    if (policy.capability === "image-generation" && !policy.queueRequired) {
      issues.push(`Image route policy ${policy.id} must require queue-backed execution.`);
    }
    if (policy.maxEstimatedCostCentsPerRequest < 0 || policy.monthlyBudgetCents < 0 || policy.rateLimitPerMinute < 0) {
      issues.push(`Route policy ${policy.id} budget and rate controls must be non-negative.`);
    }
    for (const modelId of [...policy.primaryModelIds, ...policy.fallbackModelIds]) {
      const entry = catalogById.get(modelId);
      if (!entry) {
        issues.push(`Route policy ${policy.id} references missing model ${modelId}.`);
      } else if (entry.capability !== policy.capability) {
        issues.push(`Route policy ${policy.id} model ${modelId} has capability ${entry.capability}, not ${policy.capability}.`);
      }
    }
  }

  for (const requiredTable of ["ai_provider_models", "ai_route_policies", "ai_prompt_profiles", "ai_benchmark_runs", "ai_benchmark_grades"]) {
    if (!tableNames.has(requiredTable)) issues.push(`Benchmark persistence contract missing ${requiredTable}.`);
  }
  for (const table of model.persistence.tables) {
    if (!table.piiFree || table.rawPromptStored) {
      issues.push(`Benchmark persistence table ${table.name} must stay PII-free and avoid raw prompt storage.`);
    }
  }
  const gradeTable = model.persistence.tables.find((table) => table.name === "ai_benchmark_grades");
  for (const column of ["product_score", "contract_score", "route_reliability_score", "grade_status"]) {
    if (!gradeTable?.requiredColumns.includes(column)) issues.push(`ai_benchmark_grades must include ${column}.`);
  }

  return issues;
}

export function buildAiModelScorecard(
  entry: AiProviderCatalogEntry,
  input: { benchmarkRecords?: BenchmarkResultRecord[]; usageEvents?: ProviderCallEvent[] } = {}
): AiModelScorecard {
  const records = (input.benchmarkRecords ?? benchmarkResultsModel.records)
    .filter((record) => benchmarkRecordMatchesCatalogEntry(record, entry))
    .sort((first, second) => second.createdAtIso.localeCompare(first.createdAtIso));
  const graded = records.filter((record) => typeof record.productScore === "number" || typeof record.contractScore === "number");
  const best = [...graded].sort((first, second) => (second.productScore ?? 0) - (first.productScore ?? 0))[0];
  const latest = records[0];
  const benchmarkReliability = records.length > 0
    ? Math.round((records.filter((record) => record.status === "succeeded").length / records.length) * 100)
    : undefined;
  const ledgerEvents = (input.usageEvents ?? []).filter((event) => event.adapterId === entry.adapterId);
  const ledgerReliability = ledgerEvents.length > 0
    ? Math.round((ledgerEvents.filter((event) => event.status === "succeeded" || event.status === "reserved").length / ledgerEvents.length) * 100)
    : undefined;
  const routeReliabilityScore = ledgerReliability ?? benchmarkReliability;
  const bestProductScore = best?.productScore;
  const bestContractScore = best?.contractScore;
  const blockers = uniqueStrings([...entry.operatorNotes, ...(best?.blockers ?? []), ...(latest?.blockers ?? [])]);
  const providerFailureCount =
    records.filter((record) => record.status === "failed" || record.status === "blocked").length +
    ledgerEvents.filter((event) => event.status === "failed" || event.status === "blocked").length;

  return {
    modelId: entry.modelId,
    catalogEntryId: entry.id,
    adapterId: entry.adapterId,
    provider: entry.provider,
    capability: entry.capability,
    status: entry.status,
    adminStatus: modelAdminStatus(entry, {
      manualGrades: graded.length,
      bestProductScore,
      bestContractScore,
      routeReliabilityScore,
      providerFailureCount
    }),
    benchmarkRuns: records.length,
    manualGrades: graded.length,
    bestProductScore,
    bestContractScore,
    latestProductScore: latest?.productScore,
    latestContractScore: latest?.contractScore,
    routeReliabilityScore,
    providerFailureCount,
    latestEvidencePath: latest?.evidence.manualGradePath ?? latest?.evidence.summaryPath,
    blockers
  };
}

function buildRouteRecommendation(policy: AiRoutePolicy, scorecards: AiModelScorecard[]): AiRouteRecommendation {
  const candidateModelIds = [...policy.primaryModelIds, ...policy.fallbackModelIds];
  const candidateScorecards = candidateModelIds
    .map((modelId) => scorecards.find((scorecard) => scorecard.catalogEntryId === modelId))
    .filter((scorecard): scorecard is AiModelScorecard => Boolean(scorecard));
  const promotable = candidateScorecards.find(
    (scorecard) =>
      scorecard.adminStatus === "promotable" &&
      (scorecard.bestProductScore ?? 0) >= policy.minProductScore &&
      (scorecard.bestContractScore ?? 0) >= policy.minContractScore &&
      (scorecard.routeReliabilityScore ?? 0) >= policy.minRouteReliabilityScore
  );
  const unbenchmarked = candidateScorecards.filter((scorecard) => scorecard.adminStatus === "benchmark-required");

  if (promotable) {
    return {
      policyId: policy.id,
      flowId: policy.flowId,
      status: "promotable",
      selectedModelIds: [promotable.catalogEntryId],
      candidateModelIds: policy.primaryModelIds,
      fallbackModelIds: policy.fallbackModelIds,
      rationale: `${promotable.provider} ${promotable.modelId} clears the configured route gates.`,
      blockers: []
    };
  }

  return {
    policyId: policy.id,
    flowId: policy.flowId,
    status: unbenchmarked.length > 0 ? "benchmark-required" : "blocked",
    selectedModelIds: [],
    candidateModelIds: policy.primaryModelIds,
    fallbackModelIds: policy.fallbackModelIds,
    rationale:
      unbenchmarked.length > 0
        ? "At least one configured model still needs persisted benchmark grades before promotion."
        : "Configured candidates do not clear product, contract, reliability, or provider-operability gates.",
    blockers: uniqueStrings(
      candidateScorecards.flatMap((scorecard) => [
        `${scorecard.catalogEntryId}: ${scorecard.adminStatus}`,
        ...scorecard.blockers.slice(0, 2)
      ])
    ).slice(0, 8)
  };
}

function modelAdminStatus(
  entry: AiProviderCatalogEntry,
  scores: {
    manualGrades: number;
    bestProductScore?: number;
    bestContractScore?: number;
    routeReliabilityScore?: number;
    providerFailureCount: number;
  }
): AiModelAdminStatus {
  if (entry.status === "blocked") return "blocked";
  if (scores.manualGrades === 0) return "benchmark-required";
  if ((scores.bestProductScore ?? 0) < entry.qualityGate.productScore) return "needs-product-work";
  if ((scores.bestContractScore ?? 0) < entry.qualityGate.contractScore) return "review-required";
  if ((scores.routeReliabilityScore ?? 100) < entry.qualityGate.routeReliabilityScore) return "review-required";
  if (scores.providerFailureCount > 0) return "review-required";
  return "promotable";
}

function benchmarkRecordMatchesCatalogEntry(record: BenchmarkResultRecord, entry: AiProviderCatalogEntry): boolean {
  if (entry.capability === "text-chat") {
    return (
      record.textProvider === entry.adapterId &&
      (record.textModel === entry.modelId ||
        entry.benchmarkModelAliases.includes(record.textModel) ||
        entry.benchmarkCandidateAliases.includes(record.textCandidateId))
    );
  }
  const benchmarkImageModelId = entry.modelId.startsWith("text2img:") ? "text2img" : entry.modelId;
  return (
    record.imageProvider === entry.adapterId &&
    (record.imageModel === benchmarkImageModelId ||
      entry.benchmarkModelAliases.includes(record.imageModel) ||
      entry.benchmarkCandidateAliases.includes(record.imageCandidateId))
  );
}

function buildPromotionBlockers(routeRecommendations: AiRouteRecommendation[], benchmarkModel: BenchmarkResultsModel): string[] {
  return uniqueStrings([
    ...routeRecommendations
      .filter((recommendation) => recommendation.status !== "promotable")
      .map((recommendation) => `${recommendation.flowId}: ${recommendation.rationale}`),
    ...routeRecommendations.flatMap((recommendation) => recommendation.blockers),
    ...benchmarkModel.remainingBlockers
  ]).slice(0, 12);
}

function emptySummary(): AiProviderControlPlaneSummary {
  return {
    catalogModels: 0,
    routePolicies: 0,
    promptProfiles: 0,
    persistedBenchmarkTables: 0,
    promotableModels: 0,
    benchmarkRequiredModels: 0,
    blockedModels: 0,
    promotionBlockers: 0
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
