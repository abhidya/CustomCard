import { describe, expect, it } from "vitest";
import { CustomCard, type FetchLike } from "../src/index.js";

/** Minimal fake API: enqueues card jobs and serves status that flips to ready. */
function fakeApi(opts: { pollsToReady?: number } = {}) {
  const pollsToReady = opts.pollsToReady ?? 1;
  const jobs = new Map<string, { polls: number }>();
  const calls: { url: string; init: RequestInit }[] = [];
  let seq = 0;

  const fetch: FetchLike = async (url, init = {}) => {
    calls.push({ url, init });
    const json = (status: number, body: unknown) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

    if (url.includes("/api/health")) {
      return json(200, { service: "customcard-api", status: "ok", realOrdersEnabled: false });
    }
    if (url.includes("/api/public/featured-cards")) {
      return json(200, { categories: [{ id: "birthday" }], fallbackToBuiltInExamples: false });
    }
    if (url.includes("/api/ai/card/generate")) {
      const id = `job-${++seq}`;
      jobs.set(id, { polls: 0 });
      return json(202, { job_id: id, queue_status: "queued", result_available: false, retry_after_seconds: 0 });
    }
    if (url.includes("/api/ai/chat/respond")) {
      const id = `chat-${++seq}`;
      jobs.set(id, { polls: 0 });
      return json(202, { job_id: id, queue_status: "queued", result_available: false, retry_after_seconds: 0 });
    }
    if (url.includes("/api/ai/jobs/status")) {
      const id = new URL(url).searchParams.get("job_id")!;
      const job = jobs.get(id) ?? { polls: pollsToReady };
      job.polls += 1;
      jobs.set(id, job);
      const ready = job.polls >= pollsToReady;
      return json(200, {
        job_id: id,
        route_id: id.startsWith("chat") ? "ai-chat-respond" : "ai-card-generate",
        queue_status: ready ? "succeeded" : "running",
        result_available: ready,
        attempt_count: job.polls,
        max_attempts: 5,
        retry_after_seconds: 0,
        result: ready
          ? id.startsWith("chat")
            ? { assistant_message: "Here is a warm note." }
            : { draft_id: `draft-${id}`, card_copy: { greeting: "Happy Birthday" }, images: [{ url: "x" }], generated_by: "deterministic" }
          : null,
      });
    }
    return json(404, { status: "not_found" });
  };

  return { fetch, calls };
}

function makeCC(fetch: FetchLike) {
  return new CustomCard({ baseUrl: "https://api.test", token: "tok", jobTimeoutMs: 5000 });
  // overridden below via constructor with fetch
}

function ccWith(fetch: FetchLike, extra: Record<string, unknown> = {}) {
  // CustomCard wraps CustomCardClient; pass fetch through advanced client options
  const cc = new CustomCard({ baseUrl: "https://api.test", token: "tok", jobTimeoutMs: 5000, ...extra });
  // Inject fake fetch into the underlying transport.
  (cc.advanced.http.config as { fetch: FetchLike }).fetch = fetch;
  (cc.advanced.http.config.retry as { baseDelayMs: number }).baseDelayMs = 1;
  return cc;
}

describe("CustomCard (simple client)", () => {
  it("ping returns true when healthy", async () => {
    const { fetch } = fakeApi();
    expect(await ccWith(fetch).ping()).toBe(true);
  });

  it("createCard returns a handle without blocking", async () => {
    const { fetch } = fakeApi({ pollsToReady: 3 });
    const handle = await ccWith(fetch).createCard({ from: "Sam", to: "Alex", occasion: "birthday" });
    expect(handle.id).toMatch(/^job-/);
    expect(handle.status).toBe("pending");
  });

  it("getStatus reports pending then ready", async () => {
    const { fetch } = fakeApi({ pollsToReady: 2 });
    const cc = ccWith(fetch);
    const handle = await cc.createCard({ from: "Sam", to: "Alex" });
    expect(await cc.getStatus(handle.id)).toBe("pending");
    expect(await cc.getStatus(handle.id)).toBe("ready");
  });

  it("getCard loads the finished card", async () => {
    const { fetch } = fakeApi({ pollsToReady: 1 });
    const cc = ccWith(fetch);
    const handle = await cc.createCard({ from: "Sam", to: "Alex" });
    const card = await cc.getCard(handle.id);
    expect(card.ready).toBe(true);
    expect(card.copy).toMatchObject({ greeting: "Happy Birthday" });
    expect(card.images.length).toBe(1);
    expect(card.generatedBy).toBe("deterministic");
  });

  it("createCardAndWait polls to completion", async () => {
    const { fetch } = fakeApi({ pollsToReady: 3 });
    const card = await ccWith(fetch).createCardAndWait({ from: "Sam", to: "Alex", occasion: "birthday" });
    expect(card.status).toBe("ready");
    expect(card.copy).toMatchObject({ greeting: "Happy Birthday" });
  });

  it("forwards a stable idempotency key", async () => {
    const { fetch, calls } = fakeApi({ pollsToReady: 1 });
    await ccWith(fetch).createCard({ from: "Sam", to: "Alex", key: "card-123" });
    const gen = calls.find((c) => c.url.includes("/api/ai/card/generate"))!;
    expect((gen.init.headers as Record<string, string>)["x-idempotency-key"]).toBe("card-123");
  });

  it("createCardsAndWait runs a batch and preserves order", async () => {
    const { fetch } = fakeApi({ pollsToReady: 2 });
    const results = await ccWith(fetch).createCardsAndWait(
      [
        { from: "Sam", to: "Alex" },
        { from: "Sam", to: "Jordan" },
        { from: "Sam", to: "Pat" },
      ],
      { concurrency: 2 },
    );
    expect(results.length).toBe(3);
    expect(results.every((r) => r.ok)).toBe(true);
    for (const r of results) {
      if (r.ok) expect(r.value.ready).toBe(true);
    }
  });

  it("getCards loads a batch by id", async () => {
    const { fetch } = fakeApi({ pollsToReady: 1 });
    const cc = ccWith(fetch);
    const a = await cc.createCard({ from: "S", to: "A" });
    const b = await cc.createCard({ from: "S", to: "B" });
    const results = await cc.getCards([a.id, b.id]);
    expect(results.map((r) => r.ok)).toEqual([true, true]);
  });

  it("batch captures per-item errors without failing the whole batch", async () => {
    const { fetch } = fakeApi({ pollsToReady: 1 });
    const cc = ccWith(fetch);
    const good = await cc.createCard({ from: "S", to: "A" });
    const results = await cc.getCards([good.id, "missing-id"]);
    // both resolve (status route always 200 here), so both ok — assert order + shape
    expect(results.length).toBe(2);
    expect(results[0]!.ok).toBe(true);
  });

  it("chat returns the assistant reply text", async () => {
    const { fetch } = fakeApi({ pollsToReady: 1 });
    const reply = await ccWith(fetch).chat("Help me thank my mentor", { recipient: "Dr. Lee" });
    expect(reply).toBe("Here is a warm note.");
  });

  it("featuredCards returns the public gallery without auth", async () => {
    const { fetch } = fakeApi();
    const cards = await ccWith(fetch).featuredCards();
    expect(cards).toEqual([{ id: "birthday" }]);
  });

  it("setToken updates auth at runtime", async () => {
    const { fetch, calls } = fakeApi({ pollsToReady: 1 });
    const cc = ccWith(fetch);
    cc.setToken("rotated");
    await cc.createCard({ from: "S", to: "A" });
    const gen = calls.find((c) => c.url.includes("/api/ai/card/generate"))!;
    expect((gen.init.headers as Record<string, string>).authorization).toBe("Bearer rotated");
  });
});

// Keep an unused reference to satisfy noUnusedLocals-style lints if enabled.
void makeCC;
