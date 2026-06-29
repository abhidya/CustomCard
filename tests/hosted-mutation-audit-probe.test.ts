import { describe, expect, it, vi } from "vitest";
import { runHostedMutationAuditProbe } from "../scripts/hosted-mutation-audit-probe.mjs";

const customerJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2N1c3RvbWVyIn0.signature";
const adminJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2FkbWluIiwicm9sZSI6ImFkbWluIn0.signature";

describe("hosted mutation audit probe", () => {
  it("fails closed unless live-write probing is explicitly enabled and acknowledged", async () => {
    const fetchImpl = vi.fn();

    const report = await runHostedMutationAuditProbe({
      env: {
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app",
        CUSTOMCARD_HOSTED_CUSTOMER_JWT: customerJwt,
        CUSTOMCARD_HOSTED_ADMIN_JWT: adminJwt
      },
      fetchImpl
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-mutation-audit-probe",
      status: "blocked",
      scope: "live-hosted-mutation",
      liveWritesEnabled: false,
      destructiveLiveMutations: false,
      realOrdersEnabled: false,
      checks: []
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "--confirm-hosted-mutation-probe is required before hosted mutation probes run.",
        "--acknowledge-live-writes is required because this probe writes a harmless render-packet row."
      ])
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("verifies hosted idempotency, mutation persistence, audit deltas, and replay/conflict behavior without leaking JWTs", async () => {
    const seenRequests: Array<{ path: string; method: string; authorization: string; idempotencyKey: string }> = [];
    const fetchImpl = vi.fn(async (input: URL, init?: RequestInit) => {
      const requestUrl = new URL(String(input));
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const authorization = headers.Authorization ?? "";
      const idempotencyKey = headers["X-Idempotency-Key"] ?? "";
      seenRequests.push({
        path: requestUrl.pathname,
        method: init?.method ?? "GET",
        authorization,
        idempotencyKey
      });

      if (requestUrl.pathname === "/api/admin/readiness" && seenRequests.filter((request) => request.path === "/api/admin/readiness").length === 1) {
        return jsonResponse(200, { service: "customcard-api", status: "ready", runtime: runtimeCounts(10) });
      }
      if (requestUrl.pathname === "/api/render-packets" && init?.method === "POST" && !idempotencyKey) {
        return jsonResponse(400, { service: "customcard-api", status: "idempotency-key-required", route: "render-packets" });
      }
      if (requestUrl.pathname === "/api/render-packets" && init?.method === "POST" && idempotencyKey) {
        const body = JSON.parse(String(init.body ?? "{}"));
        if (String(body.projectId).endsWith("-changed")) {
          return jsonResponse(409, { service: "customcard-api", status: "idempotency-conflict", route: "render-packets" });
        }
        const replay = seenRequests.filter((request) => request.path === "/api/render-packets" && request.idempotencyKey).length > 1;
        return jsonResponse(202, {
          service: "customcard-api",
          status: "accepted-contract-only",
          runtimeMode: "postgres",
          idempotencyPersisted: true,
          idempotencyReplayed: replay,
          repositoryPersisted: true,
          realOrdersEnabled: false,
          externalNetworkCalls: false,
          renderPacketId: body.renderPacketId
        });
      }
      if (requestUrl.pathname === "/api/admin/readiness") {
        return jsonResponse(200, { service: "customcard-api", status: "ready", runtime: runtimeCounts(11) });
      }
      return jsonResponse(500, { service: "customcard-api", status: "unexpected-test-request" });
    });

    const report = await runHostedMutationAuditProbe({
      env: {
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app",
        CUSTOMCARD_HOSTED_CUSTOMER_JWT: customerJwt,
        CUSTOMCARD_HOSTED_ADMIN_JWT: adminJwt
      },
      fetchImpl,
      now: new Date("2026-06-15T13:45:00.000Z"),
      enabled: true,
      acknowledgeLiveWrites: true,
      probeId: "smoke-2026-06-15"
    });

    expect(report).toMatchObject({
      status: "ready",
      targetEnvironment: "production",
      probeId: "smoke-2026-06-15",
      liveWritesEnabled: true,
      destructiveLiveMutations: false,
      realOrdersEnabled: false,
      externalVendorCalls: false,
      passed: 7,
      failed: 0,
      persistenceDeltas: {
        idempotencyRecords: 1,
        auditRecords: 1,
        queuedJobs: 1,
        renderPacketRecords: 1,
        providerCallEventRecords: 1
      },
      mutationProof: {
        missingIdempotencyBlocked: true,
        mutationPersisted: true,
        idempotencyReplayConfirmed: true,
        idempotencyConflictBlocked: true,
        auditRowsIncreased: true,
        renderPacketRowsIncreased: true,
        queueRowsIncreased: true,
        providerCallRowsIncreased: true,
        authenticatedHostedMutationAttached: true
      }
    });
    expect(seenRequests.map((request) => `${request.method} ${request.path}`)).toEqual([
      "GET /api/admin/readiness",
      "POST /api/render-packets",
      "POST /api/render-packets",
      "POST /api/render-packets",
      "POST /api/render-packets",
      "GET /api/admin/readiness"
    ]);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(customerJwt);
    expect(serialized).not.toContain(adminJwt);
    expect(serialized).not.toContain("Bearer ");
  });
});

function runtimeCounts(base: number) {
  return {
    mode: "postgres",
    authEnforced: true,
    idempotencyEnforced: true,
    postgresConfigured: true,
    idempotencyRecords: base,
    auditRecords: base,
    queuedJobs: base,
    renderPacketRecords: base,
    providerCallEventRecords: base
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
