# @customcard/sdk

Official TypeScript / JavaScript client for the **CustomCard API** — the
relationship-aware greeting-card platform that detects card-worthy moments,
generates inspectable card copy and panels, builds checksum-backed render
packets, and prepares safe retail-print handoffs.

Works in Node.js 18+, modern browsers, Deno, Bun, and edge runtimes
(Cloudflare Workers, Vercel Edge). Ships dual ESM + CommonJS builds with full
TypeScript types.

> **Scope note.** This SDK mirrors the CustomCard API contract. Several
> capabilities are intentionally gated server-side (live AI, live retail
> ordering, payments). The SDK exposes those routes faithfully; whether they
> perform live work depends on the server's configuration and kill switches.

---

## Installation

```sh
npm install @customcard/sdk
# or
pnpm add @customcard/sdk
# or
yarn add @customcard/sdk
```

## Two ways to use it

- **`CustomCard`** — a small, card-centric client that covers the common flow
  (auth, create a card, status, load, batch) and hides the job queue / polling /
  idempotency plumbing. **Start here.** Full guide:
  [docs/simple-client.md](docs/simple-client.md).
- **`CustomCardClient`** — the full low-level client with one method per API
  route, for complete coverage and fine-grained control.

## Quick start (simple client)

```ts
import { CustomCard } from "@customcard/sdk";

const cc = new CustomCard({
  baseUrl: "https://customcard-three.vercel.app",
  token: process.env.CUSTOMCARD_CUSTOMER_TOKEN, // customer-session token or Clerk JWT
});

// Create a card and wait for the finished result
const card = await cc.createCardAndWait({
  from: "Sam",
  to: "Alex",
  occasion: "birthday",
  tone: "warm",
});
console.log(card.copy, card.images);

// Or non-blocking: create now, check/load later
const { id } = await cc.createCard({ from: "Sam", to: "Jordan", occasion: "thank you" });
const status = await cc.getStatus(id); // "pending" | "ready" | "failed"
const loaded = await cc.getCard(id);

// Batch — bounded concurrency, order preserved, per-item results
const results = await cc.createCardsAndWait([
  { from: "Sam", to: "Alex" },
  { from: "Sam", to: "Pat" },
]);
```

## Quick start (full client)

```ts
import { CustomCardClient } from "@customcard/sdk";

const client = new CustomCardClient({
  baseUrl: "https://customcard-three.vercel.app",
  customerToken: process.env.CUSTOMCARD_CUSTOMER_TOKEN,
});

const health = await client.health.check();
const job = await client.ai.generateCardAndWait({
  sender: "Sam",
  recipient: "Alex",
  occasion: "birthday",
});
console.log(job.result);
```

## Authentication

The API authenticates with `Authorization: Bearer <token>`. There are two
credential scopes:

| Scope      | Option          | Used by                                   |
| ---------- | --------------- | ----------------------------------------- |
| `customer` | `customerToken` | `client.customer`, `client.ai`, `client.cards`, `client.imports`, `client.privacy`, `client.retail.startOperation`, `client.walgreens` |
| `admin`    | `adminToken`    | `client.admin`, `client.retail.submitCouponPortalEvidence` |
| `none`     | —               | `client.health`, `client.public`          |

Tokens can be static strings or providers (sync or async) — ideal for rotating
Clerk JWTs:

```ts
const client = new CustomCardClient({
  baseUrl,
  customerToken: async () => (await session.getToken()) ?? undefined,
  adminToken: process.env.CUSTOMCARD_ADMIN_TOKEN,
});

// Or rotate at runtime:
client.setCustomerToken(freshJwt);
```

## Idempotency

Every mutating route requires an idempotency key. The SDK generates one
automatically per request. To make a retry safe across process restarts, pass
your own stable key:

```ts
await client.cards.createProject(
  { opportunityId, recipientName: "Alex" },
  { idempotencyKey: `project:${opportunityId}` },
);
```

## Queue-backed AI jobs

`client.ai.chat` and `client.ai.generateCard` enqueue work and return a
`job_id` immediately. You can poll yourself or use the `*AndWait` helpers:

```ts
// One-shot: submit + poll to completion
const result = await client.ai.generateCardAndWait(
  { sender: "Sam", recipient: "Alex", occasion: "anniversary" },
  { timeoutMs: 120_000, intervalMs: 1_500, onPoll: (s) => console.log(s.queue_status) },
);

// Or manage it manually
const submitted = await client.ai.chat({ customer_message: "Help me thank my mentor" });
const final = await client.ai.waitForJob(submitted.job_id);
```

Polling honors the server's `retry_after_seconds` hint and supports
`AbortSignal` cancellation.

## End-to-end card workflow

```ts
// 1. Import a moment (metadata-only; raw text is never stored server-side)
const preview = await client.imports.preview({
  sourceKind: "invite",
  rawInviteText: "You're invited to Alex's birthday on July 3...",
});

// 2. Approve a relationship memory
await client.cards.reviewMemory({
  recipientName: "Alex",
  text: "Loves matcha and trail running",
  decision: "approve",
});

// 3. Create a card project from an opportunity
const project = await client.cards.createProject({
  opportunityId: preview.opportunities[0]?.id as string,
  recipientName: "Alex",
  occasion: "birthday",
});

// 4. Build a checksum-backed render packet from rendered panels
const packet = await client.cards.createRenderPacket({
  projectId: project.projectId,
  panels: [{ id: "front", svg: frontSvg }, { id: "inside", svg: insideSvg }],
});

// 5. Prepare a manual print handoff (no live order is placed)
const handoff = await client.cards.manualVendorHandoff({
  projectId: project.projectId,
  renderPacketId: packet.renderPacketId,
  vendorId: "walgreens",
  externalShareApproval: true,
});
```

## Admin / operations

```ts
const admin = new CustomCardClient({ baseUrl, adminToken });

const readiness = await admin.admin.readiness();

// Stream every artifact-store object across pages
for await (const page of admin.admin.iterateArtifactBucket({ prefix: "render/" })) {
  console.log(page.objects.length, "objects");
}

await admin.admin.saveCardGalleryEntry({
  category: "birthday",
  title: "Trail-runner birthday",
  publicCaption: "Warm wishes for the path ahead",
  featured: true,
  publicApproved: true,
});
```

## Error handling

All failures throw a typed error so you can branch cleanly:

```ts
import {
  AuthenticationError,
  ValidationError,
  ConflictError,
  RateLimitError,
  NotFoundError,
  ServerError,
  NetworkError,
  TimeoutError,
  CustomCardApiError,
} from "@customcard/sdk";

try {
  await client.customer.bootstrap();
} catch (err) {
  if (err instanceof AuthenticationError) {
    // refresh token and retry
  } else if (err instanceof RateLimitError) {
    console.log("retry after", err.retryAfterSeconds, "seconds");
  } else if (err instanceof CustomCardApiError) {
    console.error(err.statusCode, err.status, err.route, err.body);
  }
}
```

| Error                  | When                                   |
| ---------------------- | -------------------------------------- |
| `AuthenticationError`  | 401 / 403                              |
| `ValidationError`      | 400 / 422                              |
| `NotFoundError`        | 404                                    |
| `ConflictError`        | 409 (e.g. idempotency-key mismatch)    |
| `RateLimitError`       | 429 (`retryAfterSeconds` populated)    |
| `ServerError`          | 5xx                                    |
| `NetworkError`         | transport/DNS/connection failure       |
| `TimeoutError`         | request exceeded `timeoutMs`           |
| `JobPollTimeoutError`  | `waitForJob` budget exhausted          |

## Configuration

```ts
new CustomCardClient({
  baseUrl: "https://customcard-three.vercel.app",
  customerToken,
  adminToken,
  timeoutMs: 30_000,                 // per-request timeout
  defaultHeaders: { "x-app": "crm" },
  userAgent: "my-service/1.0",       // Node only
  retry: {
    maxRetries: 2,                   // retries after the first attempt
    baseDelayMs: 250,
    maxDelayMs: 8_000,
    retryableStatusCodes: [408, 425, 429, 500, 502, 503, 504],
  },
  onRequest: (log) => metrics.record(log), // observability hook
  fetch: customFetch,                // bring your own fetch
});
```

Retries use exponential backoff with full jitter and skip non-idempotent
failures that aren't transport-level. Disable per request with
`{ noRetry: true }`.

## API coverage

| Namespace          | Methods |
| ------------------ | ------- |
| `client.health`    | `check`, `routes` |
| `client.customer`  | `bootstrap`, `mobileBootstrap`, `connections`, `getDraftState`, `saveDraftState` |
| `client.ai`        | `chat`, `generateCard`, `jobStatus`, `waitForJob`, `chatAndWait`, `generateCardAndWait` |
| `client.imports`   | `preview`, `startCalendarConnection` |
| `client.cards`     | `reviewMemory`, `createProject`, `createRenderPacket`, `manualVendorHandoff` |
| `client.privacy`   | `submitDataRequest` |
| `client.retail`    | `startOperation`, `submitCouponPortalEvidence` (admin) |
| `client.walgreens` | `status`, `upload`, `createSession` |
| `client.admin`     | `readiness`, `providerCatalog`, `providerGovernance`, `persistenceReadiness`, `artifactBucket`, `iterateArtifactBucket`, `demoReset`, `cardGallery`, `saveCardGalleryEntry` |
| `client.public`    | `featuredCards` |

Need a route that isn't wrapped yet? Use the low-level transport:

```ts
const data = await client.http.get("/api/some/route", "customer");
```

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

## License

UNLICENSED — © CustomCard. All rights reserved.
