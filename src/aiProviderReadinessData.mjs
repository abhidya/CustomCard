const requiredAiReadinessIds = [
  "ai-adapter-inventory",
  "model-allowlist-and-env-gates",
  "prompt-brand-safety-review",
  "pii-memory-minimization",
  "image-print-qa",
  "spend-budget-rate-limits",
  "evaluation-fixtures",
  "release-operations"
];

const requiredTextAdapterIds = [
  "openai-responses-chat",
  "azure-openai-chat",
  "aws-bedrock-converse-chat",
  "anthropic-messages-chat",
  "google-gemini-chat",
  "huggingface-chat",
  "mistral-chat",
  "cohere-chat",
  "perplexity-sonar-chat",
  "xai-chat",
  "together-chat",
  "groq-chat",
  "deepseek-chat",
  "fireworks-chat",
  "self-hosted-openai-compatible-chat"
];

const requiredImageAdapterIds = [
  "openai-images",
  "azure-openai-image",
  "aws-bedrock-image",
  "google-gemini-image",
  "stability-stable-image",
  "huggingface-image",
  "replicate-image",
  "together-image",
  "ideogram-image",
  "leonardo-image",
  "fal-image",
  "bfl-flux-image"
];

const requiredLocalFallbackAdapterIds = ["deterministic-customer-chat", "browser-svg-renderer"];

export const aiProviderReadinessItems = [
  {
    id: "ai-adapter-inventory",
    label: "AI adapter inventory",
    lane: "adapter-inventory",
    status: "repo-local-ready",
    textAdapterIds: requiredTextAdapterIds,
    imageAdapterIds: requiredImageAdapterIds,
    localFallbackAdapterIds: requiredLocalFallbackAdapterIds,
    modelFamilies: ["text-chat", "image-generation"],
    promptAuditRequired: false,
    humanReviewRequired: false,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["providerCatalog text/image adapters", "providerRuntime no-network request contracts"],
    requiredEvidence: ["Adapter owner approval", "Provider terms review", "Model capability owner review"],
    blocker: "Live provider traffic still requires credentials, approvals, spend limits, and quality evidence."
  },
  {
    id: "model-allowlist-and-env-gates",
    label: "Model allowlist and env gates",
    lane: "model-allowlist",
    status: "repo-local-ready",
    textAdapterIds: [],
    imageAdapterIds: [],
    localFallbackAdapterIds: [],
    modelFamilies: ["text-chat", "image-generation", "self-hosted"],
    promptAuditRequired: true,
    humanReviewRequired: false,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["providerRuntime model allowlist gate", "providerGovernance budget policies", "required env surface"],
    requiredEvidence: ["Approved model allowlist", "Provider key inventory", "Network allowlist export"],
    blocker: "No approved live model allowlist or provider-key inventory is attached."
  },
  {
    id: "prompt-brand-safety-review",
    label: "Prompt and brand safety review",
    lane: "prompt-safety",
    status: "evidence-missing",
    textAdapterIds: [],
    imageAdapterIds: [],
    localFallbackAdapterIds: [],
    modelFamilies: ["text-chat", "image-generation"],
    promptAuditRequired: true,
    humanReviewRequired: true,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["deterministic local chat transcript", "card copy tests", "blocked live AI production gate"],
    requiredEvidence: ["Prompt audit report", "Brand safety review", "Unsafe-output red-team transcript"],
    blocker: "No prompt audit, brand safety review, or red-team transcript is attached."
  },
  {
    id: "pii-memory-minimization",
    label: "PII and memory minimization",
    lane: "privacy",
    status: "repo-local-ready",
    textAdapterIds: [],
    imageAdapterIds: [],
    localFallbackAdapterIds: [],
    modelFamilies: ["text-chat", "image-generation"],
    promptAuditRequired: true,
    humanReviewRequired: true,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["providerRuntime redaction tests", "approved-memory-only runtime classifications", "data request contract"],
    requiredEvidence: ["Redacted live payload sample", "Memory minimization signoff", "Provider DPA review"],
    blocker: "Production-equivalent redacted AI payload samples and DPA review are not attached."
  },
  {
    id: "image-print-qa",
    label: "Image and print QA",
    lane: "image-print-qa",
    status: "evidence-missing",
    textAdapterIds: [],
    imageAdapterIds: requiredImageAdapterIds,
    localFallbackAdapterIds: ["browser-svg-renderer"],
    modelFamilies: ["image-generation"],
    promptAuditRequired: true,
    humanReviewRequired: true,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["browser SVG renderer", "local print package export", "print proof checks"],
    requiredEvidence: ["Generated image sample set", "Human print approval", "Physical print QA sample"],
    blocker: "No live generated image sample, human approval transcript, or physical print QA evidence is attached."
  },
  {
    id: "spend-budget-rate-limits",
    label: "Spend budget and rate limits",
    lane: "cost-control",
    status: "repo-local-ready",
    textAdapterIds: [],
    imageAdapterIds: [],
    localFallbackAdapterIds: [],
    modelFamilies: ["text-chat", "image-generation"],
    promptAuditRequired: false,
    humanReviewRequired: false,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["providerGovernance monthly budget cap", "capacity image generation budget", "queue-backed profiles"],
    requiredEvidence: ["Provider spend alert export", "Tenant budget approval", "Rate-limit dashboard screenshot"],
    blocker: "No live provider spend dashboard, tenant budget approval, or rate-limit export is attached."
  },
  {
    id: "evaluation-fixtures",
    label: "Evaluation fixtures",
    lane: "quality-evaluation",
    status: "evidence-missing",
    textAdapterIds: requiredTextAdapterIds.slice(0, 5),
    imageAdapterIds: requiredImageAdapterIds.slice(0, 5),
    localFallbackAdapterIds: requiredLocalFallbackAdapterIds,
    modelFamilies: ["text-chat", "image-generation"],
    promptAuditRequired: true,
    humanReviewRequired: true,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["deterministic fixture tests", "local customer chat transcript", "image/render choice contract"],
    requiredEvidence: ["Golden prompt suite", "Model comparison scores", "Regression review transcript"],
    blocker: "No model-output evaluation suite or scored provider comparison is attached."
  },
  {
    id: "release-operations",
    label: "AI release operations",
    lane: "release-operations",
    status: "evidence-missing",
    textAdapterIds: [],
    imageAdapterIds: [],
    localFallbackAdapterIds: [],
    modelFamilies: ["text-chat", "image-generation"],
    promptAuditRequired: true,
    humanReviewRequired: true,
    liveProviderCallsEnabled: false,
    externalNetworkCalls: false,
    productionTrafficEnabled: false,
    currentEvidence: ["production launch gate", "external audit readiness register", "provider governance doctor"],
    requiredEvidence: ["Rollback runbook", "A/B rollout plan", "Incident owner signoff"],
    blocker: "No live AI rollback runbook, rollout plan, or incident owner signoff is attached."
  }
];

export function summarizeAiProviderReadiness(items = aiProviderReadinessItems) {
  return {
    total: items.length,
    repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
    evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
    textProviderContracts: new Set(items.flatMap((item) => item.textAdapterIds)).size,
    imageProviderContracts: new Set(items.flatMap((item) => item.imageAdapterIds)).size,
    localFallbacks: new Set(items.flatMap((item) => item.localFallbackAdapterIds)).size,
    promptAuditRequired: items.filter((item) => item.promptAuditRequired).length,
    humanReviewRequired: items.filter((item) => item.humanReviewRequired).length,
    liveProviderCallsEnabled: items.filter((item) => item.liveProviderCallsEnabled).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    productionTrafficEnabled: items.filter((item) => item.productionTrafficEnabled).length,
    requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort(),
    blockers: validateAiProviderReadiness(items)
  };
}

export function validateAiProviderReadiness(items = aiProviderReadinessItems) {
  const issues = [];
  const itemsById = new Map();

  for (const item of items) {
    if (itemsById.has(item.id)) issues.push(`Duplicate AI provider readiness item: ${item.id}.`);
    itemsById.set(item.id, item);

    if (item.liveProviderCallsEnabled !== false) {
      issues.push(`AI provider readiness item ${item.id} must keep liveProviderCallsEnabled=false.`);
    }
    if (item.externalNetworkCalls !== false) {
      issues.push(`AI provider readiness item ${item.id} must not require live external network calls.`);
    }
    if (item.productionTrafficEnabled !== false) {
      issues.push(`AI provider readiness item ${item.id} must keep productionTrafficEnabled=false.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`AI provider readiness item ${item.id} must list at least two required evidence items.`);
    }
    if (item.currentEvidence.length < 1) {
      issues.push(`AI provider readiness item ${item.id} must list current repo-local evidence.`);
    }
    if (item.modelFamilies.length < 1) {
      issues.push(`AI provider readiness item ${item.id} must list covered model families.`);
    }
    if (item.status === "evidence-missing" && !item.blocker) {
      issues.push(`AI provider readiness item ${item.id} must explain its evidence blocker.`);
    }
  }

  for (const requiredId of requiredAiReadinessIds) {
    if (!itemsById.has(requiredId)) issues.push(`Missing AI provider readiness item: ${requiredId}.`);
  }

  const inventory = itemsById.get("ai-adapter-inventory");
  if (inventory) {
    for (const adapterId of requiredTextAdapterIds) {
      if (!inventory.textAdapterIds.includes(adapterId)) issues.push(`AI adapter inventory must include text adapter: ${adapterId}.`);
    }
    for (const adapterId of requiredImageAdapterIds) {
      if (!inventory.imageAdapterIds.includes(adapterId)) issues.push(`AI adapter inventory must include image adapter: ${adapterId}.`);
    }
    for (const adapterId of requiredLocalFallbackAdapterIds) {
      if (!inventory.localFallbackAdapterIds.includes(adapterId)) issues.push(`AI adapter inventory must include fallback adapter: ${adapterId}.`);
    }
  }

  const promptSafety = itemsById.get("prompt-brand-safety-review");
  if (promptSafety && (!promptSafety.promptAuditRequired || !promptSafety.humanReviewRequired)) {
    issues.push("AI prompt and brand safety review must require prompt audit and human review.");
  }

  const imageQa = itemsById.get("image-print-qa");
  if (imageQa && (!imageQa.humanReviewRequired || imageQa.imageAdapterIds.length < requiredImageAdapterIds.length)) {
    issues.push("AI image and print QA must require human review and cover every image adapter contract.");
  }

  return issues;
}
