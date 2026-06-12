import { describe, expect, it } from "vitest";
import {
  buildAiPanelGenerationProgress,
  initialViewFromLocation,
  progressForPanels
} from "./appStateOrchestrator";
import type { CardPanel } from "./customerWorkflow";
import {
  buildOpportunity,
  buildVendorHandoff,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  sampleInviteText,
  validateCardDraft
} from "./freeMvp";
import { applyPanelOverrides, emptyPanelOverrides, setPanelOverride } from "./panelEdits";
import { buildPrintExportPackage } from "./printExport";

const panels: CardPanel[] = [
  buildPanel("front", "Front"),
  buildPanel("inside-left", "Inside left"),
  buildPanel("inside-right", "Inside right"),
  buildPanel("back", "Back")
];

describe("initialViewFromLocation", () => {
  it("returns a valid ViewId (default is customer in jsdom with no params)", () => {
    const result = initialViewFromLocation();
    const validIds = new Set(["customer", "mobile", "opportunities", "studio", "memory", "handoff", "legal", "admin", "adapters"]);
    expect(validIds.has(result)).toBe(true);
  });

  it("falls back to customer in non-browser environment", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: undefined, configurable: true });
    try {
      expect(initialViewFromLocation()).toBe("customer");
    } finally {
      Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    }
  });
});

describe("AI panel generation progress", () => {
  it("marks every panel as queued when generation starts", () => {
    expect(progressForPanels(panels, "queued")).toEqual({
      front: "queued",
      "inside-left": "queued",
      "inside-right": "queued",
      back: "queued"
    });
  });

  it("distinguishes copy-ready panels from artwork that is still loading", () => {
    const copyByPanel = new Map([
      ["front", { id: "front", headline: "Happy Birthday" }],
      ["inside-left", { id: "inside-left", body: "A warm note." }],
      ["inside-right", { id: "inside-right", body: "A second note." }]
    ]);
    const imageByPanel = new Map([
      ["front", { panel_id: "front", image_url: "data:image/png;base64,AAAA" }],
      ["inside-right", { panel_id: "inside-right", image_url: "data:image/png;base64,BBBB" }]
    ]);

    expect(buildAiPanelGenerationProgress(panels, copyByPanel, imageByPanel)).toEqual({
      front: "artwork-loading",
      "inside-left": "copy-ready",
      "inside-right": "artwork-loading",
      back: "artwork-missing"
    });
  });
});

describe("active draft pipeline", () => {
  // Mirrors the orchestrator's memo chain: activeDraft = overrides(aiDraft ?? draft),
  // then validation -> handoff -> print package are all built from activeDraft.
  it("drives validation, handoff, and the print package from AI copy plus panel edits", () => {
    const opportunity = buildOpportunity(parseFreeImport(sampleInviteText), [], new Date("2026-06-03T12:00:00.000Z"));
    const templateDraft = generateCardDraft(getDefaultDraftInput(undefined, opportunity), []);
    const aiDraft = {
      ...templateDraft,
      generatedBy: "ai-text-only" as const,
      panels: templateDraft.panels.map((panel) =>
        panel.id === "inside-right" ? { ...panel, body: "AI wrote this exact message." } : panel
      )
    };

    const activeDraft = applyPanelOverrides(
      aiDraft,
      setPanelOverride(emptyPanelOverrides, "front", { headline: "Edited front headline" })
    );
    const validation = validateCardDraft(activeDraft);
    const handoff = buildVendorHandoff("walgreens", validation);
    const printPackage = buildPrintExportPackage(activeDraft, validation, handoff);

    const frontSvg = printPackage.files.find((file) => file.panelId === "front");
    const insideRightSvg = printPackage.files.find((file) => file.panelId === "inside-right");
    expect(frontSvg?.text).toContain("Edited front headline");
    expect(insideRightSvg?.text).toContain("AI wrote this exact message.");
    expect(printPackage.manifest.draftId).toBe(activeDraft.id);
  });

  it("recomputes overflow validation when an edit makes a panel too long", () => {
    const opportunity = buildOpportunity(parseFreeImport(sampleInviteText), [], new Date("2026-06-03T12:00:00.000Z"));
    const templateDraft = generateCardDraft(getDefaultDraftInput(undefined, opportunity), []);
    const activeDraft = applyPanelOverrides(
      templateDraft,
      setPanelOverride(emptyPanelOverrides, "inside-right", { body: "Far too much text. ".repeat(40) })
    );

    expect(validateCardDraft(activeDraft).passed).toBe(false);
  });
});

function buildPanel(id: CardPanel["id"], label: string): CardPanel {
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
    overflowRisk: false
  };
}
