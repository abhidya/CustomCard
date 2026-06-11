import { describe, expect, it } from "vitest";
import { createObjectStoreRuntime } from "../scripts/object-store-runtime.mjs";

const objectStoreEnv = {
  CUSTOMCARD_ARTIFACT_PERSISTENCE: "enabled",
  OBJECT_STORE_URL: "memory://cloudflare-r2",
  OBJECT_STORE_BUCKET: "customcard-prod",
  OBJECT_STORE_ACCESS_KEY_ID: "write-key",
  OBJECT_STORE_SECRET_ACCESS_KEY: "write-secret",
  OBJECT_STORE_READ_ACCESS_KEY_ID: "read-key",
  OBJECT_STORE_READ_SECRET_ACCESS_KEY: "read-secret",
  OBJECT_STORE_REGION: "auto",
  OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
  OBJECT_STORE_PUBLIC_BASE_URL: "http://127.0.0.1:4173/api/artifacts",
  ARTIFACT_SIGNED_URL_TTL_MINUTES: "15"
};

describe("object store runtime", () => {
  it("stores render artifacts and serves them through the HMAC signed URL contract", async () => {
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    const record = {
      id: "render-packet-test",
      projectId: "project-test",
      kind: "validated_print_packet",
      width: 1500,
      height: 2100,
      dpi: 300,
      locale: "en-US",
      direction: "ltr",
      safeZonePassed: true,
      textOverflow: false,
      checksum: "cc_12345678",
      artifactUri: "file:///tmp/customcard-artifacts/projects/project-test/render-packets/render-packet-test/manifest.json",
      storageProvider: "filesystem",
      artifactCount: 6,
      artifactManifest: {
        renderPacketId: "render-packet-test",
        projectId: "project-test",
        storageProvider: "filesystem",
        artifactCount: 6,
        manifestChecksum: "cc_12345678",
        signedUrlExpiresAt: "2026-06-11T12:15:00.000Z",
        externalShareApprovalRequired: true,
        realOrdersEnabled: false
      },
      signedUrlExpiresAt: "2026-06-11T12:15:00.000Z",
      externalShareApprovalRequired: true
    };

    const stored = await runtime.persistRenderPacketArtifacts({
      record,
      bodyText: JSON.stringify({
        artifacts: [
          {
            kind: "panel-svg",
            fileName: "front.svg",
            mimeType: "image/svg+xml",
            text: "<svg viewBox=\"0 0 1500 2100\"><text>Hello</text></svg>",
            panelId: "front"
          }
        ]
      })
    });

    expect(stored.record).toMatchObject({
      storageProvider: "s3-compatible",
      artifactCount: 1,
      artifactManifest: {
        storageProvider: "s3-compatible",
        bucket: "customcard-prod",
        persistenceStatus: "stored",
        liveNetworkCalls: false,
        blockers: []
      }
    });
    expect(stored.payload).toMatchObject({
      artifactPersistence: {
        status: "stored",
        provider: "memory-s3-compatible",
        bucket: "customcard-prod",
        verifiedWrites: 1,
        manifestStored: true
      }
    });

    const signedUrl = new URL(stored.record.signedArtifactUrls[0].url);
    const objectKey = signedUrl.pathname.replace(/^\/api\/artifacts\//, "");
    const downloaded = await runtime.readSignedArtifact({
      objectKey,
      query: signedUrl.searchParams
    });

    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.contentType).toBe("image/svg+xml");
    expect(downloaded.body.toString("utf8")).toContain("Hello");

    const bucket = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "projects/project-test", limit: "10" })
    });

    expect(bucket.statusCode).toBe(200);
    expect(bucket.payload).toMatchObject({
      status: "ready",
      objectStore: {
        provider: "memory-s3-compatible",
        bucket: "customcard-prod",
        credentialMode: "write-read-split"
      },
      objectCount: 2,
      blockers: []
    });
    expect(bucket.payload.objects.map((object) => object.objectKey)).toEqual([
      "projects/project-test/render-packets/render-packet-test/artifact-handoff-manifest.json",
      "projects/project-test/render-packets/render-packet-test/front.svg"
    ]);
    expect(bucket.payload.objects.find((object) => object.fileName === "front.svg")?.signedDownload?.url).toContain(
      "/api/artifacts/projects/project-test/render-packets/render-packet-test/front.svg?"
    );
    expect(JSON.stringify(bucket.payload)).not.toContain("write-secret");
    expect(JSON.stringify(bucket.payload)).not.toContain("read-secret");
  });
});
