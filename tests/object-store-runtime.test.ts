import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";
import { createApiRuntime } from "../scripts/api-runtime.mjs";
import { createObjectStoreRuntime } from "../scripts/object-store-runtime.mjs";

const objectStoreEnv = {
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

async function buildCompressiblePngDataUrl() {
  const sharp = (await import("sharp")).default;
  const buffer = await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: "#f4d35e"
    }
  })
    .png({ compressionLevel: 0 })
    .toBuffer();
  return {
    buffer,
    dataUrl: `data:image/png;base64,${buffer.toString("base64")}`
  };
}

describe("object store runtime", () => {
  it("blocks non-HTTPS object store endpoints in production", () => {
    const runtime = createObjectStoreRuntime({
      env: {
        ...objectStoreEnv,
        CUSTOMCARD_ENV: "prod",
        OBJECT_STORE_URL: "http://minio:9000"
      }
    });

    expect(runtime.describe()).toMatchObject({
      configured: false,
      liveNetworkCalls: true
    });
    expect(runtime.validate()).toContain("Object store persistence: OBJECT_STORE_URL must be https:// in production.");
  });

  it("allows local dev MinIO over HTTP outside production", () => {
    const runtime = createObjectStoreRuntime({
      env: {
        ...objectStoreEnv,
        CUSTOMCARD_ENV: "dev",
        OBJECT_STORE_URL: "http://127.0.0.1:9000"
      }
    });

    expect(runtime.validate()).toEqual([]);
    expect(runtime.describe()).toMatchObject({
      configured: true,
      provider: "s3-compatible",
      liveNetworkCalls: true
    });
  });

  it("derives hosted artifact links when production has a loopback public base override", () => {
    const runtime = createObjectStoreRuntime({
      env: {
        ...objectStoreEnv,
        NODE_ENV: "production",
        OBJECT_STORE_URL: "https://example-account.r2.cloudflarestorage.com",
        OBJECT_STORE_PUBLIC_BASE_URL: "http://127.0.0.1:4173/api/artifacts",
        VERCEL_TARGET_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "customcard-three.vercel.app",
        VERCEL_URL: "customcard-5tflubh6n-world-prize-s-projects.vercel.app"
      }
    });

    expect(runtime.describe().publicBaseUrl).toBe("https://customcard-three.vercel.app/api/artifacts");
    expect(runtime.validate()).toEqual([]);
  });

  it("stores render artifacts and serves them through the HMAC signed URL contract", async () => {
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    expect(runtime.describe()).toMatchObject({ writeConcurrency: 4 });
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
        writeConcurrency: 4,
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
    expect(downloaded.contentDisposition).toBe("attachment; filename=\"front.svg\"");
    expect(downloaded.contentSecurityPolicy).toContain("sandbox");
    expect(downloaded.crossOriginResourcePolicy).toBe("same-origin");
    expect(downloaded.downloadOptions).toBe("noopen");
    expect(downloaded.body.toString("utf8")).toContain("Hello");

    const bucket = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "projects/project-test", limit: "10", sort: "key", order: "asc" })
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
    expect(bucket.payload.renderPackets).toHaveLength(1);
    expect(bucket.payload.renderPackets[0]).toMatchObject({
      projectId: "project-test",
      renderPacketId: "render-packet-test",
      objectCount: 2,
      manifestArtifact: expect.objectContaining({ fileName: "artifact-handoff-manifest.json" }),
      panelImages: [expect.objectContaining({ fileName: "front.svg" })]
    });
    expect(bucket.payload.objects.find((object) => object.fileName === "front.svg")?.signedDownload?.url).toContain(
      "/api/artifacts/projects/project-test/render-packets/render-packet-test/front.svg?"
    );
    expect(bucket.payload.objects.find((object) => object.fileName === "front.svg")?.downloadMode).toBe("attachment");
    expect(JSON.stringify(bucket.payload)).not.toContain("write-secret");
    expect(JSON.stringify(bucket.payload)).not.toContain("read-secret");
  });

  it("blocks unsafe SVG artifacts before object-store persistence", async () => {
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });

    const stored = await runtime.persistRenderPacketArtifacts({
      record: {
        id: "render-packet-unsafe-svg",
        projectId: "project-unsafe-svg",
        kind: "validated_print_packet",
        locale: "en-US",
        direction: "ltr",
        safeZonePassed: true,
        textOverflow: false,
        checksum: "cc_unsafe_svg",
        artifactManifest: { persistenceStatus: "pending", blockers: [] }
      },
      bodyText: JSON.stringify({
        artifacts: [
          {
            kind: "panel-svg",
            fileName: "front.svg",
            mimeType: "image/svg+xml",
            text: "<svg viewBox=\"0 0 1500 2100\"><script>alert(1)</script></svg>",
            panelId: "front"
          }
        ]
      })
    });

    expect(stored.record.kind).toBe("blocked");
    expect(stored.record.artifactManifest).toMatchObject({
      persistenceStatus: "blocked",
      blockers: [expect.stringContaining("Unsafe SVG artifact content: front.svg")]
    });
    expect(stored.payload.artifactPersistence).toMatchObject({
      status: "blocked",
      storedArtifactCount: 1,
      manifestStored: false
    });
  });

  it("compresses generated raster data URLs into signed artifacts instead of inline response bytes", async () => {
    const runtime = createApiRuntime({
      env: objectStoreEnv,
      routes: apiRouteContracts
    });
    const { buffer: pngBuffer, dataUrl: pngDataUrl } = await buildCompressiblePngDataUrl();
    const payload = {
      draft_id: "ai-draft-storage",
      card_copy: { panels: [] },
      images: [
        {
          panel_id: "front",
          image_url: pngDataUrl,
          revised_prompt: "Front generated image.",
          width: 1500,
          height: 2100
        },
        {
          panel_id: "back",
          image_url: pngDataUrl,
          revised_prompt: "Back generated image.",
          width: 1500,
          height: 2100
        }
      ],
      generated_by: "ai-text-and-image"
    };

    const persisted = await runtime.persistGeneratedImageArtifacts({
      authContext: { userId: "user-images", role: "customer", sessionId: "session-images" },
      payload
    });

    expect(persisted?.payload.generated_image_persistence).toMatchObject({
      status: "stored",
      artifactCount: 2,
      storedArtifactCount: 1,
      deduplicatedArtifactCount: 1,
      inlineImageBytesPersisted: false,
      compression: {
        attemptedArtifactCount: 2,
        compressedArtifactCount: 2,
        skippedArtifactCount: 0,
        originalBytes: pngBuffer.length * 2,
        algorithms: ["sharp-webp-v1"]
      }
    });
    expect(persisted?.payload.generated_image_persistence.deduplicatedBytes).toBeGreaterThan(0);
    expect(persisted?.payload.generated_image_persistence.compression.storedBytes).toBeLessThan(pngBuffer.length * 2);
    expect(persisted?.payload.generated_image_persistence.compression.savedBytes).toBeGreaterThan(0);
    expect(persisted?.payload.images.every((image: { image_url: string }) => !image.image_url.startsWith("data:"))).toBe(true);
    expect(persisted?.payload.images[0]).toMatchObject({
      image_storage_provider: "s3-compatible",
      image_inline_bytes_persisted: false,
      image_compression: {
        status: "compressed",
        algorithm: "sharp-webp-v1",
        originalMimeType: "image/png",
        storedMimeType: "image/webp",
        originalByteLength: pngBuffer.length,
        quality: 82
      },
      image_object_key: "projects/ai-user-images/render-packets/ai-draft-storage/provider-01-front.webp"
    });
    expect(persisted?.payload.images[0].image_byte_length).toBeLessThan(pngBuffer.length);
    expect(persisted?.payload.images[0].image_compression.storedByteLength).toBe(persisted?.payload.images[0].image_byte_length);
    expect(persisted?.payload.images[0].image_compression.savedBytes).toBeGreaterThan(0);
    expect(persisted?.payload.images[1]).toMatchObject({
      duplicate_of_object_key: "projects/ai-user-images/render-packets/ai-draft-storage/provider-01-front.webp",
      duplicate_of_file_name: "provider-01-front.webp"
    });
    expect(JSON.stringify(persisted?.payload)).not.toContain(pngDataUrl);

    const signedUrl = new URL(persisted!.payload.images[0].image_url);
    const objectKey = signedUrl.pathname.replace(/^\/api\/artifacts\//, "");
    const downloaded = await runtime.readArtifact({
      objectKey,
      query: signedUrl.searchParams
    });

    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.contentType).toBe("image/webp");
    expect(downloaded.body.length).toBe(persisted?.payload.images[0].image_byte_length);
    expect(downloaded.body.equals(pngBuffer)).toBe(false);
  });

  it("losslessly compresses generated SVG images before object storage", async () => {
    const runtime = createApiRuntime({
      env: objectStoreEnv,
      routes: apiRouteContracts
    });
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100">',
      "  <!-- generated artwork comment should not be stored -->",
      "  <g>",
      '    <path d="M0   0 L10   10" fill="#123456" />',
      "  </g>",
      "</svg>"
    ].join("\n");
    const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;

    const persisted = await runtime.persistGeneratedImageArtifacts({
      authContext: { userId: "user-svg-images", role: "customer", sessionId: "session-svg-images" },
      payload: {
        draft_id: "ai-draft-svg-storage",
        card_copy: { panels: [] },
        images: [
          {
            panel_id: "front",
            image_url: svgDataUrl,
            revised_prompt: "Front generated SVG image.",
            width: 1500,
            height: 2100
          }
        ],
        generated_by: "ai-text-and-image"
      }
    });

    expect(persisted?.payload.generated_image_persistence.compression).toMatchObject({
      attemptedArtifactCount: 1,
      compressedArtifactCount: 1,
      skippedArtifactCount: 0,
      originalBytes: Buffer.byteLength(svg, "utf8"),
      algorithms: ["svg-minify-v1"]
    });
    expect(persisted?.payload.generated_image_persistence.compression.savedBytes).toBeGreaterThan(0);
    expect(persisted?.payload.images[0]).toMatchObject({
      image_object_key: "projects/ai-user-svg-images/render-packets/ai-draft-svg-storage/provider-01-front.svg",
      image_compression: {
        status: "compressed",
        algorithm: "svg-minify-v1",
        originalMimeType: "image/svg+xml",
        storedMimeType: "image/svg+xml",
        originalByteLength: Buffer.byteLength(svg, "utf8")
      }
    });
    expect(persisted?.payload.images[0].image_compression.savedBytes).toBeGreaterThan(0);
    expect(persisted?.payload.images[0].image_byte_length).toBeLessThan(Buffer.byteLength(svg, "utf8"));

    const signedUrl = new URL(persisted!.payload.images[0].image_url);
    const objectKey = signedUrl.pathname.replace(/^\/api\/artifacts\//, "");
    const downloaded = await runtime.readArtifact({
      objectKey,
      query: signedUrl.searchParams
    });
    const storedSvg = downloaded.body.toString("utf8");

    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.contentType).toBe("image/svg+xml");
    expect(storedSvg).not.toContain("generated artwork comment");
    expect(storedSvg).not.toContain("\n");
    expect(storedSvg.length).toBeLessThan(svg.length);
  });

  it("honors bounded concurrent artifact write/readback verification", async () => {
    const runtime = createObjectStoreRuntime({
      env: { ...objectStoreEnv, CUSTOMCARD_ARTIFACT_WRITE_CONCURRENCY: "2" },
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    const record = {
      id: "render-packet-concurrent",
      projectId: "project-concurrent",
      kind: "validated_print_packet",
      width: 1500,
      height: 2100,
      dpi: 300,
      locale: "en-US",
      direction: "ltr",
      safeZonePassed: true,
      textOverflow: false,
      checksum: "cc_22222222",
      artifactUri: "file:///tmp/customcard-artifacts/projects/project-concurrent/render-packets/render-packet-concurrent/manifest.json",
      storageProvider: "filesystem",
      artifactCount: 3,
      artifactManifest: {
        renderPacketId: "render-packet-concurrent",
        projectId: "project-concurrent",
        storageProvider: "filesystem",
        artifactCount: 3,
        manifestChecksum: "cc_22222222",
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
          { kind: "panel-svg", fileName: "front.svg", mimeType: "image/svg+xml", text: "<svg>front</svg>" },
          { kind: "panel-svg", fileName: "inside.svg", mimeType: "image/svg+xml", text: "<svg>inside</svg>" },
          { kind: "panel-svg", fileName: "back.svg", mimeType: "image/svg+xml", text: "<svg>back</svg>" }
        ]
      })
    });

    expect(stored.payload.artifactPersistence).toMatchObject({
      status: "stored",
      artifactCount: 3,
      verifiedWrites: 3,
      writeConcurrency: 2,
      blockers: []
    });
  });

  it("deduplicates identical render artifacts and records retention policy", async () => {
    const runtime = createObjectStoreRuntime({
      env: {
        ...objectStoreEnv,
        CUSTOMCARD_ARTIFACT_RETENTION_DAYS: "21",
        CUSTOMCARD_NONCURRENT_ARTIFACT_RETENTION_DAYS: "5"
      },
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    const record = {
      id: "render-packet-dedupe",
      projectId: "project-dedupe",
      kind: "validated_print_packet",
      width: 1500,
      height: 2100,
      dpi: 300,
      locale: "en-US",
      direction: "ltr",
      safeZonePassed: true,
      textOverflow: false,
      checksum: "cc_deduped",
      artifactUri: "file:///tmp/customcard-artifacts/projects/project-dedupe/render-packets/render-packet-dedupe/manifest.json",
      storageProvider: "filesystem",
      artifactCount: 2,
      artifactManifest: {
        renderPacketId: "render-packet-dedupe",
        projectId: "project-dedupe",
        storageProvider: "filesystem",
        artifactCount: 2,
        manifestChecksum: "cc_deduped",
        signedUrlExpiresAt: "2026-06-11T12:15:00.000Z",
        externalShareApprovalRequired: true,
        realOrdersEnabled: false
      },
      signedUrlExpiresAt: "2026-06-11T12:15:00.000Z",
      externalShareApprovalRequired: true
    };
    const duplicateBody = "<svg viewBox=\"0 0 1500 2100\"><path d=\"M0 0H10\" /></svg>";

    const stored = await runtime.persistRenderPacketArtifacts({
      record,
      bodyText: JSON.stringify({
        artifacts: [
          { kind: "panel-svg", fileName: "front.svg", mimeType: "image/svg+xml", text: duplicateBody, panelId: "front" },
          { kind: "panel-svg", fileName: "back.svg", mimeType: "image/svg+xml", text: duplicateBody, panelId: "back" }
        ]
      })
    });

    expect(stored.record.artifactManifest).toMatchObject({
      artifactCount: 2,
      storedArtifactCount: 1,
      deduplicatedArtifactCount: 1,
      deduplicatedBytes: Buffer.byteLength(duplicateBody),
      retentionPolicy: {
        currentArtifactDays: 21,
        noncurrentArtifactDays: 5,
        signedUrlTtlMinutes: 15,
        lifecyclePrefix: "projects/"
      }
    });
    expect(stored.record.artifactManifest.artifacts[1]).toMatchObject({
      fileName: "back.svg",
      duplicateOfObjectKey: "projects/project-dedupe/render-packets/render-packet-dedupe/front.svg",
      duplicateOfFileName: "front.svg"
    });
    expect(stored.record.signedArtifactUrls).toHaveLength(2);
    expect(stored.record.signedArtifactUrls[1].url).toBe(stored.record.signedArtifactUrls[0].url);
    expect(stored.payload.artifactPersistence).toMatchObject({
      artifactCount: 2,
      storedArtifactCount: 1,
      deduplicatedArtifactCount: 1,
      verifiedWrites: 1
    });

    const bucket = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "projects/project-dedupe", limit: "10", sort: "key", order: "asc" })
    });
    expect(bucket.payload).toMatchObject({
      objectCount: 2,
      renderPackets: [expect.objectContaining({ objectCount: 2 })]
    });
    expect(bucket.payload.objects.map((object) => object.objectKey)).toEqual([
      "projects/project-dedupe/render-packets/render-packet-dedupe/artifact-handoff-manifest.json",
      "projects/project-dedupe/render-packets/render-packet-dedupe/front.svg"
    ]);
  });

  it("groups persisted prompt JSON with its render packet", async () => {
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    await runtime.persistRenderPacketArtifacts({
      record: {
        id: "render-packet-prompts",
        projectId: "project-prompts",
        kind: "validated_print_packet",
        locale: "en-US",
        direction: "ltr",
        safeZonePassed: true,
        textOverflow: false,
        checksum: "cc_33333333",
        artifactManifest: { persistenceStatus: "pending", blockers: [] }
      },
      bodyText: JSON.stringify({
        artifacts: [
          {
            kind: "panel-svg",
            fileName: "front.svg",
            mimeType: "image/svg+xml",
            text: "<svg viewBox=\"0 0 1500 2100\"><text>Hello</text></svg>",
            panelId: "front"
          },
          {
            kind: "manifest-json",
            fileName: "persisted-effective-prompts.json",
            mimeType: "application/json",
            text: JSON.stringify({
              requestBody: { recipient: "Maya", occasion: "Graduation" },
              panelPrompts: [{ panelId: "front", prompt: "Full bleed graduation artwork" }]
            })
          }
        ]
      })
    });

    const bucket = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "projects/project-prompts", limit: "10" })
    });

    expect(bucket.payload.renderPackets).toHaveLength(1);
    expect(bucket.payload.renderPackets[0]).toMatchObject({
      projectId: "project-prompts",
      renderPacketId: "render-packet-prompts",
      objectCount: 3,
      panelImages: [expect.objectContaining({ fileName: "front.svg" })],
      promptArtifacts: [
        expect.objectContaining({
          fileName: "persisted-effective-prompts.json",
          signedDownload: expect.objectContaining({ method: "GET" })
        })
      ]
    });
  });

  it("normalizes copied bucket prefixes before listing objects", async () => {
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    await runtime.persistRenderPacketArtifacts({
      record: {
        id: "render-packet-copied-prefix",
        projectId: "project-copied-prefix",
        kind: "validated_print_packet",
        locale: "en-US",
        direction: "ltr",
        safeZonePassed: true,
        textOverflow: false,
        checksum: "cc_44444444",
        artifactManifest: { persistenceStatus: "pending", blockers: [] }
      },
      bodyText: JSON.stringify({
        artifacts: [
          {
            kind: "panel-svg",
            fileName: "front.svg",
            mimeType: "image/svg+xml",
            text: "<svg>front</svg>",
            panelId: "front"
          }
        ]
      })
    });

    const bareProject = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "project-copied-prefix", limit: "10", sort: "key", order: "asc" })
    });
    const joinedBucketAndPrefix = await runtime.listBucketArtifacts({
      query: new URLSearchParams({
        prefix: "customcard-prodprojects/project-copied-prefix/render-packets/render-packet-copied-prefix/",
        limit: "10",
        sort: "key",
        order: "asc"
      })
    });

    expect(bareProject.payload).toMatchObject({
      prefix: "projects/project-copied-prefix/",
      objectCount: 2,
      renderPackets: [expect.objectContaining({ renderPacketId: "render-packet-copied-prefix" })]
    });
    expect(joinedBucketAndPrefix.payload).toMatchObject({
      prefix: "projects/project-copied-prefix/render-packets/render-packet-copied-prefix/",
      objectCount: 2,
      renderPackets: [expect.objectContaining({ renderPacketId: "render-packet-copied-prefix" })]
    });
  });

  it("defaults bucket listings to the five newest objects", async () => {
    let tick = Date.parse("2026-06-11T12:00:00.000Z");
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => {
        tick += 60_000;
        return new Date(tick);
      }
    });

    for (let index = 1; index <= 6; index += 1) {
      await runtime.persistRenderPacketArtifacts({
        record: {
          id: `render-packet-newest-${index}`,
          projectId: `project-newest-${index}`,
          kind: "validated_print_packet",
          locale: "en-US",
          direction: "ltr",
          safeZonePassed: true,
          textOverflow: false,
          checksum: `cc_newest_${index}`,
          artifactManifest: { persistenceStatus: "pending", blockers: [] }
        },
        bodyText: JSON.stringify({
          artifacts: [
            {
              kind: "panel-svg",
              fileName: "front.svg",
              mimeType: "image/svg+xml",
              text: `<svg>newest ${index}</svg>`,
              panelId: "front"
            }
          ]
        })
      });
    }

    const bucket = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "projects/project-newest-" })
    });

    expect(bucket.payload).toMatchObject({
      limit: 5,
      sort: "lastModified",
      order: "desc",
      objectCount: 5,
      truncated: true
    });
    expect(bucket.payload.objects.map((object) => object.objectKey).slice(0, 4)).toEqual([
      "projects/project-newest-6/render-packets/render-packet-newest-6/artifact-handoff-manifest.json",
      "projects/project-newest-6/render-packets/render-packet-newest-6/front.svg",
      "projects/project-newest-5/render-packets/render-packet-newest-5/artifact-handoff-manifest.json",
      "projects/project-newest-5/render-packets/render-packet-newest-5/front.svg"
    ]);
    expect(bucket.payload.objects.some((object) => object.objectKey.includes("project-newest-1/"))).toBe(false);
  });

  it("paginates bucket listings with a continuation cursor", async () => {
    const runtime = createObjectStoreRuntime({
      env: objectStoreEnv,
      now: () => new Date("2026-06-11T12:00:00.000Z")
    });
    const record = {
      id: "render-packet-page",
      projectId: "project-page",
      kind: "validated_print_packet",
      width: 1500,
      height: 2100,
      dpi: 300,
      locale: "en-US",
      direction: "ltr",
      safeZonePassed: true,
      textOverflow: false,
      checksum: "cc_87654321",
      artifactUri: "file:///tmp/customcard-artifacts/projects/project-page/render-packets/render-packet-page/manifest.json",
      storageProvider: "filesystem",
      artifactCount: 6,
      artifactManifest: {
        renderPacketId: "render-packet-page",
        projectId: "project-page",
        storageProvider: "filesystem",
        artifactCount: 6,
        manifestChecksum: "cc_87654321",
        signedUrlExpiresAt: "2026-06-11T12:15:00.000Z",
        externalShareApprovalRequired: true,
        realOrdersEnabled: false
      },
      signedUrlExpiresAt: "2026-06-11T12:15:00.000Z",
      externalShareApprovalRequired: true
    };

    await runtime.persistRenderPacketArtifacts({
      record,
      bodyText: JSON.stringify({
        artifacts: [
          { kind: "panel-svg", fileName: "front.svg", mimeType: "image/svg+xml", text: "<svg>front</svg>" },
          { kind: "panel-svg", fileName: "inside.svg", mimeType: "image/svg+xml", text: "<svg>inside</svg>" }
        ]
      })
    });

    const firstPage = await runtime.listBucketArtifacts({
      query: new URLSearchParams({ prefix: "projects/project-page", limit: "1", sort: "key", order: "asc" })
    });
    expect(firstPage.payload).toMatchObject({
      objectCount: 1,
      truncated: true,
      nextCursor: "projects/project-page/render-packets/render-packet-page/artifact-handoff-manifest.json"
    });

    const secondPage = await runtime.listBucketArtifacts({
      query: new URLSearchParams({
        prefix: "projects/project-page",
        limit: "2",
        sort: "key",
        order: "asc",
        cursor: firstPage.payload.nextCursor
      })
    });
    expect(secondPage.payload).toMatchObject({
      objectCount: 2,
      truncated: false,
      nextCursor: null
    });
    expect(secondPage.payload.objects.map((object) => object.objectKey)).toEqual([
      "projects/project-page/render-packets/render-packet-page/front.svg",
      "projects/project-page/render-packets/render-packet-page/inside.svg"
    ]);
  });
});
