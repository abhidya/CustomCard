import { describe, expect, it } from "vitest";
import {
  addApprovedRelationshipMemory,
  buildCardDraftFromOpportunity,
  createLocalWorkspace,
  removeApprovedRelationshipMemory,
  sampleInviteText
} from "./customerWorkflow";

describe("customer workflow", () => {
  it("names the Relationship Memory edit seam", () => {
    const workspace = createLocalWorkspace("Abdul", "abdul@example.com", new Date("2026-06-03T12:00:00.000Z"));
    const withMemory = addApprovedRelationshipMemory(
      workspace,
      { name: "Abdul", email: "abdul@example.com" },
      { recipient: "Sara", note: "Sara likes botanical cards." },
      new Date("2026-06-03T12:00:00.000Z")
    );

    expect(withMemory.memories).toHaveLength(1);
    expect(withMemory.memories[0]).toMatchObject({ recipient: "Sara", approved: true });
    expect(removeApprovedRelationshipMemory(withMemory, withMemory.memories[0].id).memories).toHaveLength(0);
  });

  it("builds the Opportunity to Card Draft path through one interface", () => {
    const workflow = buildCardDraftFromOpportunity({
      workspace: createLocalWorkspace("Abdul", "abdul@example.com", new Date("2026-06-03T12:00:00.000Z")),
      memories: [],
      rawImportText: sampleInviteText,
      now: new Date("2026-06-03T12:00:00.000Z")
    });

    expect(workflow.opportunity.title).toContain("Sara");
    expect(workflow.draft.panels.map((panel) => panel.id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(workflow.validation.passed).toBe(true);
  });
});
