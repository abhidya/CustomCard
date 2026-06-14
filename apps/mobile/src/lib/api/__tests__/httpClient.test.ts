import { ApiError } from "../errors";
import { createHttpClient } from "../httpClient";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

describe("createHttpClient", () => {
  it("injects the bearer token and parses JSON for GET requests", async () => {
    const fetchFn = jest.fn(async () =>
      jsonResponse({ service: "customcard-api", status: "ready" })
    );
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "session-token-123",
      fetchFn: fetchFn as unknown as typeof fetch
    });

    const result = await client.get<{ status: string }>("/api/health");

    expect(result.status).toBe("ready");
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.test/api/health");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer session-token-123");
  });

  it("omits the Authorization header when no token is available", async () => {
    const fetchFn = jest.fn(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => null,
      fetchFn: fetchFn as unknown as typeof fetch
    });

    await client.get("/api/public/featured-cards");

    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("adds an idempotency key and JSON body to every POST", async () => {
    const fetchFn = jest.fn(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "t",
      fetchFn: fetchFn as unknown as typeof fetch,
      generateIdempotencyKey: () => "fixed-key-1"
    });

    await client.post("/api/memories/review", { decision: "approve" });

    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBe("fixed-key-1");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual({ decision: "approve" });
  });

  it("honours an explicit idempotency key for safe retries", async () => {
    const fetchFn = jest.fn(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "t",
      fetchFn: fetchFn as unknown as typeof fetch
    });

    await client.post("/api/data-requests", {}, { idempotencyKey: "retry-key" });

    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["X-Idempotency-Key"]).toBe("retry-key");
  });

  it("signals onUnauthorized and throws an auth error on 401", async () => {
    const onUnauthorized = jest.fn();
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "expired",
      onUnauthorized,
      fetchFn: (async () => jsonResponse({ status: "invalid-session" }, 401)) as typeof fetch
    });

    await expect(client.get("/api/customer/connections")).rejects.toMatchObject({
      kind: "auth",
      status: 401
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("maps non-OK responses to typed ApiErrors with the server detail", async () => {
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "t",
      fetchFn: (async () =>
        jsonResponse(
          { status: "invalid-payload", detail: "Recipient name is required." },
          400
        )) as typeof fetch
    });

    const error = await client.post("/api/card-projects", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe("validation");
    expect((error as ApiError).message).toContain("Recipient name is required.");
    expect((error as ApiError).retryable).toBe(false);
  });

  it("marks server errors and network failures as retryable", async () => {
    const serverErrorClient = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "t",
      fetchFn: (async () => jsonResponse({}, 503)) as typeof fetch
    });
    const serverError = await serverErrorClient.get("/api/health").catch((e: unknown) => e);
    expect((serverError as ApiError).retryable).toBe(true);

    const networkClient = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "t",
      fetchFn: (async () => {
        throw new TypeError("Network request failed");
      }) as typeof fetch
    });
    const networkError = await networkClient.get("/api/health").catch((e: unknown) => e);
    expect((networkError as ApiError).kind).toBe("network");
    expect((networkError as ApiError).retryable).toBe(true);
  });

  it("never leaks bearer tokens through error messages", async () => {
    const client = createHttpClient({
      baseUrl: "https://api.example.test",
      getToken: async () => "secret-token",
      fetchFn: (async () =>
        jsonResponse({ detail: "Bearer secret-token was rejected" }, 400)) as typeof fetch
    });

    const error = await client.get("/api/health").catch((e: unknown) => e);

    expect((error as ApiError).message).not.toContain("secret-token");
    expect((error as ApiError).message).toContain("Bearer [redacted]");
  });
});
