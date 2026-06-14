import { describe, expect, it } from "vitest";
import {
  buildAiPanelGenerationProgress,
  initialViewFromLocation,
  progressForPanels,
  readAiGenerationJobStatusResponse,
  readAiGenerationResponse,
  syncDraftInputWithOpportunity
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
} from "./customerWorkflow";
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

describe("queued AI generation responses", () => {
  it("accepts queued generation admission and preserves the status URL", async () => {
    const response = new Response(
      JSON.stringify({
        status: "queued",
        job_id: "job-ai-card-1",
        job_status_url: "/api/ai/jobs/status?job_id=job-ai-card-1",
        queue_status: "queued",
        result_available: false
      }),
      { status: 202, headers: { "content-type": "application/json" } }
    );

    await expect(readAiGenerationResponse(response)).resolves.toMatchObject({
      status: "queued",
      job_id: "job-ai-card-1",
      job_status_url: "/api/ai/jobs/status?job_id=job-ai-card-1",
      result_available: false
    });
  });

  it("unwraps completed queued worker results into the direct generation payload shape", async () => {
    const response = new Response(
      JSON.stringify({
        status: "job-result-ready",
        job_id: "job-ai-card-1",
        queue_status: "succeeded",
        result_available: true,
        result: {
          status: "ai-result-ready",
          routeId: "ai-card-generate",
          payload: {
            draft_id: "draft-sara",
            generated_by: "ai-text-and-image",
            card_copy: {
              panels: [{ id: "front", headline: "For Sara", body: "A warm note." }]
            },
            images: [{ panel_id: "front", image_url: "/api/artifacts/front.png" }]
          }
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

    await expect(readAiGenerationJobStatusResponse(response)).resolves.toMatchObject({
      status: "ready",
      result: {
        job_id: "job-ai-card-1",
        queue_status: "succeeded",
        result_available: true,
        card_copy: {
          panels: [{ id: "front", headline: "For Sara" }]
        },
        images: [{ panel_id: "front", image_url: "/api/artifacts/front.png" }]
      }
    });
  });

  it("keeps queued job status pending until the worker has a result", async () => {
    const response = new Response(
      JSON.stringify({
        status: "job-running",
        job_id: "job-ai-card-2",
        queue_status: "running",
        result_available: false,
        retry_after_seconds: 4
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

    await expect(readAiGenerationJobStatusResponse(response)).resolves.toMatchObject({
      status: "pending",
      jobId: "job-ai-card-2",
      queueStatus: "running",
      retryAfterSeconds: 4
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

describe("draft input opportunity sync", () => {
  it("does not wipe a calendar moment draft when saving the moment creates a workspace", () => {
    const emptyOpportunity = buildOpportunity(parseFreeImport(""), [], new Date("2026-06-12T12:00:00.000Z"));
    const current = {
      ...getDefaultDraftInput(undefined, emptyOpportunity),
      recipient: "Papa",
      occasion: "birthday",
      tone: "playful" as const
    };
    const next = syncDraftInputWithOpportunity(current, {
      workspace: {
        id: "workspace-maya",
        name: "Maya",
        email: "maya@example.com",
        createdAtIso: "2026-06-12T12:00:00.000Z",
        memories: [],
        events: []
      },
      opportunity: emptyOpportunity,
      opportunityChanged: false
    });

    expect(next).toMatchObject({
      sender: "Maya",
      recipient: "Papa",
      occasion: "birthday",
      tone: "playful"
    });
  });

  it("does sync from the parser when the active opportunity changes", () => {
    const emptyOpportunity = buildOpportunity(parseFreeImport(""), [], new Date("2026-06-12T12:00:00.000Z"));
    const parsedOpportunity = buildOpportunity(
      parseFreeImport(sampleInviteText),
      [],
      new Date("2026-06-12T12:00:00.000Z")
    );
    const current = {
      ...getDefaultDraftInput(undefined, emptyOpportunity),
      tone: "elegant" as const
    };
    const next = syncDraftInputWithOpportunity(current, {
      workspace: undefined,
      opportunity: parsedOpportunity,
      opportunityChanged: true
    });

    expect(next).toMatchObject({
      recipient: "Sara and Ahmed",
      occasion: "anniversary",
      tone: "elegant"
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
