import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  ConflictError,
  CustomCardClient,
  RateLimitError,
  TimeoutError,
  ValidationError,
  generateIdempotencyKey,
  type FetchLike,
} from "../src/index.js";

interface RecordedRequest {
  url: string;
  init: RequestInit;
}

/** Build a fake fetch that records calls and replays queued responses. */
function fakeFetch(
  responder: (req: RecordedRequest, callIndex: number) => {
    status?: number;
    body?: unknown;
    headers?: Record<string, string>;
  } | Promise<{ status?: number; body?: unknown; headers?: Record<string, string> }>,
): { fetch: FetchLike; calls: RecordedRequest[] } {
  const calls: RecordedRequest[] = [];
  const fetch: FetchLike = async (url, init = {}) => {
    const record = { url, init };
    calls.push(record);
    const { status = 200, body = {}, headers = {} } = await responder(record, calls.length - 1);
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(payload, {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  };
  return { fetch, calls };
}

function makeClient(fetch: FetchLike, extra: Record<string, unknown> = {}): CustomCardClient {
  return new CustomCardClient({
    baseUrl: "https://api.example.test",
    customerToken: "cust-token",
    adminToken: "admin-token",
    fetch,
    retry: { baseDelayMs: 1, maxDelayMs: 2 },
    ...extra,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("idempotency keys", () => {
  it("generates unique v4-shaped keys", () => {
    const a = generateIdempotencyKey();
    const b = generateIdempotencyKey();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});

describe("config", () => {
  it("requires a baseUrl", () => {
    expect(() => new CustomCardClient({ baseUrl: "" })).toThrow(/baseUrl/);
  });

  it("strips trailing slashes from baseUrl", () => {
    const { fetch } = fakeFetch(() => ({ body: { ok: true } }));
    const client = new CustomCardClient({ baseUrl: "https://api.example.test///", fetch });
    expect(client.baseUrl).toBe("https://api.example.test");
  });
});

describe("requests", () => {
  it("sends GET /api/health without auth", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: { service: "customcard-api", status: "ok", realOrdersEnabled: false } }));
    const client = makeClient(fetch);
    const res = await client.health.check();
    expect(res.status).toBe("ok");
    expect(calls[0]!.url).toBe("https://api.example.test/api/health");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("attaches a customer bearer token", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: {} }));
    const client = makeClient(fetch);
    await client.customer.bootstrap();
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer cust-token");
  });

  it("attaches an admin bearer token for admin routes", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: {} }));
    const client = makeClient(fetch);
    await client.admin.readiness();
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer admin-token");
  });

  it("auto-generates an idempotency key on mutations", async () => {
    const { fetch, calls } = fakeFetch(() => ({ status: 202, body: { memoryId: "m1", approved: true } }));
    const client = makeClient(fetch);
    await client.cards.reviewMemory({ recipientName: "Alex", text: "loves tea", decision: "approve" });
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["x-idempotency-key"]).toBeTruthy();
  });

  it("honors a caller-supplied idempotency key", async () => {
    const { fetch, calls } = fakeFetch(() => ({ status: 202, body: {} }));
    const client = makeClient(fetch);
    await client.cards.createProject(
      { opportunityId: "op1", recipientName: "Alex" },
      { idempotencyKey: "fixed-key-123" },
    );
    expect((calls[0]!.init.headers as Record<string, string>)["x-idempotency-key"]).toBe("fixed-key-123");
  });

  it("serializes query params", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: {} }));
    const client = makeClient(fetch);
    await client.admin.artifactBucket({ prefix: "render/", limit: 10, order: "desc" });
    expect(calls[0]!.url).toContain("prefix=render%2F");
    expect(calls[0]!.url).toContain("limit=10");
    expect(calls[0]!.url).toContain("order=desc");
  });

  it("omits undefined query params", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: {} }));
    const client = makeClient(fetch);
    await client.customer.mobileBootstrap();
    expect(calls[0]!.url).toBe("https://api.example.test/api/mobile/bootstrap");
  });
});

describe("error mapping", () => {
  it("maps 401 to AuthenticationError", async () => {
    const { fetch } = fakeFetch(() => ({ status: 401, body: { status: "unauthorized", route: "customer-bootstrap" } }));
    const client = makeClient(fetch);
    await expect(client.customer.bootstrap()).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("maps 422 to ValidationError", async () => {
    const { fetch } = fakeFetch(() => ({ status: 422, body: { status: "invalid" } }));
    const client = makeClient(fetch, { retry: { maxRetries: 0 } });
    await expect(
      client.cards.reviewMemory({ recipientName: "", text: "", decision: "approve" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps 409 to ConflictError", async () => {
    const { fetch } = fakeFetch(() => ({ status: 409, body: { status: "conflict" } }));
    const client = makeClient(fetch, { retry: { maxRetries: 0 } });
    await expect(
      client.cards.createProject({ opportunityId: "o", recipientName: "A" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("exposes retryAfterSeconds on 429", async () => {
    const { fetch } = fakeFetch(() => ({ status: 429, body: { status: "rate_limited", retry_after_seconds: 5 } }));
    const client = makeClient(fetch, { retry: { maxRetries: 0 } });
    await expect(client.health.check()).rejects.toMatchObject({
      name: "RateLimitError",
      retryAfterSeconds: 5,
    } satisfies Partial<RateLimitError>);
  });
});

describe("retries", () => {
  it("retries retryable 5xx then succeeds", async () => {
    let count = 0;
    const { fetch, calls } = fakeFetch(() => {
      count += 1;
      if (count < 3) return { status: 503, body: { status: "unavailable" } };
      return { status: 200, body: { service: "customcard-api", status: "ok", realOrdersEnabled: false } };
    });
    const client = makeClient(fetch);
    const res = await client.health.check();
    expect(res.status).toBe("ok");
    expect(calls.length).toBe(3);
  });

  it("does not retry when noRetry is set", async () => {
    const { fetch, calls } = fakeFetch(() => ({ status: 503, body: {} }));
    const client = makeClient(fetch);
    await expect(client.health.check({ noRetry: true })).rejects.toBeTruthy();
    expect(calls.length).toBe(1);
  });
});

describe("timeouts", () => {
  it("throws TimeoutError when the request exceeds timeoutMs", async () => {
    const slowFetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const client = makeClient(slowFetch, { timeoutMs: 10, retry: { maxRetries: 0 } });
    await expect(client.health.check()).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe("ai job polling", () => {
  it("submits and polls until succeeded", async () => {
    const statuses = ["queued", "running", "succeeded"];
    let pollIndex = 0;
    const { fetch } = fakeFetch((req) => {
      if (req.url.includes("/api/ai/card/generate")) {
        return { status: 202, body: { job_id: "job-1", queue_status: "queued", result_available: false, retry_after_seconds: 0 } };
      }
      const status = statuses[Math.min(pollIndex, statuses.length - 1)]!;
      pollIndex += 1;
      return {
        body: {
          job_id: "job-1",
          route_id: "ai-card-generate",
          queue_status: status,
          result_available: status === "succeeded",
          attempt_count: pollIndex,
          max_attempts: 5,
          retry_after_seconds: 0,
          result: status === "succeeded" ? { card_copy: { greeting: "Happy Birthday" } } : null,
        },
      };
    });
    const client = makeClient(fetch);
    const result = await client.ai.generateCardAndWait(
      { sender: "Sam", recipient: "Alex", occasion: "birthday" },
      { intervalMs: 1, timeoutMs: 5000 },
    );
    expect(result.queue_status).toBe("succeeded");
    expect(result.result).toMatchObject({ card_copy: { greeting: "Happy Birthday" } });
  });
});

describe("runtime token updates", () => {
  it("supports setCustomerToken", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: {} }));
    const client = makeClient(fetch);
    client.setCustomerToken("rotated-token");
    await client.customer.connections();
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer rotated-token");
  });

  it("supports async token providers", async () => {
    const { fetch, calls } = fakeFetch(() => ({ body: {} }));
    const client = new CustomCardClient({
      baseUrl: "https://api.example.test",
      customerToken: async () => "async-token",
      fetch,
    });
    await client.customer.connections();
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer async-token");
  });
});
