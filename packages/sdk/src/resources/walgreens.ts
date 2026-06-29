import type { HttpClient, RequestOptions } from "../http.js";
import type {
  WalgreensCheckoutSessionRequest,
  WalgreensCheckoutSessionResponse,
  WalgreensCheckoutStatusResponse,
  WalgreensCheckoutUploadRequest,
  WalgreensCheckoutUploadResponse,
} from "../types.js";

/**
 * Walgreens hosted-checkout integration. Gated by server-side admin safety
 * controls. These routes make external calls but never place a real order or
 * persist customer identity locally.
 */
export class WalgreensResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/walgreens/checkout/status` — credential/readiness state. */
  status(options?: RequestOptions): Promise<WalgreensCheckoutStatusResponse> {
    return this.http.get<WalgreensCheckoutStatusResponse>(
      "/api/walgreens/checkout/status",
      "customer",
      undefined,
      options,
    );
  }

  /**
   * `POST /api/walgreens/checkout/upload` — forward card JPEG bytes (base64) to
   * Walgreens write-only photo storage and return a hosted image URL.
   */
  upload(
    body: WalgreensCheckoutUploadRequest,
    options?: RequestOptions,
  ): Promise<WalgreensCheckoutUploadResponse> {
    return this.http.post<WalgreensCheckoutUploadResponse>(
      "/api/walgreens/checkout/upload",
      "customer",
      body,
      { options },
    );
  }

  /**
   * `POST /api/walgreens/checkout/session` — create a hosted checkout session
   * pre-filled with customer contact info and uploaded image URLs.
   */
  createSession(
    body: WalgreensCheckoutSessionRequest,
    options?: RequestOptions,
  ): Promise<WalgreensCheckoutSessionResponse> {
    return this.http.post<WalgreensCheckoutSessionResponse>(
      "/api/walgreens/checkout/session",
      "customer",
      body,
      { options },
    );
  }
}
