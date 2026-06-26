const delegatedPathParam = "__customcard_path";
const hopByHopHeaders = new Set(["connection", "content-encoding", "content-length", "keep-alive", "transfer-encoding", "upgrade"]);

export async function delegateApiRequest(request, response) {
  const originalUrl = resolveRequestUrl(request);
  const delegatedUrl = new URL("/api/_route", originalUrl.origin);
  delegatedUrl.searchParams.set(delegatedPathParam, originalUrl.pathname);
  for (const [key, value] of originalUrl.searchParams) {
    delegatedUrl.searchParams.append(key, value);
  }

  const upstream = await fetch(delegatedUrl, {
    method: request.method,
    headers: buildForwardHeaders(request.headers),
    body: shouldForwardBody(request.method) ? await readRequestBody(request) : undefined
  });

  response.statusCode = upstream.status;
  upstream.headers.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) response.setHeader(key, value);
  });
  response.end(Buffer.from(await upstream.arrayBuffer()));
}

function resolveRequestUrl(request) {
  const host = request.headers?.host ?? process.env.VERCEL_URL ?? "customcard.local";
  return new URL(request.url, `https://${host}`);
}

function buildForwardHeaders(headers = {}) {
  const forwarded = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (hopByHopHeaders.has(key.toLowerCase()) || key.toLowerCase() === "host") continue;
    if (Array.isArray(value)) {
      for (const item of value) forwarded.append(key, item);
    } else if (value !== undefined) {
      forwarded.set(key, String(value));
    }
  }
  forwarded.set("x-customcard-vercel-delegate", "1");
  return forwarded;
}

function shouldForwardBody(method = "GET") {
  return !["GET", "HEAD"].includes(method.toUpperCase());
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
