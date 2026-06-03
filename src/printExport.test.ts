import { describe, expect, it } from "vitest";
import {
  buildOpportunity,
  buildVendorHandoff,
  createLocalWorkspace,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  sampleInviteText,
  validateCardDraft,
  type CardValidation
} from "./freeMvp";
import {
  buildCombinedPdfExportFile,
  buildPrintExportPackage,
  buildSamplePrintExportPackage,
  summarizePrintExportPackage,
  validatePrintExportPackage
} from "./printExport";

function buildDraftFixture() {
  const workspace = createLocalWorkspace("Abdul", "abdul@example.com", new Date("2026-06-03T12:00:00.000Z"));
  const opportunity = buildOpportunity(parseFreeImport(sampleInviteText), workspace.memories, new Date("2026-06-03T12:00:00.000Z"));
  const draft = generateCardDraft(getDefaultDraftInput(workspace, opportunity), workspace.memories);
  const validation = validateCardDraft(draft);
  const handoff = buildVendorHandoff("walgreens", validation);

  return { draft, handoff, validation };
}

describe("print export package", () => {
  it("builds source SVGs, a combined PDF proof, and a manifest without network or order claims", () => {
    const { draft, handoff, validation } = buildDraftFixture();
    const printPackage = buildPrintExportPackage(draft, validation, handoff);
    const summary = summarizePrintExportPackage(printPackage);

    expect(validatePrintExportPackage(printPackage)).toEqual([]);
    expect(printPackage.files.map((file) => file.kind)).toEqual([
      "panel-svg",
      "panel-svg",
      "panel-svg",
      "panel-svg",
      "combined-pdf",
      "manifest-json"
    ]);
    expect(printPackage.manifest).toMatchObject({
      draftId: draft.id,
      panelOrder: ["front", "inside-left", "inside-right", "back"],
      realOrdersEnabled: false,
      passed: true
    });
    expect(printPackage.manifest.target).toMatchObject({
      size: "5x7",
      dpi: 300,
      widthPixels: 1500,
      heightPixels: 2100,
      pdfMediaBoxPoints: [0, 0, 360, 504]
    });
    expect(summary).toMatchObject({
      fileCount: 6,
      panelCount: 4,
      manifestPassed: true,
      noNetwork: true,
      realOrdersEnabled: false
    });
    expect(summary.formats).toEqual(["panel-svg", "combined-pdf", "manifest-json"]);
  });

  it("creates a deterministic four-page PDF with 5x7 media boxes", () => {
    const { draft } = buildDraftFixture();
    const pdf = buildCombinedPdfExportFile(draft);

    expect(pdf.fileName).toBe(`${draft.id}-5x7-print-proof.pdf`);
    expect(pdf.mimeType).toBe("application/pdf");
    expect(pdf.text.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.text).toContain("/Count 4");
    expect(pdf.text.match(/\/MediaBox \[0 0 360 504\]/g)).toHaveLength(4);
    expect(pdf.text).toContain("Anniversary for Sara and");
    expect(pdf.text).toContain("xref");
    expect(pdf.byteLength).toBeGreaterThan(3000);
  });

  it("keeps exact SVG upload artifacts in the package", () => {
    const { draft, handoff, validation } = buildDraftFixture();
    const printPackage = buildPrintExportPackage(draft, validation, handoff);
    const svgFiles = printPackage.files.filter((file) => file.kind === "panel-svg");

    expect(svgFiles).toHaveLength(4);
    expect(svgFiles[0]).toMatchObject({
      fileName: `${draft.id}-front-1500x2100.svg`,
      mimeType: "image/svg+xml",
      panelId: "front"
    });
    expect(svgFiles[0].text).toContain('width="1500"');
    expect(svgFiles[0].text).toContain('height="2100"');
  });

  it("fails preflight when draft validation is not passed", () => {
    const { draft, handoff } = buildDraftFixture();
    const failedValidation: CardValidation = {
      passed: false,
      checks: [],
      errors: ["Text fit"]
    };
    const printPackage = buildPrintExportPackage(draft, failedValidation, handoff);

    expect(printPackage.manifest.passed).toBe(false);
    expect(printPackage.manifest.preflight).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Draft validation passed",
          passed: false,
          detail: "Text fit"
        })
      ])
    );
    expect(validatePrintExportPackage(printPackage)).toContain("Print package manifest preflight did not pass.");
  });

  it("detects stale file hashes in package validation", () => {
    const printPackage = buildSamplePrintExportPackage();
    printPackage.files[0] = {
      ...printPackage.files[0],
      text: `${printPackage.files[0].text}\n<!-- changed after manifest -->`
    };

    expect(validatePrintExportPackage(printPackage)).toEqual(
      expect.arrayContaining([`Print export file ${printPackage.files[0].fileName} hash is stale.`])
    );
  });

  it("detects files omitted from the manifest", () => {
    const printPackage = buildSamplePrintExportPackage();
    printPackage.manifest.files = printPackage.manifest.files.filter((file) => file.fileName !== printPackage.files[0].fileName);

    expect(validatePrintExportPackage(printPackage)).toEqual(
      expect.arrayContaining([`Print export manifest does not list ${printPackage.files[0].fileName}.`])
    );
  });
});
