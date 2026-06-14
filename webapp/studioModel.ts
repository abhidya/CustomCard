import type {
  CardDraft,
  CardDraftInput,
  CardImagePlacement,
  CardPanel,
  CardTextFormat,
  CardTextLayout,
  MemoryItem,
  Tone,
  TonePreset,
  VisualStyle
} from "../src/customerWorkflow";
import type { AiPanelGenerationProgress, AiPanelGenerationStatus } from "../src/appStateOrchestrator";
import { displayDraftValue } from "./draftProgress";
import { cardTemplates, type CardTemplateChoice } from "./cardTemplates";

export const allStudioTonePresets: TonePreset[] = ["warm", "funny", "elegant", "simple", "reverent", "sentimental"];
export const studioVisualStylePresets = ["botanical", "bold-type", "photo-note", "minimal"] as const;

export const toneLabels: Record<TonePreset, string> = {
  warm: "Warm",
  funny: "Funny",
  elegant: "Elegant",
  simple: "Simple",
  reverent: "Reverent",
  sentimental: "Sentimental"
};

export const styleLabels: Record<(typeof studioVisualStylePresets)[number], string> = {
  botanical: "Botanical",
  "bold-type": "Bold type",
  "photo-note": "Photo note",
  minimal: "Minimal"
};

export type GenerationStageState = "done" | "active" | "pending";

export interface GenerationStage {
  label: string;
  state: GenerationStageState;
}

export interface StudioContextChecklistItem {
  label: string;
  done: boolean;
}

export interface StudioModelInput {
  draft: CardDraft;
  draftInput: CardDraftInput;
  memories: MemoryItem[];
  aiLoading: boolean;
  aiActive: boolean;
  aiStatus?: string;
  aiPanelProgress: AiPanelGenerationProgress;
  aiRequiresSignIn: boolean;
  printFitPassed: boolean;
  activePanelId: CardPanel["id"];
  generationPanelIds: CardPanel["id"][];
  templateReviewStarted: boolean;
}

export interface StudioModel {
  activePanel: CardPanel;
  activePanelStatus: AiPanelGenerationStatus | undefined;
  aiNote: string;
  aiPanelSummary: string;
  aiState: "loading" | "ready" | "idle";
  approvedForRecipient: number;
  artworkCount: number;
  contextChecklist: StudioContextChecklistItem[];
  minContextReady: boolean;
  proofWorkspaceVisible: boolean;
  selectedGenerationPanels: CardPanel[];
  selectedTemplate: CardTemplateChoice | undefined;
  sensitive: boolean;
  setupRecipient: string;
  stagePanelSummary: string;
  stages: GenerationStage[];
  tones: TonePreset[];
  totalPanels: number;
}

/** High-care occasions hide humor and add a review-everything banner. */
export function isSensitiveOccasion(occasion: string): boolean {
  return /sympath|grief|loss|condol|illness|sick|get well|apolog|memorial|funeral|miscarriage|divorce/i.test(occasion);
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function humanizeChoice(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map(titleCase)
    .join(" ");
}

export function toneLabel(value: Tone): string {
  return toneLabels[value as TonePreset] ?? humanizeChoice(value);
}

export function styleLabel(value: VisualStyle): string {
  return styleLabels[value as (typeof studioVisualStylePresets)[number]] ?? humanizeChoice(value);
}

export function toneImpliesHumor(value: string): boolean {
  return /\b(funny|playful|witty|humou?r)\b/i.test(value);
}

export function defaultPanelTextLayout(panel: CardPanel): CardTextLayout {
  const photoWindow = panel.imagePlacement?.frame === "photo-window";
  return {
    headlineZone: photoWindow ? "lower" : "upper",
    bodyZone: photoWindow ? "bottom" : "center",
    alignment: panel.rtl ? "right" : "center",
    fontPairing: photoWindow ? "serif-sans" : "soft-serif",
    colorMode: "dark-ink",
    scale: "standard"
  };
}

export function mergePanelTextLayout(panel: CardPanel, patch: Partial<CardTextLayout>): CardTextLayout {
  return { ...defaultPanelTextLayout(panel), ...panel.textLayout, ...patch };
}

export function mergePanelTextFormat(
  panel: CardPanel,
  target: keyof CardTextFormat,
  patch: NonNullable<CardTextFormat[keyof CardTextFormat]>
): CardTextFormat {
  return {
    ...panel.textFormat,
    [target]: {
      ...panel.textFormat?.[target],
      ...patch
    }
  };
}

export function genericOccasion(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "card";
}

export function panelArtworkLabel(
  panel: CardPanel,
  stale: boolean,
  status: AiPanelGenerationStatus | undefined
): string {
  if (stale) return "Needs review";
  if (status === "queued") return "Queued";
  if (status === "copy-ready") return "Copy ready";
  if (status === "artwork-loading") return "Loading art";
  if (status === "artwork-ready") return "Artwork ready";
  if (status === "artwork-missing") return panel.imageUrl ? "Artwork ready" : "Copy ready";
  if (panel.imageUrl) return "Artwork ready";
  return "Template";
}

export function generationStages({
  aiLoading,
  aiActive,
  panelProgress,
  printFitPassed,
  readyArtworkCount,
  totalPanels
}: {
  aiLoading: boolean;
  aiActive: boolean;
  panelProgress: AiPanelGenerationProgress;
  printFitPassed: boolean;
  readyArtworkCount: number;
  totalPanels: number;
}): GenerationStage[] {
  const statuses = Object.values(panelProgress);
  const copyReady = statuses.some((status) => status !== "queued");
  const artworkExpected = statuses.some((status) => status === "artwork-loading" || status === "artwork-ready");
  const artworkDone = artworkExpected ? readyArtworkCount === totalPanels && totalPanels > 0 : aiActive;
  const artworkLabel = artworkExpected ? `Loading artwork (${readyArtworkCount}/${totalPanels})` : "Applying panel copy";

  if (aiLoading) {
    return [
      { label: "Writing editable copy", state: copyReady ? "done" : "active" },
      { label: artworkLabel, state: copyReady ? (artworkDone ? "done" : "active") : "pending" },
      { label: "Checking print fit", state: artworkDone ? "active" : "pending" },
      { label: "Ready for review", state: "pending" }
    ];
  }
  if (aiActive) {
    return [
      { label: "Writing editable copy", state: "done" },
      { label: artworkLabel, state: artworkDone ? "done" : "active" },
      { label: "Checking print fit", state: printFitPassed ? "done" : "active" },
      { label: "Ready for review", state: printFitPassed ? "done" : "pending" }
    ];
  }
  return [];
}

export function buildStudioContextChecklist(draftInput: CardDraftInput): StudioContextChecklistItem[] {
  return [
    { label: "Recipient", done: displayDraftValue(draftInput.recipient).trim() !== "" },
    { label: "Occasion", done: displayDraftValue(draftInput.occasion).trim() !== "" },
    {
      label: "Relationship or one personal detail",
      done: draftInput.relationship.trim() !== "" || displayDraftValue(draftInput.personalNote).trim() !== ""
    }
  ];
}

export function normalizeGenerationPanelIds({
  draft,
  activePanelId,
  generationPanelIds
}: {
  draft: CardDraft;
  activePanelId: CardPanel["id"];
  generationPanelIds: CardPanel["id"][];
}): CardPanel["id"][] {
  if (
    generationPanelIds.length > 0 &&
    generationPanelIds.every((panelId) => draft.panels.some((candidate) => candidate.id === panelId))
  ) {
    return generationPanelIds;
  }
  return draft.panels.some((candidate) => candidate.id === activePanelId)
    ? [activePanelId]
    : [draft.panels[0]?.id ?? "front"];
}

export function toggleGenerationPanelId({
  draft,
  current,
  panelId
}: {
  draft: CardDraft;
  current: CardPanel["id"][];
  panelId: CardPanel["id"];
}): CardPanel["id"][] {
  const next = current.includes(panelId)
    ? current.length === 1
      ? current
      : current.filter((candidate) => candidate !== panelId)
    : [...current, panelId];
  return draft.panels.map((candidate) => candidate.id).filter((candidate) => next.includes(candidate));
}

export function templatePanelPatch(template: CardTemplateChoice): {
  artDirection: string;
  imagePlacement: CardImagePlacement;
  imageUrl: string;
  styleId: CardTemplateChoice["styleId"];
  textLayout: CardTextLayout;
} {
  return {
    artDirection: template.artDirection,
    imagePlacement: template.imagePlacement,
    imageUrl: template.imageUrl,
    styleId: template.styleId,
    textLayout: template.textLayout
  };
}

export function photoWindowTextLayoutPatch(panel: CardPanel, nextPlacement: CardImagePlacement): CardTextLayout | undefined {
  return nextPlacement.frame === "photo-window"
    ? mergePanelTextLayout(panel, { headlineZone: "lower", bodyZone: "bottom", alignment: "center" })
    : panel.textLayout;
}

export function uploadedImagePanelPatch(panel: CardPanel, fileName: string, imageUrl: string) {
  return {
    artDirection: `Customer uploaded image: ${fileName}`,
    imagePlacement: { frame: "photo-window", focus: "center" } satisfies CardImagePlacement,
    imageUrl,
    textLayout: mergePanelTextLayout(panel, {
      alignment: "center",
      bodyZone: "bottom",
      colorMode: "dark-ink",
      headlineZone: "lower"
    })
  };
}

export function buildStudioModel(input: StudioModelInput): StudioModel {
  const activePanel = input.draft.panels.find((candidate) => candidate.id === input.activePanelId) ?? input.draft.panels[0];
  const frontPanel = input.draft.panels.find((candidate) => candidate.id === "front") ?? input.draft.panels[0];
  const selectedTemplate = cardTemplates.find((template) => template.imageUrl === frontPanel?.imageUrl);
  const selectedGenerationPanels = input.draft.panels.filter((candidate) =>
    input.generationPanelIds.includes(candidate.id)
  );
  const approvedForRecipient = input.memories.filter((memory) => memory.approved).length;
  const artworkCount = input.draft.panels.filter((candidate) => candidate.imageUrl).length;
  const totalPanels = input.draft.panels.length;
  const setupRecipient = displayDraftValue(input.draftInput.recipient);
  const activePanelStatus = input.aiPanelProgress[activePanel.id];
  const sensitive = isSensitiveOccasion(input.draftInput.occasion);
  const tones = sensitive ? allStudioTonePresets.filter((tone) => tone !== "funny") : allStudioTonePresets;
  const aiState = input.aiLoading ? "loading" : input.aiActive ? "ready" : "idle";
  const stages = generationStages({
    aiLoading: input.aiLoading,
    aiActive: input.aiActive,
    panelProgress: input.aiPanelProgress,
    printFitPassed: input.printFitPassed,
    readyArtworkCount: artworkCount,
    totalPanels
  });
  const aiPanelSummary = input.aiActive ? `${artworkCount}/${totalPanels} artwork panels ready` : `${totalPanels} print panels`;
  const stagePanelSummary = input.aiLoading
    ? artworkCount > 0
      ? `${artworkCount}/${totalPanels} panels ready`
      : "Ready panels will appear here"
    : aiPanelSummary;
  const contextChecklist = buildStudioContextChecklist(input.draftInput);
  const minContextReady = contextChecklist.every((item) => item.done);
  const proofWorkspaceVisible = input.aiActive || input.aiLoading || input.templateReviewStarted;
  const aiNote = input.aiRequiresSignIn
    ? "AI drafting needs sign-in so your draft can be generated and saved. You can still make, edit, preview, and save a print package without AI."
    : input.aiStatus
      ? input.aiStatus
      : input.aiActive
        ? "Review the copy, artwork, and print fit before continuing."
        : minContextReady
          ? "We’ll write editable copy first, then load artwork panel by panel."
          : "Add who it’s for, the occasion, and one real detail so the draft isn’t generic.";

  return {
    activePanel,
    activePanelStatus,
    aiNote,
    aiPanelSummary,
    aiState,
    approvedForRecipient,
    artworkCount,
    contextChecklist,
    minContextReady,
    proofWorkspaceVisible,
    selectedGenerationPanels,
    selectedTemplate,
    sensitive,
    setupRecipient,
    stagePanelSummary,
    stages,
    tones,
    totalPanels
  };
}
