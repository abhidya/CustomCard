/**
 * Walgreens Native Photo Prints API adapter.
 *
 * Mode routing (WALGREENS_VENDOR_MODE):
 *   disabled_until_certified → all methods throw — no network, no credentials needed
 *   sandbox                  → services-qa.walgreens.com  (safe to call freely, no orders fulfill)
 *   production               → services.walgreens.com     (requires Walgreens production approval)
 *
 * Unit tests: pass fetch = createWalgreensDummyFetch() — returns canned responses, zero network.
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const WALGREENS_SANDBOX_BASE_URL = "https://services-qa.walgreens.com/api/photo";
export const WALGREENS_PRODUCTION_BASE_URL = "https://services.walgreens.com/api/photo";

const DEFAULT_APP_VER = "1.0";
const DEFAULT_DEV_INF = "web,1.0";

// ── Mode ─────────────────────────────────────────────────────────────────────

export type WalgreensAdapterMode = "disabled_until_certified" | "sandbox" | "production";

function resolveBaseUrl(mode: WalgreensAdapterMode): string {
  if (mode === "sandbox") return WALGREENS_SANDBOX_BASE_URL;
  if (mode === "production") return WALGREENS_PRODUCTION_BASE_URL;
  throw new Error(`Walgreens adapter not enabled — WALGREENS_VENDOR_MODE=${mode}`);
}

// ── Fetch injectable ──────────────────────────────────────────────────────────

export type WalgreensFetch = (url: string, init?: RequestInit) => Promise<Response>;

// ── Config ────────────────────────────────────────────────────────────────────

export interface WalgreensAdapterConfig {
  mode: WalgreensAdapterMode;
  apiKey: string;
  affId: string;
  baseUrl: string;
  fetch: WalgreensFetch;
  appVer?: string;
  devInf?: string;
}

export function buildWalgreensAdapterConfig(
  env: Record<string, string | undefined>,
  fetchImpl: WalgreensFetch
): WalgreensAdapterConfig {
  const mode = (env["WALGREENS_VENDOR_MODE"] ?? "disabled_until_certified") as WalgreensAdapterMode;
  const apiKey = env["WALGREENS_API_KEY"] ?? "";
  const affId = env["WALGREENS_AFF_ID"] ?? "";

  if (mode !== "disabled_until_certified" && (!apiKey || !affId)) {
    throw new Error("WALGREENS_API_KEY and WALGREENS_AFF_ID are required when WALGREENS_VENDOR_MODE is not disabled_until_certified");
  }

  return {
    mode,
    apiKey,
    affId,
    baseUrl: mode === "disabled_until_certified" ? "" : resolveBaseUrl(mode),
    fetch: fetchImpl,
    appVer: DEFAULT_APP_VER,
    devInf: DEFAULT_DEV_INF
  };
}

// ── Request / response types ──────────────────────────────────────────────────

export interface WalgreensProductDetail {
  productId: string;
  qty: string;
}

export interface WalgreensCredentialResponse {
  uploadLimit: number;
  template: string;
  landingUrl: string;
  cloud: Array<{ sasKeyToken: string }>;
}

export interface WalgreensProduct {
  productId: string;
  productDesc: string;
  productSize: string;
  productGroupId: string;
  productPrice: string;
  boxQty: string;
  dpi?: string;
  resWidth?: string;
  resHeight?: string;
  multiImageIndicator?: string;
  vendorQtyLimit?: string;
}

export interface WalgreensProductsResponse {
  err: string;
  errDesc: string;
  products: WalgreensProduct[];
}

export interface WalgreensCouponResponse {
  err: string;
  errDesc: string;
  status: string;
  orderTotalPrice: number;
  orderDiscountPrice: number;
}

export interface WalgreensStoreDetails {
  storeNum: string;
  promiseTime: string;
  type: string;
  zip: string;
  city: string;
  state: string;
  street: string;
  latitude: string;
  longitude: string;
  phone: string;
  distance: string;
  distanceUnit: string;
  openTime: string;
  closeTime: string;
  storeName: string;
  timeZone: string;
  tax: string;
}

export interface WalgreensStoreResponse {
  status: string;
  errCode: string;
  errDesc: string;
  photoStores: Array<{ photoStoreDetails: WalgreensStoreDetails }>;
}

export interface WalgreensImageDetail {
  qty: string;
  url: string;
}

export interface WalgreensOrderProductDetail {
  productId: string;
  imageDetails: WalgreensImageDetail[];
  multiImageQuantity?: string;
}

export interface WalgreensOrderRequest {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  storeNum: string;
  promiseTime: string;
  productDetails: WalgreensOrderProductDetail[];
  couponCode?: string;
  affNotes?: string;
  publisherId?: string;
}

export interface WalgreensOrderResponse {
  vendorOrderId: string;
  err: string;
  errDesc: string;
  status: string;
}

export interface WalgreensOrderStatus {
  valid: string;
  code: string;
  orderId: string;
  orderStatus: string;
}

export interface WalgreensOrderStatusResponse {
  err: string;
  errDesc: string;
  statuses: WalgreensOrderStatus[];
}

export interface WalgreensUploadUrl {
  uploadUrl: string;
  imageName: string;
}

// ── SAS token → upload URL (pure, no fetch) ──────────────────────────────────

export function buildWalgreensUploadUrl(sasKeyToken: string, affId: string): WalgreensUploadUrl {
  const parts = sasKeyToken.split("?");
  const blobContainer = parts[0];
  const signature = parts.slice(1).join("?");
  const imageName = `Image-${affId}-${generateUuidV4()}.jpg`;
  return {
    uploadUrl: `${blobContainer}/${imageName}?${signature}`,
    imageName
  };
}

function generateUuidV4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Live adapter ──────────────────────────────────────────────────────────────

export interface WalgreensPhotoAdapter {
  readonly mode: WalgreensAdapterMode;
  fetchCredentials(): Promise<WalgreensCredentialResponse>;
  fetchProducts(productGroupId?: string): Promise<WalgreensProductsResponse>;
  validateCoupon(couponCode: string, productDetails: WalgreensProductDetail[]): Promise<WalgreensCouponResponse>;
  searchStores(latitude: string, longitude: string, productDetails: WalgreensProductDetail[]): Promise<WalgreensStoreResponse>;
  uploadImage(uploadUrl: string, imageData: Uint8Array, contentType?: string): Promise<void>;
  submitOrder(order: WalgreensOrderRequest): Promise<WalgreensOrderResponse>;
  fetchOrderStatus(vendorOrderIds: string[]): Promise<WalgreensOrderStatusResponse>;
}

export function createWalgreensPhotoAdapter(config: WalgreensAdapterConfig): WalgreensPhotoAdapter {
  if (config.mode === "disabled_until_certified") {
    throw new Error("Walgreens adapter is disabled_until_certified. Set WALGREENS_VENDOR_MODE=production to enable Walgreens calls.");
  }

  const base = config.baseUrl;
  const common = {
    apiKey: config.apiKey,
    affId: config.affId,
    appVer: config.appVer ?? DEFAULT_APP_VER,
    devInf: config.devInf ?? DEFAULT_DEV_INF
  };

  async function post<T>(path: string, body: object): Promise<T> {
    const res = await config.fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Walgreens API ${path} failed: HTTP ${res.status}`);
    const data = (await res.json()) as T & { err?: string; errDesc?: string };
    if (data.err) throw new Error(`Walgreens API ${path} error: ${data.err} — ${data.errDesc}`);
    return data;
  }

  return {
    mode: config.mode,

    fetchCredentials() {
      return post<WalgreensCredentialResponse>("/creds/v3", {
        ...common,
        platform: "ios",
        transaction: "photocheckoutv2"
      });
    },

    fetchProducts(productGroupId?: string) {
      return post<WalgreensProductsResponse>("/products/v3", {
        ...common,
        act: "getphotoprods",
        ...(productGroupId ? { productGroupId } : {})
      });
    },

    validateCoupon(couponCode: string, productDetails: WalgreensProductDetail[]) {
      return post<WalgreensCouponResponse>("/order/coupon/v3", {
        ...common,
        couponCode,
        act: "getdiscount",
        productDetails
      });
    },

    searchStores(latitude: string, longitude: string, productDetails: WalgreensProductDetail[]) {
      return post<WalgreensStoreResponse>("/store/v3", {
        ...common,
        latitude,
        longitude,
        act: "photoStores",
        productDetails
      });
    },

    async uploadImage(uploadUrl: string, imageData: Uint8Array, contentType = "image/jpeg") {
      const requestId = generateUuidV4();
      const res = await config.fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(imageData.byteLength),
          "x-ms-client-request-id": requestId,
          "x-ms-blob-type": "BlockBlob"
        },
        body: imageData.buffer as ArrayBuffer
      });
      if (res.status !== 201) throw new Error(`Walgreens image upload failed: HTTP ${res.status}`);
    },

    submitOrder(order: WalgreensOrderRequest) {
      return post<WalgreensOrderResponse>("/order/submit/v3", {
        ...common,
        ...order,
        act: "submitphotoorder"
      });
    },

    fetchOrderStatus(vendorOrderIds: string[]) {
      return post<WalgreensOrderStatusResponse>("/order/status/v3", {
        ...common,
        orders: vendorOrderIds,
        act: "orderstatus"
      });
    }
  };
}

// ── Dummy fetch — unit tests only, zero network ───────────────────────────────

export function createWalgreensDummyFetch(): WalgreensFetch {
  return async (url: string): Promise<Response> => {
    if (url.includes("services.walgreens.com")) {
      throw new Error(
        `[WalgreensDummyFetch] Blocked real network call to ${url}. Inject createWalgreensDummyFetch() only in tests.`
      );
    }

    const path = new URL(url).pathname;
    let body: unknown;

    if (path.endsWith("/creds/v3")) {
      body = {
        uploadLimit: 200,
        template: "default",
        landingUrl: "https://m5.walgreens.com/photoprints/",
        cloud: [{ sasKeyToken: "https://dummy.blob.core.windows.net/qpcontainerin?sig=DUMMY&se=2099-01-01T00%3A00%3A00Z&sv=2021-08-06&sp=w&sr=c" }]
      } satisfies WalgreensCredentialResponse;
    } else if (path.endsWith("/products/v3")) {
      body = {
        err: "",
        errDesc: "",
        products: [
          { productId: "4x6", productDesc: "4x6 Print", productSize: "4x6", productGroupId: "STDPR", productPrice: "0.29", boxQty: "1" },
          { productId: "5x7", productDesc: "5x7 Print", productSize: "5x7", productGroupId: "STDPR", productPrice: "0.99", boxQty: "1" },
          { productId: "4x8FLD", productDesc: "4x8 Folded Card", productSize: "4x8", productGroupId: "CARDS", productPrice: "1.99", boxQty: "1" }
        ]
      } satisfies WalgreensProductsResponse;
    } else if (path.endsWith("/order/coupon/v3")) {
      body = { err: "", errDesc: "", status: "success", orderTotalPrice: 10.0, orderDiscountPrice: 2.0 } satisfies WalgreensCouponResponse;
    } else if (path.endsWith("/store/v3")) {
      body = {
        status: "success",
        errCode: "",
        errDesc: "",
        photoStores: [
          {
            photoStoreDetails: {
              storeNum: "9999",
              promiseTime: "01-01-2099 10:00 AM",
              type: "WAG",
              zip: "60601",
              city: "Chicago",
              state: "IL",
              street: "1 N State St",
              latitude: "41.8827",
              longitude: "-87.6278",
              phone: "3125551234",
              distance: "0.1",
              distanceUnit: "miles",
              openTime: "08:00 AM",
              closeTime: "10:00 PM",
              storeName: "Walgreens",
              timeZone: "America/Chicago",
              tax: "0.10"
            }
          }
        ]
      } satisfies WalgreensStoreResponse;
    } else if (path.endsWith("/order/submit/v3")) {
      body = { vendorOrderId: "DUMMY-0000000001", err: "", errDesc: "", status: "success" } satisfies WalgreensOrderResponse;
    } else if (path.endsWith("/order/status/v3")) {
      body = {
        err: "",
        errDesc: "",
        statuses: [{ valid: "true", code: "3", orderId: "DUMMY-0000000001", orderStatus: "Ready for Pickup" }]
      } satisfies WalgreensOrderStatusResponse;
    } else if (path.includes("/qpcontainerin/")) {
      return new Response(null, { status: 201 });
    } else {
      throw new Error(`[WalgreensDummyFetch] Unknown path: ${path}`);
    }

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
}
