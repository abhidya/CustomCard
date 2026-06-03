export type ProviderCapability =
  | "auth"
  | "event-import"
  | "text-chat"
  | "image-generation"
  | "render-export"
  | "memory"
  | "vendor-handoff"
  | "cloud-runtime"
  | "notification";

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
  "text-chat": "Text chat",
  "image-generation": "Image generation",
  "render-export": "Render/export",
  memory: "Memory",
  "vendor-handoff": "Vendor handoff",
  "cloud-runtime": "Cloud runtime",
  notification: "Notification"
};

export const providerCatalog: ProviderAdapter[] = [
  {
    id: "local-demo-auth",
    label: "Local demo auth",
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
    safetyGates: ["HttpOnly sessions", "Password reset not shipped"],
    roleSurface: ["admin"],
    priority: 80,
    detail: "Documents the future hosted auth boundary without enabling account creation."
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
    id: "gmail-metadata-import",
    label: "Gmail metadata adapter",
    provider: "Google Gmail API",
    capability: "event-import",
    lane: "Provider integration",
    status: "credential-gated",
    cost: "free-tier",
    credentials: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    safetyGates: ["Metadata-only import", "OAuth consent required", "No raw content storage"],
    roleSurface: ["admin"],
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
    roleSurface: ["admin"],
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
    roleSurface: ["admin"],
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
    roleSurface: ["admin"],
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
    id: "object-store-render-packets",
    label: "Object-store render packets",
    provider: "S3/MinIO",
    capability: "render-export",
    lane: "Production contract",
    status: "contract-only",
    cost: "self-hosted",
    credentials: ["OBJECT_STORE_URL", "OBJECT_STORE_BUCKET"],
    safetyGates: ["Checksum required", "Signed URL not shipped", "Retention policy required"],
    roleSurface: ["admin"],
    priority: 65,
    detail: "Models durable render-packet storage for deployment without enabling uploads."
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
    detail: "Stores approved memory in the local demo workspace only."
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
    label: "Manual vendor handoff",
    provider: "Walgreens, CVS, FedEx, local print shop",
    capability: "vendor-handoff",
    lane: "Free local",
    status: "ready-local",
    cost: "manual",
    credentials: [],
    safetyGates: ["No real order API", "User uploads files", "Checklist approval"],
    roleSurface: ["customer", "admin"],
    priority: 8,
    detail: "Keeps fulfillment cheap and reviewable through manual upload."
  },
  {
    id: "public-printer-pricing-research",
    label: "Public printer pricing research",
    provider: "Walgreens, CVS, FedEx public pages",
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
    detail: "Hard blocked until partner certification and print QA exist."
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
    detail: "Modeled as a future adapter, not a live ordering path."
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
    detail: "Modeled as a future adapter after print QA and order recovery are verified."
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

export function getAdaptersByCapability(
  capability: ProviderCapability,
  adapters: ProviderAdapter[] = providerCatalog
): ProviderAdapter[] {
  return sortByPriority(adapters.filter((adapter) => adapter.capability === capability));
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
  return {
    coverage: summarizeProviderCoverage(adapters),
    deploymentAdapters: sortByPriority(adapters.filter((adapter) => adapter.capability === "cloud-runtime")),
    gatedProviders: sortByPriority(adapters.filter((adapter) => adapter.status === "credential-gated")),
    blockedProviders: sortByPriority(adapters.filter((adapter) => adapter.status === "blocked")),
    readyLocalProviders: sortByPriority(adapters.filter((adapter) => adapter.status === "ready-local"))
  };
}

export function buildCustomerPanelModel(adapters: ProviderAdapter[] = providerCatalog): CustomerPanelModel {
  const customerAdapters = adapters.filter((adapter) => adapter.roleSurface.includes("customer"));
  const firstReady = (capability: ProviderCapability) =>
    customerAdapters.find((adapter) => adapter.capability === capability && adapter.status === "ready-local");

  const primaryActions = [
    firstReady("event-import"),
    firstReady("text-chat"),
    firstReady("image-generation"),
    firstReady("render-export"),
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
    chatProviders: sortByPriority(adapters.filter((adapter) => adapter.capability === "text-chat")),
    imageProviders: sortByPriority(
      adapters.filter((adapter) => adapter.capability === "image-generation" || adapter.capability === "render-export")
    ),
    importProviders: sortByPriority(adapters.filter((adapter) => adapter.capability === "event-import")),
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
      text: "I can use the pasted event, approved memories, and the free SVG renderer. Live AI and vendor orders stay off until the admin enables credential gates."
    },
    {
      role: "customer",
      text: "Keep it personal, but do not use anything private unless I approved it."
    },
    {
      role: "assistant",
      text: "Approved memory is separated from hidden data, and the handoff checklist keeps the final upload under your control."
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
