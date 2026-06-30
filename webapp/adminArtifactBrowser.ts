export interface BucketObject {
  objectKey: string;
  fileName: string;
  byteLength: number;
  contentType: string;
  lastModifiedIso?: string;
  metadata?: Record<string, string>;
  signedDownload?: {
    url: string;
    expiresAtIso: string;
  } | null;
}

export interface BucketRenderPacketGroup {
  projectId: string;
  renderPacketId: string;
  objectPrefix: string;
  objectCount: number;
  byteLength: number;
  lastModifiedIso?: string;
  artifacts: BucketObject[];
  panelImages: BucketObject[];
  promptArtifacts: BucketObject[];
  manifestArtifact?: BucketObject | null;
}

export interface BucketViewerPayload {
  status?: string;
  objectStore?: {
    configured?: boolean;
    provider?: string;
    bucket?: string | null;
    endpoint?: string;
    credentialMode?: string;
    liveNetworkCalls?: boolean;
  };
  prefix?: string;
  limit?: number;
  sort?: BucketSort;
  order?: BucketOrder;
  objectCount?: number;
  truncated?: boolean;
  nextCursor?: string | null;
  objects?: BucketObject[];
  renderPackets?: BucketRenderPacketGroup[];
  blockers?: string[];
}

export interface BucketViewerErrorPayload {
  status?: string;
  error?: string;
  detail?: string;
  blockers?: string[];
  requiredAuth?: string;
}

export interface BucketJsonPreview {
  status: "loading" | "ready" | "empty" | "failed";
  text?: string;
  data?: unknown;
  message?: string;
}

export type BucketSort = "lastModified" | "key";
export type BucketOrder = "asc" | "desc";

export const defaultBucketPageSize = 5;

export function normalizeBucketPrefixInput(value: string): string {
  const text = value.trim().replaceAll("\\", "/");
  if (!text) return "projects/";
  const projectsIndex = text.indexOf("projects/");
  if (!text.startsWith("projects/") && projectsIndex > 0) return text.slice(projectsIndex);
  if (text.startsWith("projects/")) return text;
  if (/^[a-zA-Z0-9._-]+$/.test(text)) return `projects/${text}/`;
  return text;
}

export function bucketViewerErrorMessage(payload: BucketViewerErrorPayload | undefined, status: number): string {
  const detail = payload?.blockers?.[0] ?? payload?.detail ?? payload?.error ?? payload?.status;
  const auth = payload?.requiredAuth ? ` (${payload.requiredAuth})` : "";
  return detail ? `Bucket viewer returned HTTP ${status}: ${detail}${auth}` : `Bucket viewer returned HTTP ${status}`;
}

export function bucketViewerCatchMessage(error: unknown): string {
  if (error instanceof Error && error.message === "auth-token-required") {
    return "Bucket viewer needs an admin session token. Sign in as an admin, then refresh the bucket.";
  }
  return error instanceof Error ? error.message : "Bucket viewer is unavailable.";
}

export type PromptPreviewSection = {
  title: string;
  rows?: Array<[string, string]>;
  prompts?: Array<{
    panelId: string;
    headline?: string;
    body?: string;
    prompt?: string;
    revisedPrompt?: string;
    negativePrompt?: string;
  }>;
};

export function buildPromptPreviewSections(fileName: string, data: unknown): PromptPreviewSection[] {
  const record = asRecord(data);
  if (!record) return [];
  if (fileName === "persisted-effective-prompts.json") {
    const requestBody = asRecord(record.requestBody);
    const rows = requestBody
      ? compactRows([
          ["Recipient", jsonText(requestBody.recipient)],
          ["Sender", jsonText(requestBody.sender)],
          ["Relationship", jsonText(requestBody.relationship)],
          ["Occasion", jsonText(requestBody.occasion)],
          ["Tone", jsonText(requestBody.tone)],
          ["Style", jsonText(requestBody.style)],
          ["Language", jsonText(requestBody.language)],
          ["Personal note", jsonText(requestBody.personal_note ?? requestBody.personalNote)],
          ["Memory notes", jsonStringList(requestBody.memory_notes ?? requestBody.memoryNotes).join(" | ")]
        ])
      : [];
    const panelPrompts = jsonArray(record.panelPrompts)
      .map((prompt) => asRecord(prompt))
      .filter(Boolean)
      .map((prompt) => ({
        panelId: jsonText(prompt?.panelId ?? prompt?.panel_id) || "panel",
        prompt: jsonText(prompt?.prompt)
      }));
    return [
      ...(rows.length ? [{ title: "Input used", rows }] : []),
      ...(panelPrompts.length ? [{ title: "Prompts sent", prompts: panelPrompts }] : [])
    ];
  }

  if (fileName === "persisted-customcard-ai-output.json") {
    const cardCopy = asRecord(record.card_copy ?? record.cardCopy);
    const themeGuide = asRecord(cardCopy?.theme_guide ?? cardCopy?.themeGuide);
    const themeRows = themeGuide
      ? compactRows([
          ["Theme", jsonText(themeGuide.theme_title ?? themeGuide.themeTitle)],
          ["Palette", jsonStringList(themeGuide.palette).join(", ")],
          ["Motifs", jsonStringList(themeGuide.motifs).join(", ")]
        ])
      : [];
    const panels = jsonArray(cardCopy?.panels)
      .map((panel) => asRecord(panel))
      .filter(Boolean)
      .map((panel) => ({
        panelId: jsonText(panel?.id) || "panel",
        headline: jsonText(panel?.headline),
        body: jsonText(panel?.body),
        prompt: jsonText(panel?.image_prompt ?? panel?.imagePrompt),
        negativePrompt: jsonText(panel?.image_negative_prompt ?? panel?.imageNegativePrompt)
      }));
    const generatedPrompts = jsonArray(record.images)
      .map((image) => asRecord(image))
      .filter(Boolean)
      .map((image) => ({
        panelId: jsonText(image?.panel_id ?? image?.panelId) || "panel",
        revisedPrompt: jsonText(image?.revised_prompt ?? image?.revisedPrompt)
      }))
      .filter((image) => image.revisedPrompt);
    return [
      ...(themeRows.length ? [{ title: "Generated theme", rows: themeRows }] : []),
      ...(panels.length ? [{ title: "Generated copy and image prompts", prompts: panels }] : []),
      ...(generatedPrompts.length ? [{ title: "Generated prompts returned", prompts: generatedPrompts }] : [])
    ];
  }

  return [];
}

export function groupBucketObjects(objects: BucketObject[]): BucketRenderPacketGroup[] {
  const groups = new Map<string, BucketRenderPacketGroup>();
  for (const object of objects) {
    const match = object.objectKey.match(/^projects\/([^/]+)\/render-packets\/([^/]+)\//);
    if (!match) continue;
    const projectId = object.metadata?.projectId ?? object.metadata?.projectid ?? match[1];
    const renderPacketId = object.metadata?.renderPacketId ?? object.metadata?.renderpacketid ?? match[2];
    const key = `${projectId}/${renderPacketId}`;
    const group = groups.get(key) ?? {
      projectId,
      renderPacketId,
      objectPrefix: `projects/${projectId}/render-packets/${renderPacketId}/`,
      objectCount: 0,
      byteLength: 0,
      lastModifiedIso: "",
      artifacts: [],
      panelImages: [],
      promptArtifacts: [],
      manifestArtifact: null
    };
    group.objectCount += 1;
    group.byteLength += object.byteLength;
    group.lastModifiedIso = latestIso(group.lastModifiedIso, object.lastModifiedIso);
    group.artifacts.push(object);
    if (isPromptArtifact(object)) group.promptArtifacts.push(object);
    if (isPanelArtifact(object)) group.panelImages.push(object);
    if (object.fileName === "artifact-handoff-manifest.json") group.manifestArtifact = object;
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((first, second) => (second.lastModifiedIso ?? "").localeCompare(first.lastModifiedIso ?? ""));
}

export function sortBucketRenderPacketGroups(groups: BucketRenderPacketGroup[], sort: BucketSort, order: BucketOrder): BucketRenderPacketGroup[] {
  return [...groups].sort((first, second) => compareBucketDisplayItems(
    { key: first.objectPrefix, lastModifiedIso: first.lastModifiedIso },
    { key: second.objectPrefix, lastModifiedIso: second.lastModifiedIso },
    sort,
    order
  ));
}

export function sortBucketObjects(objects: BucketObject[], sort: BucketSort, order: BucketOrder): BucketObject[] {
  return [...objects].sort((first, second) => compareBucketDisplayItems(
    { key: first.objectKey, lastModifiedIso: first.lastModifiedIso },
    { key: second.objectKey, lastModifiedIso: second.lastModifiedIso },
    sort,
    order
  ));
}

function compareBucketDisplayItems(
  first: { key: string; lastModifiedIso?: string },
  second: { key: string; lastModifiedIso?: string },
  sort: BucketSort,
  order: BucketOrder
): number {
  const compared = sort === "lastModified"
    ? (first.lastModifiedIso ?? "").localeCompare(second.lastModifiedIso ?? "") || first.key.localeCompare(second.key)
    : first.key.localeCompare(second.key);
  return order === "desc" ? -compared : compared;
}

function isPromptArtifact(object: BucketObject): boolean {
  return object.fileName.endsWith(".json") && object.fileName !== "artifact-handoff-manifest.json";
}

function isPanelArtifact(object: BucketObject): boolean {
  const kind = object.metadata?.kind ?? "";
  return object.contentType.startsWith("image/") || kind === "panel-svg" || object.fileName.startsWith("provider-") || object.fileName.startsWith("preview-");
}

export function promptArtifactLabel(fileName: string): string {
  if (fileName === "persisted-customcard-ai-output.json") return "Generated output";
  if (fileName === "persisted-effective-prompts.json") return "Inputs and prompts used";
  return fileName;
}

export function shortPanelFileName(fileName: string): string {
  return fileName.replace(/^provider-/, "").replace(/^preview-/, "").replace(/\.(png|jpg|jpeg|webp|svg)$/i, "");
}

export function panelLabel(panelId: string): string {
  return panelId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function jsonText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function jsonStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => jsonText(item)).filter(Boolean) : [];
}

function compactRows(rows: Array<[string, string]>): Array<[string, string]> {
  return rows.filter(([, value]) => value.trim().length > 0);
}

function latestIso(first = "", second = ""): string {
  if (!first) return second || "";
  if (!second) return first;
  return second.localeCompare(first) > 0 ? second : first;
}
