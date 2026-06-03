import {
  buildOpportunity,
  buildPanelSvg,
  buildVendorHandoff,
  createLocalWorkspace,
  exportFileName,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  sampleInviteText,
  validateCardDraft,
  type CardDraft,
  type CardPanel,
  type CardValidation,
  type VendorHandoff
} from "./freeMvp";

export type PrintExportFileKind = "panel-svg" | "combined-pdf" | "manifest-json";

export interface PrintExportFile {
  kind: PrintExportFileKind;
  fileName: string;
  mimeType: string;
  text: string;
  byteLength: number;
  contentHash: string;
  panelId?: CardPanel["id"];
}

export interface PrintExportPreflightCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface PrintExportManifest {
  draftId: string;
  generatedAtIso: string;
  target: {
    size: "5x7";
    dpi: 300;
    widthInches: 5;
    heightInches: 7;
    widthPixels: 1500;
    heightPixels: 2100;
    pdfMediaBoxPoints: [0, 0, 360, 504];
  };
  panelOrder: CardPanel["id"][];
  vendorName: string;
  realOrdersEnabled: false;
  files: Omit<PrintExportFile, "text">[];
  preflight: PrintExportPreflightCheck[];
  passed: boolean;
  warnings: string[];
}

export interface PrintExportPackage {
  draftId: string;
  generatedAtIso: string;
  files: PrintExportFile[];
  manifest: PrintExportManifest;
}

export interface PrintExportSummary {
  draftId: string;
  fileCount: number;
  panelCount: number;
  pdfFileName: string;
  pdfBytes: number;
  manifestPassed: boolean;
  formats: PrintExportFileKind[];
  noNetwork: true;
  realOrdersEnabled: false;
}

const fixedExportDateIso = "2026-06-03T12:00:00.000Z";

export function buildPrintExportPackage(
  draft: CardDraft,
  validation: CardValidation,
  handoff: VendorHandoff,
  generatedAtIso = fixedExportDateIso
): PrintExportPackage {
  const exportFiles = [
    ...draft.panels.map((panel) => buildPanelSvgExportFile(panel, draft.id)),
    buildCombinedPdfExportFile(draft)
  ];
  const preflight = buildPrintPreflight(draft, validation, handoff, exportFiles);
  const manifest: PrintExportManifest = {
    draftId: draft.id,
    generatedAtIso,
    target: {
      size: "5x7",
      dpi: 300,
      widthInches: 5,
      heightInches: 7,
      widthPixels: 1500,
      heightPixels: 2100,
      pdfMediaBoxPoints: [0, 0, 360, 504]
    },
    panelOrder: draft.panels.map((panel) => panel.id),
    vendorName: handoff.vendorName,
    realOrdersEnabled: false,
    files: exportFiles.map(stripFileText),
    preflight,
    passed: preflight.every((check) => check.passed),
    warnings: buildPrintWarnings(draft, validation, handoff)
  };
  const manifestFile = buildTextExportFile(
    "manifest-json",
    `${draft.id}-print-manifest.json`,
    "application/json",
    JSON.stringify(manifest, null, 2)
  );

  return {
    draftId: draft.id,
    generatedAtIso,
    files: [...exportFiles, manifestFile],
    manifest
  };
}

export function buildPanelSvgExportFile(panel: CardPanel, draftId: string): PrintExportFile {
  return buildTextExportFile("panel-svg", exportFileName(panel, draftId), "image/svg+xml", buildPanelSvg(panel), panel.id);
}

export function buildCombinedPdfExportFile(draft: CardDraft): PrintExportFile {
  return buildTextExportFile("combined-pdf", `${draft.id}-5x7-print-proof.pdf`, "application/pdf", buildCombinedPrintPdf(draft));
}

export function summarizePrintExportPackage(printPackage: PrintExportPackage): PrintExportSummary {
  const pdfFile = printPackage.files.find((file) => file.kind === "combined-pdf");

  return {
    draftId: printPackage.draftId,
    fileCount: printPackage.files.length,
    panelCount: printPackage.manifest.panelOrder.length,
    pdfFileName: pdfFile?.fileName ?? "",
    pdfBytes: pdfFile?.byteLength ?? 0,
    manifestPassed: printPackage.manifest.passed,
    formats: uniqueKinds(printPackage.files),
    noNetwork: true,
    realOrdersEnabled: false
  };
}

export function validatePrintExportPackage(printPackage: PrintExportPackage): string[] {
  const errors: string[] = [];
  const fileNames = new Set<string>();

  if (!printPackage.manifest.passed) errors.push("Print package manifest preflight did not pass.");
  if (printPackage.manifest.realOrdersEnabled) errors.push("Print package must not enable real orders.");
  if (printPackage.manifest.panelOrder.length !== 4) errors.push("Print package must contain four ordered panels.");
  if (!printPackage.files.some((file) => file.kind === "combined-pdf")) errors.push("Print package is missing a combined PDF.");
  if (!printPackage.files.some((file) => file.kind === "manifest-json")) errors.push("Print package is missing a manifest file.");

  for (const file of printPackage.files) {
    if (fileNames.has(file.fileName)) errors.push(`Duplicate print export file: ${file.fileName}`);
    fileNames.add(file.fileName);
    if (file.byteLength <= 0) errors.push(`Print export file ${file.fileName} is empty.`);
    if (file.contentHash !== contentHash(file.text)) errors.push(`Print export file ${file.fileName} hash is stale.`);
  }

  const manifestFileNames = new Set(printPackage.manifest.files.map((file) => file.fileName));
  for (const file of printPackage.files.filter((candidate) => candidate.kind !== "manifest-json")) {
    if (!manifestFileNames.has(file.fileName)) {
      errors.push(`Print export manifest does not list ${file.fileName}.`);
    }
  }

  return errors;
}

export function buildSamplePrintExportPackage(): PrintExportPackage {
  const workspace = createLocalWorkspace("Abdul Demo", "demo@customcard.local", new Date(fixedExportDateIso));
  const opportunity = buildOpportunity(parseFreeImport(sampleInviteText), workspace.memories, new Date(fixedExportDateIso));
  const draft = generateCardDraft(getDefaultDraftInput(workspace, opportunity), workspace.memories);
  const validation = validateCardDraft(draft);
  const handoff = buildVendorHandoff("walgreens", validation);

  return buildPrintExportPackage(draft, validation, handoff);
}

function buildPrintPreflight(
  draft: CardDraft,
  validation: CardValidation,
  handoff: VendorHandoff,
  files: PrintExportFile[]
): PrintExportPreflightCheck[] {
  const fileNames = files.map((file) => file.fileName);
  const pdfFile = files.find((file) => file.kind === "combined-pdf");

  return [
    {
      label: "Four ordered panels",
      passed: draft.panels.map((panel) => panel.id).join(",") === "front,inside-left,inside-right,back",
      detail: draft.panels.map((panel) => panel.id).join(" -> ")
    },
    {
      label: "5x7 300 DPI panels",
      passed: draft.panels.every((panel) => panel.width === 1500 && panel.height === 2100 && panel.dpi === 300),
      detail: "Expected 1500 x 2100 px at 300 DPI for every panel"
    },
    {
      label: "Draft validation passed",
      passed: validation.passed,
      detail: validation.passed ? "Layout and human-gate checks passed" : validation.errors.join(", ")
    },
    {
      label: "Unique export filenames",
      passed: new Set(fileNames).size === fileNames.length,
      detail: `${fileNames.length} files checked`
    },
    {
      label: "Combined PDF proof",
      passed: Boolean(pdfFile?.text.startsWith("%PDF-1.4")),
      detail: pdfFile ? `${pdfFile.fileName} (${pdfFile.byteLength} bytes)` : "Missing PDF"
    },
    {
      label: "No live order path",
      passed: handoff.realOrdersEnabled === false && handoff.canPlaceRealOrder === false,
      detail: "Manual handoff only; checkout stays external"
    }
  ];
}

function buildPrintWarnings(draft: CardDraft, validation: CardValidation, handoff: VendorHandoff): string[] {
  return [
    ...(validation.passed ? [] : ["Fix validation errors before handing files to a printer."]),
    ...(draft.panels.some((panel) => panel.overflowRisk) ? ["One or more panels has text overflow risk."] : []),
    "PDF proof uses local vector text and layout; SVG panels remain the primary vendor upload artifacts.",
    ...handoff.disabledReasons
  ];
}

function buildCombinedPrintPdf(draft: CardDraft): string {
  const pageIds = draft.panels.map((_, index) => 3 + index * 2);
  const contentIds = draft.panels.map((_, index) => 4 + index * 2);
  const fontRegularId = 3 + draft.panels.length * 2;
  const fontBoldId = fontRegularId + 1;
  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${draft.panels.length} >>`
  ];

  draft.panels.forEach((panel, index) => {
    const content = buildPdfPageContent(panel);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 360 504] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`,
      `<< /Length ${byteLength(content)} >>\nstream\n${content}\nendstream`
    );
  });
  objects.push(
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>`
  );

  return assemblePdf(objects);
}

function buildPdfPageContent(panel: CardPanel): string {
  const background = panel.id === "front" ? [0.97, 0.95, 0.91] : panel.id === "back" ? [0.93, 0.96, 0.94] : [0.97, 0.98, 0.98];
  const accent = panel.id === "inside-right" ? [0.78, 0.33, 0.24] : panel.id === "inside-left" ? [0.15, 0.52, 0.47] : [0.19, 0.36, 0.49];
  const headlineLines = wrapText(panel.headline, 24).slice(0, 3);
  const bodyLines = wrapText(panel.body, 42).slice(0, 9);

  return [
    "q",
    `${pdfColor(background)} rg`,
    "0 0 360 504 re f",
    `${pdfColor(accent)} RG`,
    "3 w",
    "28 28 304 448 re S",
    `${pdfColor(accent)} rg`,
    "286 406 42 42 re f",
    `${pdfColor(accent)} RG`,
    "4 w",
    "50 88 m 120 120 175 64 312 104 c S",
    ...pdfTextLines(headlineLines, "F2", 22, 58, 384, 25),
    ...pdfTextLines(bodyLines, "F1", 13, 58, 288, 18),
    ...pdfTextLines(wrapText(panel.artDirection, 54).slice(0, 2), "F1", 9, 58, 58, 12),
    ...pdfTextLines([`${panel.label} panel / 5x7 / 300 DPI source SVG included`], "F1", 8, 58, 42, 10),
    "Q"
  ].join("\n");
}

function pdfTextLines(lines: string[], fontName: string, fontSize: number, x: number, y: number, leading: number): string[] {
  return lines.map((line, index) =>
    `BT /${fontName} ${fontSize} Tf ${x} ${y - index * leading} Td (${escapePdfText(line)}) Tj ET`
  );
}

function assemblePdf(objects: string[]): string {
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

function buildTextExportFile(
  kind: PrintExportFileKind,
  fileName: string,
  mimeType: string,
  text: string,
  panelId?: CardPanel["id"]
): PrintExportFile {
  return {
    kind,
    fileName,
    mimeType,
    text,
    byteLength: byteLength(text),
    contentHash: contentHash(text),
    panelId
  };
}

function stripFileText(file: PrintExportFile): Omit<PrintExportFile, "text"> {
  return {
    kind: file.kind,
    fileName: file.fileName,
    mimeType: file.mimeType,
    byteLength: file.byteLength,
    contentHash: file.contentHash,
    ...(file.panelId ? { panelId: file.panelId } : {})
  };
}

function contentHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function wrapText(value: string, maxChars: number): string[] {
  const words = toPdfSafeText(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function toPdfSafeText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "?").replace(/\s+/g, " ").trim();
}

function escapePdfText(value: string): string {
  return toPdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfColor(values: number[]): string {
  return values.map((value) => value.toFixed(3)).join(" ");
}

function uniqueKinds(files: PrintExportFile[]): PrintExportFileKind[] {
  return Array.from(new Set(files.map((file) => file.kind)));
}
