import {
  resolveConfig,
  resolveToken,
  tokenForScope,
  type CustomCardClientOptions,
  type ResolvedConfig,
} from "./config.js";
import {
  CustomCardError,
  errorFromResponse,
  NetworkError,
  RateLimitError,
  TimeoutError,
  type ApiErrorBody,
} from "./errors.js";
import { generateIdempotencyKey } from "./idempotency.js";
import type { AuthScope } from "./types.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  /** Override or supply a specific idempotency key for a mutation. */
  idempotencyKey?: string;
  /** Per-request timeout override in ms. */
  timeoutMs?: number;
  /** Per-request additional headers. */
  headers?: Record<string, string>;
  /** Per-request abort signal. */
  signal?: AbortSignal;
  /** Disable retries for this request. */
  noRetry?: boolean;
}

interface InternalRequest {
  method: HttpMethod;
  path: string;
  scope: AuthScope;
  /** Whether this route mutates state and requires an idempotency key. */
  idempotent?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  options?: RequestOptions;
}

/**
 * Low-level transport used by every resource. Handles auth header injection,
 * idempotency keys, query serialization, timeouts, retries with exponential
 * backoff + jitter, and normalized error mapping.
 *
 * @internal — most callers should use {@link CustomCardClient} resource methods.
 */
export class HttpClient {
  readonly config: ResolvedConfig;

  constructor(options: CustomCardClientOptions) {
    this.config = resolveConfig(options);
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async request<T>(req: InternalRequest): Promise<T> {
    const url = this.buildUrl(req.path, req.query);
    const headers = await this.buildHeaders(req);
    const timeoutMs = req.options?.timeoutMs ?? this.config.timeoutMs;
    const allowRetry = !req.options?.noRetry;
    const maxAttempts = allowRetry ? this.config.retry.maxRetries + 1 : 1;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startedAt = now();
      try {
        const response = await this.fetchWithTimeout(url, {
          method: req.method,
          headers,
          body: req.body === undefined ? undefined : JSON.stringify(req.body),
          signal: req.options?.signal,
          timeoutMs,
        });

        const durationMs = now() - startedAt;
        this.config.onRequest?.({ method: req.method, url, attempt, status: response.status, durationMs });

        if (response.ok) {
          return (await parseBody(response)) as T;
        }

        const parsed = await parseBody(response);
        const requestId = response.headers.get("x-request-id") ?? undefined;
        const error = errorFromResponse(response.status, parsed as ApiErrorBody | string | null, requestId);

        if (allowRetry && attempt < maxAttempts && this.isRetryableStatus(response.status)) {
          await delay(this.backoffDelay(attempt, error));
          lastError = error;
          continue;
        }
        throw error;
      } catch (err) {
        const durationMs = now() - startedAt;
        this.config.onRequest?.({ method: req.method, url, attempt, error: err, durationMs });

        // Re-throw SDK errors that were already mapped/thrown above.
        if (err instanceof CustomCardError) throw err;

        const normalized = normalizeTransportError(err);
        lastError = normalized;

        const retryable = allowRetry && attempt < maxAttempts && !(normalized instanceof TimeoutError && req.options?.signal?.aborted);
        if (retryable) {
          await delay(this.backoffDelay(attempt));
          continue;
        }
        throw normalized;
      }
    }

    throw lastError instanceof Error ? lastError : new NetworkError("Request failed");
  }

  private buildUrl(path: string, query?: InternalRequest["query"]): string {
    const base = `${this.config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  private async buildHeaders(req: InternalRequest): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      accept: "application/json",
      ...this.config.defaultHeaders,
      ...(req.options?.headers ?? {}),
    };

    if (req.body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const tokenProvider = tokenForScope(this.config, req.scope);
    if (req.scope !== "none") {
      const token = await resolveToken(tokenProvider);
      if (token) {
        headers["authorization"] = `Bearer ${token}`;
      }
    }

    if (req.idempotent) {
      headers["x-idempotency-key"] = req.options?.idempotencyKey ?? generateIdempotencyKey();
    }

    if (this.config.userAgent && typeof globalThis !== "undefined" && !("window" in globalThis)) {
      headers["user-agent"] = this.config.userAgent;
    }

    return headers;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit & { timeoutMs: number },
  ): Promise<Response> {
    const { timeoutMs, signal, ...rest } = init;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

    // Chain a caller-provided signal into our controller.
    const onAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      return await this.config.fetch(url, { ...rest, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  private isRetryableStatus(status: number): boolean {
    return this.config.retry.retryableStatusCodes.includes(status);
  }

  private backoffDelay(attempt: number, error?: unknown): number {
    if (error instanceof RateLimitError && typeof error.retryAfterSeconds === "number") {
      return Math.min(error.retryAfterSeconds * 1000, this.config.retry.maxDelayMs);
    }
    const exp = this.config.retry.baseDelayMs * 2 ** (attempt - 1);
    const capped = Math.min(exp, this.config.retry.maxDelayMs);
    // Full jitter.
    return Math.random() * capped;
  }

  // Typed convenience wrappers used by resources.
  get<T>(path: string, scope: AuthScope, query?: InternalRequest["query"], options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: "GET", path, scope, query, options });
  }

  post<T>(
    path: string,
    scope: AuthScope,
    body: unknown,
    opts: { idempotent?: boolean; options?: RequestOptions } = {},
  ): Promise<T> {
    return this.request<T>({
      method: "POST",
      path,
      scope,
      body,
      idempotent: opts.idempotent,
      options: opts.options,
    });
  }
}

function normalizeTransportError(err: unknown): Error {
  if (err instanceof TimeoutError) return err;
  if (isAbortError(err)) {
    const reason = (err as { reason?: unknown }).reason;
    if (reason instanceof TimeoutError) return reason;
    return new TimeoutError("Request aborted", { cause: err });
  }
  return new NetworkError(err instanceof Error ? err.message : "Network request failed", { cause: err });
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || looksLikeJson(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function looksLikeJson(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
