import { describe, expect, it } from "vitest";
import { createWalgreensCheckoutDummyFetch, createWalgreensHostedCheckoutService } from "./walgreensHostedCheckout.mjs";

describe("Walgreens hosted checkout", () => {
  it("explains PhotoPrints vendor-match credential errors", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ err: "659", errDesc: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })) as typeof fetch;
    const service = createWalgreensHostedCheckoutService({
      env: {
        WALGREENS_VENDOR_MODE: "sandbox",
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "http://127.0.0.1:5173"
      },
      fetchImpl
    });
    const jpegBase64 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(1024)]).toString("base64");

    await expect(service.uploadCardImage(jpegBase64)).resolves.toMatchObject({
      ok: false,
      status: "walgreens-provider-credential-blocked",
      statusCode: 503,
      upstreamCode: "659",
      retryable: false,
      error: "Walgreens PhotoPrints checkout is waiting on Walgreens enablement. Save the print package and upload it manually for now."
    });
  });

  it("sends the PhotoPrints AffiliateID to the upload credential request", async () => {
    const fetchImpl = createWalgreensCheckoutDummyFetch();
    const service = createWalgreensHostedCheckoutService({
      env: {
        WALGREENS_VENDOR_MODE: "sandbox",
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "http://127.0.0.1:5173"
      },
      fetchImpl
    });
    const jpegBase64 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(1024)]).toString("base64");

    await expect(service.uploadCardImage(jpegBase64)).resolves.toMatchObject({ ok: true });

    expect(JSON.parse(String(fetchImpl.calls[0].init.body))).toMatchObject({
      apiKey: "test-api-key",
      affId: "photoapi",
      platform: "android",
      transaction: "photocheckoutv2"
    });
  });
});
