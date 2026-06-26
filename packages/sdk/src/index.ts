/**
 * @customcard/sdk — official TypeScript/JavaScript client for the CustomCard API.
 *
 * @packageDocumentation
 */

export { CustomCardClient } from "./client.js";

// Simple, card-centric facade — the recommended starting point.
export {
  CustomCard,
  type CustomCardOptions,
  type CardRequest,
  type CardHandle,
  type CardStatus,
  type Card,
  type BatchResult,
} from "./simple.js";

export {
  type CustomCardClientOptions,
  type FetchLike,
  type RetryOptions,
  type RequestLog,
  type TokenProvider,
  DEFAULT_RETRY,
  DEFAULT_TIMEOUT_MS,
} from "./config.js";

export type { HttpClient, HttpMethod, RequestOptions } from "./http.js";

export { generateIdempotencyKey } from "./idempotency.js";

export type { PollJobOptions } from "./resources/ai.js";

// Resource classes (exported for typing / advanced composition).
export { AdminResource } from "./resources/admin.js";
export { AiResource } from "./resources/ai.js";
export { CardsResource } from "./resources/cards.js";
export { CustomerResource } from "./resources/customer.js";
export { HealthResource } from "./resources/health.js";
export { ImportsResource } from "./resources/imports.js";
export { PrivacyResource } from "./resources/privacy.js";
export { PublicResource } from "./resources/publicCards.js";
export { RetailResource } from "./resources/retail.js";
export { WalgreensResource } from "./resources/walgreens.js";

// Errors.
export {
  CustomCardError,
  CustomCardApiError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  JobPollTimeoutError,
  type ApiErrorBody,
} from "./errors.js";

// All request/response types.
export * from "./types.js";
