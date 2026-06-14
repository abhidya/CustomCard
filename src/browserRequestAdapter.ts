export type BrowserTokenProvider = () => Promise<string | null | undefined>;

export interface BrowserHeaderOptions {
  contentType?: string;
  getToken?: BrowserTokenProvider;
  headers?: HeadersInit;
  idempotencyKey?: string;
  requireToken?: boolean;
}

export interface BrowserJsonRequestOptions extends BrowserHeaderOptions {
  body?: unknown;
  cache?: RequestCache;
  fetchImpl?: typeof fetch;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export interface BrowserJsonResult<T> {
  payload: T | undefined;
  response: Response;
}

export async function buildBrowserRequestHeaders({
  contentType,
  getToken,
  headers,
  idempotencyKey,
  requireToken = false
}: BrowserHeaderOptions = {}): Promise<Headers> {
  const nextHeaders = new Headers(headers);
  if (contentType) nextHeaders.set("Content-Type", contentType);
  if (idempotencyKey) nextHeaders.set("X-Idempotency-Key", idempotencyKey);
  try {
    const token = await getToken?.();
    if (token) nextHeaders.set("Authorization", `Bearer ${token}`);
    else if (requireToken) throw new Error("auth-token-required");
  } catch (error) {
    if (requireToken) throw error instanceof Error ? error : new Error("auth-token-required");
  }
  return nextHeaders;
}

export async function requestBrowserJson<T = Record<string, unknown>>(
  path: string,
  {
    body,
    cache,
    contentType = body === undefined ? undefined : "application/json",
    fetchImpl = fetch,
    getToken,
    headers,
    idempotencyKey,
    method = body === undefined ? "GET" : "POST",
    requireToken = false
  }: BrowserJsonRequestOptions = {}
): Promise<BrowserJsonResult<T>> {
  const response = await fetchBrowser(path, {
    body,
    cache,
    contentType,
    fetchImpl,
    getToken,
    headers,
    idempotencyKey,
    method,
    requireToken
  });
  const payload = await response.json().catch(() => undefined) as T | undefined;
  return { payload, response };
}

export async function fetchBrowser(
  path: string,
  {
    body,
    cache,
    contentType = body === undefined ? undefined : "application/json",
    fetchImpl = fetch,
    getToken,
    headers,
    idempotencyKey,
    method = body === undefined ? "GET" : "POST",
    requireToken = false
  }: BrowserJsonRequestOptions = {}
): Promise<Response> {
  return fetchImpl(path, {
    cache,
    method,
    headers: await buildBrowserRequestHeaders({ contentType, getToken, headers, idempotencyKey, requireToken }),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export async function getBrowserJson<T = Record<string, unknown>>(
  path: string,
  options: Omit<BrowserJsonRequestOptions, "body" | "method"> = {}
): Promise<T | undefined> {
  const { payload, response } = await requestBrowserJson<T>(path, { ...options, method: "GET" });
  return response.ok ? payload : undefined;
}

export async function postBrowserJson<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  options: Omit<BrowserJsonRequestOptions, "body" | "method"> = {}
): Promise<BrowserJsonResult<T>> {
  return requestBrowserJson<T>(path, {
    ...options,
    body,
    method: "POST",
    idempotencyKey: options.idempotencyKey ?? buildBrowserIdempotencyKey(path)
  });
}

export function buildBrowserIdempotencyKey(path: string): string {
  const routeSlug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "mutation";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${routeSlug}-${crypto.randomUUID()}`;
  return `${routeSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
