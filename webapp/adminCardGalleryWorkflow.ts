import { buildPanelSvg, generateCardDraft, type CardDraftInput, type CardPanel } from "../src/customerWorkflow";

export const galleryCategories = [
  "birthday",
  "graduation",
  "wedding",
  "anniversary",
  "thank-you",
  "sympathy",
  "get-well",
  "new-baby",
  "holiday",
  "custom"
] as const;

export type GalleryStage = "candidates" | "drafts" | "needs-review" | "featured";
export type ReviewChecklistId = "permissionConfirmed" | "privacyReviewed" | "textFitReviewed" | "publicCopyReviewed";

export interface GalleryEntry {
  entryId: string;
  sourceDraftId?: string;
  projectId?: string;
  category: string;
  title: string;
  publicCaption: string;
  featured: boolean;
  featuredRank: number;
  publicApproved: boolean;
  frontSvg?: string;
  thumbnailUrl?: string;
  frontImageUrl?: string;
  updatedAtIso?: string;
}

export interface GalleryCandidate {
  sourceDraftId: string;
  status: string;
  draftInput?: Partial<CardDraftInput>;
  derivedCategory: string;
  updatedAtIso?: string;
}

export interface GalleryPayload {
  entries?: GalleryEntry[];
  candidates?: GalleryCandidate[];
  galleryReadStatus?: {
    ok: boolean;
    message?: string;
  };
}

export interface CardCopyState {
  headline: string;
  body: string;
  artDirection: string;
}

export interface GalleryEditorState {
  entryId: string;
  sourceDraftId?: string;
  projectId?: string;
  category: string;
  title: string;
  publicCaption: string;
  featuredRank: string;
  featured: boolean;
  publicApproved: boolean;
  frontSvg: string;
  cardCopy: CardCopyState;
}

export type ReviewChecklistState = Record<ReviewChecklistId, boolean>;

export const emptyReviewChecklist: ReviewChecklistState = {
  permissionConfirmed: false,
  privacyReviewed: false,
  textFitReviewed: false,
  publicCopyReviewed: false
};

export const reviewChecklistItems: Array<{ id: ReviewChecklistId; label: string }> = [
  { id: "permissionConfirmed", label: "Permission to share is confirmed" },
  { id: "privacyReviewed", label: "Names, notes, and private details are public-safe" },
  { id: "textFitReviewed", label: "Card text fits the front preview" },
  { id: "publicCopyReviewed", label: "Gallery title and caption are approved" }
];

export const headlineLimit = 90;
export const bodyLimit = 360;
export const captionLimit = 120;
export const sensitiveCategories = new Set(["sympathy", "get-well"]);
export const emptyCardCopy: CardCopyState = {
  headline: "",
  body: "",
  artDirection: ""
};

export function stageForEntry(entry: GalleryEntry): GalleryStage {
  if (entry.featured && entry.publicApproved) return "featured";
  if (entry.featured || entry.publicApproved || !entry.frontSvg) return "needs-review";
  return "drafts";
}

export function itemKey(kind: "candidate" | "entry", id: string): string {
  return `${kind}:${id}`;
}

export function editorFromCandidate(candidate: GalleryCandidate | undefined): GalleryEditorState {
  const category = candidate?.derivedCategory ?? "custom";
  const generated = generateCandidateFrontCopy(candidate);
  const entryId = buildCandidateEntryId(candidate);
  return {
    entryId,
    sourceDraftId: candidate?.sourceDraftId,
    category,
    title: "",
    publicCaption: "",
    featuredRank: "100",
    featured: false,
    publicApproved: false,
    frontSvg: buildFrontPreviewSvg(generated, category),
    cardCopy: generated
  };
}

export function editorFromEntry(entry: GalleryEntry): GalleryEditorState {
  const fallbackCopy = {
    headline: entry.title || "",
    body: entry.publicCaption || "",
    artDirection: ""
  };
  return {
    entryId: entry.entryId,
    sourceDraftId: entry.sourceDraftId,
    projectId: entry.projectId,
    category: entry.category,
    title: entry.title,
    publicCaption: entry.publicCaption,
    featuredRank: String(entry.featuredRank),
    featured: entry.featured,
    publicApproved: entry.publicApproved,
    frontSvg: entry.frontSvg ?? "",
    cardCopy: fallbackCopy
  };
}

export function buildCandidateEntryId(candidate: GalleryCandidate | undefined): string {
  return `gallery-${String(candidate?.sourceDraftId ?? "draft").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 64)}`;
}

export function generateCandidateFrontCopy(candidate: GalleryCandidate | undefined): CardCopyState {
  const draftInput = candidate?.draftInput;
  if (!draftInput) return { ...emptyCardCopy };
  const sender = candidateDraftText(draftInput.sender);
  const recipient = candidateDraftText(draftInput.recipient);
  const relationship = candidateDraftText(draftInput.relationship);
  const occasion = candidateDraftText(draftInput.occasion);
  const tone = candidateDraftText(draftInput.tone);
  const style = candidateDraftText(draftInput.style);
  const language = candidateDraftText(draftInput.language);
  if (!sender || !recipient || !relationship || !occasion || !tone || !style || !language) {
    return { ...emptyCardCopy };
  }
  try {
    const draft = generateCardDraft(
      {
        recipient,
        sender,
        relationship,
        occasion,
        tone: tone as CardDraftInput["tone"],
        style: style as CardDraftInput["style"],
        language: language as CardDraftInput["language"],
        personalNote: candidateDraftText(draftInput.personalNote),
        useMemory: draftInput.useMemory === true
      },
      []
    );
    const frontPanel = draft.panels.find((panel) => panel.id === "front");
    if (frontPanel) {
      return {
        headline: frontPanel.headline,
        body: frontPanel.body,
        artDirection: frontPanel.artDirection
      };
    }
  } catch {
    return { ...emptyCardCopy };
  }
  return { ...emptyCardCopy };
}

export function buildFrontPreviewSvg(copy: CardCopyState, category: string): string {
  const headline = copy.headline.trim();
  const body = copy.body.trim();
  if (!headline || !body) return "";
  const panel: CardPanel = {
    id: "front",
    label: "Front",
    headline,
    body,
    artDirection: copy.artDirection.trim() || "Public gallery-safe card preview",
    width: 1500,
    height: 2100,
    dpi: 300,
    rtl: false,
    overflowRisk: !textFits(copy)
  };
  return buildPanelSvg(panel);
}

export function textFits(copy: CardCopyState): boolean {
  return copy.headline.trim().length > 0 && copy.headline.length <= headlineLimit && copy.body.trim().length > 0 && copy.body.length <= bodyLimit;
}

export function reviewedChecklist(): ReviewChecklistState {
  return {
    permissionConfirmed: true,
    privacyReviewed: true,
    textFitReviewed: true,
    publicCopyReviewed: true
  };
}

export function buildPublishIssues(
  editor: GalleryEditorState,
  checklist: ReviewChecklistState,
  hasPersistedEntry: boolean,
  previewDirty: boolean
): string[] {
  const issues: string[] = [];
  if (!hasPersistedEntry) issues.push("Create a gallery draft first.");
  if (!editor.category) issues.push("Choose a category.");
  if (!editor.title.trim()) issues.push("Add a public title.");
  if (!editor.publicCaption.trim()) issues.push("Add a public caption.");
  if (editor.publicCaption.length > captionLimit) issues.push(`Public caption must be ${captionLimit} characters or fewer.`);
  if (!editor.frontSvg.trim()) issues.push("Attach or generate a front preview.");
  if (previewDirty) issues.push("Update the front preview after editing card text.");
  if (!textFits(editor.cardCopy)) issues.push("Shorten card headline or body copy.");
  if (!checklist.permissionConfirmed) issues.push("Confirm permission to share.");
  if (!checklist.privacyReviewed) issues.push("Complete privacy review.");
  if (!checklist.textFitReviewed) issues.push("Confirm the text-fit review.");
  if (!checklist.publicCopyReviewed) issues.push("Approve the gallery title and caption.");
  return issues;
}

export function labelFor(category: string): string {
  return category
    .split("-")
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function candidateDraftText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
