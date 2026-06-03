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
      "contact-import",
      "text-chat",
      "image-generation",
      "render-export",
      "memory",
      "vendor-handoff",
      "cloud-runtime",
      "notification"
    ];
    const summary = summarizeProviderCoverage();

    expect(summary.total).toBeGreaterThanOrEqual(67);
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
      "Auth0 OIDC auth",
      "Clerk session auth",
      "Supabase Auth",
      "Firebase Auth",
      "Amazon Cognito hosted auth",
      "Google People contacts",
      "Microsoft Graph contacts",
      "CardDAV address book",
      "Azure OpenAI chat",
      "Amazon Bedrock Converse chat",
      "Anthropic Messages chat",
      "Google Gemini chat",
      "Mistral chat",
      "Cohere chat",
      "Perplexity Sonar chat",
      "xAI chat",
      "Together chat",
      "Groq chat",
      "DeepSeek chat",
      "Fireworks chat",
      "OpenAI Images",
      "Azure OpenAI image",
      "Amazon Bedrock image",
      "Google Gemini image",
      "Stability AI image",
      "Hugging Face chat",
      "Hugging Face image",
      "Replicate image",
      "Together image",
      "Ideogram image",
      "Leonardo image",
      "fal image",
      "Black Forest Labs image",
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
    expect(admin.coverage.requiredEnv).toContain("AUTH0_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("AUTH0_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("AUTH0_CLIENT_SECRET");
    expect(admin.coverage.requiredEnv).toContain("AUTH0_AUDIENCE");
    expect(admin.coverage.requiredEnv).toContain("CUSTOMCARD_AUTH_CALLBACK_URL");
    expect(admin.coverage.requiredEnv).toContain("CLERK_SECRET_KEY");
    expect(admin.coverage.requiredEnv).toContain("CLERK_JWT_KEY");
    expect(admin.coverage.requiredEnv).toContain("CLERK_AUTHORIZED_PARTIES");
    expect(admin.coverage.requiredEnv).toContain("SUPABASE_URL");
    expect(admin.coverage.requiredEnv).toContain("SUPABASE_ANON_KEY");
    expect(admin.coverage.requiredEnv).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(admin.coverage.requiredEnv).toContain("FIREBASE_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("FIREBASE_PROJECT_ID");
    expect(admin.coverage.requiredEnv).toContain("FIREBASE_SERVICE_ACCOUNT_JSON");
    expect(admin.coverage.requiredEnv).toContain("COGNITO_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("COGNITO_USER_POOL_ID");
    expect(admin.coverage.requiredEnv).toContain("COGNITO_APP_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("CARDDAV_BASE_URL");
    expect(admin.coverage.requiredEnv).toContain("CARDDAV_USERNAME");
    expect(admin.coverage.requiredEnv).toContain("CARDDAV_APP_PASSWORD");
    expect(admin.coverage.requiredEnv).toContain("CARDDAV_ADDRESSBOOK_PATH");
    expect(admin.coverage.requiredEnv).toContain("AZURE_OPENAI_ENDPOINT");
    expect(admin.coverage.requiredEnv).toContain("AZURE_OPENAI_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("AZURE_OPENAI_CHAT_DEPLOYMENT");
    expect(admin.coverage.requiredEnv).toContain("AZURE_OPENAI_IMAGE_DEPLOYMENT");
    expect(admin.coverage.requiredEnv).toContain("AWS_ACCESS_KEY_ID");
    expect(admin.coverage.requiredEnv).toContain("AWS_SECRET_ACCESS_KEY");
    expect(admin.coverage.requiredEnv).toContain("AWS_REGION");
    expect(admin.coverage.requiredEnv).toContain("BEDROCK_TEXT_MODEL_ID");
    expect(admin.coverage.requiredEnv).toContain("BEDROCK_IMAGE_MODEL_ID");
    expect(admin.coverage.requiredEnv).toContain("ANTHROPIC_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("STABILITY_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("HUGGINGFACE_API_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("MISTRAL_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("COHERE_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("PERPLEXITY_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("XAI_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("TOGETHER_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("GROQ_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("DEEPSEEK_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("FIREWORKS_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("IDEOGRAM_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("LEONARDO_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("FAL_KEY");
    expect(admin.coverage.requiredEnv).toContain("BFL_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("OBJECT_STORE_SIGNING_SECRET");
    expect(admin.coverage.requiredEnv).toContain("MICROSOFT_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("WALMART_VENDOR_MODE");
    expect(admin.coverage.requiredEnv).toContain("STAPLES_VENDOR_MODE");
    expect(admin.coverage.requiredEnv).toContain("OFFICE_DEPOT_VENDOR_MODE");
    expect(admin.deploymentAdapters.map((adapter) => adapter.label)).toContain("Cheap droplet compose");
    expect(providerCatalog.find((adapter) => adapter.id === "object-store-render-packets")).toMatchObject({
      credentials: expect.arrayContaining(["OBJECT_STORE_URL", "OBJECT_STORE_SIGNING_SECRET"]),
      safetyGates: expect.arrayContaining(["HMAC signed URL contract", "No live upload in local MVP"])
    });
    expect(admin.blockedProviders.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining([
        "Walgreens live order",
        "CVS live order",
        "FedEx live print",
        "Walmart live print",
        "Staples live print",
        "Office Depot live print"
      ])
    );
    expect(admin.blockedProviders.every((adapter) => adapter.status === "blocked")).toBe(true);
    expect(admin.readyLocalProviders.map((adapter) => adapter.label)).toContain("Public printer pricing research");
    expect(admin.readyLocalProviders.map((adapter) => adapter.label)).toContain("Local print package export");
  });

  it("builds a customer panel model from ready paths plus gated provider choices", () => {
    const customer = buildCustomerPanelModel();
    const transcript = buildCustomerChatTranscript("Sara and Ahmed");

    expect(customer.primaryActions.map((action) => action.capability)).toEqual(
      expect.arrayContaining(["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"])
    );
    expect(customer.readyFallbacks.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining([
        "Local customer chat",
        "Browser SVG renderer",
        "Local print package export",
        "Manual vendor handoff",
        "Public printer pricing research",
        "vCard contact import"
      ])
    );
    expect(customer.importProviders.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining(["ICS / invite paste", "vCard contact import", "Google People contacts"])
    );
    expect(customer.chatProviders.length).toBeGreaterThanOrEqual(15);
    expect(customer.imageProviders.length).toBeGreaterThanOrEqual(14);
    expect(transcript.map((message) => message.text).join(" ")).toContain("Live AI and vendor orders stay off");
  });

  it("passes the catalog integrity validator", () => {
    expect(validateProviderCatalog()).toEqual([]);
  });
});
