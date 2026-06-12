import { describe, expect, it } from "vitest";
import {
  buildAiPanelGenerationProgress,
  initialViewFromLocation,
  progressForPanels
} from "./appStateOrchestrator";
import type { CardPanel } from "./customerWorkflow";

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
