/**
 * Request and response types for the CustomCard API.
 *
 * These mirror the route contracts in `src/apiRouteContractsData.mjs`. Response
 * objects whose internal shape is large, server-owned, or still evolving are
 * typed with their well-known fields plus an index signature, so the SDK stays
 * useful without over-constraining server output.
 */

/** Audience an endpoint is intended for. */
export type Audience = "public" | "customer" | "admin";

/** Generic open record returned by endpoints whose payload is server-owned. */
export type JsonObject = Record<string, unknown>;

/** Which credential a request should be signed with. */
export type AuthScope = "none" | "customer" | "admin";

// ---------------------------------------------------------------------------
// Health & routes
// ---------------------------------------------------------------------------

export interface HealthResponse {
  service: string;
  status: string;
  realOrdersEnabled: boolean;
  [key: string]: unknown;
}

export interface RouteCatalogEntry {
  id: string;
  method: string;
  path: string;
  audience: Audience;
  auth: string;
  [key: string]: unknown;
}

export interface RouteCatalogResponse {
  routes: RouteCatalogEntry[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface CustomerBootstrapResponse {
  primaryActions: unknown[];
  readyFallbacks: unknown[];
  chatTranscript: unknown[];
  customerChat: JsonObject;
  printerPricing: JsonObject;
  fulfillmentRecommendations: unknown[];
  retailOperations: JsonObject;
  localization: JsonObject;
  [key: string]: unknown;
}

export interface DraftStateResponse {
  draftState: JsonObject | null;
  updatedAtIso: string | null;
  repository: string;
  [key: string]: unknown;
}

export interface SaveDraftStateRequest {
  draftInput: JsonObject;
  status?: string;
  opportunityId?: string;
  localeCode?: string;
  vendorId?: string;
}

export interface SaveDraftStateResponse {
  draftStateId: string;
  updatedAtIso: string;
  repository: string;
  [key: string]: unknown;
}

export interface CustomerConnectionsResponse {
  connections: unknown[];
  opportunities: unknown[];
  repository: string;
  [key: string]: unknown;
}

export interface MobileBootstrapParams {
  platform?: string;
}

export interface MobileBootstrapResponse {
  sections: unknown[];
  accountOptions: unknown[];
  importActions: unknown[];
  todaySummary: JsonObject;
  queueItems: unknown[];
  approvalActions: unknown[];
  chatTranscript: unknown[];
  memoryReviewItems: unknown[];
  renderChoices: unknown[];
  pricingPreviews: unknown[];
  fulfillmentRecommendations: unknown[];
  printProofChecks: unknown[];
  handoffSteps: unknown[];
  syncState: JsonObject;
  safetyBanner: JsonObject;
  localeOptions: unknown[];
  localization: JsonObject;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// AI (queue-backed)
// ---------------------------------------------------------------------------

export type QueueStatus = "queued" | "running" | "succeeded" | "failed" | string;

/** Fields common to the immediate response of every queue-backed AI route. */
export interface QueuedJobResponse {
  job_id: string;
  queue_status: QueueStatus;
  job_status_url: string;
  retry_after_seconds: number;
  result_available: boolean;
  ai_queue: JsonObject;
  live_provider_calls_enabled: boolean;
  fallback_queued: boolean;
  external_network_calls: boolean;
  [key: string]: unknown;
}

export interface AiChatRespondRequest {
  customer_message: string;
  recipient_name?: string;
  approved_memory_notes?: string[];
  locale?: string;
}

export interface AiChatRespondResponse extends QueuedJobResponse {
  assistant_message?: string;
  ai_flow?: JsonObject;
  ai_cost_gate?: JsonObject;
  ai_cost_ledger?: JsonObject;
  provider_call_events?: unknown[];
}

export interface AiCardGenerateRequest {
  sender: string;
  recipient: string;
  relationship?: string;
  occasion?: string;
  tone?: string;
  style?: string;
  language?: string;
  personal_note?: string;
  memory_notes?: string[];
}

export interface AiCardGenerateResponse extends QueuedJobResponse {
  draft_id?: string;
  card_copy?: JsonObject;
  images?: unknown[];
  generated_image_persistence?: JsonObject;
  generated_by?: string;
  ai_flow?: JsonObject;
  ai_cost_gate?: JsonObject;
  ai_cost_ledger?: JsonObject;
  provider_call_events?: unknown[];
}

export interface AiJobStatusResponse {
  job_id: string;
  route_id: string;
  queue_status: QueueStatus;
  result_available: boolean;
  attempt_count: number;
  max_attempts: number;
  retry_after_seconds: number;
  result: JsonObject | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Import / Calendar
// ---------------------------------------------------------------------------

export type ImportSourceKind =
  | "invite"
  | "ics"
  | "calendar"
  | "csv"
  | "vcard"
  | "metadata"
  | string;

export interface ImportPreviewRequest {
  sourceKind: ImportSourceKind;
  metadataOnlyPayload?: JsonObject;
  rawImportText?: string;
  rawInviteText?: string;
  rawIcsText?: string;
  rawCalendarText?: string;
}

export interface ImportPreviewResponse {
  opportunities: unknown[];
  warnings: string[];
  rawContentStored: boolean;
  [key: string]: unknown;
}

export interface CalendarConnectionStartRequest {
  calendarChoiceId: string;
  returnTo?: string;
}

export interface CalendarConnectionStartResponse {
  startPacket: JsonObject;
  serverOwned: boolean;
  clientMayPrepareProviderRequest: boolean;
  providerRequestUrl: string | null;
  networkRequestPrepared: boolean;
  credentialStorageEnabled: boolean;
  externalNetworkCalls: boolean;
  realOrdersEnabled: boolean;
  rawContentStored: boolean;
  nextApiRoute: string;
  missingEnv: string[];
  oauth: JsonObject;
  blockers: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Card projects / memories / render packets / handoff / data requests
// ---------------------------------------------------------------------------

export interface CreateCardProjectRequest {
  opportunityId: string;
  recipientName: string;
  approvedMemoryIds?: string[];
  locale?: string;
  occasion?: string;
}

export interface CreateCardProjectResponse {
  projectId: string;
  renderStatus: string;
  requiresRtlLayout: boolean;
  category: string;
  [key: string]: unknown;
}

export type MemoryDecision = "approve" | "forget";

export interface ReviewMemoryRequest {
  recipientName: string;
  text: string;
  decision: MemoryDecision;
}

export interface ReviewMemoryResponse {
  memoryId: string;
  recipientName: string;
  approved: boolean;
  forgottenAt: string | null;
  memoryUseAllowed: boolean;
  [key: string]: unknown;
}

export interface RenderPanel {
  /** Panel identifier, e.g. "front", "inside-left", "inside-right", "back". */
  id?: string;
  svg?: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
}

export interface CreateRenderPacketRequest {
  projectId: string;
  panels: RenderPanel[];
}

export interface CreateRenderPacketResponse {
  renderPacketId: string;
  checksum: string;
  artifactManifest: JsonObject;
  signedArtifactUrls: JsonObject;
  status: string;
  [key: string]: unknown;
}

export interface ManualVendorHandoffRequest {
  projectId: string;
  renderPacketId: string;
  vendorId: string;
  externalShareApproval?: boolean;
}

export interface ManualVendorHandoffResponse {
  handoffChecklist: unknown[];
  signedArtifactUrls: JsonObject;
  realOrdersEnabled: boolean;
  disabledReasons: string[];
  [key: string]: unknown;
}

export type DataRequestType =
  | "access"
  | "export"
  | "delete"
  | "rectify"
  | "portability"
  | string;

export interface DataRequest {
  requestType: DataRequestType;
  region: string;
  consentGranted?: boolean;
}

export interface DataRequestResponse {
  allowed: boolean;
  requiredControls: string[];
  auditRequired: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Retail printers
// ---------------------------------------------------------------------------

export type FulfillmentMode = "pickup" | "shipping" | string;

export interface RetailPrinterOperationStartRequest {
  vendorId: string;
  operation: string;
  quantity?: number;
  fulfillmentMode?: FulfillmentMode;
  renderPacketId?: string;
}

export interface RetailPrinterOperationStartResponse {
  startPacket: JsonObject;
  serverOwned: boolean;
  clientMayPrepareProviderRequest: boolean;
  providerPortalUrl: string | null;
  providerRequestUrl: string | null;
  providerRequestPrepared: boolean;
  networkRequestPrepared: boolean;
  requestPrepared: boolean;
  networkAttempted: boolean;
  externalNetworkCalls: boolean;
  realOrdersEnabled: boolean;
  liveQuoteEnabled: boolean;
  imageUploadEnabled: boolean;
  orderPlacementEnabled: boolean;
  blockers: string[];
  [key: string]: unknown;
}

export interface RetailCouponPortalEvidenceRequest {
  evidenceArtifact: JsonObject;
  portalApplicationPacketId: string;
}

export interface RetailCouponPortalEvidenceResponse {
  providerPortalEvidenceImport: JsonObject;
  acceptedEvidence: unknown[];
  rejectedEvidence: unknown[];
  pricingImpact: JsonObject;
  rankedPricingImpacts: unknown[];
  bestPriceDiscountingAllowed: boolean;
  serverOwned: boolean;
  clientMayPrepareProviderRequest: boolean;
  externalNetworkCalls: boolean;
  realOrdersEnabled: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminReadinessResponse {
  coverage: JsonObject;
  governance: JsonObject;
  localization: JsonObject;
  production: JsonObject;
  externalAudit: JsonObject;
  e2eCoverage: JsonObject;
  aiProviderReadiness: JsonObject;
  aiQueueOperations: JsonObject;
  capacity: JsonObject;
  observability: JsonObject;
  retailFulfillment: JsonObject;
  paymentReadiness: JsonObject;
  mobileRenderReadiness: JsonObject;
  hostedApiReadiness: JsonObject;
  cloudArtifactProofReadiness: JsonObject;
  runtime: JsonObject;
  blockedProviders: unknown[];
  requiredEnv: string[];
  [key: string]: unknown;
}

export interface AdminProviderCatalogResponse {
  adapters: unknown[];
  coverage: JsonObject;
  [key: string]: unknown;
}

export interface AdminProviderGovernanceResponse {
  policies: unknown[];
  budgetCapped: boolean;
  rateLimited: boolean;
  fallbackCovered: boolean;
  blockers: string[];
  [key: string]: unknown;
}

export interface AdminPersistenceReadinessResponse {
  tables: unknown[];
  auth: JsonObject;
  idempotency: JsonObject;
  localBrowserState: JsonObject;
  blockers: string[];
  [key: string]: unknown;
}

export type SortOrder = "asc" | "desc";

export interface AdminArtifactBucketParams {
  prefix?: string;
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: SortOrder;
}

export interface AdminArtifactBucketResponse {
  objectStore: JsonObject;
  prefix: string;
  limit: number;
  sort: string;
  order: SortOrder;
  objectCount: number;
  truncated: boolean;
  nextCursor: string | null;
  objects: unknown[];
  renderPackets: unknown[];
  blockers: string[];
  [key: string]: unknown;
}

export interface AdminDemoResetRequest {
  resetKey: string;
  confirmDemoOnly: boolean;
}

export interface AdminDemoResetResponse {
  seedSummary: JsonObject;
  tables: unknown[];
  rows: number;
  signedArtifactUrls: JsonObject;
  realOrdersEnabled: boolean;
  [key: string]: unknown;
}

export interface AdminCardGalleryResponse {
  categories: unknown[];
  entries: unknown[];
  candidates: unknown[];
  repository: string;
  [key: string]: unknown;
}

export interface AdminCardGallerySaveRequest {
  entryId?: string;
  category?: string;
  title?: string;
  publicCaption?: string;
  featured?: boolean;
  featuredRank?: number;
  publicApproved?: boolean;
  frontSvg?: string;
  sourceDraftId?: string;
  projectId?: string;
  renderPacketId?: string;
  remove?: boolean;
}

export interface AdminCardGallerySaveResponse {
  entryId: string;
  category: string;
  featured: boolean;
  featuredRank: number;
  publicApproved: boolean;
  repository: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

export interface PublicFeaturedCardsResponse {
  categories: unknown[];
  fallbackToBuiltInExamples: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Walgreens hosted checkout
// ---------------------------------------------------------------------------

export interface WalgreensCheckoutStatusResponse {
  ok: boolean;
  status: string;
  enabled: boolean;
  mode: string;
  uploadLimit: number;
  expiresAtIso: string | null;
  blockers: string[];
  upstreamCode: number | null;
  [key: string]: unknown;
}

export interface WalgreensCheckoutUploadRequest {
  imageBase64: string;
}

export interface WalgreensCheckoutUploadResponse {
  ok: boolean;
  imageUrl: string;
  imageName: string;
  expiresAtIso: string;
  [key: string]: unknown;
}

export interface WalgreensCustomer {
  name: string;
  email: string;
  phone?: string;
}

export interface WalgreensCheckoutSessionRequest {
  customer: WalgreensCustomer;
  images: string[];
  lat?: number;
  lng?: number;
}

export interface WalgreensCheckoutSessionResponse {
  ok: boolean;
  checkoutUrl: string;
  window: JsonObject;
  imageCount: number;
  mode: string;
  [key: string]: unknown;
}
