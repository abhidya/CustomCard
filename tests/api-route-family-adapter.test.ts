import { describe, expect, it } from "vitest";
import {
  createApiRouteFamilyAdapter,
  walgreensUploadBodyLimit
} from "../scripts/api-route-family-adapter.mjs";
import { WALGREENS_CHECKOUT_MAX_IMAGE_BYTES } from "../src/walgreensHostedCheckout.mjs";

describe("api route-family adapter", () => {
  it("assembles route-family handlers behind one seam", async () => {
    const responses: Array<{ statusCode: number; payload: unknown }> = [];
    const adapter = createApiRouteFamilyAdapter({
      aiGenerationService: {},
      apiRuntime: {
        describe: () => ({ mode: "test" }),
        validate: () => []
      },
      buildMutationContractPayload: () => ({ service: "customcard-api", status: "accepted-contract-only" }),
      calendarConnectionLifecycle: async () => false,
      calendarConnectionStartPackets: () => [],
      clientRateLimitKey: () => "client-1",
      decodeArtifactObjectKey: (path: string) => path,
      readRequestBody: async () => "{}",
      readiness: {
        localization: {},
        persistence: {},
        providerGovernance: {},
        providers: {},
        safety: {}
      },
      routes: [],
      sendArtifact: () => undefined,
      sendHtml: () => undefined,
      sendJson: (_response: unknown, statusCode: number, payload: unknown) => {
        responses.push({ statusCode, payload });
      },
      walgreensCheckout: {
        checkReadiness: async () => ({ statusCode: 200, status: "ready" }),
        config: { appOrigin: "https://customcard.test" },
        createCheckoutSession: async () => ({ statusCode: 200, status: "ready" }),
        uploadCardImage: async () => ({ statusCode: 200, status: "ready" })
      },
      walgreensRateLimited: () => false
    });

    await adapter.handlePostAuthRoute({
      authContext: { role: "customer", userId: "user-1", sessionId: "session-1" },
      path: "/api/health",
      request: { method: "GET", headers: {} },
      requestUrl: new URL("https://customcard.test/api/health"),
      response: {},
      route: { id: "health", method: "GET" }
    });

    expect(responses).toEqual([
      {
        statusCode: 200,
        payload: {
          service: "customcard-api",
          status: "ready",
          realOrdersEnabled: false,
          runtime: { mode: "test" },
          blockers: []
        }
      }
    ]);
  });

  it("derives Walgreens upload body limit from hosted checkout image contract", () => {
    expect(walgreensUploadBodyLimit).toBe(Math.ceil((WALGREENS_CHECKOUT_MAX_IMAGE_BYTES * 4) / 3) + 2_000_000);
  });
});
