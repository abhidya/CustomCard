# CustomCard simple client — developer guide

The `CustomCard` client is a small, card-centric wrapper around the CustomCard
API. It covers the lifecycle most apps need — **authenticate → create a card →
check status → load the finished card**, plus **batch** versions of those
operations — and hides the underlying job queue, polling, idempotency keys, and
response envelopes.

> Need a route the simple client doesn't expose? Every method on the full
> low-level client is available at `cc.advanced`. See the
> [package README](../README.md) for the complete API surface.

- [Install](#install)
- [Authentication](#authentication)
- [Creating a card](#creating-a-card)
- [Card status](#card-status)
- [Loading cards](#loading-cards)
- [Batch operations](#batch-operations)
- [Concierge chat](#concierge-chat)
- [Public gallery](#public-gallery)
- [Error handling](#error-handling)
- [Configuration reference](#configuration-reference)
- [Type reference](#type-reference)

---

## Install

```sh
npm install @customcard/sdk
```

Runs on Node.js 18+, modern browsers, Deno, Bun, and edge runtimes. Ships ESM +
CommonJS with bundled TypeScript types.

```ts
import { CustomCard } from "@customcard/sdk";
```

---

## Authentication

The client authenticates customer requests with a bearer token — either a
CustomCard customer-session token or a Clerk JWT. Pass it when you construct the
client:

```ts
const cc = new CustomCard({
  baseUrl: "https://customcard-three.vercel.app",
  token: process.env.CUSTOMCARD_CUSTOMER_TOKEN,
});
```

### Rotating / refreshing tokens

For tokens that expire (e.g. Clerk JWTs), pass a function instead of a string.
It's called before every request, so a fresh token is always used:

```ts
const cc = new CustomCard({
  baseUrl,
  token: async () => (await clerkSession.getToken()) ?? undefined,
});
```

Or update it at runtime after a refresh:

```ts
cc.setToken(freshJwt);
```

### No token needed for public reads

`ping()` and `featuredCards()` work without a token. Creating, loading, and
checking cards require one; without it those calls throw an `AuthenticationError`.

```ts
if (await cc.ping()) {
  console.log("API reachable");
}
```

---

## Creating a card

You describe the card in plain terms; the client maps it to the API and returns
a handle once the generation job is enqueued.

```ts
const handle = await cc.createCard({
  from: "Sam",
  to: "Alex",
  occasion: "birthday",
  relationship: "sibling",
  tone: "warm",
  style: "watercolor",
  note: "Can't wait to celebrate together this year!",
  memories: ["Loves matcha", "Just ran her first half-marathon"],
});

console.log(handle.id);     // -> use this to check status / load the card
console.log(handle.status); // -> "pending"
```

`createCard` is **non-blocking** — it returns as soon as the job is queued.
Generation continues server-side; poll for it (next sections) or use the
blocking helper below.

### Create and wait in one call

When you'd rather block until the card is finished:

```ts
const card = await cc.createCardAndWait({
  from: "Sam",
  to: "Alex",
  occasion: "anniversary",
});

console.log(card.copy);   // { greeting, body, signoff, ... }
console.log(card.images); // generated panel art (when produced)
```

### Safe retries with an idempotency key

Pass a stable `key` to guarantee a request only ever creates one card, even if
you retry after a network blip. Reusing the key returns the same card.

```ts
await cc.createCard({ from: "Sam", to: "Alex", key: `bday:${alexId}:2026` });
```

If you omit `key`, the client generates a unique one per call automatically.

---

## Card status

A card moves through three states:

| Status      | Meaning                                          |
| ----------- | ------------------------------------------------ |
| `"pending"` | Queued or generating — not ready yet.            |
| `"ready"`   | Finished; `copy`/`images` are available.         |
| `"failed"`  | Generation failed or was cancelled.              |

Check it with the card id:

```ts
const status = await cc.getStatus(handle.id);

if (status === "ready") {
  const card = await cc.getCard(handle.id);
} else if (status === "failed") {
  // surface an error / offer a retry
}
```

### Wait for readiness

`waitForCard` polls until the card is `ready` or `failed`, honoring the server's
suggested retry interval and giving up after `jobTimeoutMs` (default 2 minutes):

```ts
const card = await cc.waitForCard(handle.id);
```

A typical create-then-wait flow:

```ts
const { id } = await cc.createCard({ from: "Sam", to: "Alex" });
// ... do other work, store `id`, return to the user ...
const card = await cc.waitForCard(id);
```

---

## Loading cards

Load a card (with its finished copy and images once ready) by id:

```ts
const card = await cc.getCard(handle.id);

if (card.ready) {
  renderGreeting(card.copy);
  renderArt(card.images);
} else {
  showSpinner(); // still pending
}
```

`getCard` returns a full [`Card`](#type-reference): `id`, `status`, `ready`,
`copy`, `images`, `generatedBy`, and the untouched `raw` job result if you need
fields the simple client doesn't surface.

---

## Batch operations

Generate or load many cards at once. Batch methods run with bounded concurrency
(default 4, configurable), **preserve input order**, and return a
`BatchResult<T>` per item so one failure never sinks the whole batch.

### Create a batch

```ts
const results = await cc.createCardsAndWait(
  [
    { from: "Sam", to: "Alex", occasion: "birthday" },
    { from: "Sam", to: "Jordan", occasion: "thank you" },
    { from: "Sam", to: "Pat", occasion: "congrats" },
  ],
  { concurrency: 3 },
);

for (const result of results) {
  if (result.ok) {
    console.log("card ready:", result.value.copy);
  } else {
    console.error("failed:", result.error);
  }
}
```

Prefer non-blocking? `createCards(...)` returns handles immediately instead of
waiting for each card to finish:

```ts
const handles = await cc.createCards(requests);
const ids = handles.flatMap((r) => (r.ok ? [r.value.id] : []));
```

### Load / wait for a batch

```ts
// Load current state of many cards
const loaded = await cc.getCards(ids);

// Or block until they're all finished
const finished = await cc.waitForCards(ids, { concurrency: 5 });
```

### Inspecting batch results

```ts
const ok = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
console.log(`${ok.length} succeeded, ${failed.length} failed`);
```

---

## Concierge chat

Ask the AI concierge for help writing a message and get plain text back:

```ts
const reply = await cc.chat("Help me thank my mentor for years of guidance", {
  recipient: "Dr. Lee",
  memories: ["Sponsored my first conference talk"],
});
```

---

## Public gallery

Browse admin-approved featured cards — no token required:

```ts
const featured = await cc.featuredCards();
```

---

## Error handling

Every failure throws a typed error you can branch on. Import them from the
package root:

```ts
import {
  AuthenticationError,
  RateLimitError,
  ValidationError,
  JobPollTimeoutError,
  CustomCardApiError,
} from "@customcard/sdk";

try {
  const card = await cc.createCardAndWait({ from: "Sam", to: "Alex" });
} catch (err) {
  if (err instanceof AuthenticationError) {
    cc.setToken(await refreshToken());            // expired/invalid token
  } else if (err instanceof RateLimitError) {
    await wait(err.retryAfterSeconds ?? 1);       // backoff hint from the API
  } else if (err instanceof ValidationError) {
    showFieldErrors(err.body);                    // bad input
  } else if (err instanceof JobPollTimeoutError) {
    // generation took longer than jobTimeoutMs — keep the id and retry later
  } else if (err instanceof CustomCardApiError) {
    console.error(err.statusCode, err.status, err.route);
  }
}
```

In batch methods these arrive as `{ ok: false, error }` entries rather than
thrown exceptions.

The client already retries transient failures (timeouts, 429, 5xx) with
exponential backoff before throwing.

---

## Configuration reference

```ts
new CustomCard({
  baseUrl: "https://customcard-three.vercel.app", // required
  token,            // string | () => string | Promise<string>  (customer token / Clerk JWT)
  timeoutMs: 30_000,   // per-request timeout
  jobTimeoutMs: 120_000, // how long waitForCard / *AndWait poll before giving up
  concurrency: 4,      // default parallelism for batch operations
});
```

| Option         | Default  | Purpose                                            |
| -------------- | -------- | -------------------------------------------------- |
| `baseUrl`      | —        | API origin (no `/api` suffix). Required.           |
| `token`        | —        | Customer auth; string or (async) provider.         |
| `timeoutMs`    | `30000`  | Per-request timeout.                               |
| `jobTimeoutMs` | `120000` | Polling budget for `waitForCard` / `*AndWait`.     |
| `concurrency`  | `4`      | Default concurrency for batch operations.          |

---

## Type reference

```ts
type CardStatus = "pending" | "ready" | "failed";

interface CardRequest {
  from: string;            // sender
  to: string;              // recipient
  occasion?: string;       // "birthday", "thank you", ...
  relationship?: string;   // "friend", "sibling", ...
  tone?: string;           // "warm", "funny", ...
  style?: string;          // visual direction
  language?: string;       // BCP-47, e.g. "en", "es"
  note?: string;           // your own words to anchor the message
  memories?: string[];     // approved relationship facts
  key?: string;            // idempotency key for safe retries
}

interface CardHandle {
  id: string;              // pass to getCard / getStatus / waitForCard
  status: CardStatus;
}

interface Card {
  id: string;
  status: CardStatus;
  ready: boolean;          // true once status === "ready"
  copy: Record<string, unknown>;   // greeting, body, sign-off, ...
  images: unknown[];       // generated panel art
  generatedBy?: string;    // provider or deterministic fallback
  raw: Record<string, unknown>;    // full underlying job result
}

type BatchResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };
```

### Method summary

| Method                                   | Returns                       | Blocks? |
| ---------------------------------------- | ----------------------------- | ------- |
| `ping()`                                 | `boolean`                     | —       |
| `setToken(token)`                        | `void`                        | —       |
| `createCard(req)`                        | `CardHandle`                  | no      |
| `createCardAndWait(req)`                 | `Card`                        | yes     |
| `getStatus(id)`                          | `CardStatus`                  | no      |
| `getCard(id)`                            | `Card`                        | no      |
| `waitForCard(id)`                        | `Card`                        | yes     |
| `createCards(reqs, { concurrency })`     | `BatchResult<CardHandle>[]`   | no      |
| `createCardsAndWait(reqs, { … })`        | `BatchResult<Card>[]`         | yes     |
| `getCards(ids, { concurrency })`         | `BatchResult<Card>[]`         | no      |
| `waitForCards(ids, { concurrency })`     | `BatchResult<Card>[]`         | yes     |
| `chat(message, opts)`                    | `string`                      | yes     |
| `featuredCards()`                        | `unknown[]`                   | yes     |
| `advanced`                               | `CustomCardClient`            | —       |
```
