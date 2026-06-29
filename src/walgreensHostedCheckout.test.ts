import { describe, expect, it } from "vitest";
import {
  buildWalgreensCallbackHtml,
  createWalgreensCheckoutDummyFetch,
  createWalgreensHostedCheckoutService
} from "./walgreensHostedCheckout.mjs";

const createCheckoutService = createWalgreensHostedCheckoutService as (
  options: Parameters<typeof createWalgreensHostedCheckoutService>[0] & { safetyControls?: unknown }
) => ReturnType<typeof createWalgreensHostedCheckoutService>;

describe("Walgreens hosted checkout", () => {
  it("does not emit wildcard postMessage targets in callback HTML", () => {
    const html = buildWalgreensCallbackHtml("*");
    expect(html).not.toContain("postMessage(payload, \"*\")");
    expect(html).not.toContain("window.opener.postMessage");
  });

  it("posts Walgreens callback status only to a configured app origin", () => {
    const html = buildWalgreensCallbackHtml("http://127.0.0.1:5173/");
    expect(html).toContain('window.opener.postMessage(payload, "http://127.0.0.1:5173")');
  });

  it("keeps callback script failures visible without blocking window close", () => {
    const html = buildWalgreensCallbackHtml("http://127.0.0.1:5173/");
    expect(html).toContain('console.error("CustomCard Walgreens checkout callback failed", error);');
    expect(html).toContain("setTimeout(function () { window.close(); }, 1200);");
  });

  it("explains PhotoPrints vendor-match credential errors", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ err: "659", errDesc: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })) as typeof fetch;
    const service = createCheckoutService({
      env: {
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "http://127.0.0.1:5173"
      },
      fetchImpl,
      safetyControls: { vendorModes: { walgreens: "sandbox" as const } }
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

  it("preflights Walgreens hosted checkout readiness before image uploads", async () => {
    const fetchImpl = createWalgreensCheckoutDummyFetch();
    const service = createCheckoutService({
      env: {
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "https://customcard.example"
      },
      fetchImpl,
      now: () => Date.parse("2026-06-12T12:00:00.000Z"),
      safetyControls: productionSafetyControls()
    });

    await expect(service.checkReadiness()).resolves.toMatchObject({
      ok: true,
      statusCode: 200,
      status: "walgreens-checkout-ready",
      enabled: true,
      mode: "production",
      uploadLimit: 200,
      expiresAtIso: "2026-06-14T00:00:00.000Z"
    });
    expect(JSON.parse(String(fetchImpl.calls[0].init.body))).toMatchObject({
      apiKey: "test-api-key",
      affId: "photoapi",
      platform: "ios",
      transaction: "photocheckoutv2"
    });
  });

  it("preflights provider enablement errors without uploading images", async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ err: "112", errDesc: "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })) as typeof fetch;
    const service = createCheckoutService({
      env: {
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "https://customcard.example"
      },
      fetchImpl,
      safetyControls: productionSafetyControls()
    });

    await expect(service.checkReadiness()).resolves.toMatchObject({
      ok: false,
      status: "walgreens-provider-credential-blocked",
      statusCode: 503,
      upstreamCode: "112",
      enabled: true,
      mode: "production",
      retryable: false,
      error: "Walgreens PhotoPrints checkout is waiting on Walgreens enablement. Save the print package and upload it manually for now."
    });
  });

  it("sends the PhotoPrints AffiliateID to the upload credential request", async () => {
    const fetchImpl = createWalgreensCheckoutDummyFetch();
    const service = createCheckoutService({
      env: {
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "http://127.0.0.1:5173"
      },
      fetchImpl,
      safetyControls: { vendorModes: { walgreens: "sandbox" as const } }
    });
    const jpegBase64 = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(1024)]).toString("base64");

    await expect(service.uploadCardImage(jpegBase64)).resolves.toMatchObject({ ok: true });

    expect(JSON.parse(String(fetchImpl.calls[0].init.body))).toMatchObject({
      apiKey: "test-api-key",
      affId: "photoapi",
      platform: "ios",
      transaction: "photocheckoutv2"
    });
  });

  it("stays closed until admin safety controls select a mode", async () => {
    const fetchImpl = createWalgreensCheckoutDummyFetch();
    const service = createWalgreensHostedCheckoutService({
      env: {
        WALGREENS_API_KEY: "test-api-key",
        WALGREENS_AFF_ID: "photoapi",
        PUBLIC_APP_ORIGIN: "http://127.0.0.1:5173"
      },
      fetchImpl
    });

    await expect(service.checkReadiness()).resolves.toMatchObject({
      ok: false,
      statusCode: 503,
      mode: "disabled_until_certified",
      blockers: ["Admin safety controls set Walgreens checkout to disabled_until_certified."]
    });
    expect(fetchImpl.calls).toEqual([]);
  });
});

function productionSafetyControls() {
  return {
    realOrdersEnabled: true,
    vendorModes: { walgreens: "production" as const },
    vendorCertification: { walgreens: true },
    productionMutationAcknowledged: true,
    liveWriteAcknowledged: true
  };
}
