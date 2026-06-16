import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";
import { createApiRuntime, describeApiRoutePersistenceAdapters, postgresPoolConfig } from "../scripts/api-runtime.mjs";
import { createPostgresRuntime } from "../scripts/postgres-runtime.mjs";

const renderPacketsRoute = apiRouteContracts.find((route) => route.id === "render-packets")!;
const calendarConnectionStartRoute = apiRouteContracts.find((route) => route.id === "calendar-connection-start")!;
const persistedMutationRouteIds = [
  "admin-card-gallery-save",
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
      "Memory API runtime requires Clerk JWT verification config or CUSTOMCARD_ENABLE_LOCAL_AUTH_FALLBACKS=enabled with CUSTOMCARD_CUSTOMER_SESSION_TOKEN plus CUSTOMCARD_ADMIN_SESSION_TOKEN."
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
        CUSTOMCARD_ENABLE_LOCAL_AUTH_FALLBACKS: "enabled",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token"
      },
      routes: apiRouteContracts
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
        CUSTOMCARD_ENABLE_LOCAL_AUTH_FALLBACKS: "enabled",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "test-customer-session-token",
        CUSTOMCARD_ADMIN_SESSION_TOKEN: "test-admin-session-token"
      },
      routes: apiRouteContracts
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
