import { getRetailPrinterProductLinkByProvider } from "./retailPrinterAdapters";

export type ProviderCapability =
  | "auth"
  | "event-import"
  | "contact-import"
  | "crm-integration"
  | "workflow-integration"
  | "text-chat"
  | "image-generation"
  | "render-export"
  | "memory"
  | "vendor-handoff"
  | "cloud-runtime"
  | "notification"
  | "payment"
  | "observability";

export type ProviderStatus = "ready-local" | "credential-gated" | "contract-only" | "blocked";
export type ProviderCost = "free-local" | "free-tier" | "usage-based" | "self-hosted" | "manual";
export type RoleSurface = "customer" | "admin";

export interface ProviderAdapter {
  id: string;
  label: string;
  provider: string;
  capability: ProviderCapability;
  lane: string;
  status: ProviderStatus;
  cost: ProviderCost;
  credentials: string[];
  safetyGates: string[];
  roleSurface: RoleSurface[];
  priority: number;
  detail: string;
  docsUrl?: string;
}

export interface ProviderCatalogRegistry {
  adapters: ProviderAdapter[];
  adaptersById: Map<string, ProviderAdapter>;
  adaptersByCapability: Map<ProviderCapability, ProviderAdapter[]>;
  readyLocalFallbackByCapability: Map<ProviderCapability, ProviderAdapter>;
}

export interface CapabilityCoverage {
  capability: ProviderCapability;
  label: string;
  total: number;
  readyLocal: number;
  credentialGated: number;
  contractOnly: number;
  blocked: number;
}

export interface ProviderCoverageSummary {
  total: number;
  capabilityCount: number;
  readyLocal: number;
  credentialGated: number;
  contractOnly: number;
  blocked: number;
  requiredEnv: string[];
  safetyGates: string[];
  capabilities: CapabilityCoverage[];
}

export interface AdminPanelModel {
  coverage: ProviderCoverageSummary;
  deploymentAdapters: ProviderAdapter[];
  integrationAdapters: ProviderAdapter[];
  gatedProviders: ProviderAdapter[];
  blockedProviders: ProviderAdapter[];
  readyLocalProviders: ProviderAdapter[];
}

export interface CustomerAction {
  label: string;
  adapterId: string;
  capability: ProviderCapability;
  status: ProviderStatus;
  detail: string;
}

export interface CustomerPanelModel {
  primaryActions: CustomerAction[];
  chatProviders: ProviderAdapter[];
  imageProviders: ProviderAdapter[];
  importProviders: ProviderAdapter[];
  handoffProviders: ProviderAdapter[];
  readyFallbacks: ProviderAdapter[];
}

export interface ChatMessage {
  role: "customer" | "assistant";
  text: string;
}

export const capabilityLabels: Record<ProviderCapability, string> = {
  auth: "Auth",
  "event-import": "Event import",
  "contact-import": "Contact import",
  "crm-integration": "CRM integration",
  "workflow-integration": "Workflow integration",
  "text-chat": "Text chat",
  "image-generation": "Image generation",
  "render-export": "Render/export",
  memory: "Memory",
  "vendor-handoff": "Vendor handoff",
  "cloud-runtime": "Cloud runtime",
  notification: "Notification",
  payment: "Payment",
  observability: "Observability"
};

function retailPrinterDocsUrl(providerAdapterId: string): string {
  const productLink = getRetailPrinterProductLinkByProvider(providerAdapterId);
  if (!productLink) throw new Error(`Missing retail printer product link for provider adapter: ${providerAdapterId}`);
  return productLink.productUrl;
}

export const providerCatalog: ProviderAdapter[] = [
  {
    id: "local-workspace-auth",
    label: "Local workspace auth",
    provider: "Browser workspace",
    capability: "auth",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["No external session token", "LocalStorage only"],
    roleSurface: ["customer", "admin"],
    priority: 1,
    detail: "Creates a reviewer workspace without a hosted identity provider."
  },
  {
    id: "email-password-auth-contract",
    label: "Email account auth contract",
    provider: "CustomCard API",
    capability: "auth",
    lane: "Production contract",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["AUTH_SESSION_SECRET"],
    safetyGates: ["HttpOnly sessions", "Hashed recovery challenges", "Revocation handling"],
    roleSurface: ["customer", "admin"],
    priority: 80,
    detail: "Documents the self-hosted auth boundary while account identity and recovery storage are contract-tested."
  },
  {
    id: "auth0-oidc-auth",
    label: "Auth0 OIDC auth",
    provider: "Auth0",
    capability: "auth",
    lane: "Hosted identity",
    status: "credential-gated",
    cost: "free-tier",
    credentials: [
      "AUTH0_DOMAIN",
      "AUTH0_CLIENT_ID",
      "AUTH0_CLIENT_SECRET",
      "AUTH0_AUDIENCE",
      "CUSTOMCARD_AUTH_CALLBACK_URL",
      "AUTH_SESSION_SECRET"
    ],
    safetyGates: ["OAuth consent required", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["customer", "admin"],
    priority: 20,
    detail: "Optional authorization-code OIDC adapter for hosted customer/admin identity.",
    docsUrl: "https://auth0.com/docs/authenticate/protocols/oauth"
  },
  {
    id: "clerk-session-auth",
    label: "Clerk session auth",
    provider: "Clerk",
    capability: "auth",
    lane: "Hosted identity",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["CLERK_SECRET_KEY", "CLERK_JWT_KEY", "CLERK_AUTHORIZED_PARTIES", "AUTH_SESSION_SECRET"],
    safetyGates: ["Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["customer", "admin"],
    priority: 21,
    detail: "Optional Clerk JWT/session verification adapter for hosted customer/admin sessions.",
    docsUrl: "https://clerk.com/docs/references/backend/verify-token"
  },
  {
    id: "supabase-auth",
    label: "Supabase Auth",
    provider: "Supabase",
    capability: "auth",
    lane: "Hosted identity",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "AUTH_SESSION_SECRET"],
    safetyGates: ["Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["customer", "admin"],
    priority: 22,
    detail: "Optional Supabase Auth adapter for verifying user JWTs before API access.",
    docsUrl: "https://supabase.com/docs/reference/javascript/auth-getuser"
  },
  {
    id: "firebase-auth",
    label: "Firebase Auth",
    provider: "Firebase",
    capability: "auth",
    lane: "Hosted identity",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON", "AUTH_SESSION_SECRET"],
    safetyGates: ["Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["customer", "admin"],
    priority: 23,
    detail: "Optional Firebase Auth adapter for token lookup and account identity verification.",
    docsUrl: "https://firebase.google.com/docs/reference/rest/auth"
  },
  {
    id: "cognito-hosted-ui-auth",
    label: "Amazon Cognito hosted auth",
    provider: "Amazon Cognito",
    capability: "auth",
    lane: "Hosted identity",
    status: "credential-gated",
    cost: "free-tier",
    credentials: [
      "COGNITO_DOMAIN",
      "AWS_REGION",
      "COGNITO_USER_POOL_ID",
      "COGNITO_APP_CLIENT_ID",
      "CUSTOMCARD_AUTH_CALLBACK_URL",
      "AUTH_SESSION_SECRET"
    ],
    safetyGates: ["OAuth consent required", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["customer", "admin"],
    priority: 24,
    detail: "Optional Cognito Hosted UI authorization-code adapter for customer/admin login.",
    docsUrl: "https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html"
  },
  {
    id: "ics-paste-import",
    label: "ICS / invite paste",
    provider: "Local parser",
    capability: "event-import",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["User pasted data only", "No mailbox scrape"],
    roleSurface: ["customer", "admin"],
    priority: 2,
    detail: "Parses pasted calendar invites and notes into card opportunities."
  },
  {
    id: "manual-note-import",
    label: "Manual event note",
    provider: "Local parser",
    capability: "event-import",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["User supplied note", "Weak signals remain needs-detail"],
    roleSurface: ["customer"],
    priority: 3,
    detail: "Lets a customer create an opportunity without connecting a provider."
  },
  {
    id: "vcard-contact-import",
    label: "vCard contact import",
    provider: "Local parser",
    capability: "contact-import",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["User pasted data only", "No notes/photos", "Deduplication review"],
    roleSurface: ["customer", "admin"],
    priority: 3.2,
    detail: "Parses pasted .vcf contact cards into address-book candidates without a provider account."
  },
  {
    id: "csv-address-import",
    label: "CSV address import",
    provider: "Local parser",
    capability: "contact-import",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["User pasted data only", "No notes/photos", "Deduplication review"],
    roleSurface: ["customer", "admin"],
    priority: 3.3,
    detail: "Parses simple pasted CSV rows for names, emails, birthdays, and postal addresses."
  },
  {
    id: "google-people-contacts",
    label: "Google People contacts",
    provider: "Google People API",
    capability: "contact-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "No raw content storage", "Revocation handling"],
    roleSurface: ["customer", "admin"],
    priority: 35,
    detail: "Imports contact names, email addresses, postal addresses, birthdays, and event metadata after scoped consent.",
    docsUrl: "https://developers.google.com/people/api/rest/v1/people.connections/list"
  },
  {
    id: "microsoft-graph-contacts",
    label: "Microsoft Graph contacts",
    provider: "Microsoft Graph",
    capability: "contact-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "No raw content storage", "Tenant review", "Revocation handling"],
    roleSurface: ["customer", "admin"],
    priority: 36,
    detail: "Imports Outlook contact metadata with least-privilege Contacts.Read scope.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/api/user-list-contacts"
  },
  {
    id: "carddav-address-book",
    label: "CardDAV address book",
    provider: "CardDAV-compatible server",
    capability: "contact-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "self-hosted",
    credentials: ["CARDDAV_BASE_URL", "CARDDAV_USERNAME", "CARDDAV_APP_PASSWORD", "CARDDAV_ADDRESSBOOK_PATH"],
    safetyGates: ["Network allowlist", "Metadata-only import", "No raw content storage", "Revocation handling"],
    roleSurface: ["customer", "admin"],
    priority: 37,
    detail: "Models generic CardDAV address-book queries for private or self-hosted contact stores.",
    docsUrl: "https://www.rfc-editor.org/rfc/rfc6352"
  },
  {
    id: "icloud-vcard-contact-fallback",
    label: "iCloud vCard fallback",
    provider: "iCloud Contacts export",
    capability: "contact-import",
    lane: "Manual integration",
    status: "contract-only",
    cost: "manual",
    credentials: [],
    safetyGates: ["Manual export only", "No Apple account credentials stored", "No notes/photos"],
    roleSurface: ["customer", "admin"],
    priority: 38,
    detail: "Supports customer-exported iCloud vCards while live Apple account access stays out of scope.",
    docsUrl: "https://support.apple.com/en-kw/108306"
  },
  {
    id: "crm-csv-lifecycle-import",
    label: "Business CRM CSV lifecycle import",
    provider: "Local business export",
    capability: "crm-integration",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["User supplied export", "Metadata-only import", "No raw content storage", "Suppression list"],
    roleSurface: ["admin"],
    priority: 3.4,
    detail: "Parses exported CRM customer rows for birthdays, purchase anniversaries, and warranty anniversaries without connecting a live CRM."
  },
  {
    id: "salesforce-crm-lifecycle",
    label: "Salesforce CRM lifecycle sync",
    provider: "Salesforce",
    capability: "crm-integration",
    lane: "Business CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["SALESFORCE_INSTANCE_URL", "SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET", "SALESFORCE_REFRESH_TOKEN"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.1,
    detail: "Prepares Salesforce Contact/Account lifecycle metadata reads for birthday, purchase-anniversary, and warranty-anniversary card campaigns.",
    docsUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm"
  },
  {
    id: "hubspot-crm-lifecycle",
    label: "HubSpot CRM lifecycle sync",
    provider: "HubSpot",
    capability: "crm-integration",
    lane: "Business CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["HUBSPOT_PRIVATE_APP_TOKEN", "HUBSPOT_PORTAL_ID"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.2,
    detail: "Prepares HubSpot contact/deal lifecycle search contracts for customer birthday and purchase-anniversary card triggers.",
    docsUrl: "https://developers.hubspot.com/docs/api-reference/latest/crm/search-the-crm"
  },
  {
    id: "zoho-crm-lifecycle",
    label: "Zoho CRM lifecycle sync",
    provider: "Zoho CRM",
    capability: "crm-integration",
    lane: "Business CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["ZOHO_ACCOUNTS_DOMAIN", "ZOHO_API_DOMAIN", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.3,
    detail: "Prepares Zoho CRM Contacts and Deals metadata reads for customer lifecycle card campaigns.",
    docsUrl: "https://www.zoho.com/crm/developer/docs/api/v6/get-records.html"
  },
  {
    id: "pipedrive-crm-lifecycle",
    label: "Pipedrive CRM lifecycle sync",
    provider: "Pipedrive",
    capability: "crm-integration",
    lane: "Business CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["PIPEDRIVE_COMPANY_DOMAIN", "PIPEDRIVE_API_TOKEN"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.4,
    detail: "Prepares Pipedrive person/deal metadata reads for birthday, purchase, and warranty anniversary triggers.",
    docsUrl: "https://developers.pipedrive.com/docs/api/v1/Persons"
  },
  {
    id: "dynamics-crm-lifecycle",
    label: "Dynamics 365 Sales lifecycle sync",
    provider: "Microsoft Dynamics 365 Sales",
    capability: "crm-integration",
    lane: "Business CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["DYNAMICS_RESOURCE_URL", "DYNAMICS_TENANT_ID", "DYNAMICS_CLIENT_ID", "DYNAMICS_CLIENT_SECRET"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.5,
    detail: "Prepares Dataverse contact/account lifecycle metadata reads for Dynamics 365 customer card campaigns.",
    docsUrl: "https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/overview"
  },
  {
    id: "shopify-crm-lifecycle",
    label: "Shopify customer lifecycle sync",
    provider: "Shopify Admin",
    capability: "crm-integration",
    lane: "Commerce CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.6,
    detail: "Prepares Shopify customer and order metadata reads for purchase-anniversary and warranty-anniversary card campaigns.",
    docsUrl: "https://shopify.dev/docs/api/admin-graphql/latest/queries/customers"
  },
  {
    id: "klaviyo-profile-lifecycle",
    label: "Klaviyo profile lifecycle sync",
    provider: "Klaviyo",
    capability: "crm-integration",
    lane: "Marketing CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["KLAVIYO_PRIVATE_API_KEY", "KLAVIYO_REVISION"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.61,
    detail: "Prepares Klaviyo profile metadata reads for opted-in birthday, purchase-anniversary, and warranty-anniversary campaigns.",
    docsUrl: "https://developers.klaviyo.com/en/reference/get_profiles"
  },
  {
    id: "mailchimp-audience-lifecycle",
    label: "Mailchimp audience lifecycle sync",
    provider: "Mailchimp Marketing",
    capability: "crm-integration",
    lane: "Marketing CRM",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["MAILCHIMP_API_KEY", "MAILCHIMP_SERVER_PREFIX", "MAILCHIMP_AUDIENCE_ID"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.62,
    detail: "Prepares Mailchimp audience-member metadata reads for lifecycle campaign review without sending campaigns.",
    docsUrl: "https://mailchimp.com/developer/marketing/api/list-members/list-members-info/"
  },
  {
    id: "activecampaign-contact-lifecycle",
    label: "ActiveCampaign contact lifecycle sync",
    provider: "ActiveCampaign",
    capability: "crm-integration",
    lane: "Marketing CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["ACTIVECAMPAIGN_BASE_URL", "ACTIVECAMPAIGN_API_KEY"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.63,
    detail: "Prepares ActiveCampaign contact metadata reads for milestone-triggered card opportunities.",
    docsUrl: "https://developers.activecampaign.com/reference/list-all-contacts"
  },
  {
    id: "bigcommerce-customer-lifecycle",
    label: "BigCommerce customer lifecycle sync",
    provider: "BigCommerce",
    capability: "crm-integration",
    lane: "Commerce CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["BIGCOMMERCE_STORE_HASH", "BIGCOMMERCE_ACCESS_TOKEN"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.64,
    detail: "Prepares BigCommerce customer and order metadata reads for commerce lifecycle cards.",
    docsUrl: "https://docs.bigcommerce.com/developer/api-reference/rest/admin/management/customers/v3/get-customers"
  },
  {
    id: "woocommerce-customer-lifecycle",
    label: "WooCommerce customer lifecycle sync",
    provider: "WooCommerce",
    capability: "crm-integration",
    lane: "Commerce CRM",
    status: "credential-gated",
    cost: "self-hosted",
    credentials: ["WOOCOMMERCE_STORE_URL", "WOOCOMMERCE_CONSUMER_KEY", "WOOCOMMERCE_CONSUMER_SECRET"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.65,
    detail: "Prepares WooCommerce customer/order metadata reads for purchase and warranty anniversary cards.",
    docsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-customers"
  },
  {
    id: "square-customer-lifecycle",
    label: "Square customer lifecycle sync",
    provider: "Square Customers",
    capability: "crm-integration",
    lane: "Commerce CRM",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.66,
    detail: "Prepares Square customer profile searches for local retail businesses with anniversary card campaigns.",
    docsUrl: "https://developer.squareup.com/reference/square/customers-api/search-customers"
  },
  {
    id: "intercom-contact-lifecycle",
    label: "Intercom contact lifecycle sync",
    provider: "Intercom",
    capability: "crm-integration",
    lane: "Customer support CRM",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["INTERCOM_ACCESS_TOKEN"],
    safetyGates: ["Metadata-only import", "No raw content storage", "Metadata schema validation", "Opt-in only", "Suppression list", "Tenant review", "Revocation handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.67,
    detail: "Prepares Intercom contact searches for support-led customer lifecycle card campaigns.",
    docsUrl: "https://developers.intercom.com/docs/references/rest-api/api.intercom.io/contacts/searchcontacts"
  },
  {
    id: "local-workflow-payload-export",
    label: "Local workflow payload export",
    provider: "CustomCard admin export",
    capability: "workflow-integration",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["Admin reviewed export", "No external workflow send", "Metadata-only import"],
    roleSurface: ["admin"],
    priority: 39.7,
    detail: "Builds reviewed JSON/CSV payloads for lifecycle campaigns without sending to automation platforms."
  },
  {
    id: "zapier-webhook-workflow",
    label: "Zapier webhook workflow",
    provider: "Zapier",
    capability: "workflow-integration",
    lane: "Workflow automation",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["ZAPIER_WEBHOOK_URL", "ZAPIER_SIGNING_SECRET"],
    safetyGates: [
      "Admin reviewed export",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Rate limit handling",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.8,
    detail: "Prepares outbound lifecycle campaign payloads for Zapier catch-hook workflows without firing the webhook.",
    docsUrl: "https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks"
  },
  {
    id: "make-webhook-workflow",
    label: "Make webhook workflow",
    provider: "Make",
    capability: "workflow-integration",
    lane: "Workflow automation",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["MAKE_WEBHOOK_URL", "MAKE_SIGNING_SECRET"],
    safetyGates: [
      "Admin reviewed export",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Rate limit handling",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.81,
    detail: "Prepares lifecycle campaign webhook contracts for Make scenarios with signature metadata and no live send.",
    docsUrl: "https://help.make.com/webhooks"
  },
  {
    id: "slack-workflow-notification",
    label: "Slack workflow notification",
    provider: "Slack",
    capability: "workflow-integration",
    lane: "Team workflow",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "SLACK_CHANNEL_ID"],
    safetyGates: [
      "Admin reviewed export",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Rate limit handling",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.82,
    detail: "Prepares internal Slack review messages for lifecycle card campaigns before any customer send or order.",
    docsUrl: "https://docs.slack.dev/reference/methods/chat.postMessage/"
  },
  {
    id: "teams-workflow-notification",
    label: "Microsoft Teams workflow notification",
    provider: "Microsoft Teams",
    capability: "workflow-integration",
    lane: "Team workflow",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["MICROSOFT_TEAMS_WEBHOOK_URL", "MICROSOFT_TEAMS_TENANT_ID"],
    safetyGates: [
      "Admin reviewed export",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Rate limit handling",
      "Tenant review",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.83,
    detail: "Prepares Teams workflow webhook cards for admin review queues without sending live notifications.",
    docsUrl: "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
  },
  {
    id: "notion-customer-database-sync",
    label: "Notion customer database sync",
    provider: "Notion",
    capability: "workflow-integration",
    lane: "Business workspace",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["NOTION_API_KEY", "NOTION_CUSTOMER_DATABASE_ID"],
    safetyGates: [
      "Admin reviewed export",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Metadata schema validation",
      "Revocation handling",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.84,
    detail: "Prepares Notion database page contracts for lifecycle card queue review without storing raw CRM notes.",
    docsUrl: "https://developers.notion.com/reference/post-page"
  },
  {
    id: "airtable-customer-base-sync",
    label: "Airtable customer base sync",
    provider: "Airtable",
    capability: "workflow-integration",
    lane: "Business workspace",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "AIRTABLE_TABLE_ID"],
    safetyGates: [
      "Admin reviewed export",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Metadata schema validation",
      "Rate limit handling",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.85,
    detail: "Prepares Airtable record-upsert contracts for opted-in lifecycle campaign queues.",
    docsUrl: "https://airtable.com/developers/web/api/create-records"
  },
  {
    id: "google-sheets-lifecycle-sync",
    label: "Google Sheets lifecycle sync",
    provider: "Google Sheets API",
    capability: "workflow-integration",
    lane: "Business workspace",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_SHEETS_SPREADSHEET_ID"],
    safetyGates: [
      "Admin reviewed export",
      "OAuth consent required",
      "Metadata-only import",
      "No raw content storage",
      "Opt-in only",
      "Suppression list",
      "Metadata schema validation",
      "Revocation handling",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 39.86,
    detail: "Prepares append-only Google Sheets rows for lifecycle card queues with scoped OAuth and no live send.",
    docsUrl: "https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append"
  },
  {
    id: "n8n-webhook-workflow",
    label: "n8n webhook workflow",
    provider: "n8n",
    capability: "workflow-integration",
    lane: "Workflow automation",
    status: "credential-gated",
    cost: "self-hosted",
    credentials: ["N8N_WEBHOOK_URL", "N8N_WEBHOOK_SECRET"],
    safetyGates: ["Admin reviewed export", "Metadata-only import", "No raw content storage", "Opt-in only", "Suppression list", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.87,
    detail: "Prepares lifecycle campaign payloads for self-hosted n8n webhook workflows without firing the webhook.",
    docsUrl: "https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/"
  },
  {
    id: "workato-webhook-workflow",
    label: "Workato webhook workflow",
    provider: "Workato",
    capability: "workflow-integration",
    lane: "Workflow automation",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["WORKATO_WEBHOOK_URL", "WORKATO_API_TOKEN"],
    safetyGates: ["Admin reviewed export", "Metadata-only import", "No raw content storage", "Opt-in only", "Suppression list", "Rate limit handling", "Tenant review", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.88,
    detail: "Prepares reviewed lifecycle campaign payloads for Workato callable recipe/webhook automation.",
    docsUrl: "https://docs.workato.com/connectors/workato_app/workato-webhooks.html"
  },
  {
    id: "pipedream-webhook-workflow",
    label: "Pipedream workflow trigger",
    provider: "Pipedream",
    capability: "workflow-integration",
    lane: "Workflow automation",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["PIPEDREAM_WORKFLOW_URL", "PIPEDREAM_SIGNING_SECRET"],
    safetyGates: ["Admin reviewed export", "Metadata-only import", "No raw content storage", "Opt-in only", "Suppression list", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 39.89,
    detail: "Prepares campaign queue events for Pipedream workflows while preserving no-network dry-run behavior.",
    docsUrl: "https://pipedream.com/docs/workflows/steps/triggers/"
  },
  {
    id: "gmail-metadata-import",
    label: "Gmail metadata adapter",
    provider: "Google Gmail API",
    capability: "event-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    safetyGates: ["Metadata-only import", "OAuth consent required", "No raw content storage"],
    roleSurface: ["customer", "admin"],
    priority: 30,
    detail: "Imports mail metadata only after scoped Google OAuth consent.",
    docsUrl: "https://developers.google.com/gmail/api/guides"
  },
  {
    id: "google-calendar-events",
    label: "Google Calendar events",
    provider: "Google Calendar API",
    capability: "event-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    safetyGates: ["Calendar scope consent", "Metadata schema validation", "Revocation handling"],
    roleSurface: ["customer", "admin"],
    priority: 31,
    detail: "Imports calendar event metadata behind the same provider connection model.",
    docsUrl: "https://developers.google.com/calendar/api/guides/overview"
  },
  {
    id: "microsoft-graph-mail",
    label: "Microsoft Graph mail",
    provider: "Microsoft Graph",
    capability: "event-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
    safetyGates: ["OAuth consent required", "Metadata-only import", "Tenant review"],
    roleSurface: ["customer", "admin"],
    priority: 32,
    detail: "Adds Outlook mail metadata as a contract-ready provider.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview"
  },
  {
    id: "microsoft-graph-calendar",
    label: "Microsoft Graph calendar",
    provider: "Microsoft Graph",
    capability: "event-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
    safetyGates: ["OAuth consent required", "Calendar event schema validation", "Revocation handling"],
    roleSurface: ["customer", "admin"],
    priority: 33,
    detail: "Adds Outlook calendar metadata import as a provider contract.",
    docsUrl: "https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview"
  },
  {
    id: "icloud-ics-fallback",
    label: "iCloud ICS fallback",
    provider: "iCloud Calendar export",
    capability: "event-import",
    lane: "Manual integration",
    status: "contract-only",
    cost: "manual",
    credentials: [],
    safetyGates: ["Manual export only", "No Apple account credentials stored"],
    roleSurface: ["customer", "admin"],
    priority: 34,
    detail: "Supports customer-provided ICS data while a live CalDAV connector stays out of scope."
  },
  {
    id: "deterministic-customer-chat",
    label: "Local customer chat",
    provider: "Deterministic rules",
    capability: "text-chat",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["No model call", "No external transcript storage"],
    roleSurface: ["customer", "admin"],
    priority: 4,
    detail: "Provides a tested scripted assistant for card intent, memory, and handoff status."
  },
  {
    id: "openai-responses-chat",
    label: "OpenAI Responses chat",
    provider: "OpenAI",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["OPENAI_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 40,
    detail: "Optional production text assistant adapter for user support and card drafting.",
    docsUrl: "https://platform.openai.com/docs/api-reference/responses"
  },
  {
    id: "azure-openai-chat",
    label: "Azure OpenAI chat",
    provider: "Azure OpenAI",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_CHAT_DEPLOYMENT"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 40.2,
    detail: "Optional Azure-hosted OpenAI chat deployment adapter for enterprise accounts.",
    docsUrl: "https://learn.microsoft.com/en-us/azure/foundry/openai/reference"
  },
  {
    id: "aws-bedrock-converse-chat",
    label: "Amazon Bedrock Converse chat",
    provider: "Amazon Bedrock",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_TEXT_MODEL_ID"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 40.4,
    detail: "Optional AWS Bedrock Converse adapter for admin-selected foundation models.",
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html"
  },
  {
    id: "anthropic-messages-chat",
    label: "Anthropic Messages chat",
    provider: "Anthropic",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["ANTHROPIC_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 41,
    detail: "Optional text assistant adapter using Anthropic's messages interface.",
    docsUrl: "https://docs.anthropic.com/en/api/messages"
  },
  {
    id: "google-gemini-chat",
    label: "Google Gemini chat",
    provider: "Google Gemini API",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["GOOGLE_GENERATIVE_AI_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 42,
    detail: "Optional text assistant adapter for Gemini-compatible chat workflows.",
    docsUrl: "https://ai.google.dev/gemini-api/docs"
  },
  {
    id: "huggingface-chat",
    label: "Hugging Face chat",
    provider: "Hugging Face Inference Providers",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["HUGGINGFACE_API_TOKEN"],
    safetyGates: ["Provider/model allowlist", "PII minimization", "Rate limit handling"],
    roleSurface: ["admin"],
    priority: 43,
    detail: "Optional low-cost hosted or routed chat provider behind an allowlist.",
    docsUrl: "https://huggingface.co/docs/inference-providers/index"
  },
  {
    id: "mistral-chat",
    label: "Mistral chat",
    provider: "Mistral AI",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["MISTRAL_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 44,
    detail: "Optional European text assistant adapter using Mistral's chat completion API.",
    docsUrl: "https://docs.mistral.ai/api"
  },
  {
    id: "cohere-chat",
    label: "Cohere chat",
    provider: "Cohere",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["COHERE_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 45,
    detail: "Optional enterprise text assistant adapter using Cohere's v2 chat API.",
    docsUrl: "https://docs.cohere.com/v2/reference/chat"
  },
  {
    id: "perplexity-sonar-chat",
    label: "Perplexity Sonar chat",
    provider: "Perplexity",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["PERPLEXITY_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 46,
    detail: "Optional research-backed support chat adapter for grounded customer explanations.",
    docsUrl: "https://docs.perplexity.ai/api-reference/chat-completions"
  },
  {
    id: "xai-chat",
    label: "xAI chat",
    provider: "xAI",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["XAI_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 47,
    detail: "Optional Grok-compatible text assistant adapter behind the same safety gates.",
    docsUrl: "https://docs.x.ai/developers/rest-api-reference/inference/chat"
  },
  {
    id: "together-chat",
    label: "Together chat",
    provider: "Together AI",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["TOGETHER_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 48,
    detail: "Optional low-cost routed chat adapter for open-weight model choices.",
    docsUrl: "https://docs.together.ai/reference/chat-completions-1"
  },
  {
    id: "groq-chat",
    label: "Groq chat",
    provider: "Groq",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["GROQ_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 48.2,
    detail: "Optional low-latency OpenAI-compatible chat adapter for Groq-hosted models.",
    docsUrl: "https://console.groq.com/docs/api-reference"
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek chat",
    provider: "DeepSeek",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["DEEPSEEK_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 48.4,
    detail: "Optional OpenAI-compatible DeepSeek chat adapter behind redaction and spend gates.",
    docsUrl: "https://api-docs.deepseek.com/api/create-chat-completion"
  },
  {
    id: "fireworks-chat",
    label: "Fireworks chat",
    provider: "Fireworks AI",
    capability: "text-chat",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["FIREWORKS_API_KEY"],
    safetyGates: ["Prompt audit", "PII minimization", "Model spend limit"],
    roleSurface: ["admin"],
    priority: 48.6,
    detail: "Optional OpenAI-compatible Fireworks chat adapter for hosted model routing.",
    docsUrl: "https://docs.fireworks.ai/api-reference/post-chatcompletions"
  },
  {
    id: "self-hosted-openai-compatible-chat",
    label: "Self-hosted chat endpoint",
    provider: "OpenAI-compatible local model",
    capability: "text-chat",
    lane: "Self-hosted",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["SELF_HOSTED_LLM_BASE_URL", "SELF_HOSTED_LLM_API_KEY"],
    safetyGates: ["Network allowlist", "Latency budget", "Model quality review"],
    roleSurface: ["admin"],
    priority: 49,
    detail: "Keeps a cheap local or private model path available without bundling a runtime."
  },
  {
    id: "browser-svg-renderer",
    label: "Browser SVG renderer",
    provider: "CustomCard renderer",
    capability: "image-generation",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["Deterministic output", "5x7 validation", "No external image API"],
    roleSurface: ["customer", "admin"],
    priority: 5,
    detail: "Creates inspectable 1500 x 2100 card panels from local templates."
  },
  {
    id: "openai-images",
    label: "OpenAI Images",
    provider: "OpenAI",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["OPENAI_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 50,
    detail: "Optional image generation adapter for richer card artwork.",
    docsUrl: "https://platform.openai.com/docs/api-reference/images"
  },
  {
    id: "azure-openai-image",
    label: "Azure OpenAI image",
    provider: "Azure OpenAI",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_IMAGE_DEPLOYMENT"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 50.2,
    detail: "Optional Azure-hosted OpenAI image deployment adapter for richer card artwork.",
    docsUrl: "https://learn.microsoft.com/en-us/azure/foundry/openai/reference"
  },
  {
    id: "aws-bedrock-image",
    label: "Amazon Bedrock image",
    provider: "Amazon Bedrock",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_IMAGE_MODEL_ID"],
    safetyGates: ["Model allowlist", "Spend limit", "Human approval before print", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 50.4,
    detail: "Optional AWS Bedrock image invocation adapter behind model allowlisting.",
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html"
  },
  {
    id: "google-gemini-image",
    label: "Google Gemini image",
    provider: "Google Gemini API",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["GOOGLE_GENERATIVE_AI_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 51,
    detail: "Optional image-generation adapter for Gemini image models.",
    docsUrl: "https://ai.google.dev/gemini-api/docs/image-generation"
  },
  {
    id: "stability-stable-image",
    label: "Stability AI image",
    provider: "Stability AI",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["STABILITY_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 52,
    detail: "Optional adapter for Stability image generation APIs.",
    docsUrl: "https://platform.stability.ai/docs/getting-started/stable-image"
  },
  {
    id: "huggingface-image",
    label: "Hugging Face image",
    provider: "Hugging Face Inference Providers",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["HUGGINGFACE_API_TOKEN"],
    safetyGates: ["Provider/model allowlist", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 53,
    detail: "Optional low-cost text-to-image path routed through selected inference providers.",
    docsUrl: "https://huggingface.co/docs/inference-providers/index"
  },
  {
    id: "replicate-image",
    label: "Replicate image",
    provider: "Replicate",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["REPLICATE_API_TOKEN"],
    safetyGates: ["Model allowlist", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 54,
    detail: "Optional adapter for hosted image model predictions.",
    docsUrl: "https://replicate.com/docs/reference/http"
  },
  {
    id: "together-image",
    label: "Together image",
    provider: "Together AI",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["TOGETHER_API_KEY"],
    safetyGates: ["Model allowlist", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 55,
    detail: "Optional FLUX-family image-generation adapter through Together's hosted image API.",
    docsUrl: "https://docs.together.ai/docs/inference/images/overview"
  },
  {
    id: "ideogram-image",
    label: "Ideogram image",
    provider: "Ideogram",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["IDEOGRAM_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 56,
    detail: "Optional image-generation adapter for design-oriented card artwork.",
    docsUrl: "https://developer.ideogram.ai/api-reference/api-reference/generate-v3"
  },
  {
    id: "leonardo-image",
    label: "Leonardo image",
    provider: "Leonardo.Ai",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["LEONARDO_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 57,
    detail: "Optional image-generation adapter for production art exploration.",
    docsUrl: "https://docs.leonardo.ai/reference/creategeneration"
  },
  {
    id: "fal-image",
    label: "fal image",
    provider: "fal.ai",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["FAL_KEY"],
    safetyGates: ["Model allowlist", "Spend limit", "Human approval before print"],
    roleSurface: ["admin"],
    priority: 57.2,
    detail: "Optional queued fal image-generation adapter for admin-selected model endpoints.",
    docsUrl: "https://fal.ai/docs/documentation/model-apis/inference/queue"
  },
  {
    id: "bfl-flux-image",
    label: "Black Forest Labs image",
    provider: "Black Forest Labs",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["BFL_API_KEY"],
    safetyGates: ["Model allowlist", "Spend limit", "Human approval before print", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 57.4,
    detail: "Optional FLUX image-generation adapter with asynchronous retrieval kept out of the local runtime.",
    docsUrl: "https://docs.us.bfl.ai/quick_start/generating_images"
  },
  {
    id: "adobe-firefly-image",
    label: "Adobe Firefly image",
    provider: "Adobe Firefly Services",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["ADOBE_FIREFLY_CLIENT_ID", "ADOBE_FIREFLY_CLIENT_SECRET", "ADOBE_FIREFLY_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 57.6,
    detail: "Optional commercially-oriented Firefly image adapter for brand-reviewed card artwork.",
    docsUrl: "https://developer.adobe.com/firefly-services/docs/firefly-api/api/"
  },
  {
    id: "recraft-image",
    label: "Recraft image",
    provider: "Recraft",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["RECRAFT_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 57.8,
    detail: "Optional production image/vector generation adapter for card illustration experiments.",
    docsUrl: "https://www.recraft.ai/docs/api-reference/endpoints"
  },
  {
    id: "luma-image",
    label: "Luma image",
    provider: "Luma AI",
    capability: "image-generation",
    lane: "AI provider",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["LUMA_API_KEY"],
    safetyGates: ["Prompt audit", "Spend limit", "Human approval before print", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 57.9,
    detail: "Optional Luma image generation adapter for visual concept exploration before print approval.",
    docsUrl: "https://docs.lumalabs.ai/docs/image-generation"
  },
  {
    id: "svg-download-export",
    label: "SVG export",
    provider: "Browser download",
    capability: "render-export",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["1500 x 2100 panels", "300 DPI contract", "Layout validation"],
    roleSurface: ["customer", "admin"],
    priority: 6,
    detail: "Exports the four card panels without object storage or paid render services."
  },
  {
    id: "local-print-package-export",
    label: "Local print package export",
    provider: "CustomCard renderer",
    capability: "render-export",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["Four SVG panels", "Combined PDF proof", "Manifest checksums", "No object storage upload"],
    roleSurface: ["customer", "admin"],
    priority: 6.2,
    detail: "Builds source SVGs, a combined 5x7 PDF proof, and a manifest for manual printer handoff."
  },
  {
    id: "object-store-render-packets",
    label: "Object-store render packets",
    provider: "S3/MinIO",
    capability: "render-export",
    lane: "Production contract",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["OBJECT_STORE_URL", "OBJECT_STORE_BUCKET", "OBJECT_STORE_SIGNING_SECRET"],
    safetyGates: ["Checksum required", "HMAC signed URL contract", "Retention policy required", "Local filesystem write doctor", "S3-compatible client contract doctor"],
    roleSurface: ["admin"],
    priority: 65,
    detail: "Writes render packets through local filesystem and injected S3-compatible client contracts without claiming live cloud bucket writes."
  },
  {
    id: "local-relationship-memory",
    label: "Relationship memory",
    provider: "Browser workspace",
    capability: "memory",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["User approved", "Delete control", "No hidden personalization"],
    roleSurface: ["customer", "admin"],
    priority: 7,
    detail: "Stores approved memory in the local workspace only."
  },
  {
    id: "postgres-memory-store",
    label: "Postgres memory store",
    provider: "Postgres",
    capability: "memory",
    lane: "Production contract",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["DATABASE_URL"],
    safetyGates: ["Consent records", "Forget flow", "Audit log"],
    roleSurface: ["admin"],
    priority: 66,
    detail: "Migration-backed memory model for hosted deployment."
  },
  {
    id: "manual-vendor-handoff",
    label: "Manual print checklist",
    provider: "Walgreens, CVS, FedEx, Walmart, Staples, Office Depot, local print shop",
    capability: "vendor-handoff",
    lane: "Free local",
    status: "ready-local",
    cost: "manual",
    credentials: [],
    safetyGates: ["No real order API", "User opens print shop", "Checklist approval"],
    roleSurface: ["customer", "admin"],
    priority: 8,
    detail: "Keeps printing cheap and reviewable through customer-confirmed upload."
  },
  {
    id: "public-printer-pricing-research",
    label: "Public printer pricing research",
    provider: "Walgreens, CVS, FedEx, Walmart, Staples, and Office Depot public pages",
    capability: "vendor-handoff",
    lane: "Pricing research",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["Public pages only", "Manual confirmation required", "No checkout automation"],
    roleSurface: ["customer", "admin"],
    priority: 8.1,
    detail: "Compares observed public 5x7 card prices without treating them as live quotes."
  },
  {
    id: "walgreens-live-order",
    label: "Walgreens live order",
    provider: "Walgreens",
    capability: "vendor-handoff",
    lane: "Certified vendor",
    status: "blocked",
    cost: "usage-based",
    credentials: ["WALGREENS_VENDOR_MODE"],
    safetyGates: ["Physical print certification", "Live quote", "Explicit approval", "Kill switch disabled only after certification"],
    roleSurface: ["admin"],
    priority: 90,
    detail: "Models Walgreens Photo price fetch, image upload, and order placement, all blocked until partner certification and print QA exist.",
    docsUrl: retailPrinterDocsUrl("walgreens-live-order")
  },
  {
    id: "cvs-live-order",
    label: "CVS live order",
    provider: "CVS Photo",
    capability: "vendor-handoff",
    lane: "Certified vendor",
    status: "blocked",
    cost: "usage-based",
    credentials: ["CVS_VENDOR_MODE"],
    safetyGates: ["Vendor certification", "Live quote", "Explicit approval", "Kill switch disabled only after certification"],
    roleSurface: ["admin"],
    priority: 91,
    detail: "Models CVS Photo price fetch, image upload, and order placement, all blocked until certified vendor-browser or API evidence exists.",
    docsUrl: retailPrinterDocsUrl("cvs-live-order")
  },
  {
    id: "fedex-live-print",
    label: "FedEx live print",
    provider: "FedEx Office",
    capability: "vendor-handoff",
    lane: "Certified vendor",
    status: "blocked",
    cost: "usage-based",
    credentials: ["FEDEX_VENDOR_MODE"],
    safetyGates: ["Vendor certification", "Live quote", "Explicit approval", "Kill switch disabled only after certification"],
    roleSurface: ["admin"],
    priority: 92,
    detail: "Models FedEx Office price fetch, file upload, and order placement, all blocked until print QA and order recovery are verified.",
    docsUrl: retailPrinterDocsUrl("fedex-live-print")
  },
  {
    id: "walmart-live-print",
    label: "Walmart live print",
    provider: "Walmart Photo",
    capability: "vendor-handoff",
    lane: "Certified vendor",
    status: "blocked",
    cost: "usage-based",
    credentials: ["WALMART_VENDOR_MODE"],
    safetyGates: ["Vendor certification", "Live quote", "Explicit approval", "Kill switch disabled only after certification"],
    roleSurface: ["admin"],
    priority: 93,
    detail: "Models Walmart Photo price fetch, image upload, and order placement, all blocked while pricing research remains manual and review-only.",
    docsUrl: retailPrinterDocsUrl("walmart-live-print")
  },
  {
    id: "staples-live-print",
    label: "Staples live print",
    provider: "Staples Print",
    capability: "vendor-handoff",
    lane: "Certified vendor",
    status: "blocked",
    cost: "usage-based",
    credentials: ["STAPLES_VENDOR_MODE"],
    safetyGates: ["Vendor certification", "Live quote", "Explicit approval", "Kill switch disabled only after certification"],
    roleSurface: ["admin"],
    priority: 94,
    detail: "Modeled as a future print-service adapter after bundle pricing, pickup, and recovery paths are certified."
  },
  {
    id: "office-depot-live-print",
    label: "Office Depot live print",
    provider: "Office Depot",
    capability: "vendor-handoff",
    lane: "Certified vendor",
    status: "blocked",
    cost: "usage-based",
    credentials: ["OFFICE_DEPOT_VENDOR_MODE"],
    safetyGates: ["Vendor certification", "Live quote", "Explicit approval", "Kill switch disabled only after certification"],
    roleSurface: ["admin"],
    priority: 95,
    detail: "Modeled as a future print-service adapter after card-stock QA and order recovery are verified."
  },
  {
    id: "browser-download-notification",
    label: "Browser handoff status",
    provider: "Local UI",
    capability: "notification",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["No email/SMS send", "Visible status only"],
    roleSurface: ["customer"],
    priority: 9,
    detail: "Shows export and checklist state without a messaging provider."
  },
  {
    id: "resend-email-notification",
    label: "Resend email notification",
    provider: "Resend",
    capability: "notification",
    lane: "Transactional email",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["RESEND_API_KEY", "TRANSACTIONAL_EMAIL_FROM"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.1,
    detail: "Prepares card status and reminder email requests through Resend without sending live mail.",
    docsUrl: "https://resend.com/docs/api-reference/emails/send-email"
  },
  {
    id: "sendgrid-email-notification",
    label: "SendGrid email notification",
    provider: "Twilio SendGrid",
    capability: "notification",
    lane: "Transactional email",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["SENDGRID_API_KEY", "TRANSACTIONAL_EMAIL_FROM"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.2,
    detail: "Prepares Twilio SendGrid v3 mail-send requests for opted-in customer notifications.",
    docsUrl: "https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send"
  },
  {
    id: "postmark-email-notification",
    label: "Postmark email notification",
    provider: "Postmark",
    capability: "notification",
    lane: "Transactional email",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["POSTMARK_SERVER_TOKEN", "TRANSACTIONAL_EMAIL_FROM"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.3,
    detail: "Prepares Postmark outbound email contracts with message-stream metadata and no live sends.",
    docsUrl: "https://postmarkapp.com/developer/api/email-api#send-a-single-email"
  },
  {
    id: "mailgun-email-notification",
    label: "Mailgun email notification",
    provider: "Mailgun",
    capability: "notification",
    lane: "Transactional email",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "TRANSACTIONAL_EMAIL_FROM"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.4,
    detail: "Prepares Mailgun domain-scoped message requests after opt-in and suppression checks.",
    docsUrl: "https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/messages/post-v3--domain-name--messages"
  },
  {
    id: "twilio-sms-notification",
    label: "Twilio SMS notification",
    provider: "Twilio Messaging",
    capability: "notification",
    lane: "SMS",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_SERVICE_SID"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.5,
    detail: "Prepares SMS status-update contracts through a configured Twilio Messaging Service.",
    docsUrl: "https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource"
  },
  {
    id: "whatsapp-cloud-notification",
    label: "WhatsApp Cloud notification",
    provider: "Meta WhatsApp Cloud API",
    capability: "notification",
    lane: "WhatsApp",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.6,
    detail: "Prepares approved-template WhatsApp notification requests without contacting Meta.",
    docsUrl: "https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api"
  },
  {
    id: "expo-push-notification",
    label: "Expo push notification",
    provider: "Expo Push Service",
    capability: "notification",
    lane: "Mobile push",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["EXPO_ACCESS_TOKEN"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.7,
    detail: "Prepares Expo push payloads for the customer mobile shell after push-token opt-in.",
    docsUrl: "https://docs.expo.dev/push-notifications/sending-notifications/"
  },
  {
    id: "firebase-cloud-messaging",
    label: "Firebase Cloud Messaging",
    provider: "Firebase Cloud Messaging",
    capability: "notification",
    lane: "Mobile push",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.8,
    detail: "Prepares FCM HTTP v1 message contracts for native customer push notifications.",
    docsUrl: "https://firebase.google.com/docs/cloud-messaging/send/v1-api"
  },
  {
    id: "customerio-transactional-notification",
    label: "Customer.io transactional notification",
    provider: "Customer.io",
    capability: "notification",
    lane: "Customer messaging",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["CUSTOMERIO_APP_API_KEY", "CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.81,
    detail: "Prepares Customer.io transactional email, push, SMS, or in-app message requests for approved card updates.",
    docsUrl: "https://docs.customer.io/journeys/transactional-api-examples/"
  },
  {
    id: "braze-canvas-notification",
    label: "Braze Canvas notification",
    provider: "Braze",
    capability: "notification",
    lane: "Customer messaging",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["BRAZE_REST_ENDPOINT", "BRAZE_REST_API_KEY", "BRAZE_CANVAS_ID"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.82,
    detail: "Prepares Braze campaign/canvas trigger contracts for customer lifecycle messages without live sends.",
    docsUrl: "https://www.braze.com/docs/api/endpoints/messaging/send_messages/post_send_messages/"
  },
  {
    id: "onesignal-message-notification",
    label: "OneSignal message notification",
    provider: "OneSignal",
    capability: "notification",
    lane: "Customer messaging",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["ONESIGNAL_APP_ID", "ONESIGNAL_REST_API_KEY"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.83,
    detail: "Prepares OneSignal push, email, SMS, or live-activity message contracts for opted-in customers.",
    docsUrl: "https://documentation.onesignal.com/reference/create-message"
  },
  {
    id: "courier-send-notification",
    label: "Courier send notification",
    provider: "Courier",
    capability: "notification",
    lane: "Customer messaging",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["COURIER_AUTH_TOKEN", "COURIER_TEMPLATE_ID"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.84,
    detail: "Prepares Courier routing-based send contracts for customer card status notifications.",
    docsUrl: "https://www.courier.com/docs/reference/send"
  },
  {
    id: "knock-workflow-notification",
    label: "Knock workflow notification",
    provider: "Knock",
    capability: "notification",
    lane: "Customer messaging",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["KNOCK_API_KEY", "KNOCK_WORKFLOW_KEY"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.85,
    detail: "Prepares Knock workflow triggers for cross-channel customer notification journeys.",
    docsUrl: "https://docs.knock.app/send-notifications/triggering-workflows/api"
  },
  {
    id: "novu-trigger-notification",
    label: "Novu trigger notification",
    provider: "Novu",
    capability: "notification",
    lane: "Customer messaging",
    status: "credential-gated",
    cost: "self-hosted",
    credentials: ["NOVU_API_KEY", "NOVU_WORKFLOW_ID"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs", "Rate limit handling", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.86,
    detail: "Prepares Novu workflow trigger contracts for self-hostable customer notification routing.",
    docsUrl: "https://docs.novu.co/api-reference/events/trigger-event"
  },
  {
    id: "transactional-email-contract",
    label: "Transactional email contract",
    provider: "SMTP/API provider",
    capability: "notification",
    lane: "Production contract",
    status: "contract-only",
    cost: "free-tier",
    credentials: ["TRANSACTIONAL_EMAIL_API_KEY", "TRANSACTIONAL_EMAIL_FROM"],
    safetyGates: ["Opt-in only", "Suppression list", "No sensitive card text in logs"],
    roleSurface: ["admin"],
    priority: 67,
    detail: "Documents a future notification adapter without selecting a paid provider."
  },
  {
    id: "no-payment-checkout-gate",
    label: "No-payment checkout gate",
    provider: "Local UI",
    capability: "payment",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["No card data stored", "Real charges disabled"],
    roleSurface: ["customer", "admin"],
    priority: 9.9,
    detail: "Keeps checkout customer-confirmed with no card collection or live charge."
  },
  {
    id: "stripe-checkout-payment",
    label: "Stripe Checkout payment",
    provider: "Stripe",
    capability: "payment",
    lane: "Payment sandbox",
    status: "credential-gated",
    cost: "usage-based",
    credentials: [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "CUSTOMCARD_PAYMENT_SUCCESS_URL",
      "CUSTOMCARD_PAYMENT_CANCEL_URL"
    ],
    safetyGates: [
      "Payment sandbox",
      "No card data storage",
      "Idempotency key",
      "Refund path documented",
      "Webhook signature verification",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 9.91,
    detail: "Prepares Stripe Checkout Session contracts without collecting card data or creating live charges.",
    docsUrl: "https://docs.stripe.com/api/checkout/sessions/create"
  },
  {
    id: "paypal-orders-payment",
    label: "PayPal Orders payment",
    provider: "PayPal",
    capability: "payment",
    lane: "Payment sandbox",
    status: "credential-gated",
    cost: "usage-based",
    credentials: [
      "PAYPAL_CLIENT_ID",
      "PAYPAL_CLIENT_SECRET",
      "PAYPAL_WEBHOOK_ID",
      "CUSTOMCARD_PAYMENT_SUCCESS_URL",
      "CUSTOMCARD_PAYMENT_CANCEL_URL"
    ],
    safetyGates: [
      "Payment sandbox",
      "No card data storage",
      "Idempotency key",
      "Refund path documented",
      "Webhook signature verification",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 9.92,
    detail: "Prepares PayPal Orders v2 sandbox contracts while keeping capture and refunds disabled.",
    docsUrl: "https://developer.paypal.com/docs/api/orders/v2/#orders_create"
  },
  {
    id: "square-payments-sandbox",
    label: "Square Payments sandbox",
    provider: "Square",
    capability: "payment",
    lane: "Payment sandbox",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_WEBHOOK_SIGNATURE_KEY"],
    safetyGates: [
      "Payment sandbox",
      "No card data storage",
      "Idempotency key",
      "Refund path documented",
      "Webhook signature verification",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 9.93,
    detail: "Prepares Square Payments API sandbox contracts with nonce-only source handling.",
    docsUrl: "https://developer.squareup.com/docs/payments-api/take-payments"
  },
  {
    id: "adyen-checkout-payment",
    label: "Adyen Checkout payment",
    provider: "Adyen",
    capability: "payment",
    lane: "Payment sandbox",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["ADYEN_API_KEY", "ADYEN_MERCHANT_ACCOUNT", "ADYEN_HMAC_KEY", "CUSTOMCARD_PAYMENT_SUCCESS_URL"],
    safetyGates: [
      "Payment sandbox",
      "No card data storage",
      "Idempotency key",
      "Refund path documented",
      "Webhook signature verification",
      "Network allowlist"
    ],
    roleSurface: ["admin"],
    priority: 9.94,
    detail: "Prepares Adyen Checkout API sandbox payment contracts with tokenized client-side payment data only.",
    docsUrl: "https://docs.adyen.com/api-explorer/Checkout/latest/post/payments"
  },
  {
    id: "local-health-audit-observability",
    label: "Local health and audit telemetry",
    provider: "CustomCard runtime",
    capability: "observability",
    lane: "Free local",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["No external telemetry", "PII redaction", "Sampling configured"],
    roleSurface: ["admin"],
    priority: 9.95,
    detail: "Summarizes health, audit, and runtime events locally without shipping telemetry."
  },
  {
    id: "sentry-error-observability",
    label: "Sentry error tracking",
    provider: "Sentry",
    capability: "observability",
    lane: "Error tracking",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["SENTRY_DSN", "SENTRY_PROJECT_ID", "SENTRY_ENVIRONMENT"],
    safetyGates: ["PII redaction", "Sampling configured", "Alert routing", "Retention policy", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.96,
    detail: "Prepares Sentry envelope contracts for redacted runtime errors and release markers.",
    docsUrl: "https://develop.sentry.dev/sdk/foundations/transport/envelopes/"
  },
  {
    id: "posthog-product-observability",
    label: "PostHog product analytics",
    provider: "PostHog",
    capability: "observability",
    lane: "Product analytics",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["POSTHOG_PROJECT_API_KEY", "POSTHOG_HOST"],
    safetyGates: ["PII redaction", "Sampling configured", "Alert routing", "Retention policy", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.97,
    detail: "Prepares consent-aware product event capture contracts without real user tracking.",
    docsUrl: "https://posthog.com/docs/api/capture"
  },
  {
    id: "opentelemetry-otlp-observability",
    label: "OpenTelemetry OTLP exporter",
    provider: "OpenTelemetry",
    capability: "observability",
    lane: "Open telemetry",
    status: "credential-gated",
    cost: "self-hosted",
    credentials: ["OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_HEADERS"],
    safetyGates: ["PII redaction", "Sampling configured", "Alert routing", "Retention policy", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.98,
    detail: "Prepares OTLP trace/metric export contracts for self-hosted or managed collectors.",
    docsUrl: "https://opentelemetry.io/docs/specs/otlp/"
  },
  {
    id: "grafana-cloud-otlp-observability",
    label: "Grafana Cloud OTLP",
    provider: "Grafana Cloud",
    capability: "observability",
    lane: "Managed observability",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["GRAFANA_OTLP_ENDPOINT", "GRAFANA_OTLP_INSTANCE_ID", "GRAFANA_OTLP_API_KEY"],
    safetyGates: ["PII redaction", "Sampling configured", "Alert routing", "Retention policy", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 9.99,
    detail: "Prepares Grafana Cloud OTLP metrics contracts for cheap managed monitoring.",
    docsUrl: "https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/"
  },
  {
    id: "datadog-logs-observability",
    label: "Datadog Logs",
    provider: "Datadog",
    capability: "observability",
    lane: "Managed logs",
    status: "credential-gated",
    cost: "usage-based",
    credentials: ["DATADOG_API_KEY", "DATADOG_SITE"],
    safetyGates: ["PII redaction", "Sampling configured", "Alert routing", "Retention policy", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 10.01,
    detail: "Prepares Datadog log intake contracts for redacted API and worker events.",
    docsUrl: "https://docs.datadoghq.com/api/latest/logs/"
  },
  {
    id: "betterstack-logs-observability",
    label: "Better Stack Logs",
    provider: "Better Stack",
    capability: "observability",
    lane: "Managed logs",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["BETTERSTACK_SOURCE_TOKEN", "BETTERSTACK_INGESTING_HOST"],
    safetyGates: ["PII redaction", "Sampling configured", "Alert routing", "Retention policy", "Network allowlist"],
    roleSurface: ["admin"],
    priority: 10.02,
    detail: "Prepares Better Stack HTTP log ingestion contracts for low-cost runtime logs.",
    docsUrl: "https://betterstack.com/docs/logs/ingesting-data/http/logs/"
  },
  {
    id: "docker-compose-dev",
    label: "Docker Compose dev",
    provider: "Docker",
    capability: "cloud-runtime",
    lane: "Local infra",
    status: "ready-local",
    cost: "free-local",
    credentials: [],
    safetyGates: ["Dev-only defaults", "Runtime doctor", "Kill switch disabled"],
    roleSurface: ["admin"],
    priority: 10,
    detail: "Runs app, worker, Postgres, Redis, and MinIO locally."
  },
  {
    id: "docker-compose-droplet",
    label: "Cheap droplet compose",
    provider: "Docker",
    capability: "cloud-runtime",
    lane: "Cheap deployment",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["POSTGRES_PASSWORD", "DATABASE_URL", "QUEUE_URL", "OBJECT_STORE_URL"],
    safetyGates: ["Managed secret source", "Runtime doctor", "Backups required before production"],
    roleSurface: ["admin"],
    priority: 70,
    detail: "Single-host path for low-cost cloud deployment."
  },
  {
    id: "kubernetes-web-worker",
    label: "Kubernetes web + worker",
    provider: "Kubernetes",
    capability: "cloud-runtime",
    lane: "Cloud native",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["DATABASE_URL", "QUEUE_URL", "OBJECT_STORE_URL", "POSTGRES_PASSWORD"],
    safetyGates: ["Secret manager", "Migration job", "Readiness probes", "Backups required before production"],
    roleSurface: ["admin"],
    priority: 71,
    detail: "Cloud-native manifest path with separate web and worker deployments."
  }
];

export const providerCatalogRegistry = buildProviderCatalogRegistry(providerCatalog);

export function buildProviderCatalogRegistry(adapters: ProviderAdapter[] = providerCatalog): ProviderCatalogRegistry {
  const sortedAdapters = sortByPriority(adapters);
  const adaptersById = new Map<string, ProviderAdapter>();
  const adaptersByCapability = new Map<ProviderCapability, ProviderAdapter[]>();
  const readyLocalFallbackByCapability = new Map<ProviderCapability, ProviderAdapter>();

  for (const adapter of sortedAdapters) {
    adaptersById.set(adapter.id, adapter);
    adaptersByCapability.set(adapter.capability, [...(adaptersByCapability.get(adapter.capability) ?? []), adapter]);

    if (adapter.status === "ready-local" && !readyLocalFallbackByCapability.has(adapter.capability)) {
      readyLocalFallbackByCapability.set(adapter.capability, adapter);
    }
  }

  return {
    adapters: sortedAdapters,
    adaptersById,
    adaptersByCapability,
    readyLocalFallbackByCapability
  };
}

export function getProviderAdapter(
  adapterId: string,
  registry: ProviderCatalogRegistry = providerCatalogRegistry
): ProviderAdapter | undefined {
  return registry.adaptersById.get(adapterId);
}

export function getAdaptersByCapability(
  capability: ProviderCapability,
  adapters: ProviderAdapter[] = providerCatalog
): ProviderAdapter[] {
  return buildProviderCatalogRegistry(adapters).adaptersByCapability.get(capability) ?? [];
}

export function summarizeProviderCoverage(
  adapters: ProviderAdapter[] = providerCatalog
): ProviderCoverageSummary {
  const capabilities = Object.keys(capabilityLabels).map((capability) => {
    const typedCapability = capability as ProviderCapability;
    const matching = adapters.filter((adapter) => adapter.capability === typedCapability);

    return {
      capability: typedCapability,
      label: capabilityLabels[typedCapability],
      total: matching.length,
      readyLocal: matching.filter((adapter) => adapter.status === "ready-local").length,
      credentialGated: matching.filter((adapter) => adapter.status === "credential-gated").length,
      contractOnly: matching.filter((adapter) => adapter.status === "contract-only").length,
      blocked: matching.filter((adapter) => adapter.status === "blocked").length
    };
  });

  return {
    total: adapters.length,
    capabilityCount: capabilities.filter((capability) => capability.total > 0).length,
    readyLocal: adapters.filter((adapter) => adapter.status === "ready-local").length,
    credentialGated: adapters.filter((adapter) => adapter.status === "credential-gated").length,
    contractOnly: adapters.filter((adapter) => adapter.status === "contract-only").length,
    blocked: adapters.filter((adapter) => adapter.status === "blocked").length,
    requiredEnv: uniqueSorted(adapters.flatMap((adapter) => adapter.credentials)),
    safetyGates: uniqueSorted(adapters.flatMap((adapter) => adapter.safetyGates)),
    capabilities
  };
}

export function buildAdminPanelModel(adapters: ProviderAdapter[] = providerCatalog): AdminPanelModel {
  const registry = buildProviderCatalogRegistry(adapters);

  return {
    coverage: summarizeProviderCoverage(adapters),
    deploymentAdapters: registry.adaptersByCapability.get("cloud-runtime") ?? [],
    integrationAdapters: sortByPriority(
      adapters.filter((adapter) => adapter.capability === "crm-integration" || adapter.capability === "workflow-integration")
    ),
    gatedProviders: sortByPriority(adapters.filter((adapter) => adapter.status === "credential-gated")),
    blockedProviders: sortByPriority(adapters.filter((adapter) => adapter.status === "blocked")),
    readyLocalProviders: sortByPriority(adapters.filter((adapter) => adapter.status === "ready-local"))
  };
}

export function buildCustomerPanelModel(adapters: ProviderAdapter[] = providerCatalog): CustomerPanelModel {
  const registry = buildProviderCatalogRegistry(adapters);
  const customerAdapters = adapters.filter((adapter) => adapter.roleSurface.includes("customer"));
  const firstReady = (capability: ProviderCapability) => {
    const fallback = registry.readyLocalFallbackByCapability.get(capability);
    return fallback?.roleSurface.includes("customer")
      ? fallback
      : customerAdapters.find((adapter) => adapter.capability === capability && adapter.status === "ready-local");
  };

  const primaryActions = [
    firstReady("event-import"),
    firstReady("text-chat"),
    firstReady("image-generation"),
    firstReady("render-export"),
    firstReady("payment"),
    firstReady("vendor-handoff")
  ]
    .filter((adapter): adapter is ProviderAdapter => Boolean(adapter))
    .map((adapter) => ({
      label: capabilityLabels[adapter.capability],
      adapterId: adapter.id,
      capability: adapter.capability,
      status: adapter.status,
      detail: adapter.detail
    }));

  return {
    primaryActions,
    chatProviders: registry.adaptersByCapability.get("text-chat") ?? [],
    imageProviders: sortByPriority(
      adapters.filter((adapter) => adapter.capability === "image-generation" || adapter.capability === "render-export")
    ),
    importProviders: sortByPriority(
      customerAdapters.filter((adapter) => ["event-import", "contact-import"].includes(adapter.capability))
    ),
    handoffProviders: sortByPriority(adapters.filter((adapter) => adapter.capability === "vendor-handoff")),
    readyFallbacks: sortByPriority(customerAdapters.filter((adapter) => adapter.status === "ready-local"))
  };
}

export function buildCustomerChatTranscript(recipient = "Sara and Ahmed"): ChatMessage[] {
  return [
    {
      role: "customer",
      text: `I need a warm card for ${recipient}, and I want pickup to stay manual.`
    },
    {
      role: "assistant",
      text: "I can use the pasted event, approved memories, and the card proof path. Creative suggestions and checkout stay under your review until you choose otherwise."
    },
    {
      role: "customer",
      text: "Keep it personal, but do not use anything private unless I approved it."
    },
    {
      role: "assistant",
      text: "Approved memory is separated from hidden data, and the print checklist keeps the final upload under your control."
    }
  ];
}

export function validateProviderCatalog(adapters: ProviderAdapter[] = providerCatalog): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const requiredCapabilities = Object.keys(capabilityLabels) as ProviderCapability[];

  for (const adapter of adapters) {
    if (ids.has(adapter.id)) {
      errors.push(`Duplicate adapter id: ${adapter.id}`);
    }
    ids.add(adapter.id);

    if (!adapter.label.trim()) errors.push(`Adapter ${adapter.id} is missing a label.`);
    if (!adapter.provider.trim()) errors.push(`Adapter ${adapter.id} is missing a provider.`);
    if (adapter.roleSurface.length === 0) errors.push(`Adapter ${adapter.id} has no role surface.`);
    if (adapter.safetyGates.length === 0) errors.push(`Adapter ${adapter.id} has no safety gates.`);
    if (adapter.status === "ready-local" && adapter.credentials.length > 0) {
      errors.push(`Ready-local adapter ${adapter.id} should not require credentials.`);
    }
    if (adapter.status === "credential-gated" && adapter.credentials.length === 0) {
      errors.push(`Credential-gated adapter ${adapter.id} must name required env vars.`);
    }
    if (adapter.status === "credential-gated" && !adapter.docsUrl) {
      errors.push(`Credential-gated adapter ${adapter.id} must include an official docs URL.`);
    }
    const retailPrinterProductLink = getRetailPrinterProductLinkByProvider(adapter.id);
    if (retailPrinterProductLink && adapter.docsUrl !== retailPrinterProductLink.productUrl) {
      errors.push(`Retail printer adapter ${adapter.id} must use its canonical product URL as docsUrl.`);
    }
    if (retailPrinterProductLink && adapter.docsUrl && isPlaceholderProviderDocsUrl(adapter.docsUrl)) {
      errors.push(`Retail printer adapter ${adapter.id} docsUrl must not be placeholder, demo, localhost, or example content.`);
    }
  }

  for (const capability of requiredCapabilities) {
    const capabilityAdapters = adapters.filter((adapter) => adapter.capability === capability);
    if (capabilityAdapters.length === 0) {
      errors.push(`Missing capability: ${capability}`);
    }
    if (!capabilityAdapters.some((adapter) => adapter.status === "ready-local")) {
      errors.push(`Capability ${capability} has no ready-local fallback.`);
    }
  }

  const liveVendorAdapters = adapters.filter(
    (adapter) => adapter.capability === "vendor-handoff" && adapter.id.includes("live")
  );
  for (const adapter of liveVendorAdapters) {
    if (adapter.status !== "blocked") {
      errors.push(`Live vendor adapter ${adapter.id} must stay blocked.`);
    }
  }

  return errors;
}

function isPlaceholderProviderDocsUrl(url: string): boolean {
  const normalized = safeDecodeUrlText(url).toLowerCase();
  if (/\b(example\.com|localhost|127\.0\.0\.1|placeholder|dummy|todo|mock)\b/.test(normalized)) return true;
  return /(^|[/?#&=._-])demo($|[/?#&=._-])/.test(normalized);
}

function safeDecodeUrlText(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

export function providerStatusLabel(status: ProviderStatus): string {
  const labels: Record<ProviderStatus, string> = {
    "ready-local": "Ready",
    "credential-gated": "Credential gated",
    "contract-only": "Contract only",
    blocked: "Blocked"
  };
  return labels[status];
}

function sortByPriority<T extends { priority: number; label: string }>(items: T[]): T[] {
  return items.slice().sort((first, second) => first.priority - second.priority || first.label.localeCompare(second.label));
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => first.localeCompare(second));
}
