import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAiProviderSetupProfile,
  productionCardCopyModel,
  productionCardCopyModelOverrideEnvKey,
  productionCardCopyProviderId
} from "./aiProviderSetupProfile.mjs";

const repoRoot = "D:/manny/Documents/CustomCard";

describe("AI provider setup profile drift guards", () => {
  it("keeps the shared Cloudflare card-copy contract pinned across code and docs", () => {
    const profile = buildAiProviderSetupProfile();
    const flowConfigSource = readFileSync(resolve(repoRoot, "src/aiFlowConfigData.mjs"), "utf8");
    const providerRuntimeSource = readFileSync(resolve(repoRoot, "src/providerRuntime.ts"), "utf8");
    const controlPlaneSource = readFileSync(resolve(repoRoot, "src/aiProviderControlPlane.ts"), "utf8");
    const cloudflareSetupDoc = readFileSync(resolve(repoRoot, "docs/cloudflare-workers-ai-setup.md"), "utf8");
    const envExample = readFileSync(resolve(repoRoot, "infra/env/.env.example"), "utf8");

    expect(profile.cardCopy).toMatchObject({
      providerId: productionCardCopyProviderId,
      defaultModel: productionCardCopyModel,
      modelOverrideEnvKey: productionCardCopyModelOverrideEnvKey
    });
    expect(profile.localProductionTextComfy.requiresHostedImageKeys).toBe(false);

    expect(flowConfigSource).toMatch(/flowId: "card-copy"[\s\S]*defaultPrimaryAdapterId: "cloudflare-workers-ai-chat"/);
    expect(flowConfigSource).toContain('"cloudflare-workers-ai-chat": productionCardCopyModel');
    expect(providerRuntimeSource).toContain('"cloudflare-workers-ai-chat": productionCardCopyModel');
    expect(controlPlaneSource).toContain('id: aiRoutePolicyIdsByFlowId["card-copy"] ?? "card-copy-route-v1"');
    expect(controlPlaneSource).toContain(`modelId: "${productionCardCopyModel}"`);

    expect(cloudflareSetupDoc).toContain(`${productionCardCopyModelOverrideEnvKey}=${productionCardCopyModel}`);
    expect(cloudflareSetupDoc).toContain(`CUSTOMCARD_CLOUDFLARE_TEXT_MODEL=${productionCardCopyModel}`);
    expect(cloudflareSetupDoc).toContain(`CLOUDFLARE_WORKERS_AI_TEXT_MODEL=${productionCardCopyModel}`);
    expect(envExample).toContain(`${productionCardCopyModelOverrideEnvKey}=${productionCardCopyModel}`);
    expect(envExample).toContain(`CUSTOMCARD_CLOUDFLARE_TEXT_MODEL=${productionCardCopyModel}`);
    expect(envExample).toContain(`CLOUDFLARE_WORKERS_AI_TEXT_MODEL=${productionCardCopyModel}`);
  });
});
