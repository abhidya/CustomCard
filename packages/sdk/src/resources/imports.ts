import type { HttpClient, RequestOptions } from "../http.js";
import type {
  CalendarConnectionStartRequest,
  CalendarConnectionStartResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
} from "../types.js";

/**
 * Event import and calendar-connection endpoints. Import previews are
 * metadata-only — raw provider content is never stored server-side.
 */
export class ImportsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * `POST /api/import-preview` — parse invite/ICS/calendar/CSV text (or a
   * metadata-only payload) into card opportunities, without persisting raw text.
   */
  preview(body: ImportPreviewRequest, options?: RequestOptions): Promise<ImportPreviewResponse> {
    return this.http.post<ImportPreviewResponse>("/api/import-preview", "customer", body, {
      idempotent: true,
      options,
    });
  }

  /**
   * `POST /api/calendar/connections/start` — build a server-owned Google
   * Calendar OAuth start packet. No provider credentials are returned.
   */
  startCalendarConnection(
    body: CalendarConnectionStartRequest,
    options?: RequestOptions,
  ): Promise<CalendarConnectionStartResponse> {
    return this.http.post<CalendarConnectionStartResponse>("/api/calendar/connections/start", "customer", body, {
      idempotent: true,
      options,
    });
  }
}
