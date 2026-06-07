import { describe, expect, it } from "vitest";
import { resolveImportPreviewMetadata } from "./importPreviewMetadata.mjs";

const weddingIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Wedding dinner for Sara
DTSTART;TZID=America/New_York:20300603T180000
LOCATION:Brooklyn, NY
ATTENDEE;CN=Sara:mailto:sara@example.com
DESCRIPTION:Sara gave a long private note that should not be returned.
END:VEVENT
END:VCALENDAR`;

describe("import preview metadata", () => {
  it("parses raw ICS text into metadata-only event fields without returning raw descriptions", () => {
    const resolution = resolveImportPreviewMetadata({
      sourceKind: "manual-ics",
      rawImportText: weddingIcs
    });

    expect(resolution).toMatchObject({
      sourceKind: "manual-ics",
      missingFields: [],
      rawContentStored: false,
      parsedFromRawText: true,
      rawTextField: "rawImportText",
      metadataOnlyPayload: {
        title: "Wedding dinner for Sara",
        recipientName: "Sara",
        startsAt: "2030-06-03T18:00:00.000Z",
        timezone: "America/New_York",
        location: "Brooklyn, NY",
        sourceEvidence: "manual-ics:server-parsed:summary+dtstart+attendee+location",
        rawContentStored: false
      }
    });
    expect(JSON.stringify(resolution)).not.toContain("long private note");
    expect(resolution.evidenceSummary).toEqual(
      expect.arrayContaining(["ICS VEVENT detected", "SUMMARY field present", "DTSTART field present", "1 attendee label detected"])
    );
  });

  it("parses raw invite prose when no metadataOnlyPayload is supplied", () => {
    const resolution = resolveImportPreviewMetadata({
      sourceKind: "manual-invite",
      rawInviteText: "Birthday brunch for Mom on 2030-07-12 at Queens, NY."
    });

    expect(resolution.missingFields).toEqual([]);
    expect(resolution.metadataOnlyPayload).toMatchObject({
      title: "Birthday brunch for Mom on 2030-07-12 at Queens, NY",
      recipientName: "Mom",
      startsAt: "2030-07-12T00:00:00.000Z",
      timezone: "UTC",
      rawContentStored: false
    });
  });

  it("does not use private ICS descriptions as fallback titles", () => {
    const resolution = resolveImportPreviewMetadata({
      sourceKind: "manual-ics",
      rawIcsText: [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "DTSTART:20300603T180000Z",
        "ATTENDEE;CN=Sara:mailto:sara@example.com",
        "DESCRIPTION:Private fallback note that should not be echoed",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n")
    });

    expect(resolution.missingFields).toContain("metadataOnlyPayload.title");
    expect(resolution.rawContentStored).toBe(false);
    expect(resolution.parsedFromRawText).toBe(true);
    expect(resolution.rawTextField).toBe("rawIcsText");
    expect(resolution.metadataOnlyPayload?.title).toBe("");
    expect(JSON.stringify(resolution)).not.toContain("Private fallback note");
  });

  it("keeps explicit metadataOnlyPayload authoritative when both metadata and raw text are present", () => {
    const resolution = resolveImportPreviewMetadata({
      sourceKind: "manual-ics",
      rawImportText: weddingIcs,
      metadataOnlyPayload: {
        title: "Edited event title",
        recipientName: "Ahmed",
        startsAt: "2031-01-01T12:00:00.000Z",
        timezone: "UTC",
        confidence: 0.7
      }
    });

    expect(resolution).toMatchObject({
      missingFields: [],
      parsedFromRawText: false,
      rawTextField: "rawImportText",
      metadataOnlyPayload: {
        title: "Edited event title",
        recipientName: "Ahmed",
        startsAt: "2031-01-01T12:00:00.000Z",
        confidence: 0.7,
        rawContentStored: false
      }
    });
  });

  it("rejects blank raw text with the same metadata-only required field names", () => {
    const resolution = resolveImportPreviewMetadata({
      sourceKind: "manual-ics",
      rawImportText: "   "
    });

    expect(resolution.rawContentStored).toBe(false);
    expect(resolution.missingFields).toEqual([
      "metadataOnlyPayload.title",
      "metadataOnlyPayload.recipientName",
      "metadataOnlyPayload.startsAt"
    ]);
  });
});
