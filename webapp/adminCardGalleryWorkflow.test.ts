import { describe, expect, it } from "vitest";
import {
  buildCandidateEntryId,
  buildPublishIssues,
  editorFromCandidate,
  editorFromEntry,
  emptyReviewChecklist,
  reviewedChecklist,
  stageForEntry,
  textFits,
  type GalleryEntry
} from "./adminCardGalleryWorkflow";

const baseEntry: GalleryEntry = {
  entryId: "gallery-1",
  category: "birthday",
  title: "Birthday card",
  publicCaption: "A public-safe birthday card.",
  featured: false,
  featuredRank: 100,
  publicApproved: false,
  frontSvg: "<svg />"
};

describe("admin card gallery workflow", () => {
  it("classifies gallery stages from persisted entry state", () => {
    expect(stageForEntry(baseEntry)).toBe("drafts");
    expect(stageForEntry({ ...baseEntry, frontSvg: "" })).toBe("needs-review");
    expect(stageForEntry({ ...baseEntry, publicApproved: true })).toBe("needs-review");
    expect(stageForEntry({ ...baseEntry, featured: true })).toBe("needs-review");
    expect(stageForEntry({ ...baseEntry, featured: true, publicApproved: true })).toBe("featured");
  });

  it("builds editor state from candidates without leaking private draft fields into gallery copy", () => {
    const editor = editorFromCandidate({
      sourceDraftId: "draft/sara birthday",
      status: "ready",
      derivedCategory: "birthday",
      draftInput: {
        sender: "Mina",
        recipient: "Sara",
        relationship: "Sisters",
        occasion: "birthday",
        tone: "warm",
        style: "botanical",
        language: "English",
        useMemory: false,
        personalNote: "Private memory should not become public gallery caption."
      }
    });

    expect(buildCandidateEntryId({ sourceDraftId: "draft/sara birthday", status: "ready", derivedCategory: "birthday" })).toBe(
      "gallery-draft-sara-birthday"
    );
    expect(editor.category).toBe("birthday");
    expect(editor.publicCaption).toBe("");
    expect(editor.frontSvg).toContain("<svg");
    expect(editor.publicCaption).not.toContain("Private memory");
  });

  it("requires persisted preview, fit, and human review before publishing", () => {
    const editor = editorFromEntry(baseEntry);

    expect(buildPublishIssues(editor, emptyReviewChecklist, true, false)).toEqual([
      "Confirm permission to share.",
      "Complete privacy review.",
      "Confirm the text-fit review.",
      "Approve the gallery title and caption."
    ]);
    expect(buildPublishIssues(editor, reviewedChecklist(), true, false)).toEqual([]);
    expect(buildPublishIssues(editor, reviewedChecklist(), false, false)).toContain("Create a gallery draft first.");
    expect(buildPublishIssues(editor, reviewedChecklist(), true, true)).toContain(
      "Update the front preview after editing card text."
    );
  });

  it("does not invent replacement copy when a candidate cannot be generated locally", () => {
    const editor = editorFromCandidate({
      sourceDraftId: "draft/malformed",
      status: "ready",
      derivedCategory: "birthday",
      draftInput: {
        tone: "not-a-real-tone" as never
      }
    });

    expect(editor.cardCopy).toEqual({
      headline: "",
      body: "",
      artDirection: ""
    });
    expect(editor.frontSvg).toBe("");
    expect(
      textFits({
        headline: "x".repeat(91),
        body: "Short body.",
        artDirection: "Safe preview"
      })
    ).toBe(false);
  });
});
