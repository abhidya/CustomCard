import type { HttpClient, RequestOptions } from "../http.js";
import type {
  CreateCardProjectRequest,
  CreateCardProjectResponse,
  CreateRenderPacketRequest,
  CreateRenderPacketResponse,
  ManualVendorHandoffRequest,
  ManualVendorHandoffResponse,
  ReviewMemoryRequest,
  ReviewMemoryResponse,
} from "../types.js";

/**
 * Core card-production workflow: relationship memories → card projects →
 * render packets → manual vendor handoff. Every method is idempotent.
 */
export class CardsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `POST /api/memories/review` — approve or forget a relationship memory.
   * Only approved memories may be used in card generation.
   */
  reviewMemory(body: ReviewMemoryRequest, options?: RequestOptions): Promise<ReviewMemoryResponse> {
    return this.http.post<ReviewMemoryResponse>("/api/memories/review", "customer", body, {
      idempotent: true,
      options,
    });
  }

  /** `POST /api/card-projects` — create a card project from an opportunity. */
  createProject(body: CreateCardProjectRequest, options?: RequestOptions): Promise<CreateCardProjectResponse> {
    return this.http.post<CreateCardProjectResponse>("/api/card-projects", "customer", body, {
      idempotent: true,
      options,
    });
  }

  /**
   * `POST /api/render-packets` — validate panels into a checksum-backed render
   * packet with signed artifact URLs. Queue-backed; returns a packet record.
   */
  createRenderPacket(
    body: CreateRenderPacketRequest,
    options?: RequestOptions,
  ): Promise<CreateRenderPacketResponse> {
    return this.http.post<CreateRenderPacketResponse>("/api/render-packets", "customer", body, {
      idempotent: true,
      options,
    });
  }

  /**
   * `POST /api/vendor-handoff/manual` — build the manual print-handoff
   * checklist. No live order is placed; real ordering stays disabled.
   */
  manualVendorHandoff(
    body: ManualVendorHandoffRequest,
    options?: RequestOptions,
  ): Promise<ManualVendorHandoffResponse> {
    return this.http.post<ManualVendorHandoffResponse>("/api/vendor-handoff/manual", "customer", body, {
      idempotent: true,
      options,
    });
  }
}
