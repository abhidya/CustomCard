import { normalizeBrowserImageUrl } from "./browserImageUrl";

const supportedImageMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function materializeBrowserImageUrlForSvg(
  imageUrl: string,
  fetchImage: (url: string) => Promise<Response> = (url) => fetch(url, { cache: "no-store" })
): Promise<string> {
  const normalized = normalizeBrowserImageUrl(imageUrl);
  if (!normalized) throw new Error("Generated panel image URL is not safe to display.");
  if (normalized.startsWith("data:image/")) return normalized;

  const response = await fetchImage(normalized);
  if (!response.ok) throw new Error("Generated panel image could not be fetched for proof rendering.");

  const mimeType = imageMimeType(response.headers.get("content-type")) ?? inferImageMimeType(normalized);
  if (!mimeType) throw new Error("Generated panel image returned an unsupported content type.");

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error("Generated panel image was empty.");
  return `data:${mimeType};base64,${bytesToBase64(bytes)}`;
}

function imageMimeType(value: string | null): string | undefined {
  const mimeType = String(value ?? "").split(";")[0]?.trim().toLowerCase();
  return supportedImageMimeTypes.has(mimeType) ? mimeType : undefined;
}

function inferImageMimeType(url: string): string | undefined {
  const pathname = url.split("?")[0]?.toLowerCase() ?? "";
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  return undefined;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa !== "function") throw new Error("Browser cannot encode generated panel image.");
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}
