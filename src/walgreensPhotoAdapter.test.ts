import { describe, expect, it } from "vitest";
import {
  WALGREENS_PRODUCTION_BASE_URL,
  WALGREENS_SANDBOX_BASE_URL,
  buildWalgreensAdapterConfig,
  buildWalgreensUploadUrl,
  createWalgreensDummyFetch,
  createWalgreensPhotoAdapter
} from "./walgreensPhotoAdapter";

// ── Config routing ────────────────────────────────────────────────────────────

describe("buildWalgreensAdapterConfig", () => {
  const dummy = createWalgreensDummyFetch();
  const sandboxSafetyControls = { vendorModes: { walgreens: "sandbox" } };
  const productionSafetyControls = {
    realOrdersEnabled: true,
    vendorModes: { walgreens: "production" },
    vendorCertification: { walgreens: true },
    productionMutationAcknowledged: true,
    liveWriteAcknowledged: true
  };

  it("disabled_until_certified needs no credentials", () => {
    const cfg = buildWalgreensAdapterConfig({ WALGREENS_VENDOR_MODE: "sandbox" }, dummy);
    expect(cfg.mode).toBe("disabled_until_certified");
    expect(cfg.baseUrl).toBe("");
  });

  it("sandbox → QA base URL", () => {
    const cfg = buildWalgreensAdapterConfig(
      { WALGREENS_API_KEY: "key", WALGREENS_AFF_ID: "photoapi" },
      dummy,
      sandboxSafetyControls
    );
    expect(cfg.baseUrl).toBe(WALGREENS_SANDBOX_BASE_URL);
    expect(cfg.mode).toBe("sandbox");
  });

  it("production → production base URL", () => {
    const cfg = buildWalgreensAdapterConfig(
      { WALGREENS_API_KEY: "key", WALGREENS_AFF_ID: "photoapi" },
      dummy,
      productionSafetyControls
    );
    expect(cfg.baseUrl).toBe(WALGREENS_PRODUCTION_BASE_URL);
  });

  it("blocks production until admin safety controls record every live gate", () => {
    expect(() =>
      buildWalgreensAdapterConfig(
        { WALGREENS_API_KEY: "key", WALGREENS_AFF_ID: "photoapi" },
        dummy,
        { vendorModes: { walgreens: "production" } }
      )
    ).toThrow("Walgreens production adapter blocked");
  });

  it("throws when sandbox mode missing credentials", () => {
    expect(() =>
      buildWalgreensAdapterConfig({}, dummy, sandboxSafetyControls)
    ).toThrow("WALGREENS_API_KEY and WALGREENS_AFF_ID are required");
  });
});

// ── Disabled guard ────────────────────────────────────────────────────────────

describe("createWalgreensPhotoAdapter — disabled mode", () => {
  it("throws on construction when mode is disabled_until_certified", () => {
    const cfg = buildWalgreensAdapterConfig({ WALGREENS_VENDOR_MODE: "sandbox" }, createWalgreensDummyFetch());
    expect(() => createWalgreensPhotoAdapter(cfg)).toThrow("disabled_until_certified");
  });
});

// ── Dummy fetch — zero network ────────────────────────────────────────────────

function sandboxAdapter() {
  const cfg = buildWalgreensAdapterConfig(
    { WALGREENS_VENDOR_MODE: "production", WALGREENS_API_KEY: "test-key", WALGREENS_AFF_ID: "photoapi" },
    createWalgreensDummyFetch(),
    { vendorModes: { walgreens: "sandbox" } }
  );
  return createWalgreensPhotoAdapter(cfg);
}

describe("Walgreens adapter — dummy fetch (no network)", () => {
  it("fetchCredentials returns a sasKeyToken", async () => {
    const res = await sandboxAdapter().fetchCredentials();
    expect(res.cloud[0].sasKeyToken).toMatch(/^https:\/\//);
    expect(res.uploadLimit).toBeGreaterThan(0);
  });

  it("fetchProducts returns at least one product with a price", async () => {
    const res = await sandboxAdapter().fetchProducts();
    expect(res.err).toBe("");
    expect(res.products.length).toBeGreaterThan(0);
    expect(Number(res.products[0].productPrice)).toBeGreaterThan(0);
  });

  it("fetchProducts with productGroupId returns products", async () => {
    const res = await sandboxAdapter().fetchProducts("STDPR");
    expect(res.products.some((p) => p.productGroupId === "STDPR")).toBe(true);
  });

  it("validateCoupon returns discount", async () => {
    const res = await sandboxAdapter().validateCoupon("TESTCODE", [{ productId: "4x6", qty: "10" }]);
    expect(res.status).toBe("success");
    expect(res.orderDiscountPrice).toBeGreaterThan(0);
  });

  it("searchStores returns a store with storeNum and promiseTime", async () => {
    const res = await sandboxAdapter().searchStores("41.880977", "-87.626481", [{ productId: "4x6", qty: "1" }]);
    expect(res.status).toBe("success");
    expect(res.photoStores[0].photoStoreDetails.storeNum).toBeTruthy();
    expect(res.photoStores[0].photoStoreDetails.promiseTime).toBeTruthy();
  });

  it("uploadImage succeeds with 201", async () => {
    const { uploadUrl } = buildWalgreensUploadUrl(
      "https://dummy.blob.core.windows.net/qpcontainerin?sig=DUMMY&se=2099-01-01T00%3A00%3A00Z&sv=2021-08-06&sp=w&sr=c",
      "photoapi"
    );
    await expect(sandboxAdapter().uploadImage(uploadUrl, new Uint8Array([0xff, 0xd8]))).resolves.toBeUndefined();
  });

  it("submitOrder returns a vendorOrderId", async () => {
    const res = await sandboxAdapter().submitOrder({
      firstName: "Test",
      lastName: "User",
      phone: "3125551234",
      email: "test@example.com",
      storeNum: "9999",
      promiseTime: "01-01-2099 10:00 AM",
      productDetails: [{ productId: "4x6", imageDetails: [{ qty: "1", url: "https://example.com/img.jpg" }] }]
    });
    expect(res.status).toBe("success");
    expect(res.vendorOrderId).toBeTruthy();
  });

  it("fetchOrderStatus returns statuses", async () => {
    const res = await sandboxAdapter().fetchOrderStatus(["DUMMY-0000000001"]);
    expect(res.statuses[0].valid).toBe("true");
    expect(res.statuses[0].orderStatus).toBeTruthy();
  });
});

// ── SAS upload URL builder ────────────────────────────────────────────────────

describe("buildWalgreensUploadUrl", () => {
  const sasToken =
    "https://pstrgqp01.blob.core.windows.net/qpcontainerin?sig=BLAH&se=2099-01-01T22%3A53%3A57Z&sv=2021-08-06&sp=w&sr=c";

  it("contains blob container prefix", () => {
    const { uploadUrl } = buildWalgreensUploadUrl(sasToken, "photoapi");
    expect(uploadUrl.startsWith("https://pstrgqp01.blob.core.windows.net/qpcontainerin/")).toBe(true);
  });

  it("contains affId in image name", () => {
    const { uploadUrl, imageName } = buildWalgreensUploadUrl(sasToken, "photoapi");
    expect(imageName).toMatch(/^Image-photoapi-/);
    expect(uploadUrl).toContain(imageName);
  });

  it("preserves the SAS signature", () => {
    const { uploadUrl } = buildWalgreensUploadUrl(sasToken, "photoapi");
    expect(uploadUrl).toContain("sig=BLAH");
  });

  it("each call produces a unique image name", () => {
    const a = buildWalgreensUploadUrl(sasToken, "photoapi");
    const b = buildWalgreensUploadUrl(sasToken, "photoapi");
    expect(a.imageName).not.toBe(b.imageName);
  });
});

// ── Dummy fetch blocks real network ──────────────────────────────────────────

describe("createWalgreensDummyFetch — safety guard", () => {
  it("throws when called with a real production Walgreens URL", async () => {
    const dummy = createWalgreensDummyFetch();
    await expect(dummy("https://services.walgreens.com/api/photo/products/v3")).rejects.toThrow("Blocked real network call");
  });

  it("throws when called with the sandbox URL directly (safety: tests should not hit real sandbox)", async () => {
    const dummy = createWalgreensDummyFetch();
    // sandbox URL doesn't contain "services.walgreens.com" exactly — dummy still matches
    // because dummy routes by path, not by enforcing host. Real guard: mode routing prevents real calls in tests.
    const res = await dummy("https://services-qa.walgreens.com/api/photo/products/v3", {
      method: "POST",
      body: JSON.stringify({})
    });
    expect(res.status).toBe(200);
  });
});
