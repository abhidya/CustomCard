import { buildVendorHandoff, parseFreeImport, type VendorId } from "./freeMvp";
import {
  buildCustomerChatTranscript,
  getProviderAdapter,
  providerCatalog,
  type ChatMessage,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderStatus
} from "./providerCatalog";
import { buildPrinterPricingComparison } from "./printerPricing";
import { buildSamplePrintExportPackage, summarizePrintExportPackage } from "./printExport";
import {
  buildRetailPrinterAdapterPlan,
  getRetailPrinterAdapterForProvider,
  type RetailPrinterOperationKind
} from "./retailPrinterAdapters";

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
  notificationOptInRecorded?: boolean;
  suppressionListChecked?: boolean;
  sensitiveContentExcluded?: boolean;
  adminReviewedExport?: boolean;
  paymentSandboxConfigured?: boolean;
  noCardDataStorage?: boolean;
  idempotencyKeyReady?: boolean;
  refundPathDocumented?: boolean;
  webhookSignatureVerified?: boolean;
  telemetryPiiRedacted?: boolean;
  telemetrySamplingConfigured?: boolean;
  alertRoutingConfigured?: boolean;
  retentionPolicyConfigured?: boolean;
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
  model?: string;
  promptInstructions?: string;
  maxTokens?: number;
  temperature?: number;
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
  model?: string;
  promptInstructions?: string;
  senderName?: string;
  frontCoverText?: string;
  insideLeftText?: string;
  insideRightText?: string;
  signOff?: string;
}

export type CardImagePanelId = "front-cover" | "back-cover" | "inside-left-panel" | "inside-right-panel";

export interface CardImagePanelPrompt {
  panelId: CardImagePanelId;
  label: string;
  prompt: string;
}

export interface CardImagePromptPlan {
  requiredPanelCount: 4;
  generationStrategy: "one-provider-request-per-panel";
  sharedPrompt: string;
  providerCaveats: string[];
  panelPrompts: CardImagePanelPrompt[];
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

export type CrmLifecycleKind = "birthday" | "purchase-anniversary" | "warranty-anniversary";

export interface CrmRuntimeInput {
  sourceText: string;
  providerAccountId?: string;
  listId?: string;
  pipelineId?: string;
  fromIso: string;
  toIso: string;
  lifecycleKinds: CrmLifecycleKind[];
  optInRecorded: boolean;
}

export interface WorkflowIntegrationRuntimeInput {
  sourceText: string;
  destination: "webhook" | "team-channel" | "workspace-table" | "spreadsheet";
  campaignId: string;
  fromIso: string;
  toIso: string;
  optInRecorded: boolean;
}

export interface NotificationRuntimeInput {
  channel: "email" | "sms" | "whatsapp" | "push";
  recipient: string;
  subject?: string;
  message: string;
  locale: string;
  optInRecorded: boolean;
}

export interface PaymentRuntimeInput {
  amountCents: number;
  currency: string;
  projectId: string;
  customerId: string;
  description: string;
  successPath: string;
  cancelPath: string;
  sandboxMode: boolean;
  idempotencyKey?: string;
  refundPathDocumented?: boolean;
}

export interface ObservabilityRuntimeInput {
  eventType: "health" | "error" | "analytics" | "metric" | "trace" | "log";
  serviceName: string;
  release: string;
  environment: string;
  route: string;
  message: string;
  severity: "info" | "warning" | "error";
  traceId?: string;
  metricName?: string;
  value?: number;
  piiFree: boolean;
  sampled: boolean;
}

export interface VendorRuntimeInput {
  vendorId: VendorId;
  operation?: RetailPrinterOperationKind;
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
  crm?: CrmRuntimeInput;
  workflowIntegration?: WorkflowIntegrationRuntimeInput;
  notification?: NotificationRuntimeInput;
  payment?: PaymentRuntimeInput;
  observability?: ObservabilityRuntimeInput;
  vendor?: VendorRuntimeInput;
}

/**
 * Maps each ProviderCapability to the exact ProviderRuntimeInput key it requires.
 * Capabilities that need no input (render-export, memory, cloud-runtime) map to never.
 * Use with CapabilityInput<C> and toRuntimeInput() to build type-safe inputs per capability.
 */
export type CapabilityInputKey = {
  "auth": "auth";
  "event-import": "eventImport";
  "contact-import": "contactImport";
  "crm-integration": "crm";
  "workflow-integration": "workflowIntegration";
  "text-chat": "textChat";
  "image-generation": "image";
  "render-export": never;
  "memory": never;
  "vendor-handoff": "vendor";
  "cloud-runtime": never;
  "notification": "notification";
  "payment": "payment";
  "observability": "observability";
};

/** The required input shape for a specific capability — narrows the 11-field open union. */
export type CapabilityInput<C extends ProviderCapability> =
  CapabilityInputKey[C] extends never
    ? Record<string, never>
    : Required<Pick<ProviderRuntimeInput, CapabilityInputKey[C] & keyof ProviderRuntimeInput>>;

/**
 * Type-safe input constructor. The capability parameter constrains the input shape at
 * compile time — passing the wrong input key for a capability is a type error.
 *
 * @example
 *   buildProviderAdapterRuntime(id, toRuntimeInput("auth", { auth: {...} }))
 *   buildProviderAdapterRuntime(id, toRuntimeInput("text-chat", { textChat: {...} }))
 *   buildProviderAdapterRuntime(id, toRuntimeInput("render-export", {}))
 */
export function toRuntimeInput<C extends ProviderCapability>(
  _capability: C,
  input: CapabilityInput<C>
): ProviderRuntimeInput {
  return input as ProviderRuntimeInput;
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
  noNetwork: false;
  panelId?: CardImagePanelId;
  panelRequests?: RuntimeRequestContract[];
}

export interface RuntimeResult<TLocal = unknown> {
  adapterId: string;
  capability: ProviderCapability;
  mode: RuntimeMode;
  readiness: RuntimeReadiness;
  localResult?: TLocal;
  request?: RuntimeRequestContract;
}

export interface ProviderRuntimeSeam {
  capability: ProviderCapability;
  inputKey?: keyof ProviderRuntimeInput;
  defaultMode: RuntimeMode;
  buildsNoNetworkContracts: false;
  buildsLiveNetworkContracts: true;
  liveNetworkDefault: true;
}

type ProviderRuntimeHandler = (
  adapterId: string,
  input: ProviderRuntimeInput,
  env: ProviderRuntimeEnv,
  gates: ProviderGateState
) => RuntimeResult;

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
  "eventbrite-events": ["event:read"],
  "meetup-events": [],
  "google-people-contacts": ["contacts.readonly"],
  "microsoft-graph-mail": ["Mail.ReadBasic"],
  "microsoft-graph-calendar": ["Calendars.ReadBasic"],
  "microsoft-graph-contacts": ["Contacts.Read"],
  "salesforce-crm-lifecycle": ["api", "refresh_token"],
  "hubspot-crm-lifecycle": ["crm.objects.contacts.read", "crm.objects.deals.read"],
  "zoho-crm-lifecycle": ["ZohoCRM.modules.contacts.READ", "ZohoCRM.modules.deals.READ"],
  "pipedrive-crm-lifecycle": ["persons:read", "deals:read"],
  "dynamics-crm-lifecycle": ["https://{DYNAMICS_RESOURCE_URL}/.default"],
  "shopify-crm-lifecycle": ["read_customers", "read_orders"],
  "etsy-seller-customer-lifecycle": ["transactions_r", "listings_r"],
  "monday-crm-lifecycle": [],
  "amazon-seller-customer-lifecycle": [],
  "klaviyo-profile-lifecycle": ["profiles:read"],
  "mailchimp-audience-lifecycle": ["lists:read", "members:read"],
  "activecampaign-contact-lifecycle": ["contacts:read"],
  "bigcommerce-customer-lifecycle": ["store_v2_customers_read_only"],
  "woocommerce-customer-lifecycle": ["customers:read", "orders:read"],
  "square-customer-lifecycle": ["CUSTOMERS_READ"],
  "intercom-contact-lifecycle": ["read:contacts"],
  "zapier-webhook-workflow": ["webhook:write"],
  "make-webhook-workflow": ["webhook:write"],
  "slack-workflow-notification": ["chat:write"],
  "teams-workflow-notification": ["incoming-webhook"],
  "notion-customer-database-sync": ["pages.write", "databases.read"],
  "airtable-customer-base-sync": ["data.records:write"],
  "google-sheets-lifecycle-sync": ["https://www.googleapis.com/auth/spreadsheets"],
  "n8n-webhook-workflow": ["webhook:write"],
  "workato-webhook-workflow": ["webhook:write"],
  "pipedream-webhook-workflow": ["webhook:write"]
};

const defaultCrmLifecycleKinds: CrmLifecycleKind[] = ["birthday", "purchase-anniversary", "warranty-anniversary"];

export const providerRuntimeSeams: ProviderRuntimeSeam[] = [
  { capability: "auth", inputKey: "auth", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "event-import", inputKey: "eventImport", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "contact-import", inputKey: "contactImport", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "crm-integration", inputKey: "crm", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "workflow-integration", inputKey: "workflowIntegration", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "text-chat", inputKey: "textChat", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "image-generation", inputKey: "image", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "render-export", defaultMode: "local-result", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "memory", defaultMode: "local-result", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "vendor-handoff", inputKey: "vendor", defaultMode: "local-result", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "cloud-runtime", defaultMode: "local-result", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "notification", inputKey: "notification", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "payment", inputKey: "payment", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true },
  { capability: "observability", inputKey: "observability", defaultMode: "prepared-request", buildsNoNetworkContracts: false, buildsLiveNetworkContracts: true, liveNetworkDefault: true }
];

const providerRuntimeHandlers: Record<ProviderCapability, ProviderRuntimeHandler> = {
  auth: (adapterId, input, env, gates) => buildAuthRuntime(adapterId, requireRuntimeInput(input, "auth"), env, gates),
  "event-import": (adapterId, input, env, gates) =>
    buildEventImportRuntime(adapterId, requireRuntimeInput(input, "eventImport"), env, gates),
  "contact-import": (adapterId, input, env, gates) =>
    buildContactImportRuntime(adapterId, requireRuntimeInput(input, "contactImport"), env, gates),
  "crm-integration": (adapterId, input, env, gates) => buildCrmRuntime(adapterId, requireRuntimeInput(input, "crm"), env, gates),
  "workflow-integration": (adapterId, input, env, gates) =>
    buildWorkflowIntegrationRuntime(adapterId, requireRuntimeInput(input, "workflowIntegration"), env, gates),
  "text-chat": (adapterId, input, env, gates) => buildTextChatRuntime(adapterId, requireRuntimeInput(input, "textChat"), env, gates),
  "image-generation": (adapterId, input, env, gates) =>
    buildImageGenerationRuntime(adapterId, requireRuntimeInput(input, "image"), env, gates),
  "render-export": (adapterId, _input, env, gates) => buildDefaultRuntime(adapterId, env, gates),
  memory: (adapterId, _input, env, gates) => buildDefaultRuntime(adapterId, env, gates),
  "vendor-handoff": (adapterId, input, env, gates) => buildVendorRuntime(adapterId, requireRuntimeInput(input, "vendor"), env, gates),
  "cloud-runtime": (adapterId, _input, env, gates) => buildDefaultRuntime(adapterId, env, gates),
  notification: (adapterId, input, env, gates) =>
    buildNotificationRuntime(adapterId, requireRuntimeInput(input, "notification"), env, gates),
  payment: (adapterId, input, env, gates) => buildPaymentRuntime(adapterId, requireRuntimeInput(input, "payment"), env, gates),
  observability: (adapterId, input, env, gates) =>
    buildObservabilityRuntime(adapterId, requireRuntimeInput(input, "observability"), env, gates)
};

export function buildProviderAdapterRuntime(
  adapterId: string,
  input: ProviderRuntimeInput = {},
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireAdapter(adapterId);
  const seam = providerRuntimeSeams.find((candidate) => candidate.capability === adapter.capability);
  if (seam?.inputKey && input[seam.inputKey] === undefined) {
    return blockedForMissingRuntimeInput(adapter, getProviderRuntimeReadiness(adapter.id, env, gates), seam.inputKey);
  }
  return providerRuntimeHandlers[adapter.capability](adapter.id, input, env, gates);
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

  if (adapter.id === "local-workspace-auth") {
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
        sessionState: "account-session-api",
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

  return blockedOrRequest(adapter, readiness, () => buildTextChatRequest(adapter, sanitized, input, env));
}

export function buildImageGenerationRuntime(
  adapterId: string,
  input: ImageRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult<{
  renderer: string;
  width: 1500;
  height: 2100;
  dpi: 300;
  prompt: string;
  requiredPanelCount: 4;
  generationStrategy: CardImagePromptPlan["generationStrategy"];
  providerCaveats: string[];
  panelPrompts: CardImagePanelPrompt[];
}> {
  const adapter = requireCapability(adapterId, "image-generation");
  const sanitized = sanitizeText(
    [
      `${input.occasion} folded greeting card set for ${input.recipientName}.`,
      `Style: ${input.style}.`,
      `Sender/sign-off: ${input.signOff ?? input.senderName ?? "not provided"}.`,
      `Front cover text: ${input.frontCoverText ?? input.recipientName}.`,
      `Inside left text: ${input.insideLeftText ?? "not provided"}.`,
      `Inside right text: ${input.insideRightText ?? "not provided"}.`,
      `Prompt: ${input.prompt}`
    ].join("\n")
  );
  const promptPlan = buildCardImagePromptPlan(sanitized, input);

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
        prompt: promptPlan.sharedPrompt,
        requiredPanelCount: promptPlan.requiredPanelCount,
        generationStrategy: promptPlan.generationStrategy,
        providerCaveats: promptPlan.providerCaveats,
        panelPrompts: promptPlan.panelPrompts
      }
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    piiMinimized: true,
    humanApprovalBeforePrint: input.printApproved || gates.humanApprovalBeforePrint
  });

  return blockedOrRequest(adapter, readiness, () => buildImageRequest(adapter, sanitized, promptPlan, input, env));
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
    const sourceText = requireRuntimeSourceText(input.sourceText);
    if (!sourceText) return blockedForMissingRuntimeSource(adapter, readiness);

    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: parseFreeImport(sourceText)
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
    const sourceText = requireRuntimeSourceText(input.sourceText);
    if (!sourceText) return blockedForMissingRuntimeSource(adapter, readiness);

    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: parseContactImport(sourceText)
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    metadataOnly: true,
    rawContentStorageDisabled: true
  });

  return blockedOrRequest(adapter, readiness, () => buildContactImportRequest(adapter, input));
}

export function buildCrmRuntime(
  adapterId: string,
  input: CrmRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "crm-integration");

  if (adapter.id === "crm-csv-lifecycle-import") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    const sourceText = requireRuntimeSourceText(input.sourceText);
    if (!sourceText) return blockedForMissingRuntimeSource(adapter, readiness);

    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: parseCrmLifecycleImport(sourceText)
    };
  }

  const readinessGates = {
    ...gates,
    metadataOnly: true,
    notificationOptInRecorded: input.optInRecorded || gates.notificationOptInRecorded,
    rawContentStorageDisabled: true
  };
  const readiness = getProviderRuntimeReadiness(adapter.id, env, readinessGates);

  return blockedOrRequest(adapter, readiness, () =>
    buildCrmRequest(adapter, { ...input, optInRecorded: Boolean(readinessGates.notificationOptInRecorded) })
  );
}

export function buildWorkflowIntegrationRuntime(
  adapterId: string,
  input: WorkflowIntegrationRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "workflow-integration");

  if (adapter.id === "local-workflow-payload-export") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, {
      ...gates,
      metadataOnly: true,
      adminReviewedExport: true
    });
    const sourceText = requireRuntimeSourceText(input.sourceText);
    if (!sourceText) return blockedForMissingRuntimeSource(adapter, readiness);

    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: buildLocalWorkflowPayload(sourceText, input)
    };
  }

  const sanitized = sanitizeText(input.sourceText);
  const readinessGates = {
    ...gates,
    metadataOnly: true,
    notificationOptInRecorded: input.optInRecorded || gates.notificationOptInRecorded,
    rawContentStorageDisabled: true
  };
  const readiness = getProviderRuntimeReadiness(adapter.id, env, readinessGates);

  return blockedOrRequest(adapter, readiness, () =>
    buildWorkflowIntegrationRequest(adapter, sanitized, {
      ...input,
      optInRecorded: Boolean(readinessGates.notificationOptInRecorded)
    })
  );
}

export function buildNotificationRuntime(
  adapterId: string,
  input: NotificationRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "notification");

  if (adapter.id === "browser-download-notification") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: {
        adapterId: adapter.id,
        channel: "browser-status",
        noNetwork: true,
        visibleOnly: true,
        message: sanitizeText(input.message).text
      }
    };
  }

  const sanitizedSubject = sanitizeText(input.subject || "CustomCard status update");
  const sanitizedMessage = sanitizeText(input.message);
  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    notificationOptInRecorded: input.optInRecorded || gates.notificationOptInRecorded,
    sensitiveContentExcluded: true
  });

  return blockedOrRequest(adapter, readiness, () => buildNotificationRequest(adapter, input, sanitizedSubject, sanitizedMessage));
}

export function buildPaymentRuntime(
  adapterId: string,
  input: PaymentRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "payment");

  if (adapter.id === "no-payment-checkout-gate") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: {
        adapterId: adapter.id,
        noNetwork: true,
        realChargesEnabled: false,
        cardDataStored: false,
        checkoutMode: "manual-handoff"
      }
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    paymentSandboxConfigured: input.sandboxMode || gates.paymentSandboxConfigured,
    noCardDataStorage: true,
    idempotencyKeyReady: Boolean(input.idempotencyKey) || gates.idempotencyKeyReady,
    refundPathDocumented: input.refundPathDocumented || gates.refundPathDocumented
  });

  return blockedOrRequest(adapter, readiness, () => buildPaymentRequest(adapter, input));
}

export function buildObservabilityRuntime(
  adapterId: string,
  input: ObservabilityRuntimeInput,
  env: ProviderRuntimeEnv = {},
  gates: ProviderGateState = {}
): RuntimeResult {
  const adapter = requireCapability(adapterId, "observability");
  const sanitized = sanitizeText([input.message, `route:${input.route}`, `service:${input.serviceName}`].join("\n"));

  if (adapter.id === "local-health-audit-observability") {
    const readiness = getProviderRuntimeReadiness(adapter.id, env, gates);
    return {
      adapterId: adapter.id,
      capability: adapter.capability,
      mode: "local-result",
      readiness,
      localResult: {
        adapterId: adapter.id,
        noNetwork: true,
        eventType: input.eventType,
        serviceName: input.serviceName,
        severity: input.severity,
        redactions: sanitized.redactions,
        telemetryShipped: false
      }
    };
  }

  const readiness = getProviderRuntimeReadiness(adapter.id, env, {
    ...gates,
    telemetryPiiRedacted: input.piiFree || gates.telemetryPiiRedacted,
    telemetrySamplingConfigured: input.sampled || gates.telemetrySamplingConfigured
  });

  return blockedOrRequest(adapter, readiness, () => buildObservabilityRequest(adapter, input, sanitized));
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

  const retailAdapter = getRetailPrinterAdapterForProvider(adapter.id);
  const retailPlan = retailAdapter ? buildRetailPrinterAdapterPlan(retailAdapter.vendorId, input.operation) : undefined;
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
        ...(retailPlan ? [retailPlan.operation.blockedReason] : []),
        "Live vendor orders remain disabled until certification, quote, approval, QA, and kill-switch policy are proven."
      ])
    },
    localResult: retailPlan
  };
}

function buildDefaultRuntime(adapterId: string, env: ProviderRuntimeEnv = {}, gates: ProviderGateState = {}): RuntimeResult {
  const adapter = requireAdapter(adapterId);
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

export function validateRuntimeCoverage(adapters: ProviderAdapter[] = providerCatalog): string[] {
  const errors: string[] = [];
  const seamCapabilities = new Set(providerRuntimeSeams.map((seam) => seam.capability));

  for (const adapter of adapters) {
    if (!runtimeSupported(adapter) || !seamCapabilities.has(adapter.capability)) {
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

function cloudflareWorkersAiTokenRef(env: ProviderRuntimeEnv, preferredCredential: string): string {
  return hasUsableEnvValue(env[preferredCredential]) ? preferredCredential : "CLOUDFLARE_API_TOKEN";
}

function configuredModel(
  requestedModel: string | undefined,
  envKeys: string[],
  env: ProviderRuntimeEnv,
  fallbackModel: string
): string {
  if (requestedModel?.trim()) return requestedModel.trim();
  for (const envKey of envKeys) {
    if (hasUsableEnvValue(env[envKey])) return String(env[envKey]).trim();
  }
  return fallbackModel;
}

function configuredNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function textModelEnvKeys(adapterId: string): string[] {
  const envKeysByAdapter: Record<string, string[]> = {
    "cloudflare-workers-ai-chat": ["CUSTOMCARD_CLOUDFLARE_TEXT_MODEL", "CLOUDFLARE_WORKERS_AI_TEXT_MODEL"],
    "openai-responses-chat": ["CUSTOMCARD_OPENAI_TEXT_MODEL", "OPENAI_TEXT_MODEL", "CARD_TEXT_MODEL"],
    "anthropic-messages-chat": ["CUSTOMCARD_ANTHROPIC_TEXT_MODEL", "ANTHROPIC_MODEL", "CARD_TEXT_MODEL"],
    "google-gemini-chat": ["CUSTOMCARD_GEMINI_TEXT_MODEL", "GEMINI_TEXT_MODEL", "GOOGLE_GENERATIVE_AI_MODEL"],
    "huggingface-chat": ["CUSTOMCARD_HUGGINGFACE_TEXT_MODEL", "HUGGINGFACE_TEXT_MODEL"],
    "mistral-chat": ["CUSTOMCARD_MISTRAL_TEXT_MODEL", "MISTRAL_MODEL"],
    "cohere-chat": ["CUSTOMCARD_COHERE_TEXT_MODEL", "COHERE_MODEL"],
    "perplexity-sonar-chat": ["CUSTOMCARD_PERPLEXITY_TEXT_MODEL", "PERPLEXITY_MODEL"],
    "xai-chat": ["CUSTOMCARD_XAI_TEXT_MODEL", "XAI_MODEL"],
    "together-chat": ["CUSTOMCARD_TOGETHER_TEXT_MODEL", "TOGETHER_TEXT_MODEL"],
    "groq-chat": ["CUSTOMCARD_GROQ_TEXT_MODEL", "GROQ_MODEL"],
    "deepseek-chat": ["CUSTOMCARD_DEEPSEEK_TEXT_MODEL", "DEEPSEEK_MODEL"],
    "fireworks-chat": ["CUSTOMCARD_FIREWORKS_TEXT_MODEL", "FIREWORKS_TEXT_MODEL"],
    "self-hosted-openai-compatible-chat": ["CUSTOMCARD_SELF_HOSTED_TEXT_MODEL", "SELF_HOSTED_LLM_MODEL"]
  };
  return envKeysByAdapter[adapterId] ?? [];
}

function imageModelEnvKeys(adapterId: string): string[] {
  const envKeysByAdapter: Record<string, string[]> = {
    "cloudflare-workers-ai-image": ["CUSTOMCARD_CLOUDFLARE_IMAGE_MODEL", "CLOUDFLARE_WORKERS_AI_IMAGE_MODEL"],
    "openai-images": ["CUSTOMCARD_OPENAI_IMAGE_MODEL", "OPENAI_IMAGE_MODEL", "CARD_IMAGE_MODEL"],
    "azure-openai-image": ["CUSTOMCARD_AZURE_OPENAI_IMAGE_MODEL", "AZURE_OPENAI_IMAGE_DEPLOYMENT", "CARD_IMAGE_MODEL"],
    "aws-bedrock-image": ["CUSTOMCARD_BEDROCK_IMAGE_MODEL", "BEDROCK_IMAGE_MODEL_ID"],
    "google-gemini-image": ["CUSTOMCARD_GEMINI_IMAGE_MODEL", "GEMINI_IMAGE_MODEL", "CARD_IMAGE_MODEL"],
    "deepai-text2img-image": ["CUSTOMCARD_DEEPAI_IMAGE_MODEL", "DEEPAI_IMAGE_MODEL"],
    "huggingface-image": ["CUSTOMCARD_HUGGINGFACE_IMAGE_MODEL", "HUGGINGFACE_IMAGE_MODEL"],
    "stability-stable-image": ["CUSTOMCARD_STABILITY_IMAGE_MODEL", "STABILITY_IMAGE_MODEL"],
    "together-image": ["CUSTOMCARD_TOGETHER_IMAGE_MODEL", "TOGETHER_IMAGE_MODEL"],
    "fal-image": ["CUSTOMCARD_FAL_IMAGE_MODEL", "FAL_IMAGE_MODEL"],
    "bfl-flux-image": ["CUSTOMCARD_BFL_IMAGE_MODEL", "BFL_IMAGE_MODEL"],
    "luma-image": ["CUSTOMCARD_LUMA_IMAGE_MODEL", "LUMA_IMAGE_MODEL"],
    "replicate-image": ["CUSTOMCARD_REPLICATE_IMAGE_MODEL", "REPLICATE_IMAGE_MODEL"]
  };
  return envKeysByAdapter[adapterId] ?? [];
}

function defaultTextModel(adapterId: string): string {
  const defaults: Record<string, string> = {
    "openai-responses-chat": "gpt-4o-mini",
    "anthropic-messages-chat": "claude-3-5-haiku-latest",
    "google-gemini-chat": "gemini-1.5-flash",
    "huggingface-chat": "meta-llama/Llama-3.2-3B-Instruct",
    "mistral-chat": "mistral-small-latest",
    "cohere-chat": "command-r7b-12-2024",
    "perplexity-sonar-chat": "sonar",
    "xai-chat": "grok-3-mini",
    "together-chat": "meta-llama/Llama-3.2-3B-Instruct-Turbo",
    "groq-chat": "llama-3.1-8b-instant",
    "deepseek-chat": "deepseek-chat",
    "fireworks-chat": "accounts/fireworks/models/llama-v3p1-8b-instruct",
    "self-hosted-openai-compatible-chat": "local-default"
  };
  return defaults[adapterId] ?? "{CLOUDFLARE_WORKERS_AI_TEXT_MODEL}";
}

function defaultImageModel(adapterId: string): string {
  const defaults: Record<string, string> = {
    "cloudflare-workers-ai-image": "@cf/black-forest-labs/flux-1-schnell",
    "openai-images": "gpt-image-2",
    "google-gemini-image": "gemini-3.1-flash-image",
    "deepai-text2img-image": "hd",
    "huggingface-image": "black-forest-labs/FLUX.1-schnell",
    "stability-stable-image": "stable-image-core",
    "together-image": "black-forest-labs/FLUX.1-schnell-Free",
    "fal-image": "fal-ai/flux/schnell",
    "bfl-flux-image": "flux-pro",
    "luma-image": "photon-1",
    "replicate-image": "black-forest-labs/flux-schnell"
  };
  return defaults[adapterId] ?? "{CLOUDFLARE_WORKERS_AI_IMAGE_MODEL}";
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

function buildTextChatRequest(
  adapter: ProviderAdapter,
  sanitized: SanitizedText,
  input: TextChatRuntimeInput,
  env: ProviderRuntimeEnv = {}
): RuntimeRequestContract {
  const model = configuredModel(input.model, textModelEnvKeys(adapter.id), env, defaultTextModel(adapter.id));
  const maxTokens = configuredNumber(input.maxTokens, 700);
  const temperature = configuredNumber(input.temperature, 0.4);
  const prompt = [
    input.promptInstructions || "You are CustomCard's card concierge.",
    "Use only customer-approved memories and do not claim an order was placed.",
    sanitized.text
  ].join("\n");

  if (adapter.id === "openai-responses-chat") {
    return request(adapter, "POST", "https://api.openai.com/v1/responses", ["OPENAI_API_KEY"], {
      model,
      input: prompt,
      max_output_tokens: maxTokens,
      temperature,
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
        max_tokens: maxTokens,
        temperature,
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
        inferenceConfig: { maxTokens, temperature },
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
      model,
      max_tokens: maxTokens,
      temperature,
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
      generationConfig: { maxOutputTokens: maxTokens, temperature },
      metadata: { redactions: sanitized.redactions }
    }, [], {
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
  }

  if (adapter.id === "cloudflare-workers-ai-chat") {
    const apiTokenRef = cloudflareWorkersAiTokenRef(env, "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN");
    return request(
      adapter,
      "POST",
      "https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1/chat/completions",
      ["CLOUDFLARE_ACCOUNT_ID", apiTokenRef, "CLOUDFLARE_WORKERS_AI_TEXT_MODEL"],
      {
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
        metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
      },
      [],
      { authorization: `Bearer {${apiTokenRef}}` }
    );
  }

  if (adapter.id === "huggingface-chat") {
    return request(adapter, "POST", "https://router.huggingface.co/v1/chat/completions", ["HUGGINGFACE_API_TOKEN"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions }
    });
  }

  if (adapter.id === "mistral-chat") {
    return request(adapter, "POST", "https://api.mistral.ai/v1/chat/completions", ["MISTRAL_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "cohere-chat") {
    return request(adapter, "POST", "https://api.cohere.com/v2/chat", ["COHERE_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "perplexity-sonar-chat") {
    return request(adapter, "POST", "https://api.perplexity.ai/chat/completions", ["PERPLEXITY_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "xai-chat") {
    return request(adapter, "POST", "https://api.x.ai/v1/chat/completions", ["XAI_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "together-chat") {
    return request(adapter, "POST", "https://api.together.xyz/v1/chat/completions", ["TOGETHER_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "groq-chat") {
    return request(adapter, "POST", "https://api.groq.com/openai/v1/chat/completions", ["GROQ_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "deepseek-chat") {
    return request(adapter, "POST", "https://api.deepseek.com/chat/completions", ["DEEPSEEK_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  if (adapter.id === "fireworks-chat") {
    return request(adapter, "POST", "https://api.fireworks.ai/inference/v1/chat/completions", ["FIREWORKS_API_KEY"], {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
      metadata: { redactions: sanitized.redactions, live_ordering: "disabled" }
    });
  }

  return request(adapter, "POST", "{SELF_HOSTED_LLM_BASE_URL}/v1/chat/completions", ["SELF_HOSTED_LLM_API_KEY"], {
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature,
    metadata: { redactions: sanitized.redactions }
  });
}

function buildCardImagePromptPlan(sanitized: SanitizedText, input: ImageRuntimeInput): CardImagePromptPlan {
  const occasion = sanitizeText(input.occasion).text || "card occasion";
  const recipientName = sanitizeText(input.recipientName).text || "recipient";
  const style = sanitizeText(input.style).text || "elegant stationery";
  const designDirection = sanitizeText(input.prompt).text || sanitized.text;
  const senderName = sanitizeText(input.senderName ?? input.signOff ?? "not provided").text;
  const frontCoverText = sanitizeText(input.frontCoverText ?? input.recipientName).text;
  const insideLeftText = sanitizeText(
    input.insideLeftText ?? "A short quote, blessing, verse, poem, or message matching the occasion."
  ).text;
  const insideRightText = sanitizeText(input.insideRightText ?? input.prompt).text;
  const signOff = sanitizeText(input.signOff ?? input.senderName ?? "not provided").text;
  const providerCaveats = [
    "Generate one panel per provider request to avoid a 4-up collage, contact sheet, or uncontrolled variations.",
    "Keep provider image counts at one image per panel; orchestrate four calls for the full folded card set.",
    "Treat generated text as untrusted until proofed; exact names and multilingual text require deterministic overlay or human QA before print."
  ];
  const sharedPrompt = [
    input.promptInstructions || "Create CustomCard print artwork using the configured admin prompt policy.",
    "Create a coordinated print-ready vertical 5x7 inch folded greeting card image set.",
    "Required final panel set: FRONT COVER, BACK COVER, INSIDE LEFT PANEL, INSIDE RIGHT PANEL.",
    "Execution strategy: generate one separate image per panel. Do not combine panels into a four-panel collage, grid, mockup, folded preview, or contact sheet.",
    "Each image must be portrait orientation, 5x7 ratio, flat artwork only, no mockup, no shadows, no table, no background scene, no folds, no labels, no crop marks, and no instruction text.",
    "Artwork should extend cleanly to the edges with a safe inner margin so nothing important is cut off when printed.",
    "The four panels must look like one coordinated card set with matching borders, colors, floral elements, patterns, typography, and decorative spacing.",
    "The front cover and back cover should visually match. The inside left and inside right panels should match each other and feel like the opened interior of the card.",
    `Occasion: ${occasion}`,
    `Recipient names: ${recipientName}`,
    `Sender / sign-off: ${senderName}`,
    `Cultural or style theme: ${style}`,
    `Design direction: ${designDirection}`,
    `Locale: ${input.locale}`,
    "Overall style: Luxury folded greeting card, elegant stationery design, print-ready, high resolution, refined typography, balanced composition, premium paper texture, subtle decorative border, heirloom quality, sophisticated and celebration-appropriate.",
    "Accuracy requirements: Spell all names exactly as provided. Keep quoted text exactly as provided. For Arabic, Hebrew, Urdu, Sanskrit, or other non-English script, reproduce the text exactly and do not invent or alter characters. Do not add extra words.",
    "Text fidelity caveat: if the image provider cannot guarantee exact typography, reserve clean text space and let the app or Canva render exact final text during the proof step."
  ].join("\n");

  return {
    requiredPanelCount: 4,
    generationStrategy: "one-provider-request-per-panel",
    sharedPrompt,
    providerCaveats,
    panelPrompts: [
      {
        panelId: "front-cover",
        label: "FRONT COVER",
        prompt: [
          sharedPrompt,
          "",
          "Generate only the FRONT COVER image.",
          "This is one standalone portrait 5x7 print file, not a preview of the whole card.",
          "Create a beautiful cover design with the recipient name(s), occasion title, and decorative artwork.",
          "Keep the main text large, centered, readable, and elegant.",
          `Text on front: "${frontCoverText}"`
        ].join("\n")
      },
      {
        panelId: "back-cover",
        label: "BACK COVER",
        prompt: [
          sharedPrompt,
          "",
          "Generate only the BACK COVER image.",
          "This is one standalone portrait 5x7 print file, not a preview of the whole card.",
          "Create a mostly blank coordinating back cover with the same border and decorative style.",
          "No large text. Leave the center mostly empty. Add only subtle matching ornamentation near the bottom or corners."
        ].join("\n")
      },
      {
        panelId: "inside-left-panel",
        label: "INSIDE LEFT PANEL",
        prompt: [
          sharedPrompt,
          "",
          "Generate only the INSIDE LEFT PANEL image.",
          "This is one standalone portrait 5x7 print file, not a preview of the whole card.",
          "Create a coordinating decorative inside-left page.",
          "Include a quote, blessing, verse, poem, or short message in centered elegant typography when exact text rendering is supported.",
          `Text: "${insideLeftText}"`
        ].join("\n")
      },
      {
        panelId: "inside-right-panel",
        label: "INSIDE RIGHT PANEL",
        prompt: [
          sharedPrompt,
          "",
          "Generate only the INSIDE RIGHT PANEL image.",
          "This is one standalone portrait 5x7 print file, not a preview of the whole card.",
          "Create the main message page. Make the text readable, centered, and balanced with enough margin.",
          "Use elegant but legible typography when exact text rendering is supported.",
          `Text: "${insideRightText}"`,
          `Sign-off: "${signOff}"`
        ].join("\n")
      }
    ]
  };
}

function imagePanelMetadata(
  sanitized: SanitizedText,
  promptPlan: CardImagePromptPlan,
  panel: CardImagePanelPrompt
): Record<string, unknown> {
  return {
    redactions: sanitized.redactions,
    print_approval_required: true,
    customcard: {
      prompt_contract: "folded-card-four-panel-v1",
      required_panel_count: promptPlan.requiredPanelCount,
      generation_strategy: promptPlan.generationStrategy,
      panel_id: panel.panelId,
      panel_label: panel.label,
      panel_order: promptPlan.panelPrompts.findIndex((candidate) => candidate.panelId === panel.panelId) + 1,
      required_panels: promptPlan.panelPrompts.map((candidate) => candidate.panelId),
      provider_caveats: promptPlan.providerCaveats
    }
  };
}

function buildImageRequest(
  adapter: ProviderAdapter,
  sanitized: SanitizedText,
  promptPlan: CardImagePromptPlan,
  input: ImageRuntimeInput,
  env: ProviderRuntimeEnv = {}
): RuntimeRequestContract {
  const panelRequests = promptPlan.panelPrompts.map((panel) => ({
    ...buildSinglePanelImageRequest(adapter, sanitized, promptPlan, panel, input, env),
    panelId: panel.panelId
  }));

  return {
    ...panelRequests[0],
    panelRequests
  };
}

function buildSinglePanelImageRequest(
  adapter: ProviderAdapter,
  sanitized: SanitizedText,
  promptPlan: CardImagePromptPlan,
  panel: CardImagePanelPrompt,
  input: ImageRuntimeInput,
  env: ProviderRuntimeEnv = {}
): RuntimeRequestContract {
  const prompt = panel.prompt;
  const metadata = imagePanelMetadata(sanitized, promptPlan, panel);
  const model = configuredModel(input.model, imageModelEnvKeys(adapter.id), env, defaultImageModel(adapter.id));

  if (adapter.id === "openai-images") {
    return request(adapter, "POST", "https://api.openai.com/v1/images/generations", ["OPENAI_API_KEY"], {
      model,
      prompt,
      size: "1024x1536",
      n: 1,
      metadata
    });
  }

  if (adapter.id === "azure-openai-image") {
    return request(
      adapter,
      "POST",
      "{AZURE_OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_IMAGE_DEPLOYMENT}/images/generations?api-version=2024-10-21",
      ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_API_KEY", "AZURE_OPENAI_IMAGE_DEPLOYMENT"],
      {
        model,
        prompt,
        size: "1024x1536",
        n: 1,
        metadata
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
        model,
        textToImageParams: { text: prompt },
        imageGenerationConfig: { numberOfImages: 1, quality: "standard", width: 1024, height: 1536 },
        metadata
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
    return request(adapter, "POST", "https://generativelanguage.googleapis.com/v1/models/{image-model}:generateContent", ["GOOGLE_GENERATIVE_AI_API_KEY"], {
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["Image"],
        responseFormat: { image: { aspectRatio: "3:4", imageSize: "2K" } }
      },
      metadata
    }, [], {
      "x-goog-api-key": "{GOOGLE_GENERATIVE_AI_API_KEY}"
    });
  }

  if (adapter.id === "cloudflare-workers-ai-image") {
    const apiTokenRef = cloudflareWorkersAiTokenRef(env, "CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN");
    return request(
      adapter,
      "POST",
      `https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
      ["CLOUDFLARE_ACCOUNT_ID", apiTokenRef],
      {
        model,
        prompt,
        width: 1024,
        height: 1536,
        metadata
      },
      [],
      { authorization: `Bearer {${apiTokenRef}}` }
    );
  }

  if (adapter.id === "stability-stable-image") {
    return request(adapter, "POST", "https://api.stability.ai/v2beta/stable-image/generate/core", ["STABILITY_API_KEY"], {
      model,
      prompt,
      output_format: "png",
      metadata
    });
  }

  if (adapter.id === "huggingface-image") {
    return request(adapter, "POST", "https://router.huggingface.co/v1/images/generations", ["HUGGINGFACE_API_TOKEN"], {
      model,
      prompt,
      metadata
    });
  }

  if (adapter.id === "deepai-text2img-image") {
    return request(adapter, "POST", "https://api.deepai.org/api/text2img", ["DEEPAI_API_KEY"], {
      text: prompt,
      image_generator_version: model || "hd",
      width: 832,
      height: 1216,
      negative_prompt: "readable text, fake text, logos, watermark, folded card mockup, tabletop scene",
      metadata
    }, [], {
      "api-key": "{DEEPAI_API_KEY}"
    });
  }

  if (adapter.id === "together-image") {
    return request(adapter, "POST", "https://api.together.xyz/v1/images/generations", ["TOGETHER_API_KEY"], {
      model,
      prompt,
      width: 1024,
      height: 1536,
      metadata
    });
  }

  if (adapter.id === "ideogram-image") {
    return request(adapter, "POST", "https://api.ideogram.ai/v1/ideogram-v3/generate", ["IDEOGRAM_API_KEY"], {
      prompt,
      rendering_speed: "DEFAULT",
      aspect_ratio: "2x3",
      metadata
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
      metadata
    });
  }

  if (adapter.id === "fal-image") {
    return request(
      adapter,
      "POST",
      "https://queue.fal.run/{admin-selected-fal-image-model}",
      ["FAL_KEY"],
      {
        model,
        prompt,
        image_size: { width: 1024, height: 1536 },
        num_images: 1,
        metadata
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
        model,
        prompt,
        width: 1024,
        height: 1536,
        output_format: "png",
        metadata
      },
      [],
      { "x-key": "{BFL_API_KEY}" }
    );
  }

  if (adapter.id === "adobe-firefly-image") {
    return request(
      adapter,
      "POST",
      "https://firefly-api.adobe.io/v3/images/generate",
      ["ADOBE_FIREFLY_CLIENT_ID", "ADOBE_FIREFLY_CLIENT_SECRET", "ADOBE_FIREFLY_API_KEY"],
      {
        prompt,
        numVariations: 1,
        size: { width: 1024, height: 1536 },
        metadata
      },
      [],
      {
        authorization: "Bearer {adobe-firefly-access-token}",
        "x-api-key": "{ADOBE_FIREFLY_API_KEY}",
        "x-customcard-adobe-client": "{ADOBE_FIREFLY_CLIENT_ID}"
      }
    );
  }

  if (adapter.id === "recraft-image") {
    return request(
      adapter,
      "POST",
      "https://external.api.recraft.ai/v1/images/generations",
      ["RECRAFT_API_KEY"],
      {
        prompt,
        size: "1024x1536",
        style: "digital_illustration",
        metadata
      },
      [],
      { authorization: "Bearer {RECRAFT_API_KEY}" }
    );
  }

  if (adapter.id === "luma-image") {
    return request(
      adapter,
      "POST",
      "https://api.lumalabs.ai/dream-machine/v1/generations/image",
      ["LUMA_API_KEY"],
      {
        prompt,
        aspect_ratio: "2:3",
        model,
        metadata
      },
      [],
      { authorization: "Bearer {LUMA_API_KEY}" }
    );
  }

  return request(adapter, "POST", "https://api.replicate.com/v1/predictions", ["REPLICATE_API_TOKEN"], {
    version: model,
    input: { prompt },
    metadata
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
      ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"],
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

  if (adapter.id === "microsoft-graph-calendar") {
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

  if (adapter.id === "eventbrite-events") {
    return request(
      adapter,
      "GET",
      `https://www.eventbriteapi.com/v3/users/me/events/?${new URLSearchParams({
        status: "live,started,ended",
        time_filter: "current_future",
        expand: "venue",
        page_size: "50"
      }).toString()}`,
      ["EVENTBRITE_CLIENT_ID", "EVENTBRITE_CLIENT_SECRET"],
      undefined,
      scopes,
      { authorization: "Bearer {eventbrite-oauth-access-token}" }
    );
  }

  if (adapter.id === "luma-events") {
    return request(
      adapter,
      "GET",
      `https://public-api.luma.com/v1/calendar/list-events?${new URLSearchParams({
        pagination_limit: "50"
      }).toString()}`,
      ["LUMA_API_KEY"],
      undefined,
      [],
      { "x-luma-api-key": "{luma-api-key}" }
    );
  }

  if (adapter.id === "meetup-events") {
    return request(
      adapter,
      "POST",
      "https://api.meetup.com/gql",
      ["MEETUP_CLIENT_ID", "MEETUP_CLIENT_SECRET"],
      // GraphQL query body — runtime contracts carry the shape, not live payloads
      { query: "query { self { id name upcomingEvents(input: { first: 50 }) { edges { node { id title dateTime endTime venue { address city state country } } } } } }" },
      scopes,
      { authorization: "Bearer {meetup-oauth-access-token}", "content-type": "application/json" }
    );
  }

  // partiful-events is contract-only — no live endpoint
  if (adapter.id === "partiful-events") {
    return request(
      adapter,
      "GET",
      "https://partiful.com",
      [],
      undefined,
      [],
      {}
    );
  }

  // icloud-ics-fallback — manual ICS export, no live endpoint
  if (adapter.id === "ics-paste-import" || adapter.id === "manual-note-import" || adapter.id === "icloud-ics-fallback" || adapter.id === "partiful-events") {
    return request(adapter, "GET", "local://event-import-no-network", [], undefined, [], {});
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

function buildCrmRequest(adapter: ProviderAdapter, input: CrmRuntimeInput): RuntimeRequestContract {
  const scopes = providerScopes[adapter.id] ?? [];
  const lifecycleKinds = input.lifecycleKinds.length > 0 ? input.lifecycleKinds : defaultCrmLifecycleKinds;
  const lifecycleMetadata = {
    lifecycle_kinds: lifecycleKinds,
    from_iso: input.fromIso,
    to_iso: input.toIso,
    opt_in_recorded: input.optInRecorded,
    suppression_checked: true,
    no_raw_notes_storage: true,
    live_crm_write: "disabled"
  };

  if (adapter.id === "salesforce-crm-lifecycle") {
    return request(
      adapter,
      "GET",
      "{SALESFORCE_INSTANCE_URL}/services/data/v61.0/query?q=SELECT%20Id%2CName%2CEmail%2CBirthdate%2CLastPurchaseDate__c%2CWarrantyEndDate__c%2CDoNotContact__c%20FROM%20Contact%20WHERE%20Email%20%21%3D%20null",
      ["SALESFORCE_INSTANCE_URL", "SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET", "SALESFORCE_REFRESH_TOKEN"],
      undefined,
      scopes,
      { authorization: "Bearer {salesforce-oauth-access-token}" }
    );
  }

  if (adapter.id === "hubspot-crm-lifecycle") {
    return request(
      adapter,
      "POST",
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      ["HUBSPOT_PRIVATE_APP_TOKEN", "HUBSPOT_PORTAL_ID"],
      {
        properties: [
          "email",
          "firstname",
          "lastname",
          "date_of_birth",
          "last_purchase_date",
          "warranty_expiration_date",
          "hs_email_optout"
        ],
        filterGroups: [
          {
            filters: [{ propertyName: "lastmodifieddate", operator: "BETWEEN", value: input.fromIso, highValue: input.toIso }]
          }
        ],
        sorts: ["lastmodifieddate"],
        limit: 100,
        metadata: lifecycleMetadata
      },
      scopes
    );
  }

  if (adapter.id === "zoho-crm-lifecycle") {
    return request(
      adapter,
      "GET",
      "{ZOHO_API_DOMAIN}/crm/v6/Contacts?fields=Full_Name,Email,Date_of_Birth,Last_Purchase_Date,Warranty_End_Date,Email_Opt_Out&per_page=100",
      ["ZOHO_ACCOUNTS_DOMAIN", "ZOHO_API_DOMAIN", "ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"],
      undefined,
      scopes,
      { authorization: "Zoho-oauthtoken {zoho-oauth-access-token}" }
    );
  }

  if (adapter.id === "pipedrive-crm-lifecycle") {
    return request(
      adapter,
      "GET",
      "https://{PIPEDRIVE_COMPANY_DOMAIN}.pipedrive.com/api/v1/persons?start=0&limit=100",
      ["PIPEDRIVE_COMPANY_DOMAIN", "PIPEDRIVE_API_TOKEN"],
      undefined,
      scopes,
      { authorization: "Bearer {PIPEDRIVE_API_TOKEN}" }
    );
  }

  if (adapter.id === "dynamics-crm-lifecycle") {
    return request(
      adapter,
      "GET",
      "{DYNAMICS_RESOURCE_URL}/api/data/v9.2/contacts?$select=contactid,fullname,emailaddress1,birthdate,customcard_lastpurchaseon,customcard_warrantyendon,donotemail",
      ["DYNAMICS_RESOURCE_URL", "DYNAMICS_TENANT_ID", "DYNAMICS_CLIENT_ID", "DYNAMICS_CLIENT_SECRET"],
      undefined,
      scopes,
      { authorization: "Bearer {microsoft-dataverse-access-token}" }
    );
  }

  if (adapter.id === "shopify-crm-lifecycle") {
    return request(
      adapter,
      "POST",
      "https://{SHOPIFY_SHOP_DOMAIN}/admin/api/2026-04/graphql.json",
      ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN"],
      {
        query:
          "query CustomCardCustomerLifecycle($query: String!) { customers(first: 100, query: $query) { nodes { id displayName email emailMarketingConsent { marketingState } orders(first: 10, sortKey: PROCESSED_AT, reverse: true) { nodes { id processedAt warrantyEndDate: metafield(namespace: \"customcard\", key: \"warranty_end_date\") { value } } } } } }",
        variables: {
          query: `updated_at:>=${input.fromIso} updated_at:<=${input.toIso}`
        },
        metadata: lifecycleMetadata
      },
      scopes,
      { "x-shopify-access-token": "{SHOPIFY_ADMIN_ACCESS_TOKEN}" }
    );
  }

  if (adapter.id === "klaviyo-profile-lifecycle") {
    return request(
      adapter,
      "GET",
      `https://a.klaviyo.com/api/profiles/?${new URLSearchParams({
        "filter": `greater-than(updated,${input.fromIso}),less-than(updated,${input.toIso})`,
        "fields[profile]": "email,first_name,last_name,birthday,subscriptions",
        page_size: "100"
      }).toString()}`,
      ["KLAVIYO_PRIVATE_API_KEY", "KLAVIYO_REVISION"],
      undefined,
      scopes,
      {
        authorization: "Klaviyo-API-Key {KLAVIYO_PRIVATE_API_KEY}",
        revision: "{KLAVIYO_REVISION}"
      }
    );
  }

  if (adapter.id === "mailchimp-audience-lifecycle") {
    return request(
      adapter,
      "GET",
      "https://{MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/{MAILCHIMP_AUDIENCE_ID}/members?count=100&fields=members.id,members.email_address,members.status,members.merge_fields,members.timestamp_opt,members.last_changed",
      ["MAILCHIMP_API_KEY", "MAILCHIMP_SERVER_PREFIX", "MAILCHIMP_AUDIENCE_ID"],
      undefined,
      scopes,
      { authorization: "Basic anystring:{MAILCHIMP_API_KEY}" }
    );
  }

  if (adapter.id === "activecampaign-contact-lifecycle") {
    return request(
      adapter,
      "GET",
      "{ACTIVECAMPAIGN_BASE_URL}/api/3/contacts?limit=100&orders[cdate]=DESC",
      ["ACTIVECAMPAIGN_BASE_URL", "ACTIVECAMPAIGN_API_KEY"],
      undefined,
      scopes,
      { "Api-Token": "{ACTIVECAMPAIGN_API_KEY}" }
    );
  }

  if (adapter.id === "bigcommerce-customer-lifecycle") {
    return request(
      adapter,
      "GET",
      "https://api.bigcommerce.com/stores/{BIGCOMMERCE_STORE_HASH}/v3/customers?limit=100&include=formfields,storecredit",
      ["BIGCOMMERCE_STORE_HASH", "BIGCOMMERCE_ACCESS_TOKEN"],
      undefined,
      scopes,
      {
        "x-auth-token": "{BIGCOMMERCE_ACCESS_TOKEN}",
        accept: "application/json"
      }
    );
  }

  if (adapter.id === "woocommerce-customer-lifecycle") {
    return request(
      adapter,
      "GET",
      "{WOOCOMMERCE_STORE_URL}/wp-json/wc/v3/customers?per_page=100&orderby=modified&order=desc",
      ["WOOCOMMERCE_STORE_URL", "WOOCOMMERCE_CONSUMER_KEY", "WOOCOMMERCE_CONSUMER_SECRET"],
      undefined,
      scopes,
      { authorization: "Basic {WOOCOMMERCE_CONSUMER_KEY}:{WOOCOMMERCE_CONSUMER_SECRET}" }
    );
  }

  if (adapter.id === "square-customer-lifecycle") {
    return request(
      adapter,
      "POST",
      "https://connect.squareup.com/v2/customers/search",
      ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID"],
      {
        query: {
          filter: {
            updated_at: {
              start_at: input.fromIso,
              end_at: input.toIso
            }
          }
        },
        limit: 100,
        metadata: lifecycleMetadata
      },
      scopes,
      { authorization: "Bearer {SQUARE_ACCESS_TOKEN}" }
    );
  }

  if (adapter.id === "monday-crm-lifecycle") {
    const safeIso = /^[\d\-T:.Z+]+$/.test(input.fromIso) ? input.fromIso : "";
    return request(
      adapter,
      "POST",
      "https://api.monday.com/v2",
      ["MONDAY_API_TOKEN"],
      {
        query: `query { boards(limit: 10) { id name items_page(limit: 100, query_params: { rules: [{ column_id: "last_updated", compare_value: "${safeIso}" compare_attribute: "UPDATED_AT" }] }) { items { id name column_values { id text value } } } } }`
      },
      scopes,
      { authorization: "Bearer {MONDAY_API_TOKEN}", "API-Version": "2024-01" }
    );
  }

  if (adapter.id === "amazon-seller-customer-lifecycle") {
    return request(
      adapter,
      "GET",
      `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?${new URLSearchParams({
        MarketplaceIds: "{AMAZON_SP_MARKETPLACE_ID}",
        CreatedAfter: input.fromIso,
        CreatedBefore: input.toIso,
        OrderStatuses: "Shipped,Delivered",
        MaxResultsPerPage: "100"
      }).toString()}`,
      ["AMAZON_SP_CLIENT_ID", "AMAZON_SP_CLIENT_SECRET", "AMAZON_SP_REFRESH_TOKEN", "AMAZON_SP_MARKETPLACE_ID"],
      undefined,
      scopes,
      { authorization: "Bearer {amazon-lwa-access-token}", "x-amz-access-token": "{amazon-lwa-access-token}" }
    );
  }

  if (adapter.id === "etsy-seller-customer-lifecycle") {
    return request(
      adapter,
      "GET",
      `https://openapi.etsy.com/v3/application/shops/{etsy-shop-id}/receipts?${new URLSearchParams({
        min_created: input.fromIso,
        max_created: input.toIso,
        limit: "100"
      }).toString()}`,
      ["ETSY_CLIENT_ID", "ETSY_CLIENT_SECRET"],
      undefined,
      scopes,
      { "x-api-key": "{ETSY_CLIENT_ID}", authorization: "Bearer {etsy-oauth-access-token}" }
    );
  }

  return request(
    adapter,
    "POST",
    "https://api.intercom.io/contacts/search",
    ["INTERCOM_ACCESS_TOKEN"],
    {
      query: {
        operator: "AND",
        value: [
          { field: "updated_at", operator: ">", value: "{from_unix_timestamp}" },
          { field: "updated_at", operator: "<", value: "{to_unix_timestamp}" }
        ]
      },
      pagination: { per_page: 100 },
      metadata: lifecycleMetadata
    },
    scopes,
    {
      authorization: "Bearer {INTERCOM_ACCESS_TOKEN}",
      "Intercom-Version": "2.13"
    }
  );
}

function buildWorkflowIntegrationRequest(
  adapter: ProviderAdapter,
  sanitized: SanitizedText,
  input: WorkflowIntegrationRuntimeInput
): RuntimeRequestContract {
  const scopes = providerScopes[adapter.id] ?? [];
  const metadata = {
    customcard_adapter: adapter.id,
    campaign_id: normalizeReference(input.campaignId, "customcard-campaign"),
    destination: input.destination,
    from_iso: input.fromIso,
    to_iso: input.toIso,
    opt_in_recorded: input.optInRecorded,
    suppression_checked: true,
    redactions: sanitized.redactions,
    raw_content_storage: "disabled",
    live_workflow_send: "disabled"
  };
  const sourceSummary = summarizeWorkflowSource(sanitized.text);
  const queuePayload = {
    campaignId: metadata.campaign_id,
    lifecycleWindow: { fromIso: input.fromIso, toIso: input.toIso },
    summary: sourceSummary,
    metadata
  };

  if (adapter.id === "zapier-webhook-workflow") {
    return request(
      adapter,
      "POST",
      "{ZAPIER_WEBHOOK_URL}",
      ["ZAPIER_WEBHOOK_URL", "ZAPIER_SIGNING_SECRET"],
      queuePayload,
      scopes,
      {
        "x-customcard-signature": "HMAC-SHA256 {ZAPIER_SIGNING_SECRET}"
      }
    );
  }

  if (adapter.id === "make-webhook-workflow") {
    return request(
      adapter,
      "POST",
      "{MAKE_WEBHOOK_URL}",
      ["MAKE_WEBHOOK_URL", "MAKE_SIGNING_SECRET"],
      queuePayload,
      scopes,
      {
        "x-customcard-signature": "HMAC-SHA256 {MAKE_SIGNING_SECRET}"
      }
    );
  }

  if (adapter.id === "slack-workflow-notification") {
    return request(
      adapter,
      "POST",
      "https://slack.com/api/chat.postMessage",
      ["SLACK_BOT_TOKEN", "SLACK_SIGNING_SECRET", "SLACK_CHANNEL_ID"],
      {
        channel: "{SLACK_CHANNEL_ID}",
        text: "CustomCard lifecycle campaign needs admin review.",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*CustomCard lifecycle review*\\n${sourceSummary}`
            }
          }
        ],
        metadata
      },
      scopes,
      {
        authorization: "Bearer {SLACK_BOT_TOKEN}",
        "x-slack-signature": "{SLACK_SIGNING_SECRET}"
      }
    );
  }

  if (adapter.id === "teams-workflow-notification") {
    return request(
      adapter,
      "POST",
      "{MICROSOFT_TEAMS_WEBHOOK_URL}",
      ["MICROSOFT_TEAMS_WEBHOOK_URL", "MICROSOFT_TEAMS_TENANT_ID"],
      {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.5",
              body: [
                { type: "TextBlock", text: "CustomCard lifecycle review", weight: "Bolder" },
                { type: "TextBlock", text: sourceSummary, wrap: true }
              ],
              metadata
            }
          }
        ]
      },
      scopes,
      {
        "x-customcard-tenant": "{MICROSOFT_TEAMS_TENANT_ID}"
      }
    );
  }

  if (adapter.id === "notion-customer-database-sync") {
    return request(
      adapter,
      "POST",
      "https://api.notion.com/v1/pages",
      ["NOTION_API_KEY", "NOTION_CUSTOMER_DATABASE_ID"],
      {
        parent: { database_id: "{NOTION_CUSTOMER_DATABASE_ID}" },
        properties: {
          Campaign: { title: [{ text: { content: metadata.campaign_id } }] },
          Status: { select: { name: "Needs review" } },
          Window: { rich_text: [{ text: { content: `${input.fromIso} to ${input.toIso}` } }] }
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ text: { content: sourceSummary } }] }
          }
        ],
        metadata
      },
      scopes,
      {
        authorization: "Bearer {NOTION_API_KEY}",
        "notion-version": "2022-06-28"
      }
    );
  }

  if (adapter.id === "airtable-customer-base-sync") {
    return request(
      adapter,
      "POST",
      "https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}",
      ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "AIRTABLE_TABLE_ID"],
      {
        records: [
          {
            fields: {
              Campaign: metadata.campaign_id,
              Status: "Needs review",
              WindowStart: input.fromIso,
              WindowEnd: input.toIso,
              Summary: sourceSummary
            }
          }
        ],
        typecast: false,
        metadata
      },
      scopes
    );
  }

  if (adapter.id === "google-sheets-lifecycle-sync") {
    return request(
      adapter,
      "POST",
      "https://sheets.googleapis.com/v4/spreadsheets/{GOOGLE_SHEETS_SPREADSHEET_ID}/values/CustomCardQueue!A:F:append?valueInputOption=USER_ENTERED",
      ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_SHEETS_SPREADSHEET_ID"],
      {
        range: "CustomCardQueue!A:F",
        majorDimension: "ROWS",
        values: [[metadata.campaign_id, "Needs review", input.fromIso, input.toIso, sourceSummary, "live_send_disabled"]],
        metadata
      },
      scopes,
      { authorization: "Bearer {google-oauth-access-token}" }
    );
  }

  if (adapter.id === "n8n-webhook-workflow") {
    return request(
      adapter,
      "POST",
      "{N8N_WEBHOOK_URL}",
      ["N8N_WEBHOOK_URL", "N8N_WEBHOOK_SECRET"],
      queuePayload,
      scopes,
      {
        "x-customcard-signature": "HMAC-SHA256 {N8N_WEBHOOK_SECRET}"
      }
    );
  }

  if (adapter.id === "workato-webhook-workflow") {
    return request(
      adapter,
      "POST",
      "{WORKATO_WEBHOOK_URL}",
      ["WORKATO_WEBHOOK_URL", "WORKATO_API_TOKEN"],
      queuePayload,
      scopes,
      {
        authorization: "Bearer {WORKATO_API_TOKEN}",
        "x-customcard-live-send": "disabled"
      }
    );
  }

  return request(
    adapter,
    "POST",
    "{PIPEDREAM_WORKFLOW_URL}",
    ["PIPEDREAM_WORKFLOW_URL", "PIPEDREAM_SIGNING_SECRET"],
    queuePayload,
    scopes,
    {
      "x-customcard-signature": "HMAC-SHA256 {PIPEDREAM_SIGNING_SECRET}"
    }
  );
}

function buildNotificationRequest(
  adapter: ProviderAdapter,
  input: NotificationRuntimeInput,
  sanitizedSubject: SanitizedText,
  sanitizedMessage: SanitizedText
): RuntimeRequestContract {
  const channel = notificationChannelForAdapter(adapter.id, input.channel);
  const metadata = {
    customcard_adapter: adapter.id,
    channel,
    locale: input.locale,
    opt_in_recorded: true,
    suppression_checked: true,
    redactions: uniqueSorted([...sanitizedSubject.redactions, ...sanitizedMessage.redactions]),
    live_send: "disabled"
  };
  const subject = sanitizedSubject.text || "CustomCard status update";
  const message = sanitizedMessage.text || "Your CustomCard project has a status update.";

  if (adapter.id === "resend-email-notification") {
    return request(adapter, "POST", "https://api.resend.com/emails", ["RESEND_API_KEY", "TRANSACTIONAL_EMAIL_FROM"], {
      from: "{TRANSACTIONAL_EMAIL_FROM}",
      to: ["{verified-recipient-email}"],
      subject,
      html: `<p>${escapeHtml(message)}</p>`,
      tags: [{ name: "customcard", value: "status-update" }],
      metadata
    });
  }

  if (adapter.id === "sendgrid-email-notification") {
    return request(adapter, "POST", "https://api.sendgrid.com/v3/mail/send", ["SENDGRID_API_KEY", "TRANSACTIONAL_EMAIL_FROM"], {
      personalizations: [{ to: [{ email: "{verified-recipient-email}" }], custom_args: metadata }],
      from: { email: "{TRANSACTIONAL_EMAIL_FROM}" },
      subject,
      content: [{ type: "text/plain", value: message }]
    });
  }

  if (adapter.id === "postmark-email-notification") {
    return request(
      adapter,
      "POST",
      "https://api.postmarkapp.com/email",
      ["POSTMARK_SERVER_TOKEN", "TRANSACTIONAL_EMAIL_FROM"],
      {
        From: "{TRANSACTIONAL_EMAIL_FROM}",
        To: "{verified-recipient-email}",
        Subject: subject,
        TextBody: message,
        MessageStream: "outbound",
        Metadata: metadata
      },
      [],
      { "x-postmark-server-token": "{POSTMARK_SERVER_TOKEN}" }
    );
  }

  if (adapter.id === "mailgun-email-notification") {
    return request(
      adapter,
      "POST",
      "https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
      ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "TRANSACTIONAL_EMAIL_FROM"],
      {
        from: "{TRANSACTIONAL_EMAIL_FROM}",
        to: "{verified-recipient-email}",
        subject,
        text: message,
        "v:customcard_metadata": JSON.stringify(metadata)
      },
      [],
      {
        authorization: "Basic api:{MAILGUN_API_KEY}",
        "content-type": "application/x-www-form-urlencoded"
      }
    );
  }

  if (adapter.id === "twilio-sms-notification") {
    return request(
      adapter,
      "POST",
      "https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json",
      ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_SERVICE_SID"],
      {
        MessagingServiceSid: "{TWILIO_MESSAGING_SERVICE_SID}",
        To: "{verified-recipient-phone}",
        Body: message,
        StatusCallback: "{customcard-notification-webhook-disabled}",
        metadata
      },
      [],
      {
        authorization: "Basic {TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}",
        "content-type": "application/x-www-form-urlencoded"
      }
    );
  }

  if (adapter.id === "whatsapp-cloud-notification") {
    return request(
      adapter,
      "POST",
      "https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages",
      ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "{verified-whatsapp-recipient}",
        type: "template",
        template: {
          name: "customcard_status_update",
          language: { code: input.locale.replace("-", "_") || "en_US" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: message }]
            }
          ]
        },
        metadata
      },
      [],
      { authorization: "Bearer {WHATSAPP_ACCESS_TOKEN}" }
    );
  }

  if (adapter.id === "expo-push-notification") {
    return request(adapter, "POST", "https://exp.host/--/api/v2/push/send", ["EXPO_ACCESS_TOKEN"], {
      to: "{expo-push-token}",
      title: subject,
      body: message,
      sound: "default",
      data: metadata
    });
  }

  if (adapter.id === "firebase-cloud-messaging") {
    return request(
      adapter,
      "POST",
      "https://fcm.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/messages:send",
      ["FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON"],
      {
        message: {
          token: "{firebase-registration-token}",
          notification: { title: subject, body: message },
          data: {
            customcard_adapter: adapter.id,
            channel,
            live_send: "disabled"
          }
        },
        metadata
      },
      [],
      {
        authorization: "Bearer {firebase-oauth-access-token}",
        "x-customcard-service-account": "{FIREBASE_SERVICE_ACCOUNT_JSON}"
      }
    );
  }

  if (adapter.id === "customerio-transactional-notification") {
    return request(
      adapter,
      "POST",
      "https://api.customer.io/v1/send/email",
      ["CUSTOMERIO_APP_API_KEY", "CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID"],
      {
        transactional_message_id: "{CUSTOMERIO_TRANSACTIONAL_MESSAGE_ID}",
        identifiers: { id: "{customcard-customer-reference}" },
        to: "{verified-recipient}",
        subject,
        message_data: { message, metadata },
        disable_message_retention: true
      },
      [],
      { authorization: "Bearer {CUSTOMERIO_APP_API_KEY}" }
    );
  }

  if (adapter.id === "braze-canvas-notification") {
    return request(
      adapter,
      "POST",
      "{BRAZE_REST_ENDPOINT}/messages/send",
      ["BRAZE_REST_ENDPOINT", "BRAZE_REST_API_KEY", "BRAZE_CANVAS_ID"],
      {
        canvas_id: "{BRAZE_CANVAS_ID}",
        recipients: [{ external_user_id: "{customcard-customer-reference}" }],
        messages: {
          [channel]: {
            subject,
            body: message
          }
        },
        metadata
      },
      [],
      { authorization: "Bearer {BRAZE_REST_API_KEY}" }
    );
  }

  if (adapter.id === "onesignal-message-notification") {
    return request(
      adapter,
      "POST",
      "https://api.onesignal.com/notifications",
      ["ONESIGNAL_APP_ID", "ONESIGNAL_REST_API_KEY"],
      {
        app_id: "{ONESIGNAL_APP_ID}",
        include_aliases: { external_id: ["{customcard-customer-reference}"] },
        target_channel: channel === "push" ? "push" : "email",
        headings: { en: subject },
        contents: { en: message },
        custom_data: metadata
      },
      [],
      { authorization: "Key {ONESIGNAL_REST_API_KEY}" }
    );
  }

  if (adapter.id === "courier-send-notification") {
    return request(
      adapter,
      "POST",
      "https://api.courier.com/send",
      ["COURIER_AUTH_TOKEN", "COURIER_TEMPLATE_ID"],
      {
        message: {
          template: "{COURIER_TEMPLATE_ID}",
          to: { user_id: "{customcard-customer-reference}" },
          data: { subject, message, metadata },
          routing: { method: "single", channels: [channel] }
        }
      },
      [],
      { authorization: "Bearer {COURIER_AUTH_TOKEN}" }
    );
  }

  if (adapter.id === "knock-workflow-notification") {
    return request(
      adapter,
      "POST",
      "https://api.knock.app/v1/workflows/{KNOCK_WORKFLOW_KEY}/trigger",
      ["KNOCK_API_KEY", "KNOCK_WORKFLOW_KEY"],
      {
        recipients: ["{customcard-customer-reference}"],
        data: { subject, message, metadata },
        actor: "{customcard-service}"
      },
      [],
      { authorization: "Bearer {KNOCK_API_KEY}" }
    );
  }

  return request(
    adapter,
    "POST",
    "https://api.novu.co/v1/events/trigger",
    ["NOVU_API_KEY", "NOVU_WORKFLOW_ID"],
    {
      name: "{NOVU_WORKFLOW_ID}",
      to: { subscriberId: "{customcard-customer-reference}" },
      payload: { subject, message, metadata }
    },
    [],
    { authorization: "ApiKey {NOVU_API_KEY}" }
  );
}

function notificationChannelForAdapter(adapterId: string, fallback: NotificationRuntimeInput["channel"]) {
  if (adapterId.includes("email")) return "email";
  if (adapterId.includes("sms")) return "sms";
  if (adapterId.includes("whatsapp")) return "whatsapp";
  if (adapterId.includes("customerio") || adapterId.includes("braze") || adapterId.includes("courier") || adapterId.includes("knock") || adapterId.includes("novu")) {
    return fallback;
  }
  if (adapterId.includes("push") || adapterId.includes("messaging")) return "push";
  return fallback;
}

function buildPaymentRequest(adapter: ProviderAdapter, input: PaymentRuntimeInput): RuntimeRequestContract {
  const amountCents = normalizePaymentAmountCents(input.amountCents);
  const currency = normalizeCurrency(input.currency);
  const amountDecimal = (amountCents / 100).toFixed(2);
  const description = sanitizeText(input.description || "CustomCard print package").text || "CustomCard print package";
  const metadata = {
    customcard_adapter: adapter.id,
    customcard_project: normalizeReference(input.projectId, "{customcard-project-id}"),
    customer_reference: "{customcard-customer-reference}",
    checkout_description: description,
    real_charges_enabled: "false",
    card_data_storage: "disabled",
    sandbox_only: "true"
  };

  if (adapter.id === "stripe-checkout-payment") {
    return request(
      adapter,
      "POST",
      "https://api.stripe.com/v1/checkout/sessions",
      [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "CUSTOMCARD_PAYMENT_SUCCESS_URL",
        "CUSTOMCARD_PAYMENT_CANCEL_URL"
      ],
      {
        mode: "payment",
        success_url: "{CUSTOMCARD_PAYMENT_SUCCESS_URL}",
        cancel_url: "{CUSTOMCARD_PAYMENT_CANCEL_URL}",
        client_reference_id: "{customcard-project-id}",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currency.toLowerCase(),
              unit_amount: amountCents,
              product_data: {
                name: "CustomCard print package",
                description,
                metadata
              }
            }
          }
        ],
        payment_intent_data: {
          metadata,
          capture_method: "automatic"
        }
      },
      [],
      {
        authorization: "Bearer {STRIPE_SECRET_KEY}",
        "idempotency-key": "{CUSTOMCARD_IDEMPOTENCY_KEY}"
      }
    );
  }

  if (adapter.id === "paypal-orders-payment") {
    return request(
      adapter,
      "POST",
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
      [
        "PAYPAL_CLIENT_ID",
        "PAYPAL_CLIENT_SECRET",
        "PAYPAL_WEBHOOK_ID",
        "CUSTOMCARD_PAYMENT_SUCCESS_URL",
        "CUSTOMCARD_PAYMENT_CANCEL_URL"
      ],
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: "{customcard-project-id}",
            custom_id: "{customcard-project-id}",
            description,
            amount: {
              currency_code: currency,
              value: amountDecimal
            }
          }
        ],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: "{CUSTOMCARD_PAYMENT_SUCCESS_URL}",
              cancel_url: "{CUSTOMCARD_PAYMENT_CANCEL_URL}",
              shipping_preference: "NO_SHIPPING"
            }
          }
        },
        metadata
      },
      [],
      {
        authorization: "Bearer {paypal-oauth-access-token}",
        "paypal-request-id": "{CUSTOMCARD_IDEMPOTENCY_KEY}"
      }
    );
  }

  if (adapter.id === "square-payments-sandbox") {
    return request(
      adapter,
      "POST",
      "https://connect.squareupsandbox.com/v2/payments",
      ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_WEBHOOK_SIGNATURE_KEY"],
      {
        source_id: "{square-web-payments-sdk-sandbox-token}",
        idempotency_key: "{CUSTOMCARD_IDEMPOTENCY_KEY}",
        amount_money: { amount: amountCents, currency },
        location_id: "{SQUARE_LOCATION_ID}",
        reference_id: "{customcard-project-id}",
        note: description,
        autocomplete: false,
        metadata
      },
      [],
      {
        authorization: "Bearer {SQUARE_ACCESS_TOKEN}",
        "Square-Version": "2026-05-20"
      }
    );
  }

  return request(
    adapter,
    "POST",
    "https://checkout-test.adyen.com/v71/payments",
    ["ADYEN_API_KEY", "ADYEN_MERCHANT_ACCOUNT", "ADYEN_HMAC_KEY", "CUSTOMCARD_PAYMENT_SUCCESS_URL"],
    {
      merchantAccount: "{ADYEN_MERCHANT_ACCOUNT}",
      reference: "{customcard-project-id}",
      amount: { currency, value: amountCents },
      returnUrl: "{CUSTOMCARD_PAYMENT_SUCCESS_URL}",
      paymentMethod: "{adyen-client-side-tokenized-payment-method}",
      shopperReference: "{customcard-customer-reference}",
      shopperInteraction: "Ecommerce",
      recurringProcessingModel: "UnscheduledCardOnFile",
      metadata
    },
    [],
    { "x-api-key": "{ADYEN_API_KEY}" }
  );
}

function buildObservabilityRequest(
  adapter: ProviderAdapter,
  input: ObservabilityRuntimeInput,
  sanitized: SanitizedText
): RuntimeRequestContract {
  const metadata = {
    service_name: normalizeTelemetryToken(input.serviceName, "customcard-api"),
    release: normalizeTelemetryToken(input.release, "local-contract"),
    environment: normalizeTelemetryToken(input.environment, "contract"),
    event_type: input.eventType,
    severity: input.severity,
    route: sanitizeText(input.route).text || "/contract",
    trace_id: input.traceId ? normalizeTelemetryToken(input.traceId, "{customcard-trace-id}") : "{customcard-trace-id}",
    metric_name: normalizeTelemetryToken(input.metricName || "customcard.runtime.contract", "customcard.runtime.contract"),
    value: normalizeMetricValue(input.value),
    message: sanitized.text,
    redactions: sanitized.redactions,
    pii_redacted: true,
    sampling_configured: true,
    live_telemetry: "disabled"
  };

  if (adapter.id === "sentry-error-observability") {
    return request(
      adapter,
      "POST",
      "https://sentry.io/api/{SENTRY_PROJECT_ID}/envelope/",
      ["SENTRY_DSN", "SENTRY_PROJECT_ID", "SENTRY_ENVIRONMENT"],
      {
        envelopeHeaders: { dsn: "{SENTRY_DSN}", sent_at: "{contract-timestamp}" },
        itemHeaders: { type: "event" },
        event: {
          message: sanitized.text,
          level: input.severity,
          environment: "{SENTRY_ENVIRONMENT}",
          release: metadata.release,
          tags: metadata,
          extra: { noNetwork: true }
        }
      },
      [],
      {
        authorization: "Sentry {SENTRY_DSN}",
        "content-type": "application/x-sentry-envelope"
      }
    );
  }

  if (adapter.id === "posthog-product-observability") {
    return request(adapter, "POST", "{POSTHOG_HOST}/capture/", ["POSTHOG_PROJECT_API_KEY", "POSTHOG_HOST"], {
      api_key: "{POSTHOG_PROJECT_API_KEY}",
      event: `customcard_${input.eventType}`,
      distinct_id: "{customcard-customer-reference}",
      properties: {
        ...metadata,
        message: sanitized.text
      }
    });
  }

  if (adapter.id === "opentelemetry-otlp-observability") {
    return request(
      adapter,
      "POST",
      "{OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces",
      ["OTEL_EXPORTER_OTLP_ENDPOINT", "OTEL_EXPORTER_OTLP_HEADERS"],
      {
        resourceSpans: [
          {
            resource: { attributes: telemetryAttributes(metadata) },
            scopeSpans: [
              {
                scope: { name: "customcard.providerRuntime" },
                spans: [
                  {
                    traceId: metadata.trace_id,
                    spanId: "{customcard-span-id}",
                    name: `customcard.${input.eventType}`,
                    attributes: telemetryAttributes({ ...metadata, message: sanitized.text })
                  }
                ]
              }
            ]
          }
        ]
      },
      [],
      { authorization: "{OTEL_EXPORTER_OTLP_HEADERS}" }
    );
  }

  if (adapter.id === "grafana-cloud-otlp-observability") {
    return request(
      adapter,
      "POST",
      "{GRAFANA_OTLP_ENDPOINT}/v1/metrics",
      ["GRAFANA_OTLP_ENDPOINT", "GRAFANA_OTLP_INSTANCE_ID", "GRAFANA_OTLP_API_KEY"],
      {
        resourceMetrics: [
          {
            resource: { attributes: telemetryAttributes(metadata) },
            scopeMetrics: [
              {
                scope: { name: "customcard.providerRuntime" },
                metrics: [
                  {
                    name: metadata.metric_name,
                    gauge: {
                      dataPoints: [{ asDouble: metadata.value, attributes: telemetryAttributes(metadata) }]
                    }
                  }
                ]
              }
            ]
          }
        ]
      },
      [],
      { authorization: "Basic {GRAFANA_OTLP_INSTANCE_ID}:{GRAFANA_OTLP_API_KEY}" }
    );
  }

  if (adapter.id === "datadog-logs-observability") {
    return request(
      adapter,
      "POST",
      "https://http-intake.logs.{DATADOG_SITE}/api/v2/logs",
      ["DATADOG_API_KEY", "DATADOG_SITE"],
      [
        {
          ddsource: "customcard",
          service: metadata.service_name,
          status: input.severity,
          message: sanitized.text,
          tags: [`env:${metadata.environment}`, `release:${metadata.release}`],
          customcard: metadata
        }
      ],
      [],
      { "DD-API-KEY": "{DATADOG_API_KEY}" }
    );
  }

  if (adapter.id === "betterstack-logs-observability") {
    return request(
      adapter,
      "POST",
      "https://{BETTERSTACK_INGESTING_HOST}/",
      ["BETTERSTACK_SOURCE_TOKEN", "BETTERSTACK_INGESTING_HOST"],
      {
        dt: "{contract-timestamp}",
        level: input.severity,
        message: sanitized.text,
        customcard: metadata
      },
      [],
      { authorization: "Bearer {BETTERSTACK_SOURCE_TOKEN}" }
    );
  }

  throw new Error(`Unsupported observability adapter: ${adapter.id}`);
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
      "x-customcard-no-network": "false",
      "x-customcard-live-network": "true",
      ...(scopes.length > 0 ? { "x-customcard-scopes": scopes.join(",") } : {})
    },
    body,
    credentialRefs,
    dataClassifications: dataClassificationsFor(adapter),
    noNetwork: false
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
    if (gate.includes("Opt-in only")) return ["Missing safety gate: notification opt-in"];
    if (gate.includes("Suppression list")) return ["Missing safety gate: suppression list check"];
    if (gate.includes("No sensitive card text in logs")) return ["Missing safety gate: notification content redaction"];
    if (gate.includes("Admin reviewed export")) return ["Missing safety gate: admin reviewed export"];
    if (gate.includes("Payment sandbox")) return ["Missing safety gate: payment sandbox"];
    if (gate.includes("No card data storage") || gate.includes("No card data stored")) {
      return ["Missing safety gate: no card data storage"];
    }
    if (gate.includes("Idempotency key")) return ["Missing safety gate: payment idempotency key"];
    if (gate.includes("Refund path documented")) return ["Missing safety gate: refund path documented"];
    if (gate.includes("Webhook signature verification")) return ["Missing safety gate: webhook signature verification"];
    if (gate.includes("PII redaction")) return ["Missing safety gate: telemetry PII redaction"];
    if (gate.includes("Sampling configured")) return ["Missing safety gate: telemetry sampling"];
    if (gate.includes("Alert routing")) return ["Missing safety gate: alert routing"];
    if (gate.includes("Retention policy")) return ["Missing safety gate: telemetry retention policy"];
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
  if (gate.includes("Opt-in only")) return Boolean(gates.notificationOptInRecorded);
  if (gate.includes("Suppression list")) return Boolean(gates.suppressionListChecked);
  if (gate.includes("No sensitive card text in logs")) return Boolean(gates.sensitiveContentExcluded);
  if (gate.includes("Admin reviewed export")) return Boolean(gates.adminReviewedExport);
  if (gate.includes("No external workflow send")) return true;
  if (gate.includes("Payment sandbox")) return Boolean(gates.paymentSandboxConfigured);
  if (gate.includes("No card data storage") || gate.includes("No card data stored")) {
    return Boolean(gates.noCardDataStorage);
  }
  if (gate.includes("Real charges disabled")) return true;
  if (gate.includes("Idempotency key")) return Boolean(gates.idempotencyKeyReady);
  if (gate.includes("Refund path documented")) return Boolean(gates.refundPathDocumented);
  if (gate.includes("Webhook signature verification")) return Boolean(gates.webhookSignatureVerified);
  if (gate.includes("No external telemetry")) return true;
  if (gate.includes("PII redaction")) return Boolean(gates.telemetryPiiRedacted || gates.piiMinimized);
  if (gate.includes("Sampling configured")) return Boolean(gates.telemetrySamplingConfigured);
  if (gate.includes("Alert routing")) return Boolean(gates.alertRoutingConfigured);
  if (gate.includes("Retention policy")) return Boolean(gates.retentionPolicyConfigured);
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
  const adapter = getProviderAdapter(adapterId);
  if (!adapter) throw new Error(`Unknown provider adapter: ${adapterId}`);
  return adapter;
}

function runtimeSupported(adapter: ProviderAdapter): boolean {
  return Boolean(providerRuntimeHandlers[adapter.capability]);
}

function dataClassificationsFor(adapter: ProviderAdapter): string[] {
  if (adapter.capability === "auth") return ["auth-session", "OIDC-token-metadata", "no-password-storage"];
  if (adapter.capability === "event-import") return ["metadata-only", "no-raw-content"];
  if (adapter.capability === "contact-import") return ["contact-metadata", "address-book", "no-raw-notes", "no-photos"];
  if (adapter.capability === "crm-integration") {
    return ["crm-customer-metadata", "lifecycle-dates", "PII-redacted", "opt-in-required", "no-raw-notes"];
  }
  if (adapter.capability === "workflow-integration") {
    return ["workflow-metadata", "lifecycle-campaign", "PII-redacted", "opt-in-required", "no-raw-notes"];
  }
  if (adapter.capability === "text-chat") return ["customer-message", "approved-memory-only", "PII-redacted"];
  if (adapter.capability === "image-generation") return ["art-prompt", "PII-redacted", "human-print-approval-required"];
  if (adapter.capability === "notification") return ["notification-recipient", "status-message", "PII-redacted", "opt-in-required"];
  if (adapter.capability === "payment") return ["payment-intent", "no-card-data-storage", "idempotent-mutation", "sandbox-only"];
  if (adapter.capability === "observability") return ["operational-telemetry", "PII-redacted", "sampled", "retention-governed"];
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

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return replacements[character];
  });
}

function normalizePaymentAmountCents(amountCents: number): number {
  if (!Number.isFinite(amountCents)) return 699;
  return Math.min(50000, Math.max(50, Math.round(amountCents)));
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

function normalizeReference(value: string, fallback: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return normalized || fallback;
}

function normalizeTelemetryToken(value: string, fallback: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9_.:/-]/g, "-").slice(0, 96);
  return normalized || fallback;
}

function normalizeMetricValue(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1000000, Number(value)));
}

function telemetryAttributes(values: Record<string, unknown>) {
  return Object.entries(values).map(([key, value]) => ({
    key,
    value: typeof value === "number" ? { doubleValue: value } : { stringValue: Array.isArray(value) ? value.join(",") : String(value) }
  }));
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => first.localeCompare(second));
}

function requireRuntimeInput<Key extends keyof ProviderRuntimeInput>(
  input: ProviderRuntimeInput,
  key: Key
): NonNullable<ProviderRuntimeInput[Key]> {
  return input[key] as NonNullable<ProviderRuntimeInput[Key]>;
}

const missingRuntimeSourceTextReason = "Missing required source text for local import/export.";
const missingRuntimeInputReasonPrefix = "Missing required runtime input:";

function requireRuntimeSourceText(sourceText: string): string | undefined {
  const normalized = sourceText.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function blockedForMissingRuntimeSource<T>(adapter: ProviderAdapter, readiness: RuntimeReadiness): RuntimeResult<T> {
  return {
    adapterId: adapter.id,
    capability: adapter.capability,
    mode: "blocked",
    readiness: {
      ...readiness,
      mode: "blocked",
      blockedReasons: uniqueSorted([...readiness.blockedReasons, missingRuntimeSourceTextReason])
    }
  };
}

function blockedForMissingRuntimeInput(
  adapter: ProviderAdapter,
  readiness: RuntimeReadiness,
  inputKey: keyof ProviderRuntimeInput
): RuntimeResult {
  return {
    adapterId: adapter.id,
    capability: adapter.capability,
    mode: "blocked",
    readiness: {
      ...readiness,
      mode: "blocked",
      blockedReasons: uniqueSorted([...readiness.blockedReasons, `${missingRuntimeInputReasonPrefix} ${inputKey}.`])
    }
  };
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

function parseCrmLifecycleImport(sourceText: string) {
  const text = sourceText.trim();
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const dataRowCount = rows.length > 1 ? rows.length - 1 : rows.length > 0 ? 1 : 0;
  const birthdaySignals = /birth(day|date)|dob/i.test(text);
  const purchaseAnniversarySignals = /purchase|order|first_order|last_purchase|anniversary/i.test(text);
  const warrantyAnniversarySignals = /warranty|renewal|service_plan/i.test(text);
  const optInSignals = /opt.?in|marketing.?consent|subscribed/i.test(text);

  return {
    parser: "crm-csv-lifecycle",
    customerCount: dataRowCount,
    lifecycleTriggers: [
      ...(birthdaySignals ? ["birthday"] : []),
      ...(purchaseAnniversarySignals ? ["purchase-anniversary"] : []),
      ...(warrantyAnniversarySignals ? ["warranty-anniversary"] : [])
    ],
    birthdaySignals,
    purchaseAnniversarySignals,
    warrantyAnniversarySignals,
    optInSignals,
    rawNotesStored: false,
    metadataOnly: true,
    noNetwork: true,
    needsSuppressionReview: true
  };
}

function buildLocalWorkflowPayload(sourceText: string, input: WorkflowIntegrationRuntimeInput) {
  const parsed = parseCrmLifecycleImport(sourceText);
  return {
    exporter: "local-workflow-payload",
    destination: input.destination,
    campaignId: normalizeReference(input.campaignId, "customcard-campaign"),
    lifecycleWindow: {
      fromIso: input.fromIso,
      toIso: input.toIso
    },
    customerCount: parsed.customerCount,
    lifecycleTriggers: parsed.lifecycleTriggers,
    optInRecorded: input.optInRecorded || parsed.optInSignals,
    suppressionReviewRequired: true,
    rawNotesStored: false,
    metadataOnly: true,
    liveWorkflowSend: false,
    noNetwork: true
  };
}

function summarizeWorkflowSource(sourceText: string): string {
  const parsed = parseCrmLifecycleImport(sourceText);
  const triggers = parsed.lifecycleTriggers.length > 0 ? parsed.lifecycleTriggers.join(", ") : "lifecycle review";
  return `${parsed.customerCount} metadata rows queued for ${triggers}; raw customer fields withheld.`;
}
