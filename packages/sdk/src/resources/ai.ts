import { JobPollTimeoutError } from "../errors.js";
import type { HttpClient, RequestOptions } from "../http.js";
import type {
  AiCardGenerateRequest,
  AiCardGenerateResponse,
  AiChatRespondRequest,
  AiChatRespondResponse,
  AiJobStatusResponse,
  QueuedJobResponse,
} from "../types.js";

export interface PollJobOptions {
  /** Total time budget in ms before giving up. Default: 120000 (2 min). */
  timeoutMs?: number;
  /** Minimum delay between polls in ms. Honors server `retry_after_seconds` when larger. Default: 1000. */
  intervalMs?: number;
  /** Abort the poll loop. */
  signal?: AbortSignal;
  /** Called after each status poll, useful for progress UIs. */
  onPoll?: (status: AiJobStatusResponse) => void;
}

const TERMINAL_STATUSES = new Set(["succeeded", "failed", "completed", "complete", "done", "error", "errored", "cancelled", "canceled"]);

/**
 * AI endpoints. Card generation and chat are queue-backed: the POST returns a
 * `job_id` immediately, and the result is fetched by polling job status. Use the
 * `*AndWait` helpers to run the full submit-then-poll flow in one call.
 */
export class AiResource {
  constructor(private readonly http: HttpClient) {}

  /** `POST /api/ai/chat/respond` — enqueue an AI concierge chat turn. */
  chat(body: AiChatRespondRequest, options?: RequestOptions): Promise<AiChatRespondResponse> {
    return this.http.post<AiChatRespondResponse>("/api/ai/chat/respond", "customer", body, {
      idempotent: true,
      options,
    });
  }

  /** `POST /api/ai/card/generate` — enqueue AI card-copy + image generation. */
  generateCard(body: AiCardGenerateRequest, options?: RequestOptions): Promise<AiCardGenerateResponse> {
    return this.http.post<AiCardGenerateResponse>("/api/ai/card/generate", "customer", body, {
      idempotent: true,
      options,
    });
  }

  /** `GET /api/ai/jobs/status?job_id=…` — poll a queue-backed job once. */
  jobStatus(jobId: string, options?: RequestOptions): Promise<AiJobStatusResponse> {
    return this.http.get<AiJobStatusResponse>("/api/ai/jobs/status", "customer", { job_id: jobId }, options);
  }

  /**
   * Poll a job until it reaches a terminal status, the result is available, or
   * the time budget is exhausted. Returns the final {@link AiJobStatusResponse}.
   */
  async waitForJob(jobId: string, poll: PollJobOptions = {}): Promise<AiJobStatusResponse> {
    const timeoutMs = poll.timeoutMs ?? 120_000;
    const intervalMs = poll.intervalMs ?? 1_000;
    const deadline = Date.now() + timeoutMs;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (poll.signal?.aborted) {
        throw new JobPollTimeoutError("Job polling aborted", { jobId });
      }

      const status = await this.jobStatus(jobId, { signal: poll.signal });
      poll.onPoll?.(status);

      if (isTerminal(status)) return status;

      if (Date.now() >= deadline) {
        throw new JobPollTimeoutError(`Job ${jobId} did not complete within ${timeoutMs}ms`, { jobId });
      }

      const serverHintMs = (status.retry_after_seconds ?? 0) * 1000;
      const wait = Math.min(Math.max(intervalMs, serverHintMs), Math.max(0, deadline - Date.now()));
      await sleep(wait, poll.signal);
    }
  }

  /** Submit a chat turn and wait for the completed result in one call. */
  async chatAndWait(
    body: AiChatRespondRequest,
    poll: PollJobOptions = {},
    options?: RequestOptions,
  ): Promise<AiJobStatusResponse> {
    const submitted = await this.chat(body, options);
    return this.resolveJob(submitted, poll);
  }

  /** Submit a card-generation job and wait for the completed result in one call. */
  async generateCardAndWait(
    body: AiCardGenerateRequest,
    poll: PollJobOptions = {},
    options?: RequestOptions,
  ): Promise<AiJobStatusResponse> {
    const submitted = await this.generateCard(body, options);
    return this.resolveJob(submitted, poll);
  }

  private async resolveJob(submitted: QueuedJobResponse, poll: PollJobOptions): Promise<AiJobStatusResponse> {
    if (submitted.result_available && isTerminalStatus(submitted.queue_status)) {
      // Some runtimes return a synchronous result; surface it through one status read.
      return this.jobStatus(submitted.job_id, { signal: poll.signal });
    }
    return this.waitForJob(submitted.job_id, poll);
  }
}

function isTerminal(status: AiJobStatusResponse): boolean {
  if (status.result_available && isTerminalStatus(status.queue_status)) return true;
  return isTerminalStatus(status.queue_status);
}

function isTerminalStatus(status: string | undefined): boolean {
  return typeof status === "string" && TERMINAL_STATUSES.has(status.toLowerCase());
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new JobPollTimeoutError("Job polling aborted"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new JobPollTimeoutError("Job polling aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
