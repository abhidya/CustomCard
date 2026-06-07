export interface ImportPreviewMetadataPayload {
  title: string;
  recipientName: string;
  startsAt?: string;
  timezone: string;
  location?: string;
  confidence: number;
  sourceEvidence: string;
  evidenceSummary: string[];
  rawContentStored: false;
  [key: string]: unknown;
}

export interface ImportPreviewMetadataResolution {
  sourceKind: string;
  metadataOnlyPayload: ImportPreviewMetadataPayload | undefined;
  missingFields: string[];
  warnings: string[];
  rawContentStored: false;
  parsedFromRawText: boolean;
  rawTextField: string | undefined;
  evidenceSummary: string[];
}

export function resolveImportPreviewMetadata(body?: Record<string, unknown>): ImportPreviewMetadataResolution;

export function missingImportPreviewMetadataFields(
  body?: Record<string, unknown>,
  metadataOnly?: ImportPreviewMetadataPayload
): string[];

export function parseRawImportText(
  rawText: unknown,
  body?: Record<string, unknown>,
  sourceKind?: string
): {
  metadataOnlyPayload: ImportPreviewMetadataPayload | undefined;
  warnings: string[];
  evidenceSummary: string[];
};
