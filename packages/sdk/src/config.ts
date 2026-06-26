import type { AuthScope } from "./types.js";

/** A function that returns a token (sync or async). Useful for refreshing JWTs. */
export type TokenProvider = string | (() => string | undefined | Promise<string | undefined>);

/** A `fetch`-compatible function. Defaults to the global `fetch`. */
export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface RetryOptions {
  /** Maximum number of retries after the initial attempt. Default: 2. */
  maxRetries: number;
  /** Base delay in ms for exponential backoff. Default: 250. */
  baseDelayMs: number;
  /** Maximum backoff delay in ms. Default: 8000. */
  maxDelayMs: number;
  /** HTTP status codes that should be retried. Default: 408, 425, 429, 500, 502, 503, 504. */
  retryableStatusCodes: number[];
}

export interface CustomCardClientOptions {
  /**
   * Base URL of the CustomCard API, e.g. `https://customcard-three.vercel.app`.
   * The `/api` prefix is part of each route path and must NOT be included here.
   */
  baseUrl: string;
  /** Customer-session token (or Clerk JWT) sent as `Authorization: Bearer`. */
  customerToken?: TokenProvider;
  /** Admin-session token sent as `Authorization: Bearer` for admin routes. */
  adminToken?: TokenProvider;
  /** Per-request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
  /** Extra headers attached to every request. */
  defaultHeaders?: Record<string, string>;
  /** Override the `fetch` implementation (e.g. for Node 16 or testing). */
  fetch?: FetchLike;
  /** Retry behavior for transient failures. */
  retry?: Partial<RetryOptions>;
  /** Optional hook invoked with structured logs for observability. */
  onRequest?: (info: RequestLog) => void;
  /** User-Agent suffix appended to requests (Node only; ignored by browsers). */
  userAgent?: string;
}

export interface RequestLog {
  method: string;
  url: string;
  attempt: number;
  status?: number;
  durationMs?: number;
  error?: unknown;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 8000,
  retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
};

export const DEFAULT_TIMEOUT_MS = 30_000;

export interface ResolvedConfig {
  baseUrl: string;
  customerToken?: TokenProvider;
  adminToken?: TokenProvider;
  timeoutMs: number;
  defaultHeaders: Record<string, string>;
  fetch: FetchLike;
  retry: RetryOptions;
  onRequest?: (info: RequestLog) => void;
  userAgent?: string;
}

export function resolveConfig(options: CustomCardClientOptions): ResolvedConfig {
  if (!options || typeof options.baseUrl !== "string" || options.baseUrl.trim() === "") {
    throw new Error("CustomCardClient requires a non-empty `baseUrl`.");
  }

  const fetchImpl: FetchLike | undefined =
    options.fetch ??
    (typeof globalThis !== "undefined" && typeof globalThis.fetch === "function"
      ? (globalThis.fetch.bind(globalThis) as FetchLike)
      : undefined);

  if (!fetchImpl) {
    throw new Error(
      "No `fetch` implementation found. Pass `fetch` in the client options or run on Node 18+.",
    );
  }

  return {
    baseUrl: options.baseUrl.replace(/\/+$/, ""),
    customerToken: options.customerToken,
    adminToken: options.adminToken,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    defaultHeaders: { ...(options.defaultHeaders ?? {}) },
    fetch: fetchImpl,
    retry: { ...DEFAULT_RETRY, ...(options.retry ?? {}) },
    onRequest: options.onRequest,
    userAgent: options.userAgent,
  };
}

export async function resolveToken(provider: TokenProvider | undefined): Promise<string | undefined> {
  if (provider === undefined) return undefined;
  if (typeof provider === "string") return provider;
  return provider();
}

/** Pick the token provider for the given auth scope. */
export function tokenForScope(config: ResolvedConfig, scope: AuthScope): TokenProvider | undefined {
  if (scope === "customer") return config.customerToken;
  if (scope === "admin") return config.adminToken;
  return undefined;
}
