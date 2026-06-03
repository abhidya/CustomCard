import { describe, expect, it } from "vitest";
import {
  apiRouteContracts,
  buildApiBootstrapPayload,
  buildApiReadinessSummary,
  resolveApiContractResponse,
  validateApiContracts,
  type ApiRouteContract
} from "./apiContracts";

describe("api contracts", () => {
  it("defines customer, admin, mobile, render, and handoff API routes with safe defaults", () => {
    expect(validateApiContracts()).toEqual([]);
    expect(apiRouteContracts.map((route) => route.id)).toEqual(
      expect.arrayContaining([
        "health",
        "route-catalog",
        "customer-bootstrap",
        "mobile-bootstrap",
        "admin-readiness",
        "admin-provider-catalog",
        "admin-persistence-readiness",
        "admin-demo-reset",
        "import-preview",
        "card-projects",
        "render-packets",
        "manual-vendor-handoff",
        "data-requests"
      ])
    );
    expect(apiRouteContracts.every((route) => route.externalNetworkCalls === false)).toBe(true);
    expect(apiRouteContracts.every((route) => route.realOrdersEnabled === false)).toBe(true);
  });

  it("keeps mutations idempotent and admin routes session-gated", () => {
    const mutations = apiRouteContracts.filter((route) => route.method === "POST");
    const adminRoutes = apiRouteContracts.filter((route) => route.audience === "admin");
    const adminDemoReset = apiRouteContracts.find((route) => route.id === "admin-demo-reset");
    const renderPackets = apiRouteContracts.find((route) => route.id === "render-packets");
    const manualHandoff = apiRouteContracts.find((route) => route.id === "manual-vendor-handoff");

    expect(mutations.length).toBeGreaterThanOrEqual(6);
    expect(mutations.every((route) => route.idempotencyKeyRequired)).toBe(true);
    expect(mutations.every((route) => route.requestSchema.includes("X-Idempotency-Key"))).toBe(true);
    expect(adminRoutes.every((route) => route.auth === "admin-session")).toBe(true);
    expect(adminDemoReset).toMatchObject({
      method: "POST",
      auth: "admin-session",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    });
    expect(adminDemoReset?.responseSchema).toEqual(expect.arrayContaining(["seedSummary", "signedArtifactUrls"]));
    expect(renderPackets?.responseSchema).toEqual(expect.arrayContaining(["artifactManifest", "signedArtifactUrls"]));
    expect(renderPackets?.backedBy).toContain("buildArtifactHandoffContract");
    expect(manualHandoff?.responseSchema).toContain("signedArtifactUrls");
  });

  it("summarizes API readiness from provider, runtime, and mobile contracts", () => {
    const summary = buildApiReadinessSummary();

    expect(summary.status).toBe("ready");
    expect(summary.routes.total).toBe(apiRouteContracts.length);
    expect(summary.routes.idempotentMutations).toBe(summary.routes.mutations);
    expect(summary.providers.total).toBeGreaterThanOrEqual(87);
    expect(summary.providers.credentialGated).toBeGreaterThanOrEqual(56);
    expect(summary.runtime.localReady).toBeGreaterThanOrEqual(16);
    expect(summary.runtime.blocked).toBeGreaterThan(0);
    expect(summary.mobile.customerVisibleSections).toBeGreaterThanOrEqual(5);
  });

  it("builds bootstrap payloads for customer, admin, and mobile clients", () => {
    const payload = buildApiBootstrapPayload();

    expect(payload.customer.primaryActions.map((action) => action.capability)).toEqual(
      expect.arrayContaining(["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"])
    );
    expect(payload.admin.coverage.total).toBeGreaterThanOrEqual(87);
    expect(payload.mobile.safetyBanner.label).toBe("Real orders disabled");
    expect(payload.chatTranscript.map((message) => message.text).join(" ")).toContain("Live AI and vendor orders stay off");
  });

  it("resolves safe GET response contracts for the API server wrapper", () => {
    expect(resolveApiContractResponse("/api/health")).toMatchObject({
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false
    });
    expect(resolveApiContractResponse("/api/admin/readiness")).toMatchObject({
      service: "customcard-api",
      status: "ready"
    });
    expect(resolveApiContractResponse("/api/routes")).toEqual(apiRouteContracts);
    expect(resolveApiContractResponse("/api/not-found")).toBeUndefined();
  });

  it("flags unsafe route contracts before implementation", () => {
    const unsafeRoutes: ApiRouteContract[] = [
      {
        ...apiRouteContracts[0],
        id: "unsafe-admin",
        path: "/api/admin/unsafe",
        audience: "admin",
        auth: "none"
      },
      {
        ...apiRouteContracts.find((route) => route.id === "card-projects")!,
        id: "unsafe-mutation",
        path: "/api/card-projects/unsafe",
        idempotencyKeyRequired: false,
        requestSchema: ["opportunityId"],
        piiPolicy: "raw content stored"
      }
    ];

    expect(validateApiContracts(unsafeRoutes)).toEqual(
      expect.arrayContaining([
        "Admin route unsafe-admin must require admin-session auth.",
        "Mutation route unsafe-mutation must require an idempotency key.",
        "Mutation route unsafe-mutation must name X-Idempotency-Key in the request schema.",
        "Route unsafe-mutation must not allow raw content policy language.",
        "Missing API route contract: health"
      ])
    );
  });
});
