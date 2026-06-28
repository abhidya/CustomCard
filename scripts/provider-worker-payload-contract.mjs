export function providerArtifactUploadContract() {
  return {
    mode: "api-complete-inline-data-url",
    r2CredentialsExposed: false,
    directR2UploadPlanned: true,
    detail: "The provider posts generated image data to complete; the production API persists artifacts to object storage."
  };
}

export function buildProviderWorkerResult({
  status = "ai-result-ready",
  routeId = "ai-card-generate",
  httpStatusCode = 200,
  providerCallMode,
  payload = {},
  evidence = "Provider worker completed the leased job.",
  liveNetworkCalls
} = {}) {
  const resolvedLiveNetworkCalls = Boolean(liveNetworkCalls ?? hasLiveProviderNetworkCall(payload));
  return {
    status: safeId(status, "ai-result-ready"),
    routeId: safeId(routeId, "ai-card-generate"),
    httpStatusCode: safeInteger(httpStatusCode, 200, 100, 599),
    providerCallMode: safeId(providerCallMode, resolvedLiveNetworkCalls ? "live-provider" : "provider-disabled"),
    payload,
    evidence: safeText(evidence, "Provider worker completed the leased job."),
    liveNetworkCalls: resolvedLiveNetworkCalls
  };
}

export function normalizeProviderCompletionResult(result) {
  const normalized = result && typeof result === "object" && !Array.isArray(result) ? result : {};
  const payload = normalized.payload && typeof normalized.payload === "object" && !Array.isArray(normalized.payload)
    ? normalized.payload
    : {};
  return buildProviderWorkerResult({
    status: normalized.status,
    routeId: normalized.routeId ?? normalized.route_id,
    httpStatusCode: normalized.httpStatusCode ?? normalized.http_status_code,
    providerCallMode: normalized.providerCallMode ?? normalized.provider_call_mode,
    payload,
    evidence: normalized.evidence,
    liveNetworkCalls: normalized.liveNetworkCalls ?? normalized.live_network_calls
  });
}

export function sanitizeProviderJobPayload(payload) {
  const normalized = normalizeJson(payload);
  const requestContext = normalized.requestContext && typeof normalized.requestContext === "object"
    ? normalized.requestContext
    : {};
  const authContext = requestContext.authContext && typeof requestContext.authContext === "object"
    ? requestContext.authContext
    : {};
  return {
    ...normalized,
    requestContext: {
      ...requestContext,
      authContext: {
        ...authContext,
        sessionId: "provider-lease"
      }
    },
    security: {
      ...(normalized.security ?? {}),
      providerLeaseScoped: true,
      credentialsPersisted: false,
      rawProviderContentStored: false
    }
  };
}

export function compactProviderWorkerResultPayload(payload = {}) {
  if (!Array.isArray(payload.images)) return payload;
  let omittedInlineImages = 0;
  const images = payload.images.map((image) => {
    if (!String(image?.image_url ?? "").startsWith("data:")) return image;
    omittedInlineImages += 1;
    return {
      ...image,
      image_url: "",
      image_inline_bytes_persisted: false,
      image_omitted_reason: "inline-image-result-not-stored-in-job-result"
    };
  });
  if (omittedInlineImages === 0) return payload;
  return {
    ...payload,
    images,
    generated_image_persistence: {
      status: "blocked",
      omittedInlineImages,
      inlineImageBytesPersisted: false,
      blocker: "Persist generated images to object storage before returning signed URLs from queued job status."
    }
  };
}

export function compactAiWorkerPayload(payload = {}) {
  return compactProviderWorkerResultPayload(payload);
}

export function hasLiveProviderNetworkCall(payload = {}) {
  return Array.isArray(payload.provider_call_events)
    ? payload.provider_call_events.some((event) => event?.live_network_call === true && event?.status !== "blocked")
    : false;
}

function safeId(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
}

function safeInteger(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function normalizeJson(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}
