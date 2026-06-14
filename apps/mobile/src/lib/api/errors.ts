import { redactText } from "./redact";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "auth"
  | "forbidden"
  | "validation"
  | "rate-limited"
  | "server"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly routeStatus: string | null;
  readonly retryable: boolean;

  constructor(options: {
    message: string;
    kind: ApiErrorKind;
    status?: number | null;
    routeStatus?: string | null;
    retryable?: boolean;
  }) {
    // Error text can surface in UI and logs — keep it redacted.
    super(redactText(options.message));
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.routeStatus = options.routeStatus ?? null;
    this.retryable =
      options.retryable ?? (options.kind === "network" || options.kind === "timeout");
  }
}

export function classifyHttpStatus(status: number): ApiErrorKind {
  if (status === 401) return "auth";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status >= 400 && status < 500) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

export function userMessageForError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case "network":
        return "You appear to be offline. Check your connection and try again.";
      case "timeout":
        return "The request took too long. Try again.";
      case "auth":
        return "Your session has expired. Please sign in again.";
      case "forbidden":
        return "You don't have access to that.";
      case "rate-limited":
        return "Too many requests right now. Wait a moment and retry.";
      case "validation":
        return error.message || "That request couldn't be processed.";
      default:
        return "Something went wrong on our side. Try again shortly.";
    }
  }
  return "Something went wrong. Try again.";
}
