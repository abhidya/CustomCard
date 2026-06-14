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
    title: `${labelFor(category)} card`,
    publicCaption: "Made with CustomCard",
    featuredRank: "100",
    featured: false,
    publicApproved: false,
    frontSvg: buildFrontPreviewSvg(generated, category),
    cardCopy: generated
  };
}

export function editorFromEntry(entry: GalleryEntry): GalleryEditorState {
  const fallbackCopy = {
    headline: entry.title || `${labelFor(entry.category)} card`,
    body: entry.publicCaption || captionForCategory(entry.category),
    artDirection: "Curated public gallery front preview"
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
  const draftInput = candidate?.draftInput ?? {};
  try {
    const draft = generateCardDraft(
      {
        recipient: "Someone special",
        sender: "A CustomCard customer",
        relationship: String(draftInput.relationship ?? "Friends"),
        occasion: String(draftInput.occasion ?? "card"),
        tone: (draftInput.tone ?? "warm") as CardDraftInput["tone"],
        style: (draftInput.style ?? "botanical") as CardDraftInput["style"],
        language: (draftInput.language ?? "English") as CardDraftInput["language"],
        personalNote: "",
        useMemory: false
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
    // Use the public-safe fallback below when old draft inputs are malformed.
  }
  return suggestedCardCopy(candidate?.derivedCategory ?? "custom", `${labelFor(candidate?.derivedCategory ?? "custom")} card`, 0);
}

export function buildFrontPreviewSvg(copy: CardCopyState, category: string): string {
  const panel: CardPanel = {
    id: "front",
    label: "Front",
    headline: copy.headline.trim() || `${labelFor(category)} card`,
    body: copy.body.trim() || captionForCategory(category),
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

export function suggestedCardCopy(category: string, title: string, iteration: number): CardCopyState {
  const label = labelFor(category);
  const variants: CardCopyState[] = [
    {
      headline: `${label} card, made personal`,
      body: `A polished ${label.toLowerCase()} card with warm copy, reviewed details, and a print-ready front panel.`,
      artDirection: "Public gallery-safe 5x7 front with calm spacing and no private notes"
    },
    {
      headline: `For a real ${label.toLowerCase()} moment`,
      body: "A CustomCard example built from reviewed occasion details and prepared for a careful print proof.",
      artDirection: "Clean public sample card front with soft accents and generous text-safe margins"
    },
    {
      headline: title.trim() || `${label} card`,
      body: captionForCategory(category),
      artDirection: "Curated landing gallery preview with public-safe copy and restrained ornament"
    }
  ];
  return variants[iteration % variants.length];
}

export function captionForCategory(category: string): string {
  const captions: Record<string, string> = {
    birthday: "A personal birthday card prepared for review and print.",
    graduation: "A graduation card with public-safe copy and a clean proof.",
    wedding: "An elegant card example for a wedding or engagement moment.",
    anniversary: "A relationship card shaped around a remembered date.",
    "thank-you": "A thoughtful thank-you card ready for a final proof check.",
    sympathy: "A quiet sympathy card reviewed for tone and privacy.",
    "get-well": "A supportive get-well card with careful, human-reviewed copy.",
    "new-baby": "A gentle new-baby card example for a shared family moment.",
    holiday: "A seasonal card example with editable copy and print-safe artwork.",
    custom: "A public-safe card example curated from a CustomCard draft."
  };
  return captions[category] ?? captions.custom;
}

export function labelFor(category: string): string {
  return category
    .split("-")
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}
