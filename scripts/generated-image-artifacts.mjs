import { createHash } from "node:crypto";

const generatedImageWebpQuality = 82;
const generatedImageWebpEffort = 4;
const generatedImageMaxEdgePixels = 2100;
const generatedImageRasterMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

let sharpCodecPromise;

export async function persistGeneratedImageArtifacts({ objectStoreRuntime, authContext, payload }) {
  const objectStoreDescription = objectStoreRuntime?.describe?.();
  const images = Array.isArray(payload?.images) ? payload.images : [];
  const artifacts = (
    await Promise.all(images.map((image, index) => normalizeGeneratedImageArtifact(image, index)))
  ).filter(Boolean);
  if (artifacts.length === 0) return undefined;
  if (!objectStoreDescription?.configured) {
    const blockers = objectStoreDescription?.blockers ?? [];
    return blockers.length > 0
      ? {
          payload: {
            ...payload,
            generated_image_persistence: {
              status: "blocked",
              blockers,
              inlineImageBytesPersisted: false,
              liveNetworkCalls: false
            }
          }
        }
      : undefined;
  }

  const draftId = safeId(
    payload?.draft_id ?? payload?.draftId,
    stableRuntimeId("ai-draft", authContext?.userId ?? "anonymous", generatedImageHashInput(artifacts))
  );
  const projectId = safeId(
    payload?.project_id ?? payload?.projectId,
    `ai-${safeId(authContext?.userId, stableRuntimeId("user", "anonymous"))}`
  );
  const firstImage = images.find((image) => image && typeof image === "object") ?? {};
  const record = {
    id: draftId,
    projectId,
    kind: "validated_print_packet",
    width: safeInteger(firstImage.width, 1500, 1, 10_000),
    height: safeInteger(firstImage.height, 2100, 1, 10_000),
    dpi: 300,
    locale: "en-US",
    direction: "ltr",
    safeZonePassed: true,
    textOverflow: false,
    checksum: `cc_${createHash("sha256").update(generatedImageHashInput(artifacts)).digest("hex").slice(0, 8)}`,
    artifactUri: "",
    storageProvider: "filesystem",
    artifactCount: artifacts.length,
    artifactManifest: {
      renderPacketId: draftId,
      projectId,
      artifactCount: artifacts.length,
      persistenceStatus: "pending",
      blockers: []
    },
    signedUrlExpiresAt: defaultSignedUrlExpiresAt(),
    externalShareApprovalRequired: true
  };

  const persistence = await objectStoreRuntime.persistRenderPacketArtifacts({
    record,
    authContext,
    bodyText: JSON.stringify({ artifacts })
  });
  const artifactPersistence = persistence.payload?.artifactPersistence;
  const compressionSummary = summarizeGeneratedImageCompression(artifacts);
  if (artifactPersistence?.status !== "stored") {
    return {
      payload: {
        ...payload,
        generated_image_persistence: {
          ...(artifactPersistence ?? {}),
          status: artifactPersistence?.status ?? "blocked",
          inlineImageBytesPersisted: false,
          compression: compressionSummary
        }
      }
    };
  }

  const storedByPanel = new Map();
  const compressionByPanel = new Map(artifacts.map((artifact) => [artifact.panelId, artifact.compression]));
  const manifestArtifacts = persistence.record.artifactManifest?.artifacts ?? [];
  const signedDownloads = persistence.record.signedArtifactUrls ?? [];
  manifestArtifacts.forEach((artifact, index) => {
    if (!artifact?.panelId || !signedDownloads[index]?.url) return;
    storedByPanel.set(artifact.panelId, {
      artifact,
      signedDownload: signedDownloads[index]
    });
  });

  return {
    record: persistence.record,
    payload: {
      ...payload,
      images: images.map((image) => {
        const panelId = String(image?.panel_id ?? image?.panelId ?? "").trim();
        const stored = storedByPanel.get(panelId);
        if (!stored) return image;
        const { artifact, signedDownload } = stored;
        const compression = compressionByPanel.get(panelId);
        return {
          ...image,
          image_url: signedDownload.url,
          image_artifact_uri: artifact.artifactUri,
          image_object_key: artifact.objectKey,
          image_content_hash: artifact.contentHash,
          image_byte_length: artifact.byteLength,
          image_storage_provider: persistence.record.storageProvider,
          image_signed_url_expires_at: signedDownload.expiresAtIso,
          image_inline_bytes_persisted: false,
          image_compression: compression,
          ...(artifact.duplicateOfObjectKey
            ? {
                duplicate_of_object_key: artifact.duplicateOfObjectKey,
                duplicate_of_file_name: artifact.duplicateOfFileName
              }
            : {})
        };
      }),
      generated_image_persistence: {
        ...artifactPersistence,
        manifestUri: persistence.record.artifactUri,
        signedUrlExpiresAt: persistence.record.signedUrlExpiresAt,
        inlineImageBytesPersisted: false,
        compression: compressionSummary
      }
    }
  };
}

async function normalizeGeneratedImageArtifact(image, index) {
  if (!image || typeof image !== "object") return undefined;
  const dataUrl = String(image.image_url ?? image.imageUrl ?? "");
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return undefined;
  const panelId = safeGeneratedImagePanelId(image.panel_id ?? image.panelId, index);
  const fileIndex = String(index + 1).padStart(2, "0");
  const compressed = await compressGeneratedImageDataUrl(parsed);
  return {
    kind: "generated-image",
    fileName: `provider-${fileIndex}-${panelId}.${compressed.extension}`,
    mimeType: compressed.mimeType,
    panelId,
    compression: compressed.compression,
    ...(compressed.text ? { text: compressed.text } : { base64: compressed.buffer.toString("base64") })
  };
}

function parseImageDataUrl(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/i.exec(String(value));
  if (!match) return undefined;
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length <= 0) return undefined;
  return {
    mimeType,
    extension: imageExtensionForMimeType(mimeType),
    buffer
  };
}

async function compressGeneratedImageDataUrl(parsed) {
  if (parsed.mimeType !== "image/svg+xml") return await compressRasterImageData(parsed);
  const minified = minifySvgText(parsed.buffer.toString("utf8"));
  const minifiedBytes = Buffer.byteLength(minified, "utf8");
  if (!minified || minifiedBytes >= parsed.buffer.length) {
    return {
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      extension: parsed.extension,
      compression: {
        status: "skipped",
        algorithm: "svg-minify-v1",
        reason: "not-smaller",
        originalMimeType: parsed.mimeType,
        storedMimeType: parsed.mimeType,
        originalByteLength: parsed.buffer.length,
        storedByteLength: parsed.buffer.length,
        savedBytes: 0
      }
    };
  }

  return {
    text: minified,
    mimeType: parsed.mimeType,
    extension: parsed.extension,
    compression: {
      status: "compressed",
      algorithm: "svg-minify-v1",
      originalMimeType: parsed.mimeType,
      storedMimeType: parsed.mimeType,
      originalByteLength: parsed.buffer.length,
      storedByteLength: minifiedBytes,
      savedBytes: parsed.buffer.length - minifiedBytes
    }
  };
}

async function compressRasterImageData(parsed) {
  if (!generatedImageRasterMimeTypes.has(parsed.mimeType)) {
    return uncompressedGeneratedImage(parsed, {
      algorithm: "none",
      reason: "unsupported-image-mime-type"
    });
  }

  try {
    const sharp = await loadSharpCodec();
    const result = await sharp(parsed.buffer, {
      failOn: "none",
      limitInputPixels: generatedImageMaxEdgePixels * generatedImageMaxEdgePixels * 2
    })
      .rotate()
      .resize({
        width: generatedImageMaxEdgePixels,
        height: generatedImageMaxEdgePixels,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: generatedImageWebpQuality,
        effort: generatedImageWebpEffort,
        smartSubsample: true
      })
      .toBuffer({ resolveWithObject: true });

    if (!result?.data || result.data.length <= 0) {
      return uncompressedGeneratedImage(parsed, {
        algorithm: "sharp-webp-v1",
        reason: "empty-compressed-output"
      });
    }
    if (result.data.length >= parsed.buffer.length) {
      return uncompressedGeneratedImage(parsed, {
        algorithm: "sharp-webp-v1",
        reason: "not-smaller"
      });
    }

    return {
      buffer: result.data,
      mimeType: "image/webp",
      extension: "webp",
      compression: {
        status: "compressed",
        algorithm: "sharp-webp-v1",
        originalMimeType: parsed.mimeType,
        storedMimeType: "image/webp",
        originalByteLength: parsed.buffer.length,
        storedByteLength: result.data.length,
        savedBytes: parsed.buffer.length - result.data.length,
        width: result.info?.width,
        height: result.info?.height,
        quality: generatedImageWebpQuality
      }
    };
  } catch (error) {
    return uncompressedGeneratedImage(parsed, {
      algorithm: "sharp-webp-v1",
      reason: "raster-compression-failed",
      detail: safeText(error?.message, "Image compression failed.").slice(0, 160)
    });
  }
}

function uncompressedGeneratedImage(parsed, { algorithm, reason, detail } = {}) {
  return {
    buffer: parsed.buffer,
    mimeType: parsed.mimeType,
    extension: parsed.extension,
    compression: {
      status: "skipped",
      algorithm: algorithm ?? "none",
      reason,
      ...(detail ? { detail } : {}),
      originalMimeType: parsed.mimeType,
      storedMimeType: parsed.mimeType,
      originalByteLength: parsed.buffer.length,
      storedByteLength: parsed.buffer.length,
      savedBytes: 0
    }
  };
}

async function loadSharpCodec() {
  if (!sharpCodecPromise) sharpCodecPromise = import("sharp").then((module) => module.default ?? module);
  return sharpCodecPromise;
}

function minifySvgText(value) {
  return String(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function summarizeGeneratedImageCompression(artifacts) {
  const compression = artifacts.map((artifact) => artifact.compression).filter(Boolean);
  const originalBytes = compression.reduce((total, item) => total + (item.originalByteLength ?? 0), 0);
  const storedBytes = compression.reduce((total, item) => total + (item.storedByteLength ?? item.originalByteLength ?? 0), 0);
  const savedBytes = compression.reduce((total, item) => total + (item.savedBytes ?? 0), 0);
  return {
    attemptedArtifactCount: compression.length,
    compressedArtifactCount: compression.filter((item) => item.status === "compressed").length,
    skippedArtifactCount: compression.filter((item) => item.status === "skipped").length,
    originalBytes,
    storedBytes,
    savedBytes,
    algorithms: Array.from(new Set(compression.filter((item) => item.status === "compressed").map((item) => item.algorithm))).sort()
  };
}

function imageExtensionForMimeType(mimeType) {
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  return "img";
}

function safeGeneratedImagePanelId(value, index) {
  const fallback = `panel-${index + 1}`;
  return safeId(value, fallback).toLowerCase() || fallback;
}

function generatedImageHashInput(artifacts) {
  return artifacts
    .map((artifact) => `${artifact.fileName}:${artifact.mimeType}:${artifact.text ?? artifact.base64 ?? artifact.dataUrl ?? ""}`)
    .join("\n");
}

function stableRuntimeId(...parts) {
  return `rt_${createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 16)}`;
}

function safeId(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function safeInteger(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function defaultSignedUrlExpiresAt() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
}
