import type { HttpClient, RequestOptions } from "../http.js";
import type { HealthResponse, RouteCatalogResponse } from "../types.js";

/** Public, unauthenticated service health and route discovery. */
export class HealthResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/health` — liveness probe and `realOrdersEnabled` kill-switch state. */
  check(options?: RequestOptions): Promise<HealthResponse> {
    return this.http.get<HealthResponse>("/api/health", "none", undefined, options);
  }

  /** `GET /api/routes` — public catalog of available API routes and their contracts. */
  routes(options?: RequestOptions): Promise<RouteCatalogResponse> {
    return this.http.get<RouteCatalogResponse>("/api/routes", "none", undefined, options);
  }
}
