import { describe, expect, it } from "vitest";
import {
  buildAdminPanelModel,
  buildCustomerChatTranscript,
  buildCustomerPanelModel,
  buildProviderCatalogRegistry,
  getAdaptersByCapability,
  getProviderAdapter,
  providerCatalog,
  providerCatalogRegistry,
  summarizeProviderCoverage,
  validateProviderCatalog,
  type ProviderCapability
} from "./providerCatalog";
import { retailPrinterProductLinks, type RetailPrinterVendorId } from "./retailPrinterAdapters";
import {
  retailPrinterProviderDocsUrl,
  validateRetailPrinterProviderDocsUrls
} from "./retailPrinterProviderDocs";

describe("provider catalog", () => {
  it("exposes a deterministic registry seam for thin provider clients", () => {
    const registry = buildProviderCatalogRegistry();

    expect(registry.adapters).toHaveLength(providerCatalog.length);
    expect(registry.adaptersById.size).toBe(providerCatalog.length);
    expect(registry.adaptersByCapability.get("text-chat")?.map((adapter) => adapter.id)).toEqual(
      getAdaptersByCapability("text-chat").map((adapter) => adapter.id)
    );
    expect(registry.readyLocalFallbackByCapability.get("image-generation")).toBeUndefined();
    expect(registry.readyLocalFallbackByCapability.get("payment")?.id).toBe("no-payment-checkout-gate");
    expect(getProviderAdapter("openai-responses-chat")?.capability).toBe("text-chat");
    expect(providerCatalogRegistry.adaptersById.get("manual-vendor-handoff")?.status).toBe("ready-local");
  });

  it("covers platform capabilities with local fallbacks while keeping AI provider-gated", () => {
    const requiredCapabilities: ProviderCapability[] = [
      "auth",
      "event-import",
      "contact-import",
      "crm-integration",
      "workflow-integration",
      "text-chat",
      "image-generation",
      "render-export",
      "memory",
      "vendor-handoff",
      "cloud-runtime",
      "notification",
      "payment",
      "observability"
    ];
    const summary = summarizeProviderCoverage();

    expect(summary.total).toBeGreaterThanOrEqual(121);
    expect(summary.capabilityCount).toBe(requiredCapabilities.length);

    for (const capability of requiredCapabilities) {
      const adapters = getAdaptersByCapability(capability);
      expect(adapters.length).toBeGreaterThan(0);
      if (capability === "text-chat" || capability === "image-generation") {
        expect(adapters.some((adapter) => adapter.status === "ready-local")).toBe(false);
        expect(adapters.some((adapter) => adapter.status === "credential-gated")).toBe(true);
      } else {
        expect(adapters.some((adapter) => adapter.status === "ready-local")).toBe(true);
      }
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
      "Salesforce CRM lifecycle sync",
      "HubSpot CRM lifecycle sync",
      "Zoho CRM lifecycle sync",
      "Pipedrive CRM lifecycle sync",
      "Dynamics 365 Sales lifecycle sync",
      "Shopify customer lifecycle sync",
      "Klaviyo profile lifecycle sync",
      "Mailchimp audience lifecycle sync",
      "ActiveCampaign contact lifecycle sync",
      "BigCommerce customer lifecycle sync",
      "WooCommerce customer lifecycle sync",
      "Square customer lifecycle sync",
      "Intercom contact lifecycle sync",
      "Zapier webhook workflow",
      "Make webhook workflow",
      "Slack workflow notification",
      "Microsoft Teams workflow notification",
      "Notion customer database sync",
      "Airtable customer base sync",
      "Google Sheets lifecycle sync",
      "n8n webhook workflow",
      "Workato webhook workflow",
      "Pipedream workflow trigger",
      "Resend email notification",
      "SendGrid email notification",
      "Postmark email notification",
      "Mailgun email notification",
      "Twilio SMS notification",
      "WhatsApp Cloud notification",
      "Expo push notification",
      "Firebase Cloud Messaging",
      "Customer.io transactional notification",
      "Braze Canvas notification",
      "OneSignal message notification",
      "Courier send notification",
      "Knock workflow notification",
      "Novu trigger notification",
      "Stripe Checkout payment",
      "PayPal Orders payment",
      "Square Payments sandbox",
      "Adyen Checkout payment",
      "Sentry error tracking",
      "PostHog product analytics",
      "OpenTelemetry OTLP exporter",
      "Grafana Cloud OTLP",
      "Datadog Logs",
      "Better Stack Logs",
      "Azure OpenAI chat",
      "Amazon Bedrock Converse chat",
      "Anthropic Messages chat",
      "Google Gemini chat",
      "Cloudflare Workers AI chat",
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
      "Cloudflare Workers AI image",
      "Stability AI image",
      "Hugging Face chat",
      "Hugging Face image",
      "DeepAI image",
      "Replicate image",
      "Together image",
      "Ideogram image",
      "Leonardo image",
      "fal image",
      "Black Forest Labs image",
      "Adobe Firefly image",
      "Recraft image",
      "Luma image",
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
    expect(admin.coverage.requiredEnv).toContain("SALESFORCE_INSTANCE_URL");
    expect(admin.coverage.requiredEnv).toContain("SALESFORCE_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("SALESFORCE_CLIENT_SECRET");
    expect(admin.coverage.requiredEnv).toContain("SALESFORCE_REFRESH_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("HUBSPOT_PRIVATE_APP_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("HUBSPOT_PORTAL_ID");
    expect(admin.coverage.requiredEnv).toContain("ZOHO_ACCOUNTS_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("ZOHO_API_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("ZOHO_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("ZOHO_CLIENT_SECRET");
    expect(admin.coverage.requiredEnv).toContain("ZOHO_REFRESH_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("PIPEDRIVE_COMPANY_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("PIPEDRIVE_API_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("DYNAMICS_RESOURCE_URL");
    expect(admin.coverage.requiredEnv).toContain("DYNAMICS_TENANT_ID");
    expect(admin.coverage.requiredEnv).toContain("DYNAMICS_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("DYNAMICS_CLIENT_SECRET");
    expect(admin.coverage.requiredEnv).toContain("SHOPIFY_SHOP_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("SHOPIFY_ADMIN_ACCESS_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("KLAVIYO_PRIVATE_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("MAILCHIMP_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("ACTIVECAMPAIGN_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("BIGCOMMERCE_ACCESS_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("WOOCOMMERCE_CONSUMER_KEY");
    expect(admin.coverage.requiredEnv).toContain("INTERCOM_ACCESS_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("ZAPIER_WEBHOOK_URL");
    expect(admin.coverage.requiredEnv).toContain("ZAPIER_SIGNING_SECRET");
    expect(admin.coverage.requiredEnv).toContain("MAKE_WEBHOOK_URL");
    expect(admin.coverage.requiredEnv).toContain("MAKE_SIGNING_SECRET");
    expect(admin.coverage.requiredEnv).toContain("SLACK_BOT_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("SLACK_SIGNING_SECRET");
    expect(admin.coverage.requiredEnv).toContain("SLACK_CHANNEL_ID");
    expect(admin.coverage.requiredEnv).toContain("MICROSOFT_TEAMS_WEBHOOK_URL");
    expect(admin.coverage.requiredEnv).toContain("MICROSOFT_TEAMS_TENANT_ID");
    expect(admin.coverage.requiredEnv).toContain("NOTION_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("NOTION_CUSTOMER_DATABASE_ID");
    expect(admin.coverage.requiredEnv).toContain("AIRTABLE_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("AIRTABLE_BASE_ID");
    expect(admin.coverage.requiredEnv).toContain("AIRTABLE_TABLE_ID");
    expect(admin.coverage.requiredEnv).toContain("GOOGLE_SHEETS_SPREADSHEET_ID");
    expect(admin.coverage.requiredEnv).toContain("N8N_WEBHOOK_URL");
    expect(admin.coverage.requiredEnv).toContain("WORKATO_WEBHOOK_URL");
    expect(admin.coverage.requiredEnv).toContain("PIPEDREAM_WORKFLOW_URL");
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
    expect(admin.coverage.requiredEnv).toContain("CLOUDFLARE_ACCOUNT_ID");
    expect(admin.coverage.requiredEnv).toContain("CLOUDFLARE_API_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("CLOUDFLARE_WORKERS_AI_TEXT_MODEL");
    expect(admin.coverage.requiredEnv).toContain("STABILITY_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("HUGGINGFACE_API_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("DEEPAI_API_KEY");
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
    expect(admin.coverage.requiredEnv).toContain("ADOBE_FIREFLY_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("RECRAFT_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("LUMA_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("RESEND_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("SENDGRID_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("POSTMARK_SERVER_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("MAILGUN_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("MAILGUN_DOMAIN");
    expect(admin.coverage.requiredEnv).toContain("TWILIO_ACCOUNT_SID");
    expect(admin.coverage.requiredEnv).toContain("TWILIO_AUTH_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("TWILIO_MESSAGING_SERVICE_SID");
    expect(admin.coverage.requiredEnv).toContain("WHATSAPP_ACCESS_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("WHATSAPP_PHONE_NUMBER_ID");
    expect(admin.coverage.requiredEnv).toContain("EXPO_ACCESS_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("CUSTOMERIO_APP_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("BRAZE_REST_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("ONESIGNAL_REST_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("COURIER_AUTH_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("KNOCK_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("NOVU_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("STRIPE_SECRET_KEY");
    expect(admin.coverage.requiredEnv).toContain("STRIPE_WEBHOOK_SECRET");
    expect(admin.coverage.requiredEnv).toContain("CUSTOMCARD_PAYMENT_SUCCESS_URL");
    expect(admin.coverage.requiredEnv).toContain("CUSTOMCARD_PAYMENT_CANCEL_URL");
    expect(admin.coverage.requiredEnv).toContain("PAYPAL_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("PAYPAL_CLIENT_SECRET");
    expect(admin.coverage.requiredEnv).toContain("PAYPAL_WEBHOOK_ID");
    expect(admin.coverage.requiredEnv).toContain("SQUARE_ACCESS_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("SQUARE_LOCATION_ID");
    expect(admin.coverage.requiredEnv).toContain("SQUARE_WEBHOOK_SIGNATURE_KEY");
    expect(admin.coverage.requiredEnv).toContain("ADYEN_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("ADYEN_MERCHANT_ACCOUNT");
    expect(admin.coverage.requiredEnv).toContain("ADYEN_HMAC_KEY");
    expect(admin.coverage.requiredEnv).toContain("SENTRY_DSN");
    expect(admin.coverage.requiredEnv).toContain("SENTRY_PROJECT_ID");
    expect(admin.coverage.requiredEnv).toContain("SENTRY_ENVIRONMENT");
    expect(admin.coverage.requiredEnv).toContain("POSTHOG_PROJECT_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("POSTHOG_HOST");
    expect(admin.coverage.requiredEnv).toContain("OTEL_EXPORTER_OTLP_ENDPOINT");
    expect(admin.coverage.requiredEnv).toContain("OTEL_EXPORTER_OTLP_HEADERS");
    expect(admin.coverage.requiredEnv).toContain("GRAFANA_OTLP_ENDPOINT");
    expect(admin.coverage.requiredEnv).toContain("GRAFANA_OTLP_INSTANCE_ID");
    expect(admin.coverage.requiredEnv).toContain("GRAFANA_OTLP_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("DATADOG_API_KEY");
    expect(admin.coverage.requiredEnv).toContain("DATADOG_SITE");
    expect(admin.coverage.requiredEnv).toContain("BETTERSTACK_SOURCE_TOKEN");
    expect(admin.coverage.requiredEnv).toContain("BETTERSTACK_INGESTING_HOST");
    expect(admin.coverage.requiredEnv).toContain("OBJECT_STORE_SIGNING_SECRET");
    expect(admin.coverage.requiredEnv).toContain("MICROSOFT_CLIENT_ID");
    expect(admin.coverage.requiredEnv).toContain("WALMART_VENDOR_MODE");
    expect(admin.coverage.requiredEnv).toContain("STAPLES_VENDOR_MODE");
    expect(admin.coverage.requiredEnv).toContain("OFFICE_DEPOT_VENDOR_MODE");
    expect(admin.deploymentAdapters.map((adapter) => adapter.label)).toContain("Cheap droplet compose");
    expect(providerCatalog.find((adapter) => adapter.id === "object-store-render-packets")).toMatchObject({
      credentials: expect.arrayContaining(["OBJECT_STORE_URL", "OBJECT_STORE_SIGNING_SECRET"]),
      safetyGates: expect.arrayContaining(["HMAC signed URL contract", "Local filesystem write doctor", "S3-compatible client contract doctor"])
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
    expect(getProviderAdapter("walmart-live-print")).toMatchObject({
      docsUrl:
        "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
      detail: expect.stringContaining("price fetch")
    });
    expect(getProviderAdapter("fedex-live-print")).toMatchObject({
      docsUrl: "https://www.office.fedex.com/default/greeting-cards-quick.html",
      detail: expect.stringContaining("file upload")
    });
    expect(getProviderAdapter("cvs-live-order")).toMatchObject({
      docsUrl: expect.stringContaining("CommerceProduct_26126"),
      detail: expect.stringContaining("image upload")
    });
    expect(getProviderAdapter("walgreens-live-order")).toMatchObject({
      docsUrl: expect.stringContaining("CommerceProduct_33272"),
      detail: expect.stringContaining("order placement")
    });
    expect(admin.readyLocalProviders.map((adapter) => adapter.label)).toContain("Public printer pricing research");
    expect(admin.readyLocalProviders.map((adapter) => adapter.label)).toContain("Local print package export");
    expect(admin.readyLocalProviders.map((adapter) => adapter.label)).toContain("Business CRM CSV lifecycle import");
    expect(admin.readyLocalProviders.map((adapter) => adapter.label)).toContain("Local workflow payload export");
    expect(admin.gatedProviders.map((adapter) => adapter.label)).toContain("Salesforce CRM lifecycle sync");
    expect(admin.gatedProviders.map((adapter) => adapter.label)).toContain("Klaviyo profile lifecycle sync");
    expect(admin.gatedProviders.map((adapter) => adapter.label)).toContain("Customer.io transactional notification");
    expect(admin.gatedProviders.map((adapter) => adapter.label)).toContain("Zapier webhook workflow");
    expect(admin.integrationAdapters.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining([
        "Business CRM CSV lifecycle import",
        "Local workflow payload export",
        "Salesforce CRM lifecycle sync",
        "Klaviyo profile lifecycle sync",
        "Zapier webhook workflow",
        "Google Sheets lifecycle sync",
        "n8n webhook workflow"
      ])
    );
  });

  it("builds a customer panel model from ready paths plus gated provider choices", () => {
    const customer = buildCustomerPanelModel();
    const transcript = buildCustomerChatTranscript("Sara and Ahmed");

    expect(customer.primaryActions.map((action) => action.capability)).toEqual(
      expect.arrayContaining(["event-import", "render-export", "payment", "vendor-handoff"])
    );
    expect(customer.primaryActions.map((action) => action.capability)).not.toEqual(
      expect.arrayContaining(["text-chat", "image-generation"])
    );
    expect(customer.readyFallbacks.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining([
        "Local print package export",
        "Manual print checklist",
        "Public printer pricing research",
        "vCard contact import",
        "No-payment checkout gate"
      ])
    );
    expect(customer.importProviders.map((adapter) => adapter.label)).toEqual(
      expect.arrayContaining(["ICS / invite paste", "vCard contact import", "Google People contacts"])
    );
    expect(customer.importProviders.map((adapter) => adapter.label)).not.toContain("Salesforce CRM lifecycle sync");
    expect(customer.chatProviders.length).toBeGreaterThanOrEqual(15);
    expect(customer.imageProviders.length).toBeGreaterThanOrEqual(17);
    expect(transcript.map((message) => message.text).join(" ")).toContain(
      "Creative suggestions and checkout stay under your review"
    );
  });

  it("passes the catalog integrity validator", () => {
    expect(validateProviderCatalog()).toEqual([]);
  });

  it("uses canonical retail printer product links for live printer catalog docs", () => {
    const providerIds: Record<RetailPrinterVendorId, string> = {
      walmart: "walmart-live-print",
      fedex: "fedex-live-print",
      cvs: "cvs-live-order",
      walgreens: "walgreens-live-order"
    };

    expect(validateProviderCatalog()).toEqual([]);

    for (const [vendorId, providerId] of Object.entries(providerIds) as [RetailPrinterVendorId, string][]) {
      const adapter = getProviderAdapter(providerId);
      expect(adapter?.docsUrl).toBe(retailPrinterProductLinks[vendorId].productUrl);
      expect(adapter?.docsUrl).toMatch(/^https:\/\//);
      expect(adapter?.docsUrl).not.toMatch(/example\.com|localhost|placeholder|dummy|todo|mock/i);
    }
  });

  it("keeps retail printer docs validation behind the retail provider docs seam", () => {
    expect(retailPrinterProviderDocsUrl("walgreens-live-order")).toBe(retailPrinterProductLinks.walgreens.productUrl);
    expect(
      validateRetailPrinterProviderDocsUrls([
        {
          id: "walgreens-live-order",
          docsUrl: "https://example.com/demo"
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Retail printer adapter walgreens-live-order must use its canonical product URL as docsUrl.",
        "Retail printer adapter walgreens-live-order docsUrl must not be placeholder, demo, localhost, or example content."
      ])
    );
  });
});
