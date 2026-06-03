import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer as createViteServer } from "vite";

const rootPath = await mkdtemp(join(tmpdir(), "customcard-artifacts-"));
const signingSecret = process.env.OBJECT_STORE_SIGNING_SECRET ?? "test-object-store-signing-secret-32";
const blockers = [];
let result;
let vite;
let exitCode = 0;

try {
  vite = await createViteServer({ appType: "custom", logLevel: "error", server: { middlewareMode: true } });
  const { buildArtifactHandoffContract, validateArtifactHandoffContract } = await vite.ssrLoadModule("/src/artifactHandoff.ts");
  const {
    createInMemoryS3CompatibleArtifactClient,
    writeFilesystemArtifactStore,
    writeS3CompatibleArtifactStore
  } = await vite.ssrLoadModule("/src/artifactStore.ts");
  const { buildSamplePrintExportPackage } = await vite.ssrLoadModule("/src/printExport.ts");

  const printPackage = buildSamplePrintExportPackage();
  const filesystemHandoff = await buildArtifactHandoffContract(printPackage, {
    projectId: "project-demo",
    storageProvider: "filesystem",
    objectStoreUrl: pathToFileURL(rootPath).toString(),
    publicBaseUrl: "http://127.0.0.1:4173/api/artifacts",
    signingSecret,
    expiresInMinutes: Number(process.env.ARTIFACT_SIGNED_URL_TTL_MINUTES ?? 15),
    generatedAtIso: "2026-06-03T12:00:00.000Z"
  });
  blockers.push(...prefixBlockers("filesystem", await validateArtifactHandoffContract(filesystemHandoff, signingSecret)));
  const filesystemResult = await writeFilesystemArtifactStore(printPackage, filesystemHandoff);
  blockers.push(...prefixBlockers("filesystem", filesystemResult.blockers));

  const s3Client = createInMemoryS3CompatibleArtifactClient();
  const s3Handoff = await buildArtifactHandoffContract(printPackage, {
    projectId: "project-demo",
    storageProvider: "s3-compatible",
    objectStoreUrl: "https://minio.internal:9000",
    publicBaseUrl: "https://cdn.customcard.example/artifacts",
    bucket: "customcard-prod",
    signingSecret,
    expiresInMinutes: Number(process.env.ARTIFACT_SIGNED_URL_TTL_MINUTES ?? 15),
    generatedAtIso: "2026-06-03T12:00:00.000Z"
  });
  blockers.push(...prefixBlockers("s3-compatible", await validateArtifactHandoffContract(s3Handoff, signingSecret)));
  const s3Result = await writeS3CompatibleArtifactStore(printPackage, s3Handoff, s3Client);
  blockers.push(...prefixBlockers("s3-compatible", s3Result.blockers));
  result = filesystemResult;

  const report = {
    service: "customcard-artifact-store-doctor",
    status: blockers.length === 0 && filesystemResult.status === "ready" && s3Result.status === "ready" ? "ready" : "blocked",
    artifactCount: filesystemResult.artifactCount,
    verifiedWrites: filesystemResult.writes.filter((write) => write.verified).length + s3Result.writes.filter((write) => write.verified).length,
    manifestStored: Boolean(filesystemResult.manifestPath) && Boolean(s3Result.manifestPath),
    filesystem: summarizeResult(filesystemResult),
    s3CompatibleContract: {
      ...summarizeResult(s3Result),
      putObjects: s3Client.objects().length,
      cloudWritesVerified: false
    },
    noNetwork: filesystemResult.noNetwork && s3Result.noNetwork,
    cloudWritesVerified: false,
    realOrdersEnabled: filesystemResult.realOrdersEnabled || s3Result.realOrdersEnabled,
    blockers
  };
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready") exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify(
      {
        service: "customcard-artifact-store-doctor",
        status: "blocked",
        storageProvider: "filesystem",
        artifactCount: result?.artifactCount ?? 0,
        verifiedWrites: result?.writes?.filter((write) => write.verified).length ?? 0,
        noNetwork: true,
        realOrdersEnabled: false,
        blockers: [{ id: "artifact-store-doctor", detail: error instanceof Error ? error.message : String(error) }]
      },
      null,
      2
    )
  );
  exitCode = 1;
} finally {
  await rm(rootPath, { recursive: true, force: true }).catch(() => undefined);
  await vite?.close().catch(() => undefined);
}

if (exitCode !== 0) process.exit(exitCode);

function summarizeResult(storeResult) {
  return {
    storageProvider: storeResult.storageProvider,
    status: storeResult.status,
    bucket: storeResult.bucket ?? null,
    artifactCount: storeResult.artifactCount,
    manifestStored: Boolean(storeResult.manifestPath),
    verifiedWrites: storeResult.writes.filter((write) => write.verified).length,
    noNetwork: storeResult.noNetwork,
    realOrdersEnabled: storeResult.realOrdersEnabled,
    blockers: storeResult.blockers
  };
}

function prefixBlockers(scope, items) {
  return items.map((item) => `${scope}: ${item}`);
}
