import { describe, expect, it } from "vitest";
import {
  reviewerDraftOptions,
  reviewerEmptyMemories,
  reviewerInitialAuthForm,
  reviewerInitialExportStatus,
  reviewerInitialScanStatus,
  reviewerReferenceDate,
  reviewerWorkspaceKey
} from "./reviewerBootstrap";

describe("reviewer bootstrap contract", () => {
  it("keeps the local customer workspace defaults explicit and production-safe", () => {
    expect(reviewerWorkspaceKey).toBe("customcard-free-workspace-v1");
    expect(reviewerReferenceDate.toISOString()).toBe("2026-06-03T12:00:00.000Z");
    expect(reviewerInitialAuthForm).toEqual({ name: "", email: "" });
    expect(reviewerInitialScanStatus).toBe("Invite required");
    expect(reviewerInitialExportStatus).toBe("Ready to export");
    expect(reviewerEmptyMemories).toEqual([]);
  });

  it("exposes the same customer-selectable card and print options without demo naming", () => {
    expect(reviewerDraftOptions.tones).toEqual(["warm", "funny", "elegant", "simple", "reverent", "sentimental"]);
    expect(reviewerDraftOptions.styles).toEqual(["botanical", "bold-type", "photo-note", "minimal"]);
    expect(reviewerDraftOptions.languages).toEqual(["English", "Spanish", "Urdu", "Arabic"]);
    expect(reviewerDraftOptions.vendors).toEqual([
      "walgreens",
      "cvs",
      "fedex",
      "walmart",
      "staples",
      "office-depot",
      "local-print-shop"
    ]);
  });
});
