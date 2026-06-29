export const productionCardCopyProviderId = "cloudflare-workers-ai-chat";
export const productionCardCopyModel = "@cf/qwen/qwen3-30b-a3b-fp8";
export const productionCardCopyModelOverrideEnvKey = "";
export const cloudflareTextModelEnvKeys = Object.freeze([]);
export const cloudflareCardCopyTextModelEnvKeys = Object.freeze([]);
export const cloudflareTextRequiredCredentialGroups = Object.freeze([
  Object.freeze(["CLOUDFLARE_ACCOUNT_ID"]),
  Object.freeze(["CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", "CLOUDFLARE_API_TOKEN"])
]);
export const hostedAiCardCopySetupKeys = Object.freeze([
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN",
  "CLOUDFLARE_API_TOKEN"
]);
export const localProductionTextComfyGuidance = Object.freeze({
  workflow: "local-production-text-comfy",
  requiresHostedImageKeys: false,
  detail:
    "The production-text local Comfy path only needs hosted Cloudflare text setup for card copy. Do not require Cloudflare image tokens or image model keys unless you are validating the live Cloudflare image lane."
});

export function buildAiProviderSetupProfile() {
  return {
    cardCopy: {
      providerId: productionCardCopyProviderId,
      defaultModel: productionCardCopyModel,
      accountEnvKey: "CLOUDFLARE_ACCOUNT_ID",
      tokenEnvKeys: ["CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", "CLOUDFLARE_API_TOKEN"],
      requiredCredentialGroups: [...cloudflareTextRequiredCredentialGroups],
      modelEnvKeys: [],
      modelOverrideEnvKey: productionCardCopyModelOverrideEnvKey
    },
    localProductionTextComfy: {
      ...localProductionTextComfyGuidance
    }
  };
}

export function isProductionCardCopyModelOverrideKey(envKey) {
  return Boolean(productionCardCopyModelOverrideEnvKey) && String(envKey ?? "").trim() === productionCardCopyModelOverrideEnvKey;
}
