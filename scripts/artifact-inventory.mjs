
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { createObjectStoreRuntime } from "./object-store-runtime.mjs";

const defaultPrefix = "projects/";
const maxSampleCount = 20;
const knownArtifactReferenceKeys = new Set([
  "artifactUri",
  "artifact_uri",
  "image_artifact_uri",
  "manifestUri",
  "manifest_uri",
  "front_artifact_uri",
  "thumbnail_artifact_uri",
  "inside_left_artifact_uri",
  "inside_right_artifact_uri",
  "back_artifact_uri"
]);

const knownObjectKeyReferenceKeys = new Set([
  "objectKey",
  "object_key",
  "image_object_key",
  "duplicateOfObjectKey",
  "duplicate_of_object_key"
]);

export function parseArtifactInventoryArgs(argv = []) {
  const options = {
    write: false,
    json: false,
    prefix: defaultPrefix,
    limit: 50,
    envFiles: [".env.local", "infra/env/.env"]
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write" || arg === "--import") {
      options.write = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--prefix") {
      options.prefix = String(argv[index + 1] ?? defaultPrefix);
      index += 1;
    } else if (arg.startsWith("--prefix=")) {
      options.prefix = arg.slice("--prefix=".length) || defaultPrefix;
    } else if (arg === "--limit") {
      options.limit = safeLimit(argv[index + 1]);
      index += 1;
    } else if (arg.startsWith("--limit=")) {
      options.limit = safeLimit(arg.slice("--limit=".length));
    } else if (arg === "--env-file") {
      options.envFiles = [String(argv[index + 1] ?? "")].filter(Boolean);
      index += 1;
    } else if (arg.startsWith("--env-file=")) {
      options.envFiles = [arg.slice("--env-file=".length)].filter(Boolean);
    } else if (arg === "--no-local-env") {
      options.envFiles = [];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown artifact inventory argument: ${arg}`);
    }
  }

  return options;
}

export function loadSupplementedEnv({ baseEnv = process.env, cwd = process.cwd(), envFiles = [".env.local", "infra/env/.env"] } = {}) {
  const env = { ...baseEnv };
  for (const filePath of envFiles) {
    const absolutePath = filePath.startsWith("/") ? filePath : `${cwd}/${filePath}`;
    if (!existsSync(absolutePath)) continue;
    const parsed = parseDotenv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!env[key]) env[key] = value;
    }
  }
  return env;
}

export function parseDotenv(text) {
  const parsed = {};
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    parsed[match[1]] = unquoteEnvValue(match[2].trim());
  }
  return parsed;
}

export function objectKeyFromArtifactReference(value, { bucket } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  if (raw.startsWith("projects/")) return decodeObjectKey(raw);
  if (bucket && raw.startsWith(`s3://${bucket}/projects/`)) {
    return decodeObjectKey(raw.slice(`s3://${bucket}/`.length));
  }

  try {
    const parsed = new URL(raw);
    const pathname = decodeObjectKey(parsed.pathname.replace(/^\/+/, ""));
    const bucketPrefix = bucket ? `${bucket}/projects/` : "";
    if (bucketPrefix && pathname.startsWith(bucketPrefix)) return pathname.slice(`${bucket}/`.length);
    if (pathname.startsWith("api/artifacts/projects/")) return pathname.slice("api/artifacts/".length);
    const projectIndex = pathname.indexOf("projects/");
    if (projectIndex >= 0) return pathname.slice(projectIndex);
  } catch {
    const projectIndex = raw.indexOf("projects/");
    if (projectIndex >= 0) return decodeObjectKey(raw.slice(projectIndex).split(/[?#]/, 1)[0]);
  }

  return undefined;
}

export function parseRenderPacketObjectKey(objectKey, metadata = {}) {
  const match = String(objectKey ?? "").match(/^projects\/([^/]+)\/render-packets\/([^/]+)\/(.+)$/);
  if (!match) {
    return {
      projectId: metadataValue(metadata, "projectId") || null,
      renderPacketId: metadataValue(metadata, "renderPacketId") || null,
      fileName: String(objectKey ?? "").split("/").pop() || String(objectKey ?? "")
    };
  }
  return {
    projectId: metadataValue(metadata, "projectId") || match[1],
    renderPacketId: metadataValue(metadata, "renderPacketId") || match[2],
    fileName: match[3]
  };
}

export function inferArtifactRole({ objectKey = "", fileName = "", contentType = "", metadata = {} } = {}) {
  const lowerFileName = String(fileName || objectKey.split("/").pop() || "").toLowerCase();
  const artifactRole = metadataValue(metadata, "artifactRole").toLowerCase();
  const kind = metadataValue(metadata, "kind").toLowerCase();
  if (artifactRole === "handoff-manifest" || lowerFileName === "artifact-handoff-manifest.json") return "handoff-manifest";
  if (lowerFileName === "persisted-effective-prompts.json") return "prompt-json";
  if (lowerFileName === "persisted-customcard-ai-output.json") return "input-json";
  if (lowerFileName.startsWith("provider-")) return "provider-image";
  if (lowerFileName.startsWith("preview-")) return "preview-image";
  if (lowerFileName.startsWith("persisted-")) return "persisted-json";
  if (kind === "generated-image" || kind === "panel-png" || kind === "panel-svg") return "provider-image";
  if (kind === "manifest-json") return "json";
  if (String(contentType).toLowerCase().includes("json") || lowerFileName.endsWith(".json")) return "json";
  if (lowerFileName) return "artifact";
  return "other";
}

export function artifactObjectRecordFromR2Object(object, { bucket, references = [] } = {}) {
  const objectKey = object.objectKey ?? object.key ?? "";
  const parsed = parseRenderPacketObjectKey(objectKey, object.metadata ?? {});
  const fileName = object.fileName ?? parsed.fileName;
  const linkedReferences = references.map(compactReference);
  const primaryReference = linkedReferences[0];
  return {
    objectKey,
    bucket,
    storageProvider: "s3-compatible",
    projectId: parsed.projectId,
    renderPacketId: parsed.renderPacketId,
    fileName,
    artifactRole: inferArtifactRole({
      objectKey,
      fileName,
      contentType: object.contentType,
      metadata: object.metadata ?? {}
    }),
    contentType: object.contentType || "application/octet-stream",
    byteLength: safeNonNegativeInteger(object.byteLength),
    lastModifiedAt: safeTimestamp(object.lastModifiedIso),
    objectMetadata: object.metadata && typeof object.metadata === "object" ? object.metadata : {},
    linkedReferences,
    linkStatus: linkedReferences.length > 0 ? "linked" : "unmatched",
    primaryLinkTable: primaryReference?.tableName ?? null,
    primaryLinkId: primaryReference?.recordId ?? null
  };
}

export function summarizeArtifactInventory({ objects = [], references = [], bucket } = {}) {
  const objectKeySet = new Set(objects.map((object) => object.objectKey ?? object.key).filter(Boolean));
  const referencesByObjectKey = new Map();
  for (const reference of references) {
    if (!reference?.objectKey) continue;
    if (!referencesByObjectKey.has(reference.objectKey)) referencesByObjectKey.set(reference.objectKey, []);
    referencesByObjectKey.get(reference.objectKey).push(reference);
  }

  const records = objects.map((object) =>
    artifactObjectRecordFromR2Object(object, {
      bucket,
      references: referencesByObjectKey.get(object.objectKey ?? object.key) ?? []
    })
  );
  const referencedObjectKeys = new Set(references.map((reference) => reference.objectKey).filter(Boolean));
  const pgRefsMissingInR2 = Array.from(referencedObjectKeys).filter((objectKey) => !objectKeySet.has(objectKey)).sort();
  const r2ObjectsNotReferencedByPg = records
    .filter((record) => !referencedObjectKeys.has(record.objectKey))
    .map((record) => record.objectKey)
    .sort();

  return {
    records,
    drift: {
      r2ObjectCount: objectKeySet.size,
      pgReferencedObjectCount: referencedObjectKeys.size,
      pgRefsMissingInR2: pgRefsMissingInR2.length,
      r2ObjectsNotReferencedByPg: r2ObjectsNotReferencedByPg.length
    },
    breakdown: {
      byProject: countBy(records, (record) => record.projectId ?? "(none)"),
      byRole: countBy(records, (record) => record.artifactRole),
      byLinkStatus: countBy(records, (record) => record.linkStatus)
    },
    samples: {
      pgRefsMissingInR2: pgRefsMissingInR2.slice(0, maxSampleCount),
      r2ObjectsNotReferencedByPg: r2ObjectsNotReferencedByPg.slice(0, maxSampleCount)
    }
  };
}

export function summarizeArtifactAccounting({ r2ObjectKeys = [], inventoryObjectKeys = [] } = {}) {
  const r2KeySet = new Set(r2ObjectKeys.filter(Boolean));
  const inventoryKeySet = new Set(inventoryObjectKeys.filter(Boolean));
  const r2ObjectsMissingInventory = Array.from(r2KeySet).filter((objectKey) => !inventoryKeySet.has(objectKey)).sort();
  const inventoryObjectsMissingInR2 = Array.from(inventoryKeySet).filter((objectKey) => !r2KeySet.has(objectKey)).sort();
  return {
    r2ObjectCount: r2KeySet.size,
    inventoryObjectCount: inventoryKeySet.size,
    r2ObjectsMissingInventory: r2ObjectsMissingInventory.length,
    inventoryObjectsMissingInR2: inventoryObjectsMissingInR2.length,
    samples: {
      r2ObjectsMissingInventory: r2ObjectsMissingInventory.slice(0, maxSampleCount),
      inventoryObjectsMissingInR2: inventoryObjectsMissingInR2.slice(0, maxSampleCount)
    }
  };
}

export async function loadPostgresArtifactReferences(client, { bucket } = {}) {
  const tableMap = await loadExistingTableMap(client, ["render_packets", "api_jobs", "card_gallery_entries", "artifact_objects"]);
  const references = [];

  if (tableMap.render_packets) {
    const result = await client.query("SELECT id, project_id, artifact_uri, artifact_manifest FROM render_packets");
    for (const row of result.rows) {
      addReference(references, row.artifact_uri, {
        bucket,
        tableName: "render_packets",
        recordId: row.id,
        fieldName: "artifact_uri",
        projectId: row.project_id,
        referenceRole: "render-packet-manifest"
      });
      collectReferencesFromJson(row.artifact_manifest, references, {
        bucket,
        tableName: "render_packets",
        recordId: row.id,
        projectId: row.project_id,
        path: "artifact_manifest"
      });
    }
  }

  if (tableMap.api_jobs) {
    const result = await client.query("SELECT id, route_id, status, result FROM api_jobs WHERE result <> '{}'::jsonb");
    for (const row of result.rows) {
      collectReferencesFromJson(row.result, references, {
        bucket,
        tableName: "api_jobs",
        recordId: row.id,
        routeId: row.route_id,
        status: row.status,
        path: "result"
      });
    }
  }

  if (tableMap.card_gallery_entries) {
    const result = await client.query(
      `SELECT id, project_id, render_packet_id, thumbnail_artifact_uri, front_artifact_uri,
              inside_left_artifact_uri, inside_right_artifact_uri, back_artifact_uri
       FROM card_gallery_entries`
    );
    for (const row of result.rows) {
      for (const fieldName of [
        "thumbnail_artifact_uri",
        "front_artifact_uri",
        "inside_left_artifact_uri",
        "inside_right_artifact_uri",
        "back_artifact_uri"
      ]) {
        addReference(references, row[fieldName], {
          bucket,
          tableName: "card_gallery_entries",
          recordId: row.id,
          fieldName,
          projectId: row.project_id,
          renderPacketId: row.render_packet_id,
          referenceRole: "gallery-artifact"
        });
      }
    }
  }

  return {
    references: dedupeReferences(references),
    tables: tableMap
  };
}

export async function upsertArtifactObjectRecords(client, records) {
  let upserted = 0;
  for (const record of records) {
    await client.query(
      `INSERT INTO artifact_objects
         (object_key, bucket, storage_provider, project_id, render_packet_id, file_name, artifact_role,
          content_type, byte_length, last_modified_at, object_metadata, linked_references, link_status,
          primary_link_table, primary_link_id, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               $8, $9, $10::timestamptz, $11::jsonb, $12::jsonb, $13,
               $14, $15, 'r2-inventory')
       ON CONFLICT (object_key) DO UPDATE SET
         bucket = EXCLUDED.bucket,
         storage_provider = EXCLUDED.storage_provider,
         project_id = EXCLUDED.project_id,
         render_packet_id = EXCLUDED.render_packet_id,
         file_name = EXCLUDED.file_name,
         artifact_role = EXCLUDED.artifact_role,
         content_type = EXCLUDED.content_type,
         byte_length = EXCLUDED.byte_length,
         last_modified_at = EXCLUDED.last_modified_at,
         object_metadata = EXCLUDED.object_metadata,
         linked_references = EXCLUDED.linked_references,
         link_status = EXCLUDED.link_status,
         primary_link_table = EXCLUDED.primary_link_table,
         primary_link_id = EXCLUDED.primary_link_id,
         last_seen_at = NOW()`,
      [
        record.objectKey,
        record.bucket,
        record.storageProvider,
        record.projectId,
        record.renderPacketId,
        record.fileName,
        record.artifactRole,
        record.contentType,
        record.byteLength,
        record.lastModifiedAt,
        JSON.stringify(record.objectMetadata),
        JSON.stringify(record.linkedReferences),
        record.linkStatus,
        record.primaryLinkTable,
        record.primaryLinkId
      ]
    );
    upserted += 1;
  }
  return upserted;
}

export async function runArtifactInventory({ argv = process.argv.slice(2), env: baseEnv = process.env, cwd = process.cwd() } = {}) {
  const options = parseArtifactInventoryArgs(argv);
  if (options.help) {
    return {
      help: true,
      text: [
        "Usage: node scripts/artifact-inventory.mjs [--json] [--write|--import] [--prefix projects/] [--no-local-env]",
        "",
        "Dry-run is the default. --write upserts R2 object inventory rows into production Postgres."
      ].join("\n")
    };
  }

  const env = loadSupplementedEnv({ baseEnv, cwd, envFiles: options.envFiles });
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required for artifact inventory.");

  const objectStoreRuntime = createObjectStoreRuntime({ env });
  const objectStoreDescription = objectStoreRuntime.describe();
  const objectStoreBlockers = objectStoreRuntime.validate();
  if (objectStoreBlockers.length > 0) {
    throw new Error(`Object store is not ready: ${objectStoreBlockers.join(" ")}`);
  }

  const client = new pg.Client({
    connectionString: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
  });

  try {
    await client.connect();
    const postgres = await loadPostgresInventorySummary(client);
    const { references, tables } = await loadPostgresArtifactReferences(client, { bucket: objectStoreDescription.bucket });
    const existingInventoryObjectKeys = tables.artifact_objects ? await loadArtifactObjectKeys(client) : [];
    const objects = await listAllObjectStoreArtifacts(objectStoreRuntime, {
      prefix: options.prefix,
      limit: options.limit
    });
    const inventory = summarizeArtifactInventory({
      objects,
      references,
      bucket: objectStoreDescription.bucket
    });

    let upsertedRows = 0;
    let accounting = summarizeArtifactAccounting({
      r2ObjectKeys: objects.map((object) => object.objectKey),
      inventoryObjectKeys: existingInventoryObjectKeys
    });
    if (options.write) {
      if (!tables.artifact_objects) {
        throw new Error("artifact_objects table is missing. Run npm run migrate against production first.");
      }
      upsertedRows = await upsertArtifactObjectRecords(client, inventory.records);
      accounting = summarizeArtifactAccounting({
        r2ObjectKeys: objects.map((object) => object.objectKey),
        inventoryObjectKeys: [
          ...existingInventoryObjectKeys,
          ...inventory.records.map((record) => record.objectKey)
        ]
      });
    }

    return {
      service: "customcard-artifact-inventory",
      mode: options.write ? "write" : "dry-run",
      prefix: options.prefix,
      objectStore: objectStoreDescription,
      postgres,
      tables,
      drift: inventory.drift,
      inventory: {
        upsertedRows,
        byProject: inventory.breakdown.byProject,
        byRole: inventory.breakdown.byRole,
        byLinkStatus: inventory.breakdown.byLinkStatus
      },
      accounting,
      samples: inventory.samples
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function loadArtifactObjectKeys(client) {
  const result = await client.query("SELECT object_key FROM artifact_objects ORDER BY object_key");
  return result.rows.map((row) => row.object_key);
}

async function listAllObjectStoreArtifacts(objectStoreRuntime, { prefix, limit }) {
  const objects = [];
  let cursor;
  do {
    const result = await objectStoreRuntime.listBucketArtifacts({
      query: {
        prefix,
        limit,
        cursor,
        sort: "key",
        order: "asc"
      }
    });
    if (result.statusCode !== 200) {
      throw new Error(`Object store list failed: ${JSON.stringify(result.payload?.blockers ?? result.payload ?? {})}`);
    }
    objects.push(...(result.payload.objects ?? []));
    cursor = result.payload.nextCursor || undefined;
    if (!result.payload.truncated) break;
  } while (cursor);
  return objects;
}

async function loadPostgresInventorySummary(client) {
  const databaseResult = await client.query("SELECT current_database() AS database_name, current_schema() AS schema_name");
  const tables = await loadExistingTableMap(client, ["render_packets", "api_jobs", "card_gallery_entries", "artifact_objects"]);
  const counts = {};
  for (const [tableName, exists] of Object.entries(tables)) {
    if (!exists) {
      counts[tableName] = null;
      continue;
    }
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
    counts[tableName] = Number(result.rows[0]?.count ?? 0);
  }

  let aiJobStatuses = {};
  if (tables.api_jobs) {
    const result = await client.query(
      "SELECT status, COUNT(*)::int AS count FROM api_jobs WHERE route_id = 'ai-card-generate' GROUP BY status ORDER BY status"
    );
    aiJobStatuses = Object.fromEntries(result.rows.map((row) => [row.status, Number(row.count)]));
  }

  return {
    database: databaseResult.rows[0]?.database_name ?? null,
    schema: databaseResult.rows[0]?.schema_name ?? null,
    counts,
    aiJobStatuses
  };
}

async function loadExistingTableMap(client, tableNames) {
  const tableMap = {};
  for (const tableName of tableNames) {
    const result = await client.query("SELECT to_regclass($1) IS NOT NULL AS exists", [`public.${tableName}`]);
    tableMap[tableName] = Boolean(result.rows[0]?.exists);
  }
  return tableMap;
}

function collectReferencesFromJson(value, references, context) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectReferencesFromJson(entry, references, {
        ...context,
        path: `${context.path}[${index}]`
      })
    );
    return;
  }

  const duplicateObjectKey = value.duplicateOfObjectKey ?? value.duplicate_of_object_key;
  const logicalObjectKey = value.objectKey ?? value.object_key ?? value.image_object_key;
  if (duplicateObjectKey) {
    addReference(references, duplicateObjectKey, {
      ...context,
      fieldName: "duplicate_of_object_key",
      logicalObjectKey: String(logicalObjectKey ?? ""),
      referenceRole: "deduped-physical-artifact"
    });
  } else if (logicalObjectKey) {
    addReference(references, logicalObjectKey, {
      ...context,
      fieldName: "object_key",
      referenceRole: "object-key-artifact"
    });
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (knownArtifactReferenceKeys.has(key)) {
      addReference(references, nestedValue, {
        ...context,
        fieldName: key,
        referenceRole: "artifact-uri"
      });
      continue;
    }
    if (knownObjectKeyReferenceKeys.has(key)) continue;
    if (nestedValue && typeof nestedValue === "object") {
      collectReferencesFromJson(nestedValue, references, {
        ...context,
        path: context.path ? `${context.path}.${key}` : key
      });
    }
  }
}

function addReference(references, value, context) {
  const objectKey = objectKeyFromArtifactReference(value, { bucket: context.bucket });
  if (!objectKey) return;
  references.push({
    objectKey,
    tableName: context.tableName,
    recordId: context.recordId,
    fieldName: context.fieldName,
    path: context.path,
    projectId: context.projectId,
    renderPacketId: context.renderPacketId,
    routeId: context.routeId,
    status: context.status,
    logicalObjectKey: context.logicalObjectKey || undefined,
    referenceRole: context.referenceRole ?? "artifact"
  });
}

function dedupeReferences(references) {
  const byIdentity = new Map();
  for (const reference of references) {
    const identity = [
      reference.objectKey,
      reference.tableName,
      reference.recordId,
      reference.fieldName,
      reference.path,
      reference.logicalObjectKey
    ].join("\u0000");
    if (!byIdentity.has(identity)) byIdentity.set(identity, reference);
  }
  return Array.from(byIdentity.values()).sort((first, second) =>
    first.objectKey.localeCompare(second.objectKey) ||
    String(first.tableName).localeCompare(String(second.tableName)) ||
    String(first.recordId).localeCompare(String(second.recordId))
  );
}

function compactReference(reference) {
  return Object.fromEntries(Object.entries(reference).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = String(selector(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([first], [second]) => first.localeCompare(second)));
}

function metadataValue(metadata, camelKey) {
  const compactKey = camelKey.toLowerCase();
  return String(
    metadata?.[camelKey] ??
      metadata?.[compactKey] ??
      metadata?.[camelKey.replace(/[A-Z]/g, (letter) => letter.toLowerCase())] ??
      ""
  );
}

function safeLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(50, Math.trunc(parsed)));
}

function safeNonNegativeInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function safeTimestamp(value) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function decodeObjectKey(value) {
  try {
    return decodeURIComponent(String(value));
  } catch {
    return String(value);
  }
}

function unquoteEnvValue(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replace(/\\n/g, "\n");
  }
  const commentIndex = value.indexOf(" #");
  return commentIndex >= 0 ? value.slice(0, commentIndex).trim() : value;
}

async function main() {
  const result = await runArtifactInventory();
  if (result.help) {
    console.log(result.text);
    return;
  }
  const json = JSON.stringify(result, null, 2);
  if (parseArtifactInventoryArgs(process.argv.slice(2)).json) {
    console.log(json);
  } else {
    console.log(json);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error?.stack ?? error?.message ?? String(error));
    process.exit(1);
  });
}
