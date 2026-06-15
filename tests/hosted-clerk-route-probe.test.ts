import { describe, expect, it, vi } from "vitest";
import {
  resolveHostedTarget,
  runHostedClerkRouteProbe
} from "../scripts/hosted-clerk-route-probe.mjs";

const customerJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2N1c3RvbWVyIn0.signature";
const adminJwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyX2FkbWluIiwicm9sZSI6ImFkbWluIn0.signature";

describe("hosted Clerk route probe", () => {
  it("fails closed until live hosted auth probe inputs are explicitly supplied", async () => {
    const fetchImpl = vi.fn();

    const report = await runHostedClerkRouteProbe({
      env: {
        CUSTOMCARD_HOSTED_API_ENV: "qa",
        CUSTOMCARD_QA_API_BASE_URL: "https://api.qa.customcard.test"
      },
      fetchImpl
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-clerk-route-probe",
      status: "blocked",
      scope: "live-hosted-auth",
      targetEnvironment: "qa",
      mutationsEnabled: false,
      checks: []
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "CUSTOMCARD_HOSTED_AUTH_PROBE=enabled is required before live hosted Clerk route probes run.",
        "Hosted API base URL must not be a placeholder URL.",
        "CUSTOMCARD_HOSTED_CUSTOMER_JWT is required.",
        "CUSTOMCARD_HOSTED_ADMIN_JWT is required."
      ])
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("selects QA or production hosted base URLs without accepting local or placeholder URLs", () => {
    expect(
      resolveHostedTarget({
        CUSTOMCARD_HOSTED_API_ENV: "qa",
        CUSTOMCARD_QA_API_BASE_URL: "https://qa.customcard.app"
      })
    ).toMatchObject({ targetEnvironment: "qa", baseUrl: "https://qa.customcard.app", blockers: [] });

    expect(
      resolveHostedTarget({
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_PRODUCTION_API_BASE_URL: "https://customcard.app"
      })
    ).toMatchObject({ targetEnvironment: "production", baseUrl: "https://customcard.app", blockers: [] });

    expect(
      resolveHostedTarget({
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "http://127.0.0.1:8787"
      }).blockers
    ).toEqual(expect.arrayContaining(["Hosted API base URL must use https.", "Hosted API base URL must not point at localhost."]));
  });

  it("verifies hosted public, customer, admin, missing-auth, and wrong-role route contracts without leaking JWTs", async () => {
    const seenRequests: Array<{ path: string; authorization: string }> = [];
    const fetchImpl = vi.fn(async (input: URL, init?: RequestInit) => {
      const requestUrl = new URL(String(input));
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const authorization = headers.Authorization ?? "";
      seenRequests.push({ path: requestUrl.pathname, authorization });

      if (requestUrl.pathname === "/api/health") {
        return jsonResponse(200, {
          service: "customcard-api",
          status: "ready",
          runtime: { mode: "postgres", authEnforced: true, postgresConfigured: true }
        });
      }
      if (requestUrl.pathname === "/api/admin/readiness" && !authorization) {
        return jsonResponse(401, { service: "customcard-api", status: "auth-required", route: "admin-readiness", requiredAuth: "admin-session" });
      }
      if (requestUrl.pathname === "/api/admin/readiness" && authorization === `Bearer ${customerJwt}`) {
        return jsonResponse(403, { service: "customcard-api", status: "wrong-role", route: "admin-readiness", requiredAuth: "admin-session" });
      }
      if (requestUrl.pathname === "/api/admin/readiness" && authorization === `Bearer ${adminJwt}`) {
        return jsonResponse(200, {
          service: "customcard-api",
          status: "ready",
          runtime: { mode: "postgres", authEnforced: true, postgresConfigured: true }
        });
      }
      if (requestUrl.pathname === "/api/customer/bootstrap" && authorization === `Bearer ${customerJwt}`) {
        return jsonResponse(200, {
          service: "customcard-api",
          status: "ready",
          runtime: { mode: "postgres", authEnforced: true, postgresConfigured: true },
          syncState: { authMode: "customer-session", idempotencyRequired: true }
        });
      }
      return jsonResponse(500, { service: "customcard-api", status: "unexpected-test-request" });
    });

    const report = await runHostedClerkRouteProbe({
      env: {
        CUSTOMCARD_HOSTED_AUTH_PROBE: "enabled",
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app",
        CUSTOMCARD_HOSTED_CUSTOMER_JWT: customerJwt,
        CUSTOMCARD_HOSTED_ADMIN_JWT: adminJwt
      },
      fetchImpl,
      now: new Date("2026-06-15T12:00:00.000Z")
    });

    expect(report).toMatchObject({
      status: "ready",
      targetEnvironment: "production",
      baseUrl: "https://customcard-three.vercel.app",
      checkedAt: "2026-06-15T12:00:00.000Z",
      mutationsEnabled: false,
      passed: 5,
      failed: 0,
      authVerification: {
        publicHealthPostgres: true,
        missingAuthBlocked: true,
        wrongRoleBlocked: true,
        adminRoute: true,
        customerRoute: true,
        hostedTokenVerificationAttached: true
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(seenRequests.map((request) => request.path)).toEqual([
      "/api/health",
      "/api/admin/readiness",
      "/api/admin/readiness",
      "/api/admin/readiness",
      "/api/customer/bootstrap"
    ]);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(customerJwt);
    expect(serialized).not.toContain(adminJwt);
    expect(serialized).not.toContain("Bearer ");
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
