import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const maxSignedUrlMinutes = 60;
const defaultSignedUrlMinutes = 15;
const maxArtifactCount = 12;
const maxArtifactBytes = 8_000_000;
const defaultBucketListLimit = 5;
const maxBucketListObjects = 50;
const memoryStores = new Map();
const forceDownloadMimeTypes = new Set(["image/svg+xml", "application/pdf", "application/json"]);
const attachmentContentSecurityPolicy =
  "sandbox; default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data:; style-src 'unsafe-inline'; form-action 'none'";

export function createObjectStoreRuntime({ env = process.env, fetchImpl = (...args) => globalThis.fetch(...args), now = () => new Date() } = {}) {
  const config = resolveObjectStoreConfig(env);
  const client = config.configured ? createObjectStoreClient({ config, fetchImpl, now }) : undefined;

  return {
    describe() {
      return buildObjectStoreDescription(config);
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
      const dedupePlan = buildArtifactDedupePlan(normalizedArtifacts);
      const blockers = validateStoredArtifacts(normalizedArtifacts);
      let verifiedWrites = 0;
      if (blockers.length === 0) {
        const results = await runBounded(dedupePlan.uniqueArtifacts, config.writeConcurrency, (artifact) =>
          persistArtifactWithReadback({ artifact, client, config, record })
        );
        verifiedWrites = results.filter((result) => result.verified).length;
        blockers.push(...results.flatMap((result) => result.blockers));
      }

      const manifest = {
        renderPacketId: record.id,
        projectId: record.projectId,
        storageProvider: "s3-compatible",
        objectStoreUrl: config.safeEndpoint,
        bucket: config.bucket,
        artifactCount: normalizedArtifacts.length,
        artifacts: normalizedArtifacts.map(stripRuntimeBody),
        storedArtifactCount: dedupePlan.uniqueArtifacts.length,
        deduplicatedArtifactCount: dedupePlan.duplicateArtifacts.length,
        deduplicatedBytes: dedupePlan.deduplicatedBytes,
        manifestChecksum: record.checksum,
        signedUrlExpiresAt: expiresAtIso,
        retentionPolicy: buildArtifactRetentionPolicy(config),
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
            storedArtifactCount: dedupePlan.uniqueArtifacts.length,
            deduplicatedArtifactCount: dedupePlan.duplicateArtifacts.length,
            deduplicatedBytes: dedupePlan.deduplicatedBytes,
            verifiedWrites,
            writeConcurrency: config.writeConcurrency,
            manifestStored: blockers.length === 0,
            retentionPolicy: buildArtifactRetentionPolicy(config),
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
        cacheControl: "private, max-age=60",
        ...artifactDownloadResponseHeaders({ contentType: stored.contentType, objectKey })
      };
    },
    async listBucketArtifacts({ query } = {}) {
      const prefix = safeListPrefix(query?.get?.("prefix") ?? query?.prefix ?? "projects/");
      const limit = clampBucketListLimit(query?.get?.("limit") ?? query?.limit);
      const sort = safeBucketListSort(query?.get?.("sort") ?? query?.get?.("sortBy") ?? query?.sort ?? query?.sortBy);
      const order = safeBucketListOrder(query?.get?.("order") ?? query?.get?.("sortOrder") ?? query?.order ?? query?.sortOrder);
      const cursor = safeContinuationToken(query?.get?.("cursor") ?? query?.get?.("continuationToken") ?? query?.cursor ?? query?.continuationToken);
      const objectStore = buildObjectStoreDescription(config);
      if (!config.configured || !client) {
        return {
          statusCode: 503,
          payload: {
            status: "artifact-store-unconfigured",
            objectStore,
            prefix,
            limit,
            sort,
            order,
            cursor,
            objectCount: 0,
            truncated: false,
            nextCursor: null,
            objects: [],
            renderPackets: [],
            blockers: config.blockers.length ? config.blockers : ["Object store persistence is not configured."]
          }
        };
      }
      const listed = await client.listObjects({ prefix, limit, cursor, sort, order });
      const expiresAtIso = signedUrlExpiry(config.expiresInMinutes, now());
      const objects = listed.objects
        .map((object) => buildBucketObjectSummary({ object, config, expiresAtIso }))
        .sort((first, second) => compareBucketObjectListItems(first, second, sort, order));
      const renderPackets = buildBucketRenderPacketGroups(objects, { sort, order });
      return {
        statusCode: 200,
        payload: {
          status: "ready",
          objectStore,
          prefix,
          limit,
          sort,
          order,
          cursor,
          objectCount: objects.length,
          truncated: Boolean(listed.truncated),
          nextCursor: listed.nextCursor ?? null,
          objects,
          renderPackets,
          blockers: []
        }
      };
    }
  };
}

function buildObjectStoreDescription(config) {
  return {
    configured: config.configured,
    provider: config.provider,
    endpoint: config.safeEndpoint,
    bucket: config.bucket || null,
    publicBaseUrl: config.publicBaseUrl || null,
    signedUrlTtlMinutes: config.expiresInMinutes,
    artifactRetentionDays: config.artifactRetentionDays,
    noncurrentArtifactRetentionDays: config.noncurrentArtifactRetentionDays,
    writeConcurrency: config.writeConcurrency,
    liveNetworkCalls: config.liveNetworkCalls,
    credentialMode: config.readCredentialsConfigured ? "write-read-split" : config.writeCredentialsConfigured ? "writer-shared" : "unconfigured",
    blockers: config.blockers
  };
}

async function persistArtifactWithReadback({ artifact, client, config, record }) {
  const blockers = [];
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
      artifactRetentionDays: String(config.artifactRetentionDays),
      noncurrentArtifactRetentionDays: String(config.noncurrentArtifactRetentionDays),
      realOrdersEnabled: "false"
    }
  });
  const readback = await client.getObject({ key: artifact.objectKey });
  if (!readback.body.equals(artifact.body)) blockers.push(`Artifact readback mismatch: ${artifact.fileName}`);
  return { fileName: artifact.fileName, verified: blockers.length === 0, blockers };
}

async function runBounded(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        try {
          results[index] = await worker(items[index], index);
        } catch (error) {
          results[index] = {
            fileName: items[index]?.fileName ?? `artifact-${index}`,
            verified: false,
            blockers: [`Artifact persistence failed: ${errorMessage(error)}`]
          };
        }
      }
    })
  );

  return results;
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
  const artifactRetentionDays = safeIntegerEnv(env.CUSTOMCARD_ARTIFACT_RETENTION_DAYS ?? env.ARTIFACT_RETENTION_DAYS, 30, 1, 365);
  const noncurrentArtifactRetentionDays = safeIntegerEnv(
    env.CUSTOMCARD_NONCURRENT_ARTIFACT_RETENTION_DAYS ?? env.NONCURRENT_ARTIFACT_RETENTION_DAYS,
    14,
    1,
    90
  );
  const provider = providerForEndpoint(endpoint);
  const publicBaseUrl = resolvePublicBaseUrl(env);
  const writeConcurrency = safeIntegerEnv(env.CUSTOMCARD_ARTIFACT_WRITE_CONCURRENCY, 4, 1, 8);
  const required = env.CUSTOMCARD_ARTIFACT_PERSISTENCE === "enabled" || Boolean(endpoint || bucket || accessKeyId || secretAccessKey);
  const productionRuntime = isProductionRuntime(env);
  const blockers = [];

  if (required && !endpoint) blockers.push("OBJECT_STORE_URL is required.");
  if (required && !bucket) blockers.push("OBJECT_STORE_BUCKET is required.");
  if (required && !isSafeBucketName(bucket)) blockers.push(`OBJECT_STORE_BUCKET is not a safe bucket name: ${bucket}`);
  if (required && !accessKeyId) blockers.push("OBJECT_STORE_ACCESS_KEY_ID is required.");
  if (required && !secretAccessKey) blockers.push("OBJECT_STORE_SECRET_ACCESS_KEY is required.");
  if (required && signingSecret.length < 32) blockers.push("OBJECT_STORE_SIGNING_SECRET must be at least 32 characters.");
  if (required && !isSafePublicBaseUrl(publicBaseUrl)) blockers.push("OBJECT_STORE_PUBLIC_BASE_URL must be https or localhost/127.0.0.1 http.");
  if (required && !isSupportedEndpoint(endpoint, { productionRuntime })) {
    blockers.push(
      productionRuntime
        ? "OBJECT_STORE_URL must be https:// in production."
        : "OBJECT_STORE_URL must be memory://, https://, or local/dev-Minio http://."
    );
  }

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
    artifactRetentionDays,
    noncurrentArtifactRetentionDays,
    writeConcurrency,
    liveNetworkCalls: Boolean(endpoint && !endpoint.startsWith("memory://")),
    writeCredentialsConfigured: Boolean(accessKeyId && secretAccessKey),
    readCredentialsConfigured: Boolean(readAccessKeyId && readSecretAccessKey),
    blockers
  };
}

function createObjectStoreClient({ config, fetchImpl, now }) {
  if (config.endpoint.startsWith("memory://")) return createMemoryObjectStoreClient(config, { now });
  return createSigV4ObjectStoreClient({ config, fetchImpl });
}

function createMemoryObjectStoreClient(config, { now }) {
  const storeKey = `${config.endpoint}/${config.bucket}`;
  const store = memoryStores.get(storeKey) ?? new Map();
  memoryStores.set(storeKey, store);
  return {
    async putObject(input) {
      store.set(input.key, {
        body: Buffer.from(input.body),
        contentType: input.contentType,
        metadata: { ...input.metadata },
        lastModifiedIso: now().toISOString()
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
    },
    async headObject(input) {
      const object = store.get(input.key);
      if (!object) throw new Error(`Object not found: ${input.key}`);
      return summarizeStoredObject(input.key, object);
    },
    async listObjects({ prefix, limit, cursor, sort, order }) {
      const matching = Array.from(store.entries())
        .filter(([key]) => key.startsWith(prefix))
        .sort((first, second) => compareStoredEntries(first, second, sort, order));
      const cursorIndex = cursor ? matching.findIndex(([key]) => key === cursor) : -1;
      const startIndex = cursor ? (cursorIndex >= 0 ? cursorIndex + 1 : matching.length) : 0;
      const entries = matching
        .slice(startIndex, startIndex + limit)
        .map(([key, object]) => summarizeStoredObject(key, object));
      const nextIndex = startIndex + entries.length;
      return {
        objects: entries,
        truncated: matching.length > nextIndex,
        nextCursor: matching.length > nextIndex ? entries.at(-1)?.key ?? null : null
      };
    }
  };
}

function summarizeStoredObject(key, object) {
  return {
    key,
    byteLength: object.body.length,
    contentType: object.contentType,
    lastModifiedIso: object.lastModifiedIso,
    metadata: { ...object.metadata }
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
    },
    async headObject(input) {
      const readConfig = config.readCredentialsConfigured
        ? {
            ...config,
            accessKeyId: config.readAccessKeyId,
            secretAccessKey: config.readSecretAccessKey
          }
        : config;
      const response = await signedRequest({
        config: readConfig,
        fetchImpl,
        method: "HEAD",
        key: input.key,
        body: Buffer.alloc(0),
        headers: {},
        expectedStatuses: [200]
      });
      return {
        key: input.key,
        byteLength: Number(response.headers["content-length"] ?? 0) || 0,
        contentType: response.contentType,
        lastModifiedIso: safeResponseDate(response.headers["last-modified"]),
        metadata: metadataFromResponseHeaders(response.headers)
      };
    },
    async listObjects({ prefix, limit, cursor, sort, order }) {
      const readConfig = config.readCredentialsConfigured
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
        key: "",
        body: Buffer.alloc(0),
        headers: {},
        queryParams: {
          "list-type": "2",
          "max-keys": String(limit),
          prefix,
          "continuation-token": cursor
        },
        expectedStatuses: [200]
      });
      const listed = parseListObjectsXml(response.body.toString("utf8"));
      const objects = await Promise.all(
        listed.objects.slice(0, limit).map(async (object) => {
          try {
            return { ...object, ...(await this.headObject({ key: object.key })) };
          } catch {
            return object;
          }
        })
      );
      return {
        objects: objects.sort((first, second) => compareStoredObjectSummaries(first, second, sort, order)),
        truncated: listed.truncated,
        nextCursor: listed.nextCursor
      };
    }
  };
}

async function signedRequest({ config, fetchImpl, method, key, body, headers, queryParams = {}, expectedStatuses }) {
  const requestBody = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "");
  const canonicalQuery = buildCanonicalQueryString(queryParams);
  const requestHeaders = buildSignedHeaders({
    config,
    method,
    key,
    canonicalQuery,
    body: requestBody,
    headers
  });
  const requestUrl = `${trimTrailingSlash(config.endpoint)}${buildCanonicalUri(config.bucket, key)}${canonicalQuery ? `?${canonicalQuery}` : ""}`;
  const response = await fetchImpl(requestUrl, {
    method,
    headers: requestHeaders,
    body: method === "GET" || method === "HEAD" || method === "DELETE" ? undefined : requestBody
  });
  const responseBody = Buffer.from(await response.arrayBuffer());
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${method} ${config.bucket}/${key} expected ${expectedStatuses.join("/")} but got ${response.status}: ${responseBody.toString("utf8", 0, 500)}`);
  }
  return {
    status: response.status,
    body: responseBody,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    headers: responseHeadersToObject(response.headers)
  };
}

function buildSignedHeaders({ config, method, key, canonicalQuery = "", body, headers }) {
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
    canonicalQuery,
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

function buildBucketObjectSummary({ object, config, expiresAtIso }) {
  const metadata = object.metadata ?? {};
  const contentHashValue = metadata.contentHash || metadata.contenthash || metadata["content-hash"] || "";
  const projectId = metadata.projectId || metadata.projectid || object.key.split("/")[1] || "";
  const signature = contentHashValue && projectId
    ? createHmac("sha256", config.signingSecret)
        .update(signaturePayloadFor(projectId, object.key, contentHashValue, expiresAtIso))
        .digest("hex")
    : "";
  return {
    objectKey: object.key,
    fileName: object.key.split("/").pop() ?? object.key,
    byteLength: object.byteLength,
    contentType: object.contentType || "application/octet-stream",
    downloadMode: shouldForceArtifactDownload(object.contentType) ? "attachment" : "inline",
    lastModifiedIso: object.lastModifiedIso || "",
    metadata: sanitizeObjectMetadata(metadata),
    signedDownload: signature
      ? {
          method: "GET",
          url: buildSignedUrl(config.publicBaseUrl, object.key, contentHashValue, expiresAtIso, signature),
          expiresAtIso,
          signatureVersion: "hmac-sha256-v1"
        }
      : null
  };
}

function buildBucketRenderPacketGroups(objects, { sort = "lastModified", order = "desc" } = {}) {
  const groups = new Map();
  for (const object of objects) {
    const parsed = renderPacketPathParts(object);
    if (!parsed) continue;
    const groupKey = `${parsed.projectId}/${parsed.renderPacketId}`;
    const existing = groups.get(groupKey) ?? {
      projectId: parsed.projectId,
      renderPacketId: parsed.renderPacketId,
      objectPrefix: `projects/${parsed.projectId}/render-packets/${parsed.renderPacketId}/`,
      objectCount: 0,
      byteLength: 0,
      lastModifiedIso: "",
      artifacts: [],
      panelImages: [],
      promptArtifacts: [],
      manifestArtifact: null
    };
    existing.objectCount += 1;
    existing.byteLength += Number(object.byteLength ?? 0);
    existing.lastModifiedIso = latestIso(existing.lastModifiedIso, object.lastModifiedIso);
    existing.artifacts.push(object);
    const role = bucketArtifactRole(object);
    if (role === "manifest") existing.manifestArtifact = object;
    if (role === "prompt" || role === "input") existing.promptArtifacts.push(object);
    if (role === "panel-image") existing.panelImages.push(object);
    groups.set(groupKey, existing);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      artifacts: group.artifacts.sort(compareBucketObjects),
      panelImages: group.panelImages.sort(comparePanelArtifacts),
      promptArtifacts: group.promptArtifacts.sort(comparePromptArtifacts)
    }))
    .sort((first, second) => compareBucketRenderPacketGroups(first, second, sort, order));
}

function renderPacketPathParts(object) {
  const objectKey = object.objectKey ?? "";
  const match = objectKey.match(/^projects\/([^/]+)\/render-packets\/([^/]+)\/(.+)$/);
  if (!match) return null;
  const metadata = object.metadata ?? {};
  return {
    projectId: metadataValue(metadata, "projectId") || match[1],
    renderPacketId: metadataValue(metadata, "renderPacketId") || match[2],
    fileName: match[3]
  };
}

function bucketArtifactRole(object) {
  const fileName = (object.fileName ?? "").toLowerCase();
  const kind = metadataValue(object.metadata ?? {}, "kind").toLowerCase();
  const artifactRole = metadataValue(object.metadata ?? {}, "artifactRole").toLowerCase();
  if (artifactRole === "handoff-manifest" || fileName === "artifact-handoff-manifest.json") return "manifest";
  if (fileName === "persisted-effective-prompts.json") return "prompt";
  if (fileName === "persisted-customcard-ai-output.json") return "input";
  if (kind === "manifest-json" || fileName.endsWith(".json")) return "prompt";
  if (kind === "generated-image" || kind === "panel-png" || kind === "panel-svg" || /^provider-|^preview-/.test(fileName)) return "panel-image";
  return "artifact";
}

function metadataValue(metadata, camelKey) {
  const compactKey = camelKey.toLowerCase();
  return String(metadata[camelKey] ?? metadata[compactKey] ?? metadata[camelKey.replace(/[A-Z]/g, (letter) => letter.toLowerCase())] ?? "");
}

function latestIso(first = "", second = "") {
  if (!first) return second || "";
  if (!second) return first;
  return second.localeCompare(first) > 0 ? second : first;
}

function compareStoredEntries(first, second, sort, order) {
  return compareStoredObjectSummaries(
    { key: first[0], ...first[1] },
    { key: second[0], ...second[1] },
    sort,
    order
  );
}

function compareStoredObjectSummaries(first, second, sort, order) {
  const compared = sort === "lastModified"
    ? compareLastModified(first, second) || compareObjectKeys(first.key, second.key)
    : compareObjectKeys(first.key, second.key);
  return applyBucketListOrder(compared, order);
}

function compareBucketObjectListItems(first, second, sort, order) {
  const compared = sort === "lastModified"
    ? compareLastModified(first, second) || compareObjectKeys(first.objectKey, second.objectKey)
    : compareObjectKeys(first.objectKey, second.objectKey);
  return applyBucketListOrder(compared, order);
}

function compareBucketRenderPacketGroups(first, second, sort, order) {
  const compared = sort === "lastModified"
    ? compareLastModified(first, second) || compareObjectKeys(first.objectPrefix, second.objectPrefix)
    : compareObjectKeys(first.objectPrefix, second.objectPrefix);
  return applyBucketListOrder(compared, order);
}

function compareLastModified(first, second) {
  return String(first.lastModifiedIso ?? "").localeCompare(String(second.lastModifiedIso ?? ""));
}

function compareObjectKeys(first = "", second = "") {
  return String(first).localeCompare(String(second));
}

function applyBucketListOrder(compared, order) {
  return order === "desc" ? -compared : compared;
}

function compareBucketObjects(first, second) {
  return (first.objectKey ?? "").localeCompare(second.objectKey ?? "");
}

function comparePanelArtifacts(first, second) {
  return panelSortIndex(first.fileName) - panelSortIndex(second.fileName) || compareBucketObjects(first, second);
}

function comparePromptArtifacts(first, second) {
  return promptSortIndex(first.fileName) - promptSortIndex(second.fileName) || compareBucketObjects(first, second);
}

function panelSortIndex(fileName = "") {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("front")) return 0;
  if (normalized.includes("inside-left")) return 1;
  if (normalized.includes("inside-right")) return 2;
  if (normalized.includes("back")) return 3;
  return 9;
}

function promptSortIndex(fileName = "") {
  const normalized = fileName.toLowerCase();
  if (normalized === "persisted-customcard-ai-output.json") return 0;
  if (normalized === "persisted-effective-prompts.json") return 1;
  if (normalized === "artifact-handoff-manifest.json") return 2;
  return 9;
}

function sanitizeObjectMetadata(metadata) {
  const allowed = [
    "artifactRole",
    "artifactrole",
    "artifactRetentionDays",
    "artifactretentiondays",
    "contentHash",
    "contenthash",
    "draftId",
    "draftid",
    "fileName",
    "filename",
    "kind",
    "panelId",
    "panelid",
    "projectId",
    "projectid",
    "realOrdersEnabled",
    "realordersenabled",
    "renderPacketId",
    "renderpacketid",
    "noncurrentArtifactRetentionDays",
    "noncurrentartifactretentiondays"
  ];
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => allowed.includes(key))
      .map(([key, value]) => [key, String(value).slice(0, 240)])
  );
}

function metadataFromResponseHeaders(headers) {
  const metadata = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!key.startsWith("x-amz-meta-")) continue;
    const metadataKey = key.slice("x-amz-meta-".length).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
    metadata[metadataKey] = value;
  }
  return metadata;
}

function responseHeadersToObject(headers) {
  const result = {};
  headers.forEach((value, key) => {
    result[key.toLowerCase()] = value;
  });
  return result;
}

function parseListObjectsXml(xml) {
  const objects = [];
  const contentsPattern = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;
  while ((match = contentsPattern.exec(xml))) {
    const contents = match[1];
    const key = decodeXmlText(readXmlTag(contents, "Key"));
    if (!key) continue;
    objects.push({
      key,
      byteLength: Number(readXmlTag(contents, "Size")) || 0,
      contentType: "application/octet-stream",
      lastModifiedIso: safeResponseDate(readXmlTag(contents, "LastModified")),
      metadata: {}
    });
  }
  return {
    objects,
    truncated: readXmlTag(xml, "IsTruncated").trim().toLowerCase() === "true",
    nextCursor: decodeXmlText(readXmlTag(xml, "NextContinuationToken")).trim() || null
  };
}

function readXmlTag(xml, tag) {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  return match?.[1] ?? "";
}

function decodeXmlText(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function safeResponseDate(value) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}

function buildCanonicalQueryString(queryParams) {
  return Object.entries(queryParams)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .flatMap(([key, value]) => Array.isArray(value) ? value.map((item) => [key, item]) : [[key, value]])
    .map(([key, value]) => [awsEncode(key), awsEncode(String(value))])
    .sort(([firstKey, firstValue], [secondKey, secondValue]) => firstKey.localeCompare(secondKey) || firstValue.localeCompare(secondValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function awsEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
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

function buildArtifactDedupePlan(artifacts) {
  const canonicalByHash = new Map();
  const uniqueArtifacts = [];
  const duplicateArtifacts = [];
  let deduplicatedBytes = 0;

  for (const artifact of artifacts) {
    const dedupeKey = `${artifact.contentHash}:${artifact.mimeType}`;
    const canonical = canonicalByHash.get(dedupeKey);
    if (!canonical) {
      canonicalByHash.set(dedupeKey, artifact);
      uniqueArtifacts.push(artifact);
      continue;
    }
    duplicateArtifacts.push(artifact);
    deduplicatedBytes += artifact.byteLength;
    artifact.duplicateOfObjectKey = canonical.objectKey;
    artifact.duplicateOfFileName = canonical.fileName;
    artifact.signedDownload = canonical.signedDownload;
    artifact.artifactUri = canonical.artifactUri;
  }

  return {
    uniqueArtifacts,
    duplicateArtifacts,
    deduplicatedBytes
  };
}

function buildArtifactRetentionPolicy(config) {
  return {
    currentArtifactDays: config.artifactRetentionDays,
    noncurrentArtifactDays: config.noncurrentArtifactRetentionDays,
    signedUrlTtlMinutes: config.expiresInMinutes,
    lifecyclePrefix: "projects/",
    lifecycleManagedBy: config.liveNetworkCalls ? "object-store-lifecycle" : "runtime-contract"
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
    if (artifact.mimeType === "image/svg+xml") {
      const svgIssue = unsafeSvgArtifactIssue(artifact.body);
      if (svgIssue) blockers.push(`Unsafe SVG artifact content: ${artifact.fileName} (${svgIssue})`);
    }
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

function artifactDownloadResponseHeaders({ contentType, objectKey }) {
  if (!shouldForceArtifactDownload(contentType)) return {};
  return {
    contentDisposition: `attachment; filename="${safeHeaderFileName(objectKey.split("/").pop() ?? "artifact")}"`,
    contentSecurityPolicy: attachmentContentSecurityPolicy,
    crossOriginResourcePolicy: "same-origin",
    downloadOptions: "noopen"
  };
}

function shouldForceArtifactDownload(contentType) {
  const mimeType = String(contentType ?? "").split(";")[0].trim().toLowerCase();
  return forceDownloadMimeTypes.has(mimeType) || mimeType.startsWith("text/");
}

function safeHeaderFileName(value) {
  return String(value ?? "artifact").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "artifact";
}

function unsafeSvgArtifactIssue(body) {
  const text = body.toString("utf8", 0, Math.min(body.length, maxArtifactBytes));
  if (!/<svg[\s>]/i.test(text)) return "missing svg root";
  if (/<\s*script\b/i.test(text)) return "script element";
  if (/\son[a-z]+\s*=/i.test(text)) return "event handler attribute";
  if (/\bjavascript\s*:/i.test(text)) return "javascript URL";
  if (/<\s*(?:foreignObject|iframe|object|embed|link|meta)\b/i.test(text)) return "active or embedded content element";
  if (/\b(?:href|xlink:href|src)\s*=\s*["']?\s*(?:https?:|data:|\/\/)/i.test(text)) return "external or data URL reference";
  return "";
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
  return new Date(Math.floor((fromDate.getTime() + minutes * 60_000) / 1000) * 1000).toISOString();
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

function isProductionRuntime(env) {
  const customCardEnv = String(env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV ?? "").trim().toLowerCase();
  return customCardEnv === "prod" || customCardEnv === "production" || nodeEnv === "production";
}

function isSupportedEndpoint(value, { productionRuntime = false } = {}) {
  if (value.startsWith("https://")) return true;
  if (productionRuntime) return false;
  if (value.startsWith("memory://")) return true;
  if (!value.startsWith("http://")) return false;
  return isLocalOrDevMinioHttpEndpoint(value);
}

function isLocalOrDevMinioHttpEndpoint(value) {
  try {
    const parsed = new URL(value);
    return ["localhost", "127.0.0.1", "0.0.0.0", "::1", "minio"].includes(parsed.hostname);
  } catch {
    return false;
  }
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

function safeListPrefix(value) {
  const text = String(value ?? "projects/").trim();
  if (!text) return "";
  if (text.length > 240 || text.includes("\\") || text.startsWith("/")) return "projects/";
  const segments = text.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === ".." || !/^[a-zA-Z0-9._-]+$/.test(segment))) return "projects/";
  return text;
}

function safeContinuationToken(value) {
  const text = String(value ?? "").trim();
  if (!text || text.length > 1024 || /[\u0000-\u001f]/.test(text)) return "";
  return text;
}

function safeBucketListSort(value) {
  const text = String(value ?? "lastModified").trim();
  return text === "key" || text === "lastModified" ? text : "lastModified";
}

function safeBucketListOrder(value) {
  const text = String(value ?? "desc").trim().toLowerCase();
  return text === "asc" || text === "desc" ? text : "desc";
}

function clampBucketListLimit(value) {
  const parsed = Number(value ?? defaultBucketListLimit);
  if (!Number.isInteger(parsed)) return defaultBucketListLimit;
  return Math.max(1, Math.min(maxBucketListObjects, parsed));
}

function safeIntegerEnv(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
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

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
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
