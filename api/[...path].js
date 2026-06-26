import { handleApiRequest } from "../scripts/api-server.mjs";

export default async function handler(request, response) {
  rewriteDelegatedApiRequest(request);
  await handleApiRequest(request, response);
}

function rewriteDelegatedApiRequest(request) {
  const host = request.headers?.host ?? "customcard.local";
  const url = new URL(request.url, `https://${host}`);
  if (url.pathname !== "/api/_route") return;

  const delegatedPath = url.searchParams.get("__customcard_path");
  if (!delegatedPath?.startsWith("/api/")) return;

  url.pathname = delegatedPath;
  url.searchParams.delete("__customcard_path");
  request.url = `${url.pathname}${url.search}`;
}
