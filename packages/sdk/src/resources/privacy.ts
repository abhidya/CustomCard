import type { HttpClient, RequestOptions } from "../http.js";
import type { DataRequest, DataRequestResponse } from "../types.js";

/** Regional data-rights (GDPR/CCPA-style) request handling. */
export class PrivacyResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `POST /api/data-requests` — submit an audited data-rights request
   * (access, export, delete, etc.) evaluated against regional controls.
   */
  submitDataRequest(body: DataRequest, options?: RequestOptions): Promise<DataRequestResponse> {
    return this.http.post<DataRequestResponse>("/api/data-requests", "customer", body, {
      idempotent: true,
      options,
    });
  }
}
