// Redaction helpers: anything that could carry a credential or customer
// content must pass through here before being logged or attached to an error.

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|authorization|cookie|session|credential|api[-_]?key|email|phone|imageBase64/i;

const JWT_PATTERN = /[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const BEARER_PATTERN = /Bearer\s+[^\s"']+/gi;

export function redactText(value: string): string {
  return value.replace(BEARER_PATTERN, "Bearer [redacted]").replace(JWT_PATTERN, "[redacted-jwt]");
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redactValue(entry, depth + 1);
    }
    return out;
  }
  return value;
}

/** Dev-only logger; release builds stay silent and never log payloads. */
export function devLog(message: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail === undefined) {
    console.warn(redactText(message));
    return;
  }
  console.warn(redactText(message), redactValue(detail));
}
