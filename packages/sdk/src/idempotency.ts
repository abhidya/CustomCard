/**
 * Idempotency-key generation.
 *
 * Every mutating CustomCard route requires an `X-Idempotency-Key` header so the
 * server can safely replay a retried request without duplicating side effects.
 * The SDK generates a key automatically for each mutation unless the caller
 * supplies their own via {@link RequestOptions.idempotencyKey}.
 */

/**
 * Generate a RFC-4122 v4 UUID using the best primitive available in the host
 * environment (Node 18+, modern browsers, Workers all expose `crypto`).
 */
export function generateIdempotencyKey(): string {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;

  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }

  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // Per RFC 4122 §4.4: set version (4) and variant (10xx) bits.
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex: string[] = [];
    for (let i = 0; i < 256; i++) hex.push((i + 0x100).toString(16).slice(1));
    return (
      hex[bytes[0]!]! +
      hex[bytes[1]!]! +
      hex[bytes[2]!]! +
      hex[bytes[3]!]! +
      "-" +
      hex[bytes[4]!]! +
      hex[bytes[5]!]! +
      "-" +
      hex[bytes[6]!]! +
      hex[bytes[7]!]! +
      "-" +
      hex[bytes[8]!]! +
      hex[bytes[9]!]! +
      "-" +
      hex[bytes[10]!]! +
      hex[bytes[11]!]! +
      hex[bytes[12]!]! +
      hex[bytes[13]!]! +
      hex[bytes[14]!]! +
      hex[bytes[15]!]!
    );
  }

  // Last-resort fallback. Not cryptographically strong, but unique enough for
  // dedup on environments without a crypto implementation.
  return `idem-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
}
