import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aiRoutePolicyIdsByFlowId } from "./aiRoutePolicyIds.mjs";
import {
  buildAiProviderSetupProfile,
  cloudflareTextRequiredCredentialGroups,
  cloudflareTextModelEnvKeys,
  productionCardCopyModel,
  productionCardCopyModelOverrideEnvKey,
  productionCardCopyProviderId
} from "./aiProviderSetupProfile.mjs";
import { aiPromptProfiles, aiProviderModelCatalog, aiRoutePolicies } from "./aiProviderControlPlane";

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("AI provider setup profile drift guards", () => {
  it("keeps the shared Cloudflare card-copy contract pinned across code and docs", () => {
    const profile = buildAiProviderSetupProfile();
    const flowConfigSource = readFileSync(resolve(repoRoot, "src/aiFlowConfigData.mjs"), "utf8");
    const providerRuntimeSource = readFileSync(resolve(repoRoot, "src/providerRuntime.ts"), "utf8");
    const cloudflareSetupDoc = readFileSync(resolve(repoRoot, "docs/cloudflare-workers-ai-setup.md"), "utf8");
    const envExample = readFileSync(resolve(repoRoot, "infra/env/.env.example"), "utf8");
    const cardCopyRoutePolicyId = aiRoutePolicyIdsByFlowId["card-copy"];
    const cardCopyRoutePolicy = aiRoutePolicies.find((policy) => policy.id === cardCopyRoutePolicyId);
    const cardCopyPrimaryModels = aiProviderModelCatalog.filter((entry) =>
      cardCopyRoutePolicy?.primaryModelIds.includes(entry.id)
    );
    const qwenCardCopyCatalogEntry = aiProviderModelCatalog.find(
      (entry) => entry.adapterId === productionCardCopyProviderId && entry.modelId === productionCardCopyModel
    );
    const cardCopyPromptProfile = aiPromptProfiles.find((profile) => profile.flowId === "card-copy");

    expect(profile.cardCopy).toMatchObject({
      providerId: productionCardCopyProviderId,
      defaultModel: productionCardCopyModel,
      modelOverrideEnvKey: productionCardCopyModelOverrideEnvKey
    });
    expect(cloudflareTextRequiredCredentialGroups).toEqual([
      ["CLOUDFLARE_ACCOUNT_ID"],
      ["CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", "CLOUDFLARE_API_TOKEN"]
    ]);
    expect(cloudflareTextModelEnvKeys).toEqual([
      "CUSTOMCARD_CLOUDFLARE_TEXT_MODEL",
      "CLOUDFLARE_WORKERS_AI_TEXT_MODEL"
    ]);
    expect(cloudflareTextModelEnvKeys).not.toContain(productionCardCopyModelOverrideEnvKey);
    expect(profile.cardCopy.requiredCredentialGroups).toEqual(cloudflareTextRequiredCredentialGroups);
    expect(profile.cardCopy.modelEnvKeys).toEqual(
      expect.arrayContaining([productionCardCopyModelOverrideEnvKey, ...cloudflareTextModelEnvKeys])
    );
    expect(profile.localProductionTextComfy.requiresHostedImageKeys).toBe(false);

    expect(flowConfigSource).toMatch(/flowId: "card-copy"[\s\S]*defaultPrimaryAdapterId: "cloudflare-workers-ai-chat"/);
    expect(flowConfigSource).toContain('"cloudflare-workers-ai-chat": productionCardCopyModel');
    expect(providerRuntimeSource).toContain('"cloudflare-workers-ai-chat": productionCardCopyModel');
    expect(qwenCardCopyCatalogEntry).toMatchObject({
      id: "cloudflare-qwen3-30b-card-copy",
      adapterId: productionCardCopyProviderId,
      modelId: productionCardCopyModel
    });
    expect(cardCopyRoutePolicy).toMatchObject({
      id: cardCopyRoutePolicyId,
      flowId: "card-copy",
      primaryModelIds: [qwenCardCopyCatalogEntry?.id]
    });
    expect(cardCopyPrimaryModels).toHaveLength(1);
    expect(cardCopyPrimaryModels[0]).toMatchObject({
      id: qwenCardCopyCatalogEntry?.id,
      adapterId: productionCardCopyProviderId,
      modelId: productionCardCopyModel
    });
    expect(cardCopyPromptProfile).toMatchObject({
      flowId: "card-copy",
      adapterId: productionCardCopyProviderId,
      modelId: productionCardCopyModel
    });

    expect(cloudflareSetupDoc).toContain(`${productionCardCopyModelOverrideEnvKey}=${productionCardCopyModel}`);
    expect(cloudflareSetupDoc).toContain(`CUSTOMCARD_CLOUDFLARE_TEXT_MODEL=${productionCardCopyModel}`);
    expect(cloudflareSetupDoc).toContain(`CLOUDFLARE_WORKERS_AI_TEXT_MODEL=${productionCardCopyModel}`);
    expect(envExample).toContain(`${productionCardCopyModelOverrideEnvKey}=${productionCardCopyModel}`);
    expect(envExample).toContain(`CUSTOMCARD_CLOUDFLARE_TEXT_MODEL=${productionCardCopyModel}`);
    expect(envExample).toContain(`CLOUDFLARE_WORKERS_AI_TEXT_MODEL=${productionCardCopyModel}`);
  });
});
