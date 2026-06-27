import { describe, expect, it } from "vitest";
import {
  createApiRouteFamilyAdapter,
  walgreensUploadBodyLimit
} from "../scripts/api-route-family-adapter.mjs";
import { WALGREENS_CHECKOUT_MAX_IMAGE_BYTES } from "../src/walgreensHostedCheckout.mjs";

describe("api route-family adapter", () => {
  function createHarness({
    aiGenerationService = {},
    bodyText = "{}"
  }: {
    aiGenerationService?: Record<string, unknown>;
    bodyText?: string;
  } = {}) {
    const responses: Array<{ statusCode: number; payload: Record<string, unknown> }> = [];
    const providerEventWrites: unknown[] = [];
    const adapter = createApiRouteFamilyAdapter({
      aiGenerationService,
      apiRuntime: {
        describe: () => ({ mode: "test" }),
        readProviderJobStatus: async () => ({ statusCode: 200, payload: {} }),
        recordProviderCallEvents: async ({ events }: { events: unknown[] }) => {
          providerEventWrites.push(...events);
          return { persisted: true, count: events.length, runtimeMode: "test" };
        },
        validate: () => []
      },
      buildMutationContractPayload: () => ({ service: "customcard-api", status: "accepted-contract-only" }),
      calendarConnectionLifecycle: async () => false,
      calendarConnectionStartPackets: () => [],
      clientRateLimitKey: () => "client-1",
      decodeArtifactObjectKey: (path: string) => path,
      readRequestBody: async () => bodyText,
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
      sendJson: (_response: unknown, statusCode: number, payload: Record<string, unknown>) => {
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
    return { adapter, providerEventWrites, responses };
  }

  async function postAdminGalleryRegenerate(
    adapter: ReturnType<typeof createApiRouteFamilyAdapter>,
    headers: Record<string, string> = {}
  ) {
    await adapter.handlePostAuthRoute({
      authContext: { role: "admin", userId: "admin-1", sessionId: "session-1" },
      path: "/api/admin/card-gallery/regenerate",
      request: { method: "POST", headers },
      requestUrl: new URL("https://customcard.test/api/admin/card-gallery/regenerate"),
      response: {},
      route: { id: "admin-card-gallery-regenerate", method: "POST" }
    });
  }

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

  it("fails closed before provider calls when admin gallery regeneration input is invalid", async () => {
    let providerCalls = 0;
    const { adapter, responses } = createHarness({
      aiGenerationService: {
        generateCard: async () => {
          providerCalls += 1;
          return { statusCode: 200, payload: {} };
        }
      },
      bodyText: JSON.stringify({ action: "card-text", category: "", cardCopy: {} })
    });

    await postAdminGalleryRegenerate(adapter, { "X-Idempotency-Key": "admin-gallery-regenerate-invalid" });

    expect(providerCalls).toBe(0);
    expect(responses).toEqual([
      {
        statusCode: 400,
        payload: expect.objectContaining({
          status: "invalid-admin-card-gallery-regenerate-payload",
          route: "admin-card-gallery-regenerate",
          missingFields: expect.arrayContaining(["category"])
        })
      }
    ]);
  });

  it("returns provider-unavailable instead of fake regenerated gallery copy", async () => {
    const { adapter, responses } = createHarness({
      aiGenerationService: {
        generateCard: async () => ({
          statusCode: 503,
          payload: {
            status: "provider-unavailable",
            error: "No live AI provider is configured.",
            user_content_only: true
          }
        })
      },
      bodyText: JSON.stringify({
        action: "gallery-copy",
        category: "birthday",
        title: "",
        publicCaption: "",
        cardCopy: { headline: "Old headline", body: "Old public body.", artDirection: "" }
      })
    });

    await postAdminGalleryRegenerate(adapter, { "X-Idempotency-Key": "admin-gallery-regenerate-unavailable" });

    expect(responses).toEqual([
      {
        statusCode: 503,
        payload: expect.objectContaining({
          status: "admin-card-gallery-regenerate-blocked",
          action: "gallery-copy",
          error: "No live AI provider is configured.",
          rawContentStored: false
        })
      }
    ]);
  });

  it("regenerates admin gallery copy through the server AI service with browser-style idempotency headers", async () => {
    const generateCalls: Array<{ input: Record<string, unknown>; context: Record<string, unknown> }> = [];
    const { adapter, providerEventWrites, responses } = createHarness({
      aiGenerationService: {
        generateCard: async (input: Record<string, unknown>, context: Record<string, unknown>) => {
          generateCalls.push({ input, context });
          return {
            statusCode: 200,
            payload: {
              generated_by: "ai-text-only",
              card_copy: {
                theme_guide: { theme_title: "Fresh public birthday" },
                panels: [
                  {
                    id: "front",
                    headline: "Fresh birthday headline",
                    body: "A public-safe birthday note for the gallery.",
                    artDirection: "Bright botanical frame"
                  }
                ]
              },
              ai_flow: { flowId: "card-copy" },
              ai_cost_gate: { allowed: true },
              provider_call_events: [{ id: "provider-event-1" }],
              fallback_queued: false,
              user_content_only: false
            }
          };
        }
      },
      bodyText: JSON.stringify({
        action: "card-text",
        category: "birthday",
        title: "",
        publicCaption: "",
        cardCopy: { headline: "Old headline", body: "Old public body.", artDirection: "" }
      })
    });

    await postAdminGalleryRegenerate(adapter, { "X-Idempotency-Key": "admin-gallery-regenerate-success" });

    expect(generateCalls).toHaveLength(1);
    expect(generateCalls[0].context).toMatchObject({
      idempotencyKey: "admin-gallery-regenerate-success",
      rateKey: "admin-1",
      aiFlowAdminConfig: [
        expect.objectContaining({
          flowId: "card-image",
          liveProviderCallsEnabled: false,
          queueEnabled: false,
          fallbackQueueEnabled: false
        })
      ]
    });
    expect(String(generateCalls[0].input.personal_note)).toContain("Regenerate front-card text");
    expect(providerEventWrites).toEqual([{ id: "provider-event-1" }]);
    expect(responses).toEqual([
      {
        statusCode: 200,
        payload: expect.objectContaining({
          status: "admin-card-gallery-regenerated",
          action: "card-text",
          generated_by: "ai-text-only",
          cardCopy: {
            headline: "Fresh birthday headline",
            body: "A public-safe birthday note for the gallery.",
            artDirection: "Bright botanical frame"
          },
          galleryCopy: {
            title: "Fresh public birthday",
            publicCaption: "A public-safe birthday note for the gallery."
          },
          rawContentStored: false
        })
      }
    ]);
  });

  it("derives Walgreens upload body limit from hosted checkout image contract", () => {
    expect(walgreensUploadBodyLimit).toBe(Math.ceil((WALGREENS_CHECKOUT_MAX_IMAGE_BYTES * 4) / 3) + 2_000_000);
  });
});
