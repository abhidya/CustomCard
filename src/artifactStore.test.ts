import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { buildArtifactHandoffContract } from "./artifactHandoff";
import {
  cleanupFilesystemArtifactStore,
  createInMemoryS3CompatibleArtifactClient,
  writeFilesystemArtifactStore,
  writeS3CompatibleArtifactStore
} from "./artifactStore";
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

  it("writes, reads, and verifies S3-compatible artifacts through an injected client contract", async () => {
    const printPackage = buildSamplePrintExportPackage();
    const handoff = await buildArtifactHandoffContract(printPackage, {
      projectId: "project-demo",
      storageProvider: "s3-compatible",
      objectStoreUrl: "https://minio.internal:9000",
      publicBaseUrl: "https://cdn.customcard.example/artifacts",
      bucket: "customcard-prod",
      signingSecret: "test-object-store-signing-secret-32",
      expiresInMinutes: 15,
      generatedAtIso: "2026-06-03T12:00:00.000Z"
    });
    const client = createInMemoryS3CompatibleArtifactClient();

    const result = await writeS3CompatibleArtifactStore(printPackage, handoff, client);

    expect(result).toMatchObject({
      service: "customcard-artifact-store",
      status: "ready",
      storageProvider: "s3-compatible",
      bucket: "customcard-prod",
      artifactCount: 6,
      noNetwork: true,
      cloudWritesVerified: false,
      realOrdersEnabled: false,
      blockers: []
    });
    expect(result.manifestPath).toBe(
      `s3://customcard-prod/projects/project-demo/render-packets/${printPackage.draftId}/artifact-handoff-manifest.json`
    );
    expect(result.writes.every((write) => write.verified && write.bucket === "customcard-prod")).toBe(true);
    expect(result.writes[0].path).toContain("s3://customcard-prod/projects/project-demo/render-packets/");
    expect(client.objects()).toHaveLength(7);
    expect(client.objects().map((object) => object.contentType)).toEqual(
      expect.arrayContaining(["image/svg+xml", "application/pdf", "application/json"])
    );
    expect(client.objects().every((object) => object.metadata.realOrdersEnabled === "false")).toBe(true);
  });

  it("blocks S3-compatible writes when the handoff lacks a trusted bucket", async () => {
    const printPackage = buildSamplePrintExportPackage();
    const unsafeHandoff = await buildArtifactHandoffContract(printPackage, {
      projectId: "project-demo",
      storageProvider: "s3-compatible",
      objectStoreUrl: "https://minio.internal:9000",
      publicBaseUrl: "https://cdn.customcard.example/artifacts",
      signingSecret: "test-object-store-signing-secret-32",
      expiresInMinutes: 15,
      generatedAtIso: "2026-06-03T12:00:00.000Z"
    });

    const result = await writeS3CompatibleArtifactStore(
      printPackage,
      unsafeHandoff,
      createInMemoryS3CompatibleArtifactClient()
    );

    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "Artifact handoff manifest must pass before writes.",
        "S3-compatible artifact store requires a bucket."
      ])
    );
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
