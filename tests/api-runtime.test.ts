import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";
import { createApiRuntime, postgresPoolConfig } from "../scripts/api-runtime.mjs";
import { createPostgresRuntime } from "../scripts/postgres-runtime.mjs";

const renderPacketsRoute = apiRouteContracts.find((route) => route.id === "render-packets")!;
const calendarConnectionStartRoute = apiRouteContracts.find((route) => route.id === "calendar-connection-start")!;

describe("api runtime safety", () => {
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

  it("bounds Postgres pool settings for serverless-safe defaults", () => {
    expect(postgresPoolConfig({ DATABASE_URL: "postgres://example/customcard" })).toMatchObject({
      connectionString: "postgres://example/customcard",
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10_000,
      allowExitOnIdle: true
    });

    expect(
      postgresPoolConfig({
        DATABASE_URL: "postgres://example/customcard",
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
        DATABASE_URL: "postgres://example/customcard",
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
