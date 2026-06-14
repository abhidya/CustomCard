import type { CustomCardClientOptions, TokenProvider } from "./config.js";
import { HttpClient } from "./http.js";
import { AdminResource } from "./resources/admin.js";
import { AiResource } from "./resources/ai.js";
import { CardsResource } from "./resources/cards.js";
import { CustomerResource } from "./resources/customer.js";
import { HealthResource } from "./resources/health.js";
import { ImportsResource } from "./resources/imports.js";
import { PrivacyResource } from "./resources/privacy.js";
import { PublicResource } from "./resources/publicCards.js";
import { RetailResource } from "./resources/retail.js";
import { WalgreensResource } from "./resources/walgreens.js";

/**
 * The CustomCard API client.
 *
 * @example
 * ```ts
 * const client = new CustomCardClient({
 *   baseUrl: "https://customcard-three.vercel.app",
 *   customerToken: process.env.CUSTOMCARD_CUSTOMER_TOKEN,
 * });
 *
 * const health = await client.health.check();
 * const result = await client.ai.generateCardAndWait({
 *   sender: "Sam",
 *   recipient: "Alex",
 *   occasion: "birthday",
 * });
 * ```
 */
export class CustomCardClient {
  /** Low-level HTTP transport (advanced use / custom routes). */
  readonly http: HttpClient;

  /** Public health + route discovery (`/api/health`, `/api/routes`). */
  readonly health: HealthResource;
  /** Customer panel, connections, drafts, mobile bootstrap. */
  readonly customer: CustomerResource;
  /** AI chat + card generation (queue-backed, with polling helpers). */
  readonly ai: AiResource;
  /** Event import + calendar connections. */
  readonly imports: ImportsResource;
  /** Memories, card projects, render packets, vendor handoff. */
  readonly cards: CardsResource;
  /** Regional data-rights requests. */
  readonly privacy: PrivacyResource;
  /** Retail-printer fulfillment + coupon evidence. */
  readonly retail: RetailResource;
  /** Walgreens hosted checkout. */
  readonly walgreens: WalgreensResource;
  /** Admin/operations endpoints. */
  readonly admin: AdminResource;
  /** Public featured-cards gallery. */
  readonly public: PublicResource;

  constructor(options: CustomCardClientOptions) {
    this.http = new HttpClient(options);

    this.health = new HealthResource(this.http);
    this.customer = new CustomerResource(this.http);
    this.ai = new AiResource(this.http);
    this.imports = new ImportsResource(this.http);
    this.cards = new CardsResource(this.http);
    this.privacy = new PrivacyResource(this.http);
    this.retail = new RetailResource(this.http);
    this.walgreens = new WalgreensResource(this.http);
    this.admin = new AdminResource(this.http);
    this.public = new PublicResource(this.http);
  }

  /** Resolved base URL the client is configured against. */
  get baseUrl(): string {
    return this.http.baseUrl;
  }

  /**
   * Update the customer token at runtime (e.g. after a Clerk session refresh).
   * Prefer passing a function `TokenProvider` at construction time when tokens
   * rotate frequently.
   */
  setCustomerToken(token: TokenProvider | undefined): void {
    this.http.config.customerToken = token;
  }

  /** Update the admin token at runtime. */
  setAdminToken(token: TokenProvider | undefined): void {
    this.http.config.adminToken = token;
  }
}
