import type { HttpClient, RequestOptions } from "../http.js";
import type {
  RetailCouponPortalEvidenceRequest,
  RetailCouponPortalEvidenceResponse,
  RetailPrinterOperationStartRequest,
  RetailPrinterOperationStartResponse,
} from "../types.js";

/**
 * Retail-printer fulfillment endpoints. These return server-owned start packets
 * and evidence intake; no live quotes, uploads, payments, or orders are placed.
 */
export class RetailResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `POST /api/retail-printers/operations/start` — build a server-owned retail
   * printer operation start packet (pickup/shipping recommendation flow).
   */
  startOperation(
    body: RetailPrinterOperationStartRequest,
    options?: RequestOptions,
  ): Promise<RetailPrinterOperationStartResponse> {
    return this.http.post<RetailPrinterOperationStartResponse>(
      "/api/retail-printers/operations/start",
      "customer",
      body,
      { idempotent: true, options },
    );
  }

  /**
   * `POST /api/retail-printers/coupon-portal-evidence` — admin-only intake of
   * coupon/portal pricing evidence. Requires an admin-session token.
   */
  submitCouponPortalEvidence(
    body: RetailCouponPortalEvidenceRequest,
    options?: RequestOptions,
  ): Promise<RetailCouponPortalEvidenceResponse> {
    return this.http.post<RetailCouponPortalEvidenceResponse>(
      "/api/retail-printers/coupon-portal-evidence",
      "admin",
      body,
      { idempotent: true, options },
    );
  }
}
