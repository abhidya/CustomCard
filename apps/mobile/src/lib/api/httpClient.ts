import { randomUUID } from "expo-crypto";

import { ApiError, classifyHttpStatus } from "./errors";
import { devLog } from "./redact";

export type TokenProvider = () => Promise<string | null>;

export interface HttpClientOptions {
  baseUrl: string;
  getToken: TokenProvider;
  /** Called once per 401 so the session layer can sign the user out. */
  onUnauthorized?: () => void;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  generateIdempotencyKey?: () => string;
}

export interface RequestOptions {
  /** Override the auto-generated idempotency key (used for offline retry). */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T>;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const {
    baseUrl,
    getToken,
    onUnauthorized,
    fetchFn = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    generateIdempotencyKey = randomUUID
  } = options;

  async function request<T>(
    method: "GET" | "POST",
    path: string,
    body: unknown,
    requestOptions: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };

    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let serializedBody: string | undefined;
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      // Every mutation route requires an idempotency key; generating it here
      // means retries of the same logical action can reuse the key safely.
      headers["X-Idempotency-Key"] = requestOptions.idempotencyKey ?? generateIdempotencyKey();
      serializedBody = JSON.stringify(body ?? {});
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    if (requestOptions.signal) {
      if (requestOptions.signal.aborted) controller.abort();
      else
        requestOptions.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers,
        body: serializedBody,
        signal: controller.signal
      });
    } catch {
      const aborted = controller.signal.aborted && !requestOptions.signal?.aborted;
      devLog(`API ${method} ${path} failed before a response`, { aborted });
      throw new ApiError({
        message: aborted ? `Request to ${path} timed out` : `Network request to ${path} failed`,
        kind: aborted ? "timeout" : "network",
        retryable: true
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401) {
      onUnauthorized?.();
      throw new ApiError({ message: "Session expired", kind: "auth", status: 401 });
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const detail =
        payload && typeof payload === "object"
          ? String(
              (payload as { detail?: unknown; status?: unknown }).detail ??
                (payload as { status?: unknown }).status ??
                ""
            )
          : "";
      devLog(`API ${method} ${path} -> ${response.status}`, { detail });
      throw new ApiError({
        message: detail || `Request to ${path} failed (${response.status})`,
        kind: classifyHttpStatus(response.status),
        status: response.status,
        routeStatus: detail || null,
        retryable: response.status >= 500 || response.status === 429
      });
    }

    return payload as T;
  }

  return {
    get: (path, requestOptions) => request("GET", path, undefined, requestOptions),
    post: (path, body, requestOptions) => request("POST", path, body, requestOptions)
  };
}
