import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";

const requiredGate = "enabled";
const guardValue = process.env.CUSTOMCARD_S3_ARTIFACT_DOCTOR;
const endpoint = trimTrailingSlash(process.env.OBJECT_STORE_URL ?? "");
const configuredBucket = process.env.OBJECT_STORE_BUCKET ?? "customcard-ci-artifacts";
const accessKeyId = process.env.OBJECT_STORE_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.OBJECT_STORE_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "";
const region = process.env.OBJECT_STORE_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const signingSecret = process.env.OBJECT_STORE_SIGNING_SECRET ?? "";
const expiresInMinutes = Number(process.env.ARTIFACT_SIGNED_URL_TTL_MINUTES ?? 15);

if (guardValue !== requiredGate) {
  console.error("Set CUSTOMCARD_S3_ARTIFACT_DOCTOR=enabled to run the live S3-compatible artifact doctor.");
  process.exit(1);
}

const startupBlockers = validateStartupConfig();
if (startupBlockers.length > 0) {
  console.error(startupBlockers.join("\n"));
  process.exit(1);
}

const bucket = buildDoctorBucketName(configuredBucket);
const client = new SigV4S3CompatibleArtifactClient({ endpoint, accessKeyId, secretAccessKey, region });
const blockers = [];
const cleanupWarnings = [];
let vite;
let result;
let exitCode = 0;
let finalStatus = "blocked";

try {
  vite = await createViteServer({ appType: "custom", logLevel: "error", server: { middlewareMode: true } });
  const { buildArtifactHandoffContract, validateArtifactHandoffContract } = await vite.ssrLoadModule("/src/artifactHandoff.ts");
  const { writeS3CompatibleArtifactStore } = await vite.ssrLoadModule("/src/artifactStore.ts");
  const { buildSamplePrintExportPackage } = await vite.ssrLoadModule("/src/printExport.ts");

  const printPackage = buildSamplePrintExportPackage();
  const publicBaseUrl = process.env.OBJECT_STORE_PUBLIC_BASE_URL ?? buildPathStyleBucketUrl(endpoint, bucket);
  const handoff = await buildArtifactHandoffContract(printPackage, {
    projectId: "project-live-s3",
    storageProvider: "s3-compatible",
    objectStoreUrl: endpoint,
    publicBaseUrl,
    bucket,
    signingSecret,
    expiresInMinutes,
    generatedAtIso: "2026-06-03T12:00:00.000Z"
  });

  blockers.push(...prefixBlockers("handoff", await validateArtifactHandoffContract(handoff, signingSecret)));

  await client.waitUntilReady();
  await client.createBucket(bucket);
  result = await writeS3CompatibleArtifactStore(printPackage, handoff, client);
  blockers.push(...prefixBlockers("s3-live", result.blockers));

  if (result.status !== "ready") blockers.push("Live S3-compatible artifact write result was blocked.");
  if (result.writes.length !== handoff.artifacts.length) blockers.push("Live S3-compatible artifact write count mismatch.");
  if (!result.writes.every((write) => write.verified)) blockers.push("Live S3-compatible artifact readback verification failed.");
  if (!result.manifestPath.startsWith(`s3://${bucket}/`)) blockers.push("Live S3-compatible manifest path is missing the doctor bucket.");
  if (client.putObjects !== 7) blockers.push("Live S3-compatible doctor should write six artifacts plus one manifest.");
  if (client.getObjects !== 7) blockers.push("Live S3-compatible doctor should read six artifacts plus one manifest.");

  finalStatus = blockers.length === 0 ? "ready" : "blocked";
  if (blockers.length > 0) exitCode = 1;
} catch (error) {
  blockers.push({ id: "artifact-store-s3-live-doctor", detail: error instanceof Error ? error.message : String(error) });
  finalStatus = "blocked";
  exitCode = 1;
} finally {
  await client.cleanupBucket(bucket).catch((error) => {
    cleanupWarnings.push({ id: "cleanup-live-s3-bucket", detail: error instanceof Error ? error.message : String(error) });
  });
  await vite?.close().catch(() => undefined);
  printReport(finalStatus);
}

if (exitCode !== 0) process.exit(exitCode);

class SigV4S3CompatibleArtifactClient {
  constructor({ endpoint, accessKeyId, secretAccessKey, region }) {
    this.endpoint = endpoint;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
    this.putObjects = 0;
    this.getObjects = 0;
    this.deletedObjects = 0;
    this.createdBuckets = new Set();
    this.keysByBucket = new Map();
  }

  async waitUntilReady() {
    let lastError;
    for (let attempt = 1; attempt <= 30; attempt += 1) {
      try {
        const healthUrl = `${this.endpoint}/minio/health/live`;
        const health = await fetch(healthUrl, { signal: AbortSignal.timeout(500) });
        if (health.ok) return;
        lastError = new Error(`MinIO health returned ${health.status}.`);
      } catch (error) {
        try {
          await this.request({ method: "GET", bucket: "", key: "", body: "", headers: {}, expectedStatuses: [200, 403] });
          return;
        } catch (fallbackError) {
          lastError = fallbackError instanceof Error ? fallbackError : error;
        }
      }
      await delay(500);
    }
    throw new Error(`S3-compatible endpoint did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  async createBucket(bucket) {
    await this.request({ method: "PUT", bucket, key: "", body: "", headers: {}, expectedStatuses: [200, 409] });
    this.createdBuckets.add(bucket);
  }

  async putObject(input) {
    const headers = {
      "content-type": input.contentType,
      ...metadataHeaders(input.metadata)
    };
    await this.request({
      method: "PUT",
      bucket: input.bucket,
      key: input.key,
      body: input.body,
      headers,
      expectedStatuses: [200]
    });
    this.putObjects += 1;
    const keys = this.keysByBucket.get(input.bucket) ?? new Set();
    keys.add(input.key);
    this.keysByBucket.set(input.bucket, keys);
  }

  async getObjectText(input) {
    const response = await this.request({
      method: "GET",
      bucket: input.bucket,
      key: input.key,
      body: "",
      headers: {},
      expectedStatuses: [200]
    });
    this.getObjects += 1;
    return response.body;
  }

  async deleteObject(bucket, key) {
    await this.request({ method: "DELETE", bucket, key, body: "", headers: {}, expectedStatuses: [204, 404] });
    this.deletedObjects += 1;
  }

  async deleteBucket(bucket) {
    await this.request({ method: "DELETE", bucket, key: "", body: "", headers: {}, expectedStatuses: [204, 404, 409] });
  }

  async cleanupBucket(bucket) {
    const keys = Array.from(this.keysByBucket.get(bucket) ?? []);
    for (const key of keys.reverse()) await this.deleteObject(bucket, key);
    if (this.createdBuckets.has(bucket)) await this.deleteBucket(bucket);
  }

  async request({ method, bucket, key, body, headers, expectedStatuses }) {
    const requestBody = body ?? "";
    const requestHeaders = buildSignedHeaders({
      endpoint: this.endpoint,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: this.region,
      method,
      bucket,
      key,
      body: requestBody,
      headers
    });
    const response = await fetch(`${this.endpoint}${buildCanonicalUri(bucket, key)}`, {
      method,
      headers: requestHeaders,
      body: method === "GET" || method === "DELETE" ? undefined : requestBody
    });
    const responseBody = await response.text();
    if (!expectedStatuses.includes(response.status)) {
      throw new Error(`${method} ${bucket}${key ? `/${key}` : ""} expected ${expectedStatuses.join("/")} but got ${response.status}: ${responseBody.slice(0, 500)}`);
    }
    return { status: response.status, body: responseBody };
  }
}

function buildSignedHeaders({ endpoint, accessKeyId, secretAccessKey, region, method, bucket, key, body, headers }) {
  const url = new URL(endpoint);
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
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${canonicalHeadersInput[name]}`)
    .join("\n");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    method,
    buildCanonicalUri(bucket, key),
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signingKey = hmac(
    hmac(
      hmac(
        hmac(`AWS4${secretAccessKey}`, dateStamp),
        region
      ),
      "s3"
    ),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    ...canonicalHeadersInput,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = String(value).trim().replace(/\s+/g, " ");
  }
  return normalized;
}

function metadataHeaders(metadata) {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [
      `x-amz-meta-${key.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`,
      String(value)
    ])
  );
}

function buildCanonicalUri(bucket, key) {
  const segments = [bucket, ...(key ? key.split("/") : [])].filter(Boolean);
  return `/${segments.map(encodeRfc3986).join("/")}`;
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function validateStartupConfig() {
  const blockers = [];
  if (!endpoint) blockers.push("OBJECT_STORE_URL is required for the live S3-compatible artifact doctor.");
  if (endpoint.startsWith("file://")) blockers.push("Live S3-compatible artifact doctor cannot use a file:// object store URL.");
  if (endpoint && !/^https?:\/\//.test(endpoint)) blockers.push("Live S3-compatible artifact doctor requires an http(s) endpoint URL.");
  if (!configuredBucket) blockers.push("OBJECT_STORE_BUCKET is required for the live S3-compatible artifact doctor.");
  if (!accessKeyId) blockers.push("OBJECT_STORE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID is required.");
  if (!secretAccessKey) blockers.push("OBJECT_STORE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY is required.");
  if (!region) blockers.push("OBJECT_STORE_REGION or AWS_REGION is required.");
  if (signingSecret.length < 32) blockers.push("OBJECT_STORE_SIGNING_SECRET must be at least 32 characters.");
  for (const [key, value] of Object.entries({ OBJECT_STORE_URL: endpoint, OBJECT_STORE_BUCKET: configuredBucket, accessKeyId, secretAccessKey })) {
    if (/replace-me|placeholder|changeme|__set_|example/i.test(value)) blockers.push(`${key} cannot be a placeholder value.`);
  }
  return blockers;
}

function buildDoctorBucketName(value) {
  const safePrefix = value
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "customcard-ci-artifacts";
  const suffix = `${process.pid}-${Date.now()}`.slice(-24);
  return `${safePrefix}-${suffix}`.slice(0, 63).replace(/[.-]+$/g, "0");
}

function buildPathStyleBucketUrl(endpoint, bucket) {
  return `${endpoint}/${bucket}`;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/g, "");
}

function printReport(status) {
  console.log(
    JSON.stringify(
      {
        service: "customcard-artifact-store-s3-live-doctor",
        status: blockers.length === 0 ? status : "blocked",
        endpoint: {
          url: endpoint,
          region,
          configuredBucket,
          isolatedBucket: bucket,
          pathStyle: true
        },
        artifactCount: result?.artifactCount ?? 0,
        verifiedWrites: result?.writes?.filter((write) => write.verified).length ?? 0,
        manifestStored: Boolean(result?.manifestPath),
        putObjects: client.putObjects,
        getObjects: client.getObjects,
        deletedObjects: client.deletedObjects,
        cloudWritesVerified: blockers.length === 0,
        liveNetworkCalls: true,
        externalVendorCalls: false,
        realOrdersEnabled: false,
        blockers,
        cleanupWarnings
      },
      null,
      2
    )
  );
}

function prefixBlockers(scope, items) {
  return items.map((item) => `${scope}: ${item}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
