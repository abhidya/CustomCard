/**
 * Walgreens Photo Prints — HTML (hosted) Checkout service.
 *
 * Flow (per https://developer.walgreens.com/api/photoprints/rest):
 *   1. POST /api/photo/creds/v3            → sasKeyToken + uploadLimit
 *   2. PUT  {UPLOAD_URL}                   → image bytes land in Walgreens storage
 *   3. POST /api/util/v3.0/mweb5url        → landingUrl + token
 *   4. Open landingUrl + "&token=" + token in a 540x620 browser window/modal
 *   5. Walgreens hosts product selection, store pick, T&C, and payment.
 *      Cancel/Back/Done navigate to our callBackLink.
 *
 * The API key and affiliate ID NEVER leave the server. The browser only ever
 * receives a short-lived hosted-checkout URL and write-only blob upload results.
 *
 * Mode routing (WALGREENS_VENDOR_MODE):
 *   disabled_until_certified → endpoints respond 503, no network
 *   sandbox                  → services-qa.walgreens.com
 *   production               → services.walgreens.com
 */

// ── Constants ────────────────────────────────────────────────────────────────

export const WALGREENS_SANDBOX_HOST = "https://services-qa.walgreens.com";
export const WALGREENS_PRODUCTION_HOST = "https://services.walgreens.com";

export const walgreensCheckoutUploadRoute = "/api/walgreens/checkout/upload";
export const walgreensCheckoutSessionRoute = "/api/walgreens/checkout/session";
export const walgreensCheckoutCallbackRoute = "/api/walgreens/checkout/callback";
export const walgreensCheckoutStatusRoute = "/api/walgreens/checkout/status";

export const WALGREENS_CHECKOUT_MAX_IMAGES = 20;
export const WALGREENS_CHECKOUT_MAX_IMAGE_BYTES = 4_000_000;
export const WALGREENS_CHECKOUT_IMAGE_EXPIRY_HOURS = 36;

/** Docs require the hosted landing page in a modal no larger than 540x620. */
export const WALGREENS_CHECKOUT_WINDOW = { width: 540, height: 620 };

/**
 * Store search pre-center when the browser cannot share location.
 * The customer always picks the exact store inside the hosted checkout.
 */
export const WALGREENS_DEFAULT_LATITUDE = "41.881832";
export const WALGREENS_DEFAULT_LONGITUDE = "-87.623177";

const DEFAULT_APP_VER = "1.0";
const DEFAULT_DEV_INF = "web,1.0";
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const WALGREENS_ERROR_MESSAGES = {
  "112": "AffiliateID is set up incorrectly for Walgreens hosted checkout.",
  "659": "No Walgreens vendor match for this API key and AffiliateID. Confirm the PhotoPrints AffiliateID is enabled for this app."
};
const WALGREENS_PROVIDER_CREDENTIAL_ERRORS = {
  "112": {
    status: "walgreens-provider-credential-blocked",
    statusCode: 503,
    retryable: false,
    error:
      "Walgreens PhotoPrints checkout is waiting on Walgreens enablement. Save the print package and upload it manually for now.",
    detail:
      "Walgreens says this AffiliateID is not enabled correctly for hosted checkout. Ask Walgreens Developer Support to confirm PhotoPrints is enabled for this API key and AffiliateID."
  },
  "659": {
    status: "walgreens-provider-credential-blocked",
    statusCode: 503,
    retryable: false,
    error:
      "Walgreens PhotoPrints checkout is waiting on Walgreens enablement. Save the print package and upload it manually for now.",
    detail:
      "Walgreens returned error 659 from the upload credentials endpoint. Ask Walgreens Developer Support to confirm the PhotoPrints vendor setup for this API key and AffiliateID."
  },
  "2003": {
    status: "walgreens-provider-credential-invalid",
    statusCode: 503,
    retryable: false,
    error:
      "Walgreens PhotoPrints checkout credentials are not accepted yet. Save the print package and upload it manually for now.",
    detail: "Walgreens rejected the checkout credentials. Confirm the API key and PhotoPrints AffiliateID in Walgreens Developer Portal."
  }
};

// ── Config ───────────────────────────────────────────────────────────────────

export function resolveWalgreensCheckoutConfig(env) {
  const mode = env.WALGREENS_VENDOR_MODE ?? "disabled_until_certified";
  const apiKey = env.WALGREENS_API_KEY ?? "";
  const affId = env.WALGREENS_AFF_ID ?? "";
  const publisherId = env.WALGREENS_PUBLISHER_ID ?? "";
  const appOrigin = (env.PUBLIC_APP_ORIGIN ?? "").replace(/\/+$/, "");

  const blockers = [];
  if (mode !== "sandbox" && mode !== "production") {
    blockers.push(`WALGREENS_VENDOR_MODE=${mode} — hosted checkout stays off until set to sandbox or production.`);
  }
  if ((mode === "sandbox" || mode === "production") && (!apiKey || apiKey === "replace-me")) {
    blockers.push("WALGREENS_API_KEY is missing.");
  }
  if ((mode === "sandbox" || mode === "production") && (!affId || affId === "replace-me")) {
    blockers.push("WALGREENS_AFF_ID is missing.");
  }
  if ((mode === "sandbox" || mode === "production") && !/^https?:\/\//.test(appOrigin)) {
    blockers.push("PUBLIC_APP_ORIGIN must be an absolute origin (used for the Walgreens checkout callback URL).");
  }

  return {
    mode,
    enabled: blockers.length === 0,
    apiKey,
    affId,
    publisherId,
    appOrigin,
    baseUrl: mode === "production" ? WALGREENS_PRODUCTION_HOST : WALGREENS_SANDBOX_HOST,
    callbackUrl: appOrigin ? `${appOrigin}${walgreensCheckoutCallbackRoute}` : "",
    blockers
  };
}

export class WalgreensCheckoutUpstreamError extends Error {
  constructor({ path, upstreamCode, upstreamMessage, status, statusCode, publicError, publicDetail, retryable }) {
    super(`Walgreens ${path} error ${upstreamCode}: ${trimTrailingPeriod(upstreamMessage)}.`);
    this.name = "WalgreensCheckoutUpstreamError";
    this.path = path;
    this.upstreamCode = upstreamCode;
    this.upstreamMessage = upstreamMessage;
    this.status = status;
    this.statusCode = statusCode;
    this.publicError = publicError;
    this.publicDetail = publicDetail;
    this.retryable = retryable;
  }
}

export function formatWalgreensCheckoutUpstreamError(error) {
  if (error instanceof WalgreensCheckoutUpstreamError) {
    return {
      statusCode: error.statusCode,
      payload: {
        ok: false,
        status: error.status,
        error: error.publicError,
        detail: error.publicDetail,
        upstreamCode: error.upstreamCode,
        retryable: error.retryable
      }
    };
  }

  return {
    statusCode: 502,
    payload: {
      ok: false,
      status: "walgreens-upstream-error",
      error:
        "Walgreens checkout is temporarily unavailable. Save the print package and upload it manually for now.",
      detail: error instanceof Error ? error.message : "Walgreens request failed.",
      retryable: true
    }
  };
}

function trimTrailingPeriod(value) {
  return String(value ?? "").replace(/\.+$/, "");
}

function walgreensUpstreamResult(error) {
  const formatted = formatWalgreensCheckoutUpstreamError(error);
  return { statusCode: formatted.statusCode, ...formatted.payload };
}

// ── Input validation (appsec: every client field is validated server-side) ───

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  // Strip control characters and HTML angle brackets before anything is
  // forwarded to Walgreens or echoed back in a response.
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, maxLength);
}

export function validateCheckoutCustomer(input) {
  const customer = typeof input === "object" && input !== null ? input : {};
  const firstName = cleanText(customer.firstName, 50);
  const lastName = cleanText(customer.lastName, 50);
  const email = cleanText(customer.email, 254);
  const phoneDigits = typeof customer.phone === "string" ? customer.phone.replace(/\D/g, "") : "";

  const errors = [];
  if (!firstName) errors.push("First name is required.");
  if (!lastName) errors.push("Last name is required.");
  if (!EMAIL_PATTERN.test(email)) errors.push("A valid email address is required.");
  if (phoneDigits.length !== 10) errors.push("A 10-digit US phone number is required.");

  return {
    ok: errors.length === 0,
    errors,
    customer: { firstName, lastName, email, phone: phoneDigits }
  };
}

export function validateCheckoutCoordinates(latInput, lngInput) {
  const lat = Number.parseFloat(String(latInput ?? ""));
  const lng = Number.parseFloat(String(lngInput ?? ""));
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
  }
  return { lat: WALGREENS_DEFAULT_LATITUDE, lng: WALGREENS_DEFAULT_LONGITUDE };
}

export function decodeJpegBase64(imageBase64) {
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    return { ok: false, error: "imageBase64 is required." };
  }
  const normalized = imageBase64.replace(/^data:image\/jpeg;base64,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    return { ok: false, error: "imageBase64 must be valid base64." };
  }
  let bytes;
  try {
    bytes = Buffer.from(normalized, "base64");
  } catch {
    return { ok: false, error: "imageBase64 could not be decoded." };
  }
  if (bytes.byteLength < 1024) {
    return { ok: false, error: "Image is too small to be a valid print file." };
  }
  if (bytes.byteLength > WALGREENS_CHECKOUT_MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image exceeds the ${WALGREENS_CHECKOUT_MAX_IMAGE_BYTES / 1_000_000}MB upload limit.` };
  }
  if (JPEG_MAGIC.some((byte, index) => bytes[index] !== byte)) {
    return { ok: false, error: "Only JPEG images can be sent to Walgreens." };
  }
  return { ok: true, bytes };
}

/**
 * The session endpoint only accepts image URLs that this server itself
 * produced via the Walgreens SAS upload flow — never arbitrary URLs.
 */
export function isTrustedWalgreensImageUrl(url, affId) {
  if (typeof url !== "string" || url.length > 2048) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!parsed.hostname.endsWith(".blob.core.windows.net")) return false;
  const namePattern = new RegExp(`/Image-${escapeRegExp(affId)}-[0-9a-f-]{36}\\.jpg$`);
  return namePattern.test(parsed.pathname);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ── Upload URL generation (per docs "Generate Upload Token") ────────────────

export function buildWalgreensUploadTarget(sasKeyToken, affId, uuid) {
  const [blobContainer, ...signatureParts] = String(sasKeyToken).split("?");
  const signature = signatureParts.join("?");
  const imageName = `Image-${affId}-${uuid}.jpg`;
  return { uploadUrl: `${blobContainer}/${imageName}?${signature}`, imageName };
}

export function buildCheckoutUrl(landingUrl, token) {
  const separator = landingUrl.includes("?") ? "&" : "?";
  return `${landingUrl}${separator}token=${encodeURIComponent(token)}`;
}

// ── Callback page (Walgreens navigates here on Done / Cancel / Back) ─────────

export function buildWalgreensCallbackHtml(appOrigin = "") {
  const safeOrigin = safePostMessageOrigin(appOrigin);
  const postMessageScript = safeOrigin
    ? `if (window.opener) window.opener.postMessage(payload, ${JSON.stringify(safeOrigin)});`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>CustomCard — Walgreens checkout</title>
    <style>
      body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 90vh; margin: 0; background: #f7f5f0; color: #172927; }
      main { text-align: center; padding: 24px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Thanks — you're all set.</h1>
      <p>You can close this window and return to CustomCard.</p>
    </main>
    <script>
      (function () {
        try {
          var params = new URLSearchParams(window.location.search);
          var payload = { source: "customcard-walgreens-checkout", status: params.get("status") || "returned" };
          ${postMessageScript}
        } catch (error) { /* non-fatal */ }
        setTimeout(function () { window.close(); }, 1200);
      })();
    </script>
  </body>
</html>`;
}

function safePostMessageOrigin(appOrigin) {
  const text = String(appOrigin ?? "").trim().replace(/\/+$/, "");
  if (!text || text === "*") return "";
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

// ── Service ──────────────────────────────────────────────────────────────────

function defaultUuid() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
}

export function createWalgreensHostedCheckoutService({ env, fetchImpl, now = () => Date.now(), uuid = defaultUuid }) {
  const config = resolveWalgreensCheckoutConfig(env);
  const upstreamTimeoutMs = 15_000;

  async function postJson(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), upstreamTimeoutMs);
    try {
      const response = await fetchImpl(`${config.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Walgreens ${path} responded HTTP ${response.status}.`);
      }
      const payload = await response.json();
      if (payload.err) {
        const upstreamCode = String(payload.err);
        const fallback = WALGREENS_ERROR_MESSAGES[upstreamCode] ?? "see Walgreens error code tables";
        const upstreamMessage = payload.errDesc || fallback;
        const providerCredentialError = WALGREENS_PROVIDER_CREDENTIAL_ERRORS[upstreamCode];
        throw new WalgreensCheckoutUpstreamError({
          path,
          upstreamCode,
          upstreamMessage,
          status: providerCredentialError?.status ?? "walgreens-upstream-error",
          statusCode: providerCredentialError?.statusCode ?? 502,
          publicError:
            providerCredentialError?.error ??
            "Walgreens checkout is temporarily unavailable. Save the print package and upload it manually for now.",
          publicDetail:
            providerCredentialError?.detail ??
            `Walgreens returned error ${upstreamCode} from ${path}: ${trimTrailingPeriod(upstreamMessage)}.`,
          retryable: providerCredentialError?.retryable ?? true
        });
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchUploadCredentials() {
    return postJson("/api/photo/creds/v3", {
      apiKey: config.apiKey,
      affId: config.affId,
      // creds/v3 only documents "ios" | "android"; use the documented
      // example value. The web integration is signalled later via
      // channelInfo:"web" on the mweb5url call.
      platform: "ios",
      transaction: "photocheckoutv2",
      appVer: DEFAULT_APP_VER,
      devInf: DEFAULT_DEV_INF
    });
  }

  return {
    config,

    /**
     * Production preflight: prove credentials can obtain Walgreens upload
     * credentials before the browser renders panels and attempts uploads.
     */
    async checkReadiness() {
      if (!config.enabled) {
        return {
          ok: false,
          statusCode: 503,
          status: "walgreens-checkout-not-configured",
          enabled: false,
          mode: config.mode,
          error: "Walgreens checkout is not enabled.",
          blockers: config.blockers,
          retryable: false
        };
      }

      let credentials;
      try {
        credentials = await fetchUploadCredentials();
      } catch (error) {
        return {
          ...walgreensUpstreamResult(error),
          enabled: true,
          mode: config.mode
        };
      }

      return {
        ok: true,
        statusCode: 200,
        status: "walgreens-checkout-ready",
        enabled: true,
        mode: config.mode,
        uploadLimit: credentials.uploadLimit,
        expiresAtIso: new Date(now() + WALGREENS_CHECKOUT_IMAGE_EXPIRY_HOURS * 3_600_000).toISOString()
      };
    },

    /** Step 1+2: fetch SAS credentials and push one JPEG into Walgreens storage. */
    async uploadCardImage(imageBase64) {
      if (!config.enabled) {
        return { ok: false, statusCode: 503, error: "Walgreens checkout is not enabled.", blockers: config.blockers };
      }
      const decoded = decodeJpegBase64(imageBase64);
      if (!decoded.ok) {
        return { ok: false, statusCode: 400, error: decoded.error };
      }

      let credentials;
      try {
        credentials = await fetchUploadCredentials();
      } catch (error) {
        return walgreensUpstreamResult(error);
      }
      const sasKeyToken = credentials.cloud?.[0]?.sasKeyToken;
      if (!sasKeyToken) {
        return { ok: false, statusCode: 502, error: "Walgreens did not return an upload token." };
      }

      const target = buildWalgreensUploadTarget(sasKeyToken, config.affId, uuid());
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), upstreamTimeoutMs);
      try {
        const uploadResponse = await fetchImpl(target.uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": String(decoded.bytes.byteLength),
            "x-ms-client-request-id": uuid(),
            "x-ms-blob-type": "BlockBlob"
          },
          body: decoded.bytes,
          signal: controller.signal
        });
        if (uploadResponse.status !== 201) {
          return { ok: false, statusCode: 502, error: `Walgreens image upload failed: HTTP ${uploadResponse.status}.` };
        }
      } finally {
        clearTimeout(timer);
      }

      return {
        ok: true,
        statusCode: 200,
        imageUrl: target.uploadUrl,
        imageName: target.imageName,
        expiresAtIso: new Date(now() + WALGREENS_CHECKOUT_IMAGE_EXPIRY_HOURS * 3_600_000).toISOString()
      };
    },

    /** Step 3: exchange uploaded image URLs + customer info for a hosted checkout URL. */
    async createCheckoutSession(input) {
      if (!config.enabled) {
        return { ok: false, statusCode: 503, error: "Walgreens checkout is not enabled.", blockers: config.blockers };
      }

      const body = typeof input === "object" && input !== null ? input : {};
      const customerResult = validateCheckoutCustomer(body.customer);
      if (!customerResult.ok) {
        return { ok: false, statusCode: 400, error: customerResult.errors.join(" ") };
      }

      const images = Array.isArray(body.images) ? body.images : [];
      if (images.length === 0 || images.length > WALGREENS_CHECKOUT_MAX_IMAGES) {
        return { ok: false, statusCode: 400, error: `images must contain 1-${WALGREENS_CHECKOUT_MAX_IMAGES} uploaded card files.` };
      }
      if (!images.every((url) => isTrustedWalgreensImageUrl(url, config.affId))) {
        return { ok: false, statusCode: 400, error: "images may only reference files uploaded through CustomCard." };
      }

      const { lat, lng } = validateCheckoutCoordinates(body.lat, body.lng);
      const expiryTime = String(now() + WALGREENS_CHECKOUT_IMAGE_EXPIRY_HOURS * 3_600_000);

      let payload;
      try {
        payload = await postJson("/api/util/v3.0/mweb5url", {
          apiKey: config.apiKey,
          affId: config.affId,
          ...(config.publisherId ? { publisherId: config.publisherId } : {}),
          channelInfo: "web",
          callBackLink: config.callbackUrl,
          expiryTime,
          images,
          lat,
          lng,
          customer: customerResult.customer,
          transaction: "photoCheckoutv2",
          act: "mweb5UrlV2",
          view: "mweb5UrlV2JSON",
          devInf: DEFAULT_DEV_INF,
          appVer: DEFAULT_APP_VER,
          ...(typeof body.affNotes === "string" && body.affNotes ? { affNotes: cleanText(body.affNotes, 240) } : {})
        });
      } catch (error) {
        return walgreensUpstreamResult(error);
      }

      if (!payload.landingUrl || !payload.token) {
        return { ok: false, statusCode: 502, error: "Walgreens did not return a checkout landing URL." };
      }

      return {
        ok: true,
        statusCode: 200,
        checkoutUrl: buildCheckoutUrl(payload.landingUrl, payload.token),
        window: WALGREENS_CHECKOUT_WINDOW,
        imageCount: images.length,
        mode: config.mode
      };
    }
  };
}

// ── Dummy fetch — unit tests only, zero network ───────────────────────────────

export function createWalgreensCheckoutDummyFetch() {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.includes("/api/photo/creds/v3")) {
      return jsonResponse({
        uploadLimit: 200,
        template: "default",
        landingUrl: "https://m5.walgreens.com/photoprints/",
        cloud: [{ sasKeyToken: "https://dummy.blob.core.windows.net/qpcontainerin?sig=DUMMY&sp=w&sr=c" }]
      });
    }
    if (url.includes(".blob.core.windows.net/")) {
      return new Response(null, { status: 201 });
    }
    if (url.includes("/api/util/v3.0/mweb5url")) {
      return jsonResponse({
        landingUrl: "https://m5.walgreens.com/photoprints/?cid=dummy",
        template: "default",
        uploadLimit: "200",
        token: "DUMMY-CHECKOUT-TOKEN",
        err: ""
      });
    }
    throw new Error(`[WalgreensCheckoutDummyFetch] Unknown URL: ${url}`);
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
}
