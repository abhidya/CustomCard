/**
 * Error types thrown by the CustomCard SDK.
 *
 * Every error originating from the API is normalized into a {@link CustomCardError}
 * (or one of its subclasses) so callers can branch on `instanceof` rather than
 * inspecting loosely-typed responses.
 */

/** Shape of the JSON body the API returns for failed requests. */
export interface ApiErrorBody {
  service?: string;
  status?: string;
  route?: string;
  requiredAuth?: string;
  message?: string;
  [key: string]: unknown;
}

export interface CustomCardErrorOptions {
  statusCode?: number;
  /** Machine-readable status string from the API (e.g. "unauthorized"). */
  status?: string;
  /** The route id the API associated with the failure, when available. */
  route?: string;
  requestId?: string;
  body?: ApiErrorBody | string | null;
  cause?: unknown;
}

/** Base class for every error surfaced by the SDK. */
export class CustomCardError extends Error {
  readonly statusCode?: number;
  readonly status?: string;
  readonly route?: string;
  readonly requestId?: string;
  readonly body?: ApiErrorBody | string | null;

  constructor(message: string, options: CustomCardErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "CustomCardError";
    this.statusCode = options.statusCode;
    this.status = options.status;
    this.route = options.route;
    this.requestId = options.requestId;
    this.body = options.body ?? null;
    // Restore prototype chain for transpiled targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown for 4xx responses that are not auth, rate-limit, or validation errors. */
export class CustomCardApiError extends CustomCardError {
  constructor(message: string, options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "CustomCardApiError";
  }
}

/** Thrown for 401/403 responses. */
export class AuthenticationError extends CustomCardApiError {
  constructor(message = "Authentication failed", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "AuthenticationError";
  }
}

/** Thrown for 400/422 responses where the request payload was rejected. */
export class ValidationError extends CustomCardApiError {
  constructor(message = "Request validation failed", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "ValidationError";
  }
}

/** Thrown for 404 responses. */
export class NotFoundError extends CustomCardApiError {
  constructor(message = "Resource not found", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "NotFoundError";
  }
}

/** Thrown for 409 responses, e.g. an idempotency-key request-body mismatch. */
export class ConflictError extends CustomCardApiError {
  constructor(message = "Request conflict", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "ConflictError";
  }
}

/** Thrown for 429 responses. The `retryAfterSeconds` hint mirrors the API. */
export class RateLimitError extends CustomCardApiError {
  readonly retryAfterSeconds?: number;
  constructor(
    message = "Rate limit exceeded",
    options: CustomCardErrorOptions & { retryAfterSeconds?: number } = {},
  ) {
    super(message, options);
    this.name = "RateLimitError";
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/** Thrown for 5xx responses. */
export class ServerError extends CustomCardApiError {
  constructor(message = "Server error", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "ServerError";
  }
}

/** Thrown when a request fails at the transport layer (network/DNS/abort). */
export class NetworkError extends CustomCardError {
  constructor(message = "Network request failed", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "NetworkError";
  }
}

/** Thrown when a request exceeds the configured timeout. */
export class TimeoutError extends CustomCardError {
  constructor(message = "Request timed out", options: CustomCardErrorOptions = {}) {
    super(message, options);
    this.name = "TimeoutError";
  }
}

/** Thrown when polling a queue-backed job exceeds the configured budget. */
export class JobPollTimeoutError extends CustomCardError {
  readonly jobId?: string;
  constructor(message = "Timed out waiting for job to complete", options: CustomCardErrorOptions & { jobId?: string } = {}) {
    super(message, options);
    this.name = "JobPollTimeoutError";
    this.jobId = options.jobId;
  }
}

/**
 * Map an HTTP status code + parsed body into the most specific error subclass.
 * @internal
 */
export function errorFromResponse(
  statusCode: number,
  body: ApiErrorBody | string | null,
  requestId?: string,
): CustomCardApiError {
  const parsed = typeof body === "object" && body !== null ? body : undefined;
  const status = parsed?.status;
  const route = parsed?.route;
  const message =
    parsed?.message ||
    parsed?.status ||
    (typeof body === "string" && body ? body : `Request failed with status ${statusCode}`);
  const options: CustomCardErrorOptions = { statusCode, status, route, requestId, body };

  if (statusCode === 401 || statusCode === 403) return new AuthenticationError(message, options);
  if (statusCode === 404) return new NotFoundError(message, options);
  if (statusCode === 409) return new ConflictError(message, options);
  if (statusCode === 422 || statusCode === 400) return new ValidationError(message, options);
  if (statusCode === 429) {
    const retryAfterSeconds = readRetryAfter(parsed);
    return new RateLimitError(message, { ...options, retryAfterSeconds });
  }
  if (statusCode >= 500) return new ServerError(message, options);
  return new CustomCardApiError(message, options);
}

function readRetryAfter(body: ApiErrorBody | undefined): number | undefined {
  const value = body?.["retry_after_seconds"] ?? body?.["retryAfterSeconds"];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
