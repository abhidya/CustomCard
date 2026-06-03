import { describe, expect, it } from "vitest";
import {
  buildAdminPanelModel,
  buildCustomerChatTranscript,
  buildCustomerPanelModel,
  getAdaptersByCapability,
  providerCatalog,
  summarizeProviderCoverage,
  validateProviderCatalog,
  type ProviderCapability
} from "./providerCatalog";

describe("provider catalog", () => {
  it("covers every platform capability with a free local fallback", () => {
    const requiredCapabilities: ProviderCapability[] = [
      "auth",
      "event-import",
      "text-chat",
      "image-generation",
      "render-export",
      "memory",
      "vendor-handoff",
      "cloud-runtime",
      "notification"
    ];
    const summary = summarizeProviderCoverage();

    expect(summary.total).toBeGreaterThanOrEqual(39);
    expect(summary.capabilityCount).toBe(requiredCapabilities.length);

    for (const capability of requiredCapabilities) {
      const adapters = getAdaptersByCapability(capability);
      expect(adapters.length).toBeGreaterThan(0);
      expect(adapters.some((adapter) => adapter.status === "ready-local")).toBe(true);
    }
  });

  it("keeps external providers credential-gated with docs, env vars, and safety gates", () => {
    const externalLabels = [
      "OpenAI Responses chat",
      "Anthropic Messages chat",
      "Google Gemini chat",
      "Mistral chat",
      "Cohere chat",
      "Perplexity Sonar chat",
      "xAI chat",
      "Together chat",
      "OpenAI Images",
      "Google Gemini image",
      "Stability AI image",
      "Hugging Face chat",
      "Hugging Face image",
      "Replicate image",
      "Together image",
      "Ideogram image",
      "Leonardo image",
      "Gmail metadata adapter",
      "Google Calendar events",
      "Microsoft Graph mail",
      "Microsoft Graph calendar"
    ];

    for (const label of externalLabels) {
      const adapter = providerCatalog.find((candidate) => candidate.label === label);
      expect(adapter, label).toBeDefined();
      expect(adapter?.status).toBe("credential-gated");
      expect(adapter?.credentials.length).toBeGreaterThan(0);
      expect(adapter?.docsUrl).toMatch(/^https:\/\//);
      expect(adapter?.safetyGates.length).toBeGreaterThan(0);
    }
  });

  it("models admin deployment controls and blocks live vendor orders", () => {
    const admin = buildAdminPanelModel();

    expect(admin.coverage.requiredEnv).toContain("OPENAI_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("ANTHROPIC_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("STABILITY_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("HUGGINGFACE_API_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("MISTRAL_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("COHERE_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("PERPLEXITY_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("XAI_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("TOGETHER_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("IDEOGRAM_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("LEONARDO_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("MICROSOFT_CLIENT_ID");
    expect(admin.deploymentAdapters.map((adapter) => adapter.label)).toContain("Cheap droplet compose");
    expect(admin.blockedProviders.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining(["Walgreens live order", "CVS live order", "FedEx live print"])
    );
    expect(admin.blockedProviders.every((adapter) => adapter.status === "blocked")).toBe(true);
  });

  it("builds a customer panel model from ready paths plus gated provider choices", () => {
    const customer = buildCustomerPanelModel();
    const transcript = buildCustomerChatTranscript("Sara and Ahmed");

    expect(customer.primaryActions.map((action) => action.capability)).toEqual(
      expect.arrayContaining(["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"])
    );
    expect(customer.readyFallbacks.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining(["Local customer chat", "Browser SVG renderer", "Manual vendor handoff"])
    );
    expect(customer.chatProviders.length).toBeGreaterThanOrEqual(10);
    expect(customer.imageProviders.length).toBeGreaterThanOrEqual(10);
    expect(transcript.map((message) => message.text).join(" ")).toContain("Live AI and vendor orders stay off");
  });

  it("passes the catalog integrity validator", () => {
    expect(validateProviderCatalog()).toEqual([]);
  });
});
