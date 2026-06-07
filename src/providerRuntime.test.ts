import { describe, expect, it } from "vitest";
import { providerCatalog } from "./providerCatalog";
import {
  buildAuthRuntime,
  buildContactImportRuntime,
  buildCrmRuntime,
  buildEventImportRuntime,
  buildImageGenerationRuntime,
  buildNotificationRuntime,
  buildObservabilityRuntime,
  buildPaymentRuntime,
  buildProviderAdapterRuntime,
  buildTextChatRuntime,
  buildVendorRuntime,
  buildWorkflowIntegrationRuntime,
  getProviderRuntimeReadiness,
  providerRuntimeSeams,
  sanitizeText,
  validateRuntimeCoverage,
  type ProviderGateState,
  type ProviderRuntimeEnv,
  type ProviderRuntimeInput
} from "./providerRuntime";

const readyEnv: ProviderRuntimeEnv = {
  ACTIVECAMPAIGN_API_KEY: "configured-activecampaign-api-key",
  ACTIVECAMPAIGN_BASE_URL: "https://customcard.activehosted.com",
  ADOBE_FIREFLY_API_KEY: "configured-adobe-firefly-api-key",
  ADOBE_FIREFLY_CLIENT_ID: "configured-adobe-firefly-client-id",
  ADOBE_FIREFLY_CLIENT_SECRET: "configured-adobe-firefly-client-secret",
  ANTHROPIC_API_KEY: "configured-anthropic-key",
  ADYEN_API_KEY: "configured-adyen-api-key",
  ADYEN_HMAC_KEY: "configured-adyen-hmac-key",
  ADYEN_MERCHANT_ACCOUNT: "configured-adyen-merchant-account",
  AIRTABLE_API_KEY: "configured-airtable-key",
  AIRTABLE_BASE_ID: "configured-airtable-base",
  AIRTABLE_TABLE_ID: "configured-airtable-table",
  AUTH_SESSION_SECRET: "configured-auth-secret",
  AUTH0_AUDIENCE: "https://api.customcard.test",
  AUTH0_CLIENT_ID: "configured-auth0-client-id",
  AUTH0_CLIENT_SECRET: "configured-auth0-client-secret",
  AUTH0_DOMAIN: "customcard-test.us.auth0.com",
  AWS_ACCESS_KEY_ID: "configured-aws-access-key-id",
  AWS_REGION: "us-east-1",
  AWS_SECRET_ACCESS_KEY: "configured-aws-secret-access-key",
  AZURE_OPENAI_API_KEY: "configured-azure-openai-key",
  AZURE_OPENAI_CHAT_DEPLOYMENT: "customcard-chat",
  AZURE_OPENAI_ENDPOINT: "https://customcard-test.openai.azure.com",
  AZURE_OPENAI_IMAGE_DEPLOYMENT: "customcard-image",
  BEDROCK_IMAGE_MODEL_ID: "amazon.titan-image-generator-v2:0",
  BEDROCK_TEXT_MODEL_ID: "anthropic.claude-3-5-haiku-20241022-v1:0",
  BFL_API_KEY: "configured-bfl-key",
  BIGCOMMERCE_ACCESS_TOKEN: "configured-bigcommerce-access-token",
  BIGCOMMERCE_STORE_HASH: "configured-bigcommerce-store-hash",
  BETTERSTACK_INGESTING_HOST: "in.logs.betterstack.com",
  BETTERSTACK_SOURCE_TOKEN: "configured-betterstack-source-token",
  BRAZE_CANVAS_ID: "configured-braze-canvas-id",
  BRAZE_REST_API_KEY: "configured-braze-api-key",
  BRAZE_REST_ENDPOINT: "https://rest.iad-01.braze.com",
  CARDDAV_ADDRESSBOOK_PATH: "addressbooks/users/customcard/contacts",
  CARDDAV_APP_PASSWORD: "configured-carddav-app-password",
  CARDDAV_BASE_URL: "https://contacts.customcard.test",
  CARDDAV_USERNAME: "configured-carddav-user",
  CLERK_AUTHORIZED_PARTIES: "https://customcard.test",
  CLERK_JWT_KEY: "configured-clerk-jwt-key",
  CLERK_SECRET_KEY: "configured-clerk-secret-key",
  COHERE_API_KEY: "configured-cohere-key",
  COGNITO_APP_CLIENT_ID: "configured-cognito-client-id",
  COGNITO_DOMAIN: "customcard-auth",
  COGNITO_USER_POOL_ID: "us-east-1_customcard",
  COURIER_AUTH_TOKEN: "configured-courier-token",
  COURIER_TEMPLATE_ID: "configured-courier-template",
  CUSTOMCARD_AUTH_CALLBACK_URL: "https://customcard.test/auth/callback",
  CUSTOMERIO_APP_API_KEY: "configured-customerio-app-api-key",
  CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID: "configured-customerio-transactional-message-id",
  CUSTOMCARD_PAYMENT_CANCEL_URL: "https://customcard.test/payment/cancel",
  CUSTOMCARD_PAYMENT_SUCCESS_URL: "https://customcard.test/payment/success",
  CVS_VENDOR_MODE: "certification-configured-only",
  DATABASE_URL: "postgres://customcard:test@localhost:5432/customcard",
  DATADOG_API_KEY: "configured-datadog-api-key",
  DATADOG_SITE: "datadoghq.com",
  DEEPSEEK_API_KEY: "configured-deepseek-key",
  DYNAMICS_CLIENT_ID: "configured-dynamics-client-id",
  DYNAMICS_CLIENT_SECRET: "configured-dynamics-client-secret",
  DYNAMICS_RESOURCE_URL: "https://customcard.crm.dynamics.com",
  DYNAMICS_TENANT_ID: "configured-dynamics-tenant-id",
  EXPO_ACCESS_TOKEN: "configured-expo-access-token",
  FEDEX_VENDOR_MODE: "certification-configured-only",
  FAL_KEY: "configured-fal-key",
  FIREWORKS_API_KEY: "configured-fireworks-key",
  FIREBASE_API_KEY: "configured-firebase-api-key",
  FIREBASE_PROJECT_ID: "customcard-test",
  FIREBASE_SERVICE_ACCOUNT_JSON: "configured-firebase-service-account-json",
  GOOGLE_GENERATIVE_AI_API_KEY: "configured-google-ai-key",
  GOOGLE_OAUTH_CLIENT_ID: "configured-google-client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: "configured-google-client-secret",
  GOOGLE_SHEETS_SPREADSHEET_ID: "configured-google-sheet-id",
  GRAFANA_OTLP_API_KEY: "configured-grafana-otlp-api-key",
  GRAFANA_OTLP_ENDPOINT: "https://otlp-gateway-prod-us-east-0.grafana.net/otlp",
  GRAFANA_OTLP_INSTANCE_ID: "configured-grafana-instance-id",
  GROQ_API_KEY: "configured-groq-key",
  HUGGINGFACE_API_TOKEN: "configured-huggingface-token",
  HUBSPOT_PORTAL_ID: "configured-hubspot-portal-id",
  HUBSPOT_PRIVATE_APP_TOKEN: "configured-hubspot-token",
  IDEOGRAM_API_KEY: "configured-ideogram-key",
  INTERCOM_ACCESS_TOKEN: "configured-intercom-access-token",
  KLAVIYO_PRIVATE_API_KEY: "configured-klaviyo-private-api-key",
  KLAVIYO_REVISION: "2026-02-15",
  KNOCK_API_KEY: "configured-knock-api-key",
  KNOCK_WORKFLOW_KEY: "configured-knock-workflow-key",
  LEONARDO_API_KEY: "configured-leonardo-key",
  LUMA_API_KEY: "configured-luma-api-key",
  MAKE_SIGNING_SECRET: "configured-make-signing-secret",
  MAKE_WEBHOOK_URL: "https://hook.make.com/customcard",
  MAILCHIMP_API_KEY: "configured-mailchimp-api-key",
  MAILCHIMP_AUDIENCE_ID: "configured-mailchimp-audience-id",
  MAILCHIMP_SERVER_PREFIX: "us21",
  MICROSOFT_CLIENT_ID: "configured-microsoft-client-id",
  MICROSOFT_CLIENT_SECRET: "configured-microsoft-client-secret",
  MICROSOFT_TENANT_ID: "configured-microsoft-tenant-id",
  MICROSOFT_TEAMS_TENANT_ID: "configured-teams-tenant-id",
  MICROSOFT_TEAMS_WEBHOOK_URL: "https://customcard.webhook.office.com/webhookb2/configured",
  MISTRAL_API_KEY: "configured-mistral-key",
  MAILGUN_API_KEY: "configured-mailgun-key",
  MAILGUN_DOMAIN: "mg.customcard.test",
  OFFICE_DEPOT_VENDOR_MODE: "certification-configured-only",
  OBJECT_STORE_BUCKET: "customcard-test",
  OBJECT_STORE_URL: "file:///tmp/customcard-object-store",
  NOTION_API_KEY: "configured-notion-key",
  NOTION_CUSTOMER_DATABASE_ID: "configured-notion-database",
  N8N_WEBHOOK_SECRET: "configured-n8n-webhook-secret",
  N8N_WEBHOOK_URL: "https://n8n.customcard.test/webhook/customcard",
  NOVU_API_KEY: "configured-novu-api-key",
  NOVU_WORKFLOW_ID: "configured-novu-workflow-id",
  OPENAI_API_KEY: "configured-openai-key",
  ONESIGNAL_APP_ID: "configured-onesignal-app-id",
  ONESIGNAL_REST_API_KEY: "configured-onesignal-rest-api-key",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel-collector.customcard.test",
  OTEL_EXPORTER_OTLP_HEADERS: "Authorization=Bearer configured-otel-token",
  PAYPAL_CLIENT_ID: "configured-paypal-client-id",
  PAYPAL_CLIENT_SECRET: "configured-paypal-client-secret",
  PAYPAL_WEBHOOK_ID: "configured-paypal-webhook-id",
  PERPLEXITY_API_KEY: "configured-perplexity-key",
  PIPEDRIVE_API_TOKEN: "configured-pipedrive-token",
  PIPEDRIVE_COMPANY_DOMAIN: "customcard-test",
  PIPEDREAM_SIGNING_SECRET: "configured-pipedream-signing-secret",
  PIPEDREAM_WORKFLOW_URL: "https://eo12345.m.pipedream.net",
  POSTMARK_SERVER_TOKEN: "configured-postmark-server-token",
  POSTHOG_HOST: "https://us.i.posthog.com",
  POSTHOG_PROJECT_API_KEY: "configured-posthog-project-api-key",
  POSTGRES_PASSWORD: "configured-postgres-password",
  QUEUE_URL: "redis://localhost:6379",
  RECRAFT_API_KEY: "configured-recraft-api-key",
  REPLICATE_API_TOKEN: "configured-replicate-token",
  RESEND_API_KEY: "configured-resend-key",
  SALESFORCE_CLIENT_ID: "configured-salesforce-client-id",
  SALESFORCE_CLIENT_SECRET: "configured-salesforce-client-secret",
  SALESFORCE_INSTANCE_URL: "https://customcard.my.salesforce.com",
  SALESFORCE_REFRESH_TOKEN: "configured-salesforce-refresh-token",
  SELF_HOSTED_LLM_API_KEY: "configured-self-hosted-key",
  SELF_HOSTED_LLM_BASE_URL: "http://127.0.0.1:11434",
  SENDGRID_API_KEY: "configured-sendgrid-key",
  SLACK_BOT_TOKEN: "configured-slack-bot-token",
  SLACK_CHANNEL_ID: "configured-slack-channel",
  SLACK_SIGNING_SECRET: "configured-slack-signing-secret",
  SENTRY_DSN: "https://public@sentry.example/123",
  SENTRY_ENVIRONMENT: "contract",
  SENTRY_PROJECT_ID: "123",
  SQUARE_ACCESS_TOKEN: "configured-square-access-token",
  SQUARE_LOCATION_ID: "configured-square-location-id",
  SQUARE_WEBHOOK_SIGNATURE_KEY: "configured-square-webhook-signature-key",
  STABILITY_API_KEY: "configured-stability-key",
  STAPLES_VENDOR_MODE: "certification-configured-only",
  SHOPIFY_ADMIN_ACCESS_TOKEN: "configured-shopify-token",
  SHOPIFY_SHOP_DOMAIN: "customcard-test.myshopify.com",
  SUPABASE_ANON_KEY: "configured-supabase-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "configured-supabase-service-role-key",
  SUPABASE_URL: "https://customcard-test.supabase.co",
  STRIPE_SECRET_KEY: "configured-stripe-secret-key",
  STRIPE_WEBHOOK_SECRET: "configured-stripe-webhook-secret",
  TOGETHER_API_KEY: "configured-together-key",
  TRANSACTIONAL_EMAIL_API_KEY: "configured-email-key",
  TRANSACTIONAL_EMAIL_FROM: "cards@example.test",
  TWILIO_ACCOUNT_SID: "configured-twilio-account-sid",
  TWILIO_AUTH_TOKEN: "configured-twilio-auth-token",
  TWILIO_MESSAGING_SERVICE_SID: "configured-twilio-messaging-service-sid",
  WALGREENS_VENDOR_MODE: "certification-configured-only",
  WALMART_VENDOR_MODE: "certification-configured-only",
  WHATSAPP_ACCESS_TOKEN: "configured-whatsapp-token",
  WHATSAPP_PHONE_NUMBER_ID: "configured-whatsapp-phone-number-id",
  WOOCOMMERCE_CONSUMER_KEY: "configured-woocommerce-consumer-key",
  WOOCOMMERCE_CONSUMER_SECRET: "configured-woocommerce-consumer-secret",
  WOOCOMMERCE_STORE_URL: "https://store.customcard.test",
  WORKATO_API_TOKEN: "configured-workato-api-token",
  WORKATO_WEBHOOK_URL: "https://webhooks.workato.com/customcard",
  XAI_API_KEY: "configured-xai-key",
  ZAPIER_SIGNING_SECRET: "configured-zapier-signing-secret",
  ZAPIER_WEBHOOK_URL: "https://hooks.zapier.com/hooks/catch/customcard",
  ZOHO_ACCOUNTS_DOMAIN: "https://accounts.zoho.com",
  ZOHO_API_DOMAIN: "https://www.zohoapis.com",
  ZOHO_CLIENT_ID: "configured-zoho-client-id",
  ZOHO_CLIENT_SECRET: "configured-zoho-client-secret",
  ZOHO_REFRESH_TOKEN: "configured-zoho-refresh-token"
};

const openGates: ProviderGateState = {
  adminReviewedExport: true,
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
  noCardDataStorage: true,
  notificationOptInRecorded: true,
  idempotencyKeyReady: true,
  paymentSandboxConfigured: true,
  alertRoutingConfigured: true,
  physicalPrintQaRecorded: true,
  piiMinimized: true,
  promptAuditApproved: true,
  rateLimitHandlingReady: true,
  rawContentStorageDisabled: true,
  revocationHandlingReady: true,
  spendLimitCents: 100,
  refundPathDocumented: true,
  retentionPolicyConfigured: true,
  sensitiveContentExcluded: true,
  suppressionListChecked: true,
  tenantReviewed: true,
  telemetryPiiRedacted: true,
  telemetrySamplingConfigured: true,
  vendorCertificationRecorded: true,
  webhookSignatureVerified: true
};

const textInput = {
  customerMessage: "Please draft a card for sara@example.com and call +1 (212) 555-0199 if blocked.",
  recipientName: "Sara and Ahmed",
  approvedMemoryNotes: ["They like botanical cards. Payment 4242 4242 4242 4242 must not leak."],
  locale: "en-US"
};

const imageInput = {
  prompt: "Luxury botanical Muslim wedding card set with ivory, sage, and soft gold floral borders.",
  recipientName: "Sara and Ahmed",
  occasion: "wedding",
  style: "botanical Islamic stationery",
  locale: "en-US",
  printApproved: true,
  senderName: "Auntie Rehman",
  frontCoverText: "Sara & Ahmed",
  insideLeftText: "May your marriage be filled with mercy, joy, and barakah.",
  insideRightText: "Wishing you a lifetime of tenderness, laughter, and faith-filled partnership.",
  signOff: "With love, Auntie Rehman"
};

const privacyImageInput = {
  ...imageInput,
  prompt: "Privacy audit artwork direction mentions sara@example.com and +1 212 555 0199 so redaction must happen."
};

const importInput = {
  sourceText: "Private body should not be uploaded to provider APIs.",
  fromIso: "2026-07-01T00:00:00.000Z",
  toIso: "2026-07-31T23:59:59.999Z"
};

const contactInput = {
  sourceText: [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Sara Ahmed",
    "EMAIL:sara@example.com",
    "ADR:;;123 Garden St;Brooklyn;NY;11201;US",
    "BDAY:1990-07-10",
    "END:VCARD"
  ].join("\n"),
  providerAccountId: "me"
};

const crmInput = {
  sourceText: [
    "customer_id,email,first_name,last_name,birthday,last_purchase_date,warranty_end_date,marketing_opt_in",
    "cust_123,sara@example.com,Sara,Ahmed,1990-07-10,2025-06-03,2027-06-03,true"
  ].join("\n"),
  fromIso: "2026-06-01T00:00:00.000Z",
  toIso: "2026-07-01T00:00:00.000Z",
  lifecycleKinds: ["birthday", "purchase-anniversary", "warranty-anniversary"] as (
    | "birthday"
    | "purchase-anniversary"
    | "warranty-anniversary"
  )[],
  optInRecorded: true
};

const workflowInput = {
  sourceText: [
    "campaign_id,customer_id,email,first_name,lifecycle_kind,lifecycle_date,marketing_opt_in",
    "campaign_2026_06,cust_123,sara@example.com,Sara,purchase-anniversary,2026-06-03,true"
  ].join("\n"),
  destination: "workspace-table" as const,
  campaignId: "campaign-2026-06",
  fromIso: "2026-06-01T00:00:00.000Z",
  toIso: "2026-07-01T00:00:00.000Z",
  optInRecorded: true
};

const notificationInput = {
  channel: "email" as const,
  recipient: "sara@example.com",
  subject: "CustomCard update for +1 212 555 0199",
  message: "Sara's card for sara@example.com is ready. Call +1 212 555 0199 if blocked. Payment 4111 1111 1111 1111 should never leak.",
  locale: "en-US",
  optInRecorded: true
};

const paymentInput = {
  amountCents: 699,
  currency: "USD",
  projectId: "card-project-123",
  customerId: "sara@example.com",
  description: "Custom card checkout for sara@example.com with card 4111 1111 1111 1111 hidden.",
  successPath: "/customer/payment/success",
  cancelPath: "/customer/payment/cancel",
  sandboxMode: true,
  idempotencyKey: "payment-idempotency-key",
  refundPathDocumented: true
};

const observabilityInput = {
  eventType: "error" as const,
  serviceName: "customcard-api",
  release: "2026.06.03",
  environment: "contract",
  route: "/api/customer/bootstrap?email=sara@example.com",
  message: "Runtime error for sara@example.com. Card 4111 1111 1111 1111 should not appear in telemetry.",
  severity: "error" as const,
  traceId: "trace-123",
  metricName: "customcard.runtime.error",
  value: 1,
  piiFree: true,
  sampled: true
};

const completeRuntimeInput: ProviderRuntimeInput = {
  auth: { requestedRole: "customer", returnToPath: "/customer/cards" },
  eventImport: importInput,
  contactImport: contactInput,
  crm: crmInput,
  workflowIntegration: workflowInput,
  textChat: textInput,
  image: imageInput,
  notification: notificationInput,
  payment: paymentInput,
  observability: observabilityInput,
  vendor: { vendorId: "walgreens" }
};

describe("provider runtime contracts", () => {
  it("keeps runtime dispatch behind explicit no-network capability seams", () => {
    const seamCapabilities = providerRuntimeSeams.map((seam) => seam.capability);
    const catalogCapabilities = Array.from(new Set(providerCatalog.map((adapter) => adapter.capability))).sort();

    expect([...seamCapabilities].sort()).toEqual(catalogCapabilities);
    expect(providerRuntimeSeams.every((seam) => seam.buildsNoNetworkContracts && !seam.liveNetworkDefault)).toBe(true);
    expect(providerRuntimeSeams.find((seam) => seam.capability === "text-chat")).toMatchObject({
      inputKey: "textChat",
      defaultMode: "prepared-request"
    });
    expect(providerRuntimeSeams.find((seam) => seam.capability === "render-export")).toMatchObject({
      defaultMode: "local-result"
    });
  });

  it("covers every catalog adapter with a no-network dry run", () => {
    expect(validateRuntimeCoverage()).toEqual([]);

    for (const adapter of providerCatalog) {
      const seam = providerRuntimeSeams.find((candidate) => candidate.capability === adapter.capability);
      const explicitInput = seam?.inputKey ? { [seam.inputKey]: completeRuntimeInput[seam.inputKey] } : {};
      const result = buildProviderAdapterRuntime(adapter.id, explicitInput, readyEnv, openGates);

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

  it("blocks generic runtime dispatch when declared capability input is omitted", () => {
    for (const adapter of providerCatalog) {
      const seam = providerRuntimeSeams.find((candidate) => candidate.capability === adapter.capability);
      if (!seam?.inputKey) continue;

      const result = buildProviderAdapterRuntime(adapter.id, {}, readyEnv, openGates);

      expect(result.mode, adapter.id).toBe("blocked");
      expect(result.request, adapter.id).toBeUndefined();
      expect(result.localResult, adapter.id).toBeUndefined();
      expect(result.readiness.blockedReasons, adapter.id).toContain(`Missing required runtime input: ${seam.inputKey}.`);
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

  it("builds no-network hosted auth request contracts for enabled identity providers", () => {
    const providerIds = [
      "auth0-oidc-auth",
      "clerk-session-auth",
      "supabase-auth",
      "firebase-auth",
      "cognito-hosted-ui-auth"
    ];

    for (const providerId of providerIds) {
      const result = buildAuthRuntime(
        providerId,
        { requestedRole: "customer", returnToPath: "/customer/cards", sessionTokenPreview: "do-not-leak-token" },
        readyEnv,
        openGates
      );
      const serializedHeaders = JSON.stringify(result.request?.headers);
      const serializedBody = JSON.stringify(result.request?.body ?? {});

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["auth-session", "no-password-storage"])
      );
      expect(serializedHeaders, providerId).not.toContain("configured-");
      expect(serializedBody, providerId).not.toContain("do-not-leak-token");
    }

    expect(buildAuthRuntime("auth0-oidc-auth", { requestedRole: "admin", returnToPath: "/admin" }, readyEnv, openGates).request?.url).toBe(
      "https://{AUTH0_DOMAIN}/authorize?response_type=code&client_id={AUTH0_CLIENT_ID}&redirect_uri={CUSTOMCARD_AUTH_CALLBACK_URL}&scope=openid%20profile%20email&audience={AUTH0_AUDIENCE}"
    );
    expect(buildAuthRuntime("clerk-session-auth", { requestedRole: "customer", returnToPath: "/customer" }, readyEnv, openGates).request?.headers).toMatchObject({
      authorization: "Bearer {CLERK_SECRET_KEY}",
      "x-customcard-auth-flow": "jwt-verification"
    });
    expect(buildAuthRuntime("supabase-auth", { requestedRole: "customer", returnToPath: "/customer" }, readyEnv, openGates).request?.headers).toMatchObject({
      apikey: "{SUPABASE_ANON_KEY}",
      authorization: "Bearer {supabase-user-jwt}"
    });
    expect(buildAuthRuntime("firebase-auth", { requestedRole: "customer", returnToPath: "/customer" }, readyEnv, openGates).request?.url).toBe(
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}"
    );
    expect(buildAuthRuntime("cognito-hosted-ui-auth", { requestedRole: "customer", returnToPath: "/customer" }, readyEnv, openGates).request?.url).toBe(
      "https://{COGNITO_DOMAIN}.auth.{AWS_REGION}.amazoncognito.com/oauth2/authorize?response_type=code&client_id={COGNITO_APP_CLIENT_ID}&redirect_uri={CUSTOMCARD_AUTH_CALLBACK_URL}&scope=openid%20profile%20email"
    );
  });

  it("builds redacted no-network text request contracts for enabled chat providers", () => {
    const providerIds = [
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
      "fireworks-chat"
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
    expect(buildTextChatRuntime("azure-openai-chat", textInput, readyEnv, openGates).request?.headers).toMatchObject({
      "api-key": "{AZURE_OPENAI_API_KEY}"
    });
    expect(buildTextChatRuntime("aws-bedrock-converse-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{BEDROCK_TEXT_MODEL_ID}/converse"
    );
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
    expect(buildTextChatRuntime("groq-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.groq.com/openai/v1/chat/completions"
    );
    expect(buildTextChatRuntime("deepseek-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.deepseek.com/chat/completions"
    );
    expect(buildTextChatRuntime("fireworks-chat", textInput, readyEnv, openGates).request?.url).toBe(
      "https://api.fireworks.ai/inference/v1/chat/completions"
    );
  });

  it("builds redacted no-network image request contracts for enabled image providers", () => {
    const providerIds = [
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
      "bfl-flux-image",
      "adobe-firefly-image",
      "recraft-image",
      "luma-image"
    ];

    for (const providerId of providerIds) {
      const result = buildImageGenerationRuntime(providerId, imageInput, readyEnv, openGates);
      const serializedBody = JSON.stringify(result.request?.body);
      const serializedHeaders = JSON.stringify(result.request?.headers);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(serializedHeaders, providerId).not.toContain("test-");
      expect(serializedBody, providerId).toContain("print_approval_required");
      expect(result.request?.panelRequests, providerId).toHaveLength(4);
      expect(result.request?.panelRequests?.map((request) => request.panelId), providerId).toEqual([
        "front-cover",
        "back-cover",
        "inside-left-panel",
        "inside-right-panel"
      ]);

      const panelBodies = result.request?.panelRequests?.map((request) => JSON.stringify(request.body)) ?? [];
      expect(panelBodies[0], providerId).toContain("Generate only the FRONT COVER");
      expect(panelBodies[1], providerId).toContain("Generate only the BACK COVER");
      expect(panelBodies[2], providerId).toContain("Generate only the INSIDE LEFT PANEL");
      expect(panelBodies[3], providerId).toContain("Generate only the INSIDE RIGHT PANEL");
      expect(panelBodies.every((body) => body.includes("folded-card-four-panel-v1")), providerId).toBe(true);
      expect(panelBodies.every((body) => body.includes("one-provider-request-per-panel")), providerId).toBe(true);
      expect(panelBodies[0], providerId).toContain('"panel_id":"front-cover"');
      expect(panelBodies[1], providerId).toContain('"panel_id":"back-cover"');
      expect(panelBodies[2], providerId).toContain('"panel_id":"inside-left-panel"');
      expect(panelBodies[3], providerId).toContain('"panel_id":"inside-right-panel"');
      expect(panelBodies.join("\n"), providerId).not.toContain("Create 4 separate print-ready");
    }

    expect(buildImageGenerationRuntime("google-gemini-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
    expect(buildImageGenerationRuntime("azure-openai-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "api-key": "{AZURE_OPENAI_API_KEY}"
    });
    expect(buildImageGenerationRuntime("aws-bedrock-image", imageInput, readyEnv, openGates).request?.url).toBe(
      "https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{BEDROCK_IMAGE_MODEL_ID}/invoke"
    );
    expect(buildImageGenerationRuntime("ideogram-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "Api-Key": "{IDEOGRAM_API_KEY}"
    });
    expect(buildImageGenerationRuntime("leonardo-image", imageInput, readyEnv, openGates).request?.url).toBe(
      "https://cloud.leonardo.ai/api/rest/v1/generations"
    );
    expect(buildImageGenerationRuntime("fal-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      authorization: "Key {FAL_KEY}"
    });
    expect(buildImageGenerationRuntime("bfl-flux-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "x-key": "{BFL_API_KEY}"
    });
    expect(buildImageGenerationRuntime("adobe-firefly-image", imageInput, readyEnv, openGates).request?.headers).toMatchObject({
      "x-api-key": "{ADOBE_FIREFLY_API_KEY}"
    });
    expect(buildImageGenerationRuntime("recraft-image", imageInput, readyEnv, openGates).request?.url).toBe(
      "https://external.api.recraft.ai/v1/images/generations"
    );
    expect(buildImageGenerationRuntime("luma-image", imageInput, readyEnv, openGates).request?.url).toBe(
      "https://api.lumalabs.ai/dream-machine/v1/generations/image"
    );
  });

  it("redacts PII across image panel prompt contracts", () => {
    const result = buildImageGenerationRuntime("openai-images", privacyImageInput, readyEnv, openGates);
    const serializedRequest = JSON.stringify(result.request);

    expect(serializedRequest).toContain("[redacted-email]");
    expect(serializedRequest).toContain("[redacted-phone]");
    expect(serializedRequest).not.toContain("sara@example.com");
    expect(serializedRequest).not.toContain("+1 212 555 0199");
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

  it("requires explicit source text for local import and workflow export adapters", () => {
    const eventResult = buildEventImportRuntime("ics-paste-import", importInput);
    const contactResult = buildContactImportRuntime("vcard-contact-import", contactInput);
    const crmResult = buildCrmRuntime("crm-csv-lifecycle-import", crmInput);
    const workflowResult = buildWorkflowIntegrationRuntime("local-workflow-payload-export", workflowInput);

    expect(eventResult).toMatchObject({
      mode: "local-result",
      localResult: expect.objectContaining({ source: "manual-note", title: "Private body should not be uploaded to provider APIs" })
    });
    expect(contactResult).toMatchObject({
      mode: "local-result",
      localResult: expect.objectContaining({ parser: "vcard", contactCount: 1, rawNotesStored: false })
    });
    expect(crmResult).toMatchObject({
      mode: "local-result",
      localResult: expect.objectContaining({ parser: "crm-csv-lifecycle", customerCount: 1, metadataOnly: true })
    });
    expect(workflowResult).toMatchObject({
      mode: "local-result",
      localResult: expect.objectContaining({ exporter: "local-workflow-payload", customerCount: 1, liveWorkflowSend: false })
    });

    for (const result of [
      buildEventImportRuntime("ics-paste-import", { ...importInput, sourceText: "   " }),
      buildContactImportRuntime("vcard-contact-import", { ...contactInput, sourceText: "   " }),
      buildCrmRuntime("crm-csv-lifecycle-import", { ...crmInput, sourceText: "   " }),
      buildWorkflowIntegrationRuntime("local-workflow-payload-export", { ...workflowInput, sourceText: "   " })
    ]) {
      expect(result.mode).toBe("blocked");
      expect(result.localResult).toBeUndefined();
      expect(result.request).toBeUndefined();
      expect(result.readiness.blockedReasons).toContain("Missing required source text for local import/export.");
    }
  });

  it("keeps contact imports metadata-only and omits local source text", () => {
    const providerIds = ["google-people-contacts", "microsoft-graph-contacts", "carddav-address-book"];

    for (const providerId of providerIds) {
      const result = buildContactImportRuntime(providerId, contactInput, readyEnv, openGates);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["contact-metadata", "address-book", "no-raw-notes", "no-photos"])
      );
      expect(JSON.stringify(result.request?.headers), providerId).not.toContain("configured-");
      expect(JSON.stringify(result.request?.body ?? {}), providerId).not.toContain("Sara Ahmed");
      expect(result.request?.url, providerId).not.toContain(contactInput.sourceText);
    }

    expect(buildContactImportRuntime("google-people-contacts", contactInput, readyEnv, openGates).request?.url).toContain(
      "https://people.googleapis.com/v1/people/me/connections"
    );
    expect(buildContactImportRuntime("microsoft-graph-contacts", contactInput, readyEnv, openGates).request?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/contacts?$select=id,displayName,emailAddresses,homeAddress,businessAddress,birthday&$top=100"
    );
    expect(buildContactImportRuntime("carddav-address-book", contactInput, readyEnv, openGates).request).toMatchObject({
      method: "REPORT",
      url: "{CARDDAV_BASE_URL}/{CARDDAV_ADDRESSBOOK_PATH}",
      headers: expect.objectContaining({
        authorization: "Basic {CARDDAV_USERNAME}:{CARDDAV_APP_PASSWORD}",
        "content-type": "application/xml; charset=utf-8"
      })
    });
  });

  it("builds metadata-only no-network CRM lifecycle request contracts", () => {
    const providerIds = [
      "salesforce-crm-lifecycle",
      "hubspot-crm-lifecycle",
      "zoho-crm-lifecycle",
      "pipedrive-crm-lifecycle",
      "dynamics-crm-lifecycle",
      "shopify-crm-lifecycle",
      "klaviyo-profile-lifecycle",
      "mailchimp-audience-lifecycle",
      "activecampaign-contact-lifecycle",
      "bigcommerce-customer-lifecycle",
      "woocommerce-customer-lifecycle",
      "square-customer-lifecycle",
      "intercom-contact-lifecycle"
    ];

    for (const providerId of providerIds) {
      const result = buildCrmRuntime(providerId, crmInput, readyEnv, openGates);
      const serializedHeaders = JSON.stringify(result.request?.headers);
      const serializedBody = JSON.stringify(result.request?.body ?? {});
      const serializedUrl = result.request?.url ?? "";

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["crm-customer-metadata", "lifecycle-dates", "opt-in-required"])
      );
      expect(serializedHeaders, providerId).not.toContain("configured-");
      expect(serializedBody, providerId).not.toContain("sara@example.com");
      expect(serializedUrl, providerId).not.toContain("sara@example.com");
      expect(serializedBody, providerId).not.toContain("Sara");
    }

    expect(buildCrmRuntime("salesforce-crm-lifecycle", crmInput, readyEnv, openGates).request?.url).toContain(
      "/services/data/v61.0/query"
    );
    expect(buildCrmRuntime("hubspot-crm-lifecycle", crmInput, readyEnv, openGates).request).toMatchObject({
      method: "POST",
      url: "https://api.hubapi.com/crm/v3/objects/contacts/search",
      credentialRefs: expect.arrayContaining(["HUBSPOT_PRIVATE_APP_TOKEN", "HUBSPOT_PORTAL_ID"])
    });
    expect(buildCrmRuntime("hubspot-crm-lifecycle", crmInput, readyEnv, openGates).request?.body).toMatchObject({
      metadata: expect.objectContaining({
        lifecycle_kinds: expect.arrayContaining(["birthday", "purchase-anniversary", "warranty-anniversary"]),
        opt_in_recorded: true,
        live_crm_write: "disabled"
      })
    });
    expect(buildCrmRuntime("zoho-crm-lifecycle", crmInput, readyEnv, openGates).request?.headers).toMatchObject({
      authorization: "Zoho-oauthtoken {zoho-oauth-access-token}"
    });
    expect(buildCrmRuntime("pipedrive-crm-lifecycle", crmInput, readyEnv, openGates).request?.url).toBe(
      "https://{PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1/persons?start=0&limit=100"
    );
    expect(buildCrmRuntime("dynamics-crm-lifecycle", crmInput, readyEnv, openGates).request?.url).toContain(
      "/api/data/v9.2/contacts"
    );
    expect(buildCrmRuntime("shopify-crm-lifecycle", crmInput, readyEnv, openGates).request).toMatchObject({
      method: "POST",
      url: "https://{SHOPIFY_SHOP_DOMAIN}/admin/api/2026-04/graphql.json",
      headers: expect.objectContaining({ "x-shopify-access-token": "{SHOPIFY_ADMIN_ACCESS_TOKEN}" })
    });
    expect(buildCrmRuntime("klaviyo-profile-lifecycle", crmInput, readyEnv, openGates).request).toMatchObject({
      method: "GET",
      headers: expect.objectContaining({ revision: "{KLAVIYO_REVISION}" })
    });
    expect(buildCrmRuntime("mailchimp-audience-lifecycle", crmInput, readyEnv, openGates).request?.url).toContain(
      "https://{MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/{MAILCHIMP_AUDIENCE_ID}/members"
    );
    expect(buildCrmRuntime("activecampaign-contact-lifecycle", crmInput, readyEnv, openGates).request?.headers).toMatchObject({
      "Api-Token": "{ACTIVECAMPAIGN_API_KEY}"
    });
    expect(buildCrmRuntime("bigcommerce-customer-lifecycle", crmInput, readyEnv, openGates).request?.url).toContain(
      "/stores/{BIGCOMMERCE_STORE_HASH}/v3/customers"
    );
    expect(buildCrmRuntime("woocommerce-customer-lifecycle", crmInput, readyEnv, openGates).request?.headers).toMatchObject({
      authorization: "Basic {WOOCOMMERCE_CONSUMER_KEY}:{WOOCOMMERCE_CONSUMER_SECRET}"
    });
    expect(buildCrmRuntime("square-customer-lifecycle", crmInput, readyEnv, openGates).request?.url).toBe(
      "https://connect.squareup.com/v2/customers/search"
    );
    expect(buildCrmRuntime("intercom-contact-lifecycle", crmInput, readyEnv, openGates).request?.headers).toMatchObject({
      "Intercom-Version": "2.13"
    });
  });

  it("blocks CRM lifecycle sync when opt-in and review gates are absent", () => {
    const result = buildCrmRuntime(
      "salesforce-crm-lifecycle",
      { ...crmInput, optInRecorded: false },
      readyEnv,
      { networkAllowlisted: true }
    );

    expect(result.mode).toBe("blocked");
    expect(result.request).toBeUndefined();
    expect(result.readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "Missing safety gate: OAuth consent",
        "Missing safety gate: metadata schema validation",
        "Missing safety gate: notification opt-in",
        "Missing safety gate: suppression list check",
        "Missing safety gate: tenant review",
        "Missing safety gate: revocation handling"
      ])
    );
  });

  it("builds metadata-only no-network workflow integration request contracts", () => {
    const providerIds = [
      "zapier-webhook-workflow",
      "make-webhook-workflow",
      "slack-workflow-notification",
      "teams-workflow-notification",
      "notion-customer-database-sync",
      "airtable-customer-base-sync",
      "google-sheets-lifecycle-sync",
      "n8n-webhook-workflow",
      "workato-webhook-workflow",
      "pipedream-webhook-workflow"
    ];

    for (const providerId of providerIds) {
      const result = buildWorkflowIntegrationRuntime(providerId, workflowInput, readyEnv, openGates);
      const serializedHeaders = JSON.stringify(result.request?.headers);
      const serializedBody = JSON.stringify(result.request?.body ?? {});

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["workflow-metadata", "lifecycle-campaign", "PII-redacted", "opt-in-required"])
      );
      expect(serializedHeaders, providerId).not.toContain("configured-");
      expect(serializedBody, providerId).toContain('"redactions":["email","phone"]');
      expect(serializedBody, providerId).toContain("live_workflow_send");
      expect(serializedBody, providerId).not.toContain("sara@example.com");
      expect(serializedBody, providerId).not.toContain("Sara");
    }

    expect(buildWorkflowIntegrationRuntime("zapier-webhook-workflow", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "{ZAPIER_WEBHOOK_URL}",
      headers: expect.objectContaining({ "x-customcard-signature": "HMAC-SHA256 {ZAPIER_SIGNING_SECRET}" })
    });
    expect(buildWorkflowIntegrationRuntime("make-webhook-workflow", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "{MAKE_WEBHOOK_URL}",
      headers: expect.objectContaining({ "x-customcard-signature": "HMAC-SHA256 {MAKE_SIGNING_SECRET}" })
    });
    expect(buildWorkflowIntegrationRuntime("slack-workflow-notification", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "https://slack.com/api/chat.postMessage",
      headers: expect.objectContaining({ authorization: "Bearer {SLACK_BOT_TOKEN}" })
    });
    expect(buildWorkflowIntegrationRuntime("teams-workflow-notification", workflowInput, readyEnv, openGates).request?.url).toBe(
      "{MICROSOFT_TEAMS_WEBHOOK_URL}"
    );
    expect(buildWorkflowIntegrationRuntime("notion-customer-database-sync", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "https://api.notion.com/v1/pages",
      headers: expect.objectContaining({ "notion-version": "2022-06-28" })
    });
    expect(buildWorkflowIntegrationRuntime("airtable-customer-base-sync", workflowInput, readyEnv, openGates).request?.url).toBe(
      "https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
    );
    expect(buildWorkflowIntegrationRuntime("google-sheets-lifecycle-sync", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_SPREADSHEET_ID}/values/CustomCardQueue!A:F:append?valueInputOption=USER_ENTERED",
      headers: expect.objectContaining({ authorization: "Bearer {google-oauth-access-token}" })
    });
    expect(buildWorkflowIntegrationRuntime("n8n-webhook-workflow", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "{N8N_WEBHOOK_URL}",
      headers: expect.objectContaining({ "x-customcard-signature": "HMAC-SHA256 {N8N_WEBHOOK_SECRET}" })
    });
    expect(buildWorkflowIntegrationRuntime("workato-webhook-workflow", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "{WORKATO_WEBHOOK_URL}",
      headers: expect.objectContaining({ authorization: "Bearer {WORKATO_API_TOKEN}" })
    });
    expect(buildWorkflowIntegrationRuntime("pipedream-webhook-workflow", workflowInput, readyEnv, openGates).request).toMatchObject({
      url: "{PIPEDREAM_WORKFLOW_URL}",
      headers: expect.objectContaining({ "x-customcard-signature": "HMAC-SHA256 {PIPEDREAM_SIGNING_SECRET}" })
    });
  });

  it("blocks workflow integrations when opt-in and suppression gates are absent", () => {
    const result = buildWorkflowIntegrationRuntime(
      "zapier-webhook-workflow",
      { ...workflowInput, optInRecorded: false },
      readyEnv,
      {
        metadataOnly: true,
        networkAllowlisted: true,
        rateLimitHandlingReady: true,
        rawContentStorageDisabled: true
      }
    );

    expect(result.mode).toBe("blocked");
    expect(result.request).toBeUndefined();
    expect(result.readiness.blockedReasons).toEqual(
      expect.arrayContaining(["Missing safety gate: notification opt-in", "Missing safety gate: suppression list check"])
    );
  });

  it("builds redacted no-network notification request contracts", () => {
    const providerIds = [
      "resend-email-notification",
      "sendgrid-email-notification",
      "postmark-email-notification",
      "mailgun-email-notification",
      "twilio-sms-notification",
      "whatsapp-cloud-notification",
      "expo-push-notification",
      "firebase-cloud-messaging",
      "customerio-transactional-notification",
      "braze-canvas-notification",
      "onesignal-message-notification",
      "courier-send-notification",
      "knock-workflow-notification",
      "novu-trigger-notification"
    ];

    for (const providerId of providerIds) {
      const result = buildNotificationRuntime(providerId, notificationInput, readyEnv, openGates);
      const serializedBody = JSON.stringify(result.request?.body);
      const serializedHeaders = JSON.stringify(result.request?.headers);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["notification-recipient", "status-message", "PII-redacted", "opt-in-required"])
      );
      expect(serializedHeaders, providerId).not.toContain("configured-");
      expect(serializedBody, providerId).toContain("[redacted-email]");
      expect(serializedBody, providerId).toContain("[redacted-phone]");
      expect(serializedBody, providerId).toContain("[redacted-payment]");
      expect(serializedBody, providerId).not.toContain("sara@example.com");
      expect(serializedBody, providerId).not.toContain("4111 1111 1111 1111");
    }

    expect(buildNotificationRuntime("resend-email-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://api.resend.com/emails"
    );
    expect(buildNotificationRuntime("sendgrid-email-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://api.sendgrid.com/v3/mail/send"
    );
    expect(buildNotificationRuntime("postmark-email-notification", notificationInput, readyEnv, openGates).request?.headers).toMatchObject({
      "x-postmark-server-token": "{POSTMARK_SERVER_TOKEN}"
    });
    expect(buildNotificationRuntime("mailgun-email-notification", notificationInput, readyEnv, openGates).request).toMatchObject({
      url: "https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
      headers: expect.objectContaining({ authorization: "Basic api:{MAILGUN_API_KEY}" })
    });
    expect(buildNotificationRuntime("twilio-sms-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    );
    expect(buildNotificationRuntime("whatsapp-cloud-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    );
    expect(buildNotificationRuntime("expo-push-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://exp.host/--/api/v2/push/send"
    );
    expect(buildNotificationRuntime("firebase-cloud-messaging", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://fcm.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/messages:send"
    );
    expect(buildNotificationRuntime("customerio-transactional-notification", notificationInput, readyEnv, openGates).request).toMatchObject({
      url: "https://api.customer.io/v1/send/email",
      credentialRefs: expect.arrayContaining(["CUSTOMERIO_APP_API_KEY", "CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID"])
    });
    expect(buildNotificationRuntime("braze-canvas-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "{BRAZE_REST_ENDPOINT}/messages/send"
    );
    expect(buildNotificationRuntime("onesignal-message-notification", notificationInput, readyEnv, openGates).request?.headers).toMatchObject({
      authorization: "Key {ONESIGNAL_REST_API_KEY}"
    });
    expect(buildNotificationRuntime("courier-send-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://api.courier.com/send"
    );
    expect(buildNotificationRuntime("knock-workflow-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://api.knock.app/v1/workflows/{KNOCK_WORKFLOW_KEY}/trigger"
    );
    expect(buildNotificationRuntime("novu-trigger-notification", notificationInput, readyEnv, openGates).request?.url).toBe(
      "https://api.novu.co/v1/events/trigger"
    );
  });

  it("blocks notification sends when opt-in and suppression gates are absent", () => {
    const result = buildNotificationRuntime(
      "resend-email-notification",
      { ...notificationInput, optInRecorded: false },
      readyEnv,
      {
        networkAllowlisted: true,
        rateLimitHandlingReady: true
      }
    );

    expect(result.mode).toBe("blocked");
    expect(result.request).toBeUndefined();
    expect(result.readiness.blockedReasons).toEqual(
      expect.arrayContaining(["Missing safety gate: notification opt-in", "Missing safety gate: suppression list check"])
    );
  });

  it("builds sandbox-only no-network payment request contracts", () => {
    const providerIds = [
      "stripe-checkout-payment",
      "paypal-orders-payment",
      "square-payments-sandbox",
      "adyen-checkout-payment"
    ];

    for (const providerId of providerIds) {
      const result = buildPaymentRuntime(providerId, paymentInput, readyEnv, openGates);
      const serializedBody = JSON.stringify(result.request?.body);
      const serializedHeaders = JSON.stringify(result.request?.headers);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["payment-intent", "no-card-data-storage", "idempotent-mutation", "sandbox-only"])
      );
      expect(serializedHeaders, providerId).not.toContain("configured-");
      expect(serializedBody, providerId).toContain("[redacted-email]");
      expect(serializedBody, providerId).toContain("[redacted-payment]");
      expect(serializedBody, providerId).toContain("real_charges_enabled");
      expect(serializedBody, providerId).not.toContain("sara@example.com");
      expect(serializedBody, providerId).not.toContain("4111 1111 1111 1111");
    }

    expect(buildPaymentRuntime("stripe-checkout-payment", paymentInput, readyEnv, openGates).request).toMatchObject({
      url: "https://api.stripe.com/v1/checkout/sessions",
      headers: expect.objectContaining({
        authorization: "Bearer {STRIPE_SECRET_KEY}",
        "idempotency-key": "{CUSTOMCARD_IDEMPOTENCY_KEY}"
      })
    });
    expect(buildPaymentRuntime("paypal-orders-payment", paymentInput, readyEnv, openGates).request).toMatchObject({
      url: "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      headers: expect.objectContaining({
        authorization: "Bearer {paypal-oauth-access-token}",
        "paypal-request-id": "{CUSTOMCARD_IDEMPOTENCY_KEY}"
      })
    });
    expect(buildPaymentRuntime("square-payments-sandbox", paymentInput, readyEnv, openGates).request).toMatchObject({
      url: "https://connect.squareupsandbox.com/v2/payments",
      headers: expect.objectContaining({ authorization: "Bearer {SQUARE_ACCESS_TOKEN}" })
    });
    expect(buildPaymentRuntime("adyen-checkout-payment", paymentInput, readyEnv, openGates).request).toMatchObject({
      url: "https://checkout-test.adyen.com/v71/payments",
      headers: expect.objectContaining({ "x-api-key": "{ADYEN_API_KEY}" })
    });
  });

  it("blocks payment providers without sandbox, idempotency, refund, and webhook gates", () => {
    const result = buildPaymentRuntime(
      "stripe-checkout-payment",
      { ...paymentInput, sandboxMode: false, idempotencyKey: undefined, refundPathDocumented: false },
      readyEnv,
      { networkAllowlisted: true }
    );

    expect(result.mode).toBe("blocked");
    expect(result.request).toBeUndefined();
    expect(result.readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "Missing safety gate: payment sandbox",
        "Missing safety gate: payment idempotency key",
        "Missing safety gate: refund path documented",
        "Missing safety gate: webhook signature verification"
      ])
    );
  });

  it("builds redacted no-network observability request contracts", () => {
    const providerIds = [
      "sentry-error-observability",
      "posthog-product-observability",
      "opentelemetry-otlp-observability",
      "grafana-cloud-otlp-observability",
      "datadog-logs-observability",
      "betterstack-logs-observability"
    ];

    for (const providerId of providerIds) {
      const result = buildObservabilityRuntime(providerId, observabilityInput, readyEnv, openGates);
      const serializedBody = JSON.stringify(result.request?.body);
      const serializedHeaders = JSON.stringify(result.request?.headers);

      expect(result.mode, providerId).toBe("prepared-request");
      expect(result.request?.method, providerId).toBe("POST");
      expect(result.request?.noNetwork, providerId).toBe(true);
      expect(result.request?.dataClassifications, providerId).toEqual(
        expect.arrayContaining(["operational-telemetry", "PII-redacted", "sampled", "retention-governed"])
      );
      expect(serializedHeaders, providerId).not.toContain("configured-");
      expect(serializedBody, providerId).toContain("[redacted-email]");
      expect(serializedBody, providerId).toContain("[redacted-payment]");
      expect(serializedBody, providerId).not.toContain("sara@example.com");
      expect(serializedBody, providerId).not.toContain("4111 1111 1111 1111");
      expect(serializedBody, providerId).toContain("live_telemetry");
    }

    expect(buildObservabilityRuntime("sentry-error-observability", observabilityInput, readyEnv, openGates).request).toMatchObject({
      url: "https://sentry.io/api/{SENTRY_PROJECT_ID}/envelope/",
      headers: expect.objectContaining({ authorization: "Sentry {SENTRY_DSN}" })
    });
    expect(buildObservabilityRuntime("posthog-product-observability", observabilityInput, readyEnv, openGates).request?.url).toBe(
      "{POSTHOG_HOST}/capture/"
    );
    expect(buildObservabilityRuntime("opentelemetry-otlp-observability", observabilityInput, readyEnv, openGates).request?.url).toBe(
      "{OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces"
    );
    expect(buildObservabilityRuntime("grafana-cloud-otlp-observability", observabilityInput, readyEnv, openGates).request).toMatchObject({
      url: "{GRAFANA_OTLP_ENDPOINT}/v1/metrics",
      headers: expect.objectContaining({ authorization: "Basic {GRAFANA_OTLP_INSTANCE_ID}:{GRAFANA_OTLP_API_KEY}" })
    });
    expect(buildObservabilityRuntime("datadog-logs-observability", observabilityInput, readyEnv, openGates).request).toMatchObject({
      url: "https://http-intake.logs.{DATADOG_SITE}/api/v2/logs",
      headers: expect.objectContaining({ "DD-API-KEY": "{DATADOG_API_KEY}" })
    });
    expect(buildObservabilityRuntime("betterstack-logs-observability", observabilityInput, readyEnv, openGates).request).toMatchObject({
      url: "https://{BETTERSTACK_INGESTING_HOST}/",
      headers: expect.objectContaining({ authorization: "Bearer {BETTERSTACK_SOURCE_TOKEN}" })
    });
  });

  it("blocks observability providers without redaction, sampling, alert, and retention gates", () => {
    const result = buildObservabilityRuntime(
      "sentry-error-observability",
      { ...observabilityInput, piiFree: false, sampled: false },
      readyEnv,
      { networkAllowlisted: true }
    );

    expect(result.mode).toBe("blocked");
    expect(result.request).toBeUndefined();
    expect(result.readiness.blockedReasons).toEqual(
      expect.arrayContaining([
        "Missing safety gate: telemetry PII redaction",
        "Missing safety gate: telemetry sampling",
        "Missing safety gate: alert routing",
        "Missing safety gate: telemetry retention policy"
      ])
    );
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
    const contactResult = buildContactImportRuntime("vcard-contact-import", contactInput);
    const crm = buildCrmRuntime("crm-csv-lifecycle-import", crmInput);
    const workflow = buildWorkflowIntegrationRuntime("local-workflow-payload-export", workflowInput);
    const image = buildImageGenerationRuntime("browser-svg-renderer", imageInput);
    const notification = buildNotificationRuntime("browser-download-notification", notificationInput);
    const payment = buildPaymentRuntime("no-payment-checkout-gate", paymentInput);
    const observability = buildObservabilityRuntime("local-health-audit-observability", observabilityInput);
    const printPackage = buildProviderAdapterRuntime("local-print-package-export");
    const vendor = buildVendorRuntime("manual-vendor-handoff", { vendorId: "walgreens" });
    const pricing = buildVendorRuntime("public-printer-pricing-research", { vendorId: "walgreens" });

    expect(chat.mode).toBe("local-result");
    expect(chat.localResult?.length).toBeGreaterThan(0);
    expect(importResult.mode).toBe("local-result");
    expect(contactResult.mode).toBe("local-result");
    expect(contactResult.localResult).toMatchObject({
      contactCount: 1,
      addressSignals: true,
      rawNotesStored: false,
      photosStored: false,
      noNetwork: true
    });
    expect(crm.mode).toBe("local-result");
    expect(crm.localResult).toMatchObject({
      customerCount: 1,
      birthdaySignals: true,
      purchaseAnniversarySignals: true,
      warrantyAnniversarySignals: true,
      optInSignals: true,
      rawNotesStored: false,
      metadataOnly: true,
      noNetwork: true
    });
    expect(workflow.mode).toBe("local-result");
    expect(workflow.localResult).toMatchObject({
      exporter: "local-workflow-payload",
      customerCount: 1,
      lifecycleTriggers: expect.arrayContaining(["purchase-anniversary"]),
      rawNotesStored: false,
      metadataOnly: true,
      liveWorkflowSend: false,
      noNetwork: true
    });
    expect(image.mode).toBe("local-result");
    expect(image.localResult?.width).toBe(1500);
    expect(image.localResult?.requiredPanelCount).toBe(4);
    expect(image.localResult?.panelPrompts).toHaveLength(4);
    expect(notification.mode).toBe("local-result");
    expect(notification.localResult).toMatchObject({ noNetwork: true, visibleOnly: true });
    expect(payment.mode).toBe("local-result");
    expect(payment.localResult).toMatchObject({ noNetwork: true, realChargesEnabled: false, cardDataStored: false });
    expect(observability.mode).toBe("local-result");
    expect(observability.localResult).toMatchObject({ noNetwork: true, telemetryShipped: false });
    expect(printPackage.mode).toBe("local-result");
    expect(printPackage.localResult).toMatchObject({
      fileCount: 6,
      manifestPassed: true,
      noNetwork: true,
      realOrdersEnabled: false
    });
    expect(vendor.mode).toBe("local-result");
    expect(vendor.localResult).toMatchObject({ canPlaceRealOrder: false, realOrdersEnabled: false });
    expect(pricing.mode).toBe("local-result");
    expect(pricing.localResult).toMatchObject({
      liveQuote: false,
      selectedVendorId: "walgreens",
      refreshReport: expect.objectContaining({
        liveQuote: false,
        sourceCount: 8
      }),
      disclaimer: expect.stringContaining("not live quotes")
    });
  });

  it("never prepares live vendor order requests even with credentials and gates", () => {
    const retailOperationByAdapterId = new Map([
      ["walgreens-live-order", "upload-image"],
      ["cvs-live-order", "place-order"],
      ["fedex-live-print", "fetch-price"],
      ["walmart-live-print", "upload-image"]
    ]);

    for (const adapterId of [
      "walgreens-live-order",
      "cvs-live-order",
      "fedex-live-print",
      "walmart-live-print",
      "staples-live-print",
      "office-depot-live-print"
    ]) {
      const result = buildVendorRuntime(
        adapterId,
        {
          vendorId: "walgreens",
          quoteCents: 699,
          storeId: "store-123",
          operation: retailOperationByAdapterId.get(adapterId) as "fetch-price" | "upload-image" | "place-order" | undefined,
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
      if (retailOperationByAdapterId.has(adapterId)) {
        expect(result.localResult, adapterId).toMatchObject({
          selectedOperation: retailOperationByAdapterId.get(adapterId),
          noNetwork: true,
          realOrdersEnabled: false,
          liveQuoteEnabled: false,
          imageUploadEnabled: false,
          orderPlacementEnabled: false,
          operation: expect.objectContaining({
            status: "blocked",
            noNetwork: true,
            preparesRequest: false,
            certificationGateIds: expect.arrayContaining(["vendor-certification", "real-order-kill-switch", "customer-approval"]),
            requestBlueprint: expect.objectContaining({
              transport: "future-certified-api-or-reviewed-browser-session",
              forbiddenFields: expect.arrayContaining(["raw relationship memories", "raw payment card data"]),
              responseEvidence: expect.any(Array)
            })
          })
        });
        expect(result.readiness.blockedReasons.join(" "), adapterId).toMatch(/review-only|certified|certification|disabled/);
        expect(JSON.stringify(result.localResult), adapterId).toContain("https://");
      } else {
        expect(result.localResult, adapterId).toBeUndefined();
      }
    }
  });

  it("redacts contact and payment-like text before provider contracts", () => {
    const sanitized = sanitizeText("Email me at person@example.com, call 555-111-2222, card 4111 1111 1111 1111.");

    expect(sanitized.text).toBe("Email me at [redacted-email], call [redacted-phone], card [redacted-payment].");
    expect(sanitized.redactions).toEqual(["email", "phone", "possible-card-number"]);
  });
});
