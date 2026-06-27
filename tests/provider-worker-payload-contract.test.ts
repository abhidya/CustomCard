import { describe, expect, it } from "vitest";
import {
  buildProviderWorkerResult,
  compactProviderWorkerResultPayload,
  hasLiveProviderNetworkCall,
  normalizeProviderCompletionResult,
  sanitizeProviderJobPayload
} from "../scripts/provider-worker-payload-contract.mjs";

describe("provider worker payload contract", () => {
  it("uses one envelope for worker results and completion normalization", () => {
    const payload = {
      provider_call_events: [
        { live_network_call: true, status: "blocked" },
        { live_network_call: true, status: "succeeded" }
      ]
    };

    expect(hasLiveProviderNetworkCall(payload)).toBe(true);
    expect(buildProviderWorkerResult({ routeId: "ai-card-generate", payload })).toMatchObject({
      status: "ai-result-ready",
      routeId: "ai-card-generate",
      httpStatusCode: 200,
      providerCallMode: "live-provider",
      liveNetworkCalls: true
    });
    expect(
      normalizeProviderCompletionResult({
        route_id: "ai-card-generate",
        http_status_code: 201,
        provider_call_mode: "local-comfyui",
        live_network_calls: false,
        payload
      })
    ).toMatchObject({
      routeId: "ai-card-generate",
      httpStatusCode: 201,
      providerCallMode: "local-comfyui",
      liveNetworkCalls: false
    });
  });

  it("sanitizes leased sessions and strips inline image bytes from stored job payloads", () => {
    expect(
      sanitizeProviderJobPayload({
        requestContext: { authContext: { userId: "user-demo", sessionId: "real-session" } },
        security: { callerControlled: true }
      })
    ).toMatchObject({
      requestContext: { authContext: { userId: "user-demo", sessionId: "provider-lease" } },
      security: {
        callerControlled: true,
        providerLeaseScoped: true,
        credentialsPersisted: false,
        rawProviderContentStored: false
      }
    });

    expect(
      compactProviderWorkerResultPayload({
        images: [{ panel_id: "front", image_url: "data:image/png;base64,AAA" }]
      })
    ).toMatchObject({
      images: [
        {
          panel_id: "front",
          image_url: "",
          image_inline_bytes_persisted: false,
          image_omitted_reason: "inline-image-result-not-stored-in-job-result"
        }
      ],
      generated_image_persistence: {
        status: "blocked",
        omittedInlineImages: 1,
        inlineImageBytesPersisted: false
      }
    });
  });
});
