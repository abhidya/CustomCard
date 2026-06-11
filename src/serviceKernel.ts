import { adapterBlocksRealOrders, runOperationalExtraction, walgreensAdapter, type OperationalRun } from "./domain";
import { renderPacketSafeMargins, renderPacketTarget } from "./renderPacketContract";

export type EnvironmentName = "dev" | "test" | "prod";
export type DeploymentMode = "five-dollar-droplet" | "cloud-native-saas";
export type ProviderName = "gmail" | "google_calendar" | "outlook" | "icloud";
export type OpportunityDecision = "generate" | "reject" | "snooze";
export type OrderStatus =
  | "draft"
  | "rendered"
  | "quoted"
  | "external_share_approved"
  | "vendor_handoff_blocked"
  | "vendor_handoff_ready"
  | "vendor_rejected"
  | "wrong_store"
  | "event_moved_up"
  | "cancelled"
  | "fulfilled";
export type DataSubjectAction = "export" | "delete" | "vendor_share" | "ai_generate";

export interface RuntimeConfig {
  environment: EnvironmentName;
  deploymentMode: DeploymentMode;
  database: {
    kind: "sqlite" | "postgres";
    name: string;
    pooledConnections: boolean;
    migrationsRequired: boolean;
  };
  jobs: {
    mode: "inline" | "durable_queue";
    idempotencyRequired: boolean;
    longRunningTaskPolicy: string;
  };
  secrets: {
    provider: "local_env" | "managed_secret_store";
    separatePerEnvironment: true;
  };
  storage: {
    objectStore: "filesystem" | "s3_compatible";
    signedUploadExpiryMinutes: number;
  };
  consistency: {
    financialTransactions: "strong";
    imageGeneration: "available_retryable";
    auditLog: "append_only";
  };
}

export interface ReadinessCheck {
  id: string;
  status: "pass" | "warning" | "blocked";
  detail: string;
}

export interface UserAccount {
  id: string;
  email: string;
  locale: string;
  region: "US" | "EU" | "UK" | "CA" | "MENA";
  platform: "web" | "ios" | "android";
}

export interface ProviderConnection {
  id: string;
  userId: string;
  provider: ProviderName;
  scopes: string[];
  status: "connected" | "revoked" | "unsupported";
  adapterVersion: string;
  metadataSchema: ProviderAdapterContract["metadataSchema"];
  rawContentStored: false;
  reason?: string;
}

export interface ImportedEvent {
  id: string;
  title: string;
  startsAt: string;
  timezone: string;
  sourceEvidence: string;
  recipientHint: string;
  rawContent?: string;
}

export interface CardOpportunity {
  id: string;
  eventId: string;
  title: string;
  recipientName: string;
  leadTimeHours: number;
  confidence: number;
  evidence: string[];
  decision: OpportunityDecision | "pending";
}

export interface RelationshipMemory {
  id: string;
  recipientName: string;
  approved: boolean;
  sensitivity: "normal" | "sensitive";
  text: string;
  source: "user_note" | "prior_card";
  locale: string;
  createdAt: string;
}

export interface CardProject {
  id: string;
  opportunityId: string;
  recipientName: string;
  locale: string;
  requiresRtlLayout: boolean;
  approvedMemoryIds: string[];
  operationalRun: OperationalRun;
}

export interface OrderRecord {
  id: string;
  projectId: string;
  status: OrderStatus;
  storeId?: string;
  quoteCents?: number;
  pickupWindowMinutes?: number;
  certificationRecorded: boolean;
  recoveryActions: string[];
  auditTrail: string[];
}

export interface MemoryRepository {
  save(memory: RelationshipMemory): RelationshipMemory;
  listForRecipient(recipientName: string): RelationshipMemory[];
  forget(memoryId: string): boolean;
}

export interface RenderPanelInput {
  panel: "front" | "inside-left" | "inside-right" | "back";
  text: string;
  locale: string;
}

export interface LayoutValidation {
  panel: string;
  width: 1500;
  height: 2100;
  dpi: 300;
  safeMargins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  requiresRtlLayout: boolean;
  passed: boolean;
  failures: string[];
}

export interface RenderedPrintPanel {
  panel: RenderPanelInput["panel"];
  width: 1500;
  height: 2100;
  dpi: 300;
  locale: string;
  direction: "ltr" | "rtl";
  safeMargins: LayoutValidation["safeMargins"];
  textLines: string[];
  svg: string;
  checksum: string;
}

export interface ValidatedPrintPacket {
  kind: "validated_print_packet" | "blocked";
  target: "5x7-double-sided-card";
  validations: LayoutValidation[];
  assets: RenderedPrintPanel[];
  reason?: string;
}

export interface RegulatoryDecision {
  action: DataSubjectAction;
  region: UserAccount["region"];
  allowed: boolean;
  requiredControls: string[];
  auditRequired: true;
}

export interface ServiceSliceState {
  config: RuntimeConfig;
  readiness: ReadinessCheck[];
  user: UserAccount;
  connection: ProviderConnection;
  importedEvents: ImportedEvent[];
  opportunities: CardOpportunity[];
  memories: RelationshipMemory[];
  project?: CardProject;
  order?: OrderRecord;
  layoutValidations: LayoutValidation[];
  renderPacket: ValidatedPrintPacket;
  regulatoryDecisions: RegulatoryDecision[];
}

export interface ProviderAdapterContract {
  provider: ProviderName;
  adapterVersion: string;
  supported: boolean;
  scopes: string[];
  metadataSchema: {
    kind: "email_metadata" | "calendar_event_metadata" | "manual_calendar_export";
    requiredFields: Array<keyof ImportedEvent>;
    rawContentAllowed: false;
  };
  unsupportedReason?: string;
}

export type OrderTransitionEvent =
  | { type: "render_validated" }
  | { type: "quote_received"; quoteCents: number; storeId: string; pickupWindowMinutes: number }
  | { type: "external_share_approved" }
  | { type: "attempt_vendor_handoff"; certificationRecorded: boolean }
  | { type: "vendor_rejected"; reason: string }
  | { type: "wrong_store"; correctStoreId: string }
  | { type: "event_moved_up"; hoursUntilEvent: number }
  | { type: "cancel" }
  | { type: "fulfilled" };

export const providerAdapters: Record<ProviderName, ProviderAdapterContract> = {
  gmail: {
    provider: "gmail",
    adapterVersion: "gmail-metadata-v1",
    supported: true,
    scopes: ["gmail.metadata.readonly"],
    metadataSchema: {
      kind: "email_metadata",
      requiredFields: ["id", "title", "startsAt", "timezone", "sourceEvidence", "recipientHint"],
      rawContentAllowed: false
    }
  },
  google_calendar: {
    provider: "google_calendar",
    adapterVersion: "google-calendar-events-v1",
    supported: true,
    scopes: ["calendar.events.readonly"],
    metadataSchema: {
      kind: "calendar_event_metadata",
      requiredFields: ["id", "title", "startsAt", "timezone", "sourceEvidence", "recipientHint"],
      rawContentAllowed: false
    }
  },
  outlook: {
    provider: "outlook",
    adapterVersion: "microsoft-graph-calendar-basic-v1",
    supported: true,
    scopes: ["Calendars.ReadBasic"],
    metadataSchema: {
      kind: "calendar_event_metadata",
      requiredFields: ["id", "title", "startsAt", "timezone", "sourceEvidence", "recipientHint"],
      rawContentAllowed: false
    }
  },
  icloud: {
    provider: "icloud",
    adapterVersion: "manual-calendar-export-v1",
    supported: false,
    scopes: [],
    metadataSchema: {
      kind: "manual_calendar_export",
      requiredFields: ["id", "title", "startsAt", "timezone", "sourceEvidence", "recipientHint"],
      rawContentAllowed: false
    },
    unsupportedReason: "iCloud import requires a manual calendar-export adapter until an approved OAuth path exists."
  }
};

export class InMemoryRelationshipMemoryRepository implements MemoryRepository {
  private readonly memories = new Map<string, RelationshipMemory>();

  save(memory: RelationshipMemory): RelationshipMemory {
    this.memories.set(memory.id, memory);
    return memory;
  }

  listForRecipient(recipientName: string): RelationshipMemory[] {
    return [...this.memories.values()].filter((memory) => memory.recipientName === recipientName && memory.approved);
  }

  forget(memoryId: string): boolean {
    return this.memories.delete(memoryId);
  }
}

export function getRuntimeConfig(
  deploymentMode: DeploymentMode,
  environment: EnvironmentName = "dev"
): RuntimeConfig {
  const cloudNative = deploymentMode === "cloud-native-saas";
  const prod = environment === "prod";

  return {
    environment,
    deploymentMode,
    database: {
      kind: prod || cloudNative ? "postgres" : "sqlite",
      name: `customcard_${environment}`,
      pooledConnections: prod || cloudNative,
      migrationsRequired: true
    },
    jobs: {
      mode: cloudNative ? "durable_queue" : "inline",
      idempotencyRequired: true,
      longRunningTaskPolicy: cloudNative
        ? "Queue image generation, render review, and vendor handoff as resumable jobs."
        : "Run inline for beta, but every job still carries an idempotency key."
    },
    secrets: {
      provider: prod || cloudNative ? "managed_secret_store" : "local_env",
      separatePerEnvironment: true
    },
    storage: {
      objectStore: cloudNative ? "s3_compatible" : "filesystem",
      signedUploadExpiryMinutes: 15
    },
    consistency: {
      financialTransactions: "strong",
      imageGeneration: "available_retryable",
      auditLog: "append_only"
    }
  };
}

export function validateRuntimeReadiness(config: RuntimeConfig): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [
    {
      id: "database-per-env",
      status: config.database.name.endsWith(`_${config.environment}`) ? "pass" : "blocked",
      detail: "Database name is environment-scoped."
    },
    {
      id: "migrations",
      status: config.database.migrationsRequired ? "pass" : "blocked",
      detail: "Schema changes must run through migrations."
    },
    {
      id: "secrets",
      status: config.secrets.separatePerEnvironment ? "pass" : "blocked",
      detail: `Secrets use ${config.secrets.provider} and are separated per environment.`
    },
    {
      id: "long-running-jobs",
      status: config.jobs.idempotencyRequired ? "pass" : "blocked",
      detail: config.jobs.longRunningTaskPolicy
    }
  ];

  if (config.environment === "prod" && config.database.kind === "sqlite") {
    checks.push({
      id: "prod-sqlite",
      status: "blocked",
      detail: "Production cannot run on SQLite."
    });
  }

  if (config.deploymentMode === "five-dollar-droplet") {
    checks.push({
      id: "droplet-cost",
      status: "warning",
      detail: "Cheap beta mode is supported, but concurrency and backups must stay explicit."
    });
  }

  return checks;
}

export function connectProvider(user: UserAccount, provider: ProviderName): ProviderConnection {
  const adapter = providerAdapters[provider];

  return {
    id: stableId(`${user.id}:${provider}`),
    userId: user.id,
    provider,
    scopes: adapter.scopes,
    status: adapter.supported ? "connected" : "unsupported",
    adapterVersion: adapter.adapterVersion,
    metadataSchema: adapter.metadataSchema,
    rawContentStored: false,
    reason: adapter.unsupportedReason
  };
}

export function importEvents(
  connection: ProviderConnection,
  events: ImportedEvent[],
  nowIso = "2026-06-01T12:00:00.000Z"
): CardOpportunity[] {
  if (connection.status !== "connected") return [];

  return events.flatMap((event) => {
    if (!isValidImportedEvent(connection, event, nowIso)) return [];

    const leadTimeHours = Math.max(0, Math.round((Date.parse(event.startsAt) - Date.parse(nowIso)) / 36e5));
    const urgent = leadTimeHours <= 24;
    return [{
      id: stableId(`${connection.id}:${event.id}`),
      eventId: event.id,
      title: event.title,
      recipientName: event.recipientHint,
      leadTimeHours,
      confidence: urgent ? 0.92 : 0.82,
      evidence: [event.sourceEvidence, `${leadTimeHours}h lead time`],
      decision: "pending"
    }];
  });
}

export function isValidImportedEvent(
  connection: ProviderConnection,
  event: ImportedEvent,
  nowIso = "2026-06-01T12:00:00.000Z"
): boolean {
  if (Number.isNaN(Date.parse(nowIso)) || Number.isNaN(Date.parse(event.startsAt))) return false;
  if (event.rawContent && !connection.metadataSchema.rawContentAllowed) return false;

  return connection.metadataSchema.requiredFields.every((field) => {
    const value = event[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function decideOpportunity(
  opportunity: CardOpportunity,
  decision: OpportunityDecision
): CardOpportunity {
  return { ...opportunity, decision };
}

export function approveRelationshipMemory(memory: Omit<RelationshipMemory, "id" | "approved">): RelationshipMemory {
  return {
    ...memory,
    id: stableId(`${memory.recipientName}:${memory.text}:${memory.source}`),
    approved: true
  };
}

export function createCardProject(
  user: UserAccount,
  opportunity: CardOpportunity,
  approvedMemories: RelationshipMemory[]
): CardProject | undefined {
  if (opportunity.decision !== "generate") return undefined;

  const memoryText = approvedMemories
    .filter((memory) => memory.approved && memory.recipientName === opportunity.recipientName)
    .map((memory) => memory.text)
    .join(" ");
  const source = `${opportunity.recipientName} ${opportunity.title}. ${memoryText} Walgreens pickup. 5x7 1500x2100 300 DPI. Regional privacy.`;

  return {
    id: stableId(`${user.id}:${opportunity.id}:project`),
    opportunityId: opportunity.id,
    recipientName: opportunity.recipientName,
    locale: user.locale,
    requiresRtlLayout: /^(ar|he|fa|ur)\b/i.test(user.locale),
    approvedMemoryIds: approvedMemories
      .filter((memory) => memory.approved && memory.recipientName === opportunity.recipientName)
      .map((memory) => memory.id),
    operationalRun: runOperationalExtraction(source)
  };
}

export function validatePrintLayout(panels: RenderPanelInput[]): LayoutValidation[] {
  return panels.map((panel) => {
    const requiresRtlLayout = /^(ar|he|fa|ur)\b/i.test(panel.locale);
    const maxLineCharacters = requiresRtlLayout ? 24 : 32;
    const roughLineCount = Math.ceil(panel.text.length / maxLineCharacters);
    const longestWord = panel.text.split(/\s+/).reduce((longest, word) => Math.max(longest, word.length), 0);
    const failures: string[] = [];

    if (roughLineCount > 12) failures.push("text-overflow");
    if (longestWord > maxLineCharacters) failures.push("word-too-long");
    if (panel.text.trim().length === 0) failures.push("empty-panel");
    if (requiresRtlLayout && !/[\u0590-\u08ff]/.test(panel.text)) failures.push("rtl-locale-without-rtl-text");

    return {
      panel: panel.panel,
      width: renderPacketTarget.widthPixels,
      height: renderPacketTarget.heightPixels,
      dpi: renderPacketTarget.dpi,
      safeMargins: renderPacketSafeMargins,
      requiresRtlLayout,
      passed: failures.length === 0,
      failures
    };
  });
}

export function renderPrintPacket(panels: RenderPanelInput[]): ValidatedPrintPacket {
  const validations = validatePrintLayout(panels);
  const blocked = validations.filter((validation) => !validation.passed);

  if (blocked.length > 0) {
    return {
      kind: "blocked",
      target: renderPacketTarget.product,
      validations,
      assets: [],
      reason: blocked.map((validation) => `${validation.panel}:${validation.failures.join("+")}`).join(", ")
    };
  }

  return {
    kind: "validated_print_packet",
    target: renderPacketTarget.product,
    validations,
    assets: panels.map((panel, index) => {
      const validation = validations[index];
      const direction = validation.requiresRtlLayout ? "rtl" : "ltr";
      const textLines = wrapPanelText(panel.text, direction === "rtl" ? 24 : 32);
      const svg = renderPanelSvg(panel, validation, textLines, direction);

      return {
        panel: panel.panel,
        width: renderPacketTarget.widthPixels,
        height: renderPacketTarget.heightPixels,
        dpi: renderPacketTarget.dpi,
        locale: panel.locale,
        direction,
        safeMargins: validation.safeMargins,
        textLines,
        svg,
        checksum: stableId(`${panel.panel}:${panel.locale}:${svg}`)
      };
    })
  };
}

export function evaluateRegulatoryDecision(
  user: UserAccount,
  action: DataSubjectAction,
  vendorSharingApproved = false
): RegulatoryDecision {
  const regionalControls: Record<UserAccount["region"], string[]> = {
    US: ["privacy notice", "deletion workflow", "vendor disclosure"],
    EU: ["lawful basis", "data export", "right to erasure", "processor boundary"],
    UK: ["UK GDPR lawful basis", "data export", "right to erasure", "processor boundary"],
    CA: ["meaningful consent", "access request workflow", "retention limit"],
    MENA: ["locale review", "religious phrase verification", "RTL typography checks"]
  };
  const requiredControls = [...regionalControls[user.region]];

  if (action === "vendor_share") {
    requiredControls.push("just-in-time external sharing approval");
  }

  return {
    action,
    region: user.region,
    allowed: action !== "vendor_share" || vendorSharingApproved,
    requiredControls,
    auditRequired: true
  };
}

export function createDraftOrder(project: CardProject): OrderRecord {
  return {
    id: stableId(`${project.id}:order`),
    projectId: project.id,
    status: "draft",
    certificationRecorded: false,
    recoveryActions: [],
    auditTrail: ["draft order created"]
  };
}

export function transitionOrder(
  order: OrderRecord,
  event: OrderTransitionEvent
): OrderRecord {
  assertTransitionAllowed(order.status, event.type);
  const next = cloneOrder(order);

  if (event.type === "render_validated") {
    next.status = "rendered";
    next.auditTrail.push("renderer packet validated");
    return next;
  }

  if (event.type === "quote_received") {
    next.status = "quoted";
    next.quoteCents = event.quoteCents;
    next.storeId = event.storeId;
    next.pickupWindowMinutes = event.pickupWindowMinutes;
    next.auditTrail.push(`quote received for ${event.storeId}`);
    return next;
  }

  if (event.type === "external_share_approved") {
    next.status = "external_share_approved";
    next.auditTrail.push("user approved external vendor sharing");
    return next;
  }

  if (event.type === "attempt_vendor_handoff") {
    next.certificationRecorded = event.certificationRecorded;
    if (event.certificationRecorded && !adapterBlocksRealOrders(walgreensAdapter)) {
      next.status = "vendor_handoff_ready";
      next.recoveryActions = [];
      next.auditTrail.push("vendor handoff ready after certification and live-order policy checks");
    } else {
      next.status = "vendor_handoff_blocked";
      next.recoveryActions = event.certificationRecorded
        ? ["live order kill switch remains off", "enable only after certified adapter release", "download handoff packet"]
        : ["download print packet", "manual retail upload", "record physical certification"];
      next.auditTrail.push(
        adapterBlocksRealOrders(walgreensAdapter)
          ? "vendor handoff blocked by live-order kill switch"
          : "vendor handoff blocked by certification gate"
      );
    }
    return next;
  }

  if (event.type === "vendor_rejected") {
    next.status = "vendor_rejected";
    next.recoveryActions = ["re-render packet", "choose another store", "download files for manual upload"];
    next.auditTrail.push(`vendor rejected packet: ${event.reason}`);
    return next;
  }

  if (event.type === "wrong_store") {
    next.status = "wrong_store";
    next.recoveryActions = [
      `cancel current store ${next.storeId ?? "unknown"}`,
      `re-quote correct store ${event.correctStoreId}`,
      "offer one-hour pickup if lead time is unsafe"
    ];
    next.auditTrail.push(`wrong store recovery requested for ${event.correctStoreId}`);
    return next;
  }

  if (event.type === "event_moved_up") {
    next.status = "event_moved_up";
    next.recoveryActions =
      event.hoursUntilEvent <= 3
        ? ["switch to one-hour pickup", "download local print packet", "notify user shipping is unsafe"]
        : ["re-quote pickup window", "ask user to approve updated deadline"];
    next.auditTrail.push(`event moved up; ${event.hoursUntilEvent}h remaining`);
    return next;
  }

  if (event.type === "cancel") {
    next.status = "cancelled";
    next.recoveryActions = ["void draft", "retain audit trail", "ask whether to snooze event"];
    next.auditTrail.push("order cancelled");
    return next;
  }

  if (event.type === "fulfilled") {
    next.status = "fulfilled";
    next.auditTrail.push("order fulfilled");
    return next;
  }

  assertNever(event);
}

const allowedOrderTransitions: Record<OrderStatus, OrderTransitionEvent["type"][]> = {
  draft: ["render_validated", "event_moved_up", "cancel"],
  rendered: ["quote_received", "event_moved_up", "cancel"],
  quoted: ["external_share_approved", "wrong_store", "event_moved_up", "cancel"],
  external_share_approved: ["attempt_vendor_handoff", "vendor_rejected", "wrong_store", "event_moved_up", "cancel"],
  vendor_handoff_blocked: ["event_moved_up", "wrong_store", "cancel"],
  vendor_handoff_ready: ["fulfilled", "vendor_rejected", "wrong_store", "event_moved_up", "cancel"],
  vendor_rejected: ["render_validated", "cancel"],
  wrong_store: ["quote_received", "event_moved_up", "cancel"],
  event_moved_up: ["quote_received", "cancel"],
  cancelled: [],
  fulfilled: []
};

function assertTransitionAllowed(status: OrderStatus, eventType: OrderTransitionEvent["type"]): void {
  const allowed = allowedOrderTransitions[status];
  if (!allowed.includes(eventType)) {
    throw new Error(`Invalid order transition: ${status} -> ${eventType}`);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled order transition: ${JSON.stringify(value)}`);
}

export function buildDemoServiceSlice(mode: DeploymentMode = "five-dollar-droplet"): ServiceSliceState {
  const config = getRuntimeConfig(mode, mode === "cloud-native-saas" ? "prod" : "dev");
  const user: UserAccount = {
    id: "user-demo",
    email: "founder@example.com",
    locale: "en-US",
    region: "US",
    platform: "web"
  };
  const connection = connectProvider(user, "gmail");
  const importedEvents: ImportedEvent[] = [
    {
      id: "event-anniversary-sara-ahmed",
      title: "Sara and Ahmed anniversary dinner",
      startsAt: "2026-06-02T18:00:00.000Z",
      timezone: "America/New_York",
      sourceEvidence: "calendar metadata: anniversary dinner",
      recipientHint: "Sara and Ahmed"
    }
  ];
  const [opportunity] = importEvents(connection, importedEvents);
  const decidedOpportunity = decideOpportunity(opportunity, "generate");
  const memories = [
    approveRelationshipMemory({
      recipientName: "Sara and Ahmed",
      sensitivity: "normal",
      text: "They liked warm, funny cards and avoid generic anniversary language.",
      source: "prior_card",
      locale: user.locale,
      createdAt: "2026-06-01T12:00:00.000Z"
    })
  ];
  const memoryRepository = new InMemoryRelationshipMemoryRepository();
  for (const memory of memories) memoryRepository.save(memory);
  const project = createCardProject(user, decidedOpportunity, memories);
  const quotedOrder = project
    ? transitionOrder(
        transitionOrder(createDraftOrder(project), { type: "render_validated" }),
        { type: "quote_received", quoteCents: 699, storeId: "walgreens-421", pickupWindowMinutes: 60 }
      )
    : undefined;
  const order = quotedOrder
    ? transitionOrder(quotedOrder, { type: "event_moved_up", hoursUntilEvent: 2 })
    : undefined;
  const renderInputs: RenderPanelInput[] = project
    ? [
        { panel: "front", text: `For ${project.recipientName}`, locale: project.locale },
        { panel: "inside-left", text: "A warm anniversary note with approved memory context.", locale: project.locale },
        { panel: "inside-right", text: "Pickup-ready and reviewed before any vendor sharing.", locale: project.locale },
        { panel: "back", text: "CustomCard", locale: project.locale }
      ]
    : [];
  const renderPacket = renderPrintPacket(renderInputs);

  return {
    config,
    readiness: validateRuntimeReadiness(config),
    user,
    connection,
    importedEvents,
    opportunities: [decidedOpportunity],
    memories: memoryRepository.listForRecipient("Sara and Ahmed"),
    project,
    order,
    layoutValidations: renderPacket.validations,
    renderPacket,
    regulatoryDecisions: [
      evaluateRegulatoryDecision(user, "ai_generate"),
      evaluateRegulatoryDecision(user, "vendor_share", false)
    ]
  };
}

function renderPanelSvg(
  panel: RenderPanelInput,
  validation: LayoutValidation,
  textLines: string[],
  direction: "ltr" | "rtl"
): string {
  const anchor = direction === "rtl" ? "end" : "start";
  const x = direction === "rtl" ? renderPacketTarget.widthPixels - validation.safeMargins.right : validation.safeMargins.left;
  const y = validation.safeMargins.top + 120;
  const escapedLines = textLines
    .map((line, index) => {
      const dy = index === 0 ? 0 : 72;
      return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${renderPacketTarget.widthPixels}" height="${renderPacketTarget.heightPixels}" viewBox="0 0 ${renderPacketTarget.widthPixels} ${renderPacketTarget.heightPixels}">`,
    `<rect width="${renderPacketTarget.widthPixels}" height="${renderPacketTarget.heightPixels}" fill="#fffaf4"/>`,
    `<rect x="${validation.safeMargins.left}" y="${validation.safeMargins.top}" width="1260" height="1860" fill="none" stroke="#d6b98d" stroke-width="4"/>`,
    `<text x="${x}" y="${y}" direction="${direction}" text-anchor="${anchor}" font-family="Georgia, serif" font-size="56" fill="#241b16">${escapedLines}</text>`,
    `<text x="${x}" y="1980" direction="${direction}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="28" fill="#74685d">${escapeXml(panel.panel)}</text>`,
    `</svg>`
  ].join("");
}

function wrapPanelText(text: string, maxLineCharacters: number): string[] {
  const lines: string[] = [];
  let currentLine = "";

  for (const word of text.trim().split(/\s+/)) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxLineCharacters && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cloneOrder(order: OrderRecord): OrderRecord {
  return {
    ...order,
    recoveryActions: [...order.recoveryActions],
    auditTrail: [...order.auditTrail]
  };
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `cc_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
