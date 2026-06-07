import { describe, expect, it } from "vitest";
import { buildSamplePrintExportPackage } from "./printExport";
import {
  buildArtifactHandoffContract,
  buildSampleArtifactHandoffContract,
  validateArtifactHandoffConfig,
  validateArtifactHandoffContract,
  verifySignedArtifactUrl,
  type ArtifactHandoffConfig
} from "./artifactHandoff";

const baseConfig: ArtifactHandoffConfig = {
  projectId: "project-demo",
  storageProvider: "filesystem",
  objectStoreUrl: "file:///tmp/customcard-artifacts",
  publicBaseUrl: "http://127.0.0.1:4173/api/artifacts",
  signingSecret: "test-object-store-signing-secret-32",
  expiresInMinutes: 15,
  generatedAtIso: "2026-06-03T12:00:00.000Z"
};

describe("artifact handoff contracts", () => {
  it("builds a signed object-store handoff for every print package artifact", async () => {
    const handoff = await buildArtifactHandoffContract(buildSamplePrintExportPackage(), baseConfig);

    expect(await validateArtifactHandoffContract(handoff, baseConfig.signingSecret)).toEqual([]);
    expect(handoff.manifest).toMatchObject({
      projectId: "project-demo",
      storageProvider: "filesystem",
      artifactCount: 6,
      passed: true,
      noNetwork: true,
      externalShareApprovalRequired: true,
      realOrdersEnabled: false
    });
    expect(handoff.expiresAtIso).toBe("2026-06-03T12:15:00.000Z");
    expect(handoff.artifacts.map((artifact) => artifact.kind)).toEqual([
      "panel-svg",
      "panel-svg",
      "panel-svg",
      "panel-svg",
      "combined-pdf",
      "manifest-json"
    ]);
    expect(handoff.artifacts[0]).toMatchObject({
      objectKey: expect.stringContaining("projects/project-demo/render-packets/"),
      artifactUri: expect.stringContaining("file:///tmp/customcard-artifacts/projects/project-demo/render-packets/"),
      signedDownload: {
        method: "GET",
        signatureVersion: "hmac-sha256-v1",
        expiresAtIso: "2026-06-03T12:15:00.000Z"
      }
    });
    expect(handoff.artifacts[0].signedDownload.url).toContain("signature=");
    expect(handoff.artifacts[0].signedDownload.url).toContain("contentHash=fnv1a-");
    expect(handoff.manifest.manifestChecksum).toMatch(/^cc_artifact_[0-9a-f]{8}$/);
  });

  it("builds S3-compatible artifact URIs with an explicit bucket", async () => {
    const handoff = await buildArtifactHandoffContract(buildSamplePrintExportPackage(), {
      ...baseConfig,
      storageProvider: "s3-compatible",
      objectStoreUrl: "https://minio.internal:9000",
      publicBaseUrl: "https://cdn.customcard.example/artifacts",
      bucket: "customcard-prod"
    });

    expect(await validateArtifactHandoffContract(handoff, baseConfig.signingSecret)).toEqual([]);
    expect(handoff.artifacts[0].artifactUri).toContain("https://minio.internal:9000/customcard-prod/projects/");
    expect(handoff.artifacts[0].signedDownload.url).toContain("https://cdn.customcard.example/artifacts/projects/");
    expect(handoff.manifest.bucket).toBe("customcard-prod");
  });

  it("blocks unsafe or inconsistent S3-compatible bucket config before artifacts are trusted", async () => {
    expect(
      validateArtifactHandoffConfig({
        ...baseConfig,
        storageProvider: "s3-compatible",
        objectStoreUrl: "s3://customcard-prod",
        publicBaseUrl: "https://cdn.customcard.example/artifacts",
        bucket: "CustomCard Prod"
      })
    ).toEqual(
      expect.arrayContaining([
        "S3-compatible artifact bucket must be a safe bucket name: CustomCard Prod",
        "S3-compatible artifact bucket must match the s3:// objectStoreUrl bucket."
      ])
    );

    const mismatchedHandoff = await buildArtifactHandoffContract(buildSamplePrintExportPackage(), {
      ...baseConfig,
      storageProvider: "s3-compatible",
      objectStoreUrl: "s3://customcard-prod",
      publicBaseUrl: "https://cdn.customcard.example/artifacts",
      bucket: "customcard-other"
    });

    expect(mismatchedHandoff.manifest.passed).toBe(false);
    expect(await validateArtifactHandoffContract(mismatchedHandoff, baseConfig.signingSecret)).toEqual(
      expect.arrayContaining(["Artifact handoff manifest preflight did not pass."])
    );
  });

  it("flags unsafe storage signing configuration before artifacts are trusted", async () => {
    const unsafeConfig: ArtifactHandoffConfig = {
      ...baseConfig,
      projectId: "../bad",
      objectStoreUrl: "https://not-filesystem.example",
      publicBaseUrl: "http://public.example/artifacts",
      signingSecret: "short",
      expiresInMinutes: 120
    };
    const handoff = await buildArtifactHandoffContract(buildSamplePrintExportPackage(), unsafeConfig);

    expect(validateArtifactHandoffConfig(unsafeConfig)).toEqual(
      expect.arrayContaining([
        "Artifact handoff projectId must be a safe path segment.",
        "Artifact handoff signingSecret must be at least 32 characters.",
        "Artifact signed URL expiry must be between 5 and 60 minutes.",
        "Filesystem artifact storage must use a file:// objectStoreUrl.",
        "Artifact publicBaseUrl must use https, or localhost/127.0.0.1 http for development."
      ])
    );
    expect(handoff.manifest.passed).toBe(false);
    expect(await validateArtifactHandoffContract(handoff, unsafeConfig.signingSecret)).toEqual(
      expect.arrayContaining(["Artifact handoff manifest preflight did not pass.", "Artifact signed URL expiry must be 60 minutes or less."])
    );
  });

  it("rejects tampered artifact signatures", async () => {
    const handoff = await buildSampleArtifactHandoffContract();
    const firstArtifact = handoff.artifacts[0];

    expect(await verifySignedArtifactUrl(handoff.projectId, firstArtifact, "sample-object-store-signing-secret-32")).toBe(true);

    const tampered = {
      ...firstArtifact,
      contentHash: "fnv1a-00000000"
    };
    expect(await verifySignedArtifactUrl(handoff.projectId, tampered, "sample-object-store-signing-secret-32")).toBe(false);
  });
});
