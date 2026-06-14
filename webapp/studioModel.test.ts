import { describe, expect, it } from "vitest";
import type { CardDraft, CardDraftInput, CardPanel, MemoryItem } from "../src/freeMvp";
import {
  buildStudioModel,
  defaultPanelTextLayout,
  generationStages,
  normalizeGenerationPanelIds,
  photoWindowTextLayoutPatch,
  toggleGenerationPanelId,
  uploadedImagePanelPatch
} from "./studioModel";

const draftInput: CardDraftInput = {
  recipient: "Sara",
  sender: "Maya",
  relationship: "Sisters",
  occasion: "birthday",
  tone: "warm",
  style: "botanical",
  language: "English",
  personalNote: "",
  useMemory: true
};

const panels: CardPanel[] = [
  buildPanel("front", "Front"),
  buildPanel("inside-left", "Inside left"),
  buildPanel("inside-right", "Inside right"),
  buildPanel("back", "Back")
];

const draft: CardDraft = {
  id: "draft-sara",
  input: draftInput,
  panels,
  memoryCitations: [],
  generatedBy: "deterministic-free-template"
};

const memories: MemoryItem[] = [
  {
    id: "memory-1",
    approved: true,
    note: "Sara likes quiet botanical cards.",
    recipient: "Sara",
    sensitivity: "normal",
    tags: [],
    updatedAtIso: "2026-06-14T00:00:00.000Z"
  }
];

describe("studio model", () => {
  it("concentrates sensitive Occasion gating and launch copy behind one model", () => {
    const model = buildStudioModel({
      draft,
      draftInput: { ...draftInput, occasion: "sympathy", tone: "playful" },
      memories,
      activePanelId: "front",
      aiActive: false,
      aiLoading: false,
      aiPanelProgress: {},
      aiRequiresSignIn: false,
      generationPanelIds: ["front"],
      printFitPassed: false,
      templateReviewStarted: false
    });

    expect(model.sensitive).toBe(true);
    expect(model.tones).not.toContain("funny");
    expect(model.approvedForRecipient).toBe(1);
    expect(model.minContextReady).toBe(true);
    expect(model.aiNote).toBe("We’ll write editable copy first, then load artwork panel by panel.");
  });

  it("summarizes progressive AI generation stages without rendering StudioView", () => {
    const stages = generationStages({
      aiActive: true,
      aiLoading: true,
      panelProgress: {
        front: "artwork-ready",
        "inside-left": "artwork-loading",
        "inside-right": "copy-ready",
        back: "queued"
      },
      printFitPassed: false,
      readyArtworkCount: 1,
      totalPanels: 4
    });

    expect(stages).toEqual([
      { label: "Writing editable copy", state: "done" },
      { label: "Loading artwork (1/4)", state: "active" },
      { label: "Checking print fit", state: "pending" },
      { label: "Ready for review", state: "pending" }
    ]);
  });

  it("keeps selected Panel ids valid and prevents deselecting the last selected Panel", () => {
    expect(
      normalizeGenerationPanelIds({ draft, activePanelId: "inside-right", generationPanelIds: ["front", "back"] })
    ).toEqual(["front", "back"]);
    expect(normalizeGenerationPanelIds({ draft, activePanelId: "inside-right", generationPanelIds: [] })).toEqual([
      "inside-right"
    ]);
    expect(toggleGenerationPanelId({ draft, current: ["front"], panelId: "front" })).toEqual(["front"]);
    expect(toggleGenerationPanelId({ draft, current: ["front"], panelId: "back" })).toEqual(["front", "back"]);
    expect(toggleGenerationPanelId({ draft, current: ["front", "back"], panelId: "front" })).toEqual(["back"]);
  });

  it("builds Panel layout patches for uploaded images and photo-window placement", () => {
    const panel = buildPanel("front", "Front", { rtl: true });
    expect(defaultPanelTextLayout(panel).alignment).toBe("right");

    const photoPatch = photoWindowTextLayoutPatch(panel, { frame: "photo-window", focus: "center" });
    expect(photoPatch).toMatchObject({
      alignment: "center",
      bodyZone: "bottom",
      headlineZone: "lower"
    });

    expect(uploadedImagePanelPatch(panel, "family.png", "data:image/png;base64,AAAA")).toMatchObject({
      artDirection: "Customer uploaded image: family.png",
      imagePlacement: { frame: "photo-window", focus: "center" },
      imageUrl: "data:image/png;base64,AAAA",
      textLayout: {
        alignment: "center",
        bodyZone: "bottom",
        colorMode: "dark-ink",
        headlineZone: "lower"
      }
    });
  });
});

function buildPanel(id: CardPanel["id"], label: string, patch: Partial<CardPanel> = {}): CardPanel {
  return {
    id,
    label,
    headline: label,
    body: "",
    artDirection: "",
    width: 1500,
    height: 2100,
    dpi: 300,
    rtl: false,
    overflowRisk: false,
    ...patch
  };
}
