import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";
import { createApiRuntime, describeApiRoutePersistenceAdapters, postgresPoolConfig } from "../scripts/api-runtime.mjs";
import { createPostgresRuntime } from "../scripts/postgres-runtime.mjs";

const renderPacketsRoute = apiRouteContracts.find((route) => route.id === "render-packets")!;
const calendarConnectionStartRoute = apiRouteContracts.find((route) => route.id === "calendar-connection-start")!;
const providerJobLeaseRoute = apiRouteContracts.find((route) => route.id === "provider-job-lease")!;
const providerJobStatusRoute = apiRouteContracts.find((route) => route.id === "provider-job-status")!;
const adminAiFlowConfigsSaveRoute = apiRouteContracts.find((route) => route.id === "admin-ai-flow-configs-save")!;
const adminWorkerConfigSaveRoute = apiRouteContracts.find((route) => route.id === "admin-worker-config-save")!;
const persistedMutationRouteIds = [
  "admin-ai-flow-configs-save",
  "admin-card-gallery-save",
  "admin-safety-controls-save",
  "admin-worker-config-save",
  "card-projects",
  "customer-draft-state-save",
  "data-requests",
  "import-preview",
  "manual-vendor-handoff",
  "relationship-memories",
  "render-packets"
];

describe("api runtime safety", () => {
  it("keeps route-specific persistence behind explicit adapters", () => {
    expect(describeApiRoutePersistenceAdapters()).toEqual({
      memory: persistedMutationRouteIds,
      postgres: persistedMutationRouteIds
    });

    for (const routeId of persistedMutationRouteIds) {
      const route = apiRouteContracts.find((candidate) => candidate.id === routeId);
      expect(route?.method).toBe("POST");
    }
  });

  it("keeps contract-runtime provider routes behind a bearer boundary", async () => {
    const runtime = createApiRuntime({
      env: { CUSTOMCARD_API_RUNTIME: "contract" },
      routes: apiRouteContracts
    });

    await expect(runtime.authorize(calendarConnectionStartRoute, { headers: {} })).resolves.toMatchObject({
      ok: false,
      statusCode: 401,
      payload: {
        status: "auth-required",
        route: "calendar-connection-start"
      }
    });

    await expect(
      runtime.authorize(calendarConnectionStartRoute, { headers: { authorization: "Bearer contract-customer-token" } })
    ).resolves.toMatchObject({
      ok: true,
      role: "customer",
      userId: "contract-customer"
    });
  });

  it("fails closed for protected routes when production runtime is misconfigured", async () => {
    const runtime = createApiRuntime({
      env: { NODE_ENV: "production" },
      routes: apiRouteContracts
    });

    expect(runtime.mode).toBe("invalid");
    expect(runtime.validate()).toEqual([
      "Production API runtime requires CUSTOMCARD_API_RUNTIME=postgres. Contract and memory runtimes are reviewer-only and do not provide durable production auth/idempotency."
    ]);

    await expect(runtime.authorize(renderPacketsRoute, { headers: {} })).resolves.toMatchObject({
      ok: false,
      statusCode: 503,
      payload: {
        status: "api-runtime-invalid",
        route: "render-packets"
      }
    });

    await expect(
      runtime.persistMutation({
        route: renderPacketsRoute,
        request: { headers: { "x-idempotency-key": "render-prod-invalid" } },
        authContext: { ok: true, userId: "user-prod", role: "customer", sessionId: "session-prod" },
        bodyText: JSON.stringify({ projectId: "project-prod-invalid" }),
        responsePayload: { service: "customcard-api", status: "accepted-contract-only" }
      })
    ).resolves.toMatchObject({
      ok: false,
      statusCode: 503,
      payload: {
        status: "api-runtime-invalid",
        route: "render-packets"
      }
    });
  });

  it("fails closed when Postgres runtime lacks a strong auth session secret", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "postgres",
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        AUTH_SESSION_SECRET: "too-short"
      },
      routes: apiRouteContracts
    });

    expect(runtime.mode).toBe("invalid");
    expect(runtime.validate()).toEqual([
      "Postgres API runtime requires AUTH_SESSION_SECRET to be at least 32 characters."
    ]);

    await expect(runtime.authorize(renderPacketsRoute, { headers: { authorization: "Bearer customer-token" } })).resolves.toMatchObject({
      ok: false,
      statusCode: 503,
      payload: {
        status: "api-runtime-invalid",
        route: "render-packets"
      }
    });
  });

  it("allows memory runtime validation to use Clerk verification instead of seeded static session tokens", () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CLERK_JWT_KEY: "-----BEGIN PUBLIC KEY-----\\ntest-clerk-jwt-key\\n-----END PUBLIC KEY-----",
        CLERK_AUTHORIZED_PARTIES: "https://customcard.test",
        CLERK_ISSUER: "https://clerk.customcard.test",
        CLERK_AUDIENCE: "customcard-api"
      },
      routes: apiRouteContracts
    });

    expect(runtime.validate()).not.toContain("Memory API runtime requires CUSTOMCARD_CUSTOMER_SESSION_TOKEN.");
    expect(runtime.validate()).toEqual([]);
  });

  it("ignores static memory session tokens unless local auth fallbacks are explicitly enabled", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token"
      },
      routes: apiRouteContracts
    });

    expect(runtime.describe()).toMatchObject({ sessionsConfigured: 0 });
    expect(runtime.validate()).toContain(
      "Memory API runtime requires Clerk JWT verification config or explicit local auth fallback runtime config with CUSTOMCARD_CUSTOMER_SESSION_TOKEN plus CUSTOMCARD_ADMIN_SESSION_TOKEN."
    );
    await expect(
      runtime.authorize(renderPacketsRoute, { headers: { authorization: "Bearer test-customer-session-token" } })
    ).resolves.toMatchObject({
      ok: false,
      statusCode: 401,
      payload: { status: "invalid-session" }
    });
  });

  it("allows static memory session tokens only for explicit local auth fallback drills", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token"
      },
      routes: apiRouteContracts,
      localAuthFallbacksEnabled: true
    });

    expect(runtime.describe()).toMatchObject({ sessionsConfigured: 2 });
    expect(runtime.validate()).toEqual([]);
    await expect(
      runtime.authorize(renderPacketsRoute, { headers: { authorization: "Bearer test-customer-session-token" } })
    ).resolves.toMatchObject({
      ok: true,
      role: "customer",
      userId: "user-demo"
    });
  });

  it("persists admin AI flow policy through the runtime instead of browser session drafts", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token",
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      routes: apiRouteContracts,
      localAuthFallbacksEnabled: true
    });
    const authContext = { ok: true, userId: "admin-demo", role: "admin", sessionId: "session-admin" };

    const saved = await runtime.persistMutation({
      route: adminAiFlowConfigsSaveRoute,
      request: { headers: { "x-idempotency-key": "admin-ai-flow-configs-0001" } },
      authContext,
      bodyText: JSON.stringify({
        configs: [
          {
            flowId: "card-copy",
            primaryAdapterId: "cloudflare-workers-ai-chat",
            fallbackAdapterId: "",
            model: "@cf/meta/llama-3.1-8b-instruct-fast",
            promptInstructions: "Use the saved admin policy.",
            rateLimitPerMinute: 3,
            monthlyBudgetCents: 1234,
            perRequestBudgetCents: 2,
            queueEnabled: false,
            fallbackQueueEnabled: false,
            liveProviderCallsEnabled: true,
            maxRetries: 1,
            maxTokens: 1200,
            temperature: 0.4
          }
        ]
      }),
      responsePayload: { service: "customcard-api", status: "accepted" }
    });

    expect(saved.statusCode).toBe(202);
    expect(saved.payload).toMatchObject({
      service: "customcard-admin-ai-flow-configs",
      version: 1,
      updatedBy: "admin-demo",
      repositoryPersisted: true,
      idempotencyPersisted: true
    });

    await expect(runtime.readAdminAiFlowConfig()).resolves.toMatchObject({
      version: 1,
      configs: expect.arrayContaining([
        expect.objectContaining({
          flowId: "card-copy",
          primaryAdapterId: "cloudflare-workers-ai-chat",
          promptInstructions: "Use the saved admin policy.",
          rateLimitPerMinute: 3
        })
      ]),
      providerReadiness: {
        "cloudflare-workers-ai-chat": expect.objectContaining({
          configured: true,
          credentialsExposed: false
        })
      }
    });
  });

  it("persists worker queue policy through admin runtime config instead of env knobs", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "memory",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token"
      },
      routes: apiRouteContracts,
      localAuthFallbacksEnabled: true
    });
    const authContext = { ok: true, userId: "admin-demo", role: "admin", sessionId: "session-admin" };

    const saved = await runtime.persistMutation({
      route: adminWorkerConfigSaveRoute,
      request: { headers: { "x-idempotency-key": "admin-worker-config-0001" } },
      authContext,
      bodyText: JSON.stringify({
        worker: {
          batchSize: 2,
          leaseSeconds: 120,
          retryBackoffSeconds: 15,
          pollIntervalMs: 1000
        },
        providerWorker: {
          routeIds: ["ai-card-generate", "manual-vendor-handoff"],
          batchSize: 3,
          leaseSeconds: 180,
          retryBackoffSeconds: 20,
          pollIntervalMs: 1500
        }
      }),
      responsePayload: { service: "customcard-api", status: "accepted" }
    });

    expect(saved.statusCode).toBe(202);
    expect(saved.payload).toMatchObject({
      service: "customcard-admin-worker-config",
      version: 1,
      updatedBy: "admin-demo",
      worker: {
        batchSize: 2,
        leaseSeconds: 120,
        retryBackoffSeconds: 15,
        pollIntervalMs: 1000
      },
      providerWorker: {
        routeIds: ["ai-card-generate", "manual-vendor-handoff"],
        batchSize: 3,
        leaseSeconds: 180,
        retryBackoffSeconds: 20,
        pollIntervalMs: 1500
      },
      repositoryPersisted: true,
      idempotencyPersisted: true
    });

    await expect(runtime.readAdminWorkerConfig()).resolves.toMatchObject({
      version: 1,
      providerWorker: {
        routeIds: ["ai-card-generate", "manual-vendor-handoff"],
        batchSize: 3
      },
      repository: {
        credentialsStored: false,
        rawCustomerContentStored: false
      }
    });
  });

  it("does not require real-order safety controls as runtime env vars", () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_ENV: "production",
        CUSTOMCARD_API_RUNTIME: "postgres",
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        QUEUE_URL: "redis://customcard-queue.internal",
        OBJECT_STORE_URL: "https://objects.customcard.test",
        OBJECT_STORE_BUCKET: "customcard-prod-artifacts",
        OBJECT_STORE_ACCESS_KEY_ID: "test-object-store-access-key",
        OBJECT_STORE_SECRET_ACCESS_KEY: "test-object-store-secret-key",
        OBJECT_STORE_PUBLIC_BASE_URL: "https://artifacts.customcard.test",
        OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CLERK_JWT_KEY: `-----BEGIN PUBLIC KEY-----
test-clerk-jwt-key
-----END PUBLIC KEY-----`,
        CLERK_AUTHORIZED_PARTIES: "https://customcard.test",
        CLERK_ISSUER: "https://clerk.customcard.test",
        CLERK_AUDIENCE: "customcard-api"
      },
      routes: apiRouteContracts
    });

    expect(runtime.mode).toBe("postgres");
    expect(runtime.validate()).toEqual([]);
  });

  it("self-initializes the admin runtime config table before Postgres admin reads", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "postgres",
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars"
      },
      routes: apiRouteContracts,
      postgresPoolFactory: () => createAdminRuntimeConfigPool(queries)
    });

    await expect(runtime.readAdminSafetyControls()).resolves.toMatchObject({
      service: "customcard-admin-safety-controls",
      status: "fail-closed"
    });
    expect(queries.some((query) => query.sql.includes("CREATE TABLE IF NOT EXISTS admin_runtime_configs"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("CREATE INDEX IF NOT EXISTS idx_admin_runtime_configs_updated"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("FROM admin_runtime_configs"))).toBe(true);
  });

  it("bounds Postgres pool settings for serverless-safe defaults", () => {
    expect(postgresPoolConfig({ DATABASE_URL: "postgres://customcard-db.internal/customcard" })).toMatchObject({
      connectionString: "postgres://customcard-db.internal/customcard",
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10_000,
      allowExitOnIdle: true
    });

    expect(
      postgresPoolConfig({
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        CUSTOMCARD_POSTGRES_POOL_MAX: "500",
        CUSTOMCARD_POSTGRES_POOL_CONNECTION_TIMEOUT_MS: "1",
        CUSTOMCARD_POSTGRES_POOL_IDLE_TIMEOUT_MS: "999999"
      })
    ).toMatchObject({
      max: 20,
      connectionTimeoutMillis: 1000,
      idleTimeoutMillis: 120_000
    });
  });

  it("records AI provider call events in the memory provider ledger", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "memory",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token"
      },
      routes: apiRouteContracts,
      localAuthFallbacksEnabled: true
    });

    await expect(
      runtime.recordProviderCallEvents({
        authContext: { userId: "user-ai-ledger", role: "customer", sessionId: "session-ai-ledger" },
        events: [
          {
            id: "provider-call-ai-ledger",
            tenant_id: "user-ai-ledger",
            route_id: "ai-card-generate",
            flow_id: "card-image",
            adapter_id: "cloudflare-workers-ai-image",
            provider: "Cloudflare",
            capability: "image-generation",
            status: "reserved",
            month_bucket: "2026-06",
            request_units: 4,
            estimated_cost_cents: 300,
            rate_limit_window_start: "2026-06-12T01:00:00.000Z",
            live_network_call: true,
            metadata: { phase: "card-image", token: "must-not-persist" }
          }
        ]
      })
    ).resolves.toMatchObject({
      persisted: true,
      count: 1,
      runtimeMode: "memory"
    });
  });

  it("gates provider job leasing behind a scoped provider token", async () => {
    const providerToken = "test-provider-worker-token-32-chars";
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "postgres",
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_PROVIDER_WORKER_TOKEN: providerToken
      },
      routes: apiRouteContracts,
      postgresPoolFactory: () => createProviderPool([])
    });

    await expect(runtime.authorize(providerJobLeaseRoute, { headers: {} })).resolves.toMatchObject({
      ok: false,
      statusCode: 401,
      payload: { status: "auth-required" }
    });
    await expect(
      runtime.authorize(providerJobLeaseRoute, { headers: { authorization: "Bearer wrong-provider-token" } })
    ).resolves.toMatchObject({
      ok: false,
      statusCode: 401,
      payload: { status: "invalid-provider-token" }
    });
    await expect(
      runtime.authorize(providerJobLeaseRoute, { headers: { authorization: `Bearer ${providerToken}` } })
    ).resolves.toMatchObject({
      ok: true,
      role: "provider"
    });
    await expect(
      runtime.authorize(providerJobStatusRoute, { headers: { authorization: `Bearer ${providerToken}` } })
    ).resolves.toMatchObject({
      ok: true,
      role: "provider"
    });
  });

  it("leases and completes provider jobs without exposing database or object-store credentials to the worker", async () => {
    const providerToken = "test-provider-worker-token-32-chars";
    const lockedAt = new Date().toISOString();
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const pool = createProviderPool(queries, [
      {
        id: "job-ai-provider-1",
        user_id: "user-demo",
        route_id: "ai-card-generate",
        idempotency_key_id: "idem-ai-provider-1",
        payload: {
          routeId: "ai-card-generate",
          body: { sender: "Manny", recipient: "Sara", occasion: "birthday" },
          requestContext: {
            rateKey: "user-demo",
            idempotencyKey: "idem-ai-provider-1",
            authContext: { userId: "user-demo", role: "customer", sessionId: "real-session-id" }
          }
        },
        attempt_count: 1,
        max_attempts: 3,
        locked_at: lockedAt
      }
    ]);
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "postgres",
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_PROVIDER_WORKER_TOKEN: providerToken
      },
      routes: apiRouteContracts,
      postgresPoolFactory: () => pool
    });
    const authContext = await runtime.authorize(providerJobLeaseRoute, {
      headers: { authorization: `Bearer ${providerToken}` }
    });

    const lease = await runtime.leaseProviderJobs({
      authContext,
      workerId: "manny-comfy-01",
      routeIds: ["ai-card-generate", "manual-vendor-handoff"],
      limit: 1
    });
    const leasedJob = lease.payload.jobs[0];

    expect(lease).toMatchObject({
      statusCode: 200,
      payload: {
        leased: 1,
        route_scope: ["ai-card-generate"],
        artifact_upload: { r2CredentialsExposed: false }
      }
    });
    expect(leasedJob.payload.requestContext.authContext.sessionId).toBe("provider-lease");
    expect(leasedJob.payload.aiFlowAdminConfig).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flowId: "card-image",
          primaryAdapterId: "local-comfyui-api-image",
          model: "flux-2-klein-4b.safetensors",
          workflowId: "customcard-flux2-klein-production-text-overlay",
          workflowPath: "comfyui-workflows/customcard-flux2-klein-production-text-overlay.json"
        })
      ])
    );
    expect(leasedJob.lease_token).toMatch(/^[a-f0-9]{64}$/);
    expect(queries.some((query) => query.sql.includes("FROM admin_runtime_configs") && query.params.includes("worker-config"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("FROM admin_runtime_configs") && query.params.includes("ai-flow-configs"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("FOR UPDATE SKIP LOCKED"))).toBe(true);

    const status = await runtime.readProviderJobStatus({
      authContext,
      routeIds: ["ai-card-generate", "manual-vendor-handoff"]
    });

    expect(status).toMatchObject({
      statusCode: 200,
      payload: {
        route_scope: ["ai-card-generate"],
        metrics: {
          queued_total: 2,
          running_total: 1,
          stale_running_total: 0,
          dead_lettered_total: 0,
          oldest_queued_age_seconds: 42
        },
        queue: {
          returned: 1,
          items: [
            expect.objectContaining({
              job_id: "job-ai-provider-1",
              route_id: "ai-card-generate",
              status: "running",
              queue_lane: "running",
              attempt_count: 1,
              max_attempts: 3,
              input_summary: expect.objectContaining({
                body_keys: expect.arrayContaining(["sender", "recipient", "occasion"])
              })
            })
          ]
        },
        artifact_upload: { r2CredentialsExposed: false }
      }
    });
    expect(JSON.stringify(status.payload)).not.toContain("real-session-id");

    const complete = await runtime.completeProviderJob({
      authContext,
      jobId: leasedJob.job_id,
      body: {
        worker_id: "manny-comfy-01",
        lease_token: leasedJob.lease_token,
        status: "succeeded",
        result: {
          status: "ai-result-ready",
          routeId: "ai-card-generate",
          httpStatusCode: 200,
          payload: {
            draft_id: "draft-provider-1",
            images: []
          }
        }
      },
      now: () => new Date("2030-01-01T00:00:00.000Z")
    });

    expect(complete).toMatchObject({
      statusCode: 200,
      payload: {
        status: "completed",
        job_id: "job-ai-provider-1",
        queue_status: "succeeded",
        result_available: true
      }
    });
    expect(queries.some((query) => query.sql.includes("status = 'succeeded'"))).toBe(true);
    expect(queries.some((query) => query.sql.includes("api.provider_job.succeeded"))).toBe(true);
  });

  it("attaches the Postgres pool to the serverless lifecycle when enabled", async () => {
    const pool = {
      async query() {
        return { rows: [], rowCount: 0 };
      },
      async connect() {
        return {
          async query() {
            return { rows: [], rowCount: 0 };
          },
          release() {
            return undefined;
          }
        };
      },
      async end() {
        return undefined;
      }
    };
    const attached: unknown[] = [];
    const runtime = createPostgresRuntime({
      env: {
        DATABASE_URL: "postgres://customcard-db.internal/customcard",
        CUSTOMCARD_POSTGRES_ATTACH_DATABASE_POOL: "enabled"
      },
      postgresPoolFactory: () => pool,
      attachDatabasePool: (candidate: unknown) => attached.push(candidate)
    });

    await runtime.getPool();

    expect(attached).toEqual([pool]);
    expect(runtime.describe()).toMatchObject({
      configured: true,
      lifecycleAttached: true,
      max: 5
    });
    await runtime.close();
  });
});

function createAdminRuntimeConfigPool(queries: Array<{ sql: string; params: unknown[] }>) {
  const client = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql: compactSql(sql), params });
      return { rows: [], rowCount: 0 };
    },
    release() {
      return undefined;
    }
  };
  return {
    async query(sql: string, params: unknown[] = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
    async end() {
      return undefined;
    }
  };
}

function createProviderPool(queries: Array<{ sql: string; params: unknown[] }>, leasedRows: unknown[] = []) {
  let leaseUsed = false;
  const currentRows = leasedRows.map((row) => ({ ...(row as Record<string, unknown>), status: "running", locked_by: "manny-comfy-01" }));
  const client = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql: compactSql(sql), params });
      if (sql.includes("FROM admin_runtime_configs") && params.includes("ai-flow-configs")) {
        return {
          rows: [
            {
              payload: {
                configs: [
                  {
                    flowId: "card-image",
                    primaryAdapterId: "local-comfyui-api-image",
                    fallbackAdapterId: "local-comfyui-api-image",
                    model: "flux-2-klein-4b.safetensors",
                    liveProviderCallsEnabled: true,
                    queueEnabled: true,
                    renderingMode: "final-text-composited",
                    workflowId: "customcard-flux2-klein-production-text-overlay",
                    workflowPath: "comfyui-workflows/customcard-flux2-klein-production-text-overlay.json"
                  }
                ]
              }
            }
          ],
          rowCount: 1
        };
      }
      if (sql.includes("FROM admin_runtime_configs")) {
        return {
          rows: [
            {
              payload: {
                providerWorker: {
                  routeIds: ["ai-card-generate"],
                  batchSize: 1,
                  leaseSeconds: 300,
                  retryBackoffSeconds: 60,
                  pollIntervalMs: 5000
                }
              }
            }
          ],
          rowCount: 1
        };
      }
      if (sql.includes("WITH scoped_jobs")) {
        return {
          rows: [
            {
              queued_total: 2,
              running_total: 1,
              stale_running_total: 0,
              succeeded_total: 5,
              dead_lettered_total: 0,
              oldest_queued_age_seconds: 42,
              max_active_attempt_count: 1,
              max_attempts: 3,
              last_succeeded_at: "2030-01-01T00:00:00.000Z",
              last_dead_lettered_at: null
            }
          ],
          rowCount: 1
        };
      }
      if (sql.includes("queue_lane") || (sql.includes("lease_expires_at") && sql.includes("last_error") && sql.includes("FROM api_jobs"))) {
        return {
          rows: currentRows.map((row) => ({
            created_at: "2030-01-01T00:00:00.000Z",
            updated_at: "2030-01-01T00:00:05.000Z",
            run_after: "2030-01-01T00:00:00.000Z",
            last_error: null,
            result: {},
            age_seconds: 5,
            updated_age_seconds: 0,
            lease_age_seconds: 5,
            run_after_delay_seconds: 0,
            lease_expires_at: "2030-01-01T00:05:00.000Z",
            ...row
          })),
          rowCount: currentRows.length
        };
      }
      if (sql.includes("locked_at < NOW()")) return { rows: [], rowCount: 0 };
      if (sql.includes("FOR UPDATE SKIP LOCKED")) {
        if (leaseUsed) return { rows: [], rowCount: 0 };
        leaseUsed = true;
        return { rows: leasedRows, rowCount: leasedRows.length };
      }
      if (sql.includes("FROM api_jobs") && sql.includes("WHERE id = $1")) {
        return { rows: currentRows.filter((row) => row.id === params[0]), rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() {
      return undefined;
    }
  };
  return {
    async query(sql: string, params: unknown[] = []) {
      return client.query(sql, params);
    },
    async connect() {
      return client;
    },
    async end() {
      return undefined;
    }
  };
}

function compactSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}
