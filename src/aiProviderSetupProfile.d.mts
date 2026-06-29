export const productionCardCopyProviderId: "cloudflare-workers-ai-chat";
export const productionCardCopyModel: "@cf/qwen/qwen3-30b-a3b-fp8";
export const productionCardCopyModelOverrideEnvKey: "";
export const cloudflareTextModelEnvKeys: readonly [];
export const cloudflareCardCopyTextModelEnvKeys: readonly string[];
export const cloudflareTextRequiredCredentialGroups: readonly (readonly string[])[];
export const hostedAiCardCopySetupKeys: readonly string[];

export interface LocalProductionTextComfyGuidance {
  workflow: "local-production-text-comfy";
  requiresHostedImageKeys: false;
  detail: string;
}

export interface AiProviderSetupProfile {
  cardCopy: {
    providerId: typeof productionCardCopyProviderId;
    defaultModel: typeof productionCardCopyModel;
    accountEnvKey: "CLOUDFLARE_ACCOUNT_ID";
    tokenEnvKeys: string[];
    requiredCredentialGroups: readonly (readonly string[])[];
    modelEnvKeys: string[];
    modelOverrideEnvKey: typeof productionCardCopyModelOverrideEnvKey;
  };
  localProductionTextComfy: LocalProductionTextComfyGuidance;
}

export const localProductionTextComfyGuidance: LocalProductionTextComfyGuidance;
export function buildAiProviderSetupProfile(): AiProviderSetupProfile;
export function isProductionCardCopyModelOverrideKey(envKey: unknown): boolean;
