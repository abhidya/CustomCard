import { describe, expect, it } from "vitest";
import {
  authorizeProviderToken,
  createProviderJobRuntime,
  normalizeProviderCompletionResult,
  sanitizeProviderJobPayload
} from "../scripts/provider-job-runtime.mjs";

const providerEnv = {
  AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
  CUSTOMCARD_PROVIDER_WORKER_TOKEN: "test-provider-worker-token-32-chars",
  CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS: "ai-card-generate manual-vendor-handoff"
};

describe("provider job runtime", () => {
  it("authorizes provider tokens into explicit route scope", () => {
    const route = { id: "provider-job-lease", auth: "provider-token" };

    expect(authorizeProviderToken({ env: providerEnv, route, request: { headers: {} } })).toMatchObject({
      ok: false,
      statusCode: 401,
      payload: { status: "auth-required" }
    });
    expect(
      authorizeProviderToken({
        env: providerEnv,
        route,
        request: { headers: { authorization: `Bearer ${providerEnv.CUSTOMCARD_PROVIDER_WORKER_TOKEN}` } }
      })
    ).toMatchObject({
      ok: true,
      role: "provider",
      providerRouteIds: ["ai-card-generate", "manual-vendor-handoff"]
    });
  });

  it("sanitizes leased payloads so workers cannot inherit customer sessions", () => {
    const payload = sanitizeProviderJobPayload({
      requestContext: {
        authContext: {
          userId: "user-demo",
          role: "customer",
          sessionId: "real-customer-session"
        }
      },
      security: {
        callerControlled: true
      }
    });

    expect(payload).toMatchObject({
      requestContext: {
        authContext: {
          userId: "user-demo",
          role: "customer",
          sessionId: "provider-lease"
        }
      },
      security: {
        callerControlled: true,
        providerLeaseScoped: true,
        credentialsPersisted: false,
        rawProviderContentStored: false
      }
    });
  });

  it("normalizes provider completion results across wire casing", () => {
    expect(
      normalizeProviderCompletionResult({
        route_id: "ai-card-generate",
        http_status_code: 201,
        provider_call_mode: "local-comfyui",
        live_network_calls: false,
        payload: {
          provider_call_events: [{ live_network_call: true, status: "ok" }]
        }
      })
    ).toMatchObject({
      routeId: "ai-card-generate",
      httpStatusCode: 201,
      providerCallMode: "local-comfyui",
      liveNetworkCalls: false
    });
  });

  it("leases queued provider jobs behind route policy and hides upload credentials", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const runtime = createProviderJobRuntime({
      env: providerEnv,
      getPool: async () =>
        createProviderPool(queries, [
          {
            id: "job-provider-1",
            user_id: "user-demo",
            route_id: "ai-card-generate",
            idempotency_key_id: "idem-provider-1",
            payload: {
              requestContext: {
                authContext: { userId: "user-demo", role: "customer", sessionId: "real-session" }
              }
            },
            attempt_count: 1,
            max_attempts: 3,
            locked_at: "2030-01-01T00:00:00.000Z"
          }
        ])
    });

    const lease = await runtime.leaseJobs({
      authContext: { ok: true, role: "provider", userId: "provider-worker", providerRouteIds: ["ai-card-generate"] },
      workerId: "local-comfy-01",
      routeIds: ["ai-card-generate", "render-packets"],
      limit: 1
    });

    expect(lease).toMatchObject({
      statusCode: 200,
      payload: {
        leased: 1,
        route_scope: ["ai-card-generate"],
        artifact_upload: { r2CredentialsExposed: false }
      }
    });
    expect(lease.payload.jobs[0]).toMatchObject({
      job_id: "job-provider-1",
      route_id: "ai-card-generate",
      payload: {
        requestContext: {
          authContext: { sessionId: "provider-lease" }
        }
      },
      artifact_upload: { r2CredentialsExposed: false }
    });
    expect(lease.payload.jobs[0].lease_token).toMatch(/^[a-f0-9]{64}$/);
    expect(queries.some((query) => query.sql.includes("FOR UPDATE SKIP LOCKED"))).toBe(true);
    expect(queries.some((query) => Array.isArray(query.params[1]) && query.params[1].includes("ai-card-generate"))).toBe(true);
    expect(queries.some((query) => Array.isArray(query.params[1]) && query.params[1].includes("render-packets"))).toBe(false);
  });
});

function createProviderPool(queries: Array<{ sql: string; params: unknown[] }>, leasedRows: unknown[] = []) {
  return {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql: compactSql(sql), params });
      if (sql.includes("locked_at < NOW()")) return { rows: [], rowCount: 0 };
      if (sql.includes("FOR UPDATE SKIP LOCKED")) return { rows: leasedRows, rowCount: leasedRows.length };
      return { rows: [], rowCount: 0 };
    }
  };
}

function compactSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim();
}
