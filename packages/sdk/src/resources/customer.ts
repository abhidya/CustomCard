import type { HttpClient, RequestOptions } from "../http.js";
import type {
  CustomerBootstrapResponse,
  CustomerConnectionsResponse,
  DraftStateResponse,
  MobileBootstrapParams,
  MobileBootstrapResponse,
  SaveDraftStateRequest,
  SaveDraftStateResponse,
} from "../types.js";

/**
 * Customer-facing endpoints. All require a customer-session token (or Clerk
 * JWT) configured as `customerToken` on the client.
 */
export class CustomerResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/customer/bootstrap` — primary customer panel model and chat session. */
  bootstrap(options?: RequestOptions): Promise<CustomerBootstrapResponse> {
    return this.http.get<CustomerBootstrapResponse>("/api/customer/bootstrap", "customer", undefined, options);
  }

  /** `GET /api/mobile/bootstrap` — mobile-shell experience state. */
  mobileBootstrap(params: MobileBootstrapParams = {}, options?: RequestOptions): Promise<MobileBootstrapResponse> {
    return this.http.get<MobileBootstrapResponse>(
      "/api/mobile/bootstrap",
      "customer",
      { platform: params.platform },
      options,
    );
  }

  /** `GET /api/customer/connections` — provider connections and detected opportunities. */
  connections(options?: RequestOptions): Promise<CustomerConnectionsResponse> {
    return this.http.get<CustomerConnectionsResponse>("/api/customer/connections", "customer", undefined, options);
  }

  /** `GET /api/customer/draft-state/current` — latest in-progress card draft. */
  getDraftState(options?: RequestOptions): Promise<DraftStateResponse> {
    return this.http.get<DraftStateResponse>("/api/customer/draft-state/current", "customer", undefined, options);
  }

  /**
   * `POST /api/customer/draft-state` — persist the signed-in customer's draft.
   * Idempotent: pass `options.idempotencyKey` to safely retry.
   */
  saveDraftState(body: SaveDraftStateRequest, options?: RequestOptions): Promise<SaveDraftStateResponse> {
    return this.http.post<SaveDraftStateResponse>("/api/customer/draft-state", "customer", body, {
      idempotent: true,
      options,
    });
  }
}
