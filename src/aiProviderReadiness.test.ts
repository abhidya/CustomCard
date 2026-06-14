import { describe, expect, it } from "vitest";
import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  validateAiProviderReadiness,
  type AiProviderReadinessItem
} from "./aiProviderReadiness";

describe("AI provider readiness", () => {
  it("tracks text and image provider readiness without live model calls", () => {
    const summary = summarizeAiProviderReadiness();

    expect(validateAiProviderReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 4,
      evidenceMissing: 4,
      textProviderContracts: 16,
      imageProviderContracts: 17,
      localFallbacks: 0,
      promptAuditRequired: 6,
      humanReviewRequired: 5,
      liveProviderCallsEnabled: 0,
      externalNetworkCalls: 0,
      productionTrafficEnabled: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Approved model allowlist",
        "Prompt audit report",
        "Generated image sample set",
        "Provider spend alert export",
        "Rollback runbook"
      ])
    );
  });

  it("covers all existing AI text and image adapters explicitly without local fallbacks", () => {
    const inventory = aiProviderReadinessItems.find((item) => item.id === "ai-adapter-inventory");
    const imageQa = aiProviderReadinessItems.find((item) => item.id === "image-print-qa");

    expect(inventory?.textAdapterIds).toEqual(
      expect.arrayContaining([
        "openai-responses-chat",
        "cloudflare-workers-ai-chat",
        "anthropic-messages-chat",
        "google-gemini-chat",
        "mistral-chat",
        "self-hosted-openai-compatible-chat"
      ])
    );
    expect(inventory?.imageAdapterIds).toEqual(
      expect.arrayContaining([
        "openai-images",
        "cloudflare-workers-ai-image",
        "stability-stable-image",
        "deepai-text2img-image",
        "replicate-image",
        "fal-image",
        "bfl-flux-image",
        "adobe-firefly-image",
        "recraft-image",
        "luma-image"
      ])
    );
    expect(inventory?.localFallbackAdapterIds).toEqual([]);
    expect(imageQa).toMatchObject({
      humanReviewRequired: true,
      liveProviderCallsEnabled: false,
      externalNetworkCalls: false,
      productionTrafficEnabled: false
    });
    expect(imageQa?.currentEvidence).toEqual(
      expect.arrayContaining(["folded-card-four-panel-v1 provider prompt contract"])
    );
  });

  it("flags unsafe AI launch claims before admin or API readiness can expose them", () => {
    const unsafeItems: AiProviderReadinessItem[] = [
      {
        ...aiProviderReadinessItems[0],
        liveProviderCallsEnabled: true,
        externalNetworkCalls: true,
        productionTrafficEnabled: true,
        requiredEvidence: ["one"],
        currentEvidence: [],
        modelFamilies: []
      } as unknown as AiProviderReadinessItem,
      {
        ...aiProviderReadinessItems[0]
      }
    ];

    expect(validateAiProviderReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate AI provider readiness item: ai-adapter-inventory.",
        "AI provider readiness item ai-adapter-inventory must keep liveProviderCallsEnabled=false.",
        "AI provider readiness item ai-adapter-inventory must not require live external network calls.",
        "AI provider readiness item ai-adapter-inventory must keep productionTrafficEnabled=false.",
        "AI provider readiness item ai-adapter-inventory must list at least two required evidence items.",
        "AI provider readiness item ai-adapter-inventory must list current repo-local evidence.",
        "AI provider readiness item ai-adapter-inventory must list covered model families.",
        "Missing AI provider readiness item: prompt-brand-safety-review.",
        "Missing AI provider readiness item: image-print-qa."
      ])
    );

    expect(
      validateAiProviderReadiness([
        {
          ...aiProviderReadinessItems.find((item) => item.id === "image-print-qa")!,
          humanReviewRequired: false,
          imageAdapterIds: ["openai-images"]
        },
        {
          ...aiProviderReadinessItems.find((item) => item.id === "prompt-brand-safety-review")!,
          promptAuditRequired: false
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Missing AI provider readiness item: ai-adapter-inventory.",
        "AI prompt and brand safety review must require prompt audit and human review.",
        "AI image and print QA must require human review and cover every image adapter contract."
      ])
    );
  });
});
