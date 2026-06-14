import { describe, expect, it } from "vitest";
import {
  artifactObjectRecordFromR2Object,
  objectKeyFromArtifactReference,
  parseRenderPacketObjectKey,
  summarizeArtifactAccounting,
  summarizeArtifactInventory
} from "../scripts/artifact-inventory.mjs";

describe("artifact inventory reconciliation", () => {
  it("normalizes artifact references from storage URIs and signed public URLs", () => {
    expect(
      objectKeyFromArtifactReference(
        "https://example.r2.cloudflarestorage.com/customcard-prod/projects/project-a/render-packets/render-a/artifact-handoff-manifest.json",
        { bucket: "customcard-prod" }
      )
    ).toBe("projects/project-a/render-packets/render-a/artifact-handoff-manifest.json");

    expect(
      objectKeyFromArtifactReference(
        "https://cards.example.test/api/artifacts/projects/project-a/render-packets/render-a/provider-front.webp?expires=1900000000&signature=abc",
        { bucket: "customcard-prod" }
      )
    ).toBe("projects/project-a/render-packets/render-a/provider-front.webp");

    expect(
      objectKeyFromArtifactReference(
        "file:///tmp/customcard-artifacts/projects/project-a/render-packets/render-a/front.svg",
        { bucket: "customcard-prod" }
      )
    ).toBe("projects/project-a/render-packets/render-a/front.svg");
  });

  it("derives inventory rows from R2 object metadata and path shape", () => {
    const record = artifactObjectRecordFromR2Object(
      {
        objectKey: "projects/project-a/render-packets/render-a/provider-01-front.webp",
        fileName: "provider-01-front.webp",
        contentType: "image/webp",
        byteLength: 1234,
        lastModifiedIso: "2026-06-14T12:00:00.000Z",
        metadata: {
          projectId: "project-from-metadata",
          renderPacketId: "render-from-metadata",
          kind: "generated-image"
        }
      },
      { bucket: "customcard-prod" }
    );

    expect(record).toMatchObject({
      objectKey: "projects/project-a/render-packets/render-a/provider-01-front.webp",
      bucket: "customcard-prod",
      projectId: "project-from-metadata",
      renderPacketId: "render-from-metadata",
      fileName: "provider-01-front.webp",
      artifactRole: "provider-image",
      linkStatus: "unmatched"
    });
  });

  it("summarizes linked, unmatched, and missing object references without treating deduped logical keys as missing", () => {
    const objects = [
      {
        objectKey: "projects/project-a/render-packets/render-a/artifact-handoff-manifest.json",
        fileName: "artifact-handoff-manifest.json",
        contentType: "application/json",
        byteLength: 100,
        lastModifiedIso: "2026-06-14T12:00:00.000Z",
        metadata: { artifactRole: "handoff-manifest" }
      },
      {
        objectKey: "projects/project-a/render-packets/render-a/provider-01-front.webp",
        fileName: "provider-01-front.webp",
        contentType: "image/webp",
        byteLength: 200,
        lastModifiedIso: "2026-06-14T12:01:00.000Z",
        metadata: { kind: "generated-image" }
      },
      {
        objectKey: "projects/project-a/render-packets/render-a/preview-front.png",
        fileName: "preview-front.png",
        contentType: "image/png",
        byteLength: 300,
        lastModifiedIso: "2026-06-14T12:02:00.000Z",
        metadata: {}
      }
    ];
    const references = [
      {
        objectKey: "projects/project-a/render-packets/render-a/artifact-handoff-manifest.json",
        tableName: "api_jobs",
        recordId: "job-a",
        fieldName: "generated_image_persistence.manifestUri"
      },
      {
        objectKey: "projects/project-a/render-packets/render-a/provider-01-front.webp",
        tableName: "api_jobs",
        recordId: "job-a",
        fieldName: "duplicate_of_object_key",
        logicalObjectKey: "projects/project-a/render-packets/render-a/provider-02-back.webp"
      },
      {
        objectKey: "projects/project-a/render-packets/render-a/provider-03-inside-left.webp",
        tableName: "render_packets",
        recordId: "render-a",
        fieldName: "artifact_manifest.artifacts[2].objectKey"
      }
    ];

    const summary = summarizeArtifactInventory({ objects, references, bucket: "customcard-prod" });

    expect(summary.drift).toEqual({
      r2ObjectCount: 3,
      pgReferencedObjectCount: 3,
      pgRefsMissingInR2: 1,
      r2ObjectsNotReferencedByPg: 1
    });
    expect(summary.breakdown.byLinkStatus).toEqual({ linked: 2, unmatched: 1 });
    expect(summary.records.find((record) => record.fileName === "provider-01-front.webp")?.linkedReferences).toEqual([
      expect.objectContaining({
        tableName: "api_jobs",
        recordId: "job-a",
        logicalObjectKey: "projects/project-a/render-packets/render-a/provider-02-back.webp"
      })
    ]);
    expect(summary.samples.pgRefsMissingInR2).toEqual([
      "projects/project-a/render-packets/render-a/provider-03-inside-left.webp"
    ]);
    expect(summary.samples.r2ObjectsNotReferencedByPg).toEqual([
      "projects/project-a/render-packets/render-a/preview-front.png"
    ]);
  });

  it("falls back to path-derived packet ids when metadata is absent", () => {
    expect(parseRenderPacketObjectKey("projects/project-b/render-packets/render-b/persisted-effective-prompts.json")).toEqual({
      projectId: "project-b",
      renderPacketId: "render-b",
      fileName: "persisted-effective-prompts.json"
    });
  });

  it("separates object-store accounting drift from reference drift", () => {
    expect(
      summarizeArtifactAccounting({
        r2ObjectKeys: ["projects/project-a/render-packets/render-a/front.svg", "projects/project-a/render-packets/render-a/back.svg"],
        inventoryObjectKeys: ["projects/project-a/render-packets/render-a/front.svg", "projects/project-a/render-packets/render-a/stale.svg"]
      })
    ).toMatchObject({
      r2ObjectCount: 2,
      inventoryObjectCount: 2,
      r2ObjectsMissingInventory: 1,
      inventoryObjectsMissingInR2: 1,
      samples: {
        r2ObjectsMissingInventory: ["projects/project-a/render-packets/render-a/back.svg"],
        inventoryObjectsMissingInR2: ["projects/project-a/render-packets/render-a/stale.svg"]
      }
    });
  });
});
