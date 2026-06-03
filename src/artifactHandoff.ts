import { buildSamplePrintExportPackage, type PrintExportFile, type PrintExportFileKind, type PrintExportPackage } from "./printExport";

export type ArtifactStorageProvider = "filesystem" | "s3-compatible";
export type ArtifactSignatureVersion = "hmac-sha256-v1";

export interface ArtifactHandoffConfig {
  projectId: string;
  storageProvider: ArtifactStorageProvider;
  objectStoreUrl: string;
  publicBaseUrl: string;
  signingSecret: string;
  expiresInMinutes: number;
  generatedAtIso?: string;
  bucket?: string;
}

export interface SignedArtifactUrl {
  method: "GET";
  url: string;
  expiresAtIso: string;
  signature: string;
  signatureVersion: ArtifactSignatureVersion;
  signaturePayload: string;
}

export interface StoredPrintArtifact {
  kind: PrintExportFileKind;
  fileName: string;
  mimeType: string;
  byteLength: number;
  contentHash: string;
  objectKey: string;
  artifactUri: string;
  signedDownload: SignedArtifactUrl;
}

export interface ArtifactHandoffPreflightCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface ArtifactHandoffManifest {
  projectId: string;
  draftId: string;
  generatedAtIso: string;
  expiresAtIso: string;
  storageProvider: ArtifactStorageProvider;
  objectStoreUrl: string;
  bucket?: string;
  artifactCount: number;
  artifacts: Omit<StoredPrintArtifact, "signedDownload">[];
  manifestChecksum: string;
  preflight: ArtifactHandoffPreflightCheck[];
  passed: boolean;
  noNetwork: true;
  externalShareApprovalRequired: true;
  realOrdersEnabled: false;
}

export interface ArtifactHandoffContract {
  projectId: string;
  draftId: string;
  generatedAtIso: string;
  expiresAtIso: string;
  storageProvider: ArtifactStorageProvider;
  artifacts: StoredPrintArtifact[];
  manifest: ArtifactHandoffManifest;
}

const defaultGeneratedAtIso = "2026-06-03T12:00:00.000Z";
const maxSignedUrlMinutes = 60;

export async function buildArtifactHandoffContract(
  printPackage: PrintExportPackage,
  config: ArtifactHandoffConfig
): Promise<ArtifactHandoffContract> {
  const generatedAtIso = config.generatedAtIso ?? defaultGeneratedAtIso;
  const expiresAtIso = new Date(Date.parse(generatedAtIso) + config.expiresInMinutes * 60_000).toISOString();
  const configErrors = validateArtifactHandoffConfig(config);
  const artifacts = await Promise.all(
    printPackage.files.map((file) => buildStoredArtifact(file, printPackage, config, expiresAtIso))
  );
  const preflight = buildArtifactPreflight(printPackage, config, configErrors, artifacts);
  const manifestBase = {
    projectId: config.projectId,
    draftId: printPackage.draftId,
    generatedAtIso,
    expiresAtIso,
    storageProvider: config.storageProvider,
    objectStoreUrl: trimTrailingSlash(config.objectStoreUrl),
    ...(config.bucket ? { bucket: config.bucket } : {}),
    artifactCount: artifacts.length,
    artifacts: artifacts.map(stripSignedDownload),
    preflight,
    passed: preflight.every((check) => check.passed),
    noNetwork: true as const,
    externalShareApprovalRequired: true as const,
    realOrdersEnabled: false as const
  };
  const manifest: ArtifactHandoffManifest = {
    ...manifestBase,
    manifestChecksum: artifactChecksum(JSON.stringify(manifestBase))
  };

  return {
    projectId: config.projectId,
    draftId: printPackage.draftId,
    generatedAtIso,
    expiresAtIso,
    storageProvider: config.storageProvider,
    artifacts,
    manifest
  };
}

export async function buildSampleArtifactHandoffContract(): Promise<ArtifactHandoffContract> {
  return buildArtifactHandoffContract(buildSamplePrintExportPackage(), {
    projectId: "project-demo",
    storageProvider: "filesystem",
    objectStoreUrl: "file:///tmp/customcard-artifacts",
    publicBaseUrl: "http://127.0.0.1:4173/api/artifacts",
    signingSecret: "sample-object-store-signing-secret-32",
    expiresInMinutes: 15,
    generatedAtIso: defaultGeneratedAtIso
  });
}

export function validateArtifactHandoffConfig(config: ArtifactHandoffConfig): string[] {
  const errors: string[] = [];

  if (!isSafePathSegment(config.projectId)) errors.push("Artifact handoff projectId must be a safe path segment.");
  if (config.signingSecret.length < 32) errors.push("Artifact handoff signingSecret must be at least 32 characters.");
  if (!Number.isInteger(config.expiresInMinutes) || config.expiresInMinutes < 5 || config.expiresInMinutes > maxSignedUrlMinutes) {
    errors.push(`Artifact signed URL expiry must be between 5 and ${maxSignedUrlMinutes} minutes.`);
  }
  if (config.storageProvider === "filesystem" && !config.objectStoreUrl.startsWith("file://")) {
    errors.push("Filesystem artifact storage must use a file:// objectStoreUrl.");
  }
  if (config.storageProvider === "s3-compatible") {
    const validS3Base =
      config.objectStoreUrl.startsWith("s3://") ||
      config.objectStoreUrl.startsWith("https://") ||
      config.objectStoreUrl.startsWith("http://");
    if (!validS3Base) errors.push("S3-compatible artifact storage must use s3://, https://, or http:// objectStoreUrl.");
    if (!config.objectStoreUrl.startsWith("s3://") && !config.bucket) {
      errors.push("S3-compatible artifact storage needs OBJECT_STORE_BUCKET when objectStoreUrl is an endpoint URL.");
    }
  }
  if (!isSafePublicBaseUrl(config.publicBaseUrl)) {
    errors.push("Artifact publicBaseUrl must use https, or localhost/127.0.0.1 http for development.");
  }

  return errors;
}

export async function validateArtifactHandoffContract(
  handoff: ArtifactHandoffContract,
  signingSecret: string
): Promise<string[]> {
  const errors: string[] = [];
  const objectKeys = new Set<string>();

  if (!handoff.manifest.passed) errors.push("Artifact handoff manifest preflight did not pass.");
  if (!handoff.manifest.noNetwork) errors.push("Artifact handoff must be no-network at contract-build time.");
  if (!handoff.manifest.externalShareApprovalRequired) errors.push("Artifact handoff must require external share approval.");
  if (handoff.manifest.realOrdersEnabled) errors.push("Artifact handoff must not enable real orders.");
  if (handoff.artifacts.length !== handoff.manifest.artifactCount) errors.push("Artifact handoff count does not match manifest.");
  if (handoff.artifacts.length < 6) errors.push("Artifact handoff should include SVG panels, PDF proof, and manifest JSON.");

  const manifestObjectKeys = new Set(handoff.manifest.artifacts.map((artifact) => artifact.objectKey));
  for (const artifact of handoff.artifacts) {
    if (objectKeys.has(artifact.objectKey)) errors.push(`Duplicate artifact object key: ${artifact.objectKey}`);
    objectKeys.add(artifact.objectKey);
    if (!manifestObjectKeys.has(artifact.objectKey)) errors.push(`Manifest does not list artifact: ${artifact.objectKey}`);
    if (artifact.byteLength <= 0) errors.push(`Artifact ${artifact.fileName} is empty.`);
    if (!artifact.signedDownload.url.includes("signature=")) errors.push(`Artifact ${artifact.fileName} is missing a signed URL.`);
    if (artifact.signedDownload.expiresAtIso !== handoff.expiresAtIso) {
      errors.push(`Artifact ${artifact.fileName} expiry does not match handoff expiry.`);
    }
    if (!(await verifySignedArtifactUrl(handoff.projectId, artifact, signingSecret))) {
      errors.push(`Artifact ${artifact.fileName} signed URL signature is invalid.`);
    }
  }

  const expiresAt = Date.parse(handoff.expiresAtIso);
  const generatedAt = Date.parse(handoff.generatedAtIso);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(generatedAt) || expiresAt <= generatedAt) {
    errors.push("Artifact signed URL expiry must be after generation time.");
  }
  if (expiresAt - generatedAt > maxSignedUrlMinutes * 60_000) {
    errors.push(`Artifact signed URL expiry must be ${maxSignedUrlMinutes} minutes or less.`);
  }

  return errors;
}

export async function verifySignedArtifactUrl(
  projectId: string,
  artifact: StoredPrintArtifact,
  signingSecret: string
): Promise<boolean> {
  const expectedSignature = await signArtifactPayload(
    signingSecret,
    buildSignaturePayload(projectId, artifact.objectKey, artifact.contentHash, artifact.signedDownload.expiresAtIso)
  );
  return expectedSignature === artifact.signedDownload.signature;
}

async function buildStoredArtifact(
  file: PrintExportFile,
  printPackage: PrintExportPackage,
  config: ArtifactHandoffConfig,
  expiresAtIso: string
): Promise<StoredPrintArtifact> {
  const objectKey = buildObjectKey(config.projectId, printPackage.draftId, file.fileName);
  const signaturePayload = buildSignaturePayload(config.projectId, objectKey, file.contentHash, expiresAtIso);
  const signature = await signArtifactPayload(config.signingSecret, signaturePayload);
  const signedUrl = buildSignedUrl(config.publicBaseUrl, objectKey, file.contentHash, expiresAtIso, signature);

  return {
    kind: file.kind,
    fileName: file.fileName,
    mimeType: file.mimeType,
    byteLength: file.byteLength,
    contentHash: file.contentHash,
    objectKey,
    artifactUri: buildArtifactUri(config, objectKey),
    signedDownload: {
      method: "GET",
      url: signedUrl,
      expiresAtIso,
      signature,
      signatureVersion: "hmac-sha256-v1",
      signaturePayload
    }
  };
}

function buildArtifactPreflight(
  printPackage: PrintExportPackage,
  config: ArtifactHandoffConfig,
  configErrors: string[],
  artifacts: StoredPrintArtifact[]
): ArtifactHandoffPreflightCheck[] {
  return [
    {
      label: "Storage signing config",
      passed: configErrors.length === 0,
      detail: configErrors.length === 0 ? `${config.storageProvider} storage is configured` : configErrors.join(" ")
    },
    {
      label: "All print package files mapped",
      passed: artifacts.length === printPackage.files.length && artifacts.length >= 6,
      detail: `${artifacts.length} artifacts for ${printPackage.files.length} print package files`
    },
    {
      label: "Signed URL expiry policy",
      passed: Number.isInteger(config.expiresInMinutes) && config.expiresInMinutes >= 5 && config.expiresInMinutes <= maxSignedUrlMinutes,
      detail: `${config.expiresInMinutes} minute signed URL TTL`
    },
    {
      label: "External share approval required",
      passed: true,
      detail: "Artifact links are only for approved manual printer handoff"
    },
    {
      label: "No live vendor order path",
      passed: true,
      detail: "Object storage does not place quotes, payments, or vendor orders"
    }
  ];
}

function stripSignedDownload(artifact: StoredPrintArtifact): Omit<StoredPrintArtifact, "signedDownload"> {
  return {
    kind: artifact.kind,
    fileName: artifact.fileName,
    mimeType: artifact.mimeType,
    byteLength: artifact.byteLength,
    contentHash: artifact.contentHash,
    objectKey: artifact.objectKey,
    artifactUri: artifact.artifactUri
  };
}

function buildObjectKey(projectId: string, draftId: string, fileName: string): string {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `projects/${projectId}/render-packets/${draftId}/${safeFileName}`;
}

function buildArtifactUri(config: ArtifactHandoffConfig, objectKey: string): string {
  const base = trimTrailingSlash(config.objectStoreUrl);
  if (config.storageProvider === "s3-compatible" && config.bucket && !base.startsWith("s3://")) {
    return `${base}/${encodePathSegment(config.bucket)}/${encodeObjectPath(objectKey)}`;
  }
  return `${base}/${encodeObjectPath(objectKey)}`;
}

function buildSignedUrl(
  publicBaseUrl: string,
  objectKey: string,
  contentHash: string,
  expiresAtIso: string,
  signature: string
): string {
  const params = new URLSearchParams({
    expires: String(Math.floor(Date.parse(expiresAtIso) / 1000)),
    contentHash,
    signature,
    v: "hmac-sha256-v1"
  });
  return `${trimTrailingSlash(publicBaseUrl)}/${encodeObjectPath(objectKey)}?${params.toString()}`;
}

function buildSignaturePayload(projectId: string, objectKey: string, contentHash: string, expiresAtIso: string): string {
  return ["GET", projectId, objectKey, contentHash, expiresAtIso].join("\n");
}

async function signArtifactPayload(secret: string, payload: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto HMAC signing is unavailable.");
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isSafePathSegment(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,80}$/.test(value);
}

function isSafePublicBaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol !== "http:") return false;
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function encodeObjectPath(value: string): string {
  return value.split("/").map(encodePathSegment).join("/");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function artifactChecksum(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `cc_artifact_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
