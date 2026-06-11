import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const maxSignedUrlMinutes = 60;
const defaultSignedUrlMinutes = 15;
const maxArtifactCount = 12;
const maxArtifactBytes = 8_000_000;
const memoryStores = new Map();

export function createObjectStoreRuntime({ env = process.env, fetchImpl = (...args) => globalThis.fetch(...args), now = () => new Date() } = {}) {
  const config = resolveObjectStoreConfig(env);
  const client = config.configured ? createObjectStoreClient({ config, fetchImpl }) : undefined;

  return {
    describe() {
      return {
        configured: config.configured,
        provider: config.provider,
        endpoint: config.safeEndpoint,
        bucket: config.bucket || null,
        publicBaseUrl: config.publicBaseUrl || null,
        signedUrlTtlMinutes: config.expiresInMinutes,
        liveNetworkCalls: config.liveNetworkCalls,
        credentialMode: config.readCredentialsConfigured ? "write-read-split" : config.writeCredentialsConfigured ? "writer-shared" : "unconfigured",
        blockers: config.blockers
      };
    },
    validate() {
      return config.required ? config.blockers.map((blocker) => `Object store persistence: ${blocker}`) : [];
    },
    async persistRenderPacketArtifacts({ record, bodyText }) {
      const body = parseJsonBody(bodyText);
      const sourceArtifacts = parseRenderArtifacts(body);
      if (sourceArtifacts.length === 0) {
        return {
          record,
          payload: {
            artifactPersistence: {
              status: "skipped",
              reason: "no-artifacts-provided",
              storageProvider: record.storageProvider,
              liveNetworkCalls: false
            }
          }
        };
      }
      if (!config.configured || !client) {
        return {
          record: {
            ...record,
            kind: "blocked",
            artifactManifest: {
              ...record.artifactManifest,
              persistenceStatus: "blocked",
              blockers: config.blockers.length ? config.blockers : ["Object store persistence is not configured."]
            }
          },
          payload: {
            artifactPersistence: {
              status: "blocked",
              blockers: config.blockers.length ? config.blockers : ["Object store persistence is not configured."],
              liveNetworkCalls: false
            }
          }
        };
      }

      const expiresAtIso = signedUrlExpiry(config.expiresInMinutes, now());
      const normalizedArtifacts = sourceArtifacts.map((artifact) =>
        buildStoredArtifact({
          artifact,
          projectId: record.projectId,
          renderPacketId: record.id,
          expiresAtIso,
          config
        })
      );
      const blockers = validateStoredArtifacts(normalizedArtifacts);
      if (blockers.length === 0) {
        for (const artifact of normalizedArtifacts) {
          await client.putObject({
            key: artifact.objectKey,
            body: artifact.body,
            contentType: artifact.mimeType,
            metadata: {
              projectId: record.projectId,
              renderPacketId: record.id,
              fileName: artifact.fileName,
              kind: artifact.kind,
              contentHash: artifact.contentHash,
              realOrdersEnabled: "false"
            }
          });
          const readback = await client.getObject({ key: artifact.objectKey });
          if (!readback.body.equals(artifact.body)) blockers.push(`Artifact readback mismatch: ${artifact.fileName}`);
        }
      }

      const manifest = {
        renderPacketId: record.id,
        projectId: record.projectId,
        storageProvider: "s3-compatible",
        objectStoreUrl: config.safeEndpoint,
        bucket: config.bucket,
        artifactCount: normalizedArtifacts.length,
        artifacts: normalizedArtifacts.map(stripRuntimeBody),
        manifestChecksum: record.checksum,
        signedUrlExpiresAt: expiresAtIso,
        externalShareApprovalRequired: true,
        realOrdersEnabled: false,
        width: 1500,
        height: 2100,
        dpi: 300,
        locale: record.locale,
        direction: record.direction,
        safeZonePassed: record.safeZonePassed,
        textOverflow: record.textOverflow,
        persistenceStatus: blockers.length === 0 ? "stored" : "blocked",
        liveNetworkCalls: config.liveNetworkCalls,
        blockers
      };
      const manifestKey = `projects/${record.projectId}/render-packets/${record.id}/artifact-handoff-manifest.json`;
      const manifestBody = Buffer.from(JSON.stringify(manifest, null, 2), "utf8");
      if (blockers.length === 0) {
        await client.putObject({
          key: manifestKey,
          body: manifestBody,
          contentType: "application/json",
          metadata: {
            projectId: record.projectId,
            renderPacketId: record.id,
            artifactRole: "handoff-manifest",
            realOrdersEnabled: "false"
          }
        });
      }

      const nextRecord = {
        ...record,
        kind: blockers.length === 0 ? record.kind : "blocked",
        artifactUri: buildArtifactUri(config, manifestKey),
        storageProvider: "s3-compatible",
        artifactCount: normalizedArtifacts.length,
        artifactManifest: manifest,
        signedUrlExpiresAt: expiresAtIso,
        signedArtifactUrls: normalizedArtifacts.map((artifact) => artifact.signedDownload)
      };

      return {
        record: nextRecord,
        payload: {
          signedArtifactUrls: nextRecord.signedArtifactUrls,
          artifactPersistence: {
            status: blockers.length === 0 ? "stored" : "blocked",
            storageProvider: "s3-compatible",
            provider: config.provider,
            bucket: config.bucket,
            artifactCount: normalizedArtifacts.length,
            verifiedWrites: blockers.length === 0 ? normalizedArtifacts.length : 0,
            manifestStored: blockers.length === 0,
            liveNetworkCalls: config.liveNetworkCalls,
            blockers
          }
        }
      };
    },
    async readSignedArtifact({ objectKey, query }) {
      if (!config.configured || !client) {
        return { statusCode: 503, payload: { status: "artifact-store-unconfigured", blockers: config.blockers } };
      }
      const validation = validateSignedArtifactRequest({ objectKey, query, signingSecret: config.signingSecret, now: now() });
      if (!validation.ok) return validation;
      const stored = await client.getObject({ key: objectKey, readOnly: true });
      const storedHash = contentHash(stored.body);
      if (storedHash !== validation.contentHash) {
        return {
          statusCode: 409,
          payload: {
            status: "artifact-hash-mismatch",
            expected: validation.contentHash,
            actual: storedHash
          }
        };
      }
      return {
        statusCode: 200,
        body: stored.body,
        contentType: stored.contentType,
        cacheControl: "private, max-age=60"
      };
    }
  };
}

function resolveObjectStoreConfig(env) {
  const endpoint = trimTrailingSlash(env.OBJECT_STORE_URL ?? "");
  const bucket = env.OBJECT_STORE_BUCKET ?? "";
  const accessKeyId = env.OBJECT_STORE_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID ?? "";
  const secretAccessKey = env.OBJECT_STORE_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY ?? "";
  const readAccessKeyId = env.OBJECT_STORE_READ_ACCESS_KEY_ID ?? "";
  const readSecretAccessKey = env.OBJECT_STORE_READ_SECRET_ACCESS_KEY ?? "";
  const signingSecret = env.OBJECT_STORE_SIGNING_SECRET ?? "";
  const region = env.OBJECT_STORE_REGION ?? env.AWS_REGION ?? "us-east-1";
  const expiresInMinutes = clampSignedUrlMinutes(env.ARTIFACT_SIGNED_URL_TTL_MINUTES);
  const provider = providerForEndpoint(endpoint);
  const publicBaseUrl = resolvePublicBaseUrl(env);
  const required = env.CUSTOMCARD_ARTIFACT_PERSISTENCE === "enabled" || Boolean(endpoint || bucket || accessKeyId || secretAccessKey);
  const blockers = [];

  if (required && !endpoint) blockers.push("OBJECT_STORE_URL is required.");
  if (required && !bucket) blockers.push("OBJECT_STORE_BUCKET is required.");
  if (required && !isSafeBucketName(bucket)) blockers.push(`OBJECT_STORE_BUCKET is not a safe bucket name: ${bucket}`);
  if (required && !accessKeyId) blockers.push("OBJECT_STORE_ACCESS_KEY_ID is required.");
  if (required && !secretAccessKey) blockers.push("OBJECT_STORE_SECRET_ACCESS_KEY is required.");
  if (required && signingSecret.length < 32) blockers.push("OBJECT_STORE_SIGNING_SECRET must be at least 32 characters.");
  if (required && !isSafePublicBaseUrl(publicBaseUrl)) blockers.push("OBJECT_STORE_PUBLIC_BASE_URL must be https or localhost/127.0.0.1 http.");
  if (required && !isSupportedEndpoint(endpoint)) blockers.push("OBJECT_STORE_URL must be memory://, http://, https://, or s3://.");

  return {
    configured: required && blockers.length === 0,
    required,
    provider,
    endpoint,
    safeEndpoint: redactEndpoint(endpoint),
    bucket,
    accessKeyId,
    secretAccessKey,
    readAccessKeyId,
    readSecretAccessKey,
    region,
    signingSecret,
    publicBaseUrl,
    expiresInMinutes,
    liveNetworkCalls: Boolean(endpoint && !endpoint.startsWith("memory://")),
    writeCredentialsConfigured: Boolean(accessKeyId && secretAccessKey),
    readCredentialsConfigured: Boolean(readAccessKeyId && readSecretAccessKey),
    blockers
  };
}

function createObjectStoreClient({ config, fetchImpl }) {
  if (config.endpoint.startsWith("memory://")) return createMemoryObjectStoreClient(config);
  return createSigV4ObjectStoreClient({ config, fetchImpl });
}

function createMemoryObjectStoreClient(config) {
  const storeKey = `${config.endpoint}/${config.bucket}`;
  const store = memoryStores.get(storeKey) ?? new Map();
  memoryStores.set(storeKey, store);
  return {
    async putObject(input) {
      store.set(input.key, {
        body: Buffer.from(input.body),
        contentType: input.contentType,
        metadata: { ...input.metadata }
      });
    },
    async getObject(input) {
      const object = store.get(input.key);
      if (!object) throw new Error(`Object not found: ${input.key}`);
      return {
        body: Buffer.from(object.body),
        contentType: object.contentType,
        metadata: { ...object.metadata }
      };
    }
  };
}

function createSigV4ObjectStoreClient({ config, fetchImpl }) {
  return {
    async putObject(input) {
      const headers = {
        "content-type": input.contentType,
        ...metadataHeaders(input.metadata)
      };
      await signedRequest({
        config,
        fetchImpl,
        method: "PUT",
        key: input.key,
        body: input.body,
        headers,
        expectedStatuses: [200]
      });
    },
    async getObject(input) {
      const readConfig = input.readOnly && config.readCredentialsConfigured
        ? {
            ...config,
            accessKeyId: config.readAccessKeyId,
            secretAccessKey: config.readSecretAccessKey
          }
        : config;
      const response = await signedRequest({
        config: readConfig,
        fetchImpl,
        method: "GET",
        key: input.key,
        body: Buffer.alloc(0),
        headers: {},
        expectedStatuses: [200]
      });
      return {
        body: response.body,
        contentType: response.contentType
      };
    }
  };
}

async function signedRequest({ config, fetchImpl, method, key, body, headers, expectedStatuses }) {
  const requestBody = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "");
  const requestHeaders = buildSignedHeaders({
    config,
    method,
    key,
    body: requestBody,
    headers
  });
  const response = await fetchImpl(`${trimTrailingSlash(config.endpoint)}${buildCanonicalUri(config.bucket, key)}`, {
    method,
    headers: requestHeaders,
    body: method === "GET" || method === "DELETE" ? undefined : requestBody
  });
  const responseBody = Buffer.from(await response.arrayBuffer());
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${method} ${config.bucket}/${key} expected ${expectedStatuses.join("/")} but got ${response.status}: ${responseBody.toString("utf8", 0, 500)}`);
  }
  return {
    status: response.status,
    body: responseBody,
    contentType: response.headers.get("content-type") ?? "application/octet-stream"
  };
}

function buildSignedHeaders({ config, method, key, body, headers }) {
  const url = new URL(config.endpoint);
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);
  const canonicalHeadersInput = normalizeHeaders({
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...headers
  });
  const signedHeaderNames = Object.keys(canonicalHeadersInput).sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${canonicalHeadersInput[name]}`).join("\n");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    buildCanonicalUri(config.bucket, key),
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    ...canonicalHeadersInput,
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function parseRenderArtifacts(body) {
  const rawArtifacts = Array.isArray(body.artifacts)
    ? body.artifacts
    : Array.isArray(body.files)
      ? body.files
      : Array.isArray(body.printFiles)
        ? body.printFiles
        : [];
  return rawArtifacts.slice(0, maxArtifactCount).map((artifact, index) => normalizeArtifact(artifact, index)).filter(Boolean);
}

function normalizeArtifact(artifact, index) {
  if (!artifact || typeof artifact !== "object") return undefined;
  const fileName = safeFileName(artifact.fileName ?? artifact.name ?? `artifact-${index + 1}.svg`);
  const mimeType = safeMimeType(artifact.mimeType ?? artifact.contentType ?? artifact.type ?? "image/svg+xml");
  const kind = safeArtifactKind(artifact.kind ?? "panel-svg");
  const body = artifactBody(artifact);
  if (!body || body.length === 0 || body.length > maxArtifactBytes) return undefined;
  return {
    kind,
    fileName,
    mimeType,
    body,
    panelId: safePanelId(artifact.panelId)
  };
}

function buildStoredArtifact({ artifact, projectId, renderPacketId, expiresAtIso, config }) {
  const objectKey = `projects/${projectId}/render-packets/${renderPacketId}/${artifact.fileName}`;
  const artifactHash = contentHash(artifact.body);
  const signaturePayload = signaturePayloadFor(projectId, objectKey, artifactHash, expiresAtIso);
  const signature = createHmac("sha256", config.signingSecret).update(signaturePayload).digest("hex");
  return {
    kind: artifact.kind,
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
    byteLength: artifact.body.length,
    contentHash: artifactHash,
    objectKey,
    artifactUri: buildArtifactUri(config, objectKey),
    signedDownload: {
      method: "GET",
      url: buildSignedUrl(config.publicBaseUrl, objectKey, artifactHash, expiresAtIso, signature),
      expiresAtIso,
      signature,
      signatureVersion: "hmac-sha256-v1",
      signaturePayload
    },
    ...(artifact.panelId ? { panelId: artifact.panelId } : {}),
    body: artifact.body
  };
}

function validateStoredArtifacts(artifacts) {
  const blockers = [];
  const keys = new Set();
  if (artifacts.length === 0) blockers.push("At least one render artifact is required for object-store persistence.");
  for (const artifact of artifacts) {
    if (!isSafeObjectKey(artifact.objectKey)) blockers.push(`Unsafe artifact object key: ${artifact.objectKey}`);
    if (keys.has(artifact.objectKey)) blockers.push(`Duplicate artifact object key: ${artifact.objectKey}`);
    keys.add(artifact.objectKey);
    if (artifact.byteLength <= 0 || artifact.byteLength > maxArtifactBytes) blockers.push(`Invalid artifact byte length: ${artifact.fileName}`);
  }
  return blockers;
}

function stripRuntimeBody(artifact) {
  const { body, signedDownload, ...rest } = artifact;
  return rest;
}

function validateSignedArtifactRequest({ objectKey, query, signingSecret, now }) {
  if (!isSafeObjectKey(objectKey)) {
    return { ok: false, statusCode: 400, payload: { status: "invalid-artifact-key" } };
  }
  const expires = Number(query.get("expires") ?? 0);
  const contentHashValue = String(query.get("contentHash") ?? "");
  const signature = String(query.get("signature") ?? "");
  const version = String(query.get("v") ?? "");
  if (version !== "hmac-sha256-v1" || !Number.isFinite(expires) || !contentHashValue || !signature) {
    return { ok: false, statusCode: 400, payload: { status: "invalid-artifact-signature-params" } };
  }
  if (expires * 1000 <= now.getTime()) {
    return { ok: false, statusCode: 410, payload: { status: "artifact-url-expired" } };
  }
  const projectId = objectKey.split("/")[1] ?? "";
  const expiresAtIso = new Date(expires * 1000).toISOString();
  const expected = createHmac("sha256", signingSecret)
    .update(signaturePayloadFor(projectId, objectKey, contentHashValue, expiresAtIso))
    .digest("hex");
  if (!safeEqualHex(signature, expected)) {
    return { ok: false, statusCode: 403, payload: { status: "artifact-signature-invalid" } };
  }
  return { ok: true, contentHash: contentHashValue };
}

function artifactBody(artifact) {
  if (typeof artifact.text === "string") return Buffer.from(artifact.text, "utf8");
  if (typeof artifact.body === "string") return Buffer.from(artifact.body, "utf8");
  if (typeof artifact.base64 === "string") return Buffer.from(stripDataUrlPrefix(artifact.base64), "base64");
  if (typeof artifact.dataUrl === "string") return Buffer.from(stripDataUrlPrefix(artifact.dataUrl), "base64");
  return undefined;
}

function stripDataUrlPrefix(value) {
  const comma = value.indexOf(",");
  return value.startsWith("data:") && comma >= 0 ? value.slice(comma + 1) : value;
}

function buildSignedUrl(publicBaseUrl, objectKey, artifactHash, expiresAtIso, signature) {
  const params = new URLSearchParams({
    expires: String(Math.floor(Date.parse(expiresAtIso) / 1000)),
    contentHash: artifactHash,
    signature,
    v: "hmac-sha256-v1"
  });
  return `${trimTrailingSlash(publicBaseUrl)}/${encodeObjectPath(objectKey)}?${params.toString()}`;
}

function buildArtifactUri(config, objectKey) {
  return `${trimTrailingSlash(config.endpoint)}/${encodePathSegment(config.bucket)}/${encodeObjectPath(objectKey)}`;
}

function signaturePayloadFor(projectId, objectKey, artifactHash, expiresAtIso) {
  return ["GET", projectId, objectKey, artifactHash, expiresAtIso].join("\n");
}

function contentHash(value) {
  return `sha256-${sha256Hex(value)}`;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function buildCanonicalUri(bucket, key) {
  return `/${encodePathSegment(bucket)}${key ? `/${encodeObjectPath(key)}` : ""}`;
}

function metadataHeaders(metadata) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      `x-amz-meta-${key.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase()}`,
      String(value)
    ])
  );
}

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = String(value).trim().replace(/\s+/g, " ");
  }
  return normalized;
}

function resolvePublicBaseUrl(env) {
  if (env.OBJECT_STORE_PUBLIC_BASE_URL) return trimTrailingSlash(env.OBJECT_STORE_PUBLIC_BASE_URL);
  if (env.CUSTOMCARD_PUBLIC_BASE_URL) return `${trimTrailingSlash(env.CUSTOMCARD_PUBLIC_BASE_URL)}/api/artifacts`;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "")}/api/artifacts`;
  return `http://127.0.0.1:${env.PORT ?? 4173}/api/artifacts`;
}

function signedUrlExpiry(minutes, fromDate) {
  return new Date(fromDate.getTime() + minutes * 60_000).toISOString();
}

function clampSignedUrlMinutes(value) {
  const parsed = Number(value ?? defaultSignedUrlMinutes);
  return Number.isInteger(parsed) && parsed >= 5 && parsed <= maxSignedUrlMinutes ? parsed : defaultSignedUrlMinutes;
}

function providerForEndpoint(endpoint) {
  if (endpoint.includes(".r2.cloudflarestorage.com")) return "cloudflare-r2";
  if (endpoint.startsWith("memory://")) return "memory-s3-compatible";
  if (endpoint.includes("minio")) return "minio";
  return endpoint ? "s3-compatible" : "unconfigured";
}

function redactEndpoint(endpoint) {
  return endpoint.replace(/(https?:\/\/)[^./]+(\.r2\.cloudflarestorage\.com)/, "$1{account_id}$2");
}

function isSupportedEndpoint(value) {
  return value.startsWith("memory://") || value.startsWith("https://") || value.startsWith("http://") || value.startsWith("s3://");
}

function isSafeBucketName(value) {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value) && !value.includes("..") && !/^\d+\.\d+\.\d+\.\d+$/.test(value);
}

function isSafeObjectKey(value) {
  if (!value || value.includes("\\") || value.startsWith("/")) return false;
  return value.split("/").every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..");
}

function isSafePublicBaseUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol !== "http:") return false;
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function safeFileName(value) {
  return String(value ?? "artifact.svg").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "artifact.svg";
}

function safeMimeType(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (["image/svg+xml", "image/png", "image/jpeg", "image/webp", "application/pdf", "application/json"].includes(text)) return text;
  return "application/octet-stream";
}

function safeArtifactKind(value) {
  const text = String(value ?? "").trim();
  return ["panel-svg", "panel-png", "combined-pdf", "manifest-json", "generated-image"].includes(text) ? text : "panel-svg";
}

function safePanelId(value) {
  const text = String(value ?? "").trim();
  return text ? text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) : undefined;
}

function safeEqualHex(actual, expected) {
  if (!/^[a-f0-9]+$/i.test(actual) || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function parseJsonBody(bodyText) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

function encodeObjectPath(value) {
  return value.split("/").map(encodePathSegment).join("/");
}

function encodePathSegment(value) {
  return encodeURIComponent(value);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
