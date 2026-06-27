export const productionTextPlannerPolicy = Object.freeze({
  minContextTokens: 8192,
  minOutputTokens: 3200,
  recommendedOutputTokens: 3200,
  minimumOpenWeightPlannerClass: "14B+ dense/open-weight planner or stronger hosted model",
  recommendedModels: [
    "koboldcpp/gemma-4-31B-it-Q4_K_M",
    "koboldcpp/Magistral-Small-2509-Q4_K_M",
    "koboldcpp/Qwen3-14B-Q4_K_M",
    "hosted/self-hosted GPT, Claude, Gemini, DeepSeek, Mistral, or Qwen 14B+ endpoint"
  ]
});

export function classifyProductionTextPlanner(modelName, options = {}) {
  const model = String(modelName || "").trim();
  const reportedContextTokens = positiveInteger(options.reportedContextTokens);
  const maxOutputTokens = positiveInteger(options.maxOutputTokens);
  const allowSmall = Boolean(options.allowSmall);
  const allowUnknownProductionModel = Boolean(options.allowUnknownProductionModel);
  const requireRuntimeBudget = Boolean(options.requireRuntimeBudget);
  const smallPlanner = isSmallPlanner(model);
  const qualityPlanner = isQualityPlanner(model);
  const blockers = [];
  const warnings = [];

  if (!model) {
    blockers.push("Planner model name is missing; pass -LocalLlmModel or expose it from /v1/models.");
  } else if (smallPlanner && !allowSmall) {
    blockers.push(
      `Planner model '${model}' is below the production model floor for production text and is smoke-only; use Gemma 31B, Magistral Small, Qwen3 14B+, or a stronger hosted planner.`
    );
  } else if (!smallPlanner && !qualityPlanner && !allowUnknownProductionModel) {
    blockers.push(`Planner model '${model}' is not on the production-suitable model allowlist.`);
  }

  if (!allowSmall && requireRuntimeBudget && maxOutputTokens && maxOutputTokens < productionTextPlannerPolicy.minOutputTokens) {
    blockers.push(
      `PlannerMaxTokens ${maxOutputTokens} is below the production minimum ${productionTextPlannerPolicy.minOutputTokens}; keep the full contract and use a stronger model/runtime.`
    );
  }
  if (!allowSmall && requireRuntimeBudget && !maxOutputTokens) {
    blockers.push("PlannerMaxTokens was not provided for production planner preflight.");
  }

  if (!allowSmall && requireRuntimeBudget && !reportedContextTokens) {
    blockers.push(
      `Planner context was not reported; prove ${productionTextPlannerPolicy.minContextTokens}+ context tokens for production evidence and treat finish_reason=length as wrong-runtime evidence.`
    );
  } else if (!allowSmall && reportedContextTokens && reportedContextTokens < productionTextPlannerPolicy.minContextTokens) {
    blockers.push(
      `Planner context ${reportedContextTokens} is below the production minimum ${productionTextPlannerPolicy.minContextTokens}; 4096-token local runs are smoke-only.`
    );
  } else if (allowSmall && reportedContextTokens && reportedContextTokens < productionTextPlannerPolicy.minContextTokens) {
    warnings.push(
      `Planner context ${reportedContextTokens} is below production minimum ${productionTextPlannerPolicy.minContextTokens}; this run is smoke/failure evidence only.`
    );
  } else if (!reportedContextTokens) {
    warnings.push(
      `Planner context was not reported; configure ${productionTextPlannerPolicy.minContextTokens}+ tokens and treat finish_reason=length as wrong-runtime evidence.`
    );
  }

  const productionSuitable = blockers.length === 0 && Boolean(model) && !smallPlanner && (qualityPlanner || allowUnknownProductionModel);
  return {
    model,
    smallPlanner,
    qualityPlanner,
    productionSuitable,
    classification: productionSuitable ? "production-suitable" : smallPlanner ? "smoke-only" : "blocked",
    reportedContextTokens: reportedContextTokens || null,
    maxOutputTokens: maxOutputTokens || null,
    minimumOpenWeightPlannerClass: productionTextPlannerPolicy.minimumOpenWeightPlannerClass,
    minContextTokens: productionTextPlannerPolicy.minContextTokens,
    minOutputTokens: productionTextPlannerPolicy.minOutputTokens,
    recommendedOutputTokens: productionTextPlannerPolicy.recommendedOutputTokens,
    recommendedModels: productionTextPlannerPolicy.recommendedModels,
    blockers,
    warnings
  };
}

export function isSmallPlanner(value) {
  return /(^|[-_/])(?:1\.5b|3b|4b|7b|8b)([-_/]|$)|local-qwen-card-copy/i.test(String(value || ""));
}

export function isQualityPlanner(value) {
  return /gemma.*31b|magistral-small|deepseekv4|qwen3.*(?:14b|30b|32b|235b)|mistral.*(?:small|large)|llama.*(?:70b|405b)|gpt-|claude|gemini|deepseek/i.test(String(value || ""));
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}
