import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildArtifactHandoffContract } from "./artifactHandoff";
import { cleanupFilesystemArtifactStore, writeFilesystemArtifactStore } from "./artifactStore";
import { buildSamplePrintExportPackage } from "./printExport";

describe("artifact store runtime", () => {
  it("writes, reads, and verifies every local print artifact without network calls", async () => {
    const rootPath = await mkdtemp(join(tmpdir(), "customcard-artifacts-"));
    const printPackage = buildSamplePrintExportPackage();
    const handoff = await buildArtifactHandoffContract(printPackage, {
      projectId: "project-demo",
      storageProvider: "filesystem",
      objectStoreUrl: pathToFileURL(rootPath).toString(),
      publicBaseUrl: "http://127.0.0.1:4173/api/artifacts",
      signingSecret: "test-object-store-signing-secret-32",
      expiresInMinutes: 15,
      generatedAtIso: "2026-06-03T12:00:00.000Z"
    });

    try {
      const result = await writeFilesystemArtifactStore(printPackage, handoff);
      expect(result).toMatchObject({
        service: "customcard-artifact-store",
        status: "ready",
        storageProvider: "filesystem",
        artifactCount: 6,
        noNetwork: true,
        realOrdersEnabled: false,
        blockers: []
      });
      expect(result.manifestPath).toContain("artifact-handoff-manifest.json");
      expect(result.writes.every((write) => write.verified)).toBe(true);
      expect(result.writes.map((write) => write.fileName)).toEqual(printPackage.files.map((file) => file.fileName));
    } finally {
      await cleanupFilesystemArtifactStore({ rootPath });
    }
  });

  it("blocks unsafe storage roots or object keys before trusting writes", async () => {
    const printPackage = buildSamplePrintExportPackage();
    const unsafeHandoff = await buildArtifactHandoffContract(printPackage, {
      projectId: "project-demo",
      storageProvider: "filesystem",
      objectStoreUrl: "https://object-store.example/customcard",
      publicBaseUrl: "https://cdn.customcard.example/artifacts",
      signingSecret: "test-object-store-signing-secret-32",
      expiresInMinutes: 15,
      generatedAtIso: "2026-06-03T12:00:00.000Z"
    });

    const result = await writeFilesystemArtifactStore(printPackage, {
      ...unsafeHandoff,
      artifacts: unsafeHandoff.artifacts.map((artifact, index) =>
        index === 0 ? { ...artifact, objectKey: "../bad.svg" } : artifact
      )
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "Filesystem artifact store requires a file:// objectStoreUrl.",
        "Artifact handoff manifest must pass before writes.",
        "Unsafe artifact object key: ../bad.svg"
      ])
    );
  });
});
