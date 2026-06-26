import type { HttpClient, RequestOptions } from "./httpClient";
import type {
  CalendarConnectionStartResponse,
  CardGenerateRequest,
  CardGenerateResult,
  ChatRespondRequest,
  ChatRespondResponse,
  ConnectionsResponse,
  CreateCardProjectRequest,
  CreateCardProjectResponse,
  DataRequestRequest,
  DataRequestResponse,
  DraftStateCurrentResponse,
  FeaturedCardsResponse,
  HealthResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
  MemoryReviewRequest,
  MemoryReviewResponse,
  MobileBootstrapResponse,
  RenderPacketResponse,
  RetailOperationStartRequest,
  RetailOperationStartResponse,
  SaveDraftStateRequest,
  SaveDraftStateResponse,
  AiJobStatusResponse,
  VendorHandoffRequest,
  VendorHandoffResponse,
  WalgreensSessionRequest,
  WalgreensSessionResponse,
  WalgreensStatusResponse,
  WalgreensUploadResponse
} from "./types";

/**
 * Typed facade over every customer-facing API route the app uses. Paths come
 * from `src/apiRouteContractsData.mjs` in the backend repo.
 */
export interface CustomCardApi {
  getHealth(): Promise<HealthResponse>;
  getMobileBootstrap(platform: string): Promise<MobileBootstrapResponse>;
  getConnections(): Promise<ConnectionsResponse>;
  getCurrentDraftState(): Promise<DraftStateCurrentResponse>;
  saveDraftState(
    body: SaveDraftStateRequest,
    options?: RequestOptions
  ): Promise<SaveDraftStateResponse>;
  importPreview(
    body: ImportPreviewRequest,
    options?: RequestOptions
  ): Promise<ImportPreviewResponse>;
  startCalendarConnection(
    calendarChoiceId: string,
    options?: RequestOptions
  ): Promise<CalendarConnectionStartResponse>;
  reviewMemory(body: MemoryReviewRequest, options?: RequestOptions): Promise<MemoryReviewResponse>;
  chatRespond(body: ChatRespondRequest, options?: RequestOptions): Promise<ChatRespondResponse>;
  generateCard(body: CardGenerateRequest, options?: RequestOptions): Promise<CardGenerateResult>;
  getAiJobStatus(jobId: string, options?: RequestOptions): Promise<AiJobStatusResponse>;
  createCardProject(
    body: CreateCardProjectRequest,
    options?: RequestOptions
  ): Promise<CreateCardProjectResponse>;
  createRenderPacket(projectId: string, options?: RequestOptions): Promise<RenderPacketResponse>;
  manualVendorHandoff(
    body: VendorHandoffRequest,
    options?: RequestOptions
  ): Promise<VendorHandoffResponse>;
  startRetailOperation(
    body: RetailOperationStartRequest,
    options?: RequestOptions
  ): Promise<RetailOperationStartResponse>;
  submitDataRequest(
    body: DataRequestRequest,
    options?: RequestOptions
  ): Promise<DataRequestResponse>;
  getFeaturedCards(): Promise<FeaturedCardsResponse>;
  getWalgreensCheckoutStatus(): Promise<WalgreensStatusResponse>;
  uploadWalgreensImage(
    imageBase64: string,
    options?: RequestOptions
  ): Promise<WalgreensUploadResponse>;
  createWalgreensCheckoutSession(
    body: WalgreensSessionRequest,
    options?: RequestOptions
  ): Promise<WalgreensSessionResponse>;
}

export function createCustomCardApi(http: HttpClient): CustomCardApi {
  return {
    getHealth: () => http.get("/api/health"),
    getMobileBootstrap: (platform) =>
      http.get(`/api/mobile/bootstrap?platform=${encodeURIComponent(platform)}`),
    getConnections: () => http.get("/api/customer/connections"),
    getCurrentDraftState: () => http.get("/api/customer/draft-state/current"),
    saveDraftState: (body, options) => http.post("/api/customer/draft-state", body, options),
    importPreview: (body, options) => http.post("/api/import-preview", body, options),
    startCalendarConnection: (calendarChoiceId, options) =>
      http.post("/api/calendar/connections/start", { calendarChoiceId }, options),
    reviewMemory: (body, options) => http.post("/api/memories/review", body, options),
    chatRespond: (body, options) => http.post("/api/ai/chat/respond", body, options),
    generateCard: (body, options) => http.post("/api/ai/card/generate", body, options),
    getAiJobStatus: (jobId, options) =>
      http.get(`/api/ai/jobs/status?job_id=${encodeURIComponent(jobId)}`, options),
    createCardProject: (body, options) => http.post("/api/card-projects", body, options),
    createRenderPacket: (projectId, options) =>
      http.post("/api/render-packets", { projectId, panels: [] }, options),
    manualVendorHandoff: (body, options) => http.post("/api/vendor-handoff/manual", body, options),
    startRetailOperation: (body, options) =>
      http.post("/api/retail-printers/operations/start", body, options),
    submitDataRequest: (body, options) => http.post("/api/data-requests", body, options),
    getFeaturedCards: () => http.get("/api/public/featured-cards"),
    getWalgreensCheckoutStatus: () => http.get("/api/walgreens/checkout/status"),
    uploadWalgreensImage: (imageBase64, options) =>
      http.post("/api/walgreens/checkout/upload", { imageBase64 }, options),
    createWalgreensCheckoutSession: (body, options) =>
      http.post("/api/walgreens/checkout/session", body, options)
  };
}
