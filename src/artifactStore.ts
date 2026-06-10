import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildArtifactHandoffContract, type ArtifactHandoffConfig, type ArtifactHandoffContract, type StoredPrintArtifact } from "./artifactHandoff";
import type { PrintExportFile, PrintExportPackage } from "./printExport";

export type ArtifactStoreProvider = "filesystem" | "s3-compatible";

export interface ArtifactStoreWrite {
  objectKey: string;
  fileName: string;
  byteLength: number;
  contentHash: string;
  path: string;
  bucket?: string;
  verified: boolean;
}

export interface ArtifactStoreResult {
  service: "customcard-artifact-store";
  status: "ready" | "blocked";
  storageProvider: ArtifactStoreProvider;
  proofLevel: "local-filesystem-readback" | "injected-s3-compatible-readback";
  rootPath: string;
  bucket?: string;
  artifactCount: number;
  manifestPath: string;
  writes: ArtifactStoreWrite[];
  noNetwork: true;
  cloudWritesVerified: false;
  liveProviderCalls: false;
  realOrdersEnabled: false;
  blockers: string[];
}

export interface S3CompatiblePutObjectInput {
  bucket: string;
  key: string;
  body: string;
  contentType: string;
  byteLength: number;
  contentHash: string;
  metadata: Record<string, string>;
}

export interface S3CompatibleGetObjectInput {
  bucket: string;
  key: string;
}

export interface S3CompatibleStoredObject extends S3CompatiblePutObjectInput {
  storedAtIso: string;
}

export interface S3CompatibleArtifactStoreClient {
  putObject(input: S3CompatiblePutObjectInput): Promise<void>;
  getObjectText(input: S3CompatibleGetObjectInput): Promise<string>;
}

export interface InMemoryS3CompatibleArtifactStoreClient extends S3CompatibleArtifactStoreClient {
  objects(): S3CompatibleStoredObject[];
}

interface ArtifactWriteTarget {
  writeArtifact(artifact: StoredPrintArtifact, sourceFile: PrintExportFile): Promise<ArtifactStoreWrite>;
  writeManifest(handoff: ArtifactHandoffContract, body: string): Promise<string>;
  readManifest(path: string): Promise<string>;
}

export async function writeFilesystemArtifactStore(
  printPackage: PrintExportPackage,
  handoff: ArtifactHandoffContract
): Promise<ArtifactStoreResult> {
  const blockers = validateFilesystemStoreInputs(printPackage, handoff);
  const rootPath = handoff.manifest.objectStoreUrl.startsWith("file://")
    ? fileURLToPath(handoff.manifest.objectStoreUrl)
    : "";
  const fileByName = new Map(printPackage.files.map((file) => [file.fileName, file]));
  const writes: ArtifactStoreWrite[] = [];

  if (blockers.length > 0) {
    return buildResult("blocked", "filesystem", "local-filesystem-readback", rootPath, "", writes, blockers);
  }

  await mkdir(rootPath, { recursive: true });
  const manifestPath = await writeAndVerifyArtifacts(printPackage, handoff, fileByName, writes, blockers, {
    async writeArtifact(artifact, sourceFile) {
      const artifactPath = resolveObjectPath(rootPath, artifact.objectKey);
      await mkdir(dirname(artifactPath), { recursive: true });
      await writeFile(artifactPath, sourceFile.text, "utf8");
      const writtenText = await readFile(artifactPath, "utf8");
      return buildWriteRecord(artifact, sourceFile, writtenText, artifactPath);
    },
    async writeManifest(manifestHandoff, body) {
      const path = resolveObjectPath(
        rootPath,
        `${manifestHandoff.projectId}/${manifestHandoff.draftId}/artifact-handoff-manifest.json`
      );
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body, "utf8");
      return path;
    },
    readManifest(path) {
      return readFile(path, "utf8");
    }
  });

  return buildResult(
    blockers.length === 0 ? "ready" : "blocked",
    "filesystem",
    "local-filesystem-readback",
    rootPath,
    manifestPath,
    writes,
    blockers
  );
}

export async function cleanupFilesystemArtifactStore(result: Pick<ArtifactStoreResult, "rootPath">): Promise<void> {
  if (!result.rootPath) return;
  if (!basename(result.rootPath).startsWith("customcard-artifacts-")) return;
  await rm(result.rootPath, { recursive: true, force: true });
}

export async function writeS3CompatibleArtifactStore(
  printPackage: PrintExportPackage,
  handoff: ArtifactHandoffContract,
  client: S3CompatibleArtifactStoreClient
): Promise<ArtifactStoreResult> {
  const bucket = resolveS3Bucket(handoff);
  const blockers = validateS3CompatibleStoreInputs(printPackage, handoff, bucket);
  const fileByName = new Map(printPackage.files.map((file) => [file.fileName, file]));
  const writes: ArtifactStoreWrite[] = [];

  if (blockers.length > 0) {
    return buildResult(
      "blocked",
      "s3-compatible",
      "injected-s3-compatible-readback",
      handoff.manifest.objectStoreUrl,
      "",
      writes,
      blockers,
      bucket
    );
  }

  const manifestKey = buildArtifactManifestObjectKey(handoff);
  const manifestPath = await writeAndVerifyArtifacts(printPackage, handoff, fileByName, writes, blockers, {
    async writeArtifact(artifact, sourceFile) {
      await client.putObject({
        bucket,
        key: artifact.objectKey,
        body: sourceFile.text,
        contentType: sourceFile.mimeType,
        byteLength: sourceFile.byteLength,
        contentHash: sourceFile.contentHash,
        metadata: buildArtifactMetadata(handoff, sourceFile)
      });
      const writtenText = await client.getObjectText({ bucket, key: artifact.objectKey });
      return buildWriteRecord(artifact, sourceFile, writtenText, `s3://${bucket}/${artifact.objectKey}`, bucket);
    },
    async writeManifest(_handoff, body) {
      await client.putObject({
        bucket,
        key: manifestKey,
        body,
        contentType: "application/json",
        byteLength: byteLength(body),
        contentHash: contentHash(body),
        metadata: {
          projectId: handoff.projectId,
          draftId: handoff.draftId,
          artifactRole: "handoff-manifest",
          realOrdersEnabled: "false"
        }
      });
      return `s3://${bucket}/${manifestKey}`;
    },
    readManifest() {
      return client.getObjectText({ bucket, key: manifestKey });
    }
  });

  return buildResult(
    blockers.length === 0 ? "ready" : "blocked",
    "s3-compatible",
    "injected-s3-compatible-readback",
    handoff.manifest.objectStoreUrl,
    manifestPath,
    writes,
    blockers,
    bucket
  );
}

export function createInMemoryS3CompatibleArtifactClient(): InMemoryS3CompatibleArtifactStoreClient {
  const storedObjects = new Map<string, S3CompatibleStoredObject>();
  return {
    async putObject(input) {
      storedObjects.set(`${input.bucket}/${input.key}`, {
        ...input,
        metadata: { ...input.metadata },
        storedAtIso: "2026-06-03T12:00:00.000Z"
      });
    },
    async getObjectText(input) {
      const object = storedObjects.get(`${input.bucket}/${input.key}`);
      if (!object) throw new Error(`S3-compatible object not found: ${input.bucket}/${input.key}`);
      return object.body;
    },
    objects() {
      return Array.from(storedObjects.values());
    }
  };
}

function validateFilesystemStoreInputs(printPackage: PrintExportPackage, handoff: ArtifactHandoffContract): string[] {
  const blockers = validateSharedStoreInputs(printPackage, handoff);
  if (handoff.storageProvider !== "filesystem") blockers.push("Artifact store doctor only writes filesystem storage.");
  if (!handoff.manifest.objectStoreUrl.startsWith("file://")) blockers.push("Filesystem artifact store requires a file:// objectStoreUrl.");
  return blockers;
}

function validateS3CompatibleStoreInputs(printPackage: PrintExportPackage, handoff: ArtifactHandoffContract, bucket: string): string[] {
  const blockers = validateSharedStoreInputs(printPackage, handoff);
  if (handoff.storageProvider !== "s3-compatible") blockers.push("S3-compatible artifact store only writes s3-compatible storage.");
  if (!bucket) blockers.push("S3-compatible artifact store requires a bucket.");
  if (bucket && !isSafeBucketName(bucket)) blockers.push(`Unsafe S3-compatible bucket name: ${bucket}`);
  if (handoff.manifest.objectStoreUrl.startsWith("file://")) blockers.push("S3-compatible artifact store cannot use a file:// objectStoreUrl.");
  if (bucket && !handoff.manifest.artifacts.every((artifact) => artifactUriTargetsBucket(artifact.artifactUri, bucket))) {
    blockers.push("S3-compatible artifact URIs must include the target bucket.");
  }
  return blockers;
}

function validateSharedStoreInputs(printPackage: PrintExportPackage, handoff: ArtifactHandoffContract): string[] {
  const blockers: string[] = [];
  if (!handoff.manifest.passed) blockers.push("Artifact handoff manifest must pass before writes.");
  if (!handoff.manifest.noNetwork) blockers.push("Artifact store writes must start from a no-network handoff.");
  if (!handoff.manifest.externalShareApprovalRequired) blockers.push("Artifact store writes must preserve external share approval.");
  if (handoff.manifest.realOrdersEnabled) blockers.push("Artifact store must not enable real orders.");
  if (handoff.manifest.artifactCount !== printPackage.files.length) blockers.push("Print package file count must match handoff artifact count.");

  for (const artifact of handoff.artifacts) {
    if (!isSafeObjectKey(artifact.objectKey)) blockers.push(`Unsafe artifact object key: ${artifact.objectKey}`);
  }

  return blockers;
}

function buildResult(
  status: ArtifactStoreResult["status"],
  storageProvider: ArtifactStoreProvider,
  proofLevel: ArtifactStoreResult["proofLevel"],
  rootPath: string,
  manifestPath: string,
  writes: ArtifactStoreWrite[],
  blockers: string[],
  bucket?: string
): ArtifactStoreResult {
  return {
    service: "customcard-artifact-store",
    status,
    storageProvider,
    proofLevel,
    rootPath,
    ...(bucket ? { bucket } : {}),
    artifactCount: writes.length,
    manifestPath,
    writes,
    noNetwork: true,
    cloudWritesVerified: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    blockers
  };
}

async function writeAndVerifyArtifacts(
  printPackage: PrintExportPackage,
  handoff: ArtifactHandoffContract,
  fileByName: Map<string, PrintExportFile>,
  writes: ArtifactStoreWrite[],
  blockers: string[],
  target: ArtifactWriteTarget
): Promise<string> {
  for (const artifact of handoff.artifacts) {
    const sourceFile = fileByName.get(artifact.fileName);
    if (!sourceFile) {
      blockers.push(`Missing source file for artifact ${artifact.fileName}.`);
      continue;
    }
    writes.push(await target.writeArtifact(artifact, sourceFile));
  }

  const manifestBody = JSON.stringify(handoff.manifest, null, 2);
  const manifestPath = await target.writeManifest(handoff, manifestBody);
  const manifestText = await target.readManifest(manifestPath);
  verifyStoredArtifactSet(printPackage, handoff, writes, manifestText, blockers);
  return manifestPath;
}

function verifyStoredArtifactSet(
  printPackage: PrintExportPackage,
  handoff: ArtifactHandoffContract,
  writes: ArtifactStoreWrite[],
  manifestText: string,
  blockers: string[]
): void {
  const parsedManifest = JSON.parse(manifestText) as { artifactCount?: number; realOrdersEnabled?: boolean };
  if (writes.length !== handoff.artifacts.length) blockers.push("Not every handoff artifact was written.");
  if (writes.length !== printPackage.files.length) blockers.push("Print package file count does not match stored artifact count.");
  if (writes.some((write) => !write.verified)) blockers.push("One or more written artifacts failed readback verification.");
  if (parsedManifest.artifactCount !== handoff.artifacts.length) blockers.push("Stored handoff manifest artifact count is stale.");
  if (parsedManifest.realOrdersEnabled !== false) blockers.push("Stored handoff manifest must keep real orders disabled.");
}

function buildWriteRecord(
  artifact: StoredPrintArtifact,
  sourceFile: PrintExportFile,
  text: string,
  path: string,
  bucket?: string
): ArtifactStoreWrite {
  return {
    objectKey: artifact.objectKey,
    fileName: artifact.fileName,
    byteLength: byteLength(text),
    contentHash: contentHash(text),
    path,
    ...(bucket ? { bucket } : {}),
    verified: artifactMatchesSource(text, sourceFile, artifact)
  };
}

function resolveObjectPath(rootPath: string, objectKey: string): string {
  const resolvedRoot = resolve(rootPath);
  const resolvedPath = resolve(join(resolvedRoot, ...objectKey.split("/")));
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${sep}`)) {
    throw new Error(`Artifact object key escaped storage root: ${objectKey}`);
  }
  return resolvedPath;
}

function artifactMatchesSource(text: string, sourceFile: PrintExportFile, artifact: StoredPrintArtifact): boolean {
  return (
    byteLength(text) === sourceFile.byteLength &&
    byteLength(text) === artifact.byteLength &&
    contentHash(text) === sourceFile.contentHash &&
    contentHash(text) === artifact.contentHash
  );
}

function buildArtifactMetadata(handoff: ArtifactHandoffContract, sourceFile: PrintExportFile): Record<string, string> {
  return {
    projectId: handoff.projectId,
    draftId: handoff.draftId,
    fileName: sourceFile.fileName,
    kind: sourceFile.kind,
    contentHash: sourceFile.contentHash,
    realOrdersEnabled: "false"
  };
}

function buildArtifactManifestObjectKey(handoff: ArtifactHandoffContract): string {
  return `projects/${handoff.projectId}/render-packets/${handoff.draftId}/artifact-handoff-manifest.json`;
}

function isSafeObjectKey(value: string): boolean {
  if (!value || value.includes("\\")) return false;
  if (isAbsolute(value)) return false;
  return value.split("/").every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..");
}

function resolveS3Bucket(handoff: ArtifactHandoffContract): string {
  if (handoff.manifest.bucket) return handoff.manifest.bucket;
  const match = /^s3:\/\/([^/]+)/.exec(handoff.manifest.objectStoreUrl);
  return match?.[1] ?? "";
}

function isSafeBucketName(value: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value) && !value.includes("..") && !/^\d+\.\d+\.\d+\.\d+$/.test(value);
}

function artifactUriTargetsBucket(value: string, bucket: string): boolean {
  if (value.startsWith(`s3://${bucket}/`)) return true;
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[0] === bucket;
  } catch {
    return false;
  }
}

function contentHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

// --- Facade ---

export interface ArtifactHandoffPackageResult {
  handoff: ArtifactHandoffContract;
  storeResult: ArtifactStoreResult;
}

/**
 * Single-call facade for the full sign → store → verify lifecycle.
 *
 * Callers pass a print package and storage config; the sequence
 * (buildArtifactHandoffContract → writeFilesystemArtifactStore /
 * writeS3CompatibleArtifactStore) is hidden behind this interface.
 * Provide `s3Client` for the s3-compatible provider, omit for filesystem.
 */
export async function storeArtifactHandoffPackage(
  printPackage: PrintExportPackage,
  config: ArtifactHandoffConfig,
  s3Client?: S3CompatibleArtifactStoreClient
): Promise<ArtifactHandoffPackageResult> {
  const handoff = await buildArtifactHandoffContract(printPackage, config);
  const storeResult =
    config.storageProvider === "s3-compatible" && s3Client
      ? await writeS3CompatibleArtifactStore(printPackage, handoff, s3Client)
      : await writeFilesystemArtifactStore(printPackage, handoff);
  return { handoff, storeResult };
}
