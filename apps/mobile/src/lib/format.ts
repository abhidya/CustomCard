// Small presentation helpers shared across screens.

/** Turn API status slugs like "needs-review" / "vendor_handoff_ready" into
 *  human-friendly "Needs review" / "Vendor handoff ready". */
export function humanizeStatus(value: string): string {
  const words = value.replace(/[-_]+/g, " ").trim();
  if (!words) return value;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Format integer cents as a localized currency string (USD by default). */
export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

/** Short, locale-aware date (e.g. "Jul 1"). Falls back to the raw value. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Longer date (e.g. "July 1, 2026"). Falls back to the raw value. */
export function formatLongDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
