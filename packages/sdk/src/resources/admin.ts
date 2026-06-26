import type { HttpClient, RequestOptions } from "../http.js";
import type {
  AdminArtifactBucketParams,
  AdminArtifactBucketResponse,
  AdminCardGalleryResponse,
  AdminCardGallerySaveRequest,
  AdminCardGallerySaveResponse,
  AdminDemoResetRequest,
  AdminDemoResetResponse,
  AdminPersistenceReadinessResponse,
  AdminProviderCatalogResponse,
  AdminProviderGovernanceResponse,
  AdminReadinessResponse,
} from "../types.js";

/**
 * Admin/operations endpoints. All require an admin-session token configured as
 * `adminToken` on the client.
 */
export class AdminResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/admin/readiness` — aggregated production-readiness register. */
  readiness(options?: RequestOptions): Promise<AdminReadinessResponse> {
    return this.http.get<AdminReadinessResponse>("/api/admin/readiness", "admin", undefined, options);
  }

  /** `GET /api/admin/provider-catalog` — provider adapter catalog and coverage. */
  providerCatalog(options?: RequestOptions): Promise<AdminProviderCatalogResponse> {
    return this.http.get<AdminProviderCatalogResponse>("/api/admin/provider-catalog", "admin", undefined, options);
  }

  /** `GET /api/admin/provider-governance` — provider governance + budget/rate policy. */
  providerGovernance(options?: RequestOptions): Promise<AdminProviderGovernanceResponse> {
    return this.http.get<AdminProviderGovernanceResponse>(
      "/api/admin/provider-governance",
      "admin",
      undefined,
      options,
    );
  }

  /** `GET /api/admin/persistence-readiness` — persistence/auth/idempotency posture. */
  persistenceReadiness(options?: RequestOptions): Promise<AdminPersistenceReadinessResponse> {
    return this.http.get<AdminPersistenceReadinessResponse>(
      "/api/admin/persistence-readiness",
      "admin",
      undefined,
      options,
    );
  }

  /** `GET /api/admin/artifacts/bucket` — list render-packet artifact-store objects (paginated). */
  artifactBucket(
    params: AdminArtifactBucketParams = {},
    options?: RequestOptions,
  ): Promise<AdminArtifactBucketResponse> {
    return this.http.get<AdminArtifactBucketResponse>(
      "/api/admin/artifacts/bucket",
      "admin",
      {
        prefix: params.prefix,
        limit: params.limit,
        cursor: params.cursor,
        sort: params.sort,
        order: params.order,
      },
      options,
    );
  }

  /**
   * Iterate every artifact-store object across pages, transparently following
   * `nextCursor`. Yields one page at a time.
   */
  async *iterateArtifactBucket(
    params: AdminArtifactBucketParams = {},
    options?: RequestOptions,
  ): AsyncGenerator<AdminArtifactBucketResponse, void, unknown> {
    let cursor = params.cursor;
    do {
      const page = await this.artifactBucket({ ...params, cursor }, options);
      yield page;
      cursor = page.truncated ? page.nextCursor ?? undefined : undefined;
    } while (cursor);
  }

  /** `POST /api/admin/demo-reset` — reset demo fixtures. Idempotent. */
  demoReset(body: AdminDemoResetRequest, options?: RequestOptions): Promise<AdminDemoResetResponse> {
    return this.http.post<AdminDemoResetResponse>("/api/admin/demo-reset", "admin", body, {
      idempotent: true,
      options,
    });
  }

  /** `GET /api/admin/card-gallery` — admin gallery curation view. */
  cardGallery(options?: RequestOptions): Promise<AdminCardGalleryResponse> {
    return this.http.get<AdminCardGalleryResponse>("/api/admin/card-gallery", "admin", undefined, options);
  }

  /** `POST /api/admin/card-gallery` — create, update, feature, or remove a gallery entry. Idempotent. */
  saveCardGalleryEntry(
    body: AdminCardGallerySaveRequest,
    options?: RequestOptions,
  ): Promise<AdminCardGallerySaveResponse> {
    return this.http.post<AdminCardGallerySaveResponse>("/api/admin/card-gallery", "admin", body, {
      idempotent: true,
      options,
    });
  }
}
