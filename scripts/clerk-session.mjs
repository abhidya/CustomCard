import { createPublicKey, verify as cryptoVerify } from "node:crypto";

/**
 * Offline Clerk session-token verification for the CustomCard API runtime.
 *
 * The browser sends the Clerk session JWT as `Authorization: Bearer <jwt>`.
 * The API runtime first checks `auth_sessions`; when the token is unknown it
 * calls `verifyClerkSessionToken` to verify the RS256 signature against the
 * `CLERK_JWT_KEY` PEM public key (no network call), then mints a durable
 * `auth_sessions` row so later requests take the fast path.
 */

const clockSkewMs = 60_000;

export function looksLikeJwt(token) {
  const text = String(token ?? "");
  if (text.split(".").length !== 3) return false;
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text);
}

export function clerkVerificationConfigured(env = process.env) {
  return Boolean(normalizeClerkPem(env.CLERK_JWT_KEY));
}

export function verifyClerkSessionToken(token, env = process.env, { nowMs = Date.now() } = {}) {
  const pem = normalizeClerkPem(env.CLERK_JWT_KEY);
  if (!pem) return failure("clerk-not-configured", "CLERK_JWT_KEY is not configured; Clerk bearer tokens cannot be verified.");
  if (!looksLikeJwt(token)) return failure("not-a-jwt", "Bearer token is not a Clerk session JWT.");

  const [encodedHeader, encodedPayload, encodedSignature] = String(token).split(".");
  const header = decodeJwtJson(encodedHeader);
  const payload = decodeJwtJson(encodedPayload);
  if (!header || !payload) return failure("malformed-jwt", "Clerk session token could not be decoded.");
  if (header.alg !== "RS256") return failure("unsupported-algorithm", `Clerk session tokens must use RS256, got ${String(header.alg)}.`);

  let signatureValid = false;
  try {
    const publicKey = createPublicKey(pem);
    signatureValid = cryptoVerify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, "base64url")
    );
  } catch {
    return failure("invalid-public-key", "CLERK_JWT_KEY is not a usable PEM public key.");
  }
  if (!signatureValid) return failure("invalid-signature", "Clerk session token signature did not verify.");

  const expiresAtMs = Number(payload.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs + clockSkewMs < nowMs) {
    return failure("expired", "Clerk session token is expired.");
  }
  const notBeforeMs = Number(payload.nbf) * 1000;
  if (Number.isFinite(notBeforeMs) && notBeforeMs - clockSkewMs > nowMs) {
    return failure("not-yet-valid", "Clerk session token is not valid yet.");
  }

  const authorizedParties = parseList(env.CLERK_AUTHORIZED_PARTIES);
  const azp = String(payload.azp ?? "").trim();
  if (authorizedParties.length > 0 && azp && !authorizedParties.includes(azp)) {
    return failure("unauthorized-party", "Clerk session token azp is not an authorized party.");
  }

  const clerkUserId = String(payload.sub ?? "").trim();
  if (!clerkUserId) return failure("missing-subject", "Clerk session token has no subject.");

  const email = readEmailClaim(payload);
  const role = resolveRole(payload, email, env);

  return {
    ok: true,
    provider: "clerk",
    clerkUserId,
    clerkSessionId: String(payload.sid ?? "").trim() || `clerk-session-${clerkUserId}`,
    email,
    role,
    expiresAtSeconds: Math.floor(expiresAtMs / 1000)
  };
}

export function clerkAdminEmails(env = process.env) {
  return new Set(
    [...parseList(env.CUSTOMCARD_ADMIN_EMAILS), ...parseList(env.VITE_CUSTOMCARD_ADMIN_EMAILS)].map((value) =>
      value.toLowerCase()
    )
  );
}

function resolveRole(payload, email, env) {
  const metadata = payload.publicMetadata ?? payload.public_metadata ?? payload.metadata ?? {};
  const roleClaim = String(metadata.role ?? payload.role ?? "").trim().toLowerCase();
  const rolesClaim = Array.isArray(metadata.roles) ? metadata.roles.map((value) => String(value).toLowerCase()) : [];
  if (roleClaim === "admin" || rolesClaim.includes("admin")) return "admin";
  if (email && clerkAdminEmails(env).has(email.toLowerCase())) return "admin";
  return "customer";
}

function readEmailClaim(payload) {
  for (const key of ["email", "primary_email", "primaryEmail", "email_address", "emailAddress"]) {
    const value = String(payload[key] ?? "").trim();
    if (value.includes("@")) return value;
  }
  return "";
}

function decodeJwtJson(segment) {
  try {
    return JSON.parse(Buffer.from(String(segment ?? ""), "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

function normalizeClerkPem(value) {
  const text = String(value ?? "").trim().replace(/\\n/g, "\n");
  if (!text || /^(replace|todo|changeme|example|placeholder|dummy)/i.test(text)) return "";
  if (text.includes("-----BEGIN")) return text;
  // Clerk dashboards sometimes show the raw base64 body without PEM armor.
  if (/^[A-Za-z0-9+/=\s]+$/.test(text)) {
    const body = text.replace(/\s+/g, "");
    const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
    return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
  }
  return "";
}

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function failure(status, detail) {
  return { ok: false, status, detail };
}
