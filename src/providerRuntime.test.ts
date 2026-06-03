import { describe, expect, it } from "vitest";
import { providerCatalog } from "./providerCatalog";
import {
  buildEventImportRuntime,
  buildImageGenerationRuntime,
  buildProviderAdapterRuntime,
  buildTextChatRuntime,
  buildVendorRuntime,
  getProviderRuntimeReadiness,
  sanitizeText,
  validateRuntimeCoverage,
  type ProviderGateState,
  type ProviderRuntimeEnv
} from "./providerRuntime";

const readyEnv: ProviderRuntimeEnv = {
  ANTHROPIC_API_KEY: "configured-anthropic-key",
  AUTH_SESSION_SECRET: "configured-auth-secret",
  COHERE_API_KEY: "configured-cohere-key",
  CVS_VENDOR_MODE: "certification-configured-only",
  DATABASE_URL: "postgres://customcard:test@localhost:5432/customcard",
  FEDEX_VENDOR_MODE: "certification-configured-only",
  GOOGLE_GENERATIVE_AI_API_KEY: "configured-google-ai-key",
  GOOGLE_OAUTH_CLIENT_ID: "configured-google-client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: "configured-google-client-secret",
  HUGGINGFACE_API_TOKEN: "configured-huggingface-token",
  IDEOGRAM_API_KEY: "configured-ideogram-key",
  LEONARDO_API_KEY: "configured-leonardo-key",
  MICROSOFT_CLIENT_ID: "configured-microsoft-client-id",
  MICROSOFT_CLIENT_SECRET: "configured-microsoft-client-secret",
  MICROSOFT_TENANT_ID: "configured-microsoft-tenant-id",
  MISTRAL_API_KEY: "configured-mistral-key",
  OBJECT_STORE_BUCKET: "customcard-test",
  OBJECT_STORE_URL: "file:///tmp/customcard-object-store",
  OPENAI_API_KEY: "configured-openai-key",
  PERPLEXITY_API_KEY: "configured-perplexity-key",
  POSTGRES_PASSWORD: "configured-postgres-password",
  QUEUE_URL: "redis://localhost:6379",
  REPLICATE_API_TOKEN: "configured-replicate-token",
  SELF_HOSTED_LLM_API_KEY: "configured-self-hosted-key",
  SELF_HOSTED_LLM_BASE_URL: "http://127.0.0.1:11434",
  STABILITY_API_KEY: "configured-stability-key",
  TOGETHER_API_KEY: "configured-together-key",
  TRANSACTIONAL_EMAIL_API_KEY: "configured-email-key",
  TRANSACTIONAL_EMAIL_FROM: "cards@example.test",
  WALGREENS_VENDOR_MODE: "certification-configured-only",
  XAI_API_KEY: "configured-xai-key"
};

const openGates: ProviderGateState = {
  externalConsentRecorded: true,
  externalShareApproved: true,
  humanApprovalBeforePrint: true,
  liveQuoteReceived: true,
  metadataOnly: true,
  modelAllowlisted: true,
  latencyBudgetMet: true,
  metadataSchemaValidated: true,
  modelQualityReviewed: true,
  networkAllowlisted: true,
  physicalPrintQaRecorded: true,
  piiMinimized: true,
  promptAuditApproved: true,
  rateLimitHandlingReady: true,
  rawContentStorageDisabled: true,
  revocationHandlingReady: true,
  spendLimitCents: 100,
  tenantReviewed: true,
  vendorCertificationRecorded: true
};

const textInput = {
  customerMessage: "Please draft a card for sara@example.com and call +1 (212) 555-0199 if blocked.",
  recipientName: "Sara and Ahmed",
  approvedMemoryNotes: ["They like botanical cards. Payment 4242 4242 4242 4242 must not leak."],
  locale: "en-US"
};

const imageInput = {
  prompt: "Anniversary artwork for sara@example.com, phone +1 212 555 0199, no text in image.",
  recipientName: "Sara and Ahmed",
  occasion: "anniversary",
  style: "botanical",
  locale: "en-US",
  printApproved: true
};

const importInput = {
  sourceText: "Private body should not be uploaded to provider APIs.",
  fromIso: "2026-07-01T00:00:00.000Z",
  toIso: "2026-07-31T23:59:59.999Z"
};

describe("provider runtime contracts", () => {
  it("covers every catalog adapter with a no-network dry run", () => {
    expect(validateRuntimeCoverage()).toEqual([]);

    for (const adapter of providerCatalog) {
      const result = buildProviderAdapterRuntime(adapter.id, {}, readyEnv, openGates);

      expect(result.adapterId).toBe(adapter.id);
      expect(result.capability).toBe(adapter.capability);
      expect(result.readiness.requiredSafetyGates).toEqual(adapter.safetyGates);

      if (adapter.status === "ready-local") {
        expect(result.mode).toBe("local-result");
        expect(result.request).toBeUndefined();
      }
      if (adapter.status === "blocked") {
        expect(result.mode).toBe("blocked");
        expect(result.request).toBeUndefined();
      }
    }
  });

  it("keeps credential-gated adapters blocked without real credentials", () => {
    const gatedAdapters = providerCatalog.filter((adapter) => adapter.status === "credential-gated");

    for (const adapter of gatedAdapters) {
      const readiness = getProviderRuntimeReadiness(adapter.id);

      expect(readiness.mode, adapter.id).toBe("blocked");
      expect(readiness.missingCredentials, adapter.id).toEqual(expect.arrayContaining(adapter.credentials));
    }
  });

  it("treats placeholder environment values as missing credentials", () => {
    const readiness = getProviderRuntimeReadiness("openai-responses-chat", {
      OPENAI_API_KEY: "replace-me-do-not-commit-real-secret"
    });

    expect(readiness.mode).toBe("blocked");
    expect(readiness.missingCredentials).toContain("OPENAI_API_KEY");

    const testCredentialReadiness = getProviderRuntimeReadiness("openai-responses-chat", {
      OPENAI_API_KEY: "test-openai-key"
    });

    expect(testCredentialReadiness.mode).toBe("blocked");
    expect(testCredentialReadiness.missingCredentials).toContain("OPENAI_API_KEY");
  });

  it("builds redacted no-network text request contracts for enabled chat providers", () => {
    const providerIds = [
      "openai-responses-chat",
      "anthropic-messages-chat",
      "google-gemini-chat",
      "huggingface-chat",
      "mistral-chat",
      "cohere-chat",
      "perplexity-sonar-chat",
      "xai-chat",
      "together-chat"
    ];

    for (const providerId of providerIds) {
      const result = buildTextChatRuntime(providerId, textInput, readyEnv, openGates);
      const serializedBody = JSON.stringify(result.request?.body);
      const serializedHeaders = JSON.stringify(result.request?.headers);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(serializedHeaders, providerId).not.toContain("test-");
      expect(serializedBody, providerId).toContain("[redacted-email]");
      expect(serializedBody, providerId).toContain("[redacted-phone]");
      expect(serializedBody, providerId).toContain("[redacted-payment]");
      expect(serializedBody, providerId).not.toContain("sara@example.com");
      expect(serializedBody, providerId).not.toContain("4242 4242 4242 4242");
    }

    expect(buildTextChatRuntime("anthropic-messages-chat", textInput, readyEnv, openGates).request?.headers).toMatchObject({
      "anthropic-version": "2023-06-01",
      "x-api-key": "{ANTHROPIC_API_KEY}"
    });
    expect(buildTextChatRuntime("google-gemini-chat", textInput, readyEnv, openGates).request?.headers).toMatchObject({
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
    expect(buildTextChatRuntime("cohere-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.cohere.com/v2/chat"
    );
    expect(buildTextChatRuntime("perplexity-sonar-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.perplexity.ai/chat/completions"
    );
    expect(buildTextChatRuntime("xai-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.x.ai/v1/chat/completions"
    );
    expect(buildTextChatRuntime("together-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.together.xyz/v1/chat/completions"
    );
  });

  it("builds redacted no-network image request contracts for enabled image providers", () => {
    const providerIds = [
      "openai-images",
      "google-gemini-image",
      "stability-stable-image",
      "huggingface-image",
      "replicate-image",
      "together-image",
      "ideogram-image",
      "leonardo-image"
    ];

    for (const providerId of providerIds) {
      const result = buildImageGenerationRuntime(providerId, imageInput, readyEnv, openGates);
      const serializedBody = JSON.stringify(result.request?.body);
      const serializedHeaders = JSON.stringify(result.request?.headers);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(serializedHeaders, providerId).not.toContain("test-");
      expect(serializedBody, providerId).toContain("[redacted-email]");
      expect(serializedBody, providerId).toContain("[redacted-phone]");
      expect(serializedBody, providerId).toContain("print_approval_required");
    }

    expect(buildImageGenerationRuntime("google-gemini-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
    expect(buildImageGenerationRuntime("ideogram-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "Api-Key": "{IDEOGRAM_API_KEY}"
    });
    expect(buildImageGenerationRuntime("leonardo-image", imageInput, readyEnv, openGates).request?.url).toBe(
      "https://cloud.leonardo.ai/api/rest/v1/generations"
    );
  });

  it("keeps provider imports metadata-only and omits raw source text", () => {
    const providerIds = [
      "gmail-metadata-import",
      "google-calendar-events",
      "microsoft-graph-mail",
      "microsoft-graph-calendar"
    ];

    for (const providerId of providerIds) {
      const result = buildEventImportRuntime(providerId, importInput, readyEnv, openGates);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("GET");
      expect(result.request?.body, providerId).toBeUndefined();
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(JSON.stringify(result.request?.headers), providerId).not.toContain("test-");
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["metadata-only", "no-raw-content"])
      );
      expect(result.request?.url, providerId).not.toContain(importInput.sourceText);
    }
  });

  it("blocks provider imports when consent and schema gates are absent", () => {
    const calendar = buildEventImportRuntime("google-calendar-events", importInput, readyEnv, {});
    const graphCalendar = buildEventImportRuntime("microsoft-graph-calendar", importInput, readyEnv, {
      externalConsentRecorded: true
    });

    expect(calendar.mode).toBe("blocked");
    expect(calendar.request).toBeUndefined();
    expect(calendar.readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "Missing safety gate: calendar scope consent",
        "Missing safety gate: metadata schema validation",
        "Missing safety gate: revocation handling"
      ])
    );

    expect(graphCalendar.mode).toBe("blocked");
    expect(graphCalendar.request).toBeUndefined();
    expect(graphCalendar.readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "Missing safety gate: metadata schema validation",
        "Missing safety gate: revocation handling"
      ])
    );
  });

  it("runs free local fallbacks without credentials or requests", () => {
    const chat = buildTextChatRuntime("deterministic-customer-chat", textInput);
    const importResult = buildEventImportRuntime("ics-paste-import", importInput);
    const image = buildImageGenerationRuntime("browser-svg-renderer", imageInput);
    const vendor = buildVendorRuntime("manual-vendor-handoff", { vendorId: "walgreens" });
    const pricing = buildVendorRuntime("public-printer-pricing-research", { vendorId: "walgreens" });

    expect(chat.mode).toBe("local-result");
    expect(chat.localResult?.length).toBeGreaterThan(0);
    expect(importResult.mode).toBe("local-result");
    expect(image.mode).toBe("local-result");
    expect(image.localResult?.width).toBe(1500);
    expect(vendor.mode).toBe("local-result");
    expect(vendor.localResult).toMatchObject({ canPlaceRealOrder: false, realOrdersEnabled: false });
    expect(pricing.mode).toBe("local-result");
    expect(pricing.localResult).toMatchObject({
      liveQuote: false,
      selectedVendorId: "walgreens",
      disclaimer: expect.stringContaining("not live quotes")
    });
  });

  it("never prepares live vendor order requests even with credentials and gates", () => {
    for (const adapterId of ["walgreens-live-order", "cvs-live-order", "fedex-live-print"]) {
      const result = buildVendorRuntime(
        adapterId,
        {
          vendorId: "walgreens",
          quoteCents: 699,
          storeId: "store-123",
          certificationRecorded: true,
          externalShareApproved: true,
          physicalPrintQaRecorded: true
        },
        readyEnv,
        openGates
      );

      expect(result.mode, adapterId).toBe("blocked");
      expect(result.request, adapterId).toBeUndefined();
      expect(result.readiness.blockedReasons.join(" ")).toContain("Live vendor orders remain disabled");
    }
  });

  it("redacts contact and payment-like text before provider contracts", () => {
    const sanitized = sanitizeText("Email me at person@example.com, call 555-111-2222, card 4111 1111 1111 1111.");

    expect(sanitized.text).toBe("Email me at [redacted-email], call [redacted-phone], card [redacted-payment].");
    expect(sanitized.redactions).toEqual(["email", "phone", "possible-card-number"]);
  });
});
