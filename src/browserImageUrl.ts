export function normalizeBrowserImageUrl(value: string | null | undefined): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (text.startsWith("data:image/")) return text;
  if (text.startsWith("/") && !text.startsWith("//")) return text;

  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    return undefined;
  }

  if (parsed.pathname === "/api/artifacts" || parsed.pathname.startsWith("/api/artifacts/")) {
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  return undefined;
}
