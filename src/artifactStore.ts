import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { ArtifactHandoffContract, StoredPrintArtifact } from "./artifactHandoff";
import type { PrintExportFile, PrintExportPackage } from "./printExport";

export interface ArtifactStoreWrite {
  objectKey: string;
  fileName: string;
  byteLength: number;
  contentHash: string;
  path: string;
  verified: boolean;
}

export interface ArtifactStoreResult {
  service: "customcard-artifact-store";
  status: "ready" | "blocked";
  storageProvider: "filesystem";
  rootPath: string;
  artifactCount: number;
  manifestPath: string;
  writes: ArtifactStoreWrite[];
  noNetwork: true;
  realOrdersEnabled: false;
  blockers: string[];
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
    return buildResult("blocked", rootPath, "", writes, blockers);
  }

  await mkdir(rootPath, { recursive: true });

  for (const artifact of handoff.artifacts) {
    const sourceFile = fileByName.get(artifact.fileName);
    if (!sourceFile) {
      blockers.push(`Missing source file for artifact ${artifact.fileName}.`);
      continue;
    }
    const artifactPath = resolveObjectPath(rootPath, artifact.objectKey);
    await mkdir(dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, sourceFile.text, "utf8");
    const writtenText = await readFile(artifactPath, "utf8");
    writes.push({
      objectKey: artifact.objectKey,
      fileName: artifact.fileName,
      byteLength: byteLength(writtenText),
      contentHash: contentHash(writtenText),
      path: artifactPath,
      verified: artifactMatchesSource(writtenText, sourceFile, artifact)
    });
  }

  const manifestPath = resolveObjectPath(rootPath, `${handoff.projectId}/${handoff.draftId}/artifact-handoff-manifest.json`);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, JSON.stringify(handoff.manifest, null, 2), "utf8");
  const manifestText = await readFile(manifestPath, "utf8");
  const parsedManifest = JSON.parse(manifestText) as { artifactCount?: number; realOrdersEnabled?: boolean };

  if (writes.length !== handoff.artifacts.length) blockers.push("Not every handoff artifact was written.");
  if (writes.some((write) => !write.verified)) blockers.push("One or more written artifacts failed readback verification.");
  if (parsedManifest.artifactCount !== handoff.artifacts.length) blockers.push("Stored handoff manifest artifact count is stale.");
  if (parsedManifest.realOrdersEnabled !== false) blockers.push("Stored handoff manifest must keep real orders disabled.");

  return buildResult(blockers.length === 0 ? "ready" : "blocked", rootPath, manifestPath, writes, blockers);
}

export async function cleanupFilesystemArtifactStore(result: Pick<ArtifactStoreResult, "rootPath">): Promise<void> {
  if (!result.rootPath) return;
  if (!basename(result.rootPath).startsWith("customcard-artifacts-")) return;
  await rm(result.rootPath, { recursive: true, force: true });
}

function validateFilesystemStoreInputs(printPackage: PrintExportPackage, handoff: ArtifactHandoffContract): string[] {
  const blockers: string[] = [];
  if (handoff.storageProvider !== "filesystem") blockers.push("Artifact store doctor only writes filesystem storage.");
  if (!handoff.manifest.objectStoreUrl.startsWith("file://")) blockers.push("Filesystem artifact store requires a file:// objectStoreUrl.");
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
  rootPath: string,
  manifestPath: string,
  writes: ArtifactStoreWrite[],
  blockers: string[]
): ArtifactStoreResult {
  return {
    service: "customcard-artifact-store",
    status,
    storageProvider: "filesystem",
    rootPath,
    artifactCount: writes.length,
    manifestPath,
    writes,
    noNetwork: true,
    realOrdersEnabled: false,
    blockers
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

function isSafeObjectKey(value: string): boolean {
  if (!value || value.includes("\\")) return false;
  if (isAbsolute(value)) return false;
  return value.split("/").every((segment) => /^[a-zA-Z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..");
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
