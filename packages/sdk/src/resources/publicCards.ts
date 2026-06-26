import type { HttpClient, RequestOptions } from "../http.js";
import type { PublicFeaturedCardsResponse } from "../types.js";

/** Public, unauthenticated catalog of admin-approved featured cards. */
export class PublicResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/public/featured-cards` — redacted, admin-approved featured gallery. */
  featuredCards(options?: RequestOptions): Promise<PublicFeaturedCardsResponse> {
    return this.http.get<PublicFeaturedCardsResponse>(
      "/api/public/featured-cards",
      "none",
      undefined,
      options,
    );
  }
}
