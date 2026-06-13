// Typed request/response models for the CustomCard API.
//
// The backend has no OpenAPI document; these types were derived from the
// route contracts in `src/apiRouteContractsData.mjs` and live responses from
// the memory-runtime API server (see ASSUMPTIONS.md). Fields the app does not
// consume are intentionally omitted; the client treats payloads as open
// records.

// ---------------------------------------------------------------------------
// Shared

export interface RepositoryInfo {
  table?: string;
  tables?: string[];
  runtimeMode: string;
  persisted: boolean;
  rawContentStored?: boolean;
}

export interface MutationEnvelope {
  service: string;
  status: string;
  route: string;
  idempotencyKey?: string;
  idempotencyReplayed?: boolean;
  realOrdersEnabled: boolean;
  repository?: RepositoryInfo;
}

// ---------------------------------------------------------------------------
// GET /api/health

export interface HealthResponse {
  service: string;
  status: string;
  realOrdersEnabled: boolean;
}

// ---------------------------------------------------------------------------
// GET /api/mobile/bootstrap

export interface MobileSafetyBanner {
  label: string;
  detail: string;
}

export interface MobileTodaySummary {
  cardQueueItemId: string;
  recipientLabel: string;
  eventLabel: string;
  dueLabel: string;
  primaryAction: string;
  riskBadge: string;
  panelCount: number;
  offlineReady: boolean;
  realOrdersEnabled: boolean;
  customerVisible: boolean;
}

export interface MobileSection {
  id: string;
  title: string;
  detail: string;
  status: string;
  customerVisible: boolean;
}

export interface MobileAccountOption {
  provider: string;
  label: string;
  detail: string;
  startRoute: string | null;
  canStartNow: boolean;
  liveOAuthEnabled: boolean;
  customerVisible: boolean;
  blockedReason: string | null;
}

export interface MobileImportAction {
  kind: string;
  label: string;
  detail: string;
  sourceMode: string;
  customerVisible: boolean;
}

export interface MobileQueueItem {
  id: string;
  recipientLabel: string;
  eventLabel: string;
  dueIso: string;
  status: string;
  nextAction: string;
  panelCount: number;
  source: string;
  customerVisible: boolean;
}

export interface MobileApprovalAction {
  kind: string;
  label: string;
  detail: string;
  mutationType: string;
  idempotencyRequired: boolean;
  networkMode: string;
  requiresCustomerConfirmation: boolean;
}

export interface MobileChatMessage {
  speaker: string;
  source: string;
  text: string;
}

export interface MobileMemoryReviewItem {
  id: string;
  cardQueueItemId: string;
  recipientLabel: string;
  memoryLabel: string;
  usage: string;
  approvalRequired: boolean;
  rawContentStored: boolean;
  customerVisible: boolean;
}

export interface MobileRenderChoice {
  label: string;
  detail: string;
  mode: string;
}

export interface MobilePricingPreview {
  vendor: string;
  product: string;
  estimatedTotalCents: number;
  sourceMode: string;
  manualConfirmationRequired: boolean;
  liveQuote: boolean;
}

export interface MobileFulfillmentRecommendation {
  kind: string;
  label: string;
  vendorName: string;
  totalCents: number;
  etaLabel: string;
  confirmationCopy: string;
  priceProofStatus: string;
  priceProofLabel: string;
  liveQuote: boolean;
  liveOrder: boolean;
  customerVisible: boolean;
}

export interface MobilePrintProofCheck {
  id: string;
  label: string;
  detail: string;
  passed: boolean;
  realOrderState: string;
  customerVisible: boolean;
}

export interface MobileHandoffStep {
  label: string;
  detail: string;
  realOrderState: string;
}

export interface MobileLocaleOption {
  locale: string;
  label: string;
  cardLanguage: string;
  writingDirection: "ltr" | "rtl";
  copyReviewRequired: boolean;
  customerVisible: boolean;
}

export interface MobileProofBoundary {
  currentStage: string;
  proofApproved: boolean;
  printOptionsUnlocked: boolean;
}

export interface MobileBootstrapResponse {
  service: string;
  safetyBanner: MobileSafetyBanner;
  proofBoundary: MobileProofBoundary;
  todaySummary: MobileTodaySummary;
  sections: MobileSection[];
  accountOptions: MobileAccountOption[];
  importActions: MobileImportAction[];
  queueItems: MobileQueueItem[];
  approvalActions: MobileApprovalAction[];
  chatTranscript: MobileChatMessage[];
  memoryReviewItems: MobileMemoryReviewItem[];
  renderChoices: MobileRenderChoice[];
  pricingPreviews: MobilePricingPreview[];
  fulfillmentRecommendations: MobileFulfillmentRecommendation[];
  printProofChecks: MobilePrintProofCheck[];
  handoffSteps: MobileHandoffStep[];
  localeOptions: MobileLocaleOption[];
  realOrdersEnabled: boolean;
}

// ---------------------------------------------------------------------------
// GET /api/customer/connections

export interface ProviderConnection {
  provider: string;
  status: string;
  scopes: string[];
  importedEventCount: number;
  opportunityCount: number;
  credentialStorageEnabled: boolean;
  rawContentStored: boolean;
  canScanAgain: boolean;
}

export interface ImportedOpportunity {
  opportunityId: string;
  eventId: string;
  recipientName: string;
  title: string;
  startsAt: string;
  timezone: string;
  confidence: number;
  decision: string;
}

export interface ConnectionsResponse {
  service: string;
  status: string;
  connections: ProviderConnection[];
  opportunities: ImportedOpportunity[];
  repository: RepositoryInfo;
}

// ---------------------------------------------------------------------------
// Draft state

export interface DraftInput {
  sender?: string;
  recipient?: string;
  relationship?: string;
  occasion?: string;
  tone?: string;
  style?: string;
  language?: string;
  personalNote?: string;
  useMemory?: boolean;
}

export interface DraftStateRecord {
  draftStateId: string;
  status: string;
  draftInput: DraftInput;
  opportunityId?: string;
  localeCode?: string;
  vendorId?: string;
}

export interface DraftStateCurrentResponse {
  service: string;
  status: string;
  draftState: DraftStateRecord | null;
  updatedAtIso: string | null;
  repository: RepositoryInfo;
}

export interface SaveDraftStateRequest {
  draftInput: DraftInput;
  status: "in-progress" | "approved" | "abandoned";
  opportunityId?: string;
  localeCode?: string;
  vendorId?: string;
}

export interface SaveDraftStateResponse extends MutationEnvelope {
  draftStateId: string;
  updatedAtIso: string;
}

// ---------------------------------------------------------------------------
// POST /api/import-preview

export interface ImportPreviewRequest {
  sourceKind: "manual-paste" | "invite-text" | "ics-text";
  metadataOnlyPayload?: {
    title: string;
    recipientName: string;
    startsAt: string;
    timezone?: string;
  };
  rawInviteText?: string;
  rawIcsText?: string;
}

export interface ImportPreviewResponse extends MutationEnvelope {
  opportunities: ImportedOpportunity[];
  warnings: string[];
  rawContentStored: boolean;
  importParser?: {
    parsedFromRawText: boolean;
    evidenceSummary: string[];
    warnings: string[];
  };
}

// ---------------------------------------------------------------------------
// POST /api/calendar/connections/start

export interface CalendarStartPacket {
  id: string;
  provider: string;
  label: string;
  status: string;
  startMode: string;
  nextApiRoute: string | null;
  canStartNow: boolean;
  requiredEnv?: string[];
}

export interface CalendarConnectionStartResponse extends MutationEnvelope {
  requestedChoiceId: string;
  startPacket: CalendarStartPacket;
  providerRequestUrl: string | null;
  networkRequestPrepared: boolean;
  blockers?: string[];
}

// ---------------------------------------------------------------------------
// POST /api/memories/review

export interface MemoryReviewRequest {
  recipientName: string;
  text: string;
  decision: "approve" | "forget";
}

export interface MemoryReviewResponse extends MutationEnvelope {
  memoryId: string;
  recipientName: string;
  approved: boolean;
  forgottenAt: string | null;
  memoryUseAllowed: boolean;
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat/respond

export interface ChatRespondRequest {
  customer_message: string;
  recipient_name?: string;
  approved_memory_notes?: string[];
  locale?: string;
}

export interface AiFlowState {
  flow_id: string;
  adapter_id: string;
  live_provider_calls_enabled: boolean;
  ready_for_live_calls: boolean;
  blocked_reasons: string[];
}

export interface ChatRespondResponse {
  service: string;
  assistant_message: string;
  ai_flow: Record<string, AiFlowState>;
  fallback_queued: boolean;
  external_network_calls: boolean;
}

// ---------------------------------------------------------------------------
// POST /api/ai/card/generate

export interface CardGenerateRequest {
  sender: string;
  recipient: string;
  relationship: string;
  occasion: string;
  tone: string;
  style: string;
  language: string;
  personal_note?: string;
  memory_notes?: string[];
}

export interface CardPanelLayout {
  headline_zone: string;
  body_zone: string;
  alignment: string;
  font_pairing: string;
  color_mode: string;
  scale: string;
}

export interface CardPanelCopy {
  id: string;
  headline: string;
  body: string;
  art_direction: string;
  visual_cue: string;
  text_layout: CardPanelLayout;
}

export interface CardCopy {
  theme_guide: {
    theme_title: string;
    palette: string[];
    motifs: string[];
    border_style: string;
  };
  panels: CardPanelCopy[];
  memory_citations: string[];
}

export interface CardGenerateResponse {
  service: string;
  draft_id: string;
  card_copy: CardCopy;
  images: { panel_id?: string; data_url?: string; url?: string }[];
  generated_by: string;
  ai_flow: Record<string, AiFlowState>;
  fallback_queued: boolean;
  external_network_calls: boolean;
}

// ---------------------------------------------------------------------------
// POST /api/card-projects

export interface CreateCardProjectRequest {
  opportunityId: string;
  recipientName: string;
  approvedMemoryIds?: string[];
  locale?: string;
  occasion?: string;
}

export interface CreateCardProjectResponse extends MutationEnvelope {
  projectId: string;
  renderStatus: string;
  requiresRtlLayout: boolean;
  category: string;
}

// ---------------------------------------------------------------------------
// POST /api/render-packets

export interface SignedArtifactUrl {
  method: string;
  signatureVersion: string;
  expiresInMinutes: number;
  url: string;
}

export interface RenderPacketResponse extends MutationEnvelope {
  renderPacketId: string;
  checksum: string;
  artifactManifest: {
    renderPacketId: string;
    projectId: string;
    storageProvider: string;
    artifactCount: number;
    width: number;
    height: number;
    dpi: number;
    locale: string;
    direction: string;
    safeZonePassed: boolean;
    textOverflow: boolean;
  };
  signedArtifactUrls: SignedArtifactUrl[];
}

// ---------------------------------------------------------------------------
// POST /api/vendor-handoff/manual

export interface VendorHandoffRequest {
  projectId: string;
  renderPacketId: string;
  vendorId: string;
  externalShareApproval: boolean;
}

export interface VendorHandoffResponse extends MutationEnvelope {
  orderId: string;
  handoffStatus: string;
  handoffChecklist: string[];
  signedArtifactUrls: SignedArtifactUrl[];
  disabledReasons: string[];
}

// ---------------------------------------------------------------------------
// POST /api/retail-printers/operations/start

export interface RetailOperationStartRequest {
  vendorId: string;
  operation: string;
  quantity?: number;
  fulfillmentMode?: string;
  renderPacketId?: string;
}

export interface RetailOperationStartResponse extends MutationEnvelope {
  requestedVendorId: string;
  requestedOperation: string;
  startPacket: {
    id: string;
    vendorId: string;
    vendorName: string;
    productName: string;
    operation?: string;
  } & Record<string, unknown>;
  providerPortalUrl?: string | null;
  liveQuoteEnabled?: boolean;
  orderPlacementEnabled?: boolean;
  blockers?: string[];
}

// ---------------------------------------------------------------------------
// POST /api/data-requests

export interface DataRequestRequest {
  requestType: "export" | "delete";
  region: string;
  consentGranted: boolean;
}

export interface DataRequestResponse extends MutationEnvelope {
  dataRequestId: string;
  requestType: string;
  requestStatus: string;
  dueAt: string;
}

// ---------------------------------------------------------------------------
// GET /api/public/featured-cards

export interface FeaturedCardEntry {
  entryId?: string;
  title?: string;
  publicCaption?: string;
  frontSvg?: string;
}

export interface FeaturedCardCategory {
  category: string;
  label?: string;
  entries: FeaturedCardEntry[];
}

export interface FeaturedCardsResponse {
  service: string;
  status: string;
  categories: FeaturedCardCategory[];
  fallbackToBuiltInExamples: boolean;
}

// ---------------------------------------------------------------------------
// Walgreens hosted checkout

export interface WalgreensStatusResponse {
  service: string;
  ok: boolean;
  status: string;
  enabled: boolean;
  mode: string;
  uploadLimit?: number;
  expiresAtIso?: string;
  blockers?: string[];
  error?: string;
  retryable?: boolean;
}

export interface WalgreensUploadResponse {
  ok: boolean;
  imageUrl?: string;
  imageName?: string;
  expiresAtIso?: string;
  error?: string;
}

export interface WalgreensSessionRequest {
  customer: { firstName: string; lastName: string; email: string; phone: string };
  images: string[];
  lat?: number;
  lng?: number;
}

export interface WalgreensSessionResponse {
  ok: boolean;
  checkoutUrl?: string;
  imageCount?: number;
  mode?: string;
  error?: string;
}
