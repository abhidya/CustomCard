import type { CardDraft, CardPanel, CardTextLayout } from "./customerWorkflow";

export type AiGenerationJobStatus = "queued" | "succeeded" | "partial" | "copy-only";
export type AiGenerationJobPanelStatus = "queued" | "generated" | "missing";

export interface AiGenerationFlowState {
  adapter_id?: string;
  model?: string;
  provider_failure?: string;
}

export interface AiGenerationApiPanel {
  id?: string;
  headline?: string;
  body?: string;
  art_direction?: string;
  visual_cue?: string;
  visualCue?: string;
  text_layout?: AiGenerationApiTextLayout;
  textLayout?: AiGenerationApiTextLayout;
  image_prompt?: string;
  image_negative_prompt?: string;
}

export interface AiGenerationApiTextLayout {
  headline_zone?: string;
  headlineZone?: string;
  body_zone?: string;
  bodyZone?: string;
  alignment?: string;
  font_pairing?: string;
  fontPairing?: string;
  color_mode?: string;
  colorMode?: string;
  scale?: string;
}

export interface AiGenerationApiImage {
  panel_id?: string;
  image_url?: string;
  rendering_mode?: string;
  image_rendering_mode?: string;
  final_text_composited?: boolean;
  image_artifact_uri?: string;
  image_object_key?: string;
  image_content_hash?: string;
  image_byte_length?: number;
  image_storage_provider?: string;
  image_signed_url_expires_at?: string;
  image_inline_bytes_persisted?: boolean;
  image_compression?: AiGenerationImageCompression;
  revised_prompt?: string;
  width?: number;
  height?: number;
}

export interface AiGenerationImageCompression {
  status?: "compressed" | "skipped";
  algorithm?: string;
  reason?: string;
  detail?: string;
  originalMimeType?: string;
  storedMimeType?: string;
  originalByteLength?: number;
  storedByteLength?: number;
  savedBytes?: number;
  width?: number;
  height?: number;
  quality?: number;
}

export interface AiGenerationApiResult {
  status?: string;
  job_id?: string;
  queue_status?: string;
  job_status_url?: string;
  result_available?: boolean;
  draft_id?: string;
  card_copy?: {
    panels?: AiGenerationApiPanel[];
  };
  images?: AiGenerationApiImage[];
  generated_image_persistence?: {
    status?: string;
    storageProvider?: string;
    artifactCount?: number;
    storedArtifactCount?: number;
    deduplicatedArtifactCount?: number;
    deduplicatedBytes?: number;
    inlineImageBytesPersisted?: boolean;
    manifestUri?: string;
    signedUrlExpiresAt?: string;
    compression?: {
      attemptedArtifactCount?: number;
      compressedArtifactCount?: number;
      skippedArtifactCount?: number;
      originalBytes?: number;
      storedBytes?: number;
      savedBytes?: number;
      algorithms?: string[];
    };
  };
  generated_by?: string;
  ai_flow?: {
    card_copy?: AiGenerationFlowState;
    card_image?: AiGenerationFlowState;
  };
}

export interface AiGenerationJobPanelEvidence {
  panelId: CardPanel["id"];
  label: string;
  headline: string;
  body: string;
  artDirection: string;
  visualCue: string;
  textLayout?: CardTextLayout;
  imagePrompt: string;
  negativePrompt: string;
  revisedPrompt: string;
  imageUrl?: string;
  renderingMode?: string;
  width: number;
  height: number;
  status: AiGenerationJobPanelStatus;
}

export interface AiGenerationJobEvidence {
  id: string;
  draftId: string;
  createdAtIso: string;
  status: AiGenerationJobStatus;
  queueStatus?: string;
  jobStatusUrl?: string;
  generatedBy: string;
  copyProvider: string;
  copyModel: string;
  imageProvider: string;
  imageModel: string;
  textProviderFailure: string;
  imageProviderFailure: string;
  panelCount: number;
  imageCount: number;
  panels: AiGenerationJobPanelEvidence[];
}

export function buildAiGenerationJobEvidence({
  result,
  draft,
  now = new Date()
}: {
  result: AiGenerationApiResult;
  draft: CardDraft;
  now?: Date;
}): AiGenerationJobEvidence {
  const copyPanels = Array.isArray(result.card_copy?.panels) ? result.card_copy.panels : [];
  const images = Array.isArray(result.images) ? result.images : [];
  const copyByPanel = new Map(copyPanels.map((panel) => [String(panel.id || ""), panel]));
  const imageByPanel = new Map(images.map((image) => [String(image.panel_id || ""), image]));
  const queueStatus = readQueueStatus(result);
  const isQueued = queueStatus === "queued" || queueStatus === "running";
  const panels = draft.panels.map((panel) =>
    buildPanelEvidence(panel, copyByPanel.get(panel.id), imageByPanel.get(panel.id), isQueued)
  );
  const imageCount = panels.filter((panel) => panel.status === "generated").length;
  const status: AiGenerationJobStatus =
    isQueued
      ? "queued"
      : imageCount === panels.length && panels.length > 0 ? "succeeded" : imageCount > 0 ? "partial" : "copy-only";
  const copyFlow = result.ai_flow?.card_copy;
  const imageFlow = result.ai_flow?.card_image;

  return {
    id: buildJobEvidenceId(result, draft, now),
    draftId: redactSensitiveText(String(result.draft_id || draft.id)),
    createdAtIso: now.toISOString(),
    status,
    queueStatus: queueStatus || undefined,
    jobStatusUrl: redactSensitiveText(result.job_status_url || ""),
    generatedBy: redactSensitiveText(String(result.generated_by || (isQueued ? "queued-worker" : imageCount > 0 ? "ai-text-and-image" : "ai-text-only"))),
    copyProvider: redactSensitiveText(copyFlow?.adapter_id || (isQueued ? "pending" : "unknown")),
    copyModel: redactSensitiveText(copyFlow?.model || (isQueued ? "pending" : "unknown")),
    imageProvider: redactSensitiveText(imageFlow?.adapter_id || (isQueued ? "pending" : "unknown")),
    imageModel: redactSensitiveText(imageFlow?.model || (isQueued ? "pending" : "unknown")),
    textProviderFailure: redactSensitiveText(copyFlow?.provider_failure || ""),
    imageProviderFailure: redactSensitiveText(imageFlow?.provider_failure || ""),
    panelCount: panels.length,
    imageCount,
    panels
  };
}

export function prependAiGenerationJob(
  jobs: AiGenerationJobEvidence[],
  job: AiGenerationJobEvidence,
  limit = 10
): AiGenerationJobEvidence[] {
  return [job, ...jobs.filter((candidate) => candidate.id !== job.id)].slice(0, Math.max(1, limit));
}

function buildPanelEvidence(
  panel: CardPanel,
  copy: AiGenerationApiPanel | undefined,
  image: AiGenerationApiImage | undefined,
  isQueued: boolean
): AiGenerationJobPanelEvidence {
  const imageUrl = typeof image?.image_url === "string" && image.image_url ? image.image_url : undefined;
  return {
    panelId: panel.id,
    label: panel.label,
    headline: redactSensitiveText(copy?.headline || panel.headline),
    body: redactSensitiveText(copy?.body || panel.body),
    artDirection: redactSensitiveText(copy?.art_direction || panel.artDirection),
    visualCue: redactSensitiveText(copy?.visual_cue || copy?.visualCue || ""),
    textLayout: normalizeEvidenceTextLayout(copy?.text_layout || copy?.textLayout || panel.textLayout),
    imagePrompt: redactSensitiveText(copy?.image_prompt || ""),
    negativePrompt: redactSensitiveText(copy?.image_negative_prompt || ""),
    revisedPrompt: redactSensitiveText(image?.revised_prompt || copy?.image_prompt || ""),
    imageUrl,
    renderingMode: readImageRenderingMode(image),
    width: coercePositiveInt(image?.width, panel.width),
    height: coercePositiveInt(image?.height, panel.height),
    status: isQueued ? "queued" : imageUrl ? "generated" : "missing"
  };
}

function buildJobEvidenceId(result: AiGenerationApiResult, draft: CardDraft, now: Date): string {
  const jobId = redactSensitiveText(result.job_id || "");
  return jobId || `${draft.id}-${now.getTime()}`;
}

function readQueueStatus(result: AiGenerationApiResult): string {
  const queueStatus = String(result.queue_status || "").trim().toLowerCase();
  if (queueStatus) return queueStatus;
  const status = String(result.status || "").trim().toLowerCase();
  return status === "queued" || status === "running" ? status : "";
}

function readImageRenderingMode(image: AiGenerationApiImage | undefined): string | undefined {
  const mode = String(image?.rendering_mode ?? image?.image_rendering_mode ?? "").trim();
  if (mode) return mode;
  return image?.final_text_composited === true ? "final-text-composited" : undefined;
}

function normalizeEvidenceTextLayout(value: AiGenerationApiTextLayout | CardTextLayout | undefined): CardTextLayout | undefined {
  if (!value || typeof value !== "object") return undefined;
  const headlineZone = safeEnum(readLayoutValue(value, "headline_zone", "headlineZone"), ["top", "upper", "center", "lower"]);
  const bodyZone = safeEnum(readLayoutValue(value, "body_zone", "bodyZone"), ["upper", "center", "lower", "bottom"]);
  const alignment = safeEnum(readLayoutValue(value, "alignment", "alignment"), ["left", "center", "right"]);
  const fontPairing = safeEnum(readLayoutValue(value, "font_pairing", "fontPairing"), ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"]);
  const colorMode = safeEnum(readLayoutValue(value, "color_mode", "colorMode"), ["dark-ink", "light-ink", "accent-ink", "high-contrast"]);
  const scale = safeEnum(readLayoutValue(value, "scale", "scale"), ["compact", "standard", "large"]);
  if (!headlineZone || !bodyZone || !alignment || !fontPairing || !colorMode || !scale) return undefined;
  return { headlineZone, bodyZone, alignment, fontPairing, colorMode, scale };
}

function readLayoutValue(value: AiGenerationApiTextLayout | CardTextLayout, snakeKey: keyof AiGenerationApiTextLayout, camelKey: keyof AiGenerationApiTextLayout): unknown {
  const record = value as Record<string, unknown>;
  return record[snakeKey] ?? record[camelKey];
}

function safeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : undefined;
}

function coercePositiveInt(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function redactSensitiveText(value: unknown): string {
  return truncateAdminText(String(value ?? ""))
    .replace(/\b(CLOUDFLARE_[A-Z0-9_]*|OBJECT_STORE_[A-Z0-9_]*|AWS_[A-Z0-9_]*)=([^\s,;"']+)/g, "$1=<redacted>")
    .replace(/\b(api[_-]?key|access[_-]?key|secret|token|authorization)\s*[:=]\s*([^\s,;"']+)/gi, "$1=<redacted>")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer <redacted>")
    .replace(/\b(?:cfat|cfut)_[A-Za-z0-9_-]+/g, "<redacted>")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}/g, "<redacted>");
}

function truncateAdminText(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 1800 ? `${normalized.slice(0, 1800)}...` : normalized;
}
