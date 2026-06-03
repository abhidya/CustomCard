import { buildVendorHandoff, parseFreeImport, sampleInviteText, type VendorId } from "./freeMvp";
import {
  buildCustomerChatTranscript,
  providerCatalog,
  type ChatMessage,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderStatus
} from "./providerCatalog";
import { buildPrinterPricingComparison } from "./printerPricing";
import { buildSamplePrintExportPackage, summarizePrintExportPackage } from "./printExport";

export type RuntimeMode = "local-result" | "prepared-request" | "blocked";
export type HttpMethod = "GET" | "POST" | "REPORT";

export interface ProviderRuntimeEnv {
  [key: string]: string | undefined;
}

export interface ProviderGateState {
  externalConsentRecorded?: boolean;
  metadataOnly?: boolean;
  rawContentStorageDisabled?: boolean;
  metadataSchemaValidated?: boolean;
  revocationHandlingReady?: boolean;
  tenantReviewed?: boolean;
  promptAuditApproved?: boolean;
  piiMinimized?: boolean;
  spendLimitCents?: number;
  humanApprovalBeforePrint?: boolean;
  modelAllowlisted?: boolean;
  rateLimitHandlingReady?: boolean;
  latencyBudgetMet?: boolean;
  modelQualityReviewed?: boolean;
  networkAllowlisted?: boolean;
  vendorCertificationRecorded?: boolean;
  liveQuoteReceived?: boolean;
  externalShareApproved?: boolean;
  physicalPrintQaRecorded?: boolean;
}

export interface TextChatRuntimeInput {
  customerMessage: string;
  recipientName: string;
  approvedMemoryNotes: string[];
  locale: string;
}

export interface AuthRuntimeInput {
  requestedRole: "customer" | "admin";
  returnToPath: string;
  sessionTokenPreview?: string;
}

export interface ImageRuntimeInput {
  prompt: string;
  recipientName: string;
  occasion: string;
  style: string;
  locale: string;
  printApproved: boolean;
}

export interface EventImportRuntimeInput {
  sourceText: string;
  providerAccountId?: string;
  calendarId?: string;
  fromIso: string;
  toIso: string;
}

export interface ContactImportRuntimeInput {
  sourceText: string;
  providerAccountId?: string;
  groupId?: string;
  syncToken?: string;
  addressBookPath?: string;
}

export interface VendorRuntimeInput {
  vendorId: VendorId;
  quoteCents?: number;
  storeId?: string;
  certificationRecorded?: boolean;
  externalShareApproved?: boolean;
  physicalPrintQaRecorded?: boolean;
}

export interface ProviderRuntimeInput {
  auth?: AuthRuntimeInput;
  textChat?: TextChatRuntimeInput;
  image?: ImageRuntimeInput;
  eventImport?: EventImportRuntimeInput;
  contactImport?: ContactImportRuntimeInput;
  vendor?: VendorRuntimeInput;
}

export interface RuntimeReadiness {
  adapterId: string;
  label: string;
  capability: ProviderCapability;
  status: ProviderStatus;
  mode: RuntimeMode;
  missingCredentials: string[];
  blockedReasons: string[];
  satisfiedGates: string[];
  requiredSafetyGates: string[];
}

export interface RuntimeRequestContract {
  adapterId: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  credentialRefs: string[];
  dataClassifications: string[];
  noNetwork: true;
}

export interface RuntimeResult<TLocal = unknown> {
  adapterId: string;
  capability: ProviderCapability;
  mode: RuntimeMode;
  readiness: RuntimeReadiness;
  localResult?: TLocal;
  request?: RuntimeRequestContract;
}

export interface SanitizedText {
  text: string;
  redactions: string[];
}

const placeholderValues = new Set([
  "",
  "changeme",
  "disabled",
  "disabled_until_certified",
  "dummy",
  "example",
  "example-secret",
  "fake",
  "not-set",
  "replace-me",
  "replace-me-do-not-commit-real-secret",
  "sample",
  "todo",
  "unset"
]);

const providerScopes: Record<string, string[]> = {
  "gmail-metadata-import": ["gmail.metadata.readonly"],
  "google-calendar-events": ["calendar.events.readonly"],
  "google-people-contacts": ["contacts.readonly"],
  "microsoft-graph-mail": ["Mail.ReadBasic"],
  "microsoft-graph-calendar": ["Calendars.ReadBasic"],
  "microsoft-graph-contacts": ["Contacts.Read"]
};

export function buildProviderAdapterRuntime(
  adapterId: string,
  input: ProviderRuntimeInput = {},
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireAdapter(adapterId);

  if (adapter.capability === "auth") {
    return buildAuthRuntime(adapterId, input.auth ?? defaultAuthInput, env, gates);
  }
  if (adapter.capability === "event-import") {
    return buildEventImportRuntime(adapterId, input.eventImport ?? defaultEventImportInput, env, gates);
  }
  if (adapter.capability === "contact-import") {
    return buildContactImportRuntime(adapterId, input.contactImport ?? defaultContactImportInput, env, gates);
  }
  if (adapter.capability === "text-chat") {
    return buildTextChatRuntime(adapterId, input.textChat ?? defaultTextChatInput, env, gates);
  }
  if (adapter.capability === "image-generation") {
    return buildImageGenerationRuntime(adapterId, input.image ?? defaultImageInput, env, gates);
  }
  if (adapter.capability === "vendor-handoff") {
    return buildVendorRuntime(adapterId, input.vendor ?? defaultVendorInput, env, gates);
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
  if (readiness.mode === "blocked") {
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "blocked",
      readiness
    };
  }

  if (adapter.id === "local-print-package-export") {
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: summarizePrintExportPackage(buildSamplePrintExportPackage())
    };
  }

  return {
    adapterId: adapter.id,
    capability: adapter.capability,
    mode: "local-result",
    readiness,
    localResult: {
      adapterId: adapter.id,
      label: adapter.label,
      lane: adapter.lane,
      noNetwork: true,
      safetyGates: adapter.safetyGates,
      status: adapter.status
    }
  };
}

export function getProviderRuntimeReadiness(
  adapterId: string,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeReadiness {
  const adapter = requireAdapter(adapterId);
  const missingCredentials = adapter.credentials.filter((credential) => !hasUsableEnvValue(env[credential]));
  const blockedReasons = [
    ...missingCredentials.map((credential) => `Missing credential: ${credential}`),
    ...missingSafetyReasons(adapter, gates),
    ...statusReasons(adapter)
  ];

  return {
    adapterId: adapter.id,
    label: adapter.label,
    capability: adapter.capability,
    status: adapter.status,
    mode: blockedReasons.length === 0 ? modeForReadyAdapter(adapter) : "blocked",
    missingCredentials,
    blockedReasons,
    satisfiedGates: adapter.safetyGates.filter((gate) => safetyGateSatisfied(gate, gates)),
    requiredSafetyGates: adapter.safetyGates
  };
}

export function buildAuthRuntime(
  adapterId: string,
  input: AuthRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "auth");

  if (adapter.id === "local-demo-auth") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: {
        adapterId: adapter.id,
        requestedRole: input.requestedRole,
        noNetwork: true,
        sessionStorage: "browser-local-demo",
        returnToPath: input.returnToPath
      }
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
  return blockedOrRequest(adapter, readiness, () => buildAuthRequest(adapter, input));
}

export function buildTextChatRuntime(
  adapterId: string,
  input: TextChatRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult<ChatMessage[]> {
  const adapter = requireCapability(adapterId, "text-chat");
  if (adapter.id === "deterministic-customer-chat") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: buildCustomerChatTranscript(input.recipientName)
    };
  }

  const sanitized = sanitizeText(
    [
      `Customer: ${input.customerMessage}`,
      `Recipient: ${input.recipientName}`,
      `Locale: ${input.locale}`,
      `Approved memories: ${input.approvedMemoryNotes.join(" | ") || "none"}`
    ].join("\n")
  );
  const readiness = getProviderRuntimeReadiness(adapter.id, env, { ...gates, piiMinimized: true });

  return blockedOrRequest(adapter, readiness, () => buildTextChatRequest(adapter, sanitized));
}

export function buildImageGenerationRuntime(
  adapterId: string,
  input: ImageRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult<{ renderer: string; width: 1500; height: 2100; dpi: 300; prompt: string }> {
  const adapter = requireCapability(adapterId, "image-generation");
  const sanitized = sanitizeText(
    `${input.occasion} card artwork for ${input.recipientName}. Style: ${input.style}. Prompt: ${input.prompt}`
  );

  if (adapter.id === "browser-svg-renderer") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: {
        renderer: "browser-svg",
        width: 1500,
        height: 2100,
        dpi: 300,
        prompt: sanitized.text
      }
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    piiMinimized: true,
    humanApprovalBeforePrint: input.printApproved || gates.humanApprovalBeforePrint
  });

  return blockedOrRequest(adapter, readiness, () => buildImageRequest(adapter, sanitized, input));
}

export function buildEventImportRuntime(
  adapterId: string,
  input: EventImportRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "event-import");

  if (adapter.id === "ics-paste-import" || adapter.id === "manual-note-import" || adapter.id === "icloud-ics-fallback") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: parseFreeImport(input.sourceText || sampleInviteText)
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    externalConsentRecorded: gates.externalConsentRecorded,
    metadataOnly: true,
    rawContentStorageDisabled: true
  });

  return blockedOrRequest(adapter, readiness, () => buildEventImportRequest(adapter, input));
}

export function buildContactImportRuntime(
  adapterId: string,
  input: ContactImportRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "contact-import");

  if (adapter.id === "vcard-contact-import" || adapter.id === "csv-address-import" || adapter.id === "icloud-vcard-contact-fallback") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: parseContactImport(input.sourceText || sampleContactText)
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    metadataOnly: true,
    rawContentStorageDisabled: true
  });

  return blockedOrRequest(adapter, readiness, () => buildContactImportRequest(adapter, input));
}

export function buildVendorRuntime(
  adapterId: string,
  input: VendorRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "vendor-handoff");

  if (adapter.id === "manual-vendor-handoff") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: buildVendorHandoff(input.vendorId, {
        passed: true,
        checks: [],
        errors: []
      })
    };
  }

  if (adapter.id === "public-printer-pricing-research") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: buildPrinterPricingComparison(input.vendorId)
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    vendorCertificationRecorded: input.certificationRecorded || gates.vendorCertificationRecorded,
    liveQuoteReceived: Boolean(input.quoteCents && input.storeId) || gates.liveQuoteReceived,
    externalShareApproved: input.externalShareApproved || gates.externalShareApproved,
    physicalPrintQaRecorded: input.physicalPrintQaRecorded || gates.physicalPrintQaRecorded
  });

  return {
    adapterId: adapter.id,
    capability: adapter.capability,
    mode: "blocked",
    readiness: {
      ...readiness,
      mode: "blocked",
      blockedReasons: uniqueSorted([
        ...readiness.blockedReasons,
        "Live vendor orders remain disabled until certification, quote, approval, QA, and kill-switch policy are proven."
      ])
    }
  };
}

export function validateRuntimeCoverage(adapters: ProviderAdapter[] = providerCatalog): string[] {
  const errors: string[] = [];

  for (const adapter of adapters) {
    if (!runtimeSupported(adapter)) {
      errors.push(`Adapter ${adapter.id} has no runtime contract.`);
    }

    const readiness = getProviderRuntimeReadiness(adapter.id);
    if (adapter.status === "ready-local" && readiness.mode !== "local-result") {
      errors.push(`Ready-local adapter ${adapter.id} should produce a local result.`);
    }
    if (adapter.status === "blocked" && readiness.mode !== "blocked") {
      errors.push(`Blocked adapter ${adapter.id} should remain blocked.`);
    }
  }

  return errors;
}

export function sanitizeText(text: string): SanitizedText {
  const redactions: string[] = [];
  let sanitized = text;

  sanitized = sanitized.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, () => {
    redactions.push("email");
    return "[redacted-email]";
  });
  sanitized = sanitized.replace(/\b(?:\d[ -]*?){13,16}\b/g, () => {
    redactions.push("possible-card-number");
    return "[redacted-payment]";
  });
  sanitized = sanitized.replace(/\+?\d[\d\s().-]{7,}\d/g, () => {
    redactions.push("phone");
    return "[redacted-phone]";
  });

  return {
    text: sanitized.trim().slice(0, 1200),
    redactions: uniqueSorted(redactions)
  };
}

function blockedOrRequest<T>(
  adapter: ProviderAdapter,
  readiness: RuntimeReadiness,
  requestFactory: () => RuntimeRequestContract
): RuntimeResult<T> {
  if (readiness.mode === "blocked") {
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "blocked",
      readiness
    };
  }

  return {
    adapterId: adapter.id,
    capability: adapter.capability,
    mode: "prepared-request",
    readiness,
    request: requestFactory()
  };
}

function buildAuthRequest(adapter: ProviderAdapter, input: AuthRuntimeInput): RuntimeRequestContract {
  const authMetadata = {
    requested_role: input.requestedRole,
    return_to_path: input.returnToPath,
    password_storage: "disabled"
  };

  if (adapter.id === "auth0-oidc-auth") {
    return request(
      adapter,
      "GET",
      "https://{AUTH0_DOMAIN}/authorize?response_type=code&client_id={AUTH0_CLIENT_ID}&redirect_uri={CUSTOMCARD_AUTH_CALLBACK_URL}&scope=openid%20profile%20email&audience={AUTH0_AUDIENCE}",
      [
        "AUTH0_DOMAIN",
        "AUTH0_CLIENT_ID",
        "AUTH0_CLIENT_SECRET",
        "AUTH0_AUDIENCE",
        "CUSTOMCARD_AUTH_CALLBACK_URL",
        "AUTH_SESSION_SECRET"
      ],
      undefined,
      [],
      {
        "x-customcard-auth-flow": "authorization-code-pkce",
        "x-customcard-auth-metadata": JSON.stringify(authMetadata)
      }
    );
  }

  if (adapter.id === "clerk-session-auth") {
    return request(
      adapter,
      "GET",
      "https://api.clerk.com/v1/jwks",
      ["CLERK_SECRET_KEY", "CLERK_JWT_KEY", "CLERK_AUTHORIZED_PARTIES", "AUTH_SESSION_SECRET"],
      undefined,
      [],
      {
        authorization: "Bearer {CLERK_SECRET_KEY}",
        "x-customcard-auth-flow": "jwt-verification",
        "x-customcard-authorized-parties": "{CLERK_AUTHORIZED_PARTIES}"
      }
    );
  }

  if (adapter.id === "supabase-auth") {
    return request(
      adapter,
      "GET",
      "{SUPABASE_URL}/auth/v1/user",
      ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "AUTH_SESSION_SECRET"],
      undefined,
      [],
      {
        apikey: "{SUPABASE_ANON_KEY}",
        authorization: "Bearer {supabase-user-jwt}",
        "x-customcard-auth-flow": "jwt-user-lookup"
      }
    );
  }

  if (adapter.id === "firebase-auth") {
    return request(
      adapter,
      "POST",
      "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={FIREBASE_API_KEY}",
      ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON", "AUTH_SESSION_SECRET"],
      {
        idToken: input.sessionTokenPreview ? "{firebase-id-token-preview}" : "{firebase-id-token}",
        metadata: authMetadata
      },
      [],
      { "x-customcard-auth-flow": "identity-token-lookup" }
    );
  }

  return request(
    adapter,
    "GET",
    "https://{COGNITO_DOMAIN}.auth.{AWS_REGION}.amazoncognito.com/oauth2/authorize?response_type=code&client_id={COGNITO_APP_CLIENT_ID}&redirect_uri={CUSTOMCARD_AUTH_CALLBACK_URL}&scope=openid%20profile%20email",
    [
      "COGNITO_DOMAIN",
      "AWS_REGION",
      "COGNITO_USER_POOL_ID",
      "COGNITO_APP_CLIENT_ID",
      "CUSTOMCARD_AUTH_CALLBACK_URL",
      "AUTH_SESSION_SECRET"
    ],
    undefined,
    [],
    {
      "x-customcard-auth-flow": "authorization-code-pkce",
      "x-customcard-user-pool": "{COGNITO_USER_POOL_ID}"
    }
  );
}

function buildTextChatRequest(adapter: ProviderAdapter, sanitized: SanitizedText): RuntimeRequestContract {
  const prompt = [
    "You are CustomCard's card concierge.",
    "Use only customer-approved memories.",
    "Do not claim an order was placed.",
    sanitized.text
  ].join("\n");

  if (adapter.id === "openai-responses-chat") {
    return request(adapter, "POST", "https://api.openai.com/v1/responses", ["OPENAI_API_KEY"], {
      model: "admin-selected-low-cost-text-model",
      input: prompt,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "azure-openai-chat") {
    return request(
      adapter,
      "POST",
      "{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_CHAT_DEPLOYMENT}/chat/completions?api-version=2024-10-21",
      ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_CHAT_DEPLOYMENT"],
      {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
        metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
      },
      [],
      { "api-key": "{AZURE_OPENAI_API_KEY}" }
    );
  }

  if (adapter.id === "aws-bedrock-converse-chat") {
    return request(
      adapter,
      "POST",
      "https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{BEDROCK_TEXT_MODEL_ID}/converse",
      ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_TEXT_MODEL_ID"],
      {
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 700, temperature: 0.4 },
        metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
      },
      [],
      {
        authorization: "AWS4-HMAC-SHA256 {AWS_ACCESS_KEY_ID}",
        "x-amz-content-sha256": "{sha256-payload}",
        "x-customcard-aws-sigv4-required": "true"
      }
    );
  }

  if (adapter.id === "anthropic-messages-chat") {
    return request(adapter, "POST", "https://api.anthropic.com/v1/messages", ["ANTHROPIC_API_KEY"], {
      model: "admin-selected-anthropic-model",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions }
    }, [], {
      "anthropic-version": "2023-06-01",
      "x-api-key": "{ANTHROPIC_API_KEY}"
    });
  }

  if (adapter.id === "google-gemini-chat") {
    return request(adapter, "POST", "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", ["GOOGLE_GENERATIVE_AI_API_KEY"], {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      metadata: { redactions: sanitized.redactions }
    }, [], {
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
  }

  if (adapter.id === "huggingface-chat") {
    return request(adapter, "POST", "https://router.huggingface.co/v1/chat/completions", ["HUGGINGFACE_API_TOKEN"], {
      model: "admin-allowlisted-chat-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions }
    });
  }

  if (adapter.id === "mistral-chat") {
    return request(adapter, "POST", "https://api.mistral.ai/v1/chat/completions", ["MISTRAL_API_KEY"], {
      model: "admin-selected-mistral-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "cohere-chat") {
    return request(adapter, "POST", "https://api.cohere.com/v2/chat", ["COHERE_API_KEY"], {
      model: "admin-selected-cohere-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "perplexity-sonar-chat") {
    return request(adapter, "POST", "https://api.perplexity.ai/chat/completions", ["PERPLEXITY_API_KEY"], {
      model: "admin-selected-sonar-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "xai-chat") {
    return request(adapter, "POST", "https://api.x.ai/v1/chat/completions", ["XAI_API_KEY"], {
      model: "admin-selected-grok-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "together-chat") {
    return request(adapter, "POST", "https://api.together.xyz/v1/chat/completions", ["TOGETHER_API_KEY"], {
      model: "admin-allowlisted-together-chat-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "groq-chat") {
    return request(adapter, "POST", "https://api.groq.com/openai/v1/chat/completions", ["GROQ_API_KEY"], {
      model: "admin-selected-groq-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "deepseek-chat") {
    return request(adapter, "POST", "https://api.deepseek.com/chat/completions", ["DEEPSEEK_API_KEY"], {
      model: "admin-selected-deepseek-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "fireworks-chat") {
    return request(adapter, "POST", "https://api.fireworks.ai/inference/v1/chat/completions", ["FIREWORKS_API_KEY"], {
      model: "admin-selected-fireworks-model",
      messages: [{ role: "user", content: prompt }],
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  return request(adapter, "POST", "{SELF_HOSTED_LLM_BASE_URL}/v1/chat/completions", ["SELF_HOSTED_LLM_API_KEY"], {
    model: "admin-allowlisted-self-hosted-model",
    messages: [{ role: "user", content: prompt }],
    metadata: { redactions: sanitized.redactions }
  });
}

function buildImageRequest(
  adapter: ProviderAdapter,
  sanitized: SanitizedText,
  input: ImageRuntimeInput
): RuntimeRequestContract {
  const prompt = `${sanitized.text}. Locale ${input.locale}. 5x7 greeting card artwork; no text baked into image.`;

  if (adapter.id === "openai-images") {
    return request(adapter, "POST", "https://api.openai.com/v1/images/generations", ["OPENAI_API_KEY"], {
      model: "admin-selected-low-cost-image-model",
      prompt,
      size: "1024x1536",
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    });
  }

  if (adapter.id === "azure-openai-image") {
    return request(
      adapter,
      "POST",
      "{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_IMAGE_DEPLOYMENT}/images/generations?api-version=2024-10-21",
      ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_IMAGE_DEPLOYMENT"],
      {
        prompt,
        size: "1024x1536",
        n: 1,
        metadata: { redactions: sanitized.redactions, print_approval_required: true }
      },
      [],
      { "api-key": "{AZURE_OPENAI_API_KEY}" }
    );
  }

  if (adapter.id === "aws-bedrock-image") {
    return request(
      adapter,
      "POST",
      "https://bedrock-runtime.{AWS_REGION}.amazonaws.com/model/{BEDROCK_IMAGE_MODEL_ID}/invoke",
      ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "BEDROCK_IMAGE_MODEL_ID"],
      {
        taskType: "TEXT_IMAGE",
        textToImageParams: { text: prompt },
        imageGenerationConfig: { numberOfImages: 1, quality: "standard", width: 1024, height: 1536 },
        metadata: { redactions: sanitized.redactions, print_approval_required: true }
      },
      [],
      {
        authorization: "AWS4-HMAC-SHA256 {AWS_ACCESS_KEY_ID}",
        "x-amz-content-sha256": "{sha256-payload}",
        "x-customcard-aws-sigv4-required": "true"
      }
    );
  }

  if (adapter.id === "google-gemini-image") {
    return request(adapter, "POST", "https://generativelanguage.googleapis.com/v1beta/models/{image-model}:generateContent", ["GOOGLE_GENERATIVE_AI_API_KEY"], {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    }, [], {
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
  }

  if (adapter.id === "stability-stable-image") {
    return request(adapter, "POST", "https://api.stability.ai/v2beta/stable-image/generate/core", ["STABILITY_API_KEY"], {
      prompt,
      output_format: "png",
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    });
  }

  if (adapter.id === "huggingface-image") {
    return request(adapter, "POST", "https://router.huggingface.co/v1/images/generations", ["HUGGINGFACE_API_TOKEN"], {
      model: "admin-allowlisted-image-model",
      prompt,
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    });
  }

  if (adapter.id === "together-image") {
    return request(adapter, "POST", "https://api.together.xyz/v1/images/generations", ["TOGETHER_API_KEY"], {
      model: "admin-allowlisted-together-image-model",
      prompt,
      width: 1024,
      height: 1536,
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    });
  }

  if (adapter.id === "ideogram-image") {
    return request(adapter, "POST", "https://api.ideogram.ai/v1/ideogram-v3/generate", ["IDEOGRAM_API_KEY"], {
      prompt,
      rendering_speed: "DEFAULT",
      aspect_ratio: "2x3",
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    }, [], {
      "Api-Key": "{IDEOGRAM_API_KEY}"
    });
  }

  if (adapter.id === "leonardo-image") {
    return request(adapter, "POST", "https://cloud.leonardo.ai/api/rest/v1/generations", ["LEONARDO_API_KEY"], {
      prompt,
      width: 1024,
      height: 1536,
      num_images: 1,
      metadata: { redactions: sanitized.redactions, print_approval_required: true }
    });
  }

  if (adapter.id === "fal-image") {
    return request(
      adapter,
      "POST",
      "https://queue.fal.run/{admin-selected-fal-image-model}",
      ["FAL_KEY"],
      {
        prompt,
        image_size: { width: 1024, height: 1536 },
        num_images: 1,
        metadata: { redactions: sanitized.redactions, print_approval_required: true }
      },
      [],
      { authorization: "Key {FAL_KEY}" }
    );
  }

  if (adapter.id === "bfl-flux-image") {
    return request(
      adapter,
      "POST",
      "https://api.bfl.ai/v1/{admin-selected-flux-model}",
      ["BFL_API_KEY"],
      {
        prompt,
        width: 1024,
        height: 1536,
        output_format: "png",
        metadata: { redactions: sanitized.redactions, print_approval_required: true }
      },
      [],
      { "x-key": "{BFL_API_KEY}" }
    );
  }

  return request(adapter, "POST", "https://api.replicate.com/v1/predictions", ["REPLICATE_API_TOKEN"], {
    version: "admin-allowlisted-image-model-version",
    input: { prompt },
    metadata: { redactions: sanitized.redactions, print_approval_required: true }
  });
}

function buildEventImportRequest(
  adapter: ProviderAdapter,
  input: EventImportRuntimeInput
): RuntimeRequestContract {
  const accountId = encodeURIComponent(input.providerAccountId || "me");
  const calendarId = encodeURIComponent(input.calendarId || "primary");
  const scopes = providerScopes[adapter.id] ?? [];

  if (adapter.id === "gmail-metadata-import") {
    return request(
      adapter,
      "GET",
      `https://gmail.googleapis.com/gmail/v1/users/${accountId}/messages?${new URLSearchParams({
        maxResults: "25",
        q: `after:${input.fromIso} before:${input.toIso}`
      }).toString()}`,
      ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      undefined,
      scopes,
      { authorization: "Bearer {google-oauth-access-token}" }
    );
  }

  if (adapter.id === "google-calendar-events") {
    return request(
      adapter,
      "GET",
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${new URLSearchParams({
        singleEvents: "true",
        timeMax: input.toIso,
        timeMin: input.fromIso
      }).toString()}`,
      ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      undefined,
      scopes,
      { authorization: "Bearer {google-oauth-access-token}" }
    );
  }

  if (adapter.id === "microsoft-graph-mail") {
    return request(
      adapter,
      "GET",
      "https://graph.microsoft.com/v1.0/me/messages?$select=id,subject,receivedDateTime,from&$top=25",
      ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
      undefined,
      scopes,
      { authorization: "Bearer {microsoft-graph-access-token}" }
    );
  }

  return request(
    adapter,
    "GET",
    `https://graph.microsoft.com/v1.0/me/calendarView?${new URLSearchParams({
      $select: "id,subject,start,end,location",
      endDateTime: input.toIso,
      startDateTime: input.fromIso
    }).toString()}`,
    ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
    undefined,
    scopes,
    { authorization: "Bearer {microsoft-graph-access-token}" }
  );
}

function buildContactImportRequest(
  adapter: ProviderAdapter,
  input: ContactImportRuntimeInput
): RuntimeRequestContract {
  const accountId = encodeURIComponent(input.providerAccountId || "me");
  const groupId = input.groupId ? encodeURIComponent(input.groupId) : undefined;
  const scopes = providerScopes[adapter.id] ?? [];

  if (adapter.id === "google-people-contacts") {
    return request(
      adapter,
      "GET",
      `https://people.googleapis.com/v1/people/${accountId}/connections?${new URLSearchParams({
        pageSize: "100",
        personFields: "names,emailAddresses,addresses,birthdays,events,metadata",
        ...(input.syncToken ? { syncToken: input.syncToken } : {})
      }).toString()}`,
      ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
      undefined,
      scopes,
      { authorization: "Bearer {google-oauth-access-token}" }
    );
  }

  if (adapter.id === "microsoft-graph-contacts") {
    return request(
      adapter,
      "GET",
      `https://graph.microsoft.com/v1.0/me/${groupId ? `contactFolders/${groupId}/contacts` : "contacts"}?$select=id,displayName,emailAddresses,homeAddress,businessAddress,birthday&$top=100`,
      ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"],
      undefined,
      scopes,
      { authorization: "Bearer {microsoft-graph-access-token}" }
    );
  }

  return request(
    adapter,
    "REPORT",
    "{CARDDAV_BASE_URL}/{CARDDAV_ADDRESSBOOK_PATH}",
    ["CARDDAV_BASE_URL", "CARDDAV_USERNAME", "CARDDAV_APP_PASSWORD", "CARDDAV_ADDRESSBOOK_PATH"],
    {
      addressBookQuery:
        '<card:addressbook-query xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav"><d:prop><d:getetag/><card:address-data/></d:prop></card:addressbook-query>',
      metadataOnly: true,
      noNotesOrPhotos: true,
      requestedAddressBookPath: input.addressBookPath || "{CARDDAV_ADDRESSBOOK_PATH}"
    },
    scopes,
    {
      authorization: "Basic {CARDDAV_USERNAME}:{CARDDAV_APP_PASSWORD}",
      "content-type": "application/xml; charset=utf-8"
    }
  );
}

function request(
  adapter: ProviderAdapter,
  method: HttpMethod,
  url: string,
  credentialRefs: string[],
  body?: unknown,
  scopes: string[] = [],
  authHeaders?: Record<string, string>
): RuntimeRequestContract {
  const credentialHeaders =
    authHeaders ?? (credentialRefs.length > 0 ? { authorization: `Bearer {${credentialRefs[0]}}` } : {});

  return {
    adapterId: adapter.id,
    method,
    url,
    headers: {
      ...credentialHeaders,
      "x-customcard-no-network": "true",
      ...(scopes.length > 0 ? { "x-customcard-scopes": scopes.join(",") } : {})
    },
    body,
    credentialRefs,
    dataClassifications: dataClassificationsFor(adapter),
    noNetwork: true
  };
}

function missingSafetyReasons(adapter: ProviderAdapter, gates: ProviderGateState): string[] {
  return adapter.safetyGates.flatMap((gate) => {
    if (safetyGateSatisfied(gate, gates)) return [];
    if (adapter.status === "ready-local") return [];
    if (adapter.status === "blocked") return [`Missing safety gate: ${gate}`];
    if (gate.includes("Prompt audit")) return ["Missing safety gate: prompt audit"];
    if (gate.includes("PII minimization")) return ["Missing safety gate: PII minimization"];
    if (gate.includes("Spend limit")) return ["Missing safety gate: spend limit"];
    if (gate.includes("Human approval")) return ["Missing safety gate: human print approval"];
    if (gate.includes("OAuth consent")) return ["Missing safety gate: OAuth consent"];
    if (gate.includes("Metadata-only")) return ["Missing safety gate: metadata-only import"];
    if (gate.includes("No raw content storage")) return ["Missing safety gate: no raw content storage"];
    if (gate.includes("Calendar scope consent")) return ["Missing safety gate: calendar scope consent"];
    if (gate.includes("Metadata schema validation") || gate.includes("Calendar event schema validation")) {
      return ["Missing safety gate: metadata schema validation"];
    }
    if (gate.includes("Revocation handling")) return ["Missing safety gate: revocation handling"];
    if (gate.includes("Tenant review")) return ["Missing safety gate: tenant review"];
    if (gate.includes("Provider/model allowlist") || gate.includes("Model allowlist")) return ["Missing safety gate: model allowlist"];
    if (gate.includes("Rate limit handling")) return ["Missing safety gate: rate limit handling"];
    if (gate.includes("Latency budget")) return ["Missing safety gate: latency budget"];
    if (gate.includes("Model quality review")) return ["Missing safety gate: model quality review"];
    if (gate.includes("Network allowlist")) return ["Missing safety gate: network allowlist"];
    return [`Missing safety gate: ${gate}`];
  });
}

function safetyGateSatisfied(gate: string, gates: ProviderGateState): boolean {
  if (gate.includes("Prompt audit")) return Boolean(gates.promptAuditApproved);
  if (gate.includes("PII minimization")) return Boolean(gates.piiMinimized);
  if (gate.includes("Model spend limit") || gate.includes("Spend limit")) {
    return typeof gates.spendLimitCents === "number" && gates.spendLimitCents >= 0;
  }
  if (gate.includes("Human approval")) return Boolean(gates.humanApprovalBeforePrint);
  if (gate.includes("OAuth consent")) return Boolean(gates.externalConsentRecorded);
  if (gate.includes("Calendar scope consent")) return Boolean(gates.externalConsentRecorded);
  if (gate.includes("Metadata-only")) return Boolean(gates.metadataOnly);
  if (gate.includes("No raw content storage")) return Boolean(gates.rawContentStorageDisabled);
  if (gate.includes("Metadata schema validation") || gate.includes("Calendar event schema validation")) {
    return Boolean(gates.metadataSchemaValidated);
  }
  if (gate.includes("Revocation handling")) return Boolean(gates.revocationHandlingReady);
  if (gate.includes("Tenant review")) return Boolean(gates.tenantReviewed);
  if (gate.includes("Provider/model allowlist") || gate.includes("Model allowlist")) {
    return Boolean(gates.modelAllowlisted);
  }
  if (gate.includes("Rate limit handling")) return Boolean(gates.rateLimitHandlingReady);
  if (gate.includes("Latency budget")) return Boolean(gates.latencyBudgetMet);
  if (gate.includes("Model quality review")) return Boolean(gates.modelQualityReviewed);
  if (gate.includes("Network allowlist")) return Boolean(gates.networkAllowlisted);
  if (gate.includes("Physical print certification") || gate.includes("Vendor certification")) {
    return Boolean(gates.vendorCertificationRecorded);
  }
  if (gate.includes("Live quote")) return Boolean(gates.liveQuoteReceived);
  if (gate.includes("Explicit approval")) return Boolean(gates.externalShareApproved);
  if (gate.includes("Kill switch")) return false;
  return false;
}

function statusReasons(adapter: ProviderAdapter): string[] {
  if (adapter.status === "blocked") {
    return [`Adapter status is blocked: ${adapter.detail}`];
  }
  if (adapter.status === "contract-only") {
    return [`Adapter is contract-only: ${adapter.detail}`];
  }
  return [];
}

function modeForReadyAdapter(adapter: ProviderAdapter): RuntimeMode {
  return adapter.status === "ready-local" ? "local-result" : "prepared-request";
}

function requireCapability(adapterId: string, capability: ProviderCapability): ProviderAdapter {
  const adapter = requireAdapter(adapterId);
  if (adapter.capability !== capability) {
    throw new Error(`Adapter ${adapterId} is ${adapter.capability}, not ${capability}.`);
  }
  return adapter;
}

function requireAdapter(adapterId: string): ProviderAdapter {
  const adapter = providerCatalog.find((candidate) => candidate.id === adapterId);
  if (!adapter) throw new Error(`Unknown provider adapter: ${adapterId}`);
  return adapter;
}

function runtimeSupported(adapter: ProviderAdapter): boolean {
  if (adapter.capability === "cloud-runtime") return true;
  if (adapter.capability === "auth") return true;
  if (adapter.capability === "memory") return true;
  if (adapter.capability === "render-export") return true;
  if (adapter.capability === "notification") return true;
  return ["event-import", "contact-import", "text-chat", "image-generation", "vendor-handoff"].includes(adapter.capability);
}

function dataClassificationsFor(adapter: ProviderAdapter): string[] {
  if (adapter.capability === "auth") return ["auth-session", "OIDC-token-metadata", "no-password-storage"];
  if (adapter.capability === "event-import") return ["metadata-only", "no-raw-content"];
  if (adapter.capability === "contact-import") return ["contact-metadata", "address-book", "no-raw-notes", "no-photos"];
  if (adapter.capability === "text-chat") return ["customer-message", "approved-memory-only", "PII-redacted"];
  if (adapter.capability === "image-generation") return ["art-prompt", "PII-redacted", "human-print-approval-required"];
  if (adapter.capability === "vendor-handoff") return ["print-handoff", "external-share-approval-required"];
  return ["operational-metadata"];
}

function hasUsableEnvValue(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return Boolean(
    normalized &&
      !placeholderValues.has(normalized) &&
      !normalized.startsWith("test-") &&
      !normalized.startsWith("dummy-") &&
      !normalized.startsWith("fake-") &&
      !normalized.startsWith("sample-")
  );
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => first.localeCompare(second));
}

function parseContactImport(sourceText: string) {
  const text = sourceText.trim();
  const vcardCount = text.match(/BEGIN:VCARD/gi)?.length ?? 0;
  const csvRows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const contactCount = vcardCount > 0 ? vcardCount : csvRows.length > 1 ? csvRows.length - 1 : csvRows.length > 0 ? 1 : 0;

  return {
    parser: vcardCount > 0 ? "vcard" : "csv-or-freeform",
    contactCount,
    addressSignals: /(\bADR\b|street|avenue|city|state|zip|postal|country)/i.test(text),
    birthdaySignals: /(\bBDAY\b|birthday|anniversary)/i.test(text),
    rawNotesStored: false,
    photosStored: false,
    needsDeduplicationReview: true,
    noNetwork: true
  };
}

const sampleContactText = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Sara Ahmed",
  "EMAIL:sara@example.com",
  "ADR:;;123 Garden St;Brooklyn;NY;11201;US",
  "BDAY:1990-07-10",
  "END:VCARD"
].join("\n");

const defaultTextChatInput: TextChatRuntimeInput = {
  customerMessage: "Please make a warm anniversary card and keep fulfillment manual.",
  recipientName: "Sara and Ahmed",
  approvedMemoryNotes: ["They like botanical cards and quiet humor."],
  locale: "en-US"
};

const defaultAuthInput: AuthRuntimeInput = {
  requestedRole: "customer",
  returnToPath: "/customer"
};

const defaultImageInput: ImageRuntimeInput = {
  prompt: "Warm botanical anniversary artwork with room for editable text.",
  recipientName: "Sara and Ahmed",
  occasion: "anniversary",
  style: "botanical",
  locale: "en-US",
  printApproved: false
};

const defaultEventImportInput: EventImportRuntimeInput = {
  sourceText: sampleInviteText,
  fromIso: "2026-07-01T00:00:00.000Z",
  toIso: "2026-07-31T23:59:59.999Z"
};

const defaultContactImportInput: ContactImportRuntimeInput = {
  sourceText: sampleContactText,
  providerAccountId: "me"
};

const defaultVendorInput: VendorRuntimeInput = {
  vendorId: "walgreens",
  certificationRecorded: false,
  externalShareApproved: false,
  physicalPrintQaRecorded: false
};
