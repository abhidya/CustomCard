import { describe, expect, it } from "vitest";
import {
  buildOpportunity,
  buildPanelSvg,
  buildVendorHandoff,
  createLocalWorkspace,
  defaultMemories,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  sampleInviteText,
  validateCardDraft
} from "./freeMvp";
import { customerVisibleImplementationTermPattern } from "./customerWebExperience";

describe("free MVP workflow", () => {
  it("creates a local workspace without requiring paid or external auth", () => {
    const workspace = createLocalWorkspace(
      "Abdul",
      "abdul@example.com",
      new Date("2026-06-03T12:00:00.000Z")
    );

    expect(workspace.id).toMatch(/^workspace-/);
    expect(workspace.email).toBe("abdul@example.com");
    expect(workspace.memories).toEqual([]);
  });

  it("parses an ICS paste into a reviewable opportunity", () => {
    const signal = parseFreeImport(sampleInviteText);
    const opportunity = buildOpportunity(
      signal,
      defaultMemories,
      new Date("2026-06-03T12:00:00.000Z")
    );

    expect(signal.source).toBe("ics-paste");
    expect(signal.occasion).toBe("anniversary");
    expect(signal.recipients).toBe("Sara and Ahmed");
    expect(signal.dateLabel).toBe("Jul 12, 2026");
    expect(opportunity.status).toBe("ready");
    expect(opportunity.recommendedPath).toContain("manual");
    expect(opportunity.memoryIds).toContain("mem-sara-ahmed-10-year-thread");
  });

  it("generates deterministic four-panel 5x7 SVG-ready cards", () => {
    const workspace = { ...createLocalWorkspace("Abdul", "abdul@example.com"), memories: defaultMemories };
    const signal = parseFreeImport(sampleInviteText);
    const opportunity = buildOpportunity(signal, workspace.memories, new Date("2026-06-03T12:00:00.000Z"));
    const input = getDefaultDraftInput(workspace, opportunity);
    const draft = generateCardDraft(input, workspace.memories);
    const validation = validateCardDraft(draft);

    expect(draft.generatedBy).toBe("deterministic-free-template");
    expect(draft.panels).toHaveLength(4);
    expect(draft.panels.every((panel) => panel.width === 1500 && panel.height === 2100 && panel.dpi === 300)).toBe(
      true
    );
    expect(draft.panels.map((panel) => panel.id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(draft.memoryCitations).toEqual(["mem-sara-ahmed-10-year-thread"]);
    expect(validation.passed).toBe(true);
    expect(validation.checks.map((check) => check.label)).toContain("No paid services");
    expect(validation.checks.flatMap((check) => [check.label, check.detail]).join(" ")).not.toMatch(
      customerVisibleImplementationTermPattern
    );
  });

  it("keeps vendor handoff manual and blocks real orders", () => {
    const workspace = { ...createLocalWorkspace("Abdul", "abdul@example.com"), memories: defaultMemories };
    const signal = parseFreeImport(sampleInviteText);
    const opportunity = buildOpportunity(signal, workspace.memories, new Date("2026-06-03T12:00:00.000Z"));
    const draft = generateCardDraft(getDefaultDraftInput(workspace, opportunity), workspace.memories);
    const handoff = buildVendorHandoff("walgreens", validateCardDraft(draft));

    expect(handoff.mode).toBe("manual-upload");
    expect(handoff.costControl).toBe("free-app-no-paid-api");
    expect(handoff.realOrdersEnabled).toBe(false);
    expect(handoff.canPlaceRealOrder).toBe(false);
    expect(handoff.disabledReasons).toEqual(
      expect.arrayContaining(["Final price, pickup time, payment, and order submission happen outside CustomCard."])
    );
  });

  it("builds downloadable SVG panels with print dimensions", () => {
    const workspace = { ...createLocalWorkspace("Abdul", "abdul@example.com"), memories: defaultMemories };
    const signal = parseFreeImport(sampleInviteText);
    const opportunity = buildOpportunity(signal, workspace.memories, new Date("2026-06-03T12:00:00.000Z"));
    const draft = generateCardDraft(getDefaultDraftInput(workspace, opportunity), workspace.memories);
    const frontSvg = buildPanelSvg(draft.panels[0]);

    expect(frontSvg).toContain("<svg");
    expect(frontSvg).toContain('width="1500"');
    expect(frontSvg).toContain('height="2100"');
    expect(frontSvg).toContain("Anniversary for Sara and");
    expect(frontSvg).toContain("Ahmed");
  });
});
