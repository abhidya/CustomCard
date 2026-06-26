/**
 * Simple, card-centric CustomCard client.
 *
 * A small facade over the full {@link CustomCardClient} focused on the card
 * lifecycle most apps need: authenticate, create a card, check its status, load
 * the finished card, and run those operations in batches. It hides the API's
 * job queue, polling, idempotency keys, and response envelopes behind plain
 * inputs and outputs.
 *
 * Reach for {@link CustomCardClient} when you need full route coverage or
 * low-level control (`cc.advanced`).
 */
import { CustomCardClient } from "./client.js";
import type { TokenProvider } from "./config.js";
import type { PollJobOptions } from "./resources/ai.js";
import type { AiJobStatusResponse, JsonObject } from "./types.js";

export interface CustomCardOptions {
  /** Base URL of the CustomCard API, e.g. `https://customcard-three.vercel.app`. */
  baseUrl: string;
  /**
   * Customer-session token or Clerk JWT. Required to create/load cards;
   * optional for public reads (`featuredCards`, `ping`). May be a string or a
   * (possibly async) provider for rotating tokens.
   */
  token?: TokenProvider;
  /** Per-request timeout in ms (default 30000). */
  timeoutMs?: number;
  /** How long `waitForCard`/`*AndWait` poll before giving up, in ms (default 120000). */
  jobTimeoutMs?: number;
  /** Default max concurrent requests for batch operations (default 4). */
  concurrency?: number;
}

/** Lifecycle state of a card. */
export type CardStatus = "pending" | "ready" | "failed";

/** What you ask for when creating a card. */
export interface CardRequest {
  /** Who the card is from. */
  from: string;
  /** Who the card is for. */
  to: string;
  /** e.g. "birthday", "anniversary", "thank you". */
  occasion?: string;
  /** e.g. "friend", "sibling", "manager". */
  relationship?: string;
  /** e.g. "warm", "funny", "heartfelt". */
  tone?: string;
  /** Visual direction, e.g. "watercolor", "minimal". */
  style?: string;
  /** BCP-47 language tag, e.g. "en", "es". */
  language?: string;
  /** A note in your own words to anchor the message. */
  note?: string;
  /** Short, already-approved relationship facts to personalize the card. */
  memories?: string[];
  /**
   * Stable idempotency key. Reusing the same key returns the same card instead
   * of creating a duplicate — useful for safe retries and batch jobs.
   */
  key?: string;
}

/** A handle to a card that is being (or has been) generated. */
export interface CardHandle {
  /** Card id — pass to `getCard`, `getStatus`, or `waitForCard`. */
  id: string;
  /** Status at the moment the handle was created. */
  status: CardStatus;
}

/** A card and everything known about it. */
export interface Card {
  /** Card id (the generation job id). */
  id: string;
  /** Lifecycle state. */
  status: CardStatus;
  /** True once `status === "ready"`. */
  ready: boolean;
  /** Generated copy (greeting, body, sign-off, …). Empty until ready. */
  copy: JsonObject;
  /** Generated images / panel art. Empty until ready. */
  images: unknown[];
  /** Who/what produced the card (provider or deterministic fallback). */
  generatedBy?: string;
  /** The full underlying job result, when you need more detail. */
  raw: JsonObject;
}

/** One result in a batch — either a value or the error that occurred. */
export type BatchResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

const TERMINAL_OK = new Set(["succeeded", "completed", "complete", "done"]);
const TERMINAL_FAIL = new Set(["failed", "error", "errored", "cancelled", "canceled"]);

export class CustomCard {
  private readonly client: CustomCardClient;
  private readonly jobTimeoutMs: number;
  private readonly defaultConcurrency: number;

  constructor(options: CustomCardOptions) {
    this.client = new CustomCardClient({
      baseUrl: options.baseUrl,
      customerToken: options.token,
      timeoutMs: options.timeoutMs,
    });
    this.jobTimeoutMs = options.jobTimeoutMs ?? 120_000;
    this.defaultConcurrency = Math.max(1, options.concurrency ?? 4);
  }

  // --- Auth ---------------------------------------------------------------

  /** Set or replace the auth token (e.g. after a session refresh). */
  setToken(token: TokenProvider | undefined): void {
    this.client.setCustomerToken(token);
  }

  /** True if the API is reachable and healthy. */
  async ping(): Promise<boolean> {
    try {
      const health = await this.client.health.check();
      return typeof health.status === "string" && health.status.toLowerCase() === "ok";
    } catch {
      return false;
    }
  }

  // --- Create -------------------------------------------------------------

  /**
   * Start generating a card and return a handle immediately (non-blocking).
   * Poll with {@link getStatus}/{@link getCard} or block with {@link waitForCard}.
   */
  async createCard(request: CardRequest): Promise<CardHandle> {
    const submitted = await this.client.ai.generateCard(toGenerateRequest(request), {
      idempotencyKey: request.key,
    });
    return { id: submitted.job_id, status: statusFromQueue(submitted.queue_status, submitted.result_available) };
  }

  /** Create a card and wait until it is ready (or fails). */
  async createCardAndWait(request: CardRequest): Promise<Card> {
    const job = await this.client.ai.generateCardAndWait(toGenerateRequest(request), this.pollOptions(), {
      idempotencyKey: request.key,
    });
    return toCard(job);
  }

  // --- Status & load ------------------------------------------------------

  /** Current status of a card. */
  async getStatus(id: string): Promise<CardStatus> {
    const job = await this.client.ai.jobStatus(id);
    return statusFromQueue(job.queue_status, job.result_available);
  }

  /** Load a card by id. Includes the finished copy/images once `ready`. */
  async getCard(id: string): Promise<Card> {
    const job = await this.client.ai.jobStatus(id);
    return toCard(job);
  }

  /** Wait until a card is ready (or fails), then return it. */
  async waitForCard(id: string): Promise<Card> {
    const job = await this.client.ai.waitForJob(id, this.pollOptions());
    return toCard(job);
  }

  // --- Batch operations ---------------------------------------------------

  /**
   * Create many cards. Returns a handle per request (or an error for the ones
   * that failed to enqueue), preserving input order. Non-blocking per card.
   */
  createCards(requests: CardRequest[], opts: { concurrency?: number } = {}): Promise<BatchResult<CardHandle>[]> {
    return this.runBatch(requests, (req) => this.createCard(req), opts.concurrency);
  }

  /** Create many cards and wait for every one to finish. Order preserved. */
  createCardsAndWait(requests: CardRequest[], opts: { concurrency?: number } = {}): Promise<BatchResult<Card>[]> {
    return this.runBatch(requests, (req) => this.createCardAndWait(req), opts.concurrency);
  }

  /** Load many cards by id at once. Order preserved. */
  getCards(ids: string[], opts: { concurrency?: number } = {}): Promise<BatchResult<Card>[]> {
    return this.runBatch(ids, (id) => this.getCard(id), opts.concurrency);
  }

  /** Wait for many cards to finish at once. Order preserved. */
  waitForCards(ids: string[], opts: { concurrency?: number } = {}): Promise<BatchResult<Card>[]> {
    return this.runBatch(ids, (id) => this.waitForCard(id), opts.concurrency);
  }

  // --- Extras -------------------------------------------------------------

  /** Ask the card concierge a question and get its reply as plain text. */
  async chat(
    message: string,
    opts: { recipient?: string; memories?: string[]; language?: string } = {},
  ): Promise<string> {
    const job = await this.client.ai.chatAndWait(
      {
        customer_message: message,
        recipient_name: opts.recipient,
        approved_memory_notes: opts.memories,
        locale: opts.language,
      },
      this.pollOptions(),
    );
    const reply = ((job.result ?? {}) as JsonObject)["assistant_message"];
    return typeof reply === "string" ? reply : "";
  }

  /** Browse the public, admin-approved featured-card gallery. No auth required. */
  async featuredCards(): Promise<unknown[]> {
    const res = await this.client.public.featuredCards();
    return Array.isArray(res.categories) ? res.categories : [];
  }

  /** Escape hatch: the full low-level client, for anything not covered here. */
  get advanced(): CustomCardClient {
    return this.client;
  }

  // --- internals ----------------------------------------------------------

  private pollOptions(): PollJobOptions {
    return { intervalMs: 1500, timeoutMs: this.jobTimeoutMs };
  }

  private async runBatch<I, O>(
    items: I[],
    op: (item: I) => Promise<O>,
    concurrency = this.defaultConcurrency,
  ): Promise<BatchResult<O>[]> {
    const results: BatchResult<O>[] = new Array(items.length);
    let cursor = 0;
    const limit = Math.max(1, Math.min(concurrency, items.length || 1));

    const worker = async () => {
      while (cursor < items.length) {
        const index = cursor++;
        try {
          results[index] = { ok: true, value: await op(items[index]!) };
        } catch (error) {
          results[index] = { ok: false, error };
        }
      }
    };

    await Promise.all(Array.from({ length: limit }, () => worker()));
    return results;
  }
}

function toGenerateRequest(request: CardRequest) {
  return {
    sender: request.from,
    recipient: request.to,
    occasion: request.occasion,
    relationship: request.relationship,
    tone: request.tone,
    style: request.style,
    language: request.language,
    personal_note: request.note,
    memory_notes: request.memories,
  };
}

function statusFromQueue(queueStatus: string | undefined, resultAvailable: boolean): CardStatus {
  const status = (queueStatus ?? "").toLowerCase();
  if (TERMINAL_FAIL.has(status)) return "failed";
  if (resultAvailable || TERMINAL_OK.has(status)) return "ready";
  return "pending";
}

function toCard(job: AiJobStatusResponse): Card {
  const status = statusFromQueue(job.queue_status, job.result_available);
  const result = (job.result ?? {}) as JsonObject;
  return {
    id: job.job_id,
    status,
    ready: status === "ready",
    copy: (result["card_copy"] as JsonObject) ?? {},
    images: Array.isArray(result["images"]) ? (result["images"] as unknown[]) : [],
    generatedBy: typeof result["generated_by"] === "string" ? (result["generated_by"] as string) : undefined,
    raw: result,
  };
}
