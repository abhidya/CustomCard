import { describe, expect, it } from "vitest";
import {
  buildOpportunity,
  buildPanelSvg,
  buildVendorHandoff,
  createLocalWorkspace,
  daysUntilLabel,
  defaultMemories,
  generateCardDraft,
  getDefaultDraftInput,
  occasionStarters,
  parseFreeImport,
  recordCardExport,
  removeSavedEvent,
  sampleInviteText,
  saveEventToWorkspace,
  setSavedEventStatus,
  upcomingSavedEvents,
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

  it("persists saved events with upsert, status updates, and removal", () => {
    const now = new Date("2026-06-11T12:00:00.000Z");
    const workspace = createLocalWorkspace("Abdul", "abdul@example.com", now);
    const signal = parseFreeImport(sampleInviteText);
    const opportunity = buildOpportunity(signal, [], now);

    const saved = saveEventToWorkspace(workspace, opportunity, signal.isoDate, now);
    expect(saved.events).toHaveLength(1);
    expect(saved.events?.[0]).toMatchObject({
      id: opportunity.id,
      recipient: "Sara and Ahmed",
      status: "saved",
      isoDate: "2026-07-12"
    });

    const resaved = saveEventToWorkspace(saved, opportunity, signal.isoDate, now);
    expect(resaved.events).toHaveLength(1);

    const snoozed = setSavedEventStatus(resaved, opportunity.id, "snoozed");
    expect(snoozed.events?.[0]?.status).toBe("snoozed");

    const removed = removeSavedEvent(snoozed, opportunity.id);
    expect(removed.events).toHaveLength(0);
  });

  it("sorts upcoming events by date, keeps undated last, and hides dismissed", () => {
    const now = new Date("2026-06-11T12:00:00.000Z");
    let workspace = createLocalWorkspace("Abdul", "abdul@example.com", now);
    const later = buildOpportunity(parseFreeImport(sampleInviteText), [], now);
    const sooner = buildOpportunity(parseFreeImport("Maya birthday party on June 20, 2026"), [], now);
    const undated = buildOpportunity(parseFreeImport("Thank you note for Leo"), [], now);

    workspace = saveEventToWorkspace(workspace, later, "2026-07-12", now);
    workspace = saveEventToWorkspace(workspace, sooner, "2026-06-20", now);
    workspace = saveEventToWorkspace(workspace, undated, undefined, now);

    expect(upcomingSavedEvents(workspace).map((event) => event.isoDate)).toEqual([
      "2026-06-20",
      "2026-07-12",
      undefined
    ]);

    const dismissed = setSavedEventStatus(workspace, sooner.id, "dismissed");
    expect(upcomingSavedEvents(dismissed).map((event) => event.id)).not.toContain(sooner.id);
    expect(upcomingSavedEvents(undefined)).toEqual([]);
  });

  it("labels days until an event from the customer's perspective", () => {
    const now = new Date("2026-06-11T08:00:00.000Z");
    expect(daysUntilLabel(undefined, now)).toBe("Date needed");
    expect(daysUntilLabel("2026-06-11", now)).toBe("Today");
    expect(daysUntilLabel("2026-06-12", now)).toBe("Tomorrow");
    expect(daysUntilLabel("2026-07-12", now)).toBe("In 31 days");
    expect(daysUntilLabel("2026-06-01", now)).toBe("Passed");
  });

  it("records exported cards in history with dedupe and a cap", () => {
    const now = new Date("2026-06-11T12:00:00.000Z");
    let workspace = createLocalWorkspace("Abdul", "abdul@example.com", now);
    const opportunity = buildOpportunity(parseFreeImport(sampleInviteText), [], now);
    const draft = generateCardDraft(getDefaultDraftInput(workspace, opportunity), []);

    workspace = recordCardExport(workspace, draft, now);
    workspace = recordCardExport(workspace, draft, now);
    expect(workspace.cardHistory).toHaveLength(1);
    expect(workspace.cardHistory?.[0]?.title).toBe("Anniversary card for Sara and Ahmed");

    for (let index = 0; index < 15; index += 1) {
      const altDraft = { ...draft, id: `draft-${index}` };
      workspace = recordCardExport(workspace, altDraft, now);
    }
    expect(workspace.cardHistory?.length).toBe(12);
  });

  it("keeps occasion starters aligned with the import parser vocabulary", () => {
    for (const starter of occasionStarters) {
      const signal = parseFreeImport(`${starter.label} note for Maya`);
      expect(signal.occasion).toBe(starter.occasion);
    }
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
