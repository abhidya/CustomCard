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
  const { writeFilesystemArtifactStore } = await vite.ssrLoadModule("/src/artifactStore.ts");
  const { buildSamplePrintExportPackage } = await vite.ssrLoadModule("/src/printExport.ts");

  const printPackage = buildSamplePrintExportPackage();
  const handoff = await buildArtifactHandoffContract(printPackage, {
    projectId: "project-demo",
    storageProvider: "filesystem",
    objectStoreUrl: pathToFileURL(rootPath).toString(),
    publicBaseUrl: "http://127.0.0.1:4173/api/artifacts",
    signingSecret,
    expiresInMinutes: Number(process.env.ARTIFACT_SIGNED_URL_TTL_MINUTES ?? 15),
    generatedAtIso: "2026-06-03T12:00:00.000Z"
  });
  blockers.push(...(await validateArtifactHandoffContract(handoff, signingSecret)));
  result = await writeFilesystemArtifactStore(printPackage, handoff);
  blockers.push(...result.blockers);

  const report = {
    service: "customcard-artifact-store-doctor",
    status: blockers.length === 0 && result.status === "ready" ? "ready" : "blocked",
    storageProvider: result.storageProvider,
    artifactCount: result.artifactCount,
    manifestStored: Boolean(result.manifestPath),
    verifiedWrites: result.writes.filter((write) => write.verified).length,
    noNetwork: result.noNetwork,
    realOrdersEnabled: result.realOrdersEnabled,
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
